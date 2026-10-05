import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Sun, Moon, LogOut, X, Command } from 'lucide-react';

export default function Header({ theme, toggleTheme, username, onLogout, searchQuery, onSearch, searchCounts }) {
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const openSearch = () => setShowSearch(true);
    document.addEventListener('daymark:search', openSearch);
    return () => document.removeEventListener('daymark:search', openSearch);
  }, []);

  useEffect(() => {
    if (showSearch) inputRef.current?.focus();
  }, [showSearch]);

  useEffect(() => {
    const closeSearchOnEscape = (event) => {
      if (event.key === 'Escape' && showSearch) closeSearch();
    };
    window.addEventListener('keydown', closeSearchOnEscape);
    return () => window.removeEventListener('keydown', closeSearchOnEscape);
  }, [showSearch]);

  useEffect(() => {
    const closeMenu = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  const closeSearch = () => {
    setShowSearch(false);
    onSearch('');
  };

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()} aria-label="Daymark home">
          <span className="brand-mark">d</span>
          <span>daymark</span>
        </a>
        <div className="topbar-actions">
          <button className="search-trigger" onClick={() => setShowSearch(true)} aria-label="Search tasks and notes">
            <Search size={17} /><span>Search</span><kbd><Command size={11} /> K</kbd>
          </button>
          <button className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="profile-menu" ref={userMenuRef}>
            <button className="avatar-button" onClick={() => setShowUserMenu(!showUserMenu)} aria-label="Account menu">
              {username?.slice(0, 1)?.toUpperCase() || 'U'}
            </button>
            <AnimatePresence>
              {showUserMenu && (
                <motion.div className="account-popover" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}>
                  <strong>{username}</strong>
                  <button onClick={onLogout}><LogOut size={15} /> Sign out</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showSearch && (
          <motion.div className="search-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSearch}>
            <motion.section className="search-dialog" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onClick={(event) => event.stopPropagation()} aria-label="Search Daymark">
              <div className="search-field">
                <Search size={19} />
                <input ref={inputRef} value={searchQuery} onChange={(event) => onSearch(event.target.value)} placeholder="Search tasks and notes…" aria-label="Search tasks and notes" />
                <button className="icon-button" onClick={closeSearch} aria-label="Close search"><X size={18} /></button>
              </div>
              <div className="search-hint">
                {searchQuery
                  ? <><span>{searchCounts.tasks} task{searchCounts.tasks === 1 ? '' : 's'}</span><span>{searchCounts.notes} note{searchCounts.notes === 1 ? '' : 's'}</span><span>Results update as you type</span></>
                  : <span>Type to find tasks by title or category and notes by title or content.</span>}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
