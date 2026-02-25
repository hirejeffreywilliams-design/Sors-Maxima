import { Component, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

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
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6" data-testid="error-boundary-fallback">
          <Card className="max-w-md w-full">
            <CardContent className="py-10">
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-7 h-7 text-destructive" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-semibold">Something went wrong</p>
                  <p className="text-sm text-muted-foreground">
                    {this.state.error?.message || "An unexpected error occurred while rendering this page."}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => this.setState({ hasError: false, error: null })}
                    data-testid="button-try-again"
                  >
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    Try Again
                  </Button>
                  <a href="/" data-testid="link-go-home">
                    <Button variant="default">
                      <Home className="w-4 h-4 mr-1.5" />
                      Go Home
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
