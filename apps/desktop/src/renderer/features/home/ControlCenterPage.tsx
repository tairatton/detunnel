import { useEffect, useState, type ReactElement } from 'react';
import type { DashboardSnapshot, IncidentClassification, UiLocale, WorkspaceSummary } from '@detunnel/ipc-contracts';
import { formatDateTime } from '../../date-time.js';
import { createTranslator } from '../../i18n/index.js';
import { tunnelRuntimeCredentialAvailable } from '../../tunnel-auth-readiness.js';
import { tunnelAuthPresentation } from '../../tunnel-auth-presentation.js';
import { UiIcon } from '../shell/UiIcon.js';
import { settleWorkspaceAdd, type AddWorkspaceAction } from '../workspaces/workspace-add.js';

interface ControlCenterPageProps {
  readonly dashboard: DashboardSnapshot;
  readonly workspaces: readonly WorkspaceSummary[];
  readonly locale: UiLocale;
  readonly mcpBusy: boolean;
  readonly tunnelBusy: boolean;
  readonly quickConnectBusy: boolean;
  readonly reconnectBusy: boolean;
  readonly quickConnectStep: 2 | 3 | 4 | null;
  readonly quickConnectPassedThrough: 0 | 2 | 3;
  readonly quickConnectFailedStep: 1 | 2 | 3 | 4 | null;
  readonly onRefresh: () => Promise<void>;
  readonly onStopMcp: () => Promise<void>;
  readonly onRestartMcp: () => Promise<void>;
  readonly onSelectWorkspaceExclusive: (workspaceId: string) => Promise<void>;
  readonly onDeleteWorkspace: (workspaceId: string) => Promise<void>;
  readonly onAddWorkspace: AddWorkspaceAction;
  readonly onChooseWorkspaceFolder: () => Promise<string | null>;
  readonly onStartTunnel: () => Promise<void>;
  readonly onStopTunnel: () => Promise<void>;
  readonly onOpenTunnelSetup: () => void;
  readonly onViewPublicUrl: () => void;
  readonly onQuickConnect: () => Promise<void>;
  readonly onReconnect: () => Promise<void>;
  readonly onCaptureIncident: () => Promise<void>;
  readonly incidentBusy: boolean;
  readonly incidentClassification: IncidentClassification | null;
  readonly incidentCapturedAt: string | null;
  readonly incidentNotice: string | null;
}

const CHATGPT_BRIDGE_HIDDEN_STORAGE_KEY = 'detunnel.chatgpt-bridge-hidden';
const PAIRING_CODE_HIDDEN_STORAGE_KEY = 'detunnel.pairing-code-hidden';
const PAIRING_CODE_VISIBILITY_EVENT = 'detunnel:pairing-code-visibility-change';

