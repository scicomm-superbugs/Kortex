/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, Shield, Settings2, CheckCircle2, ChevronRight,
  TrendingUp, UserPlus, ToggleLeft, ToggleRight, Sparkles,
  Lock, ArrowRight, Eye, ShieldCheck, Mail, Database, Check, Clock
} from 'lucide-react';
import { WorkspaceState, TeamUser, AdminSettings, Task, Meeting, Note } from '../types';

interface AdminViewProps {
  state: WorkspaceState;
  setState: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  pushToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'alert') => void;
}

export function AdminView({ state, setState, pushToast }: AdminViewProps) {
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');
  const [newUserColor, setNewUserColor] = useState('#3b82f6');

  const team = state.teamUsers || [];
  const settings = state.adminSettings || {
    enableSharingOverrides: true,
    restrictTeamEditing: false,
    allowCalendarSync: true,
    requireSignOff: false
  };

  const handleToggleSetting = (key: keyof AdminSettings) => {
    setState(prev => {
      const updatedSettings = {
        ...prev.adminSettings!,
        [key]: !prev.adminSettings![key]
      };
      
      let msg = '';
      if (key === 'enableSharingOverrides') {
        msg = `Sharing permission overrides are now ${updatedSettings[key] ? 'Enabled' : 'Disabled'}.`;
      } else if (key === 'restrictTeamEditing') {
        msg = `Team task editing restriction is now ${updatedSettings[key] ? 'Active' : 'Inactive'}.`;
      } else if (key === 'allowCalendarSync') {
        msg = `Google Calendar auto-sync is ${updatedSettings[key] ? 'Allowed' : 'Prohibited'}.`;
      } else if (key === 'requireSignOff') {
        msg = `Manager sign-off requirement for tasks is now ${updatedSettings[key] ? 'Enabled' : 'Disabled'}.`;
      }

      pushToast('Security Rule Updated', msg, 'success');
      return {
        ...prev,
        adminSettings: updatedSettings
      };
    });
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newUser: TeamUser = {
      id: `user-${Math.random().toString(36).substring(2, 7)}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      avatar: `https://images.unsplash.com/photo-${Math.random() > 0.5 ? '1535713875002-d1d0cf377fde' : '1570295999919-56ceb5ecca61'}?auto=format&fit=crop&w=100&q=80`,
      color: newUserColor,
      completedTasks: 0,
      totalTasks: 0,
      activeStatus: 'online'
    };

    setState(prev => ({
      ...prev,
      teamUsers: [...(prev.teamUsers || []), newUser]
    }));

    pushToast('User Added', `${newUserName} is now invited to the secure workspace environment.`, 'success');
    setNewUserName('');
    setNewUserEmail('');
    setNewUserOpen(false);
  };

  const handleSwitchUserRole = (userId: string) => {
    setState(prev => ({
      ...prev,
      currentUserRoleId: userId
    }));
    const selectedUser = team.find(u => u.id === userId);
    if (selectedUser) {
      pushToast('Identity Shift', `Now viewing workspace as ${selectedUser.name} (${selectedUser.role.toUpperCase()})`, 'info');
    }
  };

  // Compute stats
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter(t => t.status === 'done').length;
  const teamCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  const sharedTasksCount = state.tasks.filter(t => t.isSharedWithTeam || (t.sharedWith && t.sharedWith.length > 0)).length;
  const sharedNotesCount = state.notes.filter(n => n.isSharedWithTeam || (n.sharedWith && n.sharedWith.length > 0)).length;
  const syncedEventsCount = state.meetings.filter(m => m.googleCalendarEventId).length;

  return (
    <div id="admin-view-panel" className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5.5 h-5.5 text-indigo-400" />
            <span>Admin Control Panel</span>
          </h2>
          <p className="text-xs text-white/50 tracking-wide mt-1">
            Supervise team activities, configure sharing preferences, and toggle sync protocols.
          </p>
        </div>

        {/* Quick User Identity Switcher Dashboard indicator */}
        <div className="bg-[#141417] border border-white/5 px-4 py-2.5 rounded-xl flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-left">
            <span className="text-[9px] uppercase font-bold text-white/40 block">Current Persona</span>
            <select
              value={state.currentUserRoleId || 'user-admin'}
              onChange={(e) => handleSwitchUserRole(e.target.value)}
              className="text-xs font-bold text-indigo-300 bg-transparent border-none p-0 pr-6 focus:ring-0 focus:outline-none cursor-pointer"
            >
              {team.map(user => (
                <option key={user.id} value={user.id} className="bg-[#141417] text-white">
                  {user.name} ({user.role === 'admin' ? 'Admin' : 'Member'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Team Productivity</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{teamCompletionPercentage}%</span>
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +4.2%
            </span>
          </div>
          <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${teamCompletionPercentage}%` }} />
          </div>
        </div>

        <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Shared Tasks</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{sharedTasksCount}</span>
            <span className="text-xs text-white/30">tasks</span>
          </div>
          <span className="text-[10px] text-white/40 block mt-3">Active cross-user assignments</span>
        </div>

        <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Shared Notes</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{sharedNotesCount}</span>
            <span className="text-xs text-white/30 text-slate-400">files</span>
          </div>
          <span className="text-[10px] text-white/40 block mt-3">Publicly editable manuals</span>
        </div>

        <div className="bg-[#0F0F12] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest block">Google Sync Status</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#EA4335] flex items-center gap-1.5">
              {syncedEventsCount}
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Active</span>
            </span>
          </div>
          <span className="text-[10px] text-white/40 block mt-3">Synced Calendar Events</span>
        </div>

      </div>

      {/* Main Grid: Options on left, progress monitor on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Security / Access Controls Options Box (Left) */}
        <div className="lg:col-span-7 bg-[#0F0F12] border border-white/5 rounded-2xl p-5 md:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200">Security & Sharing Controls</h3>
            </div>
            <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/5 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              Full Control
            </span>
          </div>

          <div className="space-y-4">
            
            {/* Setting Item 1 */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#E5E5E6] block">Enable Administrator Sharing Overrides</span>
                <p className="text-[11px] text-white/40 leading-relaxed max-w-[400px]">
                  Permit admin roles to override private task assignments, browse all user events, and reassign shares globally.
                </p>
              </div>
              <button 
                onClick={() => handleToggleSetting('enableSharingOverrides')}
                className="text-indigo-400 hover:text-white transition-colors cursor-pointer"
              >
                {settings.enableSharingOverrides ? (
                  <ToggleRight className="w-9 h-9 fill-indigo-500/20 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-slate-600" />
                )}
              </button>
            </div>

            {/* Setting Item 2 */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#E5E5E6] block">Strict Editing Lockouts (Creator Only)</span>
                <p className="text-[11px] text-white/40 leading-relaxed max-w-[400px]">
                  Prohibit general team members from modifying details, items, or checklists unless they are the designated creator.
                </p>
              </div>
              <button 
                onClick={() => handleToggleSetting('restrictTeamEditing')}
                className="text-indigo-400 hover:text-white transition-colors cursor-pointer"
              >
                {settings.restrictTeamEditing ? (
                  <ToggleRight className="w-9 h-9 fill-indigo-500/20 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-slate-600" />
                )}
              </button>
            </div>

            {/* Setting Item 3 */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#E5E5E6] block">Allow Live Google Calendar Syncing</span>
                <p className="text-[11px] text-white/40 leading-relaxed max-w-[400px]">
                  Allow integrated users to connect and synchronize calendar slots directly with their official Google Calendars in real-time.
                </p>
              </div>
              <button 
                onClick={() => handleToggleSetting('allowCalendarSync')}
                className="text-indigo-400 hover:text-white transition-colors cursor-pointer"
              >
                {settings.allowCalendarSync ? (
                  <ToggleRight className="w-9 h-9 fill-indigo-500/20 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-slate-600" />
                )}
              </button>
            </div>

            {/* Setting Item 4 */}
            <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#E5E5E6] block">Require Administration Sign-off</span>
                <p className="text-[11px] text-white/40 leading-relaxed max-w-[400px]">
                  Force tasks to remain in "In Progress" until approved by an administrator role.
                </p>
              </div>
              <button 
                onClick={() => handleToggleSetting('requireSignOff')}
                className="text-indigo-400 hover:text-white transition-colors cursor-pointer"
              >
                {settings.requireSignOff ? (
                  <ToggleRight className="w-9 h-9 fill-indigo-500/20 text-indigo-400" />
                ) : (
                  <ToggleLeft className="w-9 h-9 text-slate-600" />
                )}
              </button>
            </div>

          </div>
        </div>

        {/* Progress Monitoring & Team List (Right) */}
        <div className="lg:col-span-5 bg-[#0F0F12] border border-white/5 rounded-2xl p-5 md:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 font-sans">Teammates Status & Progress</h3>
              </div>
              <button 
                onClick={() => setNewUserOpen(!newUserOpen)}
                className="text-[10px] font-bold text-white/80 hover:text-white bg-indigo-650 hover:bg-indigo-500 px-2.5 py-1 rounded-md border border-indigo-500/30 flex items-center gap-1 cursor-pointer transition-all"
              >
                <UserPlus className="w-3 h-3" />
                Invite
              </button>
            </div>

            {/* New User Invitation Panel */}
            {newUserOpen && (
              <form onSubmit={handleAddUserSubmit} className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 space-y-3 font-sans">
                <div className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Invite Teammate</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="bg-[#0A0A0C] border border-white/5 text-xs text-white p-2 rounded focus:outline-none"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="bg-[#0A0A0C] border border-white/5 text-xs text-white p-2 rounded focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUserRole('member')}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                        newUserRole === 'member' ? 'bg-indigo-500/15 border-indigo-500/40 text-white' : 'border-white/5 text-white/40'
                      }`}
                    >
                      Member
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUserRole('admin')}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                        newUserRole === 'admin' ? 'bg-purple-500/15 border-purple-500/40 text-white' : 'border-white/5 text-white/40'
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                  
                  <div className="flex gap-1.5">
                    {['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#a855f7'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewUserColor(c)}
                        className={`w-4 h-4 rounded-full border ${newUserColor === c ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-[10px] font-bold pt-1">
                  <button 
                    type="button" 
                    onClick={() => setNewUserOpen(false)}
                    className="px-2.5 py-1 rounded text-white/50 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    Send Invite
                  </button>
                </div>
              </form>
            )}

            {/* Team Progress list */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {team.map(user => {
                // Dynamically fetch task count metrics for this user
                const userTasks = state.tasks.filter(t => t.assignedTo === user.id);
                const userTotal = userTasks.length;
                const userCompleted = userTasks.filter(t => t.status === 'done').length;
                const activePercentage = userTotal > 0 ? Math.round((userCompleted / userTotal) * 100) : 0;

                let statusBadgeType = 'bg-slate-400';
                if (user.activeStatus === 'online') statusBadgeType = 'bg-emerald-500';
                else if (user.activeStatus === 'busy') statusBadgeType = 'bg-amber-500 animate-pulse';

                return (
                  <div 
                    key={user.id} 
                    className="p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 flex items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className="w-9 h-9 rounded-full object-cover border border-white/10" 
                          referrerPolicy="no-referrer"
                        />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0F0F12] ${statusBadgeType}`} />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="text-xs font-bold text-slate-200 block truncate leading-tight">{user.name}</span>
                        <span className="text-[9px] text-white/40 block mt-0.5 font-semibold font-mono tracking-wide">{user.email}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-sans">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-[10px] font-bold text-slate-400">{userCompleted}/{userTotal} Tasks</span>
                        <span className="text-[10px] font-bold text-white bg-white/5 px-1.5 py-0.5 rounded border border-white/10 leading-none">
                          {activePercentage}%
                        </span>
                      </div>
                      
                      {/* Bar indicator */}
                      <div className="w-24 bg-white/5 h-1 rounded-full mt-1.5 ml-auto overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ backgroundColor: user.color, width: `${activePercentage}%` }} 
                        />
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 text-center text-[10px] text-white/30 border-t border-white/5 leading-normal flex items-center justify-center gap-1.5 font-sans">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>Workspace Sync and Access governed by simulated Active Session policies.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
