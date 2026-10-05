import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { login, register } from '../api';

export default function AuthOverlay({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const passwordScore = [
    password.length >= 8,
    /[A-Z]/.test(password) && /[a-z]/.test(password),
    /\d/.test(password) || /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = isLogin
        ? await login(username.trim(), password)
        : await register(username.trim(), password);
      onAuth({ authenticated: true, username: response.username });
    } catch (requestError) {
      setError(requestError.message || 'We couldn’t complete that request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />
      <motion.section className="auth-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <a className="brand auth-brand" href="#" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark">d</span><span>daymark</span>
        </a>
        <p className="eyebrow">A FRESH START, EVERY DAY</p>
        <h1>{isLogin ? 'Welcome back.' : 'Start with today.'}</h1>
        <p className="auth-subtitle">{isLogin ? 'Sign in to pick up right where you left off.' : 'Create your account and make space for what matters.'}</p>

        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="auth-username">Username</label>
          <input
            id="auth-username"
            className="form-input"
            type="text"
            value={username}
            onChange={(event) => { setUsername(event.target.value); setError(''); }}
            autoComplete="username"
            minLength={3}
            maxLength={80}
            required
            autoFocus
          />
          <label className="form-label" htmlFor="auth-password">Password</label>
          <div className="password-field">
            <input
              id="auth-password"
              className="form-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(''); }}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength={isLogin ? undefined : 8}
              required
            />
            <button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {!isLogin && (
            <div className="password-strength" aria-live="polite">
              <div className="strength-bars">{[1, 2, 3].map((step) => <span key={step} className={passwordScore >= step ? 'filled' : ''} />)}</div>
              <span>{password.length < 8 ? 'Use at least 8 characters' : ['Fair', 'Good', 'Strong'][Math.max(passwordScore - 1, 0)]}</span>
            </div>
          )}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>
        <p className="auth-switch">
          {isLogin ? 'New to Daymark?' : 'Already have an account?'}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); setPassword(''); }}>
            {isLogin ? 'Create an account' : 'Sign in'}
          </button>
        </p>
        {!isLogin && <p className="auth-privacy"><Check size={14} /> Your work stays private to your account.</p>}
      </motion.section>
      <p className="auth-footer">A calmer way to get things done.</p>
    </main>
  );
}
