import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  hasPendingSync?: boolean;
  onRetrySync?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  hasPendingSync = false,
  onRetrySync,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline && !hasPendingSync) return null;

  if (!isOnline) {
    return (
      <div className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg border border-amber-400/50">
        <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
        <span>
          Modo Terreno Offline — Tus registros se guardan en el equipo y se sincronizarán al volver la señal.
        </span>
      </div>
    );
  }

  return (
    <div className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white shadow-lg border border-emerald-500/40">
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      <span>Conexión recuperada: sincronizando registros pendientes...</span>
      {onRetrySync && (
        <button
          type="button"
          onClick={onRetrySync}
          className="ml-1 underline text-emerald-200 hover:text-white cursor-pointer"
        >
          Forzar ahora
        </button>
      )}
    </div>
  );
};
