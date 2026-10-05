import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

// Feature-first Ports & Adapters, see docs/adr/ADR-0001 (amendment) and src/README.md.
// Inside a feature all imports point toward its domain; features talk to each other only via index.ts.

const FEATURE_LAYERS = ['domain', 'ports', 'adapters', 'queries', 'ui', 'machines'];
const SHARED_LAYERS = ['domain', 'api', 'adapters', 'ui', 'test'];

const SAME = '{{ from.element.captured.feature }}';

/** Element(s) of the given feature-* types in the SAME feature as the importer. */
const sameFeature = (...layers) =>
  layers.map((name) => ({ element: { type: `feature-${name}`, captured: { feature: SAME } } }));
const shared = (...layers) => layers.map((name) => ({ element: { type: `shared-${name}` } }));
const fromFeature = (name) => ({ element: { type: `feature-${name}` } });
const allFeatureTypes = [...FEATURE_LAYERS.map((name) => `feature-${name}`), 'feature-index'];
const allSharedTypes = SHARED_LAYERS.map((name) => `shared-${name}`);

export default defineConfig([
  globalIgnores(['dist', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.app.json' },
      },
      'boundaries/files': [
        // Vite entry: wires app/ together, may import anything.
        { category: 'entry', pattern: 'src/main.tsx' },
        // Tests are exempt from the layer rules.
        { category: 'test', pattern: 'src/**/*.test.{ts,tsx}' },
      ],
      // Order matters: the first matching descriptor wins, so feature sub-folders come before
      // `feature-index`, which covers files at a feature's root (index.ts, contract tests).
      'boundaries/elements': [
        ...FEATURE_LAYERS.map((name) => ({
          type: `feature-${name}`,
          pattern: `src/features/*/${name}`,
          capture: ['feature'],
        })),
        { type: 'feature-index', pattern: 'src/features/*', capture: ['feature'] },
        ...SHARED_LAYERS.map((name) => ({ type: `shared-${name}`, pattern: `src/shared/${name}` })),
        { type: 'app', pattern: 'src/app' },
        { type: 'locales', pattern: 'src/locales' },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message:
            'Layer rule violated: {{from.type}} may not import {{to.type}}. See the import rules in src/README.md.',
          policies: [
            // ── Within the same feature ─────────────────────────────────────────────
            { from: fromFeature('domain'), allow: { to: [...shared('domain')] } },
            {
              from: fromFeature('ports'),
              allow: { to: [...sameFeature('domain'), ...shared('domain')] },
            },
            {
              from: fromFeature('adapters'),
              allow: {
                to: [...sameFeature('ports', 'domain'), ...shared('domain', 'api', 'adapters')],
              },
            },
            {
              from: fromFeature('queries'),
              allow: {
                to: [
                  ...sameFeature('ports', 'domain'),
                  ...shared('domain'),
                  { element: { type: 'app', fileInternalPath: 'gateway-context.tsx' } },
                ],
              },
            },
            {
              from: fromFeature('machines'),
              allow: { to: [...sameFeature('domain'), ...shared('domain')] },
            },
            {
              from: fromFeature('ui'),
              allow: {
                to: [...sameFeature('queries', 'domain', 'machines'), ...shared('domain', 'ui')],
              },
            },
            {
              from: fromFeature('index'),
              allow: { to: [...sameFeature(...FEATURE_LAYERS), ...shared('domain')] },
            },

            // ── Across features: only through the other feature's index.ts ─────────
            {
              from: { element: { types: { anyOf: allFeatureTypes } } },
              allow: {
                to: { element: { type: 'feature-index', captured: { feature: `!${SAME}` } } },
              },
            },
            {
              from: { element: { types: { anyOf: allFeatureTypes } } },
              disallow: {
                to: {
                  element: {
                    types: { anyOf: FEATURE_LAYERS.map((name) => `feature-${name}`) },
                    captured: { feature: `!${SAME}` },
                  },
                },
              },
              message:
                'Import another feature through its index.ts only (@features/{{to.captured.feature}}), not its {{to.type}} internals.',
            },
            {
              from: { element: { types: { anyOf: allFeatureTypes } } },
              disallow: { to: { element: { type: 'app' } } },
              message:
                'Features must not import app/. Only queries/ may use useGateway from @app/gateway-context.',
            },
            {
              from: fromFeature('queries'),
              allow: { to: { element: { type: 'app', fileInternalPath: 'gateway-context.tsx' } } },
            },

            // ── Shared ──────────────────────────────────────────────────────────────
            { from: { element: { type: 'shared-ui' } }, allow: { to: shared('domain') } },
            { from: { element: { type: 'shared-adapters' } }, allow: { to: shared('domain') } },
            {
              from: {
                element: { types: { anyOf: allSharedTypes.filter((t) => t !== 'shared-test') } },
              },
              disallow: { to: { element: { types: { anyOf: [...allFeatureTypes, 'app'] } } } },
              message:
                'shared/ must never import features/ or app/. Move the code, or inject it from app/.',
            },

            // ── App, entry and tests may import anything ────────────────────────────
            { from: { element: { type: 'app' } }, allow: { to: { element: { type: '*' } } } },
            { from: { file: { categories: 'entry' } }, allow: { to: { element: { type: '*' } } } },
            {
              from: { element: { type: 'shared-test' } },
              allow: { to: { element: { type: '*' } } },
            },
            { from: { file: { categories: 'test' } }, allow: { to: { element: { type: '*' } } } },
          ],
        },
      ],
    },
  },
]);
