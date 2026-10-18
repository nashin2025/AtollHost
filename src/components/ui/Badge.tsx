import { type HTMLAttributes, forwardRef } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneToVariant: Record<BadgeTone, BadgeVariant> = {
  neutral: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  // Legacy props for backward compatibility
  status?: string;
  tone?: BadgeTone;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      dot = false,
      className = '',
      children,
      style,
      status,
      tone,
      ...props
    }: BadgeProps,
    ref
  ) => {
    // Support legacy API: <Badge status="verified" tone="success" />
    const resolvedVariant = status && tone ? toneToVariant[tone] : variant;

    const baseClasses = [
      'af-badge',
      `af-badge--${resolvedVariant}`,
      `af-badge--${size}`,
      dot && 'af-badge--dot',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span
        ref={ref}
        className={baseClasses}
        style={style}
        {...props}
      >
        {dot && <span className="af-badge__dot" aria-hidden="true" />}
        {children ?? status}
      </span>
    );
  }
);

Badge.displayName = 'Badge';