import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ErrorAlertProps {
  /** Error title */
  title: string;
  /** Error message */
  message: string;
  /** Optional actions to display */
  actions?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable error alert component with consistent styling
 */
export function ErrorAlert({ title, message, actions, className = "" }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`p-5 bg-destructive/10 border-2 border-destructive/30 text-destructive rounded-lg ${className}`}
    >
      <div className="font-bold text-lg mb-3 flex items-center gap-2">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <title>{title}</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{title}</span>
      </div>
      <div className="text-base whitespace-pre-wrap leading-relaxed">{message}</div>
      {actions && <div className="mt-4">{actions}</div>}
    </div>
  );
}

interface ErrorAlertWithActionsProps extends Omit<ErrorAlertProps, "actions"> {
  /** Primary action button */
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Error alert with built-in action buttons
 */
export function ErrorAlertWithActions({
  title,
  message,
  primaryAction,
  secondaryAction,
  className,
}: ErrorAlertWithActionsProps) {
  const actions =
    primaryAction || secondaryAction ? (
      <div className="mt-4">
        {primaryAction && (
          <Button onClick={primaryAction.onClick} variant="primary" className="mr-2">
            {primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} variant="outline">
            {secondaryAction.label}
          </Button>
        )}
      </div>
    ) : undefined;

  return <ErrorAlert title={title} message={message} actions={actions} className={className} />;
}
