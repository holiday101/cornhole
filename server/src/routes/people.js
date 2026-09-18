const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendEmail, escapeHtml } = require('../email');

const APP_URL = process.env.APP_URL || 'https://membergolfonline.com/cornhole';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = express.Router();

function addFavorite(userId, favoriteId) {
  if (userId === favoriteId) return;
  db.prepare(
    'INSERT OR IGNORE INTO favorites (user_id, favorite_id) VALUES (?, ?)'
  ).run(userId, favoriteId);
}

// Called after a shared game is created -- playing together makes each
// participant show up as a favorite for the other, same as auto-friending
// used to.
function addFavoritePair(userAId, userBId) {
  addFavorite(userAId, userBId);
  addFavorite(userBId, userAId);
}

// GET /people: the whole directory (every user, claimed or placeholder),
// with whether the caller has favorited each one. Name only -- email stays
// private to the account owner and admins.
router.get('/people', requireAuth, (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const rows = db
    .prepare(
      `SELECT u.id, u.name, (u.claimed_at IS NULL) AS is_placeholder,
              (f.user_id IS NOT NULL) AS is_favorite
       FROM users u
       LEFT JOIN favorites f ON f.favorite_id = u.id AND f.user_id = ?
       WHERE u.id != ? AND (? = '' OR u.name LIKE '%' || ? || '%' COLLATE NOCASE)
       ORDER BY is_favorite DESC, u.name`
    )
    .all(req.user.id, req.user.id, q, q);

  const people = rows.map((r) => ({
    id: r.id,
    name: r.name,
    isPlaceholder: !!r.is_placeholder,
    isFavorite: !!r.is_favorite,
  }));
  res.json({ people });
});

// POST /people {name, email}: adds someone to the directory (or, if that
// email already belongs to someone, just favorites the existing person --
// silently, so a duplicate-add attempt never reveals whose account it is).
router.post('/people', requireAuth, async (req, res) => {
  const { name, email } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === req.user.email) {
    return res.status(400).json({ error: "That's your own account" });
  }

  const existing = db.prepare('SELECT id, name FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    addFavorite(req.user.id, existing.id);
    return res.status(200).json({
      person: { id: existing.id, name: existing.name },
      created: false,
    });
  }

  const trimmedName = name.trim();
  // password_hash is spelled out (rather than relying on schema.sql's
  // DEFAULT '') because a pre-existing `users` table on a real database
  // keeps its original NOT NULL-with-no-default column -- CREATE TABLE IF
  // NOT EXISTS can't retrofit a default onto it.
  const info = db
    .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, '')")
    .run(normalizedEmail, trimmedName);
  addFavorite(req.user.id, info.lastInsertRowid);

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: `${req.user.name} added you on Cornhole Golf`,
      html: `<p>${escapeHtml(req.user.name)} added you on Cornhole Golf, an app for tracking golf scores and side-bets with your group.</p><p>Sign up at <a href="${APP_URL}">${APP_URL}</a> with this email address (${escapeHtml(normalizedEmail)}) to claim your profile and its game history.</p>`,
      text: `${req.user.name} added you on Cornhole Golf. Sign up at ${APP_URL} with this email address (${normalizedEmail}) to claim your profile and its game history.`,
    });
  } catch (e) {
    console.error('[people] failed to send invite email', e);
  }

  res.status(201).json({
    person: { id: info.lastInsertRowid, name: trimmedName },
    created: true,
  });
});

router.post('/people/:id/favorite', requireAuth, (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'Invalid person id' });
  if (targetId === req.user.id) return res.status(400).json({ error: "That's your own account" });

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: 'Person not found' });

  addFavorite(req.user.id, targetId);
  res.status(204).end();
});

router.delete('/people/:id/favorite', requireAuth, (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId)) return res.status(400).json({ error: 'Invalid person id' });

  db.prepare('DELETE FROM favorites WHERE user_id = ? AND favorite_id = ?').run(
    req.user.id,
    targetId
  );
  res.status(204).end();
});

module.exports = { router, addFavoritePair };
