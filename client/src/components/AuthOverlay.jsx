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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--canvas)] px-4 pt-[30px] pb-[60px] dark:bg-[var(--bg-base)] dark:before:fixed dark:before:top-[-25vh] dark:before:right-[-15vw] dark:before:z-0 dark:before:h-[55vw] dark:before:w-[55vw] dark:before:rounded-full dark:before:bg-[radial-gradient(ellipse,rgba(6,182,212,0.25),transparent_70%)] dark:before:blur-[120px] dark:before:content-[''] dark:before:pointer-events-none dark:after:fixed dark:after:bottom-[-35vh] dark:after:left-[-18vw] dark:after:z-0 dark:after:h-[55vw] dark:after:w-[55vw] dark:after:rounded-full dark:after:bg-[radial-gradient(ellipse,rgba(59,130,246,0.2),transparent_70%)] dark:after:blur-[120px] dark:after:content-[''] dark:after:pointer-events-none">
      <div aria-hidden="true" className="pointer-events-none absolute top-[-185px] right-[-105px] h-[360px] w-[360px] rounded-full bg-[#e9d4c5] opacity-[.48] blur-[2px] dark:bg-[rgba(6,182,212,0.1)] dark:opacity-10" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-240px] left-[-120px] h-[360px] w-[360px] rounded-full bg-[#dbe5d7] opacity-70 blur-[2px] dark:bg-[rgba(59,130,246,0.1)] dark:opacity-[.12]" />
      <motion.section className="relative z-[1] w-[min(100%,420px)] rounded-[18px] border border-[var(--line)] bg-[var(--surface)] p-[35px] shadow-[var(--shadow)] max-[760px]:px-[23px] max-[760px]:py-[27px]" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <a className="mb-8 inline-flex items-center gap-[10px] text-[var(--ink)] no-underline [font-family:Manrope,sans-serif] text-[19px] font-extrabold tracking-[-1px] dark:text-[var(--text-primary)] dark:font-sans" href="#" onClick={(event) => event.preventDefault()}>
          <span className="inline-grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-[var(--accent)] text-[19px] font-extrabold text-[#fffdfa] [font-family:Manrope,sans-serif] dark:font-sans">d</span><span>daymark</span>
        </a>
        <p className="mb-[9px] text-[10px] font-bold tracking-[1.35px] text-[var(--accent-hover)]">A FRESH START, EVERY DAY</p>
        <h1 className="m-0 text-[clamp(27px,3.2vw,37px)] font-extrabold leading-[1.18] tracking-[-1.6px] [font-family:Manrope,sans-serif]">{isLogin ? 'Welcome back.' : 'Start with today.'}</h1>
        <p className="mt-[10px] mb-[23px] text-[12px] leading-[1.6] text-[var(--muted)] dark:text-[var(--text-secondary)]">{isLogin ? 'Sign in to pick up right where you left off.' : 'Create your account and make space for what matters.'}</p>

        <form onSubmit={handleSubmit}>
          <label className="mt-[15px] mb-[7px] block text-[11px] font-bold text-[var(--ink)] dark:text-[var(--text-primary)]" htmlFor="auth-username">Username</label>
          <input
            id="auth-username"
            className="min-h-[41px] w-full rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-[11px] py-[10px] text-[12px] text-[var(--ink)] placeholder:text-[#9ba49d] dark:border-[var(--border-color)] dark:bg-[var(--bg-base)] dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)]"
            type="text"
            value={username}
            onChange={(event) => { setUsername(event.target.value); setError(''); }}
            autoComplete="username"
            minLength={3}
            maxLength={80}
            required
            autoFocus
          />
          <label className="mt-[15px] mb-[7px] block text-[11px] font-bold text-[var(--ink)] dark:text-[var(--text-primary)]" htmlFor="auth-password">Password</label>
          <div className="relative">
            <input
              id="auth-password"
              className="min-h-[41px] w-full rounded-lg border border-[var(--line)] bg-[var(--canvas)] py-[10px] pl-[11px] pr-11 text-[12px] text-[var(--ink)] placeholder:text-[#9ba49d] dark:border-[var(--border-color)] dark:bg-[var(--bg-base)] dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)]"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => { setPassword(event.target.value); setError(''); }}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength={isLogin ? undefined : 8}
              required
            />
            <button className="absolute top-px right-[3px] grid h-[39px] w-[38px] cursor-pointer place-items-center border-0 bg-transparent text-[var(--muted)]" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {!isLogin && (
            <div className="mt-[7px] flex items-center gap-[9px] text-[10px] text-[var(--muted)]" aria-live="polite">
              <div className="flex flex-1 gap-1">{[1, 2, 3].map((step) => <span key={step} className={`h-[3px] flex-1 rounded-[2px] ${passwordScore >= step ? 'bg-[var(--green)]' : 'bg-[var(--line)]'}`} />)}</div>
              <span>{password.length < 8 ? 'Use at least 8 characters' : ['Fair', 'Good', 'Strong'][Math.max(passwordScore - 1, 0)]}</span>
            </div>
          )}
          {error && <div className="mt-3 rounded-lg border border-[#edc5bc] bg-[#fff5f1] px-[10px] py-[9px] text-[11px] text-[#a3453a] dark:border-[#775046] dark:bg-[#4b312c] dark:text-[#ffc4b8]" role="alert">{error}</div>}
          <button className="mt-5 flex min-h-[39px] w-full cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-transparent bg-[var(--accent)] px-[14px] text-[12px] font-bold text-[#fffaf5] transition-all duration-150 hover:-translate-y-px hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 dark:bg-[var(--accent-cyan)] dark:hover:-translate-y-0.5 dark:hover:bg-[var(--accent-cyan)] dark:hover:shadow-[0_6px_20px_rgba(6,182,212,0.4)] dark:disabled:hover:shadow-none" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>
        <p className="mt-[18px] mb-0 text-center text-[11px] text-[var(--muted)]">
          {isLogin ? 'New to Daymark?' : 'Already have an account?'}
          <button className="ml-1 cursor-pointer border-0 bg-transparent p-0 font-bold text-[var(--accent-hover)] dark:text-[var(--accent-cyan)]" onClick={() => { setIsLogin(!isLogin); setError(''); setPassword(''); }}>
            {isLogin ? 'Create an account' : 'Sign in'}
          </button>
        </p>
        {!isLogin && <p className="mt-4 mb-0 flex items-center justify-center gap-[5px] text-[10px] text-[var(--green)]"><Check size={14} /> Your work stays private to your account.</p>}
      </motion.section>
      <p className="absolute bottom-[22px] left-1/2 z-[1] m-0 -translate-x-1/2 text-[10px] text-[var(--muted)]">A calmer way to get things done.</p>
    </main>
  );
}
