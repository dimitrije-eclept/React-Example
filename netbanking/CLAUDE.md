# Netbanking frontend

React 19 netbanking app for the deliberately messy **legacy-bank** API (`../mock-backend`, Spring Boot on
`:8080`). The point of the codebase is the translation layer: every quirk of the API is absorbed in an
adapter, and everything above it works with a clean domain model.

Read before changing structure:

- `../docs/adr/ADR-0001-frontend-api-translation-layer.md`: why Ports & Adapters, the security baseline.
- `src/README.md`: folder layout, import rules, and the checklist for adding a feature.
- `../mock-backend/MESS.md`: the numbered API quirks (`MESS-n`) the adapters reference.

## Commands

```bash
npm run dev          # Vite on :5173 (the backend only allows CORS from this origin)
npm run typecheck    # tsc -b --noEmit
npm run lint         # ESLint, including the layer boundaries
npx prettier --check src
npx vitest run       # unit + component tests (MSW, jsdom)
npm run build
```

Backend: `cd ../mock-backend && ./mvnw spring-boot:run`. Demo login `demo` / `demo123`, SMS code
`123456`. `POST :8080/__admin/reset` restores seed data; `X-Mock-Scenario: slow|error|drift|expired`
forces failure modes. `.env.development` points the app at `http://localhost:8080` with
`VITE_ADAPTER=legacy-bank` (the only adapter set so far).

A change is done when typecheck, lint, prettier, tests and build all pass. For UI work, also check
it in a browser against the real backend (desktop and ~390 px wide, `sr` and `en`).

## Architecture in one screen

Feature-first Ports & Adapters, enforced by `eslint-plugin-boundaries`:

```
features/<name>/
  domain/      types from the design and business language, never from payloads
  ports/       interface; methods return PortResult<T> = Promise<Result<T, DomainError>>
  adapters/legacy-bank/  schemas.ts (Zod) · mappers.ts (pure) · <name>.adapter.ts
  queries/     TanStack Query hooks + keys; the only layer that calls useGateway()
  machines/    XState, multi-step flows only (sign-in, payment)
  ui/          pages and components; links.ts holds the route path
  index.ts     public API; other features and app/ import only this
shared/  domain · api (createHttp) · adapters (helpers) · ui (design system) · test
app/     gateway, composition root, session, routes, layout, i18n
```

- Features talk to each other only through `@features/<name>`; inside a feature use relative imports.
- `app/` is the only place that picks adapters or knows about the session. Features get what they
  need by props or the gateway (e.g. `ProfilePage` receives `onSignOut`).
- `overview` is a composition feature: UI only, built from other features' public APIs.
- The route path lives in the feature (`TRANSACTIONS_PATH`, `transactionsHref()`), and `app/routes.tsx`
  and every link use it.

## Domain rules

- **Money** is `{ minor: bigint, currency }`. Never a float. Parse with `parseSrAmount` (API) or
  `parseAmountInput` (user input); display with `formatAmount` / `formatMoney` / `formatSignedAmount`.
  Amounts are shown in sr-RS format (`185.000,00`) in both UI languages, as in the design.
- **Dates** in the domain are ISO strings (`2026-09-14`) or `Date` instants. Wall-clock times from
  the bank are Belgrade local; convert them in the mapper (`fromBelgradeDateTime`).
- **Branded ids** (`AccountNumber`, `PaymentId`, `CardId`, `Iban`) for anything the API identifies.
- **Errors** are values. Ports return `Result`; the closed `DomainError` union covers the common cases.
  A use case with its own vocabulary gets its own union (`OtpError`, `TransferError`,
  `AuthorizeError`). UI handles every variant with an exhaustive `switch` ending in `assertNever`.
- Name things as the customer sees them (`available`, `booked`, `recipientIban`), not as the API does.

## Adapters (where the mess goes)

- Validate every response with Zod (`parsePayload(schema, body, 'METHOD /path')`). A mismatch is
  logged as schema drift (paths and issue codes only, no values/PII) and becomes `unknown`.
- Mappers are pure functions with their own tests. Comment each quirk with its `MESS-n`.
- Map HTTP outcomes explicitly per endpoint first (404, 409, 422, business errors sent with HTTP 200),
  then fall back to `toDomainError` (empty-body 401, HTML 5xx/503 + `Retry-After`) and
  `networkError()`. Rename the bank's 422 field names to the domain's (`creditorIban` → `recipientIban`).
- Write requests in the bank's format inside the adapter only: dotted dates, dot-decimal strings vs
  JSON numbers, `Y`/`N`, `ticket` vs `loginTicket`.
- Idempotency (transfers): one key per intended transfer; reuse it only to retry an unknown outcome
  (`ui/idempotency.ts`). The bank replays the first answer for a reused key, even for a different body.
