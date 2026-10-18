import { type ReactNode } from 'react';
import { Breadcrumb } from './Breadcrumb';

export interface TopHeaderProps {
  title: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
  userMenu?: ReactNode;
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export function TopHeader({
  title,
  breadcrumbs,
  actions,
  userMenu,
  onMobileMenuToggle,
  mobileMenuOpen = false,
}: TopHeaderProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && mobileMenuOpen && onMobileMenuToggle) {
      onMobileMenuToggle();
    }
  };

  const breadcrumbItems = breadcrumbs?.map((crumb) => ({
    label: crumb.label,
    href: crumb.href,
    current: !crumb.href,
  }));

  return (
    <header className="af-topbar" role="banner" onKeyDown={handleKeyDown}>
      <button
        type="button"
        className={`af-topbar__mobile-toggle${mobileMenuOpen ? ' af-topbar__mobile-toggle--open' : ''}`}
        onClick={onMobileMenuToggle}
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-sidebar"
        aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          {mobileMenuOpen ? (
            <path d="M5 5l10 10M15 5l-10 10" strokeLinecap="round" />
          ) : (
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {breadcrumbItems && breadcrumbItems.length > 0 && (
        <nav className="af-topbar__breadcrumbs" aria-label="Breadcrumb">
          <Breadcrumb items={breadcrumbItems} />
        </nav>
      )}

      <h1 className="af-topbar__title">{title}</h1>

      <div className="af-topbar__actions">
        {actions}
        <div className="af-topbar__user">{userMenu}</div>
      </div>
    </header>
  );
}