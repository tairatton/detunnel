import type { McpPermissionLevel } from './tools/tool-types.js';
import { riskyAgentCommandReason, type DestructiveApprovalKey } from '@detunnel/shared';

export type MutationKind = 'read' | 'execute' | 'bounded_write' | 'replace' | 'delete' | 'opaque_mutation';

export interface MutationPolicyDecision {
  readonly kind: MutationKind;
  readonly reason: string;
  /** Known destructive families can be auto-approved only when their setting and scoped target proof both pass. */
  readonly approvalKey?: DestructiveApprovalKey;
}

const READ_ONLY_TASK_OPERATIONS = new Set(['list', 'status', 'wait', 'logs', 'result']);

export function inspectMutationOperation(
  toolName: string,
  input: unknown,
  permission: McpPermissionLevel,
): MutationPolicyDecision {
  const value = asRecord(input) ?? {};

  switch (toolName) {
    case 'read_file':
    case 'read_files':
    case 'read_file_page':
    case 'read_file_page_continue':
    case 'list_recovery_items':
    case 'list_checkpoints':
    case 'workspace_list':
    case 'skills_list':
    case 'skills_read':
    case 'mcp_list':
    case 'mcp_describe':
      return read('structured read-only operation');
    case 'tool_batch':
      return read('batch dispatcher applies mutation policy independently to every child call');
    case 'workspace_register':
      return boundedWrite('workspace_register adds a validated project registration without changing project files');
    case 'write_file':
      return value.overwriteExisting === true
        ? replace('write_file explicitly replaces existing file content')
        : boundedWrite('write_file is create-only unless overwriteExisting is explicit');
    case 'apply_patch':
      return replace('apply_patch supplies whole-file replacement content');
    case 'edit_file':
      return boundedWrite('edit_file applies exact, conflict-checked text edits');
    case 'move_file':
      return replace('move_file removes the source path while preserving data at a reviewed destination');
    case 'copy_file':
      return boundedWrite('copy_file refuses an existing destination');
    case 'delete_file':
      return deletion('delete_file removes a structured workspace target', 'delete_file');
    case 'restore_deleted_file':
    case 'restore_recovery_item':
    case 'restore_checkpoint':
      return replace('recovery restore changes live workspace state');
    case 'shell':
    case 'wsl_exec':
      return inspectTaskExecution(value, toolName);
    case 'process_start':
      return inspectDirectExecution(value, toolName);
    case 'process_stop':
      return execute('process_stop interrupts only an exact process handle owned by the current client/session/workspace');
    case 'agent_swarm_run': {
      const operation = normalized(value.operation);
      return ['status', 'result', 'list'].includes(operation)
        ? read(`agent_swarm_run ${operation} is an owner-scoped read`)
        : opaque(`agent_swarm_run ${operation || 'unknown'} starts or interrupts quota-consuming owned Codex work`);
    }
    case 'codex_run':
    case 'codex_stop':
    case 'cancel_goal':
    case 'cancel_scheduled_continuation':
    case 'sandbox_exec':
      return opaque(`${toolName} can execute or interrupt effects that cannot be proven at the gateway`);
    case 'self_heal_apply':
      return inputUsesDefaultDryRun(value)
        ? read('self_heal_apply defaults to a no-side-effect recovery preview')
        : opaque('self_heal_apply can reindex workspace state or cancel stale durable tasks');
    case 'db_query':
      return read('db_query runtime accepts only bounded read-only SQLite statements');
    case 'mcp_call':
      return inspectMcpCall(value);
    case 'web_fetch':
      return inspectWebFetch(value);
    case 'scheduler':
      return inspectScheduler(value);
    case 'office':
      return inspectOffice(value);
    case 'office_ppt':
      return inspectPowerPoint(value);
    case 'docx_merge':
      return inputUsesDefaultDryRun(value)
        ? read('DOCX merge preview')
        : replace('DOCX merge can replace its target document');
    case 'dom_cdp':
      return inspectDomCdp(value);
    case 'computer_use': {
      const action = normalized(value.action);
      if (['snapshot', 'inspect'].includes(action)) return read('computer_use observation action');
      if (value.dry_run === true) return read('computer_use dry run');
      if (['activate_window', 'mouse_move'].includes(action)) return execute('computer_use desktop state action');
      return opaque('computer_use input can trigger unbounded application side effects');
    }
    case 'accessibility': {
      const action = normalized(value.action);
      if (['status', 'list_windows', 'observe', 'observe_summary', 'observe_changes', 'inspect_elements', 'find_element', 'read_value'].includes(action)) {
        return read('accessibility inspection action');
      }
      if (['launch_app', 'activate_app', 'focus', 'minimize_window', 'maximize_window', 'restore_window', 'set_window_frame'].includes(action)) {
        return execute('accessibility app/window state action');
      }
      return opaque('native UI action can trigger unbounded application side effects');
    }
    case 'input_event':
      return value.dry_run === true
        ? read('input_event dry run')
        : opaque('low-level input can trigger unbounded application side effects');
    case 'ui_target_action': {
      const action = normalized(value.action ?? 'click');
      if (action === 'read_value') return read('marked UI value inspection');
      if (action === 'focus') return execute('marked UI focus action');
      return opaque('marked UI action can trigger unbounded application side effects');
    }
    case 'window': {
      const operation = normalized(value.operation);
      if (['list', 'get_active', 'get_bounds', 'get_display'].includes(operation)) return read('window inspection action');
      if (operation === 'close') return opaque('closing a window can discard unsaved application state');
      if (['activate', 'move', 'resize', 'minimize', 'maximize', 'restore', 'set_window_frame'].includes(operation)) {
        return boundedWrite('window state change does not authorize project-data replacement');
      }
      return opaque('unknown window action is not provably safe');
    }
    case 'clipboard':
      return ['get_text', 'get_image'].includes(normalized(value.action))
        ? read('clipboard read action')
        : opaque('clipboard write can replace user clipboard state');
    case 'audio':
      return inspectAudio(value);
    case 'screen_record':
      return inspectScreenRecord(value);
    case 'plugin_remove':
    case 'hook_remove':
      return deletion(`${toolName} removes persisted state`);
    case 'plugin_install':
    case 'hook_register':
      return boundedWrite(`${toolName} creates persisted application state`);
    default:
      return permission === 'READ'
        ? read('tool declares a read-only permission')
        : opaque(`unclassified ${permission} tool is fail-closed`);
  }
}

