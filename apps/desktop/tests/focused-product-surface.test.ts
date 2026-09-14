import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const shellSource = readFileSync(new URL('../src/renderer/features/shell/AppShell.tsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/renderer/App.tsx', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/renderer/features/home/ControlCenterPage.tsx', import.meta.url), 'utf8');
const settingsSource = readFileSync(new URL('../src/renderer/features/settings/SettingsPage.tsx', import.meta.url), 'utf8');
const productCss = readFileSync(new URL('../src/renderer/product.css', import.meta.url), 'utf8');

describe('focused ChatGPT product surface', () => {
  it('uses one workspace with Settings in a drawer instead of a sidebar page', () => {
    expect(shellSource).toContain('app-shell one-page-shell');
    expect(shellSource).toContain('titlebar-settings-toggle');
    expect(shellSource).not.toContain('<aside className="sidebar"');
    expect(appSource).toContain('settingsDrawerOpen');
    expect(appSource).toContain('<SettingsDrawer open={settingsDrawerOpen}');
  });

  it('renders the active workflow indicator as a circular spinner', () => {
    expect(productCss).toContain('.workflow-step-spinner');
    expect(productCss).toContain('border-radius: 50%');
    expect(productCss).toContain('border-top-color: #d9ecff');
  });

  it('uses the Home connection card instead of opening the legacy first-run API-key tip', () => {
    expect(homeSource).toContain('chatgpt-connection-card');
    expect(homeSource).toContain('workflow-steps');
    expect(homeSource).toContain('void props.onQuickConnect()');
    expect(homeSource).toContain('workflow-step-spinner');
    expect(homeSource).toContain("props.busy === true ? <span className=\"workflow-step-spinner\"");
    expect(homeSource).toContain("step2Busy ? 'current'");
    expect(homeSource).toContain("step3Busy ? 'current'");
    expect(homeSource).toContain("props.state === 'failed'");
    expect(homeSource).toContain('quickConnectFailedStep');
    expect(homeSource).toContain('recordedWorkflowFailureStep');
    expect(homeSource).toContain('resolvedWorkflowFailureStep');
    expect(homeSource).toContain('(recordedWorkflowFailureStep === 3 && !step3Passed)');
    expect(homeSource).toContain('quickConnectStep');
    expect(appSource).toContain('setQuickConnectStep(2)');
    expect(appSource).toContain('setQuickConnectStep(3)');
    expect(appSource).toContain('setQuickConnectStep(4)');
    expect(appSource).toContain('setQuickConnectFailedStep(activeQuickConnectStep)');
    expect(appSource).toContain("dashboard?.remoteMcp?.state === 'running'");
    expect(homeSource).toContain('onChooseWorkspaceFolder');
    expect(homeSource).toContain('active-project-action-label');
    expect(homeSource).toContain('role="radiogroup"');
    expect(homeSource).toContain('aria-checked={selected}');
    expect(homeSource).toContain('onSelectWorkspaceExclusive');
    expect(homeSource).toContain('onDeleteWorkspace');
    expect(homeSource).toContain('active-project-remove');
    expect(homeSource).not.toContain('active-project-status');
    expect(homeSource).not.toContain('NOT ACTIVE');
    expect(homeSource).toContain('ไม่ลบโฟลเดอร์หรือไฟล์');
    expect(homeSource).toContain('เลือกใช้งานได้ครั้งละ 1 โปรเจกต์');
    expect(appSource).toContain('async function selectWorkspaceExclusive(workspaceId: string)');
    expect(appSource).toContain('if (workspace.id !== workspaceId) await window.lnwjud.setWorkspaceActive({ workspaceId: workspace.id, active: false })');
    expect(appSource).toContain('async function addWorkspaceExclusive(rootPath: string)');
    expect(homeSource).not.toContain('Remove from active');
    expect(homeSource).not.toContain('Add to active');
    expect(homeSource).not.toContain('primary-project-control');
    expect(homeSource).toContain('CHATGPT_BRIDGE_HIDDEN_STORAGE_KEY');
    expect(homeSource).toContain('chatgpt-connection-hide');
    expect(homeSource).toContain('chatgpt-reconnect-button');
    expect(homeSource).toContain('chatgpt-action-buttons');
    expect(homeSource).toContain("props.locale === 'th' ? 'เชื่อมต่อใหม่' : 'Reconnect'");
    expect(homeSource).toContain('disabled={props.reconnectBusy || props.quickConnectBusy || !remoteMcp.installed || dashboard.selectedWorkspace === null}');
    expect(productCss).toContain('grid-template-columns: 104px 132px 120px');
    expect(productCss).toContain('height: 40px; min-height: 40px');
    expect(appSource).toContain('regenerateRemoteMcpPairingCode()');
    expect(appSource).toContain('reconnectBusyRef.current');
    const reconnectFlow = appSource.slice(appSource.indexOf('async function reconnectRemoteMcp()'), appSource.indexOf('function changeGuidedTunnelSetupOpen'));
    expect(reconnectFlow.indexOf('stopRemoteMcp()')).toBeLessThan(reconnectFlow.indexOf('regenerateRemoteMcpPairingCode()'));
    expect(reconnectFlow.indexOf('regenerateRemoteMcpPairingCode()')).toBeLessThan(reconnectFlow.indexOf('startRemoteMcp()'));
    expect(reconnectFlow).toContain('replacement.publicMcpUrl === previous.publicMcpUrl');
    expect(homeSource).toContain('aria-expanded={!chatgptBridgeHidden}');
    expect(homeSource).toContain('ช่องทางยังออนไลน์และ URL ไม่เปลี่ยน');
    expect(homeSource).toContain('บันทึกการอนุญาตไว้ แต่ช่องทางออฟไลน์');
    expect(homeSource).toContain('setChatgptBridgeVisibility(false)');
    expect(homeSource).toContain('PAIRING_CODE_HIDDEN_STORAGE_KEY');
    expect(homeSource).toContain('pairing-code-visibility-toggle');
    expect(homeSource).toContain('aria-pressed={pairingCodeHidden}');
    expect(homeSource).toContain('ซ่อนรายละเอียด');
    expect(homeSource).toContain('is-pairing-used');
    expect(homeSource).toContain('PAIRING_CODE_VISIBILITY_EVENT');
    expect(appSource).toContain('chooseWorkspaceFolder');
    expect(appSource).toContain('async function quickConnect()');
    expect(appSource).toContain("Could not open the folder picker. Please try again.");
    expect(homeSource).toContain('number="1"');
    expect(homeSource).toContain('number="4"');
    expect(homeSource).toContain('home-advanced-actions');
    expect(homeSource).not.toContain('local-runtime-details');
    expect(settingsSource).toContain('local-runtime-details');
    expect(homeSource).toContain("dashboard.tunnel.state === 'running' || dashboard.tunnel.auth?.mode === 'oauth'");
    expect(appSource).not.toContain("import { FirstRunTunnelTip }");
    expect(appSource).toContain("writeGuidedTunnelSetupState(window.localStorage, 'dismissed')");
    expect(appSource).toContain('Startup must always land on Home');
    expect(appSource).not.toContain("if (decision === 'resume_settings') openGuidedTunnelSettings(true);");
  });

  it('keeps View URL on Home instead of routing it to Settings', () => {
    expect(homeSource).toContain('onViewPublicUrl');
    expect(homeSource).toContain('id="public-mcp-url"');
    expect(appSource).toContain('function viewPublicMcpUrl(): void');
    expect(appSource).toContain('target.scrollIntoView({ behavior: \'smooth\', block: \'center\' })');
    expect(homeSource).not.toContain('remoteMcpOnline && !props.quickConnectBusy ? props.onOpenTunnelSetup : undefined} actionLabel={props.locale === \'th\' ? \'ดู URL\' : \'View URL\'}');
  });

  it('keeps only core Settings sections in the visible Settings subnav', () => {
    expect(settingsSource).toContain("const navItems = allNavItems.filter((item) => item.id === 'general' || item.id === 'security' || item.id === 'tunnel');");
    expect(settingsSource).toContain("secureTunnelOnline || props.dashboard.tunnel.auth?.mode === 'oauth'");
  });
});
