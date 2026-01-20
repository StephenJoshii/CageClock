import { useEffect, useState } from "react"

import {
  getSettings,
  setEnabled,
  setFocusTopic,
  getStatistics,
  getApiKeys,
  saveApiKey,
  deleteApiKey,
  setActiveApiKey,
  type ApiKey
} from "./storage"
import { STORAGE_KEYS, MESSAGES } from "./constants"

import "./popup.css"

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [topics, setTopics] = useState<string[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [apiKeyName, setApiKeyName] = useState("")
  const [hasApiKey, setHasApiKey] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [videosFiltered, setVideosFiltered] = useState(0)

  // API key management
  const [apiKeys, setApiKeysList] = useState<ApiKey[]>([])
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)

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
        const savedTopics = settings.focusTopic
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
        setTopics(savedTopics)
      }
    })

    // Load API keys
    loadApiKeys()

    // Load statistics
    loadStatistics()

    // Check break status
    checkBreakStatus()
  }, [])

  const loadApiKeys = async () => {
    const keys = await getApiKeys()
    setApiKeysList(keys)
    setHasApiKey(keys.length > 0 && keys.some((k) => k.isValid))
  }

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

  const loadStatistics = async () => {
    const stats = await getStatistics()
    setVideosFiltered(stats.videosFiltered)
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

  const handleInputKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
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
    } else if (
      e.key === "Backspace" &&
      inputValue === "" &&
      topics.length > 0
    ) {
      // Remove last chip on backspace if input is empty
      const newTopics = topics.slice(0, -1)
      setTopics(newTopics)
      setIsSaving(true)
      await setFocusTopic(newTopics.join(", "))
      setIsSaving(false)
    }
  }

  const removeChip = async (topicToRemove: string) => {
    const newTopics = topics.filter((t) => t !== topicToRemove)
    setTopics(newTopics)
    setIsSaving(true)
    await setFocusTopic(newTopics.join(", "))
    setIsSaving(false)
  }

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setApiKeyStatus("Please enter an API key")
      return
    }

    setIsVerifying(true)
    setApiKeyStatus("🔄 Verifying API key...")

    try {
      const response = (await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "VERIFY_API_KEY", apiKey: apiKey.trim() },
          resolve
        )
      })) as { valid?: boolean; error?: string }

      if (response?.valid) {
        // API key is valid, save it
        await saveApiKey(apiKey.trim(), apiKeyName.trim() || undefined)
        setApiKeyStatus("✅ API key is valid and saved!")
        setHasApiKey(true)
        setApiKey("")
        setApiKeyName("")
        setShowApiKeyInput(false)
        await loadApiKeys()
        setTimeout(() => setApiKeyStatus(""), 3000)
      } else if (response?.error) {
        // API key is invalid
        setApiKeyStatus(`❌ ${response.error}`)
      } else {
        setApiKeyStatus("Failed to verify API key")
      }
    } catch (error) {
      setApiKeyStatus("Network error while verifying")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSelectApiKey = async (id: string) => {
    await setActiveApiKey(id)
    await loadApiKeys()
  }

  const handleDeleteApiKey = async (id: string) => {
    await deleteApiKey(id)
    await loadApiKeys()
    setApiKeyStatus("🗑️ API key deleted")
    setTimeout(() => setApiKeyStatus(""), 2000)
  }

  const getVerificationStatus = (key: ApiKey): string => {
    if (!key.isValid) {
      return "❌ Invalid"
    }

    const minutesAgo = Math.floor((Date.now() - key.lastVerified) / 60000)
    if (minutesAgo < 1) {
      return "✅ Just verified"
    } else if (minutesAgo < 60) {
      return `✅ Verified ${minutesAgo}m ago`
    } else if (minutesAgo < 1440) {
      return `✅ Verified ${Math.floor(minutesAgo / 60)}h ago`
    } else {
      return `✅ Verified ${Math.floor(minutesAgo / 1440)}d ago`
    }
  }

  const formatApiKey = (key: string): string => {
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`
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
            aria-label={
              isEnabled ? "Turn off focus mode" : "Turn on focus mode"
            }>
            <span className="material-toggle-track"></span>
            <span className="material-toggle-thumb"></span>
          </button>
        </div>

        {/* Topic Chips System */}
        <div className="setting-row vertical">
          <label className="setting-label">Focus Topics</label>
          <div className="chips-container">
            {topics.map((t, index) => (
              <span key={index} className="topic-chip">
                {t}
                <button
                  className="chip-remove"
                  onClick={() => removeChip(t)}
                  aria-label={`Remove ${t}`}>
                  x
                </button>
              </span>
            ))}
            <input
              type="text"
              className="chip-input"
              placeholder={
                topics.length === 0
                  ? "Type a topic and press Enter..."
                  : "Add more..."
              }
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
            />
          </div>
          <p className="input-hint">Press Enter to add a topic chip</p>
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
            <p className="break-message">
              Take a breather! Focus mode will resume automatically.
            </p>
            <button className="end-break-btn" onClick={handleEndBreak}>
              End Break Early
            </button>
          </div>
        ) : (
          isEnabled && (
            <button className="emergency-exit-btn" onClick={handleStartBreak}>
              Emergency Exit (10 min break)
            </button>
          )
        )}

        {/* Settings Toggle */}
        <button
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}>
          {showSettings ? "Hide Settings" : "API Settings"}
        </button>

        {/* API Key Settings Panel */}
        {showSettings && (
          <div className="settings-panel">
            <div className="setting-row vertical">
              <label className="setting-label">
                YouTube API Keys
                {apiKeys.length > 0 && (
                  <span className="api-status configured">
                    {apiKeys.length} key{apiKeys.length !== 1 ? "s" : ""} saved
                  </span>
                )}
              </label>

              {/* Show list of API keys */}
              {apiKeys.length > 0 && (
                <div className="api-keys-list">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className={`api-key-item ${key.isValid ? "valid" : "invalid"}`}>
                      <div className="api-key-info">
                        <div className="api-key-header">
                          <span className="api-key-name">{key.name}</span>
                          <span className="api-key-verification-status">
                            {getVerificationStatus(key)}
                          </span>
                        </div>
                        <span className="api-key-value">
                          {formatApiKey(key.key)}
                        </span>
                      </div>
                      <div className="api-key-actions">
                        {key.isValid && (
                          <button
                            className="api-key-action-btn select"
                            onClick={() => handleSelectApiKey(key.id)}
                            title="Use this API key">
                            ✓
                          </button>
                        )}
                        <button
                          className="api-key-action-btn delete"
                          onClick={() => handleDeleteApiKey(key.id)}
                          title="Delete this API key">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new API key form */}
              {!showApiKeyInput && (
                <button
                  className="add-api-key-btn"
                  onClick={() => setShowApiKeyInput(true)}>
                  + Add New API Key
                </button>
              )}

              {showApiKeyInput && (
                <div className="api-key-input-form">
                  <div className="api-key-input-row">
                    <input
                      id="api-key-name"
                      type="text"
                      className="topic-input api-name-input"
                      placeholder="Name (optional)"
                      value={apiKeyName}
                      onChange={(e) => setApiKeyName(e.target.value)}
                    />
                    <input
                      id="api-key"
                      type="password"
                      className="topic-input api-key-input"
                      placeholder="Enter your YouTube API key..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <div className="api-key-buttons">
                    <button
                      className="api-key-btn cancel"
                      onClick={() => {
                        setShowApiKeyInput(false)
                        setApiKey("")
                        setApiKeyName("")
                        setApiKeyStatus("")
                      }}>
                      Cancel
                    </button>
                    <button
                      className="api-key-btn save"
                      onClick={handleSaveApiKey}
                      disabled={isVerifying || !apiKey.trim()}>
                      {isVerifying ? "Verifying..." : "Save & Verify"}
                    </button>
                  </div>
                  {apiKeyStatus && (
                    <p className="api-key-status-message">{apiKeyStatus}</p>
                  )}
                  <p className="input-hint">
                    Get a key from{" "}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer">
                      Google Cloud Console
                    </a>
                  </p>
                </div>
              )}
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
