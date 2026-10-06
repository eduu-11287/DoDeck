import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AuthOverlay from './components/AuthOverlay';
import TaskPanel from './components/TaskPanel';
import NotesPanel from './components/NotesPanel';
import CalendarView from './components/CalendarView';
import StatsView from './components/StatsView';
import ItemDetail from './components/ItemDetail';
import { checkAuth, deleteNote, deleteTask, fetchTasks, fetchNotes, fetchStreak, logout, updateTask } from './api';

const tabs = ['today', 'calendar', 'notes', 'stats'];

function getDetailRoute() {
  const match = window.location.pathname.match(/^\/(tasks|notes)\/([^/]+)\/?$/);
  return match ? { kind: match[1], id: match[2] } : null;
}

function initialTab(route) {
  return route?.kind === 'notes' ? 'notes' : 'today';
}

function OfflineNotice() {
  return (
    <div className="offline-banner" role="status">
      You’re offline. Daymark can open, but sign-in and account data need a connection.
    </div>
  );
}

export default function App() {
  const [detailRoute, setDetailRoute] = useState(getDetailRoute);
  const [auth, setAuth] = useState({ authenticated: false, username: '' });
  const [activeTab, setActiveTab] = useState(() => initialTab(getDetailRoute()));
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [streak, setStreak] = useState({ current: 0, broken: false });
  const [loading, setLoading] = useState(true);
  const [workspaceDataLoaded, setWorkspaceDataLoaded] = useState(false);
  const [theme, setTheme] = useState('light');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddSignal, setQuickAddSignal] = useState(0);
  const [notice, setNotice] = useState('');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const editToken = useRef(0);

  useEffect(() => {
    const onPopState = () => {
      const route = getDetailRoute();
      setDetailRoute(route);
      const savedTab = window.history.state?.daymarkTab;
      setActiveTab(route ? initialTab(route) : tabs.includes(savedTab) ? savedTab : 'today');
      window.requestAnimationFrame(() => window.scrollTo(0, window.history.state?.daymarkScrollY || 0));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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
    setWorkspaceDataLoaded(true);
  }, []);

  useEffect(() => {
    const onOffline = () => setIsOnline(false);
    const onOnline = async () => {
      setIsOnline(true);
      try {
        const currentAuth = await checkAuth();
        setAuth(currentAuth);
        if (currentAuth.authenticated) await loadData();
      } catch (error) {
        setNotice(`Connection restored, but Daymark couldn't refresh your workspace: ${error.message}`);
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [loadData]);

  useEffect(() => {
    setIsInstalled(
      window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true,
    );
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) {
      setNotice('To install Daymark, choose “Install app” or “Add to Home Screen” from your browser menu.');
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstallPrompt(null);
    } catch (error) {
      setNotice(`Daymark couldn't start installation: ${error.message}`);
    }
  };

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

  const openDetail = (kind, id) => {
    const tab = kind === 'notes' ? 'notes' : 'today';
    const from = { tab: activeTab, scrollY: window.scrollY };
    window.history.replaceState({ ...window.history.state, daymarkTab: activeTab, daymarkScrollY: window.scrollY }, '', window.location.href);
    window.history.pushState({ daymarkFrom: from }, '', `/${kind}/${encodeURIComponent(id)}`);
    setDetailRoute({ kind, id: String(id) });
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  const showList = (tab = activeTab) => {
    window.history.replaceState({ daymarkTab: tab, daymarkScrollY: 0 }, '', '/');
    setDetailRoute(null);
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };

  const returnFromDetail = () => {
    const from = window.history.state?.daymarkFrom;
    if (from) {
      window.history.back();
      return;
    }
    showList(initialTab(detailRoute));
  };

  const selectTab = (tab) => {
    if (detailRoute) showList(tab);
    else setActiveTab(tab);
  };

  const editDetailItem = (kind, id) => {
    const tab = kind === 'notes' ? 'notes' : 'today';
    showList(tab);
    setEditRequest({ kind, id: String(id), token: ++editToken.current });
  };

  const toggleDetailTask = async (task) => {
    try {
      await updateTask(task.id, { isActive: !task.isActive });
      const [updatedTasks, latestStreak] = await Promise.all([fetchTasks(), fetchStreak()]);
      setTasks(updatedTasks);
      setStreak({ current: latestStreak.current_streak, broken: latestStreak.streak_broken });
    } catch (error) {
      setNotice(`Couldn't update this task: ${error.message}`);
    }
  };

  const deleteDetailItem = async (kind, id) => {
    try {
      if (kind === 'tasks') {
        await deleteTask(id);
        setTasks((current) => current.filter((task) => String(task.id) !== String(id)));
      } else {
        await deleteNote(id);
        setNotes((current) => current.filter((note) => String(note.id) !== String(id)));
      }
      returnFromDetail();
    } catch (error) {
      setNotice(`Couldn't delete this ${kind === 'tasks' ? 'task' : 'note'}: ${error.message}`);
    }
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
      <>
        {!isOnline && <OfflineNotice />}
        <main className="loading-screen" aria-label="Loading Daymark">
          <div className="brand-mark">d</div>
          <p>Getting your day in order…</p>
        </main>
      </>
    );
  }

  if (!auth.authenticated) {
    return (
      <>
        <AuthOverlay onAuth={setAuth} />
        {!isOnline && <OfflineNotice />}
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
      {!isOnline && <OfflineNotice />}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        username={auth.username}
        onLogout={handleLogout}
        onInstall={isInstalled ? null : installApp}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        searchCounts={{
          tasks: tasks.filter((task) => `${task.name} ${task.category || ''}`.toLowerCase().includes(searchQuery.toLowerCase())).length,
          notes: notes.filter((note) => `${note.topic} ${note.content || ''}`.toLowerCase().includes(searchQuery.toLowerCase())).length,
        }}
      />
      <Sidebar activeTab={activeTab} setActiveTab={selectTab} taskCount={activeTaskCount} />

      <main className="main-content">
        {detailRoute ? (
          <ItemDetail
            kind={detailRoute.kind}
            item={detailRoute.kind === 'tasks'
              ? tasks.find((task) => String(task.id) === detailRoute.id)
              : notes.find((note) => String(note.id) === detailRoute.id)}
            onBack={returnFromDetail}
            onEdit={() => editDetailItem(detailRoute.kind, detailRoute.id)}
            onDelete={() => deleteDetailItem(detailRoute.kind, detailRoute.id)}
            onToggleTask={toggleDetailTask}
            isLoading={!workspaceDataLoaded}
          />
        ) : (
          <>
            <div className="page-heading">
              <p className="eyebrow">DAYMARK <span>·</span> {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <h1>{pageTitles[activeTab][0]}</h1>
              <p className="page-subtitle">{pageTitles[activeTab][1]}</p>
            </div>
            <div className="view-content" hidden={activeTab !== 'today'}>
              <TaskPanel
                username={auth.username}
                tasks={tasks}
                streak={streak}
                searchQuery={searchQuery}
                quickAddSignal={quickAddSignal}
                editRequest={editRequest}
                onOpenItem={(id) => openDetail('tasks', id)}
                onTasksChange={setTasks}
                onStreakChange={setStreak}
                onNotify={setNotice}
              />
            </div>
            <div className="view-content" hidden={activeTab !== 'notes'}>
              <NotesPanel
                notes={notes}
                searchQuery={searchQuery}
                editRequest={editRequest}
                onOpenItem={(id) => openDetail('notes', id)}
                onNotesChange={setNotes}
                onNotify={setNotice}
              />
            </div>
            <AnimatePresence mode="wait">
              {activeTab === 'calendar' && <motion.div key="calendar" className="view-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><CalendarView tasks={tasks} /></motion.div>}
              {activeTab === 'stats' && <motion.div key="stats" className="view-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><StatsView tasks={tasks} streak={streak} /></motion.div>}
            </AnimatePresence>
          </>
        )}
      </main>
      {tabs.includes(activeTab) && (
        <nav className="mobile-nav" aria-label="Main navigation">
          <Sidebar activeTab={activeTab} setActiveTab={selectTab} taskCount={activeTaskCount} mobile />
        </nav>
      )}
      {notice && <div className="toast toast-error" role="alert">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}>×</button></div>}
    </div>
  );
}
