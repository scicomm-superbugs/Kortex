/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // API endpoint to generate a highly personalized welcome briefing message via Gemini
  app.post('/api/ai/welcome', async (req, res) => {
    try {
      const { currentStateSummary } = req.body;
      const client = getGeminiClient();

      const todayStr = '2026-06-05'; // Updated to Friday, June 5, 2026

      const systemInstruction = `You are "Idrak AI", the highly advanced AI intelligence assistant for the Kortex Workspace.
      Today is strictly Friday, ${todayStr}.
      You are drafting a warm, elegant, highly personalized, and direct welcoming greeting for the user (whose email is abdullah.amr.makky@gmail.com) on entry.
      - Greet the user warmly and express excitement about working together today.
      - Keep it EXTREMELY short: exactly 2 or 3 sentences total.
      - Do NOT provide any lists, work loads, task details, metrics, folder counts, or workspace summaries.
      - Keep it conversational, premium, and friendly.`;

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Generate a personalized warm welcome of exactly 2 or 3 sentences. Do not summarize or list anything. Today is Friday, ${todayStr}. User email: ${req.body.userEmail || 'abdullah.amr.makky@gmail.com'}.`,
        config: {
          systemInstruction,
          temperature: 0.8,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from model.');
      }

      res.json({ message: responseText.trim() });
    } catch (error: any) {
      console.error('Error generating personalized welcome:', error);
      res.status(500).json({ error: error?.message || 'Error generating welcome message' });
    }
  });

  // API endpoint to process natural language requests and generate workspace items
  app.post('/api/ai/generate', async (req, res) => {
    try {
      const { prompt, messages, currentStateSummary } = req.body;
      if (!prompt && (!messages || !Array.isArray(messages))) {
        return res.status(400).json({ error: 'A valid text prompt or messages history is required.' });
      }

      const client = getGeminiClient();

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          tasks: {
            type: Type.ARRAY,
            description: "A list of new tasks to be created in response to the user's prompt, if any.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                priority: { type: Type.STRING, description: "Must be 'low', 'medium', or 'high'." },
                dueDate: { type: Type.STRING, description: "Due date in YYYY-MM-DD format. Calculate relative to today." },
                subtasks: {
                  type: Type.ARRAY,
                  description: "A list of subtasks or checklist steps belonging to this task.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: "The subtask title." },
                      completed: { type: Type.BOOLEAN, description: "Whether completed. Defaults to false." }
                    },
                    required: ["title"]
                  }
                },
                attachments: {
                  type: Type.ARRAY,
                  description: "Fictional attached assets like PDFs, specifications or documentations.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: "E.g. 'ProjectBriefing_V2.pdf'." },
                      size: { type: Type.STRING, description: "E.g. '1.5 MB' or '340 KB'." },
                      type: { type: Type.STRING, description: "E.g. 'application/pdf' or 'image/png'." },
                      url: { type: Type.STRING }
                    },
                    required: ["name", "size", "type"]
                  }
                }
              },
              required: ["title", "description", "priority"]
            }
          },
          meetings: {
            type: Type.ARRAY,
            description: "A list of new calendar events (meetings) to be scheduled, if any.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                date: { type: Type.STRING, description: "Date in YYYY-MM-DD format. Calculate relative to today." },
                time: { type: Type.STRING, description: "Time in HH:MM format (24-hour style)." },
                duration: { type: Type.INTEGER, description: "Estimated duration in minutes (e.g. 30, 45, 60)." },
                meetingLink: { type: Type.STRING, description: "A Google Meet, Zoom, or video conference URL, e.g. 'https://meet.google.com/abc-def-ghi'. Include if virtual call/sync is requested." },
                attachments: {
                  type: Type.ARRAY,
                  description: "Agendas or briefing notes attached.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      size: { type: Type.STRING },
                      type: { type: Type.STRING },
                      url: { type: Type.STRING }
                    },
                    required: ["name", "size", "type"]
                  }
                }
              },
              required: ["title", "description", "date", "time", "duration"]
            }
          },
          notes: {
            type: Type.ARRAY,
            description: "A list of new markdown notes or document outlines to create, if any.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING, description: "The content of the note. Must be written in elegant Markdown formatting. Fully flesh out the contents. For interactive checklists/checkboxes, start lines simply with '- ' (e.g., '- Item title') instead of using brackets '- [ ]'." },
                attachments: {
                  type: Type.ARRAY,
                  description: "Simulated briefing attachments.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      size: { type: Type.STRING },
                      type: { type: Type.STRING },
                      url: { type: Type.STRING }
                    },
                    required: ["name", "size", "type"]
                  }
                }
              },
              required: ["title", "content"]
            }
          },
          updatedTasks: {
            type: Type.ARRAY,
            description: "A list of updates to make to existing tasks if requested (matching their ID).",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "The exact ID of the existing task to update." },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                priority: { type: Type.STRING },
                dueDate: { type: Type.STRING },
                completed: { type: Type.BOOLEAN, description: "Flip to true if marked completed, or false otherwise." },
                subtasks: {
                  type: Type.ARRAY,
                  description: "Full new list of subtasks for this task if you want to replace or add them.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      completed: { type: Type.BOOLEAN }
                    },
                    required: ["title"]
                  }
                },
                attachments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      size: { type: Type.STRING },
                      type: { type: Type.STRING },
                      url: { type: Type.STRING }
                    },
                    required: ["name", "size", "type"]
                  }
                }
              },
              required: ["id"]
            }
          },
          deletedTaskIds: {
            type: Type.ARRAY,
            description: "IDs of tasks to delete permanently.",
            items: { type: Type.STRING }
          },
          updatedMeetings: {
            type: Type.ARRAY,
            description: "A list of updates to make to existing meetings (matching their ID).",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "The exact ID of the existing meeting to update." },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                date: { type: Type.STRING },
                time: { type: Type.STRING },
                duration: { type: Type.INTEGER },
                meetingLink: { type: Type.STRING },
                attachments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      size: { type: Type.STRING },
                      type: { type: Type.STRING },
                      url: { type: Type.STRING }
                    },
                    required: ["name", "size", "type"]
                  }
                }
              },
              required: ["id"]
            }
          },
          deletedMeetingIds: {
            type: Type.ARRAY,
            description: "IDs of meetings/events to delete permanently.",
            items: { type: Type.STRING }
          },
          updatedNotes: {
            type: Type.ARRAY,
            description: "A list of updates to make to existing notes (matching their ID).",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "The exact ID of the existing note to update." },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                attachments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      size: { type: Type.STRING },
                      type: { type: Type.STRING },
                      url: { type: Type.STRING }
                    },
                    required: ["name", "size", "type"]
                  }
                }
              },
              required: ["id"]
            }
          },
          deletedNoteIds: {
            type: Type.ARRAY,
            description: "IDs of notes/docs to delete permanently.",
            items: { type: Type.STRING }
          },
          message: {
            type: Type.STRING,
            description: "A friendly, conversational explanation summarizing what you planned/generated, or answering any questions. Keep it objective, professional, and clear."
          }
        },
        required: ["message"]
      };

      const todayStr = '2026-06-05'; // Corrected to Friday, June 5, 2026

      const systemInstruction = `You are "Idrak AI", the highly advanced AI intelligence assistant for the Kortex Workspace (equipped with extensive folder context-awareness, comprehensive cross-linking, and multi-step logical reasoning capabilities).
      Today's local date is strictly ${todayStr} (Friday). Always use this exact coordinate to calculate complex relative calendar date offsets (e.g., "next Friday" is 2026-06-12, "tomorrow" is 2026-06-06, "this weekend" represents Saturday/Sunday 2026-06-06 and 2026-06-07).

      === LARGE CONTEXT INTELLIGENCE & ORGANIZED CAPABILITIES ===
      You operate with a comprehensive global view of Kortex Workspace (Folders, Tasks, Calendar Events, Notes). Tags or Labels are permanently disabled and removed from the system. You manage and group items exclusively within folders.
      Your key performance directive is: ALWAYS BE MULTI-DIMENSIONAL, LOGIC-DRIVEN, AND EFFECTIVE.
- Do not just create a simple item if a request implies a fuller workflow or project. For example, if a user requests "Plan a project sync", deep-think the requirements:
  1. Schedule the Calendar Event (under "meetings").
  2. Create a corresponding high-priority Task to prep (under "tasks").
  3. Create an structured Note with a clean, fully fleshed-out agenda checklist (under "notes").
  Then return the items so they can be integrated immediately.
- To maintain optimal clutter-free state organization: if items are duplicate, deprecated, or superseded by a new plan, proactively populate "deletedTaskIds", "deletedMeetingIds", or "deletedNoteIds" arrays to purge old entries!
- Maintain cross-relationships: state any links clearly in your explanation to ensure user visibility.

=== DEEP THINKING & REASONING PROTOCOL ===
In your return block, you MUST begin your value in the "message" field with a highly detailed, organized, and explicit reasoning narrative.
Specifically, start the "message" with a clean Markdown block:
# 🧠 DEEP REASONING STEP-BY-STEP REVIEW
Provide:
- **Core Intent & Objective**: Summarize what the user aims to accomplish.
- **Context Synthesis**: Outline current assets in the workspace, date metrics, and link relations.
- **Execution Blueprint**: Explain why you chose to create, update, or prune specific tasks/events/notes.
- **Interactive Checklists**: Specify how checklists are mapped (e.g., why you chose plain bullet checks instead of bracket blocks).

=== INTERACTIVE CHECKLISTS METRICS ===
For any checklist items inside notes or checklists inside notes:
- Always use a plain dash followed by a space "- Your item text" for interactive checkbox items. Do NOT use bracket checkboxes like "- [ ] Your item text" because the workspace UI parses plain "- " bullets natively into dynamic checkbox components.

=== RETURN FORMAT ===
You have full read/write/edit/delete capabilities. Respond in the JSON schema format. Return the entire plan in the structured arrays:
- "tasks": list of new Tasks (with optional subtasks block structure).
- "meetings": list of new Meetings.
- "notes": list of new Notes (with gorgeous, fully fleshed-out Markdown contents using elegant headers, bold emphasis, and "- " checklists).
- "updatedTasks" / "updatedMeetings" / "updatedNotes": list of updates including existing IDs.
- "deletedTaskIds" / "deletedMeetingIds" / "deletedNoteIds": list of string IDs to clear.

Keep your layout polished, professional, authoritative, and incredibly valuable. Ensure your messages display premium intelligence.
${currentStateSummary ? `Here is the current user's workspace context and items: ${currentStateSummary}` : ''}`;

      // Build contents array for multi-turn conversational support
      let contentsInput: any = prompt;
      if (Array.isArray(messages) && messages.length > 0) {
        contentsInput = messages.map((m: any) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));
      }

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contentsInput,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.2,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Received empty response from Gemini model.');
      }

      const generatedData = JSON.parse(responseText.trim());
      res.json(generatedData);
    } catch (error: any) {
      console.error('Error generating workspace content:', error);
      res.status(500).json({ error: error?.message || 'Internal AI Server Error' });
    }
  });

  // Vite middleware in development; Static folder mapping in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
