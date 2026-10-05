# MESS.md: the legacy-bank quirk catalogue

Every inconsistency below is **intentional** and pinned by tests. Do not fix it in the backend; absorb it in the
frontend adapters. "Clean API" is what the domain model on the frontend should look like after translation.

Quirks are numbered so adapters and tests can reference them (`// MESS-12`).

## Cross-cutting

| # | Where | Quirk | A clean API would… |
|---|---|---|---|
| 1 | All | Versioning is inconsistent: accounts are `/core/v2/…`, transactions `/core/v1/…`, payments `/pay/…` with no version, cards and profile unversioned. | Use one version prefix for the whole API. |
| 2 | All | Field naming has no convention: snake_case (`acc_no`, `access_token`), camelCase (`availBal`), PascalCase (`FirstName`), UPPERCASE (`IBAN`, `USER`), odd casing (`eMail`). | Pick one casing (camelCase). |
| 3 | All | Same concept, different names: `acc_no` / `accountNumber` / `srcAcc` / `debtorAcc` / `linkedAcc`; `ccy` / `currency`; `amt` / `amount`; `descr` / `description`; `ticket` / `loginTicket`. | One name per concept. |
| 4 | All amounts in responses | Money is a **string in sr-RS locale**: `"185.000,00"` (`.` thousands, `,` decimals). | `{ "amount": "185000.00", "currency": "RSD" }` or minor units as an integer. |
| 5 | Requests | Request amounts differ per endpoint: internal transfer takes a **dot-decimal string** `"1500.50"`; domestic payment takes a **JSON number** `1500.5`. Sending `"1.500,50"` to the transfer is a 422. | One amount format in and out. |
| 6 | Many | Booleans are `"Y"`/`"N"` strings (`scaRequired`, `blocked`, `block`), except `/auth/login` `otpRequired`, which is a real `true`. | JSON booleans everywhere. |
| 7 | Many | Single-letter / short enum codes: `prodType` TR/ST/KK, `status` A/B, `dc` D/C, `state` B/P, payment `INIT/PEND/EXEC/REJ/CANC`. | Readable enums (`CURRENT`, `BOOKED`, …). |
| 8 | Dates | Five date formats: `openDt` `2019-03-14T00:00:00` (no zone), `bookDate` `14.09.2026`, `valDate` `20260915`, `stateDt` `02.10.2026 14:33` (no zone, Europe/Belgrade), transfer `ts` `2026-10-02T14:31:07+02:00`, profile `lastLogin` epoch **seconds as a string**. | ISO-8601 dates / instants with offset everywhere. |
| 9 | Errors | At least five error shapes: `{code, message?, attemptsLeft?}`, `{status:"ERROR", errCode, errMsg?}` **with HTTP 200**, `{errors:[{fld,msg}]}` (422), `{error:"invalid_grant"}` (refresh only), empty-body 401, and HTML for 500/503/404/405. | One error envelope (e.g. RFC 9457 problem+json) with proper status codes. |
| 10 | Protected endpoints | Missing / unknown / expired access token → **401 with an empty body** (no JSON, `Content-Length: 0`). | 401 with a JSON error and `WWW-Authenticate`. |
| 11 | Any endpoint | Unhandled exceptions → **500 with `text/html`** `<html><body><h1>Internal Server Error</h1></body></html>`. Unknown routes / wrong methods are HTML too (404/405). | JSON error body. |
| 12 | Any endpoint | Error messages are Serbian (`Neispravni podaci`, `Nedovoljno sredstava`) and sometimes missing. | Stable machine codes plus optional, localisable messages. |
| 13 | Any endpoint | Chaos (when enabled): random latency, random **503 with HTML body** and `Retry-After: 5`. `/auth/**` is exempt from random chaos. | n/a (test harness). |

## Auth

