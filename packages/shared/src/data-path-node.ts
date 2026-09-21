import fs from 'node:fs';
import path from 'node:path';
import {
  DETUNNEL_LEGACY_DATABASE_FILENAME,
  resolveDetunnelLegacyDataPath,
  type DataPathEnvironment,
} from './data-path.js';

const activeDatabaseFilename = 'detunnel.sqlite';

/**
 * Migrate an older per-user state directory without overwriting a newer one.
 * Existing destination entries always win; failed moves are left in place.
 */
export function migrateDetunnelDataPath(
  dataPath: string,
  environment: DataPathEnvironment = process.env,
  roamingAppDataFallback?: string,
): boolean {
  if (environment.DETUNNEL_DATA_PATH?.trim()) return false;

  const legacyPath = resolveDetunnelLegacyDataPath(environment, roamingAppDataFallback);
  if (path.resolve(legacyPath) === path.resolve(dataPath) || !fs.existsSync(legacyPath)) return false;

  fs.mkdirSync(dataPath, { recursive: true });
  let migrated = false;
  for (const entry of fs.readdirSync(legacyPath, { withFileTypes: true })) {
    const destinationName = renameLegacyDatabaseEntry(entry.name);
    const sourcePath = path.join(legacyPath, entry.name);
    const destinationPath = path.join(dataPath, destinationName);
    if (fs.existsSync(destinationPath)) continue;
    try {
      fs.renameSync(sourcePath, destinationPath);
      migrated = true;
    } catch {
      // A locked or cross-device entry must not prevent startup. The old state
      // remains available for a later retry or manual recovery.
    }
  }
  return migrated;
}

function renameLegacyDatabaseEntry(name: string): string {
  if (name === DETUNNEL_LEGACY_DATABASE_FILENAME) return activeDatabaseFilename;
  if (name.startsWith(`${DETUNNEL_LEGACY_DATABASE_FILENAME}-`)) {
    return `${activeDatabaseFilename}${name.slice(DETUNNEL_LEGACY_DATABASE_FILENAME.length)}`;
  }
  return name;
}
