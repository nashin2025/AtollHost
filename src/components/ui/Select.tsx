import { type SelectHTMLAttributes, forwardRef } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      hint,
      error,
      required,
      optional,
      placeholder,
      options,
      className = '',
      id,
      disabled,
      ...rest
    }: SelectProps,
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
    const hintId = hint ? `${selectId}-hint` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`af-field${className ? ` ${className}` : ''}`}>
        {label && (
          <label htmlFor={selectId} className="af-field__label">
            {label}
            {required && <span className="af-field__required" aria-hidden="true">*</span>}
            {optional && <span className="af-field__optional">(optional)</span>}
          </label>
        )}
        <div className="af-field__select-wrapper">
          <select
            ref={ref}
            id={selectId}
            className={`af-select${error ? ' af-select--error' : ''}`}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="af-select__icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 7l5 5 5-5" />
            </svg>
          </span>
        </div>
        {hint && !error && <p id={hintId} className="af-field__hint">{hint}</p>}
        {error && <p id={errorId} className="af-field__error" role="alert">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';