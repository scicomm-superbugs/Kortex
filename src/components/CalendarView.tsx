/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, 
  CheckSquare, CalendarDays, ExternalLink, Link2, Folder,
  Grid, ListTodo, Layers, ArrowUpRight, Check, Sparkles, Filter,
  FileText, ArrowRight, Eye, CalendarRange, Clock3, EyeOff,
  User, Users, RefreshCw, LogOut, Loader2, Trash2, Shield,
  X, Video, MapPin, Briefcase, HelpCircle, Bold, Italic, Underline, List, ListOrdered, Circle, Copy, ExternalLink as ExtLink
} from 'lucide-react';
import { WorkspaceState, Task, Meeting, TeamUser } from '../types';
import { 
  googleSignIn, googleSignOut, fetchGoogleEvents, 
  createGoogleEvent, deleteGoogleEvent, getCachedToken 
} from '../utils/googleCalendar';
import { generateId } from '../utils';

interface CalendarViewProps {
  state: WorkspaceState;
  setState: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  onSelectItem: (id: string) => void;
  onOpenCreateItemModal: (type: 'task' | 'meeting' | 'note', initialDate?: string) => void;
  pushToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'alert') => void;
  theme?: 'light' | 'dark';
}

type ViewMode = 'schedule' | 'day' | 'week' | 'month';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getLocalISODate(date: Date): string {
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getFormattedDate(dateStr: string): string {
  if (!dateStr) return '';
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

function getFormattedTime(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  const min = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(min)) return timeStr;
  const ampm = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMin = String(min).padStart(2, '0');
  return `${displayHour}:${displayMin}${ampm}`;
}

function getFormattedTimeRange(timeStr: string, duration: number): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  const min = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(min)) return timeStr;
  
  const ampm1 = hour >= 12 ? ' PM' : ' AM';
  const displayHour1 = hour % 12 === 0 ? 12 : hour % 12;
  const displayMin1 = String(min).padStart(2, '0');
  
  let totalMin = hour * 60 + min + (duration || 30);
  let endHour = Math.floor(totalMin / 60) % 24;
  let endMin = totalMin % 60;
  
  const ampm2 = endHour >= 12 ? ' PM' : ' AM';
  const displayHour2 = endHour % 12 === 0 ? 12 : endHour % 12;
  const displayMin2 = String(endMin).padStart(2, '0');
  
  return `${displayHour1}:${displayMin1}${ampm1} – ${displayHour2}:${displayMin2}${ampm2}`;
}

function formatHumanDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return `${weekdays[dateObj.getDay()]}, ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getDate()}`;
}

const GOOGLE_COLORS = [
  { name: 'Peacock (Default)', val: '#0ea5e9' },
  { name: 'Tomato', val: '#f43f5e' },
  { name: 'Tangerine', val: '#f97316' },
  { name: 'Sage', val: '#10b981' },
  { name: 'Basil', val: '#059669' },
  { name: 'Cobalt', val: '#3b82f6' },
  { name: 'Grape', val: '#8b5cf6' },
  { name: 'Flamingo', val: '#ec4899' }
];

