import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { delay, http as rest, HttpResponse } from 'msw';
import { createGateway } from '@app/gateway';
import { createHttp } from '@shared/api';
import {
  BANK,
  legacyBankHandlers,
  renderWithGateway,
  server,
  transferHandler,
  type TransferCall,
} from '@shared/test';
import { TransferPage } from './TransferPage';

function renderPage({ timeoutMs }: { readonly timeoutMs?: number } = {}) {
  const router = createMemoryRouter([{ path: '/transfer', element: <TransferPage /> }], {
    initialEntries: ['/transfer'],
  });
  const http = createHttp({
    baseUrl: BANK,
    timeoutMs,
    auth: { getAccessToken: () => 'test-token', refresh: async () => false, onUnauthorized() {} },
  });
  renderWithGateway(<RouterProvider router={router} />, createGateway('legacy-bank', { http }));
}

const amount = () => screen.getByLabelText('Amount');
const submit = () => screen.getByRole('button', { name: /^Transfer/ });

async function fillAndSubmit(value: string) {
  fireEvent.change(await screen.findByLabelText('Amount'), { target: { value } });
  fireEvent.click(submit());
}

describe('TransferPage', () => {
  beforeEach(() => server.use(...legacyBankHandlers));

  it('only offers destinations in the source currency', async () => {
    renderPage();
    const card = await screen.findByRole('radio', { name: /Card account/ });
    expect(card).toBeChecked();
    expect(screen.getByRole('radio', { name: /Devizna štednja/ })).toBeDisabled();
    expect(screen.getByText("EUR account, can't receive RSD")).toBeInTheDocument();
    expect(screen.getByText('Up to 185.000,00 RSD')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: '160-0000000987654-32' },
    });
    expect(await screen.findByText('None of your other accounts is in EUR.')).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('checks the amount before sending anything', async () => {
    const { handler, calls } = transferHandler();
    server.use(handler);
    renderPage();

    await fillAndSubmit('');
    expect(await screen.findByText('Enter an amount.')).toBeInTheDocument();
    await fillAndSubmit('12,345');
    expect(await screen.findByText('Enter an amount like 1.500,00.')).toBeInTheDocument();
    await fillAndSubmit('200.000,00');
    expect(await screen.findByText('You can transfer up to 185.000,00 RSD.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('transfers, confirms, and clears the amount', async () => {
    const { handler, calls } = transferHandler();
    server.use(handler);
    renderPage();
    await screen.findByRole('radio', { name: /Card account/ });

    fireEvent.change(amount(), { target: { value: '15000' } });
    fireEvent.blur(amount());
    expect(amount()).toHaveValue('15.000,00');
    expect(submit()).toHaveAccessibleName('Transfer 15.000,00 RSD');
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Kartica' } });
    fireEvent.click(submit());

    expect(await screen.findByRole('status')).toHaveTextContent(
      '15.000,00 RSD moved to Card account.',
    );
    expect(calls[0]?.body).toMatchObject({ amt: '15000.00', ccy: 'RSD', descr: 'Kartica' });
    expect(calls[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
    await waitFor(() => expect(amount()).toHaveValue(''));
  });

  it('explains "not enough money" from the bank and uses a new key for the next try', async () => {
    let funds = false;
    const { handler, calls } = transferHandler(() =>
      funds
        ? HttpResponse.json({ ref: 'INT-1', ts: '2026-10-05T10:31:07+02:00' })
        : HttpResponse.json({
            status: 'ERROR',
            errCode: 'ERR_FUNDS',
            errMsg: 'Nedovoljno sredstava',
          }),
    );
    server.use(handler);
    renderPage();

    await fillAndSubmit('100');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Not enough money on Tekući račun. You can transfer up to 185.000,00 RSD.',
    );

    funds = true;
    fireEvent.click(submit());
    expect(await screen.findByRole('status')).toHaveTextContent('moved to Card account');
    expect(calls).toHaveLength(2);
    expect(calls[1]?.key).not.toBe(calls[0]?.key);
  });

  it('retries an unknown outcome with the same key, so it is booked at most once', async () => {
    let up = false;
    const { handler, calls } = transferHandler(() =>
      up
        ? HttpResponse.json({ ref: 'INT-1', ts: '2026-10-05T10:31:07+02:00' })
        : HttpResponse.html('<h1>Service Unavailable</h1>', { status: 503 }),
    );
    server.use(handler);
    renderPage();

    await fillAndSubmit('100');
    expect(await screen.findByRole('alert')).toHaveTextContent("We can't reach the bank");

    up = true;
    fireEvent.click(submit());
    expect(await screen.findByRole('status')).toHaveTextContent('100,00 RSD moved');
    expect(calls.map((call: TransferCall) => call.key)).toEqual([calls[0]?.key, calls[0]?.key]);
  });

  it('retries a transfer that timed out with the same key', async () => {
    let hang = true;
    const keys: (string | null)[] = [];
    const { handler } = transferHandler();
    server.use(
      rest.post(`${BANK}/pay/internal/exec`, async ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        if (!hang) return undefined;
        await delay('infinite');
      }),
      handler,
    );
    renderPage({ timeoutMs: 30 });

    await fillAndSubmit('100');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sending the same transfer again is safe',
    );

    hang = false;
    fireEvent.click(submit());
    expect(await screen.findByRole('status')).toHaveTextContent('100,00 RSD moved');
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it("shows the bank's validation on the field it names (MESS-44)", async () => {
    server.use(
      transferHandler(() =>
        HttpResponse.json(
          { errors: [{ fld: 'dstAcc', msg: 'Račun primaoca mora biti različit' }] },
          { status: 422 },
        ),
      ).handler,
    );
    renderPage();

    await fillAndSubmit('100');
    expect(await screen.findByText("The bank didn't accept this value.")).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'To' })).toHaveAccessibleDescription(
      "The bank didn't accept this value.",
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the balances on screen with their time when reloading them fails', async () => {
    let up = true;
    server.use(
      rest.get(`${BANK}/core/v2/acc/list`, () =>
        up ? undefined : HttpResponse.html('<h1>Service Unavailable</h1>', { status: 503 }),
      ),
    );
    renderPage();

    await screen.findByRole('radio', { name: /Card account/ });
    up = false;
    await fillAndSubmit('100');

    expect(await screen.findByText(/Showing what we had at \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toBeInTheDocument();
  });
});
