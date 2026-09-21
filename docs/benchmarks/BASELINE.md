# detunnel Baseline Benchmark

Generated: 2026-09-09T02:46:55.260Z

## Scope

This is the Phase 00 synthetic baseline. It starts the built detunnel application runtime, registers a temporary fixture workspace, measures the loopback MCP HTTP transport, and deletes the fixture afterward. It is a repeatable local contract baseline, not a production-machine benchmark.

| Field | Value |
| --- | --- |
| Node | `v24.13.0` |
| Platform | `win32/x64` |
| Transport | loopback Streamable HTTP (legacy-compatible claim-less MCP route) at `127.0.0.1 (ephemeral port)` |
| Runs per scenario | 1 |
| Configured retries | 0 |
| Request timeout | 30000 ms |
| Fixture | temporary synthetic workspace; deleted after the run |

## MCP discovery baseline

- Negotiated protocol: `2025-11-25`
- Tool count: **210**
- Initialize latency: 153.34 ms
- tools/list latency: 31.53 ms
- Handshake body bytes transferred: 229,748
- Handshake protocol requests: 3 (initialize, initialized notification, tools/list)

### Discovered tools

- `workspace_list` (1 input properties)
- `workspace_register` (4 input properties)
- `workspace_info` (2 input properties)
- `workspace_tree` (5 input properties)
- `project_snapshot` (2 input properties)
- `read_file` (5 input properties)
- `read_files` (3 input properties)
- `search_files` (6 input properties)
- `search_text` (7 input properties)
- `write_file` (6 input properties)
- `apply_patch` (4 input properties)
- `edit_file` (7 input properties)
- `move_file` (5 input properties)
- `copy_file` (5 input properties)
- `delete_file` (4 input properties)
- `list_recovery_items` (2 input properties)
- `restore_deleted_file` (4 input properties)
- `list_checkpoints` (3 input properties)
- `restore_checkpoint` (4 input properties)
- `process_start` (7 input properties)
- `process_list` (2 input properties)
- `process_status` (3 input properties)
- `process_logs` (5 input properties)
- `process_stop` (4 input properties)
- `project_dev` (3 input properties)
- `project_test` (3 input properties)
- `project_lint` (3 input properties)
- `project_typecheck` (3 input properties)
- `project_build` (3 input properties)
- `shell` (19 input properties)
- `dom_cdp` (13 input properties)
- `computer_use` (24 input properties)
- `accessibility` (10 input properties)
- `input_event` (10 input properties)
- `vision` (15 input properties)
- `vision_annotated_capture` (14 input properties)
- `ui_target_action` (12 input properties)
- `window` (8 input properties)
- `health` (4 input properties)
- `system_info` (6 input properties)
- `notification` (8 input properties)
- `file_dialog` (10 input properties)
- `clipboard` (7 input properties)
- `web_fetch` (11 input properties)
- `audio` (10 input properties)
- `screen_record` (13 input properties)
- `office` (18 input properties)
- `scheduler` (11 input properties)
- `wsl_exec` (19 input properties)
- `wsl_fs` (9 input properties)
- `skills_list` (3 input properties)
- `skills_read` (3 input properties)
- `mcp_list` (1 input properties)
- `mcp_describe` (2 input properties)
- `mcp_call` (4 input properties)
- `workspace_context` (9 input properties)
- `workspace_context_continue` (3 input properties)
- `workspace_full_scan` (6 input properties)
- `workspace_full_scan_continue` (3 input properties)
- `workspace_snapshot` (2 input properties)
- `search_all` (7 input properties)
- `read_many_files` (3 input properties)
- `read_file_page` (6 input properties)
- `read_file_page_continue` (3 input properties)
- `workspace_index` (4 input properties)
- `workspace_index_status` (2 input properties)
- `workspace_index_watch` (4 input properties)
- `workspace_index_stop` (2 input properties)
- `run_goal` (7 input properties)
- `get_goal` (0 input properties)
- `checkpoint_goal` (13 input properties)
- `finish_goal` (7 input properties)
- `cancel_goal` (5 input properties)
- `reconcile_goals` (7 input properties)
- `list_goals` (4 input properties)
- `prepare_scheduled_continuation` (14 input properties)
- `record_scheduled_continuation_receipt` (0 input properties)
- `claim_scheduled_continuation` (3 input properties)
- `get_scheduled_continuation` (0 input properties)
- `expedite_scheduled_continuation` (8 input properties)
- `cancel_scheduled_continuation` (0 input properties)
- `symbol_search` (4 input properties)
- `find_definition` (4 input properties)
- `find_references` (4 input properties)
- `find_implementations` (4 input properties)
- `call_hierarchy` (4 input properties)
- `import_graph` (4 input properties)
- `dependency_graph` (4 input properties)
- `module_graph` (4 input properties)
- `type_search` (4 input properties)
- `trace_symbol` (4 input properties)
- `context_ranking` (3 input properties)
- `debug_context` (4 input properties)
- `review_context` (4 input properties)
- `change_context` (4 input properties)
- `symbol_context` (4 input properties)
- `test_context` (4 input properties)
- `dependency_context` (4 input properties)
- `frontend_context` (4 input properties)
- `backend_context` (4 input properties)
- `route_intent` (3 input properties)
- `recipe_list` (1 input properties)
- `recipe_describe` (2 input properties)
- `recipe_run` (4 input properties)
- `dry_run` (3 input properties)
- `discover_tests` (3 input properties)
- `run_affected_tests` (3 input properties)
- `test_failures` (3 input properties)
- `coverage_context` (3 input properties)
- `test_history` (3 input properties)
- `cache_stats` (2 input properties)
- `cache_clear` (1 input properties)
- `cache_invalidate` (3 input properties)
- `hook_list` (1 input properties)
- `hook_register` (3 input properties)
- `hook_remove` (2 input properties)
- `skill_match` (5 input properties)
- `skill_load` (6 input properties)
- `plugin_install` (6 input properties)
- `plugin_list` (1 input properties)
- `plugin_enable` (6 input properties)
- `plugin_disable` (6 input properties)
- `plugin_remove` (6 input properties)
- `session_context` (1 input properties)
- `session_checkpoint` (3 input properties)
- `session_resume` (1 input properties)
- `session_history` (1 input properties)
- `response_mode` (2 input properties)
- `inspect_web_app` (4 input properties)
- `debug_ui` (4 input properties)
- `capture_ui_state` (4 input properties)
- `form_context` (4 input properties)
- `network_context` (1 input properties)
- `console_context` (1 input properties)
- `browser_debug_context` (4 input properties)
- `windows_environment` (1 input properties)
- `service_context` (3 input properties)
- `process_context` (2 input properties)
- `port_context` (1 input properties)
- `registry_context` (2 input properties)
- `event_log_context` (4 input properties)
- `installed_runtime_context` (1 input properties)
- `path_context` (2 input properties)
- `startup_context` (1 input properties)
- `mcp_discover` (1 input properties)
- `mcp_health` (1 input properties)
- `mcp_resources` (2 input properties)
- `task_create` (8 input properties)
- `task_status` (4 input properties)
- `task_cancel` (4 input properties)
- `task_result` (4 input properties)
- `task_list` (2 input properties)
- `delegate` (7 input properties)
- `delegate_status` (4 input properties)
- `delegate_cancel` (4 input properties)
- `delegate_result` (7 input properties)
- `parallel_delegate` (5 input properties)
- `permission_check` (3 input properties)
- `permission_profile` (1 input properties)
- `live_logs_query` (10 input properties)
- `live_logs_status` (1 input properties)
- `telemetry_dashboard` (1 input properties)
- `context_economy_stats` (1 input properties)
- `execution_plan` (3 input properties)
- `repo_map` (4 input properties)
- `context_expand` (4 input properties)
- `recovery_status` (1 input properties)
- `tool_schema_list` (1 input properties)
- `tool_schema_register` (8 input properties)
- `capabilities` (1 input properties)
- `tool_search` (8 input properties)
- `tool_dynamic_filter` (8 input properties)
- `tool_describe` (3 input properties)
- `tool_categories` (1 input properties)
- `tool_function_find` (8 input properties)
- `tool_aliases` (1 input properties)
- `mcp_hub` (1 input properties)
- `dev_context` (4 input properties)
- `recipe_catalog` (1 input properties)
- `capture_screenshot` (4 input properties)
- `compare_screenshot` (5 input properties)
- `dom_snapshot` (4 input properties)
- `layout_metadata` (4 input properties)
- `visual_context` (4 input properties)
- `inspect_workbook` (5 input properties)
- `compare_workbook_layout` (8 input properties)
- `render_excel_preview` (5 input properties)
- `inspect_pdf` (5 input properties)
- `compare_pdf_pages` (8 input properties)
- `project_profile_get` (2 input properties)
- `project_profile_set` (3 input properties)
- `benchmark_run` (4 input properties)
- `regression_report` (2 input properties)
- `sandbox_exec` (7 input properties)
- `event_watch` (6 input properties)
- `crash_trace` (7 input properties)
- `lsp_diagnostics` (5 input properties)
- `lsp_rename` (9 input properties)
- `debug_attach` (2 input properties)
- `debug_step` (2 input properties)
- `db_inspect` (5 input properties)
- `db_query` (9 input properties)
- `office_ppt` (10 input properties)
- `office_outlook` (4 input properties)
- `pdf_extract_tables` (5 input properties)
- `docx_merge` (10 input properties)
- `self_heal_plan` (2 input properties)
- `self_heal_apply` (8 input properties)
- `skills_import` (10 input properties)
- `tool_batch` (5 input properties)

