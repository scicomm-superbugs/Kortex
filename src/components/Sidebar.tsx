/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, ListTodo, Calendar, FileText, FolderClosed, 
  Settings2, Plus, Brain, Database, Layers, FolderIcon, Tag
} from 'lucide-react';
import { WorkspaceState, ViewType, Folder } from '../types';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  state: WorkspaceState;
  onSelectFolderFilter: (folderId: string | null) => void;
  selectedFolderFilter: string | null;
  onOpenCreateItemModal: (type: 'task' | 'meeting' | 'note') => void;
  theme?: 'dark' | 'light';
}

export function Sidebar({
  activeView,
  setActiveView,
  state,
  onSelectFolderFilter,
  selectedFolderFilter,
  onOpenCreateItemModal,
  theme = 'dark'
}: SidebarProps) {
  // Counts of items for indicators
  const totalTasks = state.tasks.length;
  const totalMeetings = state.meetings.length;
  const totalNotes = state.notes.length;


  const getFolderItemCount = (folderId: string) => {
    const tasksCount = state.tasks.filter(t => t.folderId === folderId).length;
    const meetingsCount = state.meetings.filter(m => m.folderId === folderId).length;
    const notesCount = state.notes.filter(n => n.folderId === folderId).length;
    return tasksCount + meetingsCount + notesCount;
  };

  const navItems = [
    { view: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard, count: null },
    { view: 'tasks' as ViewType, label: 'Tasks', icon: ListTodo, count: totalTasks },
    { view: 'notes' as ViewType, label: 'Notes', icon: FileText, count: totalNotes },
    { view: 'calendar' as ViewType, label: 'Calendar', icon: Calendar, count: null },
  ];

  return (
    <div id="app-sidebar" className="w-full lg:w-64 h-full flex flex-col bg-[#0F0F12] border-r border-white/5 text-slate-300">
      {/* Brand Logo & Name */}
      <div className="px-6 py-6 border-b border-white/5 flex items-center">
        <div>
          <h1 className="text-sm font-bold text-white tracking-widest uppercase">Kortex</h1>
          <span className="text-[10px] text-white/40 font-semibold tracking-wider block">Workspace</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-5 px-4 space-y-7">
        
        {/* Core Navigation modules */}
        <div className="space-y-1">
          <span className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Navigation</span>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => {
                  setActiveView(item.view);
                  onSelectFolderFilter(null); // Clear folder filters when switching core views
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-white/5 border border-white/10 text-white font-bold' 
                    : 'hover:bg-white/5 hover:text-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.isEmergency && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping inline-block shrink-0" />
                  )}
                </div>
                {item.count !== null && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isActive 
                      ? 'bg-indigo-500/20 text-indigo-350 border border-indigo-500/30' 
                      : 'bg-white/5 text-slate-500'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Create CTA Buttons */}
        <div className="space-y-1.5 bg-white/[0.02] p-3 rounded-xl border border-white/5">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2 px-1">Quick Create</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => onOpenCreateItemModal('task')}
              className="py-1.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Task
            </button>
            <button
              onClick={() => onOpenCreateItemModal('meeting')}
              className="py-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Event
            </button>
          </div>
          <button
            onClick={() => onOpenCreateItemModal('note')}
            className="w-full py-1.5 mt-1.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-550/20 hover:bg-indigo-500/20 hover:border-indigo-400/40 transition-all text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Note
          </button>
        </div>

        {/* Directory Folder Filtering Nodes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Folders</span>
            <button 
              onClick={() => setActiveView('folders')}
              className="text-white/40 hover:text-white p-0.5 rounded transition-colors"
              title="Manage Folders"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="space-y-1">
            {/* Show 'All Items' clear index */}
            <button
              onClick={() => onSelectFolderFilter(null)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs leading-none select-none transition-colors cursor-pointer ${
                selectedFolderFilter === null && activeView === 'folders'
                  ? 'bg-white/5 border border-white/5 text-white font-semibold'
                  : 'hover:bg-white/[0.03] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-slate-500" />
                <span>All Folders</span>
              </div>
            </button>

            {state.folders.map(folder => {
              const count = getFolderItemCount(folder.id);
              const isSelected = selectedFolderFilter === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => {
                    onSelectFolderFilter(folder.id);
                    setActiveView('folders'); // Snap to folder view to show selected folder
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs leading-none select-none transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-white/5 text-white font-semibold border border-white/10' 
                      : 'hover:bg-white/[0.03] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span 
                      className="w-2 rounded-full shrink-0 aspect-square" 
                      style={{ backgroundColor: folder.color }}
                    />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  {count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 font-bold border border-white/10 text-white/60">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 bg-[#0F0F12] flex items-center justify-between gap-2 shrink-0">
        <span className="text-[10px] text-white/30 block">Local Storage Sync</span>
      </div>
    </div>
  );
}
