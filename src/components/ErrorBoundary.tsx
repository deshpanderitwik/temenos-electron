'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center p-8">
          <div className="max-w-2xl text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-400">
              Something went wrong
            </h1>
            <p className="text-gray-300 mb-6">
              An unexpected error occurred. Please try refreshing the application.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
            >
              Refresh Application
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-gray-400 hover:text-white">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 p-4 bg-black/20 rounded text-sm text-red-300 overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
