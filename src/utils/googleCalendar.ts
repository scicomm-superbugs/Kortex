/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, 
  onAuthStateChanged, User, signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initial provider setup with Calendar permissions
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

// In-memory cache for Google OAuth token (do not leak in storage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuthListener = (
  onSuccess: (user: User, token: string) => void,
  onFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user && cachedAccessToken) {
      onSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      onFailure();
    }
  });
};

export const googleSignIn = async () => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Access token not found in Google OAuth result.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getCachedToken = () => cachedAccessToken;

/* =========================================
   GOOGLE CALENDAR REST API ENDPOINTS CONTROLLER
   ========================================= */

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

// Fetch events list
export const fetchGoogleEvents = async (
  token: string, 
  timeMin = '2026-05-01T00:00:00Z', 
  timeMax = '2026-07-31T23:59:59Z'
): Promise<GoogleCalendarEvent[]> => {
  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Google Calendar Fetch error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (e) {
    console.error('Failed to fetch events from Google calendar:', e);
    throw e;
  }
};

// Create a single calendar event
export const createGoogleEvent = async (
  token: string,
  event: { title: string; description: string; date: string; time: string; duration: number; hasMeet?: boolean; location?: string; }
): Promise<any> => {
  try {
    const startTimeStr = `${event.date}T${event.time}:00`;
    const startDate = new Date(startTimeStr);
    const endDate = new Date(startDate.getTime() + event.duration * 60 * 1000);
    
    // Format helper to YYYY-MM-DDTHH:MM:SS
    const formatIsoNoZ = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    // Get client timezone offset
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const body: any = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: `${formatIsoNoZ(startDate)}`,
        timeZone: timezone
      },
      end: {
        dateTime: `${formatIsoNoZ(endDate)}`,
        timeZone: timezone
      }
    };

    if (event.hasMeet) {
      body.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      };
    }

    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events' + (event.hasMeet ? '?conferenceDataVersion=1' : '');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Google Calendar creation failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (e) {
    console.error('Failed to create item in Google Calendar:', e);
    throw e;
  }
};

// Delete single calendar event
export const deleteGoogleEvent = async (token: string, eventId: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 204 || response.ok) {
      return true;
    }
    throw new Error(`Google Calendar Event deletion failed: ${response.statusText}`);
  } catch (e) {
    console.error('Failed deleting event from Google Calendar API:', e);
    throw e;
  }
};
