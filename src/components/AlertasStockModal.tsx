import React, { useState } from 'react';
import { InsumoInventario } from '../types/campo';
import { X, AlertTriangle, Plus, Package, CheckCircle2, Trash2 } from 'lucide-react';

interface AlertasStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventario: InsumoInventario[];
  onUpdateInsumo: (insumo: InsumoInventario) => void;
  onNavigateToInventario: () => void;
  onDeleteInsumo?: (id: string) => void;
  onClearInventario?: () => void;
  canEdit?: boolean;
  isAdmin?: boolean;
}

export const AlertasStockModal: React.FC<AlertasStockModalProps> = ({
  isOpen,
  onClose,
  inventario,
  onUpdateInsumo,
  onNavigateToInventario,
  onDeleteInsumo,
  onClearInventario,
  canEdit = true,
  isAdmin = true
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  if (!isOpen) return null;

  const lowStockItems = inventario.filter((i) => (i.stockMinimo || 0) > 0 && (i.stockActual || 0) <= (i.stockMinimo || 0));

  const handleQuickAdd = (item: InsumoInventario, amount: number) => {
    if (!canEdit) return;
    onUpdateInsumo({
      ...item,
      stockActual: Number(((item.stockActual || 0) + amount).toFixed(2))
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-stone-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950 to-stone-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-700/80 border border-rose-500/50 flex items-center justify-center font-bold text-white text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h2 className="font-bold text-base">Alertas de Stock en Bodega</h2>
              <p className="text-xs text-rose-200">
                {inventario.length === 0 ? 'Sin productos registrados en bodega (0 alertas)' : `${lowStockItems.length} insumos bajo el umbral mínimo`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
          {inventario.length === 0 ? (
            <div className="p-8 text-center text-stone-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm text-stone-800">Bodega sin productos</p>
              <p className="text-xs text-stone-500">
                No tienes productos registrados en bodega actualmente, por lo que no existen alertas de faltantes.
              </p>
              {canEdit && (
                <button
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
            <div className="p-8 text-center text-stone-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm text-stone-800">¡Inventario en Niveles Óptimos!</p>
              <p className="text-xs text-stone-500">
                Todos los productos de tu bodega cuentan con existencias por sobre el stock mínimo de seguridad.
              </p>
            </div>
          ) : (
            lowStockItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-bold text-sm text-stone-900 truncate">{item.nombreComercial}</div>
                  <div className="text-[11px] text-stone-500 truncate">{item.ingredienteActivo} ({item.numeroRegistroSAG || 'Sin SAG'})</div>
                  <div className="text-[11px] text-rose-900 font-bold">
                    Stock actual: {item.stockActual} {item.unidad} · <span className="font-normal text-stone-500">Mínimo: {item.stockMinimo} {item.unidad}</span>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleQuickAdd(item, item.stockMinimo || 10)}
                      className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                      title={`Reponer +${item.stockMinimo || 10} ${item.unidad}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      +{item.stockMinimo || 10} {item.unidad}
                    </button>

                    {onDeleteInsumo && (
                      confirmDeleteId === item.id ? (
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
                            className="px-2 py-1 bg-stone-200 text-stone-700 font-bold rounded-lg text-[10px] cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                          title="Quitar producto de bodega"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onNavigateToInventario();
                onClose();
              }}
              className="text-emerald-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              Ir a la Bodega Completa →
            </button>

            {isAdmin && onClearInventario && inventario.length > 0 && (
              confirmClearAll ? (
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
                    className="px-2 py-1 bg-stone-200 text-stone-700 rounded text-[10px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearAll(true)}
                  className="text-stone-500 hover:text-rose-700 text-[11px] underline cursor-pointer"
                >
                  Vaciar bodega
                </button>
              )
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
