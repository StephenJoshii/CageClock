import { Storage } from "@plasmohq/storage"
import { STORAGE_KEYS, CONFIG } from "./constants"

export interface FocusSettings {
  isEnabled: boolean
  focusTopic: string
}

export interface Statistics {
  videosFiltered: number
  videosWatched: number
  timeFocused: number
}

const storage = new Storage({ area: "local" })

export async function getSettings(): Promise<FocusSettings> {
  const isEnabled = await storage.get<boolean>(STORAGE_KEYS.IS_ENABLED)
  const focusTopic = await storage.get<string>(STORAGE_KEYS.FOCUS_TOPIC)

  return {
    isEnabled: isEnabled ?? false,
    focusTopic: focusTopic ?? ""
  }
}

export async function setEnabled(isEnabled: boolean): Promise<void> {
  await storage.set(STORAGE_KEYS.IS_ENABLED, isEnabled)
}

export async function setFocusTopic(topic: string): Promise<void> {
  await storage.set(STORAGE_KEYS.FOCUS_TOPIC, topic)
}

export async function saveSettings(settings: FocusSettings): Promise<void> {
  await storage.set(STORAGE_KEYS.IS_ENABLED, settings.isEnabled)
  await storage.set(STORAGE_KEYS.FOCUS_TOPIC, settings.focusTopic)
}

export { storage }

export async function getStatistics(): Promise<Statistics> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.VIDEOS_FILTERED_TODAY,
    STORAGE_KEYS.VIDEOS_WATCHED_TODAY,
    STORAGE_KEYS.TIME_FOCUSED_TODAY
  ])

  return {
    videosFiltered: result[STORAGE_KEYS.VIDEOS_FILTERED_TODAY] || 0,
    videosWatched: result[STORAGE_KEYS.VIDEOS_WATCHED_TODAY] || 0,
    timeFocused: result[STORAGE_KEYS.TIME_FOCUSED_TODAY] || 0
  }
}

export async function incrementVideosFiltered(
  count: number = 1
): Promise<void> {
  await checkAndResetStats()

  const result = await chrome.storage.local.get([
    STORAGE_KEYS.VIDEOS_FILTERED_TODAY
  ])
  const current = result[STORAGE_KEYS.VIDEOS_FILTERED_TODAY] || 0
  await chrome.storage.local.set({
    [STORAGE_KEYS.VIDEOS_FILTERED_TODAY]: current + count
  })
}

export async function incrementVideosWatched(count: number = 1): Promise<void> {
  await checkAndResetStats()

  const result = await chrome.storage.local.get([
    STORAGE_KEYS.VIDEOS_WATCHED_TODAY
  ])
  const current = result[STORAGE_KEYS.VIDEOS_WATCHED_TODAY] || 0
  await chrome.storage.local.set({
    [STORAGE_KEYS.VIDEOS_WATCHED_TODAY]: current + count
  })
}

export async function incrementTimeFocused(
  milliseconds: number
): Promise<void> {
  await checkAndResetStats()

  const result = await chrome.storage.local.get([
    STORAGE_KEYS.TIME_FOCUSED_TODAY
  ])
  const current = result[STORAGE_KEYS.TIME_FOCUSED_TODAY] || 0
  await chrome.storage.local.set({
    [STORAGE_KEYS.TIME_FOCUSED_TODAY]: current + milliseconds
  })
}

export async function startSession(): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.SESSION_START_TIME]: Date.now()
  })
}

export async function endSession(): Promise<number> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.SESSION_START_TIME
  ])
  const startTime = result[STORAGE_KEYS.SESSION_START_TIME]

  if (startTime) {
    const sessionDuration = Date.now() - startTime
    await incrementTimeFocused(sessionDuration)
    await chrome.storage.local.set({ [STORAGE_KEYS.SESSION_START_TIME]: null })
    return sessionDuration
  }

  return 0
}

async function checkAndResetStats(): Promise<void> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.LAST_STATS_RESET])
  const lastReset = result[STORAGE_KEYS.LAST_STATS_RESET]
  const now = Date.now()
  const resetInterval = CONFIG.STATS_RESET_HOURS * 60 * 60 * 1000

  if (!lastReset || now - lastReset > resetInterval) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.VIDEOS_FILTERED_TODAY]: 0,
      [STORAGE_KEYS.VIDEOS_WATCHED_TODAY]: 0,
      [STORAGE_KEYS.TIME_FOCUSED_TODAY]: 0,
      [STORAGE_KEYS.LAST_STATS_RESET]: now
    })
  }
}

// ===== API KEY MANAGEMENT =====

export interface ApiKey {
  id: string
  name: string
  key: string
  isValid: boolean
  lastVerified: number
}

/**
 * Get all saved API keys
 */
export async function getApiKeys(): Promise<ApiKey[]> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.API_KEYS])
  return result[STORAGE_KEYS.API_KEYS] || []
}

/**
 * Save a new API key (after verification)
 */
export async function saveApiKey(
  apiKey: string,
  name?: string
): Promise<ApiKey> {
  const keys = await getApiKeys()

  const newKey: ApiKey = {
    id: Date.now().toString(),
    name: name || `API Key ${keys.length + 1}`,
    key: apiKey,
    isValid: true,
    lastVerified: Date.now()
  }

  const updatedKeys = [...keys, newKey]
  await chrome.storage.local.set({ [STORAGE_KEYS.API_KEYS]: updatedKeys })

  // Set this as the active key
  await setActiveApiKey(newKey.id)

  return newKey
}

/**
 * Set which API key is active
 */
export async function setActiveApiKey(id: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_API_KEY_ID]: id })
}

/**
 * Get the active API key
 */
export async function getActiveApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.ACTIVE_API_KEY_ID,
    STORAGE_KEYS.API_KEYS
  ])

  const activeId = result[STORAGE_KEYS.ACTIVE_API_KEY_ID]
  const keys: ApiKey[] = result[STORAGE_KEYS.API_KEYS] || []

  if (!activeId) {
    // Return first valid key if no active key set
    const firstValid = keys.find((k) => k.isValid)
    if (firstValid) {
      return firstValid.key
    }
    return null
  }

  const activeKey = keys.find((k) => k.id === activeId)
  return activeKey?.isValid ? activeKey.key : null
}

/**
 * Delete an API key
 */
export async function deleteApiKey(id: string): Promise<void> {
  const keys = await getApiKeys()
  const updatedKeys = keys.filter((k) => k.id !== id)

  await chrome.storage.local.set({ [STORAGE_KEYS.API_KEYS]: updatedKeys })

  // If we deleted the active key, set a new active key
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.ACTIVE_API_KEY_ID
  ])
  if (result[STORAGE_KEYS.ACTIVE_API_KEY_ID] === id) {
    const firstValid = updatedKeys.find((k) => k.isValid)
    if (firstValid) {
      await setActiveApiKey(firstValid.id)
    } else {
      await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_API_KEY_ID]: null })
    }
  }
}

/**
 * Update API key validity status
 */
export async function updateApiKeyValidity(
  id: string,
  isValid: boolean
): Promise<void> {
  const keys = await getApiKeys()
  const updatedKeys = keys.map((k) =>
    k.id === id ? { ...k, isValid, lastVerified: Date.now() } : k
  )

  await chrome.storage.local.set({ [STORAGE_KEYS.API_KEYS]: updatedKeys })
}
