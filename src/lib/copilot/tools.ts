export const COPILOT_TOOLS = [
  {
    toolSpec: {
      name: "read_file",
      description: "Reads the content of a file in the copilot workspace.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to file (e.g. notes.txt or docs/plan.md)" },
          },
          required: ["path"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "write_file",
      description: "Creates or overwrites a file in the copilot workspace.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to file (e.g. results.json, report.md)" },
            content: { type: "string", description: "The content to write" },
          },
          required: ["path", "content"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "list_files",
      description: "Lists all files present in the copilot workspace.",
      inputSchema: {
        json: {
          type: "object",
          properties: {},
        },
      },
    },
  },
  {
    toolSpec: {
      name: "fetch_web",
      description: "Fetches public web content or API data via HTTP GET.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            url: { type: "string", description: "Target URL to fetch (HTTP or HTTPS)" },
          },
          required: ["url"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "remember",
      description: "Saves a durable memory, fact, or preference about the user or tasks to long-term memory.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            fact: { type: "string", description: "Fact or preference to remember permanently" },
          },
          required: ["fact"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "send_email",
      description: "Sends an email directly via the user's connected Gmail account. Use when the user asks to email someone, deliver updates, or send communications.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient email address (e.g. client@example.com)" },
            subject: { type: "string", description: "Subject line of the email" },
            body: { type: "string", description: "Body of the email (plain text or formatted HTML)" },
            cc: { type: "string", description: "Optional CC email addresses separated by commas" },
            bcc: { type: "string", description: "Optional BCC email addresses separated by commas" },
          },
          required: ["to", "subject", "body"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "gmail_create_draft",
      description: "Creates an email draft in the user's Gmail inbox for their review before sending. Use when asked to prepare or draft an email.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            to: { type: "string", description: "Recipient email address" },
            subject: { type: "string", description: "Subject line of the draft" },
            body: { type: "string", description: "Body of the draft" },
          },
          required: ["to", "subject", "body"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "gmail_search_emails",
      description: "Searches the user's Gmail inbox using queries (e.g. 'is:unread', 'from:person@example.com', 'subject:proposal', 'newer_than:7d'). Returns list of matching emails with sender, date, subject, snippet, and message IDs.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            query: { type: "string", description: "Gmail search query (e.g. 'is:unread', 'from:team', 'invoice')" },
            max_results: { type: "number", description: "Maximum number of emails to retrieve (default 5, max 15)" },
          },
          required: ["query"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "gmail_read_email",
      description: "Reads the full content and details of a specific email message by its message_id.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            message_id: { type: "string", description: "The message ID of the email to read (from gmail_search_emails)" },
          },
          required: ["message_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "gmail_reply_thread",
      description: "Sends a direct reply to an existing email message/thread, keeping it in the same conversation thread in Gmail.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            message_id: { type: "string", description: "The message ID of the email being replied to" },
            body: { type: "string", description: "The reply message body" },
          },
          required: ["message_id", "body"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "gmail_manage_email",
      description: "Manages or triages a single email: mark as read/unread, star/unstar, or archive.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            message_id: { type: "string", description: "The message ID of the email" },
            action: {
              type: "string",
              enum: ["mark_read", "mark_unread", "star", "unstar", "archive"],
              description: "Action to take on the email",
            },
          },
          required: ["message_id", "action"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "gmail_bulk_mark_as_read",
      description: "Marks hundreds or thousands of unread emails in the user's Gmail inbox as read at once using automated background pagination and batch API calls. Always use this whenever the user asks to mark all unread emails as read, clean unread messages, or read 4k+ emails.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Optional Gmail search query filter (defaults to 'is:unread', e.g. 'is:unread category:promotions', 'is:unread from:newsletter')",
            },
            max_emails: {
              type: "number",
              description: "Maximum number of emails to mark as read in this run (defaults to 5000, can be up to 10000)",
            },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "drive_search_files",
      description: "Searches the user's Google Drive for files, documents, sheets, or folders by name or query.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query or file name keyword (e.g. 'budget', 'roadmap', 'invoice')" },
            max_results: { type: "number", description: "Maximum number of results to return (default 10)" },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "drive_read_file",
      description: "Reads the content of a file in Google Drive. For Google Docs and Sheets, automatically exports to clean plain text/markdown.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            file_id: { type: "string", description: "Google Drive file ID" },
          },
          required: ["file_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "drive_create_file",
      description: "Creates or uploads a new file (e.g. markdown, notes, report) directly in Google Drive.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            name: { type: "string", description: "File name with extension (e.g. 'Q4_Plan.md')" },
            content: { type: "string", description: "Text or markdown content of the file" },
            folder_id: { type: "string", description: "Optional Google Drive folder ID to place the file in" },
          },
          required: ["name", "content"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "drive_sync_workspace_file",
      description: "Exports and synchronizes a single Copilot workspace file (e.g. 'business_canvas_template.md', 'README.md', 'tasks.md') into Google Drive.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            workspace_path: { type: "string", description: "The workspace file path to export (e.g. 'business_canvas_template.md', 'README.md', 'tasks.md')" },
            folder_name_or_id: { type: "string", description: "Optional target Drive folder name or folder ID (defaults to 'noBrain')" },
          },
          required: ["workspace_path"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "drive_sync_all_workspace_files",
      description: "Uploads and synchronizes ALL files present in the current copilot workspace (including all planning docs like business_canvas_template.md, README.md, tasks.md) into a Google Drive folder at once. Automatically sets sharing permissions so anyone with the link can view, and returns the direct clickable webViewLinks for the folder and all files.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            folder_name_or_id: {
              type: "string",
              description: "Target Google Drive folder name or folder ID (e.g. 'noBrain', 'Sprint 1 Specs', or folder ID). Defaults to 'noBrain'.",
            },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "drive_create_folder",
      description: "Creates a new folder in Google Drive to organize sprint docs, project deliverables, or assets.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            name: { type: "string", description: "Name of the new folder (e.g. 'Sprint 1 Specs')" },
            parent_folder_id: { type: "string", description: "Optional parent folder ID" },
          },
          required: ["name"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "drive_share_file",
      description: "Sets sharing permissions for a file/folder in Google Drive (e.g. anyone with link can view) and returns the public web link.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            file_id: { type: "string", description: "The Google Drive file or folder ID" },
            role: {
              type: "string",
              enum: ["reader", "commenter", "writer"],
              description: "Permission level (default: 'reader')",
            },
            type: {
              type: "string",
              enum: ["anyone", "user"],
              description: "Share type: 'anyone' (with link) or 'user' (specific email)",
            },
            email: { type: "string", description: "Recipient email if sharing with a specific user" },
          },
          required: ["file_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "drive_trash_file",
      description: "Moves a file or folder in Google Drive to the trash.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            file_id: { type: "string", description: "The Google Drive file or folder ID to trash" },
          },
          required: ["file_id"],
        },
      },
    },
  },
  // ==========================================
  // GOOGLE CALENDAR TOOLS
  // ==========================================
  {
    toolSpec: {
      name: "calendar_list_events",
      description: "Lists upcoming events and meetings from the user's Google Calendar. Supports filtering by query keywords, time ranges, and limits.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            query: { type: "string", description: "Optional search query filter for event titles or descriptions" },
            time_min: { type: "string", description: "Optional start time in ISO format (defaults to now)" },
            time_max: { type: "string", description: "Optional end time in ISO format" },
            max_results: { type: "number", description: "Maximum number of events to return (default 10)" },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "calendar_create_event",
      description: "Creates a new event or scheduled meeting in the user's Google Calendar. Automatically generates an active Google Meet video conferencing link by default.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            summary: { type: "string", description: "Title or subject of the event/meeting" },
            description: { type: "string", description: "Detailed description, agenda, or notes for attendees" },
            start_time: { type: "string", description: "Start time in user local ISO format with +06:00 offset (e.g. '2026-11-13T13:00:00+06:00' for 1:00 PM local time). Do not pass UTC Z times." },
            end_time: { type: "string", description: "End time in user local ISO format with +06:00 offset (e.g. '2026-11-13T14:00:00+06:00' for 2:00 PM local time). Do not pass UTC Z times." },
            location: { type: "string", description: "Optional meeting location" },
            attendees: {
              type: "array",
              items: { type: "string" },
              description: "Optional list of attendee email addresses to invite",
            },
            create_meet_link: {
              type: "boolean",
              description: "Whether to generate an active Google Meet video link (defaults to true)",
            },
          },
          required: ["summary", "start_time", "end_time"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "calendar_delete_event",
      description: "Deletes a scheduled event or meeting from the user's Google Calendar by its event ID.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            event_id: { type: "string", description: "The Google Calendar event ID to delete" },
          },
          required: ["event_id"],
        },
      },
    },
  },
  // ==========================================
  // GOOGLE MEET REST API TOOLS
  // ==========================================
  {
    toolSpec: {
      name: "meet_create_instant_meeting",
      description: "Generates an instant, ready-to-join Google Meet video conferencing space and returns the active https://meet.google.com/xxx-yyyy-zzz link immediately. Perfect when the user asks for a quick meeting link right now.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Optional topic or title for the instant meeting" },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "meet_schedule_meeting",
      description: "End-to-end scheduled meeting: Creates a Google Meet video space, adds it to Google Calendar, and optionally dispatches formatted invitation emails to attendees via Gmail.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Meeting title or topic" },
            description: { type: "string", description: "Meeting description or agenda" },
            start_time: { type: "string", description: "Start time in user local ISO format with +06:00 offset (e.g. '2026-11-13T13:00:00+06:00' for 1:00 PM local time). Do not pass UTC Z times." },
            end_time: { type: "string", description: "End time in user local ISO format with +06:00 offset (e.g. '2026-11-13T14:00:00+06:00' for 2:00 PM local time). Do not pass UTC Z times." },
            attendees: {
              type: "array",
              items: { type: "string" },
              description: "List of attendee email addresses",
            },
            send_email_invites: {
              type: "boolean",
              description: "Whether to automatically send formatted invitation emails via Gmail (default true)",
            },
          },
          required: ["topic", "start_time", "end_time"],
        },
      },
    },
  },
  // ==========================================
  // GOOGLE CLASSROOM TOOLS
  // ==========================================
  {
    toolSpec: {
      name: "classroom_list_courses",
      description: "Lists all active Google Classroom courses the user is enrolled in or teaching (returns course ID, name, section, enrollment code, link).",
      inputSchema: {
        json: {
          type: "object",
          properties: {},
        },
      },
    },
  },
  {
    toolSpec: {
      name: "classroom_list_coursework",
      description: "Lists assignments, homework, quizzes, and coursework items for a specific Google Classroom course.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            course_id: { type: "string", description: "Google Classroom course ID" },
          },
          required: ["course_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "classroom_create_coursework",
      description: "Creates and publishes a new assignment, project, or coursework item in a Google Classroom course.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            course_id: { type: "string", description: "Google Classroom course ID" },
            title: { type: "string", description: "Assignment title" },
            description: { type: "string", description: "Assignment instructions and requirements" },
            max_points: { type: "number", description: "Maximum grade points (e.g. 100)" },
            due_year: { type: "number", description: "Due date year (e.g. 2026)" },
            due_month: { type: "number", description: "Due date month (1-12)" },
            due_day: { type: "number", description: "Due date day (1-31)" },
            due_hour: { type: "number", description: "Due time hour (0-23, default 23)" },
            due_minute: { type: "number", description: "Due time minute (0-59, default 59)" },
          },
          required: ["course_id", "title"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "classroom_list_announcements",
      description: "Lists announcements posted in a Google Classroom course.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            course_id: { type: "string", description: "Google Classroom course ID" },
          },
          required: ["course_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "classroom_create_announcement",
      description: "Posts a new announcement to students in a Google Classroom course (e.g. class notices, meeting links, schedule changes).",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            course_id: { type: "string", description: "Google Classroom course ID" },
            text: { type: "string", description: "Announcement message text" },
          },
          required: ["course_id", "text"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "classroom_list_students",
      description: "Lists all students enrolled in a Google Classroom course with their names and email addresses.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            course_id: { type: "string", description: "Google Classroom course ID" },
          },
          required: ["course_id"],
        },
      },
    },
  },
  // ==========================================
  // YOUTUBE DATA API V3 TOOLS
  // ==========================================
  {
    toolSpec: {
      name: "youtube_search_videos",
      description: "Searches YouTube for videos by keywords or topics. Returns video titles, channel names, publication dates, and clickable https://www.youtube.com/watch?v=... links. Ideal for market research, tutorials, and competitive analysis.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search keyword or topic (e.g. 'AI Agent framework', 'SaaS marketing strategy')" },
            max_results: { type: "number", description: "Number of videos to return (default 5, max 25)" },
            order: {
              type: "string",
              enum: ["relevance", "date", "viewCount", "rating"],
              description: "Sorting order (default: 'relevance')",
            },
          },
          required: ["query"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "youtube_get_video_details",
      description: "Retrieves deep statistics and metadata for one or more YouTube videos: view count, like count, comment count, video tags, duration, and full description. Supports video IDs or full YouTube URLs.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            video_ids: {
              type: "array",
              items: { type: "string" },
              description: "List of YouTube video IDs or full URLs to analyze",
            },
          },
          required: ["video_ids"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "youtube_get_channel_details",
      description: "Fetches channel analytics (subscriber count, total view count, video count, custom URL, and description) for the user's channel or any specified channel ID/handle (e.g. '@mkbhd').",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            channel_id_or_handle: {
              type: "string",
              description: "Optional channel ID or @handle. If omitted, inspects the authenticated user's YouTube channel.",
            },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "youtube_list_comments",
      description: "Fetches audience comments and discussions from a YouTube video. Extremely powerful for sentiment analysis, customer pain points, and discovering frequently asked questions.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            video_id: { type: "string", description: "YouTube video ID or URL" },
            max_results: { type: "number", description: "Number of comments to fetch (default 20, max 100)" },
          },
          required: ["video_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "youtube_manage_playlist",
      description: "Manages YouTube playlists: 'list' (view all playlists), 'create' (create a new curated research/learning playlist), or 'add_video' (add a video to a playlist).",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["list", "create", "add_video"],
              description: "Action to perform on playlists",
            },
            title: { type: "string", description: "Title for creating a new playlist" },
            description: { type: "string", description: "Optional description for the playlist" },
            privacy_status: {
              type: "string",
              enum: ["public", "private", "unlisted"],
              description: "Privacy setting (default: 'unlisted')",
            },
            playlist_id: { type: "string", description: "Target playlist ID (required for add_video)" },
            video_id: { type: "string", description: "Video ID or URL to add to playlist" },
          },
          required: ["action"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "youtube_player_control",
      description: "Directly controls the user's right-hand YouTube Player & Research Studio in the workspace: 'play' (plays a video immediately or by query), 'stop' (stops playback and returns to discovery hub), 'shortlist' / 'queue' (adds video to a specific research shortlist folder), 'create_folder' (creates a new research collection folder), 'add_note' (attaches timestamped AI research notes to the video timeline), 'get_state' (checks currently playing video), or 'clear_queue'.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["play", "stop", "shortlist", "queue", "create_folder", "add_note", "get_state", "clear_queue"],
              description: "Player action to execute",
            },
            video_id: { type: "string", description: "YouTube video ID or full URL" },
            query: { type: "string", description: "Search query to automatically find and play or shortlist the best video" },
            title: { type: "string", description: "Optional title of the video" },
            folder_name: { type: "string", description: "Name of the shortlist folder/collection to add videos into or create" },
            folder_id: { type: "string", description: "Target folder ID (e.g. 'default', 'ai_frameworks')" },
            note_text: { type: "string", description: "Research takeaway or insight to attach to the video timestamp" },
            timestamp_seconds: { type: "number", description: "Video timestamp in seconds for the note (e.g. 124 for 02:04)" },
          },
          required: ["action"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "youtube_post_comment",
      description: "Posts a comment to a YouTube video on behalf of the user's connected YouTube channel.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            video_id: { type: "string", description: "Target YouTube video ID or URL" },
            text: { type: "string", description: "Comment text to publish on YouTube" },
          },
          required: ["video_id", "text"],
        },
      },
    },
  },
  // ==========================================
  // TELEGRAM COPILOT BRIDGE TOOLS
  // ==========================================
  {
    toolSpec: {
      name: "telegram_send_message",
      description: "Sends a direct text message, notification, or update to the user's connected Telegram chat or room bridge.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            message: { type: "string", description: "Text message to send to Telegram (Markdown formatting supported)" },
            chat_id: { type: "string", description: "Optional target Telegram chat ID (defaults to active user's connected chat)" },
          },
          required: ["message"],
        },
      },
    },
  },
]

export function getOpenAIToolsSchema() {
  return COPILOT_TOOLS.map((t) => ({
    type: "function",
    function: {
      name: t.toolSpec.name,
      description: t.toolSpec.description,
      parameters: t.toolSpec.inputSchema.json,
    },
  }))
}


