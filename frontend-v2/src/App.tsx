import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './app/router';
import { ErrorBoundary } from './app/ErrorBoundary';
import { AuthProvider } from './lib/auth';
import { MigrationProvider } from './app/migration/MigrationContext';
import { MigrationGate } from './app/migration/MigrationGate';

// Cliente React Query configurado para a nova UI do Telier
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: (failureCount, error) => {
        // Não retry em erros 4xx, mas retry em 5xx e erros de rede
        if (error && typeof error === 'object' && 'status' in error) {
          const status = error.status as number;
          return failureCount < 2 && status >= 500;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Evitar refetch desnecessário
    },
    mutations: {
      retry: false, // Mutations geralmente não devem retry automaticamente
    },
  },
});

// App principal do Telier - bootstrap com providers completos e tratamento global de erro
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MigrationProvider>
          <MigrationGate>
            <AuthProvider>
              <AppRouter />
            </AuthProvider>
          </MigrationGate>
        </MigrationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
