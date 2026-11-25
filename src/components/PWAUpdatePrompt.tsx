import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw, Sparkles, WifiOff, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const MIN_AUTO_CHECK_INTERVAL_MS = 20_000;
const PERIODIC_CHECK_INTERVAL_MS = 5 * 60_000;

export const PWAUpdatePrompt: React.FC = () => {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const swUrlRef = useRef<string>('/sw.js');
  const lastCheckAtRef = useRef<number>(0);

  const [dismissed, setDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [manualStatus, setManualStatus] = useState<
    null | { kind: 'checking' | 'uptodate' | 'offline'; text: string }
  >(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      registrationRef.current = registration;
      swUrlRef.current = swUrl || '/sw.js';
    },
    onRegisterError(error) {
      console.warn('Error registrando Service Worker PWA:', error);
    },
  });

  // Si llega una nueva versión mientras el usuario había ocultado un aviso previo, volver a mostrar
  useEffect(() => {
    if (needRefresh) {
      setDismissed(false);
      setManualStatus(null);
    }
  }, [needRefresh]);

  const checkForUpdate = useCallback(
    async (manual = false) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (manual) {
          setManualStatus({
            kind: 'offline',
            text: 'Sin señal para buscar actualizaciones ahora.',
          });
        }
        return;
      }

      const now = Date.now();
      if (!manual && now - lastCheckAtRef.current < MIN_AUTO_CHECK_INTERVAL_MS) {
        return;
      }
      lastCheckAtRef.current = now;

      let reg = registrationRef.current;
      if (!reg && 'serviceWorker' in navigator) {
        try {
          reg = (await navigator.serviceWorker.getRegistration()) || null;
          if (reg) registrationRef.current = reg;
        } catch {
          reg = null;
        }
      }

      if (!reg) {
        if (manual) {
          setManualStatus({
            kind: 'uptodate',
            text: 'Recargando la última versión disponible...',
          });
          setTimeout(() => window.location.reload(), 400);
        }
        return;
      }

      if (reg.waiting) {
        setDismissed(false);
        setNeedRefresh(true);
        setManualStatus(null);
        return;
      }

      if (reg.installing) {
        if (manual) {
          setManualStatus({
            kind: 'checking',
            text: 'Descargando nueva versión en segundo plano...',
          });
        }
        return;
      }

      if (manual) {
        setManualStatus({
          kind: 'checking',
          text: 'Buscando cambios nuevos en el servidor...',
        });
      }

      try {
        // Evitar caché HTTP del archivo sw.js al volver desde PWA en iOS/Android
        const resp = await fetch(swUrlRef.current, {
          cache: 'no-store',
          headers: {
            cache: 'no-store',
            'cache-control': 'no-cache',
          },
        });

        if (resp?.status === 200) {
          await reg.update();
        }

        // Dar un instante para que se detecte un Service Worker en instalación/espera
        await new Promise((r) => setTimeout(r, 700));

        if (reg.waiting) {
          setDismissed(false);
          setNeedRefresh(true);
          setManualStatus(null);
        } else if (reg.installing) {
          if (manual) {
            setManualStatus({
              kind: 'checking',
              text: 'Nueva actualización detectada, preparando...',
            });
          }
        } else if (manual) {
          setManualStatus({
            kind: 'uptodate',
            text: 'Ya tienes la última versión instalada.',
          });
        }
      } catch {
        if (manual) {
          setManualStatus({
            kind: 'offline',
            text: 'No se pudo comprobar en este momento.',
          });
        }
      }
    },
    [setNeedRefresh]
  );

  // Limpiar toast informativo manual después de unos segundos
  useEffect(() => {
    if (!manualStatus) return;
    const delay = manualStatus.kind === 'checking' ? 12000 : 3500;
    const t = setTimeout(() => setManualStatus(null), delay);
    return () => clearTimeout(t);
  }, [manualStatus]);

  // Revisar automáticamente al abrir la app, al volver desde suspensión en el celular (iOS/Android), al recuperar señal y cada 5 min
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void checkForUpdate(false);
    }, 1500);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdate(false);
      }
    };
    const handleFocus = () => {
      void checkForUpdate(false);
    };
    const handlePageShow = () => {
      void checkForUpdate(false);
    };
    const handleOnline = () => {
      void checkForUpdate(false);
    };
    const handleManualCheck = () => {
      void checkForUpdate(true);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);
    window.addEventListener('pwa-check-update', handleManualCheck);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkForUpdate(false);
      }
    }, PERIODIC_CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pwa-check-update', handleManualCheck);
    };
  }, [checkForUpdate]);

  const handleApplyUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);

    // Fallback de seguridad por si iOS Safari standalone retrasa controllerchange tras skipWaiting
    const fallbackReload = setTimeout(() => {
      window.location.reload();
    }, 2500);

    try {
      await updateServiceWorker(true);
    } catch {
      clearTimeout(fallbackReload);
      window.location.reload();
    }
  };

  if (needRefresh && !dismissed) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="no-print fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[80] w-[calc(100%-1.5rem)] max-w-md rounded-2xl bg-white dark:bg-stone-900 border-2 border-emerald-500/80 dark:border-emerald-500/60 shadow-2xl p-3.5 sm:p-4 text-stone-900 dark:text-stone-100 animate-in fade-in slide-in-from-top-3"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-300">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 leading-tight">
                Nueva actualización disponible
              </h4>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="p-1 -mr-1 -mt-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer shrink-0"
                aria-label="Cerrar aviso de actualización"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5 leading-snug">
              Se agregaron mejoras recientes al cuaderno de campo. Actualiza para cargar la última versión.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => void handleApplyUpdate()}
                disabled={isUpdating}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-70 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? 'Actualizando...' : 'Actualizar ahora'}</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                disabled={isUpdating}
                className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Más tarde
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (manualStatus) {
    return (
      <div
        role="status"
        className="no-print fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[80] w-[calc(100%-1.5rem)] max-w-sm rounded-xl bg-stone-900 dark:bg-stone-800 border border-stone-700 text-white shadow-xl px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2"
      >
        {manualStatus.kind === 'checking' && (
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
        )}
        {manualStatus.kind === 'uptodate' && (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        )}
        {manualStatus.kind === 'offline' && (
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        )}
        <span className="truncate">{manualStatus.text}</span>
      </div>
    );
  }

  return null;
};
