import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installerDirectory = path.join(desktopRoot, 'dist', 'installers');
const runtimeEvidencePath = path.join(desktopRoot, 'build', 'packaged-runtime-evidence.json');
const packageJson = JSON.parse(await readFile(path.join(desktopRoot, 'package.json'), 'utf8'));
const version = packageJson.version;
if (typeof version !== 'string' || version.length === 0) throw new Error('Desktop package version is unavailable');

const runtimeEvidence = JSON.parse(await readFile(runtimeEvidencePath, 'utf8'));
if (runtimeEvidence?.schemaVersion !== 1 || !Array.isArray(runtimeEvidence.files)) {
  throw new Error('Packaged runtime evidence is missing or invalid');
}
if (!isCapabilityBridgeIdentity(runtimeEvidence.capabilityBridge)) {
  throw new Error('Packaged capability bridge identity is missing or invalid');
}
const capabilityBridgeRuntime = runtimeEvidence.files.find((entry) => entry?.relativePath === 'resources/windows-capability-bridge.ps1');
if (!capabilityBridgeRuntime || capabilityBridgeRuntime.sha256 !== runtimeEvidence.capabilityBridge.sha256 || capabilityBridgeRuntime.sizeBytes !== runtimeEvidence.capabilityBridge.sizeBytes) {
  throw new Error('Packaged capability bridge runtime evidence does not match the verified bridge identity');
}

const artifactNames = [
  `detunnel-Setup-${version}.exe`,
  `detunnel-Setup-${version}.exe.blockmap`,
  `detunnel-Portable-${version}.exe`,
  'latest.yml',
  'portable.yml',
];
const artifacts = [];
for (const name of artifactNames) {
  const filePath = path.join(installerDirectory, name);
  const metadata = await stat(filePath);
  if (!metadata.isFile()) throw new Error(`Required release artifact is missing: ${name}`);
  artifacts.push({ name, sizeBytes: metadata.size, sha256: await sha256File(filePath) });
}

const provenance = {
  schemaVersion: 1,
  product: 'detunnel',
  version,
  source: {
    kind: 'local-build',
  },
  build: {
    environment: process.env.CI === 'true' ? 'ci' : 'local',
    workflow: optionalEnv('GITHUB_WORKFLOW'),
    runId: optionalEnv('GITHUB_RUN_ID'),
    runAttempt: optionalEnv('GITHUB_RUN_ATTEMPT'),
    ref: optionalEnv('GITHUB_REF'),
    signingCredentialConfigured: Boolean(process.env.CSC_LINK?.trim() || process.env.WIN_CSC_LINK?.trim()),
  },
  capabilityBridge: runtimeEvidence.capabilityBridge,
  artifacts,
  runtime: runtimeEvidence.files,
};

const provenancePath = path.join(installerDirectory, 'PROVENANCE.json');
await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
const provenanceHash = await sha256File(provenancePath);

const sumLines = [
  ...artifacts.map((entry) => `${entry.sha256}  ${entry.name}`),
  `${provenanceHash}  PROVENANCE.json`,
  ...runtimeEvidence.files.map((entry) => `${entry.sha256}  installed/${entry.relativePath}`),
];
await writeFile(path.join(installerDirectory, 'SHA256SUMS.txt'), `${sumLines.join('\n')}\n`, 'utf8');

process.stdout.write(`Release evidence written for detunnel ${version}\n`);

function isCapabilityBridgeIdentity(value) {
  return value !== null
    && typeof value === 'object'
    && value.fileName === 'windows-capability-bridge.ps1'
    && Number.isSafeInteger(value.sizeBytes)
    && value.sizeBytes > 0
    && typeof value.sha256 === 'string'
    && /^[0-9a-f]{64}$/.test(value.sha256);
}

function optionalEnv(name) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const input = createReadStream(filePath);
    input.on('error', reject);
    input.on('data', (chunk) => hash.update(chunk));
    input.on('end', () => resolve(hash.digest('hex')));
  });
}
