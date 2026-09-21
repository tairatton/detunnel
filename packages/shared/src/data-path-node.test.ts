import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DETUNNEL_LEGACY_DATABASE_FILENAME, resolveDetunnelLegacyDataPath } from './data-path.js';
import { migrateDetunnelDataPath } from './data-path-node.js';

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('migrateDetunnelDataPath', () => {
  it('moves legacy state and renames database sidecar files without overwriting new state', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'detunnel-data-migration-'));
    temporaryRoots.push(root);
    const appData = path.join(root, 'roaming');
    const active = path.join(appData, 'detunnel');
    const legacy = resolveDetunnelLegacyDataPath({ APPDATA: appData });
    fs.mkdirSync(legacy, { recursive: true });
    fs.writeFileSync(path.join(legacy, DETUNNEL_LEGACY_DATABASE_FILENAME), 'database');
    fs.writeFileSync(path.join(legacy, `${DETUNNEL_LEGACY_DATABASE_FILENAME}-wal`), 'wal');
    fs.writeFileSync(path.join(legacy, 'settings.json'), 'settings');
    fs.mkdirSync(active, { recursive: true });
    fs.writeFileSync(path.join(active, 'settings.json'), 'new-settings');

    expect(migrateDetunnelDataPath(active, { APPDATA: appData })).toBe(true);
    expect(fs.readFileSync(path.join(active, 'detunnel.sqlite'), 'utf8')).toBe('database');
    expect(fs.readFileSync(path.join(active, 'detunnel.sqlite-wal'), 'utf8')).toBe('wal');
    expect(fs.readFileSync(path.join(active, 'settings.json'), 'utf8')).toBe('new-settings');
  });

  it('does not migrate when an explicit data path is configured', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'detunnel-data-configured-'));
    temporaryRoots.push(root);
    const appData = path.join(root, 'roaming');
    const legacy = resolveDetunnelLegacyDataPath({ APPDATA: appData });
    fs.mkdirSync(legacy, { recursive: true });
    fs.writeFileSync(path.join(legacy, 'settings.json'), 'settings');

    expect(migrateDetunnelDataPath(path.join(root, 'configured'), { APPDATA: appData, DETUNNEL_DATA_PATH: path.join(root, 'configured') })).toBe(false);
    expect(fs.existsSync(path.join(legacy, 'settings.json'))).toBe(true);
  });
});
