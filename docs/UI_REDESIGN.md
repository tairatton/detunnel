# Desktop UI refresh

The product uses a shared dark graphite and gold presentation layer with bundled Prompt typography and local SVG navigation icons. Runtime, permission, and transport contracts remain authoritative.

## Scope

- Shared shell: consistent navigation, active state, typography, focus and controls.
- Home: compact security metrics, quieter surfaces, clear status and endpoint hierarchy.
- Projects: compact registration rows, active and primary state, readable paths.
- Tools: readable descriptions, separate readiness and availability, responsive metadata.
- Work Log and Live Logs: consistent toolbar and terminal surface, full scope identifiers.
- Settings: compact subnavigation, readable field descriptions and save bar.
- Doctor: semantic warning color and readable problem summaries.
- Onboarding, tool details and detached logs share the same presentation system.

## Focused product surface

The current desktop direction is intentionally narrower than the historical gateway feature set:

1. **Phase 1 — Core surface (implemented):** Home is the only primary screen. Settings opens in a side drawer from the title bar, preserving the current task while exposing connection and security controls. Home prioritizes the ChatGPT bridge and selected projects; Local runtime, security detail, incident capture, stop/restart controls, and the legacy Secure MCP Tunnel are secondary or conditional surfaces.
2. **Phase 2 — Connection truthfulness:** keep Remote MCP + OAuth as the supported ChatGPT path, clearly distinguish ChatGPT account authentication from transport credentials, and remove legacy API-key setup from the normal journey.
3. **Phase 3 — Runtime cleanup:** stop initializing or exposing unused tools, worklog, live-log, doctor, backup, and external-MCP workflows unless an explicit advanced/recovery mode is requested.
4. **Phase 4 — Validation:** add a real Electron smoke pass for first launch, ChatGPT pairing, reconnect, project selection, offline tunnel, and language switching before deleting compatibility IPC/backend code.

## Verification and follow-up

Run renderer type checking, renderer build and the relevant desktop UI tests. Verify real Electron layouts in both languages at 1280×800, 1440×900 and 1024×768, including keyboard navigation, modal focus, unsaved settings, long paths and log scrolling. Native titlebar colors and runtime integration require an Electron check; static markup tests alone cannot validate these.

Future structural work: consolidate historical CSS into component styles, unify field labels and save behavior, and evaluate a dedicated connection overview using real runtime data.
