-- Drip database schema. Applied automatically at server start (idempotent).
-- Timestamps are ISO-8601 UTC strings, e.g. 2026-11-06T18:30:00.000Z.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name          TEXT    NOT NULL,
  last_name           TEXT    NOT NULL,
  email               TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password            TEXT    NOT NULL,              -- plain text: mock auth only
  zip                 TEXT    NOT NULL CHECK (length(zip) = 5),
  birth_year          INTEGER NOT NULL,
  photo_path          TEXT,
  race_culture        TEXT,                          -- optional free text
  is_18_plus          INTEGER NOT NULL CHECK (is_18_plus = 1),
  identifies_as_woman INTEGER NOT NULL CHECK (identifies_as_woman = 1),
  career_stage        TEXT    NOT NULL CHECK (career_stage IN
                        ('Student', 'Early career', 'Mid-career', 'Senior', 'Executive', 'Founder')),
  resume_path         TEXT,
  resume_text         TEXT,
  summary             TEXT,
  hobbies             TEXT,
  best_advice         TEXT,
  woman_admired       TEXT,
  ask_me_about        TEXT,
  meeting_pref        TEXT    NOT NULL DEFAULT 'either' CHECK (meeting_pref IN ('in_person', 'zoom', 'either')),
  chats_per_month     INTEGER NOT NULL DEFAULT 2 CHECK (chats_per_month BETWEEN 1 AND 8),
  created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- What she can offer others.
CREATE TABLE IF NOT EXISTS experience_tags (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag     TEXT    NOT NULL,
  PRIMARY KEY (user_id, tag)
);

-- What she wants to learn or get help with. rank 1 = strongest preference.
CREATE TABLE IF NOT EXISTS interest_tags (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag     TEXT    NOT NULL,
  rank    INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, rank),
  UNIQUE (user_id, tag)
);

CREATE TABLE IF NOT EXISTS chat_requests (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message       TEXT    NOT NULL CHECK (length(message) BETWEEN 1 AND 100),
  availability  TEXT    NOT NULL DEFAULT '[]',        -- JSON array of {day, block}
  status        TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN
                  ('pending', 'accepted', 'not_now', 'declined', 'completed', 'did_not_happen')),
  rematch_after TEXT,                                 -- set when status = not_now
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (from_user_id <> to_user_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_requests_from ON chat_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_to   ON chat_requests(to_user_id);

CREATE TABLE IF NOT EXISTS meetings (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id        INTEGER NOT NULL UNIQUE REFERENCES chat_requests(id) ON DELETE CASCADE,
  datetime          TEXT    NOT NULL,
  location          TEXT    NOT NULL,                 -- address/place, or Zoom link
  confirmed_by_from INTEGER NOT NULL DEFAULT 0,
  confirmed_by_to   INTEGER NOT NULL DEFAULT 0,
  notes             TEXT
);

-- One ripple per completed meeting. user_a_id < user_b_id keeps pairs canonical.
CREATE TABLE IF NOT EXISTS ripples (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meeting_id INTEGER NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (user_a_id < user_b_id)
);
CREATE INDEX IF NOT EXISTS idx_ripples_a ON ripples(user_a_id);
CREATE INDEX IF NOT EXISTS idx_ripples_b ON ripples(user_b_id);

CREATE TABLE IF NOT EXISTS posts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ripple_partner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meeting_id        INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  photo_path        TEXT,
  caption           TEXT,
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (author_id, meeting_id)
);
CREATE INDEX IF NOT EXISTS idx_posts_author  ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_partner ON posts(ripple_partner_id);

CREATE TABLE IF NOT EXISTS cheers (
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  to_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,   -- NULL = from Drip
  type         TEXT    NOT NULL CHECK (type IN
                 ('chat_request', 'accepted', 'not_now', 'declined', 'cheers', 'post_meeting_prompt', 'system')),
  ref_id       INTEGER,                                          -- request / meeting / post id, by type
  body         TEXT    NOT NULL,
  read_at      TEXT,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user_id, created_at);

-- Hides feed cards the user has already acted on.
CREATE TABLE IF NOT EXISTS swipes (
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction      TEXT    NOT NULL CHECK (direction IN ('right', 'left')),
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, target_user_id)
);

-- ZIP -> coordinates, from GeoNames (CC BY 4.0). See db/ATTRIBUTION.md.
CREATE TABLE IF NOT EXISTS zip_locations (
  zip   TEXT PRIMARY KEY,
  lat   REAL NOT NULL,
  lng   REAL NOT NULL,
  city  TEXT NOT NULL,
  state TEXT NOT NULL
);
