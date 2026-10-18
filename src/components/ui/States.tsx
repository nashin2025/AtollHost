import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="af-empty-state" role="status" aria-label={title}>
      <h3 className="af-empty-state__title">{title}</h3>
      <p className="af-empty-state__description">{message}</p>
      {action && <div className="af-empty-state__action">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="af-skeleton" role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div className="af-skeleton__line" style={{ width: '100%' }} aria-hidden="true" />
      <div className="af-skeleton__line" style={{ width: '70%' }} aria-hidden="true" />
      <div className="af-skeleton__line" style={{ width: '50%' }} aria-hidden="true" />
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
    <div className="af-error-state" role="alert">
      <h3 className="af-error-state__title">{title}</h3>
      <p className="af-error-state__description">{message}</p>
      <div className="af-error-state__actions">
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
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
    <div className="af-error-state" role="alert">
      <h3 className="af-error-state__title">Access denied</h3>
      <p className="af-error-state__description">
        You do not have permission to view this content. If you believe this is
        an error, ask your organization administrator for access.
      </p>
      <div className="af-error-state__actions">
        {onRequestAccess && (
          <Button variant="secondary" onClick={onRequestAccess}>
            Request access
          </Button>
        )}
      </div>
    </div>
  );
}
