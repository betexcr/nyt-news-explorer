import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useErrorStore } from '../store/errorStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Add error to the global error store
    if (typeof window !== 'undefined') {
      useErrorStore.getState().addError({
        message: error.message,
        stack: error.stack,
        type: 'error',
        source: 'react',
        componentStack: errorInfo.componentStack || undefined,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '20px',
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#ffe0e0',
          color: '#d63031',
          margin: '20px',
        }}>
          <h3>Something went wrong</h3>
          <p>{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to use hooks
export const ErrorBoundary: React.FC<Props> = ({ children, fallback }) => {
  return <ErrorBoundaryClass fallback={fallback}>{children}</ErrorBoundaryClass>;
};
