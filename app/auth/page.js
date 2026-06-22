'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register State
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regTerms, setRegTerms] = useState(false);

  // Status State
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
        setLoading(false);
        return;
      }

      setSuccess('Login successful! Redirecting...');
      
      // Redirect based on role
      setTimeout(() => {
        if (data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/supplier');
        }
      }, 1000);
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    resetMessages();

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!regTerms) {
      setError('You must accept the terms and conditions to register.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          role: 'SUPPLIER', // Only supplier registration is allowed publicly
          companyName: regCompany,
          phoneNumber: regPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      setSuccess('Registration successful! Please login.');
      // Auto switch to login tab and prefill email
      setTimeout(() => {
        setLoginEmail(regEmail);
        setActiveTab('login');
        setSuccess('');
        setLoading(false);
      }, 1500);
    } catch (err) {
      setError('An error occurred during registration. Please try again.');
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
            <span className="logo-badge">B2B</span>
          </div>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <div
            className={`mobile-nav-overlay ${mobileMenuOpen ? 'visible' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          />

          <nav className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <a href="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Buyer Catalog</a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="auth-page-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img src="/logo.png" alt="Madeenat.com" style={{ height: '32px', marginBottom: '1rem' }} />
          </div>
          <h2 className="auth-title">B2B Platform</h2>
          <p className="auth-subtitle">Supplier & Admin Portal Access</p>

          {/* Tab Switcher */}
          <div className="auth-tab-bar">
            <button
              id="tab-login"
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => { setActiveTab('login'); resetMessages(); }}
            >
              Log In
            </button>
            <button
              id="tab-register"
              className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => { setActiveTab('register'); resetMessages(); }}
            >
              Register
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && <div className="alert alert-danger" id="auth-error-msg">{error}</div>}
          {success && <div className="alert alert-success" id="auth-success-msg">{success}</div>}

          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} id="login-form">
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  className="form-control"
                  placeholder="name@company.com"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem' }}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} id="register-form">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-company">Company Name</label>
                <input
                  id="reg-company"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Apex Electronics Ltd"
                  required
                  value={regCompany}
                  onChange={(e) => setRegCompany(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-phone">Contact Phone Number (WhatsApp Enabled)</label>
                <input
                  id="reg-phone"
                  type="tel"
                  className="form-control"
                  placeholder="e.g. +971501234567"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  className="form-control"
                  placeholder="name@company.com"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm-password">Confirm Password</label>
                <input
                  id="reg-confirm-password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                />
              </div>

              <div className="form-checkbox-wrapper">
                <input
                  id="reg-terms-checkbox"
                  type="checkbox"
                  className="form-checkbox"
                  required
                  checked={regTerms}
                  onChange={(e) => setRegTerms(e.target.checked)}
                />
                <span className="terms-text">
                  I agree to the <span className="terms-link" onClick={() => alert('Terms of Service: By joining Madeenat.com as a supplier, you agree to list genuine inventory configurations and fulfill bulk order enquiries with honesty and fair market pricing.')}>Terms and Conditions</span> of Madeenat B2B Marketplace.
                </span>
              </div>

              <button
                id="register-submit-btn"
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.5rem' }}
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Register as Supplier'}
              </button>
            </form>
          )}
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
