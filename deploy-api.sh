#!/bin/bash
set -euo pipefail

SSH_KEY="$HOME/.ssh/my-ec2-key.pem"
SSH_HOST="ubuntu@54.226.186.201"
REMOTE_DIR="~/cornhole-api-deploy"

echo "-- Copying server/ to $SSH_HOST:$REMOTE_DIR"
ssh -i "$SSH_KEY" "$SSH_HOST" "rm -rf $REMOTE_DIR && mkdir -p $REMOTE_DIR"
scp -i "$SSH_KEY" -r server/* "$SSH_HOST:$REMOTE_DIR/"
scp -i "$SSH_KEY" server/.env "$SSH_HOST:$REMOTE_DIR/.env"

echo "-- Building and restarting cornhole-api container"
ssh -i "$SSH_KEY" "$SSH_HOST" bash -s <<'ENDSSH'
set -euo pipefail
cd ~/cornhole-api-deploy
docker build -t cornhole-api .
docker stop cornhole-api 2>/dev/null || true
docker rm cornhole-api 2>/dev/null || true
mkdir -p ~/cornhole-api-data
docker run -d \
  --name cornhole-api \
  --restart unless-stopped \
  -p 4001:4001 \
  -v ~/cornhole-api-data:/data \
  --env-file ~/cornhole-api-deploy/.env \
  cornhole-api
docker image prune -f
echo "-- cornhole-api running:"
docker ps --filter name=cornhole-api
ENDSSH

echo "Deploy complete."
