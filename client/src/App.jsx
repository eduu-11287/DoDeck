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
import BrandMural from './components/BrandMural';
import { checkAuth, deleteNote, deleteTask, fetchTasks, fetchNotes, fetchStreak, logout, updateTask } from './api';

const tabs = ['today', 'calendar', 'notes', 'stats'];

function getDetailRoute() {
  const match = window.location.pathname.match(/^\/(tasks|notes)\/([^/]+)\/?$/);
  return match ? { kind: match[1], id: match[2] } : null;
}

function initialTab(route) {
  return route?.kind === 'notes' ? 'notes' : 'today';
}

function OfflineNotice({ snapshotAt }) {
  return (
    <div className="offline-banner" role="status">
      {snapshotAt
        ? `Offline read-only · Showing saved workspace from ${new Date(snapshotAt).toLocaleString()}.`
        : 'You’re offline. Your saved workspace is unavailable on this device.'}
    </div>
  );
}

export default function App() {
  const [detailRoute, setDetailRoute] = useState(getDetailRoute);
  const [auth, setAuth] = useState({ authenticated: false, username: '' });
  const [activeTab, setActiveTab] = useState(() => initialTab(getDetailRoute()));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
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
  const [offlineSnapshotAt, setOfflineSnapshotAt] = useState(null);
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
      .then((currentAuth) => {
        setAuth(currentAuth);
      })
      .catch((error) => {
        if (!navigator.onLine) {
          try {
            const username = localStorage.getItem('daymark-offline-user');
            const saved = username && localStorage.getItem(`daymark-offline-${encodeURIComponent(username)}`);
            if (username && saved) {
              setAuth({ authenticated: true, username });
              return;
            }
          } catch (storageError) {
            setNotice(`Could not access the saved offline workspace: ${storageError.message}`);
            return;
          }
        }
        setNotice(`Could not verify your session: ${error.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!auth.authenticated) return;
    try {
      localStorage.setItem('daymark-offline-user', auth.username);
    } catch (error) {
      setNotice(`Could not remember this account for offline access: ${error.message}`);
    }
  }, [auth.authenticated, auth.username]);

  const loadData = useCallback(async (username) => {
    try {
      const [loadedTasks, loadedNotes, loadedStreak] = await Promise.all([
        fetchTasks(),
        fetchNotes(),
        fetchStreak(),
      ]);
      const savedStreak = { current: loadedStreak.current_streak, broken: loadedStreak.streak_broken };
      setTasks(loadedTasks);
      setNotes(loadedNotes);
      setStreak(savedStreak);
      setWorkspaceDataLoaded(true);
      setOfflineSnapshotAt(null);
      try {
        localStorage.setItem(`daymark-offline-${encodeURIComponent(username)}`, JSON.stringify({
          savedAt: new Date().toISOString(),
          tasks: loadedTasks,
          notes: loadedNotes,
          streak: savedStreak,
        }));
      } catch (storageError) {
        setNotice(`Couldn't save an offline workspace copy: ${storageError.message}`);
      }
    } catch (error) {
      if (navigator.onLine) throw error;
      const savedSnapshot = localStorage.getItem(`daymark-offline-${encodeURIComponent(username)}`);
      if (!savedSnapshot) throw error;
      try {
        const saved = JSON.parse(savedSnapshot);
        if (!Array.isArray(saved.tasks) || !Array.isArray(saved.notes) || !saved.streak || !saved.savedAt) {
          throw new Error('Saved workspace data is incomplete.');
        }
        setTasks(saved.tasks);
        setNotes(saved.notes);
        setStreak(saved.streak);
        setWorkspaceDataLoaded(true);
        setOfflineSnapshotAt(saved.savedAt);
      } catch (snapshotError) {
        throw new Error(`Couldn't read the saved offline workspace: ${snapshotError.message}`);
      }
    }
  }, []);

  useEffect(() => {
    if (!auth.authenticated || !workspaceDataLoaded || !isOnline) return;
    try {
      localStorage.setItem(`daymark-offline-${encodeURIComponent(auth.username)}`, JSON.stringify({
        savedAt: new Date().toISOString(),
        tasks,
        notes,
        streak,
      }));
    } catch (error) {
      setNotice(`Couldn't refresh the offline workspace copy: ${error.message}`);
    }
  }, [auth.authenticated, auth.username, isOnline, notes, streak, tasks, workspaceDataLoaded]);

  useEffect(() => {
    const onOffline = () => {
      setIsOnline(false);
      if (!auth.authenticated) return;
      try {
        const snapshot = localStorage.getItem(`daymark-offline-${encodeURIComponent(auth.username)}`);
        if (!snapshot) {
          setOfflineSnapshotAt(null);
          return;
        }
        const saved = JSON.parse(snapshot);
        if (!Array.isArray(saved.tasks) || !Array.isArray(saved.notes) || !saved.streak || !saved.savedAt) {
          throw new Error('Saved workspace data is incomplete.');
        }
        setOfflineSnapshotAt(saved.savedAt);
      } catch (error) {
        setOfflineSnapshotAt(null);
        setNotice(`Couldn't read the saved offline workspace: ${error.message}`);
      }
    };
    const onOnline = async () => {
      setIsOnline(true);
      try {
        const currentAuth = await checkAuth();
        setAuth(currentAuth);
        if (currentAuth.authenticated) await loadData(currentAuth.username);
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
  }, [auth.authenticated, auth.username, loadData]);

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
    loadData(auth.username).catch((error) => setNotice(`Couldn't load your workspace: ${error.message}`));
  }, [auth.authenticated, auth.username, loadData]);

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

  const toggleSidebar = () => {
    setSidebarCollapsed((collapsed) => {
      localStorage.setItem('sidebar-collapsed', String(!collapsed));
      return !collapsed;
    });
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

  const consumeEditRequest = (token) => {
    setEditRequest((current) => current?.token === token ? null : current);
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
        setNotes((current) => current.map((note) => String(note.taskId) === String(id) ? { ...note, taskId: null } : note));
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
      localStorage.removeItem('daymark-offline-user');
      localStorage.removeItem(`daymark-offline-${encodeURIComponent(auth.username)}`);
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
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n' && auth.authenticated && isOnline) {
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
  }, [auth.authenticated, auth.username, isOnline]);

  if (loading) {
    return (
      <>
        {!isOnline && <OfflineNotice snapshotAt={offlineSnapshotAt} />}
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
        {!isOnline && <OfflineNotice snapshotAt={offlineSnapshotAt} />}
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
    <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}${!isOnline ? ' offline-readonly' : ''}`}>
      <BrandMural />
      {!isOnline && <OfflineNotice snapshotAt={offlineSnapshotAt} />}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        username={auth.username}
        onLogout={handleLogout}
        onInstall={isInstalled ? null : installApp}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        searchCounts={{
          tasks: tasks.filter((task) => `${task.name} ${task.category || ''} ${task.description || ''} ${(task.checklist || []).map((item) => item.text).join(' ')}`.toLowerCase().includes(searchQuery.toLowerCase())).length,
          notes: notes.filter((note) => `${note.topic} ${note.content || ''} ${(note.tags || []).join(' ')}`.toLowerCase().includes(searchQuery.toLowerCase())).length,
        }}
      />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={selectTab}
        taskCount={activeTaskCount}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
      />

      <main className="main-content">
        {detailRoute ? (
          <ItemDetail
            kind={detailRoute.kind}
            item={detailRoute.kind === 'tasks'
              ? tasks.find((task) => String(task.id) === detailRoute.id)
              : notes.find((note) => String(note.id) === detailRoute.id)}
            onBack={returnFromDetail}
            linkedNotes={detailRoute.kind === 'tasks' ? notes.filter((note) => String(note.taskId) === detailRoute.id) : []}
            linkedTask={detailRoute.kind === 'notes' ? tasks.find((task) => String(task.id) === String(notes.find((note) => String(note.id) === detailRoute.id)?.taskId)) : null}
            onOpenItem={(kind, id) => openDetail(kind, id)}
            onEdit={() => editDetailItem(detailRoute.kind, detailRoute.id)}
            onDelete={() => deleteDetailItem(detailRoute.kind, detailRoute.id)}
            onToggleTask={toggleDetailTask}
            onUpdateTask={async (task, changes) => {
              try {
                const updated = await updateTask(task.id, changes);
                setTasks((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
              } catch (error) {
                setNotice(`Couldn't update this task: ${error.message}`);
              }
            }}
            isOffline={!isOnline}
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
                onEditRequestConsumed={consumeEditRequest}
                onOpenItem={(id) => openDetail('tasks', id)}
                onTasksChange={setTasks}
                onStreakChange={setStreak}
                onNotify={setNotice}
                isOffline={!isOnline}
              />
            </div>
            <div className="view-content" hidden={activeTab !== 'notes'}>
              <NotesPanel
                notes={notes}
                tasks={tasks}
                searchQuery={searchQuery}
                editRequest={editRequest}
                onEditRequestConsumed={consumeEditRequest}
                onOpenItem={(id) => openDetail('notes', id)}
                onNotesChange={setNotes}
                onNotify={setNotice}
                isOffline={!isOnline}
              />
            </div>
            <AnimatePresence mode="wait">
              {activeTab === 'calendar' && <motion.div key="calendar" className="view-content" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><CalendarView tasks={tasks} onOpenItem={(id) => openDetail('tasks', id)} /></motion.div>}
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
