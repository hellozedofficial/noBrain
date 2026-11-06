import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import {
  searchYouTubeVideos,
  getVideoDetails,
  getVideoComments,
  getChannelDetails,
} from "@/lib/copilot/youtube"
import { getYouTubePlayerState, DEFAULT_DISCOVERY_TOPICS } from "@/lib/copilot/youtubePlayer"
import { googleApiFetch } from "@/lib/copilot/googleAuth"

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action") || "search"

    if (action === "recommendations") {
      const state = await getYouTubePlayerState(user.id)
      let query = ""
      let reason = "Trending in AI & Modern Tech"

      // Check user watch history and shortlists
      const recentTitles: string[] = [
        ...(state.history || []).map((h) => h.title),
        ...(state.queue || []).map((q) => q.title),
      ].filter(Boolean)

      if (recentTitles.length > 0) {
        // Pick a keyword from user's history or shortlist
        const sample = recentTitles[Math.floor(Math.random() * recentTitles.length)]
        // Extract meaningful keywords
        const cleanSample = sample
          .replace(/[\(\)\[\]\|:!]/g, " ")
          .split(" ")
          .filter((w) => w.length > 3 && !/tutorial|video|guide|review|watch|about|full/i.test(w))
          .slice(0, 3)
          .join(" ")

        if (cleanSample.trim().length > 3) {
          query = cleanSample
          reason = `Based on your recent research ("${cleanSample}")`
        }
      }

      // If no history or sample too short, rotate from default discovery topics
      if (!query) {
        const randIndex = Math.floor(Math.random() * DEFAULT_DISCOVERY_TOPICS.length)
        query = DEFAULT_DISCOVERY_TOPICS[randIndex]
        reason = "Curated AI & Developer Insights"
      }

      const results = await searchYouTubeVideos(user.id, {
        query,
        maxResults: 8,
        order: "relevance",
      })

      return NextResponse.json({
        success: true,
        topic: query,
        reason,
        videos: results.videos || [],
      })
    }

    if (action === "comments") {
      const videoId = searchParams.get("videoId") || ""
      const maxResults = Number(searchParams.get("maxResults") || 20)
      const res = await getVideoComments(user.id, videoId, maxResults)
      return NextResponse.json(res)
    }

    if (action === "details") {
      const videoIds = (searchParams.get("videoIds") || "").split(",").filter(Boolean)
      const res = await getVideoDetails(user.id, videoIds)
      return NextResponse.json(res)
    }

    if (action === "channel") {
      const handle = searchParams.get("handle") || undefined
      const res = await getChannelDetails(user.id, handle)
      return NextResponse.json(res)
    }

    // Default: search videos
    const query = searchParams.get("q") || searchParams.get("query") || "Top AI Agents in 2026"
    const maxResults = Number(searchParams.get("maxResults") || 10)
    const order = (searchParams.get("order") as any) || "relevance"

    const results = await searchYouTubeVideos(user.id, {
      query,
      maxResults,
      order,
    })

    return NextResponse.json(results)
  } catch (err: any) {
    console.error("GET /api/copilot/youtube error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, videoId, text } = body

    if (action === "comment" && videoId && text) {
      const cleanId = videoId.match(/(?:v=|\/embed\/|youtu\.be\/|\/v\/|\/shorts\/)([a-zA-Z0-9_-]{11})/)
        ? videoId.match(/(?:v=|\/embed\/|youtu\.be\/|\/v\/|\/shorts\/)([a-zA-Z0-9_-]{11})/)![1]
        : videoId.trim()

      const payload = {
        snippet: {
          videoId: cleanId,
          topLevelComment: {
            snippet: {
              textOriginal: text,
            },
          },
        },
      }

      const res = await googleApiFetch(user.id, "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorText = await res.text()
        return NextResponse.json(
          { success: false, error: `Could not post YouTube comment (${res.status}): ${errorText}` },
          { status: res.status }
        )
      }

      const data = await res.json()
      return NextResponse.json({
        success: true,
        message: "Comment successfully posted on YouTube video",
        comment: data,
      })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    console.error("POST /api/copilot/youtube error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
