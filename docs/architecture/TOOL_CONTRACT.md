# detunnel tool contract

Status: God-Tier Wave 0–8 additive contract snapshot synchronized for `v2.0.0`.

This is the compatibility contract for the current MCP surface. The runtime
advertises the JSON Schema for every input through `tools/list`; the TypeScript
Zod schemas in `packages/mcp-server/src/tools/` are the implementation source
of truth. The existing human-oriented catalog remains useful for field details,
while this document records the primitive/core contract, preserves the earlier
compatibility baseline, and records policy class, annotations, and schema source.
The complete v4 inventory contains 217 tool definitions. The default runtime currently advertises 210 through `tools/list`, and all 217 are advertised when the six `codex_*` delegation tools plus the bounded read-only `agent_swarm_run` tool are enabled. The seven Codex/Agent Swarm definitions are opt-in; every other current first-party definition remains available through the default catalog and reports dependency/setup state truthfully at runtime. The additive v4 entries are defined
in `packages/mcp-server/src/upgrade-catalog.ts` and the exact runtime order is
verified by `packages/mcp-server/src/tool-registry.test.ts`.

Desktop readiness is a separate presentation contract built from the same live definitions. Main-process requirement probes are read-only, timeout-bounded, cached, and shared by the Tools catalog and structured Doctor report. Readiness never grants permission or bypasses workspace/command policy. External MCP descriptors remain a separate origin and use `UNKNOWN` for child-server permission/readiness semantics detunnel cannot verify.

**Effective exposure boundary (v4.54.0):** First-party tool exposure is resolved independently from readiness and permission using persisted per-tool intent plus canonical Settings/runtime eligibility and default exposure. Hard Settings/runtime prerequisites are authoritative: a persisted `enabled` override cannot bypass a disabled family gate, missing provider, unsupported platform, or other system-ineligible state. `codex_*` and `agent_swarm_run`, for example, remain effectively hidden until Codex Delegation and the required runtime/provider make that family eligible. `ToolRegistry.listAll()` always remains the recovery-safe canonical inventory; `ToolRegistry.list()`, new `invoke()` calls, `tool_batch` children, and tool discovery/ranking/describe surfaces apply `effectiveExposed`. Disabling a tool blocks new execution but does not cancel a call that already crossed the registry boundary. Long-lived MCP servers keep canonical SDK registrations and toggle `RegisteredTool.enable()/disable()` handles so `notifications/tools/list_changed` is emitted for meaningful list transitions. Desktop and direct stdio share persisted availability state, while external MCP child tools retain their own control plane.

**ChatGPT host-sync boundary:** MCP list-change notification proves only that the MCP server offered a different list. It is not proof that an approved ChatGPT app/action snapshot was refreshed. ChatGPT-specific guidance is conditional and must never promise that browser F5 alone updates a frozen/approved host snapshot.

**Active Workspace Set boundary:** Primary/Selected Project is only the default. Every tool may target any registered workspace currently in the host Active Projects set. When an input contains an absolute path/cwd/database target/native path that belongs to another active root, the registry routes the effective `workspaceId` to the most-specific matching active workspace before policy and handler dispatch. Targets outside the active set remain guarded; one call is not allowed to silently span multiple active roots.

**Managed-browser target boundary:** page-targeted `dom_cdp` work is fail-closed and ID-pinned. The caller must first `list_tabs`, select the intended exact returned ID after inspecting URL/title, or create a safe target with `new_tab`; every target-scoped action and `steps` batch then carries that same top-level `tab_id`. A missing/closed ID is an error, never permission to select the first or OS-active tab. Native address-bar typing is not a browser-navigation fallback. Mutating a ChatGPT tab additionally requires both `allow_protected_tab_action: true` and real `userConfirmed: true`; Full Bypass does not satisfy that explicit-user condition.

<!-- BEGIN GENERATED TOOL REGISTRY -->
## Generated live ToolRegistry index

This complete inventory is generated from `ToolRegistry.listAll()`: **217 total tool definitions**. The runtime advertises **210 tools by default** and **217 tools when Codex delegation plus Agent Swarm is enabled** through `tools/list`.
Run `pnpm docs:tools` after intentionally changing the registry; CI runs `pnpm docs:tools:check` and fails on drift.

