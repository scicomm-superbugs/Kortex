/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, Plus, Trash2, Folder, Tag, Search, BookOpen, 
  Link2, Clock, CalendarDays, ExternalLink, ArrowRight, Eye, CheckSquare 
} from 'lucide-react';
import { WorkspaceState, Note } from '../types';
import { generateId, renderFormattedText } from '../utils';

interface NotesViewProps {
  state: WorkspaceState;
  setState: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  onSelectItem: (id: string) => void;
  selectedFolderFilter: string | null;
  onSelectFolderFilter: (folderId: string | null) => void;
  theme?: 'light' | 'dark';
}

export function NotesView({
  state,
  setState,
  onSelectItem,
  selectedFolderFilter,
  onSelectFolderFilter,
  theme = 'dark'
}: NotesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(selectedFolderFilter || '');
  const [selectedLabelId, setSelectedLabelId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [hideCompleted, setHideCompleted] = useState<boolean>(() => {
    return localStorage.getItem('hide_completed_notes') === 'true';
  });

  // Form states for new note creation
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newFolderId, setNewFolderId] = useState('');
  const [newLabelIds, setNewLabelIds] = useState<string[]>([]);

  const handleInsertFormat = (
    textareaId: string,
    prefix: string,
    suffix: string,
    setValue: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (!el) {
      setValue(prev => prev + prefix + suffix);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selectedText = text.substring(start, end);
    const replacement = prefix + selectedText + suffix;
    
    setValue(text.substring(0, start) + replacement + text.substring(end));
    
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  // Sync folder parameter changes from sidebar
  React.useEffect(() => {
    if (selectedFolderFilter) {
      setSelectedFolderId(selectedFolderFilter);
    }
  }, [selectedFolderFilter]);

  const filteredNotes = React.useMemo(() => {
    return state.notes.filter(note => {
      const matchSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFolder = selectedFolderId ? note.folderId === selectedFolderId : true;
      const matchCompleted = hideCompleted ? !note.completed : true;
      return matchSearch && matchFolder && matchCompleted;
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [state.notes, searchQuery, selectedFolderId, hideCompleted]);

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newNote: Note = {
      id: `note-${generateId()}`,
      type: 'note',
      title: newTitle,
      content: newContent || '*No content written yet.*',
      folderId: newFolderId || undefined,
      labelIds: newLabelIds,
      linkedIds: [],
      createdAt: '2026-06-04',
      updatedAt: '2026-06-04'
    };

    setState(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes]
    }));

    // Reset Form fields
    setNewTitle('');
    setNewContent('');
    setNewFolderId('');
    setNewLabelIds([]);
    setIsAdding(false);
  };

  const handleDeleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setState(prev => ({
      ...prev,
      notes: prev.notes.filter(n => n.id !== id)
    }));
  };

  const handleFormToggleLabel = (id: string) => {
    setNewLabelIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div id="notes-view-root" className="space-y-6 pb-10">
      
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F0F12] p-4 rounded-2xl border border-white/5">
        <div className="space-y-0.5 font-sans">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Notes
          </h2>
          <p className="text-slate-450 text-[11px] font-semibold">Draft notes and link references to your tasks and events.</p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-lg shadow-blue-650/10 cursor-pointer transition-all animate-none"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Filter widgets toolbar */}
      <div className="bg-[#0F0F12] p-4 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-3.5 font-sans">
        
        {/* Search Input bar */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Search</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-white/5 rounded-lg p-2 pl-8.5 text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>
        </div>

        {/* Directory Folder select option */}
        <div className="space-y-1 block">
          <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Folder</label>
          <select
            value={selectedFolderId}
            onChange={(e) => {
              setSelectedFolderId(e.target.value);
              onSelectFolderFilter(e.target.value || null);
            }}
            className="w-full bg-black border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Folders</option>
            {state.folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter Toggle */}
        <div className="space-y-1 flex flex-col justify-end">
          <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Status</label>
          <button
            type="button"
            onClick={() => {
              const newVal = !hideCompleted;
              setHideCompleted(newVal);
              localStorage.setItem('hide_completed_notes', String(newVal));
            }}
            className={`w-full text-left bg-black border rounded-lg p-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
              hideCompleted 
                ? 'border-blue-500/30 text-blue-300 bg-blue-500/5' 
                : 'border-white/5 text-slate-400 hover:border-white/10'
            }`}
          >
            <span>Hide Completed Notes</span>
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-bold ${
              hideCompleted 
                ? 'bg-blue-600 border-blue-400 text-white' 
                : 'border-white/30 text-transparent'
            }`}>✓</span>
          </button>
        </div>

      </div>

      {/* NEW NOTES RICH DOCUMENT PUBLISHER */}
      {isAdding && (
        <form onSubmit={handleCreateNote} className="bg-[#131316] border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white/80 uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <Plus className="text-blue-400 w-4.5 h-4.5" />
              Create New Note
            </span>
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="text-white/40 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Col: Title & Markdown contents */}
            <div className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Notes title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-550 font-sans"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Content</label>
                  <div className="flex items-center gap-1.5 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('note-content-textarea', '**', '**', setNewContent)}
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 hover:text-white text-[10px] font-bold text-slate-300 cursor-pointer min-w-[18px] text-center"
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('note-content-textarea', '*', '*', setNewContent)}
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 hover:text-white text-[10px] italic text-slate-300 cursor-pointer min-w-[18px] text-center"
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('note-content-textarea', '_', '_', setNewContent)}
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 hover:text-white text-[10px] underline text-slate-300 decoration-indigo-400 cursor-pointer min-w-[18px] text-center"
                      title="Underline"
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('note-content-textarea', '~~', '~~', setNewContent)}
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 hover:text-white text-[10px] line-through text-slate-400 cursor-pointer text-center"
                      title="Strikethrough"
                    >
                      S
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertFormat('note-content-textarea', '- [ ] ', '', setNewContent)}
                      className="px-1.5 py-0.5 rounded bg-indigo-505/10 bg-indigo-500/10 hover:bg-indigo-500/20 text-[9px] font-extrabold text-indigo-400 cursor-pointer flex items-center gap-0.5"
                      title="Insert Checklist Box"
                    >
                      ☑ Box
                    </button>
                  </div>
                </div>
                <textarea
                  id="note-content-textarea"
                  placeholder="What's on your mind? Use - for checklist items."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={8}
                  className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-550 font-mono"
                />
              </div>
            </div>

            {/* Right block: Folder + tags selectors */}
            <div className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Folder</label>
                <select
                  value={newFolderId}
                  onChange={(e) => setNewFolderId(e.target.value)}
                  className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-550 animation-none"
                >
                  <option value="">None</option>
                  {state.folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5 text-[10px] text-slate-500 leading-relaxed">
                🚀 Notes created are immediately searchable, assignable in folders, and linkable directly to tasks or events using the link engine.
              </div>
            </div>

          </div>

          <div className="border-t border-white/5 pt-3 flex justify-end">
            <button
              type="submit"
              className="p-2 px-5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold shadow cursor-pointer transition-colors"
            >
              Create Note
            </button>
          </div>
        </form>
      )}

      {/* RENDER NOTE GRID CARDS */}
      {filteredNotes.length === 0 ? (
        <div className="text-xs text-white/40 py-16 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl font-sans">
          No notes found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-sans">
          {filteredNotes.map(note => {
            const folderObj = state.folders.find(f => f.id === note.folderId);
            const labelsObj = state.labels.filter(lb => note.labelIds.includes(lb.id));

            const lines = (note.content || '').split('\n');
            let totalCheckboxes = 0;
            let checkedCheckboxes = 0;
            lines.forEach(line => {
              const checkboxMatch = line.match(/^(\s*[-*+]\s+)(?:\[([ xX])\]\s*)?(.*)$/);
              if (checkboxMatch) {
                totalCheckboxes++;
                const isChecked = checkboxMatch[2] !== undefined && checkboxMatch[2].toLowerCase() === 'x';
                if (isChecked) {
                  checkedCheckboxes++;
                }
              }
            });

            return (
              <div
                key={note.id}
                onClick={() => onSelectItem(note.id)}
                className="bg-white/[0.02] border border-white/5 rounded-2xl p-4.5 space-y-4 hover:border-white/10 cursor-pointer flex flex-col justify-between group transition-all h-60 overflow-hidden relative shadow"
              >
                <div className="space-y-2.5 overflow-hidden">
                  {/* Category Folder and links label info */}
                  <div className="flex items-center justify-between gap-1 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-1.5 shrink-0 overflow-hidden">
                      {folderObj && (
                        <span 
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none shrink-0"
                          style={{ backgroundColor: `${folderObj.color}15`, borderColor: `${folderObj.color}40`, color: folderObj.color }}
                        >
                          {folderObj.name}
                        </span>
                      )}
                      {totalCheckboxes > 0 && (
                        <span 
                          className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold border border-blue-500/20 flex items-center gap-1 animate-none leading-none shrink-0" 
                          title={`${checkedCheckboxes}/${totalCheckboxes} checklist completed`}
                        >
                          <CheckSquare className="w-2.5 h-2.5" />
                          <span>{checkedCheckboxes}/{totalCheckboxes}</span>
                        </span>
                      )}
                    </div>

                    {note.linkedIds.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-505 bg-indigo-505/10 text-indigo-400 text-[9px] font-bold border border-indigo-500/20 flex items-center gap-0.5" title={`${note.linkedIds.length} active linkages`}>
                        <Link2 className="w-2.5 h-2.5" />
                        {note.linkedIds.length} Linked
                      </span>
                    )}
                  </div>

                  {/* Title heading */}
                  <h3 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors leading-tight line-clamp-2">
                    {note.title}
                  </h3>

                  {/* Body preview */}
                  <div className="text-[11px] text-slate-450 leading-relaxed font-sans line-clamp-4 prose prose-invert whitespace-pre-wrap">
                    {renderFormattedText(note.content)}
                  </div>
                </div>

                {/* Footer labels and updates */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
                  <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                    {/* Tags removed */}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] text-[#A6A6A9] font-mono font-bold uppercase">{note.updatedAt.substring(5)}</span>
                    <button
                      onClick={(e) => handleDeleteNote(e, note.id)}
                      className="p-1 rounded text-red-500 hover:text-[#FF4D4D] hover:bg-white/5 transition-colors"
                      title="Delete notepad outline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
