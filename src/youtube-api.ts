/**
 * YouTube Data API v3 Service
 * Handles fetching videos based on focus topics
 */

// Video data structure returned by our API
export interface YouTubeVideo {
  videoId: string
  title: string
  thumbnailUrl: string
  channelName: string
  channelId: string
  publishedAt: string
  description: string
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
  const message = error?.message || error?.error?.message || "Unknown error occurred"
  
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
 * 
 * @param topic - The search query/focus topic
 * @param maxResults - Maximum number of videos to return (default: 12)
 * @returns Array of YouTubeVideo objects or throws YouTubeAPIError
 */
export async function fetchVideosForTopic(
  topic: string,
  maxResults: number = 12
): Promise<YouTubeVideo[]> {
  // Validate topic
  if (!topic || topic.trim().length === 0) {
    throw {
      code: 400,
      message: "Focus topic is empty. Please set a topic first.",
      isQuotaError: false,
      isAuthError: false,
      isNetworkError: false
    } as YouTubeAPIError
  }

  // Get API key
  const apiKey = await getYouTubeAPIKey()
  if (!apiKey) {
    throw {
      code: 401,
      message: "YouTube API key not configured. Please add your API key in settings.",
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
    type: "video", // Filter to only videos (not playlists or channels)
    maxResults: Math.min(maxResults, 50).toString(), // API max is 50
    order: "relevance", // Most relevant first
    safeSearch: "moderate",
    key: apiKey
  })

  const url = `${baseUrl}?${params.toString()}`

  try {
    console.log(`[YouTube API] Fetching videos for topic: "${topic}"`)
    
    const response = await fetch(url)
    const data = await response.json()

    // Check for API errors in response
    if (!response.ok || data.error) {
      const apiError = parseAPIError(data.error, response.status)
      console.error("[YouTube API] Error:", apiError)
      throw apiError
    }

    const searchResponse = data as YouTubeSearchResponse
    
    // Filter and map the results
    const videos: YouTubeVideo[] = searchResponse.items
      .filter((item) => {
        // Ensure it's a video (double-check the type filter)
        return item.id.kind === "youtube#video" && item.id.videoId
      })
      .map((item) => ({
        videoId: item.id.videoId!,
        title: decodeHTMLEntities(item.snippet.title),
        thumbnailUrl: getBestThumbnail(item.snippet.thumbnails),
        channelName: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
        description: decodeHTMLEntities(item.snippet.description)
      }))

    console.log(`[YouTube API] Found ${videos.length} videos for topic: "${topic}"`)
    return videos

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
 * Get the best available thumbnail URL
 */
function getBestThumbnail(thumbnails: YouTubeSearchItem["snippet"]["thumbnails"]): string {
  // Prefer high quality, fall back to medium, then default
  return thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url || ""
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
export async function fetchVideosFromStorage(): Promise<YouTubeVideo[]> {
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
