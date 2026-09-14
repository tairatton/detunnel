#!/usr/bin/env bash
set -eu

# The container is intentionally responsible only for the MCP gateway.
# Keep the OpenAI tunnel client outside the image and point it at the published
# localhost endpoint from the host machine.
exec "$@"
