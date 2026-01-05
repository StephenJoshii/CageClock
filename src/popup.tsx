import { useEffect, useState } from "react"

import { getSettings, setEnabled, setFocusTopic } from "./storage"
import { STORAGE_KEYS } from "./storage"

import "./popup.css"

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [topics, setTopics] = useState<string[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [hasApiKey, setHasApiKey] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState("")
  const [videosFiltered, setVideosFiltered] = useState(0)
  
  // Break mode state
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakEndTime, setBreakEndTime] = useState<number | null>(null)
  const [remainingTime, setRemainingTime] = useState("")

  useEffect(() => {
    // Load saved settings on mount
    getSettings().then((settings) => {
      setIsEnabled(settings.isEnabled)
      // Parse topics from comma-separated string
      if (settings.focusTopic) {
        const savedTopics = settings.focusTopic.split(",").map(t => t.trim()).filter(t => t)
        setTopics(savedTopics)
      }
    })
    
    // Check if API key is configured
    chrome.runtime.sendMessage({ type: "GET_API_KEY" }, (response) => {
      if (response?.success) {
        setHasApiKey(response.hasApiKey)
      }
    })
    
    // Load videos filtered count
    chrome.storage.local.get([STORAGE_KEYS.VIDEOS_FILTERED_TODAY || "videosFilteredToday"], (result) => {
      setVideosFiltered(result.videosFilteredToday || 0)
    })
    
    // Check break status
    checkBreakStatus()
  }, [])
  
  // Update countdown timer
  useEffect(() => {
    if (!isOnBreak || !breakEndTime) return
    
    const updateTimer = () => {
      const remaining = Math.max(0, breakEndTime - Date.now())
      if (remaining === 0) {
        setIsOnBreak(false)
        setBreakEndTime(null)
        setRemainingTime("")
        // Refresh enabled state
        getSettings().then((settings) => {
          setIsEnabled(settings.isEnabled)
        })
        return
      }
      
      const minutes = Math.floor(remaining / 60000)
      const seconds = Math.floor((remaining % 60000) / 1000)
      setRemainingTime(`${minutes}:${seconds.toString().padStart(2, "0")}`)
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isOnBreak, breakEndTime])
  
  const checkBreakStatus = () => {
    chrome.runtime.sendMessage({ type: "GET_BREAK_STATUS" }, (response) => {
      if (response?.success) {
        setIsOnBreak(response.isOnBreak)
        setBreakEndTime(response.endTime)
      }
    })
  }

  const handleToggle = async () => {
    const newValue = !isEnabled
    setIsEnabled(newValue)
    setIsSaving(true)
    await setEnabled(newValue)
    setIsSaving(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      const newTopic = inputValue.trim()
      if (!topics.includes(newTopic)) {
        const newTopics = [...topics, newTopic]
        setTopics(newTopics)
        setInputValue("")
        setIsSaving(true)
        await setFocusTopic(newTopics.join(", "))
        setIsSaving(false)
      } else {
        setInputValue("")
      }
    } else if (e.key === "Backspace" && inputValue === "" && topics.length > 0) {
      // Remove last chip on backspace if input is empty
      const newTopics = topics.slice(0, -1)
      setTopics(newTopics)
      setIsSaving(true)
      await setFocusTopic(newTopics.join(", "))
      setIsSaving(false)
    }
  }

  const removeChip = async (topicToRemove: string) => {
    const newTopics = topics.filter(t => t !== topicToRemove)
    setTopics(newTopics)
    setIsSaving(true)
    await setFocusTopic(newTopics.join(", "))
    setIsSaving(false)
  }

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      setApiKeyStatus("Please enter an API key")
      return
    }
    
    chrome.runtime.sendMessage(
      { type: "SET_API_KEY", apiKey: apiKey.trim() },
      (response) => {
        if (response?.success) {
          setApiKeyStatus("✓ API key saved!")
          setHasApiKey(true)
          setApiKey("")
          setTimeout(() => setApiKeyStatus(""), 2000)
        } else {
          setApiKeyStatus("Failed to save API key")
        }
      }
    )
  }
  
  const handleStartBreak = () => {
    chrome.runtime.sendMessage({ type: "START_BREAK" }, (response) => {
      if (response?.success) {
        setIsOnBreak(true)
        setBreakEndTime(response.endTime)
        setIsEnabled(false)
      }
    })
  }
  
  const handleEndBreak = () => {
    chrome.runtime.sendMessage({ type: "END_BREAK" }, (response) => {
      if (response?.success) {
        setIsOnBreak(false)
        setBreakEndTime(null)
        setRemainingTime("")
        // Refresh enabled state
        getSettings().then((settings) => {
          setIsEnabled(settings.isEnabled)
        })
      }
    })
  }

  return (
    <div className="popup-container">
      {/* Status Indicator */}
      {isEnabled && (
        <div className="status-indicator">
          <span className="status-pulse"></span>
          <span className="status-text">Algorithm: Redirected</span>
        </div>
      )}

      <header className="popup-header">
        <h1>CageClock</h1>
        <p className="subtitle">Stay focused on what matters</p>
      </header>

      <main className="popup-content">
        {/* Focus Mode Toggle - iOS/Material Style */}
        <div className="setting-row">
          <label className="setting-label" htmlFor="focus-toggle">
            Focus Mode
          </label>
          <button
            id="focus-toggle"
            className={`material-toggle ${isEnabled ? "active" : ""}`}
            onClick={handleToggle}
            aria-pressed={isEnabled}
            aria-label={isEnabled ? "Turn off focus mode" : "Turn on focus mode"}>
            <span className="material-toggle-track"></span>
            <span className="material-toggle-thumb"></span>
          </button>
        </div>

        {/* Topic Chips System */}
        <div className="setting-row vertical">
          <label className="setting-label">
            Focus Topics
          </label>
          <div className="chips-container">
            {topics.map((t, index) => (
              <span key={index} className="topic-chip">
                {t}
                <button 
                  className="chip-remove" 
                  onClick={() => removeChip(t)}
                  aria-label={`Remove ${t}`}
                >
                  x
                </button>
              </span>
            ))}
            <input
              type="text"
              className="chip-input"
              placeholder={topics.length === 0 ? "Type a topic and press Enter..." : "Add more..."}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
            />
          </div>
          <p className="input-hint">
            Press Enter to add a topic chip
          </p>
        </div>

        {isSaving && <div className="saving-indicator">Saving...</div>}
        
        {/* Emergency Exit / Break Mode */}
        {isOnBreak ? (
          <div className="break-panel">
            <div className="break-header">
              <span className="break-icon">☕</span>
              <span className="break-title">Break Mode Active</span>
            </div>
            <div className="break-timer">{remainingTime}</div>
            <p className="break-message">Take a breather! Focus mode will resume automatically.</p>
            <button 
              className="end-break-btn"
              onClick={handleEndBreak}
            >
              End Break Early
            </button>
          </div>
        ) : isEnabled && (
          <button 
            className="emergency-exit-btn"
            onClick={handleStartBreak}
          >
            Emergency Exit (10 min break)
          </button>
        )}
        
        {/* Settings Toggle */}
        <button 
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
        >
           {showSettings ? "Hide Settings" : "API Settings"}
        </button>
        
        {/* API Key Settings Panel */}
        {showSettings && (
          <div className="settings-panel">
            <div className="setting-row vertical">
              <label className="setting-label" htmlFor="api-key">
                YouTube API Key
                {hasApiKey && <span className="api-status configured">✓ Configured</span>}
                {!hasApiKey && <span className="api-status not-configured">Not set</span>}
              </label>
              <input
                id="api-key"
                type="password"
                className="topic-input"
                placeholder="Enter your YouTube API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button 
                className="save-api-key-btn"
                onClick={handleSaveApiKey}
              >
                Save API Key
              </button>
              {apiKeyStatus && (
                <p className="api-key-status">{apiKeyStatus}</p>
              )}
              <p className="input-hint">
                Get a key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="popup-footer">
        {/* Stats Section */}
        <div className="stats-section">
          <span className="stats-label">Videos Filtered Today</span>
          <span className="stats-value">{videosFiltered}</span>
        </div>
        
        <p className="status">
          Status:{" "}
          <span className={isEnabled ? "status-active" : "status-inactive"}>
            {isEnabled ? "Focusing" : "Idle"}
          </span>
          {isEnabled && topics.length > 0 && (
            <span className="current-topic"> on {topics.join(", ")}</span>
          )}
        </p>
      </footer>
    </div>
  )
}

export default IndexPopup
