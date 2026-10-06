import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Circle } from 'lucide-react';

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function CalendarView({ tasks, onOpenItem }) {
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(dateKey(new Date()));
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const todayKey = dateKey(new Date());

  const tasksByDate = useMemo(() => {
    const grouped = {};
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = dateKey(new Date(task.dueDate));
      grouped[key] = [...(grouped[key] || []), task];
    });
    return grouped;
  }, [tasks]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - firstWeekday + 1);
    return { date, key: dateKey(date), current: date.getMonth() === month };
  });
  const selectedTasks = tasksByDate[selectedKey] || [];
  const openTasks = tasks.filter((task) => task.isActive && task.dueDate);
  const todayTasks = (tasksByDate[todayKey] || []).filter((task) => task.isActive);
  const overdueTasks = openTasks.filter((task) => new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0)));
  const upcomingTasks = openTasks.filter((task) => new Date(task.dueDate) >= new Date(new Date().setHours(0, 0, 0, 0)));

  const changeMonth = (delta) => {
    setMonthDate(new Date(year, month + delta, 1));
    setSelectedKey('');
  };

  return (
    <section className="grid grid-cols-[minmax(0,1.6fr)_minmax(200px,.9fr)] items-start gap-[14px] max-[760px]:grid-cols-1">
      <div className="min-w-0 rounded-[13px] border border-[color-mix(in_srgb,var(--line),transparent_10%)] bg-[color-mix(in_srgb,var(--surface),transparent_9%)] p-[19px] backdrop-blur-[12px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)] max-[760px]:p-[14px]">
        <div className="mb-[14px] flex items-center justify-between">
          <h2 className="m-0 font-['Manrope',sans-serif] text-[17px] font-bold dark:font-sans">{monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <div className="flex gap-[5px]">
            <button className="grid h-[31px] w-[31px] place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)]" onClick={() => setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} aria-label="Go to current month" data-tooltip="Jump to this month">Today</button>
            <button className="grid h-[31px] w-[31px] place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)]" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
            <button className="grid h-[31px] w-[31px] place-items-center rounded-lg border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)]" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span className="px-0 py-2 text-center text-[10px] font-bold text-[var(--muted)]" key={day}>{day}</span>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map(({ date, key, current }) => {
            const dayTasks = tasksByDate[key] || [];
            return (
              <button key={key} className={`flex min-h-14 flex-col items-center justify-center gap-[5px] rounded-lg border border-transparent bg-transparent px-[3px] py-[6px] !text-[12px] !text-[var(--ink)] hover:bg-[var(--surface-muted)] max-[760px]:min-h-[38px] max-[760px]:px-px max-[760px]:py-[3px] max-[760px]:!text-[11px] ${key === selectedKey ? `bg-[var(--green)] !text-white dark:bg-[var(--accent-blue)] ${key === todayKey ? 'border-[var(--accent)] dark:border-[var(--accent-cyan)]' : ''}` : key === todayKey ? 'border-[var(--accent)] !font-bold !text-[var(--accent-hover)] dark:border-[var(--accent-cyan)] dark:!text-[var(--accent-cyan)]' : !current ? '!text-[#b8beb8]' : ''}`} onClick={() => setSelectedKey(key)} aria-label={`${date.toLocaleDateString()}, ${dayTasks.length} tasks`} data-tooltip={`${date.toLocaleDateString()} · ${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'}`}>
                {date.getDate()}
                {dayTasks.length > 0 && <span className="flex gap-[3px]">{dayTasks.slice(0, 3).map((task) => <i key={task.id} className={`h-1 w-1 rounded-full bg-[var(--accent)] dark:bg-[var(--accent-cyan)] ${!task.isActive ? 'bg-[#77a084] dark:bg-[var(--accent-blue)]' : ''}`} />)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3">
        <section className="rounded-[13px] border border-[color-mix(in_srgb,var(--line),transparent_10%)] bg-[color-mix(in_srgb,var(--surface),transparent_9%)] p-[19px] backdrop-blur-[12px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)] max-[760px]:p-[14px]">
          <h3 className="mb-[13px] mt-0 font-['Manrope',sans-serif] text-[13px] font-bold dark:font-sans">{selectedKey ? new Date(`${selectedKey}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Choose a day'}</h3>
          {selectedTasks.length ? selectedTasks.map((task) => (
            <button type="button" className={`flex w-full items-center gap-2 border-0 border-t border-[var(--line)] bg-transparent py-[9px] text-left !text-[11px] !text-[var(--ink)] ${task.isActive ? 'hover:!text-[var(--accent-hover)]' : '!text-[var(--muted)] line-through'} first-of-type:border-t-0`} key={task.id} onClick={() => onOpenItem(task.id)} aria-label={`Open task details: ${task.name}`}>
              {task.isActive ? <Circle size={14} /> : <Check size={14} />}
              <span>{task.name}</span>
            </button>
          )) : <p className="m-0 text-[11px] text-[var(--muted)]">{selectedKey ? 'Nothing scheduled for this day.' : 'Select a date to see its tasks.'}</p>}
        </section>
        <section className="rounded-[13px] border border-[color-mix(in_srgb,var(--line),transparent_10%)] bg-[color-mix(in_srgb,var(--surface),transparent_9%)] p-[19px] backdrop-blur-[12px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)] max-[760px]:p-[14px]">
          <h3 className="mb-[13px] mt-0 font-['Manrope',sans-serif] text-[13px] font-bold dark:font-sans">At a glance</h3>
          <div className="flex justify-between py-2 text-[11px] text-[var(--muted)]"><span>Due today</span><strong className="text-[var(--ink)] dark:text-[var(--text-primary)]">{todayTasks.length}</strong></div>
          <div className="flex justify-between py-2 text-[11px] text-[var(--muted)]"><span>Overdue</span><strong className="text-[var(--ink)] dark:text-[var(--text-primary)]">{overdueTasks.length}</strong></div>
          <div className="flex justify-between py-2 text-[11px] text-[var(--muted)]"><span>Coming up</span><strong className="text-[var(--ink)] dark:text-[var(--text-primary)]">{upcomingTasks.length}</strong></div>
          <div className="flex justify-between py-2 text-[11px] text-[var(--muted)]"><span>Completed</span><strong className="text-[var(--ink)] dark:text-[var(--text-primary)]">{tasks.filter((task) => !task.isActive).length}</strong></div>
        </section>
      </div>
    </section>
  );
}
