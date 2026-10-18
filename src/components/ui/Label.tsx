import { type LabelHTMLAttributes, forwardRef } from 'react';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  (
    { required, optional, className = '', children, ...rest }: LabelProps,
    ref
  ) => {
    return (
      <label ref={ref} className={`af-label${className ? ` ${className}` : ''}`} {...rest}>
        {children}
        {required && <span className="af-label__required" aria-hidden="true">*</span>}
        {optional && <span className="af-label__optional">(optional)</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';