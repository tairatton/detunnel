import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(import.meta.dirname, '..', '..');
const dockerRoot = path.join(repositoryRoot, 'docker');

async function readRepositoryFile(relativePath: string): Promise<string> {
  return readFile(path.join(repositoryRoot, relativePath), 'utf8');
}

async function exists(relativePath: string): Promise<boolean> {
  try {
    await access(path.join(repositoryRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

describe('Docker layout path contract', () => {
  it('keeps Docker deployment files together under docker', async () => {
    const requiredFiles = [
      '.env.example',
      'compose.yml',
      'detunnel.yaml',
      'Dockerfile',
      'entrypoint.sh',
      'start.bat',
      'start.sh',
    ];

    await Promise.all(requiredFiles.map((file) => access(path.join(dockerRoot, file))));
    await access(path.join(repositoryRoot, '.dockerignore'));

    const obsoleteRootFiles = [
      '.env.docker.example',
      'docker-compose.yml',
      'docker-start.bat',
      'docker-start.sh',
      'Dockerfile',
    ];
    await expect(Promise.all(obsoleteRootFiles.map(exists))).resolves.toEqual(
      obsoleteRootFiles.map(() => false),
    );
  });

  it('resolves Compose paths from docker back to the repository root', async () => {
    const compose = await readRepositoryFile('docker/compose.yml');

    expect(compose).toMatch(/^name:\s*detunnel$/m);
    expect(compose).toMatch(/^\s+context:\s*\.\.$/m);
    expect(compose).toMatch(/^\s+dockerfile:\s*docker\/Dockerfile$/m);
    expect(compose).toMatch(/^\s+- \.\.\/workspace:\/workspace$/m);
  });

  it('keeps Dockerfile COPY sources relative to the repository build context', async () => {
    const dockerfile = await readRepositoryFile('docker/Dockerfile');
    const requiredSources = [
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'tsconfig.base.json',
      'tsconfig.json',
      'packages',
      'apps/cli',
      'apps/desktop/package.json',
      'docker/entrypoint.sh',
    ];

    await Promise.all(requiredSources.map((source) => access(path.join(repositoryRoot, source))));
    expect(dockerfile).toContain('COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh');
  });

  it('uses the reorganized Compose path in package scripts and launchers', async () => {
    const packageJson = JSON.parse(await readRepositoryFile('package.json')) as {
      scripts: Record<string, string>;
    };
    const batchLauncher = await readRepositoryFile('docker/start.bat');
    const shellLauncher = await readRepositoryFile('docker/start.sh');

    expect(packageJson.scripts['docker:build']).toBe('docker compose -f docker/compose.yml build');
    expect(packageJson.scripts['docker:up']).toBe('docker compose -f docker/compose.yml up -d');
    expect(packageJson.scripts['docker:down']).toBe('docker compose -f docker/compose.yml down');
    expect(packageJson.scripts['docker:logs']).toBe('docker compose -f docker/compose.yml logs -f');

    expect(batchLauncher).toContain('for %%I in ("%SCRIPT_DIR%..")');
    expect(batchLauncher).toContain('docker compose -f "%SCRIPT_DIR%compose.yml"');
    expect(shellLauncher).toContain('PROJECT_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"');
    expect(shellLauncher).toContain('docker compose -f "$SCRIPT_DIR/compose.yml"');
  });

  it('does not leave stale references to the old Docker paths', async () => {
    const filesToCheck = [
      'package.json',
      'docs/DOCKER_GUIDE.md',
      'docker/compose.yml',
      'docker/Dockerfile',
      'docker/start.bat',
      'docker/start.sh',
    ];
    const obsoletePaths = [
      '.env.docker.example',
      'docker-compose.yml',
      'docker-start.bat',
      'docker-start.sh',
      'scripts/docker-entrypoint.sh',
    ];
    const contents = (await Promise.all(filesToCheck.map(readRepositoryFile))).join('\n');

    for (const obsoletePath of obsoletePaths) {
      expect(contents).not.toContain(obsoletePath);
    }
  });
});