| # | Tool | Permission | Advertised | Delivery | Runtime evidence | Read-only | Destructive |
| ---: | --- | --- | --- | --- | --- | :---: | :---: |
| 1 | `workspace_list` | READ | default | operational | service_dispatch | yes | no |
| 2 | `workspace_register` | WRITE | default | operational | service_dispatch | no | no |
| 3 | `workspace_info` | READ | default | operational | service_dispatch | yes | no |
| 4 | `workspace_tree` | READ | default | operational | service_dispatch | yes | no |
| 5 | `project_snapshot` | READ | default | operational | service_dispatch | yes | no |
| 6 | `read_file` | READ | default | operational | service_dispatch | yes | no |
| 7 | `read_files` | READ | default | operational | service_dispatch | yes | no |
| 8 | `search_files` | READ | default | operational | service_dispatch | yes | no |
| 9 | `search_text` | READ | default | operational | service_dispatch | yes | no |
| 10 | `write_file` | WRITE | default | operational | service_dispatch | no | no |
| 11 | `apply_patch` | WRITE | default | operational | service_dispatch | no | no |
| 12 | `edit_file` | WRITE | default | operational | service_dispatch | no | no |
| 13 | `move_file` | WRITE | default | operational | service_dispatch | no | no |
| 14 | `copy_file` | WRITE | default | operational | service_dispatch | no | no |
| 15 | `delete_file` | DANGEROUS | default | operational | service_dispatch | no | yes |
| 16 | `list_recovery_items` | READ | default | operational | service_dispatch | yes | no |
| 17 | `restore_deleted_file` | WRITE | default | operational | service_dispatch | no | no |
| 18 | `list_checkpoints` | READ | default | operational | service_dispatch | yes | no |
| 19 | `restore_checkpoint` | WRITE | default | operational | service_dispatch | no | yes |
| 20 | `process_start` | EXECUTE | default | operational | service_dispatch | no | no |
| 21 | `process_list` | READ | default | operational | service_dispatch | yes | no |
| 22 | `process_status` | READ | default | operational | service_dispatch | yes | no |
| 23 | `process_logs` | READ | default | operational | service_dispatch | yes | no |
| 24 | `process_stop` | EXECUTE | default | operational | service_dispatch | no | no |
| 25 | `project_dev` | EXECUTE | default | operational | service_dispatch | no | no |
| 26 | `project_test` | EXECUTE | default | operational | service_dispatch | no | no |
| 27 | `project_lint` | EXECUTE | default | operational | service_dispatch | no | no |
| 28 | `project_typecheck` | EXECUTE | default | operational | service_dispatch | no | no |
| 29 | `project_build` | EXECUTE | default | operational | service_dispatch | no | no |
| 30 | `codex_status` | READ | Codex opt-in | operational | service_dispatch | yes | no |
| 31 | `codex_run` | EXECUTE | Codex opt-in | operational | service_dispatch | no | no |
| 32 | `codex_task_list` | READ | Codex opt-in | operational | service_dispatch | yes | no |
| 33 | `codex_task_status` | READ | Codex opt-in | operational | service_dispatch | yes | no |
| 34 | `codex_task_logs` | READ | Codex opt-in | operational | service_dispatch | yes | no |
| 35 | `codex_stop` | EXECUTE | Codex opt-in | operational | service_dispatch | no | no |
| 36 | `agent_swarm_run` | EXECUTE | Codex opt-in | dependency_gated | service_dispatch | no | no |
| 37 | `shell` | EXECUTE | default | operational | service_dispatch | no | yes |
| 38 | `dom_cdp` | READ | default | operational | service_dispatch | no | yes |
| 39 | `computer_use` | EXECUTE | default | operational | service_dispatch | no | yes |
| 40 | `accessibility` | READ | default | operational | service_dispatch | no | yes |
| 41 | `input_event` | EXECUTE | default | operational | service_dispatch | no | yes |
| 42 | `vision` | READ | default | operational | service_dispatch | yes | no |
| 43 | `vision_annotated_capture` | READ | default | operational | service_dispatch | yes | no |
| 44 | `ui_target_action` | EXECUTE | default | operational | service_dispatch | no | yes |
| 45 | `window` | EXECUTE | default | operational | service_dispatch | no | yes |
| 46 | `health` | READ | default | operational | service_dispatch | yes | no |
| 47 | `system_info` | READ | default | operational | service_dispatch | yes | no |
| 48 | `notification` | EXECUTE | default | operational | service_dispatch | no | no |
| 49 | `file_dialog` | EXECUTE | default | operational | service_dispatch | yes | no |
| 50 | `clipboard` | EXECUTE | default | operational | service_dispatch | no | no |
| 51 | `web_fetch` | READ | default | operational | service_dispatch | no | yes |
| 52 | `audio` | EXECUTE | default | operational | service_dispatch | no | yes |
| 53 | `screen_record` | EXECUTE | default | operational | service_dispatch | no | yes |
| 54 | `office` | WRITE | default | operational | service_dispatch | no | no |
| 55 | `scheduler` | EXECUTE | default | operational | service_dispatch | no | yes |
| 56 | `wsl_exec` | EXECUTE | default | operational | service_dispatch | no | yes |
| 57 | `wsl_fs` | READ | default | operational | service_dispatch | yes | no |
| 58 | `skills_list` | READ | default | operational | service_dispatch | yes | no |
| 59 | `skills_read` | READ | default | operational | service_dispatch | yes | no |
| 60 | `mcp_list` | READ | default | operational | service_dispatch | yes | no |
| 61 | `mcp_describe` | READ | default | operational | service_dispatch | yes | no |
| 62 | `mcp_call` | DANGEROUS | default | operational | service_dispatch | no | yes |
| 63 | `workspace_context` | READ | default | operational | service_dispatch | yes | no |
| 64 | `workspace_context_continue` | READ | default | operational | service_dispatch | yes | no |
| 65 | `workspace_full_scan` | READ | default | operational | service_dispatch | yes | no |
| 66 | `workspace_full_scan_continue` | READ | default | operational | deterministic_operation | yes | no |
| 67 | `workspace_snapshot` | READ | default | operational | service_dispatch | yes | no |
| 68 | `search_all` | READ | default | operational | service_dispatch | yes | no |
| 69 | `read_many_files` | READ | default | operational | service_dispatch | yes | no |
| 70 | `read_file_page` | READ | default | operational | service_dispatch | yes | no |
| 71 | `read_file_page_continue` | READ | default | operational | service_dispatch | yes | no |
| 72 | `workspace_index` | READ | default | operational | service_dispatch | yes | no |
| 73 | `workspace_index_status` | READ | default | operational | service_dispatch | yes | no |
| 74 | `workspace_index_watch` | READ | default | operational | service_dispatch | yes | no |
| 75 | `workspace_index_stop` | READ | default | operational | service_dispatch | yes | no |
| 76 | `run_goal` | WRITE | default | operational | service_dispatch | no | no |
| 77 | `get_goal` | READ | default | operational | service_dispatch | yes | no |
| 78 | `checkpoint_goal` | WRITE | default | operational | service_dispatch | no | no |
| 79 | `finish_goal` | WRITE | default | operational | service_dispatch | no | no |
| 80 | `cancel_goal` | WRITE | default | operational | service_dispatch | no | yes |
| 81 | `reconcile_goals` | WRITE | default | operational | service_dispatch | no | no |
| 82 | `list_goals` | READ | default | operational | service_dispatch | yes | no |
| 83 | `prepare_scheduled_continuation` | WRITE | default | operational | service_dispatch | no | no |
| 84 | `record_scheduled_continuation_receipt` | WRITE | default | operational | service_dispatch | no | no |
| 85 | `claim_scheduled_continuation` | WRITE | default | operational | service_dispatch | no | no |
| 86 | `get_scheduled_continuation` | READ | default | operational | service_dispatch | yes | no |
| 87 | `expedite_scheduled_continuation` | WRITE | default | operational | service_dispatch | no | no |
| 88 | `cancel_scheduled_continuation` | WRITE | default | operational | service_dispatch | no | yes |
| 89 | `symbol_search` | READ | default | operational | service_dispatch | yes | no |
| 90 | `find_definition` | READ | default | operational | service_dispatch | yes | no |
| 91 | `find_references` | READ | default | operational | service_dispatch | yes | no |
| 92 | `find_implementations` | READ | default | operational | service_dispatch | yes | no |
| 93 | `call_hierarchy` | READ | default | operational | service_dispatch | yes | no |
| 94 | `import_graph` | READ | default | operational | service_dispatch | yes | no |
| 95 | `dependency_graph` | READ | default | operational | service_dispatch | yes | no |
| 96 | `module_graph` | READ | default | operational | service_dispatch | yes | no |
| 97 | `type_search` | READ | default | operational | service_dispatch | yes | no |
| 98 | `trace_symbol` | READ | default | operational | service_dispatch | yes | no |
| 99 | `context_ranking` | READ | default | operational | deterministic_operation | yes | no |
| 100 | `debug_context` | READ | default | operational | service_dispatch | yes | no |
| 101 | `review_context` | READ | default | operational | service_dispatch | yes | no |
| 102 | `change_context` | READ | default | operational | service_dispatch | yes | no |
| 103 | `symbol_context` | READ | default | operational | service_dispatch | yes | no |
| 104 | `test_context` | READ | default | operational | service_dispatch | yes | no |
| 105 | `dependency_context` | READ | default | operational | service_dispatch | yes | no |
| 106 | `frontend_context` | READ | default | operational | service_dispatch | yes | no |
| 107 | `backend_context` | READ | default | operational | service_dispatch | yes | no |
| 108 | `route_intent` | READ | default | operational | deterministic_operation | yes | no |
| 109 | `recipe_list` | READ | default | operational | deterministic_operation | yes | no |
| 110 | `recipe_describe` | READ | default | operational | deterministic_operation | yes | no |
| 111 | `recipe_run` | EXECUTE | default | operational | deterministic_operation | no | no |
| 112 | `dry_run` | READ | default | operational | deterministic_operation | yes | no |
| 113 | `discover_tests` | READ | default | operational | service_dispatch | yes | no |
| 114 | `run_affected_tests` | EXECUTE | default | operational | service_dispatch | no | no |
| 115 | `test_failures` | READ | default | operational | service_dispatch | yes | no |
| 116 | `coverage_context` | READ | default | operational | service_dispatch | yes | no |
| 117 | `test_history` | READ | default | operational | service_dispatch | yes | no |
| 118 | `cache_stats` | READ | default | operational | deterministic_operation | yes | no |
| 119 | `cache_clear` | WRITE | default | operational | deterministic_operation | no | no |
| 120 | `cache_invalidate` | WRITE | default | operational | deterministic_operation | no | no |
| 121 | `hook_list` | READ | default | operational | deterministic_operation | yes | no |
| 122 | `hook_register` | WRITE | default | operational | deterministic_operation | no | no |
| 123 | `hook_remove` | WRITE | default | operational | deterministic_operation | no | no |
| 124 | `skill_match` | READ | default | operational | service_dispatch | yes | no |
| 125 | `skill_load` | READ | default | operational | service_dispatch | yes | no |
| 126 | `plugin_install` | WRITE | default | operational | truthful_unavailable | no | no |
| 127 | `plugin_list` | READ | default | operational | deterministic_operation | yes | no |
| 128 | `plugin_enable` | WRITE | default | operational | truthful_unavailable | no | no |
| 129 | `plugin_disable` | WRITE | default | operational | truthful_unavailable | no | no |
| 130 | `plugin_remove` | DANGEROUS | default | operational | truthful_unavailable | no | yes |
| 131 | `session_context` | READ | default | operational | deterministic_operation | yes | no |
| 132 | `session_checkpoint` | WRITE | default | operational | deterministic_operation | no | no |
| 133 | `session_resume` | READ | default | operational | deterministic_operation | yes | no |
| 134 | `session_history` | READ | default | operational | deterministic_operation | yes | no |
| 135 | `response_mode` | READ | default | operational | deterministic_operation | yes | no |
| 136 | `inspect_web_app` | READ | default | operational | service_dispatch | yes | no |
| 137 | `debug_ui` | READ | default | operational | service_dispatch | yes | no |
| 138 | `capture_ui_state` | READ | default | operational | service_dispatch | yes | no |
| 139 | `form_context` | READ | default | operational | service_dispatch | yes | no |
| 140 | `network_context` | READ | default | dependency_gated | truthful_unavailable | yes | no |
| 141 | `console_context` | READ | default | dependency_gated | truthful_unavailable | yes | no |
| 142 | `browser_debug_context` | READ | default | operational | service_dispatch | yes | no |
| 143 | `windows_environment` | READ | default | operational | service_dispatch | yes | no |
| 144 | `service_context` | READ | default | operational | deterministic_operation | yes | no |
| 145 | `process_context` | READ | default | operational | service_dispatch | yes | no |
| 146 | `port_context` | READ | default | operational | deterministic_operation | yes | no |
| 147 | `registry_context` | READ | default | operational | deterministic_operation | yes | no |
| 148 | `event_log_context` | READ | default | operational | deterministic_operation | yes | no |
| 149 | `installed_runtime_context` | READ | default | operational | deterministic_operation | yes | no |
| 150 | `path_context` | READ | default | operational | deterministic_operation | yes | no |
| 151 | `startup_context` | READ | default | operational | deterministic_operation | yes | no |
| 152 | `mcp_discover` | READ | default | operational | service_dispatch | yes | no |
| 153 | `mcp_health` | READ | default | operational | service_dispatch | yes | no |
| 154 | `mcp_resources` | READ | default | dependency_gated | service_dispatch | yes | no |
| 155 | `task_create` | EXECUTE | default | operational | service_dispatch | no | no |
| 156 | `task_status` | READ | default | operational | service_dispatch | yes | no |
| 157 | `task_cancel` | EXECUTE | default | operational | service_dispatch | no | no |
| 158 | `task_result` | READ | default | operational | service_dispatch | yes | no |
| 159 | `task_list` | READ | default | operational | service_dispatch | yes | no |
| 160 | `delegate` | EXECUTE | default | dependency_gated | service_dispatch | no | no |
| 161 | `delegate_status` | READ | default | dependency_gated | service_dispatch | yes | no |
| 162 | `delegate_cancel` | EXECUTE | default | dependency_gated | service_dispatch | no | no |
| 163 | `delegate_result` | READ | default | dependency_gated | service_dispatch | yes | no |
| 164 | `parallel_delegate` | EXECUTE | default | dependency_gated | service_dispatch | no | no |
| 165 | `permission_check` | READ | default | operational | deterministic_operation | yes | no |
| 166 | `permission_profile` | READ | default | operational | deterministic_operation | yes | no |
| 167 | `live_logs_query` | READ | default | operational | truthful_unavailable | yes | no |
| 168 | `live_logs_status` | READ | default | operational | truthful_unavailable | yes | no |
| 169 | `telemetry_dashboard` | READ | default | operational | deterministic_operation | yes | no |
| 170 | `context_economy_stats` | READ | default | operational | deterministic_operation | yes | no |
| 171 | `execution_plan` | READ | default | operational | deterministic_operation | yes | no |
| 172 | `repo_map` | READ | default | operational | service_dispatch | yes | no |
| 173 | `context_expand` | READ | default | operational | service_dispatch | yes | no |
| 174 | `recovery_status` | READ | default | operational | deterministic_operation | yes | no |
| 175 | `tool_schema_list` | READ | default | operational | deterministic_operation | yes | no |
| 176 | `tool_schema_register` | WRITE | default | operational | deterministic_operation | no | no |
| 177 | `capabilities` | READ | default | operational | deterministic_operation | yes | no |
| 178 | `tool_search` | READ | default | operational | deterministic_operation | yes | no |
| 179 | `tool_dynamic_filter` | READ | default | operational | deterministic_operation | yes | no |
| 180 | `tool_describe` | READ | default | operational | deterministic_operation | yes | no |
| 181 | `tool_categories` | READ | default | operational | deterministic_operation | yes | no |
| 182 | `tool_function_find` | READ | default | operational | deterministic_operation | yes | no |
| 183 | `tool_aliases` | READ | default | operational | deterministic_operation | yes | no |
| 184 | `mcp_hub` | READ | default | dependency_gated | service_dispatch | yes | no |
| 185 | `dev_context` | READ | default | operational | service_dispatch | yes | no |
| 186 | `recipe_catalog` | READ | default | operational | deterministic_operation | yes | no |
| 187 | `capture_screenshot` | READ | default | operational | service_dispatch | yes | no |
| 188 | `compare_screenshot` | READ | default | operational | deterministic_operation | yes | no |
| 189 | `dom_snapshot` | READ | default | operational | service_dispatch | yes | no |
| 190 | `layout_metadata` | READ | default | operational | service_dispatch | yes | no |
| 191 | `visual_context` | READ | default | operational | service_dispatch | yes | no |
| 192 | `inspect_workbook` | READ | default | operational | service_dispatch | yes | no |
| 193 | `compare_workbook_layout` | READ | default | dependency_gated | service_dispatch | yes | no |
| 194 | `render_excel_preview` | READ | default | dependency_gated | service_dispatch | yes | no |
| 195 | `inspect_pdf` | READ | default | dependency_gated | truthful_unavailable | yes | no |
| 196 | `compare_pdf_pages` | READ | default | dependency_gated | truthful_unavailable | yes | no |
| 197 | `project_profile_get` | READ | default | operational | service_dispatch | yes | no |
| 198 | `project_profile_set` | WRITE | default | operational | deterministic_operation | no | no |
| 199 | `benchmark_run` | EXECUTE | default | dependency_gated | service_dispatch | no | no |
| 200 | `regression_report` | READ | default | operational | deterministic_operation | yes | no |
| 201 | `sandbox_exec` | EXECUTE | default | dependency_gated | truthful_unavailable | no | no |
| 202 | `event_watch` | EXECUTE | default | dependency_gated | deterministic_operation | no | no |
| 203 | `crash_trace` | READ | default | dependency_gated | deterministic_operation | yes | no |
| 204 | `lsp_diagnostics` | READ | default | dependency_gated | truthful_unavailable | yes | no |
| 205 | `lsp_rename` | WRITE | default | dependency_gated | truthful_unavailable | no | no |
| 206 | `debug_attach` | EXECUTE | default | dependency_gated | truthful_unavailable | no | no |
| 207 | `debug_step` | EXECUTE | default | dependency_gated | truthful_unavailable | no | no |
| 208 | `db_inspect` | READ | default | dependency_gated | truthful_unavailable | yes | no |
| 209 | `db_query` | READ | default | dependency_gated | truthful_unavailable | yes | no |
| 210 | `office_ppt` | WRITE | default | dependency_gated | service_dispatch | no | no |
| 211 | `office_outlook` | READ | default | dependency_gated | service_dispatch | yes | no |
| 212 | `pdf_extract_tables` | READ | default | dependency_gated | truthful_unavailable | yes | no |
| 213 | `docx_merge` | WRITE | default | dependency_gated | service_dispatch | no | no |
| 214 | `self_heal_plan` | READ | default | operational | service_dispatch | yes | no |
| 215 | `self_heal_apply` | DANGEROUS | default | dependency_gated | service_dispatch | no | yes |
| 216 | `skills_import` | WRITE | default | operational | service_dispatch | no | no |
| 217 | `tool_batch` | EXECUTE | default | operational | service_dispatch | no | yes |
<!-- END GENERATED TOOL REGISTRY -->

