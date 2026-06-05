/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Menu, X, Layers, Plus, Calendar, CheckSquare, FileText, 
  Tag, Folder, Clock, AlertCircle, Sparkles, Sidebar as SidebarIcon,
  LayoutDashboard, ListTodo, FolderClosed, Settings2, Grid, Search, Globe, Users, MessageCircle, Sun, Moon, Settings, Building2, Smartphone, UserCircle
} from 'lucide-react';
import { WorkspaceState, ViewType, Task, Meeting, Note, PriorityType } from './types';
import { INITIAL_STATE, generateId } from './utils';

// Subcomponents import
import { Sidebar } from './components/Sidebar';
import { PreviewPanel } from './components/PreviewPanel';
import { DashboardView } from './components/DashboardView';
import { TasksView } from './components/TasksView';
import { NotesView } from './components/NotesView';
import { CalendarView } from './components/CalendarView';
import { FoldersView } from './components/FoldersView';

const STORAGE_KEY = 'linked_workspace_state_v1';

interface AppToast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
}

export default function App() {
  // Theme state selector
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const portalDark = localStorage.getItem('scicommDarkMode');
    if (portalDark !== null) {
      return portalDark === 'true' ? 'dark' : 'light';
    }
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = () => {
      const portalDark = localStorage.getItem('scicommDarkMode');
      if (portalDark !== null) {
        setTheme(portalDark === 'true' ? 'dark' : 'light');
      }
    };
    window.addEventListener('storage', syncTheme);
    syncTheme();
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Real-time toasts overlay stack
  const [toasts, setToasts] = useState<AppToast[]>([]);

  // Smooth browser synthetic chime note generator utilizing Web Audio API
  const playNotificationChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // Beautiful dual-harmonic chime chord
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);     // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.14); // G5
      
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime);     // E5
      osc2.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.14); // B5
      
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.4);
      osc2.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio device blocked or unsupported:', e);
    }
  };

  // Push new visual toast banner dispatcher
  const pushToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'alert' = 'info') => {
    const id = `toast-${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
    playNotificationChime();
    
    // Auto dismissal timeout
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Database state
  const [state, setState] = useState<WorkspaceState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_STATE,
          ...parsed,
          notifications: parsed.notifications || INITIAL_STATE.notifications,
          teamUsers: parsed.teamUsers || INITIAL_STATE.teamUsers,
          currentUserRoleId: parsed.currentUserRoleId || INITIAL_STATE.currentUserRoleId,
          adminSettings: parsed.adminSettings || INITIAL_STATE.adminSettings,
        };
      } catch (e) {
        console.error('Failed to parse saved database state. Reverting to presets.', e);
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
  });

  // Navigation and focus state controllers
  const [activeView, setActiveView] = useState<ViewType>(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') as ViewType;
    const validViews: ViewType[] = ['dashboard', 'tasks', 'notes', 'calendar', 'folders'];
    if (view && validViews.includes(view)) {
      return view;
    }
    return 'dashboard';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') !== activeView) {
      params.set('view', activeView);
      const newRelativePathQuery = window.location.pathname + '?' + params.toString() + window.location.hash;
      window.history.pushState(null, '', newRelativePathQuery);
    }
  }, [activeView]);

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('user_id');
    const userName = params.get('user_name');
    const userEmail = params.get('user_email');
    const userAvatar = params.get('user_avatar');

    if (userId) {
      setState(prev => {
        const updatedUsers = prev.teamUsers ? [...prev.teamUsers] : [];
        const exists = updatedUsers.some(u => u.id === userId);
        
        if (exists) {
          const idx = updatedUsers.findIndex(u => u.id === userId);
          if (idx !== -1) {
            updatedUsers[idx] = {
              ...updatedUsers[idx],
              name: userName || updatedUsers[idx].name,
              email: userEmail || updatedUsers[idx].email,
              avatar: userAvatar || updatedUsers[idx].avatar,
            };
          }
        } else {
          updatedUsers.push({
            id: userId,
            name: userName || 'User',
            email: userEmail || 'user@portal.com',
            avatar: userAvatar || '',
            role: 'member',
            color: '#8b5cf6',
            completedTasks: 0,
            totalTasks: 0,
            activeStatus: 'online'
          });
        }
        
        return {
          ...prev,
          teamUsers: updatedUsers,
          currentUserRoleId: userId
        };
      });

      // Clean up URL parameters from browser search bar without refreshing page
      params.delete('user_id');
      params.delete('user_name');
      params.delete('user_email');
      params.delete('user_avatar');
      const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
      window.history.replaceState(null, '', newRelativePathQuery);
    }
  }, []);

  const adminUser = state.teamUsers?.find(u => u.id === state.currentUserRoleId) || state.teamUsers?.find(u => u.id === 'user-admin') || INITIAL_STATE.teamUsers?.[0];

  const renderAvatar = (size = 24) => {
    if (adminUser?.avatar) {
      const isUrl = adminUser.avatar.startsWith('http') || adminUser.avatar.startsWith('data:') || adminUser.avatar.startsWith('.') || adminUser.avatar.startsWith('/');
      if (isUrl) {
        return <img src={adminUser.avatar} alt="Me" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
      } else {
        return (
          <div style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: theme === 'dark' ? '#1e1b4b' : '#eff6ff',
            color: theme === 'dark' ? '#c084fc' : '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${size * 0.55}px`,
            fontWeight: 'bold',
            lineHeight: 1,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)'
          }}>
            {adminUser.avatar}
          </div>
        );
      }
    }
    return <UserCircle className="icon" size={size} />;
  };

  // Unified creation popup states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'task' | 'meeting' | 'note'>('task');
  const [createPrepopulatedDate, setCreatePrepopulatedDate] = useState<string>('');

  // Form states inside the app shell modal
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalFolderId, setModalFolderId] = useState('');
  const [modalPriority, setModalPriority] = useState<PriorityType>('medium');
  const [modalDate, setModalDate] = useState('2026-06-05');
  const [modalTime, setModalTime] = useState('14:00');
  const [modalDuration, setModalDuration] = useState(30);
  const [modalLabelIds, setModalLabelIds] = useState<string[]>([]);

  // Persistent serialization dump
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Handle cross-links hop navigating preview triggers
  const handleNavigateToItem = (id: string, itemType: 'task' | 'meeting' | 'note') => {
    setActiveItemId(id); // Shift interactive focus to newly selected linked item in the Side Panel!
    
    // Snaps navigation view to match correct core module
    if (itemType === 'task') {
      setActiveView('tasks');
    } else if (itemType === 'meeting') {
      setActiveView('calendar');
    } else if (itemType === 'note') {
      setActiveView('notes');
    }
  };

  // Helper trigger to open modal with pre-filled details (e.g. from calendar day click)
  const handleOpenCreateModal = (type: 'task' | 'meeting' | 'note', initialDate?: string) => {
    setCreateType(type);
    if (initialDate) {
      setModalDate(initialDate);
    } else {
      setModalDate('2026-06-05');
    }
    setModalTitle('');
    setModalDesc('');
    setModalFolderId(selectedFolderFilter || '');
    setModalPriority('medium');
    setModalTime('14:00');
    setModalDuration(30);
    setModalLabelIds([]);
    
    setIsCreateModalOpen(true);
    setIsMobileMoreOpen(false); // Clean drawer overlay
  };

  const handleModalToggleLabel = (id: string) => {
    setModalLabelIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    if (createType === 'task') {
      const newTask: Task = {
        id: `task-${generateId()}`,
        type: 'task',
        title: modalTitle,
        description: modalDesc,
        status: 'todo',
        priority: modalPriority,
        dueDate: modalDate || undefined,
        folderId: modalFolderId || undefined,
        labelIds: modalLabelIds,
        linkedIds: [],
        createdAt: '2026-06-04'
      };
      setState(prev => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
    } else if (createType === 'meeting') {
      const newMeeting: Meeting = {
        id: `meeting-${generateId()}`,
        type: 'meeting',
        title: modalTitle,
        description: modalDesc,
        date: modalDate,
        time: modalTime,
        duration: Number(modalDuration),
        folderId: modalFolderId || undefined,
        labelIds: modalLabelIds,
        linkedIds: [],
        createdAt: '2026-06-04'
      };
      setState(prev => ({ ...prev, meetings: [newMeeting, ...prev.meetings] }));
    } else {
      const newNote: Note = {
        id: `note-${generateId()}`,
        type: 'note',
        title: modalTitle,
        content: modalDesc || '*Document outline initiated.*',
        folderId: modalFolderId || undefined,
        labelIds: modalLabelIds,
        linkedIds: [],
        createdAt: '2026-06-04',
        updatedAt: '2026-06-04'
      };
      setState(prev => ({ ...prev, notes: [newNote, ...prev.notes] }));
    }

    setIsCreateModalOpen(false);
  };

  return (
    <div id="application-container" className="fixed inset-0 flex flex-col bg-[#0A0A0C] border-none select-none text-slate-200 overflow-hidden font-sans">
      
      {/* SciComm header upper bar */}
      <header className="scicomm-header shrink-0">
        <div className="scicomm-header-content">
          <div className="scicomm-header-left">
            {/* Mobile: Profile avatar triggers sidebar | Desktop: Logo */}
            <button onClick={() => setMobileSidebarOpen(true)} className="scicomm-mobile-profile-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}><span className="scicomm-mobile-avatar">{renderAvatar(30)}</span></button>
            <a href="https://scicomm-superbugs.github.io/Portal/#/"><img src={theme === 'dark' ? "./aiu_scicomm_dark.png" : "./aiu_scicomm_light.png"} alt="AIU SciComm" className="scicomm-logo" onError={e => (e.target as HTMLElement).style.display='none'} /></a>
            <div className="scicomm-search-box">
              <Search className="icon text-slate-500" size={16} />
              <input 
                type="text" 
                className="scicomm-search-input" 
                placeholder="Search..." 
                value={searchText} 
                onChange={e => setSearchText(e.target.value)} 
                onKeyDown={e => { if(e.key === 'Enter' && searchText.trim()) { window.location.href = 'https://scicomm-superbugs.github.io/Portal/#/network?q=' + encodeURIComponent(searchText); setSearchText(''); } }} 
              />
            </div>
          </div>
          {/* Mobile: Chat icon top-right with optional unread badge */}
          <a href="https://scicomm-superbugs.github.io/Portal/#/chat" className="scicomm-mobile-chat-link" style={{ position: 'relative' }}>
            <MessageCircle className="icon text-slate-400" size={24} color="currentColor" />
          </a>
          <nav className="scicomm-nav">
            <a 
              href="https://scicomm-superbugs.github.io/Portal/#/" 
              className="scicomm-nav-item"
              style={{ position: 'relative' }}
            >
              <LayoutDashboard className="icon" size={20} />
              <span className="nav-text">WorkSpace</span>
            </a>

            <a href="https://scicomm-superbugs.github.io/Portal/#/community" className="scicomm-nav-item"><Globe className="icon" size={20} /><span className="nav-text">Community</span></a>
            <a href="https://scicomm-superbugs.github.io/Portal/#/network" className="scicomm-nav-item"><Users className="icon" size={20} /><span className="nav-text">Network</span></a>
            <a href="https://scicomm-superbugs.github.io/Portal/#/chat" className="scicomm-nav-item"><MessageCircle className="icon" size={20} /><span className="nav-text">Chat</span></a>

            {/* Profile Dropdown */}
            <div className="scicomm-nav-item profile-dropdown-container">
              {renderAvatar(24)}
              <span className="nav-text">Me <span className="emoji">▼</span></span>
              <div className="scicomm-dropdown">
                <div style={{padding:'12px 16px', borderBottom:'1px solid #e0dfdc'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    {renderAvatar(44)}
                    <div>
                      <div style={{fontWeight:600,fontSize:'14px',display:'flex',alignItems:'center',gap:'4px', color:'#1e293b'}}>{adminUser?.name || 'Administrator'}</div>
                      <div style={{fontSize:'12px',color:'rgba(0,0,0,0.6)'}}>{adminUser?.email || 'admin@workspace.com'}</div>
                    </div>
                  </div>
                  <a href="https://scicomm-superbugs.github.io/Portal/#/profile" className="scicomm-btn-secondary" style={{marginTop:'8px',display:'block',textAlign:'center',textDecoration:'none',padding:'4px 12px',fontSize:'13px'}}>View Profile</a>
                </div>
                <a href="https://scicomm-superbugs.github.io/Portal/#/settings" className="dropdown-item" style={{display:'flex',alignItems:'center',gap:'8px', textDecoration:'none', color:'inherit'}}>
                  <Settings className="icon" size={16} /> Settings
                </a>
                <a href="https://scicomm-superbugs.github.io/Portal/#/portal" className="dropdown-item" style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <Building2 className="icon" size={16} /> Switch Hub
                </a>
                <div className="dropdown-divider"></div>
                <a href="https://scicomm-superbugs.github.io/Portal/#/login" className="dropdown-item">Sign Out</a>
              </div>
            </div>

            <a href="https://scicomm-superbugs.github.io/Portal/#/download" className="scicomm-download-btn-wrapper" style={{ position: 'relative', marginLeft: '8px' }}>
              <div className="scicomm-download-btn-inner">
                <Smartphone className="icon" size={16} />
                <span className="nav-text">Download App</span>
              </div>
            </a>
          </nav>
        </div>
      </header>

      {/* CORE FRAME CONTAINER: SIDEBAR + MAIN PAGE + CONTEXT PANEL */}
      <div id="core-frame-screen" className="flex-1 flex overflow-hidden relative">
        
        {/* DESKTOP PERMANENT VIEW SIDEBAR */}
        <div id="desktop-sidebar-pane" className="hidden lg:block shrink-0 h-full w-64 select-none">
          <Sidebar
            activeView={activeView}
            setActiveView={setActiveView}
            state={state}
            onSelectFolderFilter={setSelectedFolderFilter}
            selectedFolderFilter={selectedFolderFilter}
            onOpenCreateItemModal={handleOpenCreateModal}
            theme={theme}
          />
        </div>

        {/* MAIN MODULE CONTENT CANVAS VIEWPORT WITH PADDED BOTTOM ZONE FOR MOBILE DOCK */}
        <div 
          id="main-content-canvas" 
          className={`flex-1 h-full px-4 sm:px-5 lg:px-9 py-4 sm:py-6 lg:pb-6 ${
            ['copilot', 'calendar'].includes(activeView) 
              ? 'pb-2 overflow-hidden flex flex-col' 
              : 'pb-20 overflow-y-auto space-y-4 sm:space-y-6'
          }`}
        >
          {activeView === 'dashboard' && (
            <DashboardView
              state={state}
              setState={setState}
              onSelectItem={setActiveItemId}
              setActiveView={setActiveView}
              activeItemId={activeItemId}
              pushToast={pushToast}
              theme={theme}
            />
          )}



          {activeView === 'tasks' && (
            <TasksView
              state={state}
              setState={setState}
              onSelectItem={setActiveItemId}
              selectedFolderFilter={selectedFolderFilter}
              onSelectFolderFilter={setSelectedFolderFilter}
              theme={theme}
            />
          )}

          {activeView === 'notes' && (
            <NotesView
              state={state}
              setState={setState}
              onSelectItem={setActiveItemId}
              selectedFolderFilter={selectedFolderFilter}
              onSelectFolderFilter={setSelectedFolderFilter}
              theme={theme}
            />
          )}

          {activeView === 'calendar' && (
            <CalendarView
              state={state}
              setState={setState}
              onSelectItem={setActiveItemId}
              onOpenCreateItemModal={handleOpenCreateModal}
              pushToast={pushToast}
              theme={theme}
            />
          )}

          {activeView === 'folders' && (
            <FoldersView
              state={state}
              setState={setState}
              selectedFolderFilter={selectedFolderFilter}
              onSelectFolderFilter={setSelectedFolderFilter}
              onSelectItem={setActiveItemId}
              theme={theme}
            />
          )}


        </div>

        {/* SIDEBAR PREVIEW OVERLAY DRAWER - FULFILL SAME PAGE RECURSIVE REQUIREMENT */}
        {activeItemId && (
          <div 
            id="overlay-detail-drawer" 
            className="w-full sm:w-110 lg:w-120 h-full fixed lg:relative right-0 top-0 bottom-0 z-40 shrink-0 shadow-2xl transition-all duration-300 border-l border-white/5"
          >
            <PreviewPanel
              activeItemId={activeItemId}
              onClose={() => setActiveItemId(null)}
              state={state}
              setState={setState}
              onNavigateToItem={handleNavigateToItem}
              theme={theme}
            />
          </div>
        )}

      </div>

      {/* CORE SPLID CREATE CREATOR POPUP MODAL */}
      {isCreateModalOpen && (
        <div id="global-composer-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0C]/80 backdrop-blur-sm p-4">
          <div 
            className="w-full max-w-xl bg-[#16161A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <span className="p-1 px-2 text-[10px] uppercase font-bold tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                  Create
                </span>
                <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                  New {createType}
                </span>
              </div>

              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleModalSubmit} className="space-y-4">
              
              <div className="space-y-1 font-sans">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Title</label>
                <input
                  type="text"
                  required
                  placeholder={`Title...`}
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">
                  {createType === 'note' ? 'Content' : 'Description'}
                </label>
                <textarea
                  placeholder="Write something..."
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  rows={createType === 'note' ? 8 : 4}
                  className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Dynamic variables based on type selection */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Date for Calendar deadlines */}
                {(createType === 'task' || createType === 'meeting') && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={modalDate}
                      onChange={(e) => setModalDate(e.target.value)}
                      className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Clock value */}
                {createType === 'meeting' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Time</label>
                    <input
                      type="time"
                      required
                      value={modalTime}
                      onChange={(e) => setModalTime(e.target.value)}
                      className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                )}

                {/* Length duration */}
                {createType === 'meeting' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Duration</label>
                    <select
                      value={modalDuration}
                      onChange={(e) => setModalDuration(Number(e.target.value))}
                      className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2 text-xs text-white"
                    >
                      <option value={15}>15 mins</option>
                      <option value={30}>30 mins</option>
                      <option value={45}>45 mins</option>
                      <option value={60}>60 mins</option>
                      <option value={90}>90 mins</option>
                    </select>
                  </div>
                )}

                {/* Priority slider */}
                {createType === 'task' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Priority</label>
                    <select
                      value={modalPriority}
                      onChange={(e) => setModalPriority(e.target.value as PriorityType)}
                      className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Folder Choice directory */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-white/40 block">Folder</label>
                <select
                  value={modalFolderId}
                  onChange={(e) => setModalFolderId(e.target.value)}
                  className="w-full bg-[#0F0F12] border border-white/5 rounded-lg p-2 text-xs text-white"
                >
                  <option value="">None</option>
                  {state.folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>



              {/* Modal footer controls */}
              <div className="border-t border-white/5 pt-3 flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer transition-colors"
                >
                  Create
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div 
        id="mobile-bottom-dock" 
        className="lg:hidden flex items-center justify-around h-16 bg-[#0F0F12] border-t border-white/5 shrink-0 select-none px-1.5 z-30"
      >
        <button
          onClick={() => {
            setActiveView('dashboard');
            setSelectedFolderFilter(null);
            setIsMobileMoreOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] sm:text-xs font-semibold gap-0.5 sm:gap-1 transition-all cursor-pointer min-w-0 px-0.5 ${
            activeView === 'dashboard' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4.5 h-4.5 mx-auto" />
          <span className="truncate">Dashboard</span>
        </button>

        <button
          onClick={() => {
            setActiveView('tasks');
            setSelectedFolderFilter(null);
            setIsMobileMoreOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] sm:text-xs font-semibold gap-0.5 sm:gap-1 transition-all cursor-pointer min-w-0 px-0.5 ${
            activeView === 'tasks' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListTodo className="w-4.5 h-4.5 mx-auto" />
          <span className="truncate">Tasks</span>
        </button>

        <button
          onClick={() => {
            setActiveView('notes');
            setSelectedFolderFilter(null);
            setIsMobileMoreOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] sm:text-xs font-semibold gap-0.5 sm:gap-1 transition-all cursor-pointer min-w-0 px-0.5 ${
            activeView === 'notes' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4.5 h-4.5 mx-auto" />
          <span className="truncate">Notes</span>
        </button>

        <button
          onClick={() => {
            setActiveView('calendar');
            setSelectedFolderFilter(null);
            setIsMobileMoreOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] sm:text-xs font-semibold gap-0.5 sm:gap-1 transition-all cursor-pointer min-w-0 px-0.5 ${
            activeView === 'calendar' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4.5 h-4.5 mx-auto" />
          <span className="truncate">Calendar</span>
        </button>

        <button
          onClick={() => setIsMobileMoreOpen(prev => !prev)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[9px] sm:text-xs font-semibold gap-0.5 sm:gap-1 transition-all cursor-pointer min-w-0 px-0.5 ${
            isMobileMoreOpen || ['calendar', 'folders'].includes(activeView) ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className="w-4.5 h-4.5 mx-auto" />
          <span className="truncate">More</span>
        </button>
      </div>

      {/* MOBILE MORE MENU BOTTOM DRAWER */}
      {isMobileMoreOpen && (
        <div 
          id="mobile-bottom-drawer-overlay" 
          className="fixed inset-0 z-40 bg-[#0A0A0C]/80 backdrop-blur-sm lg:hidden flex flex-col justify-end"
          onClick={() => setIsMobileMoreOpen(false)}
        >
          <div 
            id="mobile-bottom-drawer-body"
            className="w-full bg-[#141417] border-t border-white/10 rounded-t-2xl px-6 pb-8 pt-2 flex flex-col space-y-5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle bar */}
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto my-1.5 shrink-0" />

            {/* Bottom menu directory header */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#94a3b8]">Workspace Directory & Actions</span>
              <button 
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Creator Panel */}
            <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-2.5">
              <span className="text-[9px] uppercase tracking-widest font-bold text-[#64748b] block">Quick Create Item</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    handleOpenCreateModal('task');
                    setIsMobileMoreOpen(false);
                  }}
                  className="py-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 active:bg-purple-500/20 active:scale-95 transition-all text-[11px] font-semibold flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Task</span>
                </button>
                <button
                  onClick={() => {
                    handleOpenCreateModal('meeting');
                    setIsMobileMoreOpen(false);
                  }}
                  className="py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 active:bg-emerald-500/20 active:scale-95 transition-all text-[11px] font-semibold flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Event</span>
                </button>
                <button
                  onClick={() => {
                    handleOpenCreateModal('note');
                    setIsMobileMoreOpen(false);
                  }}
                  className="py-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 active:bg-indigo-500/20 active:scale-95 transition-all text-[11px] font-semibold flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Note</span>
                </button>
              </div>
            </div>

            {/* Custom Secondary views grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => {
                  setActiveView('notes');
                  setIsMobileMoreOpen(false);
                }}
                className={`py-3 px-2 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  activeView === 'notes'
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-white font-bold'
                    : 'bg-white/5 border-transparent text-[#94a3b8] active:bg-white/10'
                }`}
              >
                <FileText className="w-5 h-5 text-indigo-400 mx-auto" />
                <span className="text-[10px] font-semibold leading-none font-sans">Notes View</span>
              </button>

              <button
                onClick={() => {
                  setActiveView('calendar');
                  setIsMobileMoreOpen(false);
                }}
                className={`py-3 px-2 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  activeView === 'calendar'
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-white font-bold'
                    : 'bg-white/5 border-transparent text-[#94a3b8] active:bg-white/10'
                }`}
              >
                <Calendar className="w-5 h-5 text-indigo-400 mx-auto" />
                <span className="text-[10px] font-semibold leading-none">Calendar</span>
              </button>

              <button
                onClick={() => {
                  setActiveView('folders');
                  setIsMobileMoreOpen(false);
                }}
                className={`py-3 px-2 rounded-xl border transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  activeView === 'folders'
                    ? 'bg-indigo-600/10 border-indigo-500/30 text-white font-bold'
                    : 'bg-white/5 border-transparent text-[#94a3b8] active:bg-white/10'
                }`}
              >
                <FolderClosed className="w-5 h-5 text-indigo-400 mx-auto" />
                <span className="text-[10px] font-semibold leading-none">Folders</span>
              </button>
            </div>

            {/* Folder shortcuts */}
            {state.folders.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] uppercase tracking-widest font-bold text-[#64748b] block">Filter Folders shortcut</span>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {state.folders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => {
                        setSelectedFolderFilter(folder.id);
                        setActiveView('folders');
                        setIsMobileMoreOpen(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                        selectedFolderFilter === folder.id
                          ? 'bg-indigo-600/15 border-indigo-500/30 text-white'
                          : 'bg-white/5 border-white/5 text-[#94a3b8]'
                      }`}
                    >
                      <span 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: folder.color }}
                      />
                      <span>{folder.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Close footer indicator */}
            <div className="pt-2 text-center">
              <button 
                onClick={() => setIsMobileMoreOpen(false)}
                className="text-[11px] font-semibold text-[#64748b] active:text-indigo-400"
              >
                Tap anywhere to close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Toasts System Notification portal */}
      <div id="toast-portal-container" className="fixed bottom-24 lg:bottom-6 right-5 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2.5rem)] pointer-events-none">
        {toasts.map(toast => {
          let borderTheme = 'border-indigo-500/20';
          let iconColor = 'text-indigo-400';
          if (toast.type === 'success') {
            borderTheme = 'border-emerald-500/35 bg-[#0e1612]';
            iconColor = 'text-emerald-400';
          } else if (toast.type === 'alert') {
            borderTheme = 'border-rose-500/35 bg-[#170e10]';
            iconColor = 'text-rose-400';
          } else if (toast.type === 'warning') {
            borderTheme = 'border-amber-500/35 bg-[#16120e]';
            iconColor = 'text-amber-400';
          }
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border bg-[#0C0C0F] ${borderTheme} shadow-2xl text-xs transition-all duration-300 transform translate-y-0 opacity-100 font-sans`}
              style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              <div className="p-1.5 rounded bg-black/40 border border-white/5 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${iconColor} bg-current animate-pulse`} />
              </div>
              <div className="space-y-0.5 flex-1 select-text">
                <div className="font-bold text-white text-[10px] uppercase tracking-wider">{toast.title}</div>
                <div className="text-[#94a3b8] text-[11px] leading-relaxed select-text">{toast.message}</div>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-white/40 hover:text-white px-1.5 text-lg leading-none cursor-pointer"
                title="Dismiss toast"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>

      {/* Mobile Profile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileSidebarOpen(false)} />
          <div className="scicomm-mobile-sidebar" style={{ position: 'relative', width: '280px', maxWidth: '80%', background: theme === 'dark' ? '#141417' : 'white', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 12px rgba(0,0,0,0.2)', animation: 'slideRight 0.3s ease' }}>
            <div className="scicomm-mobile-sidebar-header" style={{ padding: '20px 16px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e0dfdc'}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <a href="https://scicomm-superbugs.github.io/Portal/#/profile" onClick={() => setMobileSidebarOpen(false)} style={{ textDecoration: 'none' }}>{renderAvatar(56)}</a>
                <button className="scicomm-mobile-sidebar-close" onClick={() => setMobileSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666', marginTop: '-8px' }}>×</button>
              </div>
              <a href="https://scicomm-superbugs.github.io/Portal/#/profile" onClick={() => setMobileSidebarOpen(false)} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3 className="scicomm-mobile-sidebar-name" style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: theme === 'dark' ? 'white' : 'inherit' }}>
                  {adminUser?.name || 'Administrator'}
                </h3>
              </a>
              <div className="scicomm-mobile-sidebar-dept" style={{ color: theme === 'dark' ? '#94a3b8' : '#4b5563', fontSize: '14px', marginBottom: '4px', fontWeight: 500 }}>{adminUser?.email}</div>
            </div>

            <div className="scicomm-mobile-sidebar-menu" style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
              <a href="https://scicomm-superbugs.github.io/Portal/#/" className="scicomm-mobile-sidebar-menu-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', textDecoration: 'none', color: theme === 'dark' ? 'white' : '#1f2937', fontSize: '15px', fontWeight: 600 }}>
                <LayoutDashboard size={20} color="#4b5563" /> WorkSpace
              </a>
              <a href="https://scicomm-superbugs.github.io/Portal/#/portal" className="scicomm-mobile-sidebar-menu-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', textDecoration: 'none', color: theme === 'dark' ? 'white' : '#1f2937', fontSize: '15px', fontWeight: 600 }}>
                <Building2 size={20} color="#4b5563" /> Switch Hub
              </a>
              <a href="https://scicomm-superbugs.github.io/Portal/#/download" className="scicomm-mobile-sidebar-menu-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', textDecoration: 'none', color: theme === 'dark' ? 'white' : '#1f2937', fontSize: '15px', fontWeight: 600 }}>
                <Smartphone size={20} color="#4b5563" /> Download App
              </a>
              <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 'auto' }}>
                <img src={theme === 'dark' ? "./aiu_scicomm_dark.png" : "./aiu_scicomm_light.png"} alt="AIU SciComm" style={{ maxHeight: '120px', opacity: 0.9 }} onError={e => (e.target as HTMLElement).style.display='none'} />
              </div>
            </div>

            <div className="scicomm-mobile-sidebar-footer" style={{ padding: '12px 0', borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e0dfdc'}` }}>
              <a href="https://scicomm-superbugs.github.io/Portal/#/settings" className="scicomm-mobile-sidebar-footer-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', textDecoration: 'none', color: theme === 'dark' ? '#94a3b8' : '#4b5563', fontSize: '15px', fontWeight: 600 }}><Settings size={20} /> Settings</a>
              <a href="https://scicomm-superbugs.github.io/Portal/#/login" className="scicomm-mobile-sidebar-footer-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', textDecoration: 'none', color: theme === 'dark' ? '#94a3b8' : '#4b5563', fontSize: '15px', fontWeight: 600 }}>Sign Out</a>
            </div>
          </div>
          <style>{`
            @keyframes slideRight {
              from { transform: translateX(-100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
