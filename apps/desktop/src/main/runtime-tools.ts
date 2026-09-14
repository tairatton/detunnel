import { existsSync } from 'node:fs';
import path from 'node:path';

export function bundledRuntimeToolDirectories(resourcesPath: string | undefined): readonly string[] {
  if (resourcesPath === undefined || resourcesPath.trim().length === 0) return [];
  return [path.join(resourcesPath, 'runtime-tools', 'ripgrep')];
}

export function userRuntimeToolDirectories(dataPath: string): readonly string[] {
  if (dataPath.trim().length === 0) return [];
  return [path.join(dataPath, 'runtime-tools', 'ripgrep')];
}

export function prependBundledRuntimeToolsToPath(
  environment: NodeJS.ProcessEnv = process.env,
  resourcesPath = (process as NodeJS.Process & { readonly resourcesPath?: string }).resourcesPath,
  directoryExists: (candidate: string) => boolean = existsSync,
): readonly string[] {
  return prependRuntimeToolDirectoriesToPath(bundledRuntimeToolDirectories(resourcesPath), environment, directoryExists);
}

export function prependUserRuntimeToolsToPath(
  dataPath: string,
  environment: NodeJS.ProcessEnv = process.env,
  directoryExists: (candidate: string) => boolean = existsSync,
): readonly string[] {
  return prependRuntimeToolDirectoriesToPath(userRuntimeToolDirectories(dataPath), environment, directoryExists);
}

function prependRuntimeToolDirectoriesToPath(
  directories: readonly string[],
  environment: NodeJS.ProcessEnv,
  directoryExists: (candidate: string) => boolean,
): readonly string[] {
  const bundled = directories.filter(directoryExists);
  if (bundled.length === 0) return [];

  const key = environment.Path !== undefined ? 'Path' : environment.PATH !== undefined ? 'PATH' : process.platform === 'win32' ? 'Path' : 'PATH';
  const existing = environment[key] ?? '';
  const existingEntries = existing.split(path.delimiter).filter((entry) => entry.length > 0);
  const seen = new Set(existingEntries.map(normalizePathEntry));
  const additions = bundled.filter((entry) => {
    const normalized = normalizePathEntry(entry);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
  if (additions.length === 0) return [];
  environment[key] = [...additions, ...existingEntries].join(path.delimiter);
  return additions;
}

function normalizePathEntry(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}