## Protocol and result rules

- Tool names and registry order are deterministic.
- Every request is schema-validated before the application service runs.
- Every result is structured JSON-compatible MCP content; errors use the
  repository error/result mapping and do not expose secrets or raw stack traces.
- `readOnlyHint` is advisory metadata for clients. It never grants permission.
- `destructiveHint` is advisory metadata for clients. In standard mode permission
  policy and application hard blocks remain authoritative; trusted Full Bypass
  intentionally skips those detunnel checks.
- A bounded result must report truncation, continuation, or a bounded-window
  contract. A new compound tool cannot hide data that a primitive tool can read.
- `workspaceId` is required where the operation is workspace-scoped unless an
  explicitly normalized absolute path is accepted by that tool's schema.

## Permission classes

| Class | Meaning | Existing profile behavior |
| --- | --- | --- |
| `READ` | No intentional mutation; inspection or local diagnostics | allowed by Safe/Balanced/Full |
| `WRITE` | Changes workspace files or registration state | prompts in Safe; allowed in Balanced/Full |
| `EXECUTE` | Starts/controls an owned command, process, project, or Codex task | prompts in Safe; allowed in Balanced/Full |
| `DANGEROUS` | Destructive, interactive, external, or full-access meta capability | denied in Safe; prompts in Balanced; allowed in Full subject to standard-mode policy, or dispatched without detunnel approval when Full Bypass is ON |

