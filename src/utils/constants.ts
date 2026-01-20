import { CONFIG } from "../constants"

/**
 * Shared constants and validation utilities
 */

export const MESSAGES = {
  ALGORITHM_NUDGE_STARTED: "Algorithm nudge started",
  ALGORITHM_NUDGE_COMPLETED: "Algorithm nudge completed",
  BREAK_STARTED: "10-minute break started",
  BREAK_ENDED: "Break ended, focus resumed",
  STORAGE_ERROR: "Storage operation failed",
  API_KEY_INVALID: "API key is invalid",
  TOPIC_EMPTY: "Focus topic cannot be empty",
  TOPIC_TOO_LONG: "Focus topic is too long (max 100 characters)"
} as const

export const VALIDATION = {
  MIN_TOPIC_LENGTH: 1,
  MAX_TOPIC_LENGTH: 100,
  MIN_API_KEY_LENGTH: 10,
  MAX_API_KEY_LENGTH: 200,
  TOPIC_REGEX: /^[a-zA-Z0-9\s,]+$/,
  API_KEY_REGEX: /^AIza[0-9A-Za-z_-]{39}$/
} as const

export function isValidTopic(topic: string): boolean {
  if (!topic || topic.trim().length === 0) {
    return false
  }

  if (topic.length > VALIDATION.MAX_TOPIC_LENGTH) {
    return false
  }

  return VALIDATION.TOPIC_REGEX.test(topic.trim())
}

export function isValidApiKey(apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) {
    return false
  }

  if (apiKey.length < VALIDATION.MIN_API_KEY_LENGTH) {
    return false
  }

  if (apiKey.length > VALIDATION.MAX_API_KEY_LENGTH) {
    return false
  }

  return VALIDATION.API_KEY_REGEX.test(apiKey.trim())
}
