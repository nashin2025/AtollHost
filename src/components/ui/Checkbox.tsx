import { type InputHTMLAttributes, forwardRef, useImperativeHandle, useRef } from 'react';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      className = '',
      id,
      disabled,
      required,
      ...rest
    }: CheckboxProps,
    ref
  ) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;
    const descId = description ? `${checkboxId}-desc` : undefined;
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    return (
      <div className={`af-checkbox${className ? ` ${className}` : ''}`}>
        <input
          ref={inputRef}
          type="checkbox"
          id={checkboxId}
          className="af-checkbox__input"
          disabled={disabled}
          required={required}
          aria-describedby={descId}
          {...rest}
        />
        <span className="af-checkbox__box" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8l3 3 5-5" />
          </svg>
        </span>
        {(label || description) && (
          <label htmlFor={checkboxId} className="af-checkbox__label">
            {label && <span className="af-checkbox__label-text">{label}</span>}
            {description && <span id={descId} className="af-checkbox__desc">{description}</span>}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';