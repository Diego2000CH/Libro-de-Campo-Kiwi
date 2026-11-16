import React, { useState } from 'react';
import { RegistroLabor, Parcela, TipoLabor } from '../types/campo';
import { 
  Sprout, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Droplet, 
  FileText, 
  Calendar,
  AlertTriangle,
  Download
} from 'lucide-react';

interface LaboresViewProps {
  labores: RegistroLabor[];
  parcelas: Parcela[];
  onOpenNewLabor: () => void;
  onEditLabor: (labor: RegistroLabor) => void;
  onDeleteLabor: (id: string) => void;
}

export const LaboresView: React.FC<LaboresViewProps> = ({
  labores,
  parcelas,
  onOpenNewLabor,
  onEditLabor,
  onDeleteLabor
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState<string>('todos');
  const [selectedParcelaId, setSelectedParcelaId] = useState<string>('todas');
  const [laborToDelete, setLaborToDelete] = useState<RegistroLabor | null>(null);

  const laboresFiltradas = labores.filter((l) => {
    const matchesTipo = selectedTipo === 'todos' || l.tipoLabor === selectedTipo;
    const matchesParcela = selectedParcelaId === 'todas' || l.parcelaId === selectedParcelaId;
    const textSearch = `${l.parcelaNombre} ${l.nombreInsumo || ''} ${l.descripcion} ${l.registradoPor} ${l.objetivoPlagaEnfermedad || ''}`.toLowerCase();
    const matchesSearch = textSearch.includes(searchTerm.toLowerCase());
    return matchesTipo && matchesParcela && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Sprout className="w-3 h-3" />
            Cuaderno Oficial SAG Chile
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Registro Histórico de Labores de Campo
          </h1>
          <p className="text-xs text-stone-500">
            Fitosanitarios, fertirriego, podas, monitoreo y cosechas con trazabilidad para fiscalización SAG y GlobalGAP.
          </p>
        </div>

        <button
          onClick={onOpenNewLabor}
          className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Labor</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por insumo, cuartel, aplicador o plaga..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[11px] font-bold text-stone-500">Tipo:</span>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
            >
              <option value="todos">Todos los tipos ({labores.length})</option>
              <option value="fitosanitario">Fitosanitarios</option>
              <option value="riego">Riegos de Pozo</option>
              <option value="fertilizacion">Fertilizaciones</option>
              <option value="poda">Poda & Manejo Canopia</option>
              <option value="monitoreo">Monitoreos de Campo</option>
              <option value="cosecha">Cosechas</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-stone-500">Cuartel:</span>
            <select
              value={selectedParcelaId}
              onChange={(e) => setSelectedParcelaId(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
            >
              <option value="todas">Todos los cuarteles</option>
              {parcelas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="space-y-3">
        {laboresFiltradas.length === 0 ? (
          <div className="p-10 bg-white rounded-2xl border border-stone-200 text-center text-stone-500 text-xs space-y-3">
            <Sprout className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="font-bold text-stone-700">
              {labores.length === 0
                ? 'Aún no hay labores registradas en tu Cuaderno de Campo.'
                : 'No se encontraron labores que coincidan con los filtros aplicados.'}
            </p>
            <button
              type="button"
              onClick={onOpenNewLabor}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Registrar Primera Labor
            </button>
          </div>
        ) : (
          laboresFiltradas.map((labor) => {
            const isFito = labor.tipoLabor === 'fitosanitario';
            const isRiego = labor.tipoLabor === 'riego';

            return (
              <div
                key={labor.id}
                className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs hover:border-emerald-300 transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-xs text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                      {labor.fecha} {labor.hora && <span className="text-stone-400">· {labor.hora}</span>}
                    </span>
                    <span className="font-bold text-sm text-stone-900">{labor.parcelaNombre}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isFito 
                        ? 'bg-purple-100 text-purple-900' 
                        : isRiego 
                        ? 'bg-blue-100 text-blue-900' 
                        : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {labor.tipoLabor}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-center">
                    <button
                      onClick={() => onEditLabor(labor)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Editar registro"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => setLaborToDelete(labor)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-stone-700 leading-relaxed">
                  {labor.descripcion}
                </p>

                {/* Detalles técnicos específicos */}
                {isFito && labor.nombreInsumo && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">Insumo Utilizado</span>
                      <strong className="text-emerald-950 font-semibold">{labor.nombreInsumo}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">Dosis / Ha</span>
                      <span className="font-mono">{labor.dosisPorHa} {labor.unidadMedida}/ha</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">Total Insumo</span>
                      <span className="font-bold text-emerald-900 font-mono">{labor.totalInsumoUtilizado} {labor.unidadMedida}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">Carencia SAG</span>
                      <span className="font-bold text-amber-800">{labor.periodoCarenciaDias || 0} días LMR</span>
                    </div>
                  </div>
                )}

                {isRiego && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] p-2.5 bg-blue-50/60 rounded-xl border border-blue-200">
                    <div>
                      <span className="text-blue-500 block text-[10px] uppercase font-bold">Volumen Extraído</span>
                      <strong className="text-blue-950 font-mono font-bold">{labor.volumenM3} m³ ({(labor.litrosAgua || (labor.volumenM3 || 0) * 1000).toLocaleString('es-CL')} L)</strong>
                    </div>
                    <div>
                      <span className="text-blue-500 block text-[10px] uppercase font-bold">Duración Bombeo</span>
                      <span className="font-mono text-blue-900 font-medium">{labor.duracionRiegoHoras} horas</span>
                    </div>
                    <div>
                      <span className="text-blue-500 block text-[10px] uppercase font-bold">Sector</span>
                      <span className="text-blue-900 font-medium">{labor.sectorRiego || labor.parcelaNombre}</span>
                    </div>
                  </div>
                )}

                {/* Footer del registro */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400 pt-1 border-t border-stone-100">
                  <div className="flex items-center gap-3">
                    <span>Responsable: <strong className="text-stone-600">{labor.registradoPor}</strong></span>
                    {labor.numeroCarnetSAG && (
                      <span className="text-emerald-700 font-mono font-semibold">Carnet: {labor.numeroCarnetSAG}</span>
                    )}
                  </div>
                  {labor.condicionesClimaticas && (
                    <div className="text-stone-500">
                      Clima: {labor.condicionesClimaticas.temperaturaC}°C · {labor.condicionesClimaticas.velocidadVientoKmH} km/h viento
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Confirmación Eliminación Labor */}
      {laborToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Eliminar Registro de Labor</h3>
              <button onClick={() => setLaborToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-stone-700">
                ¿Estás seguro de que deseas eliminar esta labor de <strong>{laborToDelete.tipoLabor}</strong> registrada el <strong>{laborToDelete.fecha}</strong> en <strong>{laborToDelete.parcelaNombre}</strong>?
              </p>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-600 text-[11px]">
                {laborToDelete.descripcion}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setLaborToDelete(null)}
                  className="px-3.5 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteLabor(laborToDelete.id);
                    setLaborToDelete(null);
                  }}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
