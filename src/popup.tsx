import { useEffect, useState } from "react"
import {
  getSettings,
  setEnabled,
  setFocusTopic,
  getStatistics,
  saveApiKey,
  getApiKeys,
  setActiveApiKey,
  deleteApiKey,
  type ApiKey
} from "./storage"
import { STORAGE_KEYS } from "./constants"
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
  const [isVerifying, setIsVerifying] = useState(false)
  const [videosFiltered, setVideosFiltered] = useState(0)
  const [statusMsg, setStatusMsg] = useState("")

  const [apiKeys, setApiKeysList] = useState<ApiKey[]>([])
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [breakEndTime, setBreakEndTime] = useState<number | null>(null)
  const [remainingTime, setRemainingTime] = useState("")

  useEffect(() => {
    getSettings().then((settings) => {
      setIsEnabled(settings.isEnabled)
      if (settings.focusTopic) {
        const savedTopics = settings.focusTopic
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
        setTopics(savedTopics)
      }
    })

    loadApiKeys()
    loadStatistics()
    checkBreakStatus()
  }, [])

  const loadApiKeys = async () => {
    const keys = await getApiKeys()
    setApiKeysList(keys)
    setHasApiKey(keys.length > 0 && keys.some((k) => k.isValid))
  }

  const loadStatistics = async () => {
    const stats = await getStatistics()
    setVideosFiltered(stats.videosFiltered)
  }

  useEffect(() => {
    if (!isOnBreak || !breakEndTime) return

    const updateTimer = () => {
      const remaining = Math.max(0, breakEndTime - Date.now())
      if (remaining === 0) {
        setIsOnBreak(false)
        setBreakEndTime(null)
        setRemainingTime("")
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
    } else if (
      e.key === "Backspace" &&
      inputValue === "" &&
      topics.length > 0
    ) {
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
      setStatusMsg("Enter an API key")
      return
    }

    setIsVerifying(true)
    setStatusMsg("Verifying...")

    try {
      const response = (await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "VERIFY_API_KEY", apiKey: apiKey.trim() },
          resolve
        )
      })) as { valid?: boolean; error?: string }

      if (response?.valid) {
        await saveApiKey(apiKey.trim(), apiKeyName.trim() || undefined)
        setStatusMsg("Key saved ✓")
        setHasApiKey(true)
        setApiKey("")
        setApiKeyName("")
        setShowSettings(false)
        await loadApiKeys()
        setTimeout(() => setStatusMsg(""), 2000)
      } else if (response?.error) {
        setStatusMsg(response.error)
      } else {
        setStatusMsg("Invalid key")
      }
    } catch (error) {
      setStatusMsg("Network error")
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
    setStatusMsg("Key deleted")
    setTimeout(() => setStatusMsg(""), 1500)
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
        getSettings().then((settings) => {
          setIsEnabled(settings.isEnabled)
        })
      }
    })
  }

  const getVerificationStatus = (key: ApiKey): string => {
    if (!key.isValid) return "Invalid"
    const minutesAgo = Math.floor((Date.now() - key.lastVerified) / 60000)
    if (minutesAgo < 1) return "Just now"
    if (minutesAgo < 60) return `${minutesAgo}m ago`
    if (minutesAgo < 1440) return `${Math.floor(minutesAgo / 60)}h ago`
    return `${Math.floor(minutesAgo / 1440)}d ago`
  }

  const formatApiKey = (key: string): string => {
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`
  }

  return (
    <div className="p">
      {isOnBreak ? (
        <div className="break-view">
          <div className="break-timer">{remainingTime}</div>
          <p className="break-text">Break time</p>
          <button className="btn-primary" onClick={handleEndBreak}>
            Resume Focus
          </button>
        </div>
      ) : (
        <>
          <header className="header">
            <div className="logo">
              <span className="logo-icon">◎</span>
              <span>CageClock</span>
            </div>
            <div className="header-actions">
              <button
                className={`toggle ${isEnabled ? "on" : ""}`}
                onClick={handleToggle}
                disabled={isSaving}>
                <span className="toggle-thumb"></span>
              </button>
            </div>
          </header>

          <main className="main">
            {isEnabled && (
              <div className="topics-section">
                <div className="chips">
                  {topics.map((t) => (
                    <span key={t} className="chip">
                      {t}
                      <button className="chip-x" onClick={() => removeChip(t)}>
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    className="chip-input"
                    placeholder={topics.length ? "+" : "Add topic..."}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                  />
                </div>
                <button className="break-btn" onClick={handleStartBreak}>
                  Take a break
                </button>
              </div>
            )}

            {!isEnabled && (
              <div className="empty-state">
                <p>Toggle focus mode to start</p>
              </div>
            )}
          </main>

          <footer className="footer">
            <div className="footer-left">
              <button
                className="icon-btn"
                onClick={() => setShowSettings(!showSettings)}
                title="Settings">
                ⚙️
              </button>
              {statusMsg && <span className="status-msg">{statusMsg}</span>}
            </div>
            <div className="footer-right">
              <span className="stat">{videosFiltered} filtered</span>
            </div>
          </footer>

          {showSettings && (
            <div className="settings-panel">
              <div className="settings-header">
                <span>API Keys</span>
                <button className="icon-btn" onClick={() => setShowSettings(false)}>
                  ×
                </button>
              </div>

              {apiKeys.length > 0 && (
                <div className="key-list">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className={`key-item ${key.isValid ? "valid" : "invalid"}`}>
                      <div className="key-info">
                        <span className="key-name">{key.name}</span>
                        <span className="key-val">{formatApiKey(key.key)}</span>
                        <span className="key-status">{getVerificationStatus(key)}</span>
                      </div>
                      <div className="key-actions">
                        {key.isValid && (
                          <button
                            className="icon-btn-small"
                            onClick={() => handleSelectApiKey(key.id)}
                            title="Use this key">
                            ✓
                          </button>
                        )}
                        <button
                          className="icon-btn-small"
                          onClick={() => handleDeleteApiKey(key.id)}
                          title="Delete">
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="add-key">
                <input
                  className="input"
                  placeholder="Name (optional)"
                  value={apiKeyName}
                  onChange={(e) => setApiKeyName(e.target.value)}
                />
                <input
                  className="input"
                  type="password"
                  placeholder="API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button
                  className="btn-add"
                  onClick={handleSaveApiKey}
                  disabled={isVerifying || !apiKey.trim()}>
                  {isVerifying ? "..." : "Add"}
                </button>
              </div>

              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="help-link">
                Get API key →
              </a>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default IndexPopup
