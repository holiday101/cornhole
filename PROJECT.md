# Cornhole Golf — Project Context

A React Native / Expo app (iOS, Android, and web) for tracking cornhole-golf
games: courses, live scorecards, leaderboards, player stats, friend invites,
and side-games (coins, "Left Left Right Right"). Rate-limited login/signup
with session auth.

## Stack

- **App** (`src/`, `App.js`): Expo ~57, React Navigation (native-stack),
  `expo-secure-store` for token storage. Screens: Home, Login/Signup, Course
  List/Edit, New Game, Scorecard, Leaderboard, Player Stats, Friends,
  History, Game Summary.
- **Backend** (`server/`): Express + `better-sqlite3`. Routes: `auth`,
  `courses`, `games`, `contacts`. Session TTL configurable
  (`SESSION_TTL_DAYS`), email via Resend (`RESEND_API_KEY`, `EMAIL_FROM`).
- ⚠️ **Expo is pinned to v57 and the API changed since the training data
  most models were built on** — see `AGENTS.md` (imported by `CLAUDE.md`):
  read https://docs.expo.dev/versions/v57.0.0/ before writing Expo/React
  Native code in this repo.

## Deployment — runs on the same EC2 box as the other projects

Server: `54.226.186.201` (Ubuntu). This same box also runs the GotLeaks/Neptune
water app (`membergolfonline.com/water/`) and `yinyangjunk.com` — be careful
that nginx/system-level changes here don't clobber those.

- **App**: served under `membergolfonline.com/cornhole` (see `app.json`'s
  `experiments.baseUrl`).
- **API**: runs as a Docker container `cornhole-api` on port 4001, proxied
  in through nginx. Deploy with `./deploy-api.sh` (needs
  `~/.ssh/my-ec2-key.pem`, rebuilds the Docker image and restarts the
  container) — see `server/OPERATIONS.md`.
- **Newer, SSH-free deploy path**: `deploy-listener/` runs a small systemd
  service on the box that accepts an authenticated HTTPS POST to
  `/cornhole/deploy` and redeploys — see `deploy-listener/SETUP.md` for
  one-time setup (already done once; token lives in the gitignored
  `deploy-listener/.token`).
- **Backups**: `npm run backup` inside the container takes a WAL-safe
  SQLite backup to `~/cornhole-api-data/backups/` on the host, 14-day
  retention, cron'd for 3am — see `server/OPERATIONS.md`. Not yet copied
  off-box; a full instance/disk loss would take out backups too.

## Repo

`git remote`: `https://github.com/holiday101/cornhole.git`

## Notable history (see `git log` for more)

- Core app + backend, rate-limited login/signup
- Friend invites (including inviting someone not yet on the app)
- HTTPS deploy webhook (no SSH needed to redeploy)
- Course ownership fixes / bulk course import script
- Coins and "Left Left Right Right" side-games
