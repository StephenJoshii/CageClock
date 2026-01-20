export type BreakMode = "enabled" | "disabled"

export interface AlarmService {
  startAlgorithmNudge(): Promise<void>
  stopAlgorithmNudge(): Promise<void>
  startBreakCheckAlarm(endTime: number): Promise<void>
  clearAllAlarms(): Promise<void>
}