export function ControlCenterPage(props: ControlCenterPageProps): ReactElement {
  const t = createTranslator(props.locale);
  const { dashboard } = props;
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState('');
  const [addingProject, setAddingProject] = useState(false);
  const [projectAdded, setProjectAdded] = useState(false);
  const [projectBusyId, setProjectBusyId] = useState<string | null>(null);
  const [chatgptBridgeHidden, setChatgptBridgeHidden] = useState(false);
  const [pairingCodeHidden, setPairingCodeHidden] = useState(false);
  const tunnelCredentialAvailable = tunnelRuntimeCredentialAvailable(dashboard.tunnel);
  const tunnelPresentation = tunnelAuthPresentation(dashboard.tunnel);
  const remoteMcp = dashboard.remoteMcp ?? {
    state: 'stopped' as const, provider: 'cloudflared' as const, installed: false, hasAuthtoken: false, providerPath: null,
    localMcpUrl: dashboard.mcp.url, localGatewayUrl: null, publicMcpUrl: null, pairingCode: null, pairingCodeExpiresAt: null,
    oauthProtected: true, oauthConnected: false, pairingRequired: false, autoStartEnabled: false, message: null,
  };
  const remoteMcpOnline = remoteMcp.state === 'running';
  // Keep the legacy transport out of the first-run surface; reveal it only
  // when an existing Secure Tunnel is already running.
  const [secureTunnelExpanded, setSecureTunnelExpanded] = useState(dashboard.tunnel.state === 'running');

  useEffect(() => {
    setSecureTunnelExpanded(!remoteMcpOnline && dashboard.tunnel.state === 'running');
  }, [dashboard.tunnel.state, remoteMcpOnline]);

  useEffect(() => {
    const syncPairingCodeVisibility = (): void => {
      try {
        setPairingCodeHidden(window.localStorage.getItem(PAIRING_CODE_HIDDEN_STORAGE_KEY) === '1');
      } catch {
        // Keep the current visibility when local storage is unavailable.
      }
    };
    try {
      setChatgptBridgeHidden(window.localStorage.getItem(CHATGPT_BRIDGE_HIDDEN_STORAGE_KEY) === '1');
      syncPairingCodeVisibility();
    } catch {
      // The connection card remains visible when local storage is unavailable.
    }
    window.addEventListener(PAIRING_CODE_VISIBILITY_EVENT, syncPairingCodeVisibility);
    return (): void => window.removeEventListener(PAIRING_CODE_VISIBILITY_EVENT, syncPairingCodeVisibility);
  }, []);

  const agentLabel = dashboard.agentState === 'busy'
    ? t('agent.busy')
    : dashboard.agentState === 'idle'
      ? t('agent.ready')
      : t('agent.stopped');

  const tunnelLabel = dashboard.tunnel.state === 'running'
    ? dashboard.tunnel.source === 'external'
      ? (!tunnelCredentialAvailable || !dashboard.tunnel.profileExists ? t(tunnelPresentation.incompleteExternalKey) : t(tunnelPresentation.runningExternalKey))
      : t(tunnelPresentation.runningKey)
    : dashboard.tunnel.state === 'starting'
      ? t(tunnelPresentation.startingKey)
      : dashboard.tunnel.state === 'error'
        ? t(tunnelPresentation.errorKey)
        : t(tunnelPresentation.stoppedKey);

  const desktopBypassOn = dashboard.permissionProfile === 'full' && dashboard.settings?.desktopFullBypassAll === true;
  const stdioBypassOn = dashboard.stdioPermissionProfile === 'full' && dashboard.settings?.stdioFullBypassAll === true;
  const stdioBroad = dashboard.stdioPermissionProfile === 'full' && !dashboard.stdioStrictRoots;
  const broadAccess = dashboard.unrestricted || dashboard.allowAiDelete || stdioBroad || desktopBypassOn || stdioBypassOn;
  const onOff = (enabled: boolean): string => enabled ? t('security.enabled') : t('security.disabled');
  const workspaceScope = dashboard.stdioStrictRoots
    ? `${dashboard.stdioAllowedRoots.length} ${t('security.allowedRoots')}`
    : t('security.machineRoots');
  const remoteMcpFailureStep = remoteMcp.state === 'error'
    ? remoteMcp.installed ? 3 : 2
    : null;
  const step2Passed = remoteMcp.installed || props.quickConnectPassedThrough >= 2;
  const step3Passed = remoteMcpOnline;
  const step2Busy = props.quickConnectStep === 2 || remoteMcp.state === 'installing';
  const step3Busy = props.quickConnectStep === 3 || remoteMcp.state === 'starting';
  const recordedWorkflowFailureStep = props.quickConnectFailedStep ?? remoteMcpFailureStep;
  // A previous automatic-setup failure must not override a healthy live state.
  // The dashboard is authoritative after the tunnel starts or OAuth is linked.
  const resolvedWorkflowFailureStep = recordedWorkflowFailureStep !== null && (
    (recordedWorkflowFailureStep === 1 && dashboard.selectedWorkspace === null)
    || (recordedWorkflowFailureStep === 2 && !step2Passed)
    || (recordedWorkflowFailureStep === 3 && !step3Passed)
    || (recordedWorkflowFailureStep === 4 && !remoteMcp.oauthConnected)
  ) ? recordedWorkflowFailureStep : null;
  const workflowFailureStep = props.quickConnectBusy ? null : resolvedWorkflowFailureStep;
  const workflowProgress = [dashboard.selectedWorkspace !== null, step2Passed, step3Passed, remoteMcp.oauthConnected].filter(Boolean).length;

  async function copyText(value: string): Promise<void> {
    await navigator.clipboard.writeText(value);
    setCopyStatus(t('mcp.copied'));
  }

  async function selectProject(workspaceId: string): Promise<void> {
    if (dashboard.selectedWorkspace?.id === workspaceId) return;
    setProjectBusyId(workspaceId);
    try {
      await props.onSelectWorkspaceExclusive(workspaceId);
    } catch {
      // The parent surfaces the actionable error banner. Consume the rejected
      // promise here because this handler is intentionally fire-and-forget.
    } finally {
      setProjectBusyId(null);
    }
  }

  async function addCurrentProject(): Promise<void> {
    if (addingProject || projectPath.trim().length === 0) return;
    setAddingProject(true);
    setProjectAdded(false);
    try {
      const remainingPath = await settleWorkspaceAdd(projectPath, (root) => props.onAddWorkspace(root, true));
      setProjectPath(remainingPath);
      setProjectAdded(remainingPath === '');
    } finally {
      setAddingProject(false);
    }
  }

  async function removeProject(workspaceId: string): Promise<void> {
    setProjectBusyId(workspaceId);
    try {
      await props.onDeleteWorkspace(workspaceId);
    } catch {
      // The parent displays the deletion or native-approval error.
    } finally {
      setProjectBusyId(null);
    }
  }

  async function chooseProjectFolder(): Promise<void> {
    const selectedPath = await props.onChooseWorkspaceFolder();
    if (selectedPath !== null) setProjectPath(selectedPath);
  }

  function setChatgptBridgeVisibility(hidden: boolean): void {
    setChatgptBridgeHidden(hidden);
    try {
      if (hidden) window.localStorage.setItem(CHATGPT_BRIDGE_HIDDEN_STORAGE_KEY, '1');
      else window.localStorage.removeItem(CHATGPT_BRIDGE_HIDDEN_STORAGE_KEY);
    } catch {
      // Visibility is still applied for the current session.
    }
  }

  function setPairingCodeVisibility(hidden: boolean): void {
    setPairingCodeHidden(hidden);
    try {
      if (hidden) window.localStorage.setItem(PAIRING_CODE_HIDDEN_STORAGE_KEY, '1');
      else window.localStorage.removeItem(PAIRING_CODE_HIDDEN_STORAGE_KEY);
    } catch {
      // Visibility is still applied for the current session.
    }
    window.dispatchEvent(new Event(PAIRING_CODE_VISIBILITY_EVENT));
  }

  function viewPublicUrl(): void {
    if (chatgptBridgeHidden) setChatgptBridgeVisibility(false);
    props.onViewPublicUrl();
  }

  function focusProjectPicker(): void {
    const input = document.getElementById('add-project-path');
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input?.focus({ preventScroll: true });
  }

  function runPrimaryAction(): void {
    if (dashboard.selectedWorkspace === null) {
      focusProjectPicker();
      return;
    }
    if (!dashboard.mcp.running) {
      void props.onRestartMcp();
      return;
    }
    if (!remoteMcpOnline) {
      void props.onQuickConnect();
      return;
    }
    if (remoteMcp.publicMcpUrl !== null) {
      viewPublicUrl();
      return;
    }
    props.onOpenTunnelSetup();
  }

  const primaryActionLabel = dashboard.selectedWorkspace === null
    ? (props.locale === 'th' ? 'เลือกโปรเจกต์' : 'Choose project')
    : !dashboard.mcp.running
      ? (props.locale === 'th' ? 'เริ่ม Local MCP' : 'Start Local MCP')
      : !remoteMcpOnline
        ? (props.locale === 'th' ? 'เชื่อม ChatGPT' : 'Connect ChatGPT')
        : remoteMcp.publicMcpUrl !== null
          ? (props.locale === 'th' ? 'ดู URL เชื่อมต่อ' : 'View connection URL')
          : (props.locale === 'th' ? 'จัดการการเชื่อมต่อ' : 'Manage connection');
  const primaryActionBusy = props.mcpBusy || props.quickConnectBusy || remoteMcp.state === 'installing' || remoteMcp.state === 'starting';

  return (
    <div className="page-content control-center-page">
      <div className="page-heading">
        <div>
          <h1>{t('home.title')}</h1>
          <p className="page-subtitle">{t('home.subtitle')}</p>
        </div>
        <div className="heading-actions">
          <button type="button" className="btn-save-gold" disabled={primaryActionBusy || dashboard.agentState === 'busy'} onClick={runPrimaryAction}>
            {primaryActionBusy ? (props.locale === 'th' ? 'กำลังทำงาน…' : 'Working…') : primaryActionLabel}
          </button>
          <button type="button" onClick={() => { void props.onRefresh(); }}>{t('action.refresh')}</button>
        </div>
      </div>
      {!props.incidentBusy && props.incidentNotice === null && props.incidentClassification === null ? null : <p role="status" className="hint">{props.incidentBusy ? t('live.incident.capturing') : props.incidentNotice ?? `${incidentLabel(t, props.incidentClassification!)} · ${formatDateTime(props.incidentCapturedAt)}`}</p>}

      <section className="panel workflow-card" aria-label={props.locale === 'th' ? 'ขั้นตอนเริ่มใช้งาน' : 'Getting started steps'}>
        <div className="workflow-card-heading">
          <div>
            <span className="settings-eyebrow">GET STARTED</span>
            <h2>{props.locale === 'th' ? 'เริ่มใช้งานตามลำดับ' : 'Get started in order'}</h2>
            <p className="hint">{props.locale === 'th' ? 'ทำตาม 4 ขั้นตอนนี้เพื่อให้ ChatGPT ใช้งานกับคอมเครื่องนี้ได้' : 'Follow these four steps to let ChatGPT use this computer.'}</p>
        </div>
          <div className="workflow-card-actions">
            <span className="workflow-progress">{workflowProgress}/4</span>
          </div>
        </div>
        <div className="workflow-steps">
          <WorkflowStep number="1" state={workflowFailureStep === 1 ? 'failed' : dashboard.selectedWorkspace !== null ? 'done' : 'current'} title={props.locale === 'th' ? 'เลือกโฟลเดอร์' : 'Choose a folder'} description={props.locale === 'th' ? 'เพิ่มโปรเจกต์และตั้งเป็นโปรเจกต์หลัก' : 'Add a project and choose it as primary.'} action={undefined} actionLabel={undefined} />
          <WorkflowStep number="2" state={workflowFailureStep === 2 ? 'failed' : step2Busy ? 'current' : step2Passed ? 'done' : dashboard.selectedWorkspace !== null ? 'current' : 'pending'} busy={step2Busy} title={props.locale === 'th' ? 'เตรียมการเชื่อมต่อ' : 'Prepare connection'} description={props.locale === 'th' ? 'ติดตั้ง Cloudflare Tunnel' : 'Install Cloudflare Tunnel.'} action={dashboard.selectedWorkspace !== null && !props.quickConnectBusy ? props.onOpenTunnelSetup : undefined} actionLabel={props.locale === 'th' ? 'เปิดการตั้งค่า' : 'Open settings'} />
          <WorkflowStep number="3" state={workflowFailureStep === 3 ? 'failed' : step3Busy ? 'current' : step3Passed ? 'done' : step2Passed ? 'current' : 'pending'} busy={step3Busy} title={props.locale === 'th' ? 'เปิด Remote MCP' : 'Start Remote MCP'} description={props.locale === 'th' ? 'เปิดช่องทางเชื่อมต่อแบบ HTTPS' : 'Start the HTTPS connection.'} action={step2Passed && !props.quickConnectBusy ? props.onOpenTunnelSetup : undefined} actionLabel={props.locale === 'th' ? 'เปิดการตั้งค่า' : 'Open settings'} />
          <WorkflowStep number="4" state={workflowFailureStep === 4 ? 'failed' : remoteMcp.oauthConnected ? 'done' : step3Passed ? 'current' : 'pending'} busy={props.quickConnectStep === 4} title={props.locale === 'th' ? 'อนุญาตใน ChatGPT' : 'Authorize in ChatGPT'} description={props.locale === 'th' ? 'เพิ่ม URL และยืนยัน OAuth หนึ่งครั้ง' : 'Add the URL and approve OAuth once.'} action={remoteMcpOnline && remoteMcp.publicMcpUrl !== null && !props.quickConnectBusy ? viewPublicUrl : undefined} actionLabel={props.locale === 'th' ? 'ดู URL' : 'View URL'} />
        </div>
      </section>

      <details className="home-advanced-actions">
        <summary>{props.locale === 'th' ? 'เครื่องมือดูแลระบบ' : 'System controls'}</summary>
        <div className="inline-actions">
          <button type="button" disabled={props.incidentBusy} onClick={() => { void props.onCaptureIncident(); }}>{t('live.captureIncident')}</button>
          <button type="button" className="heading-action-danger" disabled={props.mcpBusy || !dashboard.mcp.running} onClick={() => { void props.onStopMcp(); }}>
            {t('action.stop')}
          </button>
          <button type="button" disabled={props.mcpBusy || dashboard.selectedWorkspace === null || dashboard.agentState === 'busy'} onClick={() => { void props.onRestartMcp(); }}>
            {t('action.restart')}
          </button>
        </div>
      </details>

      <section className="panel agent-status-panel" aria-label={agentLabel}>
        <div className={`agent-orb ${dashboard.agentState}`} data-testid="agent-state" />
        <div>
          <strong data-testid="mcp-status">{agentLabel}</strong>
          <p>
            {t('agent.mode')} · {dashboard.mcp.running ? 'MCP ONLINE' : 'MCP OFFLINE'}
            {dashboard.unrestricted ? ` • ${t('badge.unrestricted')}` : ''}
          </p>
        </div>
      </section>

      <section className={`panel chatgpt-connection-card ${remoteMcpOnline ? 'is-online' : ''} ${chatgptBridgeHidden ? 'is-collapsed' : ''}`} aria-label="ChatGPT connection">
        <div className="chatgpt-connection-leading">
          <span className="icon-tile chatgpt-connection-icon"><UiIcon name="link" /></span>
          <div>
            <span className="settings-eyebrow">CHATGPT BRIDGE</span>
            <h2>{props.locale === 'th' ? 'เชื่อม ChatGPT กับคอมเครื่องนี้' : 'Connect ChatGPT to this computer'}</h2>
            <p className="hint">{props.locale === 'th'
              ? 'ChatGPT เป็นผู้ให้บริการ AI หลักของคุณ detunnel ทำหน้าที่เปิดเครื่องมือในโปรเจกต์ที่เลือก'
              : 'ChatGPT remains the AI host; detunnel exposes tools for the projects you choose.'}</p>
          </div>
        </div>
        <div className="chatgpt-connection-actions">
          <span className={`connection-state-label ${remoteMcpOnline ? 'is-online' : ''}`}>
            <span className="connection-method-live-dot" aria-hidden="true" />
            {remoteMcpOnline ? remoteMcp.oauthConnected ? (props.locale === 'th' ? 'ช่องทางออนไลน์ · อนุญาตแล้ว' : 'Channel online · authorized') : (props.locale === 'th' ? 'ช่องทางออนไลน์ · รออนุญาต' : 'Channel online · awaiting authorization') : remoteMcp.oauthConnected ? (props.locale === 'th' ? 'เคยอนุญาตแล้ว · ช่องทางออฟไลน์' : 'Authorization saved · channel offline') : (props.locale === 'th' ? 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ' : 'Connection not configured')}
          </span>
          <div className="chatgpt-action-buttons">
            <button type="button" className="btn-save-gold chatgpt-primary-button" disabled={props.quickConnectBusy || props.reconnectBusy || dashboard.selectedWorkspace === null} onClick={() => {
              if (remoteMcpOnline && remoteMcp.publicMcpUrl !== null) viewPublicUrl();
              else if (remoteMcpOnline) props.onOpenTunnelSetup();
              else void props.onQuickConnect();
            }}>
              {props.quickConnectBusy ? (props.locale === 'th' ? 'กำลังตั้งค่า…' : 'Setting up…') : remoteMcpOnline && remoteMcp.publicMcpUrl !== null ? (props.locale === 'th' ? 'ดู URL' : 'View URL') : remoteMcpOnline ? (props.locale === 'th' ? 'จัดการ' : 'Manage') : (props.locale === 'th' ? 'ตั้งค่าเชื่อมต่อ' : 'Set up')}
            </button>
            <button
              type="button"
              className="chatgpt-reconnect-button"
              disabled={props.reconnectBusy || props.quickConnectBusy || !remoteMcp.installed || dashboard.selectedWorkspace === null}
              title={props.locale === 'th' ? 'ปิด URL เดิม แล้วสร้าง Public MCP URL และ Pairing PIN ใหม่' : 'Retire the old URL and create a new Public MCP URL and pairing PIN'}
              onClick={() => { void props.onReconnect(); }}
            >
              <UiIcon name="refresh" />
              {props.reconnectBusy ? (props.locale === 'th' ? 'กำลังเชื่อมต่อ…' : 'Reconnecting…') : (props.locale === 'th' ? 'เชื่อมต่อใหม่' : 'Reconnect')}
            </button>
            <button type="button" className="chatgpt-connection-hide" aria-expanded={!chatgptBridgeHidden} aria-controls="chatgpt-connection-details" onClick={() => { setChatgptBridgeVisibility(!chatgptBridgeHidden); }}>
              {chatgptBridgeHidden ? (props.locale === 'th' ? 'แสดงรายละเอียด' : 'Show details') : (props.locale === 'th' ? 'ซ่อนรายละเอียด' : 'Hide details')}
            </button>
          </div>
        </div>
        {chatgptBridgeHidden ? <div id="chatgpt-connection-details" className="chatgpt-connection-hidden-note" role="status">{remoteMcpOnline ? (props.locale === 'th' ? 'ซ่อนรายละเอียดแล้ว · ช่องทางยังออนไลน์และ URL ไม่เปลี่ยน' : 'Details hidden · the channel remains online and the URL is unchanged.') : remoteMcp.oauthConnected ? (props.locale === 'th' ? 'ซ่อนรายละเอียดแล้ว · บันทึกการอนุญาตไว้ แต่ช่องทางออฟไลน์' : 'Details hidden · authorization is saved, but the channel is offline.') : (props.locale === 'th' ? 'ซ่อนรายละเอียดแล้ว · ยังไม่ได้ตั้งค่าการเชื่อมต่อ' : 'Details hidden · the connection is not configured.')}</div> : <div id="chatgpt-connection-details" className="chatgpt-connection-details">
          {remoteMcp.publicMcpUrl === null ? null : (
            <div id="public-mcp-url" className="chatgpt-connection-url" tabIndex={-1}>
              <span className="field-label">Public MCP URL</span>
              <code className="endpoint">{remoteMcp.publicMcpUrl}</code>
              <button type="button" onClick={() => { void copyText(remoteMcp.publicMcpUrl!); }}>{props.locale === 'th' ? 'คัดลอก URL' : 'Copy URL'}</button>
            </div>
          )}
          {remoteMcp.oauthConnected ? <div className="home-remote-mcp-status is-connected"><span className="icon-tile message-icon message-icon-success"><UiIcon name="check" /></span><span>{props.locale === 'th' ? (remoteMcp.autoStartEnabled ? 'อนุญาต ChatGPT แล้ว · Remote MCP จะเริ่มอัตโนมัติเมื่อเปิด detunnel' : 'บันทึกการอนุญาตแล้ว · Remote MCP ถูกหยุดด้วยผู้ใช้') : (remoteMcp.autoStartEnabled ? 'ChatGPT authorization saved · Remote MCP will start automatically with detunnel.' : 'Authorization saved · Remote MCP was stopped manually.')}</span></div> : null}
          {remoteMcp.pairingCode === null ? remoteMcp.oauthConnected ? <div className="home-remote-mcp-status is-pairing-used" role="status"><strong>{props.locale === 'th' ? 'Pairing code' : 'Pairing code'}</strong><span>{props.locale === 'th' ? 'ใช้ยืนยันแล้ว · ไม่ต้องใช้ซ้ำ' : 'Authorization complete · no code is needed again.'}</span></div> : null : <div className="home-remote-mcp-status is-pairing"><strong className="remote-mcp-pairing-line"><span>{props.locale === 'th' ? 'Pairing code' : 'Pairing code'}:</span><span className="remote-mcp-pairing-pin" aria-label={pairingCodeHidden ? (props.locale === 'th' ? 'ซ่อน Pairing code อยู่' : 'Pairing code hidden') : `${props.locale === 'th' ? 'Pairing code' : 'Pairing code'} ${remoteMcp.pairingCode}`}>{pairingCodeHidden ? '••••••' : remoteMcp.pairingCode}</span><button type="button" className="pairing-code-visibility-toggle" aria-pressed={pairingCodeHidden} onClick={() => { setPairingCodeVisibility(!pairingCodeHidden); }}>{pairingCodeHidden ? (props.locale === 'th' ? 'แสดง' : 'Show') : (props.locale === 'th' ? 'ซ่อน' : 'Hide')}</button></strong></div>}
        </div>}
      </section>

      <details className={`panel security-overview ${broadAccess ? 'security-risk-broad' : 'security-risk-restricted'}`} aria-label={t('security.title')} open={broadAccess}>
        <summary className="security-overview-summary">
          <div>
            <h2>{t('security.title')}</h2>
            <p className="hint">{t('security.strictHint')}</p>
          </div>
          <span className={`security-summary-chip ${broadAccess ? 'broad' : 'restricted'}`} data-testid="security-summary">
            {broadAccess ? t('security.summaryBroad') : t('security.summaryRestricted')}
          </span>
        </summary>
        <div className="security-overview-grid">
          <SecurityMetric label={t('security.desktopProfile')} value={dashboard.permissionProfile.toUpperCase()} />
          <SecurityMetric label="Desktop Full Bypass" value={desktopBypassOn ? 'FULL BYPASS ON' : 'OFF'} state={desktopBypassOn ? 'warn' : 'safe'} />
          <SecurityMetric label={t('security.stdioProfile')} value={dashboard.stdioPermissionProfile.toUpperCase()} />
          <SecurityMetric label="STDIO Full Bypass" value={stdioBypassOn ? 'FULL BYPASS ON' : 'OFF'} state={stdioBypassOn ? 'warn' : 'safe'} />
          <SecurityMetric label={t('security.strictRoots')} value={onOff(dashboard.stdioStrictRoots)} state={dashboard.stdioStrictRoots ? 'safe' : 'warn'} />
          <SecurityMetric label={t('security.aiDelete')} value={onOff(dashboard.allowAiDelete)} state={dashboard.allowAiDelete ? 'warn' : 'safe'} />
          <SecurityMetric label={t('security.unrestricted')} value={onOff(dashboard.unrestricted)} state={dashboard.unrestricted ? 'warn' : 'safe'} />
          <SecurityMetric label={t('security.workspaceScope')} value={workspaceScope} state={dashboard.stdioStrictRoots ? 'safe' : 'warn'} />
          <SecurityMetric label={t('security.tunnelAccess')} value={tunnelLabel} state={dashboard.tunnel.state === 'running' ? 'active' : 'neutral'} />
          <SecurityMetric label="Remote MCP OAuth" value={remoteMcp.state === 'running' ? 'ONLINE' : remoteMcp.oauthConnected ? (remoteMcp.autoStartEnabled ? 'LINKED · AUTO' : 'LINKED') : remoteMcp.installed ? 'READY' : 'SETUP'} state={remoteMcp.state === 'running' || remoteMcp.oauthConnected ? 'active' : 'neutral'} />
          <SecurityMetric label={t('security.registeredWorkspaces')} value={String(props.workspaces.length)} />
        </div>
        {stdioBroad ? <div className="security-warning" role="status"><span className="icon-tile message-icon message-icon-warning"><UiIcon name="warning" /></span><span>{t('security.warningBroad')}</span></div> : null}
      </details>

      {copyStatus === null ? null : <span role="status">{copyStatus}</span>}
      {dashboard.mcp.lastStartError ? <p className="error-banner" role="alert">MCP: {dashboard.mcp.lastStartError}</p> : null}
      {dashboard.tunnel.state === 'running' || dashboard.tunnel.auth?.mode === 'oauth' ? <div>

        {dashboard.tunnel.state === 'running' || dashboard.tunnel.auth?.mode === 'oauth' ? (
          <details
            className={`connection-method-stack home-connection-method ${remoteMcpOnline ? 'is-secondary' : ''}`}
            open={secureTunnelExpanded}
            onToggle={(event) => setSecureTunnelExpanded(event.currentTarget.open)}
          >
          <summary className="connection-method-summary">
            <div className="connection-method-summary-copy">
              <span className="connection-method-kicker">{remoteMcpOnline ? (props.locale === 'th' ? 'ตัวเลือกเสริม / ขั้นสูง' : 'Optional / advanced') : (props.locale === 'th' ? 'วิธีเชื่อมต่อทางเลือก' : 'Alternative connection')}</span>
              <strong>{t(tunnelPresentation.titleKey)}</strong>
              <span>{remoteMcpOnline
                ? (props.locale === 'th' ? 'Remote MCP OAuth ออนไลน์แล้ว จึงพับส่วน Tunnel ไว้เพื่อลดความสับสน — ยังเปิดใช้พร้อมกันได้' : 'Remote MCP OAuth is online, so Tunnel controls are collapsed to reduce clutter. Both may still run together.')
                : (tunnelPresentation.transportHintKey === null ? (props.locale === 'th' ? 'เปิดเพื่อจัดการ Secure MCP Tunnel' : 'Expand to manage Secure MCP Tunnel.') : t(tunnelPresentation.transportHintKey))}</span>
            </div>
            <div className="connection-method-summary-status">
              <span className={`connection-method-live-dot ${dashboard.tunnel.state === 'running' ? 'is-online' : ''}`} aria-hidden="true" />
              <span>{tunnelLabel}</span>
              <span className="active-project-count">{tunnelPresentation.badge}</span>
              <UiIcon name="chevron-down" className="connection-method-chevron" />
            </div>
          </summary>
          <section className="panel connection-method-panel">
          <div className="section-heading">
            <div>
              <h2>{t(tunnelPresentation.titleKey)}</h2>
              {tunnelPresentation.transportHintKey === null ? null : <p className="hint">{t(tunnelPresentation.transportHintKey)}</p>}
            </div>
            <span className="active-project-count">{tunnelPresentation.badge}</span>
          </div>
          <p data-testid="tunnel-status">{tunnelLabel}</p>
          {tunnelPresentation.isOAuth && dashboard.tunnel.auth?.accountLabel ? <p className="hint">{props.locale === 'th' ? 'บัญชี OAuth' : 'OAuth account'}: {dashboard.tunnel.auth.accountLabel}</p> : null}
          {dashboard.tunnel.message ? <p className="hint error-text">{dashboard.tunnel.message}</p> : null}
          {!tunnelCredentialAvailable ? <p className="hint">{t(tunnelPresentation.needCredentialKey)}</p> : null}
          {!dashboard.tunnel.profileExists ? <p className="hint">{t('tunnel.needProfile')}</p> : null}
          {tunnelCredentialAvailable && dashboard.tunnel.profileExists ? null : (
            <div className="guided-tunnel-home-entry">
              <p className="hint">{tunnelPresentation.isOAuth ? (props.locale === 'th' ? 'ตรวจ OAuth session และการเชื่อมต่อในหน้าตั้งค่า' : 'Review the OAuth session and connection in Settings.') : t('guidedTunnel.dismissedHint')}</p>
              <button type="button" className="btn-save-gold" onClick={props.onOpenTunnelSetup}>{tunnelPresentation.isOAuth ? (props.locale === 'th' ? 'เปิดการตั้งค่าการเชื่อมต่อ' : 'Open connection settings') : t('guidedTunnel.openGuide')}</button>
            </div>
          )}
          <div className="inline-actions">
            <button
              type="button"
              disabled={props.tunnelBusy || !tunnelCredentialAvailable || dashboard.tunnel.state === 'running'}
              onClick={() => { void props.onStartTunnel(); }}
            >
              {t(tunnelPresentation.startKey)}
            </button>
            <button
              type="button"
              disabled={props.tunnelBusy || dashboard.tunnel.state === 'stopped'}
              onClick={() => { void props.onStopTunnel(); }}
            >
              {t(tunnelPresentation.stopKey)}
            </button>
          </div>
        </section>
          </details>
        ) : null}
      </div> : null}

      <div className="home-grid">
        <section className="panel active-projects-panel">
          <div className="project-picker-heading">
            <div>
              <h2>{props.locale === 'th' ? 'เลือกโปรเจกต์ที่ใช้งาน' : 'Choose active project'}</h2>
              <p className="hint">{props.locale === 'th' ? 'เลือกใช้งานได้ครั้งละ 1 โปรเจกต์ เมื่อเปลี่ยนรายการ โปรเจกต์เดิมจะถูกปิด Active อัตโนมัติ' : 'Use one project at a time. Choosing another project automatically deactivates the previous one.'}</p>
            </div>
            <span className="active-project-count">{dashboard.selectedWorkspace === null ? '0' : '1'}/{props.workspaces.length} {props.locale === 'th' ? 'เลือกแล้ว' : 'selected'}</span>
          </div>

          {props.workspaces.length === 0 ? (
            <div className="active-project-empty">{props.locale === 'th' ? 'ยังไม่มีโปรเจกต์ เพิ่มโฟลเดอร์โปรเจกต์ด้านล่างเพื่อเริ่มใช้งาน' : 'No projects yet. Add a project folder below to get started.'}</div>
          ) : (
            <div className="active-project-picker" role="radiogroup" aria-label={props.locale === 'th' ? 'เลือกโปรเจกต์ที่ใช้งาน' : 'Choose active project'}>
              {props.workspaces.map((workspace) => {
                const selected = dashboard.selectedWorkspace?.id === workspace.id;
                const busy = projectBusyId !== null;
                return (
                  <div
                    key={workspace.id}
                    className={`active-project-option ${selected ? 'is-active is-primary' : ''}`}
                    title={workspace.realRootPath}
                  >
                    <button
                      type="button"
                      role="radio"
                      className="active-project-select"
                      aria-checked={selected}
                      aria-label={`${props.locale === 'th' ? 'เลือกโปรเจกต์' : 'Select project'}: ${workspace.displayName}`}
                      disabled={busy || selected}
                      onClick={() => { void selectProject(workspace.id); }}
                    >
                      <span className="active-project-check" aria-hidden="true">{selected ? <UiIcon name="check" /> : ''}</span>
                      <span className="active-project-copy">
                        <strong>{workspace.displayName}</strong>
                        <small>{workspace.realRootPath}</small>
                      </span>
                    </button>
                    <span className="active-project-state">
                      <em className="active-project-action-label">{selected ? (props.locale === 'th' ? 'กำลังใช้' : 'SELECTED') : (props.locale === 'th' ? 'เลือก' : 'SELECT')}</em>
                      <button
                        type="button"
                        className="active-project-remove"
                        disabled={busy}
                        title={props.locale === 'th' ? 'เอารายการออกจาก detunnel โดยไม่ลบโฟลเดอร์หรือไฟล์' : 'Remove from detunnel without deleting the folder or files'}
                        aria-label={`${props.locale === 'th' ? 'เอาโปรเจกต์ออก' : 'Remove project'}: ${workspace.displayName}`}
                        onClick={() => { void removeProject(workspace.id); }}
                      >
                        {props.locale === 'th' ? 'เอาออก' : 'REMOVE'}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="add-project-control">
            <span className="field-label">{props.locale === 'th' ? 'เลือกโฟลเดอร์โปรเจกต์' : 'Choose a project folder'}</span>
            <p className="hint">{props.locale === 'th' ? 'เปิดหน้าต่าง Windows เพื่อเลือกโฟลเดอร์บนเครื่อง' : 'Open the Windows folder picker to choose a local folder.'}</p>
            <div className="form-row">
              <input
                id="add-project-path"
                value={projectPath}
                readOnly
                placeholder={props.locale === 'th' ? 'ยังไม่ได้เลือกโฟลเดอร์' : 'No folder selected'}
              />
              <button type="button" disabled={addingProject} onClick={() => { void chooseProjectFolder(); }}>
                <UiIcon name="folder" />
                {props.locale === 'th' ? 'เลือกโฟลเดอร์' : 'Choose folder'}
              </button>
            </div>
            <div className="add-project-submit-row">
              <span className="hint">{props.locale === 'th' ? 'โปรเจกต์ที่เพิ่มจะถูกเลือกใช้งานทันที' : 'The added project will be selected immediately.'}</span>
              <button
                type="button"
                className="btn-save-gold"
                disabled={addingProject || projectPath.trim().length === 0}
                onClick={() => { void addCurrentProject(); }}
              >
                {addingProject ? (props.locale === 'th' ? 'กำลังเพิ่ม…' : 'Adding…') : t('project.add')}
              </button>
            </div>
            <p className="hint add-project-behavior-hint">{props.locale === 'th' ? 'หากมีโปรเจกต์ที่กำลังใช้งานอยู่ ระบบจะปิด Active รายการเดิมอัตโนมัติ' : 'If another project is active, it will be deactivated automatically.'}</p>
            {projectAdded ? <p className="add-project-success" role="status">{props.locale === 'th' ? (dashboard.mcp.running ? 'เพิ่มโปรเจกต์แล้ว' : 'เพิ่มโปรเจกต์แล้ว แต่ Local MCP ยังไม่ทำงาน') : (dashboard.mcp.running ? 'Project added.' : 'Project added, but Local MCP is offline.')}</p> : null}
          </div>
        </section>

        <section className="info-cards" aria-label="Status cards">
          <article className="info-card">
            <p>{t('info.workspace')}</p>
            <strong data-testid="workspace-real-root">{dashboard.selectedWorkspace?.realRootPath ?? '—'}</strong>
          </article>
          <article className="info-card">
            <p>{t('info.activeProject')}</p>
            <strong>{dashboard.selectedWorkspace?.displayName ?? '—'}</strong>
            <span data-testid="workspace-id" hidden>{dashboard.selectedWorkspace?.id ?? ''}</span>
          </article>
          <article className="info-card">
            <p>{t('info.mode')}</p>
            <strong>{dashboard.mode}</strong>
          </article>
        </section>
      </div>

    </div>
  );
}

function WorkflowStep(props: {
  readonly number: string;
  readonly state: 'done' | 'current' | 'pending' | 'failed';
  readonly busy?: boolean;
  readonly title: string;
  readonly description: string;
  readonly action: (() => void) | undefined;
  readonly actionLabel: string | undefined;
}): ReactElement {
  return (
    <article className={`workflow-step is-${props.state}${props.busy === true ? ' is-busy' : ''}`}>
      <span className="workflow-step-number">{props.busy === true ? <span className="workflow-step-spinner" role="status" aria-label="In progress" /> : props.state === 'done' ? <UiIcon name="check" /> : props.state === 'failed' ? <UiIcon name="close" /> : props.number}</span>
      <div className="workflow-step-copy"><strong>{props.title}</strong><span>{props.description}</span></div>
      {props.action === undefined || props.actionLabel === undefined ? null : <button type="button" onClick={props.action}>{props.actionLabel}</button>}
    </article>
  );
}

function SecurityMetric(props: { readonly label: string; readonly value: string; readonly state?: 'safe' | 'warn' | 'active' | 'neutral' }): ReactElement {
  return (
    <article className={`security-metric ${props.state ?? 'neutral'}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

function incidentLabel(t: ReturnType<typeof createTranslator>, classification: IncidentClassification): string {
  if (classification === 'local_tool_failed') return t('live.incident.localToolFailed');
  if (classification === 'tunnel_disconnected') return t('live.incident.tunnelDisconnected');
  if (classification === 'remote_turn_stopped') return t('live.incident.remoteTurnStopped');
  return t('live.incident.healthyOrInconclusive');
}
