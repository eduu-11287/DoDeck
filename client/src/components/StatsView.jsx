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
      <div className="mb-[13px] grid grid-cols-4 gap-[9px] max-[760px]:grid-cols-2">
        <div className="rounded-[11px] border border-[color-mix(in_srgb,var(--line),transparent_10%)] bg-[var(--surface)] p-[14px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)]"><span className="block text-[10px] text-[var(--muted)]"><Check size={13} /> Completed</span><strong className="mt-[7px] block font-['Manrope',sans-serif] text-[22px] font-bold dark:font-sans dark:text-[var(--text-primary)]">{completed.length}</strong></div>
        <div className="rounded-[11px] border border-[color-mix(in_srgb,var(--line),transparent_10%)] bg-[var(--surface)] p-[14px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)]"><span className="block text-[10px] text-[var(--muted)]"><Flame size={13} /> Day streak</span><strong className="mt-[7px] block font-['Manrope',sans-serif] text-[22px] font-bold dark:font-sans dark:text-[var(--text-primary)]">{streak.current}</strong></div>
        <div className="rounded-[11px] border border-[color-mix(in_srgb,var(--line),transparent_10%)] bg-[var(--surface)] p-[14px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)]"><span className="block text-[10px] text-[var(--muted)]"><ListTodo size={13} /> Due today</span><strong className="mt-[7px] block font-['Manrope',sans-serif] text-[22px] font-bold dark:font-sans dark:text-[var(--text-primary)]">{dueToday}</strong></div>
        <div className="rounded-[11px] border border-[color-mix(in_srgb,var(--line),transparent_10%)] bg-[var(--surface)] p-[14px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)]"><span className="block text-[10px] text-[var(--muted)]"><Award size={13} /> Completion rate</span><strong className="mt-[7px] block font-['Manrope',sans-serif] text-[22px] font-bold dark:font-sans dark:text-[var(--text-primary)]">{completionRate}%</strong></div>
      </div>
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(200px,.9fr)] items-start gap-[14px] max-[760px]:grid-cols-1">
        <section className="mt-[13px] rounded-[13px] border border-[color-mix(in_srgb,var(--line),transparent_10%)] bg-[color-mix(in_srgb,var(--surface),transparent_9%)] p-[19px] backdrop-blur-[12px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)] max-[760px]:p-[14px]">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="m-0 font-['Manrope',sans-serif] text-[13px] font-bold dark:font-sans">Tasks completed</h3><p className="mt-[5px] mb-0 text-[10px] text-[var(--muted)]">{completedInRange} in the last {rangeDays} days</p></div>
            <label className="m-0"><span className="sr-only">Insight date range</span><DropdownSelect id="stats-range" className="min-h-10 h-10 w-auto min-w-[120px] px-2 text-[10px]" label="Insight date range" value={String(rangeDays)} onChange={(days) => setRangeDays(Number(days))} options={[7, 30, 90].map((days) => ({ value: String(days), label: `${days} days` }))} /></label>
          </div>
          <div className="flex min-h-[140px] items-end justify-around gap-[10px] border-b border-[var(--line)] px-[6px] pt-[15px]" role="img" aria-label={`Tasks completed in the last ${rangeDays} days: ${completionBuckets.map((day) => `${day.label} ${day.count}`).join(', ')}`}>
            {completionBuckets.map((day, index) => (
              <div className={`flex h-[125px] min-w-0 flex-1 flex-col items-center justify-end gap-[6px] text-[9px] text-[var(--muted)] ${rangeDays > 7 ? 'text-[8px]' : ''}`} key={`${day.label}-${index}`}>
                <div className="min-h-[3px] w-[min(25px,75%)] rounded-t-[5px] bg-[#e9a084] dark:bg-[var(--accent-cyan)] dark:shadow-[0_0_10px_rgba(6,182,212,.3)]" style={{ height: `${Math.max(4, day.count / maxBucketCount * 92)}px` }} data-tooltip={`${day.count} completed`} />
                <span className="pb-[6px]">{day.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-[13px] rounded-[13px] border border-[color-mix(in_srgb,var(--line),transparent_10%)] bg-[color-mix(in_srgb,var(--surface),transparent_9%)] p-[19px] backdrop-blur-[12px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)] max-[760px]:p-[14px]">
          <h3 className="mb-[13px] mt-0 font-['Manrope',sans-serif] text-[13px] font-bold dark:font-sans">Open by category</h3>
          {categoryCounts.length ? categoryCounts.map(([category, count]) => (
            <div className="my-3" key={category}>
              <div className="mb-[6px] flex justify-between text-[11px] text-[var(--muted)]"><span>{category}</span><span>{count}</span></div>
              <div className="h-[7px] overflow-hidden rounded-lg bg-[var(--surface-muted)] dark:bg-transparent"><div className="h-full rounded-[inherit] bg-[var(--green)] dark:bg-[var(--accent-blue)]" style={{ width: `${Math.round(count / Math.max(1, tasks.filter((task) => task.isActive).length) * 100)}%` }} /></div>
            </div>
          )) : <p className="page-subtitle">No open tasks to break down yet.</p>}
        </section>
      </div>
    </section>
  );
}
