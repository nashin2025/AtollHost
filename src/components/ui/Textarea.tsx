import { type TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
      required,
      optional,
      className = '',
      id,
      disabled,
      ...rest
    }: TextareaProps,
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
    const hintId = hint ? `${textareaId}-hint` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`af-field${className ? ` ${className}` : ''}`}>
        {label && (
          <label htmlFor={textareaId} className="af-field__label">
            {label}
            {required && <span className="af-field__required" aria-hidden="true">*</span>}
            {optional && <span className="af-field__optional">(optional)</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`af-textarea${error ? ' af-textarea--error' : ''}`}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          {...rest}
        />
        {hint && !error && <p id={hintId} className="af-field__hint">{hint}</p>}
        {error && <p id={errorId} className="af-field__error" role="alert">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';