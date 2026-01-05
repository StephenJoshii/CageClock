import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import { STORAGE_KEYS } from "../storage"

// Plasmo content script configuration
export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*", "https://youtube.com/*"],
  run_at: "document_start", // Run as early as possible to prevent flicker
  all_frames: false
}

// CSS selectors for YouTube elements to hide
export const YOUTUBE_SELECTORS = {
  // ===== HOME PAGE FEED =====
  homeFeed: "ytd-rich-grid-renderer", // Main home page video grid
  homeFeedContainer: "ytd-browse[page-subtype='home']", // Home page container
  
  // ===== SIDEBAR & RELATED VIDEOS =====
  sidebar: "ytd-watch-next-secondary-results-renderer", // "Up Next" sidebar on video pages
  relatedVideos: "#related", // Related videos container
  secondaryInner: "#secondary-inner", // Secondary column wrapper
  secondary: "#secondary", // Full secondary column
  
  // ===== RECOMMENDATIONS & SUGGESTIONS =====
  chipsBar: "ytd-feed-filter-chip-bar-renderer", // Category chips at top of home
  compactVideo: "ytd-compact-video-renderer", // Individual sidebar video items
  richShelf: "ytd-rich-shelf-renderer", // Shelf sections (Shorts, Breaking News, etc.)
  reelShelf: "ytd-reel-shelf-renderer", // Shorts shelf
  
  // ===== SHORTS =====
  shortsContainer: "ytd-shorts", // Shorts player
  shortsShelf: "ytd-reel-shelf-renderer", // Shorts on home page
  
  // ===== END SCREEN & CARDS =====
  endScreen: ".ytp-ce-element", // End screen recommendations
  endScreenContainer: ".ytp-endscreen-content",
  cards: ".ytp-cards-teaser", // Video cards
  
  // ===== COMMENTS (optional) =====
  comments: "ytd-comments", // Comments section
  
  // ===== SEARCH RESULTS (if you want to filter) =====
  searchResults: "ytd-search", // Search results page
  
  // ===== MISC =====
  masthead: "ytd-masthead", // Top navigation bar (usually keep visible)
  miniGuide: "ytd-mini-guide-renderer", // Collapsed sidebar
  guide: "ytd-guide-renderer", // Full sidebar navigation
} as const

// Generate CSS to hide all distracting elements
function generateHideCSS(isEnabled: boolean): string {
  if (!isEnabled) return ""
  
  return `
    /* CageClock Focus Mode - Hide Distractions */
    
    /* Hide Home Page Feed */
    ${YOUTUBE_SELECTORS.homeFeed},
    ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer {
      display: none !important;
    }
    
    /* Hide Sidebar / Up Next Recommendations */
    ${YOUTUBE_SELECTORS.sidebar},
    ${YOUTUBE_SELECTORS.relatedVideos},
    ${YOUTUBE_SELECTORS.secondary} {
      display: none !important;
    }
    
    /* Hide Category Chips */
    ${YOUTUBE_SELECTORS.chipsBar} {
      display: none !important;
    }
    
    /* Hide Shorts */
    ${YOUTUBE_SELECTORS.shortsShelf},
    ${YOUTUBE_SELECTORS.reelShelf},
    ytd-rich-section-renderer:has(${YOUTUBE_SELECTORS.reelShelf}) {
      display: none !important;
    }
    
    /* Hide End Screen Recommendations */
    ${YOUTUBE_SELECTORS.endScreen},
    ${YOUTUBE_SELECTORS.endScreenContainer} {
      display: none !important;
    }
    
    /* Hide Video Cards */
    ${YOUTUBE_SELECTORS.cards} {
      display: none !important;
    }
    
    /* Expand video player to full width when sidebar is hidden */
    ytd-watch-flexy[flexy] #primary.ytd-watch-flexy {
      max-width: 100% !important;
    }
    
    ytd-watch-flexy[theater] #player-theater-container.ytd-watch-flexy {
      max-width: 100% !important;
    }
  `
}

// Style ID for our injected CSS
const STYLE_ID = "cageclock-focus-style"

// Inject or update CSS in the page
function injectCSS(css: string) {
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  
  if (!styleEl) {
    styleEl = document.createElement("style")
    styleEl.id = STYLE_ID
    styleEl.setAttribute("type", "text/css")
    // Insert at the start of head to load as early as possible
    const head = document.head || document.documentElement
    head.insertBefore(styleEl, head.firstChild)
  }
  
  styleEl.textContent = css
}

// Remove all injected CSS (both early and main)
function removeCSS() {
  // Remove main focus style
  const styleEl = document.getElementById(STYLE_ID)
  if (styleEl) {
    styleEl.remove()
  }
  
  // Also remove early hide style to ensure complete cleanup
  const earlyStyleEl = document.getElementById("cageclock-early-hide")
  if (earlyStyleEl) {
    earlyStyleEl.remove()
  }
}

// Main content script component
function YouTubeContentScript() {
  const [isEnabled] = useStorage<boolean>({
    key: STORAGE_KEYS.IS_ENABLED,
    instance: new Storage({ area: "local" })
  })

  useEffect(() => {
    console.log("[CageClock] useEffect triggered, isEnabled:", isEnabled)
    
    if (isEnabled) {
      const css = generateHideCSS(true)
      injectCSS(css)
      console.log("[CageClock] Focus mode enabled - hiding distractions")
    } else {
      removeCSS()
      console.log("[CageClock] Focus mode disabled - showing all content")
    }

    // Cleanup on unmount
    return () => {
      removeCSS()
    }
  }, [isEnabled])

  // This component doesn't render anything visible
  return null
}

export default YouTubeContentScript
