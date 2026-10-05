import { act } from 'react';
import i18n from 'i18next';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { http as rest, HttpResponse } from 'msw';
import { BANK, legacyBankHandlers, server } from '@shared/test';
import { createAppContainer } from './composition-root';
import { Providers } from './providers';
import { routes } from './routes';

function renderApp(path = '/') {
  const container = createAppContainer('legacy-bank', BANK);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <Providers gateway={container.gateway} session={container.session}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...container, router };
}

async function signIn(code = '123456') {
  fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'demo' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'demo123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  const firstDigit = await screen.findByRole('textbox', { name: 'Digit 1 of 6' });
  fireEvent.change(firstDigit, { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
}

const greeting = () => screen.findByRole('heading', { level: 1, name: /, Marko$/ });

describe('app', () => {
  beforeEach(() => server.use(...legacyBankHandlers));
  afterEach(() => void i18n.changeLanguage('en'));

  it('shows cards on the overview and switches language from the profile', async () => {
    renderApp('/sign-in');
    await signIn();
    await greeting();

    const cards = await screen.findByRole('region', { name: 'Cards' });
    expect(await within(cards).findByText('Mastercard Credit ·· 4444')).toBeInTheDocument();
    expect(within(cards).getByText('Expires 08/28 · Limit 150.000,00 RSD')).toBeInTheDocument();
    expect(
      within(screen.getByRole('article', { name: 'Card account' })).getByText(
        'Mastercard Credit ·· 4444',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Profile' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Srpski' }));
    expect(await screen.findByRole('link', { name: 'Pregled' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kontakt podaci' })).toBeInTheDocument();
  });

  it('signs in with password and SMS code, shows the overview, then signs out', async () => {
    let logouts = 0;
    server.use(
      rest.post(`${BANK}/auth/logout`, () => {
        logouts += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router } = renderApp('/');
    expect(router.state.location.pathname).toBe('/sign-in');

    await signIn('000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('2 attempts left.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Digit 1 of 6' }), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));

    expect(await greeting()).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('article', { name: 'Tekući račun' })).toBeInTheDocument();
    expect(screen.getByText('Marko Petrović')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(logouts).toBe(1);
  });

  it('links the overview to transaction history', async () => {
    const { router } = renderApp('/sign-in');
    await signIn();
    await greeting();

    const recent = await screen.findByRole('region', { name: /Recent activity/ });
    expect(recent).toHaveTextContent('Recent activity · Tekući račun');
    expect(await within(recent).findAllByRole('listitem')).toHaveLength(7);
    expect(within(recent).getByText('WOLT BEOGRAD')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'History of Devizna štednja' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Transactions' }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?account=160-0000000987654-32');
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByLabelText('Account')).toHaveValue('160-0000000987654-32');

    fireEvent.click(screen.getByRole('link', { name: 'Overview' }));
    fireEvent.click(await screen.findByRole('link', { name: 'All transactions' }));
    expect(router.state.location.search).toBe('?account=160-0000000123456-78');
  });

  it('explains an ended session and returns to sign-in', async () => {
    const { session } = renderApp('/sign-in');
    await signIn();
    await greeting();

    act(() => session.end('idle'));

    expect(screen.getByRole('heading', { name: "You've been signed out" })).toBeInTheDocument();
    expect(screen.getByText(/after 5 minutes without activity/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in again' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('ends the session when the bank rejects the token and it cannot be refreshed', async () => {
    server.use(
      rest.get(`${BANK}/core/v2/acc/list`, () => new HttpResponse(null, { status: 401 })),
      rest.post(`${BANK}/auth/refresh`, () =>
        HttpResponse.json({ error: 'invalid_grant' }, { status: 400 }),
      ),
    );
    renderApp('/sign-in');
    await signIn();
    expect(
      await screen.findByRole('heading', { name: "You've been signed out" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your session has ended. Sign in again to continue.'),
    ).toBeInTheDocument();
  });
});
