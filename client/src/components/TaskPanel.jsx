import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Check, ChevronDown, Circle, Clock3, Flame, Pencil, Plus, Trash2, X } from 'lucide-react';
import { createTask, deleteTask, fetchStreak, fetchTasks, updateTask } from '../api';
import { DatePicker, TimePicker } from './DateTimePickers';
import DropdownSelect from './DropdownSelect';
import HighlightedText from './HighlightedText';
import ItemDetailLink from './ItemDetailLink';

const priorityLabels = { 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' };

function TaskFilter({ label, value, options, onChange }) {
  return (
    <div className={`grid min-w-0 gap-[5px] ${label === 'Status' ? 'max-[760px]:col-span-2' : ''}`}>
      <span className="text-[10px] font-bold tracking-[.45px] text-[var(--muted)]">{label}</span>
      <DropdownSelect
        label={label}
        value={value}
        options={options}
        onChange={onChange}
        className="min-h-[38px] h-[38px] rounded-[9px] px-2.5 text-[11px] bg-[var(--surface)]"
      />
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

export default function TaskPanel({ username, tasks, streak, searchQuery, quickAddSignal, editRequest, onEditRequestConsumed, onOpenItem, onTasksChange, onStreakChange, onNotify, isOffline }) {
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', dueDate: '', dueTime: '', priority: 3, description: '' });
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
      if (isOffline) return;
      setEditingTask(null);
      setForm({ name: '', category: '', dueDate: '', dueTime: '', priority: 3, description: '' });
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
      if (query && !`${task.name} ${task.category || ''} ${task.description || ''}`.toLowerCase().includes(query)) return false;
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
    setForm({ name: '', category: '', dueDate: '', dueTime: '', priority: 3, description: '' });
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
      description: task.description || '',
    });
    setShowModal(true);
  };

  useEffect(() => {
    if (editRequest?.kind !== 'tasks' || editRequest.token === lastEditToken.current) return;
    lastEditToken.current = editRequest.token;
    const task = tasks.find((item) => String(item.id) === editRequest.id);
    if (task) {
      beginEdit(task);
      onEditRequestConsumed(editRequest.token);
    }
  }, [editRequest, tasks]);

  const saveTask = async (event) => {
    event.preventDefault();
    if (isOffline) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        category: form.category.trim() || 'Personal',
        dueDate: form.dueDate || null,
        dueTime: form.dueTime || null,
        priority: Number(form.priority),
        description: form.description,
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
    <section className="w-full">
      <div className="flex min-h-[203px] items-center justify-between gap-6 rounded-[17px] bg-[#30443b] px-8 py-[27px] text-[#fffdf7] transition dark:rounded-[var(--radius-lg)] dark:border dark:border-[var(--border-color)] dark:border-l-4 dark:border-l-[var(--accent-cyan)] dark:bg-aurora-card dark:[background-image:linear-gradient(135deg,rgba(6,182,212,0.05),transparent)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] max-[760px]:min-h-[182px] max-[760px]:gap-2 max-[760px]:px-[19px] max-[760px]:py-[22px]">
        <div className="min-w-0">
          <span className="flex items-center gap-2 text-[10px] font-bold tracking-[1.3px] text-[#c3d1c5] dark:text-[var(--text-secondary)]"><span className="size-[7px] rounded-full bg-[#e98967]" /> TODAY’S FOCUS</span>
          <h2 className="mb-[7px] mt-[15px] max-w-[490px] font-[family-name:Manrope] text-[clamp(20px,2.3vw,26px)] font-bold leading-[1.3] tracking-[-.6px] max-[760px]:text-[19px] max-[420px]:text-[17px]">{selectedTodayTask ? selectedTodayTask.name : 'You made it through your list.'}</h2>
          <p className="m-0 text-xs text-[#c4d0c8] dark:text-[var(--text-secondary)] max-[760px]:max-w-[230px] max-[760px]:text-[10px] max-[760px]:leading-[1.5]">{selectedTodayTask ? `Start here, ${username}. One focused step is a good day.` : 'Take a breath. You can add something new whenever you’re ready.'}</p>
          <button className="mt-[17px] inline-flex cursor-pointer items-center gap-[6px] border-0 bg-transparent p-0 text-xs font-bold text-[#f19a79] disabled:cursor-wait disabled:opacity-70 dark:text-[var(--accent-cyan)]" onClick={showNewTask} disabled={isOffline}><Plus size={16} /> Add a task</button>
        </div>
        <div className="relative grid h-[100px] w-[100px] flex-[0_0_100px] place-items-center max-[760px]:h-[78px] max-[760px]:w-[78px] max-[760px]:flex-[0_0_78px] max-[420px]:h-[66px] max-[420px]:w-[66px] max-[420px]:flex-[0_0_66px]" aria-label={`${progress}% of today's tasks complete`}>
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 112 112" role="img" aria-hidden="true">
            <circle className="fill-none stroke-[7px] stroke-[#52645b] dark:stroke-[rgba(255,255,255,.05)]" cx="56" cy="56" r="48" />
            <circle className="fill-none stroke-[7px] stroke-[#ef9677] [stroke-dasharray:301.6] [stroke-linecap:round] transition-[stroke-dashoffset] duration-500 ease-in-out dark:stroke-[var(--accent-cyan)] dark:[filter:drop-shadow(0_0_6px_var(--accent-cyan))]" cx="56" cy="56" r="48" style={{ strokeDashoffset: `${301.6 - (301.6 * progress / 100)}` }} />
          </svg>
          <div className="grid justify-items-center"><strong className="font-[family-name:Manrope] text-[22px] font-extrabold max-[760px]:text-[18px]">{progress}%</strong><span className="text-[10px] text-[#c4d0c8] dark:text-[var(--text-secondary)]">today</span></div>
        </div>
      </div>

      <div className="my-[12px] mb-[37px] grid min-h-[81px] grid-cols-3 rounded-[13px] border border-[var(--line)] bg-[var(--surface)] px-2 dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] max-[760px]:mb-[29px] max-[760px]:min-h-[70px] max-[760px]:px-[2px]">
        <div className="flex items-center justify-center gap-[9px] max-[760px]:gap-[6px] max-[420px]:flex-wrap max-[420px]:gap-1 [&+div]:border-l [&+div]:border-[var(--line)]">
          <span className="grid size-[31px] place-items-center rounded-[9px] bg-[var(--accent-soft)] text-[#dd7254] dark:bg-[rgba(245,158,11,.15)] dark:text-[var(--accent-amber)] max-[760px]:size-[26px] max-[420px]:hidden"><Flame size={16} /></span><strong className="font-[family-name:Manrope] text-base font-bold max-[760px]:text-sm">{streak.current}</strong><span className="text-[11px] text-[var(--muted)] max-[760px]:text-[9px]">day streak</span>
        </div>
        <div className="flex items-center justify-center gap-[9px] border-l border-[var(--line)] max-[760px]:gap-[6px] max-[420px]:flex-wrap max-[420px]:gap-1">
          <span className="grid size-[31px] place-items-center rounded-[9px] bg-[var(--green-soft)] text-[#708d75] dark:bg-[rgba(6,182,212,.15)] dark:text-[var(--accent-cyan)] max-[760px]:size-[26px] max-[420px]:hidden"><Clock3 size={16} /></span><strong className="font-[family-name:Manrope] text-base font-bold max-[760px]:text-sm">{activeTasks.length}</strong><span className="text-[11px] text-[var(--muted)] max-[760px]:text-[9px]">to do</span>
        </div>
        <div className="flex items-center justify-center gap-[9px] border-l border-[var(--line)] max-[760px]:gap-[6px] max-[420px]:flex-wrap max-[420px]:gap-1">
          <span className="grid size-[31px] place-items-center rounded-[9px] bg-[#f8f0de] text-[#bb8b3d] dark:bg-[rgba(59,130,246,.15)] dark:text-[var(--accent-blue)] max-[760px]:size-[26px] max-[420px]:hidden"><Check size={16} /></span><strong className="font-[family-name:Manrope] text-base font-bold max-[760px]:text-sm">{doneToday}</strong><span className="text-[11px] text-[var(--muted)] max-[760px]:text-[9px]">done today</span>
        </div>
      </div>

      <div className="mb-[18px] flex items-center justify-between gap-4 max-[760px]:items-start">
        <div><h2 className="m-0 font-[family-name:Manrope] text-lg font-bold tracking-[-.4px]">Your tasks</h2><p className="mt-[5px] text-xs text-[var(--muted)] max-[760px]:max-w-[240px] max-[760px]:leading-[1.5]">Prioritize what matters, then take it one at a time.</p></div>
        <button className="inline-flex min-h-[39px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[var(--accent)] px-[14px] text-xs font-bold text-[#fffaf5] transition-all duration-[160ms] hover:-translate-y-px hover:bg-[var(--accent-hover)] disabled:transform-none disabled:cursor-wait disabled:opacity-70 dark:rounded-[var(--radius-sm)] dark:bg-[var(--accent-cyan)] dark:text-white dark:shadow-[0_4px_15px_rgba(6,182,212,.25)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:bg-[var(--accent-cyan)] dark:hover:shadow-[0_6px_20px_rgba(6,182,212,.4)] max-[760px]:min-h-[35px] max-[760px]:px-[10px] max-[760px]:whitespace-nowrap max-[760px]:text-[11px]" onClick={showNewTask} disabled={isOffline}><Plus size={17} /> New task</button>
      </div>

      <div className="mb-[10px] grid grid-cols-[1.2fr_1fr_1fr] gap-[10px] max-[760px]:grid-cols-2 max-[760px]:gap-x-2 max-[760px]:gap-y-[10px]" aria-label="Task filters">
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

      <div className="grid gap-2 overflow-hidden">
        {filteredTasks.length ? filteredTasks.map((task) => (
          <motion.article className={`group relative flex min-h-[70px] items-center gap-3 rounded-[11px] border border-[color-mix(in_srgb,var(--line),transparent_12%)] bg-[var(--surface)] px-[14px] py-[13px] transition-[border-color,box-shadow] duration-[160ms] hover:border-[color-mix(in_srgb,var(--accent),var(--line)_55%)] hover:shadow-[var(--shadow)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-[var(--accent)] has-[a:focus-visible]:outline-offset-[3px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)] ${isOverdue(task) ? 'border-l-[3px] border-l-[#c4554b] dark:border-l-4 dark:border-l-[var(--accent-red)]' : ''} max-[760px]:grid max-[760px]:w-full max-[760px]:max-w-full max-[760px]:min-w-0 max-[760px]:grid-cols-[21px_minmax(0,1fr)_auto] max-[760px]:items-start max-[760px]:gap-[9px] max-[760px]:px-[10px] max-[760px]:py-3`} key={task.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 8 }}>
            <button className={`relative z-[2] grid h-[21px] w-[21px] flex-[0_0_21px] place-items-center rounded-[7px] border-[1.5px] border-[#c9cec8] bg-transparent text-white hover:border-[var(--green)] disabled:cursor-wait disabled:opacity-70 dark:h-[22px] dark:w-[22px] dark:flex-[0_0_22px] dark:rounded-[6px] dark:border-2 dark:border-[#4A5A53] dark:hover:border-[var(--accent-cyan)] ${!task.isActive ? 'border-[var(--green)] bg-[var(--green)] dark:border-[var(--accent-blue)] dark:bg-[var(--accent-blue)] dark:shadow-[0_0_8px_rgba(59,130,246,.2)]' : ''}`} onClick={(event) => { event.stopPropagation(); toggleTask(task); }} aria-label={task.isActive ? `Complete ${task.name}` : `Reopen ${task.name}`} disabled={isOffline}>
              {!task.isActive && <Check size={14} />}
            </button>
            <div className="min-w-0 flex-1 max-[760px]:w-full">
              <ItemDetailLink className="static block text-inherit no-underline after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] after:content-['']" href={`/tasks/${encodeURIComponent(task.id)}`} onOpen={() => onOpenItem(task.id)} ariaLabel={`Open task details: ${task.name}`}>
                <h3 className={`m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-[var(--ink)] group-hover:text-[var(--accent-hover)] max-[760px]:overflow-visible max-[760px]:whitespace-normal max-[760px]:[overflow-wrap:anywhere] max-[760px]:[text-overflow:clip] max-[760px]:leading-[1.45] ${!task.isActive ? 'text-[var(--muted)] line-through' : ''}`}><HighlightedText query={searchQuery}>{task.name}</HighlightedText></h3>
                {task.description && <p className="mt-[5px] overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-[1.45] text-[var(--muted)]">{task.description}</p>}
                <div className="mt-[7px] flex flex-wrap items-center gap-[7px] max-[760px]:min-w-0 max-[760px]:items-start max-[760px]:gap-[6px]">
                  {task.category && <span className="rounded-[5px] bg-[var(--surface-muted)] px-[7px] py-1 text-[10px] leading-none text-[var(--muted)] dark:rounded-[4px] dark:bg-[rgba(255,255,255,.05)] dark:text-[var(--text-secondary)] dark:text-[11px] dark:font-semibold max-[760px]:max-w-full max-[760px]:[overflow-wrap:anywhere]"><HighlightedText query={searchQuery}>{task.category}</HighlightedText></span>}
                  {task.dueDate && <span className={`inline-flex items-center gap-1 text-[10px] text-[var(--muted)] dark:rounded-[4px] dark:bg-[rgba(6,182,212,.15)] dark:px-2 dark:py-1 dark:text-[var(--accent-cyan)] max-[760px]:min-w-0 max-[760px]:[overflow-wrap:anywhere] ${isOverdue(task) ? 'text-[#bf594c] dark:bg-[rgba(239,68,68,.15)] dark:text-[var(--accent-red)]' : ''}`}><CalendarDays size={13} className="shrink-0" />{dateLabel(task)}</span>}
                  <span className={`rounded-[5px] px-[7px] py-1 text-[10px] leading-none dark:rounded-[4px] dark:px-2 ${task.priority === 1 ? 'bg-[#f7e5df] text-[#b44f43] dark:bg-[rgba(239,68,68,.15)] dark:text-[var(--accent-red)]' : task.priority === 2 ? 'bg-[#f7eddf] text-[#a86c38] dark:bg-[rgba(245,158,11,.15)] dark:text-[var(--accent-amber)]' : task.priority === 4 ? 'bg-[var(--surface-muted)] text-[var(--muted)] dark:bg-[rgba(255,255,255,.05)] dark:text-[var(--text-secondary)]' : 'bg-[var(--green-soft)] text-[#66816d] dark:bg-[rgba(59,130,246,.15)] dark:text-[var(--accent-blue)]'} max-[760px]:max-w-full max-[760px]:[overflow-wrap:anywhere]`}>{priorityLabels[task.priority || 3]}</span>
                </div>
              </ItemDetailLink>
            </div>
            <div className="relative z-[2] flex gap-[5px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 max-[760px]:opacity-100">
              <button className="inline-grid size-[31px] place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] disabled:cursor-wait disabled:opacity-70 dark:rounded-[var(--radius-sm)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)] max-[760px]:size-7" onClick={(event) => { event.stopPropagation(); beginEdit(task); }} aria-label={`Edit ${task.name}`} disabled={isOffline}><Pencil size={15} /></button>
              <button className="inline-grid size-[31px] place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition hover:border-[#e6b8b0] hover:bg-[#fbede9] hover:text-[#bd5549] disabled:cursor-wait disabled:opacity-70 dark:rounded-[var(--radius-sm)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:border-[rgba(239,68,68,.4)] dark:hover:bg-[rgba(239,68,68,.12)] dark:hover:text-[var(--accent-red)] max-[760px]:size-7" onClick={(event) => { event.stopPropagation(); removeTask(task); }} aria-label={`Delete ${task.name}`} disabled={isOffline}><Trash2 size={15} /></button>
            </div>
          </motion.article>
        )) : (
          <div className="flex min-h-[215px] flex-col items-center justify-center rounded-[13px] border border-dashed border-[var(--line)] px-[18px] py-[34px] text-center dark:border-[var(--border-color)] dark:bg-[rgba(15,19,28,.4)]">
            <span className="grid size-11 place-items-center rounded-[13px] bg-[var(--accent-soft)] text-[var(--accent)] dark:bg-[rgba(6,182,212,.15)] dark:text-[var(--accent-cyan)]"><Circle size={23} /></span>
            <h3 className="mb-1 mt-[13px] font-[family-name:Manrope] text-[15px] font-bold">{searchQuery ? 'Nothing matches that search.' : statusFilter === 'active' ? 'A clear slate.' : 'No tasks found.'}</h3>
            <p className="m-0 max-w-[340px] text-xs leading-[1.6] text-[var(--muted)]">{searchQuery ? 'Try a different word or category.' : 'Add a task and give your day a starting point.'}</p>
            {!searchQuery && <button className="mt-[13px] inline-flex cursor-pointer items-center gap-[6px] border-0 bg-transparent p-[6px] text-xs font-bold text-[var(--accent-hover)] dark:text-[var(--accent-cyan)]" onClick={showNewTask}>Create your first task <Plus size={15} /></button>}
          </div>
        )}
      </div>

      {completedTasks.length > 0 && statusFilter !== 'completed' && (
        <div className="mt-[22px]">
          <button className="flex w-full items-center justify-between border-0 border-b border-[var(--line)] bg-transparent px-[2px] py-3 text-xs font-bold text-[var(--muted)] dark:border-[var(--border-color)] dark:text-[var(--text-secondary)]" onClick={() => setShowCompleted(!showCompleted)} aria-expanded={showCompleted}>
            <span className="flex items-center gap-[7px]"><Check size={15} /> Completed <span className="inline-grid h-[19px] min-w-[19px] place-items-center rounded-md bg-[var(--surface-muted)] text-[10px]">{completedTasks.length}</span></span>
            <ChevronDown className={showCompleted ? 'rotate-180' : ''} size={17} />
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div className="mt-[9px] grid gap-2 overflow-hidden" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                {completedTasks.map((task) => (
                  <article className="group relative flex min-h-[70px] items-center gap-3 rounded-[11px] border border-[color-mix(in_srgb,var(--line),transparent_12%)] bg-[var(--surface)] px-[14px] py-[13px] transition-[border-color,box-shadow] duration-[160ms] hover:border-[color-mix(in_srgb,var(--accent),var(--line)_55%)] hover:shadow-[var(--shadow)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-[var(--accent)] has-[a:focus-visible]:outline-offset-[3px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)] max-[760px]:grid max-[760px]:w-full max-[760px]:max-w-full max-[760px]:min-w-0 max-[760px]:grid-cols-[21px_minmax(0,1fr)_auto] max-[760px]:items-start max-[760px]:gap-[9px] max-[760px]:px-[10px] max-[760px]:py-3" key={task.id}>
                    <button className="relative z-[2] grid h-[21px] w-[21px] flex-[0_0_21px] place-items-center rounded-[7px] border-[1.5px] border-[var(--green)] bg-[var(--green)] text-white dark:h-[22px] dark:w-[22px] dark:flex-[0_0_22px] dark:rounded-[6px] dark:border-2 dark:border-[var(--accent-blue)] dark:bg-[var(--accent-blue)] dark:shadow-[0_0_8px_rgba(59,130,246,.2)]" onClick={(event) => { event.stopPropagation(); toggleTask(task); }} aria-label={`Reopen ${task.name}`} disabled={isOffline}><Check size={14} /></button>
                    <div className="min-w-0 flex-1 max-[760px]:w-full">
                      <ItemDetailLink className="static block text-inherit no-underline after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] after:content-['']" href={`/tasks/${encodeURIComponent(task.id)}`} onOpen={() => onOpenItem(task.id)} ariaLabel={`Open task details: ${task.name}`}>
                        <h3 className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-[var(--muted)] line-through group-hover:text-[var(--accent-hover)] max-[760px]:overflow-visible max-[760px]:whitespace-normal max-[760px]:[overflow-wrap:anywhere] max-[760px]:[text-overflow:clip] max-[760px]:leading-[1.45]">{task.name}</h3>
                        {task.description && <p className="mt-[5px] overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-[1.45] text-[var(--muted)]">{task.description}</p>}
                        <div className="mt-[7px] flex flex-wrap items-center gap-[7px] max-[760px]:min-w-0 max-[760px]:items-start max-[760px]:gap-[6px]">
                          {task.category && <span className="rounded-[5px] bg-[var(--surface-muted)] px-[7px] py-1 text-[10px] leading-none text-[var(--muted)] dark:rounded-[4px] dark:bg-[rgba(255,255,255,.05)] dark:text-[var(--text-secondary)] dark:text-[11px] dark:font-semibold max-[760px]:max-w-full max-[760px]:[overflow-wrap:anywhere]">{task.category}</span>}
                          {task.dueDate && <span className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)] max-[760px]:min-w-0 max-[760px]:[overflow-wrap:anywhere]"><CalendarDays size={13} className="shrink-0" />{dateLabel(task)}</span>}
                          <span className={`rounded-[5px] px-[7px] py-1 text-[10px] leading-none dark:rounded-[4px] dark:px-2 ${task.priority === 1 ? 'bg-[#f7e5df] text-[#b44f43] dark:bg-[rgba(239,68,68,.15)] dark:text-[var(--accent-red)]' : task.priority === 2 ? 'bg-[#f7eddf] text-[#a86c38] dark:bg-[rgba(245,158,11,.15)] dark:text-[var(--accent-amber)]' : task.priority === 4 ? 'bg-[var(--surface-muted)] text-[var(--muted)] dark:bg-[rgba(255,255,255,.05)] dark:text-[var(--text-secondary)]' : 'bg-[var(--green-soft)] text-[#66816d] dark:bg-[rgba(59,130,246,.15)] dark:text-[var(--accent-blue)]'} max-[760px]:max-w-full max-[760px]:[overflow-wrap:anywhere]`}>{priorityLabels[task.priority || 3]}</span>
                        </div>
                      </ItemDetailLink>
                    </div>
                    <button className="relative z-[2] inline-grid size-[31px] place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition hover:border-[#e6b8b0] hover:bg-[#fbede9] hover:text-[#bd5549] disabled:cursor-wait disabled:opacity-70 dark:rounded-[var(--radius-sm)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:border-[rgba(239,68,68,.4)] dark:hover:bg-[rgba(239,68,68,.12)] dark:hover:text-[var(--accent-red)] max-[760px]:size-7" onClick={(event) => { event.stopPropagation(); removeTask(task); }} aria-label={`Delete ${task.name}`} disabled={isOffline}><Trash2 size={15} /></button>
                  </article>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(23,31,27,.48)] p-5 backdrop-blur-[4px] max-[760px]:p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
            <motion.form className="max-h-[calc(100dvh-40px)] w-full max-w-[490px] overscroll-contain overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-[25px] shadow-[0_24px_70px_rgba(15,23,18,.2)] dark:border-[var(--border-color)] dark:bg-[var(--glass-bg)] dark:text-[var(--text-primary)] dark:backdrop-blur-[20px] max-[760px]:max-h-[calc(100dvh-24px)] max-[760px]:p-[18px]" onSubmit={saveTask} initial={{ opacity: 0, y: 10, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}>
              <div className="mb-5 flex items-start justify-between">
                <div><span className="mb-2 block text-[10px] font-bold tracking-[1.35px] text-[var(--accent-hover)]">MAKE IT HAPPEN</span><h2 className="m-0 font-[family-name:Manrope] text-xl font-bold">{editingTask ? 'Edit task' : 'New task'}</h2></div>
                <button className="inline-grid size-[38px] place-items-center rounded-[10px] border border-transparent bg-transparent text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)]" type="button" onClick={() => setShowModal(false)} aria-label="Close"><X size={18} /></button>
              </div>
              <label className="mb-[7px] mt-[15px] block text-[11px] font-bold text-[var(--ink)]" htmlFor="task-name">What needs doing?</label>
              <input id="task-name" className="min-h-[41px] w-full rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-[11px] py-[10px] text-xs text-[var(--ink)] placeholder:text-[#9ba49d] dark:border-[var(--border-color)] dark:bg-[var(--bg-base)] dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)]" autoFocus maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="e.g. Send the project update" />
              <label className="mb-[7px] mt-[15px] block text-[11px] font-bold text-[var(--ink)]" htmlFor="task-description">Description</label>
              <textarea id="task-description" className="min-h-[84px] w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-[11px] py-[10px] text-xs text-[var(--ink)] placeholder:text-[#9ba49d] dark:border-[var(--border-color)] dark:bg-[var(--bg-base)] dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)]" maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add context, links, or what done looks like." />
              <div className="mt-px grid grid-cols-2 gap-x-3 max-[420px]:grid-cols-1">
                <div><label className="mb-[7px] mt-[13px] block text-[11px] font-bold text-[var(--ink)]" htmlFor="task-category">Category</label><input id="task-category" className="min-h-[41px] w-full rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-[11px] py-[10px] text-xs text-[var(--ink)] placeholder:text-[#9ba49d] dark:border-[var(--border-color)] dark:bg-[var(--bg-base)] dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)]" maxLength={80} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Personal" /></div>
                <div><label className="mb-[7px] mt-[13px] block text-[11px] font-bold text-[var(--ink)]" htmlFor="task-priority">Priority</label><DropdownSelect id="task-priority" label="Priority" value={String(form.priority)} onChange={(priority) => setForm({ ...form, priority: Number(priority) })} options={[1, 2, 3, 4].map((priority) => ({ value: String(priority), label: priorityLabels[priority] }))} /></div>
                <DatePicker label="Due date" id="task-due-date" value={form.dueDate} onChange={(dueDate) => setForm({ ...form, dueDate })} />
                <TimePicker label="Time" id="task-due-time" value={form.dueTime} onChange={(dueTime) => setForm({ ...form, dueTime })} />
              </div>
              <div className="mt-[22px] flex justify-end gap-2">
                <button className="inline-flex min-h-[39px] cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[var(--line)] bg-[var(--surface)] px-[14px] text-xs font-bold text-[var(--ink)] transition hover:bg-[var(--surface-muted)] dark:rounded-[var(--radius-sm)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)]" type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="inline-flex min-h-[39px] cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[var(--accent)] px-[14px] text-xs font-bold text-[#fffaf5] transition-all duration-[160ms] hover:-translate-y-px hover:bg-[var(--accent-hover)] disabled:transform-none disabled:cursor-wait disabled:opacity-70 dark:rounded-[var(--radius-sm)] dark:bg-[var(--accent-cyan)] dark:text-white dark:shadow-[0_4px_15px_rgba(6,182,212,.25)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:bg-[var(--accent-cyan)] dark:hover:shadow-[0_6px_20px_rgba(6,182,212,.4)]" type="submit" disabled={saving || isOffline}>{saving ? 'Saving…' : editingTask ? 'Save changes' : 'Add task'}</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
