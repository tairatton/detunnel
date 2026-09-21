import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { installRipgrep, type RipgrepPackage } from '../src/main/ripgrep-installer.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('ripgrep installer', () => {
  it('downloads a pinned archive, verifies it, installs rg.exe, and reuses it', async () => {
    const dataPath = await mkdtemp(path.join(os.tmpdir(), 'detunnel-ripgrep-'));
    roots.push(dataPath);
    const archive = Buffer.from('test ripgrep archive');
    const packageInfo = testPackage(archive);
    let downloads = 0;
    let extracts = 0;
    const options = {
      package: packageInfo,
      fetchImpl: async (): Promise<ReturnType<typeof response>> => {
        downloads += 1;
        return response(archive);
      },
      extractImpl: async (_archivePath: string, options: { readonly dir: string }): Promise<void> => {
        extracts += 1;
        const bin = path.join(options.dir, `ripgrep-${packageInfo.version}-x86_64-pc-windows-msvc`);
        await mkdir(bin, { recursive: true });
        await writeFile(path.join(bin, 'rg.exe'), 'fixture');
      },
    };

    const first = await installRipgrep(dataPath, options);
    expect(first.reused).toBe(false);
    expect(first.executablePath).toBe(path.join(dataPath, 'runtime-tools', 'ripgrep', 'rg.exe'));
    expect(await readFile(first.executablePath, 'utf8')).toBe('fixture');

    const second = await installRipgrep(dataPath, options);
    expect(second.reused).toBe(true);
    expect(downloads).toBe(1);
    expect(extracts).toBe(1);
  });

  it('refuses a tampered archive before extraction', async () => {
    const dataPath = await mkdtemp(path.join(os.tmpdir(), 'detunnel-ripgrep-'));
    roots.push(dataPath);
    const packageInfo = { ...testPackage(Buffer.from('expected')), archiveSha256: '0'.repeat(64) };

    await expect(installRipgrep(dataPath, {
      package: packageInfo,
      fetchImpl: async () => response(Buffer.from('tampered')),
      extractImpl: async () => { throw new Error('must not extract'); },
    })).rejects.toThrow('integrity check failed');
  });
});

function testPackage(archive: Buffer): RipgrepPackage {
  return {
    version: 'test-1',
    sourceUrl: 'https://example.invalid/ripgrep.zip',
    archiveSha256: createHash('sha256').update(archive).digest('hex'),
  };
}

function response(body: Buffer): { readonly ok: true; readonly status: 200; readonly statusText: 'OK'; readonly headers: { get(name: string): string | null }; arrayBuffer(): Promise<ArrayBuffer> } {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: (name: string) => name.toLowerCase() === 'content-length' ? String(body.byteLength) : null },
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer,
  };
}
