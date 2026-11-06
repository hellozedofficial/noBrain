import { BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime"
import { walletService } from "@/lib/wallet"
import {
  CopilotBot,
  CopilotRoom,
  CopilotMessage,
  getBotById,
  updateBot,
  getRoomById,
  updateRoom,
  addMessage,
  getDirectBotMessages,
  getRoomMessages,
  getBotFiles,
  saveBotFile,
  getRoomFiles,
  saveRoomFile,
} from "./store"
import { getIntegration } from "./integrations"
import { getMailTransporter } from "@/lib/mail"
import {
  sendGmail,
  createGmailDraft,
  searchGmail,
  readGmail,
  replyToGmailThread,
  manageGmailMessage,
  bulkMarkGmailAsRead,
} from "./gmail"
import {
  searchDriveFiles,
  readDriveFile,
  createDriveFile,
  createDriveFolder,
  syncWorkspaceFileToDrive,
  syncAllWorkspaceFilesToDrive,
  shareDriveFile,
  trashDriveFile,
} from "./drive"
import {
  listCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
} from "./calendar"
import {
  createInstantMeetSpace,
  scheduleMeetingWithCalendar,
} from "./meet"
import {
  listClassroomCourses,
  listCourseWork,
  createCourseWork,
  listClassAnnouncements,
  createClassAnnouncement,
  listCourseStudents,
} from "./classroom"
import {
  searchYouTubeVideos,
  getVideoDetails,
  getChannelDetails,
  getVideoComments,
  manageYouTubePlaylist,
} from "./youtube"
import { agentControlYouTubePlayer } from "./youtubePlayer"
import { googleApiFetch } from "./googleAuth"
import { sendTelegramMessage } from "./telegram"
import { COPILOT_TOOLS } from "./tools"

const INTERNAL_BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || "openai.gpt-oss-120b-1:0"
const VISION_BEDROCK_MODEL_ID = "amazon.nova-pro-v1:0"

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

/**
 * Step 1: Deep visual inspection using Amazon Nova Pro.
 * Extracts shapes, colors, symbols, layout, OCR, and visual semantics.
 */
async function analyzeImageWithNova(imageUrl: string, userPrompt: string): Promise<string> {
  try {
    const res = await fetch(imageUrl)
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = res.headers.get("content-type") || "image/jpeg"
    const format = contentType.includes("png")
      ? "png"
      : contentType.includes("gif")
      ? "gif"
      : contentType.includes("webp")
      ? "webp"
      : "jpeg"

    const visionPrompt = `Perform a comprehensive, detailed visual analysis of this attached image to enable an AI teammate to answer the user inquiry: "${userPrompt}".
Please report:
1. Exact visual subject matter, composition, and layout.
2. Colors (predominant shades, accents, background), lines, and art/graphic style.
3. Any logos, letters, words, symbols, or icons visible.
4. The likely interpretation, meaning, brand identity, or context of what is shown.`

    const cmd = new ConverseCommand({
      modelId: VISION_BEDROCK_MODEL_ID,
      messages: [
        {
          role: "user",
          content: [
            {
              image: {
                format,
                source: { bytes: buffer },
              },
            },
            { text: visionPrompt },
          ],
        },
      ],
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 0.2,
      },
    })

    const out = await bedrockClient.send(cmd)
    const analysisText = out.output?.message?.content?.[0]?.text || ""
    return analysisText.trim()
  } catch (err) {
    console.warn("Failed to analyze image with Nova Pro, falling back to text reference:", err)
    return ""
  }
}

export type CopilotStreamEvent = {
  type: "status" | "reasoning" | "token" | "tool" | "done" | "error"
  text?: string
  statusText?: string
  data?: any
}

/**
 * Rolling Context Memory Compactor
 * Summarizes conversation points into 3-6 concise bullet points (under 150 words).
 */
