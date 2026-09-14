import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('home activity layout', () => {
  it('keeps Work Log only on its dedicated page instead of duplicating it on Home', () => {
    const home = readFileSync(new URL('../src/renderer/features/home/ControlCenterPage.tsx', import.meta.url), 'utf8');
    expect(home).not.toContain('WorkLogPanel');
  });
});
