import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useTranslation } from '../../i18n';
import {
  StickyNote,
  Plus,
  Pin,
  PinOff,
  Palette,
  Trash2,
  Edit3,
  CheckSquare,
  Square,
  Search,
  Filter,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

const COLOR_THEMES = {
  default: {
    id: 'default',
    name: 'Default',
    bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100',
    swatch: 'bg-white border-slate-300 dark:bg-slate-800'
  },
  yellow: {
    id: 'yellow',
    name: 'Yellow',
    bg: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-100',
    swatch: 'bg-amber-200 border-amber-300'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100',
    swatch: 'bg-emerald-200 border-emerald-300'
  },
  sky: {
    id: 'sky',
    name: 'Sky Blue',
    bg: 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60 text-sky-950 dark:text-sky-100',
    swatch: 'bg-sky-200 border-sky-300'
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    bg: 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-100',
    swatch: 'bg-rose-200 border-rose-300'
  },
  purple: {
    id: 'purple',
    name: 'Purple',
    bg: 'bg-purple-50/90 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 text-purple-950 dark:text-purple-100',
    swatch: 'bg-purple-200 border-purple-300'
  },
  orange: {
    id: 'orange',
    name: 'Orange',
    bg: 'bg-orange-50/90 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60 text-orange-950 dark:text-orange-100',
    swatch: 'bg-orange-200 border-orange-300'
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    bg: 'bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-100',
    swatch: 'bg-indigo-200 border-indigo-300'
  }
};

export default function Notes() {
  const { t } = useTranslation();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState('all');

  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formColor, setFormColor] = useState('default');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formChecklist, setFormChecklist] = useState([]);

  // Form Checklist Element: (text field, checkbox, + add button)
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistChecked, setNewChecklistChecked] = useState(false);

  // Card Quick Add Checklist State per note card: noteId -> { text: '', checked: false }
  const [cardQuickInputs, setCardQuickInputs] = useState({});

  // Palette Picker Popover on Note Card: noteId -> boolean
  const [activePaletteNoteId, setActivePaletteNoteId] = useState(null);

  // Fetch Notes
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notes');
      if (res.success && Array.isArray(res.data)) {
        setNotes(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Open modal to create note
  const handleOpenCreateModal = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormColor('default');
    setFormIsPinned(false);
    setFormChecklist([]);
    setNewChecklistText('');
    setNewChecklistChecked(false);
    setIsModalOpen(true);
  };

  // Open modal to edit existing note
  const handleOpenEditModal = (note) => {
    setEditingNote(note);
    setFormTitle(note.title || '');
    setFormContent(note.content || '');
    setFormColor(note.color || 'default');
    setFormIsPinned(Boolean(note.isPinned));
    setFormChecklist(Array.isArray(note.checklist) ? [...note.checklist] : []);
    setNewChecklistText('');
    setNewChecklistChecked(false);
    setIsModalOpen(true);
  };

  // Checklist Form Element: + Add button handler
  const handleAddChecklistItemToForm = () => {
    if (!newChecklistText.trim()) return;

    setFormChecklist((prev) => [
      ...prev,
      {
        text: newChecklistText.trim(),
        completed: Boolean(newChecklistChecked)
      }
    ]);
    setNewChecklistText('');
    setNewChecklistChecked(false);
  };

  const handleRemoveChecklistItemFromForm = (index) => {
    setFormChecklist((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleChecklistItemInForm = (index) => {
    setFormChecklist((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, completed: !item.completed } : item
      )
    );
  };

  // Save Note (Create or Update)
  const handleSaveNote = async (e) => {
    e?.preventDefault();

    let finalChecklist = [...formChecklist];
    // If user typed in the input without hitting "+ Add", include it
    if (newChecklistText.trim()) {
      finalChecklist.push({
        text: newChecklistText.trim(),
        completed: Boolean(newChecklistChecked)
      });
    }

    const payload = {
      title: formTitle.trim(),
      content: formContent,
      color: formColor,
      isPinned: formIsPinned,
      checklist: finalChecklist
    };

    try {
      if (editingNote) {
        const res = await api.put(`/notes/${editingNote._id}`, payload);
        if (res.success && res.data) {
          setNotes((prev) => prev.map((n) => (n._id === editingNote._id ? res.data : n)));
        }
      } else {
        const res = await api.post('/notes', payload);
        if (res.success && res.data) {
          setNotes((prev) => [res.data, ...prev]);
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.warn('Failed to save note:', err);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId, e) => {
    e?.stopPropagation();
    if (!window.confirm(t('Are you sure you want to delete this note?'))) return;

    try {
      const res = await api.delete(`/notes/${noteId}`);
      if (res.success) {
        setNotes((prev) => prev.filter((n) => n._id !== noteId));
      }
    } catch (err) {
      console.warn('Failed to delete note:', err);
    }
  };

  // Toggle pin/unpin directly on card
  const handleTogglePin = async (noteId, e) => {
    e?.stopPropagation();
    try {
      const res = await api.patch(`/notes/${noteId}/pin`);
      if (res.success && res.data) {
        setNotes((prev) =>
          prev.map((n) => (n._id === noteId ? { ...n, isPinned: res.data.isPinned } : n))
        );
      }
    } catch (err) {
      console.warn('Failed to toggle pin:', err);
    }
  };

  // Update note color directly on card
  const handleUpdateColor = async (noteId, colorKey, e) => {
    e?.stopPropagation();
    try {
      const res = await api.patch(`/notes/${noteId}/color`, { color: colorKey });
      if (res.success && res.data) {
        setNotes((prev) =>
          prev.map((n) => (n._id === noteId ? { ...n, color: colorKey } : n))
        );
      }
      setActivePaletteNoteId(null);
    } catch (err) {
      console.warn('Failed to update color:', err);
    }
  };

  // Toggle checklist item completion directly on card
  const handleToggleCardChecklistItem = async (noteId, itemId, e) => {
    e?.stopPropagation();
    try {
      // Optimistic UI update
      setNotes((prev) =>
        prev.map((n) => {
          if (n._id !== noteId) return n;
          return {
            ...n,
            checklist: n.checklist.map((item) =>
              item._id === itemId ? { ...item, completed: !item.completed } : item
            )
          };
        })
      );

      await api.patch(`/notes/${noteId}/checklist/${itemId}`);
    } catch (err) {
      console.warn('Failed to toggle checklist item:', err);
      fetchNotes(); // Rollback
    }
  };

  // Quick Add Checklist Item directly on Note Card: (text field, checkbox, + add button)
  const handleQuickAddChecklistItem = async (noteId, e) => {
    e?.preventDefault();
    e?.stopPropagation();

    const inputState = cardQuickInputs[noteId] || { text: '', checked: false };
    if (!inputState.text?.trim()) return;

    try {
      const res = await api.post(`/notes/${noteId}/checklist`, {
        text: inputState.text.trim(),
        completed: Boolean(inputState.checked)
      });

      if (res.success && res.data) {
        setNotes((prev) => prev.map((n) => (n._id === noteId ? res.data : n)));
        setCardQuickInputs((prev) => ({
          ...prev,
          [noteId]: { text: '', checked: false }
        }));
      }
    } catch (err) {
      console.warn('Failed to quick add checklist item:', err);
    }
  };

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    if (colorFilter !== 'all' && (note.color || 'default') !== colorFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = note.title?.toLowerCase().includes(q);
      const matchContent = note.content?.toLowerCase().includes(q);
      const matchChecklist = note.checklist?.some((i) => i.text.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchChecklist) return false;
    }
    return true;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const otherNotes = filteredNotes.filter((n) => !n.isPinned);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <StickyNote className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {t('nav.notes', 'Personal Notes')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('Private sticky notes, color-coding, checklists and pinning. Visible only to you.')}
            </p>
          </div>
        </div>

        {/* Create Note Button */}
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary-500 text-white hover:bg-primary-600 transition flex items-center gap-2 shadow-xs active:scale-95 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('New Note')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('Search notes and checklist items...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        {/* Color Palette Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Palette className="w-3 h-3" /> {t('Color:')}
          </span>
          <button
            onClick={() => setColorFilter('all')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              colorFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {t('All')}
          </button>
          {Object.values(COLOR_THEMES).map((theme) => (
            <button
              key={theme.id}
              onClick={() => setColorFilter(theme.id)}
              className={`w-6 h-6 rounded-full border transition ${theme.swatch} ${
                colorFilter === theme.id ? 'ring-2 ring-primary-500 ring-offset-2' : 'hover:scale-110'
              }`}
              title={t(theme.name)}
            />
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          {t('Loading your notes...')}
        </div>
      ) : notes.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <StickyNote className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('No notes yet')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {t('Create your first personal note with checklists, custom colors, and pin important items.')}
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-500 text-white hover:bg-primary-600 transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Create a Note')}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pinned Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Pin className="w-3.5 h-3.5 fill-current" />
                <span>{t('Pinned Notes')} ({pinnedNotes.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotes.map((note) => renderNoteCard(note))}
              </div>
            </div>
          )}

          {/* Other Notes Section */}
          {otherNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                  <StickyNote className="w-3.5 h-3.5" />
                  <span>{t('Other Notes')} ({otherNotes.length})</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherNotes.map((note) => renderNoteCard(note))}
              </div>
            </div>
          )}

          {filteredNotes.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              {t('No notes match your search or filter.')}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-primary-500" />
                <span>{editingNote ? t('Edit Note') : t('Create Personal Note')}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNote} className="p-5 space-y-4">
              {/* Title & Pin */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={t('Note Title...')}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setFormIsPinned(!formIsPinned)}
                  className={`p-2 rounded-xl border transition ${
                    formIsPinned
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 border-amber-300 dark:border-amber-700'
                      : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                  }`}
                  title={formIsPinned ? t('Pinned (Click to unpin)') : t('Unpinned (Click to pin)')}
                >
                  {formIsPinned ? (
                    <Pin className="w-4 h-4 fill-current" />
                  ) : (
                    <PinOff className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Content Body */}
              <div>
                <textarea
                  placeholder={t('Take a note...')}
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none leading-relaxed"
                />
              </div>

              {/* Checklist Section with explicit Form Element: (text field, checkbox, + add button) */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-primary-500" />
                    <span>{t('Checklist Items')}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {formChecklist.filter((i) => i.completed).length}/{formChecklist.length} {t('completed')}
                  </span>
                </div>

                {/* Checklist Form Element: text field, checkbox, + add button */}
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <label
                    className="flex items-center cursor-pointer"
                    title={t('Initial completion status')}
                  >
                    <input
                      type="checkbox"
                      checked={newChecklistChecked}
                      onChange={(e) => setNewChecklistChecked(e.target.checked)}
                      className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                    />
                  </label>
                  <input
                    type="text"
                    placeholder={t('Checklist item text...')}
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItemToForm();
                      }
                    }}
                    className="flex-1 px-2.5 py-1 text-xs bg-transparent border-none focus:outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItemToForm}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition flex items-center gap-1 shrink-0 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('Add')}</span>
                  </button>
                </div>

                {/* Render added checklist items */}
                {formChecklist.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 pt-1">
                    {formChecklist.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleChecklistItemInForm(idx)}
                          className="flex items-center gap-2 text-left flex-1 min-w-0"
                        >
                          {item.completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              item.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {item.text}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItemFromForm(idx)}
                          className="text-slate-400 hover:text-rose-500 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Color Palette Selector */}
              <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary-500" />
                  <span>{t('Note Background Color')}</span>
                </label>
                <div className="flex items-center gap-2">
                  {Object.values(COLOR_THEMES).map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setFormColor(theme.id)}
                      className={`w-7 h-7 rounded-full border transition ${theme.swatch} ${
                        formColor === theme.id
                          ? 'ring-2 ring-primary-500 ring-offset-2 scale-110'
                          : 'hover:scale-105'
                      }`}
                      title={t(theme.name)}
                    />
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-500 text-white hover:bg-primary-600 transition shadow-xs"
                >
                  {editingNote ? t('Save Changes') : t('Create Note')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  // Render a Single Note Card
  function renderNoteCard(note) {
    const theme = COLOR_THEMES[note.color] || COLOR_THEMES.default;
    const isPaletteOpen = activePaletteNoteId === note._id;
    const quickInput = cardQuickInputs[note._id] || { text: '', checked: false };

    return (
      <div
        key={note._id}
        onClick={() => handleOpenEditModal(note)}
        className={`rounded-2xl border p-5 shadow-xs transition hover:shadow-md cursor-pointer flex flex-col justify-between group relative ${theme.bg}`}
      >
        <div className="space-y-3">
          {/* Top Bar: Title & Fast Actions */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm tracking-tight line-clamp-2">
              {note.title || t('Untitled Note')}
            </h3>
            <div
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pin / Unpin button */}
              <button
                onClick={(e) => handleTogglePin(note._id, e)}
                className={`p-1.5 rounded-lg transition ${
                  note.isPinned
                    ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/40'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title={note.isPinned ? t('Unpin note') : t('Pin note to top')}
              >
                {note.isPinned ? (
                  <Pin className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <PinOff className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Color Palette Popover Button */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePaletteNoteId(isPaletteOpen ? null : note._id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 dark:hover:bg-white/5 transition"
                  title={t('Change color')}
                >
                  <Palette className="w-3.5 h-3.5" />
                </button>

                {isPaletteOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-20 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {Object.values(COLOR_THEMES).map((th) => (
                      <button
                        key={th.id}
                        onClick={(e) => handleUpdateColor(note._id, th.id, e)}
                        className={`w-5 h-5 rounded-full border transition ${th.swatch} hover:scale-125`}
                        title={t(th.name)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteNote(note._id, e)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                title={t('Delete note')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content Body */}
          {note.content && (
            <p className="text-xs leading-relaxed whitespace-pre-line line-clamp-6 opacity-90">
              {note.content}
            </p>
          )}

          {/* Checklist Items */}
          {Array.isArray(note.checklist) && note.checklist.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {note.checklist.map((item) => (
                <div
                  key={item._id}
                  onClick={(e) => handleToggleCardChecklistItem(note._id, item._id, e)}
                  className="flex items-center gap-2 text-xs py-0.5 hover:opacity-100 transition"
                >
                  {item.completed ? (
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  )}
                  <span
                    className={`truncate ${
                      item.completed ? 'line-through opacity-50' : 'opacity-90'
                    }`}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card Quick-Add Checklist Form Element: (text field, checkbox, + add button) */}
        <div
          className="mt-4 pt-3 border-t border-black/10 dark:border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <form
            onSubmit={(e) => handleQuickAddChecklistItem(note._id, e)}
            className="flex items-center gap-1.5 text-xs"
          >
            <input
              type="checkbox"
              checked={quickInput.checked || false}
              onChange={(e) =>
                setCardQuickInputs((prev) => ({
                  ...prev,
                  [noteIdKey(note._id)]: {
                    ...prev[noteIdKey(note._id)],
                    checked: e.target.checked
                  }
                }))
              }
              className="w-3.5 h-3.5 rounded text-primary-600 border-slate-300 dark:border-slate-600 cursor-pointer"
              title={t('Item status')}
            />
            <input
              type="text"
              placeholder={t('+ add checklist item...')}
              value={quickInput.text || ''}
              onChange={(e) =>
                setCardQuickInputs((prev) => ({
                  ...prev,
                  [noteIdKey(note._id)]: {
                    ...prev[noteIdKey(note._id)],
                    text: e.target.value
                  }
                }))
              }
              className="flex-1 px-2 py-1 text-[11px] rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder:opacity-50"
            />
            <button
              type="submit"
              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition shrink-0 active:scale-95"
            >
              {t('+ Add')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  function noteIdKey(id) {
    return String(id);
  }
}

