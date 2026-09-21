import fs from 'node:fs';
import path from 'node:path';
import { parseMcpToolExposureProfile, startMcpHttp } from '@detunnel/mcp-server';
import { migrateDetunnelDataPath } from '@detunnel/shared/node';
import {
  UNRESTRICTED_SETTING_KEY,
  USER_SETTING_KEYS,
  parseBooleanSetting,
  parseStdioPermissionProfile,
  resolveDetunnelDataPath,
} from '@detunnel/shared';
import { applyPendingSqliteRestoreSync, SqliteDatabase, SqliteSettingsRepository, SqliteWorkspaceRepository } from '@detunnel/storage';
import { normalizeWorkspaceRoot, WorkspaceService } from '@detunnel/workspace';
import { createStdioMcpRuntime } from '../runtime/stdio-mcp-runtime.js';

const PERMISSION_PROFILE_SETTING_KEY = 'permission_profile';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function resolveDataPath(): string {
  return resolveDetunnelDataPath(process.env);
}

async function main(): Promise<void> {
  const dataPath = resolveDataPath();
  migrateDetunnelDataPath(dataPath, process.env);
  fs.mkdirSync(dataPath, { recursive: true });
  // Keep the same database filename as Desktop and STDIO so all transports
  // share one workspace/settings/audit state.
  const databaseFilename = path.join(dataPath, 'detunnel.sqlite');
  const restore = applyPendingSqliteRestoreSync(databaseFilename, path.join(dataPath, 'backups'));
  if (restore.error !== undefined) process.stderr.write(`detunnel MCP HTTP: scheduled restore failed: ${restore.error}\n`);
  if (restore.applied) process.stderr.write(`detunnel MCP HTTP: restored database from ${restore.backupId ?? 'scheduled backup'}\n`);

  const database = new SqliteDatabase(databaseFilename, { backupDirectory: path.join(dataPath, 'backups') });
  const rawWorkspaceRepository = new SqliteWorkspaceRepository(database);
  const settingsRepository = new SqliteSettingsRepository(database);

  const toolExposureProfile = parseMcpToolExposureProfile(process.env.DETUNNEL_MCP_TOOL_PROFILE);
  const profileName = toolExposureProfile === 'plugin-safe' ? 'safe' : parseStdioPermissionProfile(
    readArg('--profile')
      ?? process.env.DETUNNEL_PROFILE
      ?? process.env.DETUNNEL_PROFILE
      ?? process.env.DETUNNEL_STDIO_PROFILE
      ?? settingsRepository.get(PERMISSION_PROFILE_SETTING_KEY),
    'balanced',
  );

  const fullBypass = toolExposureProfile === 'plugin-safe' ? false : hasFlag('--full-bypass')
    || (process.env.DETUNNEL_FULL_BYPASS !== undefined
      ? parseBooleanSetting(process.env.DETUNNEL_FULL_BYPASS, false)
      : process.env.DETUNNEL_STDIO_FULL_BYPASS_ALL !== undefined
        ? parseBooleanSetting(process.env.DETUNNEL_STDIO_FULL_BYPASS_ALL, false)
        : parseBooleanSetting(settingsRepository.get(USER_SETTING_KEYS.desktopFullBypassAll), false));

  const workspaceRepository = rawWorkspaceRepository;
  const workspaceService = new WorkspaceService(workspaceRepository);
  const unrestricted = toolExposureProfile === 'plugin-safe' ? false : fullBypass || parseBooleanSetting(
    process.env.DETUNNEL_UNRESTRICTED
      ?? process.env.DETUNNEL_UNRESTRICTED
      ?? settingsRepository.get(UNRESTRICTED_SETTING_KEY),
    false,
  );

  // Determine workspace path:
  // 1. --workspace flag
  // 2. DETUNNEL_WORKSPACE / DETUNNEL_WORKSPACE env
  // 3. /workspace directory if running in Docker
  // 4. Current working directory
  let candidateWorkspace = readArg('--workspace')
    ?? process.env.DETUNNEL_WORKSPACE
    ?? process.env.DETUNNEL_WORKSPACE;

  if (!candidateWorkspace) {
    if (fs.existsSync('/workspace')) {
      candidateWorkspace = '/workspace';
    } else {
      candidateWorkspace = process.cwd();
    }
  }

  const requestedPath = path.resolve(candidateWorkspace);
  if (!fs.existsSync(requestedPath)) {
    fs.mkdirSync(requestedPath, { recursive: true });
  }

  process.env.DETUNNEL_CAPABILITY_ROOTS = requestedPath;
  process.env.DETUNNEL_CAPABILITY_ROOTS = requestedPath;

  const requestedNorm = normalizeWorkspaceRoot(requestedPath).toLowerCase();
  const workspaces = await workspaceService.list();
  let selected = workspaces.find((entry) => normalizeWorkspaceRoot(entry.realRootPath).toLowerCase() === requestedNorm);
  if (selected === undefined) {
    const added = await workspaceService.add(path.basename(requestedPath) || 'Workspace', requestedPath);
    if (!added.ok) throw new Error(`Could not register ${requestedPath}: ${added.error.message}`);
    selected = added.value;
  }
  const workspace = selected;

  for (const entry of await workspaceService.list()) {
    process.stderr.write(`detunnel workspace id=${entry.id} root=${entry.realRootPath}\n`);
  }
  database.close();

  const runtime = createStdioMcpRuntime(dataPath, workspace, unrestricted, {
    permissionProfile: profileName,
    fullBypassAll: fullBypass,
  });
  await runtime.activityReady;

  const host = readArg('--host')
    ?? process.env.DETUNNEL_HOST
    ?? process.env.DETUNNEL_HOST
    ?? (process.env.DOCKER_CONTAINER ? '0.0.0.0' : '127.0.0.1');

  const port = parseInt(
    readArg('--port')
      ?? process.env.DETUNNEL_PORT
      ?? process.env.DETUNNEL_MCP_PORT
      ?? '18765',
    10,
  );

  const handle = await startMcpHttp({
    host,
    port,
    services: runtime.services,
    actor: { clientId: 'detunnel-http', clientName: 'detunnel HTTP MCP Gateway' },
    activityTracker: runtime.activityTracker,
    codexToolsEnabled: runtime.codexToolsEnabled,
    profileProvider: runtime.profileProvider,
    toolExposureProfile,
    authorizationModeProvider: () => fullBypass ? 'full_bypass' : 'standard',
    allowAiDeleteProvider: runtime.allowAiDeleteProvider,
    destructivePolicyProvider: runtime.destructivePolicyProvider,
    activeWorkspaceScopeProvider: runtime.activeWorkspaceScopeProvider,
    toolAvailabilitySnapshotProvider: () => runtime.toolAvailabilityService.snapshot(),
    toolAvailabilitySubscribe: (listener) => runtime.toolAvailabilityService.subscribe(listener),
  });

  process.stdout.write(`\n=======================================================\n`);
  process.stdout.write(`  DETUNNEL MCP Server running!\n`);
  process.stdout.write(`  Endpoint: ${handle.endpoint.toString()}\n`);
  process.stdout.write(`  Workspace: ${workspace.realRootPath}\n`);
  process.stdout.write(`  Profile: ${profileName} exposure=${toolExposureProfile} (full_bypass=${fullBypass})\n`);
  process.stdout.write(`=======================================================\n\n`);

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stdout.write('detunnel MCP server stopping...\n');
    try { await handle.close(); } catch { /* ignore */ }
    try { await runtime.close(); } catch { /* ignore */ }
    process.exit(0);
  };

  process.on('SIGINT', () => { void shutdown(); });
  process.on('SIGTERM', () => { void shutdown(); });
}

main().catch((error: unknown) => {
  process.stderr.write(`detunnel MCP HTTP failed: ${error instanceof Error ? error.stack ?? error.message : 'unknown'}\n`);
  process.exit(1);
});
