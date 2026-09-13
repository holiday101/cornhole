const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function pair(a, b) {
  return a < b ? [a, b] : [b, a];
}

function addContactPair(userAId, userBId) {
  if (userAId === userBId) return;
  const [a, b] = pair(userAId, userBId);
  db.prepare(
    'INSERT OR IGNORE INTO contacts (user_a_id, user_b_id) VALUES (?, ?)'
  ).run(a, b);
}

router.get('/contacts', requireAuth, (req, res) => {
  const contacts = db
    .prepare(
      `SELECT u.id, u.name, u.email
       FROM contacts c
       JOIN users u ON u.id = CASE WHEN c.user_a_id = ? THEN c.user_b_id ELSE c.user_a_id END
       WHERE c.user_a_id = ? OR c.user_b_id = ?
       ORDER BY u.name`
    )
    .all(req.user.id, req.user.id, req.user.id);
  res.json({ contacts });
});

router.post('/contacts', requireAuth, (req, res) => {
  const { email } = req.body || {};
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const contact = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(normalizedEmail);
  if (!contact) return res.status(404).json({ error: 'No account found with that email' });
  if (contact.id === req.user.id) {
    return res.status(400).json({ error: "That's your own account" });
  }

  addContactPair(req.user.id, contact.id);
  res.status(201).json({ contact });
});

module.exports = { router, addContactPair };
