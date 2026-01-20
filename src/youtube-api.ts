/**
 * YouTube Data API v3 Service
 * Handles fetching videos based on focus topics
 */

import { CONFIG, MESSAGES } from "./constants"
import { incrementVideosFiltered, getActiveApiKey } from "./storage"

// Video data structure returned by our API
export interface YouTubeVideo {
  videoId: string
  title: string
  thumbnailUrl: string
  channelName: string
  channelId: string
  channelAvatarUrl: string
  publishedAt: string
  description: string
  duration: string // ISO 8601 duration (e.g., "PT4M13S")
  viewCount: string
  categoryId?: string // YouTube category ID (10 = Music)
}

// Result with pagination support
export interface FetchVideosResult {
  videos: YouTubeVideo[]
  nextPageToken?: string
  totalResults?: number
}

// YouTube API response types
interface YouTubeSearchItem {
  kind: string
  id: {
    kind: string
    videoId?: string
    channelId?: string
    playlistId?: string
  }
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: {
      default: { url: string; width: number; height: number }
      medium: { url: string; width: number; height: number }
      high: { url: string; width: number; height: number }
    }
    channelTitle: string
    liveBroadcastContent: string
  }
}

interface YouTubeSearchResponse {
  kind: string
  etag: string
  nextPageToken?: string
  prevPageToken?: string
  pageInfo: {
    totalResults: number
    resultsPerPage: number
  }
  items: YouTubeSearchItem[]
}

// Video details response types
interface YouTubeVideoDetailsItem {
  id: string
  contentDetails: {
    duration: string
  }
  statistics: {
    viewCount: string
    likeCount?: string
    commentCount?: string
  }
  snippet?: {
    categoryId: string
  }
}

interface YouTubeVideoDetailsResponse {
  items: YouTubeVideoDetailsItem[]
}

// Channel details response types
interface YouTubeChannelItem {
  id: string
  snippet: {
    thumbnails: {
      default: { url: string }
      medium?: { url: string }
    }
  }
}

interface YouTubeChannelResponse {
  items: YouTubeChannelItem[]
}

// API Error types
export interface YouTubeAPIError {
  code: number
  message: string
  isQuotaError: boolean
  isAuthError: boolean
  isNetworkError: boolean
}

// Storage key for API key
export const YOUTUBE_API_KEY_STORAGE = "youtubeApiKey"

/**
 * Get the YouTube API key from storage
 */
export async function getYouTubeAPIKey(): Promise<string | null> {
  const result = await chrome.storage.local.get([YOUTUBE_API_KEY_STORAGE])
  return result[YOUTUBE_API_KEY_STORAGE] || null
}

/**
 * Set the YouTube API key in storage
 */
export async function setYouTubeAPIKey(apiKey: string): Promise<void> {
  await chrome.storage.local.set({ [YOUTUBE_API_KEY_STORAGE]: apiKey })
}

/**
 * Check if an error is a quota exceeded error
 */
function isQuotaError(error: any): boolean {
  if (error?.code === 403) {
    const message = error?.message?.toLowerCase() || ""
    return (
      message.includes("quota") ||
      message.includes("exceeded") ||
      message.includes("dailylimitexceeded") ||
      message.includes("quotaexceeded")
    )
  }
  return false
}

/**
 * Check if an error is an authentication error
 */
function isAuthError(error: any): boolean {
  return error?.code === 401 || error?.code === 403
}

/**
 * Parse YouTube API error response
 */
function parseAPIError(error: any, statusCode?: number): YouTubeAPIError {
  const code = error?.code || statusCode || 500
  const message =
    error?.message || error?.error?.message || "Unknown error occurred"

  return {
    code,
    message,
    isQuotaError: isQuotaError(error),
    isAuthError: isAuthError(error) && !isQuotaError(error),
    isNetworkError: !statusCode && error instanceof TypeError
  }
}

/**
 * Fetch top videos for a given topic using YouTube Data API v3
 * Supports pagination with nextPageToken
 *
 * @param topic - The search query/focus topic
 * @param maxResults - Maximum number of videos to return (default: 24)
 * @param pageToken - Optional page token for pagination
 * @returns FetchVideosResult with videos and nextPageToken
 */
