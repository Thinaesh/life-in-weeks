const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const { getDb, closeDb, seedDefaultUser } = require('./db/database');
const { signToken, setTokenCookie, clearTokenCookie, requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR));

// Auth middleware — protects all /api/* except /api/auth/*
app.use(requireAuth);

// Multer config for photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `snap_${Date.now()}${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Helper: get the profile_id for the current user (Postgres async query)
async function getProfileId(userId) {
    const db = getDb();
    const { rows } = await db.query('SELECT id FROM profile WHERE user_id = $1', [userId]);
    return rows.length > 0 ? rows[0].id : null;
}

// ============================================================
// AUTH ROUTES
// ============================================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const db = getDb();
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if username taken
        const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Hash password with bcrypt (cost factor 12)
        const hash = await bcrypt.hash(password, 12);
        
        // Postgres inserts use RETURNING id rather than info.lastInsertRowid
        const insertRes = await db.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, hash]);
        const newUserId = insertRes.rows[0].id;

        const token = signToken(newUserId, username);
        setTokenCookie(res, token);

        res.status(201).json({ id: newUserId, username });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const db = getDb();
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const user = rows[0];

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = signToken(user.id, user.username);
        setTokenCookie(res, token);

        res.json({ id: user.id, username: user.username });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    clearTokenCookie(res);
    res.json({ success: true });
});

app.get('/api/auth/me', async (req, res) => {
    try {
        const db = getDb();
        const { rows } = await db.query('SELECT id, username, created_at FROM users WHERE id = $1', [req.userId]);
        if (rows.length === 0) return res.status(401).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/auth/password', async (req, res) => {
    try {
        const db = getDb();
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.userId]);
        if (rows.length === 0) return res.status(401).json({ error: 'User not found' });
        const user = rows[0];

        const valid = await bcrypt.compare(current_password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hash = await bcrypt.hash(new_password, 12);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.userId]);

        // Re-issue token
        const token = signToken(user.id, user.username);
        setTokenCookie(res, token);

        res.json({ success: true });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// PROFILE
// ============================================================
app.get('/api/profile', async (req, res) => {
    const db = getDb();
    const { rows } = await db.query('SELECT * FROM profile WHERE user_id = $1', [req.userId]);
    res.json(rows.length > 0 ? rows[0] : null);
});

app.post('/api/profile', async (req, res) => {
    const db = getDb();
    const { name, birth_date, lifespan } = req.body;
    const { rows } = await db.query('SELECT id FROM profile WHERE user_id = $1', [req.userId]);
    if (rows.length > 0) {
        await db.query('UPDATE profile SET name = $1, birth_date = $2, lifespan = $3 WHERE user_id = $4',
            [name, birth_date, lifespan || 80, req.userId]);
    } else {
        await db.query('INSERT INTO profile (user_id, name, birth_date, lifespan) VALUES ($1, $2, $3, $4)',
            [req.userId, name, birth_date, lifespan || 80]);
    }
    const updated = await db.query('SELECT * FROM profile WHERE user_id = $1', [req.userId]);
    res.json(updated.rows[0]);
});

// ============================================================
// CHAPTERS
// ============================================================
app.get('/api/chapters', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    if (!profileId) return res.json([]);
    const { rows } = await db.query('SELECT * FROM chapters WHERE profile_id = $1 ORDER BY sort_order, start_date', [profileId]);
    res.json(rows);
});

app.post('/api/chapters', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    if (!profileId) return res.status(400).json({ error: 'Profile not found' });
    const { name, color, start_date, end_date, sort_order } = req.body;
    
    const result = await db.query(
        'INSERT INTO chapters (profile_id, name, color, start_date, end_date, sort_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [profileId, name, color, start_date, end_date || null, sort_order || 0]
    );
    res.json(result.rows[0]);
});

app.put('/api/chapters/:id', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    const { name, color, start_date, end_date, sort_order } = req.body;
    
    const result = await db.query(
        'UPDATE chapters SET name = $1, color = $2, start_date = $3, end_date = $4, sort_order = $5 WHERE id = $6 AND profile_id = $7 RETURNING *',
        [name, color, start_date, end_date || null, sort_order || 0, req.params.id, profileId]
    );
    res.json(result.rows[0]);
});

