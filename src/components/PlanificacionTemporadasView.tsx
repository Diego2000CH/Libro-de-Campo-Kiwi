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
  SeguimientoFenologico,
  TareaAgronomica,
  TurnoRiego,
  UsuarioPredio,
} from '../types/campo';
import { AlertaProactivaHuerto } from '../utils/alertasHuerto';
import type { ActiveTab } from './Navbar';
import {
  BBCH_SUGERENCIAS,
  buildPreformedFenologiaKiwi,
  resolveEstadoEtapa,
} from '../utils/fenologiaHelper';
import {
  Calendar,
  BarChart3,
  BellRing,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Save,
  Sprout,
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
  fenologia?: SeguimientoFenologico[];
  onAddFenologia?: (f: SeguimientoFenologico) => void;
  onUpdateFenologia?: (f: SeguimientoFenologico) => void;
  onDeleteFenologia?: (id: string) => void;
  onReplaceFenologia?: (list: SeguimientoFenologico[]) => void;
  onUpdateParcela?: (p: Parcela) => void;
  canEdit?: boolean;
}

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
  fenologia = [],
  onAddFenologia,
  onUpdateFenologia,
  onDeleteFenologia,
  onReplaceFenologia,
  onUpdateParcela,
  canEdit = true,
}) => {
  const [subTab, setSubTab] = useState<'temporadas' | 'calendario' | 'alertas'>('temporadas');
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'Pendiente' | 'En curso' | 'Completada'>('todas');
  const [isTareaModalOpen, setIsTareaModalOpen] = useState(false);
  const [isTemporadaModalOpen, setIsTemporadaModalOpen] = useState(false);

  // Estados editables de fenología en Calendario & Tareas
  const [fenParcelaFiltro, setFenParcelaFiltro] = useState<string>('todos');
  const [confirmFenResetMode, setConfirmFenResetMode] = useState<'none' | 'template' | 'clear'>('none');
  const [confirmDeleteFenId, setConfirmDeleteFenId] = useState<string | null>(null);
  const [isFenModalOpen, setIsFenModalOpen] = useState(false);
  const [editingFenId, setEditingFenId] = useState<string | null>(null);
  const [editingCuartelId, setEditingCuartelId] = useState<string | null>(null);
  const [cuartelEstadoDraft, setCuartelEstadoDraft] = useState('');
  const [cuartelFechaDraft, setCuartelFechaDraft] = useState('');

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

  const todayISO = () => new Date().toISOString().split('T')[0];

  const [fenForm, setFenForm] = useState<{
    fecha: string;
    fechaFin: string;
    parcelaId: string;
    escalaBBCH: string;
    nombreEtapa: string;
    estadoDescripcion: string;
    estadoEtapa: 'programado' | 'en_curso' | 'completado';
    porcentajeAvance: number;
    observaciones: string;
    sincronizarCuartel: boolean;
  }>({
    fecha: todayISO(),
    fechaFin: todayISO(),
    parcelaId: 'general',
    escalaBBCH: 'BBCH 65',
    nombreEtapa: 'Plena floración',
    estadoDescripcion: 'Plena floración en cuartel',
    estadoEtapa: 'en_curso',
    porcentajeAvance: 50,
    observaciones: '',
    sincronizarCuartel: false,
  });

  const fenologiaOrdenada = useMemo(() => {
    return [...fenologia]
      .filter((f) => (fenParcelaFiltro === 'todos' ? true : f.parcelaId === fenParcelaFiltro))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [fenologia, fenParcelaFiltro]);

  const handleOpenNewFen = () => {
    const hoy = todayISO();
    const fin = new Date(`${hoy}T12:00:00`);
    fin.setDate(fin.getDate() + 14);
    setEditingFenId(null);
    setFenForm({
      fecha: hoy,
      fechaFin: fin.toISOString().split('T')[0],
      parcelaId: fenParcelaFiltro !== 'todos' ? fenParcelaFiltro : (parcelas[0]?.id || 'general'),
      escalaBBCH: 'BBCH 65',
      nombreEtapa: 'Plena floración',
      estadoDescripcion: 'Plena floración en cuartel',
      estadoEtapa: 'en_curso',
      porcentajeAvance: 50,
      observaciones: '',
      sincronizarCuartel: false,
    });
    setIsFenModalOpen(true);
  };

  const handleOpenEditFen = (f: SeguimientoFenologico) => {
    setEditingFenId(f.id);
    const sug = BBCH_SUGERENCIAS.find((s) => s.code.toLowerCase() === (f.escalaBBCH || '').toLowerCase());
    setFenForm({
      fecha: f.fecha || todayISO(),
      fechaFin: f.fechaFin || f.fecha || todayISO(),
      parcelaId: f.parcelaId || 'general',
      escalaBBCH: f.escalaBBCH || 'BBCH 65',
      nombreEtapa: f.nombreEtapa || sug?.nombre || '',
      estadoDescripcion: f.estadoDescripcion || '',
      estadoEtapa: resolveEstadoEtapa(f),
      porcentajeAvance: f.porcentajeAvance ?? 50,
      observaciones: f.observaciones || '',
      sincronizarCuartel: false,
    });
    setIsFenModalOpen(true);
  };

  const handleSaveFen = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parcelas.find((item) => item.id === fenForm.parcelaId);
    const nombreCuartel = fenForm.parcelaId === 'general' ? 'Huerto General' : (p ? p.nombre : 'Huerto General');
    const nombreFinal = fenForm.nombreEtapa.trim() || fenForm.escalaBBCH.trim();
    const payload: SeguimientoFenologico = {
      id: editingFenId || `fen-${Date.now()}`,
      fecha: fenForm.fecha || todayISO(),
      fechaFin: fenForm.fechaFin || undefined,
      parcelaId: fenForm.parcelaId || 'general',
      parcelaNombre: nombreCuartel,
      escalaBBCH: fenForm.escalaBBCH.trim() || 'Etapa',
      nombreEtapa: nombreFinal,
      estadoDescripcion: fenForm.estadoDescripcion.trim() || nombreFinal,
      estadoEtapa: fenForm.estadoEtapa,
      porcentajeAvance: Number(fenForm.porcentajeAvance) || 0,
      observaciones: fenForm.observaciones.trim(),
    };
    if (editingFenId && onUpdateFenologia) {
      onUpdateFenologia(payload);
    } else if (onAddFenologia) {
      onAddFenologia(payload);
    }
    if (fenForm.sincronizarCuartel && p && onUpdateParcela) {
      onUpdateParcela({
        ...p,
        estadoFenologico: `${payload.escalaBBCH} · ${nombreFinal}`,
        fechaEstadoFenologico: payload.fecha,
      });
    }
    setIsFenModalOpen(false);
    setEditingFenId(null);
  };

  const handleToggleEstadoEtapa = (f: SeguimientoFenologico) => {
    if (!canEdit || !onUpdateFenologia) return;
    const actual = resolveEstadoEtapa(f);
    const nextEstado: 'programado' | 'en_curso' | 'completado' =
      actual === 'programado' ? 'en_curso' : actual === 'en_curso' ? 'completado' : 'programado';
    const nextAvance =
      nextEstado === 'completado' ? 100 : nextEstado === 'programado' ? 0 : (f.porcentajeAvance > 0 && f.porcentajeAvance < 100 ? f.porcentajeAvance : 50);
    onUpdateFenologia({ ...f, estadoEtapa: nextEstado, porcentajeAvance: nextAvance });
  };

  const handleLoadPreformedFen = () => {
    const targetId = fenParcelaFiltro !== 'todos' ? fenParcelaFiltro : 'general';
    const targetParcela = parcelas.find((p) => p.id === targetId);
    const targetNombre = targetId === 'general' ? 'Huerto General' : (targetParcela?.nombre || 'Huerto General');
    const plantilla = buildPreformedFenologiaKiwi(targetId, targetNombre);
    if (onReplaceFenologia) {
      onReplaceFenologia(plantilla);
    } else if (onAddFenologia) {
      plantilla.forEach((item) => onAddFenologia(item));
    }
    setConfirmFenResetMode('none');
  };

  const handleClearFen = () => {
    if (onReplaceFenologia) {
      onReplaceFenologia([]);
    } else if (onDeleteFenologia) {
      fenologia.forEach((item) => onDeleteFenologia(item.id));
    }
    setConfirmFenResetMode('none');
  };

  const handleSaveCuartelEstado = (p: Parcela) => {
    if (!onUpdateParcela) return;
    onUpdateParcela({
      ...p,
      estadoFenologico: cuartelEstadoDraft.trim() || 'Normal',
      fechaEstadoFenologico: cuartelFechaDraft || todayISO(),
    });
    setEditingCuartelId(null);
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
          {/* Cronograma & Estados Fenológicos Editables con Fechas */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-emerald-700" />
                  <span>Estados Fenológicos de Temporada &amp; Fechas ({fenologiaOrdenada.length})</span>
                </h2>
                <p className="text-[11px] text-stone-500">
                  Edita fechas de inicio/término, estado y avance de cada etapa fenológica o carga la planilla estándar de Kiwi Hayward.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={fenParcelaFiltro}
                  onChange={(e) => setFenParcelaFiltro(e.target.value)}
                  className="p-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800"
                >
                  <option value="todos">Todos ({fenologia.length})</option>
                  <option value="general">Huerto General</option>
                  {parcelas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmFenResetMode(confirmFenResetMode === 'template' ? 'none' : 'template')}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Planilla Kiwi (10 etapas)</span>
                    </button>
                    {fenologia.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setConfirmFenResetMode(confirmFenResetMode === 'clear' ? 'none' : 'clear')}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-800 border border-stone-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reiniciar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleOpenNewFen}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nueva Etapa &amp; Fecha</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {confirmFenResetMode !== 'none' && (
              <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                confirmFenResetMode === 'clear'
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <span>
                  {confirmFenResetMode === 'template'
                    ? '¿Cargar planilla fenológica Kiwi Hayward (10 etapas con fechas)? Reemplazará la lista actual.'
                    : `¿Vaciar todas las etapas fenológicas (${fenologia.length}) para iniciar desde cero?`}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={confirmFenResetMode === 'template' ? handleLoadPreformedFen : handleClearFen}
                    className={`px-3 py-1 rounded-lg font-bold text-white cursor-pointer ${
                      confirmFenResetMode === 'clear' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-amber-800 hover:bg-amber-900'
                    }`}
                  >
                    {confirmFenResetMode === 'template' ? 'Sí, Cargar Planilla' : 'Sí, Reiniciar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmFenResetMode('none')}
                    className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white text-stone-700 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Estado actual por cuartel con fecha editable */}
            {parcelas.length > 0 && (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                  Estado Fenológico Actual por Cuartel
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {parcelas.map((p) => {
                    const isEditing = editingCuartelId === p.id;
                    return (
                      <div key={p.id} className="p-2.5 bg-white rounded-xl border border-stone-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-stone-900 truncate">{p.nombre}</span>
                          {canEdit && onUpdateParcela && !isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCuartelId(p.id);
                                setCuartelEstadoDraft(p.estadoFenologico || '');
                                setCuartelFechaDraft(p.fechaEstadoFenologico || todayISO());
                              }}
                              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              <span>Editar</span>
                            </button>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <input
                              type="text"
                              list="plan-bbch-list"
                              value={cuartelEstadoDraft}
                              onChange={(e) => setCuartelEstadoDraft(e.target.value)}
                              placeholder="Ej. BBCH 65 · Plena floración"
                              className="w-full p-1.5 border border-emerald-400 rounded-lg text-xs font-semibold"
                            />
                            <div className="flex items-center gap-1.5">
                              <input
                                type="date"
                                value={cuartelFechaDraft}
                                onChange={(e) => setCuartelFechaDraft(e.target.value)}
                                className="flex-1 p-1 border border-stone-300 rounded-lg text-[11px] font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveCuartelEstado(p)}
                                className="px-2 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Save className="w-3 h-3" />
                                <span>Guardar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCuartelId(null)}
                                className="px-1.5 py-1 border border-stone-300 rounded-lg text-[10px] text-stone-600 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-900 font-semibold">
                            <span className="truncate">{p.estadoFenologico || 'Sin estado definido'}</span>
                            {p.fechaEstadoFenologico && (
                              <span className="font-mono tabular-nums text-[10px] text-stone-500 shrink-0">
                                {p.fechaEstadoFenologico}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <datalist id="plan-bbch-list">
                  {BBCH_SUGERENCIAS.map((s) => (
                    <option key={s.code} value={`${s.code} · ${s.nombre}`} />
                  ))}
                </datalist>
              </div>
            )}

            {fenologiaOrdenada.length === 0 ? (
              <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 text-xs text-stone-500 space-y-2.5">
                <p>No hay etapas fenológicas registradas aún.</p>
                {canEdit && (
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadPreformedFen}
                      className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Cargar Planilla Kiwi (10 etapas)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenNewFen}
                      className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Crear Etapa con Fechas</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {fenologiaOrdenada.map((f) => {
                  const est = resolveEstadoEtapa(f);
                  const estadoLabel = est === 'completado' ? 'Completado' : est === 'en_curso' ? 'En curso' : 'Programado';
                  const estadoBadge =
                    est === 'completado'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                      : est === 'en_curso'
                      ? 'bg-amber-100 text-amber-900 border-amber-200'
                      : 'bg-stone-100 text-stone-700 border-stone-200';
                  return (
                    <div key={f.id} className="p-3.5 bg-stone-50/70 rounded-2xl border border-stone-200 flex flex-col justify-between gap-2.5 text-xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono font-bold text-[10px]">
                            {f.escalaBBCH}
                          </span>
                          <button
                            type="button"
                            disabled={!canEdit || !onUpdateFenologia}
                            onClick={() => handleToggleEstadoEtapa(f)}
                            className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${estadoBadge} ${canEdit && onUpdateFenologia ? 'cursor-pointer hover:opacity-80' : ''}`}
                            title={canEdit ? 'Clic para cambiar estado' : undefined}
                          >
                            {estadoLabel}
                          </button>
                        </div>
                        <div className="font-bold text-stone-900 leading-snug">
                          {f.nombreEtapa || f.estadoDescripcion}
                        </div>
                        <div className="text-[10px] font-mono tabular-nums text-emerald-800 font-bold">
                          {f.fecha}
                          {f.fechaFin && f.fechaFin !== f.fecha ? ` → ${f.fechaFin}` : ''}
                        </div>
                        <div className="text-[10px] text-stone-500 font-semibold">{f.parcelaNombre}</div>
                        <p className="text-[11px] text-stone-500 leading-snug line-clamp-2">
                          {f.estadoDescripcion}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-stone-200/80">
                        <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                          <span>Avance</span>
                          <span className="font-bold text-emerald-800">{f.porcentajeAvance}%</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${est === 'completado' ? 'bg-emerald-600' : est === 'en_curso' ? 'bg-amber-500' : 'bg-stone-400'}`}
                            style={{ width: `${Math.min(100, Math.max(0, f.porcentajeAvance))}%` }}
                          />
                        </div>
                        {canEdit && (
                          <div className="flex items-center justify-between gap-1 pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditFen(f)}
                              className="px-2 py-1 bg-white hover:bg-emerald-50 border border-stone-300 text-emerald-900 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              <span>Editar</span>
                            </button>
                            {confirmDeleteFenId === f.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteFenologia?.(f.id);
                                    setConfirmDeleteFenId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Sí
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteFenId(null)}
                                  className="px-1.5 py-0.5 text-stone-600 text-[10px] cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteFenId(f.id)}
                                className="p-1 text-stone-400 hover:text-rose-700 cursor-pointer"
                                title="Eliminar etapa"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
      {/* Modal Crear / Editar Etapa Fenológica con Fechas */}
      {isFenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingFenId ? 'Editar Estado Fenológico & Fechas' : 'Registrar Estado Fenológico & Fechas'}
              </h3>
              <button type="button" onClick={() => setIsFenModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveFen} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha Inicio:</label>
                  <input
                    type="date"
                    value={fenForm.fecha}
                    onChange={(e) => setFenForm({ ...fenForm, fecha: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha Término:</label>
                  <input
                    type="date"
                    value={fenForm.fechaFin}
                    onChange={(e) => setFenForm({ ...fenForm, fechaFin: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cuartel:</label>
                  <select
                    value={fenForm.parcelaId}
                    onChange={(e) => setFenForm({ ...fenForm, parcelaId: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg font-semibold"
                  >
                    <option value="general">Huerto General</option>
                    {parcelas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Código BBCH:</label>
                  <input
                    type="text"
                    list="plan-modal-bbch"
                    value={fenForm.escalaBBCH}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = BBCH_SUGERENCIAS.find((s) => s.code.toLowerCase() === val.trim().toLowerCase());
                      setFenForm((prev) => ({
                        ...prev,
                        escalaBBCH: val,
                        nombreEtapa: match ? match.nombre : prev.nombreEtapa,
                        estadoDescripcion: match ? match.descripcion : prev.estadoDescripcion,
                      }));
                    }}
                    className="w-full p-2 border border-stone-300 rounded-lg font-mono font-bold"
                    required
                  />
                  <datalist id="plan-modal-bbch">
                    {BBCH_SUGERENCIAS.map((s) => (
                      <option key={s.code} value={s.code}>{s.nombre}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre de Etapa:</label>
                  <input
                    type="text"
                    value={fenForm.nombreEtapa}
                    onChange={(e) => setFenForm({ ...fenForm, nombreEtapa: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Estado:</label>
                  <select
                    value={fenForm.estadoEtapa}
                    onChange={(e) => {
                      const next = e.target.value as 'programado' | 'en_curso' | 'completado';
                      setFenForm((prev) => ({
                        ...prev,
                        estadoEtapa: next,
                        porcentajeAvance: next === 'completado' ? 100 : next === 'programado' ? 0 : (prev.porcentajeAvance || 50),
                      }));
                    }}
                    className="w-full p-2 border border-stone-300 rounded-lg font-semibold"
                  >
                    <option value="programado">Programado</option>
                    <option value="en_curso">En curso</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">% Avance:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={fenForm.porcentajeAvance}
                    onChange={(e) => setFenForm({ ...fenForm, porcentajeAvance: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Descripción Técnica:</label>
                <textarea
                  rows={2}
                  value={fenForm.estadoDescripcion}
                  onChange={(e) => setFenForm({ ...fenForm, estadoDescripcion: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded-lg"
                  required
                />
              </div>

              {fenForm.parcelaId !== 'general' && onUpdateParcela && (
                <label className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-semibold text-emerald-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fenForm.sincronizarCuartel}
                    onChange={(e) => setFenForm({ ...fenForm, sincronizarCuartel: e.target.checked })}
                    className="w-4 h-4 text-emerald-700 rounded cursor-pointer"
                  />
                  <span>Actualizar también el estado fenológico actual del cuartel seleccionado</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button type="button" onClick={() => setIsFenModalOpen(false)} className="px-4 py-2 border border-stone-300 rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer">
                  {editingFenId ? 'Actualizar Etapa' : 'Guardar Etapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
