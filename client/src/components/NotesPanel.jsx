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
    <section className="notes-view">
      <div className="notes-toolbar">
        <div className="notes-summary"><span className="notes-symbol"><FileText size={18} /></span><span><strong>{notes.length}</strong> {notes.length === 1 ? 'note' : 'notes'} saved</span></div>
        <div className="notes-actions">
          <button className="secondary-button" onClick={exportNotes} disabled={isOffline}><Download size={15} /> Export</button>
          <button className="primary-button" onClick={openNewNote} disabled={isOffline}><Plus size={17} /> New note</button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="tag-filter-row" aria-label="Filter notes by tag">
          <Tag size={14} />
          <button className={`tag-filter${tagFilter === 'all' ? ' selected' : ''}`} onClick={() => setTagFilter('all')}>All notes</button>
          {allTags.map((tag) => <button key={tag} className={`tag-filter${tagFilter === tag ? ' selected' : ''}`} onClick={() => setTagFilter(tag)}>#{tag}</button>)}
        </div>
      )}

      {filteredNotes.length ? (
        <div className="notes-grid">
          <AnimatePresence>
            {filteredNotes.map((note) => (
              <motion.article className="note-card" key={note.id} layout initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
                <div className="note-card-top"><span className="note-date"><CalendarDays size={13} />{note.date ? format(new Date(`${note.date}T00:00:00`), 'MMM d, yyyy') : 'No date'}</span><span className="note-controls"><button className="icon-button small" onClick={(event) => { event.stopPropagation(); beginEdit(note); }} aria-label={`Edit ${note.topic}`} disabled={isOffline}><Pencil size={14} /></button><button className="icon-button small delete-action" onClick={(event) => { event.stopPropagation(); removeNote(note); }} aria-label={`Delete ${note.topic}`} disabled={isOffline}><Trash2 size={14} /></button></span></div>
                <ItemDetailLink className="note-card-link" href={`/notes/${encodeURIComponent(note.id)}`} onOpen={() => onOpenItem(note.id)} ariaLabel={`Open note details: ${note.topic}`}>
                  <h3><HighlightedText query={searchQuery}>{note.topic}</HighlightedText></h3>
                  <p className="note-content"><HighlightedText query={searchQuery}>{note.content}</HighlightedText></p>
                </ItemDetailLink>
                {(note.tags || []).length > 0 && <div className="note-tags">{note.tags.map((tag) => <button key={tag} onClick={(event) => { event.stopPropagation(); setTagFilter(tag); }}>#{tag}</button>)}</div>}
                {note.taskId && <span className="linked-task-label">Linked task: {tasks.find((task) => task.id === note.taskId)?.name || 'Task'}</span>}
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="empty-state notes-empty">
          <span className="empty-icon"><Search size={21} /></span>
          <h3>{searchQuery || tagFilter !== 'all' ? 'No notes found.' : 'Save a thought for later.'}</h3>
          <p>{searchQuery ? 'Try another phrase or choose a different tag.' : 'Capture meeting notes, ideas, or the small things you want to remember.'}</p>
          {!searchQuery && <button className="text-button" onClick={openNewNote} disabled={isOffline}>Write a note <Plus size={15} /></button>}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
            <motion.form className="edit-dialog note-dialog" onSubmit={saveNote} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <div className="dialog-heading"><div><span className="eyebrow">SAVE THIS MOMENT</span><h2>{editingNote ? 'Edit note' : 'New note'}</h2></div><button className="icon-button" type="button" onClick={() => setShowModal(false)} aria-label="Close"><X size={18} /></button></div>
              <label className="form-label" htmlFor="note-title">Title</label>
              <input id="note-title" className="form-input" maxLength={200} value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} placeholder="What is this note about?" required autoFocus />
              <label className="form-label" htmlFor="note-content">Your note</label>
              <textarea id="note-content" className="form-input note-textarea" maxLength={12000} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Write freely. You can tidy it up later." required />
              <div className="form-grid">
                <DatePicker label="Date" id="note-date" value={form.date} onChange={(date) => setForm({ ...form, date })} />
                <div><label className="form-label" htmlFor="note-tags">Tags</label><input id="note-tags" className="form-input" maxLength={500} value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="work, ideas" /></div>
                <div><label className="form-label" htmlFor="note-task">Related task</label><DropdownSelect id="note-task" className="form-select-trigger" label="Related task" value={form.taskId} onChange={(taskId) => setForm({ ...form, taskId })} options={[{ value: '', label: 'No linked task' }, ...tasks.map((task) => ({ value: String(task.id), label: task.name }))]} /></div>
              </div>
              <div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setShowModal(false)}>Cancel</button><button className="primary-button" type="submit" disabled={saving || isOffline}>{saving ? 'Saving…' : editingNote ? 'Save changes' : 'Save note'}</button></div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
