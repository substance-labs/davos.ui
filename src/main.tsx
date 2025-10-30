import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient } from '@tanstack/react-query'
import { GC_TIME, STALE_TIME } from './lib/constants.ts'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ThemeProvider } from './components/theme-provider.tsx'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <ThemeProvider defaultTheme="system" storageKey="davos-ui-theme">
        <App />
      </ThemeProvider>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </PersistQueryClientProvider>
  </StrictMode>,
)
