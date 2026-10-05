import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { http as rest, HttpResponse } from 'msw';
import { BANK, legacyBankHandlers, renderWithGateway, server } from '@shared/test';
import { AccountsSection } from './AccountsSection';

describe('AccountsSection', () => {
  beforeEach(() => server.use(...legacyBankHandlers));

  it('shows each account with available, booked and pending amounts', async () => {
    renderWithGateway(<AccountsSection />);
    const current = await screen.findByRole('article', { name: 'Tekući račun' });
    expect(within(current).getByText('Current · RSD')).toBeInTheDocument();
    expect(within(current).getByText('185.000,00')).toBeInTheDocument();
    expect(within(current).getByText('Booked 186.250,00')).toBeInTheDocument();
    expect(within(current).getByText('1.250,00 pending')).toBeInTheDocument();
    expect(within(current).getByText('160-0000000123456-78')).toBeInTheDocument();

    const savings = screen.getByRole('article', { name: 'Devizna štednja' });
    expect(within(savings).queryByText(/pending/)).not.toBeInTheDocument();
    // MESS-24: no name from the bank.
    expect(screen.getByRole('article', { name: 'Card account' })).toBeInTheDocument();
  });

  it('offers a retry when the bank is down', async () => {
    let down = true;
    server.use(
      rest.get(`${BANK}/core/v2/acc/list`, () =>
        down ? HttpResponse.html('<h1>x</h1>', { status: 503 }) : undefined,
      ),
    );
    renderWithGateway(<AccountsSection />);
    expect(await screen.findByRole('status')).toHaveTextContent(
      "We can't reach the bank right now.",
    );

    down = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry now' }));
    expect(await screen.findByRole('article', { name: 'Tekući račun' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says so when there are no accounts', async () => {
    server.use(rest.get(`${BANK}/core/v2/acc/list`, () => HttpResponse.json([])));
    renderWithGateway(<AccountsSection />);
    expect(await screen.findByText("You don't have any accounts yet.")).toBeInTheDocument();
  });
});
