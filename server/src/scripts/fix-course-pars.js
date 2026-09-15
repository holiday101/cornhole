// One-off data fix: replaces the hole-by-hole par data for a fixed set of
// courses with corrected, sourced values, and reassigns ownership of those
// courses to a given account (so that account's normal in-app "edit
// course" / "delete course" permissions work on them going forward - the
// API restricts both to the creator, and these were originally created
// under a temporary account with no recoverable password).
//
// Run inside the API container, where DB_PATH already points at the real
// database:
//   docker exec cornhole-api node src/scripts/fix-course-pars.js
//
// Safe to re-run - it always rewrites the named courses' holes/ownership
// from scratch.
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'cornhole.db');
const NEW_OWNER_EMAIL = 'jaredholland101golf@gmail.com';

// front nine + back nine (or all nine, for 9-hole courses), matching each
// course's real total par.
const FIXES = [
  { name: 'Logan Country Club', pars: [4,4,3,3,5,3,4,4,4, 5,4,4,4,3,5,3,4,4] },     // par 70
  { name: 'Preston Country Club', pars: [4,5,3,4,4,3,4,5,3, 5,4,4,3,4,5,4,3,4] },   // par 71 (18 holes, not 9)
  { name: 'Logan River', pars: [5,4,4,3,4,4,4,3,4, 4,4,4,4,3,4,5,3,5] },            // par 71
  { name: 'Birch Creek', pars: [5,4,3,4,5,4,3,4,4, 4,3,4,5,4,4,4,3,5] },            // par 72
  { name: 'Eagle Mountain', pars: [4,5,4,4,3,4,4,3,4, 5,3,4,5,4,4,4,4,3] },         // par 71
  { name: 'Skyway', pars: [4,4,4,4,5,3,5,3,4] },                                    // par 36 (9 holes)
];

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const getCourse = db.prepare('SELECT id FROM courses WHERE name = ?');
const updateCourse = db.prepare('UPDATE courses SET holes_count = ?, created_by_user_id = ? WHERE id = ?');
const deleteHoles = db.prepare('DELETE FROM course_holes WHERE course_id = ?');
const insertHole = db.prepare('INSERT INTO course_holes (course_id, hole_number, par) VALUES (?, ?, ?)');
const getUser = db.prepare('SELECT id, name, email FROM users WHERE email = ?');

const results = [];
const owner = getUser.get(NEW_OWNER_EMAIL);

if (!owner) {
  console.log(`No user found with email ${NEW_OWNER_EMAIL} - nothing was changed. Sign up with that email in the app first, then re-run this.`);
  process.exit(1);
}

db.transaction(() => {
  for (const { name, pars } of FIXES) {
    const course = getCourse.get(name);
    if (!course) {
      results.push(`SKIPPED "${name}" - no course with that exact name found`);
      continue;
    }
    updateCourse.run(pars.length, owner.id, course.id);
    deleteHoles.run(course.id);
    pars.forEach((par, i) => insertHole.run(course.id, i + 1, par));
    results.push(`Fixed "${name}" (id ${course.id}): ${pars.length} holes, par ${pars.reduce((a, b) => a + b, 0)}, now owned by ${owner.name} <${owner.email}>`);
  }
})();

db.close();
results.forEach((line) => console.log(line));
