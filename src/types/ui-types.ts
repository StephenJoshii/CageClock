/**
 * Shared types for CageClock extension
 * Centralized type definitions
 */

// ===== UI COMPONENT TYPES =====

export interface LoadingStateProps {
  variant?: "skeleton" | "spinner" | "dots"
  size?: "small" | "medium" | "large"
  label?: string
  fullScreen?: boolean
}

export interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ButtonProps {
  variant?: "primary" | "secondary" | "accent" | "outline" | "text"
  size?: "xs" | "small" | "medium" | "large"
  children: ReactNode
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  onClick?: () => void
}

export interface InputProps {
  type?: "text" | "search" | "email" | "password" | "url"
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  error?: string
  disabled?: boolean
  icon?: ReactNode
  helpText?: string
  size?: "small" | "medium" | "large"
  autoComplete?: string
}

export interface CardProps {
  children: ReactNode
  variant?: "default" | "elevated" | "outlined"
  hover?: boolean
  onClick?: () => void
  className?: string
  padding?: "none" | "small" | "medium" | "large"
}

export interface BadgeProps {
  children: ReactNode
  variant?: "default" "success" | "warning" | "error"
  size?: "small" | "medium" | "large"
  pulse?: boolean
}

// ===== DATA TYPES =====

export interface ApiKey {
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

export interface Statistics {
  videosFiltered: number
  videosWatched: number
  timeFocused: number
}

// ===== STORAGE KEYS =====

export interface StorageKeys {
  IS_ENABLED: "isEnabled"
  FOCUS_TOPIC: "focusTopic"
  API_KEYS: "apiKeys"
  ACTIVE_API_KEY_ID: "activeApiKeyId"
  CACHED_VIDEOS: "cachedVideos"
  CONFIGURED_TOPIC: "configuredTopic"
  CACHED_VIDEOS_TIME: "cachedVideosTime"
  CACHE_VERSION: "cacheVersion"
  CACHED_NEXT_PAGE_TOKEN: "cachedNextPageToken"
  BREAK_MODE: "breakMode"
  BREAK_END_TIME: "breakEndTime"
  VIDEOS_FILTERED_TODAY: "videosFilteredToday"
  VIDEOS_WATCHED_TODAY: "videosWatchedToday"
  TIME_FOCUSED_TODAY: "timeFocusedToday"
  LAST_STATS_RESET: "lastStatsReset"
  SESSION_START_TIME: "sessionStartTime"
}

// ===== CONFIG TYPES =====

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

// ===== MESSAGES TYPES =====

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

// ===== VALIDATION TYPES =====

export interface ValidationConfig {
  MIN_TOPIC_LENGTH: number
  MAX_TOPIC_LENGTH: number
  MIN_API_KEY_LENGTH: number
  MAX_API_KEY_LENGTH: number
  TOPIC_REGEX: RegExp
  API_KEY_REGEX: RegExp
}

// ===== SERVICE INTERFACES =====

export interface AlarmService {
  startAlgorithmNudge(): Promise<void>
  stopAlgorithmNudge(): Promise<void>
  startBreakCheckAlarm(endTime: number): Promise<void>
  clearAllAlarms(): Promise<void>
}

export interface StorageService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  getMany<T extends Record<string, unknown>>(keys: string[]): Promise<Partial<T>>
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

// ===== BREAK MODE =====

export type BreakMode = "enabled" | "disabled"