| # | Endpoint | Quirk | A clean API would… |
|---|---|---|---|
| 14 | `POST /auth/login` | Two-step login: returns a `loginTicket`, never tokens. `otpRequired` is always `true`. | Return tokens or a typed "challenge" response. |
| 15 | `POST /auth/login` | Wrong credentials → 401 **with** JSON `{code:"AUTH_FAILED", message:"Neispravni podaci"}`, unlike the empty-body 401 for bad tokens (MESS-10). | Same 401 shape everywhere. |
| 16 | `POST /auth/otp` | Request field is `ticket` but login returned `loginTicket`. | Same name. |
| 17 | `POST /auth/otp` | Response is **snake_case** (`access_token`, `refresh_token`, `expires_in`, `token_type:"bearer"`) while the rest of `/auth` is camelCase. | Consistent casing. |
| 18 | `POST /auth/otp` | Wrong OTP → **403** `{code:"OTP_INVALID", attemptsLeft:2}`, then `1`; 3rd failure → 403 `{code:"OTP_LOCKED"}` (no `attemptsLeft`) and the ticket dies. Any later use of the ticket (even with the correct OTP) → 403 `{code:"TICKET_INVALID"}`. Tickets are single-use and expire after 5 min. | 401/429 with a uniform body. |
| 19 | `POST /auth/refresh` | Body field `refresh_token` (snake_case). Rotates: the presented refresh token is consumed. Reusing an old/unknown/expired one → **400 `{error:"invalid_grant"}`** (an OAuth-style shape seen nowhere else). Old access tokens stay valid until they expire. | 401 with the common error envelope. |
| 20 | `POST /auth/logout` | No body, `204`. Requires a valid access token (401 empty body otherwise). Kills the access token and its refresh token. | Fine as is. |
| 21 | Tokens | Opaque random strings, not JWTs: you cannot decode the expiry, only read `expires_in` (seconds, default 300). Refresh lives 30 min. | n/a |

## Accounts

| # | Endpoint | Quirk | A clean API would… |
|---|---|---|---|
| 22 | `GET /core/v2/acc/list` | Returns a **bare JSON array**, no wrapper / paging. | `{ "accounts": [...] }`. |
| 23 | `GET /core/v2/acc/list` | **No balances**. You need N extra calls to `/bal`. | Include balances, or offer a batch endpoint. |
| 24 | `GET /core/v2/acc/list` | Fields `acc_no`, `IBAN`, `descr`, `prodType`, `ccy`, `status`, `openDt`: mixed casing (MESS-2). `descr` can be `null` (card account). | Consistent names; a fallback display name. |
| 25 | `GET /core/v2/acc/list` | `prodType` `TR`=current, `ST`=savings, `KK`=card; `status` `A`=active, `B`=blocked. | Readable enums. |
| 26 | `GET /core/v2/acc/list` | `openDt` is a local date-time with no zone and a meaningless `T00:00:00`. | A plain date `2019-03-14`. |
| 27 | `GET /core/v2/acc/{accNo}/bal` | Uses `accountNumber` and `currency` where the list uses `acc_no` and `ccy`. | Same names. |
| 28 | `GET /core/v2/acc/{accNo}/bal` | `availBal` / `bookBal` are sr-RS strings (MESS-4). `bookBal` ≥ `availBal` when there are pending debits (pending card purchases and signed domestic payments reserve funds). | Numeric decimals with explicit semantics. |
| 29 | `GET /core/v2/acc/{accNo}/bal` | Unknown account → 404 `{code:"ACC_NOT_FOUND"}`. The account number is in the **path** with dashes. | Use an opaque account id. |

## Transactions

