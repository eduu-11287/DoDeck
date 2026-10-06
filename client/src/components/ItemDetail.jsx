import { ArrowLeft, CalendarDays, Check, Clock3, FileText, Pencil, RotateCcw, Tag, Trash2 } from 'lucide-react';

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

export default function ItemDetail({ kind, item, onBack, onEdit, onDelete, onToggleTask, isLoading }) {
  const isTask = kind === 'tasks';

  return (
    <section className="item-detail" aria-labelledby="item-detail-title">
      <button className="detail-back" onClick={onBack}><ArrowLeft size={17} /> Back to {isTask ? 'tasks' : 'notes'}</button>
      {!item ? (
        <div className="item-detail-missing">
          <span className="detail-icon"><FileText size={23} /></span>
          <h1 id="item-detail-title">{isLoading ? 'Loading your item…' : `${isTask ? 'Task' : 'Note'} unavailable`}</h1>
          <p>{isLoading ? 'Fetching the latest details from your workspace.' : 'This item may have been deleted or is not available in your workspace.'}</p>
          {!isLoading && <button className="secondary-button" onClick={onBack}>Return to {isTask ? 'tasks' : 'notes'}</button>}
        </div>
      ) : (
        <>
          <header className={`detail-hero${isTask ? ' task-detail-hero' : ' note-detail-hero'}`}>
            <div className="detail-hero-top">
              <span className="detail-type">{isTask ? 'TASK DETAILS' : 'YOUR NOTE'}</span>
              <div className="detail-actions">
                <button className="secondary-button" onClick={onEdit}><Pencil size={15} /> Edit</button>
                <button className="icon-button delete-action" onClick={() => {
                  if (window.confirm(`Delete “${isTask ? item.name : item.topic}”?`)) onDelete();
                }} aria-label={`Delete ${isTask ? item.name : item.topic}`}><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="detail-title-wrap">
              {isTask && (
                <span className={`detail-status${item.isActive ? '' : ' is-complete'}`}>
                  {item.isActive ? <Clock3 size={15} /> : <Check size={15} />}
                  {item.isActive ? 'In progress' : 'Completed'}
                </span>
              )}
              <h1 id="item-detail-title">{isTask ? item.name : item.topic}</h1>
              {isTask && item.category && <p className="detail-category">{item.category}</p>}
              {!isTask && item.tags?.length > 0 && (
                <div className="detail-tags"><Tag size={14} />{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
              )}
            </div>
          </header>

          {isTask ? (
            <div className="detail-content-grid">
              <article className="detail-card detail-task-card">
                <div className="detail-card-heading"><span className="detail-icon"><CalendarDays size={18} /></span><div><span className="eyebrow">PLAN</span><h2>Task timing</h2></div></div>
                <dl className="detail-facts">
                  <div><dt>Due date</dt><dd>{formattedDate(item.dueDate) || 'No date set'}</dd></div>
                  <div><dt>Time</dt><dd>{formattedTime(item.dueTime) || 'No time set'}</dd></div>
                  <div><dt>Priority</dt><dd><span className={`priority-chip priority-${item.priority || 3}`}>{({ 1: 'Urgent', 2: 'High', 3: 'Normal', 4: 'Low' })[item.priority || 3]}</span></dd></div>
                  {!item.isActive && item.completedAt && <div><dt>Completed</dt><dd>{new Date(item.completedAt).toLocaleString()}</dd></div>}
                </dl>
              </article>
              <aside className="detail-next-step">
                <span className="detail-next-icon">{item.isActive ? <Check size={20} /> : <RotateCcw size={20} />}</span>
                <div><h2>{item.isActive ? 'Ready when you are.' : 'Progress counts.'}</h2><p>{item.isActive ? 'Mark this task complete when it’s done.' : 'You can reopen this task if there’s more to do.'}</p></div>
                <button className={item.isActive ? 'primary-button' : 'secondary-button'} onClick={() => onToggleTask(item)}>
                  {item.isActive ? <><Check size={16} /> Mark complete</> : <><RotateCcw size={16} /> Reopen task</>}
                </button>
              </aside>
            </div>
          ) : (
            <article className="detail-card note-reading-card">
              <div className="note-reading-meta"><span><CalendarDays size={14} />{formattedDate(item.date) || 'No date'}</span>{item.updatedAt && <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>}</div>
              <div className="note-reading-content">{item.content || 'This note has no content yet.'}</div>
            </article>
          )}
        </>
      )}
    </section>
  );
}
