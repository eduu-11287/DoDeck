import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Sun, Moon, LogOut, X, Command, Download, ArrowUp } from 'lucide-react';

export default function Header({ theme, toggleTheme, username, onLogout, onInstall, searchQuery, onSearch, searchCounts }) {
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const userMenuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const updateScrollTopVisibility = () => setShowScrollTop(window.scrollY > 320);
    updateScrollTopVisibility();
    window.addEventListener('scroll', updateScrollTopVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollTopVisibility);
  }, []);

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
      <header className="sticky top-0 z-40 flex h-[76px] items-center justify-between gap-5 border-b border-[color-mix(in_srgb,var(--line),transparent_12%)] bg-[color-mix(in_srgb,var(--surface),transparent_8%)] px-[5.2vw] backdrop-blur-[18px] max-[760px]:h-16 max-[760px]:px-[17px] dark:border-[var(--border-color)] dark:bg-[var(--glass-bg)]">
        <a className="inline-flex items-center gap-[10px] text-[var(--ink)] no-underline [font-family:Manrope,sans-serif] text-[19px] font-extrabold tracking-[-1px] max-[760px]:text-[17px] dark:text-[var(--text-primary)] dark:font-sans" href="#" onClick={(event) => event.preventDefault()} aria-label="Daymark home">
          <span className="inline-grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-[var(--accent)] text-[19px] font-extrabold text-[#fffdfa] [font-family:Manrope,sans-serif] max-[760px]:h-7 max-[760px]:w-7 dark:font-sans">d</span>
          <span>daymark</span>
        </a>
        <div className="flex items-center gap-3 max-[760px]:gap-[7px]">
          <button className="flex h-10 w-[min(270px,34vw)] cursor-pointer items-center gap-[9px] rounded-[10px] border border-[var(--line)] bg-[var(--canvas)] px-3 text-left text-[13px] text-[var(--muted)] max-[760px]:h-[38px] max-[760px]:w-[38px] max-[760px]:justify-center max-[760px]:p-0" onClick={() => setShowSearch(true)} aria-label="Search tasks and notes" data-tooltip="Find a task or note">
            <Search size={17} /><span className="max-[760px]:hidden">Search</span><kbd className="ml-auto inline-flex items-center gap-[3px] rounded-[5px] border border-[var(--line)] bg-[var(--surface)] px-[6px] py-[3px] text-[10px] text-[var(--muted)] max-[760px]:hidden"><Command size={11} /> K</kbd>
          </button>
          <button
            className="inline-grid h-[38px] w-[38px] cursor-pointer place-items-center rounded-[10px] border border-transparent bg-transparent text-[var(--muted)] transition-all duration-150 hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--text-primary)]"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to Arctic Aurora dark theme'}
            data-tooltip={theme === 'dark' ? 'Switch to light theme' : 'Switch to Arctic Aurora dark theme'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="relative" ref={userMenuRef}>
            <button className="inline-grid h-[38px] w-[38px] cursor-pointer place-items-center rounded-full border border-transparent bg-[var(--green-soft)] text-[var(--green)] font-bold transition-all duration-150" onClick={() => setShowUserMenu(!showUserMenu)} aria-label="Account menu" data-tooltip="Account and installation options">
              {username?.slice(0, 1)?.toUpperCase() || 'U'}
            </button>
            <AnimatePresence>
              {showUserMenu && (
                <motion.div className="absolute right-0 top-[47px] z-20 grid w-[190px] gap-[10px] rounded-[13px] border border-[var(--line)] bg-[var(--surface)] p-3 text-[13px] text-[var(--ink)] shadow-[var(--shadow)] dark:border-[var(--border-color)] dark:bg-[var(--glass-bg)] dark:text-[var(--text-primary)] dark:backdrop-blur-[20px]" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}>
                  <strong className="overflow-hidden text-ellipsis px-[5px] py-1">{username}</strong>
                  {onInstall && (
                    <button
                      className="flex cursor-pointer items-start gap-2 border-0 border-t border-[var(--line)] bg-transparent px-[6px] py-[9px] text-left text-[var(--green)] hover:text-[var(--accent)]"
                      onClick={() => {
                        setShowUserMenu(false);
                        onInstall();
                      }}
                      aria-label="Install Daymark app"
                      data-tooltip="Install Daymark on this device"
                    >
                      <Download size={16} />
                      <span className="grid gap-[3px]"><strong className="p-0 text-[12px] text-[var(--ink)] dark:text-[var(--text-primary)]">Install Daymark</strong><small className="text-[10px] font-normal text-[var(--muted)]">Add it to your device</small></span>
                    </button>
                  )}
                  <button className="flex cursor-pointer items-center gap-2 border-0 border-t border-[var(--line)] bg-transparent px-[6px] py-[9px] text-left text-[var(--muted)] hover:text-[var(--accent)]" onClick={onLogout}><LogOut size={15} /> Sign out</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {showScrollTop && (
        <button
          className="fixed bottom-[max(24px,env(safe-area-inset-bottom))] right-[max(24px,env(safe-area-inset-right))] z-[30] grid h-11 w-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-[var(--accent-hover)] transition-[color,transform] duration-150 hover:-translate-y-0.5 hover:text-[var(--accent)] max-[760px]:right-[max(18px,env(safe-area-inset-right))] max-[760px]:bottom-[calc(82px+env(safe-area-inset-bottom))]"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          data-tooltip="Back to top"
        >
          <ArrowUp size={20} />
        </button>
      )}

      <AnimatePresence>
        {showSearch && (
          <motion.div className="fixed inset-0 z-50 block bg-[rgba(23,31,27,0.48)] px-5 pt-[min(15vh,130px)] pb-5 backdrop-blur-[4px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeSearch}>
            <motion.section className="mx-auto w-full max-w-[590px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-[14px] shadow-[0_24px_70px_rgba(15,23,18,0.2)] dark:border-[var(--border-color)] dark:bg-[var(--glass-bg)] dark:text-[var(--text-primary)] dark:backdrop-blur-[20px] max-[760px]:max-h-[calc(100dvh-24px)] max-[760px]:p-[18px]" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onClick={(event) => event.stopPropagation()} aria-label="Search Daymark">
              <div className="flex items-center gap-[10px] text-[var(--muted)]">
                <Search size={19} />
                <input className="h-[43px] min-w-0 flex-1 border-0 bg-transparent text-[14px] text-[var(--ink)] outline-none placeholder:text-[#9ba49d] dark:bg-[var(--bg-base)] dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)]" ref={inputRef} value={searchQuery} onChange={(event) => onSearch(event.target.value)} placeholder="Search tasks and notes…" aria-label="Search tasks and notes" />
                <button className="inline-grid h-[38px] w-[38px] cursor-pointer place-items-center rounded-[10px] border border-transparent bg-transparent text-[var(--muted)] transition-all duration-150 hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--text-primary)]" onClick={closeSearch} aria-label="Close search"><X size={18} /></button>
              </div>
              <div className="flex min-h-9 gap-[14px] border-t border-[var(--line)] px-[6px] pt-[11px] text-[10px] text-[var(--muted)] max-[420px]:flex-wrap">
                {searchQuery
                  ? <><span className="font-semibold text-[var(--green)]">{searchCounts.tasks} task{searchCounts.tasks === 1 ? '' : 's'}</span><span className="font-semibold text-[var(--green)]">{searchCounts.notes} note{searchCounts.notes === 1 ? '' : 's'}</span><span>Results update as you type</span></>
                  : <span>Type to find tasks by title or category and notes by title or content.</span>}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
