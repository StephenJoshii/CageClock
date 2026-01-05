import type { PlasmoCSConfig } from "plasmo"

// This content script injects CSS immediately at document_start
// before any YouTube content renders, preventing flicker

export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*", "https://youtube.com/*"],
  run_at: "document_start",
  all_frames: false
}

// Immediately check storage and inject CSS synchronously
const STYLE_ID = "cageclock-early-hide"

// Check if focus mode is enabled via chrome.storage
async function checkAndInjectEarly() {
  try {
    const result = await chrome.storage.local.get(["isEnabled"])
    
    if (result.isEnabled) {
      injectEarlyHideCSS()
    }
  } catch (error) {
    console.error("[CageClock] Error checking storage:", error)
  }
}

function injectEarlyHideCSS() {
  // Skip if already injected
  if (document.getElementById(STYLE_ID)) return
  
  const css = `
    /* CageClock Early Injection - Prevent Flicker */
    
    /* Hide home feed immediately */
    ytd-rich-grid-renderer,
    ytd-browse[page-subtype="home"] #contents {
      opacity: 0 !important;
      visibility: hidden !important;
    }
    
    /* Hide sidebar immediately */
    ytd-watch-next-secondary-results-renderer,
    #secondary,
    #related {
      opacity: 0 !important;
      visibility: hidden !important;
    }
    
    /* Hide shorts shelf */
    ytd-reel-shelf-renderer {
      opacity: 0 !important;
      visibility: hidden !important;
    }
    
    /* Hide chips bar */
    ytd-feed-filter-chip-bar-renderer {
      opacity: 0 !important;
      visibility: hidden !important;
    }
  `
  
  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = css
  
  // Insert into documentElement immediately (before head exists)
  ;(document.head || document.documentElement).appendChild(style)
  
  console.log("[CageClock] Early hide CSS injected")
}

// Run immediately
checkAndInjectEarly()

// Also listen for storage changes to update in real-time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return
  
  if ("isEnabled" in changes) {
    const styleEl = document.getElementById(STYLE_ID)
    
    if (changes.isEnabled.newValue) {
      if (!styleEl) {
        injectEarlyHideCSS()
      }
    } else {
      if (styleEl) {
        styleEl.remove()
        console.log("[CageClock] Early hide CSS removed")
      }
    }
  }
})

export {}