app.delete('/api/chapters/:id', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    await db.query('DELETE FROM chapters WHERE id = $1 AND profile_id = $2', [req.params.id, profileId]);
    res.json({ success: true });
});

// ============================================================
// JOURNAL
// ============================================================
app.get('/api/journal', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    if (!profileId) return res.json([]);
    const { rows } = await db.query('SELECT * FROM journal WHERE profile_id = $1', [profileId]);
    res.json(rows);
});

app.get('/api/journal/:year/:week', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    if (!profileId) return res.json(null);
    const { rows } = await db.query('SELECT * FROM journal WHERE profile_id = $1 AND year = $2 AND week = $3',
        [profileId, req.params.year, req.params.week]);
    res.json(rows.length > 0 ? rows[0] : null);
});

app.post('/api/journal', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    if (!profileId) return res.status(400).json({ error: 'Profile not found' });
    const { year, week, note, rating } = req.body;
    
    await db.query(`
        INSERT INTO journal (profile_id, year, week, note, rating)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT(profile_id, year, week)
        DO UPDATE SET note = EXCLUDED.note, rating = EXCLUDED.rating, updated_at = CURRENT_TIMESTAMP
    `, [profileId, year, week, note || null, rating || null]);
    
    const { rows } = await db.query('SELECT * FROM journal WHERE profile_id = $1 AND year = $2 AND week = $3',
        [profileId, year, week]);
    res.json(rows[0]);
});

// ============================================================
// MILESTONES
// ============================================================
app.get('/api/milestones', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    if (!profileId) return res.json([]);
    const { rows } = await db.query('SELECT * FROM milestones WHERE profile_id = $1 ORDER BY date', [profileId]);
    res.json(rows);
});

app.post('/api/milestones', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    if (!profileId) return res.status(400).json({ error: 'Profile not found' });
    const { title, date, icon, description } = req.body;
    
    const result = await db.query(
        'INSERT INTO milestones (profile_id, title, date, icon, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [profileId, title, date, icon || '♦', description || null]
    );
    res.json(result.rows[0]);
});

app.put('/api/milestones/:id', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    const { title, date, icon, description } = req.body;
    
    const result = await db.query(
        'UPDATE milestones SET title = $1, date = $2, icon = $3, description = $4 WHERE id = $5 AND profile_id = $6 RETURNING *',
        [title, date, icon || '♦', description || null, req.params.id, profileId]
    );
    res.json(result.rows[0]);
});

app.delete('/api/milestones/:id', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    await db.query('DELETE FROM milestones WHERE id = $1 AND profile_id = $2', [req.params.id, profileId]);
    res.json({ success: true });
});

// ============================================================
// GOALS
// ============================================================
app.get('/api/goals', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    if (!profileId) return res.json([]);
    const { rows } = await db.query('SELECT * FROM goals WHERE profile_id = $1 ORDER BY target_date', [profileId]);
    res.json(rows);
});

app.post('/api/goals', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    if (!profileId) return res.status(400).json({ error: 'Profile not found' });
    const { title, target_date, description } = req.body;
    
    const result = await db.query(
        'INSERT INTO goals (profile_id, title, target_date, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [profileId, title, target_date, description || null]
    );
    res.json(result.rows[0]);
});

app.put('/api/goals/:id', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    const { title, target_date, description, completed } = req.body;
    
    const result = await db.query(
        'UPDATE goals SET title = $1, target_date = $2, description = $3, completed = $4 WHERE id = $5 AND profile_id = $6 RETURNING *',
        [title, target_date, description || null, completed ? 1 : 0, req.params.id, profileId]
    );
    res.json(result.rows[0]);
});

app.delete('/api/goals/:id', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    await db.query('DELETE FROM goals WHERE id = $1 AND profile_id = $2', [req.params.id, profileId]);
    res.json({ success: true });
});

// ============================================================
// SNAPSHOTS (photos)
// ============================================================
app.get('/api/snapshots', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    if (!profileId) return res.json([]);
    const { rows } = await db.query('SELECT * FROM snapshots WHERE profile_id = $1', [profileId]);
    res.json(rows);
});

