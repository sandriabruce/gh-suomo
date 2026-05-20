import { Component, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full flex flex-col items-center gap-4 p-8 text-center">
          <Logo size="lg" />
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.reset}>Try again</Button>
            <Button onClick={() => (window.location.href = "/app/discover")}>Go home</Button>
          </div>
        </Card>
      </div>
    );
  }
}

export default ErrorBoundary;