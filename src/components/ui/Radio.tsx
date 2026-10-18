import { type InputHTMLAttributes, forwardRef } from 'react';

export interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      description,
      className = '',
      id,
      disabled,
      required,
      ...rest
    }: RadioProps,
    ref
  ) => {
    const radioId = id || `radio-${Math.random().toString(36).slice(2, 9)}`;
    const descId = description ? `${radioId}-desc` : undefined;

    return (
      <div className={`af-radio${className ? ` ${className}` : ''}`}>
        <input
          ref={ref}
          type="radio"
          id={radioId}
          className="af-radio__input"
          disabled={disabled}
          required={required}
          aria-describedby={descId}
          {...rest}
        />
        <span className="af-radio__circle" aria-hidden="true">
          <span className="af-radio__dot" />
        </span>
        {(label || description) && (
          <label htmlFor={radioId} className="af-radio__label">
            {label && <span className="af-radio__label-text">{label}</span>}
            {description && <span id={descId} className="af-radio__desc">{description}</span>}
          </label>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';