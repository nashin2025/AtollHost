import { type ReactNode } from 'react';

export interface SidebarProps {
  children: ReactNode;
  brand?: ReactNode;
  footer?: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  'aria-label'?: string;
  className?: string;
}

export function Sidebar({
  children,
  brand,
  footer,
  collapsed = false,
  onToggleCollapse,
  'aria-label': ariaLabel = 'Primary navigation',
  className = '',
}: SidebarProps) {
  return (
    <aside
      className={`af-sidebar${collapsed ? ' af-sidebar--collapsed' : ''}${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
      role="navigation"
    >
      <div className="af-sidebar__header">
        {brand && <div className="af-sidebar__brand">{brand}</div>}
        {onToggleCollapse && (
          <button
            type="button"
            className="af-sidebar__toggle"
            onClick={onToggleCollapse}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              {collapsed ? (
                <path d="M11 5l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M9 5l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        )}
      </div>
      <nav className="af-sidebar__nav">{children}</nav>
      {footer && <div className="af-sidebar__footer">{footer}</div>}
    </aside>
  );
}