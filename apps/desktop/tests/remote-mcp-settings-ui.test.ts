import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const settingsSource = readFileSync(new URL('../src/renderer/features/settings/SettingsPage.tsx', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/renderer/features/home/ControlCenterPage.tsx', import.meta.url), 'utf8');
const settingsCssSource = readFileSync(new URL('../src/renderer/settings-extra.css', import.meta.url), 'utf8');

describe('Remote MCP Cloudflare Tunnel settings UI', () => {
  it('treats a verified executable as ready and disables redundant reinstall', () => {
    expect(settingsSource).toContain('const cloudflaredReady = remoteMcp.installed && remoteMcp.providerPath !== null;');
    expect(settingsSource).toContain("remoteMcp.state === 'running' || cloudflaredReady");
    expect(settingsSource).toContain('Cloudflare Tunnel พร้อมใช้งาน');
    expect(settingsSource).toContain('cloudflared และตรวจด้วยการรัน `cloudflared tunnel --version` จริง');
    expect(settingsSource).toContain('cloudflared-readiness-banner');
    expect(settingsSource).toContain('cloudflared-ready-path');
  });

  it('keeps ChatGPT OAuth as the primary path and collapses legacy Secure Tunnel', () => {
    expect(settingsSource).toContain('เส้นทางหลัก: เชื่อม ChatGPT กับคอมเครื่องนี้');
    expect(settingsSource).toContain('detunnel ไม่เรียก OpenAI API และไม่ใช้ OpenAI API key สำหรับตัวโมเดล');
    expect(settingsSource).toContain('connection-method-stack is-recommended');
    expect(settingsSource).toContain("setSecureMethodOpen(false)");
    expect(homeSource).toContain('setSecureTunnelExpanded(!remoteMcpOnline && dashboard.tunnel.state === \'running\')');
    expect(homeSource).toContain('Keep the legacy transport out of the first-run surface');
  });

  it('renders the first-time pairing PIN as a dedicated high-visibility value', () => {
    expect(settingsSource).toContain('remote-mcp-pairing-line');
    expect(settingsSource).toContain('remote-mcp-pairing-pin');
    expect(settingsSource).toContain('ใช้ PIN นี้เพื่ออนุญาต ChatGPT ครั้งเดียว');
    expect(homeSource).toContain('remote-mcp-pairing-line');
    expect(homeSource).toContain('remote-mcp-pairing-pin');
    expect(settingsCssSource).toContain('.remote-mcp-pairing-line .remote-mcp-pairing-pin');
    expect(settingsCssSource).toContain('font-size: 1.55em');
    expect(settingsCssSource).toContain('color: #8ff0b0');
    expect(settingsCssSource).toContain('letter-spacing: .14em');
  });

  it('allows a new pairing code when OAuth is not linked yet', () => {
    expect(settingsSource).toContain("disabled={remoteMcpBusy || remoteMcp.state !== 'running'}");
    expect(settingsSource).toContain('สร้าง Pairing Code ใหม่');
    expect(settingsSource).toContain('Generate pairing code');
    expect(settingsSource).toContain('remoteMcp.pairingRequired && remoteMcp.pairingCode === null');
    expect(settingsSource).toContain('ไม่พบ Pairing Code');
    expect(settingsSource).toContain('PAIRING_CODE_HIDDEN_STORAGE_KEY');
    expect(settingsSource).toContain('pairing-code-visibility-toggle');
    expect(settingsSource).toContain('aria-pressed={pairingCodeHidden}');
    expect(settingsSource).toContain('PAIRING_CODE_VISIBILITY_EVENT');
    expect(settingsSource).toContain('ใช้ยืนยันแล้ว · ไม่ต้องใช้ซ้ำ');
  });
});
