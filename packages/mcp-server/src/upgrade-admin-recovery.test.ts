import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FileActor } from '@detunnel/application';
import { UpgradeRuntimeService } from './upgrade-runtime.js';

const actor: FileActor = { clientId: 'admin-recovery', clientName: 'admin-recovery-test', sessionId: 'session-a' };

describe('upgrade administrative recovery snapshots', () => {
  it('keeps a recoverable plugin pre-image for persistent plugin removal', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'detunnel-upgrade-admin-'));
    const runtimeStatePath = path.join(directory, 'runtime.json');
    const recoveryDirectory = path.join(directory, 'runtime.state-v2', 'recovery');
    const runtime = new UpgradeRuntimeService({ runtimeStatePath }, actor);

    await expect(runtime.execute('plugin_install', { name: 'safe-plugin' }))
      .resolves.toMatchObject({ ok: true, value: { status: 'ready', executed: true, persistence: 'shared_locked_state' } });
    await expect(runtime.execute('plugin_remove', { name: 'safe-plugin', userConfirmed: true }))
      .resolves.toMatchObject({ ok: true, value: { status: 'ready', executed: true, removed: true } });

    const snapshots = await readRecoverySnapshots(recoveryDirectory);
    expect(snapshots.some((snapshot) => snapshot.plugins?.some((plugin) => plugin.name === 'safe-plugin'))).toBe(true);
  }, 15_000);

});

async function readRecoverySnapshots(directory: string): Promise<Array<{ plugins?: Array<{ name?: string }> }>> {
  const names = await readdir(directory);
  return Promise.all(names.filter((name) => name.endsWith('.json')).map(async (name) => (
    JSON.parse(await readFile(path.join(directory, name), 'utf8')) as { plugins?: Array<{ name?: string }> }
  )));
}
