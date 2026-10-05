# ADR-0001: Client-side API translation layer using Ports & Adapters

**Status:** Proposed
**Date:** 2026-10-02
**Author:** Dimitrije Fustić
**Deciders:** Frontend lead, Tech lead / Architect, Client-side security reviewer _(fill in names)_

---

## Context

We are building a netbanking web application in React, developed with Spec Kit (spec-driven development). A finished UI design will exist before implementation starts.

The backend API the app must consume is **fragmented and inconsistent**:

- Related data is spread across multiple endpoints (e.g. account list and balances come from different calls).
- Naming, formats and conventions vary between endpoints (snake_case vs camelCase, amounts as localized strings, mixed pagination styles, ad-hoc error codes).
- The API may be **replaced entirely** in the future, and we want that replacement to be possible without rewriting the UI.

Additional forces:

- **Banking domain:** money must be handled precisely, errors must be handled exhaustively, and multi-step flows (strong customer authentication, payment authorization, OTP) must be modelled explicitly.
- **Spec-driven / AI-assisted development:** architectural boundaries must be written down and machine-enforced, otherwise generated code will bypass them.
- **Scope:** a Backend-for-Frontend (BFF) service is **out of scope** for this project (see *Options Considered*). The translation layer must therefore live inside the React application.

## Decision

We will implement a **client-side anti-corruption layer using the Ports & Adapters (hexagonal) pattern**.

1. The **domain model** (types, value objects, error union) is derived from the **UI design and business language**, not from the API.
2. **Ports** are TypeScript interfaces organised by business capability and use case (`AccountsPort`, `PaymentsPort`, `AuthPort`, …). They return `Result<T, DomainError>` instead of throwing.
3. **Adapters** implement the ports for a specific API. They are the *only* code that knows about endpoints, raw payloads, auth headers, pagination quirks and API error codes. Every response is validated at runtime with **Zod** and mapped to domain objects by pure mapper functions.
4. A **composition root** selects which adapter set (real, mock, future API) is injected through a React context.
5. **TanStack Query** hooks sit on top of the ports and provide caching, loading/error state, retries and invalidation. UI components only consume these hooks and domain types.
6. Multi-step flows (payments, SCA) are modelled with **explicit state machines (XState)** in the feature layer, driven by step-wise port methods (`prepare → authorize → status`).
7. Layer boundaries are **enforced in CI** with `eslint-plugin-boundaries` and recorded in the Spec Kit `constitution.md`.

### Target structure

```
src/
  domain/      Types, value objects (Money, Iban), DomainError union, pure helpers   → imports nothing
  ports/       Capability interfaces + Gateway aggregate                             → domain
  adapters/
    <api-name>/  http client, Zod raw schemas, mappers, error normalisation          → ports, domain, api
    mock/        In-memory implementation of Gateway for dev, Storybook, tests
  api/         Generated or thin raw HTTP client                                      → nothing app-specific
  queries/     TanStack Query hooks, cache keys, invalidation                         → ports, domain
  features/    Screens/components from the design, XState flow machines              → queries, domain, ui
  ui/          Presentational design-system components (no data access)
  app/         Composition root, providers, routing                                   → everything
```

**Dependency rule:** all imports point toward `domain/`. Features never import from `api/` or `adapters/`.

## Options Considered

### Option A: Ports & Adapters (hexagonal) — **chosen**

| Dimension | Assessment |
|---|---|
| Complexity | Medium (more files and indirection up front) |
| Cost | Higher initial setup; lower long-term change cost |
| API replaceability | High — new adapter + one-line wiring change |
| Testability | High — mock adapter, pure mappers, shared contract tests |
| Team familiarity | Medium for frontend devs; high for backend devs (same concept as Java service interfaces + repository implementations) |

**Pros**
- Strong, type-enforced boundary between messy API and clean UI.
- UI can be built from specs against a mock adapter before the real API mapping is finished.
- One shared contract test suite proves any adapter (mock, current API, future API) satisfies the ports.
- Clear place for banking concerns: money parsing, error normalisation, SCA handling.

**Cons**
- More boilerplate than simpler options.
- Requires discipline to keep ports use-case-oriented rather than mirroring endpoints.
- Developers new to the pattern need onboarding.

