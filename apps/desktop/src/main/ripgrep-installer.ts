import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import extractZip from 'extract-zip';

export interface RipgrepPackage {
  readonly version: string;
  readonly sourceUrl: string;
  readonly archiveSha256: string;
}

export interface InstalledRipgrep {
  readonly executablePath: string;
  readonly version: string;
  readonly sourceUrl: string;
  readonly archiveSha256: string;
  readonly reused: boolean;
}

interface DownloadResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface RipgrepInstallerOptions {
  readonly package?: RipgrepPackage;
  readonly fetchImpl?: (url: string) => Promise<DownloadResponse>;
  readonly extractImpl?: (archivePath: string, options: { readonly dir: string }) => Promise<void>;
}

export const DEFAULT_RIPGREP_PACKAGE: RipgrepPackage = Object.freeze({
  version: '15.2.0',
  sourceUrl: 'https://github.com/BurntSushi/ripgrep/releases/download/15.2.0/ripgrep-15.2.0-x86_64-pc-windows-msvc.zip',
  archiveSha256: '71b2fef860abe467217a538ff31de02f5258807c0129f771846f87bd029aafc5',
});

const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024;
const activeInstalls = new Map<string, Promise<InstalledRipgrep>>();

export function installRipgrep(dataPath: string, options: RipgrepInstallerOptions = {}): Promise<InstalledRipgrep> {
  const packageInfo = options.package ?? DEFAULT_RIPGREP_PACKAGE;
  const installKey = [path.resolve(dataPath), packageInfo.version, packageInfo.sourceUrl, packageInfo.archiveSha256.toLowerCase()].join('\0');
  const activeInstall = activeInstalls.get(installKey);
  if (activeInstall !== undefined) return activeInstall;
  const operation = installRipgrepOnce(dataPath, { ...options, package: packageInfo }).finally(() => {
    activeInstalls.delete(installKey);
  });
  activeInstalls.set(installKey, operation);
  return operation;
}

async function installRipgrepOnce(dataPath: string, options: RipgrepInstallerOptions): Promise<InstalledRipgrep> {
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('Automatic ripgrep installation supports Windows x64 only');
  }

  const packageInfo = options.package ?? DEFAULT_RIPGREP_PACKAGE;
  const fetchImpl = options.fetchImpl ?? (async (url: string): Promise<DownloadResponse> => fetch(url));
  const extractImpl = options.extractImpl ?? extractZip;
  const runtimeRoot = path.join(dataPath, 'runtime-tools', 'ripgrep');
  const executablePath = path.join(runtimeRoot, 'rg.exe');

  if (await isRegularFile(executablePath)) {
    return { executablePath, version: packageInfo.version, sourceUrl: packageInfo.sourceUrl, archiveSha256: packageInfo.archiveSha256, reused: true };
  }

  const installParent = path.dirname(runtimeRoot);
  await mkdir(installParent, { recursive: true });
  const stagingRoot = await mkdtemp(path.join(installParent, `.install-ripgrep-${packageInfo.version}-`));
  try {
    const response = await fetchImpl(packageInfo.sourceUrl);
    if (!response.ok) throw new Error(`ripgrep download failed: HTTP ${response.status} ${response.statusText}`.trim());
    const declaredSize = Number(response.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredSize) && declaredSize > MAX_ARCHIVE_BYTES) throw new Error('ripgrep archive is larger than the allowed download limit');

    const archiveBytes = Buffer.from(await response.arrayBuffer());
    if (archiveBytes.byteLength === 0 || archiveBytes.byteLength > MAX_ARCHIVE_BYTES) throw new Error('ripgrep archive size is invalid');
    const actualSha256 = createHash('sha256').update(archiveBytes).digest('hex');
    if (actualSha256 !== packageInfo.archiveSha256.toLowerCase()) {
      throw new Error(`ripgrep integrity check failed: expected ${packageInfo.archiveSha256}, got ${actualSha256}`);
    }

    const archivePath = path.join(stagingRoot, `ripgrep-${packageInfo.version}.zip`);
    const extractRoot = path.join(stagingRoot, 'extracted');
    const extractedRoot = path.join(extractRoot, `ripgrep-${packageInfo.version}-x86_64-pc-windows-msvc`);
    await writeFile(archivePath, archiveBytes);
    await mkdir(extractRoot, { recursive: true });
    await extractImpl(archivePath, { dir: extractRoot });

    const extractedExecutable = path.join(extractedRoot, 'rg.exe');
    if (!await isRegularFile(extractedExecutable)) throw new Error('Downloaded ripgrep archive does not contain rg.exe');

    await rm(runtimeRoot, { recursive: true, force: true });
    await rename(extractedRoot, runtimeRoot);
    await writeFile(path.join(runtimeRoot, 'BUNDLED_RIPGREP.txt'), [
      'ripgrep installed by lnwjud',
      `version=${packageInfo.version}`,
      `source=${packageInfo.sourceUrl}`,
      `archive_sha256=${packageInfo.archiveSha256}`,
    ].join('\n') + '\n', 'utf8');

    if (!await isRegularFile(executablePath)) throw new Error('ripgrep installation completed without rg.exe');
    return { executablePath, version: packageInfo.version, sourceUrl: packageInfo.sourceUrl, archiveSha256: packageInfo.archiveSha256, reused: false };
  } finally {
    await rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function isRegularFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}
