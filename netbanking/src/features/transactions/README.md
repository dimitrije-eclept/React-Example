# transactions

Account history (`TransactionsPort.listTransactions`, one page of 20 at a time). The legacy-bank adapter
absorbs MESS-30..38: dotted query dates, `dc` instead of signed amounts, two date formats per item.
UI: `TransactionsPage` (filters in the URL: `account`, `from`, `to`, `direction`, `page`) and
`RecentActivity` for the overview; `transactionsHref(account)` builds links to it.
No in-memory mock adapter yet.
