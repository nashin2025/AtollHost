import { forwardRef, type HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  default: { bg: 'var(--color-primary)', color: 'var(--color-primary-contrast)', border: 'none' },
  secondary: { bg: 'var(--color-gray-200)', color: 'var(--color-gray-800)', border: 'none' },
  success: { bg: 'var(--color-green-100)', color: 'var(--color-green-800)', border: 'none' },
  warning: { bg: 'var(--color-yellow-100)', color: 'var(--color-yellow-800)', border: 'none' },
  danger: { bg: 'var(--color-red-100)', color: 'var(--color-red-800)', border: 'none' },
  info: { bg: 'var(--color-blue-100)', color: 'var(--color-blue-800)', border: 'none' },
  outline: { bg: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-border)' },
};

// Legacy tone mapping for backward compatibility
const toneToVariant: Record<string, BadgeVariant> = {
  neutral: 'secondary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  // Legacy props for backward compatibility
  status?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'md', children, style, status, tone, ...props }, ref) => {
    // Support legacy API: <Badge status="verified" tone="success" />
    const resolvedVariant = status && tone ? toneToVariant[tone] : variant;

    const styles = variantStyles[resolvedVariant];
    const sizeStyles = {
      sm: { padding: '2px 6px', fontSize: 'var(--font-size-xs)', borderRadius: 'var(--radius-sm)' },
      md: { padding: '4px 8px', fontSize: 'var(--font-size-sm)', borderRadius: 'var(--radius-md)' },
      lg: { padding: '6px 12px', fontSize: 'var(--font-size-base)', borderRadius: 'var(--radius-lg)' },
    }[size];

    return (
      <span
        ref={ref}
        className={`badge ${className}`.trim()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          backgroundColor: styles.bg,
          color: styles.color,
          border: styles.border,
          ...sizeStyles,
          ...style,
        }}
        {...props}
      >
        {children ?? status}
      </span>
    );
  },
);

Badge.displayName = 'Badge';