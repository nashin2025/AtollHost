import { type ReactNode, type HTMLAttributes } from 'react';

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  header?: ReactNode;
  description?: string;
  actions?: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export function PageContainer({
  children,
  header,
  description,
  actions,
  fullWidth = false,
  className = '',
  ...props
}: PageContainerProps) {
  return (
    <div className={`af-page${fullWidth ? ' af-page--full-width' : ''}${className ? ` ${className}` : ''}`} {...props}>
      {(header || description || actions) && (
        <div className="af-page__header">
          <div className="af-page__header-content">
            {header && <div className="af-page__header-main">{header}</div>}
            {description && <p className="af-page__description">{description}</p>}
          </div>
          {actions && <div className="af-page__actions">{actions}</div>}
        </div>
      )}
      <main className="af-page__content" id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}