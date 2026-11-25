import React from 'react';
import { 
  ExplotacionAgricola, 
  Parcela, 
  RegistroLabor, 
  InsumoInventario, 
  RegistroExtraccionPozo,
  ClimaCondiciones,
  UsuarioPredio,
  TipoLabor,
  CondicionHorasFrio,
  SeguimientoFenologico,
  OrdenTrabajoFitosanitaria
} from '../types/campo';
import { 
  Compass, 
  Apple, 
  Snowflake, 
  Package, 
  Droplet, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Plus, 
  FileText, 
  Wind, 
  Thermometer, 
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  FileCheck2,
  Trash2,
  Edit2,
  Flame,
  FlaskConical,
  ShieldCheck,
  QrCode,
  CalendarClock,
  BellOff,
  Sun
} from 'lucide-react';
import { ActiveTab } from './Navbar';
import { AlertaProactivaHuerto, isInsumoStockBajoActivo } from '../utils/alertasHuerto';
import {
  calcularGradosDiaPeriodo,
  estimarEtapaKiwiPorFrioYGradosDia,
  normalizarCondicionHorasFrio,
} from '../utils/agroClimaCalculos';
import { obtenerEtapaFenologicaActiva } from '../utils/fenologiaHelper';
import { clasificarRiesgoUv } from '../utils/uvAlertas';

