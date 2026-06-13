import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AuthOverlay from './components/AuthOverlay';
import TaskPanel from './components/TaskPanel';
import NotesPanel from './components/NotesPanel';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';
import { checkAuth, fetchTasks, fetchNotes, fetchStreak, logout } from './api';

export default function App() {
  const [auth, setAuth] = useState({ authenticated: false, username: '' });
  const [activeTab, setActiveTab] = useState('today');
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [streak, setStreak] = useState({ current: 0, broken: false });
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const loadData = async () => {
    try {
      const [t, n, s] = await Promise.all([fetchTasks(), fetchNotes(), fetchStreak()]);
      setTasks(t);
      setNotes(n);
      setStreak({ current: s.current_streak, broken: s.streak_broken });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth().then((a) => { setAuth(a); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (auth.authenticated) loadData();
  }, [auth.authenticated]);

  const handleLogout = async () => {
    try { await logout(); } catch (e) { console.error(e); }
    setAuth({ authenticated: false, username: '' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow mx-auto mb-4 flex items-center justify-center"
          >
            <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full" />
          </motion.div>
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 tracking-wide">Loading DoDeck</p>
        </div>
      </div>
    );
  }

  if (!auth.authenticated) return <AuthOverlay onAuth={setAuth} />;

  const activeTaskCount = tasks.filter((t) => t.isActive).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 transition-colors duration-500">
      {/* Noise overlay */}
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none dark:opacity-[0.04]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '200px',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Floating background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-400/10 to-violet-400/8 blur-3xl animate-float dark:from-indigo-500/15 dark:to-violet-500/10" />
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-cyan-400/5 to-indigo-400/5 blur-3xl animate-float-delayed dark:from-cyan-500/8 dark:to-indigo-500/6" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] rounded-full bg-gradient-to-tl from-fuchsia-400/5 to-pink-400/3 blur-3xl animate-float dark:from-fuchsia-500/8 dark:to-pink-500/4" style={{ animationDelay: '2s' }} />
      </div>

      <Header theme={theme} toggleTheme={toggleTheme} username={auth.username} onLogout={handleLogout} />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} taskCount={activeTaskCount} />

      {/* Main content */}
      <main className="lg:ml-72 pt-24 pb-16 px-4 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'today' && (
              <motion.div key="today" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}>
                <TaskPanel username={auth.username} tasks={tasks} streak={streak} onTasksChange={setTasks} onStreakChange={setStreak} onLogout={handleLogout} />
              </motion.div>
            )}
            {activeTab === 'notes' && (
              <motion.div key="notes" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}>
                <NotesPanel notes={notes} onNotesChange={setNotes} onLogout={handleLogout} />
              </motion.div>
            )}
            {activeTab === 'calendar' && (
              <motion.div key="calendar" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}>
                <CalendarView tasks={tasks} />
              </motion.div>
            )}
            {activeTab === 'stats' && (
              <motion.div key="stats" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}>
                <StatsView tasks={tasks} streak={streak} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
