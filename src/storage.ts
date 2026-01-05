import { Storage } from "@plasmohq/storage"

export interface FocusSettings {
  isEnabled: boolean
  focusTopic: string
}

export const STORAGE_KEYS = {
  IS_ENABLED: "isEnabled",
  FOCUS_TOPIC: "focusTopic",
  YOUTUBE_API_KEY: "youtubeApiKey",
  CACHED_VIDEOS: "cachedVideos",
  CACHED_VIDEOS_TOPIC: "cachedVideosTopic",
  CACHED_VIDEOS_TIME: "cachedVideosTime",
  // Break timer keys
  BREAK_MODE: "breakMode",
  BREAK_END_TIME: "breakEndTime"
} as const

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
