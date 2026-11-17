import React, { useState } from 'react';
import { Parcela, MuestreoMadurez, RegistroCosechaLote } from '../types/campo';
import { 
  Apple, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Truck, 
  Scale, 
  Gauge, 
  Calendar, 
  Trash2,
  FileSpreadsheet,
  Award
} from 'lucide-react';

interface CosechaMadurezViewProps {
  parcelas: Parcela[];
  muestreos: MuestreoMadurez[];
  onAddMuestreo: (muestreo: MuestreoMadurez) => void;
  onDeleteMuestreo: (id: string) => void;
  cosechas: RegistroCosechaLote[];
  onAddCosecha: (cosecha: RegistroCosechaLote) => void;
  onDeleteCosecha: (id: string) => void;
  activeUserName?: string;
  canEdit?: boolean;
}

export const CosechaMadurezView: React.FC<CosechaMadurezViewProps> = ({
  parcelas,
  muestreos,
  onAddMuestreo,
  onDeleteMuestreo,
  cosechas,
  onAddCosecha,
  onDeleteCosecha,
  activeUserName,
  canEdit = true
}) => {
  const [activeTabSub, setActiveTabSub] = useState<'madurez' | 'cosecha_bins'>('madurez');
  const [isNewMuestreoOpen, setIsNewMuestreoOpen] = useState(false);
  const [isNewCosechaOpen, setIsNewCosechaOpen] = useState(false);

  // Formulario nuevo muestreo
  const [muestreoForm, setMuestreoForm] = useState({
    parcelaId: parcelas[0]?.id || '',
    gradosBrixPromedio: 6.2,
    solidoSolubleMin: 5.9,
    solidoSolubleMax: 6.5,
    firmezaPulpaLb: 15.5,
    porcentajeMateriaSeca: 16.0,
    numeroMuestras: 30,
    observaciones: 'Muestreo en 10 plantas al azar por cuartel con refractómetro calibrado'
  });

  // Formulario nueva cosecha
  const [cosechaForm, setCosechaForm] = useState({
    parcelaId: parcelas[0]?.id || '',
    cantidadBins: 40,
    cuadrilla: 'Cuadrilla Los Niches (18 cosecheros)',
    calibrePredominante: 'Calibre 30 (105-115g)',
    packingDestino: 'Frusan Curicó - Planta Teno',
    numeroGuiaDespacho: `GD-${Math.floor(10000 + Math.random() * 90000)}`,
    choferCamion: 'Héctor Salgado Ríos',
    patenteCamion: 'KJ-8912',
    observaciones: 'Fruta cosechada con guantes de hilo, sin daño mecánico'
  });

  const totalBinsCosechados = cosechas.reduce((acc, c) => acc + c.cantidadBins, 0);
  const totalKilosCosechados = cosechas.reduce((acc, c) => acc + c.pesoNetoKgEstimado, 0);

  const handleGuardarMuestreo = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parcelas.find((item) => item.id === muestreoForm.parcelaId);
    const brix = Number(muestreoForm.gradosBrixPromedio);
    const aptoSAG = brix >= 6.2;

    const nuevo: MuestreoMadurez = {
      id: `mm-${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
      parcelaId: muestreoForm.parcelaId,
      parcelaNombre: p ? p.nombre : 'Cuartel',
      gradosBrixPromedio: brix,
      solidoSolubleMin: Number(muestreoForm.solidoSolubleMin),
      solidoSolubleMax: Number(muestreoForm.solidoSolubleMax),
      firmezaPulpaLb: Number(muestreoForm.firmezaPulpaLb),
      porcentajeMateriaSeca: Number(muestreoForm.porcentajeMateriaSeca),
      numeroMuestras: Number(muestreoForm.numeroMuestras),
      aptoParaCosechaSAG: aptoSAG,
      muestreadoPor: activeUserName || 'Rodrigo Valenzuela (Ing. Agrónomo)',
      observaciones: muestreoForm.observaciones
    };

    onAddMuestreo(nuevo);
    setIsNewMuestreoOpen(false);
  };

  const handleGuardarCosecha = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parcelas.find((item) => item.id === cosechaForm.parcelaId);
    const bins = Number(cosechaForm.cantidadBins);
    const kilos = bins * 390; // ~390 kg por bin de kiwi

    const nuevo: RegistroCosechaLote = {
      id: `cos-${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
      parcelaId: cosechaForm.parcelaId,
      parcelaNombre: p ? p.nombre : 'Cuartel',
      cantidadBins: bins,
      pesoNetoKgEstimado: kilos,
      cuadrilla: cosechaForm.cuadrilla,
      calibrePredominante: cosechaForm.calibrePredominante,
      packingDestino: cosechaForm.packingDestino,
      numeroGuiaDespacho: cosechaForm.numeroGuiaDespacho,
      choferCamion: cosechaForm.choferCamion,
      patenteCamion: cosechaForm.patenteCamion,
      estado: 'despachado_packing',
      observaciones: cosechaForm.observaciones
    };

    onAddCosecha(nuevo);
    setIsNewCosechaOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Award className="w-3 h-3" />
            Resolución SAG & Estándar Comité de Kiwi de Chile
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Control de Cosecha & Madurez (°Brix)
          </h1>
          <p className="text-xs text-stone-500">
            Monitoreo oficial de sólidos solubles (mínimo 6.2° Brix), firmeza de pulpa con penetrómetro y despacho de bins a exportadoras.
          </p>
        </div>

        {/* Selector de Sub-pestaña */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold flex">
            <button
              onClick={() => setActiveTabSub('madurez')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTabSub === 'madurez' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              °Brix & Madurez SAG
            </button>
            <button
              onClick={() => setActiveTabSub('cosecha_bins')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTabSub === 'cosecha_bins' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Bins & Guías Despacho
            </button>
          </div>

          {canEdit && (activeTabSub === 'madurez' ? (
            <button
              onClick={() => setIsNewMuestreoOpen(true)}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Muestreo °Brix</span>
            </button>
          ) : (
            <button
              onClick={() => setIsNewCosechaOpen(true)}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Despacho Bins</span>
            </button>
          ))}
        </div>
      </div>

      {/* SUB-PESTAÑA 1: Madurez y Grados Brix */}
      {activeTabSub === 'madurez' && (
        <div className="space-y-5">
          {/* Tarjeta explicativa de la norma oficial SAG */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-stone-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm shrink-0">
                6.2°
              </div>
              <div>
                <div className="font-bold text-sm text-emerald-950">Umbral Mínimo Obligatorio de Cosecha: 6.2° Brix</div>
                <div className="text-[11px] text-emerald-800">
                  Ningún lote de Kiwi Hayward puede ser cosechado con menos de 6.2° Brix según la normativa SAG y del Comité del Kiwi. Firmeza objetivo: 14.0 a 16.5 lb (penetrómetro 8 mm).
                </div>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-800 text-white font-mono font-bold text-[11px] whitespace-nowrap">
              Temporada 2026 Vigente
            </div>
          </div>

          {/* Semáforo de Cuarteles según último muestreo */}
          {parcelas.length === 0 ? (
            <div className="p-8 bg-white border border-stone-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto text-xl">
                🥝
              </div>
              <h3 className="font-bold text-stone-800 text-sm">Tu huerto aún no tiene cuarteles creados</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Para comenzar con tu huerto real, ve a la pestaña <strong>Cuarteles & Mapa</strong> y presiona <strong>"+ Agregar Cuartel"</strong> con los datos reales de tu plantación.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {parcelas.map((p) => {
              const ultimoMuestreo = muestreos
                .filter((m) => m.parcelaId === p.id)
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

              const brix = ultimoMuestreo ? ultimoMuestreo.gradosBrixPromedio : 5.8;
              const apto = brix >= 6.2;

              return (
                <div 
                  key={p.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    apto 
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-2xs' 
                      : 'bg-amber-50/70 border-amber-300 text-amber-950 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs truncate">{p.nombre}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      apto ? 'bg-emerald-800 text-white' : 'bg-amber-700 text-white'
                    }`}>
                      {apto ? 'AUTORIZADO SAG' : 'EN MADURACIÓN'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-3xl font-black">{brix.toFixed(1)}°</span>
                    <span className="text-xs font-semibold opacity-70">Brix prom.</span>
                  </div>

                  <div className="space-y-1 text-[11px] opacity-80 pt-1 border-t border-current/10">
                    <div className="flex justify-between">
                      <span>Firmeza penetrómetro:</span>
                      <strong className="font-mono">{ultimoMuestreo?.firmezaPulpaLb || 15.5} lb</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Materia Seca (% MS):</span>
                      <strong className="font-mono">{ultimoMuestreo?.porcentajeMateriaSeca || 15.8}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Último muestreo:</span>
                      <span className="font-mono">{ultimoMuestreo?.fecha || 'Sin fecha'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* Historial de Muestreos */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-700" />
                Historial de Mediciones de Madurez y Refractómetro
              </h2>
              <span className="text-xs text-stone-400">{muestreos.length} muestreos oficiales</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Cuartel</th>
                    <th className="px-4 py-3">°Brix Prom.</th>
                    <th className="px-4 py-3">Rango Min-Max</th>
                    <th className="px-4 py-3">Firmeza (lb)</th>
                    <th className="px-4 py-3">% Mat. Seca</th>
                    <th className="px-4 py-3">Estado SAG</th>
                    <th className="px-4 py-3">Responsable</th>
                    {canEdit && <th className="px-4 py-3 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {muestreos.map((m) => (
                    <tr key={m.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium">{m.fecha}</td>
                      <td className="px-4 py-3 font-semibold text-stone-900">{m.parcelaNombre}</td>
                      <td className="px-4 py-3 font-bold text-sm text-emerald-900">{m.gradosBrixPromedio}°</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-stone-500">{m.solidoSolubleMin}° - {m.solidoSolubleMax}°</td>
                      <td className="px-4 py-3 font-mono">{m.firmezaPulpaLb} lb</td>
                      <td className="px-4 py-3 font-mono">{m.porcentajeMateriaSeca}%</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.aptoParaCosechaSAG ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {m.aptoParaCosechaSAG ? 'Apto SAG (≥6.2°)' : 'Bajo 6.2° Brix'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{m.muestreadoPor}</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onDeleteMuestreo(m.id)}
                            className="p-1 text-stone-400 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PESTAÑA 2: Cosecha y Despacho de Bins */}
      {activeTabSub === 'cosecha_bins' && (
        <div className="space-y-5">
          {/* Métricas de Cosecha */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Total Bins Cosechados</div>
              <div className="text-2xl font-black text-stone-900 mt-1">{totalBinsCosechados} bins</div>
              <div className="text-[11px] text-stone-500 mt-0.5">~390 kg de fruta limpia / bin</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Kilos Netos Estimados</div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{(totalKilosCosechados / 1000).toFixed(1)} ton</div>
              <div className="text-[11px] text-stone-500 mt-0.5">{totalKilosCosechados.toLocaleString('es-CL')} kg despachados</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Packing Principal</div>
              <div className="text-base font-bold text-stone-900 mt-1 truncate">Frusan Curicó</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Planta Teno (Ruta 5 Sur)</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Calibre Predominante</div>
              <div className="text-base font-bold text-stone-900 mt-1">Calibre 30 (105-115g)</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Calidad Exportación CAT 1</div>
            </div>
          </div>

          {/* Tabla de Guías de Despacho */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-700" />
                Control de Bins y Guías de Despacho a Packing
              </h2>
              <span className="text-xs text-stone-400">{cosechas.length} despachos registrados</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Guía Despacho</th>
                    <th className="px-4 py-3">Cuartel Origen</th>
                    <th className="px-4 py-3">Bins</th>
                    <th className="px-4 py-3">Peso Neto Kg</th>
                    <th className="px-4 py-3">Calibre</th>
                    <th className="px-4 py-3">Packing Destino</th>
                    <th className="px-4 py-3">Chofer / Patente</th>
                    {canEdit && <th className="px-4 py-3 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {cosechas.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium">{c.fecha}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-950">{c.numeroGuiaDespacho}</td>
                      <td className="px-4 py-3 font-semibold text-stone-900">{c.parcelaNombre}</td>
                      <td className="px-4 py-3 font-bold text-stone-900">{c.cantidadBins} bins</td>
                      <td className="px-4 py-3 font-mono">{c.pesoNetoKgEstimado.toLocaleString('es-CL')} kg</td>
                      <td className="px-4 py-3 text-stone-600">{c.calibrePredominante}</td>
                      <td className="px-4 py-3 font-medium text-stone-900">{c.packingDestino}</td>
                      <td className="px-4 py-3 text-stone-600 text-[11px]">
                        <div>{c.choferCamion}</div>
                        <div className="font-mono text-stone-400">{c.patenteCamion}</div>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => onDeleteCosecha(c.id)}
                            className="p-1 text-stone-400 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                            title="Eliminar despacho"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Muestreo °Brix */}
      {isNewMuestreoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Nuevo Muestreo de °Brix (Refractómetro)</h3>
              <button onClick={() => setIsNewMuestreoOpen(false)} className="text-emerald-200 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleGuardarMuestreo} className="p-5 space-y-3.5 text-xs">
              {parcelas.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  ⚠️ No tienes cuarteles registrados. Primero debes crear al menos un cuartel en la pestaña <strong>Cuarteles & Mapa</strong> para asociar este muestreo.
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cuartel Muestreado:</label>
                  <select
                    value={muestreoForm.parcelaId || (parcelas[0]?.id ?? '')}
                    onChange={(e) => setMuestreoForm({ ...muestreoForm, parcelaId: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    required
                  >
                    {parcelas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.superficieHa} ha)</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">°Brix Promedio:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={muestreoForm.gradosBrixPromedio}
                    onChange={(e) => setMuestreoForm({ ...muestreoForm, gradosBrixPromedio: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-emerald-900"
                    required
                  />
                  <span className="text-[10px] text-stone-400">SAG Mín: 6.2°</span>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Mínimo:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={muestreoForm.solidoSolubleMin}
                    onChange={(e) => setMuestreoForm({ ...muestreoForm, solidoSolubleMin: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Máximo:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={muestreoForm.solidoSolubleMax}
                    onChange={(e) => setMuestreoForm({ ...muestreoForm, solidoSolubleMax: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Firmeza Penetrómetro (lb):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={muestreoForm.firmezaPulpaLb}
                    onChange={(e) => setMuestreoForm({ ...muestreoForm, firmezaPulpaLb: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="14 - 16 lb"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Materia Seca (% MS):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={muestreoForm.porcentajeMateriaSeca}
                    onChange={(e) => setMuestreoForm({ ...muestreoForm, porcentajeMateriaSeca: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="> 15.5%"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones / Calibración Refractómetro:</label>
                <textarea
                  value={muestreoForm.observaciones}
                  onChange={(e) => setMuestreoForm({ ...muestreoForm, observaciones: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsNewMuestreoOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Guardar Muestreo Oficial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Despacho Bins */}
      {isNewCosechaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Despacho de Bins de Cosecha</h3>
              <button onClick={() => setIsNewCosechaOpen(false)} className="text-emerald-200 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleGuardarCosecha} className="p-5 space-y-3.5 text-xs">
              {parcelas.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  ⚠️ No tienes cuarteles registrados. Crea primero tus cuarteles en <strong>Cuarteles & Mapa</strong>.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Cuartel Origen:</label>
                    <select
                      value={cosechaForm.parcelaId || (parcelas[0]?.id ?? '')}
                      onChange={(e) => setCosechaForm({ ...cosechaForm, parcelaId: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                      required
                    >
                      {parcelas.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Cantidad de Bins:</label>
                    <input
                      type="number"
                      value={cosechaForm.cantidadBins}
                      onChange={(e) => setCosechaForm({ ...cosechaForm, cantidadBins: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-emerald-900"
                      required
                    />
                    <span className="text-[10px] text-stone-400">Total: {(cosechaForm.cantidadBins * 390).toLocaleString('es-CL')} kg netos</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° Guía de Despacho:</label>
                  <input
                    type="text"
                    value={cosechaForm.numeroGuiaDespacho}
                    onChange={(e) => setCosechaForm({ ...cosechaForm, numeroGuiaDespacho: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Packing / Exportadora:</label>
                  <input
                    type="text"
                    value={cosechaForm.packingDestino}
                    onChange={(e) => setCosechaForm({ ...cosechaForm, packingDestino: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Chofer del Camión:</label>
                  <input
                    type="text"
                    value={cosechaForm.choferCamion}
                    onChange={(e) => setCosechaForm({ ...cosechaForm, choferCamion: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Patente Camión:</label>
                  <input
                    type="text"
                    value={cosechaForm.patenteCamion}
                    onChange={(e) => setCosechaForm({ ...cosechaForm, patenteCamion: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Calibre Predominante / Cuadrilla:</label>
                <input
                  type="text"
                  value={cosechaForm.calibrePredominante}
                  onChange={(e) => setCosechaForm({ ...cosechaForm, calibrePredominante: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsNewCosechaOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Registrar Despacho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
