import {
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  iconOnly?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  iconOnly = false,
  loading = false,
  children,
  disabled,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={[
        'btn',
        `btn-${variant}`,
        iconOnly ? 'btn-icon' : '',
        loading ? 'btn-loading' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