Desktop uses its configured local permission profile. Packaged stdio keeps `full` as the backward-compatible default but accepts `safe|balanced|full|custom` through the launcher, environment, or Desktop STDIO policy settings. Desktop HTTP/Secure Tunnel and direct STDIO have independent Full Bypass toggles under the Full Access (Unrestricted) group; both default OFF and are effective only with profile `full`.

No mode scans or registers drive letters automatically. With Full Bypass OFF, optional strict-root mode constrains access to explicit canonical roots and the normal ownership/path/Active Project/host approval/command-policy boundaries remain enforced. With Full Bypass ON, the gateway and inner runtimes skip every detunnel application approval and scope check, including always-confirm tools, protected paths, explicit absolute outside paths, and `goalLease`. The authorization is carried separately from tool input and must never be forged as caller `userConfirmed: true`. Schema validation, relative-traversal rejection, exact task/process/worktree ownership, Windows ACL/UAC, provider availability, remote/child policy, and runtime errors remain.

Mutations still receive typed policy classification for audit/dispatch behavior. With Full Bypass OFF, the only configurable scoped auto-approval exception is exact recoverable `delete_file`; every other approval-required mutation needs independent trusted host exact-action approval and providerless runtimes fail closed. Full Bypass ON supersedes those detunnel authorization checks for its transport. Arbitrary commands and project-owned scripts remain opaque execution, not an OS sandbox, and outside-project changes are not automatically recoverable through Recovery Trash.

