import React, { useState, useMemo } from 'react';
import {
  Parcela,
  ConteoBotonesFlorales,
  EvaluacionCuajaSemillas,
  PlanCargaRaleo
} from '../types/campo';
import {
  Calculator,
  Scissors,
  Plus,
  Pencil,
  Trash2,
  Filter,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  X,
  Sparkles,
  DollarSign
} from 'lucide-react';

interface CargaObjetivoRaleoPanelProps {
  parcelas: Parcela[];
  conteosBotones: ConteoBotonesFlorales[];
  evaluacionesCuaja: EvaluacionCuajaSemillas[];
  planesCargaRaleo: PlanCargaRaleo[];
  onAddPlan: (p: PlanCargaRaleo) => void;
  onUpdatePlan: (p: PlanCargaRaleo) => void;
  onDeletePlan: (id: string) => void;
  activeUserName?: string;
  canEdit?: boolean;
}

const CALIBRE_PRESETS = [
  { label: 'Cal. 25 (120g)', peso: 120 },
  { label: 'Cal. 27 (112g)', peso: 112 },
  { label: 'Cal. 30 (105g)', peso: 105 },
  { label: 'Cal. 33 (95g)', peso: 95 },
  { label: 'Cal. 36 (85g)', peso: 85 }
];

const calcularMetricasCarga = (params: {
  superficieHa: number;
  plantasPorHa: number;
  porcentajePlantasHembra: number;
  tonHaObjetivo: number;
  pesoFrutoObjetivoGr: number;
  margenSeguridadPct: number;
  cargaActualPorPlanta: number;
  rendimientoJornalPlantasDia: number;
  cuadrillaPersonas: number;
  costoJornalCLP: number;
}) => {
  const sup = Math.max(0.1, Number(params.superficieHa) || 0);
  const plantasHa = Math.max(1, Number(params.plantasPorHa) || 555);
  const pctHembra = Math.min(100, Math.max(10, Number(params.porcentajePlantasHembra) || 88));
  const plantasHembraHa = Math.max(1, plantasHa * (pctHembra / 100));
  const plantasHembraCuartel = Math.round(plantasHembraHa * sup);

  const tonHa = Math.max(1, Number(params.tonHaObjetivo) || 35);
  const pesoGr = Math.max(40, Number(params.pesoFrutoObjetivoGr) || 105);
  const margen = Math.max(0, Number(params.margenSeguridadPct) || 0);

  // 1 ton = 1,000,000 g
  const frutosBaseHa = (tonHa * 1_000_000) / pesoGr;
  const frutosObjetivoHa = Math.round(frutosBaseHa * (1 + margen / 100));
  const frutosObjetivoM2 = Number((frutosObjetivoHa / 10_000).toFixed(1));
  const frutosObjetivoPlanta = Math.round(frutosObjetivoHa / plantasHembraHa);

  const cargaActual = Math.max(0, Number(params.cargaActualPorPlanta) || 0);
  const excedentePorPlanta = Math.max(0, cargaActual - frutosObjetivoPlanta);
  const porcentajeRaleoRequerido =
    cargaActual > 0 ? Number(((excedentePorPlanta / cargaActual) * 100).toFixed(1)) : 0;
  const totalFrutosARalearCuartel = Math.round(excedentePorPlanta * plantasHembraCuartel);

  const rendJornal = Math.max(1, Number(params.rendimientoJornalPlantasDia) || 40);
  const cuadrilla = Math.max(1, Number(params.cuadrillaPersonas) || 1);
  const costoJornal = Math.max(0, Number(params.costoJornalCLP) || 0);

  const jornalesEstimadosTotales = Math.max(
    1,
    Math.ceil(plantasHembraCuartel / rendJornal)
  );
  const diasEstimadosFaena = Math.max(1, Math.ceil(jornalesEstimadosTotales / cuadrilla));
  const costoEstimadoTotalCLP = jornalesEstimadosTotales * costoJornal;

  return {
    plantasHembraHa: Math.round(plantasHembraHa),
    plantasHembraCuartel,
    frutosObjetivoHa,
    frutosObjetivoM2,
    frutosObjetivoPlanta,
    excedentePorPlanta,
    porcentajeRaleoRequerido,
    totalFrutosARalearCuartel,
    jornalesEstimadosTotales,
    diasEstimadosFaena,
    costoEstimadoTotalCLP
  };
};

