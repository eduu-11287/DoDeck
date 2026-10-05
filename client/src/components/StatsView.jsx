import { useMemo } from 'react';
import { Award, Check, Flame, ListTodo } from 'lucide-react';

export default function StatsView({ tasks, streak }) {
  const completed = tasks.filter((task) => !task.isActive);
  const completionRate = tasks.length ? Math.round(completed.length / tasks.length * 100) : 0;
  const dueToday = tasks.filter((task) => task.isActive && task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString()).length;
  const categoryCounts = useMemo(() => {
    const counts = {};
    tasks.filter((task) => task.isActive).forEach((task) => {
      const category = task.category || 'Personal';
      counts[category] = (counts[category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [tasks]);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const count = completed.filter((task) => task.completedAt && new Date(task.completedAt).toDateString() === date.toDateString()).length;
    return { label: date.toLocaleDateString(undefined, { weekday: 'short' }), count };
  }), [completed]);
  const maxWeekCount = Math.max(1, ...week.map((day) => day.count));

  return (
    <section>
      <div className="stats-summary">
        <div className="stat-tile"><span><Check size={13} /> Completed</span><strong>{completed.length}</strong></div>
        <div className="stat-tile"><span><Flame size={13} /> Day streak</span><strong>{streak.current}</strong></div>
        <div className="stat-tile"><span><ListTodo size={13} /> Due today</span><strong>{dueToday}</strong></div>
        <div className="stat-tile"><span><Award size={13} /> Completion rate</span><strong>{completionRate}%</strong></div>
      </div>
      <div className="stats-grid">
        <section className="stats-card">
          <h3>Tasks completed this week</h3>
          <div className="week-chart" role="img" aria-label={`Tasks completed this week: ${week.map((day) => `${day.label} ${day.count}`).join(', ')}`}>
            {week.map((day) => (
              <div className="week-bar-group" key={day.label}>
                <div className="week-bar" style={{ height: `${Math.max(4, day.count / maxWeekCount * 92)}px` }} title={`${day.count} completed`} />
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="stats-card">
          <h3>Open by category</h3>
          {categoryCounts.length ? categoryCounts.map(([category, count]) => (
            <div className="category-row" key={category}>
              <div className="category-label"><span>{category}</span><span>{count}</span></div>
              <div className="category-track"><div className="category-fill" style={{ width: `${Math.round(count / Math.max(1, tasks.filter((task) => task.isActive).length) * 100)}%` }} /></div>
            </div>
          )) : <p className="page-subtitle">No open tasks to break down yet.</p>}
        </section>
      </div>
    </section>
  );
}
