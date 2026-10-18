import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useId,
} from 'react';

interface Props
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> {
  label: string;
  helper?: string;
  error?: string;
  optional?: boolean;
  className?: string;
}

export function Field({
  label,
  helper,
  error,
  optional = false,
  className = '',
  ...rest
}: Props) {
  const id = useId();
  const describedBy = [
    helper && !error ? `${id}-helper` : '',
    error ? `${id}-error` : '',
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div
      className={['af-field', error ? 'af-field--error' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <label htmlFor={id} className="af-field__label">
        {label}
        {optional ? (
          <span className="af-field__optional">(optional)</span>
        ) : (
          <>
            <span aria-hidden="true" className="af-field__required">*</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      <input
        id={id}
        className="af-input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={!optional}
        {...rest}
      />
      {helper && !error && (
        <p id={`${id}-helper`} className="af-field__hint">{helper}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="af-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  helper?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function SelectField({
  label,
  helper,
  error,
  optional = false,
  children,
  className = '',
  ...rest
}: SelectProps) {
  const id = useId();
  const describedBy = [
    helper && !error ? `${id}-helper` : '',
    error ? `${id}-error` : '',
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div
      className={['af-field', error ? 'af-field--error' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <label htmlFor={id} className="af-field__label">
        {label}
        {optional ? (
          <span className="af-field__optional">(optional)</span>
        ) : (
          <>
            <span aria-hidden="true" className="af-field__required">*</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      <div className="af-field__select-wrapper">
        <select
          id={id}
          className="af-select"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={!optional}
          {...rest}
        >
          {children}
        </select>
        <span className="af-select__icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 7l5 5 5-5" />
          </svg>
        </span>
      </div>
      {helper && !error && (
        <p id={`${id}-helper`} className="af-field__hint">{helper}</p>
      )}
      {error && (
        <p id={`${id}-error`} className="af-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