export const CargaObjetivoRaleoPanel: React.FC<CargaObjetivoRaleoPanelProps> = ({
  parcelas,
  conteosBotones,
  evaluacionesCuaja,
  planesCargaRaleo,
  onAddPlan,
  onUpdatePlan,
  onDeletePlan,
  activeUserName = 'Administrador',
  canEdit = true
}) => {
  const todayISO = () => new Date().toISOString().split('T')[0];

  const [cuartelFiltro, setCuartelFiltro] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Estado del simulador interactivo
  const firstParcela = parcelas[0];
  const [sim, setSim] = useState({
    parcelaId: firstParcela?.id || '',
    superficieHa: firstParcela?.superficieHa || 5.0,
    plantasPorHa: firstParcela?.plantasPorHa || 555,
    porcentajePlantasHembra: 88,
    tonHaObjetivo: firstParcela?.rendimientoEstimadoTonHa || 40,
    pesoFrutoObjetivoGr: 105,
    margenSeguridadPct: 8,
    cargaActualPorPlanta: 1050,
    rendimientoJornalPlantasDia: 42,
    cuadrillaPersonas: 10,
    costoJornalCLP: 28000
  });

  // Estado del formulario modal (Crear / Editar Plan)
  const getDefaultForm = () => ({
    fechaPlanificacion: todayISO(),
    parcelaId: firstParcela?.id || '',
    superficieHa: firstParcela?.superficieHa || 5.0,
    plantasPorHa: firstParcela?.plantasPorHa || 555,
    porcentajePlantasHembra: 88,
    tonHaObjetivo: firstParcela?.rendimientoEstimadoTonHa || 40,
    pesoFrutoObjetivoGr: 105,
    margenSeguridadPct: 8,
    cargaActualPorPlanta: 1050,
    fechaInicioPlanificada: todayISO(),
    fechaTerminoPlanificada: todayISO(),
    rendimientoJornalPlantasDia: 42,
    cuadrillaPersonas: 10,
    costoJornalCLP: 28000,
    prioridadRaleo: '1° Flores laterales y mariposas' as PlanCargaRaleo['prioridadRaleo'],
    estado: 'Planificado' as PlanCargaRaleo['estado'],
    avanceRealPct: 0,
    responsable: activeUserName || 'Administrador',
    observaciones: ''
  });

  const [form, setForm] = useState(getDefaultForm);

  // Referencia de muestreo real para el cuartel seleccionado en simulador
  const referenciaCuartelSim = useMemo(() => {
    const cuajas = evaluacionesCuaja.filter((e) => e.parcelaId === sim.parcelaId);
    const botones = conteosBotones.filter((c) => c.parcelaId === sim.parcelaId);

    const avgFrutosPlantaCuaja =
      cuajas.length > 0
        ? Math.round(
            cuajas.reduce((acc, c) => acc + (c.frutosCuajadosPorPlanta || 0), 0) / cuajas.length
          )
        : 0;

    const avgFrutosM2Cuaja =
      cuajas.length > 0
        ? Number((cuajas.reduce((acc, c) => acc + (c.frutosPorM2Estimado || 0), 0) / cuajas.length).toFixed(1))
        : 0;

    const avgDensidadBotonesM2 =
      botones.length > 0
        ? Number((botones.reduce((acc, b) => acc + (b.densidadBotonesPorM2 || 0), 0) / botones.length).toFixed(1))
        : 0;

    return {
      tieneCuaja: cuajas.length > 0,
      tieneBotones: botones.length > 0,
      avgFrutosPlantaCuaja,
      avgFrutosM2Cuaja,
      avgDensidadBotonesM2
    };
  }, [sim.parcelaId, evaluacionesCuaja, conteosBotones]);

  const simMetrics = useMemo(() => calcularMetricasCarga(sim), [sim]);
  const formMetrics = useMemo(() => calcularMetricasCarga(form), [form]);

  const handleSelectParcelaSim = (parcelaId: string) => {
    const p = parcelas.find((x) => x.id === parcelaId);
    if (!p) {
      setSim((prev) => ({ ...prev, parcelaId }));
      return;
    }
    const cuajas = evaluacionesCuaja.filter((e) => e.parcelaId === parcelaId);
    const avgCuajaPlanta =
      cuajas.length > 0
        ? Math.round(cuajas.reduce((acc, c) => acc + (c.frutosCuajadosPorPlanta || 0), 0) / cuajas.length)
        : 0;

    setSim((prev) => ({
      ...prev,
      parcelaId,
      superficieHa: p.superficieHa || prev.superficieHa,
      plantasPorHa: p.plantasPorHa || prev.plantasPorHa,
      tonHaObjetivo: p.rendimientoEstimadoTonHa || prev.tonHaObjetivo,
      cargaActualPorPlanta: avgCuajaPlanta > 0 ? avgCuajaPlanta : prev.cargaActualPorPlanta
    }));
  };

  const handleAplicarReferenciaCampoSim = () => {
    if (referenciaCuartelSim.avgFrutosPlantaCuaja > 0) {
      setSim((prev) => ({
        ...prev,
        cargaActualPorPlanta: referenciaCuartelSim.avgFrutosPlantaCuaja
      }));
    } else if (referenciaCuartelSim.avgDensidadBotonesM2 > 0) {
      const plantasHembraHa = (sim.plantasPorHa || 555) * (sim.porcentajePlantasHembra / 100);
      const estimadoPorPlanta = Math.round((referenciaCuartelSim.avgDensidadBotonesM2 * 10_000) / plantasHembraHa);
      setSim((prev) => ({
        ...prev,
        cargaActualPorPlanta: estimadoPorPlanta
      }));
    }
  };

  const handleGuardarDesdeSimulador = () => {
    setEditingId(null);
    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() + simMetrics.diasEstimadosFaena);
    setForm({
      ...getDefaultForm(),
      parcelaId: sim.parcelaId || parcelas[0]?.id || '',
      superficieHa: sim.superficieHa,
      plantasPorHa: sim.plantasPorHa,
      porcentajePlantasHembra: sim.porcentajePlantasHembra,
      tonHaObjetivo: sim.tonHaObjetivo,
      pesoFrutoObjetivoGr: sim.pesoFrutoObjetivoGr,
      margenSeguridadPct: sim.margenSeguridadPct,
      cargaActualPorPlanta: sim.cargaActualPorPlanta,
      rendimientoJornalPlantasDia: sim.rendimientoJornalPlantasDia,
      cuadrillaPersonas: sim.cuadrillaPersonas,
      costoJornalCLP: sim.costoJornalCLP,
      fechaInicioPlanificada: todayISO(),
      fechaTerminoPlanificada: fechaFin.toISOString().split('T')[0],
      observaciones: `Meta: ${sim.tonHaObjetivo} ton/ha a ${sim.pesoFrutoObjetivoGr}g/fruto (${simMetrics.frutosObjetivoM2} frutos/m²). Raleo estimado ${simMetrics.porcentajeRaleoRequerido}%.`
    });
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(getDefaultForm());
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: PlanCargaRaleo) => {
    setEditingId(plan.id);
    setForm({
      fechaPlanificacion: plan.fechaPlanificacion || todayISO(),
      parcelaId: plan.parcelaId || parcelas[0]?.id || '',
      superficieHa: plan.superficieHa || 1,
      plantasPorHa: plan.plantasPorHa || 555,
      porcentajePlantasHembra: plan.porcentajePlantasHembra || 88,
      tonHaObjetivo: plan.tonHaObjetivo || 40,
      pesoFrutoObjetivoGr: plan.pesoFrutoObjetivoGr || 105,
      margenSeguridadPct: plan.margenSeguridadPct ?? 8,
      cargaActualPorPlanta: plan.cargaActualPorPlanta || 0,
      fechaInicioPlanificada: plan.fechaInicioPlanificada || todayISO(),
      fechaTerminoPlanificada: plan.fechaTerminoPlanificada || todayISO(),
      rendimientoJornalPlantasDia: plan.rendimientoJornalPlantasDia || 40,
      cuadrillaPersonas: plan.cuadrillaPersonas || 8,
      costoJornalCLP: plan.costoJornalCLP || 28000,
      prioridadRaleo: plan.prioridadRaleo || '1° Flores laterales y mariposas',
      estado: plan.estado || 'Planificado',
      avanceRealPct: plan.avanceRealPct ?? 0,
      responsable: plan.responsable || activeUserName || 'Administrador',
      observaciones: plan.observaciones || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selParcela = parcelas.find((p) => p.id === form.parcelaId);

    const payload: PlanCargaRaleo = {
      id: editingId || `pcr-${Date.now()}`,
      fechaPlanificacion: form.fechaPlanificacion || todayISO(),
      parcelaId: form.parcelaId,
      parcelaNombre: selParcela?.nombre || 'Cuartel',
      superficieHa: Number(form.superficieHa) || 1,
      plantasPorHa: Number(form.plantasPorHa) || 555,
      porcentajePlantasHembra: Number(form.porcentajePlantasHembra) || 88,
      tonHaObjetivo: Number(form.tonHaObjetivo) || 35,
      pesoFrutoObjetivoGr: Number(form.pesoFrutoObjetivoGr) || 105,
      margenSeguridadPct: Number(form.margenSeguridadPct) || 0,
      frutosObjetivoHa: formMetrics.frutosObjetivoHa,
      frutosObjetivoM2: formMetrics.frutosObjetivoM2,
      frutosObjetivoPlanta: formMetrics.frutosObjetivoPlanta,
      cargaActualPorPlanta: Number(form.cargaActualPorPlanta) || 0,
      excedentePorPlanta: formMetrics.excedentePorPlanta,
      porcentajeRaleoRequerido: formMetrics.porcentajeRaleoRequerido,
      totalFrutosARalearCuartel: formMetrics.totalFrutosARalearCuartel,
      fechaInicioPlanificada: form.fechaInicioPlanificada || todayISO(),
      fechaTerminoPlanificada: form.fechaTerminoPlanificada || todayISO(),
      rendimientoJornalPlantasDia: Number(form.rendimientoJornalPlantasDia) || 40,
      cuadrillaPersonas: Number(form.cuadrillaPersonas) || 1,
      costoJornalCLP: Number(form.costoJornalCLP) || 0,
      jornalesEstimadosTotales: formMetrics.jornalesEstimadosTotales,
      diasEstimadosFaena: formMetrics.diasEstimadosFaena,
      costoEstimadoTotalCLP: formMetrics.costoEstimadoTotalCLP,
      prioridadRaleo: form.prioridadRaleo,
      estado: form.estado,
      avanceRealPct: Number(form.avanceRealPct) || 0,
      responsable: form.responsable || activeUserName || 'Administrador',
      observaciones: form.observaciones
    };

    if (editingId) {
      onUpdatePlan(payload);
    } else {
      onAddPlan(payload);
    }
    setIsModalOpen(false);
    setEditingId(null);
  };

  const filteredPlanes = useMemo(() => {
    if (cuartelFiltro === 'todos') return planesCargaRaleo;
    return planesCargaRaleo.filter((p) => p.parcelaId === cuartelFiltro);
  }, [planesCargaRaleo, cuartelFiltro]);

  const totalesPlanes = useMemo(() => {
    const totalJornales = filteredPlanes.reduce((acc, p) => acc + (p.jornalesEstimadosTotales || 0), 0);
    const totalCosto = filteredPlanes.reduce((acc, p) => acc + (p.costoEstimadoTotalCLP || 0), 0);
    const avgObjetivoM2 =
      filteredPlanes.length > 0
        ? (filteredPlanes.reduce((acc, p) => acc + (p.frutosObjetivoM2 || 0), 0) / filteredPlanes.length).toFixed(1)
        : '0';
    return { totalJornales, totalCosto, avgObjetivoM2 };
  }, [filteredPlanes]);

  const formatCLP = (val: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-5">
      {/* SIMULADOR INTERACTIVO DE CARGA OBJETIVO & JORNALES DE RALEO */}
      <div className="bg-white rounded-2xl border border-indigo-200 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-950 via-stone-900 to-emerald-950 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-800/60 px-2 py-0.5 rounded-full mb-1">
              <Calculator className="w-3 h-3" />
              Calculadora Agronómica de Carga Objetivo & Cuadrilla
            </div>
            <h2 className="text-base sm:text-lg font-black">
              Cálculo de Carga Objetivo y Planificación de Raleo (Kiwi Hayward)
            </h2>
            <p className="text-xs text-stone-300 mt-0.5">
              Ajusta tu meta comercial (ton/ha y calibre deseado) para determinar exactamente cuántos frutos dejar por m²/planta y los jornales de raleo necesarios.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGuardarDesdeSimulador}
            disabled={parcelas.length === 0}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Guardar Simulación como Plan
          </button>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
          {/* Parámetros del Simulador */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="font-bold text-stone-700 block mb-1">Cuartel a Simular:</label>
                <select
                  value={sim.parcelaId}
                  onChange={(e) => handleSelectParcelaSim(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-lg bg-stone-50 font-semibold text-stone-900"
                >
                  {parcelas.length === 0 && <option value="">Sin cuarteles creados</option>}
                  {parcelas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.superficieHa} ha)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Superficie (ha):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={sim.superficieHa}
                  onChange={(e) => setSim({ ...sim, superficieHa: Number(e.target.value) })}
                  className="w-full p-2 border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Plantas / ha (total):</label>
                <input
                  type="number"
                  min="50"
                  value={sim.plantasPorHa}
                  onChange={(e) => setSim({ ...sim, plantasPorHa: Number(e.target.value) })}
                  className="w-full p-2 border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            {/* Meta Productiva y Calibre */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-stone-800 uppercase text-[11px] tracking-wider">
                  1. Meta Productiva y Calibre Exportable
                </span>
                <div className="flex flex-wrap gap-1">
                  {CALIBRE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setSim({ ...sim, pesoFrutoObjetivoGr: preset.peso })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-colors ${
                        sim.pesoFrutoObjetivoGr === preset.peso
                          ? 'bg-indigo-700 text-white border-indigo-700'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-indigo-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Meta (Ton/ha):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    value={sim.tonHaObjetivo}
                    onChange={(e) => setSim({ ...sim, tonHaObjetivo: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 bg-white rounded-lg font-bold text-emerald-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Peso Fruto (g):</label>
                  <input
                    type="number"
                    min="50"
                    max="180"
                    value={sim.pesoFrutoObjetivoGr}
                    onChange={(e) => setSim({ ...sim, pesoFrutoObjetivoGr: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 bg-white rounded-lg font-bold text-indigo-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">% Plantas Hembra:</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={sim.porcentajePlantasHembra}
                    onChange={(e) => setSim({ ...sim, porcentajePlantasHembra: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                    title="Descuenta la proporción de plantas macho polinizadoras (ej. 1:8 = 88% hembras)"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Margen Seg. (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={sim.margenSeguridadPct}
                    onChange={(e) => setSim({ ...sim, margenSeguridadPct: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                    title="Respaldo extra ante caída natural o descarte menor"
                  />
                </div>
              </div>
            </div>

            {/* Carga Actual y Cuadrilla */}
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-amber-950 uppercase text-[11px] tracking-wider">
                  2. Carga Actual en Campo & Cuadrilla de Raleo
                </span>
                {(referenciaCuartelSim.tieneCuaja || referenciaCuartelSim.tieneBotones) && (
                  <button
                    type="button"
                    onClick={handleAplicarReferenciaCampoSim}
                    className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Usar dato muestreado (
                    {referenciaCuartelSim.avgFrutosPlantaCuaja > 0
                      ? `${referenciaCuartelSim.avgFrutosPlantaCuaja} fr/pl en Cuaja`
                      : `${referenciaCuartelSim.avgDensidadBotonesM2} bot/m²`}
                    )
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Carga Actual / Planta:</label>
                  <input
                    type="number"
                    min="0"
                    value={sim.cargaActualPorPlanta}
                    onChange={(e) => setSim({ ...sim, cargaActualPorPlanta: Number(e.target.value) })}
                    className="w-full p-2 border border-amber-300 bg-white rounded-lg font-bold text-amber-950"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Plantas / Jornal / Día:</label>
                  <input
                    type="number"
                    min="5"
                    value={sim.rendimientoJornalPlantasDia}
                    onChange={(e) => setSim({ ...sim, rendimientoJornalPlantasDia: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Personas Cuadrilla:</label>
                  <input
                    type="number"
                    min="1"
                    value={sim.cuadrillaPersonas}
                    onChange={(e) => setSim({ ...sim, cuadrillaPersonas: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Valor Jornal ($ CLP):</label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={sim.costoJornalCLP}
                    onChange={(e) => setSim({ ...sim, costoJornalCLP: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 bg-white rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resultados en Tiempo Real */}
          <div className="lg:col-span-5 bg-stone-900 text-white rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  Resultado Carga Objetivo
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    simMetrics.frutosObjetivoM2 >= 35 && simMetrics.frutosObjetivoM2 <= 48
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : simMetrics.frutosObjetivoM2 > 48
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {simMetrics.frutosObjetivoM2 >= 35 && simMetrics.frutosObjetivoM2 <= 48
                    ? 'Rango Óptimo Hayward (35-48/m²)'
                    : simMetrics.frutosObjetivoM2 > 48
                    ? 'Sobrecarga (>48/m²)'
                    : 'Carga Conservadora (<35/m²)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="text-[10px] text-stone-300">Frutos Objetivo / m²</div>
                  <div className="text-2xl font-black text-emerald-400 mt-0.5">
                    {simMetrics.frutosObjetivoM2} <span className="text-xs font-normal text-stone-300">fr/m²</span>
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    {simMetrics.frutosObjetivoHa.toLocaleString('es-CL')} frutos/ha
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-3">
                  <div className="text-[10px] text-stone-300">Meta por Planta Hembra</div>
                  <div className="text-2xl font-black text-amber-300 mt-0.5">
                    {simMetrics.frutosObjetivoPlanta} <span className="text-xs font-normal text-stone-300">fr/pl</span>
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    {simMetrics.plantasHembraCuartel.toLocaleString('es-CL')} pl. hembra totales
                  </div>
                </div>
              </div>

              <div className="bg-rose-950/50 border border-rose-500/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-rose-200 font-bold uppercase">Excedente a Ralear</div>
                  <div className="text-lg font-black text-white mt-0.5">
                    {simMetrics.excedentePorPlanta} frutos/planta ({simMetrics.porcentajeRaleoRequerido}%)
                  </div>
                  <div className="text-[10px] text-rose-200/80">
                    Total cuartel: {simMetrics.totalFrutosARalearCuartel.toLocaleString('es-CL')} flores/frutos
                  </div>
                </div>
                <Scissors className="w-7 h-7 text-rose-400 shrink-0" />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-stone-400">Jornales Totales</div>
                  <div className="text-base font-black text-white mt-0.5">{simMetrics.jornalesEstimadosTotales}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-stone-400">Días Cuadrilla</div>
                  <div className="text-base font-black text-indigo-300 mt-0.5">{simMetrics.diasEstimadosFaena} d</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-stone-400">Costo Estimado</div>
                  <div className="text-xs font-black text-emerald-300 mt-1">{formatCLP(simMetrics.costoEstimadoTotalCLP)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE ACCIÓN Y FILTRO DE PLANES GUARDADOS */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
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

          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold">
            Meta prom.: {totalesPlanes.avgObjetivoM2} frutos/m²
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 font-bold flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-stone-500" />
            {totalesPlanes.totalJornales} jornales · {formatCLP(totalesPlanes.totalCosto)}
          </span>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenNew}
            disabled={parcelas.length === 0}
            className="px-3.5 py-2 bg-indigo-800 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Plan de Raleo
          </button>
        )}
      </div>

      {/* LISTA DE PLANES DE CARGA Y RALEO */}
      {filteredPlanes.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-stone-500 border border-stone-200">
          <Scissors className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="font-bold text-stone-700 text-sm">Sin planes de carga objetivo y raleo registrados</p>
          <p className="text-xs text-stone-500 mt-1">
            Usa el simulador superior o presiona "Nuevo Plan de Raleo" para planificar la carga de cada cuartel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlanes.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl border border-stone-200 shadow-2xs p-4 sm:p-5 space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm text-stone-900">{plan.parcelaNombre}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        plan.estado === 'Completado'
                          ? 'bg-emerald-100 text-emerald-900'
                          : plan.estado === 'En ejecución'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-indigo-100 text-indigo-900'
                      }`}
                    >
                      {plan.estado}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {plan.fechaInicioPlanificada} al {plan.fechaTerminoPlanificada}
                    </span>
                    <span>· {plan.superficieHa} ha</span>
                    <span>· Meta: {plan.tonHaObjetivo} ton/ha ({plan.pesoFrutoObjetivoGr}g)</span>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(plan)}
                      className="p-1.5 text-stone-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                      title="Editar plan de raleo"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDeleteId === plan.id ? (
                      <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                        <button
                          onClick={() => {
                            onDeletePlan(plan.id);
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
                        onClick={() => setConfirmDeleteId(plan.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Eliminar plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Métricas Carga Objetivo vs Actual */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-emerald-800 font-bold">Carga Objetivo</div>
                  <div className="text-base font-black text-emerald-950 mt-0.5">{plan.frutosObjetivoM2} fr/m²</div>
                  <div className="text-[9px] text-emerald-700">{plan.frutosObjetivoPlanta} fr/planta</div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-rose-800 font-bold">A Ralear</div>
                  <div className="text-base font-black text-rose-950 mt-0.5">-{plan.excedentePorPlanta} fr/pl</div>
                  <div className="text-[9px] text-rose-700">{plan.porcentajeRaleoRequerido}% de carga ({plan.cargaActualPorPlanta} act.)</div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-indigo-800 font-bold">Cuadrilla & Costo</div>
                  <div className="text-base font-black text-indigo-950 mt-0.5">{plan.jornalesEstimadosTotales} jorn.</div>
                  <div className="text-[9px] text-indigo-700">{plan.diasEstimadosFaena}d · {formatCLP(plan.costoEstimadoTotalCLP)}</div>
                </div>
              </div>

              <div className="text-[11px] bg-stone-50 border border-stone-200 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-stone-700">
                <span><strong>Criterio:</strong> {plan.prioridadRaleo}</span>
                <span><strong>Cuadrilla:</strong> {plan.cuadrillaPersonas} pers. ({plan.rendimientoJornalPlantasDia} pl/jornal)</span>
              </div>

              {/* Barra de avance */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-stone-600">
                  <span>Avance real de raleo en cuartel:</span>
                  <span>{plan.avanceRealPct}%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      plan.avanceRealPct >= 100 ? 'bg-emerald-600' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, plan.avanceRealPct))}%` }}
                  />
                </div>
              </div>

              {plan.observaciones && (
                <div className="text-xs text-stone-600 bg-stone-50 p-2 rounded border border-stone-200 italic">
                  "{plan.observaciones}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL AGREGAR / EDITAR PLAN DE CARGA & RALEO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="bg-indigo-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" />
                {editingId ? 'Editar Plan de Carga Objetivo & Raleo' : 'Nuevo Plan de Carga Objetivo & Raleo'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="font-bold text-stone-700 block mb-1">Cuartel:</label>
                  <select
                    value={form.parcelaId}
                    onChange={(e) => {
                      const p = parcelas.find((x) => x.id === e.target.value);
                      setForm({
                        ...form,
                        parcelaId: e.target.value,
                        superficieHa: p?.superficieHa || form.superficieHa,
                        plantasPorHa: p?.plantasPorHa || form.plantasPorHa,
                        tonHaObjetivo: p?.rendimientoEstimadoTonHa || form.tonHaObjetivo
                      });
                    }}
                    className="w-full p-2 border border-stone-300 rounded-lg font-semibold"
                    required
                  >
                    {parcelas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Fecha Planificación:</label>
                  <input
                    type="date"
                    value={form.fechaPlanificacion}
                    onChange={(e) => setForm({ ...form, fechaPlanificacion: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Superficie (ha):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={form.superficieHa}
                    onChange={(e) => setForm({ ...form, superficieHa: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Plantas/ha:</label>
                  <input
                    type="number"
                    min="50"
                    value={form.plantasPorHa}
                    onChange={(e) => setForm({ ...form, plantasPorHa: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">% Hembras:</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={form.porcentajePlantasHembra}
                    onChange={(e) => setForm({ ...form, porcentajePlantasHembra: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Margen Seg. (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={form.margenSeguridadPct}
                    onChange={(e) => setForm({ ...form, margenSeguridadPct: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Meta Ton/ha:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={form.tonHaObjetivo}
                    onChange={(e) => setForm({ ...form, tonHaObjetivo: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg font-bold text-emerald-900"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Peso Fruto Meta (g):</label>
                  <input
                    type="number"
                    min="40"
                    value={form.pesoFrutoObjetivoGr}
                    onChange={(e) => setForm({ ...form, pesoFrutoObjetivoGr: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg font-bold text-indigo-900"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Carga Actual / Planta:</label>
                  <input
                    type="number"
                    min="0"
                    value={form.cargaActualPorPlanta}
                    onChange={(e) => setForm({ ...form, cargaActualPorPlanta: Number(e.target.value) })}
                    className="w-full p-2 border border-amber-300 bg-amber-50/40 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              {/* Resumen calculado en tiempo real */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-indigo-800 font-bold">Obj. / m²</div>
                  <div className="text-sm font-black text-indigo-950">{formMetrics.frutosObjetivoM2} fr/m²</div>
                </div>
                <div>
                  <div className="text-[10px] text-indigo-800 font-bold">Obj. / Planta</div>
                  <div className="text-sm font-black text-indigo-950">{formMetrics.frutosObjetivoPlanta} fr</div>
                </div>
                <div>
                  <div className="text-[10px] text-rose-800 font-bold">A Ralear</div>
                  <div className="text-sm font-black text-rose-900">{formMetrics.excedentePorPlanta} ({formMetrics.porcentajeRaleoRequerido}%)</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-800 font-bold">Jornales / Costo</div>
                  <div className="text-sm font-black text-emerald-950">{formMetrics.jornalesEstimadosTotales} j. · {formatCLP(formMetrics.costoEstimadoTotalCLP)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Inicio Faena:</label>
                  <input
                    type="date"
                    value={form.fechaInicioPlanificada}
                    onChange={(e) => setForm({ ...form, fechaInicioPlanificada: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Término Est.:</label>
                  <input
                    type="date"
                    value={form.fechaTerminoPlanificada}
                    onChange={(e) => setForm({ ...form, fechaTerminoPlanificada: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Pl./Jornal/Día:</label>
                  <input
                    type="number"
                    min="1"
                    value={form.rendimientoJornalPlantasDia}
                    onChange={(e) => setForm({ ...form, rendimientoJornalPlantasDia: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Cuadrilla:</label>
                  <input
                    type="number"
                    min="1"
                    value={form.cuadrillaPersonas}
                    onChange={(e) => setForm({ ...form, cuadrillaPersonas: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">$ Jornal CLP:</label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={form.costoJornalCLP}
                    onChange={(e) => setForm({ ...form, costoJornalCLP: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Prioridad de Raleo:</label>
                  <select
                    value={form.prioridadRaleo}
                    onChange={(e) => setForm({ ...form, prioridadRaleo: e.target.value as PlanCargaRaleo['prioridadRaleo'] })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  >
                    <option value="1° Flores laterales y mariposas">1° Flores laterales y mariposas</option>
                    <option value="2° Frutos deformes y chicos">2° Frutos deformes y chicos</option>
                    <option value="3° Ajuste de carga final">3° Ajuste de carga final</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Estado:</label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value as PlanCargaRaleo['estado'] })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  >
                    <option value="Planificado">Planificado</option>
                    <option value="En ejecución">En ejecución</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">% Avance Real:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.avanceRealPct}
                    onChange={(e) => setForm({ ...form, avanceRealPct: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Responsable / Capataz:</label>
                  <input
                    type="text"
                    value={form.responsable}
                    onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Observaciones:</label>
                  <input
                    type="text"
                    value={form.observaciones}
                    onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                    placeholder="Ej. Sacar laterales en tercio apical..."
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
                  className="px-4 py-2 bg-indigo-800 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingId ? 'Actualizar Plan' : 'Guardar Plan de Raleo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
