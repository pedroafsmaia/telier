import React from 'react';
import { Panel } from '../design/primitives/Panel';

// Error Boundary global para tratamento de erros na nova UI do Telier
// Mantém identidade visual "The Architectural Monolith" - mensagens técnicas, claras

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erro capturado pela ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-primary flex items-center justify-center p-6">
          <Panel className="max-w-md w-full">
            <div className="text-center">
              <div className="mb-4">
                <svg className="h-12 w-12 text-error-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-medium text-text-primary mb-2">
                Erro na aplicação
              </h3>
              
              <p className="text-sm text-text-secondary mb-6">
                Ocorreu um erro inesperado. Tente recarregar a página.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left mb-6">
                  <summary className="text-sm text-text-tertiary cursor-pointer hover:text-text-secondary">
                    Detalhes técnicos (desenvolvimento)
                  </summary>
                  <pre className="mt-2 text-xs text-text-tertiary bg-surface-secondary p-3 rounded overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Recarregar página
              </button>
            </div>
          </Panel>
        </div>
      );
    }

    return this.props.children;
  }
}
