PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
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

-- a personal bookmark on a shared course, not history -- cascades both ways
-- so it never blocks deleting a user or a course.
CREATE TABLE IF NOT EXISTS course_favorites (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  course_id INTEGER REFERENCES courses(id) ON DELETE RESTRICT,
  variant TEXT NOT NULL CHECK (variant IN ('front9', 'back9', 'full18')),
  holes_count INTEGER NOT NULL,
  date TEXT NOT NULL DEFAULT (datetime('now')),
  completed INTEGER NOT NULL DEFAULT 0,
  -- Left Left Right Right: $ value of one point, set at creation. NULL/absent = not played
  -- this round. Only meaningful for 4-player games (enforced in the API, not here).
  llrr_point_value REAL,
  -- JSON array of coin_key strings enabled for this game (see game_hole_coins below).
  -- NULL means "all coins" -- the implicit default before this column existed, and
  -- still the default for a game created without an explicit chip selection.
  enabled_coins TEXT,
  -- $ value of one bean (see game_holes' bean columns / game_hole_coins-style skins pot
  -- in src/logic/beans.js), set at creation. NULL/absent = beans aren't wagered this round.
  beans_value REAL
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

-- Coins: single-possession $1 chips. A coin is awarded to a player on a specific
-- hole; it stays with that player on every later hole until someone else is
-- awarded it (there is only ever one holder of a given coin_key at a time, derived
-- by walking hole_number order and taking the latest non-null award). user_id is
-- NULL to represent "not awarded on this hole" (no possession change that hole).
CREATE TABLE IF NOT EXISTS game_hole_coins (
  game_id INTEGER NOT NULL,
  hole_number INTEGER NOT NULL,
  coin_key TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
  PRIMARY KEY (game_id, hole_number, coin_key),
  FOREIGN KEY (game_id, hole_number) REFERENCES game_holes(game_id, hole_number) ON DELETE CASCADE
);
-- Left Left Right Right: which of the 4 tee positions (1=leftmost ... 4=rightmost)
-- each player held on this hole. Teams are always {1,2} vs {3,4} -- position 1&2 play
-- position 3&4 -- and since ball position can differ hole to hole, teams reshuffle
-- hole to hole. Only meaningful for 4-player games; rows simply won't exist otherwise.
CREATE TABLE IF NOT EXISTS game_hole_positions (
  game_id INTEGER NOT NULL,
  hole_number INTEGER NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  PRIMARY KEY (game_id, hole_number, position),
  UNIQUE (game_id, hole_number, user_id),
  FOREIGN KEY (game_id, hole_number) REFERENCES game_holes(game_id, hole_number) ON DELETE CASCADE
);
