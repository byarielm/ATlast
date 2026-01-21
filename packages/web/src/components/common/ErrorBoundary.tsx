import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackType?: "full" | "inline";
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error boundary caught error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const { fallbackType = "full" } = this.props;

      if (fallbackType === "inline") {
        return (
          <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <h3 className="mb-1 font-semibold text-red-900 dark:text-red-100">
                  Something went wrong
                </h3>
                <p className="mb-3 text-sm text-red-800 dark:text-red-200">
                  {this.state.error?.message || "An unexpected error occurred"}
                </p>
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  <RefreshCw className="size-4" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Full page error
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50 p-4 dark:from-indigo-950 dark:via-purple-900 dark:to-slate-900">
          <div className="w-full max-w-md rounded-3xl border-2 border-red-500 bg-white p-8 shadow-2xl dark:bg-slate-900">
            <div className="mb-6 flex justify-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="size-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <h1 className="mb-2 text-center text-2xl font-bold text-purple-950 dark:text-cyan-50">
              Oops! Something went wrong
            </h1>

            <p className="mb-6 text-center text-purple-750 dark:text-cyan-250">
              We encountered an unexpected error. Don't worry, your data is
              safe.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 rounded-lg bg-slate-100 p-4 text-xs dark:bg-slate-800">
                <summary className="mb-2 cursor-pointer font-semibold text-purple-900 dark:text-cyan-100">
                  Error Details (Dev Only)
                </summary>
                <pre className="overflow-auto text-red-600 dark:text-red-400">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-500"
              >
                <RefreshCw className="size-5" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-slate-700"
              >
                <Home className="size-5" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
