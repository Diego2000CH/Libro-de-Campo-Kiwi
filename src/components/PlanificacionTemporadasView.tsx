import React, { useMemo, useState } from 'react';
import {
  CategoriaTareaHuerto,
  CondicionHorasFrio,
  EvaluacionCuajaSemillas,
  LiquidacionPacking,
  Parcela,
  RegistroCosechaLote,
  RegistroExtraccionPozo,
  ResumenTemporada,
  TareaAgronomica,
  TurnoRiego,
  UsuarioPredio,
} from '../types/campo';
import { AlertaProactivaHuerto } from '../utils/alertasHuerto';
import type { ActiveTab } from './Navbar';
import {
  Calendar,
  BarChart3,
  BellRing,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  X,
} from 'lucide-react';

interface PlanificacionTemporadasViewProps {
  parcelas: Parcela[];
  usuarios: UsuarioPredio[];
  horasFrio: CondicionHorasFrio;
  turnosRiego: TurnoRiego[];
  registrosPozo: RegistroExtraccionPozo[];
  cosechasLote: RegistroCosechaLote[];
  liquidacionesPacking: LiquidacionPacking[];
  evaluacionesCuaja: EvaluacionCuajaSemillas[];
  tareasHuerto: TareaAgronomica[];
  onAddTarea: (t: TareaAgronomica) => void;
  onUpdateTarea: (t: TareaAgronomica) => void;
  onDeleteTarea: (id: string) => void;
  resumenesTemporada: ResumenTemporada[];
  onAddResumenTemporada: (r: ResumenTemporada) => void;
  onDeleteResumenTemporada: (id: string) => void;
  alertasProactivas: AlertaProactivaHuerto[];
  onNavigateTab: (tab: ActiveTab) => void;
  canEdit?: boolean;
}

const MESES_FENOLOGICOS = [
  { mes: 'May - Ago', etapa: 'Receso Invernal & Poda', foco: 'Acumulación Horas Frío (<7.2°C), poda, amarre y cobres preventivos Psa.' },
  { mes: 'Sep - Oct', etapa: 'Brotación & Botones', foco: 'Inicio Grados Día (>10°C), raleo de botones dobles/laterales, fertirriego inicial.' },
  { mes: 'Nov', etapa: 'Floración & Polinización', foco: 'Colmenas Apis/Bombus, sincronía macho/hembra, aplicación de polen asistido.' },
  { mes: 'Dic - Mar', etapa: 'Cuaja & Crecimiento Fruto', foco: 'Evaluación cuaja/semillas, raleo de frutos, control riego ETo y monitoreos.' },
  { mes: 'Abr - May', etapa: 'Madurez & Cosecha', foco: 'Muestreo ≥ 6.2° Brix, verificación carencias LMR, despacho bins con QR y liquidaciones.' },
];

