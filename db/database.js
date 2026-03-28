const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'life-in-weeks.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        // Run schema
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        db.exec(schema);
        // Migrate: ensure users table and profile.user_id column exist
        migrate(db);
    }
    return db;
}

function migrate(db) {
    // Check if user_id column exists on profile
    const cols = db.prepare("PRAGMA table_info(profile)").all();
    const hasUserId = cols.some(c => c.name === 'user_id');
    if (!hasUserId) {
        db.exec('ALTER TABLE profile ADD COLUMN user_id INTEGER REFERENCES users(id)');
    }
}

/**
 * Seed the default user (thinesh / abc123) and assign existing profile data.
 * Called once on first boot after auth is introduced.
 */
async function seedDefaultUser() {
    const bcrypt = require('bcrypt');
    const d = getDb();

    // Only seed if no users exist
    const userCount = d.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
    if (userCount > 0) return;

    const hash = await bcrypt.hash('abc123', 12);
    const info = d.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('thinesh', hash);
    const userId = info.lastInsertRowid;

    // Assign existing profile (id=1) to this user
    const existingProfile = d.prepare('SELECT id FROM profile WHERE id = 1').get();
    if (existingProfile) {
        d.prepare('UPDATE profile SET user_id = ? WHERE id = 1').run(userId);
        // Update all related tables to use this profile's id
        // (They already reference profile_id = 1, which now belongs to user_id)
    }

    console.log('🔐 Default user "thinesh" created (password: abc123)');
}

function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = { getDb, closeDb, seedDefaultUser };
