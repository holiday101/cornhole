const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'cornhole.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// schema.sql's `CREATE TABLE IF NOT EXISTS games (...)` only defines llrr_point_value
// for a brand-new database -- it can't retroactively add the column to a `games` table
// that already exists in production. SQLite has no `ALTER TABLE ... ADD COLUMN IF NOT
// EXISTS`, so guard it by hand; this runs on every startup and is a no-op once applied.
const gameColumns = db.prepare('PRAGMA table_info(games)').all();
const hasLlrrColumn = gameColumns.some((col) => col.name === 'llrr_point_value');
if (!hasLlrrColumn) {
  db.exec('ALTER TABLE games ADD COLUMN llrr_point_value REAL');
}
const hasEnabledCoinsColumn = gameColumns.some((col) => col.name === 'enabled_coins');
if (!hasEnabledCoinsColumn) {
  db.exec('ALTER TABLE games ADD COLUMN enabled_coins TEXT');
}
const hasBeansValueColumn = gameColumns.some((col) => col.name === 'beans_value');
if (!hasBeansValueColumn) {
  db.exec('ALTER TABLE games ADD COLUMN beans_value REAL');
}

// Same story for `role` on `users` -- SQLite's ADD COLUMN can't carry a CHECK
// that isn't a constant expression, so the 'user'/'admin' constraint is only
// enforced by schema.sql on a fresh database; existing rows just get the
// 'user' default and the API validates the value on every write.
const userColumns = db.prepare('PRAGMA table_info(users)').all();
const hasRoleColumn = userColumns.some((col) => col.name === 'role');
if (!hasRoleColumn) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
}

// Friends/directory redesign: `claimed_at` marks a real, logged-in-capable
// account (vs a placeholder person someone added by name+email). Every
// pre-existing row already has a password and has been logging in fine, so
// it backfills to `created_at` in the same migration that adds the column --
// this only runs once, the moment the column doesn't exist yet.
const hasClaimedAtColumn = userColumns.some((col) => col.name === 'claimed_at');
if (!hasClaimedAtColumn) {
  db.exec('ALTER TABLE users ADD COLUMN claimed_at TEXT');
  db.exec('UPDATE users SET claimed_at = created_at WHERE claimed_at IS NULL');
}

// Old `contacts` (mutual friends) -> new one-directional `favorites`: each
// existing pair becomes two rows so nobody's favorites list goes empty.
// Guarded purely by the table's existence, so it's a no-op after the first
// run once `contacts` has been dropped.
const hasContactsTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'contacts'")
  .get();
if (hasContactsTable) {
  db.exec(`
    INSERT OR IGNORE INTO favorites (user_id, favorite_id)
    SELECT user_a_id, user_b_id FROM contacts
    UNION ALL
    SELECT user_b_id, user_a_id FROM contacts
  `);
  db.exec('DROP TABLE contacts');
}

// Old `pending_invites` (email-only, invisible until signup) -> a real
// placeholder `users` row per invited email, immediately listable in the
// directory and favorited for whoever invited them. Names weren't captured
// before, so the placeholder starts out named from the email's local part;
// an admin can rename it via PATCH /admin/users/:id.
const hasPendingInvitesTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'pending_invites'")
  .get();
if (hasPendingInvitesTable) {
  const migratePendingInvites = db.transaction(() => {
    const invites = db.prepare('SELECT email, invited_by_user_id FROM pending_invites').all();
    for (const invite of invites) {
      let placeholder = db.prepare('SELECT id FROM users WHERE email = ?').get(invite.email);
      if (!placeholder) {
        const guessedName = invite.email.split('@')[0];
        // password_hash is spelled out (rather than relying on schema.sql's
        // DEFAULT '') because a pre-existing `users` table on a real database
        // keeps its original NOT NULL-with-no-default column definition --
        // CREATE TABLE IF NOT EXISTS can't retrofit it.
        const info = db
          .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, '')")
          .run(invite.email, guessedName);
        placeholder = { id: info.lastInsertRowid };
      }
      db.prepare('INSERT OR IGNORE INTO favorites (user_id, favorite_id) VALUES (?, ?)').run(
        invite.invited_by_user_id,
        placeholder.id
      );
    }
    db.exec('DROP TABLE pending_invites');
  });
  migratePendingInvites();
}

module.exports = db;
