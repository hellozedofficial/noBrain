import "server-only"
import { query, execute } from "@/lib/db"
import { searchYouTubeVideos, getVideoDetails } from "./youtube"
import {
  ShortlistFolder,
  YouTubePlaylistItem,
  YouTubePlayerNote,
  YouTubePlayerState,
  DEFAULT_FOLDERS,
  DEFAULT_DISCOVERY_TOPICS,
} from "./youtubeTypes"

export type {
  ShortlistFolder,
  YouTubePlaylistItem,
  YouTubePlayerNote,
  YouTubePlayerState,
}
export { DEFAULT_FOLDERS, DEFAULT_DISCOVERY_TOPICS }

/**
 * Retrieves the persistent YouTube player state for a user.
 */
export async function getYouTubePlayerState(userId: string): Promise<YouTubePlayerState> {
  try {
    const rows = await query<{
      current_video_id: string | null
      current_video_data: any
      queue_data: any
      notes_data: any
      folders_data?: any
    }>(
      "SELECT current_video_id, current_video_data, queue_data, notes_data, folders_data FROM copilot_youtube_player WHERE user_id = ?",
      [userId]
    )

    if (rows.length === 0) {
      return {
        currentVideo: null,
        queue: [],
        folders: DEFAULT_FOLDERS,
        history: [],
        notes: [],
        isPlaying: false,
      }
    }

    const r = rows[0]
    const currentVideo = r.current_video_data
      ? typeof r.current_video_data === "string"
        ? JSON.parse(r.current_video_data)
        : r.current_video_data
      : null

    const rawQueue = r.queue_data
      ? typeof r.queue_data === "string"
        ? JSON.parse(r.queue_data)
        : r.queue_data
      : []

    // Ensure every queue item has a folderId
    const queue: YouTubePlaylistItem[] = (Array.isArray(rawQueue) ? rawQueue : [])
      .filter((q): q is YouTubePlaylistItem => Boolean(q && q.id))
      .map((item) => ({
        ...item,
        folderId: item.folderId || "default",
      }))

    const notes = r.notes_data
      ? typeof r.notes_data === "string"
        ? JSON.parse(r.notes_data)
        : r.notes_data
      : []

    const rawFolders = r.folders_data
      ? typeof r.folders_data === "string"
        ? JSON.parse(r.folders_data)
        : r.folders_data
      : null

    let folders: ShortlistFolder[] = Array.isArray(rawFolders) && rawFolders.length > 0 ? rawFolders : DEFAULT_FOLDERS
    // Guarantee default folder always exists
    if (!folders.some((f) => f.id === "default")) {
      folders = [DEFAULT_FOLDERS[0], ...folders]
    }

    const history = currentVideo ? [currentVideo] : []

    return {
      currentVideo,
      queue,
      folders,
      history,
      notes: Array.isArray(notes) ? notes : [],
      isPlaying: false,
    }
  } catch (err: any) {
    console.error("[getYouTubePlayerState Error]:", err.message)
    return {
      currentVideo: null,
      queue: [],
      folders: DEFAULT_FOLDERS,
      history: [],
      notes: [],
      isPlaying: false,
    }
  }
}

/**
 * Saves/updates the persistent YouTube player state for a user.
 */
export async function saveYouTubePlayerState(
  userId: string,
  state: Partial<YouTubePlayerState>
): Promise<YouTubePlayerState> {
  const current = await getYouTubePlayerState(userId)
  const updated: YouTubePlayerState = {
    ...current,
    ...state,
  }

  await execute(
    `INSERT INTO copilot_youtube_player (user_id, current_video_id, current_video_data, queue_data, notes_data, folders_data, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       current_video_id = VALUES(current_video_id),
       current_video_data = VALUES(current_video_data),
       queue_data = VALUES(queue_data),
       notes_data = VALUES(notes_data),
       folders_data = VALUES(folders_data),
       updated_at = NOW()`,
    [
      userId,
      updated.currentVideo?.id || null,
      JSON.stringify(updated.currentVideo || null),
      JSON.stringify(updated.queue || []),
      JSON.stringify(updated.notes || []),
      JSON.stringify(updated.folders || DEFAULT_FOLDERS),
    ]
  )

  return updated
}

/**
 * Agent-driven command handler for player control.
 */