### Option B: Service modules without formal ports

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | Low initial cost |
| API replaceability | Medium — boundary exists only by convention |
| Testability | Medium |
| Team familiarity | High |

**Pros:** fast to start, easy to read, minimal ceremony.
**Cons:** no type-level contract; raw API types and quirks tend to leak into components over time; swapping APIs means auditing every service.

### Option C: Transformation inside the data-fetching library

(RTK Query `transformResponse`, TanStack Query `select` / custom `queryFn`)

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | Lowest initial cost |
| API replaceability | Low — mapping is scattered across hooks and coupled to the library |
| Testability | Low–Medium |
| Team familiarity | High |

**Pros:** least code; quick for prototypes.
**Cons:** no natural home for multi-step flows or cross-endpoint aggregation; does not meet the API-replacement goal.

### Option D: Client-side GraphQL facade

(Apollo local resolvers / client-side schema over REST)

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Cost | High (runtime weight, learning curve) |
| API replaceability | High |
| Testability | Medium |
| Team familiarity | Low |

**Pros:** strong queryable contract; screens fetch exactly what they need.
**Cons:** heavy runtime and tooling for a REST-only backend; harder to debug; not justified without existing GraphQL adoption.

### Option E: Backend-for-Frontend (BFF) — **out of scope, noted for the future**

A server-side service owned by the frontend team that performs the translation and acts as a confidential OAuth client.

**Why considered:** it is the most secure option. RFC 10017 (OAuth 2.0 for Browser-Based Apps, BCP 212) ranks the BFF as the recommended pattern because tokens never reach the browser. It also reduces client round-trips and hides the core API from the internet.

**Why not chosen:** it introduces a new deployable service, infrastructure ownership, and — depending on who hosts it — regulatory implications (ICT outsourcing / third-party provider obligations under NBS rules or DORA, data-processor obligations under ZZPL/GDPR). This is outside the agreed project scope.

**Forward compatibility:** port contracts in Option A are designed so that a future BFF can expose the same contract. Adopting a BFF later would mean writing one new adapter that calls it; nothing above the adapter layer changes.

## Trade-off Analysis

- **Up-front cost vs. change cost.** Option A costs more at the start than B or C, but the explicit requirement to be able to replace the API makes change cost the dominant factor. B and C push that cost into a future rewrite.
- **Structure vs. velocity.** The mock adapter and spec-first contracts let UI work proceed in parallel with API mapping, which recovers much of the velocity lost to extra structure.
- **Enforcement vs. convention.** With AI-assisted, spec-driven development, conventions erode quickly. Option A's boundaries are expressible as lint rules; Option B's are not.
- **Security vs. scope.** Rejecting the BFF means tokens live in the browser. We accept this and compensate with the client-side security baseline below; the decision is revisited if scope changes.

## Consequences

### Easier
- Replacing or partially migrating the backend API (new adapter, same ports).
- Building and demoing UI before backend integration is complete (mock adapter).
- Testing: pure mappers, adapter tests with recorded payloads (MSW), UI tests against the mock gateway.
- Handling API drift: Zod surfaces schema changes as typed, logged errors at the boundary instead of crashes in components.
- Exhaustive error handling via a closed `DomainError` union.

### Harder
- More files and indirection; onboarding is required for developers unfamiliar with the pattern.
- Port design requires care — ports must model **use cases**, not endpoints, or replaceability is lost.
- Behavioural differences between APIs (SCA style, async vs sync payments, pagination) can still leak; they must be absorbed by the adapter or represented explicitly in the domain (e.g. `ScaChallenge` variants).

### Client-side security baseline (mandatory without a BFF)
- Access tokens kept **in memory only**, never in `localStorage`/`sessionStorage`; short lifetimes; refresh-token rotation; Authorization Code + PKCE.
- Strict Content Security Policy; Trusted Types where supported; no third-party scripts on authenticated routes.
- TanStack Query cache **not persisted**; fully cleared on logout and session timeout.
- Session inactivity timeout aligned with PSD2 RTS (max 5 minutes), enforced in coordination with the backend.
- PII and account identifiers scrubbed before anything reaches logging, Sentry or analytics.
- Pinned dependencies, lockfile audit in CI, minimal dependency footprint.
- For payments: the exact amount/payee shown to the user must be what is authorized and executed — mapper logic on this path gets the highest test coverage.