| # | Endpoint | Quirk | A clean API would… |
|---|---|---|---|
| 30 | `GET /core/v1/txn/history` | **v1** while accounts are v2. | One version. |
| 31 | `GET /core/v1/txn/history` | Query dates `dateFrom` / `dateTo` are `dd.MM.yyyy` (inclusive). ISO dates → 422 on that field. | ISO dates. |
| 32 | `GET /core/v1/txn/history` | `page` is **1-based**; page size is **fixed at 20** (`size`/`pageSize` are ignored). Response is `{items, page, totalPages}` with no total count. Pages past the end return `items: []`; `totalPages` is `0` for an empty result. `page=0` → 422. | Cursor paging, or offset + total. |
| 33 | `GET /core/v1/txn/history` | `bookDate` is `dd.MM.yyyy` but `valDate` is `yyyyMMdd`. **Two formats in one object.** | ISO dates. |
| 34 | `GET /core/v1/txn/history` | `amt` is **always positive**; the sign is in `dc` (`D` debit / `C` credit). | Signed amount. |
| 35 | `GET /core/v1/txn/history` | `state` `B` booked / `P` pending. Pending items already have a `bookDate`. | Readable enum; null booking date while pending. |
| 36 | `GET /core/v1/txn/history` | `partnerName`, `partnerAcc`, `purpose` can be `null` (always present as keys). `partnerAcc` is sometimes a domestic account number (`160-…-78`), sometimes an IBAN (domestic payments). | Consistent counterparty object. |
| 37 | `GET /core/v1/txn/history` | Sorted newest first by `bookDate`; ties are broken by internal sequence. `txnRef` looks like `TX20260914-000123`. | Documented, stable sort. |
| 38 | `GET /core/v1/txn/history` | Missing `acc` → 422 `{fld:"acc"}`; unknown `acc` → 404 ACC_NOT_FOUND; bad `dc` → 422. | n/a |

## Internal transfer

| # | Endpoint | Quirk | A clean API would… |
|---|---|---|---|
| 39 | `POST /pay/internal/exec` | RPC-style path. Body `{srcAcc, dstAcc, amt:"1500.50", ccy, descr}`. `amt` is a **dot-decimal string** (MESS-5). | `POST /transfers` with a typed amount. |
| 40 | `POST /pay/internal/exec` | **Business errors are HTTP 200**: `{status:"ERROR", errCode:"ERR_FUNDS", errMsg:"Nedovoljno sredstava"}`; currency mismatch `{status:"ERROR", errCode:"ERR_CCY"}` (**no errMsg**). Success has **no** `status` field at all: `{ref, ts}`. Distinguish by the presence of `status`/`errCode`. | 4xx with an error envelope; success has an explicit status. |
| 41 | `POST /pay/internal/exec` | `ccy` must equal both accounts' currency, otherwise ERR_CCY (no FX). | n/a |
| 42 | `POST /pay/internal/exec` | `Idempotency-Key` header **required**: missing/blank → 400 `{code:"IDEMPOTENCY_KEY_MISSING"}`. The header check runs before body validation. | Optional key, or documented requirement. |
| 43 | `POST /pay/internal/exec` | Same key again → the **original response** (including an original ERR_FUNDS!), no second booking. The request body is **not** compared; a different body with a reused key still gets the old response. 404/422 responses are not stored. | Return 409/422 on key reuse with a different body. |
| 44 | `POST /pay/internal/exec` | Validation → 422 `{errors:[{fld,msg}]}` (e.g. `amt` not matching `^\d+(\.\d{1,2})?$`, zero amount, src = dst on `dstAcc`). Unknown account → 404 ACC_NOT_FOUND. | n/a |
| 45 | `POST /pay/internal/exec` | `ts` is ISO-8601 **with offset** (`+02:00`), the only such timestamp in the API. Booking creates a `D` and a `C` transaction with `partnerName` "Prenos na sopstveni račun" / "Prenos sa sopstvenog računa". | n/a |

## Domestic payment

