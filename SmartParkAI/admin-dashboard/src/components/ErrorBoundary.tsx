import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Dashboard Error Boundary Caught]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '80px auto', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(7, 29, 66, 0.08)', textAlign: 'center' }}>
          <img src="/smartpark-logo.png" alt="SmartPark AI" style={{ height: '64px', marginBottom: '20px' }} />
          <h2 style={{ color: '#071D42', marginBottom: '12px', fontSize: '22px' }}>Something went wrong in Dashboard</h2>
          <p style={{ color: '#68758A', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
            {this.state.error?.message || 'A visual component encountered an issue.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 24px', background: '#0878E8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload Console
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
