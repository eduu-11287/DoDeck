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
    <section className="calendar-layout">
      <div className="calendar-card">
        <div className="calendar-month">
          <h2>{monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
          <div className="calendar-controls">
            <button onClick={() => setMonthDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} aria-label="Go to current month" data-tooltip="Jump to this month">Today</button>
            <button onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
            <button onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-days">
          {cells.map(({ date, key, current }) => {
            const dayTasks = tasksByDate[key] || [];
            return (
              <button key={key} className={`calendar-day${!current ? ' outside-month' : ''}${key === todayKey ? ' today' : ''}${key === selectedKey ? ' selected' : ''}`} onClick={() => setSelectedKey(key)} aria-label={`${date.toLocaleDateString()}, ${dayTasks.length} tasks`} data-tooltip={`${date.toLocaleDateString()} · ${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'}`}>
                {date.getDate()}
                {dayTasks.length > 0 && <span className="calendar-indicators">{dayTasks.slice(0, 3).map((task) => <i key={task.id} className={!task.isActive ? 'done' : ''} />)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <section className="calendar-side-card">
          <h3>{selectedKey ? new Date(`${selectedKey}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Choose a day'}</h3>
          {selectedTasks.length ? selectedTasks.map((task) => (
            <button type="button" className={`calendar-task${!task.isActive ? ' calendar-task-done' : ''}`} key={task.id} onClick={() => onOpenItem(task.id)} aria-label={`Open task details: ${task.name}`}>
              {task.isActive ? <Circle size={14} /> : <Check size={14} />}
              <span>{task.name}</span>
            </button>
          )) : <p>{selectedKey ? 'Nothing scheduled for this day.' : 'Select a date to see its tasks.'}</p>}
        </section>
        <section className="calendar-side-card">
          <h3>At a glance</h3>
          <div className="calendar-stat-row"><span>Due today</span><strong>{todayTasks.length}</strong></div>
          <div className="calendar-stat-row"><span>Overdue</span><strong>{overdueTasks.length}</strong></div>
          <div className="calendar-stat-row"><span>Coming up</span><strong>{upcomingTasks.length}</strong></div>
          <div className="calendar-stat-row"><span>Completed</span><strong>{tasks.filter((task) => !task.isActive).length}</strong></div>
        </section>
      </div>
    </section>
  );
}
