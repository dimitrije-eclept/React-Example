import type { Http } from '@shared/api';
import { networkError, parsePayload, toDomainError } from '@shared/adapters';
import { err, ok, type DomainError, type Result } from '@shared/domain';
import type { Balance } from '../../domain/account';
import type { AccountsPort } from '../../ports/accounts.port';
import { toAccount, toBalance } from './mappers';
import { accountListSchema, balanceSchema } from './schemas';

export function createLegacyBankAccounts(http: Http): AccountsPort {
  const fetchBalance = async (accountNumber: string): Promise<Result<Balance, DomainError>> => {
    const sent = await http.send({
      method: 'GET',
      // MESS-29: the dashed account number goes in the path.
      path: `/core/v2/acc/${encodeURIComponent(accountNumber)}/bal`,
    });
    if (sent.isErr()) return err(networkError());
    const response = sent.value;
    if (response.status === 404) return err({ kind: 'not_found', resource: 'account' });
    if (response.status !== 200) return err(toDomainError(response));
    return parsePayload(balanceSchema, response.body, 'GET /core/v2/acc/{accNo}/bal').andThen(
      toBalance,
    );
  };

  return {
    async listAccounts() {
      const sent = await http.send({ method: 'GET', path: '/core/v2/acc/list' });
      if (sent.isErr()) return err(networkError());
      if (sent.value.status !== 200) return err(toDomainError(sent.value));
      const list = parsePayload(accountListSchema, sent.value.body, 'GET /core/v2/acc/list');
      if (list.isErr()) return err(list.error);

      // MESS-23: no balances in the list, so one extra call per account. All or nothing: a
      // partial overview would show a misleading total picture.
      const balances = await Promise.all(list.value.map((item) => fetchBalance(item.acc_no)));
      const accounts = [];
      for (const [index, item] of list.value.entries()) {
        const balance = balances[index]!;
        if (balance.isErr()) return err(balance.error);
        accounts.push(toAccount(item, balance.value));
      }
      return ok(accounts);
    },
  };
}
