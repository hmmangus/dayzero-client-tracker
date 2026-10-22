import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StorageCorruptedError } from '../repositories';
import { CorruptDataScreen } from './CorruptDataScreen';
import { buttonClass } from './ui';

interface State {
  error: Error | null;
}

/** Catches render errors. Corrupted storage gets a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (error instanceof StorageCorruptedError) return <CorruptDataScreen error={error} onRecovered={this.reset} />;

    return (
      <div role="alert" className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{error.message}</p>
        <button type="button" className={buttonClass('primary', 'mt-6')} onClick={() => window.location.reload()}>
          Reload the app
        </button>
      </div>
    );
  }
}