export function CalendarView({
  state,
  setState,
  onSelectItem,
  onOpenCreateItemModal,
  pushToast,
  theme = 'dark'
}: CalendarViewProps) {
  const todayString = '2026-06-05';
  const todayDefaultDate = new Date(2026, 5, 5);

  // States
  const [currentDate, setCurrentDate] = useState<Date>(todayDefaultDate);
  const [selectedDay, setSelectedDay] = useState<string>(todayString);
  const [viewMode, setViewMode] = useState<ViewMode>('schedule');
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState<string>('Sync Offline');

  // Creator Modal Sheet
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState(todayString);
  const [newTime, setNewTime] = useState('14:00');
  const [newEndTime, setNewEndTime] = useState('15:00');
  const [newFolderId, setNewFolderId] = useState('');
  const [newEventColor, setNewEventColor] = useState('#0ea5e9');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newMeetLink, setNewMeetLink] = useState('');
  const [pushToGCal, setPushToGCal] = useState(false);

  // Quick Detail Dialog State
  const [viewingMeet, setViewingMeet] = useState<Meeting | null>(null);

  // Sync token loading on init
  useEffect(() => {
    const activeToken = getCachedToken();
    if (activeToken) {
      setGoogleToken(activeToken);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsSyncing(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        setPushToGCal(true);
        pushToast('Google Connected', `Signed in successfully. Sync activated.`, 'success');
        await handlePullGoogleEvents(result.accessToken);
      }
    } catch (e: any) {
      pushToast('Link Failure', 'Could not link with Google Calendar.', 'alert');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setGoogleToken(null);
    setPushToGCal(false);
    pushToast('Google Unlinked', 'Google Calendar integration turned off.', 'info');
  };

  const handlePullGoogleEvents = async (tokenString?: string) => {
    const activeToken = tokenString || googleToken;
    if (!activeToken) {
      pushToast('Sync Blocked', 'Sign in to Google to fetch remote events.', 'warning');
      return;
    }
    setIsSyncing(true);
    try {
      const googleEvents = await fetchGoogleEvents(activeToken);
      setState(prev => {
        const localOnly = prev.meetings.filter(m => !m.googleCalendarEventId);
        const mappedGMeetings: Meeting[] = googleEvents.map((gEvent: any) => {
          let eventDate = todayString;
          let eventTime = '12:00';
          let durationVal = 60;
          if (gEvent.start?.dateTime) {
            const parsedD = new Date(gEvent.start.dateTime);
            const y = parsedD.getFullYear();
            const m = String(parsedD.getMonth() + 1).padStart(2, '0');
            const d = String(parsedD.getDate()).padStart(2, '0');
            eventDate = `${y}-${m}-${d}`;

            const hrs = String(parsedD.getHours()).padStart(2, '0');
            const mins = String(parsedD.getMinutes()).padStart(2, '0');
            eventTime = `${hrs}:${mins}`;

            if (gEvent.end?.dateTime) {
              const diffMs = new Date(gEvent.end.dateTime).getTime() - parsedD.getTime();
              durationVal = Math.round(diffMs / 60000);
            }
          } else if (gEvent.start?.date) {
            eventDate = gEvent.start.date;
          }

          return {
            id: `meeting-${gEvent.id}`,
            type: 'meeting',
            title: gEvent.summary || 'Google Meet Slot',
            description: gEvent.description || 'Imported via Google Calendar Sync.',
            date: eventDate,
            time: eventTime,
            duration: durationVal,
            folderId: prev.folders[0]?.id || 'unassigned',
            labelIds: [],
            linkedIds: [],
            createdAt: todayString,
            completed: false,
            googleCalendarEventId: gEvent.id,
            googleCalendarSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        });
        return {
          ...prev,
          meetings: [...localOnly, ...mappedGMeetings]
        };
      });
      setSyncHistory(`Synced at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      pushToast('Sync Complete', `Pulled ${googleEvents.length} external Google events.`, 'success');
    } catch (e) {
      pushToast('Sync Failure', 'Unable to refresh google feed.', 'alert');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let calDuration = 60;
    try {
      const start = new Date(`${newDate}T${newTime}`);
      const end = new Date(`${newDate}T${newEndTime}`);
      const diff = end.getTime() - start.getTime();
      if (diff > 0) calDuration = Math.round(diff / 60000);
    } catch {}

    let gCalId: string | undefined;
    let gCalSyncedTime: string | undefined;

    if (pushToGCal && googleToken) {
      setIsSyncing(true);
      try {
        const payload = {
          title: newTitle,
          description: newDesc,
          date: newDate,
          time: newTime,
          duration: calDuration,
          hasMeet: !!newMeetLink,
          location: newEventLocation
        };
        const response = await createGoogleEvent(googleToken, payload);
          gCalId = response.id;
          gCalSyncedTime = new Date().toLocaleTimeString();
          pushToast('Sync Handled', 'Event pushed directly to Google Calendar.', 'success');
      } catch (err) {
        pushToast('GCal Fail', 'Could not push to remote calendar. Saved locally.', 'warning');
      } finally {
        setIsSyncing(false);
      }
    }

    const brandNewEvent: Meeting = {
      id: `meeting-${generateId()}`,
      type: 'meeting',
      title: newTitle,
      description: newDesc,
      date: newDate,
      time: newTime,
      duration: calDuration,
      folderId: newFolderId || undefined,
      labelIds: [],
      linkedIds: [],
      createdAt: todayString,
      completed: false,
      color: newEventColor,
      location: newEventLocation || undefined,
      meetingLink: newMeetLink || undefined,
      googleCalendarEventId: gCalId,
      googleCalendarSyncedAt: gCalSyncedTime
    };

    setState(prev => ({
      ...prev,
      meetings: [brandNewEvent, ...prev.meetings]
    }));

    pushToast('Event Saved', `Successfully scheduled "${newTitle}"`, 'success');
    setIsComposerOpen(false);

    // Reset composer
    setNewTitle('');
    setNewDesc('');
    setNewDate(todayString);
    setNewTime('14:00');
    setNewEndTime('15:00');
    setNewFolderId('');
    setNewEventLocation('');
    setNewMeetLink('');
  };

  const handleDeleteMeeting = async (id: string, googleEventId?: string) => {
    if (googleEventId && googleToken) {
      try {
        await deleteGoogleEvent(googleToken, googleEventId);
        pushToast('Google Event Deleted', 'Removed from remote Google Calendar.', 'success');
      } catch {
        pushToast('Remote Sync Blocked', 'Local delete completed; Google sync failed.', 'warning');
      }
    }

    setState(prev => ({
      ...prev,
      meetings: prev.meetings.filter(m => m.id !== id)
    }));

    pushToast('Deleted', 'Meeting discarded from Cogniva workspace.', 'info');
    setViewingMeet(null);
  };

  // Navigational helper: jumps current date
  const adjustDate = (val: number) => {
    const copy = new Date(currentDate);
    if (viewMode === 'day' || viewMode === 'schedule') {
      copy.setDate(copy.getDate() + val);
    } else if (viewMode === 'week') {
      copy.setDate(copy.getDate() + val * 7);
    } else if (viewMode === 'month') {
      copy.setMonth(copy.getMonth() + val);
    }
    setCurrentDate(copy);
  };

  const setDateToToday = () => {
    setCurrentDate(todayDefaultDate);
    setSelectedDay(todayString);
  };

  // Generate lists corresponding to active views
  const currentWeekDaysList = useMemo(() => {
    // Mon to Sun items based around active currentDate
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust Mon start
    startOfWeek.setDate(diff);

    const arr = [];
    for (let i = 0; i < 7; i++) {
      const nextD = new Date(startOfWeek);
      nextD.setDate(startOfWeek.getDate() + i);
      const iso = getLocalISODate(nextD);
      arr.push({
        num: nextD.getDate(),
        name: DAYS_OF_WEEK[i],
        iso,
        dateObj: nextD
      });
    }
    return arr;
  }, [currentDate]);

  // Generate 35 squares for the Month grids
  const currentMonthGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // Sun-Sat (0-6)
    // Adjust so indexing starts at Mon (0) to Sun (6)
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const arr = [];

    // Fill preceding month offsets
    for (let i = offset - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dayNum);
      arr.push({
        num: dayNum,
        iso: getLocalISODate(prevDate),
        currentMonth: false,
        dateObj: prevDate
      });
    }

    // Fill current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      arr.push({
        num: d,
        iso: getLocalISODate(curDate),
        currentMonth: true,
        dateObj: curDate
      });
    }

    // Fill trailing offsets to square up 42 items (6 full weeks grid)
    const remaining = 42 - arr.length;
    for (let x = 1; x <= remaining; x++) {
      const nextDate = new Date(year, month + 1, x);
      arr.push({
        num: x,
        iso: getLocalISODate(nextDate),
        currentMonth: false,
        dateObj: nextDate
      });
    }

    return arr;
  }, [currentDate]);

  // Unified list of workspace items for visual checks
  const meetingsByDayMap = useMemo(() => {
    const map: { [key: string]: Meeting[] } = {};
    state.meetings.forEach(m => {
      if (!map[m.date]) {
        map[m.date] = [];
      }
      map[m.date].push(m);
    });

    // Sort days chronologically
    Object.keys(map).forEach(d => {
      map[d].sort((a, b) => a.time.localeCompare(b.time));
    });
    return map;
  }, [state.meetings]);

  const activeDateEvents = useMemo(() => {
    const formatted = getLocalISODate(currentDate);
    return meetingsByDayMap[formatted] || [];
  }, [currentDate, meetingsByDayMap]);

  return (
    <div id="calendar-view-root" className="flex flex-col h-full bg-[#0a0a0d] text-slate-100 placeholder-slate-400 font-sans relative overflow-hidden select-none">
      
      {/* COGNIVA CALENDAR MAIN HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/5 gap-4">
        
        {/* Banner with Title and Switcher Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 border border-indigo-400/20 text-white shadow-xl shadow-indigo-950/20 shrink-0">
            <CalendarIcon className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex flex-wrap items-center gap-1.5 leading-none">
              <span>Cogniva Calendar</span>
            </h1>
            <p className="text-xs text-slate-400 select-text font-medium mt-1">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </p>
          </div>
        </div>

        {/* View Selection & Action Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          
          {/* Calendar Navigation Buttons */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 p-1 rounded-xl">
            <button 
              type="button"
              onClick={() => adjustDate(-1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer active:scale-95 transition-all"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={setDateToToday}
              className="px-2.5 py-1 text-xs font-extrabold text-slate-200 hover:text-white rounded-lg hover:bg-white/10 active:scale-95 transition-all select-none cursor-pointer"
            >
              Today
            </button>
            <button 
              type="button"
              onClick={() => adjustDate(1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer active:scale-95 transition-all"
              title="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Google Sync Command Ribbons (Kept for integration excellence!) */}
          <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/5 p-1 rounded-xl shrink-0">
            {googleToken ? (
              <div className="flex items-center gap-1.5">
                {/* Visual Direct Link to Google Calendar Webpage */}
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-sky-200 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 rounded-lg cursor-pointer transition-all border border-sky-500/20 shadow-sm"
                  title="Open Google Calendar Web App"
                >
                  <div className="w-3.5 h-3.5 relative flex items-center justify-center shrink-0">
                    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="20" height="20" rx="4" fill="#4285F4" />
                      <path d="M2 6h20v2H2z" fill="#34A853" />
                      <rect x="5" y="10" width="3" height="3" rx="0.5" fill="#FFF" />
                      <rect x="10" y="10" width="3" height="3" rx="0.5" fill="#FFF" />
                      <rect x="15" y="10" width="3" height="3" rx="0.5" fill="#FFF" />
                      <rect x="5" y="15" width="3" height="3" rx="0.5" fill="#FFF" />
                      <rect x="10" y="15" width="3" height="3" rx="0.5" fill="#FFF" />
                      <rect x="15" y="15" width="3" height="3" rx="0.5" fill="#FFF" />
                    </svg>
                  </div>
                  <span>Google Calendar</span>
                </a>

                <button
                  type="button"
                  onClick={() => handlePullGoogleEvents()}
                  disabled={isSyncing}
                  className="p-1.5 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-white/5 cursor-pointer disabled:opacity-40"
                  title="Sync with Google Calendar"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                  title="Unlink Google Sync"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {/* Standard Link Action Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-100 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-lg cursor-pointer transition-all border border-white/5 shadow-sm active:scale-95"
                  title="Authenticate via Google Services"
                >
                  {/* Highly polished Google multi-color logo indicator */}
                  <div className="flex items-center gap-0.5 shrink-0 bg-white/10 p-0.5 rounded mr-0.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-3.3-4.53-6.16-4.53z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <span>Link Google Calendar</span>
                </button>

                {/* Direct Static Link to Google Calendar helper next to Login */}
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-sky-400 rounded-lg hover:bg-white/5 cursor-pointer transition-all"
                  title="Direct Link to Google Calendar Web App"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="20" height="20" rx="4" fill="#4285F4" />
                    <path d="M2 6h20v2H2z" fill="#34A853" />
                    <rect x="5" y="10" width="3" height="3" rx="0.5" fill="#FFF" />
                    <rect x="10" y="10" width="3" height="3" rx="0.5" fill="#FFF" />
                    <rect x="15" y="10" width="3" height="3" rx="0.5" fill="#FFF" />
                    <rect x="5" y="15" width="3" height="3" rx="0.5" fill="#FFF" />
                    <rect x="10" y="15" width="3" height="3" rx="0.5" fill="#FFF" />
                    <rect x="15" y="15" width="3" height="3" rx="0.5" fill="#FFF" />
                  </svg>
                </a>
              </div>
            )}
          </div>

          {/* Quick Add trigger */}
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-700 to-indigo-600 hover:from-indigo-600 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl px-3.5 py-2.5 shadow-md shadow-indigo-950/20 cursor-pointer transition-all min-h-[38px] flex-1 sm:flex-initial justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* COGNIVA VIEW MODE STRIP SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-white/5 gap-2 select-none">
        
        <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-xl w-full sm:w-auto justify-between">
          {(['schedule', 'day', 'week', 'month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg text-xs font-extrabold capitalize cursor-pointer transition-all ${
                viewMode === mode 
                  ? 'bg-slate-800 text-indigo-300 border border-white/5 shadow-inner' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Sync Info line */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none shrink-0 pr-1 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
          <span>{syncHistory}</span>
        </div>
      </div>

      {/* MULTI-VIEW CANVAS (Optimized thoroughly for touch targets & responsive displays) */}
      <div className="flex-1 flex flex-col pt-3 overflow-y-auto scrollbar-none pb-6">
        
        {/* VIEW 1: AGENDA / SCHEDULE TIMELINE (Directly mirrors smart cards in GCal Mobile) */}
        {viewMode === 'schedule' && (
          <div className="space-y-6">
            
            {/* Quick weekly grid selector to prevent clipping and make Sunday 100% visible */}
            <div className="grid grid-cols-7 gap-1 pb-2 select-none w-full">
              {currentWeekDaysList.map(item => {
                const isActive = item.iso === getLocalISODate(currentDate);
                const hasEvents = (meetingsByDayMap[item.iso] || []).length > 0;
                return (
                  <button
                    key={item.iso}
                    onClick={() => {
                      setCurrentDate(item.dateObj);
                      setSelectedDay(item.iso);
                    }}
                    className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-xl border transition-all cursor-pointer select-none text-center ${
                      isActive 
                        ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-400 scale-[1.03]' 
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10 text-slate-400'
                    }`}
                  >
                    <span className="text-[8px] sm:text-[10px] font-extrabold pb-0.5 tracking-wider uppercase opacity-60">
                      {item.name}
                    </span>
                    <span className="text-xs sm:text-sm font-black">
                      {item.num}
                    </span>
                    {hasEvents && (
                      <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-indigo-400/70 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Display Agenda Listing content */}
            <div className="space-y-4 pt-1">
              
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">
                  Agenda Items · {getFormattedDate(getLocalISODate(currentDate))}
                </span>

                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                  {activeDateEvents.length} items
                </span>
              </div>

              {activeDateEvents.length === 0 ? (
                <div className="text-center py-12 px-6 rounded-2xl bg-white/[0.01] border border-dashed border-white/5">
                  <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto text-slate-600 mb-2.5">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-300">No events scheduled</h3>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    Tap the "+ Create Event" button or create items directly via the team panel, or link Google Calendar above to import.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {activeDateEvents.map(meet => {
                    const blockClr = meet.color || '#0ea5e9';
                    return (
                      <div
                        key={meet.id}
                        onClick={() => setViewingMeet(meet)}
                        className="group flex flex-col bg-[#111116] hover:bg-[#14141c] border border-white/5 hover:border-white/10 rounded-2xl p-4 cursor-pointer select-none transition-all duration-200 transform hover:translate-y-[-1px] shadow-lg hover:shadow-xl relative overflow-hidden"
                      >
                        {/* Interactive vertical strip left border */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
                          style={{ backgroundColor: blockClr }}
                        />

                        <div className="pl-2 space-y-3">
                          {/* Header section with full title and duration badge */}
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-black text-white tracking-tight group-hover:text-indigo-300 transition-colors break-words whitespace-normal leading-snug flex-1">
                              {meet.title}
                            </span>
                            
                            <span className="text-[10px] bg-slate-800/80 font-bold text-slate-300 px-2 py-0.5 rounded-md shrink-0 border border-white/5 font-mono">
                              {meet.duration}m
                            </span>
                          </div>

                          {/* Times with details */}
                          <div className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>{getFormattedTimeRange(meet.time, meet.duration)}</span>
                          </div>

                          {/* Location with zero truncation */}
                          {meet.location && (
                            <div className="flex items-start gap-1.5 text-xs text-slate-400 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span className="break-words whitespace-normal text-slate-300 select-text leading-tight">{meet.location}</span>
                            </div>
                          )}

                          {/* Description with zero truncation and nice clean display */}
                          {meet.description && (
                            <p className="text-[11px] text-slate-400 text-left leading-relaxed select-text font-serif italic pt-1.5 border-t border-white/5 break-words whitespace-normal">
                              "{meet.description}"
                            </p>
                          )}

                          {/* Guests/Invitees section if exists */}
                          {meet.guests && meet.guests.length > 0 && (
                            <div className="pt-1.5 border-t border-white/5 space-y-1">
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Invitees</span>
                              <div className="flex flex-wrap gap-1">
                                {meet.guests.slice(0, 4).map((guest, idx) => (
                                  <span key={idx} className="text-[9px] bg-slate-800 text-slate-300 border border-white/5 px-2 py-0.5 rounded-md font-mono" title={guest}>
                                    {guest.includes('@') ? guest.split('@')[0] : guest}
                                  </span>
                                ))}
                                {meet.guests.length > 4 && (
                                  <span className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold">
                                    +{meet.guests.length - 4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Direct Join Action button on GCal links or regular links */}
                          {meet.meetingLink && (
                            <div className="pt-1.5 border-t border-white/5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(meet.meetingLink?.startsWith('http') ? meet.meetingLink : `https://${meet.meetingLink}`, '_blank');
                                }}
                                className="w-full sm:w-auto text-[10px] font-extrabold inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 cursor-pointer transition-all active:scale-95"
                              >
                                <Video className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Join Virtual Meeting</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            </div>
                          )}

                          {/* Footer details row */}
                          <div className="pt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 border-t border-white/[0.03]">
                            <span className="font-mono text-[9px]">WORKSPACE EVENT</span>
                            {meet.googleCalendarEventId && (
                              <span className="text-orange-400 font-extrabold flex items-center gap-1 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded-md text-[9px] tracking-normal">
                                <RefreshCw className="w-2.5 h-2.5 animate-pulse" />
                                <span>GOOGLE CALENDAR</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: HOURLY DAY VIEW GRID */}
        {viewMode === 'day' && (
          <div className="space-y-4">
            
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">
              Timeline · {getFormattedDate(getLocalISODate(currentDate))}
            </span>

            {/* Micro scroller layout matching agenda hours */}
            <div className="border border-white/5 rounded-2xl bg-white/[0.01] divide-y divide-white/5 relative overflow-hidden">
              
              {/* Vertical timeline timeline loops starting 8am */}
              {Array.from({ length: 13 }).map((_, idx) => {
                const hourNum = 8 + idx;
                const displayVal = hourNum > 12 ? `${hourNum - 12} PM` : hourNum === 12 ? '12 PM' : `${hourNum} AM`;
                const isoTimeVal = `${String(hourNum).padStart(2, '0')}:00`;

                // Find events falling inside this hour envelope
                const hourEvents = activeDateEvents.filter(m => {
                  const [mHour] = m.time.split(':').map(Number);
                  return mHour === hourNum;
                });

                return (
                  <div key={hourNum} className="flex min-h-[72px] sm:min-h-[80px] group relative hover:bg-white/[0.005]">
                    {/* Standard hour label sidebar marker */}
                    <div className="w-16 sm:w-20 pr-3 py-3 border-r border-white/5 text-right text-[10px] sm:text-xs font-bold text-slate-500 select-none shrink-0 self-start">
                      {displayVal}
                    </div>

                    {/* Timeline grid content row mapping */}
                    <div className="flex-grow p-1.5 relative flex flex-col gap-1">
                      {hourEvents.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setNewTime(isoTimeVal);
                            const endHIndex = hourNum + 1;
                            setNewEndTime(`${String(endHIndex).padStart(2, '0')}:00`);
                            setIsComposerOpen(true);
                          }}
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-start pl-4 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-opacity cursor-pointer bg-indigo-500/[0.02]"
                        >
                          + Quick Schedule at {displayVal}
                        </button>
                      ) : (
                        hourEvents.map(meet => {
                          const blockClr = meet.color || '#0ea5e9';
                          return (
                            <div
                              key={meet.id}
                              onClick={() => setViewingMeet(meet)}
                              className="text-left rounded-xl p-2.5 border text-xs cursor-pointer select-none transition-all flex items-start gap-2.5 group/card min-h-[44px]"
                              style={{ 
                                backgroundColor: `${blockClr}0f`,
                                borderColor: `${blockClr}25`
                              }}
                            >
                              <div className="w-2 h-2 rounded-full shrink-0 mt-1 shadow-inner" style={{ backgroundColor: blockClr }} />
                              <div className="min-w-0 flex-1">
                                <div className="font-extrabold text-[#f1f5f9] truncate">
                                  {meet.title}
                                </div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                  {getFormattedTime(meet.time)} · {meet.duration}m
                                </div>
                              </div>
                              {meet.meetingLink && (
                                <Video className="w-3.5 h-3.5 text-indigo-400" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: COMPACT responsive WEEK VIEW GRID */}
        {viewMode === 'week' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                Week Overview
              </span>
              <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Weekly Row
              </span>
            </div>

            {/* Sleek weekly column stripe wrapper */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-1.5">
              {currentWeekDaysList.map(item => {
                const dayMeetings = meetingsByDayMap[item.iso] || [];
                const isSelected = item.iso === getLocalISODate(currentDate);
                return (
                  <div 
                    key={item.iso} 
                    className={`flex flex-col rounded-xl overflow-hidden border transition-all bg-white/[0.015] ${
                      isSelected 
                        ? 'border-indigo-600/40 bg-indigo-500/[0.02]/30 shadow-md shadow-indigo-950/20' 
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Custom vertical Week Pillar Header index */}
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentDate(item.dateObj);
                        setSelectedDay(item.iso);
                        setViewMode('day');
                      }}
                      className={`py-2.5 px-3 flex md:flex-col items-center justify-between md:justify-center text-left md:text-center select-none cursor-pointer border-b border-white/5 active:scale-[0.98] ${
                        isSelected ? 'bg-indigo-600/20 text-indigo-300' : 'bg-white/[0.01]'
                      }`}
                    >
                      <div className="flex md:flex-col items-center gap-2 md:gap-0">
                        <div className="text-[10px] md:text-[9px] font-extrabold uppercase text-slate-400 md:text-slate-500">
                          {item.name}
                        </div>
                        <div className="text-sm md:text-xs font-black text-white md:mt-0.5">
                          {item.num}
                        </div>
                      </div>
                      
                      {/* Event count badges for instant check on mobile */}
                      {dayMeetings.length > 0 && (
                        <span className="md:hidden text-[9px] bg-indigo-500/20 text-indigo-300 font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                          {dayMeetings.length} {dayMeetings.length === 1 ? 'event' : 'events'}
                        </span>
                      )}
                    </button>

                    {/* Columns activities block buckets list */}
                    <div className="flex-1 p-2 space-y-1.5 md:overflow-y-auto md:max-h-[160px] scrollbar-none">
                      {dayMeetings.length === 0 ? (
                        <div className="flex md:h-full items-center justify-center opacity-30 py-4 md:py-12">
                          <Circle className="w-3.5 h-3.5 text-slate-600 hidden md:block" />
                          <span className="text-[10px] text-slate-500 md:hidden font-medium">No events scheduled</span>
                        </div>
                      ) : (
                        dayMeetings.map(meet => {
                          const blockClr = meet.color || '#0ea5e9';
                          return (
                            <div
                              key={meet.id}
                              onClick={() => setViewingMeet(meet)}
                              className="p-2 sm:p-2.5 md:p-1.5 rounded-lg text-left cursor-pointer transition-all border block relative overflow-hidden min-h-[44px] md:min-h-[36px]"
                              style={{ 
                                backgroundColor: `${blockClr}12`,
                                borderColor: `${blockClr}25`
                              }}
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1 md:w-0.75" style={{ backgroundColor: blockClr }} />
                              
                              <div className="pl-2 md:pl-1">
                                <div className="text-xs md:text-[10px] font-extrabold text-[#f1f5f9] break-words whitespace-normal leading-tight md:truncate">
                                  {meet.title}
                                </div>
                                <div className="text-[10px] md:text-[8.5px] font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span>{getFormattedTime(meet.time)}</span>
                                  <span className="opacity-40">·</span>
                                  <span className="font-mono text-[9px]">{meet.duration}m</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 4: BEAUTIFUL monthly GRID SQUARES (With elegant today active indicators) */}
        {viewMode === 'month' && (
          <div className="space-y-4">
            
            <div className="grid grid-cols-7 gap-1 pr-1.5">
              {DAYS_OF_WEEK.map(dayName => (
                <div key={dayName} className="text-center text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest select-none pb-2">
                  {dayName}
                </div>
              ))}
            </div>

            {/* Monthly Calendar 42 Blocks Layout Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 border border-white/5 rounded-2xl p-1 bg-white/[0.005]">
              {currentMonthGridDays.map((square, index) => {
                const isSelected = square.iso === getLocalISODate(currentDate);
                const isToday = square.iso === todayString;
                const squareEvents = meetingsByDayMap[square.iso] || [];

                return (
                  <div
                    key={`${square.iso}-${index}`}
                    onClick={() => {
                      setCurrentDate(square.dateObj);
                      setSelectedDay(square.iso);
                      setViewMode('day');
                    }}
                    className={`min-h-[75px] sm:min-h-[92px] rounded-xl flex flex-col p-1.5 transition-all text-left border relative group select-none cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500/50 bg-indigo-500/[0.04] shadow-inner ring-1 ring-indigo-500/10'
                        : square.currentMonth
                          ? 'border-white/5 hover:border-indigo-500/30 bg-white/[0.015] hover:bg-white/[0.035]'
                          : 'border-transparent opacity-25 hover:opacity-40 bg-transparent'
                    }`}
                  >
                    
                    {/* Square interactive header selector row */}
                    <div className="flex items-center justify-between pb-1 select-none">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentDate(square.dateObj);
                          setSelectedDay(square.iso);
                          setViewMode('day');
                        }}
                        className={`w-5.5 h-5.5 text-[11px] font-black rounded-lg flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-all ${
                          isToday
                            ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow shadow-indigo-600/35'
                            : isSelected
                              ? 'text-indigo-400 font-extrabold'
                              : 'text-[#e2e8f0]'
                        }`}
                      >
                        {square.num}
                      </button>

                      {/* Add quick meeting inside selector square button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewDate(square.iso);
                          setIsComposerOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white rounded text-slate-500 cursor-pointer transition-all"
                        title={`Schedule on ${square.iso}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Indicators list block layout inside Month Square box */}
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[48px] sm:max-h-[58px] scrollbar-none pr-0.5">
                      {squareEvents.map(meet => {
                        const blockClr = meet.color || '#0ea5e9';
                        return (
                          <div
                            key={meet.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingMeet(meet);
                            }}
                            className="text-[9px] font-black tracking-tight text-[#f1f5f9] truncate rounded px-1 cursor-pointer transition-all hover:bg-white/10 py-0.5 flex items-center gap-1.5"
                            style={{ 
                              background: `${blockClr}14`,
                              borderLeft: `2.5px solid ${blockClr}`
                            }}
                          >
                            <span className="truncate">{meet.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* COMPONENT POPUP 1: COGNIVA HIGH-FITNESS COMPOSER OVERLAY SLOT */}
      {isComposerOpen && (
        <div id="calendar-gcal-composer-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div 
            className="w-full max-w-xl bg-[#0f0f13] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header row */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5 select-none">
              <div className="flex items-center gap-2">
                <span className="p-1 px-2 text-[9px] uppercase font-bold tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                  Cogniva System
                </span>
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Add Event Dialog
                </span>
              </div>
              <button 
                onClick={() => setIsComposerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer active:scale-90 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Composer submit form details */}
            <form onSubmit={handleCreateEvent} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/40 block select-none">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Weekly Project Review"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#181820] hover:bg-[#1b1b24] focus:bg-[#1d1d28] border border-white/10 hover:border-white/20 focus:border-[#a8c7fa]/30 transition-all rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-bold"
                />
              </div>

              {/* Description block (Replaced formatting helper with simple, pristine clean placeholder notes) */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/40 block select-none">Event details & description</label>
                <textarea
                  placeholder="Insert notes, topics, or agenda points for attendees."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#181820] hover:bg-[#1b1b24] focus:bg-[#1d1d28] border border-white/10 hover:border-white/20 focus:border-[#a8c7fa]/30 transition-all rounded-xl px-4 py-3 text-xs text-slate-300 focus:outline-none"
                />
              </div>

              {/* Parameters input fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pb-1">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/40 block select-none">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#181820] text-xs text-slate-200 border border-white/10 hover:border-white/20 focus:border-[#a8c7fa]/30 transition-all rounded-xl px-3 py-3 select-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/40 block select-none">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-[#181820] text-xs text-slate-200 border border-white/10 hover:border-white/20 focus:border-[#a8c7fa]/30 transition-all rounded-xl px-3 py-3 text-center"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/40 block select-none">End Time</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full bg-[#181820] text-xs text-slate-200 border border-white/10 hover:border-white/20 focus:border-[#a8c7fa]/30 transition-all rounded-xl px-3 py-3 text-center"
                  />
                </div>
              </div>

              {/* Video bridge url and Location detail lines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                <div className="space-y-1 flex flex-col">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/40 block select-none">Add Meeting Link</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. meet.google.com/abc-xyz"
                      value={newMeetLink}
                      onChange={(e) => setNewMeetLink(e.target.value)}
                      className="w-full bg-[#181820] hover:bg-[#1b1b24] text-xs text-[#f8fafc] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 font-semibold placeholder-white/10"
                    />
                    <Video className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/40 block select-none">Add Location Pins</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Headquarters conference room"
                      value={newEventLocation}
                      onChange={(e) => setNewEventLocation(e.target.value)}
                      className="w-full bg-[#181820] hover:bg-[#1b1b24] text-xs text-[#f8fafc] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 font-semibold placeholder-white/10"
                    />
                    <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3.5" />
                  </div>
                </div>
              </div>

              {/* Color selectors and file list alignments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 items-end">
                
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/40 block select-none">Event theme badge color</label>
                  <div className="flex flex-wrap gap-1.5">
                    {GOOGLE_COLORS.map(item => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setNewEventColor(item.val)}
                        title={item.name}
                        className={`w-6 h-6 rounded-full inline-block cursor-pointer transition-all transform hover:scale-110 active:scale-95 ${
                          newEventColor === item.val ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f0f13]' : 'opacity-80'
                        }`}
                        style={{ backgroundColor: item.val }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-extrabold text-white/40 block select-none">Select Folder</label>
                  <select
                    value={newFolderId}
                    onChange={(e) => setNewFolderId(e.target.value)}
                    className="w-full bg-[#181820] hover:bg-[#1b1b24] border border-white/10 text-slate-200 text-xs rounded-xl px-3 py-2.5 cursor-pointer font-bold select-none "
                  >
                    <option value="">None / Unassigned</option>
                    {state.folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Keep GCal Cloud Sync switches if token is alive */}
              {googleToken && (
                <div className="bg-[#e97c11]/10 border border-orange-400/20 rounded-xl p-3 flex items-center justify-between text-xs select-none">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-orange-400 block uppercase tracking-wider text-[9px]">Google Calendar Gateway</span>
                    <span className="text-slate-400 text-[11px]">Syncing ensures event saves inside your Google account.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pushToGCal} 
                      onChange={(e) => setPushToGCal(e.target.checked)} 
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-500" />
                  </label>
                </div>
              )}

              {/* Composer actions */}
              <div className="border-t border-white/5 pt-3.5 flex justify-end gap-2 text-xs font-semibold select-none">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 cursor-pointer text-[11px] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white cursor-pointer transition-colors text-[11px] font-bold"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPONENT POPUP 2: QUICK INDIVIDUAL EVENT PREVIEW DIALOG SHEET */}
      {viewingMeet && (
        <div id="calendar-gcal-details-drawer" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div 
            className="w-full max-w-md bg-[#0f0f13] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col p-5 relative space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main title coloring tag strips */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-2 shrink-0 select-none" 
              style={{ backgroundColor: viewingMeet.color || '#0ea5e9' }}
            />

            <div className="pl-4 space-y-3.5">
              
              <div className="flex items-start justify-between gap-3 select-none">
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                  Event Detail
                </span>
                <button 
                  onClick={() => setViewingMeet(null)}
                  className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Real Summary Information text */}
              <div className="space-y-1 text-left">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug select-text">
                  {viewingMeet.title}
                </h3>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2 select-none">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatHumanDate(viewingMeet.date)}</span>
                </div>
              </div>

              {/* Body particulars panel */}
              <div className="space-y-3 pt-1 border-t border-white/5">
                
                <div className="flex items-start gap-3.5 text-xs text-slate-300">
                  <Clock className="w-4.5 h-4.5 text-slate-500 mt-0.5 shrink-0" />
                  <div className="space-y-0.5 text-left select-text font-medium">
                    <span className="block font-black text-white">{getFormattedTime(viewingMeet.time)}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{viewingMeet.duration} minutes scheduled duration</span>
                  </div>
                </div>

                {viewingMeet.location && (
                  <div className="flex items-start gap-3.5 text-xs text-slate-300">
                    <MapPin className="w-4.5 h-4.5 text-slate-500 mt-0.5 shrink-0" />
                    <div className="space-y-0.5 text-left select-text font-medium">
                      <span className="block font-black text-[#8ab4f8] hover:underline cursor-pointer">{viewingMeet.location}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Event Location</span>
                    </div>
                  </div>
                )}

                {viewingMeet.meetingLink && (
                  <div className="flex items-start gap-3.5 text-xs text-slate-300 select-none">
                    <Video className="w-4.5 h-4.5 text-slate-500 mt-0.5 shrink-0" />
                    <div className="space-y-1 block text-left">
                      <a 
                        href={viewingMeet.meetingLink.startsWith('http') ? viewingMeet.meetingLink : `https://${viewingMeet.meetingLink}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-300 font-extrabold text-[11px] transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Join Meeting Link</span>
                      </a>
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block mt-0.5 pl-1">Virtual Conference pointer</span>
                    </div>
                  </div>
                )}

                {viewingMeet.description && (
                  <div className="flex items-start gap-3.5 text-xs text-slate-300 pt-1.5 border-t border-white/5">
                    <FileText className="w-4.5 h-4.5 text-slate-500 mt-0.5 shrink-0" />
                    <div className="space-y-0.5 text-left block">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Description Notes</span>
                      <p className="text-[11px] text-slate-300 font-serif italic select-text leading-relaxed mt-1 whitespace-pre-wrap">
                        "{viewingMeet.description}"
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive trash and sync properties */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-5 select-none text-xs">
                
                {/* Sync badge info */}
                <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  {viewingMeet.googleCalendarEventId ? (
                    <span className="text-orange-400 font-extrabold flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-pulse" />
                      <span>Google Dual-Synced</span>
                    </span>
                  ) : (
                    <span>Offline Workspace</span>
                  )}
                </div>

                {/* Event deletion trigger */}
                <button
                  type="button"
                  onClick={() => handleDeleteMeeting(viewingMeet.id, viewingMeet.googleCalendarEventId)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 border border-rose-550/25 text-rose-400 font-extrabold text-[10px] transition-colors cursor-pointer active:scale-95 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Event</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