### To revisit
- Introduction of a BFF if project scope, security review findings, or client requirements change.
- Whether an OpenAPI spec exists (or can be produced) for the current API to enable client generation in `api/`.
- PSD3 / PSR requirements (payee-name verification, fraud warnings) expected to apply ~late 2027; the port design should leave room for them.

## Conventions (to be copied into Spec Kit `constitution.md`)

1. Imports follow the dependency rule; violations fail CI (`eslint-plugin-boundaries`).
2. Features never import from `api/` or `adapters/`.
3. Every external response is validated with Zod inside an adapter.
4. Ports return `Result<T, DomainError>`; components handle `DomainError` exhaustively.
5. Money is represented as integer minor units (`bigint`) plus currency; floats are forbidden for amounts.
6. Domain types are derived from the design and business language, never copied from API payloads.
7. Multi-step flows are modelled as explicit state machines.
8. Every port has a shared contract test suite run against both the mock and real adapters.

## Action Items

1. [ ] Review and sign off this ADR (deciders listed above).
2. [ ] Add the conventions above to Spec Kit `constitution.md`.
3. [ ] Scaffold the folder structure and configure `eslint-plugin-boundaries` in CI.
4. [ ] Define initial domain types and ports from the design (accounts, transactions, payments, auth).
5. [ ] Implement the mock adapter and the shared port contract test suite.
6. [ ] Collect real API response samples; write Zod schemas and mappers for the current API.
7. [ ] Model the payment + SCA flow as an XState machine against the `PaymentsPort`.
8. [ ] Implement and verify the client-side security baseline (token handling, CSP, cache clearing, log scrubbing).
9. [ ] Record a short onboarding note for the team (pattern overview, Java analogies, where things live).
10. [ ] Raise BFF as a verbal recommendation with the client; record the outcome as a follow-up ADR if adopted.

## References

- RFC 10017 / BCP 212 — OAuth 2.0 for Browser-Based Applications: https://oauth.net/2/browser-based-apps/
- Zod: https://zod.dev
- TanStack Query: https://tanstack.com/query
- XState: https://stately.ai/docs/xstate
- eslint-plugin-boundaries: https://github.com/javierbrea/eslint-plugin-boundaries
- MSW (Mock Service Worker): https://mswjs.io

---

## Amendment: feature-first folder structure

**Date:** 2026-10-02 · **Status:** Proposed

The decision above is unchanged: a client-side anti-corruption layer with domain, ports, adapters, queries and UI, a composition root, and lint-enforced boundaries. Only the **folder organisation** changes, from layer-first (`src/domain`, `src/ports`, `src/adapters`, …) to **feature-first**: each feature is a vertical slice that keeps the same layering inside it.

```
src/
  features/<feature>/{domain,ports,adapters/{mock,legacy-bank},queries,ui,machines}, index.ts
  shared/{domain,api,adapters,ui,test}
  app/        gateway.ts (Gateway = one port per feature), composition-root.ts, providers, routes, layout
```

Rules (enforced with `eslint-plugin-boundaries`, details in `src/README.md`):

- Inside a feature, imports point toward its `domain/` (ports → domain; adapters/queries → ports, domain; machines → domain; ui → queries, domain, machines).
- Features import each other **only through `index.ts`**.
- `shared/` never imports `features/` or `app/`. Cross-cutting wiring (e.g. the auth token source for the HTTP client) is injected by `app/`.
- `app/gateway.ts` assembles every feature's adapters into the `Gateway`; `composition-root.ts` picks the adapter set (`VITE_ADAPTER`).

### Trade-offs

**Gains**
- **Cohesion:** everything about accounts (types, port, adapters, hooks, screens, tests) lives in one folder.
- **Ownership:** a team or developer can own a feature folder end to end.
- **Spec-driven fit:** one Spec Kit spec maps to one folder, which keeps AI-generated changes local and reviewable.

**Costs**
- **Replacing the API touches every feature:** a new backend means a new `adapters/<api-name>/` folder in each feature, instead of one top-level adapter folder. The `Gateway` assembly and the shared contract tests keep this mechanical.
- **Cross-feature access is narrower:** other features see only what a feature exports from `index.ts`. That is intentional, but it means more explicit exports and occasional moves into `shared/`.
- **More lint configuration:** the boundary rules need captured feature names to tell "same feature" from "other feature".
