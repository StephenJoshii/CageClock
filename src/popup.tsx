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
      setStatusMsg("Please enter an API key")
      return
    }

    setIsVerifying(true)
    setStatusMsg("Verifying API key...")

    try {
      const response = (await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: "VERIFY_API_KEY", apiKey: apiKey.trim() },
          resolve
        )
      })) as { valid?: boolean; error?: string }

      if (response?.valid) {
        await saveApiKey(apiKey.trim(), apiKeyName.trim() || undefined)
        setStatusMsg("API key saved")
        setHasApiKey(true)
        setApiKey("")
        setApiKeyName("")
        await loadApiKeys()
        setTimeout(() => setStatusMsg(""), 3000)
      } else if (response?.error) {
        setStatusMsg(response.error)
      } else {
        setStatusMsg("Invalid API key")
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
    setStatusMsg("API key deleted")
    setTimeout(() => setStatusMsg(""), 2000)
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
    if (minutesAgo < 1) return "Verified just now"
    if (minutesAgo < 60) return `Verified ${minutesAgo}m ago`
    if (minutesAgo < 1440) return `Verified ${Math.floor(minutesAgo / 60)}h ago`
    return `Verified ${Math.floor(minutesAgo / 1440)}d ago`
  }

  const formatApiKey = (key: string): string => {
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`
  }

  return (
    <div className="popup">
      {isOnBreak ? (
        <div className="break-view">
          <div className="break-timer">{remainingTime}</div>
          <p className="break-text">Break in progress</p>
          <button className="btn-primary" onClick={handleEndBreak}>
            Resume Focus
          </button>
        </div>
      ) : (
        <>
          <header className="header">
            <span className="logo">CageClock</span>
          </header>

          <main className="main">
            <section className="section">
              <div className="section-label">Focus Mode</div>
              <button
                className={`toggle ${isEnabled ? "on" : ""}`}
                onClick={handleToggle}
                disabled={isSaving}
                aria-label="Toggle focus mode">
                <span className="toggle-thumb"></span>
              </button>
            </section>

            <section className="section">
              <div className="section-label">Focus Topics</div>
              <div className="chips">
                {topics.map((t) => (
                  <span key={t} className="chip">
                    {t}
                    <button className="chip-remove" onClick={() => removeChip(t)}>
                      Remove
                    </button>
                  </span>
                ))}
                <input
                  className="chip-input"
                  placeholder={topics.length ? "Add topic..." : "+ Add topic"}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                />
              </div>
            </section>

            {isEnabled && (
              <section className="section">
                <button className="break-btn" onClick={handleStartBreak}>
                  Take a break
                </button>
              </section>
            )}
          </main>

          <footer className="footer">
            <div className="footer-stat">
              Videos filtered today: {videosFiltered}
            </div>
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}>
              Settings
            </button>
          </footer>

          {showSettings && (
            <div className="settings-overlay">
              <div className="settings-panel">
                <div className="settings-header">
                  <button
                    className="btn-back"
                    onClick={() => setShowSettings(false)}>
                    Back
                  </button>
                  <span className="settings-title">Settings</span>
                  <div style={{ width: 50 }}></div>
                </div>

                <div className="settings-content">
                  <div className="settings-section">
                    <h2 className="settings-section-title">API Key Setup</h2>
                    <div className="steps">
                      <div className="step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                          <p className="step-title">Create a Google Cloud project</p>
                          <p className="step-text">
                            Go to{" "}
                            <a
                              href="https://console.cloud.google.com/projectcreate"
                              target="_blank"
                              rel="noopener noreferrer">
                              Google Cloud Console
                            </a>{" "}
                            and create a new project.
                          </p>
                        </div>
                      </div>

                      <div className="step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                          <p className="step-title">Enable YouTube Data API v3</p>
                          <p className="step-text">
                            In your project, search for and enable{" "}
                            <strong>YouTube Data API v3</strong> service.
                          </p>
                        </div>
                      </div>

                      <div className="step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                          <p className="step-title">Create API credentials</p>
                          <p className="step-text">
                            Go to Credentials and create an API key. Copy key
                            and paste it below.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="settings-section">
                    <h2 className="settings-section-title">Add API Key</h2>
                    {statusMsg && <div className="status-msg">{statusMsg}</div>}
                    <div className="form-group">
                      <label className="form-label">Name (optional)</label>
                      <input
                        className="input"
                        placeholder="e.g., My YouTube Key"
                        value={apiKeyName}
                        onChange={(e) => setApiKeyName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">API Key</label>
                      <input
                        className="input"
                        type="password"
                        placeholder="Paste your API key here"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn-save"
                      onClick={handleSaveApiKey}
                      disabled={isVerifying || !apiKey.trim()}>
                      {isVerifying ? "Verifying..." : "Save API Key"}
                    </button>
                  </div>

                  {apiKeys.length > 0 && (
                    <div className="settings-section">
                      <h2 className="settings-section-title">
                        Saved API Keys
                      </h2>
                      <div className="keys-list">
                        {apiKeys.map((key) => (
                          <div
                            key={key.id}
                            className={`key-item ${key.isValid ? "valid" : "invalid"}`}>
                            <div className="key-info">
                              <span className="key-name">{key.name}</span>
                              <span className="key-val">
                                {formatApiKey(key.key)}
                              </span>
                              <span className="key-status">
                                {getVerificationStatus(key)}
                              </span>
                            </div>
                            <div className="key-actions">
                              {key.isValid && (
                                <button
                                  className="btn-icon"
                                  onClick={() => handleSelectApiKey(key.id)}
                                  title="Use this key">
                                  Use
                                </button>
                              )}
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteApiKey(key.id)}
                                title="Delete">
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default IndexPopup
