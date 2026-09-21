import type { LogLine } from '@detunnel/ipc-contracts';

export function applyLogSnapshot(
  previous: readonly LogLine[],
  previousIds: ReadonlySet<number>,
  snapshotLines: readonly LogLine[],
): { readonly lines: LogLine[]; readonly ids: Set<number> } {
  const byId = new Map<number, LogLine>();
  for (const line of previous) byId.set(line.id, line);
  for (const line of snapshotLines) {
    if (!byId.has(line.id)) byId.set(line.id, line);
  }
  const lines = [...byId.values()].sort((left, right) => left.id - right.id);
  // Do not retain IDs for lines that were evicted from the bounded buffer.
  // Keeping the old Set made renderer memory grow for the entire app lifetime.
  const ids = new Set(lines.map((line) => line.id));
  return { lines, ids };
}
