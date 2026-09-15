const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendEmail, escapeHtml } = require('../email');

const APP_URL = process.env.APP_URL || 'https://membergolfonline.com/cornhole';

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

// Connects an existing user to anyone who tried to add them by email before
// they signed up, and clears those now-resolved invites. Called right after
// a new account is created.
function resolvePendingInvites(newUser) {
  const invites = db
    .prepare('SELECT invited_by_user_id FROM pending_invites WHERE email = ?')
    .all(newUser.email);
  for (const invite of invites) {
    addContactPair(newUser.id, invite.invited_by_user_id);
  }
  if (invites.length > 0) {
    db.prepare('DELETE FROM pending_invites WHERE email = ?').run(newUser.email);
  }
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

router.post('/contacts', requireAuth, async (req, res) => {
  const { email } = req.body || {};
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === req.user.email) {
    return res.status(400).json({ error: "That's your own account" });
  }

  const contact = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(normalizedEmail);
  if (contact) {
    addContactPair(req.user.id, contact.id);
    return res.status(201).json({ contact });
  }

  // No account with that email yet: record the invite so they're
  // auto-connected the moment they sign up, and let them know now.
  db.prepare(
    'INSERT OR IGNORE INTO pending_invites (email, invited_by_user_id) VALUES (?, ?)'
  ).run(normalizedEmail, req.user.id);

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: `${req.user.name} wants to play Cornhole Golf with you`,
      html: `<p>${escapeHtml(req.user.name)} added you as a friend on Cornhole Golf, an app for tracking golf scores and side-bets with your group.</p><p>Sign up at <a href="${APP_URL}">${APP_URL}</a> with this email address (${escapeHtml(normalizedEmail)}) and you'll automatically be connected as friends.</p>`,
      text: `${req.user.name} added you as a friend on Cornhole Golf. Sign up at ${APP_URL} with this email address (${normalizedEmail}) and you'll automatically be connected as friends.`,
    });
  } catch (e) {
    console.error('[contacts] failed to send invite email', e);
  }

  res.status(202).json({ invitedEmail: normalizedEmail });
});

module.exports = { router, addContactPair, resolvePendingInvites };
