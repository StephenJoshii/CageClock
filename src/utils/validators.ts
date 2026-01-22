export interface ValidationResult {
  isValid: boolean
  error?: string
}

export const MAX_TOPIC_LENGTH = 100
export const MIN_TOPIC_LENGTH = 1

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /data:/gi,
  /on\w+\s*=/gi,
  /[<>]/g,
]

export function validateTopic(topic: string): ValidationResult {
  if (!topic || topic.trim().length === 0) {
    return { isValid: false, error: "Topic cannot be empty" }
  }

  if (topic.length > MAX_TOPIC_LENGTH) {
    return {
      isValid: false,
      error: `Topic must be ${MAX_TOPIC_LENGTH} characters or less`,
    }
  }

  if (topic.length < MIN_TOPIC_LENGTH) {
    return {
      isValid: false,
      error: `Topic must be at least ${MIN_TOPIC_LENGTH} character`,
    }
  }

  if (DANGEROUS_PATTERNS.some((pattern) => pattern.test(topic))) {
    return { isValid: false, error: "Topic contains invalid characters" }
  }

  return { isValid: true }
}

export function sanitizeTopic(topic: string): string {
  return topic
    .trim()
    .replace(/[<>]/g, "")
    .substring(0, MAX_TOPIC_LENGTH)
}

export function validateApiKey(apiKey: string): ValidationResult {
  if (!apiKey || apiKey.trim().length === 0) {
    return { isValid: false, error: "API key cannot be empty" }
  }

  if (apiKey.trim().length < 30 || apiKey.trim().length > 50) {
    return {
      isValid: false,
      error: "Invalid API key format",
    }
  }

  return { isValid: true }
}

export function sanitizeApiKey(apiKey: string): string {
  return apiKey.trim().substring(0, 100)
}

export function validateApiKeyName(name: string): ValidationResult {
  if (name && name.length > 50) {
    return {
      isValid: false,
      error: "Name must be 50 characters or less",
    }
  }

  return { isValid: true }
}

export function sanitizeApiKeyName(name: string): string {
  return (name || "").trim().substring(0, 50)
}
