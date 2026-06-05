/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Link2, Trash2, Calendar, FileText, CheckSquare, Square, 
  Tag, Folder, Clock, CalendarDays, ExternalLink, Plus, AlertCircle,
  Search, ChevronDown, Check, Paperclip, Video, FileImage, Download, File,
  User, MapPin, Briefcase
} from 'lucide-react';
import { WorkspaceState, WorkspaceItem, Task, Meeting, Note, SubTask } from '../types';
import { findItemById, linkTwoItems, unlinkTwoItems, generateId, renderFormattedText } from '../utils';

interface PreviewPanelProps {
  activeItemId: string | null;
  onClose: () => void;
  state: WorkspaceState;
  setState: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  onNavigateToItem: (id: string, itemType: 'task' | 'meeting' | 'note') => void;
  theme?: 'light' | 'dark';
}

export function PreviewPanel({ 
  activeItemId, 
  onClose, 
  state, 
  setState, 
  onNavigateToItem,
  theme = 'dark'
}: PreviewPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLinkTargetId, setSelectedLinkTargetId] = useState<string>('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescText, setEditDescText] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const [isLinkDropdownOpen, setIsLinkDropdownOpen] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkTypeFilter, setLinkTypeFilter] = useState<'all' | 'task' | 'meeting' | 'note'>('all');
  const [linkHideCompleted, setLinkHideCompleted] = useState<boolean>(true);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [selectedPreviewImageAttachment, setSelectedPreviewImageAttachment] = useState<{ id: string; name: string; url?: string } | null>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLinkDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    setIsLinkDropdownOpen(false);
    setLinkSearchQuery('');
    setShowDeleteConfirm(false);
  }, [activeItemId]);

  const handleDeleteActiveItem = () => {
    if (!activeItem) return;
    setState(prev => {
      if (activeItem.type === 'task') {
        return {
          ...prev,
          tasks: prev.tasks.filter(t => t.id !== activeItem.id)
        };
      } else if (activeItem.type === 'meeting') {
        return {
          ...prev,
          meetings: prev.meetings.filter(m => m.id !== activeItem.id)
        };
      } else {
        return {
          ...prev,
          notes: prev.notes.filter(n => n.id !== activeItem.id)
        };
      }
    });
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id === activeItem.id) {
          const updatedSubtasks = (t.subtasks || []).map(st => 
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          return { ...t, subtasks: updatedSubtasks };
        }
        return t;
      })
    }));
  };

  const handleAddSubtask = (title: string) => {
    if (!title.trim()) return;
    const newSub: SubTask = {
      id: `sub-${generateId()}`,
      title: title.trim(),
      completed: false
    };
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id === activeItem.id) {
          return {
            ...t,
            subtasks: [...(t.subtasks || []), newSub]
          };
        }
        return t;
      })
    }));
    setNewSubtaskTitle('');
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id === activeItem.id) {
          return {
            ...t,
            subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId)
          };
        }
        return t;
      })
    }));
  };

  if (!activeItemId) return null;

  const activeItem = findItemById(activeItemId, state);
  if (!activeItem) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileAttach = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;

    Array.from(filesList).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Url = reader.result as string;
        const newAttachment = {
          id: `attach-${Math.random().toString(36).substring(2, 7)}-${Date.now()}`,
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type,
          url: base64Url,
          createdAt: new Date().toISOString().split('T')[0]
        };

        setState(prev => {
          if (activeItem.type === 'task') {
            return {
              ...prev,
              tasks: prev.tasks.map(t => t.id === activeItem.id ? {
                ...t,
                attachments: [...(t.attachments || []), newAttachment]
              } : t)
            };
          } else if (activeItem.type === 'meeting') {
            return {
              ...prev,
              meetings: prev.meetings.map(m => m.id === activeItem.id ? {
                ...m,
                attachments: [...(m.attachments || []), newAttachment]
              } : m)
            };
          } else {
            return {
              ...prev,
              notes: prev.notes.map(n => n.id === activeItem.id ? {
                ...n,
                attachments: [...(n.attachments || []), newAttachment]
              } : n)
            };
          }
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    setState(prev => {
      if (activeItem.type === 'task') {
        return {
          ...prev,
          tasks: prev.tasks.map(t => t.id === activeItem.id ? {
            ...t,
            attachments: (t.attachments || []).filter(a => a.id !== attachmentId)
          } : t)
        };
      } else if (activeItem.type === 'meeting') {
        return {
          ...prev,
          meetings: prev.meetings.map(m => m.id === activeItem.id ? {
            ...m,
            attachments: (m.attachments || []).filter(a => a.id !== attachmentId)
          } : m)
        };
      } else {
        return {
          ...prev,
          notes: prev.notes.map(n => n.id === activeItem.id ? {
            ...n,
            attachments: (n.attachments || []).filter(a => a.id !== attachmentId)
          } : n)
        };
      }
    });
  };

  const handleAddOrCreateLabel = (labelName: string) => {
    const trimmed = labelName.trim();
    if (!trimmed) return;

    // Check if label already exists in state
    let existingLabel = state.labels.find(l => l.name.toLowerCase() === trimmed.toLowerCase());

    const nextLabelIds = [...(activeItem.labelIds || [])];

    setState(prev => {
      let finalLabels = [...prev.labels];
      let labelId = '';

      if (existingLabel) {
        labelId = existingLabel.id;
      } else {
        // Create new label item
        labelId = 'lbl-' + generateId();
        const colors = [
          '#38BDF8', '#34D399', '#FBBF24', '#F87171', '#C084FC', '#F472B6', '#22D3EE', '#FB7185'
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const newLbl = {
          id: labelId,
          name: trimmed,
          color: randomColor,
          textColor: '#FFFFFF'
        };
        finalLabels.push(newLbl);
      }

      if (!nextLabelIds.includes(labelId)) {
        nextLabelIds.push(labelId);
      }

      const targetKey = activeItem.type === 'task' ? 'tasks' : (activeItem.type === 'meeting' ? 'meetings' : 'notes');

      return {
        ...prev,
        labels: finalLabels,
        [targetKey]: (prev[targetKey] as any[]).map(item => {
          if (item.id === activeItem.id) {
            return {
              ...item,
              labelIds: nextLabelIds
            };
          }
          return item;
        })
      };
    });
  };

  const folder = state.folders.find(f => f.id === activeItem.folderId);
  const labels = state.labels.filter(l => activeItem.labelIds.includes(l.id));

  // Determine what list of items can be linked (everything except self & what's already linked)
  const getLinkableItems = () => {
    const list: { id: string; title: string; type: 'task' | 'meeting' | 'note'; completed: boolean }[] = [];
    
    state.tasks.forEach(t => {
      if (t.id !== activeItem.id && !activeItem.linkedIds.includes(t.id)) {
        list.push({ id: t.id, title: `Task: ${t.title}`, type: 'task', completed: t.status === 'done' });
      }
    });

    state.meetings.forEach(m => {
      if (m.id !== activeItem.id && !activeItem.linkedIds.includes(m.id)) {
        list.push({ id: m.id, title: `Meeting: ${m.title}`, type: 'meeting', completed: !!m.completed });
      }
    });

    state.notes.forEach(n => {
      if (n.id !== activeItem.id && !activeItem.linkedIds.includes(n.id)) {
        list.push({ id: n.id, title: `Note: ${n.title}`, type: 'note', completed: !!n.completed });
      }
    });

    return list;
  };

  const linkableItems = getLinkableItems();

  const handleAddLink = () => {
    if (!selectedLinkTargetId) return;
    setState(prev => linkTwoItems(activeItem.id, selectedLinkTargetId, prev));
    setSelectedLinkTargetId('');
  };

  const handleRemoveLink = (linkedId: string) => {
    setState(prev => unlinkTwoItems(activeItem.id, linkedId, prev));
  };

  const handleToggleTaskStatusInPlace = (taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id === taskId) {
          const newStatus = t.status === 'done' ? 'in_progress' : 'done';
          return { ...t, status: newStatus };
        }
        return t;
      })
    }));
  };

  const handleSaveDescription = () => {
    setState(prev => {
      if (activeItem.type === 'task') {
        return {
          ...prev,
          tasks: prev.tasks.map(t => t.id === activeItem.id ? { ...t, description: editDescText } : t)
        };
      } else if (activeItem.type === 'meeting') {
        return {
          ...prev,
          meetings: prev.meetings.map(m => m.id === activeItem.id ? { ...m, description: editDescText } : m)
        };
      } else {
        return {
          ...prev,
          notes: prev.notes.map(n => n.id === activeItem.id ? { ...n, content: editDescText, updatedAt: '2026-06-04' } : n)
        };
      }
    });
    setIsEditingDescription(false);
  };

  const startEditingDesc = () => {
    setEditDescText(activeItem.type === 'note' ? (activeItem as Note).content : activeItem.description);
    setIsEditingDescription(true);
  };

  // Detailed styling for components
  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'high':
        return <span id="prio-high" className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-red-500/10 text-red-400 border border-red-500/20">HIGH</span>;
      case 'medium':
        return <span id="prio-medium" className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">MEDIUM</span>;
      default:
        return <span id="prio-low" className="px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-white/5 text-slate-400 border border-white/10">LOW</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Done</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">In Progress</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10">To Do</span>;
    }
  };

  return (
    <div id="preview-panel-container" className="h-full flex flex-col bg-[#131316] border-l border-white/5 backdrop-blur-md overflow-hidden relative shadow-2xl">
      {/* Header */}
      <div id="preview-header" className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#0F0F12]">
        <div className="flex items-center gap-2">
          {activeItem.type === 'task' && <CheckSquare className="w-5 h-5 text-purple-400" />}
          {activeItem.type === 'meeting' && <CalendarDays className="w-5 h-5 text-emerald-400" />}
          {activeItem.type === 'note' && <FileText className="w-5 h-5 text-blue-400" />}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">
            Details
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 rounded-lg p-0.5">
              <button
                id="btn-confirm-delete"
                onClick={handleDeleteActiveItem}
                className="px-2.5 py-1 rounded text-red-400 hover:bg-red-500 hover:text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm</span>
              </button>
              <button
                id="btn-cancel-delete"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 rounded text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              id="btn-delete-active-item"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1 px-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all text-sm flex items-center gap-1.5 cursor-pointer"
              title={`Delete this ${activeItem.type}`}
            >
              <Trash2 className="w-4 h-4 text-slate-400" />
              <span>Delete</span>
            </button>
          )}

          <button 
            id="btn-close-preview"
            onClick={() => {
              setShowDeleteConfirm(false);
              onClose();
            }}
            className="p-1 px-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition-all text-sm flex items-center gap-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div id="preview-scrollable" className="flex-1 overflow-y-auto px-6 py-5 pb-24 lg:pb-8 space-y-6">
        
        {/* Title, Folder, Labels */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 justify-between">
            <h1 id="preview-title" className={`text-2xl font-bold tracking-tight leading-tight font-sans flex-1 ${
              (activeItem.type === 'task' && activeItem.status === 'done') || (activeItem.type !== 'task' && activeItem.completed)
                ? 'line-through text-slate-500'
                : 'text-white'
            }`}>
              {activeItem.title}
            </h1>
            
            <button
              onClick={() => {
                if (activeItem.type === 'task') {
                  const newStatus = activeItem.status === 'done' ? 'todo' : 'done';
                  setState(prev => ({
                    ...prev,
                    tasks: prev.tasks.map(t => t.id === activeItem.id ? { ...t, status: newStatus } : t)
                  }));
                } else if (activeItem.type === 'meeting') {
                  const newCompleted = !activeItem.completed;
                  setState(prev => ({
                    ...prev,
                    meetings: prev.meetings.map(m => m.id === activeItem.id ? { ...m, completed: newCompleted } : m)
                  }));
                } else {
                  const newCompleted = !activeItem.completed;
                  setState(prev => ({
                    ...prev,
                    notes: prev.notes.map(n => n.id === activeItem.id ? { ...n, completed: newCompleted } : n)
                  }));
                }
              }}
              className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border transition-all cursor-pointer ${
                (activeItem.type === 'task' ? activeItem.status === 'done' : activeItem.completed)
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-indigo-500/45 hover:text-indigo-400'
              }`}
              title={(activeItem.type === 'task' ? activeItem.status === 'done' : activeItem.completed) ? "Mark as Incomplete" : "Mark as Completed"}
            >
              <CheckSquare className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Folder and status layout */}
          <div className="flex flex-wrap gap-2 items-center text-xs">
            {folder && (
              <span 
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-white font-medium border"
                style={{ backgroundColor: `${folder.color}15`, borderColor: `${folder.color}40`, color: folder.color }}
              >
                <Folder className="w-3.5 h-3.5" />
                {folder.name}
              </span>
            )}
            {activeItem.type === 'task' && getStatusBadge(activeItem.status)}
            {(activeItem.type === 'meeting' || activeItem.type === 'note') && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                activeItem.completed 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                  : 'bg-white/5 text-slate-300 border-white/10'
              }`}>
                {activeItem.completed ? 'Completed' : 'Active'}
              </span>
            )}
            {activeItem.type === 'task' && getPriorityBadge(activeItem.priority)}
            {activeItem.type === 'meeting' && (
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">
                <Clock className="w-3.5 h-3.5" />
                {activeItem.time} ({activeItem.duration}m)
              </span>
            )}
            {activeItem.type === 'meeting' && (
              <span className="inline-flex items-center gap-1 bg-white/5 text-slate-300 px-2 py-1 rounded border border-white/10">
                <Calendar className="w-3.5 h-3.5" />
                {activeItem.date}
              </span>
            )}
            {activeItem.type === 'task' && activeItem.dueDate && (
              <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 px-2 py-1 rounded border border-purple-500/20">
                <Calendar className="w-3.5 h-3.5" />
                Due {activeItem.dueDate}
              </span>
            )}
          </div>


        </div>

        {/* Meeting Link for meetings */}
        {activeItem.type === 'meeting' && (
          <div className="bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-xl p-4.5 space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-400" />
                Virtual Meeting
              </span>
              <button 
                type="button"
                onClick={() => {
                  const link = prompt('Enter meeting URL (e.g. Google Meet or Zoom link):', (activeItem as Meeting).meetingLink || '');
                  if (link !== null) {
                    setState(prev => ({
                      ...prev,
                      meetings: prev.meetings.map(m => m.id === activeItem.id ? { ...m, meetingLink: link.trim() } : m)
                    }));
                  }
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer font-medium"
              >
                {(activeItem as Meeting).meetingLink ? 'Edit Link' : 'Add Link'}
              </button>
            </div>
            
            {(activeItem as Meeting).meetingLink ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/20 p-2.5 rounded-lg border border-emerald-500/10">
                <span className="text-xs text-slate-350 truncate font-mono select-all flex-1 min-w-0 pr-2">
                  {(activeItem as Meeting).meetingLink}
                </span>
                <a
                  href={(activeItem as Meeting).meetingLink.startsWith('http') ? (activeItem as Meeting).meetingLink : `https://${(activeItem as Meeting).meetingLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all"
                >
                  <span>Join Call</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No video conference or Meet link added yet. Syncing with partners is easier with location links!</p>
            )}
          </div>
        )}

        {/* Google Calendar synced fields & parameters */}
        {activeItem.type === 'meeting' && (
          <div className="bg-[#141419]/90 border border-white/5 rounded-xl p-4.5 space-y-4 font-sans text-left">
            <span className="text-[11px] font-extrabold text-[#a3e635] tracking-widest uppercase flex items-center gap-1.5 border-b border-white/5 pb-2 select-none">
              <span className="w-2 h-2 rounded-full bg-[#a3e635] animate-ping" />
              Google Sync Meta-Telemetry
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-350">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-indigo-500/10 text-indigo-400 shrink-0"><MapPin className="w-3.5 h-3.5" /></span>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Location</div>
                  <div className="font-semibold text-white">{(activeItem as Meeting).location || 'No location specified'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-emerald-500/10 text-emerald-400 shrink-0"><User className="w-3.5 h-3.5" /></span>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Assignee Organizer</div>
                  <div className="font-semibold text-white">
                    {state.teamUsers?.find(u => u.id === (activeItem as Meeting).assignedTo)?.name || 'Unassigned'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-indigo-500/10 text-indigo-400 shrink-0"><Briefcase className="w-3.5 h-3.5" /></span>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Show As / Visibility</div>
                  <div className="font-semibold text-white">{(activeItem as Meeting).visibility || 'Default visibility'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-sky-500/10 text-sky-400 shrink-0">
                  <span className="w-3.5 h-3.5 rounded-full inline-block border border-white/20" style={{ backgroundColor: (activeItem as Meeting).color || '#0ea5e9' }} />
                </span>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Color Indicator</div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: (activeItem as Meeting).color || '#0ea5e9' }} />
                    {(activeItem as Meeting).color || 'Sky Blue'}
                  </div>
                </div>
              </div>
            </div>

            {/* Collaborators segment */}
            {((activeItem as Meeting).guests && (activeItem as Meeting).guests!.length > 0) && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Invited Collaborators ({(activeItem as Meeting).guests!.length})</div>
                <div className="flex flex-wrap gap-1.5">
                  {(activeItem as Meeting).guests!.map(gst => (
                    <span key={gst} className="text-[10px] px-2.5 py-1 rounded bg-white/5 border border-white/10 font-bold text-slate-300">
                      {gst}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Synced confirmation badge */}
            {(activeItem as Meeting).googleCalendarEventId && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-bold text-emerald-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 inline-block animate-pulse" />
                  Synced to Primary Workspace
                </span>
                <span className="text-slate-500 font-mono">Last updated {(activeItem as Meeting).googleCalendarSyncedAt || 'Live'}</span>
              </div>
            )}
          </div>
        )}

        {/* Labels Section */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              Custom Labels
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {labels.length === 0 ? (
              <span className="text-xs text-slate-500 italic font-sans">No custom labels on this item.</span>
            ) : (
              labels.map(lbl => (
                <span
                  key={lbl.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-extrabold font-sans tracking-wide border transition-all"
                  style={{ backgroundColor: `${lbl.color}15`, borderColor: `${lbl.color}35`, color: lbl.color }}
                >
                  <span>{lbl.name.toUpperCase()}</span>
                  <button
                    type="button"
                    onClick={() => {
                      // Remove label from this activeItem
                      setState(prev => {
                        const targetKey = activeItem.type === 'task' ? 'tasks' : (activeItem.type === 'meeting' ? 'meetings' : 'notes');
                        return {
                          ...prev,
                          [targetKey]: (prev[targetKey] as any[]).map(item => {
                            if (item.id === activeItem.id) {
                              return {
                                ...item,
                                labelIds: (item.labelIds || []).filter((id: string) => id !== lbl.id)
                              };
                            }
                            return item;
                          })
                        };
                      });
                    }}
                    className="hover:text-red-400 text-xs ml-0.5 font-bold cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                    title="Remove label"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          {/* New Custom Label attachment */}
          <div className="flex gap-1.5 items-center">
            <input
              type="text"
              id="new-custom-label-input"
              placeholder="Tag label..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const inputVal = (e.currentTarget as HTMLInputElement).value.trim();
                  if (inputVal) {
                    handleAddOrCreateLabel(inputVal);
                    (e.currentTarget as HTMLInputElement).value = '';
                  }
                }
              }}
              className="flex-1 bg-[#0F0F12] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => {
                const el = document.getElementById('new-custom-label-input') as HTMLInputElement | null;
                if (el && el.value.trim()) {
                  handleAddOrCreateLabel(el.value.trim());
                  el.value = '';
                }
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-lg text-white font-bold text-xs cursor-pointer"
            >
              Add
            </button>
          </div>
        </div>

        {/* Content/Description Editor */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {activeItem.type === 'note' ? 'Content' : 'Description'}
            </span>
            {!isEditingDescription && (
              <button 
                onClick={startEditingDesc}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingDescription ? (
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Formatting Options</span>
                <div className="flex items-center gap-1.5 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                  <button
                    type="button"
                    onClick={() => handleInsertFormat('preview-description-textarea', '**', '**', setEditDescText)}
                    className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 hover:text-white text-[10px] font-bold text-slate-300 cursor-pointer min-w-[18px] text-center"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat('preview-description-textarea', '*', '*', setEditDescText)}
                    className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 hover:text-white text-[10px] italic text-slate-300 cursor-pointer min-w-[18px] text-center"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat('preview-description-textarea', '_', '_', setEditDescText)}
                    className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 hover:text-white text-[10px] underline text-slate-300 decoration-indigo-400 cursor-pointer min-w-[18px] text-center"
                    title="Underline"
                  >
                    U
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat('preview-description-textarea', '~~', '~~', setEditDescText)}
                    className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 hover:text-white text-[10px] line-through text-slate-400 cursor-pointer text-center"
                    title="Strikethrough"
                  >
                    S
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormat('preview-description-textarea', '- [ ] ', '', setEditDescText)}
                    className="px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-[9px] font-extrabold text-indigo-400 cursor-pointer flex items-center gap-0.5"
                    title="Insert Checklist Box"
                  >
                    ☑ Box
                  </button>
                </div>
              </div>
              <textarea
                id="preview-description-textarea"
                value={editDescText}
                onChange={(e) => setEditDescText(e.target.value)}
                rows={activeItem.type === 'note' ? 10 : 4}
                className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button 
                  type="button"
                  onClick={() => setIsEditingDescription(false)}
                  className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSaveDescription}
                  className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="text-slate-300 text-sm leading-relaxed prose prose-invert font-sans max-w-none">
              {(() => {
                const text = activeItem.type === 'note' ? (activeItem.content || '') : (activeItem.description || '');
                if (!text) {
                  return activeItem.type === 'note' ? (
                    <em className="text-white/40">No content inside this note yet. Write something!</em>
                  ) : (
                    <em className="text-white/40">No description provided. Click edit to write one.</em>
                  );
                }

                const lines = text.split('\n');
                const hasCheckboxes = lines.some(line => /^(\s*[-*+]\s+)/.test(line) || /^(\s*[-*+]\s*\[([ xX])\])/.test(line));

                if (!hasCheckboxes) {
                  return (
                    <div className="space-y-1.5 whitespace-pre-wrap font-sans text-xs">
                      {lines.map((line, idx) => (
                        <div key={idx} className="min-h-[1rem]">
                          {renderFormattedText(line)}
                        </div>
                      ))}
                    </div>
                  );
                }

                const handleToggleLineCheckbox = (lineIndex: number) => {
                  setState(prev => {
                    if (activeItem.type === 'note') {
                      return {
                        ...prev,
                        notes: prev.notes.map(n => {
                          if (n.id === activeItem.id) {
                            const contentLines = n.content.split('\n');
                            const currentLine = contentLines[lineIndex];

                            const bracketMatch = currentLine.match(/^(\s*[-*+]\s+)\[([ xX])\]\s*(.*)$/);
                            if (bracketMatch) {
                              const prefix = bracketMatch[1];
                              const isChecked = bracketMatch[2].toLowerCase() === 'x';
                              const restText = bracketMatch[3];
                              contentLines[lineIndex] = isChecked ? `${prefix}${restText}` : `${prefix}[x] ${restText}`;
                            } else {
                              const bulletMatch = currentLine.match(/^(\s*[-*+]\s+)(.*)$/);
                              if (bulletMatch) {
                                const prefix = bulletMatch[1];
                                const restText = bulletMatch[2];
                                contentLines[lineIndex] = `${prefix}[x] ${restText}`;
                              }
                            }
                            return {
                              ...n,
                              content: contentLines.join('\n'),
                              updatedAt: new Date().toISOString().split('T')[0]
                            };
                          }
                          return n;
                        })
                      };
                    } else if (activeItem.type === 'task') {
                      return {
                        ...prev,
                        tasks: prev.tasks.map(t => {
                          if (t.id === activeItem.id) {
                            const descLines = (t.description || '').split('\n');
                            const currentLine = descLines[lineIndex];

                            const bracketMatch = currentLine.match(/^(\s*[-*+]\s+)\[([ xX])\]\s*(.*)$/);
                            if (bracketMatch) {
                              const prefix = bracketMatch[1];
                              const isChecked = bracketMatch[2].toLowerCase() === 'x';
                              const restText = bracketMatch[3];
                              descLines[lineIndex] = isChecked ? `${prefix}${restText}` : `${prefix}[x] ${restText}`;
                            } else {
                              const bulletMatch = currentLine.match(/^(\s*[-*+]\s+)(.*)$/);
                              if (bulletMatch) {
                                const prefix = bulletMatch[1];
                                const restText = bulletMatch[2];
                                descLines[lineIndex] = `${prefix}[x] ${restText}`;
                              }
                            }
                            return {
                              ...t,
                              description: descLines.join('\n')
                            };
                          }
                          return t;
                        })
                      };
                    } else if (activeItem.type === 'meeting') {
                      return {
                        ...prev,
                        meetings: prev.meetings.map(m => {
                          if (m.id === activeItem.id) {
                            const descLines = (m.description || '').split('\n');
                            const currentLine = descLines[lineIndex];

                            const bracketMatch = currentLine.match(/^(\s*[-*+]\s+)\[([ xX])\]\s*(.*)$/);
                            if (bracketMatch) {
                              const prefix = bracketMatch[1];
                              const isChecked = bracketMatch[2].toLowerCase() === 'x';
                              const restText = bracketMatch[3];
                              descLines[lineIndex] = isChecked ? `${prefix}${restText}` : `${prefix}[x] ${restText}`;
                            } else {
                              const bulletMatch = currentLine.match(/^(\s*[-*+]\s+)(.*)$/);
                              if (bulletMatch) {
                                const prefix = bulletMatch[1];
                                const restText = bulletMatch[2];
                                descLines[lineIndex] = `${prefix}[x] ${restText}`;
                              }
                            }
                            return {
                              ...m,
                              description: descLines.join('\n')
                            };
                          }
                          return m;
                        })
                      };
                    }
                    return prev;
                  });
                };

                return (
                  <div className="space-y-1.5 font-sans text-xs">
                    {lines.map((line, idx) => {
                      const checkboxMatch = line.match(/^(\s*[-*+]\s+)(?:\[([ xX])\]\s*)?(.*)$/);
                      if (checkboxMatch) {
                        const isChecked = checkboxMatch[2] !== undefined && checkboxMatch[2].toLowerCase() === 'x';
                        const textPart = checkboxMatch[3];
                        return (
                          <div key={idx} className="flex items-start gap-2 py-0.5 group">
                            <button
                              type="button"
                              onClick={() => handleToggleLineCheckbox(idx)}
                              className="mt-0.5 shrink-0 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-blue-400 fill-blue-500/10" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-500 hover:text-slate-400" />
                              )}
                            </button>
                            <span className={`text-slate-350 leading-normal font-sans text-xs ${isChecked ? 'line-through text-slate-500 font-medium' : ''}`}>
                              {textPart ? renderFormattedText(textPart) : <span className="opacity-10 italic text-[10px]">(empty checklist item)</span>}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="whitespace-pre-wrap min-h-[1rem]">
                          {renderFormattedText(line)}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* SUBTASKS BLOCK FOR TASKS */}
        {activeItem.type === 'task' && (
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4.5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4.5 h-4.5 text-purple-400" />
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest font-sans">
                  Subtasks ({(activeItem.subtasks || []).length})
                </span>
              </div>
              
              {(activeItem.subtasks && activeItem.subtasks.length > 0) && (
                <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {activeItem.subtasks.filter(st => st.completed).length}/{activeItem.subtasks.length} Completed
                </span>
              )}
            </div>

            {(activeItem.subtasks && activeItem.subtasks.length > 0) && (
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden shrink-0">
                <div 
                  className="bg-purple-500 h-full transition-all duration-300" 
                  style={{ width: `${(activeItem.subtasks.filter(st => st.completed).length / activeItem.subtasks.length) * 100}%` }}
                />
              </div>
            )}

            {(!activeItem.subtasks || activeItem.subtasks.length === 0) ? (
              <p className="text-[11px] text-white/30 italic font-sans py-2">No subtasks added yet. Break down this task into smaller steps below!</p>
            ) : (
              <div className="space-y-2">
                {activeItem.subtasks.map(st => (
                  <div key={st.id} className="flex items-center justify-between gap-2.5 p-2 rounded-lg bg-black/15 border border-white/5 group hover:border-purple-500/20 transition-all">
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(st.id)}
                      className="flex items-start gap-2.5 text-left text-xs text-slate-300 hover:text-white cursor-pointer min-w-0 flex-1 font-sans py-0.5"
                    >
                      {st.completed ? (
                        <CheckSquare className="w-4 h-4 text-purple-400 fill-purple-500/10 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0 hover:text-slate-400 mt-0.5" />
                      )}
                      <span className={`break-words whitespace-normal leading-relaxed text-xs select-none pr-1 ${st.completed ? 'line-through text-slate-500 font-normal' : 'font-medium text-slate-200'}`}>
                        {st.title}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(st.id)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
                      title="Delete subtask"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleAddSubtask(newSubtaskTitle);
              }}
              className="flex items-center gap-2 pt-2"
            >
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add subtask details..."
                className="flex-1 bg-[#0F0F12] border border-white/5 rounded-lg p-2 px-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans"
              />
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim()}
                className="p-2 px-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold leading-none shrink-0 cursor-pointer transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </form>
          </div>
        )}

        {/* ATTACHMENTS AND DIGITAL IMAGES BRIEFCASE */}
        <div 
          id="preview-attachments-briefcase" 
          className={`border rounded-xl p-4.5 space-y-4 transition-all duration-300 ${
            isDraggingFile 
              ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.01]' 
              : 'bg-white/[0.02] border-white/5 hover:border-white/10'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingFile(false);
            if (e.dataTransfer?.files) {
              handleFileAttach(e.dataTransfer.files);
            }
          }}
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <Paperclip className="w-4 h-4 text-indigo-400" />
              Attachments ({(activeItem.attachments || []).length})
            </span>
            <label className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer font-bold flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Add File</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileAttach(e.target.files);
                  }
                }}
              />
            </label>
          </div>

          {(!activeItem.attachments || activeItem.attachments.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-4 text-center border border-dashed border-white/10 rounded-lg bg-black/10">
              <Paperclip className="w-6 h-6 text-slate-500 mb-1 animate-pulse" />
              <p className="text-[11px] text-slate-400 font-sans">Drag & drop files/images here or <span className="text-indigo-400 font-bold underline cursor-pointer">browse</span></p>
              <p className="text-[9px] text-slate-500 mt-0.5">Supports PDF, PNG, JPG, Docx and sheets (Base64 saved)</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeItem.attachments.map((file) => {
                const isImage = file.type && file.type.startsWith('image/');
                return (
                  <div 
                    key={file.id} 
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-[#09090C] border border-white/5 hover:border-white/10 group transition-all relative overflow-hidden"
                  >
                    {/* Thumbnail or Icon */}
                    {isImage && file.url ? (
                      <button
                        type="button"
                        onClick={() => setSelectedPreviewImageAttachment(file)}
                        className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 cursor-pointer hover:opacity-80 transition-opacity flex"
                      >
                        <img 
                          src={file.url} 
                          alt={file.name} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center shrink-0">
                        {isImage ? (
                          <FileImage className="w-5 h-5 text-indigo-400" />
                        ) : (
                          <File className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-200 truncate select-all leading-tight pr-5" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                        {file.size}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                      {file.url && (
                        <a 
                          href={file.url} 
                          download={file.name}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Download attachment"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(file.id)}
                        className="p-1 rounded bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 cursor-pointer"
                        title="Delete attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* LINK ENGINE CONNECTIONS (PREVIEW MULTI-DIMENSIONAL GRAPH) */}
        <div id="preview-link-graph" className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-emerald-400" />
              Linked Items ({activeItem.linkedIds.length})
            </span>
          </div>

          {/* Custom Graphical Searchable Combobox */}
          {linkableItems.length > 0 ? (
            <div className="flex gap-2.5 items-center">
              <div ref={dropdownRef} className="relative flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsLinkDropdownOpen(!isLinkDropdownOpen)}
                  className="w-full flex items-center justify-between gap-2.5 bg-[#0F0F12]/90 hover:bg-[#15151A] border border-white/10 hover:border-white/20 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-left cursor-pointer min-h-[38px] select-none"
                >
                  <span className="truncate flex items-center gap-2">
                    {(() => {
                      if (!selectedLinkTargetId) {
                        return <span className="text-slate-400 font-medium select-none">-- Choose item to link --</span>;
                      }
                      const selectedItem = linkableItems.find(item => item.id === selectedLinkTargetId);
                      if (!selectedItem) {
                        return <span className="text-slate-400 font-medium select-none">-- Choose item to link --</span>;
                      }
                      
                      const displayTitle = selectedItem.title.replace(/^(Task|Meeting|Note):\s*/i, '');
                      return (
                        <>
                          {selectedItem.type === 'task' && (
                            <span className="shrink-0 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 select-none">
                              Task
                            </span>
                          )}
                          {selectedItem.type === 'meeting' && (
                            <span className="shrink-0 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 select-none">
                              Meeting
                            </span>
                          )}
                          {selectedItem.type === 'note' && (
                            <span className="shrink-0 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 select-none">
                              Note
                            </span>
                          )}
                          <span className="text-slate-200 font-medium truncate select-none">{displayTitle}</span>
                        </>
                      );
                    })()}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isLinkDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Animated Dropdown Floating Window */}
                <AnimatePresence>
                  {isLinkDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute left-0 right-0 mt-1.5 z-50 bg-[#121217] border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[280px]"
                    >
                      {/* Search Bar Panel Inside Dropbox */}
                      <div className="p-2 border-b border-white/5 bg-[#0C0C0F] flex items-center gap-2 shrink-0">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1.5" />
                        <input
                          type="text"
                          placeholder="Search items to link..."
                          value={linkSearchQuery}
                          onChange={(e) => setLinkSearchQuery(e.target.value)}
                          className="flex-grow bg-transparent border-0 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:ring-0 py-1 opacity-90"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        {linkSearchQuery && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLinkSearchQuery('');
                            }}
                            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Filters Toolbar */}
                      <div className="px-2 py-1.5 border-b border-white/5 bg-[#0c0d12] flex flex-wrap items-center justify-between gap-1.5 shrink-0 text-[10px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {(['all', 'task', 'meeting', 'note'] as const).map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setLinkTypeFilter(type)}
                              className={`px-1.5 py-0.5 rounded capitalize transition-all cursor-pointer font-bold select-none ${
                                linkTypeFilter === type 
                                  ? 'bg-indigo-600 text-white shadow-sm border border-indigo-500/40 text-[9px]'
                                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white text-[9px]'
                              }`}
                            >
                              {type === 'all' ? 'All' : type === 'meeting' ? 'Event' : type}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setLinkHideCompleted(!linkHideCompleted)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all cursor-pointer font-bold select-none text-[9px] ${
                            linkHideCompleted
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          <span>Hide Done</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${linkHideCompleted ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]' : 'bg-slate-600'}`}></span>
                        </button>
                      </div>

                      {/* Filterable Items List */}
                      <div className="overflow-y-auto p-1.5 space-y-1">
                        {(() => {
                          const query = linkSearchQuery.toLowerCase().trim();
                          const filtered = linkableItems.filter(item => {
                            if (linkTypeFilter !== 'all' && item.type !== linkTypeFilter) {
                              return false;
                            }
                            if (linkHideCompleted && item.completed) {
                              return false;
                            }
                            const cleanTitle = item.title.replace(/^(Task|Meeting|Note):\s*/i, '');
                            return cleanTitle.toLowerCase().includes(query) || item.type.toLowerCase().includes(query);
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="py-6 text-center text-[11px] text-white/30 font-medium">
                                No matching workspace items found.
                              </div>
                            );
                          }

                          return filtered.map(item => {
                            const isSelected = item.id === selectedLinkTargetId;
                            const displayTitle = item.title.replace(/^(Task|Meeting|Note):\s*/i, '');
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLinkTargetId(item.id);
                                  setIsLinkDropdownOpen(false);
                                }}
                                className={`w-full text-left flex items-start justify-between gap-3 p-2.5 rounded-xl transition-all cursor-pointer group ${
                                  isSelected 
                                    ? 'bg-indigo-600/20 border border-indigo-500/30 text-white' 
                                    : 'hover:bg-white/[0.03] border border-transparent text-slate-300 hover:text-white'
                                }`}
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  {item.type === 'task' ? (
                                    <CheckSquare className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                  ) : item.type === 'meeting' ? (
                                    <CalendarDays className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold leading-relaxed break-words whitespace-normal text-slate-200 group-hover:text-white">
                                      {displayTitle}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {item.type === 'task' && (
                                        <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/10 select-none">
                                          Task
                                        </span>
                                      )}
                                      {item.type === 'meeting' && (
                                        <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 select-none">
                                          Meeting
                                        </span>
                                      )}
                                      {item.type === 'note' && (
                                        <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/10 select-none">
                                          Note
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="shrink-0 self-center">
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    isSelected 
                                      ? 'border-indigo-500 bg-indigo-500 text-white' 
                                      : 'border-white/10 group-hover:border-white/20'
                                  }`}>
                                    {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />}
                                  </div>
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleAddLink}
                disabled={!selectedLinkTargetId}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer whitespace-nowrap min-h-[38px] shadow-sm shadow-emerald-950/20"
              >
                <Plus className="w-4 h-4" />
                <span>Link Item</span>
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-white/40 font-medium font-sans bg-white/[0.01] p-3 rounded-xl border border-white/5 text-center">
              Everything in current context is already linked.
            </div>
          )}

          {/* Connected Items Display List AND PREVIEW (IN-PLACE PREVIEW CARD) */}
          <div className="space-y-3.5">
            {activeItem.linkedIds.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center border border-white/5 rounded-xl bg-white/[0.01] text-white/40">
                <Link2 className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-xs font-medium">No linked items.</p>
                <p className="text-[10px] text-white/30 mt-1">Link other tasks, meetings, or notes to this item for quick access.</p>
              </div>
            ) : (
              activeItem.linkedIds.map(linkedId => {
                const subItem = findItemById(linkedId, state);
                if (!subItem) return null;
                const subFolder = state.folders.find(f => f.id === subItem.folderId);

                return (
                  <div key={linkedId} className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden group">
                    {/* Tiny header containing mapping details and Action keys */}
                    <div className="px-3.5 py-2 bg-white/5 flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center gap-2">
                        {subItem.type === 'task' && <CheckSquare className="w-3.5 h-3.5 text-purple-400" />}
                        {subItem.type === 'meeting' && <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />}
                        {subItem.type === 'note' && <FileText className="w-3.5 h-3.5 text-blue-400" />}
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-sans">
                          {subItem.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* Go to item details mapping */}
                        <button
                          onClick={() => onNavigateToItem(subItem.id, subItem.type)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-0.5"
                          title="Navigate to this view"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="text-[10px]">Open</span>
                        </button>
                        {/* Cut link */}
                        <button
                          onClick={() => handleRemoveLink(linkedId)}
                          className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                          title="Sever relationship"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Content Preview based on item type - fulfills same-page requirement! */}
                    <div className="p-3.5 space-y-2 text-xs">
                      <div className="font-semibold text-slate-250 group-hover:text-white transition-colors">
                        {subItem.title}
                      </div>

                      {subFolder && (
                        <div className="flex items-center gap-1 text-[10px]" style={{ color: subFolder.color }}>
                          <Folder className="w-3 h-3" />
                          <span>{subFolder.name}</span>
                        </div>
                      )}

                      {/* Item-specific visual widgets */}
                      {subItem.type === 'task' && (
                        <div className="flex items-center justify-between bg-black/20 p-2 rounded border border-white/5">
                          <button
                            onClick={() => handleToggleTaskStatusInPlace(subItem.id)}
                            className="flex items-center gap-2 text-slate-350 hover:text-white font-medium cursor-pointer"
                          >
                            {subItem.status === 'done' ? (
                              <CheckSquare className="w-4 h-4 text-emerald-450 fill-emerald-500/10" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500" />
                            )}
                            <span className={subItem.status === 'done' ? 'line-through text-slate-500 font-normal' : ''}>
                              {subItem.status === 'done' ? 'Completed Checklist' : 'Status Check'}
                            </span>
                          </button>
                          {getPriorityBadge(subItem.priority)}
                        </div>
                      )}

                      {subItem.type === 'meeting' && (
                        <div className="grid grid-cols-2 gap-2 bg-black/20 p-2 rounded border border-white/5 text-slate-300 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {subItem.date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {subItem.time} ({subItem.duration}m)
                          </div>
                        </div>
                      )}

                      {/* Content previews for notes and description details */}
                      <p className="text-[11px] text-slate-400 line-clamp-3 italic leading-relaxed py-1 font-sans">
                        {subItem.type === 'note' ? subItem.content : subItem.description}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
      </div>

      {/* IMAGE LIGHTBOX DIALOG OVERLAY */}
      <AnimatePresence>
        {selectedPreviewImageAttachment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPreviewImageAttachment(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[85vh] bg-[#101014] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col cursor-default"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/45">
                <span className="text-xs font-bold text-slate-300 truncate pr-4">{selectedPreviewImageAttachment.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedPreviewImageAttachment(null)}
                  className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Image box */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-[250px]">
                {selectedPreviewImageAttachment.url && (
                  <img
                    src={selectedPreviewImageAttachment.url}
                    alt={selectedPreviewImageAttachment.name}
                    className="max-w-full max-h-[60vh] object-contain rounded border border-white/5 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Actions footer */}
              {selectedPreviewImageAttachment.url && (
                <div className="p-3.5 bg-black/45 border-t border-white/5 flex justify-end gap-2 text-xs">
                  <a
                    href={selectedPreviewImageAttachment.url}
                    download={selectedPreviewImageAttachment.name}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Image</span>
                  </a>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