- Missing data is fetched in the adapter, not patched in the UI (balances per account; the account
  list for a credit limit's currency).

## Data and flows

- Queries: `queryFn: () => orThrow(port.method())`, so the thrown `DomainError` is the typed query error
  (registered in `app/query-client.ts`). Export keys (`accountKeys.all`) for invalidation.
- Only `unavailable` is retried (respecting `Retry-After`), at most twice. A 401 is never retried; the HTTP
  client refreshes once, then the session ends and `SessionEndedScreen` takes over.
- After a mutation, invalidate exactly what changed (accounts + transactions after money moves), also on
  failure when the outcome may be unknown. Show stale data with "as of HH:mm" instead of blanking it.
- XState machines get their actors as placeholders and the UI provides them from the port
  (`machine.provide({ actors })`). Machines import only domain types.
- **`assign` merges into context.** To reset, set every field to `undefined` explicitly.

## UI and design system

- Build from `@shared/ui`: `Button`, `ButtonLink`, `TextField`, `SelectField`, `AmountField`,
  `OtpInput`, `SegmentedControl`, `Alert`, `QueryErrorAlert`, `Card`, `Chip`, `Skeleton`,
  `StepIndicator`, `Timeline`, icons. `shared/ui` stays presentational: props in, events out.
- Colours, fonts and motion are tokens in `src/shared/ui/styles/index.css` (`bg-ground`,
  `text-muted`, `border-hairline`, `bg-pending-soft`…). Add a token rather than an arbitrary hex value.
- Fonts are IBM Plex, self-hosted via `@fontsource` (no third-party requests; ADR CSP baseline).
- Every page handles loading (skeletons), empty, error (`QueryErrorAlert` with retry) and
  stale-data states. The design's "Errors & edge states" board is the reference wording.
- Forms use react-hook-form + Zod, with the schema built in `useMemo` from `t` so messages are
  translated. Validate on the client what the client can know (IBAN mod-97, amount vs available), and
  still map the bank's errors onto fields.
- **Accessibility:** a label for every control, `aria-describedby` for hints and errors, `role="alert"`
  only for errors, a live region for status that changes, focus moved to the new step's heading
  unless the step focuses its own field, 44 px touch targets, no horizontal scroll at phone width.
- **Motion:** page transitions use `viewTransition` on links (`ButtonLink` does it by default); content
  enters with `animate-enter`, lists stagger with `animationDelay`. Keep it short (≤ 260 ms).
  `prefers-reduced-motion` turns everything off globally; don't bypass it.

## i18n

- All copy is in `src/locales/sr.json` (default, Latin script) and `en.json`. Nothing is hardcoded.
  Keys are typed from `en.json`; a test checks both files have the same keys.
- Use `<Trans components={{ strong: <strong /> }}>` for markup and `count` for plurals. Serbian has
  `_one`, `_few` and `_other` forms.
- Format dates and times with `intlLocale(i18n.language)`. Plain `sr` would format in Cyrillic.
- Language choice is stored by `app/i18n.ts` on `languageChanged`; features just call
  `i18n.changeLanguage`.

## Security baseline (ADR)

- Tokens live in memory only (`app/session.ts`); a reload signs out. Never use Web Storage for tokens,
  account data or PII. Only harmless preferences (language) may go to `localStorage`.
- Clear the query cache whenever the session is no longer active. Sign out after 5 min idle.
- No third-party scripts, styles or fonts. Never log values from payloads.

## Testing

- Tests run in English (`initI18n('en')` in `src/shared/test/setup.ts`) and use `fireEvent`
  (`user-event` is not installed).
- Stub the bank with MSW. `src/shared/test/fixtures/legacy-bank.ts` holds recorded payloads and
  handlers that behave like the backend (paging, idempotency replay, OTP attempts, payment states).
  Use `legacyBankHandlers` for the happy path and override single endpoints with `server.use`.
- Feature components: `renderWithGateway(ui)` (real legacy-bank adapters against MSW, no retries).
  Whole-app flows: `app/app.test.tsx` with `createAppContainer('legacy-bank', BANK)` and a memory
  router.
- Test adapters per `MESS-n` (request shape and response mapping), mappers as pure functions, and UI
  through roles and labels the way a customer would use it.
- Node 25 ships an unusable global `localStorage`; the test setup replaces it, so the
  `--localstorage-file` warning is harmless.

## Pitfalls we already hit

- Let `createHttp` resolve `fetch` per call. A captured `fetch` bypasses MSW and monitoring wrappers.
- `react-refresh` wants component files to export only components. Constants, hooks and helpers go in
  separate `.ts` files (`links.ts`, `field-styles.ts`, `card-label.ts`).
- Prettier reformats after every write, so edit against the current file, not the text you wrote.
- `autoFocus` inside a step loses to a later "focus the heading" effect unless that effect checks
  `container.contains(document.activeElement)`.
- `eslint-plugin-boundaries` currently pulls in a vulnerable `braces` (dev-only); `npm audit fix
  --force` would downgrade the plugin and break the layer rules.

## Not built yet

- In-memory `mock` adapters and the shared per-port contract test suite (`src/README.md` step 3).
- `npm run test:e2e` is a placeholder: Playwright isn't installed in this project.
