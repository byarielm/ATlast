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
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Something went wrong
                </h3>
                <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                  {this.state.error?.message || "An unexpected error occurred"}
                </p>
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Full page error
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50 dark:from-indigo-950 dark:via-purple-900 dark:to-slate-900">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border-2 border-red-500">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-purple-950 dark:text-cyan-50 mb-2">
              Oops! Something went wrong
            </h1>

            <p className="text-center text-purple-750 dark:text-cyan-250 mb-6">
              We encountered an unexpected error. Don't worry, your data is
              safe.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                <summary className="cursor-pointer font-semibold text-purple-900 dark:text-cyan-100 mb-2">
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
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
              >
                <Home className="w-5 h-5" />
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
