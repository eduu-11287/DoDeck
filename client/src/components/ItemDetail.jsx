import { ArrowLeft, CalendarDays, Check, Clock3, FileText, Pencil, RotateCcw, Tag, Trash2 } from 'lucide-react';

const secondaryButtonClasses = 'inline-flex min-h-[39px] items-center justify-center gap-2 rounded-[9px] border border-[var(--line)] bg-[var(--surface)] px-[14px] !text-[12px] !font-bold !text-[var(--ink)] transition duration-[160ms] hover:bg-[var(--surface-muted)] dark:rounded-[var(--radius-sm)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:!text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:!text-[var(--accent-cyan)] max-[760px]:min-h-[34px] max-[760px]:px-[9px] max-[760px]:!text-[11px]';
const primaryButtonClasses = 'inline-flex min-h-[39px] items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[var(--accent)] px-[14px] !text-[12px] !font-bold !text-[#fffaf5] transition duration-[160ms] hover:-translate-y-px hover:bg-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 dark:rounded-[var(--radius-sm)] dark:bg-[var(--accent-cyan)] dark:shadow-[0_4px_15px_rgba(6,182,212,.25)] dark:hover:-translate-y-0.5 dark:hover:bg-[var(--accent-cyan)] dark:hover:shadow-[0_6px_20px_rgba(6,182,212,.4)]';
const iconButtonClasses = 'inline-grid h-[38px] w-[38px] place-items-center rounded-[10px] border border-transparent bg-transparent text-[var(--muted)] transition duration-[160ms] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)] max-[760px]:h-[34px] max-[760px]:w-[34px]';
const detailCardClasses = 'rounded-[14px] border border-[color-mix(in_srgb,var(--line),transparent_12%)] bg-[var(--surface)] shadow-[0_5px_18px_rgba(47,57,49,.025)] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)]';
const detailCardHoverClasses = 'dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)]';
const detailIconClasses = 'grid h-[39px] w-[39px] flex-[0_0_auto] place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-hover)]';

function formattedDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formattedTime(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(':');
  return new Date(2000, 0, 1, Number(hours), Number(minutes))
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function ItemDetail({ kind, item, linkedNotes = [], linkedTask, onBack, onOpenItem, onEdit, onDelete, onToggleTask, onUpdateTask, isOffline, isLoading }) {
  const isTask = kind === 'tasks';

  return (
    <section className="grid gap-5" aria-labelledby="item-detail-title">
      <button className="inline-flex w-fit items-center gap-[7px] border-0 bg-transparent py-[5px] !text-[12px] !font-[650] !text-[var(--muted)] hover:!text-[var(--accent-hover)]" onClick={onBack}><ArrowLeft size={17} /> Back to {isTask ? 'tasks' : 'notes'}</button>
      {!item ? (
        <div className={`${detailCardClasses} flex min-h-[280px] flex-col items-center justify-center p-[21px] text-center`}>
          <span className={`${detailIconClasses} dark:bg-[rgba(6,182,212,.15)] dark:text-[var(--accent-cyan)]`}><FileText size={23} /></span>
          <h1 id="item-detail-title" className="mb-[5px] mt-[14px] font-['Manrope',sans-serif] text-[23px] font-[750] dark:font-sans dark:text-[var(--text-primary)]">{isLoading ? 'Loading your item…' : `${isTask ? 'Task' : 'Note'} unavailable`}</h1>
          <p className="mb-4 mt-0 text-[12px] leading-[1.6] text-[var(--muted)]">{isLoading ? 'Fetching the latest details from your workspace.' : 'This item may have been deleted or is not available in your workspace.'}</p>
          {!isLoading && <button className={secondaryButtonClasses} onClick={onBack}>Return to {isTask ? 'tasks' : 'notes'}</button>}
        </div>
      ) : (
        <>
          <header className={`flex min-h-[225px] flex-col justify-between gap-6 rounded-[18px] border border-[var(--line)] p-[25px_29px] shadow-[var(--shadow)] max-[760px]:min-h-[190px] max-[760px]:gap-5 max-[760px]:p-[20px_18px] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] ${isTask ? 'bg-[linear-gradient(135deg,var(--surface),var(--green-soft))] dark:bg-[linear-gradient(135deg,rgba(6,182,212,.05),transparent)]' : 'bg-[linear-gradient(135deg,var(--surface),var(--accent-soft))] dark:bg-[linear-gradient(135deg,rgba(59,130,246,.06),transparent)]'}`}>
            <div className="flex items-center justify-between gap-3 max-[760px]:items-start">
              <span className="text-[10px] font-[750] tracking-[1.3px] text-[var(--muted)]">{isTask ? 'TASK DETAILS' : 'YOUR NOTE'}</span>
              <div className="flex items-center gap-2 max-[760px]:gap-[6px]">
                <button className={secondaryButtonClasses} onClick={onEdit} disabled={isOffline}><Pencil size={15} /> Edit</button>
                <button className={`${iconButtonClasses} dark:hover:border-[rgba(239,68,68,.4)] dark:hover:bg-[rgba(239,68,68,.12)] dark:hover:text-[var(--accent-red)]`} onClick={() => {
                  if (window.confirm(`Delete “${isTask ? item.name : item.topic}”?`)) onDelete();
                }} aria-label={`Delete ${isTask ? item.name : item.topic}`} disabled={isOffline}><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="min-w-0">
              {isTask && (
                <span className={`inline-flex w-fit items-center gap-[6px] rounded-full px-[9px] py-[6px] text-[11px] font-bold ${item.isActive ? 'bg-[var(--green-soft)] text-[#64816b] dark:bg-[rgba(6,182,212,.15)] dark:text-[var(--accent-cyan)]' : 'bg-[var(--surface-muted)] text-[var(--muted)] dark:bg-[rgba(59,130,246,.15)] dark:text-[var(--accent-blue)]'}`}>
                  {item.isActive ? <Clock3 size={15} /> : <Check size={15} />}
                  {item.isActive ? 'In progress' : 'Completed'}
                </span>
              )}
              <h1 id="item-detail-title" className="mt-2 max-w-[700px] [overflow-wrap:anywhere] text-[clamp(27px,4vw,39px)] font-extrabold leading-[1.18] tracking-[-1.4px] dark:text-[var(--text-primary)]">{isTask ? item.name : item.topic}</h1>
              {isTask && item.category && <p className="mb-0 mt-[9px] text-[13px] text-[var(--muted)]">{item.category}</p>}
              {!isTask && item.tags?.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-[7px] text-[var(--muted)]"><Tag size={14} />{item.tags.map((tag) => <span className="rounded-md bg-[var(--green-soft)] px-2 py-1 text-[11px] text-[var(--green)] dark:rounded-sm dark:bg-[rgba(255,255,255,.05)] dark:text-[var(--text-secondary)] dark:font-semibold" key={tag}>#{tag}</span>)}</div>
              )}
            </div>
          </header>

          {isTask ? (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(230px,.8fr)] items-stretch gap-[13px] max-[760px]:grid-cols-1">
              <article className={`${detailCardClasses} ${detailCardHoverClasses} p-[21px] max-[760px]:p-[17px]`}>
                <div className="flex items-center gap-[11px]"><span className={`${detailIconClasses} dark:bg-[rgba(6,182,212,.15)] dark:text-[var(--accent-cyan)]`}><CalendarDays size={18} /></span><div><span className="mb-[3px] text-[10px] font-bold tracking-[1.35px] text-[var(--accent-hover)]">PLAN</span><h2 className="m-0 font-['Manrope',sans-serif] text-[15px] font-bold dark:font-sans dark:text-[var(--text-primary)]">Task timing</h2></div></div>
                <dl className="mt-[18px] mb-0">
                  <div className="flex min-h-[42px] items-center justify-between gap-3 border-t border-[var(--line)] dark:border-[var(--border-color)]"><dt className="text-[11px] text-[var(--muted)]">Due date</dt><dd className="m-0 text-right text-[11px] font-semibold text-[var(--ink)]">{formattedDate(item.dueDate) || 'No date set'}</dd></div>
                  <div className="flex min-h-[42px] items-center justify-between gap-3 border-t border-[var(--line)] dark:border-[var(--border-color)]"><dt className="text-[11px] text-[var(--muted)]">Time</dt><dd className="m-0 text-right text-[11px] font-semibold text-[var(--ink)]">{formattedTime(item.dueTime) || 'No time set'}</dd></div>
                  <div className="flex min-h-[42px] items-center justify-between gap-3 border-t border-[var(--line)] dark:border-[var(--border-color)]"><dt className="text-[11px] text-[var(--muted)]">Priority</dt><dd className="m-0 text-right text-[11px] font-semibold text-[var(--ink)]"><span className={`rounded-[5px] bg-[var(--green-soft)] px-[7px] py-1 text-[10px] leading-none text-[#66816d] dark:rounded dark:bg-[rgba(59,130,246,.15)] dark:px-2 ${item.priority === 1 ? 'bg-[#f7e5df] text-[#b44f43] dark:bg-[rgba(239,68,68,.15)] dark:text-[var(--accent-red)]' : item.priority === 2 ? 'bg-[#f7eddf] text-[#a86c38] dark:bg-[rgba(245,158,11,.15)] dark:text-[var(--accent-amber)]' : item.priority === 4 ? 'text-[var(--muted)] dark:bg-[rgba(255,255,255,.05)] dark:text-[var(--text-secondary)]' : 'dark:text-[var(--accent-blue)]'}`}>{({ 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' })[item.priority || 3]}</span></dd></div>
                  {!item.isActive && item.completedAt && <div className="flex min-h-[42px] items-center justify-between gap-3 border-t border-[var(--line)] dark:border-[var(--border-color)]"><dt className="text-[11px] text-[var(--muted)]">Completed</dt><dd className="m-0 text-right text-[11px] font-semibold text-[var(--ink)]">{new Date(item.completedAt).toLocaleString()}</dd></div>}
                </dl>
                {item.description && <div className="mt-[19px] border-t border-[var(--line)] pt-4"><h3 className="mb-[9px] mt-0 text-[12px] font-bold">Description</h3><p className="m-0 whitespace-pre-wrap break-words text-[12px] leading-[1.7] text-[var(--muted)]">{item.description}</p></div>}
                {linkedNotes.length > 0 && (
                  <div className="mt-[19px] grid gap-[7px] border-t border-[var(--line)] pt-4">
                    <h3 className="mb-[9px] mt-0 text-[12px]">Related notes</h3>
                    {linkedNotes.map((note) => <button className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] px-[10px] py-[9px] text-left !text-[11px] !text-[var(--accent-hover)] hover:border-[var(--accent)]" key={note.id} onClick={() => onOpenItem('notes', note.id)}>{note.topic}</button>)}
                  </div>
                )}
              </article>
              <aside className={`${detailCardClasses} ${detailCardHoverClasses} flex flex-col items-start gap-[13px] bg-[var(--surface-muted)] p-[21px] dark:bg-[var(--bg-card-hover)] max-[760px]:p-[17px]`}>
                <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-[var(--green-soft)] text-[var(--green)] dark:bg-[rgba(59,130,246,.15)] dark:text-[var(--accent-blue)]">{item.isActive ? <Check size={20} /> : <RotateCcw size={20} />}</span>
                <div><h2 className="m-0 font-['Manrope',sans-serif] text-[15px] font-bold dark:font-sans dark:text-[var(--text-primary)]">{item.isActive ? 'Ready when you are.' : 'Progress counts.'}</h2><p className="mb-0 mt-[6px] text-[12px] leading-[1.6] text-[var(--muted)]">{item.isActive ? 'Mark this task complete when it’s done.' : 'You can reopen this task if there’s more to do.'}</p></div>
                <button className={`${item.isActive ? primaryButtonClasses : secondaryButtonClasses} mt-auto`} onClick={() => onToggleTask(item)} disabled={isOffline}>
                  {item.isActive ? <><Check size={16} /> Mark complete</> : <><RotateCcw size={16} /> Reopen task</>}
                </button>
              </aside>
            </div>
          ) : (
            <article className={`${detailCardClasses} ${detailCardHoverClasses} p-[24px_28px] max-[760px]:p-[19px]`}>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--line)] pb-[14px] text-[11px] text-[var(--muted)] dark:border-[var(--border-color)]"><span className="flex items-center gap-[6px]"><CalendarDays size={14} />{formattedDate(item.date) || 'No date'}</span>{item.updatedAt && <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>}</div>
              <div className="whitespace-pre-wrap break-words pt-[17px] text-[14px] leading-[1.85] text-[var(--ink)] max-[760px]:text-[13px]">{item.content || 'This note has no content yet.'}</div>
              {linkedTask && <div className="mt-[19px] grid gap-[7px] border-t border-[var(--line)] pt-4"><h3 className="mb-[9px] mt-0 text-[12px]">Related task</h3><button className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] px-[10px] py-[9px] text-left !text-[11px] !text-[var(--accent-hover)] hover:border-[var(--accent)]" onClick={() => onOpenItem('tasks', linkedTask.id)}>{linkedTask.name}</button></div>}
            </article>
          )}
        </>
      )}
    </section>
  );
}
