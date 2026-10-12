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
        <main role="alert" className="error-boundary">
          <h1>Something went wrong</h1>
          <p>
            This screen hit an unexpected error. Reload the page, and if the
            problem continues, contact your organization administrator.
          </p>
          <button
            type="button"
            className="btn btn-primary"
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
