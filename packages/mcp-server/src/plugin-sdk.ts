import type { McpToolDefinition } from './tools/tool-types.js';

export interface DetunnelPluginPermission {
  readonly name: string;
  readonly reason: string;
}

export interface DetunnelSkillDescriptor {
  readonly id: string;
  readonly description: string;
  readonly tags: readonly string[];
}

export interface DetunnelRecipeDescriptor {
  readonly name: string;
  readonly steps: readonly string[];
}

export interface DetunnelPlugin {
  readonly id: string;
  readonly version: string;
  readonly tools?: readonly McpToolDefinition[];
  readonly hooks?: readonly string[];
  readonly skills?: readonly DetunnelSkillDescriptor[];
  readonly recipes?: readonly DetunnelRecipeDescriptor[];
  readonly requiredPermissions?: readonly DetunnelPluginPermission[];
}
