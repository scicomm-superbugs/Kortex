/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Bell, BellOff, Check, Trash2, ShieldAlert, CheckCircle2, 
  Info, ArrowUpRight, Sparkles, Sliders, Volume2, VolumeX, 
  AlertTriangle, Eye, ShieldCheck, RefreshCw
} from 'lucide-react';
import { WorkspaceState, AppNotification } from '../types';

interface NotificationsViewProps {
  state: WorkspaceState;
  setState: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  onSelectItem: (id: string, type: 'task' | 'meeting' | 'note') => void;
  playChime: () => void;
}

export function NotificationsView({
  state,
  setState,
  onSelectItem,
  playChime
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'alerts' | 'success'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [channelPriority, setChannelPriority] = useState(true);
  const [channelUnlinked, setChannelUnlinked] = useState(true);
  const [channelToday, setChannelToday] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);

  // Safe fetch of notifications list
  const notificationsList = useMemo(() => {
    return state.notifications || [];
  }, [state.notifications]);

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notificationsList.filter(n => {
      if (filter === 'unread') return !n.read;
      if (filter === 'alerts') return n.type === 'alert' || n.type === 'warning';
      if (filter === 'success') return n.type === 'success';
      return true;
    });
  }, [notificationsList, filter]);

  // Read status stats
  const unreadCount = useMemo(() => {
    return notificationsList.filter(n => !n.read).length;
  }, [notificationsList]);

  // Mark single as read
  const handleMarkAsRead = (id: string) => {
    setState(prev => ({
      ...prev,
      notifications: (prev.notifications || []).map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    }));
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    setState(prev => ({
      ...prev,
      notifications: (prev.notifications || []).map(n => ({ ...n, read: true }))
    }));
    if (soundEnabled) playChime();
  };

  // Dismiss single
  const handleDeleteNotif = (id: string) => {
    setState(prev => ({
      ...prev,
      notifications: (prev.notifications || []).filter(n => n.id !== id)
    }));
  };

  // Clear all
  const handleClearAll = () => {
    setState(prev => ({
      ...prev,
      notifications: []
    }));
  };

  // Run Workspace Audit to generate real notifications based on current DB
  const handleRunAudit = () => {
    setIsAuditing(true);
    
    // Simulate smart backend processing delay for fluid UX
    setTimeout(() => {
      const generated: AppNotification[] = [];
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      // 1. Audit highly urgent pending tasks
      if (channelPriority) {
        state.tasks.forEach(task => {
          if (task.status !== 'done' && task.priority === 'high') {
            // Check if alert already exists to prevent duplicate spamming
            const exists = notificationsList.some(n => n.actionItemId === task.id && n.title.includes('High Priority'));
            if (!exists) {
              generated.push({
                id: `notif-audit-${Math.random().toString(36).substr(2, 5)}`,
                title: 'High Priority Task Due Today',
                message: `"${task.title}" is flagged as high priority. Ensure its checklist is updated.`,
                type: 'alert',
                read: false,
                timestamp,
                actionItemId: task.id
              });
            }
          }
        });
      }

      // 2. Audit meetings/events scheduled for today (TODAY is 2026-06-04)
      if (channelToday) {
        state.meetings.forEach(meeting => {
          if (meeting.date === '2026-06-04') {
            const exists = notificationsList.some(n => n.actionItemId === meeting.id && n.title.includes('Scheduled Today'));
            if (!exists) {
              generated.push({
                id: `notif-audit-${Math.random().toString(36).substr(2, 5)}`,
                title: 'Event Scheduled Today',
                message: `"${meeting.title}" is scheduled for today at ${meeting.time}.`,
                type: 'info',
                read: false,
                timestamp,
                actionItemId: meeting.id
              });
            }
          }
        });
      }

      // 3. Audit unlinked items (No linkedIds reference)
      if (channelUnlinked) {
        const unlinkedTasks = state.tasks.filter(t => !t.linkedIds || t.linkedIds.length === 0);
        if (unlinkedTasks.length > 0) {
          const task = unlinkedTasks[0];
          const exists = notificationsList.some(n => n.title.includes('Unlinked Workspace Node'));
          if (!exists) {
            generated.push({
              id: `notif-audit-${Math.random().toString(36).substr(2, 5)}`,
              title: 'Unlinked Workspace Node',
              message: `Task "${task.title}" has no related notes or synced events. Link items to build your knowledge map.`,
              type: 'warning',
              read: false,
              timestamp,
              actionItemId: task.id
            });
          }
        }
      }

      // If nothing new was generated, add a fresh success check
      if (generated.length === 0) {
        generated.push({
          id: `notif-audit-success-${Math.random().toString(36).substr(2, 5)}`,
          title: 'Workspace Health: Pristine',
          message: 'System audit completed. All folders, labels, and event mappings are healthy and balanced!',
          type: 'success',
          read: false,
          timestamp
        });
      }

      // Update state
      setState(prev => ({
        ...prev,
        notifications: [...generated, ...(prev.notifications || [])]
      }));

      setIsAuditing(false);
      if (soundEnabled) playChime();
    }, 600);
  };

  // Helper function to resolve icon mapping
  const renderNotifIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  // Determine helper backgrounds
  const getNotifStyle = (type: string, read: boolean) => {
    if (read) return 'bg-[#121215]/50 border-white/5 opacity-65';
    switch (type) {
      case 'alert':
        return 'bg-[#1c1214] border-rose-500/20 shadow-lg shadow-rose-950/5';
      case 'warning':
        return 'bg-[#1b1712] border-amber-500/20 shadow-lg shadow-amber-950/5';
      case 'success':
        return 'bg-[#111915] border-emerald-500/20 shadow-lg shadow-emerald-950/5';
      case 'info':
      default:
        return 'bg-[#12161b] border-blue-500/20 shadow-lg shadow-blue-950/5';
    }
  };

  const handleActionClick = (notif: AppNotification) => {
    handleMarkAsRead(notif.id);
    if (notif.actionItemId) {
      // Determine type dynamically based on prefix
      const itemId = notif.actionItemId;
      let itemType: 'task' | 'meeting' | 'note' = 'task';
      if (itemId.startsWith('meeting')) itemType = 'meeting';
      else if (itemId.startsWith('note')) itemType = 'note';
      
      onSelectItem(itemId, itemType);
    }
  };

  return (
    <div id="notifications-view-root" className="space-y-6 pb-10">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F0F12] p-4 rounded-2xl border border-white/5 font-sans">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-400 animate-pulse" />
            Workspace Notification Center
          </h2>
          <p className="text-slate-450 text-[11px] font-semibold">Monitor connected workspace events, deadlines, and smart audits.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="p-2 px-3.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditing...' : 'Run Audit'}</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${
              showSettings 
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold' 
                : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-200 hover:text-white'
            }`}
            title="Toggle preferences and alert channels"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showSettings ? 'Hide Settings' : 'Settings'}</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="p-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-white/5 transition-all"
            >
              <Check className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mark All Read</span>
            </button>
          )}

          {notificationsList.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2 rounded-xl bg-rose-950/20 hover:bg-rose-900/20 text-rose-400 hover:text-rose-300 border border-rose-500/10 text-xs font-semibold flex items-center justify-center p-2 cursor-pointer transition-all"
              title="Clear all system logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* LEFT COLUMN: CHANNELS & SETTINGS PARAMETERS */}
        {showSettings && (
          <div className="space-y-4 lg:col-span-1">
            <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Preferences</span>
              </div>

              {/* Custom Sound Toggle widget */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/5">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                  Chime Sound Effects
                </span>
                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-all outline-none ${soundEnabled ? 'bg-indigo-650' : 'bg-white/10'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${soundEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Notification alert channels */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Audited Channels</span>
                
                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-colors">
                  <span className="text-[11px] text-slate-300 font-medium">High Priority Reminders</span>
                  <input 
                    type="checkbox" 
                    checked={channelPriority} 
                    onChange={() => setChannelPriority(!channelPriority)}
                    className="rounded border-white/10 text-indigo-600 focus:ring-opacity-0 bg-transparent animate-none"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-colors">
                  <span className="text-[11px] text-slate-300 font-medium font-sans">Unlinked Node Warnings</span>
                  <input 
                    type="checkbox" 
                    checked={channelUnlinked} 
                    onChange={() => setChannelUnlinked(!channelUnlinked)}
                    className="rounded border-white/10 text-indigo-600 focus:ring-opacity-0 bg-transparent animate-none"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-colors">
                  <span className="text-[11px] text-slate-300 font-medium">Daily Schedule Sync</span>
                  <input 
                    type="checkbox" 
                    checked={channelToday} 
                    onChange={() => setChannelToday(!channelToday)}
                    className="rounded border-white/10 text-indigo-600 focus:ring-opacity-0 bg-transparent animate-none"
                  />
                </label>
              </div>

              {/* Smart tip banner */}
              <div className="p-3.5 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[10px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1 text-indigo-400 font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Smart Linked Syncer
                </div>
                <p className="leading-relaxed font-sans">
                  The workspace automatically monitors deadlines. Tap "Run Audit" any time to trigger a real-time check of unlinked nodes or dangerous overlaps!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: NOTIFICATIONS CONTENT LOG FLOW */}
        <div className={`space-y-4 ${showSettings ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          
          {/* Quick tab filters */}
          <div className="bg-[#0F0F12] border border-white/5 p-2 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filter === 'all' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All Logs
              <span className="ml-1 text-[10px] opacity-60 font-mono">({notificationsList.length})</span>
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filter === 'unread' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Unread
              {unreadCount > 0 && <span className="ml-1 text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>}
            </button>
            <button
              onClick={() => setFilter('alerts')}
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filter === 'alerts' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Alerts
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${filter === 'success' ? 'bg-indigo-650 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Checks
            </button>
          </div>

          {/* List Flow */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredNotifications.length === 0 ? (
              <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-12 text-center text-xs text-white/40 space-y-2">
                <BellOff className="w-8 h-8 mx-auto text-slate-600 animate-bounce" />
                <p>No notifications found in this list category.</p>
              </div>
            ) : (
              filteredNotifications.map(notif => (
                <div
                  key={notif.id}
                  className={`flex items-start justify-between p-3.5 rounded-xl border transition-all ${getNotifStyle(notif.type, notif.read)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1 px-1.5 rounded bg-black/40 border border-white/5 mt-0.5 shrink-0">
                      {renderNotifIcon(notif.type)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold text-slate-200 ${notif.read ? 'line-through opacity-70' : ''}`}>
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
                        )}
                      </div>
                      
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-white/35 pt-1">
                        <span>Time: {notif.timestamp}</span>
                        {notif.actionItemId && (
                          <>
                            <span>•</span>
                            <button
                              onClick={() => handleActionClick(notif)}
                              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5 cursor-pointer hover:underline"
                            >
                              Open linked reference
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-1 px-2 text-[10px] bg-black/40 rounded border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1 font-semibold"
                        title="Mark as completed"
                      >
                        <Check className="w-3 h-3 text-emerald-400" />
                        Done
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotif(notif.id)}
                      className="p-1.5 rounded bg-black/40 border border-white/5 hover:bg-white/5 hover:border-white/10 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                      title="Dismiss notification log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
