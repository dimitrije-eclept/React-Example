# accounts

Accounts with balances (`AccountsPort.listAccounts`). The legacy-bank adapter joins `/acc/list` with one
`/bal` call per account (MESS-22..29). UI: `AccountsSection` (overview cards), `useAccountName`.
No in-memory mock adapter yet.
