const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use('/admin', requireAuth, requireAdmin);

// Overview list: role, claim status, and rough activity counts, so an admin
// can tell a throwaway/placeholder account from someone with real game
// history before touching it.
router.get('/admin/users', (req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.created_at, (u.claimed_at IS NULL) AS is_placeholder,
              (SELECT COUNT(*) FROM game_players gp WHERE gp.user_id = u.id) AS games_played,
              (SELECT COUNT(*) FROM courses c WHERE c.created_by_user_id = u.id) AS courses_created,
              (SELECT COUNT(*) FROM favorites f WHERE f.user_id = u.id) AS favorite_count
       FROM users u
       ORDER BY u.name`
    )
    .all()
    .map((u) => ({ ...u, is_placeholder: !!u.is_placeholder }));
  res.json({ users });
});

// Lets an admin fix a typo'd name/email -- most useful for a placeholder
// someone added before the invited person has signed up and claimed it.
router.patch('/admin/users/:id', (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'Invalid user id' });

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const { name, email } = req.body || {};
  const updates = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    updates.name = name.trim();
  }

  if (email !== undefined) {
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const conflict = db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .get(normalizedEmail, targetId);
    if (conflict) return res.status(409).json({ error: 'Another account already uses that email' });
    updates.email = normalizedEmail;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const setClause = Object.keys(updates)
    .map((col) => `${col} = ?`)
    .join(', ');
  db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`).run(...Object.values(updates), targetId);

  const updated = db
    .prepare('SELECT id, name, email, role, created_at, (claimed_at IS NULL) AS is_placeholder FROM users WHERE id = ?')
    .get(targetId);
  res.json({ user: { ...updated, is_placeholder: !!updated.is_placeholder } });
});

router.patch('/admin/users/:id/role', (req, res) => {
  const targetId = Number(req.params.id);
  const { role } = req.body || {};
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'Invalid user id' });
  if (role !== 'user' && role !== 'admin') {
    return res.status(400).json({ error: "Role must be 'user' or 'admin'" });
  }

  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.role === 'admin' && role === 'user') {
    const adminCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin' });
    }
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
  const updated = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(targetId);
  res.json({ user: updated });
});

router.delete('/admin/users/:id', (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'Invalid user id' });
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account here' });
  }

  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (target.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get().n;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin' });
    }
  }

  // Courses are shared/global now (see routes/courses.js), so a course this
  // user created just moves to whichever admin is doing the deleting rather
  // than blocking it. Sessions reference users with ON DELETE RESTRICT, so
  // they have to go before the user row itself (favorites cascade on their
  // own). Game history is left under RESTRICT on purpose -- caught below and
  // reported rather than silently wiped.
  const deleteUser = db.transaction((id, reassignToId) => {
    db.prepare('UPDATE courses SET created_by_user_id = ? WHERE created_by_user_id = ?').run(
      reassignToId,
      id
    );
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  });

  try {
    deleteUser(targetId, req.user.id);
  } catch (e) {
    if (/FOREIGN KEY constraint failed/.test(e.message)) {
      return res.status(409).json({
        error: 'This user has game history and cannot be deleted. Change their role instead.',
      });
    }
    throw e;
  }

  res.status(204).end();
});

// Every game in the system, regardless of who created it or is playing in it --
// HistoryScreen only shows a user's own games, so an admin needs this to find and
// delete a game they aren't a participant in.
router.get('/admin/games', (req, res) => {
  const games = db
    .prepare(
      `SELECT g.id, g.date, g.completed, g.variant, g.holes_count, c.name AS course_name,
              (SELECT GROUP_CONCAT(name, ', ') FROM (
                 SELECT u.name FROM game_players gp
                 JOIN users u ON u.id = gp.user_id
                 WHERE gp.game_id = g.id
                 ORDER BY gp.sort_order
               )) AS player_names
       FROM games g
       LEFT JOIN courses c ON c.id = g.course_id
       ORDER BY g.date DESC`
    )
    .all()
    .map((g) => ({ ...g, completed: !!g.completed }));
  res.json({ games });
});

module.exports = router;
