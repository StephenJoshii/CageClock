import cssText from "data-text:../components/FocusFeed.css"
import type { PlasmoCSConfig, PlasmoGetOverlayAnchor, PlasmoGetShadowHostId, PlasmoGetStyle } from "plasmo"
import { useEffect, useRef, useState } from "react"

import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import { FocusFeed } from "../components/FocusFeed"
import { STORAGE_KEYS } from "../storage"
import type { YouTubeVideo } from "../youtube-api"

// Plasmo content script configuration
export const config: PlasmoCSConfig = {
  matches: ["https://www.youtube.com/*", "https://youtube.com/*"],
  run_at: "document_end",
  all_frames: false
}

// Blocked paths that should be redirected when in focus mode
const BLOCKED_PATHS = [
  "/feed/trending",
  "/gaming",
  "/feed/explore",
  "/shorts"
]

// Use overlay anchor positioned at body level for stability
// This prevents remounting when YouTube's DOM changes during scroll
export const getOverlayAnchor: PlasmoGetOverlayAnchor = async () => {
  // Use body as anchor for maximum stability
  return document.body
}

// Give our shadow host a unique ID
export const getShadowHostId: PlasmoGetShadowHostId = () => "cageclock-feed-host"

// Inject our CSS styles
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

// CSS selectors for YouTube elements to hide
export const YOUTUBE_SELECTORS = {
  // ===== HOME PAGE FEED =====
  homeFeed: "ytd-rich-grid-renderer",
  homeFeedContainer: "ytd-browse[page-subtype='home']",
  
  // ===== SIDEBAR & RELATED VIDEOS =====
  sidebar: "ytd-watch-next-secondary-results-renderer",
  relatedVideos: "#related",
  secondaryInner: "#secondary-inner",
  secondary: "#secondary",
  
  // ===== RECOMMENDATIONS & SUGGESTIONS =====
  chipsBar: "ytd-feed-filter-chip-bar-renderer",
  compactVideo: "ytd-compact-video-renderer",
  richShelf: "ytd-rich-shelf-renderer",
  reelShelf: "ytd-reel-shelf-renderer",
  
  // ===== SHORTS =====
  shortsContainer: "ytd-shorts",
  shortsShelf: "ytd-reel-shelf-renderer",
  
  // ===== END SCREEN & CARDS =====
  endScreen: ".ytp-ce-element",
  endScreenContainer: ".ytp-endscreen-content",
  cards: ".ytp-cards-teaser",
  
  // ===== MISC =====
  comments: "ytd-comments",
  searchResults: "ytd-search",
  masthead: "ytd-masthead",
  miniGuide: "ytd-mini-guide-renderer",
  guide: "ytd-guide-renderer",
} as const

