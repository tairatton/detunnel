import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import type { UiLocale } from '@detunnel/ipc-contracts';
import { UiIcon } from '../shell/UiIcon.js';

interface SettingsDrawerProps {
  readonly open: boolean;
  readonly locale: UiLocale;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function SettingsDrawer(props: SettingsDrawerProps): ReactElement | null {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const priorFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!props.open) return undefined;
    priorFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    return (): void => priorFocusRef.current?.focus();
  }, [props.open]);

  if (!props.open) return null;

  return (
    <div className="settings-drawer-backdrop">
      <section className="settings-drawer" role="dialog" aria-modal="true" aria-label={props.locale === 'th' ? 'การตั้งค่า' : 'Settings'}>
        <header className="settings-drawer-header">
          <div>
            <span>DETUNNEL</span>
            <strong>{props.locale === 'th' ? 'การตั้งค่า' : 'Settings'}</strong>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="settings-drawer-close"
            onClick={props.onClose}
            aria-label={props.locale === 'th' ? 'ปิดการตั้งค่า' : 'Close settings'}
            title={props.locale === 'th' ? 'ปิดการตั้งค่า' : 'Close settings'}
          >
            <UiIcon name="close" />
          </button>
        </header>
        <div className="settings-drawer-content">{props.children}</div>
      </section>
    </div>
  );
}
