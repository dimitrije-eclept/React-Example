import { fileURLToPath } from 'node:url';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const src = (dir: string) => fileURLToPath(new URL(`./src/${dir}`, import.meta.url));

/**
 * Strict Content Security Policy for production builds (ADR security baseline). Only same-origin
 * scripts, styles, fonts and images; the API is the one other origin the page may talk to. React's
 * `style` props go through the CSSOM, which style-src does not restrict. Trusted Types are enforced
 * with no policies: nothing in the app writes HTML. Dev is left alone (Vite injects inline styles
 * and talks to its HMR socket). `frame-ancestors` can't be set in a <meta>: send it as a header.
 */
function contentSecurityPolicy(apiUrl: string): Plugin {
  const api = apiUrl ? new URL(apiUrl).origin : '';
  const policy = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "font-src 'self'",
    "img-src 'self'",
    `connect-src 'self'${api ? ` ${api}` : ''}`,
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "require-trusted-types-for 'script'",
    "trusted-types 'none'",
  ].join('; ');
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        // Before any script or stylesheet, so it governs all of them.
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    contentSecurityPolicy(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL ?? ''),
  ],
  resolve: {
    // Keep in sync with tsconfig.app.json "paths"
    alias: {
      '@features': src('features'),
      '@shared': src('shared'),
      '@app': src('app'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Libraries change less often than app code: separate chunks keep them cached across deploys.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
            },
            {
              name: 'data',
              test: /node_modules[\\/](@tanstack|zod|neverthrow|xstate|@xstate)[\\/]/,
            },
            { name: 'i18n', test: /node_modules[\\/](i18next|react-i18next)[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/shared/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
}));
