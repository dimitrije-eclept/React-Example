# cards

Cards with block/unblock (`CardsPort`, `useCards`, `useSetCardBlocked`, `CardsPage`, `CardsPanel`).
The legacy-bank adapter absorbs MESS-54..56: a read via POST, the masked number as the only id,
Y/N flags, `NOK` with HTTP 200 for an unknown card, and a credit limit without a currency (taken
from the linked account). No in-memory mock adapter yet.
