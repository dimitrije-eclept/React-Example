import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { z } from 'zod';
import '@shared/ui/styles/index.css';
import { createAppContainer } from '@app/composition-root';
import { initI18n } from '@app/i18n';
import { Providers } from '@app/providers';
import { routes } from '@app/routes';

// No `new Function` probe: the production CSP enforces Trusted Types (see vite.config.ts).
z.config({ jitless: true });
initI18n();
const { gateway, session } = createAppContainer();
const router = createBrowserRouter(routes);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers gateway={gateway} session={session}>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
