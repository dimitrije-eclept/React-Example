# payments

Domestic (RSD) payments: prepare → authorise with an SMS code → follow the status
(`PaymentsPort`, `paymentMachine`, `PaymentPage`). The legacy-bank adapter absorbs MESS-46..53:
amount as a JSON number, Y/N flags, ERR_FUNDS with HTTP 200 at signing, Belgrade-local `stateDt`.
Client-side IBAN check in `domain/iban.ts`. No in-memory mock adapter yet.
