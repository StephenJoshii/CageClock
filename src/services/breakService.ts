import { chrome } from "background"
import type { BreakMode } from "../types/alarm.types"

/**
 * Service for managing break mode functionality
 */

class BreakService {
  static readonly BREAK_DURATION_MS = 10 * 60 * 1000

  /**
   * Start emergency break mode (10 minutes)
   */
  async startBreakMode(): Promise<{
    success: boolean
    endTime: number
  }> {
    const endTime = Date.now() + BreakService.BREAK_DURATION_MS

    await chrome.storage.local.set({
      isEnabled: false,
      breakMode: true,
      breakEndTime: endTime
    })

    console.log("[BreakService] Started 10-minute break")

    return { success: true, endTime }
  }

  /**
   * End break mode early and re-enable focus
   */
  async endBreakMode(): Promise<void> {
    await chrome.storage.local.set({
      isEnabled: true,
      breakMode: false,
      breakEndTime: null
    })

    console.log("[BreakService] Ended break, re-enabled focus mode")
  }

  /**
   * Get current break status
   */
  async getBreakStatus(): Promise<{
    isOnBreak: boolean
    endTime: number | null
  }> {
    const result = await chrome.storage.local.get(["breakMode", "breakEndTime"])

    const isOnBreak = result.breakMode ?? false
    const endTime = result.breakEndTime ?? null

    return { isOnBreak, endTime }
  }

  /**
   * Check if break has expired and should auto-end
   */
  async checkBreakExpiry(): Promise<boolean> {
    const { endTime } = await this.getBreakStatus()
    if (!endTime) return false

    const now = Date.now()
    const isExpired = now >= endTime

    if (isExpired) {
      console.log("[BreakService] Break expired, ending...")
      await this.endBreakMode()
      return true
    }

    return false
  }
}

export const breakService = new BreakService()