## Core primitive runtime catalog

The generated live `ToolRegistry.listAll()` index above is the authoritative complete catalog for all **217 tool definitions**. It is generated from the built registry and validated by `docs:tools:check`. This section intentionally does not maintain a second hand-numbered primitive table, because duplicate permission/schema tables can drift from the registry. The Zod schemas in `packages/mcp-server/src/tools/` and the generated table above remain the source of truth for names, permissions, annotations, ordering, and input JSON Schema; `tools/list` exposes only the currently advertised subset.

## Schema groups and contract examples

The following examples make the required shape explicit without duplicating the
generated JSON Schema. Optional fields and bounds must remain aligned with the
source schema and the runtime `tools/list` response.

### Workspace and filesystem

```ts
workspace_list: {}
workspace_register: {
  parentWorkspaceId?: string; // legacy explicit machine-root-relative registration
  path: string;
  displayName?: string;
}
workspace_info: { workspaceId: string }
workspace_tree: {
  workspaceId?: string;
  path?: string;
  maxDepth?: number;
  maxEntries?: number;
}
project_snapshot: { workspaceId: string }
read_file: {
  workspaceId?: string;
  path: string;
  startLine?: number;
  endLine?: number;
}
read_files: { workspaceId?: string; files: Array<{ path: string; startLine?: number; endLine?: number }> }
search_files: { workspaceId?: string; path?: string; glob?: string; maxResults?: number; includeIgnored?: boolean }
search_text: {
  workspaceId?: string;
  path?: string;
  query: string;
  glob?: string;
  maxResults?: number;
  includeIgnored?: boolean;
}
```