// Generate CSS to hide all distracting elements
function generateHideCSS(isEnabled: boolean): string {
  if (!isEnabled) return ""
  
  return `
    /* CageClock Focus Mode - Hide Distractions */
    
    /* Hide Home Page Feed on home page only */
    ytd-browse[page-subtype="home"] ${YOUTUBE_SELECTORS.homeFeed} {
      display: none !important;
    }
    
    /* Hide Category Chips */
    ytd-browse[page-subtype="home"] ${YOUTUBE_SELECTORS.chipsBar} {
      display: none !important;
    }
    
    /* Hide Shorts shelf */
    ${YOUTUBE_SELECTORS.shortsShelf},
    ${YOUTUBE_SELECTORS.reelShelf},
    ytd-rich-section-renderer:has(${YOUTUBE_SELECTORS.reelShelf}) {
      display: none !important;
    }
    
    /* On video watch pages: hide sidebar recommendations */
    ${YOUTUBE_SELECTORS.sidebar},
    ${YOUTUBE_SELECTORS.relatedVideos},
    ${YOUTUBE_SELECTORS.secondary} {
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
    const head = document.head || document.documentElement
    head.insertBefore(styleEl, head.firstChild)
  }
  
  styleEl.textContent = css
}

// Remove all injected CSS
function removeCSS() {
  const styleEl = document.getElementById(STYLE_ID)
  if (styleEl) {
    styleEl.remove()
  }
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
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isHomePage, setIsHomePage] = useState(false)
  const [wasRedirected, setWasRedirected] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  
  // Track previous enabled state to detect when user turns off
  // Start with null to indicate "not yet initialized"
  const prevEnabledRef = useRef<boolean | null>(null)
  // Track if initial fetch has been done
  const initialFetchDone = useRef(false)
  // Track if storage has been loaded
  const storageLoaded = useRef(false)
  // Track previous topic to detect changes
  const prevTopicRef = useRef<string | undefined>(undefined)
  // Prevent reload loop
  const hasReloaded = useRef(false)

  // ===== HANDLE TOGGLE OFF: Reload page to restore YouTube =====
  useEffect(() => {
    // Prevent any reload logic if we've already triggered one
    if (hasReloaded.current) return
    
    // Wait for storage to actually load (isEnabled won't be undefined)
    if (isEnabled === undefined) {
      return
    }
    
    // Mark storage as loaded and set initial value
    if (!storageLoaded.current) {
      storageLoaded.current = true
      prevEnabledRef.current = isEnabled
      console.log("[CageClock] Storage loaded, initial isEnabled:", isEnabled)
      return
    }
    
    // Only reload if user explicitly turned OFF focus mode (was true, now false)
    // This should only happen from the popup toggle, not from storage flickering
    if (prevEnabledRef.current === true && isEnabled === false) {
      console.log("[CageClock] Focus mode disabled - reloading to restore YouTube")
      hasReloaded.current = true
      removeCSS()
      window.location.reload()
      return
    }
    
    prevEnabledRef.current = isEnabled
  }, [isEnabled])

  // ===== REDIRECTOR: Block Trending, Gaming, etc. =====
  useEffect(() => {
    if (!isEnabled || breakMode) return
    
    const checkAndRedirect = () => {
      const currentPath = window.location.pathname
      const isBlocked = BLOCKED_PATHS.some(blockedPath => 
        currentPath.startsWith(blockedPath)
      )
      
      if (isBlocked) {
        console.log("[CageClock] Redirecting from blocked page: ${currentPath}")
        setWasRedirected(true)
        window.location.href = "https://www.youtube.com/"
      }
    }
    
    checkAndRedirect()
    
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
                     document.querySelector("ytd-browse[page-subtype='home']") !== null
      setIsHomePage(isHome)
    }
    
    checkHomePage()
    
    // Listen for YouTube's SPA navigation
    document.addEventListener("yt-navigate-finish", checkHomePage)
    window.addEventListener("popstate", checkHomePage)
    
    return () => {
      document.removeEventListener("yt-navigate-finish", checkHomePage)
      window.removeEventListener("popstate", checkHomePage)
    }
  }, [])

  // Handle CSS injection for hiding native content
  useEffect(() => {
    console.log("[CageClock] isEnabled:", isEnabled, "isHomePage:", isHomePage)
    
    if (isEnabled && isHomePage) {
      const css = generateHideCSS(true)
      injectCSS(css)
      console.log("[CageClock] Focus mode enabled - hiding distractions")
    } else {
      removeCSS()
    }

    return () => {
      removeCSS()
    }
  }, [isEnabled, isHomePage])

  // Fetch videos when focus mode is enabled and we have a topic
  useEffect(() => {
    // Skip if storage hasn't loaded yet
    if (isEnabled === undefined || focusTopic === undefined) return
    
    // Check if topic changed
    const topicChanged = prevTopicRef.current !== undefined && prevTopicRef.current !== focusTopic
    
    if (topicChanged) {
      // Topic changed - reset and refetch
      initialFetchDone.current = false
      setVideos([])
      setNextPageToken(undefined)
      setHasMore(true)
    }
    
    prevTopicRef.current = focusTopic
    
    // Fetch if enabled, has topic, on home page, and haven't fetched yet
    if (isEnabled && focusTopic && isHomePage && !initialFetchDone.current) {
      initialFetchDone.current = true
      fetchVideos()
    }
  }, [isEnabled, focusTopic, isHomePage])

  const fetchVideos = async () => {
    if (isLoading) return // Prevent duplicate fetches
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: "FETCH_VIDEOS",
        forceFresh: false
      })
      
      if (response?.success) {
        setVideos(response.videos)
        setNextPageToken(response.nextPageToken)
        setHasMore(!!response.nextPageToken)
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

  const loadMoreVideos = async () => {
    if (isLoadingMore || !nextPageToken || !hasMore) return
    
    setIsLoadingMore(true)
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: "FETCH_MORE_VIDEOS",
        pageToken: nextPageToken
      })
      
      if (response?.success) {
        setVideos(prevVideos => [...prevVideos, ...response.videos])
        setNextPageToken(response.nextPageToken)
        setHasMore(!!response.nextPageToken)
        console.log("[CageClock] Loaded", response.videos.length, "more videos. Total:", videos.length + response.videos.length)
      } else {
        console.error("[CageClock] Error loading more videos:", response?.error)
      }
    } catch (err) {
      console.error("[CageClock] Communication error:", err)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleRefresh = () => {
    initialFetchDone.current = false
    setNextPageToken(undefined)
    setHasMore(true)
    chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }, () => {
      fetchVideos()
    })
  }

  // Don't render if focus mode is off or not on home page
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
      isLoadingMore={isLoadingMore}
      error={error}
      onRefresh={handleRefresh}
      onLoadMore={loadMoreVideos}
      hasMore={hasMore}
      showRedirectBanner={wasRedirected}
    />
  )
}

export default YouTubeContentScript
