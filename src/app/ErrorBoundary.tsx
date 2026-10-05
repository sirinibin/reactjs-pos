import { Component, type ReactNode } from 'react';

/** Keeps a crash in one page from blanking the whole workspace. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="pad">
        <div className="banner crit" role="alert">
          <div style={{ flex: 1 }}>
            <b>This page hit an unexpected error.</b> {this.state.error.message}
          </div>
          <button className="btn sm" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      </div>
    );
  }
}
