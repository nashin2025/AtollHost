import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Uncaught UI error', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main role="alert" className="af-card af-card--body error-boundary" style={{ maxWidth: 480, margin: 'var(--space-6) auto' }}>
          <h1>Something went wrong</h1>
          <p>
            This screen hit an unexpected error. Reload the page, and if the
            problem continues, contact your organization administrator.
          </p>
          <button
            type="button"
            className="af-btn af-btn--primary"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
