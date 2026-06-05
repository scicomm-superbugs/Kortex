/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CheckSquare, Calendar, Folder, Tag, Plus, Grid, List, 
  Trash2, AlertCircle, Clock, Square, Kanban, ArrowRight, Link2 
} from 'lucide-react';
import { WorkspaceState, Task, TaskStatus, PriorityType } from '../types';
import { generateId, renderFormattedText } from '../utils';

interface TasksViewProps {
  state: WorkspaceState;
  setState: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  onSelectItem: (id: string) => void;
  selectedFolderFilter: string | null;
  onSelectFolderFilter: (folderId: string | null) => void;
  theme?: 'light' | 'dark';
}

export function TasksView({ 
  state, 
  setState, 
  onSelectItem,
  selectedFolderFilter,
  onSelectFolderFilter,
  theme = 'dark'
}: TasksViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabelId, setSelectedLabelId] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(selectedFolderFilter || '');
  const [isAdding, setIsAdding] = useState(false);
  const [hideCompleted, setHideCompleted] = useState<boolean>(() => {
    return localStorage.getItem('hide_completed_tasks') === 'true';
  });

  // Form states for new task creation
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFolderId, setNewFolderId] = useState('');
  const [newPriority, setNewPriority] = useState<PriorityType>('medium');
  const [newDueDate, setNewDueDate] = useState('2026-06-05');
  const [newLabelIds, setNewLabelIds] = useState<string[]>([]);

  // Update folder filtering if changed in sidebar parent
  React.useEffect(() => {
    if (selectedFolderFilter) {
      setSelectedFolderId(selectedFolderFilter);
    }
  }, [selectedFolderFilter]);

  // Filters calculation
  const filteredTasks = React.useMemo(() => {
    return state.tasks.filter(task => {
      const matchSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFolder = selectedFolderId ? task.folderId === selectedFolderId : true;
      const matchCompleted = hideCompleted ? task.status !== 'done' : true;
      return matchSearch && matchFolder && matchCompleted;
    });
  }, [state.tasks, searchQuery, selectedFolderId, hideCompleted]);

  const handleToggleStatus = (taskId: string, currentStatus: TaskStatus) => {
    const nextStatuses: Record<TaskStatus, TaskStatus> = {
      'todo': 'in_progress',
      'in_progress': 'done',
      'done': 'todo'
    };
    
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, status: nextStatuses[currentStatus] } : t)
    }));
  };

  const handleTogglePriority = (taskId: string, currentPrio: PriorityType) => {
    const nextPrio: Record<PriorityType, PriorityType> = {
      'low': 'medium',
      'medium': 'high',
      'high': 'low'
    };

    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, priority: nextPrio[currentPrio] } : t)
    }));
  };

  const handleDeleteTask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id)
    }));
  };

  const handleFormToggleLabel = (id: string) => {
    setNewLabelIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: `task-${generateId()}`,
      type: 'task',
      title: newTitle,
      description: newDesc,
      status: 'todo',
      priority: newPriority,
      dueDate: newDueDate || undefined,
      folderId: newFolderId || undefined,
      labelIds: newLabelIds,
      linkedIds: [],
      createdAt: '2026-06-04'
    };

    setState(prev => ({
      ...prev,
      tasks: [newTask, ...prev.tasks]
    }));

    // Reset Form Input states
    setNewTitle('');
    setNewDesc('');
    setNewFolderId('');
    setNewPriority('medium');
    setNewDueDate('2026-06-05');
    setNewLabelIds([]);
    setIsAdding(false);
  };

  // List grouping rendering helper by Status
  const renderTaskStatusList = (status: TaskStatus, title: string, ringColor: string, bgAccent: string) => {
    const columnTasks = filteredTasks.filter(t => t.status === status);

    return (
      <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-4 md:p-5 flex flex-col space-y-4">
        {/* Header containing indicator */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5 font-sans">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${ringColor} shadow-sm`} />
            <span className="text-xs font-bold text-[#E5E5E6] uppercase tracking-widest">{title}</span>
          </div>
          <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
            {columnTasks.length}
          </span>
        </div>

        {/* Task Cards Stack */}
        <div className="space-y-3">
          {columnTasks.length === 0 ? (
            <div className={`text-center py-8 text-[11px] text-white/40 border border-dashed border-white/5 rounded-xl bg-white/[0.01]`}>
              No tasks of status {title} found in queue.
            </div>
          ) : (
            columnTasks.map(task => {
              const folderObj = state.folders.find(f => f.id === task.folderId);
              const labelsObj = state.labels.filter(l => task.labelIds.includes(l.id));

              return (
                <div
                  key={task.id}
                  onClick={() => onSelectItem(task.id)}
                  className="bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer group relative"
                >
                  <div className="flex items-start gap-3 overflow-hidden flex-1">
                    {/* Checkbox selector */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setState(prev => ({
                          ...prev,
                          tasks: prev.tasks.map(t => t.id === task.id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t)
                        }));
                      }}
                      className="mt-0.5 p-0.5 text-slate-500 hover:text-white cursor-pointer"
                    >
                      {task.status === 'done' ? (
                        <CheckSquare className="w-4.5 h-4.5 text-emerald-400 fill-emerald-500/10" />
                      ) : (
                        <Square className="w-4.5 h-4.5 text-slate-500 hover:text-indigo-400" />
                      )}
                    </button>

                    <div className="space-y-1.5 flex-1 overflow-hidden">
                      {/* Header: priority pill and Folder Badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {folderObj && (
                          <span 
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none shrink-0" 
                            style={{ backgroundColor: `${folderObj.color}15`, borderColor: `${folderObj.color}40`, color: folderObj.color }}
                          >
                            {folderObj.name}
                          </span>
                        )}

                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePriority(task.id, task.priority);
                          }}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase cursor-pointer border leading-none ${
                            task.priority === 'high' 
                              ? 'bg-red-500/10 text-red-450 border-red-500/20' 
                              : task.priority === 'medium'
                                ? 'bg-amber-500/10 text-amber-450 border-amber-500/20'
                                : 'bg-white/5 text-slate-400 border-white/10'
                          }`}
                        >
                          {task.priority} Priority
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className={`text-xs font-semibold text-slate-200 group-hover:text-white leading-normal transition-colors ${
                        task.status === 'done' ? 'line-through text-slate-500' : ''
                      }`}>
                        {task.title}
                      </h4>

                      {/* Description line */}
                      {task.description && (
                        <div className="text-[10px] text-slate-450 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                          {renderFormattedText(task.description)}
                        </div>
                      )}

                      {/* Link flags & due dates */}
                      <div className="flex items-center gap-1.5 text-[10px] text-white/40 flex-wrap">
                        {task.dueDate && (
                          <span className="flex items-center gap-0.5 text-purple-400 bg-purple-500/5 px-1.5 py-0.5 rounded border border-purple-500/10">
                            <Clock className="w-2.5 h-2.5" />
                            Due {task.dueDate}
                          </span>
                        )}
                        
                        {task.linkedIds.length > 0 && (
                          <span className="px-1.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 flex items-center gap-0.5 font-sans">
                            <Link2 className="w-2.5 h-2.5" />
                            {task.linkedIds.length} Linked
                          </span>
                        )}

                        {task.subtasks && task.subtasks.length > 0 && (
                          <span className="px-1.5 rounded bg-purple-500/10 text-purple-400 font-bold border border-purple-500/25 flex items-center gap-0.5 font-sans" title={`${task.subtasks.filter(st => st.completed).length}/${task.subtasks.length} subtasks completed`}>
                            <CheckSquare className="w-2.5 h-2.5" />
                            {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} Subtasks
                          </span>
                        )}

                        {/* Displays custom manually added label tags */}
                        {labelsObj.map(l => (
                          <span
                            key={l.id}
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold border font-sans"
                            style={{ backgroundColor: `${l.color}10`, borderColor: `${l.color}25`, color: l.color }}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status controller */}
                  <div className="flex items-center gap-2.5 justify-end shrink-0 self-end sm:self-center">
                    {/* Status selection widget */}
                    <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/5 opacity-60 group-hover:opacity-100 transition-opacity">
                      {status !== 'todo' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setState(prev => ({
                              ...prev,
                              tasks: prev.tasks.map(t => t.id === task.id ? { ...t, status: 'todo' } : t)
                            }));
                          }}
                          className="px-2 py-0.5 rounded hover:bg-white/5 text-[9px] text-slate-400 hover:text-white cursor-pointer transition-colors"
                        >
                          To Do
                        </button>
                      )}
                      {status !== 'in_progress' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setState(prev => ({
                              ...prev,
                              tasks: prev.tasks.map(t => t.id === task.id ? { ...t, status: 'in_progress' } : t)
                            }));
                          }}
                          className="px-2 py-0.5 rounded hover:bg-white/5 text-[9px] text-indigo-450 hover:text-indigo-300 cursor-pointer transition-colors"
                        >
                          In Progress
                        </button>
                      )}
                      {status !== 'done' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setState(prev => ({
                              ...prev,
                              tasks: prev.tasks.map(t => t.id === task.id ? { ...t, status: 'done' } : t)
                            }));
                          }}
                          className="px-2 py-0.5 rounded hover:bg-white/5 text-[9px] text-emerald-450 hover:text-emerald-300 cursor-pointer transition-colors"
                        >
                          Done
                        </button>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleDeleteTask(e, task.id)}
                      className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors cursor-pointer"
                      title="Delete task card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="tasks-view-root" className="space-y-6 pb-10">
      
      {/* Top action toolbar header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F0F12] p-4 rounded-2xl border border-white/5">
        <div className="space-y-0.5 font-sans">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-400" />
            Tasks
          </h2>
          <p className="text-slate-400 text-[11px] font-semibold">Manage your checklist items and map references.</p>
        </div>

        <div className="flex items-center gap-2">

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 shadow-lg shadow-purple-650/10 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Suite panel */}
      <div className="bg-[#0F0F12] p-4 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-3.5 font-sans">
        
        {/* Search bar text */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Search</label>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-550"
          />
        </div>

        {/* Directory Folder Filtering */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Folder</label>
          <select
            value={selectedFolderId}
            onChange={(e) => {
              setSelectedFolderId(e.target.value);
              onSelectFolderFilter(e.target.value || null);
            }}
            className="w-full bg-black border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-550"
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
              localStorage.setItem('hide_completed_tasks', String(newVal));
            }}
            className={`w-full text-left bg-black border rounded-lg p-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
              hideCompleted 
                ? 'border-purple-500/30 text-purple-300 bg-purple-500/5' 
                : 'border-white/5 text-slate-400 hover:border-white/10'
            }`}
          >
            <span>Hide Done Tasks</span>
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-bold ${
              hideCompleted 
                ? 'bg-purple-600 border-purple-400 text-white' 
                : 'border-white/30 text-transparent'
            }`}>✓</span>
          </button>
        </div>

      </div>

      {/* COMPOSER PANEL - CREATING NEW TASK CARDS */}
      {isAdding && (
        <form onSubmit={handleCreateTask} className="bg-[#131316] border border-white/10 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-bold text-[#E5E5E6] uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <Plus className="text-purple-400 w-4.5 h-4.5" />
              Create New Task
            </span>
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="text-white/40 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Title & Description Column */}
            <div className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-550 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Description</label>
                <textarea
                  placeholder="Add details..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-550 font-sans"
                />
              </div>
            </div>

            {/* Folder, label, parameters columns */}
            <div className="space-y-3 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block animate-none">Folder</label>
                  <select
                    value={newFolderId}
                    onChange={(e) => setNewFolderId(e.target.value)}
                    className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-550"
                  >
                    <option value="">None</option>
                    {state.folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PriorityType)}
                    className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-550"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-550 animate-none"
                  />
                </div>
              </div>

            </div>

          </div>

          <div className="border-t border-white/5 pt-3 flex justify-end">
            <button
              type="submit"
              className="p-2 px-5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold shadow cursor-pointer transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      )}

      {/* RENDER LAYOUT GROUPED SECURELY BY STATUS LISTS */}
      <div className="space-y-6">
        {renderTaskStatusList('todo', 'To Do', 'bg-slate-400', 'bg-white/5')}
        {renderTaskStatusList('in_progress', 'In Progress', 'bg-blue-400', 'bg-blue-500/10')}
        {renderTaskStatusList('done', 'Completed & Done', 'bg-emerald-400', 'bg-emerald-500/10')}
      </div>

    </div>
  );
}
