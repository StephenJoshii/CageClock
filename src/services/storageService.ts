import type { alarmService as AlarmServiceTypes } from "./alarmService"

/**
 * Service for managing storage operations
 * Provides a clean interface for Chrome storage access
 */

class StorageService {
  /**
   * Get a single storage value
   */
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get([key])
    return result[key] ?? null
  }

  /**
   * Set a single storage value
   */
  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value })
  }

  /**
   * Get multiple storage values
   */
  async getMany<T extends Record<string, unknown>>(
    keys: string[]
  ): Promise<Partial<T>> {
    const result = await chrome.storage.local.get(keys)
    return result as Partial<T>
  }

  /**
   * Set multiple storage values
   */
  async setMany<T extends Record<string, unknown>>(values: T): Promise<void> {
    await chrome.storage.local.set(values)
  }

  /**
   * Remove a storage key
   */
  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove([key])
  }

  /**
   * Clear all local storage
   */
  async clear(): Promise<void> {
    await chrome.storage.local.clear()
  }
}

export const storageService = new StorageService()
