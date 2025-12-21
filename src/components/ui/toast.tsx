import * as React from "react"
import { cn } from "@/lib/utils"

export interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose?: () => void
  className?: string
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ message, type = 'success', onClose, className }, ref) => {
    const bgColor = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
    }[type]

    return (
      <div
        ref={ref}
        className={cn(
          "fixed bottom-4 right-4 z-50 animate-[slideUp_0.3s_ease-out]",
          className
        )}
      >
        <div className={cn(
          "text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2",
          bgColor
        )}>
          {type === 'success' && (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          <span>{message}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 hover:opacity-80"
              aria-label="Close"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }
)
Toast.displayName = "Toast"

