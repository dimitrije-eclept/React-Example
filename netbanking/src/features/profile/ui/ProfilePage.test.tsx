import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import i18n from 'i18next';
import { legacyBankHandlers, renderWithGateway, server } from '@shared/test';
import { formatPhone, maskPhone } from './format';
import { ProfilePage } from './ProfilePage';

describe('ProfilePage', () => {
  afterEach(() => void i18n.changeLanguage('en'));

  it('shows contact and security details', async () => {
    server.use(...legacyBankHandlers);
    renderWithGateway(
      <ProfilePage onSignOut={vi.fn()} now={new Date(1_791_186_828_000 + 60_000)} />,
    );
    expect(await screen.findByRole('heading', { name: 'Marko Petrović' })).toBeInTheDocument();
    expect(screen.getByText(/^Signed in today at \d{2}:\d{2}$/)).toBeInTheDocument();
    expect(screen.getByText('marko.petrovic@example.rs')).toBeInTheDocument();
    expect(screen.getByText('+381 64 123 4567')).toBeInTheDocument();
    expect(screen.getByText('+381 64 *** **67')).toBeInTheDocument();
    expect(screen.getByText('After 5 min idle')).toBeInTheDocument();
  });

  it('switches the language and remembers it', async () => {
    server.use(...legacyBankHandlers);
    renderWithGateway(<ProfilePage onSignOut={vi.fn()} />);
    const english = await screen.findByRole('button', { name: 'English' });
    expect(english).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Srpski' }));
    expect(await screen.findByText('Kontakt podaci')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Srpski' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.lang).toBe('sr');
    expect(localStorage.getItem('nb.language')).toBe('sr');
  });

  it('signs out', async () => {
    server.use(...legacyBankHandlers);
    const onSignOut = vi.fn();
    renderWithGateway(<ProfilePage onSignOut={onSignOut} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});

describe('phone formatting (MESS-59)', () => {
  it('spaces and masks Serbian numbers', () => {
    expect(formatPhone('+381641234567')).toBe('+381 64 123 4567');
    expect(maskPhone('+381641234567')).toBe('+381 64 *** **67');
    expect(formatPhone('+4930123')).toBe('+4930123');
  });
});
