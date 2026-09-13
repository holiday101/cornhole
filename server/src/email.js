// Minimal wrapper around Resend's HTTP API (https://resend.com) using
// Node's built-in fetch - no extra dependency needed.
//
// Without RESEND_API_KEY set, sendEmail logs a warning and no-ops instead
// of throwing, so the app keeps working end-to-end in dev/before Resend is
// configured - callers just won't have emails actually delivered.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Cornhole Golf <onboarding@resend.dev>';

async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set - skipping email to ${to}: "${subject}"`);
    return { sent: false, reason: 'no_api_key' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[email] Resend request failed (${res.status}): ${body}`);
    return { sent: false, reason: 'send_failed' };
  }

  return { sent: true };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { sendEmail, escapeHtml };
