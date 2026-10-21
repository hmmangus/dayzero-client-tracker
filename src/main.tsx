import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LocalStorageRepository, RepositoryProvider } from './repositories';
import { buildSeedDataset } from './seed/seed';
import './index.css';

const repository = new LocalStorageRepository({ demoData: buildSeedDataset });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RepositoryProvider repository={repository}>
      <App />
    </RepositoryProvider>
  </StrictMode>,
);
