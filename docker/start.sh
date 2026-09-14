#!/usr/bin/env bash
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if ! command -v docker >/dev/null 2>&1; then
    echo "[ERROR] Docker is not installed or not available on PATH." >&2
    exit 1
fi

echo "======================================================="
echo "   Starting DETUNNEL Docker service"
echo "======================================================="

mkdir -p "$PROJECT_ROOT/workspace"

if [ ! -f "$SCRIPT_DIR/.env" ] && [ -f "$SCRIPT_DIR/.env.example" ]; then
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "Created docker/.env from template."
fi

echo ""
echo "Building and launching detunnel container..."
docker compose -f "$SCRIPT_DIR/compose.yml" up -d --build

echo ""
echo "======================================================="
echo "   DETUNNEL is running successfully!"
echo "   MCP Endpoint: http://127.0.0.1:18765/mcp (default)"
echo "   Workspace:    $PROJECT_ROOT/workspace"
echo "======================================================="
echo ""
echo "Useful commands:"
echo "   - View logs: docker compose -f docker/compose.yml logs -f"
echo "   - Stop:      docker compose -f docker/compose.yml down"
echo ""
