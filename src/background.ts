import { type FocusSettings, incrementVideosFiltered } from "./storage"
import { STORAGE_KEYS, CONFIG } from "./constants"
import {
  fetchVideosForTopic,
  fetchVideosFromStorage,
  type YouTubeVideo,
  type FetchVideosResult,
  type YouTubeAPIError,
  YOUTUBE_API_KEY_STORAGE,
  setYouTubeAPIKey,
  getYouTubeAPIKey
} from "./youtube-api"

export {}

console.log("CageClock background service worker started")

// ===== ALGORITHM NUDGE ALARM =====
const ALGORITHM_NUDGE_ALARM = "algorithmNudge"

// ===== BREAK MODE CONSTANTS =====
const BREAK_CHECK_ALARM = "breakCheck"

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

  // Check if break mode changed
  if (STORAGE_KEYS.BREAK_MODE in changes) {
    if (changes[STORAGE_KEYS.BREAK_MODE].newValue === true) {
      onBreakModeEnabled()
    }
  }
})

// Handler when focus mode is enabled
function onFocusModeEnabled() {
  console.log("🎯 Focus mode ENABLED")

  // Start the Algorithm Nudge alarm
  startAlgorithmNudge()

  // Get current focus topic
  chrome.storage.local.get([STORAGE_KEYS.FOCUS_TOPIC], (result) => {
    const topic = result[STORAGE_KEYS.FOCUS_TOPIC] || "your goal"
    console.log(`Now focusing on: ${topic}`)

    // Perform initial nudge
    performAlgorithmNudge(topic)
  })
}

// Handler when focus mode is disabled
function onFocusModeDisabled() {
  console.log("💤 Focus mode DISABLED")

  // Stop the Algorithm Nudge alarm
  stopAlgorithmNudge()
}

// Handler when focus topic changes
function onFocusTopicChanged(newTopic: string) {
  if (newTopic) {
    console.log(`📝 Focus topic updated to: ${newTopic}`)
    // Perform a nudge with the new topic
    performAlgorithmNudge(newTopic)
  } else {
    console.log("📝 Focus topic cleared")
  }
}

// ===== API KEY VERIFICATION =====

/**
 * Verify if an API key is valid by making a test request
 */
