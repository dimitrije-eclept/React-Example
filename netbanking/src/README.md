# src/

Feature-first Ports & Adapters (ADR-0001 and its amendment). Each feature is a vertical slice with the hexagonal layers inside it; `shared/` holds what several features need; `app/` wires everything together. The rules below are enforced by `eslint-plugin-boundaries` (`npm run lint`).

```
features/<feature>/
  domain/        feature types (Account, AccountId…)               → shared/domain
  ports/         <feature>.port.ts, returns Result<T, DomainError>  → domain
  adapters/
    mock/        fixtures + <feature>.mock.ts                       → ports, domain, shared/{domain,api,adapters}
    legacy-bank/ Zod schemas, mappers, <feature>.adapter.ts         → (same)
  queries/       TanStack Query hooks + cache keys                  → ports, domain, @app/gateway-context (useGateway)
  machines/      XState machines, multi-step flows only             → domain
  ui/            pages + feature components                         → queries, domain, machines, shared/ui
  index.ts       the feature's public API                           → anything in its own feature
shared/
  domain/        Money, Currency, Brand, DomainError, Result        → nothing
  api/           createHttp (correlation id, 401 callback)          → nothing
  adapters/      parseMoney, formatMoneyForApi, toDomainError, schemaDrift → shared/domain
  ui/            design system + tokens                             → shared/domain
  test/          MSW server + test setup                            → anything (test-only)
app/             gateway.ts, composition-root.ts, providers, routes, layout, i18n → anything
locales/         translation JSON (sr default, en)
main.tsx         Vite entry
```

## Import rules

- **Across features:** only through the other feature's index: `import { useAccounts } from '@features/accounts'`. Never `@features/accounts/ui/...`, and never your own feature's index from inside it (cycles).
- **Within a feature:** relative paths (`../domain/account`).
- **Shared:** `@shared/domain`, `@shared/ui`, `@shared/api`, `@shared/adapters`. `shared/` never imports `features/` or `app/`; dependencies such as the auth token are injected by `app/`.
- **App:** `@app/...`. Features never import `app/`, except `queries/` importing `useGateway` from `@app/gateway-context`.
- **Tests** (`*.test.ts(x)`) and `shared/test` are exempt.
- A helper used by one feature stays in that feature; move it to `shared/` once a second feature needs it.

## How to add a feature (or a use case)

1. **Domain:** types in `domain/` from the design and business language, not from the API payload.
2. **Port:** add a method to `ports/<feature>.port.ts` returning `Promise<Result<T, DomainError>>`.
3. **Mock + contract test:** fixtures and `adapters/mock/<feature>.mock.ts`; write a `<feature>.contract.test.ts` that every adapter of the port must pass.
4. **Queries:** hook + cache keys in `queries/`, reading the port through `useGateway()`.
5. **UI:** pages and components in `ui/`, built from `@shared/ui`. Handle every `DomainError` variant. Add `machines/` only for multi-step flows.
6. **Legacy adapter:** Zod schemas, pure mappers (+ unit tests, reference `MESS-n` from `mock-backend/MESS.md`) and `adapters/legacy-bank/<feature>.adapter.ts`; add it to the contract test.
7. **Route + wiring:** export from `index.ts`, register the port in `app/gateway.ts`, and add the page to `app/routes.tsx` (and the sidebar).
