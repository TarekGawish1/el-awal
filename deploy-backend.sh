#!/usr/bin/env bash
# ==============================================================================
# EL AWAL BACKEND DEPLOYMENT SCRIPT
# ==============================================================================
set -e

echo "🚀 [1/5] Pulling latest changes from Git..."
git pull origin main

echo "📦 [2/5] Installing production dependencies..."
npm ci --workspaces --include-workspace-root

echo "🗄️ [3/5] Generating Prisma Client & Running Migrations..."
npm run prisma:generate
npm run prisma:migrate:deploy

echo "🏗️ [4/5] Building NestJS Backend..."
npm run build:backend

echo "🔄 [5/5] Reloading PM2 Processes..."
pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo "✅ Deployment successful! Backend is running with PM2."
pm2 status el-awal-backend
