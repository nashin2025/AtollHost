import {
  type ChangeEvent,
  type InputHTMLAttributes,
  forwardRef,
} from 'react';

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      description,
      className = '',
      id,
      disabled,
      required,
      onChange,
      ...rest
    }: SwitchProps,
    ref
  ) => {
    const switchId = id || `switch-${Math.random().toString(36).slice(2, 9)}`;
    const descId = description ? `${switchId}-desc` : undefined;

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event.target.checked);
    };

    return (
      <div className={`af-switch${className ? ` ${className}` : ''}`}>
        <input
          ref={ref}
          type="checkbox"
          id={switchId}
          className="af-switch__input"
          role="switch"
          disabled={disabled}
          required={required}
          aria-describedby={descId}
          onChange={handleChange}
          {...rest}
        />
        <span className="af-switch__track" aria-hidden="true">
          <span className="af-switch__thumb" />
        </span>
        {(label || description) && (
          <label htmlFor={switchId} className="af-switch__label">
            {label && <span className="af-switch__label-text">{label}</span>}
            {description && <span id={descId} className="af-switch__desc">{description}</span>}
          </label>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';