import { readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCheckpointEncryptionKey, loadOrCreateWindowsProtectedKey, protectWithWindowsDpapi, unprotectWithWindowsDpapi } from './windows-dpapi.js';

describe.runIf(process.platform === 'win32')('Windows DPAPI helpers', () => {
  it('round-trips UTF-8 text through direct Windows DPAPI', () => {
    const plaintext = 'lnwjud-dpapi-ทดสอบ-' + Date.now();
    const protectedValue = protectWithWindowsDpapi(plaintext);
    expect(protectedValue).not.toContain(plaintext);
    expect(unprotectWithWindowsDpapi(protectedValue)).toBe(plaintext);
  }, 15_000);

  it('persists a v2 protected key and reuses the same key', async () => {
    const filePath = path.join(os.tmpdir(), 'lnwjud-dpapi-' + process.pid + '-' + Date.now() + '.key');
    try {
      const first = loadOrCreateWindowsProtectedKey(filePath, 32);
      const stored = await readFile(filePath, 'utf8');
      expect(stored).toMatch(/^dpapi:v2:/);
      expect(loadOrCreateWindowsProtectedKey(filePath, 32)).toEqual(first);
    } finally {
      await rm(filePath, { force: true });
    }
  }, 15_000);
});

describe.runIf(process.platform !== 'win32')('portable checkpoint key helper', () => {
  it('creates and reuses a local key when Windows DPAPI is unavailable', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-local-key-'));
    const filePath = path.join(directory, 'checkpoint-master.key');
    try {
      const first = loadCheckpointEncryptionKey(directory);
      const stored = await readFile(filePath, 'utf8');
      expect(stored).toMatch(/^local:v1:/);
      expect(loadCheckpointEncryptionKey(directory)).toEqual(first);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
