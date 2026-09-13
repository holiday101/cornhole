# Operations notes

## Deploying

`./deploy-api.sh` (from the repo root) ships `server/` to the EC2 box,
rebuilds the Docker image, and restarts the `cornhole-api` container.
Requires `~/.ssh/my-ec2-key.pem` locally.

## Database backups

`npm run backup` (inside the container) takes a live, WAL-safe backup of
the SQLite database via better-sqlite3's `backup()` API and writes it to
`/data/backups/` inside the container — which, because `/data` is a
host-mounted volume, lands on the host at `~/cornhole-api-data/backups/`
with no extra setup. It keeps the last 14 days by default
(`BACKUP_RETENTION_DAYS` to change) and cleans up its own `-wal`/`-shm`
sidecar files as it prunes.

**One-time setup — run this on the EC2 host** to back up daily at 3am:

```bash
ssh -i ~/.ssh/my-ec2-key.pem ubuntu@54.226.186.201
mkdir -p ~/cornhole-api-backup-logs
(crontab -l 2>/dev/null; echo "0 3 * * * docker exec cornhole-api npm run backup >> $HOME/cornhole-api-backup-logs/backup.log 2>&1") | crontab -
crontab -l   # confirm it's there
```

To restore from a backup: stop the container, copy the chosen file from
`~/cornhole-api-data/backups/` over `~/cornhole-api-data/cornhole.db`
(and remove any `-wal`/`-shm` files next to the live db), then restart.

**Not yet covered:** these backups still live on the same EC2 host as the
live database. A full instance/disk loss takes both out. Copying backups
off-box (S3, or synced to another machine) is the natural next step —
needs a decision on where and credentials to get there.
