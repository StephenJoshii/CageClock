import type { PlasmoCSConfig } from "plasmo"
import { STORAGE_KEYS } from "../constants"

// This content script injects CSS immediately at document_start
// before any YouTube content renders, preventing flicker

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*", "https://youtube.com/*"],
  run_at: "document_start",
  all_frames: false
}

// Style IDs for our injected CSS
const EARLY_STYLE_ID = "cageclock-early-hide"
const MAIN_STYLE_ID = "cageclock-focus-style"

// Check if focus mode is enabled via chrome.storage
async function checkAndInjectEarly() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.IS_ENABLED])

    // Handle both boolean and string values (Plasmo storage can store as string)
    const isEnabled =
      result[STORAGE_KEYS.IS_ENABLED] === true ||
      result[STORAGE_KEYS.IS_ENABLED] === "true"

    if (isEnabled) {
      injectEarlyHideCSS()
    } else {
      removeAllCSS()
    }
  } catch (error) {
    console.error("[CageClock] Error checking storage:", error)
  }
}

function injectEarlyHideCSS() {
  // Skip if already injected
  if (document.getElementById(EARLY_STYLE_ID)) return

  const css = `
    /* CageClock Early Injection - Prevent Flicker */
    
    /* Hide home feed immediately */
    ytd-browse[page-subtype="home"] ytd-rich-grid-renderer {
      opacity: 0 !important;
      visibility: hidden !important;
    }
    
    /* Hide shorts shelf on home page */
    ytd-browse[page-subtype="home"] ytd-reel-shelf-renderer {
      opacity: 0 !important;
      visibility: hidden !important;
    }
    
    /* Hide chips bar on home page */
    ytd-browse[page-subtype="home"] ytd-feed-filter-chip-bar-renderer {
      opacity: 0 !important;
      visibility: hidden !important;
    }
  `

  const style = document.createElement("style")
  style.id = EARLY_STYLE_ID
  style.textContent = css

  // Insert into documentElement immediately (before head exists)
  const target = document.head || document.documentElement
  if (target) {
    target.appendChild(style)
    console.log("[CageClock] Early hide CSS injected")
  }
}

function removeAllCSS() {
  // Remove early hide CSS
  const earlyStyle = document.getElementById(EARLY_STYLE_ID)
  if (earlyStyle) {
    earlyStyle.remove()
    console.log("[CageClock] Early hide CSS removed")
  }

  // Also remove main focus style if it exists
  const mainStyle = document.getElementById(MAIN_STYLE_ID)
  if (mainStyle) {
    mainStyle.remove()
    console.log("[CageClock] Main focus CSS removed")
  }
}

// Run immediately
checkAndInjectEarly()

// Listen for storage changes to update in real-time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return

  if (STORAGE_KEYS.IS_ENABLED in changes) {
    // Handle both boolean and string values
    const newValue = changes[STORAGE_KEYS.IS_ENABLED].newValue
    const isEnabled = newValue === true || newValue === "true"

    console.log("[CageClock] Storage changed, isEnabled:", isEnabled)

    if (isEnabled) {
      injectEarlyHideCSS()
    } else {
      removeAllCSS()
    }
  }
})

export {}
