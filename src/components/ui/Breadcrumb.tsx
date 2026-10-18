export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  'aria-label'?: string;
}

export function Breadcrumb({ items, className = '', 'aria-label': ariaLabel = 'Breadcrumb' }: BreadcrumbProps) {
  return (
    <nav className={`af-breadcrumb${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
      <ol className="af-breadcrumb__list">
        {items.map((item, index) => (
          <li key={index} className="af-breadcrumb__item">
            {index > 0 && (
              <span className="af-breadcrumb__separator" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
            {item.href && !item.current ? (
              <a href={item.href} className="af-breadcrumb__link">{item.label}</a>
            ) : (
              <span className="af-breadcrumb__current" aria-current={item.current ? 'page' : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}