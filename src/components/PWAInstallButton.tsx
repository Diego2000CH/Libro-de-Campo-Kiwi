import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Share,
  Smartphone,
  SquarePlus,
  WifiOff,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card' | 'menu';
  onAction?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  onAction,
}) => {
  const { isInstallable, isInstalled, isIOS, iosBrowser, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleOpenGuide = () => {
    setShowGuideModal(true);
    onAction?.();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      setCopiedUrl(false);
    }
  };

  const renderTrigger = () => {
    if (isInstallable) {
      if (variant === 'menu') {
        return (
          <button
            type="button"
            onClick={() => {
              onAction?.();
              void install();
            }}
            className="w-full text-left flex items-center gap-2 text-emerald-900 font-bold text-[11px] hover:bg-emerald-50 p-2 rounded-lg cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Instalar App en Celular / PC</span>
          </button>
        );
      }
      if (variant === 'card') {
        return (
          <button
            type="button"
            onClick={() => void install()}
            className="w-full py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-emerald-400/30 text-emerald-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Descargar / Instalar App en Celular</span>
          </button>
        );
      }
      return (
        <button
          type="button"
          onClick={() => void install()}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          title="Instalar app en celular o PC para trabajar sin señal en terreno"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Instalar App</span>
        </button>
      );
    }

    if (variant === 'menu') {
      return (
        <button
          type="button"
          onClick={handleOpenGuide}
          className="w-full text-left flex items-center gap-2 text-stone-800 font-semibold text-[11px] hover:bg-emerald-50 hover:text-emerald-900 p-2 rounded-lg cursor-pointer transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
          <span>{isIOS ? 'Descargar en iPhone (iOS)' : 'Instalar en iPhone / Celular'}</span>
        </button>
      );
    }

    if (variant === 'card') {
      return (
        <button
          type="button"
          onClick={handleOpenGuide}
          className="w-full py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-emerald-400/30 text-emerald-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Smartphone className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>
            {isIOS ? 'Descargar App en este iPhone (iOS)' : 'Cómo descargar en los últimos iPhone'}
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleOpenGuide}
        className="flex items-center gap-1 rounded-lg bg-white/12 hover:bg-white/20 border border-emerald-400/25 px-2 sm:px-2.5 py-1 text-[11px] font-bold text-emerald-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        title="Descargar e instalar en iPhone (iOS 17 / 18 / 26)"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
        <span>{isIOS ? 'Instalar iPhone' : 'App iPhone'}</span>
      </button>
    );
  };

  return (
    <>
      {renderTrigger()}

      {showGuideModal && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4 text-stone-900">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 pb-safe shadow-2xl border border-stone-200 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-900 text-white flex items-center justify-center text-lg shadow-xs shrink-0">
                  🥝
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900 leading-tight">
                    Descargar en iPhone (iOS 17 / 18 / 26)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Compatible con iPhone 14, 15, 16, 16e, 17 y pantalla Dynamic Island
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS && iosBrowser === 'in_app' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Estás dentro de WhatsApp, Correo o una app interna</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Toca primero el botón de brújula o menú <strong>Abrir en Safari</strong> (abajo o arriba a la derecha) para poder instalar la app en tu pantalla de inicio.
                </p>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Share className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>En Safari (iPhone 15 / 16 / 17 — iOS 17, 18 y 26):</span>
                </div>
                <ol className="text-stone-700 space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>
                    Toca el ícono <strong>Compartir</strong> (cuadrado con flecha hacia arriba) en la barra inferior de Safari.
                    <span className="block text-[11px] text-stone-500">
                      Si usas barra compacta en iOS 26, toca primero <strong>•••</strong> y luego <strong>Compartir</strong>.
                    </span>
                  </li>
                  <li>
                    Desliza hacia abajo y toca <strong className="inline-flex items-center gap-1">Agregar a inicio <SquarePlus className="w-3 h-3 inline text-emerald-700" /></strong>.
                  </li>
                  <li>
                    Verifica que esté activada la opción <strong>Abrir como app web</strong> y pulsa <strong>Agregar</strong> arriba a la derecha.
                  </li>
                </ol>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                <div className="font-bold text-stone-900">
                  En Chrome, Edge o Brave (iPhone con iOS 16.4+):
                </div>
                <p className="text-stone-600 leading-relaxed">
                  Toca el botón <strong>Compartir</strong> arriba a la derecha (junto a la barra de dirección), desliza y elige <strong>Agregar a la pantalla de inicio</strong> → <strong>Agregar</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-2">
                <WifiOff className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Al abrirla desde el ícono <strong>Huerto Kiwi</strong> en tu iPhone, funcionará a pantalla completa respetando Dynamic Island, sin barra del navegador, con guardado offline en terreno y alertas Push activas.
                </p>
              </div>
            </div>

            {!isIOS && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => void handleCopyUrl()}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Enlace copiado para abrir en iPhone</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-600" />
                      <span>Copiar enlace para enviar a tu iPhone</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full rounded-xl bg-emerald-800 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
