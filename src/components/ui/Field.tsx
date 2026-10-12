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
      className={['field', error ? 'field-invalid' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <label htmlFor={id}>
        {label}{' '}
        {optional ? (
          <span className="field-optional">(optional)</span>
        ) : (
          <>
            <span aria-hidden="true" className="field-required">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={!optional}
        {...rest}
      />
      {helper && !error && <p id={`${id}-helper`} className="field-helper">{helper}</p>}
      {error && (
        <p id={`${id}-error`} className="field-error-text" role="alert">
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
}

export function SelectField({
  label,
  helper,
  error,
  optional = false,
  children,
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
      className={['field', error ? 'field-invalid' : '', '']
        .filter(Boolean)
        .join(' ')}
    >
      <label htmlFor={id}>
        {label}{' '}
        {optional ? (
          <span className="field-optional">(optional)</span>
        ) : (
          <>
            <span aria-hidden="true" className="field-required">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={!optional}
        {...rest}
      >
        {children}
      </select>
      {helper && !error && <p id={`${id}-helper`} className="field-helper">{helper}</p>}
      {error && (
        <p id={`${id}-error`} className="field-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
