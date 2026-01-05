import { useEffect, useState } from "react"

import { getSettings, setEnabled, setFocusTopic } from "./storage"

import "./popup.css"

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [topic, setTopic] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Load saved settings on mount
    getSettings().then((settings) => {
      setIsEnabled(settings.isEnabled)
      setTopic(settings.focusTopic)
    })
  }, [])

  const handleToggle = async () => {
    const newValue = !isEnabled
    setIsEnabled(newValue)
    setIsSaving(true)
    await setEnabled(newValue)
    setIsSaving(false)
  }

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value)
  }

  const handleTopicBlur = async () => {
    setIsSaving(true)
    await setFocusTopic(topic)
    setIsSaving(false)
  }

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsSaving(true)
      await setFocusTopic(topic)
      setIsSaving(false)
    }
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>🎯 CageClock</h1>
        <p className="subtitle">Stay focused on what matters</p>
      </header>

      <main className="popup-content">
        <div className="setting-row">
          <label className="setting-label" htmlFor="focus-toggle">
            Focus Mode
          </label>
          <button
            id="focus-toggle"
            className={`toggle-switch ${isEnabled ? "active" : ""}`}
            onClick={handleToggle}
            aria-pressed={isEnabled}
            aria-label={isEnabled ? "Turn off focus mode" : "Turn on focus mode"}>
            <span className="toggle-slider"></span>
            <span className="toggle-text">{isEnabled ? "ON" : "OFF"}</span>
          </button>
        </div>

        <div className="setting-row vertical">
          <label className="setting-label" htmlFor="focus-topic">
            Focus Topic
          </label>
          <input
            id="focus-topic"
            type="text"
            className="topic-input"
            placeholder="e.g., Chess, Coding, Learning..."
            value={topic}
            onChange={handleTopicChange}
            onBlur={handleTopicBlur}
            onKeyDown={handleKeyDown}
          />
          <p className="input-hint">
            Press Enter or click outside to save
          </p>
        </div>

        {isSaving && <div className="saving-indicator">Saving...</div>}
      </main>

      <footer className="popup-footer">
        <p className="status">
          Status:{" "}
          <span className={isEnabled ? "status-active" : "status-inactive"}>
            {isEnabled ? "Focusing" : "Idle"}
          </span>
          {isEnabled && topic && (
            <span className="current-topic"> on {topic}</span>
          )}
        </p>
      </footer>
    </div>
  )
}

export default IndexPopup
