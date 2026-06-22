'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
        setLoading(false);
        return;
      }

      if (data.user.role !== 'ADMIN') {
        setError('Access denied. Admin role required.');
        setLoading(false);
        // Clean session cookie if role is incorrect
        fetch('/api/auth/logout', { method: 'POST' });
        return;
      }

      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        router.push('/admin');
      }, 1000);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="logo-container">
            <a href="/">
              <img src="/logo.png" alt="Madeenat.com" className="logo-img" />
            </a>
            <span className="logo-badge">Admin Access</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="auth-page-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img src="/logo.png" alt="Madeenat.com" style={{ height: '32px', marginBottom: '1rem' }} />
          </div>
          <h2 className="auth-title">Admin Login</h2>
          <p className="auth-subtitle">Enter administrator credentials</p>

          {/* Feedback Alerts */}
          {error && <div className="alert alert-danger" id="auth-error-msg">{error}</div>}
          {success && <div className="alert alert-success" id="auth-success-msg">{success}</div>}

          {/* Login Form */}
          <form onSubmit={handleLogin} id="admin-login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="admin-email">Email Address</label>
              <input
                id="admin-email"
                type="email"
                className="form-control"
                placeholder="admin@madeenat.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                className="form-control"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In as Admin'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-brand">Madeenat.com</span>
          <span>© {new Date().getFullYear()} Madeenat. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
