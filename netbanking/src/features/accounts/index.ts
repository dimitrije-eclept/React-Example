// Public API of the accounts feature. Other features and app/ import only from here.
export type { Account, AccountKind, AccountNumber, Balance } from './domain/account';
export { pendingAmount } from './domain/account';
export type { AccountsPort } from './ports/accounts.port';
export { createLegacyBankAccounts } from './adapters/legacy-bank/accounts.adapter';
export { accountKeys, useAccounts } from './queries/accounts';
export { useAccountName } from './ui/account-name';
export { AccountsSection } from './ui/AccountsSection';
