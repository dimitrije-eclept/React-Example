import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignInPage, type SignInViewState } from './SignInPage';

function renderPage(state: SignInViewState) {
  const handlers = {
    onSubmitCredentials: vi.fn(),
    onSubmitOtp: vi.fn(),
    onRestart: vi.fn(),
  };
  const view = render(<SignInPage state={state} {...handlers} />);
  return { ...handlers, ...view };
}

describe('SignInPage, credentials step', () => {
  it('requires username and password', async () => {
    const { onSubmitCredentials } = renderPage({ step: 'credentials', pending: false });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Enter your username')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(onSubmitCredentials).not.toHaveBeenCalled();
  });

  it('submits trimmed credentials', async () => {
    const { onSubmitCredentials } = renderPage({ step: 'credentials', pending: false });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: ' demo ' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'demo123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() =>
      expect(onSubmitCredentials).toHaveBeenCalledWith({ username: 'demo', password: 'demo123' }),
    );
  });

  it('shows wrong credentials and clears the password', () => {
    renderPage({ step: 'credentials', pending: false, error: { kind: 'invalid_credentials' } });
    expect(screen.getByRole('alert')).toHaveTextContent('The username or password is incorrect.');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('disables the button while pending', () => {
    renderPage({ step: 'credentials', pending: true });
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('SignInPage, code step', () => {
  const otp = { step: 'otp', maskedPhone: '+381 64 *** **67', pending: false } as const;
  const digit = (n: number) => screen.getByRole('textbox', { name: `Digit ${n} of 6` });

  it('tells where the code was sent', () => {
    renderPage(otp);
    expect(screen.getByText('+381 64 *** **67')).toBeInTheDocument();
  });

  it('names the code boxes by their visible label', () => {
    renderPage(otp);
    const group = screen.getByRole('group', { name: 'One-time code' });
    expect(group).toHaveAttribute('aria-labelledby');
    expect(group).not.toHaveAttribute('aria-label');
  });

  it('requires all six digits', async () => {
    const { onSubmitOtp } = renderPage(otp);
    fireEvent.change(digit(1), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    expect(await screen.findByText('Enter all 6 digits')).toBeInTheDocument();
    expect(onSubmitOtp).not.toHaveBeenCalled();
  });

  it('submits the code', async () => {
    const { onSubmitOtp } = renderPage(otp);
    fireEvent.change(digit(1), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
    await waitFor(() => expect(onSubmitOtp).toHaveBeenCalledWith('123456'));
  });

  it('shows attempts left after a wrong code', () => {
    renderPage({ ...otp, error: { kind: 'wrong_code', attemptsLeft: 1 } });
    expect(screen.getByRole('alert')).toHaveTextContent("That code didn't match. 1 attempt left.");
  });

  it('only offers starting over once locked', () => {
    const { onRestart } = renderPage({ ...otp, error: { kind: 'locked' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Sign-in stopped.');
    expect(digit(1)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Verify and sign in' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(onRestart).toHaveBeenCalledOnce();
  });
});
