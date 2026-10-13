import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowRight, Check, CalendarDays, Moon, Sun } from 'lucide-react';
import { login, register } from '../api';

export default function AuthOverlay({ onAuth, theme, toggleTheme }) {
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
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--canvas)] px-5 py-5 text-[var(--ink)] transition-colors duration-300 sm:px-8 sm:py-7 lg:px-12">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 size-[440px] rounded-full bg-[#e9d4c5] opacity-40 blur-3xl dark:bg-[#dd7254] dark:opacity-[.08]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-40 size-[480px] rounded-full bg-[#dbe5d7] opacity-60 blur-3xl dark:bg-[#96b59a] dark:opacity-[.08]" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        <a className="inline-flex items-center gap-2.5 text-[var(--ink)] no-underline [font-family:Manrope,sans-serif] text-[19px] font-extrabold tracking-[-1px]" href="#" onClick={(event) => event.preventDefault()}>
          <span className="inline-grid size-9 place-items-center rounded-xl bg-[var(--accent)] text-[21px] font-extrabold text-[#fffaf5]">d</span>
          <span>daymark</span>
        </a>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3.5 text-xs font-semibold text-[var(--ink)] shadow-sm transition-colors hover:bg-[var(--surface-muted)]"
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 py-12 lg:grid-cols-[1.08fr_.92fr] lg:gap-20 lg:py-16">
        <section className="mx-auto w-full max-w-xl lg:mx-0" aria-labelledby="welcome-heading">
          <p className="mb-4 flex items-center gap-2 text-[11px] font-bold tracking-[1.8px] text-[var(--accent-hover)]">
            <span className="h-px w-7 bg-[var(--accent)]" />
            A FRESH START, EVERY DAY
          </p>
          <h1 id="welcome-heading" className="m-0 max-w-[590px] text-[clamp(42px,6vw,70px)] font-extrabold leading-[1.02] tracking-[-3px] [font-family:Manrope,sans-serif]">
            Make room for what matters.
          </h1>
          <p className="mt-5 max-w-[440px] text-[15px] leading-7 text-[var(--muted)] sm:text-base">
            A calmer place for your tasks, notes, and next small step. Take today one thing at a time.
          </p>

          <div className="relative mt-10 max-w-[430px] rotate-[-1deg] rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-6">
            <div aria-hidden="true" className="absolute -right-4 -top-5 grid size-12 rotate-[9deg] place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <CalendarDays size={23} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="m-0 text-[10px] font-bold tracking-[1.4px] text-[var(--muted)]">A GENTLER PLAN</p>
                <h2 className="mb-0 mt-1 text-lg font-bold tracking-[-.5px]">Today, at your pace</h2>
              </div>
              <span className="rounded-full bg-[var(--green-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--green)]">2 of 3</span>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-muted)] px-3.5 py-3 text-sm text-[var(--muted)]">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--green)] text-[var(--canvas)]"><Check size={13} strokeWidth={3} /></span>
                Make a little space to think
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-muted)] px-3.5 py-3 text-sm font-semibold">
                <span className="size-5 shrink-0 rounded-full border-2 border-[var(--accent)]" />
                Focus on what matters next
              </div>
              <div className="flex items-center gap-3 px-3.5 py-1 text-sm text-[var(--muted)]">
                <span className="size-5 shrink-0 rounded-full border border-[var(--line)]" />
                Leave a note for tomorrow
              </div>
            </div>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs font-medium text-[var(--green)]">
            <Check size={15} /> A little progress goes a long way.
          </p>
        </section>

        <motion.section
          className="mx-auto w-full max-w-[430px] rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-9"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          aria-labelledby="auth-heading"
        >
          <p className="mb-2 text-[10px] font-bold tracking-[1.45px] text-[var(--accent-hover)]">
            {isLogin ? 'YOUR DAY IS HERE WHEN YOU ARE' : 'A SMALL STEP, JUST FOR YOU'}
          </p>
          <h2 id="auth-heading" className="m-0 text-[clamp(27px,3.2vw,35px)] font-extrabold leading-tight tracking-[-1.4px] [font-family:Manrope,sans-serif]">
            {isLogin ? 'Welcome back.' : 'Start with today.'}
          </h2>
          <p className="mb-6 mt-2 text-[13px] leading-6 text-[var(--muted)]">
            {isLogin ? 'Sign in to pick up right where you left off.' : 'Create your account and make space for what matters.'}
          </p>

          <form onSubmit={handleSubmit}>
            <label className="mb-2 mt-4 block text-xs font-bold" htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]"
              type="text"
              value={username}
              onChange={(event) => { setUsername(event.target.value); setError(''); }}
              autoComplete="username"
              minLength={3}
              maxLength={80}
              required
              autoFocus
            />
            <label className="mb-2 mt-4 block text-xs font-bold" htmlFor="auth-password">Password</label>
            <div className="relative">
              <input
                id="auth-password"
                className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] py-3 pl-3.5 pr-12 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => { setPassword(event.target.value); setError(''); }}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={isLogin ? undefined : 8}
                required
              />
              <button className="absolute right-1 top-1 grid size-10 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-[var(--muted)] hover:bg-[var(--surface-muted)]" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {!isLogin && (
              <div className="mt-2 flex items-center gap-2.5 text-[11px] text-[var(--muted)]" aria-live="polite">
                <div className="flex flex-1 gap-1">{[1, 2, 3].map((step) => <span key={step} className={`h-1 flex-1 rounded-full ${passwordScore >= step ? 'bg-[var(--green)]' : 'bg-[var(--line)]'}`} />)}</div>
                <span>{password.length < 8 ? 'Use at least 8 characters' : ['Fair', 'Good', 'Strong'][Math.max(passwordScore - 1, 0)]}</span>
              </div>
            )}
            {error && <div className="mt-3 rounded-xl border border-[#edc5bc] bg-[#fff5f1] px-3 py-2.5 text-xs text-[#a3453a] dark:border-[#775046] dark:bg-[#3d2d28] dark:text-[#e8a28f]" role="alert">{error}</div>}
            <button className="mt-6 flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-transparent bg-[var(--accent)] px-4 text-sm font-bold text-[#fffaf5] transition-all duration-150 hover:-translate-y-px hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0" type="submit" disabled={submitting}>
              {submitting ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>

          {isLogin ? (
            <div className="mt-5 border-t border-[var(--line)] pt-5">
              <p className="mb-3 text-center text-xs text-[var(--muted)]">New to Daymark?</p>
              <button
                className="group flex min-h-12 w-full cursor-pointer items-center justify-between rounded-xl border border-[color-mix(in_srgb,var(--accent),transparent_48%)] bg-[var(--accent-soft)] px-4 text-sm font-bold text-[var(--accent-hover)] transition-all hover:-translate-y-px hover:border-[var(--accent)]"
                type="button"
                onClick={() => { setIsLogin(false); setError(''); setPassword(''); }}
              >
                Create your free account
                <ArrowRight className="transition-transform group-hover:translate-x-1" size={17} />
              </button>
            </div>
          ) : (
            <p className="mt-5 text-center text-xs text-[var(--muted)]">
              Already have an account?{' '}
              <button className="cursor-pointer border-0 bg-transparent p-0 font-bold text-[var(--accent-hover)] underline decoration-[color-mix(in_srgb,var(--accent),transparent_45%)] underline-offset-4" type="button" onClick={() => { setIsLogin(true); setError(''); setPassword(''); }}>
                Sign in
              </button>
            </p>
          )}
          {!isLogin && <p className="mb-0 mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[var(--green)]"><Check size={14} /> Your work stays private to your account.</p>}
        </motion.section>
      </div>
      <footer className="relative z-10 mx-auto w-full max-w-6xl pt-2 text-center text-[11px] text-[var(--muted)] lg:text-left">
        A calmer way to get things done.
      </footer>
    </main>
  );
}
