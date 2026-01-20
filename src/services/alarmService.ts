import { chrome } from "background"
import type { AlarmService as AlarmServiceTypes } from "../types/alarm.types"

/**
 * Service for managing Chrome extension alarms
 * Handles algorithm nudge and break mode timers
 */

const ALGORITHM_NUDGE_ALARM = "algorithmNudge"
const BREAK_CHECK_ALARM = "breakCheck"

class AlarmServiceImpl implements AlarmServiceTypes {
  /**
   * Start the algorithm nudge alarm (30-minute intervals)
   */
  async startAlgorithmNudge(): Promise<void> {
    await chrome.alarms.create(ALGORITHM_NUDGE_ALARM, {
      delayInMinutes: 30,
      periodInMinutes: 30
    })
    console.log("[AlarmService] Started algorithm nudge alarm")
  }

  /**
   * Stop the algorithm nudge alarm
   */
  async stopAlgorithmNudge(): Promise<void> {
    await chrome.alarms.clear(ALGORITHM_NUDGE_ALARM)
    console.log("[AlarmService] Stopped algorithm nudge alarm")
  }

  /**
   * Start break check alarm
   */
  async startBreakCheckAlarm(endTime: number): Promise<void> {
    const delayMinutes = Math.max(1, Math.ceil((endTime - Date.now()) / 60000))
    await chrome.alarms.create(BREAK_CHECK_ALARM, {
      when: endTime
    })
    console.log(
      `[AlarmService] Scheduled break end for ${new Date(endTime).toLocaleTimeString()}`
    )
  }

  /**
   * Clear all alarms (useful for testing)
   */
  async clearAllAlarms(): Promise<void> {
    await chrome.alarms.clearAll()
    console.log("[AlarmService] Cleared all alarms")
  }
}

export const alarmService = new AlarmServiceImpl()
