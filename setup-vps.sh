#!/usr/bin/env bash
# ==============================================================================
# EL AWAL - DIGITALOCEAN VPS ONE-TIME INITIAL SETUP (Ubuntu 22.04 / 24.04)
# ==============================================================================
set -e

echo "🔄 Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "📦 Installing essential tools (curl, git, ufw, nginx, build-essential)..."
sudo apt install -y curl git ufw nginx build-essential

echo "🟢 Installing Node.js 20 LTS (NodeSource)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "⚡ Installing PM2 globally..."
sudo npm install -g pm2

echo "🔒 Configuring UFW Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "💾 Configuring PM2 to startup automatically on system reboot..."
pm2 startup systemd -u $(whoami) --hp $HOME || true

echo "✅ VPS Initial setup complete!"
node -v
npm -v
pm2 -v