export async function fetchVideosForTopic(
  topic: string,
  maxResults: number = 24,
  pageToken?: string
): Promise<FetchVideosResult> {
  // Validate topic
  if (!topic || topic.trim().length === 0) {
    throw {
      code: 400,
      message:
        MESSAGES.NO_TOPIC || "Focus topic is empty. Please set a topic first.",
      isQuotaError: false,
      isAuthError: false,
      isNetworkError: false
    } as YouTubeAPIError
  }

  // Get API key
  const apiKey = await getActiveApiKey()
  if (!apiKey) {
    throw {
      code: 401,
      message: MESSAGES.API_KEY_MISSING,
      isQuotaError: false,
      isAuthError: true,
      isNetworkError: false
    } as YouTubeAPIError
  }

  // Build the API URL
  const baseUrl = "https://www.googleapis.com/youtube/v3/search"
  const params = new URLSearchParams({
    part: "snippet",
    q: topic.trim(),
    type: "video",
    maxResults: Math.min(maxResults, 50).toString(),
    order: "relevance",
    safeSearch: "moderate",
    key: apiKey
  })

  // Add page token if provided
  if (pageToken) {
    params.append("pageToken", pageToken)
  }

  const url = `${baseUrl}?${params.toString()}`

  try {
    console.log(
      `[YouTube API] Fetching videos for topic: "${topic}"${pageToken ? ` (page: ${pageToken})` : ""}`
    )

    const response = await fetch(url)
    const data = await response.json()

    // Check for API errors in response
    if (!response.ok || data.error) {
      const apiError = parseAPIError(data.error, response.status)
      console.error("[YouTube API] Error:", apiError)
      throw apiError
    }

    const searchResponse = data as YouTubeSearchResponse

    // Filter valid videos
    const validItems = searchResponse.items.filter((item) => {
      return item.id.kind === "youtube#video" && item.id.videoId
    })

    if (validItems.length === 0) {
      return {
        videos: [],
        nextPageToken: searchResponse.nextPageToken,
        totalResults: searchResponse.pageInfo.totalResults
      }
    }

    // Get video IDs and channel IDs for additional details
    const videoIds = validItems.map((item) => item.id.videoId!).join(",")
    const channelIds = [
      ...new Set(validItems.map((item) => item.snippet.channelId))
    ].join(",")

    // Fetch video details (duration, view count) in parallel with channel details
    const [videoDetailsResponse, channelResponse] = await Promise.all([
      fetchVideoDetails(videoIds, apiKey),
      fetchChannelAvatars(channelIds, apiKey)
    ])

    // Create maps for quick lookup
    const videoDetailsMap = new Map<
      string,
      { duration: string; viewCount: string; categoryId: string }
    >()
    videoDetailsResponse.items.forEach((item) => {
      videoDetailsMap.set(item.id, {
        duration: item.contentDetails.duration,
        viewCount: item.statistics.viewCount,
        categoryId: item.snippet?.categoryId || ""
      })
    })

    const channelAvatarMap = new Map<string, string>()
    channelResponse.items.forEach((item) => {
      channelAvatarMap.set(
        item.id,
        item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default.url
      )
    })

    // Map the results with all details
    const allVideos: YouTubeVideo[] = validItems.map((item) => {
      const details = videoDetailsMap.get(item.id.videoId!) || {
        duration: "PT0S",
        viewCount: "0",
        categoryId: ""
      }
      return {
        videoId: item.id.videoId!,
        title: decodeHTMLEntities(item.snippet.title),
        thumbnailUrl: getBestThumbnail(item.snippet.thumbnails),
        channelName: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        channelAvatarUrl: channelAvatarMap.get(item.snippet.channelId) || "",
        publishedAt: item.snippet.publishedAt,
        description: decodeHTMLEntities(item.snippet.description),
        duration: details.duration,
        viewCount: details.viewCount,
        categoryId: details.categoryId
      }
    })

    // Filter out Shorts (< 60 seconds) and Music videos (categoryId = 10)
    let filteredCount = 0
    const videos = allVideos.filter((video) => {
      // Parse duration to check for Shorts
      const durationSeconds = parseDurationToSeconds(video.duration)
      const isShort =
        durationSeconds > 0 && durationSeconds < CONFIG.SHORTS_MAX_SECONDS

      // Check if it's a music video (categoryId 10 = Music)
      const isMusic = video.categoryId === CONFIG.MUSIC_CATEGORY_ID

      // Also filter by title patterns that indicate music/songs
      const titleLower = video.title.toLowerCase()
      const isSongByTitle =
        titleLower.includes("official music video") ||
        titleLower.includes("official video") ||
        titleLower.includes("official audio") ||
        titleLower.includes("lyric video") ||
        titleLower.includes("lyrics video") ||
        titleLower.includes("music video") ||
        (titleLower.includes("ft.") && titleLower.includes("official")) ||
        (titleLower.includes("feat.") && titleLower.includes("official"))

      const shouldFilter = isShort || isMusic || isSongByTitle

      if (shouldFilter) {
        filteredCount++
        if (isShort) {
          console.log(
            `[YouTube API] Filtered out Short: "${video.title}" (${durationSeconds}s)`
          )
        }
        if (isMusic || isSongByTitle) {
          console.log(
            `[YouTube API] Filtered out Music: "${video.title}" (category: ${video.categoryId})`
          )
        }
      }

      return !shouldFilter
    })

    // Track statistics asynchronously (don't block the main flow)
    if (filteredCount > 0) {
      incrementVideosFiltered(filteredCount).catch((err) => {
        console.error("[YouTube API] Failed to update statistics:", err)
      })
    }

    console.log(
      `[YouTube API] Found ${allVideos.length} videos, ${videos.length} after filtering (${filteredCount} filtered) for topic: "${topic}"`
    )
    return {
      videos,
      nextPageToken: searchResponse.nextPageToken,
      totalResults: searchResponse.pageInfo.totalResults
    }
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw {
        code: 0,
        message: "Network error. Please check your internet connection.",
        isQuotaError: false,
        isAuthError: false,
        isNetworkError: true
      } as YouTubeAPIError
    }

    // Re-throw if already a YouTubeAPIError
    if ((error as YouTubeAPIError).code !== undefined) {
      throw error
    }

    // Unknown error
    throw {
      code: 500,
      message: `Unexpected error: ${(error as Error).message}`,
      isQuotaError: false,
      isAuthError: false,
      isNetworkError: false
    } as YouTubeAPIError
  }
}

