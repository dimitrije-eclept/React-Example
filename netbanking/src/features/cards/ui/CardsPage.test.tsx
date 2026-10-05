import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { http as rest, HttpResponse } from 'msw';
import { BANK, cardHandlers, legacyBankHandlers, renderWithGateway, server } from '@shared/test';
import { CardsPage } from './CardsPage';

describe('CardsPage', () => {
  beforeEach(() => server.use(...legacyBankHandlers, ...cardHandlers().handlers));

  it('shows each card with its account, limit and state', async () => {
    renderWithGateway(<CardsPage />);
    const debit = await screen.findByRole('article', { name: 'Visa Debit ·· 1111' });
    expect(within(debit).getByText('Active')).toBeInTheDocument();
    expect(await within(debit).findByText('Tekući račun')).toBeInTheDocument();
    expect(within(debit).getByText('185.000,00 RSD')).toBeInTheDocument();
    expect(within(debit).queryByText('Credit limit')).not.toBeInTheDocument();

    const credit = screen.getByRole('article', { name: 'Mastercard Credit ·· 4444' });
    expect(within(credit).getByText('150.000,00 RSD')).toBeInTheDocument();
    expect(within(credit).getByText('Card account')).toBeInTheDocument();
  });

  it('blocks and unblocks a card', async () => {
    renderWithGateway(<CardsPage />);
    const debit = await screen.findByRole('article', { name: 'Visa Debit ·· 1111' });

    fireEvent.click(within(debit).getByRole('button', { name: 'Block card' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Visa Debit ·· 1111 is blocked. Payments and withdrawals are off.',
    );
    expect(within(debit).getByText('Blocked')).toBeInTheDocument();

    fireEvent.click(within(debit).getByRole('button', { name: 'Unblock' }));
    expect(await screen.findByText('Visa Debit ·· 1111 works again.')).toBeInTheDocument();
    expect(within(debit).getByText('Active')).toBeInTheDocument();
  });

  it('says so when the bank does not know the card', async () => {
    server.use(rest.post(`${BANK}/cards/block`, () => HttpResponse.json({ result: 'NOK' })));
    renderWithGateway(<CardsPage />);
    const debit = await screen.findByRole('article', { name: 'Visa Debit ·· 1111' });
    fireEvent.click(within(debit).getByRole('button', { name: 'Block card' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("This card couldn't be found.");
    expect(within(debit).getByText('Active')).toBeInTheDocument();
  });
});
