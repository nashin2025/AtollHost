import { type InputHTMLAttributes, useId } from 'react';

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
