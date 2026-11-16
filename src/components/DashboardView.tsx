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
  Edit2
} from 'lucide-react';
import { ActiveTab } from './Navbar';

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
  onDeleteLabor
}) => {
  const totalHectareas = parcelas.reduce((acc, p) => acc + p.superficieHa, 0);
  const lowStockItems = inventario.filter((i) => (i.stockMinimo || 0) > 0 && (i.stockActual || 0) <= (i.stockMinimo || 0));
  const parcelasEnCarencia = parcelas.filter((p) => p.estadoActual === 'En Carencia SAG');
  const totalM3Pozo = registrosPozo.reduce((acc, r) => acc + r.metrosCubicosExtraidos, 0);
  const hfAcumuladas = horasFrio?.totalAcumuladoHF ?? 0;
  const hfMeta = horasFrio?.metaVariedadHF ?? 850;
  const hfPct = hfMeta > 0 ? Math.min(100, (hfAcumuladas / hfMeta) * 100) : 0;

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
            <button
              onClick={onEditExplotacion}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors border border-white/10 cursor-pointer"
            >
              Ficha del Fundo
            </button>
            <button
              onClick={() => onNavigateTab('asistente_ia')}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              ✨ Consultar Asesor IA
            </button>
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

        {/* Métrica 3: Horas Frío Acumuladas */}
        <div 
          onClick={() => onNavigateTab('fenologia')}
          className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Horas Frío (&lt;7.2°C)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Snowflake className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-stone-900">{hfAcumuladas}</span>
            <span className="text-xs text-stone-500 font-semibold">/ {hfMeta} HF</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${hfPct.toFixed(1)}%` }} />
          </div>
          <div className="text-[10px] text-stone-500 mt-1 flex justify-between">
            <span>Meta Hayward {hfMeta} HF</span>
            <span className="font-bold text-blue-700">{hfPct.toFixed(1)}%</span>
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
              onClick={() => onOpenNewLaborWithDefaults(undefined, 'fitosanitario')}
              className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200 font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span>Aplicación Fitosanitaria</span>
            </button>

            <button
              onClick={() => onOpenNewLaborWithDefaults(undefined, 'riego')}
              className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 font-semibold text-xs flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center">
                <Droplet className="w-4 h-4" />
              </div>
              <span>Riego de Pozo</span>
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
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {ultimasLabores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                    Sin labores registradas todavía. Usa el botón <strong>+ Nueva Labor</strong> para registrar tu primera faena.
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEditLabor(l)}
                          className="p-1 text-stone-400 hover:text-emerald-700 rounded hover:bg-stone-100"
                          title="Editar labor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteLabor(l.id)}
                          className="p-1 text-stone-400 hover:text-rose-700 rounded hover:bg-rose-50"
                          title="Eliminar labor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
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
