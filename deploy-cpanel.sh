#!/bin/bash
# Deploy script — build locally with Node 22, package for cPanel upload
# Run this in fish: fnm use 22; bash deploy-cpanel.sh

set -e

echo "=== DEPLOY TO CPANEL ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"

# 1. Clean
echo -e "\n[1/5] Cleaning..."
rm -rf node_modules .next

# 2. Install
echo -e "\n[2/5] Installing dependencies..."
npm install

# 3. Prisma generate
echo -e "\n[3/5] Prisma generate..."
npx prisma generate

# 4. Build
echo -e "\n[4/5] Building Next.js..."
npm run build

# 5. Package
echo -e "\n[5/5] Creating deploy package..."
DEPLOY_DIR="cpanel-deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy required files
cp -r .next "$DEPLOY_DIR/"
cp -r node_modules "$DEPLOY_DIR/"
cp -r prisma "$DEPLOY_DIR/"
cp -r public "$DEPLOY_DIR/" 2>/dev/null || true
cp start.js "$DEPLOY_DIR/"
cp server.js "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp .env "$DEPLOY_DIR/" 2>/dev/null || echo "WARNING: .env not found"

# Verify react exists
if [ -d "$DEPLOY_DIR/node_modules/react" ]; then
  echo "✓ react module found"
else
  echo "✗ ERROR: react module MISSING"
  exit 1
fi

if [ -d "$DEPLOY_DIR/node_modules/@prisma/client" ]; then
  echo "✓ @prisma/client found"
else
  echo "✗ ERROR: @prisma/client MISSING"
  exit 1
fi

# Size
SIZE=$(du -sh "$DEPLOY_DIR" | cut -f1)
echo -e "\n=== DONE ==="
echo "Package: $DEPLOY_DIR/ ($SIZE)"
echo "Upload this folder to cPanel."
echo "Set Application startup file to: start.js"
