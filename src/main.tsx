import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// After a new deploy, a tab left open still references the previous build's page
// chunks, which no longer exist. Reload once to pick up the new build; the
// timestamp guard stops a reload loop if the failure is something else.
const RELOAD_KEY = 'dayzero:chunk-reload-at';
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return; // no sessionStorage: let the error boundary handle it
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
