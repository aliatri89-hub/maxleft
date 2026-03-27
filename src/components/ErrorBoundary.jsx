import { t } from "../theme";
import { Component } from "react";

/**
 * ErrorBoundary — catches render errors in child trees.
 *
 * Usage:
 *   <ErrorBoundary name="games">
 *     <GamesHub />
 *   </ErrorBoundary>
 *
 * Props:
 *   name      — human-readable label for the section (shown in error UI)
 *   fallback  — optional custom fallback component/element
 *   onError   — optional (error, info) => void callback
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    const section = this.props.name || "unknown";
    console.error(`[ErrorBoundary:${section}]`, error, info?.componentStack);
    this.props.onError?.(error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const section = this.props.name || "This section";
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "48px 24px", minHeight: 200,
          color: t.textMuted, textAlign: "center",
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: t.textMuted }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, marginBottom: 20, maxWidth: 280, lineHeight: 1.4 }}>
            {section} hit an error. Your data is safe.
          </div>
          <button
            onClick={this.handleRetry}
            style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10, padding: "10px 24px", color: t.textSecondary,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
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
