import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { ArrowUpRight, CalendarDays, Check, ChevronDown, Circle, Clock3, Flame, Pencil, Plus, Trash2, X } from 'lucide-react';
import { createTask, deleteTask, fetchStreak, fetchTasks, updateTask } from '../api';
import { DatePicker, TimePicker } from './DateTimePickers';
import HighlightedText from './HighlightedText';

const priorityLabels = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' };

function TaskFilter({ label, value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const filterId = useId();
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return undefined;

    const positionMenu = () => {
      const bounds = triggerRef.current.getBoundingClientRect();
      const width = Math.min(Math.max(bounds.width, 180), window.innerWidth - 24);
      const height = Math.min(options.length * 42, 280, window.innerHeight - 24);
      const left = Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12));
      const spaceBelow = window.innerHeight - bounds.bottom;
      const top = spaceBelow >= height + 12
        ? bounds.bottom + 6
        : Math.max(12, bounds.top - height - 6);
      setMenuPosition({ top, left, width, maxHeight: Math.min(280, window.innerHeight - 24) });
    };
    const closeOnOutsidePointer = (event) => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const closeOnScroll = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };

    positionMenu();
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', positionMenu);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', positionMenu);
    };
  }, [isOpen, options.length]);

  useEffect(() => {
    if (isOpen) menuRef.current?.querySelector('[aria-selected="true"]')?.focus();
  }, [isOpen]);

  const handleEscape = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  const moveOptionFocus = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const optionButtons = [...(menuRef.current?.querySelectorAll('[role="option"]') || [])];
    const currentIndex = optionButtons.indexOf(document.activeElement);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? optionButtons.length - 1
        : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + optionButtons.length) % optionButtons.length;
    optionButtons[nextIndex]?.focus();
  };

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="task-filter-field">
      <span className="task-filter-label">{label}</span>
      <button
        ref={triggerRef}
        id={`${filterId}-trigger`}
        className="filter-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${filterId}-options`}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {isOpen && menuPosition && (
        createPortal(
          <div
            ref={menuRef}
            id={`${filterId}-options`}
            className="filter-menu"
            role="listbox"
            aria-labelledby={`${filterId}-trigger`}
            style={menuPosition}
            onKeyDown={moveOptionFocus}
          >
            {options.map((option) => (
              <button
                key={option.value}
                className={`filter-option${option.value === value ? ' selected' : ''}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={15} aria-hidden="true" />}
              </button>
            ))}
          </div>,
          document.body,
        )
      )}
    </div>
  );
}

function dateLabel(task) {
  if (!task.dueDate) return '';
  const date = new Date(task.dueDate);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const prefix = date.toDateString() === today.toDateString()
    ? 'Today'
    : date.toDateString() === tomorrow.toDateString()
      ? 'Tomorrow'
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (!task.dueTime) return prefix;
  const [hours, minutes] = task.dueTime.split(':');
  return `${prefix} · ${new Date(2000, 0, 1, Number(hours), Number(minutes)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function isOverdue(task) {
  return task.isActive && task.dueDate && new Date(task.dueDate) < new Date();
}

export default function TaskPanel({ username, tasks, streak, searchQuery, quickAddSignal, editRequest, onOpenItem, onTasksChange, onStreakChange, onNotify }) {
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', dueDate: '', dueTime: '', priority: 3 });
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastQuickAdd = useRef(quickAddSignal);
  const lastEditToken = useRef(null);

  useEffect(() => {
    if (quickAddSignal !== lastQuickAdd.current) {
      lastQuickAdd.current = quickAddSignal;
      setEditingTask(null);
      setForm({ name: '', category: '', dueDate: '', dueTime: '', priority: 3 });
      setShowModal(true);
    }
  }, [quickAddSignal]);

  const refreshTasks = async () => onTasksChange(await fetchTasks());
  const refreshStreak = async () => {
    const latest = await fetchStreak();
    onStreakChange({ current: latest.current_streak, broken: latest.streak_broken });
  };

  const categories = useMemo(() => [...new Set(tasks.map((task) => task.category).filter(Boolean))].sort(), [tasks]);
  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (query && !`${task.name} ${task.category || ''}`.toLowerCase().includes(query)) return false;
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== Number(priorityFilter)) return false;
      if (statusFilter === 'active' && !query && !task.isActive) return false;
      if (statusFilter === 'completed' && task.isActive) return false;
      if (statusFilter === 'overdue' && !isOverdue(task)) return false;
      return true;
    }).sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      if ((a.priority || 3) !== (b.priority || 3)) return (a.priority || 3) - (b.priority || 3);
      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    });
  }, [tasks, searchQuery, statusFilter, categoryFilter, priorityFilter]);

  const activeTasks = tasks.filter((task) => task.isActive);
  const completedTasks = tasks.filter((task) => !task.isActive);
  const doneToday = completedTasks.filter((task) => task.completedAt && new Date(task.completedAt).toDateString() === new Date().toDateString()).length;
  const progress = activeTasks.length + doneToday > 0 ? Math.round(doneToday / (activeTasks.length + doneToday) * 100) : 0;

  const showNewTask = () => {
    setEditingTask(null);
    setForm({ name: '', category: '', dueDate: '', dueTime: '', priority: 3 });
    setShowModal(true);
  };

  const beginEdit = (task) => {
    setEditingTask(task);
    setForm({
      name: task.name,
      category: task.category || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      dueTime: task.dueTime || '',
      priority: task.priority || 3,
    });
    setShowModal(true);
  };

  useEffect(() => {
    if (editRequest?.kind !== 'tasks' || editRequest.token === lastEditToken.current) return;
    lastEditToken.current = editRequest.token;
    const task = tasks.find((item) => String(item.id) === editRequest.id);
    if (task) beginEdit(task);
  }, [editRequest, tasks]);

  const saveTask = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        category: form.category.trim() || 'Personal',
        dueDate: form.dueDate || null,
        dueTime: form.dueTime || null,
        priority: Number(form.priority),
      };
      if (editingTask) await updateTask(editingTask.id, payload);
      else await createTask(payload);
      await refreshTasks();
      setShowModal(false);
    } catch (error) {
      onNotify(`Couldn't save this task: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task) => {
    try {
      await updateTask(task.id, { isActive: !task.isActive });
      await Promise.all([refreshTasks(), refreshStreak()]);
    } catch (error) {
      onNotify(`Couldn't update this task: ${error.message}`);
    }
  };

  const removeTask = async (task) => {
    if (!window.confirm(`Delete “${task.name}”?`)) return;
    try {
      await deleteTask(task.id);
      await refreshTasks();
    } catch (error) {
      onNotify(`Couldn't delete this task: ${error.message}`);
    }
  };

  const selectedTodayTask = activeTasks.find((task) => task.priority === 1) || activeTasks[0];

  return (
    <section className="task-view">
      <div className="focus-card">
        <div className="focus-copy">
          <span className="focus-kicker"><span className="focus-dot" /> TODAY’S FOCUS</span>
          <h2>{selectedTodayTask ? selectedTodayTask.name : 'You made it through your list.'}</h2>
          <p>{selectedTodayTask ? `Start here, ${username}. One focused step is a good day.` : 'Take a breath. You can add something new whenever you’re ready.'}</p>
          <button className="focus-add" onClick={showNewTask}><Plus size={16} /> Add a task</button>
        </div>
        <div className="focus-progress" aria-label={`${progress}% of today's tasks complete`}>
          <svg viewBox="0 0 112 112" role="img" aria-hidden="true">
            <circle className="progress-track" cx="56" cy="56" r="48" />
            <circle className="progress-value" cx="56" cy="56" r="48" style={{ strokeDashoffset: `${301.6 - (301.6 * progress / 100)}` }} />
          </svg>
          <div><strong>{progress}%</strong><span>today</span></div>
        </div>
      </div>

      <div className="daily-metrics">
        <div><span className="metric-symbol metric-flame"><Flame size={16} /></span><strong>{streak.current}</strong><span>day streak</span></div>
        <div><span className="metric-symbol metric-clock"><Clock3 size={16} /></span><strong>{activeTasks.length}</strong><span>to do</span></div>
        <div><span className="metric-symbol metric-check"><Check size={16} /></span><strong>{doneToday}</strong><span>done today</span></div>
      </div>

      <div className="section-heading">
        <div><h2>Your tasks</h2><p>Prioritize what matters, then take it one at a time.</p></div>
        <button className="primary-button add-task-button" onClick={showNewTask}><Plus size={17} /> New task</button>
      </div>

      <div className="task-filters" aria-label="Task filters">
        <TaskFilter
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'active', label: 'Open tasks' },
            { value: 'all', label: 'All tasks' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
        <TaskFilter
          label="Category"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[
            { value: 'all', label: 'All categories' },
            ...categories.map((category) => ({ value: category, label: category })),
          ]}
        />
        <TaskFilter
          label="Priority"
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: 'all', label: 'All priorities' },
            ...[1, 2, 3, 4].map((priority) => ({ value: String(priority), label: priorityLabels[priority] })),
          ]}
        />
      </div>

      <div className="task-list">
        {filteredTasks.length ? filteredTasks.map((task) => (
          <motion.article className={`task-card${isOverdue(task) ? ' task-overdue' : ''}${!task.isActive ? ' task-complete' : ''}`} key={task.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 8 }}>
            <button className={`task-check${!task.isActive ? ' checked' : ''}`} onClick={() => toggleTask(task)} aria-label={task.isActive ? `Complete ${task.name}` : `Reopen ${task.name}`}>
              {!task.isActive && <Check size={14} />}
            </button>
            <div className="task-main">
              <h3><button className="item-title-link" onClick={() => onOpenItem(task.id)}><HighlightedText query={searchQuery}>{task.name}</HighlightedText></button></h3>
              <div className="task-meta">
                {task.category && <span className="category-chip"><HighlightedText query={searchQuery}>{task.category}</HighlightedText></span>}
                {task.dueDate && <span className={`due-label${isOverdue(task) ? ' overdue-label' : ''}`}><CalendarDays size={13} />{dateLabel(task)}</span>}
                <span className={`priority-chip priority-${task.priority || 3}`}>{priorityLabels[task.priority || 3]}</span>
              </div>
            </div>
            <div className="task-actions">
              <button className="icon-button small" onClick={() => onOpenItem(task.id)} aria-label={`Open details for ${task.name}`}><ArrowUpRight size={15} /></button>
              <button className="icon-button small" onClick={() => beginEdit(task)} aria-label={`Edit ${task.name}`}><Pencil size={15} /></button>
              <button className="icon-button small delete-action" onClick={() => removeTask(task)} aria-label={`Delete ${task.name}`}><Trash2 size={15} /></button>
            </div>
          </motion.article>
        )) : (
          <div className="empty-state">
            <span className="empty-icon"><Circle size={23} /></span>
            <h3>{searchQuery ? 'Nothing matches that search.' : statusFilter === 'active' ? 'A clear slate.' : 'No tasks found.'}</h3>
            <p>{searchQuery ? 'Try a different word or category.' : 'Add a task and give your day a starting point.'}</p>
            {!searchQuery && <button className="text-button" onClick={showNewTask}>Create your first task <Plus size={15} /></button>}
          </div>
        )}
      </div>

      {completedTasks.length > 0 && statusFilter !== 'completed' && (
        <div className="completed-section">
          <button className="completed-toggle" onClick={() => setShowCompleted(!showCompleted)} aria-expanded={showCompleted}>
            <span><Check size={15} /> Completed <span className="completed-count">{completedTasks.length}</span></span>
            <ChevronDown className={showCompleted ? 'rotate-chevron' : ''} size={17} />
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div className="task-list completed-list" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {completedTasks.map((task) => (
                  <article className="task-card task-complete" key={task.id}>
                    <button className="task-check checked" onClick={() => toggleTask(task)} aria-label={`Reopen ${task.name}`}><Check size={14} /></button>
                    <div className="task-main">
                      <h3><button className="item-title-link" onClick={() => onOpenItem(task.id)}>{task.name}</button></h3>
                      <div className="task-meta">
                        {task.category && <span className="category-chip">{task.category}</span>}
                        {task.dueDate && <span className="due-label"><CalendarDays size={13} />{dateLabel(task)}</span>}
                        <span className={`priority-chip priority-${task.priority || 3}`}>{priorityLabels[task.priority || 3]}</span>
                      </div>
                    </div>
                    <button className="icon-button small" onClick={() => onOpenItem(task.id)} aria-label={`Open details for ${task.name}`}><ArrowUpRight size={15} /></button>
                    <button className="icon-button small delete-action" onClick={() => removeTask(task)} aria-label={`Delete ${task.name}`}><Trash2 size={15} /></button>
                  </article>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
            <motion.form className="edit-dialog" onSubmit={saveTask} initial={{ opacity: 0, y: 10, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}>
              <div className="dialog-heading"><div><span className="eyebrow">MAKE IT HAPPEN</span><h2>{editingTask ? 'Edit task' : 'New task'}</h2></div><button className="icon-button" type="button" onClick={() => setShowModal(false)} aria-label="Close"><X size={18} /></button></div>
              <label className="form-label" htmlFor="task-name">What needs doing?</label>
              <input id="task-name" className="form-input" autoFocus maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="e.g. Send the project update" />
              <div className="form-grid">
                <div><label className="form-label" htmlFor="task-category">Category</label><input id="task-category" className="form-input" maxLength={80} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Personal" /></div>
                <div><label className="form-label" htmlFor="task-priority">Priority</label><select id="task-priority" className="form-input" value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })}>{[1, 2, 3, 4].map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}</select></div>
                <DatePicker label="Due date" id="task-due-date" value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} />
                <TimePicker label="Time" id="task-due-time" value={form.dueTime} onChange={(dueTime) => setForm({ ...form, dueTime })} />
              </div>
              <div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setShowModal(false)}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : editingTask ? 'Save changes' : 'Add task'}</button></div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
