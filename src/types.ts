/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Folder {
  id: string;
  name: string;
  color: string; // Hex color code
  description?: string;
  createdAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string; // Background Hex color
  textColor: string; // Text Hex color
}

export type PriorityType = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Attachment {
  id: string;
  name: string;
  size: string; // Size description like '1.2 MB'
  type: string; // e.g. 'image/png' or 'application/pdf'
  url?: string; // base64 string or resource URI for local clients
  createdAt: string;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  type: 'task';
  title: string;
  description: string;
  status: TaskStatus;
  priority: PriorityType;
  dueDate?: string; // YYYY-MM-DD
  folderId?: string;
  labelIds: string[];
  linkedIds: string[]; // IDs of tasks, meetings, or notes
  subtasks?: SubTask[];
  attachments?: Attachment[];
  createdAt: string;
  // Collaboration attributes
  assignedTo?: string; // Teammate User ID or 'unassigned'
  sharedWith?: string[]; // Array of Teammate User IDs
  isSharedWithTeam?: boolean;
}

export interface Meeting {
  id: string;
  type: 'meeting';
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // in minutes
  meetingLink?: string; // virtual call pointer URL
  folderId?: string;
  labelIds: string[];
  linkedIds: string[]; // IDs of tasks, meetings, or notes
  attachments?: Attachment[];
  createdAt: string;
  completed?: boolean;
  // Collaboration & GCal attributes
  assignedTo?: string; // Teammate User ID or 'unassigned'
  sharedWith?: string[]; // Array of Teammate User IDs
  isSharedWithTeam?: boolean;
  googleCalendarEventId?: string;
  googleCalendarSyncedAt?: string;
  // Custom Google Calendar themed attributes
  location?: string;
  guests?: string[];
  color?: string;
  visibility?: string;
  allDay?: boolean;
}

export interface Note {
  id: string;
  type: 'note';
  title: string;
  content: string; // text or markdown
  folderId?: string;
  labelIds: string[];
  linkedIds: string[]; // IDs of tasks, meetings, or notes
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
  completed?: boolean;
  // Collaboration attributes
  assignedTo?: string; // Creator/owner identifier
  sharedWith?: string[]; // Array of Teammate User IDs
  isSharedWithTeam?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  timestamp: string; // HH:MM or date
  actionItemId?: string; // Tapping will open this item
}

export type WorkspaceItem = Task | Meeting | Note;

export type ViewType = 'dashboard' | 'tasks' | 'notes' | 'calendar' | 'folders';

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  avatar: string;
  color: string;
  completedTasks: number;
  totalTasks: number;
  activeStatus: 'online' | 'offline' | 'busy';
}

export interface AdminSettings {
  enableSharingOverrides: boolean;
  restrictTeamEditing: boolean;
  allowCalendarSync: boolean;
  requireSignOff: boolean;
}

export interface WorkspaceState {
  folders: Folder[];
  labels: Label[];
  tasks: Task[];
  meetings: Meeting[];
  notes: Note[];
  notifications?: AppNotification[];
  teamUsers?: TeamUser[];
  currentUserRoleId?: string; // active simulated user id
  adminSettings?: AdminSettings;
}
