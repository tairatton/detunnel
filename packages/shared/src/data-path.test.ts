import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveDetunnelDataPath, resolveDetunnelLegacyDataPath } from './data-path.js';

describe('resolveDetunnelDataPath', () => {
  it('uses the same explicit override for Desktop and MCP', () => {
    expect(resolveDetunnelDataPath({ DETUNNEL_DATA_PATH: 'D:\\agent-data', APPDATA: 'C:\\Users\\u\\AppData\\Roaming' })).toBe(path.resolve('D:\\agent-data'));
  });

  it('accepts the Docker data path override', () => {
    expect(resolveDetunnelDataPath({ DETUNNEL_DATA_PATH: '/root/.detunnel' })).toBe(path.resolve('/root/.detunnel'));
  });

  it('defaults to the per-user roaming AppData detunnel directory', () => {
    expect(resolveDetunnelDataPath({ APPDATA: 'C:\\Users\\u\\AppData\\Roaming' })).toBe(path.resolve('C:\\Users\\u\\AppData\\Roaming\\detunnel'));
  });

  it('accepts Electron appData as a fallback without embedding a build-machine profile', () => {
    expect(resolveDetunnelDataPath({}, 'C:\\Users\\end-user\\AppData\\Roaming')).toBe(path.resolve('C:\\Users\\end-user\\AppData\\Roaming\\detunnel'));
  });

  it('can locate the previous per-user directory for migration without using it as the active path', () => {
    const environment = { APPDATA: 'C:\\Users\\u\\AppData\\Roaming' };
    expect(resolveDetunnelLegacyDataPath(environment)).not.toBe(resolveDetunnelDataPath(environment));
  });
});