`write_file`, `apply_patch`, `edit_file`, `move_file`, `copy_file`, `delete_file`,
`restore_deleted_file`, and `restore_checkpoint` retain their checkpoint/recovery,
same-workspace, secret-policy, confirmation, host-approval, and canonical
path-guard contracts. They must not acquire implicit recursive or arbitrary-root
mutation behavior.

### Process, project, and Codex

```ts
process_start: { workspaceId: string; executable: string; args: string[]; cwd?: string; timeoutMs?: number }
process_list: { workspaceId: string }
process_status: { workspaceId: string; processId: string }
process_logs: { workspaceId: string; processId: string; tailLines?: number; sinceSequence?: number }
process_stop: { workspaceId: string; processId: string }
project_dev: { workspaceId: string }
project_test: { workspaceId: string }
project_lint: { workspaceId: string }
project_typecheck: { workspaceId: string }
project_build: { workspaceId: string }
codex_status: {}
codex_run: { workspaceId: string; instruction: string }
codex_task_list: { workspaceId: string }
codex_task_status: { workspaceId: string; codexTaskId: string }
codex_task_logs: { workspaceId: string; codexTaskId: string; tailLines?: number; sinceSequence?: number }
codex_stop: { workspaceId: string; codexTaskId: string }
```

Project tools take the workspace scope and use the detected project profile;
they do not accept arbitrary shell command strings. The gateway previews exact
executable/argv for approval and re-resolves immediately before spawn so a
changed command requires fresh approval.

