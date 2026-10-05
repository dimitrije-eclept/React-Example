import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { http as rest, HttpResponse } from 'msw';
import {
  accountList,
  BANK,
  legacyBankHandlers,
  paymentHandlers,
  renderWithGateway,
  server,
} from '@shared/test';
import { PaymentPage } from './PaymentPage';

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/pay', element: <PaymentPage pollIntervalMs={5} /> },
      { path: '/', element: <p>Overview</p> },
    ],
    { initialEntries: ['/pay'] },
  );
  renderWithGateway(<RouterProvider router={router} />);
  return router;
}

async function fillDetails({
  iban = 'rs35105008123123123173',
  amount = '7418,6',
}: { iban?: string; amount?: string } = {}) {
  fireEvent.change(await screen.findByLabelText('Recipient name'), {
    target: { value: 'JKP INFOSTAN TEHNOLOGIJE' },
  });
  fireEvent.change(screen.getByLabelText('Recipient account (IBAN)'), { target: { value: iban } });
  fireEvent.blur(screen.getByLabelText('Recipient account (IBAN)'));
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: amount } });
  fireEvent.change(screen.getByLabelText('Reference number'), { target: { value: '97 123-456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review payment' }));
}

/** The text of everything a control's `aria-describedby` points at. */
function description(element: HTMLElement) {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
}

async function enterCode(code: string) {
  fireEvent.change(await screen.findByRole('textbox', { name: 'Digit 1 of 6' }), {
    target: { value: code },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }));
}

