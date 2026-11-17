import React, { useState } from 'react';
import { Cloud, CloudCheck, CloudOff, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, KeyRound, Database } from 'lucide-react';
import { CloudConfig, getCloudConfig, saveCloudConfig } from '../services/cloudSync';

interface SyncStatusBadgeProps {
  syncState: 'idle' | 'loading' | 'saving' | 'synced' | 'error' | 'offline';
  lastSyncTime: string | null;
  onForceSync: () => Promise<void>;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  syncState,
  lastSyncTime,
  onForceSync
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<CloudConfig>(getCloudConfig);
  const [editBinId, setEditBinId] = useState(config.binId);
  const [editMasterKey, setEditMasterKey] = useState(config.masterKey);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    const updated = saveCloudConfig({
      binId: editBinId.trim(),
      masterKey: editMasterKey.trim()
    });
    setConfig(updated);
    setSaveSuccessMsg('¡Credenciales de Nube guardadas!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    setIsSavingConfig(false);
    await onForceSync();
  };

  const getBadgeContent = () => {
    switch (syncState) {
      case 'saving':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
            <span className="hidden sm:inline">Guardando en Nube...</span>
            <span className="sm:hidden">Guardando...</span>
          </span>
        );
      case 'loading':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-700" />
            <span className="hidden sm:inline">Descargando Nube...</span>
            <span className="sm:hidden">Cargando...</span>
          </span>
        );
      case 'synced':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
            <Cloud className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Nube Conectada 24/7</span>
            <span className="sm:hidden">Nube OK</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200 transition-colors">
            <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
            <span className="hidden sm:inline">Reintentar Nube (Usa Local)</span>
            <span className="sm:hidden">Error Nube</span>
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 transition-colors">
            <CloudOff className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Modo Local (Sin Red)</span>
            <span className="sm:hidden">Sin Red</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-300 hover:bg-stone-200 transition-colors">
            <CloudCheck className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">Nube Activa</span>
            <span className="sm:hidden">Nube</span>
          </span>
        );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConfig(getCloudConfig());
          setIsOpen(true);
        }}
        className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full"
        title="Ver estado de sincronización en la Nube"
      >
        {getBadgeContent()}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header modal */}
            <div className="bg-gradient-to-r from-emerald-950 to-stone-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-800/80 border border-emerald-600/50 flex items-center justify-center">
                  <Database className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Sincronización en la Nube 24/7</h3>
                  <p className="text-xs text-emerald-200">Base de Datos Centralizada Fundo La Cabaña</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-950 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-900">Sincronización Multidispositivo Activa</p>
                  <p className="text-emerald-800 text-[11px] leading-relaxed">
                    Tus registros se guardan instantáneamente en tu dispositivo y se replican en la nube (Firebase / Cloud SQL y respaldo JSONBin).
                  </p>
                </div>
              </div>

              <div className="space-y-2 bg-stone-50 border border-stone-200 rounded-xl p-3.5">
                <div className="flex justify-between items-center py-1 border-b border-stone-200">
                  <span className="text-stone-500 font-medium">Estado actual:</span>
                  {syncState === 'offline' ? (
                    <span className="font-bold text-amber-800 flex items-center gap-1">
                      <CloudOff className="w-3.5 h-3.5 text-amber-600" />
                      Modo Local (Sin Red)
                    </span>
                  ) : syncState === 'error' ? (
                    <span className="font-bold text-rose-800 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      Respaldo Local Activo
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Enlace Nube Operativo
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center py-1 border-b border-stone-200">
                  <span className="text-stone-500 font-medium">Última sincronización:</span>
                  <span className="font-mono text-stone-700">{lastSyncTime || config.lastSyncTime || 'Al iniciar la app'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-stone-500 font-medium">Servidores Nube:</span>
                  <span className="font-mono text-stone-700">Firestore / SQL + JSONBin</span>
                </div>
                {config.lastErrorMsg && syncState === 'error' && (
                  <div className="mt-1 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                    Detalle: {config.lastErrorMsg}
                  </div>
                )}
              </div>

              {/* Formulario de credenciales */}
              <form onSubmit={handleSaveConfig} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-emerald-700" />
                    Bin ID (Identificador de Caja en la Nube):
                  </label>
                  <input
                    type="text"
                    value={editBinId}
                    onChange={(e) => setEditBinId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    placeholder="ID BIN"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Master Key (Clave Maestra de Acceso):
                  </label>
                  <input
                    type="password"
                    value={editMasterKey}
                    onChange={(e) => setEditMasterKey(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    placeholder="Master Key"
                    required
                  />
                </div>

                {saveSuccessMsg && (
                  <div className="p-2 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-center font-bold text-[11px]">
                    {saveSuccessMsg}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await onForceSync();
                      setSaveSuccessMsg('Sincronización forzada completada.');
                      setTimeout(() => setSaveSuccessMsg(null), 2500);
                    }}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
                    Sincronizar Ahora
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
