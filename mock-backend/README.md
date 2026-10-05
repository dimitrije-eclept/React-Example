# legacy-bank (MessyNetBanking)

A deliberately messy mock banking API (Spring Boot 4.1, Java 25, in-memory). It exists so the React netbanking
frontend's adapter layer has something realistic to absorb. **The mess is the requirement.** Every quirk is listed
in [MESS.md](MESS.md) and pinned by tests; don't "fix" them.

## Run

```bash
./mvnw spring-boot:run          # http://localhost:8080, profile "dev" by default
./mvnw test
```

Demo login: `demo` / `demo123`, OTP always `123456`.

```bash
TICKET=$(curl -s localhost:8080/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"demo123"}' | jq -r .loginTicket)
TOKEN=$(curl -s localhost:8080/auth/otp -H 'Content-Type: application/json' \
  -d "{\"ticket\":\"$TICKET\",\"otp\":\"123456\"}" | jq -r .access_token)
curl -s localhost:8080/core/v2/acc/list -H "Authorization: Bearer $TOKEN"
```

Seeded accounts (IBAN check digits are the mod-97-correct ones):

| Account | IBAN | Type | Balance |
|---|---|---|---|
| `160-0000000123456-78` | `RS66160000000012345678` | TR, RSD | 185.000,00 (book 186.250,00: 3 pending card debits) |
| `160-0000000987654-32` | `RS59160000000098765432` | ST, EUR | 4.200,00 |
| `160-0000000555555-11` | `RS38160000000055555511` | KK, RSD | 22.500,00 |

Domestic payments to `RS81999000000000000099` are rejected (`REJ`) after signing. Any other mod-97-valid IBAN
(e.g. `RS35105008123123123173`) executes.

## Configuration

| Property | Default | |
|---|---|---|
| `messy.auth.access-ttl-seconds` | 300 | Access token lifetime |
| `messy.auth.refresh-ttl-seconds` | 1800 | Refresh token lifetime |
| `messy.auth.ticket-ttl-seconds` | 300 | Login ticket lifetime |
| `messy.payments.execution-delay-seconds` | 10 | PEND → EXEC/REJ delay |
| `messy.chaos.enabled` | false | Random latency + 503s |
| `messy.chaos.latency-ms-min` / `-max` | 100 / 600 | |
| `messy.chaos.error-rate` | 0.05 | Fraction of requests failing with 503 |

e.g. `./mvnw spring-boot:run -Dspring-boot.run.arguments="--messy.chaos.enabled=true"`

Per request, the `X-Mock-Scenario` header forces `slow` | `error` | `drift` | `expired` (see MESS.md).

## Admin (dev profile only, no auth)

```bash
curl -X POST localhost:8080/__admin/reset                 # restore seed, kill all tokens
curl localhost:8080/__admin/state                         # balances, pending payments, sessions
curl -X POST 'localhost:8080/__admin/time-travel?seconds=30'   # fast-forward payment clock
curl localhost:8080/__admin/boom                          # demo the HTML 500
```

## OpenAPI spec for the frontend

Swagger UI: <http://localhost:8080/swagger-ui.html>

The spec (OpenAPI 3.1) describes the API **as it behaves**: string amounts, `"Y"`/`"N"` flags, the bare array
account list, and the HTTP-200 business errors as `oneOf` success/error bodies. Export it with the app running:

```bash
curl localhost:8080/v3/api-docs.yaml -o legacy-bank.yaml
```

Not in the spec (they're not expressible per-operation): the `drift` scenario's renamed fields, and the fact that
404/405 for unknown routes are HTML.
