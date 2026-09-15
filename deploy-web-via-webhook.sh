#!/bin/bash
# Builds the Expo web export and ships it to the EC2 box over HTTPS,
# same webhook as deploy-via-webhook.sh but for the web client instead
# of the API. See deploy-listener/listener.js for what happens on the
# other end.
set -euo pipefail

DEPLOY_URL="https://membergolfonline.com/cornhole/deploy-web"
TOKEN_FILE="deploy-listener/.token"

if [ ! -f "$TOKEN_FILE" ]; then
  echo "Missing $TOKEN_FILE - put the deploy token in it (one line, no quotes)." >&2
  exit 1
fi
TOKEN="$(cat "$TOKEN_FILE")"

echo "-- Building web export"
rm -rf dist
npx expo export --platform web

TMP_TAR="$(mktemp -t cornhole-web-deploy-XXXXXX.tar.gz)"
trap 'rm -f "$TMP_TAR"' EXIT

echo "-- Packaging dist/"
tar -czf "$TMP_TAR" -C dist .

echo "-- Uploading to $DEPLOY_URL"
HTTP_CODE=$(curl -s -o /tmp/cornhole-web-deploy-response.txt -w "%{http_code}" \
  -X POST "$DEPLOY_URL" \
  -H "X-Deploy-Token: $TOKEN" \
  --data-binary @"$TMP_TAR")

cat /tmp/cornhole-web-deploy-response.txt
echo
if [ "$HTTP_CODE" != "200" ]; then
  echo "Deploy failed (HTTP $HTTP_CODE)" >&2
  exit 1
fi
echo "Web deploy succeeded."
