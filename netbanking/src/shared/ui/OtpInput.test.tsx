import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OtpInput } from './OtpInput';

function Harness({ initial = '' }: { readonly initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <OtpInput label="One-time code" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const box = (n: number) => screen.getByRole('textbox', { name: `Digit ${n} of 6` });
const value = () => screen.getByTestId('value').textContent;

describe('OtpInput', () => {
  it('fills a digit and moves focus to the next box', () => {
    render(<Harness />);
    fireEvent.change(box(1), { target: { value: '7' } });
    expect(value()).toBe('7');
    expect(box(2)).toHaveFocus();
  });

  it('ignores non-digits', () => {
    render(<Harness />);
    fireEvent.change(box(1), { target: { value: 'a' } });
    expect(value()).toBe('');
  });

  it('spreads a pasted code across the boxes', () => {
    render(<Harness />);
    fireEvent.paste(box(1), { clipboardData: { getData: () => '12 34 56' } });
    expect(value()).toBe('123456');
    expect(box(6)).toHaveValue('6');
  });

  it('spreads an autofilled code typed into the first box', () => {
    render(<Harness />);
    fireEvent.change(box(1), { target: { value: '654321' } });
    expect(value()).toBe('654321');
  });

  it('Backspace on an empty box clears the previous one', () => {
    render(<Harness initial="123" />);
    fireEvent.keyDown(box(4), { key: 'Backspace' });
    expect(value()).toBe('12');
    expect(box(3)).toHaveFocus();
  });

  it('keeps the code contiguous by redirecting focus to the first empty box', () => {
    render(<Harness initial="12" />);
    box(5).focus();
    expect(box(3)).toHaveFocus();
  });
});
