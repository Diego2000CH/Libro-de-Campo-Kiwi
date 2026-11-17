import React, { useMemo, useState } from 'react';
import { CondicionHorasFrio, PeriodicidadRegistroTermico, RegistroTermicoHuerto } from '../types/campo';
import { ETAPAS_GDD_KIWI, estaEnVentana, getTemporadaDefaults } from '../utils/agroClimaCalculos';
import { BarChart3, Flame, Snowflake, TrendingUp } from 'lucide-react';

interface GraficosTermicosHuertoProps {
  registros: RegistroTermicoHuerto[];
  horasFrio: CondicionHorasFrio;
}

type FiltroPeriodoGrafico = 'todos' | PeriodicidadRegistroTermico;
type ModoSerie = 'ambos' | 'hf' | 'gd';

interface ChartPoint {
  id: string;
  label: string;
  rangoFecha: string;
  periodicidad: PeriodicidadRegistroTermico;
  hfPeriodo: number;
  gdPeriodo: number;
  hfAcum: number;
  gdAcum: number;
  enVentanaHF: boolean;
  enVentanaGD: boolean;
  tempMinC?: number;
  tempMaxC?: number;
}

export const GraficosTermicosHuerto: React.FC<GraficosTermicosHuertoProps> = ({
  registros,
  horasFrio,
}) => {
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodoGrafico>('todos');
  const [modoSerie, setModoSerie] = useState<ModoSerie>('ambos');
  const [hoveredHFIdx, setHoveredHFIdx] = useState<number | null>(null);
  const [hoveredGDIdx, setHoveredGDIdx] = useState<number | null>(null);

  const defaults = getTemporadaDefaults(horasFrio.fechaCorte);
  const iniHF = horasFrio.fechaInicioHF || defaults.fechaInicioHF;
  const finHF = horasFrio.fechaFinHF || defaults.fechaFinHF;
  const iniGD = horasFrio.fechaInicioGD || defaults.fechaInicioGD;
  const finGD = horasFrio.fechaFinGD || defaults.fechaFinGD;
  const metaHF = horasFrio.metaVariedadHF || 850;
  const metaGD = horasFrio.metaVariedadGD || 1850;

  const formatShortDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  };

  const chartData = useMemo<ChartPoint[]>(() => {
    const filtered = registros
      .filter((r) => filtroPeriodo === 'todos' || r.periodicidad === filtroPeriodo)
      .slice()
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio) || a.fechaFin.localeCompare(b.fechaFin));

    let acumHF = 0;
    let acumGD = 0;

    return filtered.map((r) => {
      const enVentanaHF = estaEnVentana(r.fechaInicio, r.fechaFin, iniHF, finHF);
      const enVentanaGD = estaEnVentana(r.fechaInicio, r.fechaFin, iniGD, finGD);
      const hfPeriodo = Number(r.horasFrioPeriodo) || 0;
      const gdPeriodo = Number(r.gradosDiaPeriodo) || 0;

      if (enVentanaHF) acumHF += hfPeriodo;
      if (enVentanaGD) acumGD += gdPeriodo;

      const labelBase =
        r.etiquetaPeriodo?.trim() ||
        (r.fechaInicio === r.fechaFin
          ? formatShortDate(r.fechaInicio)
          : `${formatShortDate(r.fechaInicio)}–${formatShortDate(r.fechaFin)}`);

      return {
        id: r.id,
        label: labelBase,
        rangoFecha:
          r.fechaInicio === r.fechaFin
            ? r.fechaInicio
            : `${r.fechaInicio} al ${r.fechaFin}`,
        periodicidad: r.periodicidad,
        hfPeriodo: Number(hfPeriodo.toFixed(1)),
        gdPeriodo: Number(gdPeriodo.toFixed(1)),
        hfAcum: Number(acumHF.toFixed(1)),
        gdAcum: Number(acumGD.toFixed(1)),
        enVentanaHF,
        enVentanaGD,
        tempMinC: r.tempMinC,
        tempMaxC: r.tempMaxC,
      };
    });
  }, [registros, filtroPeriodo, iniHF, finHF, iniGD, finGD]);

  const hfPoints = useMemo(
    () => chartData.filter((p) => p.enVentanaHF || p.hfPeriodo > 0),
    [chartData]
  );

  const gdPoints = useMemo(
    () => chartData.filter((p) => p.enVentanaGD || p.gdPeriodo > 0),
    [chartData]
  );

  // Dimensiones SVG estándar
  const W = 640;
  const H = 240;
  const PAD = { top: 22, right: 20, bottom: 44, left: 48 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const renderChart = (
    kind: 'hf' | 'gd',
    points: ChartPoint[],
    meta: number,
    hoveredIdx: number | null,
    setHoveredIdx: (idx: number | null) => void
  ) => {
    const isHF = kind === 'hf';
    const maxAcumData = points.reduce(
      (max, p) => Math.max(max, isHF ? p.hfAcum : p.gdAcum, isHF ? p.hfPeriodo : p.gdPeriodo),
      0
    );
    const yMax = Math.max(meta * 1.08, maxAcumData * 1.12, isHF ? 200 : 400);
    const maxPeriodo = Math.max(
      1,
      points.reduce((m, p) => Math.max(m, isHF ? p.hfPeriodo : p.gdPeriodo), 0)
    );

    const getX = (idx: number) => {
      if (points.length <= 1) return PAD.left + plotW / 2;
      return PAD.left + (idx * plotW) / (points.length - 1);
    };
    const getY = (val: number) => PAD.top + plotH - Math.min(1, Math.max(0, val / yMax)) * plotH;

    const barWidth = points.length > 0 ? Math.min(34, Math.max(8, plotW / Math.max(points.length * 1.8, 4))) : 16;

    const linePath =
      points.length > 0
        ? points
            .map((p, idx) => {
              const x = getX(idx);
              const y = getY(isHF ? p.hfAcum : p.gdAcum);
              return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(' ')
        : '';

    const areaPath =
      points.length > 1
        ? `${linePath} L ${getX(points.length - 1).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} L ${getX(0).toFixed(1)} ${(PAD.top + plotH).toFixed(1)} Z`
        : '';

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(yMax * t));
    const activePt = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : null;

    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              {isHF ? (
                <Snowflake className="w-4 h-4 text-blue-700" />
              ) : (
                <Flame className="w-4 h-4 text-amber-600" />
              )}
              <span>
                {isHF
                  ? 'Curva de Horas Frío (< 7.2°C)'
                  : `Curva de Grados Día (Base ${horasFrio.tempBaseGddC ?? 10}°C)`}
              </span>
            </h3>
            <p className="text-[11px] text-stone-500">
              {isHF
                ? `Ventana estacional: ${formatShortDate(iniHF)} – ${formatShortDate(finHF)} · Meta varietal: ${metaHF} HF`
                : `Ventana estacional: ${formatShortDate(iniGD)} – ${formatShortDate(finGD)} · Meta madurez: ${metaGD} °D`}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-700">
              <span
                className="w-2.5 h-2.5 rounded-xs inline-block"
                style={{ backgroundColor: isHF ? '#93c5fd' : '#fcd34d' }}
              />
              Por período
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-700">
              <span
                className="w-3 h-0.5 inline-block"
                style={{ backgroundColor: isHF ? '#1d4ed8' : '#d97706' }}
              />
              Acumulado
            </span>
          </div>
        </div>

        {points.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-center text-stone-400 text-xs bg-stone-50 rounded-xl border border-dashed border-stone-200 p-4">
            <BarChart3 className="w-7 h-7 text-stone-300 mb-1.5" />
            <p className="font-semibold text-stone-600">
              Sin registros {filtroPeriodo !== 'todos' ? `de tipo «${filtroPeriodo}» ` : ''}para graficar en esta ventana.
            </p>
            <p className="text-[11px] mt-0.5">
              Ingresa mediciones diarias, semanales o mensuales arriba para visualizar la curva acumulada.
            </p>
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto select-none overflow-visible"
              role="img"
              aria-label={isHF ? 'Gráfico de Horas Frío' : 'Gráfico de Grados Día'}
            >
              <defs>
                <linearGradient id={`grad-${kind}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isHF ? '#3b82f6' : '#f59e0b'} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={isHF ? '#3b82f6' : '#f59e0b'} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid horizontal */}
              {yTicks.map((tick) => {
                const y = getY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={PAD.left}
                      y1={y}
                      x2={W - PAD.right}
                      y2={y}
                      stroke="#e7e5e4"
                      strokeWidth="1"
                    />
                    <text
                      x={PAD.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="10"
                      fill="#78716c"
                      fontFamily="monospace"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {/* Línea de Meta (y hitos fenológicos en Grados Día) */}
              {!isHF &&
                ETAPAS_GDD_KIWI.filter((e) => e.gddMin > 0 && e.gddMin < yMax).map((etapa) => {
                  const yEtapa = getY(etapa.gddMin);
                  return (
                    <g key={etapa.id}>
                      <line
                        x1={PAD.left}
                        y1={yEtapa}
                        x2={W - PAD.right}
                        y2={yEtapa}
                        stroke={etapa.colorHex}
                        strokeWidth="1"
                        strokeDasharray="3 4"
                        strokeOpacity="0.55"
                      />
                      <text
                        x={W - PAD.right - 2}
                        y={yEtapa - 3}
                        textAnchor="end"
                        fontSize="8.5"
                        fontWeight="700"
                        fill={etapa.colorHex}
                      >
                        {etapa.gddMin} °D · {etapa.bbch}
                      </text>
                    </g>
                  );
                })}

              {/* Línea de Meta principal */}
              {meta <= yMax && (
                <g>
                  <line
                    x1={PAD.left}
                    y1={getY(meta)}
                    x2={W - PAD.right}
                    y2={getY(meta)}
                    stroke={isHF ? '#1e40af' : '#b45309'}
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                  />
                  <text
                    x={PAD.left + 6}
                    y={getY(meta) - 5}
                    fontSize="9.5"
                    fontWeight="800"
                    fill={isHF ? '#1e40af' : '#b45309'}
                  >
                    Meta {isHF ? `${meta} HF` : `${meta} °D (Madurez)`}
                  </text>
                </g>
              )}

              {/* Área bajo la curva acumulada */}
              {areaPath && <path d={areaPath} fill={`url(#grad-${kind})`} />}

              {/* Barras de aporte del período (escaladas proporcionalmente hasta 45% de la altura para no tapar la curva) */}
              {points.map((p, idx) => {
                const x = getX(idx);
                const valPeriodo = isHF ? p.hfPeriodo : p.gdPeriodo;
                const barH = (valPeriodo / maxPeriodo) * (plotH * 0.42);
                const yBar = PAD.top + plotH - barH;
                const isActive = hoveredIdx === idx;
                return (
                  <rect
                    key={`bar-${p.id}`}
                    x={x - barWidth / 2}
                    y={yBar}
                    width={barWidth}
                    height={Math.max(2, barH)}
                    rx="3"
                    fill={isHF ? (isActive ? '#2563eb' : '#93c5fd') : isActive ? '#d97706' : '#fcd34d'}
                    fillOpacity={isActive ? 0.9 : 0.72}
                  />
                );
              })}

              {/* Curva acumulada */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={isHF ? '#1d4ed8' : '#d97706'}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Puntos interactivos y etiquetas X */}
              {points.map((p, idx) => {
                const x = getX(idx);
                const y = getY(isHF ? p.hfAcum : p.gdAcum);
                const isActive = hoveredIdx === idx;
                const showXLabel =
                  points.length <= 8 || idx === 0 || idx === points.length - 1 || idx % Math.ceil(points.length / 7) === 0;

                return (
                  <g
                    key={`pt-${p.id}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
                  >
                    <rect
                      x={x - Math.max(14, barWidth / 2)}
                      y={PAD.top}
                      width={Math.max(28, barWidth)}
                      height={plotH + 16}
                      fill="transparent"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={isActive ? 6 : 4}
                      fill="#ffffff"
                      stroke={isHF ? '#1d4ed8' : '#d97706'}
                      strokeWidth={isActive ? 3 : 2.2}
                    />
                    {showXLabel && (
                      <text
                        x={x}
                        y={H - 12}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight={isActive ? '800' : '600'}
                        fill="#57534e"
                      >
                        {p.label.length > 13 ? `${p.label.slice(0, 12)}…` : p.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Tooltip / Detalle del punto seleccionado */}
            {activePt ? (
              <div className="mt-2 p-2.5 rounded-xl bg-stone-900 text-white text-[11px] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-black text-emerald-300">{activePt.label}</span>
                  <span className="text-stone-400 ml-2 font-mono text-[10px]">
                    ({activePt.rangoFecha} · {activePt.periodicidad})
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span>
                    Período:{' '}
                    <strong className={isHF ? 'text-blue-300' : 'text-amber-300'}>
                      +{isHF ? activePt.hfPeriodo : activePt.gdPeriodo} {isHF ? 'HF' : '°D'}
                    </strong>
                  </span>
                  <span>
                    Acumulado:{' '}
                    <strong className="text-white">
                      {isHF ? activePt.hfAcum : activePt.gdAcum} {isHF ? 'HF' : '°D'}
                    </strong>
                  </span>
                  {typeof activePt.tempMinC === 'number' && typeof activePt.tempMaxC === 'number' && (
                    <span className="text-stone-300">
                      T° {activePt.tempMinC}° / {activePt.tempMaxC}°C
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-1 text-[10px] text-stone-400 text-right">
                Pasa el cursor o toca un punto del gráfico para ver el detalle del período.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Barra de controles de gráficos */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-stone-900">
              Gráficos de Acumulación Térmica del Huerto
            </h2>
            <p className="text-[11px] text-stone-500">
              Visualización interactiva por granularidad diaria, semanal o mensual frente a las metas de Kiwi Hayward.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Filtro de granularidad */}
          <div className="inline-flex bg-stone-100 p-1 rounded-xl border border-stone-200">
            {(
              [
                { id: 'todos', label: 'Todos' },
                { id: 'diario', label: 'Diario' },
                { id: 'semanal', label: 'Semanal' },
                { id: 'mensual', label: 'Mensual' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setFiltroPeriodo(opt.id);
                  setHoveredHFIdx(null);
                  setHoveredGDIdx(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  filtroPeriodo === opt.id
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Selector de series */}
          <div className="inline-flex bg-stone-100 p-1 rounded-xl border border-stone-200">
            {(
              [
                { id: 'ambos', label: 'Ambos Gráficos' },
                { id: 'hf', label: 'Solo Horas Frío' },
                { id: 'gd', label: 'Solo Grados Día' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setModoSerie(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  modoSerie === opt.id
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Renderizado de Gráficos */}
      <div className={`grid grid-cols-1 ${modoSerie === 'ambos' ? 'xl:grid-cols-2' : ''} gap-5`}>
        {(modoSerie === 'ambos' || modoSerie === 'hf') &&
          renderChart('hf', hfPoints, metaHF, hoveredHFIdx, setHoveredHFIdx)}
        {(modoSerie === 'ambos' || modoSerie === 'gd') &&
          renderChart('gd', gdPoints, metaGD, hoveredGDIdx, setHoveredGDIdx)}
      </div>
    </div>
  );
};
