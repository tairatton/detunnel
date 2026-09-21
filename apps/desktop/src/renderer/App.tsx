import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { workspaceScopeMatches } from '@detunnel/ipc-contracts';
import type {
  DashboardSnapshot,
  DestructiveDeletePolicy,
  DoctorReport,
  ToolCatalogSnapshot,
  ResolvedRemediation,
  LogLine,
  LiveLogExportReference,
  LogSource,
  PermissionProfileName,
  PdfProviderInstallResult,
  UiLocale,
  UpdateStatus,
  UserSettings,
  IncidentClassification,
  ExternalSetupTarget,
  TunnelStatus,
  TunnelOAuthLoginStatus,
  WorkspaceSummary,
} from '@detunnel/ipc-contracts';
import { AppShell, type Screen } from './features/shell/AppShell.js';
import { ControlCenterPage } from './features/home/ControlCenterPage.js';
import { ProjectsPage } from './features/projects/ProjectsPage.js';
import { WorkLogPage } from './features/worklog/WorkLogPage.js';
import { LiveLogsPage } from './features/live/LiveLogsPage.js';
import type { LogScopeSelection } from './features/live/LogStreamPanel.js';
import { applyLogSnapshot } from './features/live/log-buffer.js';
import { SettingsPage, type SettingsFocusTarget, type SettingsSection } from './features/settings/SettingsPage.js';
import { SettingsDrawer } from './features/settings/SettingsDrawer.js';
import { DoctorPanel } from './features/doctor/DoctorPanel.js';
import { ToolsPage } from './features/tools/ToolsPage.js';
import { remediationNavigationForTarget } from './features/tools/remediation-navigation.js';
import {
  guidedTunnelLaunchDecision,
  guidedTunnelPrerequisiteSignature,
  isTunnelConfigured,
  isTunnelRunning,
  readGuidedTunnelSetupState,
  writeGuidedTunnelSetupState,
} from './features/onboarding/guided-tunnel-setup-state.js';
import { createTranslator } from './i18n/index.js';
import { markStartupDoctorPassed, startupDoctorCorePassed, startupDoctorRequired } from './features/onboarding/startup-doctor-state.js';

const MAX_CLIENT_LOG_LINES = 30_000;

