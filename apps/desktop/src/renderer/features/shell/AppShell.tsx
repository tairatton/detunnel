import type { ReactElement, ReactNode } from 'react';
import type { UiLocale, UpdateStatus } from '@lnwjud/ipc-contracts';
import { createTranslator } from '../../i18n/index.js';
import { UiIcon } from './UiIcon.js';

export type Screen = 'home' | 'projects' | 'tools' | 'worklog' | 'live' | 'settings' | 'doctor';

interface AppShellProps {
  readonly locale: UiLocale;
  readonly appVersion: string;
  readonly mcpRunning: boolean;
  readonly desktopFullBypassOn: boolean;
  readonly stdioFullBypassOn: boolean;
  readonly updateStatus: UpdateStatus | null;
  readonly settingsOpen: boolean;
  readonly onSettingsToggle: () => void;
  readonly onLocaleChange: (locale: UiLocale) => void;
  readonly onUpdateAction: () => void;
  readonly children: ReactNode;
}

export function AppShell(props: AppShellProps): ReactElement {
  const t = createTranslator(props.locale);
  return (
    <div className="window-container">
      {/* Modern Titlebar */}
      <header className="custom-titlebar">
        <div className="titlebar-drag-region">
          <div className="titlebar-brand">
            <img src="./logo.png" alt="" className="titlebar-logo" aria-hidden="true" />
            <span className="titlebar-title" aria-label={t('brand')}>detunnel</span>
            <button
              type="button"
              className={`titlebar-version update-${props.updateStatus?.phase ?? 'idle'}`}
              onClick={props.onUpdateAction}
              title={props.updateStatus?.message ?? (props.locale === 'th' ? 'กดเพื่อตรวจอัปเดต' : 'Check for updates')}
              aria-label={props.updateStatus?.canInstall === true
                ? (props.locale === 'th' ? `ติดตั้งอัปเดต ${props.updateStatus.availableVersion ?? ''}` : `Install update ${props.updateStatus.availableVersion ?? ''}`)
                : (props.locale === 'th' ? 'ตรวจอัปเดต' : 'Check for updates')}
              aria-busy={props.updateStatus?.phase === 'checking' || props.updateStatus?.phase === 'downloading'}
            >
              {versionBadgeText(props.updateStatus, props.locale, props.appVersion)}
            </button>
          </div>

          <div className="titlebar-center">
            <div className="titlebar-status-indicator">
              <span className={`titlebar-dot ${props.mcpRunning ? 'active' : ''}`}></span>
              <span>{props.mcpRunning ? (props.locale === 'th' ? 'MCP Gateway ออนไลน์' : 'MCP Gateway Online') : (props.locale === 'th' ? 'MCP Gateway ออฟไลน์' : 'MCP Gateway Offline')}</span>
              {props.desktopFullBypassOn ? <strong className="pill-badge danger" role="status">DESKTOP FULL BYPASS ON</strong> : null}
              {props.stdioFullBypassOn ? <strong className="pill-badge danger" role="status">STDIO FULL BYPASS ON</strong> : null}
            </div>
          </div>
        </div>

        <div className="titlebar-actions">
          <div className="locale-switch" role="group" aria-label={t('settings.locale')}>
            <button
              type="button"
              className={props.locale === 'th' ? 'active' : undefined}
              onClick={() => props.onLocaleChange('th')}
            >
              {t('language.th')}
            </button>
            <button
              type="button"
              className={props.locale === 'en' ? 'active' : undefined}
              onClick={() => props.onLocaleChange('en')}
            >
              {t('language.en')}
            </button>
          </div>
          <button
            type="button"
            className={props.settingsOpen ? 'titlebar-settings-toggle active' : 'titlebar-settings-toggle'}
            onClick={props.onSettingsToggle}
            title={props.locale === 'th' ? 'เปิดการตั้งค่า' : 'Open settings'}
            aria-label={props.locale === 'th' ? 'เปิดการตั้งค่า' : 'Open settings'}
            aria-expanded={props.settingsOpen}
          >
            <UiIcon name="sliders" />
          </button>
        </div>
      </header>

      {/* Main App Body */}
      <div className="app-shell one-page-shell">
        <div className="main-pane focus-main-pane">
          <main className="main-content">{props.children}</main>
        </div>
      </div>
    </div>
  );
}

function versionBadgeText(status: UpdateStatus | null, locale: UiLocale, appVersion: string): string {
  const displayVersion = status?.currentVersion.trim() || appVersion.trim() || 'unknown';
  if (status === null) return `v${displayVersion}`;
  const next = status.availableVersion;
  if (status.phase === 'ready' && next !== null) return locale === 'th' ? `อัปเดต v${next}` : `Update v${next}`;
  if (status.phase === 'installing' && next !== null) return locale === 'th' ? `กำลังติดตั้ง v${next}` : `Installing v${next}`;
  if (status.phase === 'downloading') {
    const percent = status.progressPercent === null ? '' : ` ${Math.round(status.progressPercent)}%`;
    return `v${displayVersion} ↓${percent}`;
  }
  if (status.phase === 'available' && next !== null) return `v${displayVersion} → v${next}`;
  if (status.phase === 'checking') return locale === 'th' ? `v${displayVersion} • เช็ก…` : `v${displayVersion} • checking…`;
  if (status.phase === 'error') return `v${displayVersion} • !`;
  return `v${displayVersion}`;
}