describe('PaymentPage', () => {
  beforeEach(() => server.use(...legacyBankHandlers));

  it('pays in three steps and follows the status until executed', async () => {
    const fixture = paymentHandlers();
    server.use(...fixture.handlers);
    renderPage();

    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Details');
    await fillDetails();

    expect(await screen.findByRole('heading', { name: 'Check and confirm' })).toBeInTheDocument();
    // The code is what this step asks for, so it gets focus.
    expect(screen.getByRole('textbox', { name: 'Digit 1 of 6' })).toHaveFocus();
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Confirm');
    const review = screen.getByRole('region', { name: 'You are paying' });
    expect(review).toHaveTextContent('7.418,60 RSD');
    expect(review).toHaveTextContent('RS35 1050 0812 3123 1231 73');
    expect(review).toHaveTextContent('Tekući račun 160-0000000123456-78');
    expect(review).toHaveTextContent('289 · Transactions ordered by citizens');
    expect(screen.getByText('+381 64 *** **67')).toBeInTheDocument();
    expect(fixture.inits[0]).toMatchObject({
      amount: 7418.6,
      creditorIban: 'RS35105008123123123173',
    });

    await enterCode('000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('2 attempts left.');

    await enterCode('123456');
    expect(
      await screen.findByRole('heading', { name: 'Payment sent for processing' }),
    ).toHaveFocus();
    expect(
      screen.getByText('Usually a few seconds. This page updates by itself.'),
    ).toBeInTheDocument();
    expect(screen.getByText('DOM-20261005-000001')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Payment executed' })).toBeInTheDocument();
    expect(screen.getByText('7.418,60 RSD paid to JKP INFOSTAN TEHNOLOGIJE')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New payment' }));
    expect(await screen.findByLabelText('Recipient name')).toHaveValue('');
  });

  it('catches an invalid IBAN before asking the bank', async () => {
    const fixture = paymentHandlers();
    server.use(...fixture.handlers);
    renderPage();
    await fillDetails({ iban: 'RS36105008123123123173' });
    expect(
      await screen.findByText("This isn't a valid IBAN. Check it against the bill."),
    ).toBeInTheDocument();
    expect(fixture.inits).toHaveLength(0);
  });

  it('keeps the details when going back to edit them', async () => {
    server.use(...paymentHandlers().handlers);
    renderPage();
    await fillDetails();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    expect(await screen.findByLabelText('Recipient account (IBAN)')).toHaveValue(
      'RS35 1050 0812 3123 1231 73',
    );
    expect(screen.getByLabelText('Amount')).toHaveValue('7.418,60');
    expect(screen.getByLabelText('Reference number')).toHaveValue('97 123-456');
  });

  it('cancels the payment after three wrong codes', async () => {
    server.use(...paymentHandlers().handlers);
    renderPage();
    await fillDetails();
    await enterCode('000000');
    await screen.findByText(/2 attempts left/);
    await enterCode('000000');
    await screen.findByText(/1 attempt left/);
    await enterCode('000000');
    expect(
      await screen.findByRole('heading', { name: 'Payment cancelled for your security' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('The SMS code was entered wrong 3 times. Nothing was paid.'),
    ).toBeInTheDocument();
  });

  it('explains missing funds found while authorising (MESS-50)', async () => {
    server.use(...paymentHandlers({ insufficientFunds: true }).handlers);
    renderPage();
    await fillDetails();
    await enterCode('123456');
    expect(
      await screen.findByRole('heading', { name: 'Not enough money for this payment' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/on Tekući račun when you confirmed/)).toBeInTheDocument();
  });

  it('shows a rejection by the bank (MESS-53)', async () => {
    server.use(...paymentHandlers().handlers);
    renderPage();
    await fillDetails({ iban: 'RS81999000000000000099' });
    await enterCode('123456');
    const heading = await screen.findByRole('heading', {
      name: "The payment couldn't be completed",
    });
    expect(within(heading.closest('section')!).getByText('Rejected')).toBeInTheDocument();
  });

  it('puts the bank field errors on the fields, and the rest in a general message', async () => {
    // A later server.use() wins, so the fixture goes first and the override after it.
    server.use(...paymentHandlers().handlers);
    server.use(
      rest.post(`${BANK}/pay/dom/init`, () =>
        HttpResponse.json(
          {
            errors: [
              { fld: 'currency', msg: 'Samo RSD' },
              { fld: 'purposeCode', msg: 'Šifra' },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    renderPage();
    await fillDetails();
    await screen.findAllByText("The bank didn't accept this value.");
    expect(description(screen.getByLabelText('Pay from'))).toContain(
      "The bank didn't accept this value.",
    );
    expect(description(screen.getByLabelText('Payment code'))).toBe(
      "The bank didn't accept this value.",
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    server.use(
      rest.post(`${BANK}/pay/dom/init`, () =>
        HttpResponse.json({ errors: [{ fld: 'channel', msg: 'Greška' }] }, { status: 422 }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review payment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "The bank didn't accept these details. Check them and try again.",
    );
  });

  it('reloads balances when the code got no answer, and keeps stale ones visible', async () => {
    let listCalls = 0;
    // A later server.use() wins, so the fixture goes first and the override after it.
    server.use(...paymentHandlers().handlers);
    server.use(
      rest.get(`${BANK}/core/v2/acc/list`, () => {
        listCalls += 1;
        return listCalls === 1
          ? HttpResponse.json(accountList)
          : new HttpResponse('<html></html>', { status: 503, headers: { 'Retry-After': '5' } });
      }),
      rest.post(`${BANK}/pay/dom/:ref/sign`, () => new HttpResponse(null, { status: 503 })),
    );
    renderPage();
    await fillDetails();
    expect(listCalls).toBe(1);
    await enterCode('123456');
    expect(await screen.findByRole('alert')).toHaveTextContent(/can't reach the bank/i);
    await waitFor(() => expect(listCalls).toBe(2));

    // The reload failed: back on the details, the old balances stay, marked with their time.
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(await screen.findByText(/Showing what we had at \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByLabelText('Pay from')).toHaveTextContent('185.000,00 RSD');
  });

  it('stops checking after a while and lets the customer check again', async () => {
    server.use(...paymentHandlers({ pollsUntilFinal: 10_000 }).handlers);
    renderPage();
    await fillDetails();
    await enterCode('123456');
    const heading = await screen.findByRole(
      'heading',
      { name: 'Still processing' },
      { timeout: 5_000 },
    );
    expect(screen.getByText(/This page no longer updates by itself/)).toBeInTheDocument();
    // Only the headline is a live region, not the timeline and buttons.
    const live = heading.closest('[aria-live]');
    expect(live).not.toBeNull();
    expect(within(live as HTMLElement).queryByRole('button')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(
      await screen.findByRole('heading', { name: 'Payment sent for processing' }),
    ).toBeInTheDocument();
  });

  it('says so when the bank no longer knows the payment', async () => {
    // A later server.use() wins, so the fixture goes first and the override after it.
    server.use(...paymentHandlers().handlers);
    server.use(
      rest.get(`${BANK}/pay/dom/:ref/stat`, () =>
        HttpResponse.json({ code: 'PAY_NOT_FOUND' }, { status: 404 }),
      ),
    );
    renderPage();
    await fillDetails();
    await enterCode('123456');
    expect(
      await screen.findByRole('heading', { name: "We can't find this payment" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View transactions' })).toHaveAttribute(
      'href',
      '/transactions?account=160-0000000123456-78',
    );
  });

  it('cancelling before the code leads back home', async () => {
    server.use(...paymentHandlers().handlers);
    const router = renderPage();
    await fillDetails();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel payment' }));
    expect(await screen.findByText('Overview')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
