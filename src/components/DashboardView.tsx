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
  CondicionHorasFrio
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
  CalendarClock
} from 'lucide-react';
import { ActiveTab } from './Navbar';
import { AlertaProactivaHuerto } from '../utils/alertasHuerto';
import {
  calcularGradosDiaPeriodo,
  estimarEtapaKiwiPorFrioYGradosDia,
  normalizarCondicionHorasFrio,
} from '../utils/agroClimaCalculos';

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
  isAdmin?: boolean;
  alertasProactivas?: AlertaProactivaHuerto[];
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
  isAdmin = true,
  alertasProactivas = []
}) => {
  const totalHectareas = parcelas.reduce((acc, p) => acc + p.superficieHa, 0);
  const lowStockItems = inventario.filter((i) => (i.stockMinimo || 0) > 0 && (i.stockActual || 0) <= (i.stockMinimo || 0));
  const parcelasEnCarencia = parcelas.filter((p) => p.estadoActual === 'En Carencia SAG');
  const hfNorm = normalizarCondicionHorasFrio(horasFrio);
  const hfAcumuladas = hfNorm.totalAcumuladoHF ?? 0;
  const hfMeta = hfNorm.metaVariedadHF ?? 850;
  const hfPct = hfMeta > 0 ? Math.min(100, (hfAcumuladas / hfMeta) * 100) : 0;
  const gdAcumulados = hfNorm.totalAcumuladoGD ?? 0;
  const gdMeta = hfNorm.metaVariedadGD ?? 1850;
  const gdPct = gdMeta > 0 ? Math.min(100, (gdAcumulados / gdMeta) * 100) : 0;
  const etapaKiwi = estimarEtapaKiwiPorFrioYGradosDia(hfAcumuladas, hfMeta, gdAcumulados, gdMeta);
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
          className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cuarteles Hayward</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-stone-900">{totalHectareas.toFixed(1)}</span>
            <span className="text-xs text-stone-500 font-semibold">ha activas</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
            <span>{parcelas.length} cuarteles (Parrón y Espaldera)</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Métrica 2: Estado Carencias SAG */}
        <div 
          onClick={() => onNavigateTab('cosecha')}
          className={`rounded-2xl p-4 border shadow-2xs transition-all cursor-pointer group ${
            parcelasEnCarencia.length > 0 
              ? 'bg-amber-50/60 border-amber-200 hover:border-amber-400' 
              : 'bg-white border-stone-200 hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Carencias Activas SAG
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              parcelasEnCarencia.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-stone-900">{parcelasEnCarencia.length}</span>
            <span className="text-xs font-semibold text-stone-600">cuartel en espera</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1 truncate">
            {parcelasEnCarencia.length > 0 
              ? `${parcelasEnCarencia[0].nombre}: ${parcelasEnCarencia[0].diasCarenciaRestantes}d restantes`
              : 'Sin carencias pendientes'}
          </div>
        </div>

        {/* Métrica 3: Horas Frío & Grados Día */}
        <div 
          onClick={() => onNavigateTab('fenologia')}
          className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Frío &amp; Grados Día</span>
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Snowflake className="w-3.5 h-3.5" />
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Flame className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-lg font-black text-stone-900">{hfAcumuladas}</span>
              <span className="text-[11px] text-stone-500 font-semibold">/{hfMeta} HF</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-amber-800">{gdAcumulados}</span>
              <span className="text-[11px] text-stone-500 font-semibold">/{gdMeta} °D</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden" title={`Horas Frío ${hfPct.toFixed(0)}%`}>
              <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${hfPct.toFixed(1)}%` }} />
            </div>
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden" title={`Grados Día ${gdPct.toFixed(0)}%`}>
              <div className="bg-amber-600 h-1.5 rounded-full transition-all" style={{ width: `${gdPct.toFixed(1)}%` }} />
            </div>
          </div>
          <div className="text-[10px] text-stone-600 mt-1.5 flex items-center justify-between gap-1 truncate">
            <span className="font-bold text-emerald-800 truncate">{etapaKiwi.etapaActual.bbch} · {etapaKiwi.etapaActual.nombre}</span>
            <ChevronRight className="w-3 h-3 text-stone-400 shrink-0" />
          </div>
        </div>

        {/* Métrica 4: Alertas de Bodega */}
        <div 
          onClick={onOpenAlertsModal}
          className={`rounded-2xl p-4 border shadow-2xs transition-all cursor-pointer group ${
            lowStockItems.length > 0 
              ? 'bg-rose-50/70 border-rose-200 hover:border-rose-400' 
              : 'bg-white border-stone-200 hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Stock Insumos Crítico
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              lowStockItems.length > 0 ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-emerald-50 text-emerald-800'
            }`}>
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-stone-900">{lowStockItems.length}</span>
            <span className="text-xs font-semibold text-stone-600">bajo stock mínimo</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-1 truncate">
            {lowStockItems.length > 0 ? `${lowStockItems.map((i) => i.nombreComercial).slice(0, 2).join(', ')}...` : 'Inventario en niveles óptimos'}
          </div>
        </div>
      </div>

      {/* Sección Doble: Estación Clima + Acciones Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tarjeta de Clima y Sensores Davis */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-emerald-700" />
              <h2 className="font-bold text-sm text-stone-900">Estación {explotacion.nombreFundo}</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              En Línea
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-black text-stone-900">{clima?.temperaturaActual ?? 21.5}°C</div>
              <div className="text-xs text-stone-500 mt-0.5">
                Mín: {clima?.tempMinima ?? 7.8}°C · Máx: {clima?.tempMaxima ?? 26.2}°C
              </div>
              <div className="text-[11px] text-amber-800 font-bold mt-0.5">
                +{gddHoy} °D hoy (base {hfNorm.tempBaseGddC}°C)
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded-xl bg-stone-100 text-stone-800 font-bold text-xs">
                {clima?.estadoCielo ?? 'Despejado'}
              </span>
              <div className="text-[11px] text-stone-400 mt-1">HR: {clima?.humedadRelativa ?? 58}%</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Riesgo Psa</div>
              <div className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {clima?.riesgoPsa ?? 'Bajo'}
              </div>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Riesgo Botrytis</div>
              <div className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {clima?.riesgoBotrytis ?? 'Bajo'}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-stone-500 flex items-center justify-between border-t border-stone-100 pt-3">
            <span>Viento: {clima?.velocidadVientoKmH ?? 11} km/h ({clima?.direccionViento ?? 'Sur-Oeste'})</span>
            <button 
              onClick={() => onNavigateTab('clima')}
              className="text-emerald-700 font-bold hover:underline"
            >
              Ver Sensores →
            </button>
          </div>
        </div>

        {/* Acceso Rápido a Operaciones de Terreno */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-700" />
              <h2 className="font-bold text-sm text-stone-900">Operaciones Rápidas de Campo</h2>
            </div>
            <span className="text-xs text-stone-400">Temporada Kiwi Hayward</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() =>
                canEdit ? onOpenNewLaborWithDefaults(undefined, 'fitosanitario') : onNavigateTab('fitosanitarios')
              }
              className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200 font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span>{canEdit ? 'Aplicación Fitosanitaria' : 'Bodega Fitosanitarios'}</span>
            </button>

            <button
              onClick={() =>
                canEdit ? onOpenNewLaborWithDefaults(undefined, 'riego') : onNavigateTab('riego')
              }
              className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center">
                <Droplet className="w-4 h-4" />
              </div>
              <span>{canEdit ? 'Riego de Pozo' : 'Control Riego'}</span>
            </button>

            <button
              onClick={() => onNavigateTab('cosecha')}
              className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-700 text-white flex items-center justify-center">
                <Apple className="w-4 h-4" />
              </div>
              <span>Medición °Brix / Cosecha</span>
            </button>

            <button
              onClick={() => onNavigateTab('ordenes')}
              className="p-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <span>Receta Agronómica</span>
            </button>
          </div>

          {/* Estado de Cuarteles en Fila Rápida */}
          <div className="border-t border-stone-100 pt-3">
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
              Estado de Cuarteles ({parcelas.length})
            </div>
            {parcelas.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-stone-300 bg-stone-50 text-center text-xs text-stone-500 space-y-2">
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
                    className="p-2.5 rounded-xl border border-stone-200 hover:border-emerald-500 bg-stone-50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-stone-900">{p.nombre}</div>
                      <div className="text-[11px] text-stone-500">{p.superficieHa} ha · {p.sistemaConduccion}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      p.estadoActual === 'Listo para Cosecha' 
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.estadoActual === 'En Carencia SAG'
                        ? 'bg-amber-100 text-amber-800'
                        : p.estadoActual === 'En Riego'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-stone-200 text-stone-700'
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
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${alertasProactivas.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
              Alertas Proactivas del Predio ({alertasProactivas.length})
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('planificacion')}
              className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
            >
              Ver todas →
            </button>
          </div>
          {alertasProactivas.length === 0 ? (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Sin vencimientos críticos de bodega, carnets SAG, calibraciones ni tareas atrasadas.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {alertasProactivas.slice(0, 4).map((al) => (
                <button
                  key={al.id}
                  type="button"
                  onClick={() => onNavigateTab(al.tabDestino)}
                  className="w-full text-left p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          al.severidad === 'critica' ? 'bg-rose-600' : al.severidad === 'advertencia' ? 'bg-amber-500' : 'bg-sky-500'
                        }`}
                      />
                      <span className="font-bold text-stone-900 truncate">{al.titulo}</span>
                    </div>
                    <p className="text-[11px] text-stone-500 truncate pl-3.5">{al.detalle}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-2.5">
          <h2 className="font-bold text-sm text-stone-900">Trazabilidad & Control Integral</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button type="button" onClick={() => onNavigateTab('cosecha')} className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-left cursor-pointer space-y-1">
              <QrCode className="w-4 h-4 text-emerald-700" />
              <div>Lotes QR & Packing</div>
            </button>
            <button type="button" onClick={() => onNavigateTab('laboratorio')} className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold text-left cursor-pointer space-y-1">
              <FlaskConical className="w-4 h-4 text-indigo-700" />
              <div>Laboratorio LMR</div>
            </button>
            <button type="button" onClick={() => onNavigateTab('auditoria')} className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-950 font-bold text-left cursor-pointer space-y-1">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <div>Auditoría BPA/SAG</div>
            </button>
            <button type="button" onClick={() => onNavigateTab('planificacion')} className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-left cursor-pointer space-y-1">
              <CalendarClock className="w-4 h-4 text-amber-700" />
              <div>Multi-Temporada</div>
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Labores Recientes */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-700" />
            <h2 className="font-bold text-sm text-stone-900">Últimas Labores Registradas en Cuaderno de Campo</h2>
          </div>
          <button
            onClick={() => onNavigateTab('labores')}
            className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            Ver Historial Completo ({labores.length}) →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cuartel</th>
                <th className="px-4 py-3">Labor</th>
                <th className="px-4 py-3">Insumo / Dosis</th>
                <th className="px-4 py-3">Responsable</th>
                {canEdit && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {ultimasLabores.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-stone-400">
                    Sin labores registradas todavía.{canEdit ? ' Usa el botón + Nueva Labor para registrar tu primera faena.' : ''}
                  </td>
                </tr>
              ) : (
                ultimasLabores.map((l) => (
                  <tr key={l.id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{l.fecha} {l.hora && <span className="text-stone-400 text-[10px]">{l.hora}</span>}</td>
                    <td className="px-4 py-3 font-semibold text-stone-900">{l.parcelaNombre}</td>
                    <td className="px-4 py-3">
                      <span className="capitalize px-2 py-0.5 rounded-full font-bold text-[10px] bg-stone-100 text-stone-800 border border-stone-200">
                        {l.tipoLabor}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {l.nombreInsumo ? (
                        <span className="font-medium text-emerald-950">
                          {l.nombreInsumo} ({l.totalInsumoUtilizado} {l.unidadMedida})
                        </span>
                      ) : l.volumenM3 ? (
                        <span className="text-blue-900 font-medium">
                          {l.volumenM3} m³ ({l.duracionRiegoHoras}h riego)
                        </span>
                      ) : (
                        <span className="text-stone-400 italic">Labor manual / monitoreo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600 truncate max-w-[150px]">{l.registradoPor}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditLabor(l)}
                            className="p-1 text-stone-400 hover:text-emerald-700 rounded hover:bg-stone-100 cursor-pointer"
                            title="Editar labor"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteLabor(l.id)}
                            className="p-1 text-stone-400 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
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
