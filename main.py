"""Launch the DETUNNEL desktop application from the repository root."""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parent
DESKTOP_ROOT = REPOSITORY_ROOT / "apps" / "desktop"
MAIN_BUNDLE = DESKTOP_ROOT / "dist" / "main" / "main.js"
RENDERER_ENTRY = DESKTOP_ROOT / "dist" / "renderer" / "index.html"
ENV_FILE = REPOSITORY_ROOT / ".env"
ENV_KEY_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def build_input_paths() -> tuple[Path, ...]:
    """Return source/config paths whose changes require a fresh desktop build."""

    roots = (
        DESKTOP_ROOT / "src",
        REPOSITORY_ROOT / "packages",
    )
    files = (
        REPOSITORY_ROOT / "package.json",
        REPOSITORY_ROOT / "pnpm-lock.yaml",
        REPOSITORY_ROOT / "pnpm-workspace.yaml",
        DESKTOP_ROOT / "package.json",
        DESKTOP_ROOT / "tsconfig.main.json",
        DESKTOP_ROOT / "tsconfig.json",
        DESKTOP_ROOT / "vite.config.ts",
    )
    inputs = [path for path in files if path.is_file()]
    for root in roots:
        if root.is_dir():
            inputs.extend(path for path in root.rglob("*") if path.is_file())
    return tuple(inputs)


def read_env_file(path: Path) -> dict[str, str]:
    """Read a small dotenv-compatible file without adding a runtime dependency."""

    if not path.is_file():
        return {}

    values: dict[str, str] = {}
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()

        key, separator, value = line.partition("=")
        key = key.strip()
        if separator == "" or ENV_KEY_PATTERN.fullmatch(key) is None:
            raise ValueError(f"Invalid environment entry at {path}:{line_number}")

        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key] = value
    return values


def load_environment() -> dict[str, str]:
    """Merge root .env values with the process environment.

    Values explicitly set by the operating system or shell take precedence over
    the file so CI, Docker, and one-off PowerShell overrides remain predictable.
    """

    environment = os.environ.copy()
    for key, value in read_env_file(ENV_FILE).items():
        environment.setdefault(key, value)
    return environment


def resolve_command(command: str) -> str | None:
    """Resolve a command across Windows and POSIX executable conventions."""

    candidates = [command]
    if sys.platform == "win32":
        candidates.extend((f"{command}.cmd", f"{command}.exe"))

    for candidate in candidates:
        resolved = shutil.which(candidate)
        if resolved is not None:
            return resolved
    return None


def resolve_electron() -> Path | None:
    """Find the Electron binary installed for the desktop workspace."""

    binary_name = "electron.exe" if sys.platform == "win32" else "electron"
    candidates = (
        DESKTOP_ROOT / "node_modules" / "electron" / "dist" / binary_name,
        DESKTOP_ROOT / "node_modules" / ".bin" / binary_name,
    )
    return next((candidate for candidate in candidates if candidate.is_file()), None)


def build_desktop(environment: dict[str, str]) -> int:
    """Build all workspace dependencies and the desktop bundles."""

    corepack = resolve_command("corepack")
    if corepack is None:
        print("ไม่พบ Corepack กรุณาติดตั้ง Node.js 24 แล้วรัน corepack enable", file=sys.stderr)
        return 1

    command = [corepack, "pnpm@10.15.0", "build"]
    print("กำลัง build DETUNNEL desktop app...")
    completed = subprocess.run(command, cwd=REPOSITORY_ROOT, env=environment, check=False)
    return completed.returncode


def needs_build() -> bool:
    """Return whether the desktop output required by Electron is missing."""

    if not MAIN_BUNDLE.is_file() or not RENDERER_ENTRY.is_file():
        return True

    output_mtime = min(MAIN_BUNDLE.stat().st_mtime, RENDERER_ENTRY.stat().st_mtime)
    return any(path.stat().st_mtime > output_mtime for path in build_input_paths())


def launch_desktop(electron: Path, electron_args: list[str], environment: dict[str, str]) -> int:
    """Launch Electron with a clean runtime environment."""

    environment = environment.copy()
    # This variable makes Electron behave like Node and breaks desktop startup.
    environment.pop("ELECTRON_RUN_AS_NODE", None)

    command = [str(electron), str(DESKTOP_ROOT), *electron_args]
    return subprocess.run(command, cwd=REPOSITORY_ROOT, env=environment, check=False).returncode


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build and launch the DETUNNEL desktop app.")
    parser.add_argument(
        "--build",
        action="store_true",
        help="force a full workspace build before launching",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        environment = load_environment()
    except (OSError, ValueError) as error:
        print(f"อ่าน {ENV_FILE} ไม่สำเร็จ: {error}", file=sys.stderr)
        return 1

    electron = resolve_electron()
    if electron is None:
        print("ไม่พบ Electron dependency กรุณารัน corepack pnpm@10.15.0 install", file=sys.stderr)
        return 1

    if args.build or needs_build():
        build_exit_code = build_desktop(environment)
        if build_exit_code != 0:
            return build_exit_code

    return launch_desktop(electron, [], environment)


if __name__ == "__main__":
    raise SystemExit(main())
