const jwt = require('jsonwebtoken');

// JWT secret — in production, use an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'life-in-weeks-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

/**
 * Create a signed JWT for a user
 */
function signToken(userId, username) {
    return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Set JWT as an httpOnly cookie
 */
function setTokenCookie(res, token) {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
}

/**
 * Clear the JWT cookie
 */
function clearTokenCookie(res) {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });
}

/**
 * Express middleware — verifies JWT from cookie and attaches userId to req.
 * Skips auth for /api/auth/* routes and static files.
 */
function requireAuth(req, res, next) {
    // Skip auth for login/register/static
    if (req.path.startsWith('/api/auth/')) return next();
    if (!req.path.startsWith('/api/')) return next();

    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.username = decoded.username;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = { signToken, setTokenCookie, clearTokenCookie, requireAuth, JWT_SECRET };
