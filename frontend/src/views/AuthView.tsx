import { useState } from 'react';
import { useLocation } from 'wouter';
import { api } from '../api';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';

export default function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();

  const { setAuth } = useAuthStore();
  const { fetchInitialData } = useAppStore();

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const data = await api.post(endpoint, { username, password });
      setAuth(data);
      await fetchInitialData();
      setLocation('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <>
      <div className="modal-glow" style={{ top: '-10%', left: '50%', position: 'absolute' }}></div>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)'
      }}>
        <div className="modal" style={{ animation: 'fade-in 0.4s ease' }}>
          <h1 className="modal-title">Life<span className="accent">.</span>Weeks</h1>
          <p className="modal-subtitle">
            {isLogin ? 'Log in to your visual journal' : 'Start tracking your life'}
          </p>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <a href="#" onClick={(e) => { e.preventDefault(); toggleMode(); }} style={{ fontWeight: 600 }}>
              {isLogin ? 'Sign Up' : 'Log In'}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
