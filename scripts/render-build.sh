#!/bin/bash
set -e

echo "==> Installing Google Chrome..."
apt-get update -qq
apt-get install -y -q curl gnupg ca-certificates
curl -fsSL https://dl-ssl.google.com/linux/linux_signing_key.pub \
  | gpg --dearmor -o /usr/share/keyrings/google-linux-signing-key.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-key.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
  > /etc/apt/sources.list.d/google-chrome.list
apt-get update -qq
apt-get install -y -q google-chrome-stable
echo "Chrome installed: $(google-chrome-stable --version)"

echo "==> Installing pnpm..."
npm install -g pnpm@9

echo "==> Installing dependencies (skipping Puppeteer Chromium download)..."
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true pnpm install --frozen-lockfile

echo "==> Building frontend..."
BASE_PATH=/ pnpm --filter @workspace/whatsapp-dashboard run build

echo "==> Building backend..."
pnpm --filter @workspace/api-server run build

echo "==> Build complete!"