/**
 * Fetch video details (duration, view count, category) for multiple videos
 */
async function fetchVideoDetails(
  videoIds: string,
  apiKey: string
): Promise<YouTubeVideoDetailsResponse> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds}&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok || data.error) {
      console.error("[YouTube API] Error fetching video details:", data.error)
      return { items: [] }
    }

    return data as YouTubeVideoDetailsResponse
  } catch (error) {
    console.error("[YouTube API] Failed to fetch video details:", error)
    return { items: [] }
  }
}

/**
 * Fetch channel avatars for multiple channels
 */
async function fetchChannelAvatars(
  channelIds: string,
  apiKey: string
): Promise<YouTubeChannelResponse> {
  if (!channelIds || channelIds.trim().length === 0) {
    console.warn("[YouTube API] No channel IDs provided, skipping avatar fetch")
    return { items: [] }
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds}&key=${apiKey}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      console.warn(
        `[YouTube API] Channel avatar fetch failed: ${response.status} ${response.statusText}`
      )
      return { items: [] }
    }

    const data = await response.json()

    if (data.error) {
      console.warn(
        `[YouTube API] Channel avatar fetch API error:`,
        data.error.message || data.error
      )
      return { items: [] }
    }

    return data as YouTubeChannelResponse
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    console.warn(
      `[YouTube API] Failed to fetch channel avatars: ${errorMessage}`
    )
    return { items: [] }
  }
}

/**
 * Get the best available thumbnail URL
 */
function getBestThumbnail(
  thumbnails: YouTubeSearchItem["snippet"]["thumbnails"]
): string {
  // Prefer high quality, fall back to medium, then default
  return (
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  )
}

/**
 * Parse ISO 8601 duration (PT4M13S) to seconds
 */
function parseDurationToSeconds(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || "0", 10)
  const minutes = parseInt(match[2] || "0", 10)
  const seconds = parseInt(match[3] || "0", 10)

  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Decode HTML entities in strings (YouTube API returns encoded text)
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&#x27;": "'",
    "&#x2F;": "/",
    "&#x60;": "`",
    "&#x3D;": "="
  }

  return text.replace(/&[#\w]+;/g, (match) => entities[match] || match)
}

/**
 * Fetch videos using the topic from storage
 * Convenience wrapper that reads the topic from chrome.storage
 */
export async function fetchVideosFromStorage(): Promise<FetchVideosResult> {
  const result = await chrome.storage.local.get(["focusTopic"])
  const topic = result.focusTopic

  if (!topic) {
    throw {
      code: 400,
      message: "No focus topic set. Please enter a topic in the popup.",
      isQuotaError: false,
      isAuthError: false,
      isNetworkError: false
    } as YouTubeAPIError
  }

  return fetchVideosForTopic(topic)
}
