const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireParticipant, requireCreator } = require('../middleware/gameAccess');
const { addContactPair } = require('./contacts');

const router = express.Router();

const VARIANT_RANGES = {
  front9: [1, 9],
  back9: [10, 18],
  full18: [1, 18],
};

const BEAN_COLUMNS = {
  longestDrive: 'longest_drive_user_id',
  closestRegulation: 'closest_regulation_user_id',
  onePutt: 'one_putt_user_id',
};

function holeNumbersForVariant(variant) {
  const [start, end] = VARIANT_RANGES[variant];
  const nums = [];
  for (let n = start; n <= end; n++) nums.push(n);
  return nums;
}

// SQLite's datetime('now') returns "YYYY-MM-DD HH:MM:SS" (space-separated, no zone),
// which isn't reliably parsed by `new Date()` in every browser (Safari in particular).
function sqliteDateToIso(sqliteDate) {
  return new Date(`${sqliteDate.replace(' ', 'T')}Z`).toISOString();
}

function loadFullGame(gameId) {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return null;

  const playerRows = db
    .prepare(
      `SELECT u.id, u.name, u.email FROM game_players gp
       JOIN users u ON u.id = gp.user_id
       WHERE gp.game_id = ? ORDER BY gp.sort_order`
    )
    .all(gameId);

  const holeRows = db
    .prepare('SELECT * FROM game_holes WHERE game_id = ? ORDER BY hole_number')
    .all(gameId);

  const scoreRows = db
    .prepare('SELECT hole_number, user_id, score FROM game_scores WHERE game_id = ?')
    .all(gameId);

  const scoresByHole = {};
  for (const row of scoreRows) {
    if (!scoresByHole[row.hole_number]) scoresByHole[row.hole_number] = {};
    scoresByHole[row.hole_number][row.user_id] = row.score;
  }

  let courseName = null;
  if (game.course_id) {
    const course = db.prepare('SELECT name FROM courses WHERE id = ?').get(game.course_id);
    courseName = course ? course.name : null;
  }

  const holes = holeRows.map((h) => ({
    holeNumber: h.hole_number,
    par: h.par,
    scores: scoresByHole[h.hole_number] || {},
    beans: {
      longestDrive: h.longest_drive_user_id,
      closestRegulation: h.closest_regulation_user_id,
      onePutt: h.one_putt_user_id,
    },
  }));

  return {
    id: game.id,
    date: sqliteDateToIso(game.date),
    completed: !!game.completed,
    creatorUserId: game.creator_user_id,
    courseId: game.course_id,
    courseName,
    variant: game.variant,
    holesCount: game.holes_count,
    playerIds: playerRows.map((p) => p.id),
    players: playerRows,
    holes,
  };
}

router.post('/games', requireAuth, (req, res) => {
  const { courseId, variant, playerUserIds } = req.body || {};

  if (!Object.prototype.hasOwnProperty.call(VARIANT_RANGES, variant)) {
    return res.status(400).json({ error: 'variant must be front9, back9, or full18' });
  }
  if (!Array.isArray(playerUserIds) || playerUserIds.some((id) => !Number.isInteger(id))) {
    return res.status(400).json({ error: 'playerUserIds must be an array of user ids' });
  }

  let course = null;
  if (courseId !== null && courseId !== undefined) {
    course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.holes_count === 9 && variant !== 'front9') {
      return res.status(400).json({ error: 'A 9-hole course only supports the front9 variant' });
    }
  } else if (variant === 'back9') {
    return res.status(400).json({ error: 'back9 requires an 18-hole course' });
  }

  const participantIds = Array.from(new Set([req.user.id, ...playerUserIds]));
  const placeholders = participantIds.map(() => '?').join(',');
  const foundUsers = db
    .prepare(`SELECT id FROM users WHERE id IN (${placeholders})`)
    .all(...participantIds);
  if (foundUsers.length !== participantIds.length) {
    return res.status(400).json({ error: 'One or more playerUserIds do not exist' });
  }

  const holeNumbers = holeNumbersForVariant(variant);
  const parByHole = {};
  if (course) {
    const holeRows = db
      .prepare('SELECT hole_number, par FROM course_holes WHERE course_id = ?')
      .all(course.id);
    for (const h of holeRows) parByHole[h.hole_number] = h.par;
  }

  const insertGame = db.prepare(
    'INSERT INTO games (creator_user_id, course_id, variant, holes_count) VALUES (?, ?, ?, ?)'
  );
  const insertPlayer = db.prepare(
    'INSERT INTO game_players (game_id, user_id, sort_order) VALUES (?, ?, ?)'
  );
  const insertHole = db.prepare(
    'INSERT INTO game_holes (game_id, hole_number, par) VALUES (?, ?, ?)'
  );
  const insertScore = db.prepare(
    'INSERT INTO game_scores (game_id, hole_number, user_id, score) VALUES (?, ?, ?, ?)'
  );

  const gameId = db.transaction(() => {
    const info = insertGame.run(req.user.id, course ? course.id : null, variant, holeNumbers.length);
    const newGameId = info.lastInsertRowid;

    participantIds.forEach((userId, index) => insertPlayer.run(newGameId, userId, index));

    for (const holeNumber of holeNumbers) {
      const par = parByHole[holeNumber] ?? null;
      insertHole.run(newGameId, holeNumber, par);
      for (const userId of participantIds) {
        insertScore.run(newGameId, holeNumber, userId, par ?? 3);
      }
    }

    for (const userId of participantIds) {
      if (userId !== req.user.id) addContactPair(req.user.id, userId);
    }

    return newGameId;
  })();

  res.status(201).json({ game: loadFullGame(gameId) });
});

