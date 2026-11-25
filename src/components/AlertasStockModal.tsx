import React, { useState } from 'react';
import { InsumoInventario } from '../types/campo';
import {
  X,
  AlertTriangle,
  Plus,
  Package,
  CheckCircle2,
  Trash2,
  BellOff,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  isInsumoStockBajoActivo,
  isInsumoStockBajoOculto,
} from '../utils/alertasHuerto';

interface AlertasStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventario: InsumoInventario[];
  onUpdateInsumo: (insumo: InsumoInventario) => void;
  onDismissAlert?: (insumoId: string) => void;
  onDismissAllAlerts?: (insumoIds: string[]) => void;
  onRestoreAlert?: (insumoId: string) => void;
  onRestoreAllAlerts?: () => void;
  onNavigateToInventario: () => void;
  onDeleteInsumo?: (id: string) => void;
  onClearInventario?: () => void;
  canEdit?: boolean;
  canEditItem?: (item: InsumoInventario) => boolean;
  isAdmin?: boolean;
}

export const AlertasStockModal: React.FC<AlertasStockModalProps> = ({
  isOpen,
  onClose,
  inventario,
  onUpdateInsumo,
  onDismissAlert,
  onDismissAllAlerts,
  onRestoreAlert,
  onRestoreAllAlerts,
  onNavigateToInventario,
  onDeleteInsumo,
  onClearInventario,
  canEdit = true,
  canEditItem,
  isAdmin = true,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  if (!isOpen) return null;

  const canModifyItem = (item: InsumoInventario) =>
    canEditItem ? canEditItem(item) : canEdit;

  const lowStockItems = inventario.filter(isInsumoStockBajoActivo);
  const dismissedItems = inventario.filter(isInsumoStockBajoOculto);
  const editableLowStockIds = lowStockItems.filter(canModifyItem).map((i) => i.id);
  const hasAnyEditableDismissed = dismissedItems.some(canModifyItem);

  const handleQuickAdd = (item: InsumoInventario, amount: number) => {
    if (!canModifyItem(item)) return;
    const nuevoStock = Number(((item.stockActual || 0) + amount).toFixed(2));
    onUpdateInsumo({
      ...item,
      stockActual: nuevoStock,
      alertaStockOculta: nuevoStock > (item.stockMinimo || 0) ? false : item.alertaStockOculta,
    });
  };

  const getItemSubtitle = (item: InsumoInventario): string => {
    const isMaterial =
      item.categoriaBodega === 'material_riego' ||
      (item.categoria && item.categoria !== 'fitosanitario' && item.categoria !== 'fertilizante');
    if (isMaterial) {
      return item.especificacionTecnica || item.fabricante || 'Materiales, Riego & Herramientas';
    }
    const base = item.ingredienteActivo || item.composicionFertilizante || item.fabricante || 'Fitosanitario';
    return item.numeroRegistroSAG ? `${base} (${item.numeroRegistroSAG})` : base;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-lg border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950 to-stone-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-700/80 border border-rose-500/50 flex items-center justify-center font-bold text-white text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h2 className="font-bold text-base">Alertas de Stock en Bodega</h2>
              <p className="text-xs text-rose-200">
                {inventario.length === 0
                  ? 'Sin productos registrados en bodega (0 alertas)'
                  : `${lowStockItems.length} ${lowStockItems.length === 1 ? 'notificación activa' : 'notificaciones activas'} de stock bajo${
                      dismissedItems.length > 0 ? ` · ${dismissedItems.length} eliminadas` : ''
                    }`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
          {inventario.length === 0 ? (
            <div className="p-8 text-center text-stone-500 dark:text-stone-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="font-bold text-sm text-stone-800 dark:text-stone-100">Bodega sin productos</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                No tienes productos registrados en bodega actualmente, por lo que no existen alertas de faltantes.
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToInventario();
                    onClose();
                  }}
                  className="mt-3 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ingresar mis propios productos
                </button>
              )}
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="p-6 text-center text-stone-500 dark:text-stone-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="font-bold text-sm text-stone-800 dark:text-stone-100">
                {dismissedItems.length > 0
                  ? 'Sin notificaciones activas de stock bajo'
                  : '¡Inventario en Niveles Óptimos!'}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {dismissedItems.length > 0
                  ? `Eliminaste ${dismissedItems.length} ${dismissedItems.length === 1 ? 'notificación de stock bajo' : 'notificaciones de stock bajo'}. Los productos siguen guardados en bodega.`
                  : 'Todos los productos de tu bodega cuentan con existencias por sobre el stock mínimo de seguridad.'}
              </p>
            </div>
          ) : (
            <>
              {editableLowStockIds.length > 1 && onDismissAllAlerts && (
                <div className="flex items-center justify-between px-1 pb-1">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Puedes eliminar avisos individuales sin borrar el producto.
                  </span>
                  <button
                    type="button"
                    onClick={() => onDismissAllAlerts(editableLowStockIds)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <BellOff className="w-3 h-3" />
                    <span>Eliminar todas ({editableLowStockIds.length})</span>
                  </button>
                </div>
              )}

              {lowStockItems.map((item) => {
                const itemEditable = canModifyItem(item);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">{item.nombreComercial}</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{getItemSubtitle(item)}</div>
                      <div className="text-[11px] text-rose-900 dark:text-rose-200 font-bold font-mono tabular-nums">
                        Stock actual: {item.stockActual} {item.unidad} ·{' '}
                        <span className="font-normal text-stone-500 dark:text-stone-400">
                          Mínimo: {item.stockMinimo} {item.unidad}
                        </span>
                      </div>
                    </div>

                    {itemEditable && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(item, item.stockMinimo || 10)}
                          className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                          title={`Reponer +${item.stockMinimo || 10} ${item.unidad}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            {item.stockMinimo || 10} {item.unidad}
                          </span>
                        </button>

                        {onDismissAlert && (
                          <button
                            type="button"
                            onClick={() => onDismissAlert(item.id)}
                            className="px-2 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-300 dark:border-stone-700 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Eliminar esta notificación de stock bajo (mantiene el producto en bodega)"
                          >
                            <BellOff className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>
                        )}

                        {onDeleteInsumo &&
                          (confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteInsumo(item.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                              >
                                Sí
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold rounded-lg text-[10px] cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="p-1.5 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors cursor-pointer"
                              title="Quitar producto de bodega permanentemente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Sección de notificaciones de stock bajo eliminadas (restaurables) */}
          {dismissedItems.length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowDismissed((prev) => !prev)}
                  className="text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <BellOff className="w-3.5 h-3.5 text-stone-400" />
                  <span>Notificaciones eliminadas ({dismissedItems.length})</span>
                  {showDismissed ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {hasAnyEditableDismissed && onRestoreAllAlerts && (
                  <button
                    type="button"
                    onClick={onRestoreAllAlerts}
                    className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar todas</span>
                  </button>
                )}
              </div>

              {showDismissed && (
                <div className="space-y-1.5">
                  {dismissedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-stone-700 dark:text-stone-200 truncate">
                          {item.nombreComercial}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                          Stock: {item.stockActual} {item.unidad} (mínimo {item.stockMinimo} {item.unidad})
                        </div>
                      </div>
                      {canModifyItem(item) && onRestoreAlert && (
                        <button
                          type="button"
                          onClick={() => onRestoreAlert(item.id)}
                          className="px-2.5 py-1 bg-white dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-stone-300 dark:border-stone-700 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                          title="Volver a activar esta notificación de stock bajo"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reactivar</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/90 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onNavigateToInventario();
                onClose();
              }}
              className="text-emerald-800 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              Ir a la Bodega Completa →
            </button>

            {isAdmin && onClearInventario && inventario.length > 0 &&
              (confirmClearAll ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClearInventario();
                      setConfirmClearAll(false);
                    }}
                    className="px-2 py-1 bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                  >
                    Confirmar vaciar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-1 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded text-[10px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="text-stone-500 dark:text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 text-[11px] underline cursor-pointer"
                >
                  Vaciar bodega
                </button>
              ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 dark:bg-stone-700 hover:bg-stone-900 dark:hover:bg-stone-600 text-white font-bold rounded-xl text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