### Local capability and extension tools

The detailed action enums and bounds are defined in `schemas.ts` and the
capability backends. Important invariants are:

- `shell` receives an executable plus an argument array, never a composed shell
  string, and retains foreground/background, timeout, dry-run, and task actions;
- `dom_cdp`, `accessibility`, `input_event`, `window`, `audio`, `office`, and
  scheduler operations retain their existing interactive/destructive policy;
- `vision`, `health`, and `system_info` remain truthful read-only diagnostics;
- `web_fetch` remains HTTP(S)-only and bounded by explicit byte/timeout fields;
- `skills_*` and `mcp_*` remain bridge tools and do not silently flatten
  child-server tools into the 217-definition complete inventory; `mcp_list` and
  `mcp_describe` are read-only inspection while `mcp_call` is opaque mutation.

The additive Windows gateway contract is:

```ts
wsl_exec: {
  workspaceId: string;
  distro?: string;
  executable?: string;
  arguments?: string[];
  cwd?: string;                 // registered absolute Windows path
  environment?: Record<string, string>;
  operation?: 'run' | 'status' | 'wait' | 'logs' | 'result' | 'cancel';
  execution?: 'foreground' | 'background' | 'auto';
  task_id?: string;
}
wsl_fs: {
  workspaceId?: string;
  operation?: 'status' | 'translate' | 'metadata';
  direction?: 'windows_to_wsl' | 'wsl_to_windows';
  distro?: string;
  path?: string;
}
vision_annotated_capture: {
  workspaceId: string;
  capture?: 'display' | 'region' | 'window';
  max_depth?: number;
  max_marks?: number;
  ttl_seconds?: number;
}
ui_target_action: {
  workspaceId: string;
  observationId: string;
  markId: string;
  observationHash?: string;
  action?: 'click' | 'focus' | 'read_value' | 'set_value' | 'select_item' | 'menu_select';
  value?: string;
  userConfirmed?: boolean;
}
```

`wsl_exec` is argv-only and delegates task lifecycle to the existing bounded
shell runner. It records workspace ownership, rejects shell-string flags, and
does not expose arbitrary host paths. `wsl_fs` only translates paths or reads
metadata; it never opens raw `\\wsl$`/`\\wsl.localhost` files. A WSL status
failure is returned as `available: false`, not as a successful empty task.

SoM observations return `observationId`, `observationHash`, annotated PNG data,
`marks[]`, and `expiresAt`. `ui_target_action` checks owner, TTL, optional hash,
mark identity, and a fresh Accessibility lookup before forwarding an action.
Coordinates are screen-pixel metadata; action execution uses semantic element
identifiers so DPI and multi-monitor offsets do not become authorization.

