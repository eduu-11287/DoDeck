import { CalendarDays, CheckSquare2, NotebookPen, ChartNoAxesColumnIncreasing } from 'lucide-react';

const items = [
  { id: 'today', icon: CheckSquare2, label: 'My day' },
  { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
  { id: 'notes', icon: NotebookPen, label: 'Notes' },
  { id: 'stats', icon: ChartNoAxesColumnIncreasing, label: 'Insights' },
];

export default function Sidebar({ activeTab, setActiveTab, taskCount, mobile = false }) {
  return (
    <aside className={mobile ? 'side-nav side-nav-mobile' : 'side-nav'}>
      {!mobile && <p className="nav-label">WORKSPACE</p>}
      <nav aria-label="Workspace">
        {items.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`nav-item${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? 'page' : undefined}
            aria-label={label}
          >
            <Icon size={18} strokeWidth={activeTab === id ? 2.2 : 1.8} />
            <span>{label}</span>
            {id === 'today' && taskCount > 0 && <span className="nav-count">{taskCount}</span>}
          </button>
        ))}
      </nav>
      {!mobile && (
        <div className="sidebar-note">
          <span className="sidebar-note-icon">✳</span>
          <strong>Make room for what matters.</strong>
          <span>One thing at a time is enough.</span>
        </div>
      )}
    </aside>
  );
}
