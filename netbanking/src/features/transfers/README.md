# transfers

Transfers between the customer's own accounts (`TransfersPort.transfer`, `useTransfer`,
`TransferPage`). The legacy-bank adapter absorbs MESS-39..45: dot-decimal amount string, required
`Idempotency-Key`, business errors with HTTP 200. `ui/idempotency.ts` decides when a key may be
reused. No in-memory mock adapter yet.