| # | Endpoint | Quirk | A clean API would… |
|---|---|---|---|
| 46 | `POST /pay/dom/init` | Body `{debtorAcc, creditorIban, creditorName, amount, currency, purposeCode, reference, description}`. `amount` is a **JSON number** here (MESS-5). Only RSD; anything else → 422 on `currency`. | n/a |
| 47 | `POST /pay/dom/init` | Response flags as strings: `scaRequired:"Y"`, `scaMethod:"SMS_OTP"`, `maskedPhone:"+381 64 *** **67"`. | Booleans. |
| 48 | `POST /pay/dom/init` | Creditor IBAN must pass mod-97 → otherwise 422 `{fld:"creditorIban"}`. **Funds are not checked here.** | Check funds early. |
| 49 | `POST /pay/dom/{ref}/sign` | Body `{otp}`. Same OTP rules as login: 403 OTP_INVALID+attemptsLeft, then OTP_LOCKED and the payment becomes **CANC**. | n/a |
| 50 | `POST /pay/dom/{ref}/sign` | **Insufficient funds is detected at sign time**, returned as **HTTP 200** `{status:"ERROR", errCode:"ERR_FUNDS"}` (**no errMsg**, unlike the transfer), and the payment becomes **REJ**. | 4xx at init. |
| 51 | `POST /pay/dom/{ref}/sign` | Success `{paymentRef, state:"PEND"}`: funds reserved (`availBal` drops, `bookBal` doesn't) and a `P` transaction appears with `partnerAcc` = creditor IBAN. Signing a non-INIT payment → 409 `{code:"PAY_STATE", message:"<state>"}`. | n/a |
| 52 | `GET /pay/dom/{ref}/stat` | Async: poll. `PEND` → `EXEC` after `messy.payments.execution-delay-seconds` (default 10); the transaction becomes `B` and `bookBal` drops. `stateDt` is `dd.MM.yyyy HH:mm` (no seconds, no zone). Unknown ref → 404 `{code:"PAY_NOT_FOUND"}`. | Webhook/SSE, or ISO timestamps at least. |
| 53 | `GET /pay/dom/{ref}/stat` | Creditor IBAN `RS81999000000000000099` → `REJ` after the delay; reservation released, pending transaction **disappears** from history. (The spec's `RS35999…99` fails mod-97 and would be a 422 at init.) | n/a |

## Cards

| # | Endpoint | Quirk | A clean API would… |
|---|---|---|---|
| 54 | `POST /cards/getCards` | A **read via POST**, with a body `{clientId}` whose value is ignored (body may even be omitted). | `GET /cards`. |
| 55 | `POST /cards/getCards` | Wrapped in `cardList`. `pan` is masked (`4111********1111`), `expiry` is `MM/yy`, `blocked` is `"Y"/"N"`, `limit` is a sr-RS string for credit cards and `null` for debit. | Card id + structured expiry + boolean + typed limit. |
| 56 | `POST /cards/block` | `{pan, block:"Y"|"N"}` identifies the card by its **masked PAN**. Unblocks with `"N"`. Unknown PAN still **HTTP 200** `{result:"NOK"}`; success `{result:"OK"}`. | `POST /cards/{id}/block` with 404. |

## Profile

| # | Endpoint | Quirk | A clean API would… |
|---|---|---|---|
| 57 | `GET /usr/profile` | Wrapped in an UPPERCASE `USER` key. | No wrapper. |
| 58 | `GET /usr/profile` | `FirstName`, `LastName`, `Phone` (PascalCase) next to `eMail` and `lastLogin`. | camelCase. |
| 59 | `GET /usr/profile` | `Phone` is `+381641234567` (no spaces), while `maskedPhone` elsewhere is `+381 64 *** **67`. | One phone format (E.164). |
| 60 | `GET /usr/profile` | `lastLogin` is **epoch seconds as a string** (`"1790930000"`); updated on every successful OTP (so it is the *current* login, not the previous one). | ISO instant of the previous login. |

## Testing hooks (`X-Mock-Scenario` header)

| Value | Effect |
|---|---|
| `slow` | Waits 3 s, then responds normally. |
| `error` | 503, HTML body, `Retry-After: 5`. |
| `drift` | Normal response, but the **first field of the JSON object (or of every object in a bare array) gets a `_v2` suffix**: `acc_no` → `acc_no_v2`, `accountNumber` → `accountNumber_v2`, `items` → `items_v2`, `USER` → `USER_v2`, `cardList` → `cardList_v2`. Non-JSON responses are untouched. |
| `expired` | 401 with an empty body, even with a valid token. |

The header works on every endpoint, including `/auth/**`. Random chaos (`messy.chaos.enabled`) skips `/auth/**`, `/__admin/**` and the OpenAPI/Swagger routes.
