import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition-colors cursor-pointer"
        title="Instalar en celular o PC para trabajar sin señal en terreno"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 transition-colors cursor-pointer"
          title="Instalar en iPhone o iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Instalar iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 text-stone-900">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  Instalar App en iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-xs text-stone-600 space-y-2 list-decimal pl-4">
                <li>
                  Toca el botón <strong>Compartir</strong> en la barra de Safari.
                </li>
                <li>
                  Desliza hacia abajo y selecciona <strong>Agregar a inicio</strong>.
                </li>
                <li>
                  La aplicación quedará disponible como app independiente incluso en sectores del huerto sin señal.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-emerald-800 hover:bg-emerald-700 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
