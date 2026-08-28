import React from 'react';
type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean; error?: Error };
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('ErrorBoundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div role="alert" style={{ padding: 32, textAlign: 'center', color: '#e8eaf0', background: '#0f1117', minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <h2 style={{ color: '#f7fbff' }}>Something went wrong</h2>
          <p style={{ color: '#8b9bb0', maxWidth: 480 }}>Please refresh the page. If the issue persists, <a href="https://github.com/zoop-internet/zoop/issues" style={{ color: '#38bdf8' }}>report it</a>.</p>
          <button onClick={() => location.reload()} style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#38bdf8 0%,#34d399 100%)', color: '#020904', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Refresh</button>
          {this.state.error && <pre style={{ fontSize: 11, color: '#505668', maxWidth: 600, overflow: 'auto', marginTop: 8 }}>{this.state.error.message}</pre>}
        </div>
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
