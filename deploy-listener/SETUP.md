# One-time setup: deploy webhook

This lets deploys happen over HTTPS (`POST /cornhole/deploy`) instead of SSH.
Do this once, from your own terminal:

```bash
ssh -i ~/.ssh/my-ec2-key.pem ubuntu@54.226.186.201
```

## 1. Preserve the existing API env file

Deploys wipe `~/cornhole-api-deploy/` on every run, so the API's env file
needs to live somewhere stable outside it. If you've deployed before via
`deploy-api.sh`, copy the one that's already there; otherwise create it
fresh (same contents as `server/.env.example`, filled in):

```bash
if [ -f ~/cornhole-api-deploy/.env ]; then
  cp ~/cornhole-api-deploy/.env ~/cornhole-api.env
else
  cat > ~/cornhole-api.env <<'ENVEOF'
PORT=4001
DB_PATH=/data/cornhole.db
SESSION_TTL_DAYS=30
RESEND_API_KEY=
EMAIL_FROM="Cornhole Golf <onboarding@resend.dev>"
ENVEOF
fi
```

## 2. Install the listener

```bash
mkdir -p ~/cornhole-deploy-listener
```

Copy `deploy-listener/listener.js` from this repo to
`~/cornhole-deploy-listener/listener.js` on the box (e.g. `scp` it up, or
paste its contents into a file there).

Set its secret token - this is the value you'll also give Claude:

```bash
cat > ~/cornhole-deploy-listener.env <<'ENVEOF'
DEPLOY_TOKEN=<paste the generated token here>
ENVEOF
chmod 600 ~/cornhole-deploy-listener.env ~/cornhole-api.env
```

## 3. Install and start the systemd service

Copy `deploy-listener/cornhole-deploy-listener.service` from this repo to
the box, then:

```bash
sudo cp cornhole-deploy-listener.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cornhole-deploy-listener
sudo systemctl status cornhole-deploy-listener --no-pager
```

It listens on `127.0.0.1:4099` only - nginx is what exposes it externally.

## 4. Wire up nginx

This depends on your existing config for `membergolfonline.com`, which
Claude hasn't seen - paste the output of this and send it over so the
exact addition can be written for you rather than guessed at:

```bash
sudo cat /etc/nginx/sites-enabled/default
```

The gist of what needs adding is a new location block proxying
`/cornhole/deploy` to `http://127.0.0.1:4099/deploy`, alongside whatever
already proxies `/cornhole/api`.

## 5. Verify

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://membergolfonline.com/cornhole/deploy \
  -H "X-Deploy-Token: wrong-token"
# expect 401 - confirms nginx is routing to the listener and auth is checked
```
