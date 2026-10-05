import { useTranslation } from 'react-i18next';
import type { Transaction } from '../domain/transaction';

/** Who the money went to or came from, with fallbacks for MESS-36 nulls. */
export function useTransactionTitle() {
  const { t } = useTranslation();
  return (transaction: Transaction): { title: string; subtitle: string | null } => {
    if (transaction.counterpartyName) {
      return { title: transaction.counterpartyName, subtitle: transaction.description };
    }
    return {
      title: transaction.description ?? t('transactions.unnamed'),
      subtitle: t('transactions.noCounterparty'),
    };
  };
}
