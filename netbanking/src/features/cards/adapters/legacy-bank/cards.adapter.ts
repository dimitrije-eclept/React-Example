import type { Http } from '@shared/api';
import { networkError, parsePayload, toDomainError } from '@shared/adapters';
import { err, ok, Result } from '@shared/domain';
import type { CardsPort } from '../../ports/cards.port';
import { toCard } from './mappers';
import { accountCurrenciesSchema, blockResultSchema, cardListSchema } from './schemas';

export function createLegacyBankCards(http: Http): CardsPort {
  return {
    async listCards() {
      // MESS-54: a read via POST, with a required-but-ignored clientId. The account list is only
      // needed for the currency of credit limits.
      const [cardsSent, accountsSent] = await Promise.all([
        http.send({ method: 'POST', path: '/cards/getCards', body: { clientId: 'self' } }),
        http.send({ method: 'GET', path: '/core/v2/acc/list' }),
      ]);
      if (cardsSent.isErr() || accountsSent.isErr()) return err(networkError());
      for (const response of [cardsSent.value, accountsSent.value]) {
        if (response.status !== 200) return err(toDomainError(response));
      }
      const cards = parsePayload(cardListSchema, cardsSent.value.body, 'POST /cards/getCards');
      const accounts = parsePayload(
        accountCurrenciesSchema,
        accountsSent.value.body,
        'GET /core/v2/acc/list',
      );
      if (cards.isErr()) return err(cards.error);
      if (accounts.isErr()) return err(accounts.error);
      const currencies = new Map(accounts.value.map((account) => [account.acc_no, account.ccy]));
      return Result.combine(
        cards.value.cardList.map((item) => toCard(item, (account) => currencies.get(account))),
      );
    },

    async setBlocked(id, blocked) {
      const sent = await http.send({
        method: 'POST',
        path: '/cards/block',
        // MESS-56: identified by the masked number; MESS-6: Y/N instead of a boolean.
        body: { pan: id, block: blocked ? 'Y' : 'N' },
      });
      if (sent.isErr()) return err(networkError());
      if (sent.value.status !== 200) return err(toDomainError(sent.value));
      return parsePayload(blockResultSchema, sent.value.body, 'POST /cards/block').andThen(
        ({ result }) =>
          result === 'OK' ? ok(undefined) : err({ kind: 'not_found' as const, resource: 'card' }),
      );
    },
  };
}