`vision` keeps its existing public OCR action. WinRT OCR is routed to the
separate packaged-helper boundary and returns a truthful unavailable result when
package identity, a supported profile language, or the helper is absent. The
NSIS application remains the primary installer; sparse-package registration is
an optional release step.

The router adds `tool_dynamic_filter` and extends `tool_search`/`route_intent`
with ranked candidates, deterministic scores, reason codes, selected model,
permission metadata, and `authorizationUnchanged: true`. Local rerank is
opt-in; when no local model is configured it falls back to deterministic scoring
without sending prompt or file data off-machine.

### Context aggregation

```ts
workspace_context: {
  query: string;
  workspaceId?: string;
  path?: string;
  intent?: 'auto' | 'debug' | 'implement' | 'review' | 'trace' | 'explore';
  mode?: 'optimized' | 'full' | 'exhaustive';
  includeIgnored?: boolean;
  responseTargetBytes?: number;
  pageSize?: number;
}
workspace_context_continue: { continuationToken: string; pageSize?: number }
workspace_full_scan: { workspaceId?: string; path?: string; glob?: string; pageSize?: number; includeIgnored?: boolean }
workspace_full_scan_continue: { continuationToken: string; pageSize?: number }
workspace_snapshot: { workspaceId: string }
search_all: { query: string; workspaceId?: string; path?: string; glob?: string; maxResults?: number; includeIgnored?: boolean }
read_many_files: { workspaceId?: string; files: Array<{ path: string; startLine?: number; endLine?: number }> }
```

Context pages are transport windows, not capability limits. The engine keeps
continuation state and preserves the full primitive search/read tools.

`includeIgnored` is an explicit discovery override. Automatic mode is a quota
optimization, not authorization. `context_economy_stats` reports raw versus
delivered context bytes, skipped generated/binary paths, duplicate/previously
seen bytes avoided, ledger hits, and the bounded ledger size. The ledger is
in-memory and does not persist file contents or credentials.

### Lossless file paging

```ts
read_file_page: {
  workspaceId?: string;
  path: string;
  startLine?: number;
  pageSize?: number;
  responseTargetBytes?: number;
}
read_file_page_continue: { continuationToken: string; pageSize?: number }
```

Paged responses always expose whether more content remains. The page adapter
does not replace or reduce the existing unrestricted trusted-workspace read
path.

### Full-visibility indexing

```ts
workspace_index: { workspaceId: string; rebuild?: boolean; includeIgnored?: boolean }
workspace_index_status: { workspaceId: string }
workspace_index_watch: { workspaceId: string; debounceMs?: number; concurrency?: number }
workspace_index_stop: { workspaceId: string }
```

Index scheduling uses the automatic context-economy policy for vendor/build,
binary, and generated paths. It must not be treated as an access denial:
explicit index/search requests and direct file reads can still inspect any path
allowed by the existing workspace boundary, including hidden, ignored,
generated, dependency, and environment files.

### Roadmap extension catalog

The Phase 05–41 additive tools are defined in
[`../../packages/mcp-server/src/upgrade-catalog.ts`](../../packages/mcp-server/src/upgrade-catalog.ts).
Each entry carries its phase, permission class, tags, streamability, and
parallel-safety metadata. `tool_search` and `tool_describe` expose this metadata
without replacing the full `tools/list` contract.

### Compound execution

```ts
tool_batch: {
  parallel?: boolean;
  calls?: Array<{
    id?: string;
    tool: string;
    arguments?: Record<string, unknown>;
    dependsOn?: string[];
    timeoutMs?: number;
  }>;
  groups?: Array<{
    id?: string;
    parallel?: boolean;
    calls: Array<{
      id?: string;
      tool: string;
      arguments?: Record<string, unknown>;
      dependsOn?: string[];
      timeoutMs?: number;
    }>;
  }>;
}
```

The input contains at most 50 child calls. Results retain input order and
include per-child status, duration, error, and returned MCP response. Read-only
children can run in parallel; side-effecting children are serialized by the
early compound safety guard. Nested `tool_batch` calls are rejected, and every
child still traverses the normal registry confirmation/host-approval boundary;
a parent batch never grants mutation privilege to a child.

## Change protocol

Any tool contract change must include:

1. a schema/source change;
2. a registry/tool-list test asserting the tool remains discoverable;
3. permission and annotation assertions;
4. success and failure tests for the application behavior;
5. an audit/Live Logs assertion for new compound children or side effects;
6. a fresh benchmark or regression comparison when latency, bytes, or result
   shape can change;
7. an update to this file and the user-facing capability documentation.

Adding a compound tool is additive. Removing or narrowing a primitive tool is a
breaking change and is outside this upgrade roadmap.
