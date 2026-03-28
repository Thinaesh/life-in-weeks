/* ================================================================
   AUTH PAGE — Login / Register Logic
   ================================================================ */

(function () {
    'use strict';

    // Check if already logged in
    fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(r => { if (r.ok) window.location.href = '/'; })
        .catch(() => {});

    // Tab switching
    const tabs = document.getElementById('auth-tabs');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    document.getElementById('tab-login').addEventListener('click', () => {
        tabs.setAttribute('data-active', 'login');
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('tab-register').classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        clearErrors();
    });

    document.getElementById('tab-register').addEventListener('click', () => {
        tabs.setAttribute('data-active', 'register');
        document.getElementById('tab-register').classList.add('active');
        document.getElementById('tab-login').classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        clearErrors();
    });

    function clearErrors() {
        document.querySelectorAll('.auth-error').forEach(el => {
            el.classList.add('hidden');
            el.textContent = '';
        });
    }

    function showError(elementId, message) {
        const el = document.getElementById(elementId);
        el.textContent = message;
        el.classList.remove('hidden');
    }

    // Password visibility toggles
    document.querySelectorAll('.auth-toggle-pw').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🔒';
            } else {
                input.type = 'password';
                btn.textContent = '👁';
            }
        });
    });

    // Password strength meter
    const regPassword = document.getElementById('register-password');
    const strengthFill = document.getElementById('strength-fill');
    const strengthLabel = document.getElementById('strength-label');

    regPassword.addEventListener('input', () => {
        const pw = regPassword.value;
        const level = getStrengthLevel(pw);
        strengthFill.setAttribute('data-level', level);
        strengthLabel.setAttribute('data-level', level);
        strengthLabel.textContent = level ? level.charAt(0).toUpperCase() + level.slice(1) : '';
    });

    function getStrengthLevel(pw) {
        if (!pw) return '';
        let score = 0;
        if (pw.length >= 6) score++;
        if (pw.length >= 10) score++;
        if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
        if (/\d/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;

        if (score <= 1) return 'weak';
        if (score <= 2) return 'fair';
        if (score <= 3) return 'good';
        return 'strong';
    }

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            showError('login-error', 'Please fill in all fields');
            return;
        }

        const submitBtn = document.getElementById('login-submit');
        const loader = document.getElementById('login-loader');
        submitBtn.disabled = true;
        loader.classList.remove('hidden');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'same-origin'
            });

            const data = await res.json();

            if (!res.ok) {
                showError('login-error', data.error || 'Login failed');
                return;
            }

            // Success — redirect to main app
            window.location.href = '/';
        } catch (err) {
            showError('login-error', 'Network error. Please try again.');
        } finally {
            submitBtn.disabled = false;
            loader.classList.add('hidden');
        }
    });

    // Register form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;

        if (!username || !password || !confirm) {
            showError('register-error', 'Please fill in all fields');
            return;
        }

        if (username.length < 3) {
            showError('register-error', 'Username must be at least 3 characters');
            return;
        }

        if (password.length < 6) {
            showError('register-error', 'Password must be at least 6 characters');
            return;
        }

        if (password !== confirm) {
            showError('register-error', 'Passwords do not match');
            return;
        }

        const submitBtn = document.getElementById('register-submit');
        const loader = document.getElementById('register-loader');
        submitBtn.disabled = true;
        loader.classList.remove('hidden');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'same-origin'
            });

            const data = await res.json();

            if (!res.ok) {
                showError('register-error', data.error || 'Registration failed');
                return;
            }

            // Success — redirect to main app
            window.location.href = '/';
        } catch (err) {
            showError('register-error', 'Network error. Please try again.');
        } finally {
            submitBtn.disabled = false;
            loader.classList.add('hidden');
        }
    });
})();
