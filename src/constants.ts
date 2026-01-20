/**
 * CageClock Constants
 * Centralized configuration for the extension
 */

export const CONFIG = {
  // ===== ALGORITHM NUDGE =====
  NUDGE_INTERVAL_MINUTES: 30,
  NUDGE_SEARCH_RESULTS: 5,

  // ===== BREAK MODE =====
  BREAK_DURATION_MS: 10 * 60 * 1000, // 10 minutes

  // ===== CACHING =====
  CACHE_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  CURRENT_CACHE_VERSION: 2,

  // ===== API =====
  MAX_RESULTS_PER_PAGE: 24,
  MIN_RESULTS_PER_PAGE: 5,
  API_RETRY_DELAY_MS: 1000,

  // ===== REDIRECT BLOCKED PATHS =====
  BLOCKED_PATHS: [
    "/feed/trending",
    "/gaming",
    "/feed/explore",
    "/shorts",
    "/feed/history",
    "/feed/subscriptions"
  ],

  // ===== VIDEO FILTERING =====
  SHORTS_MAX_SECONDS: 60,
  MUSIC_CATEGORY_ID: "10",

  // ===== STATISTICS =====
  STATS_RESET_HOURS: 24
} as const

export const MESSAGES = {
  // ===== REDIRECT MESSAGES =====
  REDIRECT_BLOCKED: "This page is blocked during focus mode",
  REDIRECT_REDIRECTING: "Redirecting to home...",

  // ===== ERROR MESSAGES =====
  API_KEY_MISSING:
    "YouTube API key not configured. Please add your API key in settings.",
  API_QUOTA_EXCEEDED:
    "YouTube API quota exceeded. Try again later or wait until midnight PT.",
  API_AUTH_ERROR: "Authentication failed. Check your API key.",
  NETWORK_ERROR: "Network error. Please check your internet connection.",

  // ===== SUCCESS MESSAGES =====
  API_KEY_SAVED: "✓ API key saved!",
  CACHE_CLEARED: "Cache cleared successfully",

  // ===== EMPTY STATES =====
  NO_TOPIC: "No focus topic set",
  NO_VIDEOS: "No videos found for this topic",
  LOADING_VIDEOS: "Loading videos..."
} as const

export const ANIMATION = {
  CARD_STAGGER_DELAY_MS: 50,
  CHIP_SPRING_DURATION_MS: 500,
  PULSE_DURATION_MS: 2000,
  SHIMMER_DURATION_MS: 1500
} as const

export const STORAGE_KEYS = {
  IS_ENABLED: "isEnabled",
  FOCUS_TOPIC: "focusTopic",
  YOUTUBE_API_KEY: "youtubeApiKey",
  CACHED_VIDEOS: "cachedVideos",
  CACHED_VIDEOS_TOPIC: "cachedVideosTopic",
  CACHED_VIDEOS_TIME: "cachedVideosTime",
  CACHED_VERSION: "cacheVersion",
  CACHED_NEXT_PAGE_TOKEN: "cachedNextPageToken",
  BREAK_MODE: "breakMode",
  BREAK_END_TIME: "breakEndTime",
  VIDEOS_FILTERED_TODAY: "videosFilteredToday",
  VIDEOS_WATCHED_TODAY: "videosWatchedToday",
  TIME_FOCUSED_TODAY: "timeFocusedToday",
  LAST_STATS_RESET: "lastStatsReset",
  SESSION_START_TIME: "sessionStartTime",
  // API Key Management
  API_KEYS: "apiKeys",
  ACTIVE_API_KEY_ID: "activeApiKeyId"
} as const