export const PlanificacionTemporadasView: React.FC<PlanificacionTemporadasViewProps> = ({
  parcelas,
  usuarios,
  horasFrio,
  turnosRiego,
  registrosPozo,
  cosechasLote,
  liquidacionesPacking,
  evaluacionesCuaja,
  tareasHuerto,
  onAddTarea,
  onUpdateTarea,
  onDeleteTarea,
  resumenesTemporada,
  onAddResumenTemporada,
  onDeleteResumenTemporada,
  alertasProactivas,
  onNavigateTab,
  canEdit = true,
}) => {
  const [subTab, setSubTab] = useState<'temporadas' | 'calendario' | 'alertas'>('temporadas');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'Pendiente' | 'En curso' | 'Completada'>('todas');
  const [isTareaModalOpen, setIsTareaModalOpen] = useState(false);
  const [isTemporadaModalOpen, setIsTemporadaModalOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const temporadaActualLabel = `${currentYear - 1}-${currentYear}`;

  const [tareaForm, setTareaForm] = useState<{
    titulo: string;
    categoria: CategoriaTareaHuerto;
    fechaLimite: string;
    temporada: string;
    parcelaId: string;
    responsable: string;
    prioridad: TareaAgronomica['prioridad'];
    observaciones: string;
  }>({
    titulo: '',
    categoria: 'Riego & Pozo',
    fechaLimite: new Date().toISOString().split('T')[0],
    temporada: temporadaActualLabel,
    parcelaId: '',
    responsable: usuarios[0]?.nombre || '',
    prioridad: 'Media',
    observaciones: '',
  });

  const [tempForm, setTempForm] = useState({
    temporada: `${currentYear - 2}-${currentYear - 1}`,
    horasFrioTotales: 0,
    gradosDiaTotales: 0,
    aguaConsumidaM3Ha: 0,
    porcentajeCuajaPromedio: 0,
    cosechaTonHa: 0,
    retornoPromedioUSDKg: 0,
    observaciones: '',
  });

  // Resumen calculado en vivo de la temporada en curso
  const resumenVivoActual: ResumenTemporada = useMemo(() => {
    const totalHa = parcelas.reduce((acc, p) => acc + (p.superficieHa || 0), 0);
    const totalAguaTurnos = turnosRiego.reduce((acc, t) => acc + (t.volumenM3 || 0), 0);
    const totalAguaPozo = registrosPozo.reduce((acc, r) => acc + (r.metrosCubicosExtraidos || 0), 0);
    const aguaTotal = totalAguaPozo > 0 ? totalAguaPozo : totalAguaTurnos;
    const aguaM3Ha = totalHa > 0 ? Math.round(aguaTotal / totalHa) : 0;

    const totalKgCosecha = cosechasLote.reduce((acc, c) => acc + (c.pesoNetoKgEstimado || 0), 0);
    const tonHa = totalHa > 0 ? Number((totalKgCosecha / 1000 / totalHa).toFixed(1)) : 0;

    const cuajaProm =
      evaluacionesCuaja.length > 0
        ? Number(
            (
              evaluacionesCuaja.reduce((acc, e) => acc + (e.porcentajeCuaja || 0), 0) /
              evaluacionesCuaja.length
            ).toFixed(1)
          )
        : 0;

    return {
      id: 'actual-vivo',
      temporada: `${temporadaActualLabel} (En Vivo)`,
      horasFrioTotales: Math.round(horasFrio.totalAcumuladoHF || 0),
      gradosDiaTotales: Math.round(horasFrio.totalAcumuladoGD || 0),
      aguaConsumidaM3Ha: aguaM3Ha,
      porcentajeCuajaPromedio: cuajaProm,
      cosechaTonHa: tonHa,
      retornoPromedioUSDKg: 0,
      observaciones: 'Calculado automáticamente con los datos actuales del huerto',
    };
  }, [parcelas, turnosRiego, registrosPozo, cosechasLote, evaluacionesCuaja, horasFrio, temporadaActualLabel]);

  const todasTemporadas = useMemo(() => {
    return [...resumenesTemporada, resumenVivoActual].sort((a, b) =>
      a.temporada.localeCompare(b.temporada)
    );
  }, [resumenesTemporada, resumenVivoActual]);

  const maxHF = Math.max(1, ...todasTemporadas.map((t) => t.horasFrioTotales));
  const maxGD = Math.max(1, ...todasTemporadas.map((t) => t.gradosDiaTotales));
  const maxTon = Math.max(1, ...todasTemporadas.map((t) => t.cosechaTonHa));

  const tareasFiltradas = useMemo(() => {
    return [...tareasHuerto]
      .filter((t) => (filtroEstado === 'todas' ? true : t.estado === filtroEstado))
      .sort((a, b) => Date.parse(a.fechaLimite) - Date.parse(b.fechaLimite));
  }, [tareasHuerto, filtroEstado]);

  const handleSaveTarea = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parcelas.find((item) => item.id === tareaForm.parcelaId);
    onAddTarea({
      id: `tar-${Date.now()}`,
      titulo: tareaForm.titulo.trim(),
      categoria: tareaForm.categoria,
      fechaLimite: tareaForm.fechaLimite,
      temporada: tareaForm.temporada,
      parcelaId: tareaForm.parcelaId || undefined,
      parcelaNombre: p ? p.nombre : 'Todo el Predio',
      responsable: tareaForm.responsable.trim() || 'Sin asignar',
      prioridad: tareaForm.prioridad,
      estado: 'Pendiente',
      observaciones: tareaForm.observaciones.trim() || undefined,
    });
    setIsTareaModalOpen(false);
    setTareaForm((prev) => ({ ...prev, titulo: '', observaciones: '' }));
  };

  const handleSaveTemporada = (e: React.FormEvent) => {
    e.preventDefault();
    onAddResumenTemporada({
      id: `temp-${Date.now()}`,
      temporada: tempForm.temporada.trim(),
      horasFrioTotales: Number(tempForm.horasFrioTotales) || 0,
      gradosDiaTotales: Number(tempForm.gradosDiaTotales) || 0,
      aguaConsumidaM3Ha: Number(tempForm.aguaConsumidaM3Ha) || 0,
      porcentajeCuajaPromedio: Number(tempForm.porcentajeCuajaPromedio) || 0,
      cosechaTonHa: Number(tempForm.cosechaTonHa) || 0,
      retornoPromedioUSDKg: 0,
      observaciones: tempForm.observaciones.trim() || undefined,
    });
    setIsTemporadaModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Calendar className="w-3 h-3" />
            Planificación Anual & Evolución Histórica
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Multi-Temporada, Calendario & Alertas Proactivas
          </h1>
          <p className="text-xs text-stone-500">
            Compara campañas año a año, coordina el calendario agronómico del equipo y resuelve alertas tempranas del predio.
          </p>
        </div>

        <div className="p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold flex flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab('temporadas')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer ${
              subTab === 'temporadas' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600'
            }`}
          >
            Comparador Temporadas
          </button>
          <button
            type="button"
            onClick={() => setSubTab('calendario')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer ${
              subTab === 'calendario' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600'
            }`}
          >
            Calendario & Tareas ({tareasHuerto.filter((t) => t.estado !== 'Completada').length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('alertas')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 ${
              subTab === 'alertas' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600'
            }`}
          >
            <span>Alertas</span>
            {alertasProactivas.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">
                {alertasProactivas.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Subtab 1: Comparador Multi-Temporada */}
      {subTab === 'temporadas' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-700" />
              Comparativa de Campañas Agrícolas
            </h2>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsTemporadaModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cargar Temporada Histórica</span>
              </button>
            )}
          </div>

          {/* Gráficos de Barras Comparativos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
              <div className="text-xs font-bold text-stone-800">Horas Frío (&lt;7.2°C)</div>
              {todasTemporadas.map((t) => (
                <div key={`hf-${t.id}`} className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="font-semibold text-stone-700">{t.temporada}</span>
                    <span className="font-mono font-bold text-sky-900">{t.horasFrioTotales} HF</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-600 rounded-full" style={{ width: `${(t.horasFrioTotales / maxHF) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
              <div className="text-xs font-bold text-stone-800">Grados Día (°D)</div>
              {todasTemporadas.map((t) => (
                <div key={`gd-${t.id}`} className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="font-semibold text-stone-700">{t.temporada}</span>
                    <span className="font-mono font-bold text-amber-800">{t.gradosDiaTotales} °D</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(t.gradosDiaTotales / maxGD) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
              <div className="text-xs font-bold text-stone-800">Rendimiento (Ton / Ha)</div>
              {todasTemporadas.map((t) => (
                <div key={`ton-${t.id}`} className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="font-semibold text-stone-700">{t.temporada}</span>
                    <span className="font-mono font-bold text-emerald-900">{t.cosechaTonHa} ton/ha</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-700 rounded-full" style={{ width: `${(t.cosechaTonHa / maxTon) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla Completa */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Temporada</th>
                    <th className="px-4 py-3">Horas Frío</th>
                    <th className="px-4 py-3">Grados Día</th>
                    <th className="px-4 py-3">Riego (m³/ha)</th>
                    <th className="px-4 py-3">% Cuaja</th>
                    <th className="px-4 py-3">Cosecha (Ton/ha)</th>
                    {canEdit && <th className="px-4 py-3 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {todasTemporadas.map((t) => (
                    <tr key={t.id} className={t.id === 'actual-vivo' ? 'bg-emerald-50/50' : 'hover:bg-stone-50'}>
                      <td className="px-4 py-3 font-sans font-bold text-stone-900">{t.temporada}</td>
                      <td className="px-4 py-3">{t.horasFrioTotales} HF</td>
                      <td className="px-4 py-3">{t.gradosDiaTotales} °D</td>
                      <td className="px-4 py-3">{t.aguaConsumidaM3Ha.toLocaleString('es-CL')} m³/ha</td>
                      <td className="px-4 py-3">{t.porcentajeCuajaPromedio}%</td>
                      <td className="px-4 py-3 font-bold text-emerald-900">{t.cosechaTonHa} t/ha</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right font-sans">
                          {t.id !== 'actual-vivo' ? (
                            <button
                              type="button"
                              onClick={() => onDeleteResumenTemporada(t.id)}
                              className="p-1 text-stone-400 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold">Auto</span>
                          )}
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

      {/* Subtab 2: Calendario & Tareas */}
      {subTab === 'calendario' && (
        <div className="space-y-5">
          {/* Guía Fenológica Anual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {MESES_FENOLOGICOS.map((m) => (
              <div key={m.mes} className="p-3.5 bg-white rounded-2xl border border-stone-200 space-y-1 text-xs">
                <div className="text-[10px] font-bold uppercase text-emerald-800">{m.mes}</div>
                <div className="font-bold text-stone-900">{m.etapa}</div>
                <p className="text-[11px] text-stone-500 leading-snug">{m.foco}</p>
              </div>
            ))}
          </div>

          {/* Tareas del Huerto */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {(['todas', 'Pendiente', 'En curso', 'Completada'] as const).map((est) => (
                  <button
                    key={est}
                    type="button"
                    onClick={() => setFiltroEstado(est)}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                      filtroEstado === est ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {est === 'todas' ? `Todas (${tareasHuerto.length})` : est}
                  </button>
                ))}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsTareaModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Tarea</span>
                </button>
              )}
            </div>

            {tareasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                No hay tareas programadas en esta vista. Planifica podas, aplicaciones, calibraciones o muestreos para tu equipo.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {tareasFiltradas.map((t) => {
                  const siguienteEstado: Record<TareaAgronomica['estado'], TareaAgronomica['estado']> = {
                    Pendiente: 'En curso',
                    'En curso': 'Completada',
                    Completada: 'Pendiente',
                  };
                  return (
                    <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-stone-50">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-stone-500">{t.fechaLimite}</span>
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-bold text-[10px]">
                            {t.categoria}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.prioridad === 'Alta'
                                ? 'bg-rose-100 text-rose-800'
                                : t.prioridad === 'Media'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            Prioridad {t.prioridad}
                          </span>
                        </div>
                        <div className={`font-bold text-sm ${t.estado === 'Completada' ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {t.titulo}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {t.parcelaNombre || 'Todo el Predio'} · Responsable: <strong>{t.responsable}</strong>
                          {t.observaciones ? ` · ${t.observaciones}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => onUpdateTarea({ ...t, estado: siguienteEstado[t.estado] })}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer ${
                            t.estado === 'Completada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.estado === 'En curso'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                          title="Clic para avanzar estado"
                        >
                          {t.estado === 'Completada' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {t.estado}
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onDeleteTarea(t.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: Centro Unificado de Alertas Proactivas */}
      {subTab === 'alertas' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
            <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-rose-700" />
              Centro de Alertas Proactivas del Huerto
            </h2>
            <span className="text-xs text-stone-500">{alertasProactivas.length} alertas activas</span>
          </div>

          {alertasProactivas.length === 0 ? (
            <div className="p-8 text-center text-xs text-emerald-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold">Todo al día en tu huerto</p>
              <p className="text-stone-500">Sin vencimientos de bodega, carnets SAG, calibraciones ni tareas atrasadas.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {alertasProactivas.map((a) => (
                <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-stone-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        a.severidad === 'critica'
                          ? 'text-rose-600'
                          : a.severidad === 'advertencia'
                          ? 'text-amber-600'
                          : 'text-sky-600'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                          {a.categoria}
                        </span>
                        <span className="font-bold text-stone-900">{a.titulo}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5">{a.detalle}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab(a.tabDestino)}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 self-start sm:self-center cursor-pointer shrink-0"
                  >
                    <span>Resolver</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Nueva Tarea */}
      {isTareaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Programar Nueva Tarea Agronómica</h3>
              <button type="button" onClick={() => setIsTareaModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveTarea} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Título de la Tarea:</label>
                <input type="text" value={tareaForm.titulo} onChange={(e) => setTareaForm({ ...tareaForm, titulo: e.target.value })} placeholder="Ej. Revisar boquillas nebulizador antes de floración" className="w-full p-2 border border-stone-300 rounded-lg" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Categoría:</label>
                  <select value={tareaForm.categoria} onChange={(e) => setTareaForm({ ...tareaForm, categoria: e.target.value as CategoriaTareaHuerto })} className="w-full p-2 border border-stone-300 rounded-lg">
                    <option value="Poda & Amarre">Poda & Amarre</option>
                    <option value="Riego & Pozo">Riego & Pozo</option>
                    <option value="Fitosanitario">Fitosanitario</option>
                    <option value="Fertilización">Fertilización</option>
                    <option value="Polinización & Raleo">Polinización & Raleo</option>
                    <option value="Cosecha & Madurez">Cosecha & Madurez</option>
                    <option value="Maquinaria & Calibración">Maquinaria & Calibración</option>
                    <option value="Auditoría & Laboratorio">Auditoría & Laboratorio</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha Límite:</label>
                  <input type="date" value={tareaForm.fechaLimite} onChange={(e) => setTareaForm({ ...tareaForm, fechaLimite: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cuartel:</label>
                  <select value={tareaForm.parcelaId} onChange={(e) => setTareaForm({ ...tareaForm, parcelaId: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg">
                    <option value="">Todo el Predio</option>
                    {parcelas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Responsable:</label>
                  <input type="text" value={tareaForm.responsable} onChange={(e) => setTareaForm({ ...tareaForm, responsable: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Prioridad:</label>
                  <select value={tareaForm.prioridad} onChange={(e) => setTareaForm({ ...tareaForm, prioridad: e.target.value as TareaAgronomica['prioridad'] })} className="w-full p-2 border border-stone-300 rounded-lg">
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones:</label>
                <textarea rows={2} value={tareaForm.observaciones} onChange={(e) => setTareaForm({ ...tareaForm, observaciones: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button type="button" onClick={() => setIsTareaModalOpen(false)} className="px-4 py-2 border border-stone-300 rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer">Crear Tarea</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Temporada Histórica */}
      {isTemporadaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Resumen de Temporada Histórica</h3>
              <button type="button" onClick={() => setIsTemporadaModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveTemporada} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Temporada (ej. 2024-2025):</label>
                <input type="text" value={tempForm.temporada} onChange={(e) => setTempForm({ ...tempForm, temporada: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg font-mono font-bold" required />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Horas Frío (HF):</label>
                  <input type="number" value={tempForm.horasFrioTotales} onChange={(e) => setTempForm({ ...tempForm, horasFrioTotales: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Grados Día (°D):</label>
                  <input type="number" value={tempForm.gradosDiaTotales} onChange={(e) => setTempForm({ ...tempForm, gradosDiaTotales: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Agua (m³/ha):</label>
                  <input type="number" value={tempForm.aguaConsumidaM3Ha} onChange={(e) => setTempForm({ ...tempForm, aguaConsumidaM3Ha: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">% Cuaja Prom.:</label>
                  <input type="number" step="0.1" value={tempForm.porcentajeCuajaPromedio} onChange={(e) => setTempForm({ ...tempForm, porcentajeCuajaPromedio: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cosecha (Ton/ha):</label>
                  <input type="number" step="0.1" value={tempForm.cosechaTonHa} onChange={(e) => setTempForm({ ...tempForm, cosechaTonHa: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Notas Campaña:</label>
                  <input type="text" value={tempForm.observaciones} onChange={(e) => setTempForm({ ...tempForm, observaciones: e.target.value })} placeholder="Opcional" className="w-full p-2 border border-stone-300 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button type="button" onClick={() => setIsTemporadaModalOpen(false)} className="px-4 py-2 border border-stone-300 rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer">Guardar Temporada</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
