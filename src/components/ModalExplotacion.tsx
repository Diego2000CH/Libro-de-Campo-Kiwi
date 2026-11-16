import React, { useState } from 'react';
import { ExplotacionAgricola } from '../types/campo';
import { X, Save, Home, ShieldCheck } from 'lucide-react';

interface ModalExplotacionProps {
  isOpen: boolean;
  onClose: () => void;
  explotacion: ExplotacionAgricola;
  onSave: (explotacion: ExplotacionAgricola) => void;
}

export const ModalExplotacion: React.FC<ModalExplotacionProps> = ({
  isOpen,
  onClose,
  explotacion,
  onSave
}) => {
  const [formData, setFormData] = useState<ExplotacionAgricola>({ ...explotacion });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-emerald-300" />
            <h2 className="font-bold text-sm">Ficha Legal & Agronómica de la Explotación</h2>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto text-xs flex-1">
          <div>
            <label className="block font-bold text-stone-700 mb-1">Nombre del Fundo / Explotación:</label>
            <input
              type="text"
              value={formData.nombreFundo}
              onChange={(e) => setFormData({ ...formData, nombreFundo: e.target.value })}
              className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-stone-700 mb-1">RUT Explotación:</label>
              <input
                type="text"
                value={formData.rut}
                onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Comuna / Región:</label>
              <input
                type="text"
                value={formData.comuna}
                onChange={(e) => setFormData({ ...formData, comuna: e.target.value })}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Dirección / Camino:</label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              className="w-full p-2 bg-white border border-stone-300 rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Representante Legal:</label>
              <input
                type="text"
                value={formData.representanteLegal}
                onChange={(e) => setFormData({ ...formData, representanteLegal: e.target.value })}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">RUT Representante:</label>
              <input
                type="text"
                value={formData.rutRepresentante}
                onChange={(e) => setFormData({ ...formData, rutRepresentante: e.target.value })}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Ingeniero Agrónomo Asesor:</label>
              <input
                type="text"
                value={formData.asesorAgronomo}
                onChange={(e) => setFormData({ ...formData, asesorAgronomo: e.target.value })}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Registro Colegio de Agrónomos:</label>
              <input
                type="text"
                value={formData.registroColegioAgronomos || ''}
                onChange={(e) => setFormData({ ...formData, registroColegioAgronomos: e.target.value })}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                placeholder="COL-AGR-4912"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Superficie Total (ha):</label>
              <input
                type="number"
                step="0.1"
                value={formData.superficieTotalHa}
                onChange={(e) => setFormData({ ...formData, superficieTotalHa: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Superficie en Kiwis (ha):</label>
              <input
                type="number"
                step="0.1"
                value={formData.superficieKiwisHa}
                onChange={(e) => setFormData({ ...formData, superficieKiwisHa: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-emerald-900"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 font-bold hover:bg-stone-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Ficha del Fundo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
