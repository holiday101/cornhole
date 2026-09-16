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

// Same story for `role` on `users` -- SQLite's ADD COLUMN can't carry a CHECK
// that isn't a constant expression, so the 'user'/'admin' constraint is only
// enforced by schema.sql on a fresh database; existing rows just get the
// 'user' default and the API validates the value on every write.
const userColumns = db.prepare('PRAGMA table_info(users)').all();
const hasRoleColumn = userColumns.some((col) => col.name === 'role');
if (!hasRoleColumn) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
}

module.exports = db;
