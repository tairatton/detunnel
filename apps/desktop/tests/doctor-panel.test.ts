import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DoctorCheck } from '@detunnel/ipc-contracts';
import { DoctorPanel } from '../src/renderer/features/doctor/DoctorPanel.js';

function check(overrides: Partial<DoctorCheck> & Pick<DoctorCheck, 'id' | 'status'>): DoctorCheck {
  return {
    id: overrides.id,
    required: overrides.required ?? false,
    status: overrides.status,
    title: overrides.title ?? overrides.id,
    summary: overrides.summary ?? `${overrides.id} ${overrides.status}`,
    affectedToolNames: overrides.affectedToolNames ?? [],
    checkedAt: overrides.checkedAt ?? '2026-08-29T00:00:00.000Z',
    durationMs: overrides.durationMs ?? 12,
    ...overrides,
  };
}

describe('Doctor issue-first repair view', () => {
  it('offers Add Project recovery when the workspace check is not ready', () => {
    const markup = renderToStaticMarkup(createElement(DoctorPanel, {
      locale: 'en',
      report: { exitCode: 0, checks: [check({ id: 'registered_workspace', status: 'warn', summary: 'No project workspace is registered yet' })] },
      onRunDoctor: async () => undefined,
      onOpenProjects: () => undefined,
    }));
    expect(markup).toContain('Add Project');
  });

  it('orders issues before passed checks and renders affected tools plus remediation actions', () => {
    const markup = renderToStaticMarkup(createElement(DoctorPanel, {
      locale: 'en',
      report: {
        exitCode: 1,
        checks: [
          check({ id: 'ready-check', status: 'pass', title: 'Ready check' }),
          check({ id: 'warning-check', status: 'warn', title: 'Warning check' }),
          check({ id: 'required-unknown', status: 'unknown', required: true, title: 'Unknown check' }),
          check({ id: 'required-fail', status: 'fail', required: true, title: 'Failed check', affectedToolNames: ['read_file', 'read_files'], remediationId: 'recheck_runtime' }),
        ],
      },
      remediations: [{
        id: 'recheck_runtime',
        title: 'Recheck runtime',
        explanation: 'Check the local runtime again.',
        steps: ['Open runtime documentation', 'Recheck'],
        actions: [{ kind: 'open_official_url', target: 'runtime_documentation' }, { kind: 'recheck', requirementIds: ['executable_ripgrep'] }],
      }],
      onRunDoctor: async () => undefined,
      onRecheck: async () => undefined,
      onRemediation: async () => undefined,
      onOpenProjects: () => undefined,
    }));

    expect(markup.indexOf('Failed check')).toBeLessThan(markup.indexOf('Unknown check'));
    expect(markup.indexOf('Unknown check')).toBeLessThan(markup.indexOf('Warning check'));
    expect(markup).toContain('<details');
    expect(markup).toContain('Ready check');
    expect(markup).toContain('read_file, read_files');
    expect(markup).toContain('Recheck runtime');
    expect(markup).toContain('Open official site');
    expect(markup).toContain('Recheck this issue');
  });
});
