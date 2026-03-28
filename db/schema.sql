-- Users (authentication)
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password    TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
);

-- User profile
CREATE TABLE IF NOT EXISTS profile (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER UNIQUE REFERENCES users(id),
    name        TEXT,
    birth_date  TEXT NOT NULL,
    lifespan    INTEGER DEFAULT 80,
    created_at  TEXT DEFAULT (datetime('now'))
);

-- Life chapters
CREATE TABLE IF NOT EXISTS chapters (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER DEFAULT 1 REFERENCES profile(id),
    name        TEXT NOT NULL,
    color       TEXT NOT NULL,
    start_date  TEXT NOT NULL,
    end_date    TEXT,
    sort_order  INTEGER DEFAULT 0
);

-- Weekly journal entries
CREATE TABLE IF NOT EXISTS journal (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER DEFAULT 1 REFERENCES profile(id),
    year        INTEGER NOT NULL,
    week        INTEGER NOT NULL,
    note        TEXT,
    rating      INTEGER CHECK(rating BETWEEN 1 AND 5),
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now')),
    UNIQUE(profile_id, year, week)
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER DEFAULT 1 REFERENCES profile(id),
    title       TEXT NOT NULL,
    date        TEXT NOT NULL,
    icon        TEXT DEFAULT '♦',
    description TEXT
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER DEFAULT 1 REFERENCES profile(id),
    title       TEXT NOT NULL,
    target_date TEXT NOT NULL,
    completed   INTEGER DEFAULT 0,
    description TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
);

-- Week snapshots (photos)
CREATE TABLE IF NOT EXISTS snapshots (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER DEFAULT 1 REFERENCES profile(id),
    year        INTEGER NOT NULL,
    week        INTEGER NOT NULL,
    filename    TEXT NOT NULL,
    original_name TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    UNIQUE(profile_id, year, week)
);

-- App settings
CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT
);

-- Default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'coral');
INSERT OR IGNORE INTO settings (key, value) VALUES ('mode', 'dark');
INSERT OR IGNORE INTO settings (key, value) VALUES ('view', 'weeks');
INSERT OR IGNORE INTO settings (key, value) VALUES ('reminder_enabled', 'true');
