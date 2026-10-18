import { type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      required,
      optional,
      leftIcon,
      rightIcon,
      className = '',
      id,
      disabled,
      ...rest
    }: InputProps,
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`af-field${className ? ` ${className}` : ''}`}>
        {label && (
          <label htmlFor={inputId} className="af-field__label">
            {label}
            {required && <span className="af-field__required" aria-hidden="true">*</span>}
            {optional && <span className="af-field__optional">(optional)</span>}
          </label>
        )}
        <div className="af-field__input-wrapper">
          {leftIcon && <span className="af-field__icon af-field__icon--left" aria-hidden="true">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`af-input${error ? ' af-input--error' : ''}${leftIcon ? ' af-input--has-left-icon' : ''}${rightIcon ? ' af-input--has-right-icon' : ''}`}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            {...rest}
          />
          {rightIcon && <span className="af-field__icon af-field__icon--right" aria-hidden="true">{rightIcon}</span>}
        </div>
        {hint && !error && <p id={hintId} className="af-field__hint">{hint}</p>}
        {error && <p id={errorId} className="af-field__error" role="alert">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';