import os from 'node:os';
import path from 'node:path';

export interface DataPathEnvironment {
  readonly DETUNNEL_DATA_PATH?: string;
  readonly APPDATA?: string;
  readonly USERPROFILE?: string;
  readonly HOME?: string;
}

/** Resolve the shared per-user data directory without embedding a developer profile path. */
export function resolveDetunnelDataPath(
  environment: DataPathEnvironment = process.env,
  roamingAppDataFallback?: string,
): string {
  const configured = environment.DETUNNEL_DATA_PATH?.trim();
  if (configured) return path.resolve(configured);

  if (process.platform !== 'win32') {
    const home = environment.HOME?.trim() || os.homedir();
    return path.resolve(home, '.detunnel');
  }

  const appData = firstNonEmpty(
    environment.APPDATA,
    roamingAppDataFallback,
    environment.USERPROFILE ? path.join(environment.USERPROFILE, 'AppData', 'Roaming') : undefined,
    environment.HOME ? path.join(environment.HOME, 'AppData', 'Roaming') : undefined,
    path.join(os.homedir(), 'AppData', 'Roaming'),
  );
  // Keep the historical default so Desktop, STDIO, and upgrades continue to
  // share the same state. Docker supplies DETUNNEL_DATA_PATH explicitly.
  return path.resolve(appData, 'lnwjud');
}

export const resolveLnwjudDataPath = resolveDetunnelDataPath;

function firstNonEmpty(...values: readonly (string | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return path.join(os.homedir(), 'AppData', 'Roaming');
}
