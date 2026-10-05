import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Account } from '../domain/account';

/** The account's own name, or a generic one by kind (MESS-24: card accounts have none). */
export function useAccountName(): (account: Pick<Account, 'name' | 'kind'>) => string {
  const { t } = useTranslation();
  return useCallback((account) => account.name ?? t(`accounts.defaultName.${account.kind}`), [t]);
}
