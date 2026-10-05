import { createLegacyBankAccounts, type AccountsPort } from '@features/accounts';
import { createLegacyBankAuth, type AuthPort } from '@features/auth';
import { createLegacyBankCards, type CardsPort } from '@features/cards';
import { createLegacyBankPayments, type PaymentsPort } from '@features/payments';
import { createLegacyBankProfile, type ProfilePort } from '@features/profile';
import { createLegacyBankTransactions, type TransactionsPort } from '@features/transactions';
import { createLegacyBankTransfers, type TransfersPort } from '@features/transfers';
import type { Http } from '@shared/api';

/** One port per feature. UI reaches them through `useGateway()` in each feature's queries. */
export interface Gateway {
  readonly auth: AuthPort;
  readonly accounts: AccountsPort;
  readonly profile: ProfilePort;
  readonly transactions: TransactionsPort;
  readonly transfers: TransfersPort;
  readonly payments: PaymentsPort;
  readonly cards: CardsPort;
}

// In-memory `mock` adapters come later (see src/README.md); legacy-bank is the only set today.
export type AdapterKind = 'legacy-bank';

export const ADAPTER_KINDS: readonly AdapterKind[] = ['legacy-bank'];

export type GatewayDeps = {
  readonly http: Http;
};

/** Assembles every feature's adapters for the chosen backend. */
export function createGateway(kind: AdapterKind, { http }: GatewayDeps): Gateway {
  switch (kind) {
    case 'legacy-bank':
      return {
        auth: createLegacyBankAuth(http),
        accounts: createLegacyBankAccounts(http),
        profile: createLegacyBankProfile(http),
        transactions: createLegacyBankTransactions(http),
        transfers: createLegacyBankTransfers(http),
        payments: createLegacyBankPayments(http),
        cards: createLegacyBankCards(http),
      };
  }
}
