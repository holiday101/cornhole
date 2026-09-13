PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- someone tried to add a friend by email before that person had an
-- account; resolved (and deleted) the moment that email signs up.
CREATE TABLE IF NOT EXISTS pending_invites (
  email TEXT NOT NULL,
  invited_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (email, invited_by_user_id)
);
CREATE INDEX IF NOT EXISTS idx_pending_invites_email ON pending_invites(email);

-- symmetric relationship: always stored with user_a_id < user_b_id
CREATE TABLE IF NOT EXISTS contacts (
  user_a_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  user_b_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)
);

-- shared/global: a friend group plays the same physical course
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  holes_count INTEGER NOT NULL CHECK (holes_count IN (9, 18)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS course_holes (
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  par INTEGER NOT NULL CHECK (par BETWEEN 1 AND 15),
  PRIMARY KEY (course_id, hole_number)
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  course_id INTEGER REFERENCES courses(id) ON DELETE RESTRICT,
  variant TEXT NOT NULL CHECK (variant IN ('front9', 'back9', 'full18')),
  holes_count INTEGER NOT NULL,
  date TEXT NOT NULL DEFAULT (datetime('now')),
  completed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS game_players (
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (game_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players(user_id);

-- hole_number is course-relative: front9 = 1..9, back9 = 10..18,
-- full18 = 1..18, no-course quick game = 1..holes_count.
CREATE TABLE IF NOT EXISTS game_holes (
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  par INTEGER,
  longest_drive_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  closest_regulation_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  one_putt_user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  PRIMARY KEY (game_id, hole_number)
);

CREATE TABLE IF NOT EXISTS game_scores (
  game_id INTEGER NOT NULL,
  hole_number INTEGER NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 15),
  PRIMARY KEY (game_id, hole_number, user_id),
  FOREIGN KEY (game_id, hole_number) REFERENCES game_holes(game_id, hole_number) ON DELETE CASCADE
);
