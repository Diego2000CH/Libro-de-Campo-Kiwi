import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTab?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.fallbackTab) {
      this.props.fallbackTab();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-2xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-stone-900">Ocurrió un problema visual al cargar este módulo</h2>
            <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
              Se evitó que la aplicación se quedara en blanco. Puedes reintentar cargar el contenido o volver al resumen principal del huerto.
            </p>
            {this.state.error && (
              <div className="mt-3 p-3 bg-stone-50 rounded-xl text-left font-mono text-[11px] text-stone-700 border border-stone-200 max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reintentar Cargar
            </button>
            {this.props.fallbackTab && (
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                Ir a Resumen
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
