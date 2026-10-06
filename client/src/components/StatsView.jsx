import { useMemo, useState } from 'react';
import { Award, Check, Flame, ListTodo } from 'lucide-react';
import DropdownSelect from './DropdownSelect';

export default function StatsView({ tasks, streak }) {
  const [rangeDays, setRangeDays] = useState(7);
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
  const completionBuckets = useMemo(() => {
    const intervalDays = rangeDays === 7 ? 1 : 7;
    const bucketCount = Math.ceil(rangeDays / intervalDays);
    const firstDay = new Date();
    firstDay.setHours(0, 0, 0, 0);
    firstDay.setDate(firstDay.getDate() - rangeDays + 1);
    return Array.from({ length: bucketCount }, (_, index) => {
      const start = new Date(firstDay);
      start.setDate(firstDay.getDate() + index * intervalDays);
      const end = new Date(start);
      end.setDate(start.getDate() + intervalDays - 1);
      end.setHours(23, 59, 59, 999);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      if (end > todayEnd) end.setTime(todayEnd.getTime());
      const count = completed.filter((task) => {
        if (!task.completedAt) return false;
        const completedAt = new Date(task.completedAt);
        return completedAt >= start && completedAt <= end;
      }).length;
      return {
        label: intervalDays === 1
          ? end.toLocaleDateString(undefined, { weekday: 'short' })
          : `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        count,
      };
    });
  }, [completed, rangeDays]);
  const maxBucketCount = Math.max(1, ...completionBuckets.map((day) => day.count));
  const completedInRange = completionBuckets.reduce((sum, day) => sum + day.count, 0);

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
          <div className="stats-chart-heading">
            <div><h3>Tasks completed</h3><p>{completedInRange} in the last {rangeDays} days</p></div>
            <label className="stats-range"><span className="sr-only">Insight date range</span><DropdownSelect id="stats-range" className="stats-range-trigger" label="Insight date range" value={String(rangeDays)} onChange={(days) => setRangeDays(Number(days))} options={[7, 30, 90].map((days) => ({ value: String(days), label: `${days} days` }))} /></label>
          </div>
          <div className={`week-chart${rangeDays > 7 ? ' extended-chart' : ''}`} role="img" aria-label={`Tasks completed in the last ${rangeDays} days: ${completionBuckets.map((day) => `${day.label} ${day.count}`).join(', ')}`}>
            {completionBuckets.map((day, index) => (
              <div className="week-bar-group" key={`${day.label}-${index}`}>
                <div className="week-bar" style={{ height: `${Math.max(4, day.count / maxBucketCount * 92)}px` }} data-tooltip={`${day.count} completed`} />
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
