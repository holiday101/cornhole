const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function loadCourse(id, userId) {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!course) return null;
  const holes = db
    .prepare('SELECT hole_number AS number, par FROM course_holes WHERE course_id = ? ORDER BY hole_number')
    .all(id);
  const isFavorite = !!db
    .prepare('SELECT 1 FROM course_favorites WHERE user_id = ? AND course_id = ?')
    .get(userId, id);
  return {
    id: course.id,
    name: course.name,
    holesCount: course.holes_count,
    createdByUserId: course.created_by_user_id,
    isFavorite,
    holes,
  };
}

function validateHoles(holesCount, holes) {
  if (!Array.isArray(holes) || holes.length !== holesCount) return false;
  const numbers = new Set();
  for (const h of holes) {
    if (!Number.isInteger(h.number) || h.number < 1 || h.number > holesCount) return false;
    if (!Number.isInteger(h.par) || h.par < 1 || h.par > 15) return false;
    numbers.add(h.number);
  }
  return numbers.size === holesCount;
}

router.get('/courses', requireAuth, (req, res) => {
  const courses = db
    .prepare('SELECT id FROM courses ORDER BY name')
    .all()
    .map((c) => loadCourse(c.id, req.user.id));
  res.json({ courses });
});

router.get('/courses/:id', requireAuth, (req, res) => {
  const course = loadCourse(req.params.id, req.user.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json({ course });
});

// Courses are shared/global (a friend group plays the same physical course),
// so only admins manage the canonical list -- everyone else views and favorites.
router.post('/courses', requireAuth, requireAdmin, (req, res) => {
  const { name, holesCount, holes } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Course name is required' });
  }
  if (holesCount !== 9 && holesCount !== 18) {
    return res.status(400).json({ error: 'holesCount must be 9 or 18' });
  }
  if (!validateHoles(holesCount, holes)) {
    return res.status(400).json({ error: 'holes must have a par (1-15) for every hole number 1..holesCount' });
  }

  const insertCourse = db.prepare(
    'INSERT INTO courses (created_by_user_id, name, holes_count) VALUES (?, ?, ?)'
  );
  const insertHole = db.prepare(
    'INSERT INTO course_holes (course_id, hole_number, par) VALUES (?, ?, ?)'
  );

  const courseId = db.transaction(() => {
    const info = insertCourse.run(req.user.id, name.trim(), holesCount);
    for (const h of holes) insertHole.run(info.lastInsertRowid, h.number, h.par);
    return info.lastInsertRowid;
  })();

  res.status(201).json({ course: loadCourse(courseId, req.user.id) });
});

router.put('/courses/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });

  const { name, holesCount, holes } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Course name is required' });
  }
  if (holesCount !== 9 && holesCount !== 18) {
    return res.status(400).json({ error: 'holesCount must be 9 or 18' });
  }
  if (!validateHoles(holesCount, holes)) {
    return res.status(400).json({ error: 'holes must have a par (1-15) for every hole number 1..holesCount' });
  }

  db.transaction(() => {
    db.prepare('UPDATE courses SET name = ?, holes_count = ? WHERE id = ?').run(
      name.trim(),
      holesCount,
      existing.id
    );
    db.prepare('DELETE FROM course_holes WHERE course_id = ?').run(existing.id);
    const insertHole = db.prepare(
      'INSERT INTO course_holes (course_id, hole_number, par) VALUES (?, ?, ?)'
    );
    for (const h of holes) insertHole.run(existing.id, h.number, h.par);
  })();

  res.json({ course: loadCourse(existing.id, req.user.id) });
});

router.delete('/courses/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  db.prepare('DELETE FROM courses WHERE id = ?').run(existing.id);
  res.status(204).end();
});

router.post('/courses/:id/favorite', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT id FROM courses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });
  db.prepare('INSERT OR IGNORE INTO course_favorites (user_id, course_id) VALUES (?, ?)').run(
    req.user.id,
    existing.id
  );
  res.status(204).end();
});

router.delete('/courses/:id/favorite', requireAuth, (req, res) => {
  db.prepare('DELETE FROM course_favorites WHERE user_id = ? AND course_id = ?').run(
    req.user.id,
    req.params.id
  );
  res.status(204).end();
});

module.exports = router;
