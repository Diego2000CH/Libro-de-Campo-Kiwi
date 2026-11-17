import React, { useState, useMemo } from 'react';
import {
  Parcela,
  EvaluacionCuajaSemillas
} from '../types/campo';
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Filter,
  List,
  Layers,
  Calendar,
  CircleDot,
  Sparkles,
  X
} from 'lucide-react';

interface CuajaSemillasPanelProps {
  parcelas: Parcela[];
  evaluaciones: EvaluacionCuajaSemillas[];
  onAddEvaluacion: (e: EvaluacionCuajaSemillas) => void;
  onUpdateEvaluacion: (e: EvaluacionCuajaSemillas) => void;
  onDeleteEvaluacion: (id: string) => void;
  activeUserName?: string;
  canEdit?: boolean;
}

const estimarCalibrePorSemillas = (semillas: number): string => {
  if (semillas >= 1200) return 'Calibre 25-27 (>115g)';
  if (semillas >= 1000) return 'Calibre 30 (100-115g)';
  if (semillas >= 800) return 'Calibre 33-36 (85-100g)';
  return 'Calibre bajo (<85g)';
};

const estimarCalificacionPolinizacion = (
  semillas: number,
  cuajaPct: number
): EvaluacionCuajaSemillas['calificacionPolinizacion'] => {
  if (semillas >= 1050 && cuajaPct >= 75) return 'Excelente';
  if (semillas >= 850 && cuajaPct >= 60) return 'Aceptable';
  return 'Deficiente';
};