app.post('/api/snapshots', upload.single('photo'), async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    if (!profileId) return res.status(400).json({ error: 'Profile not found' });
    const { year, week } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Delete old snapshot if exists
    const oldRes = await db.query('SELECT * FROM snapshots WHERE profile_id = $1 AND year = $2 AND week = $3', [profileId, year, week]);
    if (oldRes.rows.length > 0) {
        const old = oldRes.rows[0];
        const oldPath = path.join(UPLOADS_DIR, old.filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        await db.query('DELETE FROM snapshots WHERE id = $1', [old.id]);
    }

    await db.query(
        'INSERT INTO snapshots (profile_id, year, week, filename, original_name) VALUES ($1, $2, $3, $4, $5)',
        [profileId, year, week, req.file.filename, req.file.originalname]
    );
    const finalRes = await db.query('SELECT * FROM snapshots WHERE profile_id = $1 AND year = $2 AND week = $3', [profileId, year, week]);
    res.json(finalRes.rows[0]);
});

app.delete('/api/snapshots/:id', async (req, res) => {
    const db = getDb();
    const profileId = await getProfileId(req.userId);
    const snapRes = await db.query('SELECT * FROM snapshots WHERE id = $1 AND profile_id = $2', [req.params.id, profileId]);
    if (snapRes.rows.length > 0) {
        const snap = snapRes.rows[0];
        const filePath = path.join(UPLOADS_DIR, snap.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query('DELETE FROM snapshots WHERE id = $1 AND profile_id = $2', [req.params.id, profileId]);
    res.json({ success: true });
});

// ============================================================
// SETTINGS
// ============================================================
app.get('/api/settings', async (req, res) => {
    const db = getDb();
    const { rows } = await db.query('SELECT * FROM settings');
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
});

app.put('/api/settings', async (req, res) => {
    const db = getDb();
    const updates = req.body;
    try {
        await db.query('BEGIN');
        for (const [key, value] of Object.entries(updates)) {
            await db.query(
                'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
                [key, String(value)]
            );
        }
        await db.query('COMMIT');
    } catch (e) {
        await db.query('ROLLBACK');
        return res.status(500).json({ error: 'Failed to update settings' });
    }
    
    // Return updated settings
    const { rows } = await db.query('SELECT * FROM settings');
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
});

// ============================================================
// AGGREGATE DATA (for grid rendering)
// ============================================================
app.get('/api/grid-data', async (req, res) => {
    try {
        const db = getDb();
        const profileId = await getProfileId(req.userId);
        
        const profileRes = profileId ? await db.query('SELECT * FROM profile WHERE id = $1', [profileId]) : null;
        const profile = profileRes && profileRes.rows.length > 0 ? profileRes.rows[0] : null;

        if (!profile) return res.json({ profile: null });

        // Run all queries concurrently for performance
        const [chaptersRes, journalRes, milestonesRes, goalsRes, snapshotsRes, settingsRes] = await Promise.all([
            db.query('SELECT * FROM chapters WHERE profile_id = $1 ORDER BY sort_order, start_date', [profileId]),
            db.query('SELECT year, week, note, rating FROM journal WHERE profile_id = $1', [profileId]),
            db.query('SELECT * FROM milestones WHERE profile_id = $1 ORDER BY date', [profileId]),
            db.query('SELECT * FROM goals WHERE profile_id = $1 ORDER BY target_date', [profileId]),
            db.query('SELECT year, week, filename FROM snapshots WHERE profile_id = $1', [profileId]),
            db.query('SELECT * FROM settings')
        ]);

        const settings = {};
        settingsRes.rows.forEach(r => settings[r.key] = r.value);

        res.json({ 
            profile, 
            chapters: chaptersRes.rows, 
            journal: journalRes.rows, 
            milestones: milestonesRes.rows, 
            goals: goalsRes.rows, 
            snapshots: snapshotsRes.rows, 
            settings 
        });
    } catch (err) {
        console.error('Grid data load error:', err);
        res.status(500).json({ error: 'Failed to load grid data' });
    }
});

// SPA fallback
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Boot
async function start() {
    // Seed default user on first run
    await seedDefaultUser();

    app.listen(PORT, () => {
        console.log(`✨ Life in Weeks running at http://localhost:${PORT}`);
    });
}

start();

// Graceful shutdown
process.on('SIGINT', () => { closeDb(); process.exit(); });
process.on('SIGTERM', () => { closeDb(); process.exit(); });
