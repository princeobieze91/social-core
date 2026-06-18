#!/bin/bash
set -e

echo "=== SocialCore EC2 Deployment ==="

# 1. System update & dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential

# 2. Install Node.js 20.x
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

echo "Node: $(node -v) | npm: $(npm -v)"

# 3. Install PM2 globally
sudo npm install -g pm2

# 4. Clone repo (if not already present)
APP_DIR="/opt/socialcore"
if [ ! -d "$APP_DIR" ]; then
  sudo git clone https://github.com/princeobieze91/social-core.git "$APP_DIR"
fi

cd "$APP_DIR"

# 5. Install dependencies & build
npm install
npm run build

# 6. Setup environment
if [ ! -f .env ]; then
  echo "Creating .env from template..."
  cp .env.example .env
  echo ""
  echo ">>> EDIT /opt/socialcore/.env WITH YOUR ACTUAL SECRETS <<<"
  echo ">>> Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, GEMINI_API_KEY, JWT_SECRET <<<"
  echo ""
fi

# 7. Start with PM2
pm2 delete socialcore 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

echo ""
echo "=== Deployment Complete ==="
echo "App running at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'YOUR_EC2_PUBLIC_IP'):3000"
