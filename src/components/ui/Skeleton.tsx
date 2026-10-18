import { type HTMLAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  lines?: number;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = 'text',
  lines = 3,
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const baseClasses = ['af-skeleton', `af-skeleton--${variant}`, className].filter(Boolean).join(' ');

  if (variant === 'text') {
    return (
      <div className={baseClasses} style={style} {...props}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="af-skeleton__line" style={{ width: i === lines - 1 ? '70%' : '100%' }} />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    return (
      <div
        className={baseClasses}
        style={{
          width: width || '40px',
          height: height || '40px',
          borderRadius: '50%',
          ...style,
        }}
        {...props}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={baseClasses}
        style={{
          width: width || '100%',
          height: height || '16px',
          borderRadius: 'var(--radius-sm)',
          ...style,
        }}
        {...props}
      />
    );
  }

  // Card skeleton
  return (
    <div className={baseClasses} style={style} {...props}>
      <div className="af-skeleton__card-image" />
      <div className="af-skeleton__card-body">
        <div className="af-skeleton__line" style={{ width: '80%' }} />
        <div className="af-skeleton__line" style={{ width: '60%' }} />
        <div className="af-skeleton__line" style={{ width: '40%' }} />
      </div>
    </div>
  );
}