router.get('/games', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT DISTINCT g.id, g.date FROM games g
       LEFT JOIN game_players gp ON gp.game_id = g.id
       WHERE g.creator_user_id = ? OR gp.user_id = ?
       ORDER BY g.date DESC`
    )
    .all(req.user.id, req.user.id);
  res.json({ games: rows.map((r) => loadFullGame(r.id)) });
});

router.get('/games/:id', requireAuth, requireParticipant, (req, res) => {
  res.json({ game: loadFullGame(req.game.id) });
});

router.patch('/games/:id/holes/:n/scores', requireAuth, requireParticipant, (req, res) => {
  const { userId, delta } = req.body || {};
  if (delta !== 1 && delta !== -1) {
    return res.status(400).json({ error: 'delta must be 1 or -1' });
  }
  const holeNumber = Number(req.params.n);

  const isParticipant = db
    .prepare('SELECT 1 FROM game_players WHERE game_id = ? AND user_id = ?')
    .get(req.game.id, userId);
  if (!isParticipant) return res.status(400).json({ error: 'userId is not a participant in this game' });

  const info = db
    .prepare(
      'UPDATE game_scores SET score = MIN(15, MAX(1, score + ?)) WHERE game_id = ? AND hole_number = ? AND user_id = ?'
    )
    .run(delta, req.game.id, holeNumber, userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Hole not found' });

  const row = db
    .prepare('SELECT score FROM game_scores WHERE game_id = ? AND hole_number = ? AND user_id = ?')
    .get(req.game.id, holeNumber, userId);
  res.json({ holeNumber, userId, score: row.score });
});

router.patch('/games/:id/holes/:n/beans', requireAuth, requireParticipant, (req, res) => {
  const { field, userId } = req.body || {};
  const column = BEAN_COLUMNS[field];
  if (!column) return res.status(400).json({ error: 'field must be longestDrive, closestRegulation, or onePutt' });
  const holeNumber = Number(req.params.n);

  if (userId !== null) {
    const isParticipant = db
      .prepare('SELECT 1 FROM game_players WHERE game_id = ? AND user_id = ?')
      .get(req.game.id, userId);
    if (!isParticipant) return res.status(400).json({ error: 'userId is not a participant in this game' });
  }

  const info = db
    .prepare(`UPDATE game_holes SET ${column} = ? WHERE game_id = ? AND hole_number = ?`)
    .run(userId, req.game.id, holeNumber);
  if (info.changes === 0) return res.status(404).json({ error: 'Hole not found' });

  res.json({ holeNumber, field, userId });
});

router.patch('/games/:id', requireAuth, requireParticipant, (req, res) => {
  const { completed } = req.body || {};
  if (typeof completed !== 'boolean') return res.status(400).json({ error: 'completed must be a boolean' });
  db.prepare('UPDATE games SET completed = ? WHERE id = ?').run(completed ? 1 : 0, req.game.id);
  res.json({ game: loadFullGame(req.game.id) });
});

router.delete('/games/:id', requireAuth, requireCreator, (req, res) => {
  db.prepare('DELETE FROM games WHERE id = ?').run(req.game.id);
  res.status(204).end();
});

module.exports = router;
