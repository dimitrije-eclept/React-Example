# app

Composition root and app shell: `gateway.ts` (Gateway type + `createGateway`), `composition-root.ts` (reads `VITE_ADAPTER`), `gateway-context.tsx`, `providers.tsx`, `layout/` and `i18n.ts`. Routes go in `routes.tsx` once the first page exists.
**May import:** everything, but features only through their `index.ts`. The only place that chooses an adapter.
