/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
export const INITIAL_TEAM_USERS: TeamUser[] = [
  { id: 'user-admin', name: 'Admin (You)', email: 'admin@workspace.com', role: 'admin', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80', color: '#8b5cf6', completedTasks: 1, totalTasks: 2, activeStatus: 'online' },
  { id: 'user-sarah', name: 'Sarah Connor', email: 'sarah@workspace.com', role: 'member', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80', color: '#10b981', completedTasks: 2, totalTasks: 3, activeStatus: 'online' },
  { id: 'user-marcus', name: 'Marcus Wright', email: 'marcus@workspace.com', role: 'member', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80', color: '#f59e0b', completedTasks: 0, totalTasks: 1, activeStatus: 'busy' },
  { id: 'user-kyle', name: 'Kyle Reese', email: 'kyle@workspace.com', role: 'member', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80', color: '#ec4899', completedTasks: 4, totalTasks: 4, activeStatus: 'offline' }
];

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  enableSharingOverrides: true,
  restrictTeamEditing: false,
  allowCalendarSync: true,
  requireSignOff: false
};

import { WorkspaceState, Task, Meeting, Note, WorkspaceItem, TeamUser, AdminSettings } from './types';

// Helper to get formatted dates relative to June 5 (the current local time - Friday)
const TODAY = '2026-06-05';
const TOMORROW = '2026-06-06';
const IN_THREE_DAYS = '2026-06-08';
const YESTERDAY = '2026-06-04';

export const INITIAL_STATE: WorkspaceState = {
  currentUserRoleId: 'user-admin',
  adminSettings: DEFAULT_ADMIN_SETTINGS,
  teamUsers: INITIAL_TEAM_USERS,
  folders: [
    {
      id: 'folder-1',
      name: 'Work',
      color: '#3b82f6', // Bright Blue
      description: 'Daily assignments, job tasks, and client notes.',
      createdAt: TODAY,
    },
    {
      id: 'folder-2',
      name: 'Personal',
      color: '#10b981', // Emerald Green
      description: 'Fitness goals, daily habits, and travel ideas.',
      createdAt: TODAY,
    },
    {
      id: 'folder-3',
      name: 'Projects',
      color: '#f59e0b', // Amber/Orange
      description: 'Social media planning, side projects, and references.',
      createdAt: TODAY,
    },
  ],
  labels: [
    { id: 'label-1', name: 'Urgent', color: '#ef4444', textColor: '#ffffff' },
    { id: 'label-2', name: 'Draft', color: '#8b5cf6', textColor: '#ffffff' },
    { id: 'label-3', name: 'Meeting', color: '#3b82f6', textColor: '#ffffff' },
    { id: 'label-4', name: 'Research', color: '#06b6d4', textColor: '#ffffff' },
    { id: 'label-5', name: 'Call', color: '#ec4899', textColor: '#ffffff' },
    { id: 'label-6', name: 'Code', color: '#10b981', textColor: '#ffffff' },
  ],
  tasks: [
    {
      id: 'task-1',
      type: 'task',
      title: 'Finalize Product Pitch Slides',
      description: 'Check the feedback from partners and align visual assets. Format slide text size for high resolution monitors.',
      status: 'in_progress',
      priority: 'high',
      dueDate: TOMORROW,
      folderId: 'folder-1',
      labelIds: ['label-1', 'label-2'],
      linkedIds: ['note-1', 'meeting-1'],
      createdAt: TODAY,
    },
    {
      id: 'task-2',
      type: 'task',
      title: 'Deconstruct competitors landing strategy',
      description: 'Research core value propositions, color styles, and feature pricing tiers.',
      status: 'todo',
      priority: 'medium',
      dueDate: IN_THREE_DAYS,
      folderId: 'folder-3',
      labelIds: ['label-4'],
      linkedIds: ['note-2'],
      createdAt: TODAY,
    },
    {
      id: 'task-3',
      type: 'task',
      title: 'Plan weekend mountains excursion',
      description: 'Gather route maps, weather indicators, check with companions, and prepare trail accessories.',
      status: 'done',
      priority: 'low',
      dueDate: YESTERDAY,
      folderId: 'folder-2',
      labelIds: [],
      linkedIds: [],
      createdAt: TODAY,
    },
  ],
  meetings: [
    {
      id: 'meeting-1',
      type: 'meeting',
      title: 'Pitch Alignment Review',
      description: 'Gather to walk-through layout changes and presentation notes with keysholders.',
      date: TOMORROW,
      time: '14:30',
      duration: 45,
      folderId: 'folder-1',
      labelIds: ['label-3'],
      linkedIds: ['task-1', 'note-1'],
      createdAt: TODAY,
    },
    {
      id: 'meeting-2',
      type: 'meeting',
      title: 'Weekly Landing Page Retrospective',
      description: 'Sync with digital creators design group on branding experiments and marketing copy.',
      date: TODAY,
      time: '11:00',
      duration: 60,
      folderId: 'folder-3',
      labelIds: ['label-3', 'label-4'],
      linkedIds: ['task-2'],
      createdAt: TODAY,
    },
  ],
  notes: [
    {
      id: 'note-1',
      type: 'note',
      title: 'Slide-By-Slide Presentation Outline',
      content: `# Pitch Presentation Pitch Outline\n\n### Slide 1: Problem Space\nIdentify major ecosystem fragmentation issues. How tasks, events, and calendar exist separately and lack interconnected references.\n\n### Slide 2: The Omni Workspace Solution\n- Unified workspace linking tasks directly to notes and specific dates.\n- Smooth overlaying context panel when checking connected systems.\n\n### Slide 3: Growth Roadmap\nQuarter-over-Quarter targets for adoption and scalability.`,
      folderId: 'folder-1',
      labelIds: ['label-2'],
      linkedIds: ['task-1', 'meeting-1'],
      createdAt: TODAY,
      updatedAt: TODAY,
    },
    {
      id: 'note-2',
      type: 'note',
      title: 'Visual Hierarchy & Graph Insights',
      content: `# Landing Page Competitors Review\n\n### Key Competitor Notes\n- Often show separate dashboards requiring multiple window transitions.\n- Static calendars with no link hooks.\n\n### Our Strategic Edge\n- Beautiful deep pitch dark-theme interface with zero-gravity overlay previews.\n- Graph connectivity that keeps meeting transcripts adjacent to the actual calendar task list!`,
      folderId: 'folder-3',
      labelIds: ['label-4'],
      linkedIds: ['task-2'],
      createdAt: TODAY,
      updatedAt: TODAY,
    },
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'Urgent task due tomorrow',
      message: 'Your high-priority task "Finalize Product Pitch Slides" is due tomorrow. Ensure partner feedback is aligned.',
      type: 'alert',
      read: false,
      timestamp: '09:30',
      actionItemId: 'task-1'
    },
    {
      id: 'notif-2',
      title: 'Upcoming meeting',
      message: 'Weekly Landing Page Retrospective is today at 11:00. Design and marketing groups are attending.',
      type: 'info',
      read: false,
      timestamp: '10:45',
      actionItemId: 'meeting-2'
    },
    {
      id: 'notif-3',
      title: 'Graph Connected',
      message: 'Workspace Sync: Bi-directional link established successfully between "Deconstruct competitors landing strategy" and competitors research outline.',
      type: 'success',
      read: true,
      timestamp: '08:15',
      actionItemId: 'task-2'
    }
  ]
};

// Generates a random standard ID
export function generateId(): string {
  return `${Math.random().toString(36).substr(2, 9)}-${Date.now().toString(36)}`;
}

// Find item by ID in the state
export function findItemById(id: string, state: WorkspaceState): WorkspaceItem | null {
  const task = state.tasks.find((t) => t.id === id);
  if (task) return task;
  const meeting = state.meetings.find((m) => m.id === id);
  if (meeting) return meeting;
  const note = state.notes.find((n) => n.id === id);
  if (note) return note;
  return null;
}

// Bi-directionally link items together
export function linkTwoItems(id1: string, id2: string, state: WorkspaceState): WorkspaceState {
  if (id1 === id2) return state;

  const updateLinks = <T extends { id: string; linkedIds: string[] }>(items: T[]): T[] => {
    return items.map((item) => {
      if (item.id === id1) {
        if (!item.linkedIds.includes(id2)) {
          return { ...item, linkedIds: [...item.linkedIds, id2] };
        }
      } else if (item.id === id2) {
        if (!item.linkedIds.includes(id1)) {
          return { ...item, linkedIds: [...item.linkedIds, id1] };
        }
      }
      return item;
    });
  };

  return {
    ...state,
    tasks: updateLinks(state.tasks),
    meetings: updateLinks(state.meetings),
    notes: updateLinks(state.notes),
  };
}

// Bi-directionally unlink items from each other
export function unlinkTwoItems(id1: string, id2: string, state: WorkspaceState): WorkspaceState {
  const removeLinks = <T extends { id: string; linkedIds: string[] }>(items: T[]): T[] => {
    return items.map((item) => {
      if (item.id === id1) {
        return { ...item, linkedIds: item.linkedIds.filter((id) => id !== id2) };
      } else if (item.id === id2) {
        return { ...item, linkedIds: item.linkedIds.filter((id) => id !== id1) };
      }
      return item;
    });
  };

  return {
    ...state,
    tasks: removeLinks(state.tasks),
    meetings: removeLinks(state.meetings),
    notes: removeLinks(state.notes),
  };
}

// Unlink a single item from everything else in the database
export function unlinkItemFromAll(targetId: string, state: WorkspaceState): WorkspaceState {
  const clearLinks = <T extends { id: string; linkedIds: string[] }>(items: T[]): T[] => {
    return items.map((item) => {
      if (item.id === targetId) {
        return { ...item, linkedIds: [] };
      } else {
        return { ...item, linkedIds: item.linkedIds.filter((id) => id !== targetId) };
      }
    });
  };

  return {
    ...state,
    tasks: clearLinks(state.tasks),
    meetings: clearLinks(state.meetings),
    notes: clearLinks(state.notes),
  };
}

export function renderFormattedText(text: string): React.ReactNode {
  if (!text) return '';

  // Standardize common HTML tags on input to plain markdown representation:
  const processed = text
    .replace(/<\/?(strong|b)>/gi, '**')
    .replace(/<\/?(em|i)>/gi, '*')
    .replace(/<\/?u>/gi, '_')
    .replace(/<\/?(del|s)>/gi, '~~');

  return parseStyles(processed);
}

function parseStyles(text: string): React.ReactNode[] {
  // 1. Split by Bold (**)
  const boldParts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return boldParts.map((bPart, idx) => {
    const isBold = idx % 2 === 1;
    
    // 2. Split by Underline (_)
    const uParts = bPart.split(/_([\s\S]*?)_/g);
    return uParts.map((uPart, uIdx) => {
      const isUnderline = uIdx % 2 === 1;
      
      // 3. Split by Strikethrough (~~)
      const sParts = uPart.split(/~~([\s\S]*?)~~/g);
      return sParts.map((sPart, sIdx) => {
        const isStrike = sIdx % 2 === 1;
        
        // 4. Split by Italic (*)
        const iParts = sPart.split(/\*([\s\S]*?)\*/g);
        return iParts.map((iPart, iIdx) => {
          const isItalic = iIdx % 2 === 1;
          
          if (!iPart) return null;
          
          let className = "";
          if (isBold) {
            className += " font-extrabold text-white";
          }
          if (isItalic) {
            className += " italic";
          }
          if (isUnderline) {
            className += " underline underline-offset-2 decoration-indigo-400";
          }
          if (isStrike) {
            className += " line-through opacity-70";
          }
          
          if (className) {
            return React.createElement(
              'span',
              {
                key: `${idx}-${uIdx}-${sIdx}-${iIdx}`,
                className: className.trim()
              },
              iPart
            );
          }
          return iPart;
        });
      });
    });
  }).flat(Infinity).filter(Boolean) as React.ReactNode[];
}

