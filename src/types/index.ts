/**
 * Shared types for the entire CageClock extension
 */

export type { Chrome } from "background"

export type BreakMode = "enabled" | "disabled"

export interface AlarmService {
  startAlgorithmNudge(): Promise<void>
  stopAlgorithmNudge(): Promise<void>
  startBreakCheckAlarm(endTime: number): Promise<void>
  clearAllAlarms(): Promise<void>
}

export interface StorageService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  getMany<T extends Record<string, unknown>>(
    keys: string[]
  ): Promise<Partial<T>>
  setMany<T extends Record<string, unknown>>(values: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

export interface BreakService {
  startBreakMode(): Promise<{
    success: boolean
    endTime: number
  }>
  endBreakMode(): Promise<void>
  getBreakStatus(): Promise<{
    isOnBreak: boolean
    endTime: number | null
  }>
  checkBreakExpiry(): Promise<boolean>
}

export interface Logger {
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, error?: Error | unknown): void
  debug(message: string, data?: unknown): void
}

export interface AppConfig {
  NUDGE_INTERVAL_MINUTES: number
  NUDGE_SEARCH_RESULTS: number
  BREAK_DURATION_MS: number
  CACHE_DURATION_MS: number
  CURRENT_CACHE_VERSION: number
  MAX_RESULTS_PER_PAGE: number
  MIN_RESULTS_PER_PAGE: number
  API_RETRY_DELAY_MS: number
  BLOCKED_PATHS: string[]
  SHORTS_MAX_SECONDS: number
  MUSIC_CATEGORY_ID: string
  STATS_RESET_HOURS: number
}

export interface AppMessages {
  ALGORITHM_NUDGE_STARTED: string
  ALGORITHM_NUDGE_COMPLETED: string
  BREAK_STARTED: string
  BREAK_ENDED: string
  STORAGE_ERROR: string
  API_KEY_INVALID: string
  TOPIC_EMPTY: string
  TOPIC_TOO_LONG: string
}

export interface StorageKeys {
  IS_ENABLED: string
  FOCUS_TOPIC: string
  API_KEYS: string
  ACTIVE_API_KEY_ID: string
  CACHED_VIDEOS: string
  CACHED_VIDEOS_TOPIC: string
  CACHED_VIDEOS_TIME: string
  CACHED_VERSION: string
  CACHED_NEXT_PAGE_TOKEN: string
  BREAK_MODE: string
  BREAK_END_TIME: string
  VIDEOS_FILTERED_TODAY: string
  VIDEOS_WATCHED_TODAY: string
  TIME_FOCUSED_TODAY: string
  LAST_STATS_RESET: string
  SESSION_START_TIME: string
}

export interface ApiKeyData {
  id: string
  name: string
  key: string
  isValid: boolean
  lastVerified: number
}

export interface YouTubeVideo {
  videoId: string
  title: string
  thumbnailUrl: string
  channelName: string
  channelId: string
  channelAvatarUrl: string
  publishedAt: string
  description: string
  duration: string
  viewCount: string
  categoryId: string
}

export interface FetchVideosResult {
  videos: YouTubeVideo[]
  nextPageToken?: string
  totalResults?: number
}

export interface YouTubeAPIError {
  code: number
  message: string
  isQuotaError: boolean
  isAuthError: boolean
  isNetworkError: boolean
}
