const db = require('../db');

function loadGame(req, res, next) {
  const game = db
    .prepare('SELECT * FROM games WHERE id = ?')
    .get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  req.game = game;
  next();
}

function requireParticipant(req, res, next) {
  loadGame(req, res, () => {
    const isParticipant = db
      .prepare('SELECT 1 FROM game_players WHERE game_id = ? AND user_id = ?')
      .get(req.game.id, req.user.id);
    if (!isParticipant) return res.status(403).json({ error: 'Not a participant in this game' });
    next();
  });
}

function requireCreator(req, res, next) {
  loadGame(req, res, () => {
    if (req.game.creator_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the game creator can do this' });
    }
    next();
  });
}

module.exports = { requireParticipant, requireCreator };
