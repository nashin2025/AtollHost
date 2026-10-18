import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      iconOnly = false,
      loading = false,
      fullWidth = false,
      children,
      disabled,
      className = '',
      ...rest
    }: ButtonProps,
    ref
  ) => {
    const baseClasses = [
      'af-btn',
      `af-btn--${variant}`,
      `af-btn--${size}`,
      iconOnly && 'af-btn--icon-only',
      loading && 'af-btn--loading',
      fullWidth && 'af-btn--full-width',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type="button"
        className={baseClasses}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-disabled={disabled || loading}
        {...rest}
      >
        {loading && (
          <span className="af-btn__spinner" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle
                cx="10"
                cy="10"
                r="8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="31.4 31.4"
                style={{ animation: 'af-spin 0.8s linear infinite' }}
              />
            </svg>
          </span>
        )}
        <span className={loading ? 'af-btn__content--hidden' : ''}>
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';