interface DashboardViewProps {
  explotacion: ExplotacionAgricola;
  parcelas: Parcela[];
  labores: RegistroLabor[];
  inventario: InsumoInventario[];
  registrosPozo: RegistroExtraccionPozo[];
  clima: ClimaCondiciones;
  horasFrio?: CondicionHorasFrio;
  usuarios: UsuarioPredio[];
  activeUserId: string;
  onOpenNewLaborWithDefaults: (parcelaId?: string, tipoLabor?: TipoLabor) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onEditExplotacion: () => void;
  onOpenAlertsModal: () => void;
  onEditLabor: (labor: RegistroLabor) => void;
  onDeleteLabor: (id: string) => void;
  canEdit?: boolean;
  canEditTabFn?: (tab: ActiveTab) => boolean;
  isAdmin?: boolean;
  alertasProactivas?: AlertaProactivaHuerto[];
  onDismissLowStockAlert?: (insumoId: string) => void;
  fenologia?: SeguimientoFenologico[];
  ordenesTrabajo?: OrdenTrabajoFitosanitaria[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  explotacion,
  parcelas,
  labores,
  inventario,
  registrosPozo,
  clima,
  horasFrio,
  usuarios,
  activeUserId,
  onOpenNewLaborWithDefaults,
  onNavigateTab,
  onEditExplotacion,
  onOpenAlertsModal,
  onEditLabor,
  onDeleteLabor,
  canEdit = true,
  canEditTabFn,
  isAdmin = true,
  alertasProactivas = [],
  onDismissLowStockAlert,
  fenologia = [],
  ordenesTrabajo = []
}) => {
  const canEditFor = (tab: ActiveTab) => (canEditTabFn ? canEditTabFn(tab) : canEdit);
  const canEditLabores = canEditFor('labores');
  const canEditFenologia = canEditFor('fenologia');
  const totalHectareas = parcelas.reduce((acc, p) => acc + p.superficieHa, 0);
  const lowStockItems = inventario.filter(isInsumoStockBajoActivo);
  const parcelasEnCarencia = parcelas.filter((p) => p.estadoActual === 'En Carencia SAG');
  const hfNorm = normalizarCondicionHorasFrio(horasFrio);
  const hfAcumuladas = hfNorm.totalAcumuladoHF ?? 0;
  const hfMeta = hfNorm.metaVariedadHF ?? 850;
  const hfPct = hfMeta > 0 ? Math.min(100, (hfAcumuladas / hfMeta) * 100) : 0;
  const gdAcumulados = hfNorm.totalAcumuladoGD ?? 0;
  const gdMeta = hfNorm.metaVariedadGD ?? 1850;
  const gdPct = gdMeta > 0 ? Math.min(100, (gdAcumulados / gdMeta) * 100) : 0;
  const etapaKiwi = estimarEtapaKiwiPorFrioYGradosDia(hfAcumuladas, hfMeta, gdAcumulados, gdMeta);
  const etapaRegistrada = obtenerEtapaFenologicaActiva(fenologia);
  const gddHoy = calcularGradosDiaPeriodo(
    clima?.tempMinima ?? 7.8,
    clima?.tempMaxima ?? 26.2,
    hfNorm.tempBaseGddC ?? 10,
    hfNorm.tempTechoGddC ?? 30,
    1
  );

  // Últimas labores ordenadas por fecha
  const ultimasLabores = [...labores]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 5);

  // Resumen Estado Fitosanitario del Huerto (Temporada Actual)
  const temporadaActual = new Date().getFullYear();
  const ordenesTemporada = ordenesTrabajo.filter((o) => {
    const fechaRef = o.fechaProgramada || o.fechaEjecucion || o.fechaEmision || '';
    return fechaRef.startsWith(String(temporadaActual));
  });
  const ordenesBase = ordenesTemporada.length > 0 ? ordenesTemporada : ordenesTrabajo;
  const ordenesActivas = ordenesBase.filter(
    (o) => o.estado === 'pendiente' || o.estado === 'en_proceso'
  );
  const ordenesCompletadas = ordenesBase.filter((o) => o.estado === 'completada');
  const ordenesCanceladas = ordenesBase.filter((o) => o.estado === 'cancelada');
  const totalOrdenesValidas = ordenesActivas.length + ordenesCompletadas.length;
  const pctCompletadas =
    totalOrdenesValidas > 0
      ? Math.round((ordenesCompletadas.length / totalOrdenesValidas) * 100)
      : 0;
  const pctActivas =
    totalOrdenesValidas > 0 ? 100 - pctCompletadas : 0;
  const haActivasOrdenes = ordenesActivas.reduce(
    (sum, o) => sum + (Number(o.superficieTotalHa) || 0),
    0
  );
  const haCompletadasOrdenes = ordenesCompletadas.reduce(
    (sum, o) => sum + (Number(o.superficieTotalHa) || 0),
    0
  );
  const laboresFitoTemporada = labores.filter(
    (l) =>
      l.tipoLabor === 'fitosanitario' &&
      (l.fecha || '').startsWith(String(temporadaActual))
  ).length;
  const ordenesConAlertaLmr = ordenesActivas.filter((o) => o.alertaCarenciaSuperaCosecha).length;
  const proximaOrdenPendiente = [...ordenesActivas].sort((a, b) =>
    (a.fechaProgramada || '').localeCompare(b.fechaProgramada || '')
  )[0];
  const nivelCargaFito =
    ordenesActivas.length === 0
      ? {
          label: 'Al Día',
          badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
        }
      : ordenesActivas.length >= 3 || ordenesConAlertaLmr > 0
      ? {
          label: 'Carga Alta',
          badgeClass: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
        }
      : {
          label: `${ordenesActivas.length} Activa${ordenesActivas.length > 1 ? 's' : ''}`,
          badgeClass: 'bg-purple-100 text-purple-950 border-purple-200 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800',
        };

  return (
    <div className="space-y-6">
      {/* Banner Principal del Fundo */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-stone-900 to-teal-950 text-white p-5 sm:p-7 shadow-sm border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-800/80 text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
              <span>{explotacion.comuna || 'Huerto Real'}</span>
              <span>·</span>
              <span>Temporada 2026</span>
              <span>·</span>
              <span>Kiwi Hayward</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {explotacion.nombreFundo}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl leading-relaxed">
              {explotacion.direccion}, {explotacion.comuna}. RUT {explotacion.rut}. Asesor Técnico: {explotacion.asesorAgronomo}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {isAdmin && (
              <button
                onClick={onEditExplotacion}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors border border-white/10 cursor-pointer"
              >
                Ficha del Fundo
              </button>
            )}
          </div>
        </div>

        {/* Cintas decorativas sutiles */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Tarjetas de Métricas Clave */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Métrica 1: Superficie y Cuarteles */}
        <div 
          onClick={() => onNavigateTab('parcelas')}
          className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 shadow-2xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cuarteles Hayward</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-stone-900 dark:text-stone-100">{totalHectareas.toFixed(1)}</span>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-semibold">ha activas</span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 flex items-center justify-between">
            <span>{parcelas.length} cuarteles (Parrón y Espaldera)</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Métrica 2: Estado Carencias SAG */}
        <div 
          onClick={() => onNavigateTab('cosecha')}
          className={`rounded-2xl p-4 border shadow-2xs transition-all cursor-pointer group ${
            parcelasEnCarencia.length > 0 
              ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 hover:border-amber-400' 
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Carencias Activas SAG
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              parcelasEnCarencia.length > 0 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-stone-900 dark:text-stone-100">{parcelasEnCarencia.length}</span>
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">cuartel en espera</span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 truncate">
            {parcelasEnCarencia.length > 0 
              ? `${parcelasEnCarencia[0].nombre}: ${parcelasEnCarencia[0].diasCarenciaRestantes}d restantes`
              : 'Sin carencias pendientes'}
          </div>
        </div>

        {/* Métrica 3: Horas Frío & Grados Día */}
        <div 
          onClick={() => onNavigateTab('fenologia')}
          className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 shadow-2xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Frío &amp; Grados Día</span>
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Snowflake className="w-3.5 h-3.5" />
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Flame className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-lg font-black text-stone-900 dark:text-stone-100">{hfAcumuladas}</span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold">/{hfMeta} HF</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-amber-800 dark:text-amber-300">{gdAcumulados}</span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold">/{gdMeta} °D</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden" title={`Horas Frío ${hfPct.toFixed(0)}%`}>
              <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${hfPct.toFixed(1)}%` }} />
            </div>
            <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden" title={`Grados Día ${gdPct.toFixed(0)}%`}>
              <div className="bg-amber-600 h-1.5 rounded-full transition-all" style={{ width: `${gdPct.toFixed(1)}%` }} />
            </div>
          </div>
          <div className="text-[10px] text-stone-600 dark:text-stone-400 mt-1.5 flex items-center justify-between gap-1">
            <span className="font-bold text-emerald-800 dark:text-emerald-300 truncate">
              {etapaRegistrada
                ? `${etapaRegistrada.escalaBBCH} · ${etapaRegistrada.nombreEtapa}`
                : `${etapaKiwi.etapaActual.bbch} · ${etapaKiwi.etapaActual.nombre}`}
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0 flex items-center gap-0.5">
              {canEditFenologia ? 'Editar' : 'Ver'}
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          {etapaRegistrada?.fecha && (
            <div className="text-[10px] text-stone-400 font-mono tabular-nums mt-0.5 truncate">
              {etapaRegistrada.fecha}
              {etapaRegistrada.fechaFin ? ` → ${etapaRegistrada.fechaFin}` : ''}
            </div>
          )}
        </div>

        {/* Métrica 4: Alertas de Bodega */}
        <div 
          onClick={onOpenAlertsModal}
          className={`rounded-2xl p-4 border shadow-2xs transition-all cursor-pointer group ${
            lowStockItems.length > 0 
              ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 hover:border-rose-400' 
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Stock Insumos Crítico
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              lowStockItems.length > 0 ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 animate-pulse' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
            }`}>
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-stone-900 dark:text-stone-100">{lowStockItems.length}</span>
            <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">bajo stock mínimo</span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 truncate">
            {lowStockItems.length > 0 ? `${lowStockItems.map((i) => i.nombreComercial).slice(0, 2).join(', ')}...` : 'Inventario en niveles óptimos'}
          </div>
        </div>
      </div>

      {/* Tarjeta Visual: Estado Fitosanitario del Huerto (Órdenes Activas vs Completadas) */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                  Estado Fitosanitario del Huerto
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${nivelCargaFito.badgeClass}`}
                >
                  {nivelCargaFito.label}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Carga sanitaria de la Temporada {temporadaActual}: órdenes de trabajo activas frente a ejecutadas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('ordenes')}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800/80 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
          >
            <span>Gestionar Órdenes</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Barra visual comparativa Activas vs Completadas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-700 dark:text-stone-300">
              Avance del Programa Fitosanitario ({ordenesCompletadas.length} de {totalOrdenesValidas} órdenes)
            </span>
            <span className="font-mono font-black text-emerald-800 dark:text-emerald-300 tabular-nums">
              {totalOrdenesValidas > 0 ? `${pctCompletadas}% completado` : 'Sin órdenes emitidas'}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden flex border border-stone-200/80 dark:border-stone-800">
            {totalOrdenesValidas > 0 ? (
              <>
                {ordenesCompletadas.length > 0 && (
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{ width: `${pctCompletadas}%` }}
                    title={`${ordenesCompletadas.length} completadas (${pctCompletadas}%)`}
                  />
                )}
                {ordenesActivas.length > 0 && (
                  <div
                    className="h-full bg-purple-600 transition-all duration-300"
                    style={{ width: `${pctActivas}%` }}
                    title={`${ordenesActivas.length} activas (${pctActivas}%)`}
                  />
                )}
              </>
            ) : (
              <div className="h-full w-full bg-stone-200/70 dark:bg-stone-700" />
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                Completadas: <strong className="font-mono text-stone-900 dark:text-stone-100">{ordenesCompletadas.length}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                Activas (pendientes / en curso): <strong className="font-mono text-stone-900 dark:text-stone-100">{ordenesActivas.length}</strong>
              </span>
              {ordenesCanceladas.length > 0 && (
                <span className="text-stone-400">
                  Canceladas: <strong className="font-mono">{ordenesCanceladas.length}</strong>
                </span>
              )}
            </div>
            <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400">
              {haCompletadasOrdenes.toFixed(1)} ha aplicadas · {haActivasOrdenes.toFixed(1)} ha por aplicar
            </span>
          </div>
        </div>

        {/* 4 indicadores resumidos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div
            onClick={() => onNavigateTab('ordenes')}
            className={`p-3 rounded-xl border transition-colors cursor-pointer ${
              ordenesActivas.length > 0
                ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/80 hover:border-purple-400'
                : 'bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-800 hover:border-emerald-400'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-900/80 dark:text-purple-200">
              Órdenes Activas
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-purple-950 dark:text-purple-100 font-mono tabular-nums">
                {ordenesActivas.length}
              </span>
              <span className="text-[11px] font-semibold text-purple-800 dark:text-purple-300">
                ({haActivasOrdenes.toFixed(1)} ha)
              </span>
            </div>
            <div className="text-[10px] text-stone-600 dark:text-stone-400 mt-0.5 truncate">
              {ordenesActivas.length > 0
                ? 'Pendientes de ejecución SAG'
                : 'Sin aplicaciones pendientes'}
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('ordenes')}
            className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 hover:border-emerald-400 transition-colors cursor-pointer"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/80 dark:text-emerald-200">
              Órdenes Completadas
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-emerald-950 dark:text-emerald-100 font-mono tabular-nums">
                {ordenesCompletadas.length}
              </span>
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                ({haCompletadasOrdenes.toFixed(1)} ha)
              </span>
            </div>
            <div className="text-[10px] text-stone-600 dark:text-stone-400 mt-0.5 truncate">
              Con firma aplicador en temporada
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('labores')}
            className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 hover:border-emerald-400 transition-colors cursor-pointer"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Aplicaciones Cuaderno
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-stone-900 dark:text-stone-100 font-mono tabular-nums">
                {laboresFitoTemporada}
              </span>
              <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">labores {temporadaActual}</span>
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
              Registros fitosanitarios históricos
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('monitoreo')}
            className={`p-3 rounded-xl border transition-colors cursor-pointer ${
              ordenesConAlertaLmr > 0 || clima?.riesgoPsa === 'Alto' || clima?.riesgoBotrytis === 'Alto'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 hover:border-amber-500'
                : 'bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-800 hover:border-emerald-400'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Presión Sanitaria &amp; LMR
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-sm font-black text-stone-900 dark:text-stone-100 truncate">
                Psa: {clima?.riesgoPsa ?? 'Bajo'} · Botrytis: {clima?.riesgoBotrytis ?? 'Bajo'}
              </span>
            </div>
            <div className="text-[10px] text-stone-600 dark:text-stone-400 mt-1 truncate">
              {ordenesConAlertaLmr > 0
                ? `⚠ ${ordenesConAlertaLmr} orden(es) con alerta LMR cosecha`
                : `${parcelasEnCarencia.length} cuartel(es) en carencia activa`}
            </div>
          </div>
        </div>

        {/* Destacado próxima orden activa */}
        {proximaOrdenPendiente && (
          <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-200/80 dark:bg-purple-900/50 text-purple-950 dark:text-purple-100">
                  {proximaOrdenPendiente.codigoReceta}
                </span>
                <span className="font-bold text-stone-900 dark:text-stone-100 truncate">
                  Próxima orden: {proximaOrdenPendiente.objetivoFitosanitario}
                </span>
              </div>
              <div className="text-[11px] text-stone-600 dark:text-stone-400 truncate">
                Programada: <strong className="font-mono">{proximaOrdenPendiente.fechaProgramada}</strong> ·{' '}
                {proximaOrdenPendiente.nombreInsumo} · {proximaOrdenPendiente.superficieTotalHa} ha (
                {proximaOrdenPendiente.parcelasNombres.join(', ')})
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('ordenes')}
              className="px-3 py-1.5 rounded-lg bg-purple-800 hover:bg-purple-700 text-white font-bold text-[11px] cursor-pointer shrink-0 self-start sm:self-center"
            >
              Ver Receta →
            </button>
          </div>
        )}
      </div>

      {/* Sección Doble: Estación Clima + Acciones Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tarjeta de Clima y Sensores Davis */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100">Estación {explotacion.nombreFundo}</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
              En Línea
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-black text-stone-900 dark:text-stone-100">{clima?.temperaturaActual ?? 21.5}°C</div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Mín: {clima?.tempMinima ?? 7.8}°C · Máx: {clima?.tempMaxima ?? 26.2}°C
              </div>
              <div className="text-[11px] text-amber-800 dark:text-amber-300 font-bold mt-0.5">
                +{gddHoy} °D hoy (base {hfNorm.tempBaseGddC}°C)
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold text-xs">
                {clima?.estadoCielo ?? 'Despejado'}
              </span>
              <div className="text-[11px] text-stone-400 mt-1">HR: {clima?.humedadRelativa ?? 58}%</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs pt-1">
            <div className="p-2.5 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-stone-200/80 dark:border-stone-800">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Riesgo Psa</div>
              <div className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{clima?.riesgoPsa ?? 'Bajo'}</span>
              </div>
            </div>
            <div className="p-2.5 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-stone-200/80 dark:border-stone-800">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Botrytis</div>
              <div className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{clima?.riesgoBotrytis ?? 'Bajo'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('clima')}
              className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                typeof clima?.indiceUvMaximo === 'number'
                  ? clasificarRiesgoUv(clima.indiceUvMaximo).cardClass
                  : 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80'
              }`}
              title="Ver Alerta UV Georreferenciada 08:00 hrs"
            >
              <div className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-600 shrink-0" />
                <span>UV Máx</span>
              </div>
              <div
                className={`font-bold mt-0.5 truncate ${
                  typeof clima?.indiceUvMaximo === 'number'
                    ? clasificarRiesgoUv(clima.indiceUvMaximo).textClass
                    : 'text-amber-800 dark:text-amber-300'
                }`}
              >
                {typeof clima?.indiceUvMaximo === 'number'
                  ? `${clima.indiceUvMaximo.toFixed(1)} · ${clima.nivelRiesgoUv || clasificarRiesgoUv(clima.indiceUvMaximo).nivel}`
                  : '08:00 Activo'}
              </div>
            </button>
          </div>

          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between gap-2 border-t border-stone-100 dark:border-stone-800 pt-3">
            <span>Viento: {clima?.velocidadVientoKmH ?? 11} km/h ({clima?.direccionViento ?? 'Sur-Oeste'})</span>
            <div className="flex items-center gap-2.5 shrink-0">
              <button 
                type="button"
                onClick={() => onNavigateTab('heladas')}
                className={`font-bold hover:underline cursor-pointer ${
                  clima?.alertaHelada ? 'text-rose-700 dark:text-rose-400' : 'text-cyan-800 dark:text-cyan-300'
                }`}
              >
                {clima?.alertaHelada ? 'Alerta Heladas →' : 'Control Heladas →'}
              </button>
              <button 
                type="button"
                onClick={() => onNavigateTab('clima')}
                className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Sensores →
              </button>
            </div>
          </div>
        </div>

        {/* Acceso Rápido a Operaciones de Terreno */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100">Operaciones Rápidas de Campo</h2>
            </div>
            <span className="text-xs text-stone-400">Temporada Kiwi Hayward</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() =>
                canEditLabores ? onOpenNewLaborWithDefaults(undefined, 'fitosanitario') : onNavigateTab('fitosanitarios')
              }
              className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800/80 font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span>{canEditLabores ? 'Aplicación Fitosanitaria' : 'Bodega Fitosanitarios'}</span>
            </button>

            <button
              onClick={() =>
                canEditLabores ? onOpenNewLaborWithDefaults(undefined, 'riego') : onNavigateTab('riego')
              }
              className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800/80 font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center">
                <Droplet className="w-4 h-4" />
              </div>
              <span>{canEditLabores ? 'Riego de Pozo' : 'Control Riego'}</span>
            </button>

            <button
              onClick={() => onNavigateTab('cosecha')}
              className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-950 dark:text-amber-100 border border-amber-200 dark:border-amber-800/80 font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center">
                <Apple className="w-4 h-4" />
              </div>
              <span>Medición °Brix / Cosecha</span>
            </button>

            <button
              onClick={() => onNavigateTab('ordenes')}
              className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-950 dark:text-purple-100 border border-purple-200 dark:border-purple-800/80 font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <span>Receta Agronómica</span>
            </button>
          </div>

          {/* Estado de Cuarteles en Fila Rápida */}
          <div className="border-t border-stone-100 dark:border-stone-800 pt-3">
            <div className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
              Estado de Cuarteles ({parcelas.length})
            </div>
            {parcelas.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-center text-xs text-stone-500 dark:text-stone-400 space-y-2">
                <p>No hay cuarteles registrados todavía en tu huerto real.</p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('parcelas')}
                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  + Agregar Primer Cuartel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {parcelas.map((p) => (
                  <div 
                    key={p.id}
                    onClick={() => onNavigateTab('parcelas')}
                    className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-emerald-500 bg-stone-50 dark:bg-stone-800/70 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="font-bold text-stone-900 dark:text-stone-100 truncate">{p.nombre}</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400">{p.superficieHa} ha · {p.sistemaConduccion}</div>
                      {p.estadoFenologico && (
                        <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium truncate">
                          {p.estadoFenologico}
                          {p.fechaEstadoFenologico ? ` (${p.fechaEstadoFenologico})` : ''}
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      p.estadoActual === 'Listo para Cosecha' 
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : p.estadoActual === 'En Carencia SAG'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : p.estadoActual === 'En Riego'
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                        : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                    }`}>
                      {p.estadoActual}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Centro de Trazabilidad, Cumplimiento & Alertas Proactivas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${alertasProactivas.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
              Alertas Proactivas del Predio ({alertasProactivas.length})
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('planificacion')}
              className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
            >
              Ver todas →
            </button>
          </div>
          {alertasProactivas.length === 0 ? (
            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span>Sin vencimientos críticos de bodega, carnets SAG, calibraciones ni tareas atrasadas.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {alertasProactivas.slice(0, 4).map((al) => (
                <div
                  key={al.id}
                  className="w-full rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/70 flex items-center justify-between gap-2 text-xs transition-colors pr-2"
                >
                  <button
                    type="button"
                    onClick={() => onNavigateTab(al.tabDestino)}
                    className="flex-1 text-left p-2.5 flex items-center justify-between gap-2 min-w-0 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            al.severidad === 'critica' ? 'bg-rose-600' : al.severidad === 'advertencia' ? 'bg-amber-500' : 'bg-sky-500'
                          }`}
                        />
                        <span className="font-bold text-stone-900 dark:text-stone-100 truncate">{al.titulo}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate pl-3.5">{al.detalle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                  </button>
                  {al.insumoId && canEditFor(al.tabDestino) && onDismissLowStockAlert && (
                    <button
                      type="button"
                      onClick={() => onDismissLowStockAlert(al.insumoId!)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-200/70 dark:hover:text-stone-100 dark:hover:bg-stone-800 shrink-0 cursor-pointer"
                      title="Eliminar notificación de stock bajo (mantiene el producto en bodega)"
                    >
                      <BellOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-2.5">
          <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100">Trazabilidad & Control Integral</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button type="button" onClick={() => onNavigateTab('cosecha')} className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-950 dark:text-emerald-100 font-bold text-left cursor-pointer space-y-1">
              <QrCode className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <div>Lotes QR & Packing</div>
            </button>
            <button type="button" onClick={() => onNavigateTab('laboratorio')} className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-950 dark:text-indigo-100 font-bold text-left cursor-pointer space-y-1">
              <FlaskConical className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
              <div>Laboratorio LMR</div>
            </button>
            <button type="button" onClick={() => onNavigateTab('auditoria')} className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-950 dark:text-teal-100 font-bold text-left cursor-pointer space-y-1">
              <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <div>Auditoría BPA/SAG</div>
            </button>
            <button type="button" onClick={() => onNavigateTab('planificacion')} className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-950 dark:text-amber-100 font-bold text-left cursor-pointer space-y-1">
              <CalendarClock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <div>Multi-Temporada</div>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Labores Recientes */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100">Últimas Labores Registradas en Cuaderno de Campo</h2>
          </div>
          <button
            onClick={() => onNavigateTab('labores')}
            className="text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            Ver Historial Completo ({labores.length}) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cuartel</th>
                <th className="px-4 py-3">Labor</th>
                <th className="px-4 py-3">Insumo / Dosis</th>
                <th className="px-4 py-3">Responsable</th>
                {canEditLabores && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
              {ultimasLabores.length === 0 ? (
                <tr>
                  <td colSpan={canEditLabores ? 6 : 5} className="px-4 py-8 text-center text-stone-400">
                    Sin labores registradas todavía.{canEditLabores ? ' Usa el botón + Nueva Labor para registrar tu primera faena.' : ''}
                  </td>
                </tr>
              ) : (
                ultimasLabores.map((l) => (
                  <tr key={l.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{l.fecha} {l.hora && <span className="text-stone-400 text-[10px]">{l.hora}</span>}</td>
                    <td className="px-4 py-3 font-semibold text-stone-900 dark:text-stone-100">{l.parcelaNombre}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize px-2 py-0.5 rounded-full font-bold text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800">
                        {l.tipoLabor}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {l.nombreInsumo ? (
                        <span className="font-medium text-emerald-950 dark:text-emerald-100">
                          {l.nombreInsumo} ({l.totalInsumoUtilizado} {l.unidadMedida})
                        </span>
                      ) : l.volumenM3 ? (
                        <span className="text-blue-900 dark:text-blue-200 font-medium">
                          {l.volumenM3} m³ ({l.duracionRiegoHoras}h riego)
                        </span>
                      ) : (
                        <span className="text-stone-400 italic">Labor manual / monitoreo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-400 truncate max-w-[150px]">{l.registradoPor}</td>
                    {canEditLabores && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditLabor(l)}
                            className="p-1 text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 rounded hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                            title="Editar labor"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteLabor(l.id)}
                            className="p-1 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                            title="Eliminar labor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
