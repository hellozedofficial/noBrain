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
]

