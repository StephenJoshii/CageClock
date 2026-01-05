import { STORAGE_KEYS, type FocusSettings } from "./storage"
import { 
  fetchVideosForTopic, 
  fetchVideosFromStorage,
  type YouTubeVideo, 
  type YouTubeAPIError,
  YOUTUBE_API_KEY_STORAGE,
  setYouTubeAPIKey,
  getYouTubeAPIKey
} from "./youtube-api"

export {}

console.log("CageClock background service worker started")

// Listen for changes in chrome.storage.local
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return

  console.log("Storage changes detected:", changes)

  // Check if isEnabled changed
  if (STORAGE_KEYS.IS_ENABLED in changes) {
    const { oldValue, newValue } = changes[STORAGE_KEYS.IS_ENABLED]
    console.log(`Focus mode changed: ${oldValue} → ${newValue}`)
    
    if (newValue === true) {
      onFocusModeEnabled()
    } else {
      onFocusModeDisabled()
    }
  }

  // Check if focusTopic changed
  if (STORAGE_KEYS.FOCUS_TOPIC in changes) {
    const { oldValue, newValue } = changes[STORAGE_KEYS.FOCUS_TOPIC]
    console.log(`Focus topic changed: "${oldValue}" → "${newValue}"`)
    onFocusTopicChanged(newValue)
  }
})

// Handler when focus mode is enabled
function onFocusModeEnabled() {
  console.log("🎯 Focus mode ENABLED")
  
  // Get current focus topic
  chrome.storage.local.get([STORAGE_KEYS.FOCUS_TOPIC], (result) => {
    const topic = result[STORAGE_KEYS.FOCUS_TOPIC] || "your goal"
    console.log(`Now focusing on: ${topic}`)
    
    // You can add additional logic here, such as:
    // - Setting up alarms for reminders
    // - Modifying browser behavior
    // - Sending notifications
  })
}

// Handler when focus mode is disabled
function onFocusModeDisabled() {
  console.log("💤 Focus mode DISABLED")
  
  // You can add cleanup logic here, such as:
  // - Clearing alarms
  // - Resetting any modifications
}

// Handler when focus topic changes
function onFocusTopicChanged(newTopic: string) {
  if (newTopic) {
    console.log(`📝 Focus topic updated to: ${newTopic}`)
  } else {
    console.log("📝 Focus topic cleared")
  }
}

// Initialize: log current settings on service worker start
async function initializeSettings() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.IS_ENABLED,
    STORAGE_KEYS.FOCUS_TOPIC
  ])
  
  const settings: FocusSettings = {
    isEnabled: result[STORAGE_KEYS.IS_ENABLED] ?? false,
    focusTopic: result[STORAGE_KEYS.FOCUS_TOPIC] ?? ""
  }
  
  console.log("Current settings:", settings)
  
  if (settings.isEnabled) {
    console.log(`🎯 Focus mode is active, focusing on: ${settings.focusTopic || "not set"}`)
  }
}

// Storage key for cached videos
const CACHED_VIDEOS_KEY = "cachedVideos"
const CACHED_VIDEOS_TOPIC_KEY = "cachedVideosTopic"
const CACHED_VIDEOS_TIME_KEY = "cachedVideosTime"
const CACHE_DURATION_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Fetch and cache videos for the current focus topic
 * Returns cached videos if available and not expired
 */
async function fetchAndCacheVideos(forceFresh: boolean = false): Promise<YouTubeVideo[]> {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.FOCUS_TOPIC,
      CACHED_VIDEOS_KEY,
      CACHED_VIDEOS_TOPIC_KEY,
      CACHED_VIDEOS_TIME_KEY
    ])
    
    const currentTopic = result[STORAGE_KEYS.FOCUS_TOPIC]
    const cachedVideos = result[CACHED_VIDEOS_KEY]
    const cachedTopic = result[CACHED_VIDEOS_TOPIC_KEY]
    const cachedTime = result[CACHED_VIDEOS_TIME_KEY]
    
    // Check if we have valid cached videos
    if (!forceFresh && cachedVideos && cachedTopic === currentTopic) {
      const age = Date.now() - (cachedTime || 0)
      if (age < CACHE_DURATION_MS) {
        console.log(`[CageClock] Using cached videos (${Math.round(age / 1000)}s old)`)
        return cachedVideos as YouTubeVideo[]
      }
    }
    
    // Fetch fresh videos
    console.log(`[CageClock] Fetching fresh videos for topic: "${currentTopic}"`)
    const videos = await fetchVideosFromStorage()
    
    // Cache the results
    await chrome.storage.local.set({
      [CACHED_VIDEOS_KEY]: videos,
      [CACHED_VIDEOS_TOPIC_KEY]: currentTopic,
      [CACHED_VIDEOS_TIME_KEY]: Date.now()
    })
    
    console.log(`[CageClock] Cached ${videos.length} videos`)
    return videos
    
  } catch (error) {
    const apiError = error as YouTubeAPIError
    console.error("[CageClock] Failed to fetch videos:", apiError.message)
    
    if (apiError.isQuotaError) {
      console.error("⚠️ YouTube API quota exceeded! Wait until quota resets (usually midnight PT)")
    }
    
    throw error
  }
}

/**
 * Clear the video cache
 */
async function clearVideoCache(): Promise<void> {
  await chrome.storage.local.remove([
    CACHED_VIDEOS_KEY,
    CACHED_VIDEOS_TOPIC_KEY,
    CACHED_VIDEOS_TIME_KEY
  ])
  console.log("[CageClock] Video cache cleared")
}

// Message handling for communication with popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[CageClock] Received message:", message)
  
  switch (message.type) {
    case "FETCH_VIDEOS":
      // Fetch videos for the current focus topic
      fetchAndCacheVideos(message.forceFresh)
        .then((videos) => {
          sendResponse({ success: true, videos })
        })
        .catch((error: YouTubeAPIError) => {
          sendResponse({ 
            success: false, 
            error: {
              code: error.code,
              message: error.message,
              isQuotaError: error.isQuotaError,
              isAuthError: error.isAuthError
            }
          })
        })
      return true // Keep the message channel open for async response
      
    case "FETCH_VIDEOS_FOR_TOPIC":
      // Fetch videos for a specific topic (without saving to storage)
      fetchVideosForTopic(message.topic, message.maxResults || 12)
        .then((videos) => {
          sendResponse({ success: true, videos })
        })
        .catch((error: YouTubeAPIError) => {
          sendResponse({ 
            success: false, 
            error: {
              code: error.code,
              message: error.message,
              isQuotaError: error.isQuotaError,
              isAuthError: error.isAuthError
            }
          })
        })
      return true
      
    case "SET_API_KEY":
      // Set the YouTube API key
      setYouTubeAPIKey(message.apiKey)
        .then(() => {
          sendResponse({ success: true })
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message })
        })
      return true
      
    case "GET_API_KEY":
      // Get the current API key (for checking if it's set)
      getYouTubeAPIKey()
        .then((apiKey) => {
          sendResponse({ success: true, hasApiKey: !!apiKey })
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message })
        })
      return true
      
    case "CLEAR_CACHE":
      // Clear the video cache
      clearVideoCache()
        .then(() => {
          sendResponse({ success: true })
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message })
        })
      return true
      
    default:
      console.log("[CageClock] Unknown message type:", message.type)
      return false
  }
})

initializeSettings()
