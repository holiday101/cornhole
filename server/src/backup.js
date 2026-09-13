// Online, WAL-safe backup of the SQLite database using better-sqlite3's
// built-in backup() API (this is the same mechanism as the sqlite3 CLI's
// `.backup` command — safe to run while the API is live and serving
// requests). Writes a timestamped copy into <DB dir>/backups/ and prunes
// anything older than BACKUP_RETENTION_DAYS.
//
// Intended to run inside the API container via cron on the host:
//   docker exec cornhole-api npm run backup
// Because /data is a host-mounted volume, the resulting files land on the
// host at ~/cornhole-api-data/backups/ with no extra setup.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'cornhole.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), 'backups');
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 14);

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// Deletes a file if it exists, without complaining if it doesn't (a backup's
// -wal/-shm sidecars only exist if something opened it in WAL mode).
function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function pruneOldBackups() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const name of fs.readdirSync(BACKUP_DIR)) {
    if (!name.startsWith('cornhole-') || !name.endsWith('.db')) continue;
    const filePath = path.join(BACKUP_DIR, name);
    if (fs.statSync(filePath).mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
      // Clean up any WAL sidecar files for this backup too, so they never
      // pile up orphaned once the .db they belong to is gone.
      removeIfExists(`${filePath}-wal`);
      removeIfExists(`${filePath}-shm`);
      console.log(`Pruned old backup: ${name}`);
    }
  }
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`No database found at ${DB_PATH}`);
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const destPath = path.join(BACKUP_DIR, `cornhole-${timestamp()}.db`);
  const db = new Database(DB_PATH, { readonly: true });
  try {
    await db.backup(destPath);
  } finally {
    db.close();
  }

  const { size } = fs.statSync(destPath);
  console.log(`Backed up ${DB_PATH} -> ${destPath} (${size} bytes)`);

  pruneOldBackups();
}

main().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
