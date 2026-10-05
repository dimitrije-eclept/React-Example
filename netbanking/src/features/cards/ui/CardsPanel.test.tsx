import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { http as rest, HttpResponse } from 'msw';
import { BANK, cardHandlers, legacyBankHandlers, renderWithGateway, server } from '@shared/test';
import { cardKeys } from '../queries/cards';
import { CardsPanel } from './CardsPanel';

/** Stands in for anything that makes the card list reload (another page, a mutation). */
function Reload() {
  const queryClient = useQueryClient();
  return (
    <button
      type="button"
      onClick={() => void queryClient.invalidateQueries({ queryKey: cardKeys.all })}
    >
      Reload
    </button>
  );
}

function renderPanel() {
  return renderWithGateway(
    <MemoryRouter>
      <CardsPanel />
      <Reload />
    </MemoryRouter>,
  );
}

describe('CardsPanel', () => {
  beforeEach(() => server.use(...legacyBankHandlers, ...cardHandlers().handlers));

  it('says so when there are no cards', async () => {
    server.use(rest.post(`${BANK}/cards/getCards`, () => HttpResponse.json({ cardList: [] })));
    renderPanel();
    expect(await screen.findByText("You don't have any cards.")).toBeInTheDocument();
  });

  it('keeps the cards on screen with their time when reloading fails', async () => {
    renderPanel();
    expect(await screen.findByText('Visa Debit ·· 1111')).toBeInTheDocument();

    server.use(
      rest.post(`${BANK}/cards/getCards`, () => new HttpResponse('<html></html>', { status: 500 })),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Showing what we had at \d{2}:\d{2}/,
    );
    expect(screen.getByText('Visa Debit ·· 1111')).toBeInTheDocument();
  });
});
