import { CalendarDays, CheckSquare2, ChevronLeft, ChevronRight, NotebookPen, ChartNoAxesColumnIncreasing } from 'lucide-react';

const items = [
  { id: 'today', icon: CheckSquare2, label: 'My day' },
  { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
  { id: 'notes', icon: NotebookPen, label: 'Notes' },
  { id: 'stats', icon: ChartNoAxesColumnIncreasing, label: 'Insights' },
];

export default function Sidebar({ activeTab, setActiveTab, taskCount, collapsed = false, onToggleCollapsed, mobile = false }) {
  const asideClass = mobile
    ? 'static w-full'
    : 'fixed left-0 top-[76px] bottom-0 z-[5] flex h-auto min-h-0 max-h-none flex-col border-0 border-r border-[var(--line)] bg-[var(--glass-bg)] pt-7 pb-5 shadow-none backdrop-blur-[20px] transition-all duration-300 max-[1050px]:left-4 max-[760px]:!hidden dark:border-[var(--border-color)] dark:bg-[var(--glass-bg)]';
  const navClass = mobile
    ? 'grid grid-cols-4 gap-[3px]'
    : 'grid gap-[6px]';
  const navItemClass = mobile
    ? 'relative flex min-h-[54px] min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-[9px] px-[2px] py-[5px] text-[10px] font-semibold text-[var(--muted)] transition-all duration-300 hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--text-primary)]'
    : 'group relative flex min-h-[47px] w-full cursor-pointer items-center justify-start gap-[10px] overflow-hidden rounded-xl py-[3px] text-left text-[13px] font-semibold text-[var(--muted)] transition-all duration-300 hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] dark:text-[var(--text-secondary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--text-primary)] before:absolute before:inset-y-[10px] before:left-0 before:w-1 before:rounded-[0_4px_4px_0] before:bg-[var(--accent)] before:shadow-[0_0_10px_var(--accent-cyan)] before:opacity-0 before:scale-y-[.4] before:transition-all before:duration-300 before:content-[\'\']';

  return (
    <aside
      className={`${asideClass} ${mobile ? 'side-nav-mobile' : `side-nav-dock ${collapsed ? 'collapsed w-[76px] px-3' : 'w-[220px] px-4'}`}`}
    >
      {!mobile && (
        <p
          className={`overflow-hidden whitespace-nowrap text-[10px] font-bold tracking-[1.4px] text-[var(--muted)] transition-[height,opacity,margin] duration-150 ${
            collapsed ? 'm-0 h-0 p-0 opacity-0' : 'mt-[2px] mb-2 ml-3 h-[22px]'
          }`}
        >
          WORKSPACE
        </p>
      )}
      <nav aria-label="Workspace" className={navClass}>
        {items.map(({ id, icon: Icon, label }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              className={`nav-item ${navItemClass} ${
                mobile
                  ? active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-hover)] dark:text-[var(--accent-cyan)]'
                    : ''
                  : `${
                      collapsed ? 'justify-center px-[3px]' : 'px-2'
                    } ${
                      active
                        ? 'bg-[rgba(6,182,212,0.15)] text-[var(--accent)] before:opacity-100 before:scale-y-100 dark:text-[var(--accent-cyan)]'
                        : ''
                    }`
              }`}
              onClick={() => setActiveTab(id)}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              data-tooltip={label}
            >
              <span
                className={`${
                  mobile
                    ? 'contents'
                    : `!flex-[0_0_35px] grid h-[35px] w-[35px] place-items-center rounded-[10px] text-[var(--muted)] transition-[color,background] duration-200 group-hover:bg-[var(--surface)] group-hover:text-[var(--ink)] ${
                        active
                          ? 'bg-[color-mix(in_srgb,var(--accent-soft),var(--surface)_14%)] text-[var(--accent-hover)] dark:bg-[rgba(6,182,212,0.1)] dark:text-[var(--accent-cyan)]'
                          : 'bg-transparent'
                      }`
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              </span>
              <span
                className={`${
                  mobile
                    ? 'w-auto flex-[0_0_auto]'
                    : `min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap transition-[width,flex-basis,opacity,transform] duration-200 ${
                        collapsed ? 'sr-only' : ''
                      }`
                }`}
              >
                {label}
              </span>
              {id === 'today' && taskCount > 0 && (
                <span
                  className={`inline-grid place-items-center rounded-[7px] ${
                    mobile
                      ? 'absolute top-px right-[13%] h-[15px] min-w-[15px] bg-[var(--surface)] px-[3px] text-[8px] text-[var(--muted)] dark:bg-[rgba(255,255,255,0.05)] dark:text-[var(--text-secondary)]'
                      : collapsed
                        ? 'absolute top-1 right-[5px] h-2 w-2 min-w-2 rounded-full border border-[var(--surface)] bg-[var(--accent)] p-0 text-[11px] text-[var(--muted)]'
                        : 'h-[21px] min-w-[21px] bg-[var(--surface)] px-[6px] text-[11px] text-[var(--muted)] dark:bg-[rgba(255,255,255,0.05)] dark:text-[var(--text-secondary)]'
                  }`}
                >
                  {taskCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {!mobile && (
        <button
          className={`dock-toggle mt-[9px] flex h-[39px] w-full cursor-pointer flex-[0_0_auto] items-center justify-start gap-[10px] rounded-b-[10px] border border-transparent text-[var(--muted)] transition-all duration-300 hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--text-primary)] ${
            collapsed ? 'justify-center border-t-transparent px-0' : 'border-t-[color-mix(in_srgb,var(--line),transparent_15%)] px-3'
          }`}
          type="button"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-pressed={!collapsed}
          data-tooltip={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          <span className={`flex-1 overflow-hidden whitespace-nowrap text-left text-[11px] font-semibold ${collapsed ? 'sr-only' : ''}`}>
            {collapsed ? 'Expand navigation' : 'Collapse navigation'}
          </span>
        </button>
      )}
    </aside>
  );
}
