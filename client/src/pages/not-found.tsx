import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-404-title">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground" data-testid="text-404-description">
            The page you are looking for does not exist or has been moved.
          </p>

          <Link href="/">
            <Button className="mt-6 gap-2" data-testid="button-go-home">
              <Home className="h-4 w-4" />
              Go to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
