import type { DetunnelApi } from '@detunnel/ipc-contracts';

declare global {
  interface Window {
    readonly detunnel: DetunnelApi;
  }
}

export {};
