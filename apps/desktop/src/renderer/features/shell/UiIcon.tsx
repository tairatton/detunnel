import type { ReactElement } from 'react';

export type UiIconName =
  | 'archive'
  | 'check'
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'folder'
  | 'link'
  | 'network'
  | 'refresh'
  | 'shield'
  | 'sliders'
  | 'terminal'
  | 'tool'
  | 'warning';

const paths: Record<UiIconName, string> = {
  archive: 'M4 7h16v13H4zM3 4h18v3H3zM9 11h6',
  check: 'm5 12 4 4L19 6',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-right': 'm9 6 6 6-6 6',
  close: 'm6 6 12 12M18 6 6 18',
  folder: 'M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z',
  link: 'M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15m3.15 5.92a5 5 0 0 0-7.07-.07l-2 2a5 5 0 0 0 7.07 7.07l1.15-1.15',
  network: 'M5 5h4v4H5zM15 5h4v4h-4zM10 15h4v4h-4zM9 7h6M7 9v4h6v2M17 9v4h-3',
  refresh: 'M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4',
  shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6',
  sliders: 'M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4',
  terminal: 'M4 5h16v14H4zM7 9l3 3-3 3M13 15h4',
  tool: 'M14 6a5 5 0 0 0-6 6L3 17v4h4l5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3Z',
  warning: 'm12 4 9 16H3l9-16Zm0 5v4m0 4h.01',
};

export function UiIcon({ name, className }: { readonly name: UiIconName; readonly className?: string }): ReactElement {
  return (
    <svg
      className={className === undefined ? 'ui-icon' : `ui-icon ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function MessageIcon({ kind }: { readonly kind: 'success' | 'warning' }): ReactElement {
  return <span className={`icon-tile message-icon message-icon-${kind}`}><UiIcon name={kind === 'success' ? 'check' : 'warning'} /></span>;
}
