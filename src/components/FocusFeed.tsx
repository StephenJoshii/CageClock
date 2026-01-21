import React from "react"

import type { YouTubeVideo } from "../youtube-api"

import "./FocusFeed.css"

/**
 * Format ISO 8601 duration (PT4M13S) to readable format (4:13)
 */
function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return "0:00"

  const hours = parseInt(match[1] || "0", 10)
  const minutes = parseInt(match[2] || "0", 10)
  const seconds = parseInt(match[3] || "0", 10)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

/**
 * Format view count to readable format (1.2M, 456K, etc.)
 */
function formatViewCount(viewCount: string): string {
  const count = parseInt(viewCount, 10)
  if (isNaN(count)) return "0 views"

  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M views`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K views`
  }
  return `${count} views`
}

/**
 * Format date to relative time (e.g., "2 days ago")
 */
function formatDate(dateString: string): string {
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

interface VideoCardProps {
  video: YouTubeVideo
  index?: number
}

/**
 * Individual Video Card - Exact clone of YouTube's native video card design
 */
export function VideoCard({ video, index = 0 }: VideoCardProps) {
  const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`
  const channelUrl = `https://www.youtube.com/channel/${video.channelId}`

  return (
    <div
      className="cageclock-video-card"
      style={{ "--card-index": index } as React.CSSProperties}>
      {/* Thumbnail with duration overlay */}
      <a href={videoUrl} className="cageclock-thumbnail-link">
        <div className="cageclock-thumbnail-container">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="cageclock-thumbnail"
            loading="lazy"
          />
          {/* Duration Overlay */}
          <div className="cageclock-duration-overlay">
            {formatDuration(video.duration)}
          </div>
        </div>
      </a>

      {/* Video Info Row */}
      <div className="cageclock-video-info">
        {/* Channel Avatar */}
        <a href={channelUrl} className="cageclock-channel-avatar-link">
          {video.channelAvatarUrl ? (
            <img
              src={video.channelAvatarUrl}
              alt={video.channelName}
              className="cageclock-channel-avatar"
            />
          ) : (
            <div className="cageclock-channel-avatar cageclock-avatar-placeholder">
              {video.channelName.charAt(0).toUpperCase()}
            </div>
          )}
        </a>

        {/* Video Details */}
        <div className="cageclock-video-details">
          {/* Title */}
          <a href={videoUrl} className="cageclock-video-title-link">
            <h3 className="cageclock-video-title">{video.title}</h3>
          </a>

          {/* Channel Name */}
          <a href={channelUrl} className="cageclock-channel-name">
            {video.channelName}
          </a>

          {/* Views and Date */}
          <div className="cageclock-video-meta">
            <span>{formatViewCount(video.viewCount)}</span>
            <span className="cageclock-meta-separator">•</span>
            <span>{formatDate(video.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton Card for loading state
 */
function SkeletonCard() {
  return (
    <div className="cageclock-video-card cageclock-skeleton-card">
      {/* Skeleton Thumbnail */}
      <div className="cageclock-thumbnail-container cageclock-skeleton">
        <div className="cageclock-skeleton-shimmer"></div>
      </div>

      {/* Skeleton Info Row */}
      <div className="cageclock-video-info">
        {/* Skeleton Avatar */}
        <div className="cageclock-channel-avatar cageclock-skeleton">
          <div className="cageclock-skeleton-shimmer"></div>
        </div>

        {/* Skeleton Details */}
        <div className="cageclock-video-details">
          <div className="cageclock-skeleton-title cageclock-skeleton">
            <div className="cageclock-skeleton-shimmer"></div>
          </div>
          <div className="cageclock-skeleton-title cageclock-skeleton-title-short cageclock-skeleton">
            <div className="cageclock-skeleton-shimmer"></div>
          </div>
          <div className="cageclock-skeleton-meta cageclock-skeleton">
            <div className="cageclock-skeleton-shimmer"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FocusFeedProps {
  videos: YouTubeVideo[]
  topic: string
  isLoading: boolean
  isLoadingMore?: boolean
  error: string | null
  onRefresh: () => void
  onLoadMore?: () => void
  hasMore?: boolean
}

/**
 * Focus Feed Grid - Perfect clone of YouTube's Home Page grid
 */
export function FocusFeed({
  videos,
  topic,
  isLoading,
  isLoadingMore = false,
  error,
  onRefresh,
  onLoadMore,
  hasMore = true
}: FocusFeedProps) {
  // Generate array for skeleton cards
  const skeletonCards = Array.from({ length: 12 }, (_, i) => i)

  return (
    <div className="cageclock-focus-feed">
      {/* Category Chips Bar - YouTube Native Style */}
      <div className="cageclock-chips-bar">
        <div className="cageclock-chip cageclock-chip-active">{topic}</div>
        <button
          className="cageclock-chip cageclock-chip-refresh"
          onClick={onRefresh}
          disabled={isLoading}>
          {isLoading ? "↻" : "↻"}
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

      {/* Loading State - Skeleton Grid */}
      {isLoading && !error && (
        <div className="cageclock-video-grid">
          {skeletonCards.map((i) => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}
        </div>
      )}

      {/* Video Grid */}
      {!isLoading && !error && videos.length > 0 && (
        <>
          <div className="cageclock-video-grid">
            {videos.map((video, index) => (
              <VideoCard key={video.videoId} video={video} index={index} />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && onLoadMore && (
            <div className="cageclock-load-more-container">
              <button
                className="cageclock-load-more-btn"
                onClick={onLoadMore}
                disabled={isLoadingMore}>
                {isLoadingMore ? (
                  <>
                    <span className="cageclock-spinner"></span>
                    Loading more videos...
                  </>
                ) : (
                  <>
                    <span className="cageclock-load-icon">▼</span>
                    Load More Videos
                  </>
                )}
              </button>
            </div>
          )}

          {/* End of Results */}
          {!hasMore && videos.length > 0 && (
            <div className="cageclock-end-of-results">
              <span>🎉</span>
              <p>You've seen all videos for "{topic}"</p>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !error && videos.length === 0 && (
        <div className="cageclock-empty">
          <span className="cageclock-empty-icon">📭</span>
          <p>No videos found for "{topic}"</p>
          <p className="cageclock-empty-hint">Try a different focus topic</p>
        </div>
      )}
    </div>
  )
}

export default FocusFeed