export function requiresMutationConfirmation(decision: MutationPolicyDecision): boolean {
  return decision.kind === 'replace' || decision.kind === 'delete' || decision.kind === 'opaque_mutation';
}

/**
 * Convert the action-level mutation classification into the permission level
 * that should actually be evaluated for this invocation. Mixed-action tools
 * can therefore expose safe reads without weakening their destructive paths.
 */
export function permissionLevelForMutationDecision(decision: MutationPolicyDecision): McpPermissionLevel {
  switch (decision.kind) {
    case 'read':
      return 'READ';
    case 'execute':
      return 'EXECUTE';
    case 'bounded_write':
    case 'replace':
      return 'WRITE';
    case 'delete':
    case 'opaque_mutation':
      return 'DANGEROUS';
  }
}

function inspectTaskExecution(value: Readonly<Record<string, unknown>>, toolName: string): MutationPolicyDecision {
  const operation = normalized(value.operation ?? 'run');
  if (READ_ONLY_TASK_OPERATIONS.has(operation)) return read(`${toolName} ${operation} only observes task state`);
  if (value.dry_run === true) return read(`${toolName} dry run does not start the command`);
  if (operation !== 'run') return opaque(`${toolName} ${operation} changes task state`);
  return inspectCommandRisk(value.executable, value.arguments, toolName);
}

function inspectDirectExecution(value: Readonly<Record<string, unknown>>, toolName: string): MutationPolicyDecision {
  return inspectCommandRisk(value.executable, value.args, toolName);
}

function inspectCommandRisk(executableValue: unknown, argsValue: unknown, toolName: string): MutationPolicyDecision {
  const executable = typeof executableValue === 'string' ? executableValue.trim() : '';
  const args = stringArray(argsValue);
  if (executable.length === 0) return opaque(`${toolName} executable is not explicit`);
  const approvalKey = destructiveCommandApprovalKey(toolName, executable);
  if (approvalKey !== undefined) return deletion(`${toolName} command can delete or discard workspace data`, approvalKey);
  const reason = riskyAgentCommandReason(executable, args);
  return reason === undefined ? execute(`${toolName} ordinary argv execution`) : opaque(`command-risk: ${reason}`);
}

function destructiveCommandApprovalKey(toolName: string, executable: string): DestructiveApprovalKey | undefined {
  const basename = executableBasename(executable);
  const wsl = toolName === 'wsl_exec';
  if (basename === 'rm' || basename === 'unlink') return wsl ? 'wsl_rm_unlink' : 'shell_rm_unlink';
  if (basename === 'rmdir') return wsl ? 'wsl_rmdir' : 'shell_rmdir';
  if (!wsl && (basename === 'del' || basename === 'erase')) return 'shell_del_erase';
  return undefined;
}

function executableBasename(executable: string): string {
  const raw = executable.trim().replaceAll('\\', '/').split('/').at(-1)?.toLowerCase() ?? '';
  return raw.replace(/\.(?:exe|cmd|bat|com)$/i, '');
}

function inspectMcpCall(value: Readonly<Record<string, unknown>>): MutationPolicyDecision {
  const childTool = normalized(value.tool);
  if (/(?:^|_)(?:delete|remove|purge|drop|destroy)(?:_|$)/.test(childTool)) return deletion(`child MCP tool ${childTool || 'unknown'} can delete remote or local state`);
  return opaque('mcp_call can trigger child-server side effects that cannot be proven at the gateway');
}

