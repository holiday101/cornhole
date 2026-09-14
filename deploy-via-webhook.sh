#!/bin/bash
# Deploys server/ to the EC2 box over HTTPS instead of SSH - see
# deploy-listener/SETUP.md for the one-time setup this depends on.
set -euo pipefail

DEPLOY_URL="https://membergolfonline.com/cornhole/deploy"
TOKEN_FILE="deploy-listener/.token"

if [ ! -f "$TOKEN_FILE" ]; then
  echo "Missing $TOKEN_FILE - put the deploy token in it (one line, no quotes)." >&2
  exit 1
fi
TOKEN="$(cat "$TOKEN_FILE")"

TMP_TAR="$(mktemp -t cornhole-deploy-XXXXXX.tar.gz)"
trap 'rm -f "$TMP_TAR"' EXIT

echo "-- Packaging server/"
tar -czf "$TMP_TAR" -C server src package.json package-lock.json Dockerfile

echo "-- Uploading to $DEPLOY_URL"
HTTP_CODE=$(curl -s -o /tmp/cornhole-deploy-response.txt -w "%{http_code}" \
  -X POST "$DEPLOY_URL" \
  -H "X-Deploy-Token: $TOKEN" \
  --data-binary @"$TMP_TAR")

cat /tmp/cornhole-deploy-response.txt
echo
if [ "$HTTP_CODE" != "200" ]; then
  echo "Deploy failed (HTTP $HTTP_CODE)" >&2
  exit 1
fi
echo "Deploy succeeded."
