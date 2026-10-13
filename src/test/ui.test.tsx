import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Field, SelectField } from '../components/ui/Field';

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

  it('keeps form focus when the parent re-renders', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState('');
      return (
        <Dialog open title="Edit" onClose={() => {}}>
          <input
            aria-label="Name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Dialog>
      );
    }
    render(<Harness />);
    const input = screen.getByLabelText('Name');
    await user.click(input);
    await user.keyboard('a');
    expect(input).toHaveFocus();
    await user.keyboard('b');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('ab');
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

describe('SelectField', () => {
  it('links the label and options', () => {
    render(
      <SelectField label="Status" value="active" onChange={() => {}}>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
      </SelectField>,
    );
    const select = screen.getByLabelText(/status.*\(required\)/i);
    expect(select).toHaveValue('active');
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('marks optional selects as optional', () => {
    render(
      <SelectField label="Atoll" optional value="" onChange={() => {}}>
        <option value="">None</option>
      </SelectField>,
    );
    expect(screen.getByLabelText(/atoll.*\(optional\)/i)).toBeInTheDocument();
  });
});
