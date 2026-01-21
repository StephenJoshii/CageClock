/**
 * Premium UI Components for CageClock
 * High-quality, reusable, beautiful components
 */

import type { ReactNode } from "react"

// ===== LOADING STATE COMPONENT =====

export interface LoadingStateProps {
  variant: "skeleton" | "spinner" | "dots"
  size?: "small" | "medium" | "large"
  label?: string
  fullScreen?: boolean
}

export function LoadingState({
  variant = "skeleton",
  size = "medium",
  label
}: LoadingStateProps) {
  const sizeClasses = {
    small: "loading-s",
    medium: "loading-m",
    large: "loading-l"
  }

  const variantClasses = {
    skeleton: "skeleton-pulse",
    spinner: "spinner-spin",
    dots: "loading-dots"
  }

  if (variant === "skeleton") {
    return (
      <div
        className={`loading-state ${variantClasses[size]} ${variantClasses[variant]}`}
        aria-live="polite"
        aria-busy="true"
        aria-label={label || "Loading..."}
      >
        <div className="loading-shimmer">
          <div className="shimmer-line"></div>
          <div className="shimmer-line"></div>
          <div className="shimmer-line"></div>
        </div>
      </div>
    )
  }

  if (variant === "spinner") {
    return (
      <div
        className={`loading-state ${variantClasses[size]}`}
        aria-live="polite"
        aria-busy="true"
        aria-label={label || "Loading..."}
      >
        <div className={`loading-spinner ${sizeClasses[size]}`}></div>
      </div>
    )
  }

  return (
    <div
      className={`loading-state ${variantClasses[size]} ${variantClasses[variant]}`}
      aria-live="polite"
      aria-busy="true"
      aria-label={label || "Loading..."}
    >
      <div className={`loading-dots ${variantClasses[size]}`}>
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
    </div>
  )
}

// ===== EMPTY STATE COMPONENT =====

export interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  icon,
  title = "No content",
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}

      <h3 className="empty-title">{title}</h3>

      {description && (
        <p className="empty-description">{description}</p>
      )}

      {action && (
        <button
          className="empty-action-button"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ===== BUTTON COMPONENT =====

export interface ButtonProps {
  variant?: "primary" | "secondary" | "accent" | "outline" | "text"
  size?: "xs" | "small" | "medium" | "large"
  children: ReactNode
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  onClick?: () => void
}

export function Button({
  variant = "primary",
  size = "medium",
  children,
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onClick
}: ButtonProps) {
  const variantClasses = {
    primary: "btn btn-primary",
    secondary: "btn btn-secondary",
    accent: "btn btn-accent",
    outline: "btn btn-outline",
    text: "btn btn-text"
  }

  const sizeClasses = {
    xs: "btn-xs",
    small: "btn-sm",
    medium: "btn-md",
    large: "btn-lg"
  }

  return (
    <button
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${disabled ? "disabled" : ""} ${loading ? "loading" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {leftIcon && <span className="btn-left-icon">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="btn-right-icon">{rightIcon}</span>}
    </button>
  )
}

// ===== INPUT COMPONENT =====

export interface InputProps {
  type?: "text" | "search" | "email" | "password" | "url"
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  error?: string
  disabled?: boolean
  icon?: ReactNode
  helpText?: string
  size?: "small" | "medium" | "large"
}

export function Input({
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  onFocus,
  error,
  disabled = false,
  icon,
  helpText,
  size = "medium"
}: InputProps) {
  const typeClasses = {
    text: "input input-text",
    search: "input input-search",
    password: "input input-password",
    email: "input input-email",
    url: "input input-url"
  }

  const sizeClasses = {
    small: "input-sm",
    medium: "input-md",
    large: "input-lg"
  }

  return (
    <div className={`input-wrapper input-${sizeClasses[size]} ${error ? "input-error" : ""} ${disabled ? "input-disabled" : ""}`}>
      {label && (
        <label className="input-label">
          {label}
          {helpText && <span className="input-help">{helpText}</span>}
        </label>
      )}

      {icon && <div className="input-icon">{icon}</div>}

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        onFocus={onFocus}
        disabled={disabled}
        className={typeClasses[type]}
      />

      {error && <span className="input-error-text">{error}</span>}
    </div>
  )
}

// ===== CARD COMPONENT =====

export interface CardProps {
  children: ReactNode
  variant?: "default" | "elevated" | "outlined"
  hover?: boolean
  onClick?: () => void
  className?: string
  padding?: "none" | "small" | "medium" | "large"
}

export function Card({
  children,
  variant = "default",
  hover = true,
  onClick,
  className: "",
  padding = "medium"
}: CardProps) {
  const variantClasses = {
    default: "card card-default",
    elevated: "card card-elevated",
    outlined: "card card-outlined"
  }

  const paddingClasses = {
    none: "card-padding-none",
    small: "card-padding-small",
    medium: "card-padding-medium",
    large: "card-padding-large"
  }

  return (
    <div
      className={`${variantClasses[variant]} card ${hover ? "card-hover" : ""} ${className}`}
      onClick={onClick}
      style={{ padding: padding !== "none" ? "" : "" }}
    >
      {children}
    </div>
  )
}

// ===== BADGE COMPONENT =====

export interface BadgeProps {
  children: ReactNode
  variant?: "default" | "success" | "warning" | "error"
  size?: "small" | "medium" | "large"
  pulse?: boolean
}

export function Badge({
  children,
  variant = "default",
  size = "medium",
  pulse = false
}: BadgeProps) {
  const variantClasses = {
    default: "badge badge-default",
    success: "badge badge-success",
    warning: "badge badge-warning",
    error: "badge badge-error"
  }

  const sizeClasses = {
    small: "badge-sm",
    medium: "badge-md",
    large: "badge-lg"
  }

  return (
    <span
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${pulse ? "badge-pulse" : ""}`}
    >
      {children}
    </span>
  )
}