export async function compactConversationMemory(params: {
  existingMemory?: string | null
  messagesToSummarize: CopilotMessage[]
}): Promise<string> {
  const { existingMemory = "", messagesToSummarize } = params
  if (!messagesToSummarize.length) return existingMemory || ""

  const formattedConversation = messagesToSummarize
    .slice(-30)
    .map((m) => `[${m.sender_name || m.role}]: ${m.content.slice(0, 300)}`)
    .join("\n")

  const prompt = `You are an expert conversation memory synthesizer for an AI agent workspace.
Update the persistent context memory based on the conversation history below.

RULES:
1. Output ONLY 3 to 6 concise bullet points in clean text (or Bengali if the conversation is in Bengali).
2. Focus strictly on:
   - User's core requirements, goals, preferences, or tasks.
   - Key architectural/business decisions made by the team.
   - What has been accomplished or generated so far.
   - Pending next steps or open action items.
3. Maximum 150 words total.
4. Do NOT include greetings, conversational filler, or timestamps.
5. Merge previous memory points with new developments cleanly.

[Previous Memory]:
${existingMemory || "(None)"}

[New Conversation Messages to Incorporate]:
${formattedConversation}

Updated Memory (Bullet Points Only):`

  try {
    const cmd = new ConverseCommand({
      modelId: INTERNAL_BEDROCK_MODEL_ID,
      messages: [
        {
          role: "user",
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: 250,
        temperature: 0.2,
      },
    })
    const out = await bedrockClient.send(cmd)
    const summary = out.output?.message?.content?.[0]?.text?.trim()
    return summary || existingMemory || ""
  } catch (err) {
    console.warn("[compactConversationMemory] Failed to summarize memory:", err)
    return existingMemory || ""
  }
}

export async function executeBotTurnStream(
  params: {
    bot: CopilotBot
    userId: string
    userName: string
    prompt: string
    imageUrl?: string | null
    roomId?: string | null
    otherBots?: CopilotBot[]
    channel?: "web" | "telegram"
  },
  onEvent: (event: CopilotStreamEvent) => void
): Promise<{
  reply: string
  reasoning?: string
  toolCalls?: any[]
  durationSeconds: number
  messageId?: string
}> {
  const { bot, userId, userName, prompt, imageUrl, roomId, otherBots = [], channel = "web" } = params
  const startTime = Date.now()

  await updateBot(bot.id, userId, { status: "thinking" })
  onEvent({ type: "status", statusText: "Thinking..." })

  try {
    const room = roomId ? await getRoomById(roomId, userId) : null
    const allMessages = roomId
      ? await getRoomMessages(roomId, userId, 60)
      : await getDirectBotMessages(bot.id, userId, 60)

    // Slice off trailing message if it was already inserted by the route handler
    let fullHistory = allMessages
    if (
      fullHistory.length > 0 &&
      fullHistory[fullHistory.length - 1].role === "user" &&
      fullHistory[fullHistory.length - 1].content === prompt
    ) {
      fullHistory = fullHistory.slice(0, -1)
    }

    // ROLLING 4-MESSAGE CONTEXT & LONG-TERM MEMORY ENGINE
    // If conversation exceeds 4 messages:
    // 1. Keep strictly the immediate last 4 messages as active history.
    // 2. Automatically summarize older messages into persistent long-term memory.
    let history: CopilotMessage[] = fullHistory
    let contextMemory = roomId ? room?.memory || "" : bot.memory || ""

    if (fullHistory.length > 4) {
      const olderMessages = fullHistory.slice(0, -4)
      const activeRecentMessages = fullHistory.slice(-4)
      history = activeRecentMessages

      try {
        const updatedMemory = await compactConversationMemory({
          existingMemory: contextMemory,
          messagesToSummarize: olderMessages,
        })
        if (updatedMemory && updatedMemory !== contextMemory) {
          contextMemory = updatedMemory
          if (roomId) {
            await updateRoom(roomId, userId, { memory: updatedMemory })
          } else {
            await updateBot(bot.id, userId, { memory: updatedMemory })
          }
        }
      } catch (err) {
        console.warn("[Rolling Memory Engine] Summarization error:", err)
      }
    }

    const myHandle = bot.username || bot.name.toLowerCase().replace(/[^a-z0-9_]/g, "")
    const otherBotsContext = otherBots.length
      ? `Other teammates present in this room: ${otherBots.map((b) => `@${b.username || b.name.toLowerCase()} (${b.name}, ${b.role})`).join(", ")}.`
      : ""

    const gmailIntegration = await getIntegration(userId, "gmail")
    const isGmailConnected = gmailIntegration?.status === "connected"
    let driveIntegration = await getIntegration(userId, "drive")
    if (!driveIntegration && isGmailConnected) {
      driveIntegration = gmailIntegration
    }
    const isDriveConnected = driveIntegration?.status === "connected"

    const gmailContext = isGmailConnected
      ? `\n- Gmail: ACTIVE & CONNECTED via Google OAuth (Connected Account: ${gmailIntegration.account_email || "User Account"}).
  You have FULL AUTONOMOUS ACCESS to the user's Gmail using the following tools:
  * \`gmail_bulk_mark_as_read\`: Marks hundreds or thousands of unread emails as read at once using automated background pagination and batch API calls! (Always use this when user asks to mark all unread emails as read or clean unread inbox).
  * \`send_email\`: Directly sends emails with formatting, to, cc, bcc, subject.
  * \`gmail_create_draft\`: Prepares an email draft in the user's Gmail inbox for their review.
  * \`gmail_search_emails\`: Searches the user's inbox with query filters (e.g. 'is:unread', 'from:...', 'subject:...', 'newer_than:7d').
  * \`gmail_read_email\`: Reads the full content of an email by message_id.
  * \`gmail_reply_thread\`: Replies directly to an email while keeping the conversation in the same thread.
  * \`gmail_manage_email\`: Manages single email (mark_read, mark_unread, star, unstar, archive).
  When the user asks you to check their inbox, summarize unread emails, write or reply to emails, draft letters, or send updates, PROACTIVELY use these tools to fulfill their request and report back clearly!`
      : `\n- Gmail: NOT CONNECTED. If the user asks you to send or check emails, politely explain that they can connect their Gmail account in 1 click by clicking the "Integrations" button at the bottom of the workspace sidebar.`

    const driveContext = isDriveConnected
      ? `\n- Google Drive: ACTIVE & CONNECTED (Connected Account: ${driveIntegration?.account_email || "User Account"}).
  You have FULL AUTONOMOUS ACCESS to the user's Google Drive using the following tools:
  * \`drive_sync_all_workspace_files\`: Uploads and synchronizes ALL workspace files (including planning documents like business_canvas_template.md, README.md, tasks.md) into a Google Drive folder ('noBrain' or specified folder). Returns each file's shareable link.
  * \`drive_sync_workspace_file\`: Automatically export/sync a single workspace markdown file into a Google Drive folder.
  * \`drive_search_files\`: Search Drive for files, docs, sheets, slides, or folders by name/query.
  * \`drive_read_file\`: Reads file content in Google Drive (Google Docs auto-exported to clean text/markdown).
  * \`drive_create_file\`: Create or upload new files in Google Drive.
  * \`drive_create_folder\`: Create new directory folders in Drive.
  * \`drive_share_file\`: Set sharing permissions and get public/shared web links (webViewLink).
  * \`drive_trash_file\`: Move a file to Google Drive trash.
  When the user asks you to upload plans to Google Drive, search their Drive, read cloud documents, or share files, PROACTIVELY call these tools!`
      : `\n- Google Drive: NOT CONNECTED. If the user asks to save to or read from Google Drive, guide them to click "Integrations" in the sidebar to connect Google Drive.`

    const telegramIntegration = await getIntegration(userId, "telegram")
    const isTelegramConnected = telegramIntegration?.status === "connected"
    const telegramContext = isTelegramConnected
      ? `\n- Telegram: ACTIVE & CONNECTED (Bot: @${telegramIntegration?.metadata?.bot_username || "Bot"}).
  You can send notifications and messages to the user's connected Telegram chat using the \`telegram_send_message\` tool.`
      : `\n- Telegram: NOT CONNECTED.`

    const integrationsContext = `\nCONNECTED WORKSPACE INTEGRATIONS:${gmailContext}${driveContext}${telegramContext}`

    const userTz = process.env.APP_TIMEZONE || "Asia/Dhaka"
    const now = new Date()
    const localDateFormatted = new Intl.DateTimeFormat("en-US", {
      timeZone: userTz,
      dateStyle: "full",
      timeStyle: "medium",
    }).format(now)

    const systemPrompt = `You are ${bot.name} (@${myHandle}), an expert AI Copilot with role "${bot.role}".
You work in noBrain 1.5 with your own dedicated workspace, tools, and long-term memory.
${otherBotsContext}
${integrationsContext}

USER LOCAL ENVIRONMENT & TIMEZONE:
- User Timezone: ${userTz} (UTC+6)
- Current User Local Date & Time: ${localDateFormatted}
- All meeting, event, and calendar schedule requests (e.g. "dupur 1 tay", "shokal 10 tay", "tomorrow 3pm", "nov 13 at 1pm") MUST be scheduled in the user's local timezone (${userTz}, UTC+6).
- 1:00 PM ("dupur 1 tay") is 13:00 local time.
- When calling \`calendar_create_event\` or \`meet_schedule_meeting\`, YOU MUST ALWAYS format \`start_time\` and \`end_time\` with the local timezone offset: e.g. "2026-11-13T13:00:00+06:00" and "2026-11-13T14:00:00+06:00".
- NEVER pass UTC "Z" format (like "2026-11-13T13:00:00Z") for local times, because 13:00 UTC shifts to 7:00 PM local time!

IMPORTANT RULES FOR COLLABORATION & MULTIMODAL SYNTHESIS:
1. You are strictly ${bot.name} (@${myHandle}). Speak in first person ("I") directly to the user or room colleagues.
2. In collaborative multi-bot rooms, work together like a real human team in a group chat (e.g. Slack/Discord):
   - Speak ONLY for yourself in your own voice and role. NEVER script or simulate what other bots say.
   - Look closely at what your teammates said just prior in the conversation history. Build on their ideas, agree or disagree respectfully, add your unique role expertise, or greet them back when prompted.
   - When referencing or addressing teammates, tag their handle like @${otherBots[0]?.username || "all"}.
3. If the user attaches an image, you are provided with an accurate visual breakdown from the vision perception engine. Synthesize this visual analysis into a natural, insightful, beautifully explained answer directly addressing the user's inquiry in the language they asked (e.g. Bengali or English).
4. NEVER output raw internal thought scripts or simulated dialogue for other bots (DO NOT write scripts like "**BotA:** ... \\n **BotB:** ..."). Every bot speaks for itself in its own turn.
5. If the user greets the group ("greet each other", "say hi everyone", "@all"), respond with your own genuine, warm greeting to the user and your colleagues!
6. CRITICAL WORKSPACE & MARKDOWN FILE DELEGATION RULE (VERY IMPORTANT):
   - DO NOT dump giant multi-page plans, detailed startup blueprints, comprehensive project architectures, extensive checklists, or full code files directly into the chat message bubble! Doing so floods the chat and makes it unreadable.
   - ALWAYS use the \`write_file\` tool to save detailed startup ideas, business plans, task lists, roadmap specs, or technical architectures into workspace markdown files (e.g. \`startup-idea.md\`, \`tasks.md\`, \`tech-architecture.md\`, \`business-plan.md\`, \`sprint-roadmap.md\`).
   - If another bot has already created a workspace file (e.g., \`startup-idea.md\` or \`tasks.md\`), inspect it with \`read_file\`, update or append to it with \`write_file\`, or create your own complementary spec (e.g. \`tech-stack.md\` or \`marketing-plan.md\`).
   - In the chat bubble, provide ONLY a concise, crisp summary (1 to 2 short conversational paragraphs):
     * State what you decided or analyzed.
     * Explicitly tell the user and teammates which markdown file you generated or updated so they can view and edit it in the right panel.
     * Hand off the next step to a teammate with their @mention.
7. Use tools like write_file to save workspace files, read_file/list_files to inspect them, remember to store persistent user facts, send_email to email, and drive_* tools to manage Google Drive.
8. CRITICAL RULE FOR GOOGLE DRIVE ACTIONS, UPLOADS & SHARING:
   - When the user asks to upload planning files, all files, or docs to Google Drive (e.g. "planning er shob files oi folder e upload kore de", "ekhn porjonto joto planning hoise shob google drive e upload kore sharebale link de", "upload files to drive"):
     * IMMEDIATELY call \`drive_sync_all_workspace_files\` with the target folder (e.g. folder_name_or_id: "noBrain" or the folder name requested by user).
     * Upload whatever workspace files exist (including \`business_canvas_template.md\`, \`README.md\`, \`tasks.md\`). DO NOT call \`list_files\` repeatedly in an endless loop!
     * In your final chat message to the user, YOU MUST ALWAYS provide the exact clickable links:
       - The Google Drive folder link
       - Every uploaded file link with its name!
       Example in Bengali:
       "আমি আপনার ওয়ার্কস্পেসের প্ল্যানিং ফাইলগুলো Google Drive-এর 'noBrain' ফোল্ডারে সফলভাবে আপলোড করেছি:
       📁 **ফোল্ডার লিংক:** [noBrain](https://drive.google.com/drive/folders/1G38R1NTwFfy0LM_JKIL2qpIQh3AgJRNB)
       📄 **ফাইল লিংকসমূহ:**
       - [business_canvas_template.md](https://drive.google.com/file/d/.../view)
       - [README.md](https://drive.google.com/file/d/.../view)"
   - After executing \`drive_create_folder\`, \`drive_create_file\`, \`drive_sync_workspace_file\`, or \`drive_share_file\`, ALWAYS output a clear message containing the exact file or folder name and the Google Drive URL (\`webViewLink\`).
   - If the user asks for a sharable link ("sharable link de" or "link"), call \`drive_share_file\` or provide the existing \`webViewLink\` directly in your response!
   - NEVER conclude a turn saying you performed tasks without giving the user the exact links and details!
9. CRITICAL RULE FOR GMAIL BULK ACTIONS (MARK ALL AS READ):
   - When the user asks to mark all unread emails as read (e.g. "amar gmail e joto unread mails ache shob mark as read kore den", "clean unread emails", "mark all emails read", "4k+ emails read kore fel"):
     * IMMEDIATELY call the \`gmail_bulk_mark_as_read\` tool!
     * NEVER call \`gmail_search_emails\` and \`gmail_manage_email\` one-by-one in a slow loop.
     * Once \`gmail_bulk_mark_as_read\` returns, inform the user clearly in friendly conversational Bengali/English how many unread emails were marked as read (e.g. "আমি আপনার ইনবক্সের ৩,৫০০টি আনরিড ইমেইল সফলভাবে Mark as Read করে দিয়েছি।").
10. Never reveal backend infrastructure, AWS Bedrock, or internal model IDs. You are powered by noBrain 1.5.
11. CRITICAL RULES FOR GOOGLE WORKSPACE & YOUTUBE AGENTIC SUITE (CALENDAR, MEET, CLASSROOM, GMAIL, DRIVE, YOUTUBE):
   - You have full, interconnected agentic control over the user's Google Workspace & YouTube tools:
     * Google Calendar: \`calendar_list_events\`, \`calendar_create_event\` (automatically adds Google Meet link), \`calendar_delete_event\`.
     * Google Meet: \`meet_create_instant_meeting\` (instant \`https://meet.google.com/xxx-yyyy-zzz\` video link), \`meet_schedule_meeting\` (Meet + Calendar + email invites).
     * Google Classroom: \`classroom_list_courses\`, \`classroom_list_coursework\`, \`classroom_create_coursework\`, \`classroom_list_announcements\`, \`classroom_create_announcement\`, \`classroom_list_students\`.
     * Gmail: \`send_email\`, \`gmail_create_draft\`, \`gmail_search_emails\`, \`gmail_read_email\`, \`gmail_reply_thread\`, \`gmail_bulk_mark_as_read\`.
     * Google Drive: \`drive_search_files\`, \`drive_read_file\`, \`drive_create_file\`, \`drive_create_folder\`, \`drive_sync_workspace_file\`, \`drive_share_file\`.
     * YouTube Data API v3 & Workspace Player: \`youtube_search_videos\`, \`youtube_get_video_details\`, \`youtube_get_channel_details\`, \`youtube_list_comments\`, \`youtube_manage_playlist\`, \`youtube_player_control\`, \`youtube_post_comment\`.
       -> When user asks to play a video in the workspace ("player e chalao", "ei video ta play kor", "youtube e search kore play koro"): call \`youtube_player_control\` with action: "play".
       -> When user asks to shortlist or queue videos ("shortlist e rakh", "queue te add kor"): call \`youtube_player_control\` with action: "shortlist" or "queue".
       -> When user asks to take a note on a video: call \`youtube_player_control\` with action: "add_note" and include timestamp_seconds.
       -> When user asks to post a comment on a YouTube video: call \`youtube_post_comment\`.
   - INTERCONNECTED WORKFLOW POWER:
     * When asked to coordinate tasks across services, chain the tools intelligently!
       Example 1: "Schedule an exam review class tomorrow at 10 AM, generate a Google Meet link, add it to Calendar, post the announcement in Classroom, and email all students with the agenda!"
       -> Step 1: Call \`meet_schedule_meeting\` or \`calendar_create_event\` to get the event and Meet link.
       -> Step 2: Call \`classroom_list_courses\` to identify the course.
       -> Step 3: Call \`classroom_create_announcement\` with the meeting topic, date, and Meet link.
       -> Step 4: Call \`classroom_list_students\` to retrieve the student email roster.
       -> Step 5: Call \`send_email\` to notify the students.
     * Example 2 (YouTube Research & Team Intelligence Workflow):
       -> When user asks to research videos, tutorials, or market trends on YouTube (e.g. "search AI agent videos on YouTube, analyze comments, save report to Drive and email team"):
       -> Step 1: Call \`youtube_search_videos\` and \`youtube_get_video_details\` to fetch top videos, views, and tags.
       -> Step 2: Call \`youtube_list_comments\` to mine audience questions and comments.
       -> Step 3: Use \`write_file\` to save the markdown report (e.g. \`youtube_market_research.md\`).
       -> Step 4: Call \`drive_sync_workspace_file\` to upload it to Google Drive.
       -> Step 5: (Optional) Call \`send_email\` or post educational videos to Classroom as needed!
     * When asked for an instant meeting ("ekta meet link de", "google meet link banao"):
       -> Immediately call \`meet_create_instant_meeting\` and reply with the clickable \`https://meet.google.com/...\` link and meeting code!
     * When asked to check schedule/events ("ajke ki ki meeting ache", "calendar check kor"):
       -> Call \`calendar_list_events\` and summarize upcoming items cleanly.

12. CRITICAL RULE FOR MULTI-STEP CHAINED REQUESTS:
   - When a user asks you to perform multiple tasks in one prompt (e.g. 1. Search YouTube, 2. Write file, 3. Sync to Drive, 4. Schedule Calendar/Meet, 5. Post Classroom Announcement, 6. Send Email):
     * YOU MUST EXECUTE EVERY SINGLE STEP TO COMPLETION! NEVER stop or abort execution midway!
     * Call every tool in sequence until all requested deliverables are fulfilled.
     * In your final chat message, ALWAYS provide clickable links and confirmations for all created items:
       - Workspace markdown file link
       - Google Drive file & folder link
       - Google Calendar event link & Google Meet link
       - Classroom announcement confirmation
       - Gmail sent delivery confirmation with recipient list

Memory & Conversation Context Summary:
${contextMemory || "(No recorded memories yet)"}
${channel === "telegram" ? `\nCRITICAL TELEGRAM MESSAGING FORMAT RULES:
- You are directly replying to the user in a Telegram chat.
- Keep your reply concise, clean, and mobile-friendly (short paragraphs or crisp bullet points).
- DO NOT output technical internal paths, file tags (such as @/path/to/file or @[...]), artifact markup, or massive walls of text.
- Be helpful, conversational, and direct.` : ""}
`

    // Build alternating bedrock messages from history
    const bedrockMessages: any[] = []
    for (const m of history) {
      if (m.role === "system") continue
      const isThisBot = m.sender_name === bot.name
      const role = isThisBot ? "assistant" : "user"
      const prefix = !isThisBot ? `[${m.sender_name}]: ` : ""
      const text = `${prefix}${m.content}`.trim()
      if (!text) continue

      if (bedrockMessages.length > 0 && bedrockMessages[bedrockMessages.length - 1].role === role) {
        bedrockMessages[bedrockMessages.length - 1].content.push({ text })
      } else {
        bedrockMessages.push({ role, content: [{ text }] })
      }
    }

    // Bedrock Converse API strictly requires the conversation to start with a "user" message!
    // Strip any leading "assistant" greeting messages
    while (bedrockMessages.length > 0 && bedrockMessages[0].role === "assistant") {
      bedrockMessages.shift()
    }

    // Step 1: If image is provided, extract visual perception with Nova Pro first
    let userTurnText = `[${userName}]: ${prompt}`
    if (imageUrl) {
      onEvent({ type: "status", statusText: "Analyzing image with vision model..." })
      const visualAnalysis = await analyzeImageWithNova(imageUrl, prompt)
      if (visualAnalysis) {
        userTurnText = `[Attached Image: ${imageUrl}]\n[Visual Analysis of Attached Image]:\n${visualAnalysis}\n\n[${userName}]: ${prompt}`
      } else {
        userTurnText = `[Attached Image URL: ${imageUrl}]\n\n[${userName}]: ${prompt}`
      }
      onEvent({ type: "status", statusText: "Synthesizing answer..." })
    }

    const currentContent: any[] = [{ text: userTurnText }]

    if (bedrockMessages.length > 0 && bedrockMessages[bedrockMessages.length - 1].role === "user") {
      bedrockMessages[bedrockMessages.length - 1].content.push(...currentContent)
    } else {
      bedrockMessages.push({
        role: "user",
        content: currentContent,
      })
    }

    // Step 2: Stream with the OSS Model (openai.gpt-oss-120b-1:0)
    let finalReply = ""
    let capturedReasoning = ""
    const executedTools: any[] = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let listFilesCalls = 0

    let loops = 0
    while (loops < 15) {
      loops++
      const cmd = new ConverseStreamCommand({
        modelId: INTERNAL_BEDROCK_MODEL_ID,
        system: [{ text: systemPrompt }],
        messages: bedrockMessages,
        toolConfig: {
          tools: COPILOT_TOOLS as any,
        },
        inferenceConfig: {
          maxTokens: 2500,
          temperature: 0.7,
        },
      })

      const streamRes = await bedrockClient.send(cmd)
      if (!streamRes.stream) break

      let currentToolUseId = ""
      let currentToolName = ""
      let currentToolInputStr = ""
      const pendingToolCalls: any[] = []

      for await (const chunk of streamRes.stream) {
        // Track token usage if provided by stream metadata
        if (chunk.metadata?.usage) {
          if (chunk.metadata.usage.inputTokens) totalInputTokens += chunk.metadata.usage.inputTokens
          if (chunk.metadata.usage.outputTokens) totalOutputTokens += chunk.metadata.usage.outputTokens
        }

        // Reasoning streaming
        const deltaAny = chunk.contentBlockDelta?.delta as any
        const reasoningDelta = deltaAny?.reasoningContent?.text
        if (reasoningDelta) {
          capturedReasoning += reasoningDelta
          onEvent({ type: "reasoning", text: reasoningDelta })
        }

        // Text streaming
        const textDelta = chunk.contentBlockDelta?.delta?.text
        if (textDelta) {
          finalReply += textDelta
          onEvent({ type: "token", text: textDelta })
        }

        // Tool Use detection
        if (chunk.contentBlockStart?.start?.toolUse) {
          currentToolUseId = chunk.contentBlockStart.start.toolUse.toolUseId || ""
          currentToolName = chunk.contentBlockStart.start.toolUse.name || ""
          currentToolInputStr = ""
          onEvent({ type: "status", statusText: `Executing ${currentToolName}...` })
        }

        if (chunk.contentBlockDelta?.delta?.toolUse?.input) {
          currentToolInputStr += chunk.contentBlockDelta.delta.toolUse.input
        }

        if (chunk.contentBlockStop) {
          if (currentToolName && currentToolUseId) {
            let parsedInput = {}
            try {
              parsedInput = JSON.parse(currentToolInputStr || "{}")
            } catch {}
            pendingToolCalls.push({
              toolUseId: currentToolUseId,
              name: currentToolName,
              input: parsedInput,
            })
            currentToolName = ""
            currentToolUseId = ""
            currentToolInputStr = ""
          }
        }
      }

      if (pendingToolCalls.length === 0) break

      // Execute tool calls
      await updateBot(bot.id, userId, { status: "working" })
      const toolResultContent: any[] = []

      for (const tu of pendingToolCalls) {
        executedTools.push({ name: tu.name, input: tu.input })
        let out: any = { success: true }

        try {
          if (tu.name === "write_file") {
            const f = roomId
              ? await saveRoomFile(roomId, bot.id, userId, tu.input.path, tu.input.content || "")
              : await saveBotFile(bot.id, userId, tu.input.path, tu.input.content || "")
            out = { success: true, message: `Saved ${f.file_path}`, path: f.file_path }
            onEvent({ type: "tool", text: `Saved ${f.file_path}` })
            onEvent({ type: "status", statusText: `Updated workspace file ${f.file_path}` })
          } else if (tu.name === "read_file") {
            const files = roomId
              ? await getRoomFiles(roomId, userId)
              : await getBotFiles(bot.id, userId)
            const target = files.find(
              (x) => x.file_path.toLowerCase() === (tu.input.path || "").toLowerCase().replace(/^\/+/, "")
            )
            out = target ? { success: true, content: target.content } : { success: false, error: "File not found" }
          } else if (tu.name === "list_files") {
            const files = roomId
              ? await getRoomFiles(roomId, userId)
              : await getBotFiles(bot.id, userId)
            if (listFilesCalls > 0) {
              out = {
                success: true,
                files: files.map((x) => x.file_path),
                warning:
                  "Workspace files are already listed above. DO NOT call list_files again. If user asked to upload files or planning to Google Drive, IMMEDIATELY call drive_sync_all_workspace_files with folder_name_or_id: 'noBrain'.",
              }
            } else {
              listFilesCalls++
              out = { success: true, files: files.map((x) => x.file_path) }
            }
          } else if (tu.name === "fetch_web") {
            const r = await fetch(tu.input.url, { signal: AbortSignal.timeout(8000) })
            out = { success: r.ok, status: r.status, content: (await r.text()).slice(0, 3000) }
          } else if (tu.name === "remember") {
            const mem = (bot.memory ? bot.memory + "\n- " : "- ") + tu.input.fact
            await updateBot(bot.id, userId, { memory: mem })
            out = { success: true, message: "Remembered" }
          } else if (tu.name === "send_email") {
            const currentGmail = await getIntegration(userId, "gmail")
            if (!currentGmail || currentGmail.status !== "connected") {
              out = {
                success: false,
                error:
                  "Gmail integration is not connected. The user must connect their Gmail account from the Integrations button at the bottom of the workspace sidebar first.",
              }
            } else {
              const recipient = tu.input.to
              const subject = tu.input.subject || "Message from noBrain Copilot"
              const body = tu.input.body || ""
              const cc = tu.input.cc
              const bcc = tu.input.bcc

              onEvent({ type: "status", statusText: `Sending email to ${recipient}...` })

              let sentViaOAuth = false
              try {
                // Try sending directly through Google's Gmail API via user OAuth
                const res = await sendGmail(userId, {
                  to: recipient,
                  subject,
                  body,
                  cc,
                  bcc,
                })
                sentViaOAuth = true
                out = {
                  success: true,
                  message: `Email successfully sent to ${recipient} via Gmail OAuth`,
                  id: res.id,
                  threadId: res.threadId,
                }
              } catch (oauthErr: any) {
                console.warn("[Gmail API send failed, trying SMTP fallback]:", oauthErr.message)
                // Fallback to SMTP
                const transporter = getMailTransporter()
                const senderEmail = currentGmail.account_email || "user@nobrain.ai"
                const fromAddress = process.env.MAIL_FROM_ADDRESS || "support@saleonic.com"

                const info = await transporter.sendMail({
                  from: `"${bot.name} (via ${senderEmail})" <${fromAddress}>`,
                  replyTo: senderEmail,
                  to: recipient,
                  cc: cc || undefined,
                  bcc: bcc || undefined,
                  subject,
                  text: body,
                  html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #18181b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;">
                    <div style="margin-bottom: 16px; font-weight: 600; font-size: 16px; color: #09090b;">${subject}</div>
                    <div style="font-size: 14px; white-space: pre-wrap; color: #27272a;">${body}</div>
                    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0 16px;" />
                    <div style="font-size: 12px; color: #71717a; display: flex; align-items: center; justify-content: space-between;">
                      <span>Sent by <strong>${bot.name}</strong> on behalf of <strong>${senderEmail}</strong></span>
                      <span style="font-weight: 500;">noBrain Copilot</span>
                    </div>
                  </div>`,
                })

                out = {
                  success: true,
                  message: `Email successfully delivered to ${recipient} with subject "${subject}"`,
                  messageId: info.messageId,
                }
              }

              onEvent({ type: "tool", text: `Sent email to ${recipient}` })
              onEvent({ type: "status", statusText: `Delivered email to ${recipient}` })
            }
          } else if (tu.name === "gmail_create_draft") {
            onEvent({ type: "status", statusText: "Creating draft in Gmail..." })
            const draft = await createGmailDraft(userId, {
              to: tu.input.to,
              subject: tu.input.subject,
              body: tu.input.body,
            })
            out = {
              success: true,
              message: `Draft created in your Gmail inbox for ${tu.input.to} with subject "${tu.input.subject}"`,
              draftId: draft.id,
            }
            onEvent({ type: "tool", text: `Created draft for ${tu.input.to}` })
          } else if (tu.name === "gmail_search_emails") {
            onEvent({ type: "status", statusText: `Searching Gmail for "${tu.input.query}"...` })
            const searchResults = await searchGmail(userId, tu.input.query, tu.input.max_results || 5)
            out = {
              success: true,
              query: tu.input.query,
              totalFound: searchResults.totalResultSizeEstimate,
              emails: searchResults.messages,
            }
            onEvent({ type: "tool", text: `Found ${searchResults.messages.length} emails matching query` })
          } else if (tu.name === "gmail_read_email") {
            onEvent({ type: "status", statusText: "Reading full email..." })
            const emailDetail = await readGmail(userId, tu.input.message_id)
            out = {
              success: true,
              email: emailDetail,
            }
            onEvent({ type: "tool", text: `Read email: "${emailDetail.subject}"` })
          } else if (tu.name === "gmail_reply_thread") {
            onEvent({ type: "status", statusText: "Replying to email thread..." })
            const replyResult = await replyToGmailThread(userId, {
              messageId: tu.input.message_id,
              body: tu.input.body,
            })
            out = {
              success: true,
              message: "Replied to email thread successfully",
              result: replyResult,
            }
            onEvent({ type: "tool", text: "Sent reply to thread" })
          } else if (tu.name === "gmail_manage_email") {
            onEvent({ type: "status", statusText: `Executing ${tu.input.action} on email...` })
            const modResult = await manageGmailMessage(userId, {
              messageId: tu.input.message_id,
              action: tu.input.action,
            })
            out = {
              success: true,
              message: `Successfully executed ${tu.input.action} on email ${tu.input.message_id}`,
              result: modResult,
            }
            onEvent({ type: "tool", text: `${tu.input.action} executed on email` })
          } else if (tu.name === "gmail_bulk_mark_as_read") {
            onEvent({ type: "status", statusText: "Marking unread emails as read in bulk..." })
            const bulkRes = await bulkMarkGmailAsRead(userId, {
              query: tu.input.query,
              maxEmails: tu.input.max_emails || 5000,
              onProgress: (processed) => {
                onEvent({ type: "status", statusText: `Batch processed: ${processed} emails marked as read...` })
                onEvent({ type: "tool", text: `Marked ${processed} emails as read` })
              },
            })
            out = {
              success: true,
              totalMarkedRead: bulkRes.totalMarkedRead,
              hasMore: bulkRes.hasMore,
              durationSeconds: Number((bulkRes.durationMs / 1000).toFixed(1)),
              message: `Successfully marked ${bulkRes.totalMarkedRead} unread emails as read in ${Number(
                (bulkRes.durationMs / 1000).toFixed(1)
              )}s`,
            }
            onEvent({ type: "tool", text: `Completed marking ${bulkRes.totalMarkedRead} emails as read` })
            onEvent({ type: "status", statusText: `Finished: ${bulkRes.totalMarkedRead} emails marked as read` })
          } else if (tu.name === "drive_search_files") {
            onEvent({ type: "status", statusText: `Searching Google Drive for "${tu.input.query || ""}"...` })
            const driveResults = await searchDriveFiles(userId, tu.input.query, tu.input.max_results || 10)
            out = {
              success: true,
              total: driveResults.total,
              files: driveResults.files,
            }
            onEvent({ type: "tool", text: `Found ${driveResults.files.length} Google Drive files` })
          } else if (tu.name === "drive_read_file") {
            onEvent({ type: "status", statusText: "Reading Google Drive file..." })
            const fileData = await readDriveFile(userId, tu.input.file_id)
            out = {
              success: true,
              file: fileData,
            }
            onEvent({ type: "tool", text: `Read Drive file "${fileData.name}"` })
          } else if (tu.name === "drive_create_file") {
            onEvent({ type: "status", statusText: `Creating Google Drive file "${tu.input.name}"...` })
            const created = await createDriveFile(userId, {
              name: tu.input.name,
              content: tu.input.content,
              folderId: tu.input.folder_id,
            })
            out = {
              success: true,
              message: `Created file "${created.name}" in Google Drive`,
              file: created,
            }
            onEvent({ type: "tool", text: `Created Drive file "${created.name}"` })
          } else if (tu.name === "drive_sync_workspace_file") {
            onEvent({ type: "status", statusText: `Syncing workspace file "${tu.input.workspace_path}" to Google Drive...` })
            const syncRes = await syncWorkspaceFileToDrive(
              userId,
              { roomId, botId: bot.id },
              tu.input.workspace_path,
              tu.input.folder_name_or_id || tu.input.folder_name || "noBrain"
            )
            out = {
              success: true,
              message: `Workspace file "${tu.input.workspace_path}" successfully synced to Google Drive folder "${syncRes.folderName}"`,
              file: syncRes.file,
              folderName: syncRes.folderName,
              webViewLink: syncRes.webViewLink,
            }
            onEvent({ type: "tool", text: `Synced "${tu.input.workspace_path}" to Drive` })
          } else if (tu.name === "drive_sync_all_workspace_files") {
            onEvent({ type: "status", statusText: "Syncing all workspace files to Google Drive..." })
            const syncAllRes = await syncAllWorkspaceFilesToDrive(
              userId,
              { roomId, botId: bot.id },
              tu.input.folder_name_or_id || "noBrain"
            )
            out = {
              success: true,
              message: `Successfully uploaded ${syncAllRes.total} workspace files to Google Drive folder '${syncAllRes.folder.name}'`,
              folder: syncAllRes.folder,
              files: syncAllRes.files,
              total: syncAllRes.total,
            }
            onEvent({ type: "tool", text: `Uploaded ${syncAllRes.total} files to Drive folder "${syncAllRes.folder.name}"` })
            onEvent({ type: "status", statusText: `Synced ${syncAllRes.total} files to Google Drive` })
          } else if (tu.name === "drive_create_folder") {
            onEvent({ type: "status", statusText: `Creating Google Drive folder "${tu.input.name}"...` })
            const folder = await createDriveFolder(userId, tu.input.name, tu.input.parent_folder_id)
            out = {
              success: true,
              message: `Created folder "${folder.name}" in Google Drive with link: ${folder.webViewLink}`,
              folderId: folder.id,
              name: folder.name,
              webViewLink: folder.webViewLink,
            }
            onEvent({ type: "tool", text: `Created Drive folder "${folder.name}"` })
          } else if (tu.name === "drive_share_file") {
            onEvent({ type: "status", statusText: "Setting Google Drive sharing permissions..." })
            const shareRes = await shareDriveFile(userId, {
              fileId: tu.input.file_id,
              role: tu.input.role,
              type: tu.input.type,
              email: tu.input.email,
            })
            out = {
              success: true,
              message: `File permissions updated. Sharable link: ${shareRes.webViewLink}`,
              webViewLink: shareRes.webViewLink,
              role: shareRes.role,
            }
            onEvent({ type: "tool", text: `Generated share link: ${shareRes.webViewLink}` })
          } else if (tu.name === "drive_trash_file") {
            onEvent({ type: "status", statusText: "Moving file to Google Drive trash..." })
            const trashRes = await trashDriveFile(userId, tu.input.file_id)
            out = {
              success: true,
              message: `Moved file ${trashRes.fileId} to Google Drive trash`,
            }
            onEvent({ type: "tool", text: "Moved file to Drive trash" })
          // ==========================================
          // GOOGLE CALENDAR HANDLERS
          // ==========================================
          } else if (tu.name === "calendar_list_events") {
            onEvent({ type: "status", statusText: "Fetching Google Calendar events..." })
            const calData = await listCalendarEvents(userId, {
              query: tu.input.query,
              timeMin: tu.input.time_min,
              timeMax: tu.input.time_max,
              maxResults: tu.input.max_results,
            })
            out = { success: true, ...calData }
            onEvent({ type: "tool", text: `Found ${calData.total} calendar events` })
          } else if (tu.name === "calendar_create_event") {
            onEvent({ type: "status", statusText: `Scheduling "${tu.input.summary}" in Google Calendar...` })
            const created = await createCalendarEvent(userId, {
              summary: tu.input.summary,
              description: tu.input.description,
              start: tu.input.start_time,
              end: tu.input.end_time,
              location: tu.input.location,
              attendees: tu.input.attendees,
              createMeetLink: tu.input.create_meet_link,
            })
            out = { success: true, event: created }
            onEvent({ type: "tool", text: `Created calendar event: ${created.summary}${created.meetLink ? ` with Meet link: ${created.meetLink}` : ""}` })
          } else if (tu.name === "calendar_delete_event") {
            onEvent({ type: "status", statusText: "Removing event from Google Calendar..." })
            const delRes = await deleteCalendarEvent(userId, tu.input.event_id)
            out = { success: true, message: `Calendar event ${delRes.eventId} removed` }
            onEvent({ type: "tool", text: `Deleted calendar event ${tu.input.event_id}` })

          // ==========================================
          // GOOGLE MEET REST API HANDLERS
          // ==========================================
          } else if (tu.name === "meet_create_instant_meeting") {
            onEvent({ type: "status", statusText: "Generating instant Google Meet video link..." })
            const meetRes = await createInstantMeetSpace(userId, { topic: tu.input.topic })
            out = { ...meetRes }
            onEvent({ type: "tool", text: `Generated Google Meet link: ${meetRes.meetingUri}` })
          } else if (tu.name === "meet_schedule_meeting") {
            onEvent({ type: "status", statusText: `Scheduling Meet & Calendar event "${tu.input.topic}"...` })
            const schedRes = await scheduleMeetingWithCalendar(userId, {
              topic: tu.input.topic,
              description: tu.input.description,
              startTime: tu.input.start_time,
              endTime: tu.input.end_time,
              attendees: tu.input.attendees,
              sendEmailInvites: tu.input.send_email_invites !== false,
            })
            out = { ...schedRes }
            onEvent({ type: "tool", text: `Scheduled Meet: ${schedRes.meetLink} (${schedRes.emailInvitesSent} invites sent)` })

          // ==========================================
          // GOOGLE CLASSROOM HANDLERS
          // ==========================================
          } else if (tu.name === "classroom_list_courses") {
            onEvent({ type: "status", statusText: "Listing Google Classroom courses..." })
            const crData = await listClassroomCourses(userId)
            out = { success: true, ...crData }
            onEvent({ type: "tool", text: `Found ${crData.total} Classroom courses` })
          } else if (tu.name === "classroom_list_coursework") {
            onEvent({ type: "status", statusText: "Fetching coursework assignments from Classroom..." })
            const cwData = await listCourseWork(userId, tu.input.course_id)
            out = { success: true, ...cwData }
            onEvent({ type: "tool", text: `Found ${cwData.total} coursework items` })
          } else if (tu.name === "classroom_create_coursework") {
            onEvent({ type: "status", statusText: `Publishing assignment "${tu.input.title}" in Classroom...` })
            const cwCreated = await createCourseWork(userId, {
              courseId: tu.input.course_id,
              title: tu.input.title,
              description: tu.input.description,
              maxPoints: tu.input.max_points,
              dueYear: tu.input.due_year,
              dueMonth: tu.input.due_month,
              dueDay: tu.input.due_day,
              dueHour: tu.input.due_hour,
              dueMinute: tu.input.due_minute,
            })
            out = { success: true, coursework: cwCreated }
            onEvent({ type: "tool", text: `Created assignment: ${cwCreated.title}` })
          } else if (tu.name === "classroom_list_announcements") {
            onEvent({ type: "status", statusText: "Fetching Classroom announcements..." })
            const anData = await listClassAnnouncements(userId, tu.input.course_id)
            out = { success: true, ...anData }
            onEvent({ type: "tool", text: `Found ${anData.total} announcements` })
          } else if (tu.name === "classroom_create_announcement") {
            onEvent({ type: "status", statusText: "Posting announcement to Google Classroom..." })
            const anCreated = await createClassAnnouncement(userId, {
              courseId: tu.input.course_id,
              text: tu.input.text,
            })
            out = { success: true, announcement: anCreated }
            onEvent({ type: "tool", text: "Posted announcement in Classroom" })
          } else if (tu.name === "classroom_list_students") {
            onEvent({ type: "status", statusText: "Fetching enrolled students from Classroom..." })
            const stData = await listCourseStudents(userId, tu.input.course_id)
            out = { success: true, ...stData }
            onEvent({ type: "tool", text: `Found ${stData.total} enrolled students` })

          // ==========================================
          // YOUTUBE DATA API V3 HANDLERS
          // ==========================================
          } else if (tu.name === "youtube_search_videos") {
            onEvent({ type: "status", statusText: `Searching YouTube for "${tu.input.query}"...` })
            const ytResults = await searchYouTubeVideos(userId, {
              query: tu.input.query,
              maxResults: tu.input.max_results,
              order: tu.input.order,
            })
            out = { ...ytResults }
            onEvent({ type: "tool", text: `Found ${ytResults.videos.length} YouTube videos for "${tu.input.query}"` })
          } else if (tu.name === "youtube_get_video_details") {
            onEvent({ type: "status", statusText: "Fetching deep YouTube video statistics..." })
            const ytDetails = await getVideoDetails(userId, tu.input.video_ids)
            out = { ...ytDetails }
            onEvent({ type: "tool", text: `Retrieved stats for ${ytDetails.videos.length} YouTube videos` })
          } else if (tu.name === "youtube_get_channel_details") {
            onEvent({ type: "status", statusText: "Inspecting YouTube channel analytics..." })
            const chDetails = await getChannelDetails(userId, tu.input.channel_id_or_handle)
            out = { ...chDetails }
            onEvent({ type: "tool", text: `Fetched channel metrics for ${chDetails.channel?.title || "channel"}` })
          } else if (tu.name === "youtube_list_comments") {
            onEvent({ type: "status", statusText: "Extracting audience comments from YouTube video..." })
            const cmData = await getVideoComments(userId, tu.input.video_id, tu.input.max_results)
            out = { ...cmData }
            onEvent({ type: "tool", text: `Analyzed ${cmData.comments.length} audience comments` })
          } else if (tu.name === "youtube_manage_playlist") {
            onEvent({ type: "status", statusText: `Executing YouTube playlist action: ${tu.input.action}...` })
            const plData = await manageYouTubePlaylist(userId, {
              action: tu.input.action,
              title: tu.input.title,
              description: tu.input.description,
              privacyStatus: tu.input.privacy_status,
              playlistId: tu.input.playlist_id,
              videoId: tu.input.video_id,
            })
            out = { ...plData }
            onEvent({ type: "tool", text: `YouTube playlist ${tu.input.action} completed` })
          } else if (tu.name === "youtube_player_control") {
            onEvent({ type: "status", statusText: `Controlling YouTube player (${tu.input.action})...` })
            const playerRes = await agentControlYouTubePlayer(userId, {
              action: tu.input.action,
              videoId: tu.input.video_id,
              query: tu.input.query,
              title: tu.input.title,
              folderId: tu.input.folder_id,
              folderName: tu.input.folder_name,
              noteText: tu.input.note_text,
              timestampSeconds: tu.input.timestamp_seconds,
              author: bot.name,
            })
            out = { ...playerRes }
            onEvent({
              type: "tool",
              text: playerRes.message || `YouTube player ${tu.input.action}`,
              data: { youtubePlayer: playerRes },
            })
          } else if (tu.name === "youtube_post_comment") {
            onEvent({ type: "status", statusText: "Publishing comment on YouTube video..." })
            const cleanId = (tu.input.video_id || "").match(/(?:v=|\/embed\/|youtu\.be\/|\/v\/|\/shorts\/)([a-zA-Z0-9_-]{11})/)
              ? (tu.input.video_id || "").match(/(?:v=|\/embed\/|youtu\.be\/|\/v\/|\/shorts\/)([a-zA-Z0-9_-]{11})/)![1]
              : (tu.input.video_id || "").trim()

            const cRes = await googleApiFetch(userId, "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                snippet: {
                  videoId: cleanId,
                  topLevelComment: {
                    snippet: {
                      textOriginal: tu.input.text,
                    },
                  },
                },
              }),
            })

            if (!cRes.ok) {
              const errText = await cRes.text()
              out = { success: false, error: `Failed to post YouTube comment (${cRes.status}): ${errText}` }
            } else {
              const commData = await cRes.json()
              out = { success: true, message: `Successfully posted comment on YouTube video "${cleanId}"`, commentId: commData.id }
              onEvent({ type: "tool", text: `Posted comment on YouTube: "${tu.input.text.slice(0, 40)}..."` })
            }

          // ==========================================
          // TELEGRAM COPILOT BRIDGE HANDLER
          // ==========================================
          } else if (tu.name === "telegram_send_message") {
            onEvent({ type: "status", statusText: "Sending message to Telegram..." })
            const tgInt = await getIntegration(userId, "telegram")
            const botToken = tgInt?.metadata?.bot_token
            const targetChatId = tu.input.chat_id || tgInt?.metadata?.primary_chat_id
            if (!botToken || !targetChatId) {
              out = { success: false, error: "Telegram bot is not connected or no chat ID is available." }
            } else {
              const tgRes = await sendTelegramMessage(botToken, targetChatId, tu.input.message)
              out = { success: tgRes.ok, ...tgRes }
              onEvent({ type: "tool", text: "Sent message to Telegram" })
            }
          }
        } catch (e: any) {
          out = { success: false, error: e.message }
        }

        toolResultContent.push({
          toolResult: {
            toolUseId: tu.toolUseId,
            content: [{ json: out }],
            status: out.success ? "success" : "error",
          },
        })
      }

      bedrockMessages.push({
        role: "assistant",
        content: [
          ...(finalReply ? [{ text: finalReply }] : []),
          ...pendingToolCalls.map((t) => ({ toolUse: t })),
        ],
      })
      bedrockMessages.push({ role: "user", content: toolResultContent })
    }

    finalReply = cleanPrefix(finalReply, bot.name)
    finalReply = cleanAccidentalSimulatedDialogue(finalReply, bot.name)

    if (
      (!finalReply || finalReply.trim() === "I have performed the required workspace tasks.") &&
      executedTools.length > 0
    ) {
      const items: string[] = []
      const links: string[] = []

      for (const bm of bedrockMessages) {
        if (bm.role === "user" && Array.isArray(bm.content)) {
          for (const c of bm.content) {
            const resJson = c.toolResult?.content?.[0]?.json
            if (resJson?.folder?.webViewLink) {
              links.push(`📁 **Google Drive Folder [${resJson.folder.name}]:** ${resJson.folder.webViewLink}`)
            }
            if (Array.isArray(resJson?.files)) {
              for (const f of resJson.files) {
                if (f.webViewLink) {
                  links.push(`📄 **${f.name}:** ${f.webViewLink}`)
                }
              }
            }
            if (resJson?.file?.webViewLink) {
              links.push(`📄 **${resJson.file.name}:** ${resJson.file.webViewLink}`)
            }
            if (resJson?.htmlLink) {
              links.push(`📅 **Calendar Event:** ${resJson.htmlLink}`)
            }
            if (resJson?.meetLink || resJson?.hangoutLink || resJson?.meetingUri) {
              links.push(`📹 **Google Meet:** ${resJson.meetLink || resJson.hangoutLink || resJson.meetingUri}`)
            }
            if (resJson?.announcement?.alternateLink) {
              links.push(`🎓 **Classroom Announcement:** ${resJson.announcement.alternateLink}`)
            }
            if (resJson?.coursework?.alternateLink) {
              links.push(`📚 **Classroom Coursework:** ${resJson.coursework.alternateLink}`)
            }
            if (Array.isArray(resJson?.videos)) {
              for (const v of resJson.videos.slice(0, 3)) {
                if (v.id) {
                  links.push(`▶️ **YouTube Video [${v.title}]:** https://www.youtube.com/watch?v=${v.id}`)
                }
              }
            }
            if (resJson?.webViewLink && !links.some((l) => l.includes(resJson.webViewLink))) {
              links.push(`🔗 **Link:** ${resJson.webViewLink}`)
            }
          }
        }
      }

      for (const t of executedTools) {
        if (t.name === "gmail_bulk_mark_as_read") {
          items.push(`✅ Gmail-এর আনরিড ইমেইলগুলো সফলভাবে 'Mark as Read' করা হয়েছে।`)
        } else if (t.name === "send_email") {
          items.push(`✉️ ইমেইল সফলভাবে পাঠানো হয়েছে: **${t.input.to}** (Subject: "${t.input.subject || ""}")`)
        } else if (t.name === "gmail_create_draft") {
          items.push(`📝 Gmail-এ ড্রাফট তৈরি করা হয়েছে (${t.input.to})।`)
        } else if (t.name === "gmail_manage_email") {
          items.push(`📧 ইমেইলে অ্যাকশন সম্পন্ন করা হয়েছে।`)
        } else if (t.name === "drive_sync_all_workspace_files") {
          items.push(`☁️ ওয়ার্কস্পেসের সকল ফাইল Google Drive-এ সফলভাবে আপলোড করা হয়েছে।`)
        } else if (t.name === "drive_create_folder") {
          items.push(`📁 Google Drive-এ '${t.input.name}' ফোল্ডারটি তৈরি করা হয়েছে।`)
        } else if (t.name === "drive_create_file") {
          items.push(`📄 Google Drive-এ '${t.input.name}' ফাইলটি তৈরি করা হয়েছে।`)
        } else if (t.name === "drive_sync_workspace_file") {
          items.push(`☁️ Workspace ফাইল '${t.input.workspace_path}' Google Drive-এ সিঙ্ক করা হয়েছে।`)
        } else if (t.name === "drive_share_file") {
          items.push(`🔗 Google Drive ফাইলটির শেয়ারেবল পারমিশন আপডেট করা হয়েছে।`)
        } else if (t.name === "write_file") {
          items.push(`📝 Workspace ফাইল '${t.input.path}' তৈরি ও সংরক্ষণ করা হয়েছে।`)
        } else if (t.name === "calendar_create_event") {
          items.push(`📅 Google Calendar-এ '${t.input.summary}' শিডিউল করা হয়েছে (${t.input.start})।`)
        } else if (t.name === "meet_create_instant_meeting") {
          items.push(`📹 Google Meet ইনস্ট্যান্ট ভিডিও স্পেস প্রস্তুত করা হয়েছে।`)
        } else if (t.name === "classroom_create_announcement") {
          items.push(`🎓 Google Classroom-এ অ্যানাউন্সমেন্ট পোস্ট করা হয়েছে।`)
        } else if (t.name === "classroom_create_coursework") {
          items.push(`📚 Google Classroom-এ অ্যাসাইনমেন্ট তৈরি করা হয়েছে।`)
        } else if (t.name === "youtube_search_videos") {
          items.push(`🔍 YouTube-এ "${t.input.query}" সার্চ করে সেরা ভিডিওগুলো বিশ্লেষণ করা হয়েছে।`)
        } else if (t.name === "youtube_get_video_details") {
          items.push(`📊 YouTube ভিডিওগুলোর ভিউজ, লাইক ও মেটাডাটা অ্যানালাইসিস সম্পন্ন হয়েছে।`)
        } else if (t.name === "youtube_list_comments") {
          items.push(`💬 YouTube দর্শক মন্তব্য ও মতামত অ্যানালাইসিস করা হয়েছে।`)
        } else if (t.name === "youtube_player_control") {
          items.push(`▶️ YouTube Player: ${t.input.action === "play" ? "ভিডিও প্লে করা শুরু হয়েছে" : t.input.action === "shortlist" || t.input.action === "queue" ? "শর্টলিস্ট কিউতে যুক্ত করা হয়েছে" : t.input.action === "add_note" ? "ভিডিও টাইমলাইনে রিসার্চ নোট যুক্ত করা হয়েছে" : "প্লেয়ার কমান্ড কার্যকর হয়েছে"}।`)
        } else if (t.name === "youtube_post_comment") {
          items.push(`💬 YouTube ভিডিওতে কমেন্ট পোস্ট করা হয়েছে: "${t.input.text}"`)
        } else if (t.name === "telegram_send_message") {
          items.push(`💬 Telegram-এ মেসেজ পাঠানো হয়েছে।`)
        }
      }

      if (items.length > 0 || links.length > 0) {
        const uniqueLinks = Array.from(new Set(links))
        const linkText =
          uniqueLinks.length > 0
            ? `\n\n### 🔗 Deliverables & Links:\n${uniqueLinks.map((l) => `- ${l}`).join("\n")}`
            : ""
        finalReply = `### 🚀 Action Summary:\n${items.map((i) => `- ${i}`).join("\n")}${linkText}`
      } else {
        finalReply = "আমি আপনার সম্পূর্ণ অনুরোধটির প্রতিটি ধাপ সফলভাবে সম্পন্ন করেছি।"
      }
    }

    if (!finalReply) {
      finalReply = "I received your message and have processed it."
    }

    const durationSeconds = Math.max(0.1, Number(((Date.now() - startTime) / 1000).toFixed(1)))

    // Deduct usage from wallet according to token charges
    const estInput = Math.max(120, Math.ceil((prompt.length + systemPrompt.length) / 3.5))
    const estOutput = Math.max(60, Math.ceil((finalReply.length + capturedReasoning.length) / 3.5))
    const finalInputTokens = totalInputTokens || estInput
    const finalOutputTokens = totalOutputTokens || estOutput

    try {
      await walletService.deductForChatUsage(userId, finalInputTokens, finalOutputTokens)
    } catch (deductErr) {
      console.error("[Copilot Wallet Deduction Error]:", deductErr)
    }

    // Save to DB
    const savedMsg = await addMessage(userId, {
      room_id: roomId || null,
      bot_id: bot.id,
      sender_name: bot.name,
      role: "assistant",
      content: finalReply,
      reasoning: capturedReasoning || undefined,
      tool_calls: executedTools.length ? executedTools : undefined,
      duration_seconds: durationSeconds,
    })

    await updateBot(bot.id, userId, { status: "idle" })

    onEvent({
      type: "done",
      text: finalReply,
      data: {
        messageId: savedMsg.id,
        durationSeconds,
        reply: finalReply,
        reasoning: capturedReasoning,
        toolCalls: executedTools,
      },
    })

    return {
      reply: finalReply,
      reasoning: capturedReasoning,
      toolCalls: executedTools,
      durationSeconds,
      messageId: savedMsg.id,
    }
  } catch (error: any) {
    console.error(`[Copilot Agent Error - ${bot.name}]:`, error)
    await updateBot(bot.id, userId, { status: "idle" })

    const durationSeconds = Math.max(0.1, Number(((Date.now() - startTime) / 1000).toFixed(1)))
    const fallbackReply = `I ran into an issue while processing that request: ${error.message || "Execution error"}. Please try again.`

    const savedMsg = await addMessage(userId, {
      room_id: roomId || null,
      bot_id: bot.id,
      sender_name: bot.name,
      role: "assistant",
      content: fallbackReply,
      duration_seconds: durationSeconds,
    })

    onEvent({
      type: "done",
      text: fallbackReply,
      data: {
        messageId: savedMsg.id,
        durationSeconds,
        reply: fallbackReply,
      },
    })

    return {
      reply: fallbackReply,
      durationSeconds,
      messageId: savedMsg.id,
    }
  }
}

/** Non-streaming backward compatibility wrapper */
export async function executeBotTurn(params: {
  bot: CopilotBot
  userId: string
  userName: string
  prompt: string
  imageUrl?: string | null
  roomId?: string | null
  otherBots?: CopilotBot[]
  channel?: "web" | "telegram"
}) {
  return executeBotTurnStream(params, () => {})
}

function cleanPrefix(text: string, botName: string): string {
  const prefixRegex = new RegExp(`^\\[${botName}\\]:\\s*`, "i")
  return text.replace(prefixRegex, "").trim()
}

function cleanAccidentalSimulatedDialogue(text: string, botName: string): string {
  if (text.includes(`**${botName}:**`)) {
    const parts = text.split(/\*\*[a-zA-Z0-9_\s]+:\*\*/g).filter(Boolean)
    if (parts.length > 0) {
      return parts[0].trim()
    }
  }
  return text
}
