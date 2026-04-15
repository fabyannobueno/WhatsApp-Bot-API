FROM node:24-bookworm-slim

# ── System dependencies + Google Chrome ──────────────────────────────────────
RUN apt-get update -qq && \
    apt-get install -y -q --no-install-recommends curl gnupg ca-certificates && \
    curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub \
      | gpg --dearmor -o /usr/share/keyrings/google-linux-signing-key.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-key.gpg] \
      http://dl.google.com/linux/chrome/deb/ stable main" \
      > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update -qq && \
    apt-get install -y -q --no-install-recommends google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# ── pnpm ─────────────────────────────────────────────────────────────────────
RUN npm install -g pnpm@9

# ── Workspace root ────────────────────────────────────────────────────────────
WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy all packages needed for the workspace install
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/whatsapp-dashboard/ ./artifacts/whatsapp-dashboard/

# ── Install dependencies ──────────────────────────────────────────────────────
# Skip puppeteer Chromium download — we use system Google Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN pnpm install --frozen-lockfile

# ── Build frontend ────────────────────────────────────────────────────────────
# PORT is required by vite.config.ts even during build (used for dev server config)
RUN BASE_PATH=/ PORT=10000 pnpm --filter @workspace/whatsapp-dashboard run build

# ── Build backend ─────────────────────────────────────────────────────────────
RUN pnpm --filter @workspace/api-server run build

# ── Runtime ───────────────────────────────────────────────────────────────────
ENV NODE_ENV=production
ENV CHROME_EXECUTABLE=/usr/bin/google-chrome-stable

EXPOSE 10000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
