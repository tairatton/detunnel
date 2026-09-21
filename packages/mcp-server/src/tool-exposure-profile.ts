import path from 'node:path';

export type McpToolExposureProfile = 'default' | 'plugin-safe';

/**
 * The smallest tool surface that still supports the ChatGPT -> local project
 * editing workflow. This is deliberately transport-scoped: the existing
 * balanced/full tool surface remains available to local/legacy callers.
 */
export const PLUGIN_SAFE_TOOL_ALLOWLIST: ReadonlySet<string> = new Set([
  'workspace_list',
  'workspace_info',
  'workspace_tree',
  'project_snapshot',
  'read_file',
  'read_files',
  'search_files',
  'search_text',
  'write_file',
  'apply_patch',
  'edit_file',
  'list_recovery_items',
  'list_checkpoints',
  'restore_checkpoint',
  'project_test',
  'project_lint',
  'project_typecheck',
  'project_build',
  'read_file_page',
  'read_file_page_continue',
]);

export const PLUGIN_SAFE_VERIFICATION_TOOLS: ReadonlySet<string> = new Set([
  'project_test',
  'project_lint',
  'project_typecheck',
  'project_build',
]);

const PATH_KEYS = new Set(['path', 'sourcePath', 'destinationPath']);
const SECRET_BASENAME = /^(?:credentials(?:\..+)?|secrets?(?:\..+)?|token(?:\..+)?|id_(?:rsa|ed25519)|.*\.(?:pem|key|p12|pfx))$/i;

export function parseMcpToolExposureProfile(value: string | undefined | null): McpToolExposureProfile {
  return value?.trim().toLowerCase() === 'plugin-safe' ? 'plugin-safe' : 'default';
}

export function isPluginSafeTool(name: string): boolean {
  return PLUGIN_SAFE_TOOL_ALLOWLIST.has(name);
}

/** Additional input checks that must run before any application service. */
export function pluginSafeInputViolation(toolName: string, input: unknown): string | undefined {
  if (!isPluginSafeTool(toolName) || !isRecord(input)) return undefined;

  if (REQUIRES_WORKSPACE_ID.has(toolName)) {
    const workspaceId = input.workspaceId;
    if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
      return 'plugin-safe requires an explicit workspaceId';
    }
    if (input.includeIgnored === true) return 'plugin-safe does not allow includeIgnored searches';
  }

  for (const candidate of collectPathValues(input)) {
    const normalized = candidate.replaceAll('\\', '/');
    const segments = normalized.split('/').filter(Boolean);
    const basename = segments.at(-1) ?? '';
    if (path.win32.isAbsolute(candidate) || path.posix.isAbsolute(candidate)) {
      return 'plugin-safe accepts workspace-relative paths only';
    }
    if (segments.includes('..')) return 'plugin-safe rejects parent-directory traversal';
    const lowerBasename = basename.toLowerCase();
    const environmentSecret = lowerBasename === '.env'
      || (lowerBasename.startsWith('.env.') && lowerBasename !== '.env.example');
    if (environmentSecret || SECRET_BASENAME.test(basename) || segments.some((segment) => /^\.ssh$|^\.aws$/i.test(segment))) {
      return 'plugin-safe denies secret-file access';
    }
  }

  return undefined;
}

const REQUIRES_WORKSPACE_ID = new Set([
  'read_file',
  'read_files',
  'search_files',
  'search_text',
  'write_file',
  'apply_patch',
  'edit_file',
  'list_recovery_items',
  'list_checkpoints',
  'restore_checkpoint',
  'read_file_page',
]);

function collectPathValues(input: Readonly<Record<string, unknown>>): readonly string[] {
  const values: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (PATH_KEYS.has(key) && typeof value === 'string') values.push(value);
    if (key === 'files' && Array.isArray(value)) {
      for (const entry of value) {
        if (isRecord(entry) && typeof entry.path === 'string') values.push(entry.path);
      }
    }
  }
  return values;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
