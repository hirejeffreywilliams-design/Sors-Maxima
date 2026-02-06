import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WifiOff, RefreshCw, Clock, AlertTriangle, ServerCrash, Database } from "lucide-react";

interface ServiceFallbackProps {
  service: "odds" | "model" | "api" | "database";
  lastUpdated?: string;
  onRetry?: () => void;
  message?: string;
}

const serviceConfig = {
  odds: {
    icon: WifiOff,
    title: "Live Odds Unavailable",
    description: "We're unable to fetch live odds right now. This could be due to the odds provider being temporarily down.",
    fallbackMessage: "Showing last available data. Odds may not reflect current lines.",
  },
  model: {
    icon: ServerCrash,
    title: "Analysis Engine Offline",
    description: "The prediction model service is temporarily unavailable.",
    fallbackMessage: "Basic analysis is still available. Advanced quantum features will return shortly.",
  },
  api: {
    icon: WifiOff,
    title: "Connection Issue",
    description: "We're having trouble connecting to our servers.",
    fallbackMessage: "Please check your internet connection and try again.",
  },
  database: {
    icon: Database,
    title: "Data Service Unavailable",
    description: "We're unable to access the data service right now.",
    fallbackMessage: "Your data is safe. The service will be restored shortly.",
  },
};

export function ServiceFallback({ service, lastUpdated, onRetry, message }: ServiceFallbackProps) {
  const config = serviceConfig[service];
  const Icon = config.icon;

  return (
    <Card data-testid={`fallback-${service}`}>
      <CardContent className="py-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Icon className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">{config.title}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {message || config.description}
            </p>
          </div>

          <Alert className="max-w-md mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Limited Functionality</AlertTitle>
            <AlertDescription className="text-xs">
              {config.fallbackMessage}
            </AlertDescription>
          </Alert>

          {lastUpdated && (
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}

          {onRetry && (
            <Button variant="outline" onClick={onRetry} data-testid={`button-retry-${service}`}>
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    testId?: string;
  };
  testId?: string;
}

export function EmptyState({ icon: Icon, title, description, action, testId }: EmptyStateProps) {
  return (
    <Card data-testid={testId || "empty-state"}>
      <CardContent className="py-12">
        <div className="text-center space-y-4">
          {Icon && (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-2">
            <p className="text-lg font-medium" data-testid="text-empty-title">{title}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto" data-testid="text-empty-description">
              {description}
            </p>
          </div>
          {action && (
            <Button variant="outline" onClick={action.onClick} data-testid={action.testId || "button-empty-action"}>
              {action.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  testId?: string;
}

export function ErrorState({ title, message, onRetry, testId }: ErrorStateProps) {
  return (
    <Card data-testid={testId || "error-state"}>
      <CardContent className="py-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium" data-testid="text-error-title">
              {title || "Something went wrong"}
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto" data-testid="text-error-message">
              {message || "An unexpected error occurred. Please try again."}
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} data-testid="button-error-retry">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface LoadingSkeletonProps {
  rows?: number;
  testId?: string;
}

export function LoadingSkeleton({ rows = 3, testId }: LoadingSkeletonProps) {
  return (
    <div className="space-y-4" data-testid={testId || "loading-skeleton"}>
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <CardContent className="py-6">
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-5/6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
