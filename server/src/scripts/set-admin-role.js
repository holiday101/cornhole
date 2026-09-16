// Promotes (or demotes) a user to/from the 'admin' role by email. There's no
// in-app way to create the first admin -- every account starts as 'user' --
// so this bootstraps it. Once at least one admin exists, further role
// changes can be done from the app's admin screen.
//
// Run inside the API container, where DB_PATH already points at the real
// database:
//   docker exec cornhole-api node src/scripts/set-admin-role.js <email> [user|admin]
//
// Role defaults to 'admin' when omitted.
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'cornhole.db');

const email = (process.argv[2] || '').trim().toLowerCase();
const role = (process.argv[3] || 'admin').trim().toLowerCase();

if (!email) {
  console.log('Usage: node src/scripts/set-admin-role.js <email> [user|admin]');
  process.exit(1);
}
if (role !== 'user' && role !== 'admin') {
  console.log(`Invalid role "${role}" - must be "user" or "admin".`);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const user = db.prepare('SELECT id, name, email, role FROM users WHERE email = ?').get(email);
if (!user) {
  console.log(`No user found with email ${email} - nothing was changed.`);
  db.close();
  process.exit(1);
}

db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
db.close();
console.log(`${user.name} <${user.email}> is now role "${role}" (was "${user.role}").`);