export function App(): ReactElement {
  const [screen, setScreen] = useState<Screen>('home');
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [workspaces, setWorkspaces] = useState<readonly WorkspaceSummary[]>([]);
  const [doctor, setDoctor] = useState<DoctorReport | null>(null);
  const [toolCatalog, setToolCatalog] = useState<ToolCatalogSnapshot | null>(null);
  const [toolCatalogLoading, setToolCatalogLoading] = useState(false);
  const [toolHostSyncNotice, setToolHostSyncNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [mcpBusy, setMcpBusy] = useState(false);
  const [tunnelBusy, setTunnelBusy] = useState(false);
  const [autoStartBusy, setAutoStartBusy] = useState(false);
  const [locale, setLocale] = useState<UiLocale>('en');
  const [logLines, setLogLines] = useState<readonly LogLine[]>([]);
  const [tunnelLogPath, setTunnelLogPath] = useState<string | null>(null);
  const [tunnelLogExists, setTunnelLogExists] = useState(false);
  const [incidentClassification, setIncidentClassification] = useState<IncidentClassification | null>(null);
  const [incidentCapturedAt, setIncidentCapturedAt] = useState<string | null>(null);
  const [incidentNotice, setIncidentNotice] = useState<string | null>(null);
  const [incidentBusy, setIncidentBusy] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [guidedTunnelSetupOpen, setGuidedTunnelSetupOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [quickConnectBusy, setQuickConnectBusy] = useState(false);
  const [reconnectBusy, setReconnectBusy] = useState(false);
  const [quickConnectStep, setQuickConnectStep] = useState<2 | 3 | 4 | null>(null);
  const [quickConnectPassedThrough, setQuickConnectPassedThrough] = useState<0 | 2 | 3>(0);
  const [quickConnectFailedStep, setQuickConnectFailedStep] = useState<1 | 2 | 3 | 4 | null>(null);
  const [startupDoctorReady, setStartupDoctorReady] = useState(false);
  const [requestedSettingsSection, setRequestedSettingsSection] = useState<{ readonly section: SettingsSection; readonly focus?: SettingsFocusTarget; readonly requestId: number } | undefined>(undefined);
  const incidentBusyRef = useRef(false);
  const refreshBusyRef = useRef(false);
  const reconnectBusyRef = useRef(false);
  const refreshGeneration = useRef(0);
  const workspaceMutationBusy = useRef(false);
  const runtimeMutationBusy = useRef(false);
  const logIds = useRef<Set<number>>(new Set());
  const guidedTunnelLaunchSignature = useRef<string | null>(null);
  const startupDoctorVersion = useRef<string | null>(null);
  const settingsRequestId = useRef(0);

  const t = createTranslator(locale);
  const appVersion = dashboard?.appVersion ?? null;
  const projectWorkspaces = workspaces.filter((workspace) => workspace.kind !== 'machine_root' && (workspace.archivedAt === undefined || workspace.archivedAt === null));

  const appendLogLine = useCallback((line: LogLine): void => {
    if (logIds.current.has(line.id)) return;
    logIds.current.add(line.id);
    setLogLines((previous) => {
      const next = [...previous.slice(-(MAX_CLIENT_LOG_LINES - 1)), line];
      // Keep the de-duplication index bounded together with the visible log
      // buffer. Without this, every log line ever received stayed reachable
      // from the renderer and long-running sessions eventually exhausted V8.
      logIds.current = new Set(next.map((entry) => entry.id));
      return next;
    });
  }, []);

  useEffect(() => {
    let disposed = false;
    void window.detunnel.getUpdateStatus().then((status) => {
      if (!disposed) setUpdateStatus(status);
    }).catch(() => undefined);
    const unsubscribe = window.detunnel.onUpdateStatus((status) => {
      if (!disposed) setUpdateStatus(status);
    });
    return (): void => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    void window.detunnel.getLogSnapshot().then((snapshot) => {
      if (disposed) return;
      setLogLines((previous) => {
        const merged = applyLogSnapshot(previous, logIds.current, snapshot.lines);
        logIds.current = merged.ids;
        return merged.lines;
      });
      setTunnelLogPath(snapshot.tunnelLogPath);
      setTunnelLogExists(snapshot.tunnelLogExists);
    }).catch(() => undefined);
    const unsubscribe = window.detunnel.onLogEvent((line) => {
      appendLogLine(line);
      if (line.source === 'tunnel') setTunnelLogExists(true);
    });
    return (): void => {
      disposed = true;
      unsubscribe();
    };
  }, [appendLogLine]);

  async function clearLogSource(source: LogSource, scope: LogScopeSelection): Promise<void> {
    try {
      await window.detunnel.clearLogBuffer({
        source,
        ...(scope.workspaceId === null ? {} : { workspaceId: scope.workspaceId }),
        ...(scope.sessionId === null ? {} : { sessionId: scope.sessionId }),
      });
      setLogLines((previous) => previous.filter((line) => line.source !== source || !lineMatchesScope(line, scope, workspaces)));
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.logBufferClear')));
    }
  }

  async function clearAllLogs(): Promise<void> {
    try {
      await Promise.all((['tunnel', 'mcp', 'process'] as const).map((source) => window.detunnel.clearLogBuffer({ source })));
      logIds.current = new Set();
      setLogLines([]);
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.logBufferClear')));
    }
  }

  async function exportLogSource(source: LogSource, scope: LogScopeSelection, query: string, lines: readonly LiveLogExportReference[]): Promise<void> {
    try {
      await window.detunnel.exportLogs({
        source,
        filePath: '',
        ...(scope.workspaceId === null ? {} : { workspaceId: scope.workspaceId }),
        ...(scope.sessionId === null ? {} : { sessionId: scope.sessionId }),
        ...(query.trim().length === 0 ? {} : { query: query.trim() }),
        lines,
      });
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.logExport')));
    }
  }

  async function popOutLogViewer(): Promise<void> {
    try {
      await window.detunnel.openLogViewer();
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.logViewerOpen')));
    }
  }

  async function captureIncident(): Promise<void> {
    if (incidentBusyRef.current) return;
    incidentBusyRef.current = true;
    setIncidentBusy(true);
    try {
      const result = await window.detunnel.captureIncident();
      if (result.exported && !result.cancelled) {
        setIncidentClassification(result.classification);
        setIncidentCapturedAt(result.capturedAt);
        setIncidentNotice(null);
      } else {
        setIncidentNotice(t('live.incident.cancelled'));
      }
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.logExport')));
    } finally {
      incidentBusyRef.current = false;
      setIncidentBusy(false);
    }
  }

  const refresh = useCallback(async (): Promise<void> => {
    if (refreshBusyRef.current) return;
    const generation = ++refreshGeneration.current;
    refreshBusyRef.current = true;
    try {
      const [dashboardResult, workspacesResult] = await Promise.allSettled([
        window.detunnel.getDashboard(),
        window.detunnel.listWorkspaces(),
      ]);
      const failures: string[] = [];
      if (generation !== refreshGeneration.current) return;
      if (dashboardResult.status === 'fulfilled') {
        setDashboard(dashboardResult.value);
        setLocale(dashboardResult.value.locale);
      } else {
        failures.push(errorMessage(dashboardResult.reason, createTranslator(locale)('error.desktopService')));
      }
      if (workspacesResult.status === 'fulfilled') {
        setWorkspaces(workspacesResult.value);
      } else {
        failures.push(errorMessage(workspacesResult.reason, createTranslator(locale)('error.desktopService')));
      }
      setBootError(failures.length === 0 ? null : failures.join(' · '));
    } finally {
      refreshBusyRef.current = false;
    }
  }, [locale]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 2_000);
    return (): void => { window.clearInterval(interval); };
  }, [refresh]);

  useEffect(() => {
    // A recovered Remote MCP connection supersedes a stale automatic-setup error.
    if (dashboard?.remoteMcp?.state === 'running') setQuickConnectFailedStep(null);
  }, [dashboard?.remoteMcp?.state]);

  useEffect(() => {
    if (dashboard === null || !startupDoctorReady) return;
    const tunnel = dashboard.tunnel;
    const signature = guidedTunnelPrerequisiteSignature(tunnel);
    if (guidedTunnelLaunchSignature.current === signature) return;
    guidedTunnelLaunchSignature.current = signature;
    let state = readGuidedTunnelSetupState(window.localStorage);
    if (isTunnelConfigured(tunnel) && state !== 'completed') {
      // Upgrades/reinstalls preserve the real tunnel prerequisites outside this
      // renderer's localStorage. Normalize any stale onboarding marker so a
      // previously configured user is never sent back to setup on next launch.
      try { writeGuidedTunnelSetupState(window.localStorage, 'completed'); } catch { /* Real tunnel state remains authoritative. */ }
      state = 'completed';
    }
    const decision = guidedTunnelLaunchDecision(tunnel, state);
    if (decision === 'show_tip') {
      // The first-run tip belonged to the legacy Tunnel ID/API-key wizard.
      // Keep the state marker for compatibility, but let the focused Home
      // connection card be the only entry point for new users.
      try { writeGuidedTunnelSetupState(window.localStorage, 'dismissed'); } catch { /* Home remains the entry point. */ }
      return;
    }
    if (decision === 'resume_settings') {
      // Startup must always land on Home. The old guided setup used to reopen
      // Settings here whenever localStorage contained an unfinished setup,
      // which made the first screen look like it had jumped to a random page.
      // Home already exposes the numbered workflow and an explicit action to
      // continue setup, so navigation belongs to the user's click.
      return;
    }
  }, [dashboard, startupDoctorReady]);

  useEffect(() => {
    if (appVersion === null || startupDoctorVersion.current === appVersion) return;
    startupDoctorVersion.current = appVersion;
    if (!startupDoctorRequired(window.localStorage, appVersion)) {
      setStartupDoctorReady(true);
      return;
    }

    setStartupDoctorReady(false);
    // Give the main process a chance to start the local MCP listener and any
    // already-configured persistent runtimes before the first Doctor probe.
    // This avoids sending a clean installation to Doctor merely because the
    // background startup sequence was still in flight.
    void window.detunnel.autoStart().catch(() => undefined).then(() => Promise.all([
      window.detunnel.runDoctor(),
      window.detunnel.getToolCatalog({ locale }),
    ])).then(([report, catalog]) => {
      setDoctor(report);
      setToolCatalog(catalog);
      if (startupDoctorCorePassed(report)) {
        try { markStartupDoctorPassed(window.localStorage, appVersion); } catch { /* Re-run next launch if storage is unavailable. */ }
        setStartupDoctorReady(true);
        setScreen('home');
        return;
      }
      setGuidedTunnelSetupOpen(false);
      setScreen('doctor');
    }).catch((cause: unknown) => {
      setStartupDoctorReady(false);
      setError(errorMessage(cause, createTranslator(locale)('error.doctorRun')));
      setGuidedTunnelSetupOpen(false);
      setScreen('doctor');
    });
  }, [appVersion, locale]);

  function requestSettingsSection(section: SettingsSection, focus?: SettingsFocusTarget): void {
    settingsRequestId.current += 1;
    setRequestedSettingsSection({ section, ...(focus === undefined ? {} : { focus }), requestId: settingsRequestId.current });
    setError(null);
    setScreen('home');
    setSettingsDrawerOpen(true);
  }

  function openGuidedTunnelSettings(markInProgress: boolean): void {
    if (markInProgress) {
      try { writeGuidedTunnelSetupState(window.localStorage, 'in_progress'); } catch { /* UI still works without storage. */ }
    }
    setGuidedTunnelSetupOpen(true);
    requestSettingsSection('tunnel');
  }

  function viewPublicMcpUrl(): void {
    setError(null);
    setSettingsDrawerOpen(false);
    setScreen('home');
    window.setTimeout(() => {
      const target = document.getElementById('public-mcp-url');
      if (!(target instanceof HTMLElement)) {
        setError(locale === 'th' ? 'ยังไม่มี Public MCP URL ให้แสดง กรุณารีเฟรชแล้วลองใหม่' : 'The Public MCP URL is not ready yet. Refresh and try again.');
        return;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    }, 0);
  }

  async function quickConnect(): Promise<void> {
    if (dashboard?.selectedWorkspace === null) {
      setQuickConnectFailedStep(1);
      setError(locale === 'th' ? 'เลือกโฟลเดอร์โปรเจกต์ก่อน แล้วกดตั้งค่าอัตโนมัติอีกครั้ง' : 'Choose a project folder first, then run automatic setup again.');
      document.getElementById('add-project-path')?.focus();
      return;
    }
    setQuickConnectBusy(true);
    setQuickConnectStep(2);
    setQuickConnectPassedThrough(0);
    setQuickConnectFailedStep(null);
    setError(null);
    let activeQuickConnectStep: 2 | 3 | 4 = 2;
    try {
      let remote = await window.detunnel.getRemoteMcpStatus();
      if (!remote.installed) remote = await window.detunnel.installRemoteMcpProvider();
      setQuickConnectPassedThrough(2);
      activeQuickConnectStep = 3;
      setQuickConnectStep(3);
      if (remote.state !== 'running') remote = await window.detunnel.startRemoteMcp();
      setQuickConnectPassedThrough(3);
      activeQuickConnectStep = 4;
      setQuickConnectStep(4);
      await refresh();
    } catch (cause: unknown) {
      setQuickConnectFailedStep(activeQuickConnectStep);
      setError(errorMessage(cause, locale === 'th' ? 'ตั้งค่าการเชื่อมต่ออัตโนมัติไม่สำเร็จ' : 'Automatic connection setup failed'));
    } finally {
      setQuickConnectStep(null);
      setQuickConnectBusy(false);
    }
  }

  async function reconnectRemoteMcp(): Promise<void> {
    if (reconnectBusyRef.current) return;
    const confirmed = window.confirm(locale === 'th'
      ? 'สร้างการเชื่อมต่อใหม่ทั้งหมด? URL เดิมและสิทธิ์ OAuth เดิมจะใช้ไม่ได้ ระบบจะสร้าง Public MCP URL และ Pairing PIN ใหม่'
      : 'Create a completely new connection? The old URL and OAuth authorization will stop working, and a new Public MCP URL and pairing PIN will be created.');
    if (!confirmed) return;
    reconnectBusyRef.current = true;
    setReconnectBusy(true);
    setError(null);
    try {
      const previous = await window.detunnel.getRemoteMcpStatus();
      await window.detunnel.stopRemoteMcp();
      await window.detunnel.regenerateRemoteMcpPairingCode();
      let replacement = await window.detunnel.startRemoteMcp();
      if (previous.publicMcpUrl !== null && replacement.publicMcpUrl === previous.publicMcpUrl) {
        await window.detunnel.stopRemoteMcp();
        await window.detunnel.regenerateRemoteMcpPairingCode();
        replacement = await window.detunnel.startRemoteMcp();
      }
      if (replacement.publicMcpUrl === null) throw new Error(locale === 'th' ? 'Remote MCP เริ่มใหม่แล้วแต่ไม่ได้รับ Public MCP URL' : 'Remote MCP restarted without a Public MCP URL');
      if (previous.publicMcpUrl !== null && replacement.publicMcpUrl === previous.publicMcpUrl) {
        throw new Error(locale === 'th' ? 'Cloudflare ส่ง URL เดิมกลับมาหลังลองสร้างใหม่ 2 ครั้ง' : 'Cloudflare returned the previous Public MCP URL after two restart attempts');
      }
      setQuickConnectPassedThrough(3);
      setQuickConnectFailedStep(null);
      await refresh();
    } catch (cause: unknown) {
      setQuickConnectFailedStep(3);
      setError(errorMessage(cause, locale === 'th' ? 'ไม่สามารถเชื่อมต่อ ChatGPT ใหม่ได้' : 'Could not reconnect ChatGPT'));
    } finally {
      reconnectBusyRef.current = false;
      setReconnectBusy(false);
    }
  }

  function changeGuidedTunnelSetupOpen(open: boolean): void {
    if (!open) {
      if (dashboard === null || !isTunnelRunning(dashboard.tunnel)) {
        try { writeGuidedTunnelSetupState(window.localStorage, 'dismissed'); } catch { /* Closing still dismisses for this session. */ }
      }
      setGuidedTunnelSetupOpen(false);
      return;
    }
    openGuidedTunnelSettings(dashboard === null || !isTunnelRunning(dashboard.tunnel));
  }

  function completeGuidedTunnelSetup(): void {
    try { writeGuidedTunnelSetupState(window.localStorage, 'completed'); } catch { /* Completion is also derived from tunnel state. */ }
  }

  async function openExternalSetupPage(target: ExternalSetupTarget): Promise<void> {
    await window.detunnel.openExternalSetupPage({ target });
  }

  async function handleUpdateAction(): Promise<void> {
    try {
      if (updateStatus?.canInstall === true) {
        const result = await window.detunnel.installUpdate();
        setUpdateStatus(result.status);
        return;
      }
      setUpdateStatus(await window.detunnel.checkForUpdates());
    } catch (cause: unknown) {
      setError(errorMessage(cause, locale === 'th' ? 'ไม่สามารถตรวจอัปเดตได้' : 'Unable to check for updates'));
    }
  }

  async function addWorkspace(rootPath: string, makePrimary = false): Promise<boolean> {
    if (workspaceMutationBusy.current) return false;
    workspaceMutationBusy.current = true;
    setError(null);
    try {
      await window.detunnel.addWorkspace({ rootPath, makePrimary });
      await refresh();
      await runDoctor();
      setQuickConnectFailedStep(null);
      return true;
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.workspaceAdd')));
      return false;
    } finally {
      workspaceMutationBusy.current = false;
    }
  }

  async function addWorkspaceExclusive(rootPath: string): Promise<boolean> {
    if (workspaceMutationBusy.current) return false;
    workspaceMutationBusy.current = true;
    setError(null);
    try {
      const previousActiveIds = dashboard?.activeWorkspaces.map((workspace) => workspace.id) ?? [];
      const workspace = await window.detunnel.addWorkspace({ rootPath, makePrimary: true });
      await window.detunnel.selectWorkspace({ workspaceId: workspace.id });
      for (const activeId of previousActiveIds) {
        if (activeId !== workspace.id) await window.detunnel.setWorkspaceActive({ workspaceId: activeId, active: false });
      }
      await refresh();
      await runDoctor();
      setQuickConnectFailedStep(null);
      return true;
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.workspaceAdd')));
      return false;
    } finally {
      workspaceMutationBusy.current = false;
    }
  }

  async function chooseWorkspaceFolder(): Promise<string | null> {
    try {
      const result = await window.detunnel.chooseWorkspaceFolder();
      return result.rootPath;
    } catch (cause: unknown) {
      setError(errorMessage(cause, locale === 'th' ? 'เปิดหน้าต่างเลือกโฟลเดอร์ไม่สำเร็จ กรุณาลองใหม่' : 'Could not open the folder picker. Please try again.'));
      return null;
    }
  }

  async function selectWorkspace(workspaceId: string): Promise<void> {
    try {
      setMcpBusy(true);
      await window.detunnel.selectWorkspace({ workspaceId });
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.workspaceSelect')));
    } finally {
      setMcpBusy(false);
    }
  }

  async function selectWorkspaceExclusive(workspaceId: string): Promise<void> {
    if (workspaceMutationBusy.current) return;
    workspaceMutationBusy.current = true;
    setError(null);
    setMcpBusy(true);
    try {
      await window.detunnel.setWorkspaceActive({ workspaceId, active: true });
      await window.detunnel.selectWorkspace({ workspaceId });
      for (const workspace of dashboard?.activeWorkspaces ?? []) {
        if (workspace.id !== workspaceId) await window.detunnel.setWorkspaceActive({ workspaceId: workspace.id, active: false });
      }
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.workspaceSelect')));
      throw cause;
    } finally {
      setMcpBusy(false);
      workspaceMutationBusy.current = false;
    }
  }

  async function setWorkspaceActive(workspaceId: string, active: boolean): Promise<void> {
    setError(null);
    try {
      await window.detunnel.setWorkspaceActive({ workspaceId, active });
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, propsText(locale, 'ไม่สามารถเปลี่ยน Active Project ได้', 'Could not change Active Project')));
      throw cause;
    }
  }

  async function setWorkspaceArchived(workspaceId: string, archived: boolean): Promise<void> {
    setError(null);
    try {
      await window.detunnel.setWorkspaceArchived({ workspaceId, archived });
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.workspaceArchive')));
      throw cause;
    }
  }

  async function deleteWorkspace(workspaceId: string): Promise<void> {
    setError(null);
    try {
      await window.detunnel.deleteWorkspace({ workspaceId, userConfirmed: true });
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.workspaceDelete')));
      throw cause;
    }
  }

  async function setPermissionProfile(profile: PermissionProfileName): Promise<void> {
    try {
      await window.detunnel.setPermissionProfile({ profile });
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.permissionProfileChange')));
    }
  }

  async function setUnrestrictedMode(enabled: boolean): Promise<boolean> {
    try {
      const result = await window.detunnel.setUnrestrictedMode({ enabled });
      await refresh();
      return result.restartRequired;
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.unrestrictedModeChange')));
      return true;
    }
  }

  async function setDestructiveDeletePolicy(policy: DestructiveDeletePolicy): Promise<void> {
    try {
      await window.detunnel.setAiDeletePolicy({ policy });
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, propsText(locale, 'ไม่สามารถเปลี่ยนนโยบายการลบได้', 'Could not change destructive-action policy')));
    }
  }

  async function setStdioPolicy(profile: PermissionProfileName, strictRoots: boolean, allowedRoots: readonly string[]): Promise<boolean> {
    try {
      const result = await window.detunnel.setStdioPolicy({ profile, strictRoots, allowedRoots });
      await refresh();
      return result.restartRequired;
    } catch (cause: unknown) {
      setError(errorMessage(cause, propsText(locale, 'ไม่สามารถบันทึก STDIO policy ได้', 'Could not save STDIO policy')));
      throw cause;
    }
  }

  async function stopMcp(): Promise<void> {
    if (runtimeMutationBusy.current) return;
    runtimeMutationBusy.current = true;
    try {
      setMcpBusy(true);
      await window.detunnel.stopMcp();
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.mcpStop')));
    } finally {
      setMcpBusy(false);
      runtimeMutationBusy.current = false;
    }
  }

  async function restartMcp(): Promise<void> {
    if (runtimeMutationBusy.current) return;
    runtimeMutationBusy.current = true;
    setError(null);
    try {
      setMcpBusy(true);
      const status = await window.detunnel.restartMcp();
      if (!status.running) throw new Error(status.lastStartError ?? 'MCP did not start');
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.mcpRestart')));
    } finally {
      setMcpBusy(false);
      runtimeMutationBusy.current = false;
    }
  }

  async function clearWorkLog(scope: LogScopeSelection): Promise<void> {
    try {
      await window.detunnel.clearWorkLog({
        ...(scope.workspaceId === null ? {} : { workspaceId: scope.workspaceId }),
        ...(scope.sessionId === null ? {} : { sessionId: scope.sessionId }),
      });
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.workLogClear')));
    }
  }

  async function exportWorkLog(rowIds: readonly string[]): Promise<void> {
    try {
      await window.detunnel.exportWorkLog({ rowIds });
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.logExport')));
    }
  }

  async function startTunnelWithStatus(): Promise<TunnelStatus> {
    setTunnelBusy(true);
    try {
      const status = await window.detunnel.startTunnel();
      await refresh();
      return status;
    } finally {
      setTunnelBusy(false);
    }
  }

  async function startTunnel(): Promise<void> {
    try {
      await startTunnelWithStatus();
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.tunnelStart')));
    }
  }

  async function stopTunnel(): Promise<void> {
    try {
      setTunnelBusy(true);
      await window.detunnel.stopTunnel();
      await refresh();
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.tunnelStop')));
    } finally {
      setTunnelBusy(false);
    }
  }

  async function beginTunnelOAuthLogin(): Promise<TunnelOAuthLoginStatus> {
    return window.detunnel.beginTunnelOAuthLogin();
  }

  const getTunnelOAuthLoginStatus = useCallback((): Promise<TunnelOAuthLoginStatus> => window.detunnel.getTunnelOAuthLoginStatus(), []);

  async function cancelTunnelOAuthLogin(): Promise<TunnelOAuthLoginStatus> {
    return window.detunnel.cancelTunnelOAuthLogin();
  }

  async function switchTunnelAuthToLegacy(): Promise<TunnelStatus> {
    const status = await window.detunnel.switchTunnelAuthToLegacy();
    await refresh();
    return status;
  }

  async function logoutTunnelOAuth(): Promise<TunnelStatus> {
    const status = await window.detunnel.logoutTunnelOAuth();
    await refresh();
    return status;
  }

  async function createBackup(): Promise<void> {
    await window.detunnel.createBackup();
    await refresh();
  }

  async function scheduleRestoreBackup(backupId: string): Promise<boolean> {
    const result = await window.detunnel.scheduleRestoreBackup({ backupId });
    await refresh();
    return result.restartRequired;
  }

  async function restoreRecoveryItem(workspaceId: string, recoveryId: string): Promise<void> {
    await window.detunnel.restoreRecoveryItem({ workspaceId, recoveryId });
    await refresh();
  }

  async function restoreCheckpoint(workspaceId: string, checkpointId: string): Promise<void> {
    await window.detunnel.restoreCheckpoint({ workspaceId, checkpointId });
    await refresh();
  }

  async function saveTunnelApiKey(apiKey: string): Promise<void> {
    await window.detunnel.saveTunnelApiKey({ apiKey });
    await refresh();
  }

  async function setTunnelClientPath(clientPath: string): Promise<void> {
    await window.detunnel.setTunnelClientPath({ clientPath });
    await refresh();
  }

  async function changeLocale(next: UiLocale): Promise<void> {
    await window.detunnel.setLocale({ locale: next });
    setLocale(next);
    const catalogPromise = screen === 'tools' || screen === 'doctor' ? window.detunnel.getToolCatalog({ locale: next }) : null;
    const doctorPromise = screen === 'doctor' ? window.detunnel.runDoctor() : null;
    await refresh();
    if (catalogPromise !== null) setToolCatalog(await catalogPromise);
    if (doctorPromise !== null) setDoctor(await doctorPromise);
  }

  async function setUserSettings(settings: UserSettings): Promise<boolean> {
    try {
      const result = await window.detunnel.setUserSettings({ settings });
      await refresh();
      return result.restartRequired;
    } catch (cause: unknown) {
      setError(errorMessage(cause, propsText(locale, 'ไม่สามารถบันทึกการตั้งค่าได้', 'Could not save settings')));
      throw cause;
    }
  }

  async function chooseTunnelClientPath(): Promise<string | null> {
    const result = await window.detunnel.chooseTunnelClientPath();
    return result.clientPath;
  }

  async function installPdfProvider(): Promise<PdfProviderInstallResult> {
    setError(null);
    try {
      const result = await window.detunnel.installPdfProvider();
      await refresh();
      await loadToolCatalog(['local_pdf_provider']);
      return result;
    } catch (cause: unknown) {
      const message = errorMessage(cause, propsText(locale, 'ดาวน์โหลดหรือติดตั้ง PDF Provider ไม่สำเร็จ', 'Could not download or install the PDF Provider'));
      setError(message);
      throw cause instanceof Error ? cause : new Error(message);
    }
  }

  async function configureTunnelProfile(tunnelId: string): Promise<string> {
    const result = await window.detunnel.configureTunnelProfile({ tunnelId });
    await refresh();
    return result.profilePath;
  }

  async function loadToolCatalog(forceRequirementIds?: readonly string[]): Promise<void> {
    setToolCatalogLoading(true);
    try {
      if (forceRequirementIds === undefined) {
        setToolCatalog(await window.detunnel.getToolCatalog({ locale }));
      } else {
        const result = await window.detunnel.recheckToolCatalog({ locale, requirementIds: forceRequirementIds });
        setToolCatalog(result.catalog);
        setDoctor(result.doctor);
      }
    } catch (cause: unknown) {
      setError(errorMessage(cause, propsText(locale, 'ไม่สามารถโหลดรายการเครื่องมือได้', 'Could not load the tool catalog')));
    } finally {
      setToolCatalogLoading(false);
    }
  }

  function mergeToolCatalogItem(item: ToolCatalogSnapshot['items'][number]): void {
    setToolCatalog((current) => current === null ? current : {
      ...current,
      generatedAt: new Date().toISOString(),
      items: current.items.map((candidate) => candidate.origin === item.origin && candidate.serverName === item.serverName && candidate.name === item.name ? item : candidate),
    });
  }

  async function setToolAvailability(name: string, enabled: boolean): Promise<void> {
    setError(null);
    try {
      const result = await window.detunnel.setToolAvailability({ locale, name, enabled });
      mergeToolCatalogItem(result.item);
      setToolHostSyncNotice(result.hostSyncMessage);
    } catch (cause: unknown) {
      const message = errorMessage(cause, propsText(locale, 'เปลี่ยนสถานะเครื่องมือไม่สำเร็จ', 'Could not change tool availability'));
      setError(message);
      throw cause instanceof Error ? cause : new Error(message);
    }
  }

  async function resetToolAvailability(name: string): Promise<void> {
    setError(null);
    try {
      const result = await window.detunnel.resetToolAvailability({ locale, name });
      mergeToolCatalogItem(result.item);
      setToolHostSyncNotice(result.hostSyncMessage);
    } catch (cause: unknown) {
      const message = errorMessage(cause, propsText(locale, 'คืนค่าสถานะเครื่องมือเป็นค่าเริ่มต้นไม่สำเร็จ', 'Could not restore default tool availability'));
      setError(message);
      throw cause instanceof Error ? cause : new Error(message);
    }
  }

  async function handleToolRemediation(action: ResolvedRemediation['actions'][number]): Promise<void> {
    if (action.kind === 'recheck') { await loadToolCatalog(action.requirementIds); return; }
    if (action.kind === 'open_official_url' || action.kind === 'open_system_settings') { await window.detunnel.openToolSetupTarget({ target: action.target }); return; }
    if (action.kind === 'copy_command') { await window.detunnel.copyToolCommand({ commandId: action.commandId }); return; }
    if (action.kind === 'launch_managed_browser') {
      setError(null);
      try {
        const status = await window.detunnel.launchManagedBrowser();
        if (!status.ready) throw new Error(propsText(locale, 'Managed Browser เปิดแล้วแต่ CDP ยังไม่พร้อม', 'Managed Browser started but CDP is not ready'));
        await loadToolCatalog(['browser_cdp']);
      } catch (cause: unknown) {
        const message = errorMessage(cause, propsText(locale, 'ไม่สามารถเปิด Managed Browser ได้', 'Could not start Managed Browser'));
        setError(message);
        throw cause instanceof Error ? cause : new Error(message);
      }
      return;
    }
    if (action.kind === 'install_pdf_provider') { await installPdfProvider(); return; }
    if (action.kind === 'set_user_setting') {
      if (dashboard === null) return;
      const restartRequired = await setUserSettings({ ...dashboard.settings, [action.setting]: action.value });
      if (restartRequired) {
        try {
          setMcpBusy(true);
          await window.detunnel.restartMcp();
          await refresh();
        } catch (cause: unknown) {
          setError(errorMessage(cause, t('error.mcpRestart')));
          return;
        } finally {
          setMcpBusy(false);
        }
      }
      await loadToolCatalog(action.setting === 'codexToolsEnabled' ? ['codex_runtime'] : undefined);
      return;
    }
    const navigation = remediationNavigationForTarget(action.target);
    if (navigation === null) {
      setError(propsText(locale, `ไม่รู้จักเป้าหมายการตั้งค่า: ${action.target}`, `Unknown settings target: ${action.target}`));
      return;
    }
    if (navigation.screen === 'projects') { setScreen('projects'); return; }
    requestSettingsSection(navigation.section, navigation.focus);
  }

  async function runDoctor(): Promise<boolean> {
    try {
      const [report, catalog] = await Promise.all([
        window.detunnel.runDoctor(),
        window.detunnel.getToolCatalog({ locale }),
      ]);
      setDoctor(report);
      setToolCatalog(catalog);
      if (startupDoctorCorePassed(report) && appVersion !== null) {
        try { markStartupDoctorPassed(window.localStorage, appVersion); } catch { /* Re-run next launch if storage is unavailable. */ }
        startupDoctorVersion.current = appVersion;
        setStartupDoctorReady(true);
        return true;
      } else {
        setStartupDoctorReady(false);
        return false;
      }
    } catch (cause: unknown) {
      setError(errorMessage(cause, t('error.doctorRun')));
      return false;
    }
  }

  async function autoStart(): Promise<void> {
    if (autoStartBusy) return;
    setAutoStartBusy(true);
    setError(null);
    try {
      await window.detunnel.autoStart();
      await refresh();
      if (await runDoctor()) setScreen('home');
    } catch (cause: unknown) {
      setError(errorMessage(cause, locale === 'th' ? 'ไม่สามารถเริ่มระบบอัตโนมัติได้' : 'Auto start could not complete'));
    } finally {
      setAutoStartBusy(false);
    }
  }

  if (dashboard === null) {
    return (
      <div className="boot-screen">
        {bootError === null ? t('app.loading') : (
          <div className="boot-recovery" role="alert">
            <strong>{locale === 'th' ? 'เปิด detunnel ไม่สำเร็จ' : 'detunnel could not finish starting'}</strong>
            <p>{bootError}</p>
            <div className="inline-actions">
              <button type="button" onClick={() => { void refresh(); }}>{locale === 'th' ? 'ลองใหม่' : 'Retry'}</button>
              <button type="button" onClick={() => { void popOutLogViewer(); }}>{locale === 'th' ? 'เปิดบันทึกการทำงาน' : 'Open Logs'}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <AppShell
      locale={locale}
      appVersion={dashboard.appVersion}
      mcpRunning={dashboard.mcp.running}
      desktopFullBypassOn={dashboard.permissionProfile === 'full' && dashboard.settings?.desktopFullBypassAll === true}
      stdioFullBypassOn={dashboard.stdioPermissionProfile === 'full' && dashboard.settings?.stdioFullBypassAll === true}
      updateStatus={updateStatus}
      settingsOpen={settingsDrawerOpen}
      onSettingsToggle={() => {
        setError(null);
        setSettingsDrawerOpen((open) => !open);
      }}
      onLocaleChange={(next) => { void changeLocale(next); }}
      onUpdateAction={() => { void handleUpdateAction(); }}
    >
      {bootError === null ? null : (
        <div className="error-banner boot-partial-error" role="alert">
          <span>{bootError}</span>
          <button type="button" onClick={() => { void refresh(); }}>{locale === 'th' ? 'ลองใหม่' : 'Retry'}</button>
        </div>
      )}
      {error === null ? null : <div className="error-banner" role="alert">{error}</div>}
      {screen === 'home' ? (
        <ControlCenterPage
          dashboard={dashboard}
          workspaces={projectWorkspaces}
          locale={locale}
          mcpBusy={mcpBusy}
          tunnelBusy={tunnelBusy}
          quickConnectBusy={quickConnectBusy}
          reconnectBusy={reconnectBusy}
          quickConnectStep={quickConnectStep}
          quickConnectPassedThrough={quickConnectPassedThrough}
          quickConnectFailedStep={quickConnectFailedStep}
          onRefresh={refresh}
          onStopMcp={stopMcp}
          onRestartMcp={restartMcp}
          onSelectWorkspaceExclusive={selectWorkspaceExclusive}
          onDeleteWorkspace={deleteWorkspace}
          onAddWorkspace={addWorkspaceExclusive}
          onChooseWorkspaceFolder={chooseWorkspaceFolder}
          onStartTunnel={startTunnel}
          onStopTunnel={stopTunnel}
          onOpenTunnelSetup={() => openGuidedTunnelSettings(!isTunnelRunning(dashboard.tunnel))}
          onViewPublicUrl={viewPublicMcpUrl}
          onQuickConnect={quickConnect}
          onReconnect={reconnectRemoteMcp}
          onCaptureIncident={captureIncident}
          incidentBusy={incidentBusy}
          incidentClassification={incidentClassification}
          incidentCapturedAt={incidentCapturedAt}
          incidentNotice={incidentNotice}
        />
      ) : null}
      {screen === 'projects' ? (
        <ProjectsPage
          locale={locale}
          workspaces={workspaces}
          selectedWorkspaceId={dashboard.selectedWorkspace?.id ?? null}
          activeWorkspaceIds={dashboard.activeWorkspaces.map((workspace) => workspace.id)}
          onSelectWorkspace={selectWorkspace}
          onSetWorkspaceActive={setWorkspaceActive}
          onAddWorkspace={addWorkspace}
          onSetWorkspaceArchived={setWorkspaceArchived}
          onDeleteWorkspace={deleteWorkspace}
        />
      ) : null}
      {screen === 'tools' ? (
        <ToolsPage
          locale={locale}
          snapshot={toolCatalog}
          loading={toolCatalogLoading}
          hostSyncNotice={toolHostSyncNotice}
          onRefresh={() => loadToolCatalog()}
          onRemediation={handleToolRemediation}
          onSetAvailability={setToolAvailability}
          onResetAvailability={resetToolAvailability}
        />
      ) : null}
      {screen === 'worklog' ? (
        <WorkLogPage locale={locale} dashboard={dashboard} workspaces={workspaces} onClearWorkLog={clearWorkLog} onExportWorkLog={exportWorkLog} />
      ) : null}
      {screen === 'live' ? (
        <LiveLogsPage
          locale={locale}
          lines={logLines}
          tunnelLogPath={tunnelLogPath}
          tunnelLogExists={tunnelLogExists}
          tunnelAuth={dashboard.tunnel.auth}
          onClear={clearLogSource}
          onClearAll={clearAllLogs}
          onExport={exportLogSource}
          onPopOut={popOutLogViewer}
          onCaptureIncident={captureIncident}
          incidentBusy={incidentBusy}
          incidentClassification={incidentClassification}
          incidentCapturedAt={incidentCapturedAt}
          incidentNotice={incidentNotice}
          workspaces={workspaces}
        />
      ) : null}
      <SettingsDrawer open={settingsDrawerOpen} locale={locale} onClose={() => setSettingsDrawerOpen(false)}>
        <SettingsPage
          locale={locale}
          dashboard={dashboard}
          onLocaleChange={changeLocale}
          onPermissionProfileChange={setPermissionProfile}
          onUnrestrictedChange={setUnrestrictedMode}
          onDestructiveDeletePolicyChange={setDestructiveDeletePolicy}
          onStdioPolicyChange={setStdioPolicy}
          onCreateBackup={createBackup}
          onScheduleRestoreBackup={scheduleRestoreBackup}
          onRestoreRecoveryItem={restoreRecoveryItem}
          onRestoreCheckpoint={restoreCheckpoint}
          onSaveTunnelApiKey={saveTunnelApiKey}
          onSetTunnelClientPath={setTunnelClientPath}
          onUserSettingsChange={setUserSettings}
          onInstallPdfProvider={installPdfProvider}
          onChooseTunnelClientPath={chooseTunnelClientPath}
          onConfigureTunnelProfile={configureTunnelProfile}
          onStartTunnel={startTunnelWithStatus}
          onStopTunnel={stopTunnel}
          onBeginTunnelOAuthLogin={beginTunnelOAuthLogin}
          onGetTunnelOAuthLoginStatus={getTunnelOAuthLoginStatus}
          onCancelTunnelOAuthLogin={cancelTunnelOAuthLogin}
          onSwitchTunnelAuthToLegacy={switchTunnelAuthToLegacy}
          onLogoutTunnelOAuth={logoutTunnelOAuth}
          onOpenExternalSetupPage={openExternalSetupPage}
          onRefresh={refresh}
          guidedTunnelSetupOpen={guidedTunnelSetupOpen}
          onGuidedTunnelSetupOpenChange={changeGuidedTunnelSetupOpen}
          onGuidedTunnelLocalComplete={completeGuidedTunnelSetup}
          requestedSection={requestedSettingsSection}
        />
      </SettingsDrawer>
      {screen === 'doctor' ? (
        <div className="page-content">
          <h1>{t('doctor.title')}</h1>
          <DoctorPanel
            locale={locale}
            report={doctor}
            remediations={toolCatalog?.remediations ?? []}
            onRunDoctor={async () => { await runDoctor(); }}
            onAutoStart={autoStart}
            autoStartBusy={autoStartBusy}
            onRecheck={(requirementIds) => loadToolCatalog(requirementIds)}
            onRemediation={handleToolRemediation}
            onOpenProjects={() => setScreen('projects')}
          />
        </div>
      ) : null}
    </AppShell>
  );
}

function propsText(locale: UiLocale, th: string, en: string): string {
  return locale === 'th' ? th : en;
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message.trim().length > 0 ? cause.message : fallback;
}

function lineMatchesScope(line: Pick<LogLine, 'workspaceId' | 'sessionId'>, scope: LogScopeSelection, workspaces: readonly WorkspaceSummary[]): boolean {
  if (scope.workspaceId !== null && !workspaceScopeMatches(workspaces, line.workspaceId, scope.workspaceId)) return false;
  if (scope.sessionId !== null && line.sessionId !== scope.sessionId) return false;
  return true;
}
