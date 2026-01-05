import React, { useEffect, useState } from "react"

import type { YouTubeVideo } from "../youtube-api"

import "./FocusFeed.css"

interface VideoCardProps {
  video: YouTubeVideo
}

/**
 * Individual Video Card - Mimics YouTube's native video card design
 */
export function VideoCard({ video }: VideoCardProps) {
  const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`
  
  // Format the date to relative time (e.g., "2 days ago")
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "1 day ago"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  return (
    <a 
      href={videoUrl}
      className="cageclock-video-card"
      target="_self"
    >
      {/* Thumbnail */}
      <div className="cageclock-thumbnail-container">
        <img 
          src={video.thumbnailUrl} 
          alt={video.title}
          className="cageclock-thumbnail"
          loading="lazy"
        />
        <div className="cageclock-focus-badge">
          🎯 Focus
        </div>
      </div>
      
      {/* Video Info */}
      <div className="cageclock-video-info">
        {/* Channel Avatar Placeholder */}
        <div className="cageclock-channel-avatar">
          {video.channelName.charAt(0).toUpperCase()}
        </div>
        
        <div className="cageclock-video-details">
          {/* Title */}
          <h3 className="cageclock-video-title">
            {video.title}
          </h3>
          
          {/* Channel Name */}
          <p className="cageclock-channel-name">
            {video.channelName}
          </p>
          
          {/* Meta info */}
          <p className="cageclock-video-meta">
            {formatDate(video.publishedAt)}
          </p>
        </div>
      </div>
    </a>
  )
}

interface FocusFeedProps {
  videos: YouTubeVideo[]
  topic: string
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  showRedirectBanner?: boolean
}

/**
 * Focus Feed Grid - Displays curated videos for the focus topic
 */
export function FocusFeed({ videos, topic, isLoading, error, onRefresh, showRedirectBanner }: FocusFeedProps) {
  const [showBanner, setShowBanner] = useState(showRedirectBanner)
  
  // Auto-hide the redirect banner after 5 seconds
  useEffect(() => {
    if (showBanner) {
      const timer = setTimeout(() => setShowBanner(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showBanner])
  
  return (
    <div className="cageclock-focus-feed">
      {/* Redirect Banner */}
      {showBanner && (
        <div className="cageclock-redirect-banner">
          <span>🚫 Blocked page! Redirected back to your focus zone.</span>
          <button onClick={() => setShowBanner(false)}>✕</button>
        </div>
      )}
      
      {/* Header */}
      <div className="cageclock-feed-header">
        <div className="cageclock-feed-title">
          <span className="cageclock-feed-icon">🎯</span>
          <h2>Focus Mode: <span className="cageclock-topic-highlight">{topic}</span></h2>
        </div>
        <p className="cageclock-feed-subtitle">
          Curated videos to help you stay focused on your learning goal
        </p>
        <button 
          className="cageclock-refresh-btn"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? "Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="cageclock-error">
          <span className="cageclock-error-icon">⚠️</span>
          <p>{error}</p>
          {error.includes("API key") && (
            <p className="cageclock-error-hint">
              Click the CageClock extension icon to add your YouTube API key.
            </p>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && !error && (
        <div className="cageclock-loading">
          <div className="cageclock-spinner"></div>
          <p>Finding the best videos for "{topic}"...</p>
        </div>
      )}

      {/* Video Grid */}
      {!isLoading && !error && videos.length > 0 && (
        <div className="cageclock-video-grid">
          {videos.map((video) => (
            <VideoCard key={video.videoId} video={video} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && videos.length === 0 && (
        <div className="cageclock-empty">
          <span className="cageclock-empty-icon">📭</span>
          <p>No videos found for "{topic}"</p>
          <p className="cageclock-empty-hint">Try a different focus topic</p>
        </div>
      )}

      {/* Footer */}
      <div className="cageclock-feed-footer">
        <p>Powered by CageClock • Stay Focused 💪</p>
      </div>
    </div>
  )
}

export default FocusFeed
