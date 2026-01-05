import { STORAGE_KEYS, type FocusSettings } from "./storage"

export {}

console.log("CageClock background service worker started")

// Listen for changes in chrome.storage.local
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return

  console.log("Storage changes detected:", changes)

  // Check if isEnabled changed
  if (STORAGE_KEYS.IS_ENABLED in changes) {
    const { oldValue, newValue } = changes[STORAGE_KEYS.IS_ENABLED]
    console.log(`Focus mode changed: ${oldValue} → ${newValue}`)
    
    if (newValue === true) {
      onFocusModeEnabled()
    } else {
      onFocusModeDisabled()
    }
  }

  // Check if focusTopic changed
  if (STORAGE_KEYS.FOCUS_TOPIC in changes) {
    const { oldValue, newValue } = changes[STORAGE_KEYS.FOCUS_TOPIC]
    console.log(`Focus topic changed: "${oldValue}" → "${newValue}"`)
    onFocusTopicChanged(newValue)
  }
})

// Handler when focus mode is enabled
function onFocusModeEnabled() {
  console.log("🎯 Focus mode ENABLED")
  
  // Get current focus topic
  chrome.storage.local.get([STORAGE_KEYS.FOCUS_TOPIC], (result) => {
    const topic = result[STORAGE_KEYS.FOCUS_TOPIC] || "your goal"
    console.log(`Now focusing on: ${topic}`)
    
    // You can add additional logic here, such as:
    // - Setting up alarms for reminders
    // - Modifying browser behavior
    // - Sending notifications
  })
}

// Handler when focus mode is disabled
function onFocusModeDisabled() {
  console.log("💤 Focus mode DISABLED")
  
  // You can add cleanup logic here, such as:
  // - Clearing alarms
  // - Resetting any modifications
}

// Handler when focus topic changes
function onFocusTopicChanged(newTopic: string) {
  if (newTopic) {
    console.log(`📝 Focus topic updated to: ${newTopic}`)
  } else {
    console.log("📝 Focus topic cleared")
  }
}

// Initialize: log current settings on service worker start
async function initializeSettings() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.IS_ENABLED,
    STORAGE_KEYS.FOCUS_TOPIC
  ])
  
  const settings: FocusSettings = {
    isEnabled: result[STORAGE_KEYS.IS_ENABLED] ?? false,
    focusTopic: result[STORAGE_KEYS.FOCUS_TOPIC] ?? ""
  }
  
  console.log("Current settings:", settings)
  
  if (settings.isEnabled) {
    console.log(`🎯 Focus mode is active, focusing on: ${settings.focusTopic || "not set"}`)
  }
}

initializeSettings()
