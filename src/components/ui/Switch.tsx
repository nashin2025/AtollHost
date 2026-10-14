import { forwardRef, type InputHTMLAttributes } from 'react';

export const Switch = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', disabled, checked, onChange, id, 'aria-label': ariaLabel, ...props }, ref) => {
    const switchId = id || `switch-${Math.random().toString(36).slice(2)}`;
    return (
      <label className={`switch ${className}`.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          id={switchId}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          aria-label={ariaLabel}
          {...props}
          style={{
            appearance: 'none',
            width: '2.5rem',
            height: '1.5rem',
            borderRadius: '9999px',
            backgroundColor: checked ? 'var(--color-primary)' : 'var(--color-border)',
            border: 'none',
            position: 'relative',
            transition: 'background-color 150ms ease',
            flexShrink: 0,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <span
          style={{
            display: 'block',
            width: '1.125rem',
            height: '1.125rem',
            borderRadius: '50%',
            backgroundColor: 'var(--color-background)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            position: 'absolute',
            top: '0.1875rem',
            left: checked ? '1.1875rem' : '0.1875rem',
            transition: 'left 150ms ease',
            pointerEvents: 'none',
          }}
        />
      </label>
    );
  },
);

Switch.displayName = 'Switch';