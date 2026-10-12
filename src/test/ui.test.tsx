import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Field } from '../components/ui/Field';

describe('Button', () => {
  it('disables itself while loading', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
});

describe('Badge', () => {
  it('shows the status text so color is not the only indicator', () => {
    render(<Badge status="verified" tone="success" />);
    expect(screen.getByText('verified')).toBeInTheDocument();
  });
});

describe('Dialog', () => {
  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open title="Test dialog" onClose={onClose}>
        <p>Dialog body</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Field', () => {
  it('links the label, error message, and input', () => {
    render(
      <Field label="Email" type="email" error="Enter a valid email" />,
    );
    const input = screen.getByLabelText(/email.*\(required\)/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a valid email',
    );
  });
});
