import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="state-empty">
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state-loading" role="status">
      <span className="sr-only">{label}</span>
      <span className="skeleton skeleton-line" aria-hidden="true" />
      <span className="skeleton skeleton-line" aria-hidden="true" />
      <span className="skeleton skeleton-line" aria-hidden="true" />
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="state-error" role="alert">
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

interface PermissionDeniedProps {
  onRequestAccess?: () => void;
}

export function PermissionDeniedState({
  onRequestAccess,
}: PermissionDeniedProps) {
  return (
    <div className="state-denied">
      <h3>Access denied</h3>
      <p>
        You do not have permission to view this content. If you believe this is
        an error, ask your organization administrator for access.
      </p>
      {onRequestAccess && (
        <Button variant="secondary" onClick={onRequestAccess}>
          Request access
        </Button>
      )}
    </div>
  );
}
