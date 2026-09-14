FROM node:24-bookworm-slim

# Install the tools used by the MCP runtime and common projects.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ripgrep \
    python3 \
    build-essential \
    ca-certificates \
    procps \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

# Copy only the files needed to install and build the server runtime.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY packages/ ./packages/
COPY apps/cli/ ./apps/cli/
COPY apps/desktop/package.json ./apps/desktop/package.json

# Install dependencies reproducibly. A stale lockfile must fail the image build.
RUN pnpm install --frozen-lockfile

# Build the complete server dependency chain and CLI entrypoint from the clean
# source-only context. Build mode follows project references and --force makes
# the image independent of any local incremental compiler state.
RUN pnpm exec tsc --build --force apps/cli/tsconfig.json

# Runtime defaults are deliberately conservative. Override them only for a
# deployment that is explicitly trusted.
ENV NODE_ENV=production \
    DOCKER_CONTAINER=1 \
    DETUNNEL_HOST=0.0.0.0 \
    DETUNNEL_PORT=18765 \
    DETUNNEL_WORKSPACE=/workspace \
    DETUNNEL_DATA_PATH=/root/.detunnel \
    DETUNNEL_PROFILE=balanced \
    DETUNNEL_FULL_BYPASS=0 \
    DETUNNEL_UNRESTRICTED=0

# Create persistent mount points.
RUN mkdir -p /workspace /root/.detunnel

VOLUME ["/workspace", "/root/.detunnel"]

EXPOSE 18765

COPY docker/entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:18765/_detunnel/identity').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "apps/cli/dist/bin/mcp-http.js"]
