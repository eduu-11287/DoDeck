import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, Check, X, NotebookPen, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fetchNotes, createNote, updateNote, deleteNote, downloadNotes } from '../api';

export default function NotesPanel({ notes, onNotesChange, onLogout }) {
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [form, setForm] = useState({ topic: '', content: '', date: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => {
    refreshNotes();
  }, []);

  const refreshNotes = async () => {
    const n = await fetchNotes();
    onNotesChange(n);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.topic || !form.content) return alert('Topic and content required');
    if (editingNote) await updateNote(editingNote.id, form);
    else await createNote(form);
    setShowModal(false);
    setEditingNote(null);
    setForm({ topic: '', content: '', date: format(new Date(), 'yyyy-MM-dd') });
    refreshNotes();
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setForm({ topic: note.topic, content: note.content, date: note.date || format(new Date(), 'yyyy-MM-dd') });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return;
    await deleteNote(id);
    refreshNotes();
  };

  const notesByDate = {};
  notes.forEach((note) => {
    const dateKey = note.date ? format(new Date(note.date + 'T00:00:00'), 'MMMM d, yyyy') : 'No date';
    if (!notesByDate[dateKey]) notesByDate[dateKey] = [];
    notesByDate[dateKey].push(note);
  });

  const sortedDates = Object.keys(notesByDate).sort((a, b) => {
    if (a === 'No date') return 1;
    if (b === 'No date') return -1;
    return new Date(notesByDate[a][0].date) - new Date(notesByDate[b][0].date);
  });

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
        <div className="text-xs font-bold uppercase tracking-[2px] text-indigo-600 dark:text-indigo-400 mb-1">Capture</div>
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">Your Notes</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Thoughts, ideas, and moments worth remembering.</p>
      </motion.div>

      {notes.length === 0 ? (
        <motion.div className="flex flex-col items-center justify-center py-20 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center mb-4">
            <NotebookPen size={32} className="text-violet-600 dark:text-violet-400" />
          </motion.div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No notes yet</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Click the + button to capture your first thought.</p>
        </motion.div>
      ) : (
        <div className="space-y-6 mb-24">
          <AnimatePresence>
            {sortedDates.map((dateKey, groupIndex) => (
              <motion.div key={dateKey} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: groupIndex * 0.06 }}>
                <div className="flex items-center gap-3 mb-3">
                  <CalendarIcon size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-[2px] text-indigo-600 dark:text-indigo-400">{dateKey}</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-indigo-400/40 dark:from-indigo-500/30 to-transparent" />
                </div>

                <div className="space-y-3">
                  {notesByDate[dateKey].map((note, noteIndex) => (
                    <motion.div
                      key={note.id}
                      className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden group"
                      initial={{ opacity: 0, y: 20, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{ delay: noteIndex * 0.04, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                      whileHover={{ y: -2 }}
                    >
                      <div className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md opacity-60" />

                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 leading-snug">{note.topic}</h3>
                        {note.date && (
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full bg-slate-100/80 dark:bg-slate-800/80 shrink-0">
                            {format(new Date(note.date + 'T00:00:00'), 'MMM d')}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{note.content}</p>

                      <div className="flex gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button onClick={() => handleEdit(note)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                          <Edit3 size={13} className="inline mr-1" /> Edit
                        </button>
                        <button onClick={() => handleDelete(note.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                          <Trash2 size={13} className="inline mr-1" /> Delete
                        </button>
                      </div>

                      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-violet-400/8 to-indigo-400/8 blur-2xl mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <motion.button
        onClick={() => { setEditingNote(null); setForm({ topic: '', content: '', date: format(new Date(), 'yyyy-MM-dd') }); setShowModal(true); }}
        whileHover={{ scale: 1.08, rotate: 90 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 flex items-center justify-center z-40"
      >
        <Plus size={26} />
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.form
              onSubmit={handleSave}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-3xl p-6 shadow-xl"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{editingNote ? 'Edit Note' : 'New Note'}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-5">{editingNote ? 'Update your note.' : 'Capture a new thought.'}</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mb-1.5">Topic</label>
                  <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Note title..." required autoFocus className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[1.5px] text-slate-500 dark:text-slate-400 mb-1.5">Content</label>
                  <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your thoughts..." required rows={4} className="w-full px-4 py-2.5 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none" />
                </div>
              </div>

              <div className="flex gap-2.5 mt-6 justify-end">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                  <Check size={14} className="inline mr-1" /> {editingNote ? 'Update' : 'Save Note'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}