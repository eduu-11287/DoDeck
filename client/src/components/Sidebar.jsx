import { CalendarDays, CheckSquare2, ChevronLeft, ChevronRight, NotebookPen, ChartNoAxesColumnIncreasing } from 'lucide-react';

const items = [
  { id: 'today', icon: CheckSquare2, label: 'My day' },
  { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
  { id: 'notes', icon: NotebookPen, label: 'Notes' },
  { id: 'stats', icon: ChartNoAxesColumnIncreasing, label: 'Insights' },
];

export default function Sidebar({ activeTab, setActiveTab, taskCount, collapsed = false, onToggleCollapsed, mobile = false }) {
  const dockClass = `side-nav${mobile ? ' side-nav-mobile' : ` side-nav-dock${collapsed ? ' collapsed' : ''}`}`;

  return (
    <aside className={dockClass}>
      {!mobile && <p className="nav-label">WORKSPACE</p>}
      <nav aria-label="Workspace">
        {items.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`nav-item${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? 'page' : undefined}
            aria-label={label}
            data-tooltip={label}
          >
            <span className="nav-icon"><Icon size={18} strokeWidth={activeTab === id ? 2.2 : 1.8} /></span>
            <span className="nav-item-label">{label}</span>
            {id === 'today' && taskCount > 0 && <span className="nav-count">{taskCount}</span>}
          </button>
        ))}
      </nav>
      {!mobile && (
        <button
            className="dock-toggle"
            type="button"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-pressed={!collapsed}
            data-tooltip={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            onClick={onToggleCollapsed}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            <span>{collapsed ? 'Expand navigation' : 'Collapse navigation'}</span>
        </button>
      )}
    </aside>
  );
}