export async function agentControlYouTubePlayer(
  userId: string,
  params: {
    action:
      | "play"
      | "stop"
      | "pause"
      | "queue"
      | "shortlist"
      | "remove_from_queue"
      | "create_folder"
      | "delete_folder"
      | "move_video_folder"
      | "add_note"
      | "delete_note"
      | "clear_queue"
      | "get_state"
      | "assign_folder_to_agent"
    videoId?: string
    query?: string
    title?: string
    noteText?: string
    noteId?: string
    timestampSeconds?: number
    author?: string
    folderId?: string
    folderName?: string
    color?: string
    description?: string
  }
) {
  const state = await getYouTubePlayerState(userId)

  if (params.action === "get_state") {
    return {
      success: true,
      player: state,
    }
  }

  if (params.action === "stop") {
    await saveYouTubePlayerState(userId, {
      isPlaying: false,
      currentVideo: null,
    })
    return {
      success: true,
      message: "Player stopped and reset to Discovery Hub",
    }
  }

  if (params.action === "pause") {
    await saveYouTubePlayerState(userId, { isPlaying: false })
    return {
      success: true,
      message: "Player paused",
    }
  }

  if (params.action === "clear_queue") {
    const updated = await saveYouTubePlayerState(userId, { queue: [] })
    return {
      success: true,
      message: "Shortlist queue cleared",
      queueCount: 0,
    }
  }

  if (params.action === "create_folder") {
    const name = (params.folderName || "New Collection").trim()
    const id = "folder_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6)
    const newFolder: ShortlistFolder = {
      id,
      name,
      color: params.color || "#3b82f6",
      description: params.description || `Research collection for ${name}`,
      createdAt: new Date().toISOString(),
    }
    const updatedFolders = [...state.folders, newFolder]
    await saveYouTubePlayerState(userId, { folders: updatedFolders })
    return {
      success: true,
      message: `Folder "${name}" successfully created`,
      folder: newFolder,
      folders: updatedFolders,
    }
  }

  if (params.action === "delete_folder" && params.folderId) {
    if (params.folderId === "default") {
      return { success: false, error: "The default folder cannot be deleted." }
    }
    const updatedFolders = state.folders.filter((f) => f.id !== params.folderId)
    // Reassign videos in this folder back to default
    const updatedQueue = state.queue.map((v) =>
      v.folderId === params.folderId ? { ...v, folderId: "default" } : v
    )
    await saveYouTubePlayerState(userId, { folders: updatedFolders, queue: updatedQueue })
    return {
      success: true,
      message: "Folder deleted and videos reassigned to General Shortlist",
      folders: updatedFolders,
      queue: updatedQueue,
    }
  }

  if (params.action === "move_video_folder" && params.videoId && params.folderId) {
    const updatedQueue = state.queue.map((v) =>
      v.id === params.videoId ? { ...v, folderId: params.folderId } : v
    )
    await saveYouTubePlayerState(userId, { queue: updatedQueue })
    return {
      success: true,
      message: "Video moved to target folder",
      queue: updatedQueue,
    }
  }

  if (params.action === "assign_folder_to_agent") {
    const targetFolderId = params.folderId || "default"
    const folder = state.folders.find((f) => f.id === targetFolderId) || state.folders[0]
    const folderVideos = state.queue.filter((v) => (v.folderId || "default") === folder.id)

    if (folderVideos.length === 0) {
      return {
        success: false,
        error: `Folder "${folder.name}" contains no shortlisted videos to assign.`,
      }
    }

    const videoListFormatted = folderVideos
      .map((v, idx) => `${idx + 1}. **${v.title}** (${v.channelTitle || "YouTube"}) - https://www.youtube.com/watch?v=${v.id}`)
      .join("\n")

    const suggestedPrompt = `@all Please review the ${folderVideos.length} research videos in folder "${folder.name}":\n\n${videoListFormatted}\n\nPerform a comprehensive comparative breakdown, synthesize architectural patterns, and save an actionable report to workspace file "${folder.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_research.md".`

    return {
      success: true,
      folder,
      videoCount: folderVideos.length,
      videos: folderVideos,
      prompt: suggestedPrompt,
      message: `Squad assignment prepared for folder "${folder.name}" with ${folderVideos.length} videos.`,
    }
  }

  if (params.action === "remove_from_queue" && params.videoId) {
    const updatedQueue = state.queue.filter((q) => q.id !== params.videoId)
    await saveYouTubePlayerState(userId, { queue: updatedQueue })
    return {
      success: true,
      message: "Video removed from shortlist",
      totalQueued: updatedQueue.length,
    }
  }

  if (params.action === "delete_note" && params.noteId) {
    const updatedNotes = state.notes.filter((n) => n.id !== params.noteId)
    await saveYouTubePlayerState(userId, { notes: updatedNotes })
    return {
      success: true,
      message: "Research note removed",
      notes: updatedNotes,
    }
  }

  if (params.action === "add_note") {
    const sec = params.timestampSeconds || 0
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`

    const newNote: YouTubePlayerNote = {
      id: "note_" + Date.now(),
      videoId: params.videoId || state.currentVideo?.id || "unknown",
      videoTitle: params.title || state.currentVideo?.title || "Video",
      timestampSeconds: sec,
      timestampFormatted: formatted,
      text: params.noteText || "Research insight",
      author: params.author || "Copilot",
      createdAt: new Date().toISOString(),
    }

    const updatedNotes = [newNote, ...state.notes]
    await saveYouTubePlayerState(userId, { notes: updatedNotes })

    return {
      success: true,
      message: `Attached research note at [${formatted}]`,
      note: newNote,
    }
  }

  // Target video lookup for play and shortlist
  let targetVideo: YouTubePlaylistItem | null = null

  if (params.videoId) {
    const cleanId = params.videoId.match(/(?:v=|\/embed\/|youtu\.be\/|\/v\/|\/shorts\/)([a-zA-Z0-9_-]{11})/)
      ? params.videoId.match(/(?:v=|\/embed\/|youtu\.be\/|\/v\/|\/shorts\/)([a-zA-Z0-9_-]{11})/)![1]
      : params.videoId.trim()

    try {
      const details = await getVideoDetails(userId, [cleanId])
      if (details.videos && details.videos.length > 0) {
        const v = details.videos[0]
        targetVideo = {
          id: v.videoId || cleanId,
          title: v.title || params.title || `YouTube Video (${cleanId})`,
          channelTitle: v.channelTitle || "YouTube",
          thumbnailUrl: `https://i.ytimg.com/vi/${v.videoId || cleanId}/hqdefault.jpg`,
          views: v.views,
          duration: v.duration,
          folderId: params.folderId || "default",
        }
      }
    } catch {}

    if (!targetVideo) {
      targetVideo = {
        id: cleanId,
        title: params.title || `YouTube Video (${cleanId})`,
        channelTitle: "YouTube",
        thumbnailUrl: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
        folderId: params.folderId || "default",
      }
    }
  } else if (params.query) {
    const searchRes = await searchYouTubeVideos(userId, { query: params.query, maxResults: 1 })
    if (searchRes.videos && searchRes.videos.length > 0) {
      const v = searchRes.videos[0]
      targetVideo = {
        id: v.videoId,
        title: v.title,
        channelTitle: v.channelTitle,
        thumbnailUrl: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        publishedAt: v.publishedAt,
        folderId: params.folderId || "default",
      }
    }
  }

  if (!targetVideo) {
    return {
      success: false,
      error: "Could not identify target video. Please provide a video ID or search query.",
    }
  }

  if (params.action === "play") {
    const existingHistory = (state.history || []).filter((h): h is YouTubePlaylistItem => Boolean(h && h.id))
    const updatedHistory = [targetVideo, ...existingHistory.filter((h) => h.id !== targetVideo!.id)].slice(0, 20)
    await saveYouTubePlayerState(userId, {
      currentVideo: targetVideo,
      history: updatedHistory,
      isPlaying: true,
    })

    return {
      success: true,
      action: "play",
      message: `Now playing: "${targetVideo.title}" in workspace YouTube player`,
      video: targetVideo,
      url: `https://www.youtube.com/watch?v=${targetVideo.id}`,
    }
  }

  if (params.action === "queue" || params.action === "shortlist") {
    // If folderName was specified but not folderId, find or create the folder
    let targetFolderId = params.folderId || "default"
    if (params.folderName) {
      const match = state.folders.find((f) => f.name.toLowerCase() === params.folderName!.toLowerCase())
      if (match) {
        targetFolderId = match.id
      } else {
        const newFolder: ShortlistFolder = {
          id: "folder_" + Date.now().toString(36),
          name: params.folderName,
          color: params.color || "#3b82f6",
          createdAt: new Date().toISOString(),
        }
        state.folders.push(newFolder)
        targetFolderId = newFolder.id
        await saveYouTubePlayerState(userId, { folders: state.folders })
      }
    }

    targetVideo.folderId = targetFolderId

    const queueList = (state.queue || []).filter((q): q is YouTubePlaylistItem => Boolean(q && q.id))
    const existingIdx = queueList.findIndex((q) => q.id === targetVideo!.id)
    let updatedQueue: YouTubePlaylistItem[]
    if (existingIdx >= 0) {
      updatedQueue = queueList.map((q, idx) => (idx === existingIdx ? { ...q, folderId: targetFolderId } : q))
    } else {
      updatedQueue = [...queueList, targetVideo]
    }

    await saveYouTubePlayerState(userId, { queue: updatedQueue })

    const folderObj = state.folders.find((f) => f.id === targetFolderId)

    return {
      success: true,
      action: "shortlist",
      message: `Added "${targetVideo.title}" to folder "${folderObj?.name || "General Shortlist"}"`,
      video: targetVideo,
      folderId: targetFolderId,
      totalQueued: updatedQueue.length,
      url: `https://www.youtube.com/watch?v=${targetVideo.id}`,
    }
  }

  return { success: false, error: "Invalid action" }
}
