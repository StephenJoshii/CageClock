import React, { Component, ErrorInfo, ReactNode } from "react"
import { AppError, ErrorCode } from "../types/errors"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo)
    this.setState({ hasError: true, error })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderErrorFallback()
    }

    return this.props.children
  }

  private renderErrorFallback(): ReactNode {
    const errorCode = this.getErrorCode()
    const errorMessage = this.getErrorMessage()

    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <div style={styles.errorContent}>
          <h2 style={styles.errorTitle}>Something went wrong</h2>
          <p style={styles.errorMessage}>{errorMessage}</p>
          <button
            style={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Reload Extension
          </button>
        </div>
      </div>
    )
  }

  private getErrorCode(): string {
    if (this.state.error instanceof AppError) {
      return (this.state.error as AppError).code
    }
    return ErrorCode.UNKNOWN_ERROR
  }

  private getErrorMessage(): string {
    const error = this.state.error

    if (!error) {
      return "An unexpected error occurred"
    }

    if (error instanceof AppError) {
      const appError = error as AppError
      return this.getFriendlyErrorMessage(appError.code)
    }

    return error.message || "An unexpected error occurred"
  }

  private getFriendlyErrorMessage(code: ErrorCode): string {
    switch (code) {
      case ErrorCode.API_KEY_INVALID:
        return "Your YouTube API key is invalid. Please check your settings."

      case ErrorCode.API_KEY_MISSING:
        return "No YouTube API key configured. Please add one in settings."

      case ErrorCode.API_KEY_VERIFICATION_FAILED:
        return "Failed to verify your API key. Please try again."

      case ErrorCode.QUOTA_EXCEEDED:
        return "YouTube API quota exceeded. Wait until tomorrow or try a different API key."

      case ErrorCode.NETWORK_ERROR:
        return "Network error. Please check your internet connection."

      case ErrorCode.VALIDATION_ERROR:
        return "Invalid input. Please check your data and try again."

      case ErrorCode.STORAGE_ERROR:
        return "Failed to save data. Try reloading the extension."

      default:
        return "An unexpected error occurred. Try reloading the extension."
    }
  }
}

const styles = {
  errorContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
    padding: "20px",
    backgroundColor: "#1a1a1a",
  } as const,
  errorContent: {
    textAlign: "center" as const,
    maxWidth: "400px",
  },
  errorIcon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  errorTitle: {
    fontSize: "18px",
    fontWeight: "600" as const,
    color: "#f1f1f1",
    marginBottom: "8px",
  },
  errorMessage: {
    fontSize: "14px",
    color: "#9ca3af",
    marginBottom: "20px",
    lineHeight: "1.5" as const,
  },
  retryButton: {
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "500" as const,
    backgroundColor: "#3ea6ff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "opacity 0.15s ease",
  },
}

Object.defineProperty(styles.retryButton, "onmouseover", {
  value: function (this: any) {
    ;(this as any).style.opacity = "0.9"
  },
})

Object.defineProperty(styles.retryButton, "onmouseout", {
  value: function (this: any) {
    ;(this as any).style.opacity = "1"
  },
})
