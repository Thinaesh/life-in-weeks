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

// Helper: get the profile_id for the current user
function getProfileId(userId) {
    const db = getDb();
    const row = db.prepare('SELECT id FROM profile WHERE user_id = ?').get(userId);
    return row ? row.id : null;
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
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Hash password with bcrypt (cost factor 12)
        const hash = await bcrypt.hash(password, 12);
        const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash);

        const token = signToken(info.lastInsertRowid, username);
        setTokenCookie(res, token);

        res.status(201).json({ id: Number(info.lastInsertRowid), username });
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

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

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

app.get('/api/auth/me', (req, res) => {
    const db = getDb();
    const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json(user);
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

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
        if (!user) return res.status(401).json({ error: 'User not found' });

        const valid = await bcrypt.compare(current_password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hash = await bcrypt.hash(new_password, 12);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.userId);

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
app.get('/api/profile', (req, res) => {
    const db = getDb();
    const row = db.prepare('SELECT * FROM profile WHERE user_id = ?').get(req.userId);
    res.json(row || null);
});

app.post('/api/profile', (req, res) => {
    const db = getDb();
    const { name, birth_date, lifespan } = req.body;
    const existing = db.prepare('SELECT id FROM profile WHERE user_id = ?').get(req.userId);
    if (existing) {
        db.prepare('UPDATE profile SET name = ?, birth_date = ?, lifespan = ? WHERE user_id = ?')
            .run(name, birth_date, lifespan || 80, req.userId);
    } else {
        db.prepare('INSERT INTO profile (user_id, name, birth_date, lifespan) VALUES (?, ?, ?, ?)')
            .run(req.userId, name, birth_date, lifespan || 80);
    }
    res.json(db.prepare('SELECT * FROM profile WHERE user_id = ?').get(req.userId));
});

// ============================================================
// CHAPTERS
// ============================================================
app.get('/api/chapters', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    if (!profileId) return res.json([]);
    const rows = db.prepare('SELECT * FROM chapters WHERE profile_id = ? ORDER BY sort_order, start_date').all(profileId);
    res.json(rows);
});

app.post('/api/chapters', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    if (!profileId) return res.status(400).json({ error: 'Profile not found' });
    const { name, color, start_date, end_date, sort_order } = req.body;
    const info = db.prepare(
        'INSERT INTO chapters (profile_id, name, color, start_date, end_date, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(profileId, name, color, start_date, end_date || null, sort_order || 0);
    res.json(db.prepare('SELECT * FROM chapters WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/chapters/:id', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    const { name, color, start_date, end_date, sort_order } = req.body;
    db.prepare(
        'UPDATE chapters SET name = ?, color = ?, start_date = ?, end_date = ?, sort_order = ? WHERE id = ? AND profile_id = ?'
    ).run(name, color, start_date, end_date || null, sort_order || 0, req.params.id, profileId);
    res.json(db.prepare('SELECT * FROM chapters WHERE id = ? AND profile_id = ?').get(req.params.id, profileId));
});

app.delete('/api/chapters/:id', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    db.prepare('DELETE FROM chapters WHERE id = ? AND profile_id = ?').run(req.params.id, profileId);
    res.json({ success: true });
});

// ============================================================
// JOURNAL
// ============================================================
app.get('/api/journal', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    if (!profileId) return res.json([]);
    const rows = db.prepare('SELECT * FROM journal WHERE profile_id = ?').all(profileId);
    res.json(rows);
});

app.get('/api/journal/:year/:week', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    if (!profileId) return res.json(null);
    const row = db.prepare('SELECT * FROM journal WHERE profile_id = ? AND year = ? AND week = ?')
        .get(profileId, req.params.year, req.params.week);
    res.json(row || null);
});

app.post('/api/journal', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    if (!profileId) return res.status(400).json({ error: 'Profile not found' });
    const { year, week, note, rating } = req.body;
    db.prepare(`
        INSERT INTO journal (profile_id, year, week, note, rating)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(profile_id, year, week)
        DO UPDATE SET note = excluded.note, rating = excluded.rating, updated_at = datetime('now')
    `).run(profileId, year, week, note || null, rating || null);
    const row = db.prepare('SELECT * FROM journal WHERE profile_id = ? AND year = ? AND week = ?')
        .get(profileId, year, week);
    res.json(row);
});

// ============================================================
// MILESTONES
// ============================================================
app.get('/api/milestones', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    if (!profileId) return res.json([]);
    res.json(db.prepare('SELECT * FROM milestones WHERE profile_id = ? ORDER BY date').all(profileId));
});

