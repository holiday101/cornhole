const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { addContactPair } = require('./contacts');

const router = express.Router();

router.use('/admin', requireAuth, requireAdmin);

// Overview list: role and rough activity counts, so an admin can tell a
// throwaway account from someone with real game history before touching it.
router.get('/admin/users', (req, res) => {
  const users = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
              (SELECT COUNT(*) FROM game_players gp WHERE gp.user_id = u.id) AS games_played,
              (SELECT COUNT(*) FROM courses c WHERE c.created_by_user_id = u.id) AS courses_created,
              (SELECT COUNT(*) FROM contacts ct WHERE ct.user_a_id = u.id OR ct.user_b_id = u.id) AS friend_count
       FROM users u
       ORDER BY u.name`
    )
    .all();
  res.json({ users });
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
  // than blocking it. Sessions and contacts reference users with ON DELETE
  // RESTRICT (unlike pending_invites, which cascades), so they have to go
  // before the user row itself. Game history is left under RESTRICT on
  // purpose -- caught below and reported rather than silently wiped.
  const deleteUser = db.transaction((id, reassignToId) => {
    db.prepare('UPDATE courses SET created_by_user_id = ? WHERE created_by_user_id = ?').run(
      reassignToId,
      id
    );
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM contacts WHERE user_a_id = ? OR user_b_id = ?').run(id, id);
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

router.get('/admin/users/:id/contacts', (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'Invalid user id' });

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const contacts = db
    .prepare(
      `SELECT u.id, u.name, u.email
       FROM contacts c
       JOIN users u ON u.id = CASE WHEN c.user_a_id = ? THEN c.user_b_id ELSE c.user_a_id END
       WHERE c.user_a_id = ? OR c.user_b_id = ?
       ORDER BY u.name`
    )
    .all(targetId, targetId, targetId);
  res.json({ contacts });
});

// Admin-driven connect: unlike the self-serve POST /contacts, this only
// links two accounts that already exist -- there's no one signed in as the
// target user to send a "you've been invited" email to, so a not-yet-signed-up
// email is just a 404 rather than a pending invite.
router.post('/admin/users/:id/contacts', (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'Invalid user id' });

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const { email } = req.body || {};
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const contact = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(normalizedEmail);
  if (!contact) return res.status(404).json({ error: 'No account with that email exists' });
  if (contact.id === targetId) return res.status(400).json({ error: "That's the same account" });

  addContactPair(targetId, contact.id);
  res.status(201).json({ contact });
});

router.delete('/admin/users/:id/contacts/:friendId', (req, res) => {
  const targetId = Number(req.params.id);
  const friendId = Number(req.params.friendId);
  if (!Number.isInteger(targetId) || !Number.isInteger(friendId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  db.prepare(
    `DELETE FROM contacts
     WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)`
  ).run(targetId, friendId, friendId, targetId);
  res.status(204).end();
});

module.exports = router;
