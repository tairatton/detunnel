import type { ReactElement } from 'react';
import type { Screen } from './AppShell.js';

const paths: Record<Screen, string> = {
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  projects: 'M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z',
  tools: 'M14 6a5 5 0 0 0-6 6L3 17v4h4l5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3Z',
  worklog: 'M3 12h4l3-8 4 16 3-8h4',
  live: 'm5 7 5 5-5 5m8 0h6M3 3h18v18H3Z',
  settings: 'M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  doctor: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6',
};

export function NavIcon({ screen }: { readonly screen: Screen }): ReactElement {
  return <span className="icon-tile nav-icon-tile"><svg className="nav-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[screen]} /></svg></span>;
}