app.post('/api/milestones', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    if (!profileId) return res.status(400).json({ error: 'Profile not found' });
    const { title, date, icon, description } = req.body;
    const info = db.prepare(
        'INSERT INTO milestones (profile_id, title, date, icon, description) VALUES (?, ?, ?, ?, ?)'
    ).run(profileId, title, date, icon || '♦', description || null);
    res.json(db.prepare('SELECT * FROM milestones WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/milestones/:id', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    const { title, date, icon, description } = req.body;
    db.prepare('UPDATE milestones SET title = ?, date = ?, icon = ?, description = ? WHERE id = ? AND profile_id = ?')
        .run(title, date, icon || '♦', description || null, req.params.id, profileId);
    res.json(db.prepare('SELECT * FROM milestones WHERE id = ? AND profile_id = ?').get(req.params.id, profileId));
});

app.delete('/api/milestones/:id', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    db.prepare('DELETE FROM milestones WHERE id = ? AND profile_id = ?').run(req.params.id, profileId);
    res.json({ success: true });
});

// ============================================================
// GOALS
// ============================================================
app.get('/api/goals', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    if (!profileId) return res.json([]);
    res.json(db.prepare('SELECT * FROM goals WHERE profile_id = ? ORDER BY target_date').all(profileId));
});

app.post('/api/goals', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    if (!profileId) return res.status(400).json({ error: 'Profile not found' });
    const { title, target_date, description } = req.body;
    const info = db.prepare(
        'INSERT INTO goals (profile_id, title, target_date, description) VALUES (?, ?, ?, ?)'
    ).run(profileId, title, target_date, description || null);
    res.json(db.prepare('SELECT * FROM goals WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/goals/:id', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    const { title, target_date, description, completed } = req.body;
    db.prepare('UPDATE goals SET title = ?, target_date = ?, description = ?, completed = ? WHERE id = ? AND profile_id = ?')
        .run(title, target_date, description || null, completed ? 1 : 0, req.params.id, profileId);
    res.json(db.prepare('SELECT * FROM goals WHERE id = ? AND profile_id = ?').get(req.params.id, profileId));
});

app.delete('/api/goals/:id', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    db.prepare('DELETE FROM goals WHERE id = ? AND profile_id = ?').run(req.params.id, profileId);
    res.json({ success: true });
});

// ============================================================
// SNAPSHOTS (photos)
// ============================================================
app.get('/api/snapshots', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    if (!profileId) return res.json([]);
    res.json(db.prepare('SELECT * FROM snapshots WHERE profile_id = ?').all(profileId));
});

app.post('/api/snapshots', upload.single('photo'), (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    if (!profileId) return res.status(400).json({ error: 'Profile not found' });
    const { year, week } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Delete old snapshot if exists
    const old = db.prepare('SELECT * FROM snapshots WHERE profile_id = ? AND year = ? AND week = ?').get(profileId, year, week);
    if (old) {
        const oldPath = path.join(UPLOADS_DIR, old.filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        db.prepare('DELETE FROM snapshots WHERE id = ?').run(old.id);
    }

    db.prepare('INSERT INTO snapshots (profile_id, year, week, filename, original_name) VALUES (?, ?, ?, ?, ?)')
        .run(profileId, year, week, req.file.filename, req.file.originalname);
    const row = db.prepare('SELECT * FROM snapshots WHERE profile_id = ? AND year = ? AND week = ?').get(profileId, year, week);
    res.json(row);
});

app.delete('/api/snapshots/:id', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    const snap = db.prepare('SELECT * FROM snapshots WHERE id = ? AND profile_id = ?').get(req.params.id, profileId);
    if (snap) {
        const filePath = path.join(UPLOADS_DIR, snap.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    db.prepare('DELETE FROM snapshots WHERE id = ? AND profile_id = ?').run(req.params.id, profileId);
    res.json({ success: true });
});

// ============================================================
// SETTINGS
// ============================================================
app.get('/api/settings', (req, res) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
});

app.put('/api/settings', (req, res) => {
    const db = getDb();
    const updates = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const transaction = db.transaction((entries) => {
        for (const [key, value] of Object.entries(entries)) {
            stmt.run(key, String(value));
        }
    });
    transaction(updates);
    // Return updated settings
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
});

// ============================================================
// AGGREGATE DATA (for grid rendering)
// ============================================================
app.get('/api/grid-data', (req, res) => {
    const db = getDb();
    const profileId = getProfileId(req.userId);
    const profile = profileId ? db.prepare('SELECT * FROM profile WHERE id = ?').get(profileId) : null;
    if (!profile) return res.json({ profile: null });

    const chapters = db.prepare('SELECT * FROM chapters WHERE profile_id = ? ORDER BY sort_order, start_date').all(profileId);
    const journal = db.prepare('SELECT year, week, note, rating FROM journal WHERE profile_id = ?').all(profileId);
    const milestones = db.prepare('SELECT * FROM milestones WHERE profile_id = ?').all(profileId);
    const goals = db.prepare('SELECT * FROM goals WHERE profile_id = ?').all(profileId);
    const snapshots = db.prepare('SELECT year, week, filename FROM snapshots WHERE profile_id = ?').all(profileId);
    const settingsRows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    settingsRows.forEach(r => settings[r.key] = r.value);

    res.json({ profile, chapters, journal, milestones, goals, snapshots, settings });
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
