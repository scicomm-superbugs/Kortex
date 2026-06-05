/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Folder, Plus, Trash2, CheckSquare, CalendarDays, FileText, 
  Layers, ChevronRight, Activity, ArrowUpRight 
} from 'lucide-react';
import { WorkspaceState, Folder as FolderType } from '../types';
import { generateId } from '../utils';

interface FoldersViewProps {
  state: WorkspaceState;
  setState: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  selectedFolderFilter: string | null;
  onSelectFolderFilter: (folderId: string | null) => void;
  onSelectItem: (id: string) => void;
  theme?: 'light' | 'dark';
}

export function FoldersView({
  state,
  setState,
  selectedFolderFilter,
  onSelectFolderFilter,
  onSelectItem,
  theme = 'dark'
}: FoldersViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#6366f1'); // Indigo default

  const colorPresets = [
    '#3b82f6', // Vivid Blue
    '#10b981', // Emerald Green
    '#f59e0b', // Amber Orange
    '#ef4444', // Coral Red
    '#a855f7', // Amethyst Purple
    '#06b6d4', // Cyan
    '#ec4899', // Hot Pink
    '#6366f1', // Indigo Blue
  ];

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolder: FolderType = {
      id: `folder-${generateId()}`,
      name: newFolderName,
      color: newFolderColor,
      description: newFolderDesc || undefined,
      createdAt: '2026-06-04'
    };

    setState(prev => ({
      ...prev,
      folders: [...prev.folders, newFolder]
    }));

    setNewFolderName('');
    setNewFolderDesc('');
    setIsAdding(false);
  };

  const handleDeleteFolder = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setState(prev => ({
      ...prev,
      folders: prev.folders.filter(f => f.id !== id),
      // Clean relationships mapped to deleted folders
      tasks: prev.tasks.map(t => t.folderId === id ? { ...t, folderId: undefined } : t),
      meetings: prev.meetings.map(m => m.folderId === id ? { ...m, folderId: undefined } : m),
      notes: prev.notes.map(n => n.folderId === id ? { ...n, folderId: undefined } : n),
    }));

    if (selectedFolderFilter === id) {
      onSelectFolderFilter(null);
    }
  };

  // Get full lists nested inside selected folder
  const currentFolder = state.folders.find(f => f.id === selectedFolderFilter);

  const folderStats = React.useMemo(() => {
    const stats: Record<string, { tasks: number; meetings: number; notes: number }> = {};
    
    state.folders.forEach(f => {
      stats[f.id] = {
        tasks: state.tasks.filter(t => t.folderId === f.id).length,
        meetings: state.meetings.filter(m => m.folderId === f.id).length,
        notes: state.notes.filter(n => n.folderId === f.id).length,
      };
    });

    return stats;
  }, [state]);

  const folderItemsList = React.useMemo(() => {
    if (!selectedFolderFilter) return [];
    
    const list: { id: string; title: string; type: 'task' | 'meeting' | 'note'; status?: string }[] = [];
    
    state.tasks.filter(t => t.folderId === selectedFolderFilter).forEach(t => {
      list.push({ id: t.id, title: t.title, type: 'task', status: t.status });
    });

    state.meetings.filter(m => m.folderId === selectedFolderFilter).forEach(m => {
      list.push({ id: m.id, title: m.title, type: 'meeting' });
    });

    state.notes.filter(n => n.folderId === selectedFolderFilter).forEach(n => {
      list.push({ id: n.id, title: n.title, type: 'note' });
    });

    return list;
  }, [state, selectedFolderFilter]);

  return (
    <div id="folders-view-root" className="space-y-6 pb-10">
      
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F0F12] p-4 rounded-2xl border border-white/5 font-sans">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-400" />
            Folders
          </h2>
          <p className="text-slate-450 text-[11px] font-semibold">Organize tasks, meetings, and notes into custom folders.</p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 px-4 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Folder</span>
        </button>
      </div>

      {/* COMPOSER PANEL - CREATING NEW DIRECTORIES */}
      {isAdding && (
        <form onSubmit={handleCreateFolder} className="bg-[#131316] border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-white/80 uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <Plus className="text-indigo-400 w-4.5 h-4.5" />
              Create Folder
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
            
            <div className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Name</label>
                <input
                  type="text"
                  required
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Description</label>
                <textarea
                  placeholder="Optional description..."
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>
            </div>

            {/* Colors picker block presets */}
            <div className="space-y-3 font-sans">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Color Accent</label>
                <div className="grid grid-cols-4 gap-2 bg-black p-3 rounded-xl border border-white/5">
                  {colorPresets.map(color => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setNewFolderColor(color)}
                      className={`w-full h-8 rounded-lg cursor-pointer transition-all border-2 ${
                        newFolderColor === color ? 'border-white border-dashed scale-105' : 'border-transparent hover:scale-102'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white/[0.01] rounded-xl border border-white/5">
                <span className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: newFolderColor }} />
                <span className="text-xs font-mono text-slate-400">Color Preview</span>
              </div>
            </div>

          </div>

          <div className="border-t border-white/5 pt-3 flex justify-end">
            <button
              type="submit"
              className="p-2 px-5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold shadow cursor-pointer transition-colors"
            >
              Create Folder
            </button>
          </div>
        </form>
      )}

      {/* RENDER GRID LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 font-sans">
        
        {state.folders.map(folder => {
          const statsVal = folderStats[folder.id] || { tasks: 0, meetings: 0, notes: 0 };
          const totalItems = statsVal.tasks + statsVal.meetings + statsVal.notes;
          const isSelected = selectedFolderFilter === folder.id;

          return (
            <div
              key={folder.id}
              onClick={() => onSelectFolderFilter(isSelected ? null : folder.id)}
              className={`bg-white/[0.02] border rounded-2xl p-4.5 space-y-4 hover:border-white/10 transition-all cursor-pointer relative shadow flex flex-col justify-between ${
                isSelected ? 'border-indigo-500 bg-[#131118] ring-1 ring-indigo-500/20' : 'border-white/5'
              }`}
            >
              {/* Folder Header accent */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {/* Circle Accent */}
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: folder.color }} />
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-white leading-none">
                      {folder.name}
                    </h3>
                  </div>

                  {/* Remove control */}
                  <button
                    onClick={(e) => handleDeleteFolder(e, folder.id)}
                    className="p-1 rounded text-red-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                    title="Delete folder and unlink nested files"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-450 font-sans line-clamp-2 leading-relaxed">
                  {folder.description || 'No description.'}
                </p>
              </div>

              {/* Counter details bar */}
              <div className="grid grid-cols-3 gap-2 bg-black/40 p-2 rounded-xl border border-white/5 text-[10px] uppercase font-bold text-slate-400 text-center">
                <div className="space-y-0.5 border-r border-white/5">
                  <div className="text-purple-400 font-mono text-sm">{statsVal.tasks}</div>
                  <div className="text-[9px] text-slate-500">Tasks</div>
                </div>
                <div className="space-y-0.5 border-r border-white/5">
                  <div className="text-emerald-400 font-mono text-sm">{statsVal.meetings}</div>
                  <div className="text-[9px] text-slate-500">Events</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-blue-400 font-mono text-sm">{statsVal.notes}</div>
                  <div className="text-[9px] text-slate-500">Notes</div>
                </div>
              </div>

              {/* Indicator button */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-450 border-t border-white/5 pt-2.5">
                <span className="text-[10px] text-slate-500 tracking-wide font-medium">{totalItems} items</span>
                <span className={`flex items-center gap-0.5 text-xs ${isSelected ? 'text-indigo-400 font-bold' : 'text-slate-400 font-medium'}`}>
                  {isSelected ? 'Selected' : 'Explore'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

            </div>
          );
        })}

      </div>

      {/* NESTED CONTENT PREVIEW INSIDE SELECTED FOLDER ACCORDING TO SPECIFIC FOLDER */}
      {selectedFolderFilter && currentFolder && (
        <div className="bg-[#131316] border border-indigo-500/20 p-5 rounded-2xl space-y-4 font-sans">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <span className="text-xs font-bold text-white/85 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentFolder.color }} />
              Folder Contents: {currentFolder.name} ({folderItemsList.length} items)
            </span>
            <button 
              onClick={() => onSelectFolderFilter(null)}
              className="text-[11px] text-[#A6A6A9] hover:text-white font-semibold"
            >
              Close
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {folderItemsList.length === 0 ? (
              <div className="text-xs text-white/40 py-10 text-center">No items in this folder yet.</div>
            ) : (
              folderItemsList.map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item.id)}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden pr-3">
                    {item.type === 'task' && <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />}
                    {item.type === 'meeting' && <CalendarDays className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {item.type === 'note' && <FileText className="w-4 h-4 text-blue-400 shrink-0" />}
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate transition-colors">
                      {item.title}
                    </span>
                  </div>

                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 shrink-0">
                    {item.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