async function verifyApiKey(apiKey: string): Promise<boolean> {
  try {
    const testUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${apiKey}`

    const response = await fetch(testUrl)

    if (!response.ok) {
      console.error(
        "[CageClock] API key verification failed:",
        response.status,
        response.statusText
      )
      return false
    }

    const data = await response.json()

    if (data.error) {
      console.error("[CageClock] API key verification error:", data.error)

      if (data.error.message) {
        throw new Error(data.error.message)
      }

      return false
    }

    console.log("[CageClock] API key verified successfully")
    return true
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error"
    console.error("[CageClock] API key verification error:", errorMessage)
    throw new Error(errorMessage)
  }
}

// ===== ALGORITHM NUDGE FUNCTIONS =====

/**
 * Start the Algorithm Nudge alarm (runs every 30 minutes)
 */
function startAlgorithmNudge() {
  chrome.alarms.create(ALGORITHM_NUDGE_ALARM, {
    delayInMinutes: CONFIG.NUDGE_INTERVAL_MINUTES,
    periodInMinutes: CONFIG.NUDGE_INTERVAL_MINUTES
  })
  console.log(
    `[AlgorithmNudge] Started - will nudge every ${CONFIG.NUDGE_INTERVAL_MINUTES} minutes`
  )
}

/**
 * Stop the Algorithm Nudge alarm
 */
function stopAlgorithmNudge() {
  chrome.alarms.clear(ALGORITHM_NUDGE_ALARM)
  console.log("[AlgorithmNudge] Stopped")
}

/**
 * Perform an algorithm nudge by doing a hidden search
 * This influences YouTube's recommendation algorithm
 */
async function performAlgorithmNudge(topic: string) {
  if (!topic) {
    console.log("[AlgorithmNudge] No topic set, skipping")
    return
  }

  console.log(`[AlgorithmNudge] Nudging algorithm with topic: "${topic}"`)

  try {
    // Fetch videos for the topic (this triggers a YouTube API search)
    // The API call itself helps signal interest to YouTube
    const result = await fetchVideosForTopic(topic, 5)
    console.log(
      `[AlgorithmNudge] Found ${result.videos.length} videos for "${topic}"`
    )

    // Optionally: Open a video in the background to strengthen the signal
    // This is more aggressive but more effective
    // We'll just do the search for now
  } catch (error) {
    console.error("[AlgorithmNudge] Error:", error)
  }
}

// ===== BREAK MODE FUNCTIONS =====

/**
 * Called when break mode is enabled
 */
function onBreakModeEnabled() {
  console.log("☕ Break mode ENABLED - 10 minute break started")

  // Set up alarm to end break
  chrome.alarms.create(BREAK_CHECK_ALARM, {
    delayInMinutes: CONFIG.BREAK_DURATION_MS / (60 * 1000)
  })
}

/**
 * End the break and re-enable focus mode
 */
async function endBreakMode() {
  console.log("☕ Break mode ENDED - resuming focus")

  await chrome.storage.local.set({
    [STORAGE_KEYS.BREAK_MODE]: false,
    [STORAGE_KEYS.BREAK_END_TIME]: null,
    [STORAGE_KEYS.IS_ENABLED]: true
  })

  // Notify any open YouTube tabs
  const tabs = await chrome.tabs.query({ url: "*://*.youtube.com/*" })
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: "BREAK_ENDED" }).catch(() => {})
    }
  }
}

/**
 * Start emergency break mode
 */
async function startBreakMode(): Promise<{
  success: boolean
  endTime: number
}> {
  const endTime = Date.now() + CONFIG.BREAK_DURATION_MS

  await chrome.storage.local.set({
    [STORAGE_KEYS.BREAK_MODE]: true,
    [STORAGE_KEYS.BREAK_END_TIME]: endTime,
    [STORAGE_KEYS.IS_ENABLED]: false // Disable focus mode during break
  })

  // Set alarm to end break
  chrome.alarms.create(BREAK_CHECK_ALARM, {
    when: endTime
  })

  console.log(
    `☕ Break started, ends at ${new Date(endTime).toLocaleTimeString()}`
  )

  return { success: true, endTime }
}

// ===== ALARM LISTENER =====
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`[Alarm] Fired: ${alarm.name}`)

  if (alarm.name === ALGORITHM_NUDGE_ALARM) {
    // Check if focus mode is still enabled
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.IS_ENABLED,
      STORAGE_KEYS.FOCUS_TOPIC
    ])
    if (result[STORAGE_KEYS.IS_ENABLED] && result[STORAGE_KEYS.FOCUS_TOPIC]) {
      performAlgorithmNudge(result[STORAGE_KEYS.FOCUS_TOPIC])
    }
  }

  if (alarm.name === BREAK_CHECK_ALARM) {
    // Break is over, re-enable focus mode
    endBreakMode()
  }
})

// Initialize: log current settings on service worker start
async function initializeSettings() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.IS_ENABLED,
    STORAGE_KEYS.FOCUS_TOPIC,
    STORAGE_KEYS.BREAK_MODE,
    STORAGE_KEYS.BREAK_END_TIME
  ])

  // Check if there's an ongoing break
  if (result[STORAGE_KEYS.BREAK_MODE] && result[STORAGE_KEYS.BREAK_END_TIME]) {
    const endTime = result[STORAGE_KEYS.BREAK_END_TIME]
    if (Date.now() < endTime) {
      // Break is still active, set alarm for remaining time
      chrome.alarms.create(BREAK_CHECK_ALARM, { when: endTime })
      console.log(
        `☕ Break in progress, ends at ${new Date(endTime).toLocaleTimeString()}`
      )
    } else {
      // Break has expired, end it
      endBreakMode()
    }
  }

  const settings: FocusSettings = {
    isEnabled: result[STORAGE_KEYS.IS_ENABLED] ?? false,
    focusTopic: result[STORAGE_KEYS.FOCUS_TOPIC] ?? ""
  }

  console.log("Current settings:", settings)

  if (settings.isEnabled) {
    console.log(
      `🎯 Focus mode is active, focusing on: ${settings.focusTopic || "not set"}`
    )
    // Restart the nudge alarm if focus mode was already on
    startAlgorithmNudge()
  }
}

// Storage key for cached videos (deprecated, using CONFIG.STORAGE_KEYS now)
const CACHED_VIDEOS_KEY = "cachedVideos"
const CACHED_VIDEOS_TOPIC_KEY = "cachedVideosTopic"
const CACHED_VIDEOS_TIME_KEY = "cachedVideosTime"
const CACHED_VERSION_KEY = "cacheVersion"

/**
 * Fetch and cache videos for the current focus topic
 * Returns cached videos if available and not expired
 */
async function fetchAndCacheVideos(
  forceFresh: boolean = false
): Promise<FetchVideosResult> {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.FOCUS_TOPIC,
      CACHED_VIDEOS_KEY,
      CACHED_VIDEOS_TOPIC_KEY,
      CACHED_VIDEOS_TIME_KEY,
      CACHED_VERSION_KEY,
      "cachedNextPageToken"
    ])

    const currentTopic = result[STORAGE_KEYS.FOCUS_TOPIC]
    const cachedVideos = result[CACHED_VIDEOS_KEY]
    const cachedTopic = result[CACHED_VIDEOS_TOPIC_KEY]
    const cachedTime = result[CACHED_VIDEOS_TIME_KEY]
    const cachedVersion = result[CACHED_VERSION_KEY]
    const cachedNextPageToken = result["cachedNextPageToken"]

    // Check if we have valid cached videos (matching topic, version, and not expired)
    const isVersionMatch = cachedVersion === CONFIG.CURRENT_CACHE_VERSION
    if (
      !forceFresh &&
      cachedVideos &&
      cachedTopic === currentTopic &&
      isVersionMatch
    ) {
      const age = Date.now() - (cachedTime || 0)
      if (age < CONFIG.CACHE_DURATION_MS) {
        console.log(
          `[CageClock] Using cached videos (${Math.round(age / 1000)}s old)`
        )
        return {
          videos: cachedVideos as YouTubeVideo[],
          nextPageToken: cachedNextPageToken
        }
      }
    }

    // Fetch fresh videos (cache invalid due to version mismatch, topic change, or expiry)
    if (!isVersionMatch) {
      console.log(
        `[CageClock] Cache version mismatch (${cachedVersion} vs ${CONFIG.CURRENT_CACHE_VERSION}), fetching fresh`
      )
    }
    console.log(
      `[CageClock] Fetching fresh videos for topic: "${currentTopic}"`
    )
    const fetchResult = await fetchVideosForTopic(
      currentTopic,
      CONFIG.MAX_RESULTS_PER_PAGE
    )

    // Cache the results with version
    await chrome.storage.local.set({
      [CACHED_VIDEOS_KEY]: fetchResult.videos,
      [CACHED_VIDEOS_TOPIC_KEY]: currentTopic,
      [CACHED_VIDEOS_TIME_KEY]: Date.now(),
      [CACHED_VERSION_KEY]: CONFIG.CURRENT_CACHE_VERSION,
      cachedNextPageToken: fetchResult.nextPageToken
    })

    // Track statistics - count filtered videos
    // Note: The API already filters out Shorts and Music, so we don't need to count those here
    // But we could track how many total results were found vs how many made it through filters
    console.log(`[CageClock] Cached ${fetchResult.videos.length} videos`)

    console.log(`[CageClock] Cached ${fetchResult.videos.length} videos`)
    return fetchResult
  } catch (error) {
    const apiError = error as YouTubeAPIError
    console.error("[CageClock] Failed to fetch videos:", apiError.message)

    if (apiError.isQuotaError) {
      console.error(
        "⚠️ YouTube API quota exceeded! Wait until quota resets (usually midnight PT)"
      )
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
    CACHED_VIDEOS_TIME_KEY,
    CACHED_VERSION_KEY,
    "cachedNextPageToken"
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
        .then((result) => {
          sendResponse({
            success: true,
            videos: result.videos,
            nextPageToken: result.nextPageToken
          })
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

    case "FETCH_MORE_VIDEOS":
      // Fetch additional videos with page token
      chrome.storage.local.get([STORAGE_KEYS.FOCUS_TOPIC], async (result) => {
        const topic = result[STORAGE_KEYS.FOCUS_TOPIC]
        if (!topic) {
          sendResponse({
            success: false,
            error: { message: "No focus topic set" }
          })
          return
        }

        try {
          const fetchResult = await fetchVideosForTopic(
            topic,
            24,
            message.pageToken
          )
          sendResponse({
            success: true,
            videos: fetchResult.videos,
            nextPageToken: fetchResult.nextPageToken
          })
        } catch (error) {
          const apiError = error as YouTubeAPIError
          sendResponse({
            success: false,
            error: {
              code: apiError.code,
              message: apiError.message,
              isQuotaError: apiError.isQuotaError,
              isAuthError: apiError.isAuthError
            }
          })
        }
      })
      return true

    case "FETCH_VIDEOS_FOR_TOPIC":
      // Fetch videos for a specific topic (without saving to storage)
      fetchVideosForTopic(
        message.topic,
        message.maxResults || 24,
        message.pageToken
      )
        .then((result) => {
          sendResponse({
            success: true,
            videos: result.videos,
            nextPageToken: result.nextPageToken
          })
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

    case "START_BREAK":
      // Start emergency break mode
      startBreakMode()
        .then((result) => {
          sendResponse(result)
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message })
        })
      return true

    case "GET_BREAK_STATUS":
      // Get current break status
      chrome.storage.local
        .get([STORAGE_KEYS.BREAK_MODE, STORAGE_KEYS.BREAK_END_TIME])
        .then((result) => {
          const isOnBreak = result[STORAGE_KEYS.BREAK_MODE] ?? false
          const endTime = result[STORAGE_KEYS.BREAK_END_TIME] ?? null
          const remainingMs = endTime ? Math.max(0, endTime - Date.now()) : 0
          sendResponse({
            success: true,
            isOnBreak,
            endTime,
            remainingMs
          })
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message })
        })
      return true

    case "END_BREAK":
      // End break early
      endBreakMode()
        .then(() => {
          sendResponse({ success: true })
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message })
        })
      return true

    case "VERIFY_API_KEY":
      // Verify API key by making a test request
      verifyApiKey(message.apiKey)
        .then((isValid) => {
          if (isValid) {
            sendResponse({ valid: true })
          } else {
            sendResponse({ valid: false, error: "Invalid API key" })
          }
        })
        .catch((error) => {
          sendResponse({ valid: false, error: error.message })
        })
      return true

    default:
      console.log("[CageClock] Unknown message type:", message.type)
      return false
  }
})

initializeSettings()
