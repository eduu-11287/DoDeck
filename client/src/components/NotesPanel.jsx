import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Download, FileText, Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { createNote, deleteNote, downloadNotes, fetchNotes, updateNote } from '../api';
import { DatePicker } from './DateTimePickers';
import DropdownSelect from './DropdownSelect';
import HighlightedText from './HighlightedText';
import ItemDetailLink from './ItemDetailLink';

const today = () => format(new Date(), 'yyyy-MM-dd');

export default function NotesPanel({ notes, tasks, searchQuery, editRequest, onEditRequestConsumed, onOpenItem, onNotesChange, onNotify, isOffline }) {
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [tagFilter, setTagFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ topic: '', content: '', date: today(), tags: '', taskId: '' });
  const lastEditToken = useRef(null);

  const allTags = useMemo(() => [...new Set(notes.flatMap((note) => note.tags || []))].sort(), [notes]);
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      if (query && !`${note.topic} ${note.content || ''} ${(note.tags || []).join(' ')}`.toLowerCase().includes(query)) return false;
      if (tagFilter !== 'all' && !(note.tags || []).includes(tagFilter)) return false;
      return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [notes, searchQuery, tagFilter]);

  const refreshNotes = async () => onNotesChange(await fetchNotes());

  const openNewNote = () => {
    setEditingNote(null);
    setForm({ topic: '', content: '', date: today(), tags: '', taskId: '' });
    setShowModal(true);
  };

  const beginEdit = (note) => {
    setEditingNote(note);
    setForm({
      topic: note.topic,
      content: note.content || '',
      date: note.date || today(),
      tags: (note.tags || []).join(', '),
      taskId: note.taskId ? String(note.taskId) : '',
    });
    setShowModal(true);
  };

  useEffect(() => {
    if (editRequest?.kind !== 'notes' || editRequest.token === lastEditToken.current) return;
    lastEditToken.current = editRequest.token;
    const note = notes.find((item) => String(item.id) === editRequest.id);
    if (note) {
      beginEdit(note);
      onEditRequestConsumed(editRequest.token);
    }
  }, [editRequest, notes]);

  const saveNote = async (event) => {
    event.preventDefault();
    if (isOffline) return;
    setSaving(true);
    const payload = { ...form, topic: form.topic.trim(), taskId: form.taskId ? Number(form.taskId) : null, tags: form.tags.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean) };
    try {
      if (editingNote) await updateNote(editingNote.id, payload);
      else await createNote(payload);
      await refreshNotes();
      setShowModal(false);
    } catch (error) {
      onNotify(`Couldn't save this note: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const removeNote = async (note) => {
    if (!window.confirm(`Delete “${note.topic}”?`)) return;
    try {
      await deleteNote(note.id);
      await refreshNotes();
    } catch (error) {
      onNotify(`Couldn't delete this note: ${error.message}`);
    }
  };

  const exportNotes = async () => {
    try {
      await downloadNotes();
    } catch (error) {
      onNotify(`Couldn't export your notes: ${error.message}`);
    }
  };

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between gap-3 max-[760px]:items-start">
        <div className="flex items-center gap-[10px] text-xs text-[var(--muted)]"><span className="grid size-[35px] place-items-center rounded-[10px] bg-[var(--accent-soft)] text-[var(--accent)]"><FileText size={18} /></span><span><strong className="text-[var(--ink)]">{notes.length}</strong> {notes.length === 1 ? 'note' : 'notes'} saved</span></div>
        <div className="flex items-center gap-[10px] max-[760px]:gap-[6px]">
          <button className="inline-flex min-h-[39px] cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[var(--line)] bg-[var(--surface)] px-[14px] text-xs font-bold text-[var(--ink)] transition hover:bg-[var(--surface-muted)] disabled:cursor-wait disabled:opacity-70 dark:rounded-[var(--radius-sm)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)] max-[760px]:px-[9px] max-[760px]:text-[10px]" onClick={exportNotes} disabled={isOffline}><Download size={15} /> Export</button>
          <button className="inline-flex min-h-[39px] cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[var(--accent)] px-[14px] text-xs font-bold text-[#fffaf5] transition-all duration-[160ms] hover:-translate-y-px hover:bg-[var(--accent-hover)] disabled:transform-none disabled:cursor-wait disabled:opacity-70 dark:rounded-[var(--radius-sm)] dark:bg-[var(--accent-cyan)] dark:text-white dark:shadow-[0_4px_15px_rgba(6,182,212,.25)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:bg-[var(--accent-cyan)] dark:hover:shadow-[0_6px_20px_rgba(6,182,212,.4)] max-[760px]:px-[9px] max-[760px]:text-[10px]" onClick={openNewNote} disabled={isOffline}><Plus size={17} /> New note</button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="mb-[17px] mt-[2px] flex flex-wrap items-center gap-[7px] text-[var(--muted)]" aria-label="Filter notes by tag">
          <Tag size={14} />
          <button className={`cursor-pointer rounded-[20px] border px-[9px] py-[6px] text-[10px] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-secondary)] ${tagFilter === 'all' ? 'border-[var(--green)] bg-[var(--green-soft)] text-[var(--green)] dark:border-[var(--accent-cyan)] dark:bg-[rgba(6,182,212,.15)] dark:text-[var(--accent-cyan)]' : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]'}`} onClick={() => setTagFilter('all')}>All notes</button>
          {allTags.map((tag) => <button key={tag} className={`cursor-pointer rounded-[20px] border px-[9px] py-[6px] text-[10px] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-secondary)] ${tagFilter === tag ? 'border-[var(--green)] bg-[var(--green-soft)] text-[var(--green)] dark:border-[var(--accent-cyan)] dark:bg-[rgba(6,182,212,.15)] dark:text-[var(--accent-cyan)]' : 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]'}`} onClick={() => setTagFilter(tag)}>#{tag}</button>)}
        </div>
      )}

      {filteredNotes.length ? (
        <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
          <AnimatePresence>
            {filteredNotes.map((note) => (
              <motion.article className="group relative min-h-[150px] rounded-xl border border-[color-mix(in_srgb,var(--line),transparent_12%)] bg-[var(--surface)] p-[17px] shadow-[0_5px_18px_rgba(47,57,49,.025)] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-[var(--accent)] has-[a:focus-visible]:outline-offset-[3px] dark:rounded-[var(--radius-lg)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:border-[rgba(6,182,212,.4)] dark:hover:bg-[var(--bg-card-hover)]" key={note.id} layout initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-[5px] text-[10px] text-[var(--muted)]"><CalendarDays size={13} />{note.date ? format(new Date(`${note.date}T00:00:00`), 'MMM d, yyyy') : 'No date'}</span><span className="relative z-[2] flex gap-1">
                  <button className="inline-grid size-[31px] place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] disabled:cursor-wait disabled:opacity-70 dark:rounded-[var(--radius-sm)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)]" onClick={(event) => { event.stopPropagation(); beginEdit(note); }} aria-label={`Edit ${note.topic}`} disabled={isOffline}><Pencil size={14} /></button>
                  <button className="inline-grid size-[31px] place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition hover:border-[#e6b8b0] hover:bg-[#fbede9] hover:text-[#bd5549] disabled:cursor-wait disabled:opacity-70 dark:rounded-[var(--radius-sm)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:border-[rgba(239,68,68,.4)] dark:hover:bg-[rgba(239,68,68,.12)] dark:hover:text-[var(--accent-red)]" onClick={(event) => { event.stopPropagation(); removeNote(note); }} aria-label={`Delete ${note.topic}`} disabled={isOffline}><Trash2 size={14} /></button>
                </span></div>
                <ItemDetailLink className="static block text-inherit no-underline after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] after:content-['']" href={`/notes/${encodeURIComponent(note.id)}`} onOpen={() => onOpenItem(note.id)} ariaLabel={`Open note details: ${note.topic}`}>
                  <h3 className="mb-[7px] mt-3 font-[family-name:Manrope] text-[15px] font-bold tracking-[-.2px] group-hover:text-[var(--accent-hover)]"><HighlightedText query={searchQuery}>{note.topic}</HighlightedText></h3>
                  <p className="m-0 whitespace-pre-wrap text-xs leading-[1.65] text-[var(--muted)] [overflow-wrap:anywhere]"><HighlightedText query={searchQuery}>{note.content}</HighlightedText></p>
                </ItemDetailLink>
                {(note.tags || []).length > 0 && <div className="relative z-[2] mt-3 flex flex-wrap gap-[6px]">{note.tags.map((tag) => <button className="cursor-pointer rounded-[5px] border-0 bg-[var(--green-soft)] px-[7px] py-1 text-[10px] text-[var(--green)] dark:rounded-[4px] dark:bg-[rgba(255,255,255,.05)] dark:text-[var(--text-secondary)] dark:text-[11px] dark:font-semibold" key={tag} onClick={(event) => { event.stopPropagation(); setTagFilter(tag); }}>#{tag}</button>)}</div>}
                {note.taskId && <span className="mt-[11px] block text-[10px] font-semibold text-[var(--accent-hover)]">Linked task: {tasks.find((task) => task.id === note.taskId)?.name || 'Task'}</span>}
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="mt-[10px] flex min-h-[215px] flex-col items-center justify-center rounded-[13px] border border-dashed border-[var(--line)] px-[18px] py-[34px] text-center">
          <span className="grid size-11 place-items-center rounded-[13px] bg-[var(--accent-soft)] text-[var(--accent)]"><Search size={21} /></span>
          <h3 className="mb-1 mt-[13px] font-[family-name:Manrope] text-[15px] font-bold">{searchQuery || tagFilter !== 'all' ? 'No notes found.' : 'Save a thought for later.'}</h3>
          <p className="m-0 max-w-[340px] text-xs leading-[1.6] text-[var(--muted)]">{searchQuery ? 'Try another phrase or choose a different tag.' : 'Capture meeting notes, ideas, or the small things you want to remember.'}</p>
          {!searchQuery && <button className="mt-[13px] inline-flex cursor-pointer items-center gap-[6px] border-0 bg-transparent p-[6px] text-xs font-bold text-[var(--accent-hover)] disabled:cursor-wait disabled:opacity-70 dark:text-[var(--accent-cyan)]" onClick={openNewNote} disabled={isOffline}>Write a note <Plus size={15} /></button>}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(23,31,27,.48)] p-5 backdrop-blur-[4px] max-[760px]:p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
            <motion.form className="max-h-[calc(100dvh-40px)] w-full max-w-[490px] overscroll-contain overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-[25px] shadow-[0_24px_70px_rgba(15,23,18,.2)] dark:border-[var(--border-color)] dark:bg-[var(--glass-bg)] dark:text-[var(--text-primary)] dark:backdrop-blur-[20px] max-[760px]:max-h-[calc(100dvh-24px)] max-[760px]:p-[18px]" onSubmit={saveNote} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <div className="mb-5 flex items-start justify-between">
                <div><span className="mb-2 block text-[10px] font-bold tracking-[1.35px] text-[var(--accent-hover)]">SAVE THIS MOMENT</span><h2 className="m-0 font-[family-name:Manrope] text-xl font-bold">{editingNote ? 'Edit note' : 'New note'}</h2></div>
                <button className="inline-grid size-[38px] place-items-center rounded-[10px] border border-transparent bg-transparent text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)]" type="button" onClick={() => setShowModal(false)} aria-label="Close"><X size={18} /></button>
              </div>
              <label className="mb-[7px] mt-[15px] block text-[11px] font-bold text-[var(--ink)]" htmlFor="note-title">Title</label>
              <input id="note-title" className="min-h-[41px] w-full rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-[11px] py-[10px] text-xs text-[var(--ink)] placeholder:text-[#9ba49d] dark:border-[var(--border-color)] dark:bg-[var(--bg-base)] dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)]" maxLength={200} value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} placeholder="What is this note about?" required autoFocus />
              <label className="mb-[7px] mt-[15px] block text-[11px] font-bold text-[var(--ink)]" htmlFor="note-content">Your note</label>
              <textarea id="note-content" className="min-h-[130px] w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-[11px] py-[10px] text-xs leading-[1.55] text-[var(--ink)] placeholder:text-[#9ba49d] dark:border-[var(--border-color)] dark:bg-[var(--bg-base)] dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)]" maxLength={12000} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Write freely. You can tidy it up later." required />
              <div className="mt-px grid grid-cols-2 gap-x-3 [&_.form-label]:mt-[13px] max-[420px]:grid-cols-1">
                <DatePicker label="Date" id="note-date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
                <div><label className="mb-[7px] mt-[13px] block text-[11px] font-bold text-[var(--ink)]" htmlFor="note-tags">Tags</label><input id="note-tags" className="min-h-[41px] w-full rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-[11px] py-[10px] text-xs text-[var(--ink)] placeholder:text-[#9ba49d] dark:border-[var(--border-color)] dark:bg-[var(--bg-base)] dark:text-[var(--text-primary)] dark:placeholder:text-[var(--text-secondary)]" maxLength={500} value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="work, ideas" /></div>
                <div><label className="mb-[7px] mt-[13px] block text-[11px] font-bold text-[var(--ink)]" htmlFor="note-task">Related task</label><DropdownSelect id="note-task" label="Related task" value={form.taskId} onChange={(taskId) => setForm({ ...form, taskId })} options={[{ value: '', label: 'No linked task' }, ...tasks.map((task) => ({ value: String(task.id), label: task.name }))]} /></div>
              </div>
              <div className="mt-[22px] flex justify-end gap-2">
                <button className="inline-flex min-h-[39px] cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[var(--line)] bg-[var(--surface)] px-[14px] text-xs font-bold text-[var(--ink)] transition hover:bg-[var(--surface-muted)] dark:rounded-[var(--radius-sm)] dark:border-[var(--border-color)] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)] dark:hover:bg-[var(--bg-card-hover)] dark:hover:text-[var(--accent-cyan)]" type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="inline-flex min-h-[39px] cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-transparent bg-[var(--accent)] px-[14px] text-xs font-bold text-[#fffaf5] transition-all duration-[160ms] hover:-translate-y-px hover:bg-[var(--accent-hover)] disabled:transform-none disabled:cursor-wait disabled:opacity-70 dark:rounded-[var(--radius-sm)] dark:bg-[var(--accent-cyan)] dark:text-white dark:shadow-[0_4px_15px_rgba(6,182,212,.25)] dark:transition-all dark:duration-300 dark:hover:-translate-y-0.5 dark:hover:bg-[var(--accent-cyan)] dark:hover:shadow-[0_6px_20px_rgba(6,182,212,.4)]" type="submit" disabled={saving || isOffline}>{saving ? 'Saving…' : editingNote ? 'Save changes' : 'Save note'}</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