function inspectWebFetch(value: Readonly<Record<string, unknown>>): MutationPolicyDecision {
  if (value.dry_run === true) return read('HTTP dry run');
  const method = normalized(value.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return read(`HTTP ${method} request`);
  if (method === 'DELETE') return deletion('HTTP DELETE can remove remote state');
  if (method === 'PUT' || method === 'PATCH') return replace(`HTTP ${method} can replace remote state`);
  return opaque(`HTTP ${method} can trigger remote side effects`);
}

function inspectScheduler(value: Readonly<Record<string, unknown>>): MutationPolicyDecision {
  if (value.dry_run === true) return read('scheduled task dry run');
  const action = normalized(value.action ?? 'list');
  if (action === 'list') return read('scheduled task listing');
  if (action === 'delete') return deletion('scheduled task deletion');
  return opaque(`scheduled task ${action} changes or executes persisted state`);
}

function inspectOffice(value: Readonly<Record<string, unknown>>): MutationPolicyDecision {
  if (value.dry_run === true) return read('Office dry run');
  const action = normalized(value.action ?? 'read');
  if (['read', 'read_text', 'sheets', 'inspect', 'list', 'list_folders', 'list_messages'].includes(action)) return read(`Office ${action} action`);
  if (['write', 'replace', 'save_as', 'merge'].includes(action)) return replace(`Office ${action} can replace document data`);
  return opaque(`Office ${action} is not provably read-only`);
}

function inspectPowerPoint(value: Readonly<Record<string, unknown>>): MutationPolicyDecision {
  const action = normalized(value.action ?? 'read');
  if (action === 'read') return read('PowerPoint read action');
  return inputUsesDefaultDryRun(value)
    ? read('PowerPoint save-as preview')
    : replace('PowerPoint save-as can replace document data');
}

function inspectAudio(value: Readonly<Record<string, unknown>>): MutationPolicyDecision {
  if (value.dry_run === true) return read('audio dry run');
  const action = normalized(value.action);
  if (action === 'record') return opaque('microphone capture is privacy-sensitive and creates or replaces a workspace media target');
  if (action === 'play' || action === 'stop') return execute(`audio ${action} changes local playback state`);
  return opaque('unknown audio action is not provably safe');
}

function inspectScreenRecord(value: Readonly<Record<string, unknown>>): MutationPolicyDecision {
  if (value.dry_run === true) return read('screen recording dry run');
  const action = normalized(value.action);
  if (action === 'status') return read('screen recording status');
  if (action === 'start') return opaque('screen capture is privacy-sensitive and creates or replaces a workspace media target');
  if (action === 'stop') return execute('screen recording stop finalizes local capture state');
  return opaque('unknown screen recording action is not provably safe');
}

function inputUsesDefaultDryRun(value: Readonly<Record<string, unknown>>): boolean {
  return value.dryRun !== false && value.dry_run !== false;
}

function inspectDomCdp(value: Readonly<Record<string, unknown>>): MutationPolicyDecision {
  const classify = (actionValue: unknown): MutationPolicyDecision => {
    const action = normalized(actionValue);
    if (['status', 'list_tabs', 'query', 'wait', 'screenshot'].includes(action)) return read('browser inspection action');
    if (['launch', 'new_tab'].includes(action)) return execute(`browser ${action} action`);
    return opaque('browser action can trigger local or remote side effects');
  };
  const decisions: MutationPolicyDecision[] = [];
  if (value.action !== undefined) decisions.push(classify(value.action));
  for (const step of Array.isArray(value.steps) ? value.steps : []) {
    const record = asRecord(step);
    decisions.push(record === null ? opaque('invalid browser step is not provably safe') : classify(record.action));
  }
  if (decisions.length === 0) return read('browser inspection action');
  if (decisions.some((decision) => decision.kind === 'opaque_mutation')) return opaque('browser action can trigger local or remote side effects');
  if (decisions.some((decision) => decision.kind === 'execute')) return execute('browser lifecycle action');
  return read('browser inspection action');
}

function execute(reason: string): MutationPolicyDecision { return { kind: 'execute', reason }; }

function read(reason: string): MutationPolicyDecision {
  return { kind: 'read', reason };
}

function boundedWrite(reason: string): MutationPolicyDecision {
  return { kind: 'bounded_write', reason };
}

function replace(reason: string): MutationPolicyDecision {
  return { kind: 'replace', reason };
}

function deletion(reason: string, approvalKey?: DestructiveApprovalKey): MutationPolicyDecision {
  return { kind: 'delete', reason, ...(approvalKey === undefined ? {} : { approvalKey }) };
}

function opaque(reason: string): MutationPolicyDecision {
  return { kind: 'opaque_mutation', reason };
}

function normalized(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}
