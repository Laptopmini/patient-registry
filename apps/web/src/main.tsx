import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from './AppProviders';
import { createQueryClient } from './api/queryClient';
import { createAppRouter } from './router';
import './styles/tokens.css';
import './styles/base.css';

const queryClient = createQueryClient();
const router = createAppRouter({ queryClient });

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders queryClient={queryClient} router={router} />
  </StrictMode>,
);

// Flags are not needed to render, and the provider is sizeable: load it after first paint.
void import('./lib/flags').then((flags) => flags.registerFlagProvider());
