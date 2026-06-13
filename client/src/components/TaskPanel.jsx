import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, Check, X, Circle, CheckCircle2, Clock, Calendar, Tag, Flame } from 'lucide-react';
import { fetchTasks, createTask, updateTask, deleteTask, fetchStreak } from '../api';

const MOODS = ['great', 'good', 'neutral', 'bad', 'terrible'];
const MOOD_EMOJIS = { great: '😊', good: '🙂', neutral: '😐', bad: '😟', terrible: '😢' };

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const formatDueDate = (dueDate, dueTime) => {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  let dateStr = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (dueTime) {
    const [h, m] = dueTime.split(':');
    const ampm = parseInt(h) >= 12 ? 'PM' : 'AM';
    dateStr += ` · ${parseInt(h) % 12 || 12}:${m} ${ampm}`;
  }
  return dateStr;
};

const isOverdue = (dueDate, isActive) => {
  if (!dueDate || !isActive) return false;
  return new Date(dueDate) < new Date();
};

export default function TaskPanel({
  username,
  tasks,
  streak,
  onTasksChange,
  onStreakChange,
  onLogout,
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [mood, setMood] = useState('good');

  useEffect(() => { refreshStreak(); }, [tasks]);

  const refreshStreak = async () => {
    try {
      const s = await fetchStreak();
      onStreakChange({ current: s.current_streak, broken: s.streak_broken });
    } catch (e) { console.error(e); }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.elements.namedItem('task-name').value;
    const category = form.elements.namedItem('task-category').value;
    const dueDate = form.elements.namedItem('task-due-date').value;
    const dueTime = form.elements.namedItem('task-due-time').value;
    if (!name) return;
    await createTask({ name, category: category || 'Uncategorized', dueDate: dueDate || null, dueTime: dueTime || null });
    onTasksChange(await fetchTasks());
    setShowModal(false);
    form.reset();
  };

  const handleToggleTask = async (task) => {
    await updateTask(task.id, { isActive: !task.isActive });
    onTasksChange(await fetchTasks());
  };

  const handleDeleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(id);
    onTasksChange(await fetchTasks());
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditForm({
      name: task.name,
      category: task.category || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      dueTime: task.dueTime || '',
    });
  };

  const saveEdit = async (task) => {
    await updateTask(task.id, { name: editForm.name, category: editForm.category, dueDate: editForm.dueDate || null, dueTime: editForm.dueTime || null });
    setEditingId(null);
    onTasksChange(await fetchTasks());
  };

  const activeTasks = tasks.filter((t) => t.isActive);
  const completedTasks = tasks.filter((t) => !t.isActive);

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="mb-8"
      >
        <div className="text-xs font-bold uppercase tracking-[2px] text-indigo-600 dark:text-indigo-400 mb-1">{getTimeGreeting()}</div>
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">{username}</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Let's make today count. {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''} waiting.</p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {[
          { icon: Flame, label: 'Day Streak', value: streak.current, color: streak.broken ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400', bg: streak.broken ? 'bg-rose-500/10' : 'bg-emerald-500/10' },
          { icon: Clock, label: 'Tasks Left', value: activeTasks.length, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
          { icon: CheckCircle2, label: 'Completed', value: completedTasks.length, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden group"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            whileHover={{ y: -4, transition: { duration: 0.3 } }}
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div className={`text-3xl font-extrabold ${stat.color} tracking-tight`}>{stat.value}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">{stat.label}</div>
            <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl mix-blend-overlay ${stat.bg} opacity-60`} />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">How are you feeling today?</div>
        <div className="flex gap-2">
          {MOODS.map((m) => (
            <motion.button
              key={m}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setMood(m)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all duration-300 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200 dark:border-slate-700 ${
                mood === m
                  ? 'bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border-indigo-400/50 shadow-md scale-110'
                  : 'hover:border-indigo-400/30'
              }`}
            >
              {MOOD_EMOJIS[m]}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {tasks.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center py-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center mb-4"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Plus size={32} className="text-indigo-600 dark:text-indigo-400" />
          </motion.div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No tasks yet</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Click the + button below to create your first task.</p>
        </motion.div>
      ) : (
        <div className="space-y-3 mb-24">
          <AnimatePresence>
            {activeTasks.map((task, index) => (
              <motion.div
                key={task.id}
                className={`bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden group ${
                  isOverdue(task.dueDate, task.isActive) ? 'border-rose-500/30' : ''
                }`}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ delay: index * 0.04, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                whileHover={{ y: -2, transition: { duration: 0.3 } }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-600 rounded-l-2xl" />

                {editingId === task.id ? (
                  <div className="pl-5 space-y-3">
                    <input
                      className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Task name"
                    />
                    <input
                      className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      placeholder="Category"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(task)} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold hover:shadow-lg transition-all">
                        <Check size={14} className="inline mr-1" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all">
                        <X size={14} className="inline mr-1" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3 pl-3">
                      <label className="relative mt-0.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!task.isActive}
                          onChange={() => handleToggleTask(task)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-300 flex items-center justify-center ${
                            task.isActive
                              ? 'border-indigo-400 bg-transparent hover:border-indigo-500'
                              : 'border-transparent bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20'
                          }`}>
                          {!task.isActive && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                      </label>

                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm transition-all duration-300 ${
                          !task.isActive ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {task.name}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {task.category && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-400/30">
                              {task.category}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className={`text-[11px] font-medium flex items-center gap-1 ${
                              isOverdue(task.dueDate, task.isActive) ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                            }`}>
                              <Calendar size={11} />
                              {formatDueDate(task.dueDate, task.dueTime)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 mt-3 pl-8 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button
                        onClick={() => startEditing(task)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                      >
                        <Edit3 size={13} className="inline mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      >
                        <Trash2 size={13} className="inline mr-1" /> Delete
                      </button>
                    </div>
                  </>
                )}

                <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400/10 to-violet-400/10 blur-xl mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
            ))}
          </AnimatePresence>

          {completedTasks.length > 0 && (
            <>
              <div className="pt-6 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-[2px] text-slate-500 dark:text-slate-400">
                  Completed ({completedTasks.length})
                </span>
              </div>
              <AnimatePresence>
                {completedTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-4 shadow-xl relative overflow-hidden opacity-70 hover:opacity-100 transition-all duration-300"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-400 rounded-l-2xl" />
                    <div className="flex items-start gap-3 pl-3">
                      <label className="relative mt-0.5 cursor-pointer">
                        <input type="checkbox" checked={!task.isActive} onChange={() => handleToggleTask(task)} className="sr-only" />
                        <div className="w-5 h-5 rounded-md border-2 border-transparent bg-gradient-to-br from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 size={12} className="text-white" />
                        </div>
                      </label>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-500 dark:text-slate-400 line-through">{task.name}</p>
                        {task.category && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 mt-1.5 inline-block">
                            {task.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}
        </div>
      )}

      <motion.button
        onClick={() => setShowModal(true)}
        whileHover={{ scale: 1.08, rotate: 90 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 flex items-center justify-center z-40"
      >
        <Plus size={26} />
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.form
              onSubmit={handleAddTask}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">New Task</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-5">Add a task</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mb-1.5">Task Name</label>
                  <input name="task-name" placeholder="What needs to be done?" required autoFocus className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mb-1.5">Category</label>
                  <select name="task-category" className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all">
                    <option value="">None</option>
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Health">Health</option>
                    <option value="Learning">Learning</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mb-1.5">Due Date</label>
                    <input name="task-due-date" type="date" className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mb-1.5">Due Time</label>
                    <input name="task-due-time" type="time" className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 mt-6 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                  Create Task
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}