export const CuajaSemillasPanel: React.FC<CuajaSemillasPanelProps> = ({
  parcelas,
  evaluaciones,
  onAddEvaluacion,
  onUpdateEvaluacion,
  onDeleteEvaluacion,
  activeUserName = 'Administrador',
  canEdit = true
}) => {
  const todayISO = () => new Date().toISOString().split('T')[0];

  const [vistaModo, setVistaModo] = useState<'hilera' | 'cuartel'>('hilera');
  const [cuartelFiltro, setCuartelFiltro] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const getDefaultForm = () => ({
    fecha: todayISO(),
    diasPostPlenaFlor: 22,
    parcelaId: parcelas[0]?.id || '',
    hilera: 'Hilera 1',
    floresEvaluadas: 150,
    frutosCuajados: 130,
    frutosCuajadosPorPlanta: 860,
    frutosPorM2Estimado: 42.0,
    frutosDeformesAbanicoPct: 4.5,
    pesoPromedioFrutoMuestraGr: 18.0,
    frutosCortadosMuestra: 15,
    semillasPromedioPorFruto: 1180,
    semillasMinFruto: 940,
    semillasMaxFruto: 1420,
    porcentajeFrutosSobre1000Semillas: 87,
    evaluador: activeUserName || 'Administrador',
    observaciones: ''
  });

  const [form, setForm] = useState(getDefaultForm);

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(getDefaultForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ev: EvaluacionCuajaSemillas) => {
    setEditingId(ev.id);
    setForm({
      fecha: ev.fecha || todayISO(),
      diasPostPlenaFlor: ev.diasPostPlenaFlor ?? 20,
      parcelaId: ev.parcelaId || parcelas[0]?.id || '',
      hilera: ev.hilera || 'Hilera 1',
      floresEvaluadas: ev.floresEvaluadas ?? 100,
      frutosCuajados: ev.frutosCuajados ?? 80,
      frutosCuajadosPorPlanta: ev.frutosCuajadosPorPlanta ?? 0,
      frutosPorM2Estimado: ev.frutosPorM2Estimado ?? 40,
      frutosDeformesAbanicoPct: ev.frutosDeformesAbanicoPct ?? 0,
      pesoPromedioFrutoMuestraGr: ev.pesoPromedioFrutoMuestraGr ?? 15,
      frutosCortadosMuestra: ev.frutosCortadosMuestra ?? 10,
      semillasPromedioPorFruto: ev.semillasPromedioPorFruto ?? 1000,
      semillasMinFruto: ev.semillasMinFruto ?? 0,
      semillasMaxFruto: ev.semillasMaxFruto ?? 0,
      porcentajeFrutosSobre1000Semillas: ev.porcentajeFrutosSobre1000Semillas ?? 80,
      evaluador: ev.evaluador || activeUserName || 'Administrador',
      observaciones: ev.observaciones || ''
    });
    setIsModalOpen(true);
  };

  const formPreview = useMemo(() => {
    const flores = Math.max(1, Number(form.floresEvaluadas) || 1);
    const cuajados = Math.min(flores, Math.max(0, Number(form.frutosCuajados) || 0));
    const pctCuaja = Number(((cuajados / flores) * 100).toFixed(1));
    const semillas = Math.max(0, Number(form.semillasPromedioPorFruto) || 0);
    const calibreProyectado = estimarCalibrePorSemillas(semillas);
    const calificacionPolinizacion = estimarCalificacionPolinizacion(semillas, pctCuaja);
    return { pctCuaja, calibreProyectado, calificacionPolinizacion };
  }, [form.floresEvaluadas, form.frutosCuajados, form.semillasPromedioPorFruto]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selParcela = parcelas.find((p) => p.id === form.parcelaId);

    const payload: EvaluacionCuajaSemillas = {
      id: editingId || `ecs-${Date.now()}`,
      fecha: form.fecha || todayISO(),
      diasPostPlenaFlor: Number(form.diasPostPlenaFlor) || 20,
      parcelaId: form.parcelaId,
      parcelaNombre: selParcela?.nombre || 'Cuartel',
      hilera: form.hilera || 'Hilera 1',
      floresEvaluadas: Number(form.floresEvaluadas) || 1,
      frutosCuajados: Number(form.frutosCuajados) || 0,
      porcentajeCuaja: formPreview.pctCuaja,
      frutosCuajadosPorPlanta: Number(form.frutosCuajadosPorPlanta) || 0,
      frutosPorM2Estimado: Number(form.frutosPorM2Estimado) || 0,
      frutosDeformesAbanicoPct: Number(form.frutosDeformesAbanicoPct) || 0,
      pesoPromedioFrutoMuestraGr: Number(form.pesoPromedioFrutoMuestraGr) || 0,
      frutosCortadosMuestra: Number(form.frutosCortadosMuestra) || 10,
      semillasPromedioPorFruto: Number(form.semillasPromedioPorFruto) || 0,
      semillasMinFruto: Number(form.semillasMinFruto) || 0,
      semillasMaxFruto: Number(form.semillasMaxFruto) || 0,
      porcentajeFrutosSobre1000Semillas: Number(form.porcentajeFrutosSobre1000Semillas) || 0,
      calibreProyectado: formPreview.calibreProyectado,
      calificacionPolinizacion: formPreview.calificacionPolinizacion,
      evaluador: form.evaluador || activeUserName || 'Administrador',
      observaciones: form.observaciones
    };

    if (editingId) {
      onUpdateEvaluacion(payload);
    } else {
      onAddEvaluacion(payload);
    }
    setIsModalOpen(false);
    setEditingId(null);
  };

  const filtered = useMemo(() => {
    if (cuartelFiltro === 'todos') return evaluaciones;
    return evaluaciones.filter((e) => e.parcelaId === cuartelFiltro);
  }, [evaluaciones, cuartelFiltro]);

  // Consolidado por Cuartel
  const consolidadoPorCuartel = useMemo(() => {
    const map = new Map<
      string,
      {
        parcelaId: string;
        parcelaNombre: string;
        hileras: string[];
        totalFlores: number;
        totalCuajados: number;
        sumaFrutosM2: number;
        sumaSemillas: number;
        sumaDeformes: number;
        sumaSobre1000: number;
        count: number;
      }
    >();

    evaluaciones.forEach((e) => {
      const ex = map.get(e.parcelaId) || {
        parcelaId: e.parcelaId,
        parcelaNombre: e.parcelaNombre,
        hileras: [],
        totalFlores: 0,
        totalCuajados: 0,
        sumaFrutosM2: 0,
        sumaSemillas: 0,
        sumaDeformes: 0,
        sumaSobre1000: 0,
        count: 0
      };
      if (e.hilera && !ex.hileras.includes(e.hilera)) {
        ex.hileras.push(e.hilera);
      }
      ex.totalFlores += e.floresEvaluadas || 0;
      ex.totalCuajados += e.frutosCuajados || 0;
      ex.sumaFrutosM2 += e.frutosPorM2Estimado || 0;
      ex.sumaSemillas += e.semillasPromedioPorFruto || 0;
      ex.sumaDeformes += e.frutosDeformesAbanicoPct || 0;
      ex.sumaSobre1000 += e.porcentajeFrutosSobre1000Semillas || 0;
      ex.count += 1;
      map.set(e.parcelaId, ex);
    });

    return Array.from(map.values()).map((c) => {
      const pctCuaja = c.totalFlores > 0 ? Number(((c.totalCuajados / c.totalFlores) * 100).toFixed(1)) : 0;
      const avgSemillas = c.count > 0 ? Math.round(c.sumaSemillas / c.count) : 0;
      return {
        ...c,
        pctCuaja,
        avgFrutosM2: c.count > 0 ? Number((c.sumaFrutosM2 / c.count).toFixed(1)) : 0,
        avgSemillas,
        avgDeformes: c.count > 0 ? Number((c.sumaDeformes / c.count).toFixed(1)) : 0,
        avgSobre1000: c.count > 0 ? Math.round(c.sumaSobre1000 / c.count) : 0,
        calibreProyectado: estimarCalibrePorSemillas(avgSemillas),
        calificacion: estimarCalificacionPolinizacion(avgSemillas, pctCuaja)
      };
    });
  }, [evaluaciones]);

  const kpis = useMemo(() => {
    if (filtered.length === 0) {
      return { avgCuaja: '0', avgSemillas: 0, avgFrutosM2: '0', avgDeformes: '0' };
    }
    const avgCuaja = (filtered.reduce((a, b) => a + b.porcentajeCuaja, 0) / filtered.length).toFixed(1);
    const avgSemillas = Math.round(filtered.reduce((a, b) => a + b.semillasPromedioPorFruto, 0) / filtered.length);
    const avgFrutosM2 = (filtered.reduce((a, b) => a + b.frutosPorM2Estimado, 0) / filtered.length).toFixed(1);
    const avgDeformes = (filtered.reduce((a, b) => a + b.frutosDeformesAbanicoPct, 0) / filtered.length).toFixed(1);
    return { avgCuaja, avgSemillas, avgFrutosM2, avgDeformes };
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Banner técnico de referencia */}
      <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-4 text-xs space-y-2">
        <div className="font-bold text-teal-950 text-sm flex items-center gap-1.5">
          <CircleDot className="w-4 h-4 text-teal-700" />
          Evaluación de Cuaja Post-Floración & Conteo de Semillas (15–30 DDPF)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-stone-700">
          <div className="bg-white p-3 rounded-lg border border-teal-100">
            <span className="font-bold text-teal-900 block mb-0.5">Meta de Semillas (Calibre Hayward)</span>
            Para lograr <strong>Calibre 25–30 (&gt;105 g)</strong> se requieren <strong>1.000 a 1.400+ semillas</strong> por fruto. Bajo 800 semillas el calibre queda restringido.
          </div>
          <div className="bg-white p-3 rounded-lg border border-teal-100">
            <span className="font-bold text-teal-900 block mb-0.5">% Cuaja Esperado</span>
            En Kiwi Hayward bien polinizado, la cuaja efectiva supera el <strong>75–90%</strong> de las flores dejadas post-raleo floral.
          </div>
          <div className="bg-white p-3 rounded-lg border border-teal-100">
            <span className="font-bold text-teal-900 block mb-0.5">Resumen Actual ({filtered.length} muest.)</span>
            Cuaja: <strong>{kpis.avgCuaja}%</strong> · Semillas: <strong>{kpis.avgSemillas} sem/fr</strong> · Carga: <strong>{kpis.avgFrutosM2} fr/m²</strong>
          </div>
        </div>
      </div>

      {/* Controles: Switch Hilera/Cuartel + Filtro + Botón Agregar */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
          <button
            onClick={() => setVistaModo('hilera')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              vistaModo === 'hilera'
                ? 'bg-white text-teal-950 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Detalle por Hilera / Muestra
          </button>
          <button
            onClick={() => setVistaModo('cuartel')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              vistaModo === 'cuartel'
                ? 'bg-white text-teal-950 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Consolidado por Cuartel
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={cuartelFiltro}
              onChange={(e) => setCuartelFiltro(e.target.value)}
              className="p-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-800"
            >
              <option value="todos">Todos los cuarteles</option>
              {parcelas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {canEdit && (
            <button
              onClick={handleOpenNew}
              disabled={parcelas.length === 0}
              className="px-3.5 py-2 bg-teal-800 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Evaluar Cuaja & Semillas
            </button>
          )}
        </div>
      </div>

      {/* VISTA DETALLE POR HILERA */}
      {vistaModo === 'hilera' && (
        <div>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-stone-500 border border-stone-200">
              <CircleDot className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="font-bold text-stone-700 text-sm">Sin evaluaciones de cuaja ni conteo de semillas registradas</p>
              <p className="text-xs text-stone-500 mt-1">
                Presiona "Evaluar Cuaja & Semillas" para ingresar el % de cuaja post-floración y el conteo transversal de semillas.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100/90 text-stone-700 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider">
                      <th className="p-3">Hilera / Cuartel</th>
                      <th className="p-3">Fecha (DDPF)</th>
                      <th className="p-3">% Cuaja Real</th>
                      <th className="p-3">Carga Frutos</th>
                      <th className="p-3">Semillas / Fruto</th>
                      <th className="p-3">Calibre Proyectado</th>
                      <th className="p-3">Calificación</th>
                      {canEdit && <th className="p-3 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((ev) => (
                      <tr key={ev.id} className="hover:bg-stone-50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-mono text-[11px]">
                              {ev.hilera || 'Muestra'}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5">{ev.parcelaNombre}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-medium text-stone-800">{ev.fecha}</div>
                          <div className="text-[10px] text-stone-500">{ev.diasPostPlenaFlor} días post-flor</div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full font-black text-xs ${
                              ev.porcentajeCuaja >= 75
                                ? 'bg-emerald-100 text-emerald-900'
                                : ev.porcentajeCuaja >= 60
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-900'
                            }`}
                          >
                            {ev.porcentajeCuaja}%
                          </span>
                          <div className="text-[10px] text-stone-500 mt-0.5">
                            {ev.frutosCuajados} / {ev.floresEvaluadas} flores
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-bold text-stone-900">{ev.frutosPorM2Estimado} fr/m²</div>
                          <div className="text-[10px] text-rose-700">
                            {ev.frutosDeformesAbanicoPct}% deformes/abanico
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-black text-teal-950 text-sm">
                            {ev.semillasPromedioPorFruto.toLocaleString('es-CL')} sem.
                          </div>
                          <div className="text-[10px] text-stone-500">
                            Rango: {ev.semillasMinFruto}–{ev.semillasMaxFruto} ({ev.porcentajeFrutosSobre1000Semillas}% &ge;1000)
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-[11px]">
                            {ev.calibreProyectado}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                              ev.calificacionPolinizacion === 'Excelente'
                                ? 'bg-emerald-100 text-emerald-900'
                                : ev.calificacionPolinizacion === 'Aceptable'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-900'
                            }`}
                          >
                            {ev.calificacionPolinizacion === 'Excelente' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {ev.calificacionPolinizacion}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(ev)}
                                className="p-1.5 text-stone-500 hover:text-teal-800 hover:bg-teal-50 rounded-lg cursor-pointer"
                                title="Editar evaluación de cuaja y semillas"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {confirmDeleteId === ev.id ? (
                                <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                                  <button
                                    onClick={() => {
                                      onDeleteEvaluacion(ev.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-[10px] cursor-pointer"
                                  >
                                    Eliminar
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-0.5 text-stone-600 hover:text-stone-900 font-semibold text-[10px] cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(ev.id)}
                                  className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  title="Eliminar evaluación"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA CONSOLIDADO POR CUARTEL */}
      {vistaModo === 'cuartel' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {consolidadoPorCuartel.length === 0 ? (
            <div className="md:col-span-2 bg-white rounded-xl p-8 text-center text-stone-500 border border-stone-200">
              <Layers className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="font-bold text-stone-700">Sin datos consolidados de cuaja por cuartel</p>
            </div>
          ) : (
            consolidadoPorCuartel.map((c) => (
              <div key={c.parcelaId} className="bg-white rounded-xl border border-stone-200 shadow-2xs p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">{c.parcelaNombre}</h3>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {c.hileras.length} hileras evaluadas: <span className="font-semibold text-stone-700">{c.hileras.join(', ')}</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-full ${
                      c.calificacion === 'Excelente'
                        ? 'bg-emerald-100 text-emerald-950'
                        : c.calificacion === 'Aceptable'
                        ? 'bg-amber-100 text-amber-950'
                        : 'bg-rose-100 text-rose-950'
                    }`}
                  >
                    {c.calificacion} · {c.pctCuaja}% Cuaja
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-2.5 text-center">
                    <div className="text-[10px] text-teal-800 font-bold">Semillas Promedio</div>
                    <div className="text-base font-black text-teal-950 mt-0.5">{c.avgSemillas.toLocaleString('es-CL')}</div>
                    <div className="text-[9px] text-teal-700">{c.avgSobre1000}% &ge;1.000 sem.</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                    <div className="text-[10px] text-emerald-800 font-bold">Carga Cuajada</div>
                    <div className="text-base font-black text-emerald-950 mt-0.5">{c.avgFrutosM2} fr/m²</div>
                    <div className="text-[9px] text-emerald-700">{c.totalCuajados}/{c.totalFlores} fl.</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-center">
                    <div className="text-[10px] text-indigo-800 font-bold">Calibre Esperado</div>
                    <div className="text-[11px] font-black text-indigo-950 mt-1">{c.calibreProyectado}</div>
                    <div className="text-[9px] text-rose-700">{c.avgDeformes}% deformes</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-stone-600">
                    <span>Nivel Seminal vs Meta Exportable (1.200 sem/fruto):</span>
                    <span>{Math.min(100, Math.round((c.avgSemillas / 1200) * 100))}%</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        c.avgSemillas >= 1000 ? 'bg-teal-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((c.avgSemillas / 1200) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL CREAR / EDITAR CUAJA Y SEMILLAS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="bg-teal-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-teal-400" />
                {editingId ? 'Editar Evaluación de Cuaja & Semillas' : 'Registrar Evaluación de Cuaja & Semillas'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Fecha:</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Días Post-Flor:</label>
                  <input
                    type="number"
                    min="5"
                    max="90"
                    value={form.diasPostPlenaFlor}
                    onChange={(e) => setForm({ ...form, diasPostPlenaFlor: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Cuartel:</label>
                  <select
                    value={form.parcelaId}
                    onChange={(e) => setForm({ ...form, parcelaId: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg font-semibold"
                    required
                  >
                    {parcelas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Hilera:</label>
                  <input
                    type="text"
                    value={form.hilera}
                    onChange={(e) => setForm({ ...form, hilera: e.target.value })}
                    placeholder="Ej. Hilera 4"
                    className="w-full p-2 border border-stone-300 rounded-lg bg-teal-50/40 font-bold text-teal-950"
                    required
                  />
                </div>
              </div>

              {/* Bloque Cuaja */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <div className="font-bold text-emerald-950 text-[11px] uppercase tracking-wider">
                  1. Conteo de Cuaja Post-Floración
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Flores Evaluadas:</label>
                    <input
                      type="number"
                      min="1"
                      value={form.floresEvaluadas}
                      onChange={(e) => setForm({ ...form, floresEvaluadas: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Frutos Cuajados:</label>
                    <input
                      type="number"
                      min="0"
                      value={form.frutosCuajados}
                      onChange={(e) => setForm({ ...form, frutosCuajados: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg font-bold text-emerald-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Frutos / m² Est.:</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={form.frutosPorM2Estimado}
                      onChange={(e) => setForm({ ...form, frutosPorM2Estimado: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Frutos / Planta:</label>
                    <input
                      type="number"
                      min="0"
                      value={form.frutosCuajadosPorPlanta}
                      onChange={(e) => setForm({ ...form, frutosCuajadosPorPlanta: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">% Deformes / Abanico / Planos:</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={form.frutosDeformesAbanicoPct}
                      onChange={(e) => setForm({ ...form, frutosDeformesAbanicoPct: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Peso Fruto Muestra (g):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={form.pesoPromedioFrutoMuestraGr}
                      onChange={(e) => setForm({ ...form, pesoPromedioFrutoMuestraGr: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Bloque Conteo de Semillas */}
              <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl space-y-2">
                <div className="font-bold text-teal-950 text-[11px] uppercase tracking-wider">
                  2. Conteo de Semillas (Corte Transversal)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Frutos Cortados:</label>
                    <input
                      type="number"
                      min="1"
                      value={form.frutosCortadosMuestra}
                      onChange={(e) => setForm({ ...form, frutosCortadosMuestra: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Prom. Semillas:</label>
                    <input
                      type="number"
                      min="0"
                      value={form.semillasPromedioPorFruto}
                      onChange={(e) => setForm({ ...form, semillasPromedioPorFruto: Number(e.target.value) })}
                      className="w-full p-2 border border-teal-400 bg-white rounded-lg font-black text-teal-950"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Mín. Semillas:</label>
                    <input
                      type="number"
                      min="0"
                      value={form.semillasMinFruto}
                      onChange={(e) => setForm({ ...form, semillasMinFruto: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Máx. Semillas:</label>
                    <input
                      type="number"
                      min="0"
                      value={form.semillasMaxFruto}
                      onChange={(e) => setForm({ ...form, semillasMaxFruto: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">% &ge;1000 Sem.:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.porcentajeFrutosSobre1000Semillas}
                      onChange={(e) => setForm({ ...form, porcentajeFrutosSobre1000Semillas: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Diagnóstico en tiempo real */}
              <div className="p-3 bg-stone-900 text-white rounded-xl grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-stone-400">% Cuaja Calculada</div>
                  <div className="text-lg font-black text-emerald-400">{formPreview.pctCuaja}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-400">Calibre Proyectado</div>
                  <div className="text-xs font-black text-amber-300 mt-1">{formPreview.calibreProyectado}</div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-400">Calificación Polinización</div>
                  <div className="text-sm font-black text-teal-300 mt-0.5">{formPreview.calificacionPolinizacion}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Evaluador:</label>
                  <input
                    type="text"
                    value={form.evaluador}
                    onChange={(e) => setForm({ ...form, evaluador: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Observaciones:</label>
                  <input
                    type="text"
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    placeholder="Ej. Buena distribución seminal en lóculos..."
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingId ? 'Actualizar Evaluación' : 'Guardar Evaluación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