## Scenario measurements

| Scenario | Runs | Calls/run | Tool calls | Avg workflow ms | Avg tool ms | p50 tool ms | p95 tool ms | Bytes transferred | Result bytes | Errors | Retries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| simple-file-read | 1 | 1 | 1 | 34.45 | 34.3 | 34.3 | 34.3 | 1,118 | 948 | 0 | 0 |
| workspace-search | 1 | 1 | 1 | 95.67 | 95.59 | 95.59 | 95.59 | 2,255 | 2,045 | 0 | 0 |
| bug-investigation | 1 | 3 | 3 | 297.9 | 99.12 | 107.21 | 149.8 | 4,042 | 3,514 | 0 | 0 |
| code-review | 1 | 2 | 2 | 193.33 | 96.6 | 83.27 | 109.92 | 2,212 | 1,832 | 0 | 0 |
| ui-debugging | 1 | 2 | 2 | 1,505.64 | 752.75 | 15.77 | 1,489.72 | 8,797 | 8,578 | 0 | 0 |
| test-failure-investigation | 1 | 3 | 3 | 123.32 | 41.05 | 16.51 | 94.02 | 2,858 | 2,318 | 0 | 0 |

## Totals

| Metric | Value |
| --- | ---: |
| Tool calls | 12 |
| Protocol requests | 15 |
| Average tool latency | 187.42 ms |
| p50 tool latency | 83.27 ms |
| p95 tool latency | 1,489.72 ms |
| Average workflow latency | 375.05 ms |
| p50 workflow latency | 123.32 ms |
| p95 workflow latency | 1,505.64 ms |
| Bytes transferred | 251,030 |
| Result bytes | 19,235 |
| Errors | 0 |
| Retries | 0 |

## Measurement contract

- **Tool calls** count `tools/call` requests only. The handshake and discovery requests are reported separately and included in **protocol requests**.
- **Latency** is measured around each HTTP request from the benchmark process. Workflow latency covers all sequential tool calls in one scenario run.
- **Bytes transferred** is the UTF-8 request body plus the raw HTTP response body for every measured request, including the discovery handshake in the total.
- **Result bytes** is the raw response body for tool calls; it includes the JSON-RPC envelope and MCP result metadata.
- **Errors** count transport/JSON-RPC failures and MCP tool results with `isError: true`. A failed step does not discard sibling steps in the scenario.
- **Retries** count only automatic transport retries. The default baseline uses zero retries so failures remain visible.

## Baseline interpretation

This report records the current sequential call cost before Phase 01. Future parallel execution, context aggregation, pagination, indexing, and caching changes must preserve the primitive-tool contract and must be compared against this report without silently reducing accessible context.
