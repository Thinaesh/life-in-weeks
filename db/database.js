const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Setup Postgres connection pool.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : { rejectUnauthorized: false } // Neon requires SSL
});

function getDb() {
    return pool;
}

/**
 * Initializes the database schema.
 */
async function initDb() {
    try {
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        await pool.query(schema);
        console.log('📦 Database schema initialized');
    } catch (err) {
        console.error('Error initializing schema:', err);
    }
}

/**
 * Seed the default user (thinesh / abc123).
 * Called once on first boot.
 */
async function seedDefaultUser() {
    await initDb();
    
    const bcrypt = require('bcrypt');

    try {
        // Only seed if no users exist
        const { rows } = await pool.query('SELECT COUNT(*) as cnt FROM users');
        if (parseInt(rows[0].cnt) > 0) return;

        const hash = await bcrypt.hash('abc123', 12);
        await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2)', 
            ['thinesh', hash]
        );

        console.log('🔐 Default user "thinesh" created (password: abc123)');
    } catch (err) {
        console.error('Error seeding default user:', err);
    }
}

async function closeDb() {
    await pool.end();
}

module.exports = { getDb, closeDb, seedDefaultUser };
