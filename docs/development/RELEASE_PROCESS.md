# lnwjud Release Process

This document is the canonical release sequence for maintainers and coding agents.
It assumes a local source tree and a selected distribution channel; it does not
require branch, tag, or remote-repository state.

## Release invariants

1. The intended version is consistent across the root package, application packages, installer metadata, update manifests, and release-facing docs.
2. Generated output is built from a clean dependency install and a clean compiler state.
3. Unit, integration, acceptance, packaging, Docker, lint, and typecheck checks pass before publishing.
4. Release evidence contains hashes, version, build target, and signing status.
5. A failed check is a stop condition. Fix the source, rerun the relevant checks, and regenerate evidence.

## Verification sequence

Run from the project root:

```powershell
corepack pnpm@10.15.0 install --frozen-lockfile
corepack pnpm@10.15.0 lint
corepack pnpm@10.15.0 typecheck
corepack pnpm@10.15.0 test:release
corepack pnpm@10.15.0 test:integration
corepack pnpm@10.15.0 test:packaging
corepack pnpm@10.15.0 docs:tools:check
corepack pnpm@10.15.0 build
```

For Docker:

```powershell
docker compose -f docker/compose.yml config --quiet
docker compose -f docker/compose.yml build
docker compose -f docker/compose.yml up -d
docker compose -f docker/compose.yml ps
docker compose -f docker/compose.yml down
```

For a Windows package, use `scripts/package-windows.ps1` and verify the generated
Setup, Portable, update-manifest, checksum, provenance, and signing outputs in the
release directory before distribution.

## Release evidence

Keep the exact version, build target, package list, SHA-256 sums, and signing
result together with the artifacts. Do not publish artifacts if provenance or
hash verification fails. Use the same output directory for the final review so
the files checked by the operator are the files distributed to users.

## Related documents

- `docs/development/RELEASE_CHECKLIST.md` — short command checklist.
- `docs/development/PACKAGING_WINDOWS.md` — Windows packaging and clean-machine details.
- `docs/DOCKER_GUIDE.md` — Docker setup, volumes, healthcheck, and security notes.
- `README.md` — setup, build, and verification commands.
