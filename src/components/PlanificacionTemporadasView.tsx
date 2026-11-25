import React, { useMemo, useState } from 'react';
import {
  CategoriaTareaHuerto,
  CondicionHorasFrio,
  EstadoFenologicoCatalogo,
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
  buildPreformedFenologiaKiwi,
  combinarCatalogoFenologico,
  formatEstadoFenologicoLabel,
  parseEstadoFenologicoTexto,
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
  BellOff,
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
  onDismissLowStockAlert?: (insumoId: string) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  fenologia?: SeguimientoFenologico[];
  onAddFenologia?: (f: SeguimientoFenologico) => void;
  onUpdateFenologia?: (f: SeguimientoFenologico) => void;
  onDeleteFenologia?: (id: string) => void;
  onReplaceFenologia?: (list: SeguimientoFenologico[]) => void;
  onUpdateParcela?: (p: Parcela) => void;
  estadosFenologicosPersonalizados?: EstadoFenologicoCatalogo[];
  onAddEstadoFenologicoCustom?: (item: EstadoFenologicoCatalogo) => void;
  onDeleteEstadoFenologicoCustom?: (id: string) => void;
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
  onDismissLowStockAlert,
  onNavigateTab,
  fenologia = [],
  onAddFenologia,
  onUpdateFenologia,
  onDeleteFenologia,
  onReplaceFenologia,
  onUpdateParcela,
  estadosFenologicosPersonalizados = [],
  onAddEstadoFenologicoCustom,
  onDeleteEstadoFenologicoCustom,
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
  const [isCatalogoFormOpen, setIsCatalogoFormOpen] = useState(false);
  const [nuevoCatCode, setNuevoCatCode] = useState('');
  const [nuevoCatNombre, setNuevoCatNombre] = useState('');
  const [nuevoCatDesc, setNuevoCatDesc] = useState('');

  const catalogoEstados = useMemo(
    () => combinarCatalogoFenologico(estadosFenologicosPersonalizados, fenologia, parcelas),
    [estadosFenologicosPersonalizados, fenologia, parcelas]
  );

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
    guardarEnCatalogo: boolean;
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
    guardarEnCatalogo: false,
  });

  const fenologiaOrdenada = useMemo(() => {
    return [...fenologia]
      .filter((f) => (fenParcelaFiltro === 'todos' ? true : f.parcelaId === fenParcelaFiltro))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [fenologia, fenParcelaFiltro]);

  const guardarEstadoCatalogoSiNoExiste = (codeRaw: string, nombreRaw: string, descRaw?: string) => {
    if (!onAddEstadoFenologicoCustom) return;
    const code = (codeRaw || 'PERS').trim() || 'PERS';
    const nombre = (nombreRaw || '').trim();
    if (!nombre) return;
    const yaExiste = catalogoEstados.some(
      (c) =>
        c.nombre.trim().toLowerCase() === nombre.toLowerCase() &&
        c.code.trim().toLowerCase() === code.toLowerCase()
    );
    if (yaExiste) return;
    onAddEstadoFenologicoCustom({
      id: `efp-${Date.now()}`,
      code,
      nombre,
      descripcion: descRaw?.trim() || undefined,
    });
  };

  const handleCreateCustomCatalogoItem = (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = nuevoCatNombre.trim();
    if (!nombre || !onAddEstadoFenologicoCustom) return;
    const code = nuevoCatCode.trim() || `ET-${estadosFenologicosPersonalizados.length + 1}`;
    guardarEstadoCatalogoSiNoExiste(code, nombre, nuevoCatDesc);
    setNuevoCatCode('');
    setNuevoCatNombre('');
    setNuevoCatDesc('');
    setIsCatalogoFormOpen(false);
  };

  const handleOpenNewFen = (preset?: { escalaBBCH?: string; nombreEtapa?: string; estadoDescripcion?: string }) => {
    const hoy = todayISO();
    const fin = new Date(`${hoy}T12:00:00`);
    fin.setDate(fin.getDate() + 14);
    setEditingFenId(null);
    setFenForm({
      fecha: hoy,
      fechaFin: fin.toISOString().split('T')[0],
      parcelaId: fenParcelaFiltro !== 'todos' ? fenParcelaFiltro : (parcelas[0]?.id || 'general'),
      escalaBBCH: preset?.escalaBBCH || 'BBCH 65',
      nombreEtapa: preset?.nombreEtapa || 'Plena floración',
      estadoDescripcion: preset?.estadoDescripcion || 'Plena floración en cuartel',
      estadoEtapa: 'en_curso',
      porcentajeAvance: 50,
      observaciones: '',
      sincronizarCuartel: false,
      guardarEnCatalogo: false,
    });
    setIsFenModalOpen(true);
  };

  const handleOpenEditFen = (f: SeguimientoFenologico) => {
    setEditingFenId(f.id);
    const sug = catalogoEstados.find((s) => s.code.toLowerCase() === (f.escalaBBCH || '').toLowerCase());
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
      guardarEnCatalogo: false,
    });
    setIsFenModalOpen(true);
  };

  const persistirFenologia = (keepOpenForNext: boolean) => {
    const p = parcelas.find((item) => item.id === fenForm.parcelaId);
    const nombreCuartel = fenForm.parcelaId === 'general' ? 'Huerto General' : (p ? p.nombre : 'Huerto General');
    const sug = catalogoEstados.find((s) => s.code.toLowerCase() === fenForm.escalaBBCH.trim().toLowerCase());
    const nombreFinal = fenForm.nombreEtapa.trim() || sug?.nombre || fenForm.escalaBBCH.trim();
    const escalaFinal = fenForm.escalaBBCH.trim() || 'PERS';
    const payload: SeguimientoFenologico = {
      id: editingFenId || `fen-${Date.now()}`,
      fecha: fenForm.fecha || todayISO(),
      fechaFin: fenForm.fechaFin || undefined,
      parcelaId: fenForm.parcelaId || 'general',
      parcelaNombre: nombreCuartel,
      escalaBBCH: escalaFinal,
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
    if (fenForm.guardarEnCatalogo) {
      guardarEstadoCatalogoSiNoExiste(escalaFinal, nombreFinal, payload.estadoDescripcion);
    }
    if (fenForm.sincronizarCuartel && p && onUpdateParcela) {
      onUpdateParcela({
        ...p,
        estadoFenologico: formatEstadoFenologicoLabel(escalaFinal, nombreFinal),
        fechaEstadoFenologico: payload.fecha,
      });
    }
    if (keepOpenForNext) {
      const hoy = todayISO();
      const fin = new Date(`${hoy}T12:00:00`);
      fin.setDate(fin.getDate() + 14);
      setEditingFenId(null);
      setFenForm({
        fecha: hoy,
        fechaFin: fin.toISOString().split('T')[0],
        parcelaId: fenForm.parcelaId,
        escalaBBCH: '',
        nombreEtapa: '',
        estadoDescripcion: '',
        estadoEtapa: 'programado',
        porcentajeAvance: 0,
        observaciones: '',
        sincronizarCuartel: false,
        guardarEnCatalogo: true,
      });
    } else {
      setIsFenModalOpen(false);
      setEditingFenId(null);
    }
  };

  const handleSaveFen = (e: React.FormEvent) => {
    e.preventDefault();
    persistirFenologia(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Calendar className="w-3 h-3" />
            Planificación Anual & Evolución Histórica
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Multi-Temporada, Calendario & Alertas Proactivas
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Compara campañas año a año, coordina el calendario agronómico del equipo y resuelve alertas tempranas del predio.
          </p>
        </div>

        <div className="p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold flex flex-wrap">
          <button
            type="button"
            onClick={() => setSubTab('temporadas')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer ${
              subTab === 'temporadas' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Comparador Temporadas
          </button>
          <button
            type="button"
            onClick={() => setSubTab('calendario')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer ${
              subTab === 'calendario' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Calendario & Tareas ({tareasHuerto.filter((t) => t.estado !== 'Completada').length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('alertas')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 ${
              subTab === 'alertas' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 dark:text-stone-400'
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
            <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
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
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
              <div className="text-xs font-bold text-stone-800 dark:text-stone-200">Horas Frío (&lt;7.2°C)</div>
              {todasTemporadas.map((t) => (
                <div key={`hf-${t.id}`} className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">{t.temporada}</span>
                    <span className="font-mono font-bold text-sky-900 dark:text-sky-200">{t.horasFrioTotales} HF</span>
                  </div>
                  <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-600 rounded-full" style={{ width: `${(t.horasFrioTotales / maxHF) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
              <div className="text-xs font-bold text-stone-800 dark:text-stone-200">Grados Día (°D)</div>
              {todasTemporadas.map((t) => (
                <div key={`gd-${t.id}`} className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">{t.temporada}</span>
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-300">{t.gradosDiaTotales} °D</span>
                  </div>
                  <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(t.gradosDiaTotales / maxGD) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
              <div className="text-xs font-bold text-stone-800 dark:text-stone-200">Rendimiento (Ton / Ha)</div>
              {todasTemporadas.map((t) => (
                <div key={`ton-${t.id}`} className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="font-semibold text-stone-700 dark:text-stone-300">{t.temporada}</span>
                    <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200">{t.cosechaTonHa} ton/ha</span>
                  </div>
                  <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-700 rounded-full" style={{ width: `${(t.cosechaTonHa / maxTon) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla Completa */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold uppercase text-[10px]">
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
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono">
                  {todasTemporadas.map((t) => (
                    <tr key={t.id} className={t.id === 'actual-vivo' ? 'bg-emerald-50/50 dark:bg-emerald-950/35' : 'hover:bg-stone-50 dark:hover:bg-stone-800/60'}>
                      <td className="px-4 py-3 font-sans font-bold text-stone-900 dark:text-stone-100">{t.temporada}</td>
                      <td className="px-4 py-3">{t.horasFrioTotales} HF</td>
                      <td className="px-4 py-3">{t.gradosDiaTotales} °D</td>
                      <td className="px-4 py-3">{t.aguaConsumidaM3Ha.toLocaleString('es-CL')} m³/ha</td>
                      <td className="px-4 py-3">{t.porcentajeCuajaPromedio}%</td>
                      <td className="px-4 py-3 font-bold text-emerald-900 dark:text-emerald-200">{t.cosechaTonHa} t/ha</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right font-sans">
                          {t.id !== 'actual-vivo' ? (
                            <button
                              type="button"
                              onClick={() => onDeleteResumenTemporada(t.id)}
                              className="p-1 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Auto</span>
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
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Estados Fenológicos de Temporada &amp; Fechas ({fenologiaOrdenada.length})</span>
                </h2>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Edita fechas de inicio/término, estado y avance de cada etapa fenológica o carga la planilla estándar de Kiwi Hayward.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={fenParcelaFiltro}
                  onChange={(e) => setFenParcelaFiltro(e.target.value)}
                  className="p-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-800 dark:text-stone-200"
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
                      className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Planilla Kiwi (10 etapas)</span>
                    </button>
                    {fenologia.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setConfirmFenResetMode(confirmFenResetMode === 'clear' ? 'none' : 'clear')}
                        className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-stone-700 dark:text-stone-300 hover:text-rose-800 dark:hover:text-rose-300 border border-stone-200 dark:border-stone-800 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reiniciar</span>
                      </button>
                    )}
                    {canEdit && onAddEstadoFenologicoCustom && (
                      <button
                        type="button"
                        onClick={() => setIsCatalogoFormOpen((v) => !v)}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isCatalogoFormOpen ? 'Cerrar Catálogo' : 'Nuevo Estado al Catálogo'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenNewFen()}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nueva Etapa &amp; Fecha</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {isCatalogoFormOpen && canEdit && onAddEstadoFenologicoCustom && (
              <form
                onSubmit={handleCreateCustomCatalogoItem}
                className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs items-end"
              >
                <div className="sm:col-span-3">
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Código / Sigla:</label>
                  <input
                    type="text"
                    value={nuevoCatCode}
                    onChange={(e) => setNuevoCatCode(e.target.value)}
                    placeholder="Ej. BBCH 07 o Lloro"
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nombre del Estado Fenológico:</label>
                  <input
                    type="text"
                    value={nuevoCatNombre}
                    onChange={(e) => setNuevoCatNombre(e.target.value)}
                    placeholder="Ej. Yema algodonosa / Cuaja inicial"
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-semibold dark:text-stone-100"
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Descripción (opcional):</label>
                  <input
                    type="text"
                    value={nuevoCatDesc}
                    onChange={(e) => setNuevoCatDesc(e.target.value)}
                    placeholder="Detalle técnico..."
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Guardar Estado
                  </button>
                </div>
              </form>
            )}

            {estadosFenologicosPersonalizados.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="font-bold text-stone-500 dark:text-stone-400 uppercase text-[10px] mr-1">Estados propios:</span>
                {estadosFenologicosPersonalizados.map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-lg"
                  >
                    <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200">{item.code}</span>
                    <span className="text-stone-800 dark:text-stone-200 font-semibold">{item.nombre}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenNewFen({
                            escalaBBCH: item.code,
                            nombreEtapa: item.nombre,
                            estadoDescripcion: item.descripcion || item.nombre,
                          })
                        }
                        className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-100 font-bold underline text-[10px] cursor-pointer ml-1"
                        title="Registrar etapa con fechas usando este estado"
                      >
                        + Fecha
                      </button>
                    )}
                    {canEdit && onDeleteEstadoFenologicoCustom && (
                      <button
                        type="button"
                        onClick={() => onDeleteEstadoFenologicoCustom(item.id)}
                        className="text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer"
                        title="Quitar estado personalizado del catálogo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {confirmFenResetMode !== 'none' && (
              <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                confirmFenResetMode === 'clear'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-100'
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
                    className="px-2.5 py-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Estado actual por cuartel con fecha editable */}
            {parcelas.length > 0 && (
              <div className="p-3 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  Estado Fenológico Actual por Cuartel
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {parcelas.map((p) => {
                    const isEditing = editingCuartelId === p.id;
                    const draftEnCatalogo = catalogoEstados.some(
                      (c) =>
                        formatEstadoFenologicoLabel(c.code, c.nombre).toLowerCase() ===
                          cuartelEstadoDraft.trim().toLowerCase() ||
                        c.nombre.toLowerCase() === cuartelEstadoDraft.trim().toLowerCase()
                    );
                    return (
                      <div key={p.id} className="p-2.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-stone-900 dark:text-stone-100 truncate">{p.nombre}</span>
                          {canEdit && onUpdateParcela && !isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCuartelId(p.id);
                                setCuartelEstadoDraft(p.estadoFenologico || '');
                                setCuartelFechaDraft(p.fechaEstadoFenologico || todayISO());
                              }}
                              className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/80 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                              <span>Editar</span>
                            </button>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <select
                              value={
                                catalogoEstados.some(
                                  (s) => formatEstadoFenologicoLabel(s.code, s.nombre) === cuartelEstadoDraft
                                )
                                  ? cuartelEstadoDraft
                                  : ''
                              }
                              onChange={(e) => {
                                if (e.target.value) setCuartelEstadoDraft(e.target.value);
                              }}
                              className="w-full p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs text-stone-700 dark:text-stone-300"
                            >
                              <option value="">Seleccionar de la lista o escribir abajo...</option>
                              {catalogoEstados.map((s) => {
                                const label = formatEstadoFenologicoLabel(s.code, s.nombre);
                                return (
                                  <option key={s.id} value={label}>
                                    {label}
                                  </option>
                                );
                              })}
                            </select>
                            <input
                              type="text"
                              list="plan-bbch-list"
                              value={cuartelEstadoDraft}
                              onChange={(e) => setCuartelEstadoDraft(e.target.value)}
                              placeholder="O escribe cualquier estado fenológico nuevo..."
                              className="w-full p-1.5 border border-emerald-400 dark:border-emerald-600 rounded-lg text-xs font-semibold bg-white dark:bg-stone-800 dark:text-stone-100"
                            />
                            {onAddEstadoFenologicoCustom && cuartelEstadoDraft.trim() && !draftEnCatalogo && (
                              <button
                                type="button"
                                onClick={() => {
                                  const parsed = parseEstadoFenologicoTexto(cuartelEstadoDraft);
                                  guardarEstadoCatalogoSiNoExiste(parsed.code, parsed.nombre);
                                }}
                                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                              >
                                + Guardar &quot;{cuartelEstadoDraft.trim()}&quot; en el catálogo
                              </button>
                            )}
                            <div className="flex items-center gap-1.5">
                              <input
                                type="date"
                                value={cuartelFechaDraft}
                                onChange={(e) => setCuartelFechaDraft(e.target.value)}
                                className="flex-1 p-1 border border-stone-300 dark:border-stone-700 rounded-lg text-[11px] font-mono bg-white dark:bg-stone-800 dark:text-stone-100"
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
                                className="px-1.5 py-1 border border-stone-300 dark:border-stone-700 rounded-lg text-[10px] text-stone-600 dark:text-stone-400 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-900 dark:text-emerald-200 font-semibold">
                            <span className="truncate">{p.estadoFenologico || 'Sin estado definido'}</span>
                            {p.fechaEstadoFenologico && (
                              <span className="font-mono tabular-nums text-[10px] text-stone-500 dark:text-stone-400 shrink-0">
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
                  {catalogoEstados.map((s) => (
                    <option key={s.id} value={formatEstadoFenologicoLabel(s.code, s.nombre)} />
                  ))}
                </datalist>
              </div>
            )}

            {fenologiaOrdenada.length === 0 ? (
              <div className="p-6 text-center bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-xs text-stone-500 dark:text-stone-400 space-y-2.5">
                <p>No hay etapas fenológicas registradas aún.</p>
                {canEdit && (
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleLoadPreformedFen}
                      className="px-3.5 py-1.5 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-950 dark:text-amber-100 rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Cargar Planilla Kiwi (10 etapas)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenNewFen()}
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
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/80'
                      : est === 'en_curso'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/80'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800';
                  return (
                    <div key={f.id} className="p-3.5 bg-stone-50/70 dark:bg-stone-800/70 rounded-2xl border border-stone-200 dark:border-stone-800 flex flex-col justify-between gap-2.5 text-xs">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-mono font-bold text-[10px]">
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
                        <div className="font-bold text-stone-900 dark:text-stone-100 leading-snug">
                          {f.nombreEtapa || f.estadoDescripcion}
                        </div>
                        <div className="text-[10px] font-mono tabular-nums text-emerald-800 dark:text-emerald-300 font-bold">
                          {f.fecha}
                          {f.fechaFin && f.fechaFin !== f.fecha ? ` → ${f.fechaFin}` : ''}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold">{f.parcelaNombre}</div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug line-clamp-2">
                          {f.estadoDescripcion}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-stone-200/80 dark:border-stone-800">
                        <div className="flex justify-between text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                          <span>Avance</span>
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">{f.porcentajeAvance}%</span>
                        </div>
                        <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-1.5">
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
                              className="px-2 py-1 bg-white dark:bg-stone-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-stone-300 dark:border-stone-700 text-emerald-900 dark:text-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
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
                                  className="px-1.5 py-0.5 text-stone-600 dark:text-stone-400 text-[10px] cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteFenId(f.id)}
                                className="p-1 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer"
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
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {(['todas', 'Pendiente', 'En curso', 'Completada'] as const).map((est) => (
                  <button
                    key={est}
                    type="button"
                    onClick={() => setFiltroEstado(est)}
                    className={`px-3 py-1 rounded-lg font-bold cursor-pointer ${
                      filtroEstado === est ? 'bg-stone-900 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
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
              <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400">
                No hay tareas programadas en esta vista. Planifica podas, aplicaciones, calibraciones o muestreos para tu equipo.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {tareasFiltradas.map((t) => {
                  const siguienteEstado: Record<TareaAgronomica['estado'], TareaAgronomica['estado']> = {
                    Pendiente: 'En curso',
                    'En curso': 'Completada',
                    Completada: 'Pendiente',
                  };
                  return (
                    <div key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-stone-50 dark:hover:bg-stone-800/70">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-stone-500 dark:text-stone-400">{t.fechaLimite}</span>
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-[10px]">
                            {t.categoria}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.prioridad === 'Alta'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                : t.prioridad === 'Media'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            Prioridad {t.prioridad}
                          </span>
                        </div>
                        <div className={`font-bold text-sm ${t.estado === 'Completada' ? 'line-through text-stone-400' : 'text-stone-900 dark:text-stone-100'}`}>
                          {t.titulo}
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400">
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
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : t.estado === 'En curso'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
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
                            className="p-1.5 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer"
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
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-rose-700 dark:text-rose-400" />
              Centro de Alertas Proactivas del Huerto
            </h2>
            <span className="text-xs text-stone-500 dark:text-stone-400">{alertasProactivas.length} alertas activas</span>
          </div>

          {alertasProactivas.length === 0 ? (
            <div className="p-8 text-center text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold">Todo al día en tu huerto</p>
              <p className="text-stone-500 dark:text-stone-400">Sin vencimientos de bodega, carnets SAG, calibraciones ni tareas atrasadas.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {alertasProactivas.map((a) => (
                <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-stone-50 dark:hover:bg-stone-800/70">
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {a.categoria}
                        </span>
                        <span className="font-bold text-stone-900 dark:text-stone-100">{a.titulo}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">{a.detalle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {a.insumoId && canEdit && onDismissLowStockAlert && (
                      <button
                        type="button"
                        onClick={() => onDismissLowStockAlert(a.insumoId!)}
                        className="px-2.5 py-1.5 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Eliminar esta notificación de stock bajo (mantiene el producto en bodega)"
                      >
                        <BellOff className="w-3 h-3" />
                        <span>Eliminar aviso</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigateTab(a.tabDestino)}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Resolver</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Nueva Tarea */}
      {isTareaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Programar Nueva Tarea Agronómica</h3>
              <button type="button" onClick={() => setIsTareaModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveTarea} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Título de la Tarea:</label>
                <input type="text" value={tareaForm.titulo} onChange={(e) => setTareaForm({ ...tareaForm, titulo: e.target.value })} placeholder="Ej. Revisar boquillas nebulizador antes de floración" className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Categoría:</label>
                  <select value={tareaForm.categoria} onChange={(e) => setTareaForm({ ...tareaForm, categoria: e.target.value as CategoriaTareaHuerto })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100">
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
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha Límite:</label>
                  <input type="date" value={tareaForm.fechaLimite} onChange={(e) => setTareaForm({ ...tareaForm, fechaLimite: e.target.value })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Cuartel:</label>
                  <select value={tareaForm.parcelaId} onChange={(e) => setTareaForm({ ...tareaForm, parcelaId: e.target.value })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100">
                    <option value="">Todo el Predio</option>
                    {parcelas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Responsable:</label>
                  <input type="text" value={tareaForm.responsable} onChange={(e) => setTareaForm({ ...tareaForm, responsable: e.target.value })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Prioridad:</label>
                  <select value={tareaForm.prioridad} onChange={(e) => setTareaForm({ ...tareaForm, prioridad: e.target.value as TareaAgronomica['prioridad'] })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100">
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Observaciones:</label>
                <textarea rows={2} value={tareaForm.observaciones} onChange={(e) => setTareaForm({ ...tareaForm, observaciones: e.target.value })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button type="button" onClick={() => setIsTareaModalOpen(false)} className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer">Crear Tarea</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Temporada Histórica */}
      {isTemporadaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Resumen de Temporada Histórica</h3>
              <button type="button" onClick={() => setIsTemporadaModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveTemporada} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Temporada (ej. 2024-2025):</label>
                <input type="text" value={tempForm.temporada} onChange={(e) => setTempForm({ ...tempForm, temporada: e.target.value })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold bg-white dark:bg-stone-800 dark:text-stone-100" required />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Horas Frío (HF):</label>
                  <input type="number" value={tempForm.horasFrioTotales} onChange={(e) => setTempForm({ ...tempForm, horasFrioTotales: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Grados Día (°D):</label>
                  <input type="number" value={tempForm.gradosDiaTotales} onChange={(e) => setTempForm({ ...tempForm, gradosDiaTotales: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Agua (m³/ha):</label>
                  <input type="number" value={tempForm.aguaConsumidaM3Ha} onChange={(e) => setTempForm({ ...tempForm, aguaConsumidaM3Ha: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">% Cuaja Prom.:</label>
                  <input type="number" step="0.1" value={tempForm.porcentajeCuajaPromedio} onChange={(e) => setTempForm({ ...tempForm, porcentajeCuajaPromedio: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Cosecha (Ton/ha):</label>
                  <input type="number" step="0.1" value={tempForm.cosechaTonHa} onChange={(e) => setTempForm({ ...tempForm, cosechaTonHa: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Notas Campaña:</label>
                  <input type="text" value={tempForm.observaciones} onChange={(e) => setTempForm({ ...tempForm, observaciones: e.target.value })} placeholder="Opcional" className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button type="button" onClick={() => setIsTemporadaModalOpen(false)} className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer">Guardar Temporada</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Crear / Editar Etapa Fenológica con Fechas */}
      {isFenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[90vh] flex flex-col">
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
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha Inicio:</label>
                  <input
                    type="date"
                    value={fenForm.fecha}
                    onChange={(e) => setFenForm({ ...fenForm, fecha: e.target.value })}
                    className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg font-mono bg-white dark:bg-stone-800 dark:text-stone-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha Término:</label>
                  <input
                    type="date"
                    value={fenForm.fechaFin}
                    onChange={(e) => setFenForm({ ...fenForm, fechaFin: e.target.value })}
                    className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg font-mono bg-white dark:bg-stone-800 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Cuartel:</label>
                  <select
                    value={fenForm.parcelaId}
                    onChange={(e) => setFenForm({ ...fenForm, parcelaId: e.target.value })}
                    className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg font-semibold bg-white dark:bg-stone-800 dark:text-stone-100"
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
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Código / Escala BBCH o Personalizado:</label>
                  <input
                    type="text"
                    list="plan-modal-bbch"
                    value={fenForm.escalaBBCH}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = catalogoEstados.find((s) => s.code.toLowerCase() === val.trim().toLowerCase());
                      setFenForm((prev) => ({
                        ...prev,
                        escalaBBCH: val,
                        nombreEtapa: match ? match.nombre : prev.nombreEtapa,
                        estadoDescripcion: match?.descripcion || prev.estadoDescripcion,
                      }));
                    }}
                    placeholder="Ej. BBCH 65 o Etapa personalizada"
                    className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold bg-white dark:bg-stone-800 dark:text-stone-100"
                    required
                  />
                  <datalist id="plan-modal-bbch">
                    {catalogoEstados.map((s) => (
                      <option key={s.id} value={s.code}>{s.nombre}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nombre de Etapa:</label>
                  <input
                    type="text"
                    value={fenForm.nombreEtapa}
                    onChange={(e) => setFenForm({ ...fenForm, nombreEtapa: e.target.value })}
                    placeholder="Ej. Plena floración, Lloro de savia..."
                    className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg font-semibold bg-white dark:bg-stone-800 dark:text-stone-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Estado:</label>
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
                    className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg font-semibold bg-white dark:bg-stone-800 dark:text-stone-100"
                  >
                    <option value="programado">Programado</option>
                    <option value="en_curso">En curso</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">% Avance:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={fenForm.porcentajeAvance}
                    onChange={(e) => setFenForm({ ...fenForm, porcentajeAvance: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg font-mono bg-white dark:bg-stone-800 dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Descripción Técnica:</label>
                <textarea
                  rows={2}
                  value={fenForm.estadoDescripcion}
                  onChange={(e) => setFenForm({ ...fenForm, estadoDescripcion: e.target.value })}
                  className="w-full p-2 border border-stone-300 dark:border-stone-700 rounded-lg bg-white dark:bg-stone-800 dark:text-stone-100"
                  required
                />
              </div>

              {onAddEstadoFenologicoCustom && (
                <label className="flex items-center gap-2 p-2.5 bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 rounded-xl text-[11px] font-semibold text-stone-800 dark:text-stone-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fenForm.guardarEnCatalogo}
                    onChange={(e) => setFenForm({ ...fenForm, guardarEnCatalogo: e.target.checked })}
                    className="w-4 h-4 text-emerald-700 dark:text-emerald-400 rounded cursor-pointer bg-white dark:bg-stone-800"
                  />
                  <span>Guardar este estado en el catálogo para reutilizarlo en otros cuarteles</span>
                </label>
              )}

              {fenForm.parcelaId !== 'general' && onUpdateParcela && (
                <label className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-[11px] font-semibold text-emerald-950 dark:text-emerald-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fenForm.sincronizarCuartel}
                    onChange={(e) => setFenForm({ ...fenForm, sincronizarCuartel: e.target.checked })}
                    className="w-4 h-4 text-emerald-700 dark:text-emerald-400 rounded cursor-pointer bg-white dark:bg-stone-800"
                  />
                  <span>Actualizar también el estado fenológico actual del cuartel seleccionado</span>
                </label>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button type="button" onClick={() => setIsFenModalOpen(false)} className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-xl cursor-pointer">Cancelar</button>
                {!editingFenId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!fenForm.nombreEtapa.trim() && !fenForm.escalaBBCH.trim()) return;
                      persistirFenologia(true);
                    }}
                    className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold rounded-xl cursor-pointer"
                  >
                    Guardar y Agregar Otro
                  </button>
                )}
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
