import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AuthOverlay from './components/AuthOverlay';
import TaskPanel from './components/TaskPanel';
import NotesPanel from './components/NotesPanel';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';
import { checkAuth, fetchTasks, fetchNotes, fetchStreak, logout } from './api';

const tabs = ['today', 'calendar', 'notes', 'stats'];

export default function App() {
  const [auth, setAuth] = useState({ authenticated: false, username: '' });
  const [activeTab, setActiveTab] = useState('today');
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [streak, setStreak] = useState({ current: 0, broken: false });
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddSignal, setQuickAddSignal] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  useEffect(() => {
    checkAuth()
      .then(setAuth)
      .catch((error) => setNotice(`Could not verify your session: ${error.message}`))
      .finally(() => setLoading(false));
  }, []);

  const loadData = useCallback(async () => {
    const [loadedTasks, loadedNotes, loadedStreak] = await Promise.all([
      fetchTasks(),
      fetchNotes(),
      fetchStreak(),
    ]);
    setTasks(loadedTasks);
    setNotes(loadedNotes);
    setStreak({ current: loadedStreak.current_streak, broken: loadedStreak.streak_broken });
  }, []);

  useEffect(() => {
    if (!auth.authenticated) return;
    loadData().catch((error) => setNotice(`Couldn't load your workspace: ${error.message}`));
  }, [auth.authenticated, loadData]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setAuth({ authenticated: false, username: '' });
      setTasks([]);
      setNotes([]);
      setSearchQuery('');
    } catch (error) {
      setNotice(`Couldn't sign out: ${error.message}`);
    }
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('daymark:search'));
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n' && auth.authenticated) {
        event.preventDefault();
        setActiveTab('today');
        setQuickAddSignal((current) => current + 1);
      } else if (event.key === '/' && !isTyping && auth.authenticated) {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent('daymark:search'));
      } else if (event.key === 'Escape') {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [auth.authenticated]);

  if (loading) {
    return (
      <main className="loading-screen" aria-label="Loading Daymark">
        <div className="brand-mark">d</div>
        <p>Getting your day in order…</p>
      </main>
    );
  }

  if (!auth.authenticated) {
    return (
      <>
        <AuthOverlay onAuth={setAuth} />
        {notice && <div className="toast toast-error" role="alert">{notice}</div>}
      </>
    );
  }

  const activeTaskCount = tasks.filter((task) => task.isActive).length;
  const pageTitles = {
    today: ['Your day, made clear.', 'A little progress goes a long way.'],
    calendar: ['See what’s ahead.', 'Your plans, at a glance.'],
    notes: ['Keep the good thoughts.', 'Ideas belong somewhere.'],
    stats: ['Look how far you’ve come.', 'Small steps add up.'],
  };

  return (
    <div className="app-shell">
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        username={auth.username}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        searchCounts={{
          tasks: tasks.filter((task) => `${task.name} ${task.category || ''}`.toLowerCase().includes(searchQuery.toLowerCase())).length,
          notes: notes.filter((note) => `${note.topic} ${note.content || ''}`.toLowerCase().includes(searchQuery.toLowerCase())).length,
        }}
      />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} taskCount={activeTaskCount} />

      <main className="main-content">
        <div className="page-heading">
          <p className="eyebrow">DAYMARK <span>·</span> {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1>{pageTitles[activeTab][0]}</h1>
          <p className="page-subtitle">{pageTitles[activeTab][1]}</p>
        </div>
        <AnimatePresence mode="wait">
          {activeTab === 'today' && (
            <motion.div key="today" className="view-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <TaskPanel
                username={auth.username}
                tasks={tasks}
                streak={streak}
                searchQuery={searchQuery}
                quickAddSignal={quickAddSignal}
                onTasksChange={setTasks}
                onStreakChange={setStreak}
                onNotify={setNotice}
              />
            </motion.div>
          )}
          {activeTab === 'notes' && (
            <motion.div key="notes" className="view-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <NotesPanel notes={notes} searchQuery={searchQuery} onNotesChange={setNotes} onNotify={setNotice} />
            </motion.div>
          )}
          {activeTab === 'calendar' && (
            <motion.div key="calendar" className="view-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <CalendarView tasks={tasks} />
            </motion.div>
          )}
          {activeTab === 'stats' && (
            <motion.div key="stats" className="view-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <StatsView tasks={tasks} streak={streak} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      {tabs.includes(activeTab) && (
        <nav className="mobile-nav" aria-label="Main navigation">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} taskCount={activeTaskCount} mobile />
        </nav>
      )}
      {notice && <div className="toast toast-error" role="alert">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
    </div>
  );
}
