import cssText from "data-text:../components/FocusFeed.css"
import type { PlasmoCSConfig, PlasmoGetInlineAnchor, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import { FocusFeed } from "../components/FocusFeed"
import { STORAGE_KEYS } from "../storage"
import type { YouTubeVideo } from "../youtube-api"

// Plasmo content script configuration
export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*", "https://youtube.com/*"],
  run_at: "document_end", // Changed to document_end to ensure DOM is ready
  all_frames: false
}

// Blocked paths that should be redirected when in focus mode
const BLOCKED_PATHS = [
  "/feed/trending",
  "/gaming",
  "/feed/explore",
  "/shorts"
]

// Tell Plasmo where to inject our React component
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  // Wait for YouTube's page container to be ready
  const anchor = document.querySelector("ytd-browse[page-subtype='home'] #contents")
  return anchor || document.body
}

// Inject our CSS styles
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
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
  
  const [focusTopic] = useStorage<string>({
    key: STORAGE_KEYS.FOCUS_TOPIC,
    instance: new Storage({ area: "local" })
  })
  
  const [breakMode] = useStorage<boolean>({
    key: STORAGE_KEYS.BREAK_MODE,
    instance: new Storage({ area: "local" })
  })

  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isHomePage, setIsHomePage] = useState(false)
  const [wasRedirected, setWasRedirected] = useState(false)

  // ===== REDIRECTOR: Block Trending, Gaming, etc. =====
  useEffect(() => {
    // Skip if focus mode is off or on break
    if (!isEnabled || breakMode) return
    
    const checkAndRedirect = () => {
      const currentPath = window.location.pathname
      
      // Check if current path is blocked
      const isBlocked = BLOCKED_PATHS.some(blockedPath => 
        currentPath.startsWith(blockedPath)
      )
      
      if (isBlocked) {
        console.log(`[CageClock] Redirecting from blocked page: ${currentPath}`)
        setWasRedirected(true)
        // Redirect to home page
        window.location.href = "https://www.youtube.com/"
      }
    }
    
    // Check immediately
    checkAndRedirect()
    
    // Listen for YouTube's SPA navigation (yt-navigate-finish)
    const handleNavigation = () => {
      checkAndRedirect()
    }
    
    document.addEventListener("yt-navigate-finish", handleNavigation)
    
    return () => {
      document.removeEventListener("yt-navigate-finish", handleNavigation)
    }
  }, [isEnabled, breakMode])

  // Check if we're on the YouTube home page
  useEffect(() => {
    const checkHomePage = () => {
      const isHome = window.location.pathname === "/" || 
                     window.location.pathname === "/feed/subscriptions" ||
                     document.querySelector("ytd-browse[page-subtype='home']") !== null
      setIsHomePage(isHome)
    }
    
    checkHomePage()
    
    // Listen for YouTube's SPA navigation
    const observer = new MutationObserver(() => {
      checkHomePage()
    })
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    })
    
    // Also listen for popstate (back/forward)
    window.addEventListener("popstate", checkHomePage)
    
    return () => {
      observer.disconnect()
      window.removeEventListener("popstate", checkHomePage)
    }
  }, [])

  // Handle CSS injection for hiding native content
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

  // Fetch videos when focus mode is enabled and we have a topic
  useEffect(() => {
    if (isEnabled && focusTopic && isHomePage) {
      fetchVideos()
    }
  }, [isEnabled, focusTopic, isHomePage])

  const fetchVideos = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: "FETCH_VIDEOS",
        forceFresh: false
      })
      
      if (response?.success) {
        setVideos(response.videos)
        console.log("[CageClock] Loaded", response.videos.length, "videos")
      } else {
        const errorMsg = response?.error?.message || "Failed to fetch videos"
        setError(errorMsg)
        console.error("[CageClock] Error fetching videos:", errorMsg)
      }
    } catch (err) {
      setError("Failed to communicate with extension")
      console.error("[CageClock] Communication error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }, () => {
      fetchVideos()
    })
  }

  // Don't render anything if:
  // - Focus mode is off
  // - Not on home page
  // - No focus topic set
  if (!isEnabled || !isHomePage) {
    return null
  }

  if (!focusTopic) {
    return (
      <div className="cageclock-focus-feed">
        <div className="cageclock-empty">
          <span className="cageclock-empty-icon">🎯</span>
          <p>No focus topic set</p>
          <p className="cageclock-empty-hint">
            Click the CageClock extension icon to set your focus topic
          </p>
        </div>
      </div>
    )
  }

  return (
    <FocusFeed
      videos={videos}
      topic={focusTopic}
      isLoading={isLoading}
      error={error}
      onRefresh={handleRefresh}
      showRedirectBanner={wasRedirected}
    />
  )
}

export default YouTubeContentScript
