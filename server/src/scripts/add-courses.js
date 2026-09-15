// Adds new courses with sourced hole-by-hole par data, owned by a given
// account from the start (avoids the earlier lockout where courses were
// created under a throwaway account with no recoverable password).
//
// Run inside the API container, where DB_PATH already points at the real
// database:
//   docker exec cornhole-api node src/scripts/add-courses.js
//
// Safe to re-run - courses already present by name are left untouched.
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'cornhole.db');
const OWNER_EMAIL = 'jaredholland101golf@gmail.com';

// front nine + back nine, matching the course's real scorecard total par.
const ADDITIONS = [
  {
    name: 'Valley View Golf Course',
    // Layton, UT - front 9 par 36, back 9 par 36, total par 72.
    // Source: valleyviewutah.com/score-card/ (men's par), cross-checked
    // against golfpass.com course listing (18 holes, par 72).
    pars: [4,5,4,3,4,4,3,4,5, 4,5,3,4,4,4,3,5,4],
  },
];

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const getCourse = db.prepare('SELECT id FROM courses WHERE name = ?');
const insertCourse = db.prepare(
  'INSERT INTO courses (created_by_user_id, name, holes_count) VALUES (?, ?, ?)'
);
const insertHole = db.prepare('INSERT INTO course_holes (course_id, hole_number, par) VALUES (?, ?, ?)');
const getUser = db.prepare('SELECT id, name, email FROM users WHERE email = ?');

const results = [];
const owner = getUser.get(OWNER_EMAIL);

if (!owner) {
  console.log(`No user found with email ${OWNER_EMAIL} - nothing was changed. Sign up with that email in the app first, then re-run this.`);
  process.exit(1);
}

db.transaction(() => {
  for (const { name, pars } of ADDITIONS) {
    const existing = getCourse.get(name);
    if (existing) {
      results.push(`SKIPPED "${name}" - a course with that exact name already exists (id ${existing.id})`);
      continue;
    }
    const { lastInsertRowid: courseId } = insertCourse.run(owner.id, name, pars.length);
    pars.forEach((par, i) => insertHole.run(courseId, i + 1, par));
    results.push(`Added "${name}" (id ${courseId}): ${pars.length} holes, par ${pars.reduce((a, b) => a + b, 0)}, owned by ${owner.name} <${owner.email}>`);
  }
})();

db.close();
results.forEach((line) => console.log(line));
