import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { http as rest } from 'msw';
import { BANK, legacyBankHandlers, renderWithGateway, server } from '@shared/test';
import { TransactionsPage } from './TransactionsPage';

const TODAY = '2026-10-05';

function renderPage(url = '/transactions') {
  const requests: URLSearchParams[] = [];
  server.use(
    rest.get(`${BANK}/core/v1/txn/history`, ({ request }) => {
      requests.push(new URL(request.url).searchParams);
      return undefined; // fall through to the fixture handler
    }),
  );
  const router = createMemoryRouter(
    [{ path: '/transactions', element: <TransactionsPage today={TODAY} /> }],
    { initialEntries: [url] },
  );
  renderWithGateway(<RouterProvider router={router} />);
  return { router, requests, last: () => Object.fromEntries(requests.at(-1)!) };
}

describe('TransactionsPage', () => {
  beforeEach(() => server.use(...legacyBankHandlers));

  it('shows the first account for the last three months, grouped by day', async () => {
    const { last } = renderPage();
    expect(await screen.findByRole('heading', { name: 'Today, 5 October' })).toBeInTheDocument();
    expect(last()).toMatchObject({
      acc: '160-0000000123456-78',
      dateFrom: '05.07.2026',
      dateTo: '05.10.2026',
      page: '1',
    });
    expect(screen.getByRole('heading', { name: 'Yesterday, 4 October' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Wednesday 30 September' })).toBeInTheDocument();
    expect(screen.getByText('5 Jul – 5 Oct 2026 · page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Available 185.000,00 · Booked 186.250,00 RSD')).toBeInTheDocument();

    const today = screen.getByRole('region', { name: 'Today, 5 October' });
    const wolt = within(today).getByRole('button', { name: /WOLT BEOGRAD/ });
    expect(wolt).toHaveTextContent('Pending');
    expect(wolt).toHaveTextContent('−650,01');
    expect(screen.getByRole('button', { name: /ECLEPT D.O.O./ })).toHaveTextContent('+170.786,62');
  });

  it('falls back when the bank sends no counterparty (MESS-36)', async () => {
    renderPage();
    const row = await screen.findByRole('button', { name: /No counterparty name provided/ });
    expect(row).toHaveTextContent('Transaction');
  });

  it('expands a row to show reference, dates and counterparty account', async () => {
    renderPage();
    const row = await screen.findByRole('button', { name: /ECLEPT D.O.O./ });
    const details = document.getElementById(row.getAttribute('aria-controls')!)!;
    // Closed: still in the DOM for the height animation, but inert and hidden from AT.
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(details).toHaveAttribute('inert');
    expect(details).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(details).not.toHaveAttribute('inert');
    expect(details).toHaveAttribute('aria-hidden', 'false');
    expect(details).toHaveTextContent('TX20260930-000001');
    expect(details).toHaveTextContent('Value date30 Sept 2026');
    expect(details).toHaveTextContent('265-1100310008899-21');
  });

  it('filters by direction and pages through results, keeping filters in the URL', async () => {
    const { router, last } = renderPage();
    await screen.findByRole('heading', { name: 'Today, 5 October' });

    fireEvent.click(screen.getByRole('button', { name: 'Older' }));
    await waitFor(() => expect(last().page).toBe('2'));
    expect(router.state.location.search).toBe('?page=2');
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Money in' }));
    await waitFor(() => expect(last()).toMatchObject({ dc: 'C', page: '1' }));
    expect(router.state.location.search).toBe('?direction=in');
    expect(screen.getByRole('button', { name: 'Money in' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByRole('button', { name: /ECLEPT/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /WOLT/ })).not.toBeInTheDocument();
  });

  it('opens the account from the link and says when nothing matches', async () => {
    renderPage('/transactions?account=160-0000000987654-32');
    expect(
      await screen.findByText('No transactions between 5 Jul 2026 and 5 Oct 2026'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Account')).toHaveValue('160-0000000987654-32');
  });

  it('goes to the last page when the link points past the end', async () => {
    const { router, last } = renderPage('/transactions?page=9');
    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(last().page).toBe('2');
    expect(screen.queryByText(/No transactions/)).not.toBeInTheDocument();
  });

  it('hides the previous rows when the date range becomes inverted', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Today, 5 October' });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-04' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-01' } });
    expect(
      await screen.findByText('The start date must be on or before the end date.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /WOLT/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/No transactions/)).not.toBeInTheDocument();
  });

  it('does not query an inverted date range', async () => {
    const { requests } = renderPage('/transactions?from=2026-10-01&to=2026-09-01');
    expect(
      await screen.findByText('The start date must be on or before the end date.'),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });
});
