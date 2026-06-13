import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, CheckCircle2, Circle } from 'lucide-react';

export default function CalendarView({ tasks }) {
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskDates = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        if (isNaN(d.getTime())) return;
        const dateKey = d.toISOString().split('T')[0];
        if (!map[dateKey]) map[dateKey] = { total: 0, completed: 0, tasks: [] };
        map[dateKey].total += 1;
        if (!task.isActive) map[dateKey].completed += 1;
        map[dateKey].tasks.push(task);
      }
    });
    return map;
  }, [tasks]);

  const selectedDateKey = selectedDate ? selectedDate.toISOString().split('T')[0] : null;
  const selectedTasks = selectedDateKey ? (taskDates[selectedDateKey]?.tasks || []) : [];

  const renderCalendar = () => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();
    const startDay = first.getDay();
    const prevMonthLast = new Date(year, month, 0).getDate();

    const cells = [];
    const prevDate = new Date(year, month - 1, 1);
    const nextDate = new Date(year, month + 1, 1);

    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const date = new Date(prevDate.getFullYear(), prevDate.getMonth(), d);
      const dateKey = date.toISOString().split('T')[0];
      const hasTask = !!taskDates[dateKey];
      cells.push({ day: d, date, dateKey, isCurrentMonth: false, hasTask });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateKey = date.toISOString().split('T')[0];
      const isToday = date.getTime() === today.getTime();
      const hasTask = !!taskDates[dateKey];
      cells.push({ day: d, date, dateKey, isCurrentMonth: true, isToday, hasTask });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(nextDate.getFullYear(), nextDate.getMonth(), d);
      const dateKey = date.toISOString().split('T')[0];
      const hasTask = !!taskDates[dateKey];
      cells.push({ day: d, date, dateKey, isCurrentMonth: false, hasTask });
    }
    return cells;
  };

  const cells = renderCalendar();

  const goToPrevMonth = () => {
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    setMonthDate(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDate(t);
  };

  const weekDaysShort = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const activeTasksToday = tasks.filter(t => t.isActive && t.dueDate && new Date(t.dueDate).toDateString() === today.toDateString());
  const overdueTasks = tasks.filter(t => t.isActive && t.dueDate && new Date(t.dueDate) < today);
  const upcomingTasks = tasks.filter(t => t.isActive && t.dueDate && new Date(t.dueDate) >= today);

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="mb-8"
      >
        <div className="text-xs font-bold uppercase tracking-[2px] text-indigo-600 dark:text-indigo-400 mb-1">Plan</div>
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Calendar</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Overview of your scheduled tasks.</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div
          className="xl:col-span-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-3xl shadow-xl relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br from-indigo-500/12 to-violet-500/10 blur-2xl mix-blend-overlay animate-float" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-gradient-to-tr from-cyan-500/8 to-indigo-500/6 blur-2xl mix-blend-color-dodge animate-float-delayed" />

          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={goToPrevMonth}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <ChevronLeft size={20} />
              </motion.button>

              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  onClick={goToToday}
                  className="text-[10px] font-bold uppercase tracking-[1.5px] text-indigo-600 dark:text-indigo-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors mt-0.5"
                >
                  Today
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={goToNextMonth}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100/60 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <ChevronRight size={20} />
              </motion.button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {weekDaysShort.map((day, i) => (
                <div key={day} className="text-center py-2">
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${i === 0 || i === 6 ? 'text-rose-600/80 dark:text-rose-400/80' : 'text-slate-500 dark:text-slate-400'}`}>
                    {day}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              <AnimatePresence mode="popLayout">
                {cells.map((cell, i) => {
                  const isToday = cell.isToday;
                  const isSelected = cell.dateKey === selectedDateKey;
                  const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
                  const taskData = taskDates[cell.dateKey];

                  let dayClass = 'h-12 sm:h-14 flex flex-col items-center justify-center rounded-xl text-sm font-semibold relative cursor-pointer transition-all duration-300 ';
                  if (!cell.isCurrentMonth) {
                    dayClass += 'text-slate-500/40 dark:text-slate-400/40 cursor-default ';
                  } else if (isSelected) {
                    dayClass += 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 scale-105 ';
                  } else if (isToday) {
                    dayClass += 'bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-400/30 shadow-sm shadow-indigo-500/10 ';
                  } else if (isWeekend) {
                    dayClass += 'text-rose-600/80 dark:text-rose-400/80 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 ';
                  } else {
                    dayClass += 'text-slate-900 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40 hover:shadow-sm ';
                  }

                  return (
                    <motion.div
                      key={`${cell.dateKey}-${monthDate.getMonth()}`}
                      className={dayClass}
                      onClick={() => cell.isCurrentMonth && setSelectedDate(cell.date)}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.012, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                      whileHover={cell.isCurrentMonth && !isSelected ? { scale: 1.08, y: -2 } : {}}
                      whileTap={cell.isCurrentMonth ? { scale: 0.93 } : {}}
                    >
                      <span className="relative z-10 text-sm">{cell.day}</span>

                      {taskData && cell.isCurrentMonth && (
                        <div className="flex gap-0.5 mt-1 relative z-10">
                          {taskData.completed > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" title={`${taskData.completed} done`} />
                          )}
                          {taskData.total - taskData.completed > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" title={`${taskData.total - taskData.completed} pending`} />
                          )}
                        </div>
                      )}

                      {isToday && !isSelected && (
                        <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {selectedDate && (
              <motion.div
                key="selected"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-indigo-600 dark:text-indigo-400 mb-1">
                      Selected
                    </div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                      {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <CalendarDays size={20} />
                  </div>
                </div>

                {selectedTasks.length > 0 ? (
                  <div className="space-y-2.5">
                    {selectedTasks.map(task => (
                      <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <div className="mt-0.5">
                          {task.isActive
                            ? <Circle size={14} className="text-indigo-500/60 dark:text-indigo-400/60" />
                            : <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />
                          }
                        </div>
                        <span className={`text-sm font-medium ${task.isActive ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 line-through'}`}>
                          {task.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-3">No tasks scheduled</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-xl"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mb-4">Quick Stats</div>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Clock size={16} />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Today</span>
                </div>
                <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{activeTasksToday.length}</span>
              </div>
              {overdueTasks.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <Clock size={16} />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Overdue</span>
                  </div>
                  <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400">{overdueTasks.length}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <CalendarDays size={16} />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Upcoming</span>
                </div>
                <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{upcomingTasks.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</span>
                </div>
                <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{tasks.filter(t => !t.isActive).length}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-xl"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mb-3.5">Legend</div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Pending tasks</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Completed tasks</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 dark:bg-rose-400/80" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Weekend days</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-md bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-400/30" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Today</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}