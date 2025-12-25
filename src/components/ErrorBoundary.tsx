import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { router } from "@/main";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Navigate to home using history API for SPA navigation
    // Note: For a true reset of app state, a full reload may still be needed
    // but using history API provides better UX than hard reload
    window.history.pushState({}, "", "/");
    window.location.reload(); // Still reload for complete state reset
  };

  handleGoHome = () => {
    // Use router navigation for proper SPA navigation
    router.navigate({ to: "/" }).catch((error) => {
      console.error("Navigation error:", error);
      // Fallback to history API if router navigation fails
      window.history.pushState({}, "", "/");
      window.location.reload();
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                An unexpected error occurred. Please try refreshing the page or starting a new
                debate.
              </p>
              {this.state.error && import.meta.env.DEV && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground">
                    Error details (development only)
                  </summary>
                  <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto text-xs">
                    {this.state.error.toString()}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}
              <div className="flex gap-3">
                <Button onClick={this.handleReset} variant="primary">
                  Reload Page
                </Button>
                <Button onClick={this.handleGoHome} variant="outline">
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
