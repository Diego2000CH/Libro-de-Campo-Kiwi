import React, { useMemo, useState } from 'react';
import {
  AnalisisLaboratorio,
  Parcela,
  TipoAnalisisLaboratorio,
} from '../types/campo';
import {
  FlaskConical,
  Plus,
  Trash2,
  Droplets,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Bug,
  Camera,
  TrendingUp,
  X,
  ExternalLink,
} from 'lucide-react';
import { compressImageToDataUrl } from '../utils/imageCompress';

interface LaboratorioViewProps {
  analisis: AnalisisLaboratorio[];
  parcelas: Parcela[];
  onAddAnalisis: (a: AnalisisLaboratorio) => void;
  onDeleteAnalisis: (id: string) => void;
  canEdit?: boolean;
}

const TIPO_META: Record<
  TipoAnalisisLaboratorio,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  suelo: {
    label: 'Análisis de Suelo',
    shortLabel: 'Suelo',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/80',
  },
  agua: {
    label: 'Agua de Riego (GlobalGAP)',
    shortLabel: 'Agua',
    badgeClass: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800/80',
  },
  foliar: {
    label: 'Análisis Foliar',
    shortLabel: 'Foliar',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/80',
  },
  multirresiduos: {
    label: 'Multirresiduos (LMR)',
    shortLabel: 'LMR',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/80',
  },
  psa_patologia: {
    label: 'Patología / PCR Psa',
    shortLabel: 'Psa / Patología',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800/80',
  },
};

export const LaboratorioView: React.FC<LaboratorioViewProps> = ({
  analisis,
  parcelas,
  onAddAnalisis,
  onDeleteAnalisis,
  canEdit = true,
}) => {
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoAnalisisLaboratorio>('todos');
  const [filtroParcela, setFiltroParcela] = useState<string>('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const defaultTemporada = `${currentYear - 1}-${currentYear}`;

  const [form, setForm] = useState<{
    tipo: TipoAnalisisLaboratorio;
    fechaMuestreo: string;
    fechaResultado: string;
    temporada: string;
    parcelaId: string;
    laboratorio: string;
    codigoInforme: string;
    resultadoGlobal: AnalisisLaboratorio['resultadoGlobal'];
    ph: string;
    ceDsM: string;
    materiaOrganicaPct: string;
    nitrogenoPpm: string;
    fosforoPpm: string;
    potasioPpm: string;
    boroPpm: string;
    zincPpm: string;
    coliformesFecales: string;
    eColi: string;
    nitratosMgL: string;
    moleculasDetectadas: string;
    bajoNormaLmr: boolean;
    mercadoObjetivo: string;
    organoMuestreado: string;
    agenteDetectado: string;
    urlDocumento: string;
    fotoEvidenciaDataUrl: string;
    observaciones: string;
  }>({
    tipo: 'suelo',
    fechaMuestreo: new Date().toISOString().split('T')[0],
    fechaResultado: new Date().toISOString().split('T')[0],
    temporada: defaultTemporada,
    parcelaId: parcelas[0]?.id || 'predio-pozo',
    laboratorio: '',
    codigoInforme: '',
    resultadoGlobal: 'Óptimo',
    ph: '',
    ceDsM: '',
    materiaOrganicaPct: '',
    nitrogenoPpm: '',
    fosforoPpm: '',
    potasioPpm: '',
    boroPpm: '',
    zincPpm: '',
    coliformesFecales: '',
    eColi: '',
    nitratosMgL: '',
    moleculasDetectadas: '',
    bajoNormaLmr: true,
    mercadoObjetivo: 'UE / GlobalG.A.P.',
    organoMuestreado: '',
    agenteDetectado: '',
    urlDocumento: '',
    fotoEvidenciaDataUrl: '',
    observaciones: '',
  });

  const analisisFiltrados = useMemo(() => {
    return [...analisis]
      .filter((a) => (filtroTipo === 'todos' ? true : a.tipo === filtroTipo))
      .filter((a) => (filtroParcela === 'todas' ? true : a.parcelaId === filtroParcela))
      .sort((a, b) => Date.parse(b.fechaMuestreo) - Date.parse(a.fechaMuestreo));
  }, [analisis, filtroTipo, filtroParcela]);

  const analisisAgua = analisis.filter((a) => a.tipo === 'agua');
  const ultimoAgua = [...analisisAgua].sort(
    (a, b) => Date.parse(b.fechaMuestreo) - Date.parse(a.fechaMuestreo)
  )[0];
  const aguaVigente = ultimoAgua
    ? (Date.now() - Date.parse(ultimoAgua.fechaMuestreo)) / (1000 * 60 * 60 * 24) <= 365
    : false;

  const multirresiduosOk = analisis.filter(
    (a) => a.tipo === 'multirresiduos' && a.bajoNormaLmr !== false
  ).length;
  const alertasLab = analisis.filter(
    (a) =>
      a.resultadoGlobal === 'Crítico / Rechazo' ||
      a.resultadoGlobal === 'Positivo' ||
      a.bajoNormaLmr === false
  ).length;

  // Comparativa histórica de suelo/foliar por fecha
  const comparativaNutricional = useMemo(() => {
    return [...analisis]
      .filter((a) => (a.tipo === 'suelo' || a.tipo === 'foliar') && (filtroParcela === 'todas' || a.parcelaId === filtroParcela))
      .sort((a, b) => Date.parse(a.fechaMuestreo) - Date.parse(b.fechaMuestreo))
      .slice(-8);
  }, [analisis, filtroParcela]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setForm((prev) => ({ ...prev, fotoEvidenciaDataUrl: dataUrl }));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'No se pudo procesar la imagen.');
    }
  };

  const toNum = (v: string): number | undefined => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parcelas.find((item) => item.id === form.parcelaId);
    const parcelaNombre =
      form.parcelaId === 'predio-pozo'
        ? 'Pozo / Cabezal de Riego'
        : p?.nombre || form.parcelaId || 'Predio General';

    const nuevo: AnalisisLaboratorio = {
      id: `lab-ext-${Date.now()}`,
      tipo: form.tipo,
      fechaMuestreo: form.fechaMuestreo,
      fechaResultado: form.fechaResultado || form.fechaMuestreo,
      temporada: form.temporada.trim() || defaultTemporada,
      parcelaId: form.parcelaId,
      parcelaNombre,
      laboratorio: form.laboratorio.trim(),
      codigoInforme: form.codigoInforme.trim(),
      resultadoGlobal: form.resultadoGlobal,
      ph: toNum(form.ph),
      ceDsM: toNum(form.ceDsM),
      materiaOrganicaPct: toNum(form.materiaOrganicaPct),
      nitrogenoPpm: toNum(form.nitrogenoPpm),
      fosforoPpm: toNum(form.fosforoPpm),
      potasioPpm: toNum(form.potasioPpm),
      boroPpm: toNum(form.boroPpm),
      zincPpm: toNum(form.zincPpm),
      coliformesFecales: form.coliformesFecales.trim() || undefined,
      eColi: form.eColi.trim() || undefined,
      nitratosMgL: toNum(form.nitratosMgL),
      moleculasDetectadas: form.moleculasDetectadas.trim() || undefined,
      bajoNormaLmr: form.tipo === 'multirresiduos' ? form.bajoNormaLmr : undefined,
      mercadoObjetivo: form.mercadoObjetivo.trim() || undefined,
      organoMuestreado: form.organoMuestreado.trim() || undefined,
      agenteDetectado: form.agenteDetectado.trim() || undefined,
      urlDocumento: form.urlDocumento.trim() || undefined,
      fotoEvidenciaDataUrl: form.fotoEvidenciaDataUrl || undefined,
      observaciones: form.observaciones.trim() || undefined,
    };

    onAddAnalisis(nuevo);
    setIsModalOpen(false);
    setForm((prev) => ({
      ...prev,
      codigoInforme: '',
      laboratorio: '',
      ph: '',
      ceDsM: '',
      materiaOrganicaPct: '',
      nitrogenoPpm: '',
      fosforoPpm: '',
      potasioPpm: '',
      boroPpm: '',
      zincPpm: '',
      coliformesFecales: '',
      eColi: '',
      nitratosMgL: '',
      moleculasDetectadas: '',
      organoMuestreado: '',
      agenteDetectado: '',
      urlDocumento: '',
      fotoEvidenciaDataUrl: '',
      observaciones: '',
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 text-[10px] font-bold uppercase tracking-wider mb-1">
            <FlaskConical className="w-3 h-3" />
            Respaldo Técnico & Inocuidad Exportadora
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Análisis de Laboratorio (Suelo, Agua, Foliar & LMR)
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Historial técnico por cuartel y pozo para fertilización de precisión, cumplimiento GlobalG.A.P., multirresiduos y Psa.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Análisis</span>
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-stone-400">Informes Registrados</div>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">{analisis.length}</div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Historial multi-temporada</div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-stone-400">Agua de Riego (BPA)</div>
          <div className="flex items-center gap-1.5 mt-1">
            {aguaVigente ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
            <span className={`text-lg font-black ${aguaVigente ? 'text-emerald-900 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-300'}`}>
              {aguaVigente ? 'Vigente' : analisisAgua.length === 0 ? 'Sin registro' : 'Vencido (>1 año)'}
            </span>
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            {ultimoAgua ? `Último: ${ultimoAgua.fechaMuestreo}` : 'Requerido 1 vez al año'}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-stone-400">Multirresiduos (LMR)</div>
          <div className="text-2xl font-black text-indigo-900 dark:text-indigo-200 mt-1">{multirresiduosOk} OK</div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Informes aptos exportación</div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[10px] font-bold uppercase text-stone-400">Alertas Sanitarias</div>
          <div className={`text-2xl font-black mt-1 ${alertasLab > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-800 dark:text-emerald-300'}`}>
            {alertasLab}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
            {alertasLab > 0 ? 'Requiere revisión agronómica' : 'Sin resultados críticos'}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFiltroTipo('todos')}
            className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
              filtroTipo === 'todos' ? 'bg-stone-900 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            Todos ({analisis.length})
          </button>
          {(Object.keys(TIPO_META) as TipoAnalisisLaboratorio[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFiltroTipo(t)}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                filtroTipo === t ? 'bg-emerald-800 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {TIPO_META[t].shortLabel} ({analisis.filter((a) => a.tipo === t).length})
            </button>
          ))}
        </div>

        <select
          value={filtroParcela}
          onChange={(e) => setFiltroParcela(e.target.value)}
          className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-medium text-stone-700 dark:text-stone-300"
        >
          <option value="todas">Todos los cuarteles y pozo</option>
          <option value="predio-pozo">Pozo / Cabezal de Riego</option>
          {parcelas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Comparativa Histórica Suelo / Foliar */}
      {comparativaNutricional.length > 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Evolución Nutricional Comparativa (Suelo & Foliar)
            </h2>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">Últimos {comparativaNutricional.length} informes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Cuartel</th>
                  <th className="px-3 py-2">pH</th>
                  <th className="px-3 py-2">CE (dS/m)</th>
                  <th className="px-3 py-2">M.O. %</th>
                  <th className="px-3 py-2">N / P / K (ppm)</th>
                  <th className="px-3 py-2">B / Zn (ppm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono text-[11px]">
                {comparativaNutricional.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/70">
                    <td className="px-3 py-2 font-bold text-stone-800 dark:text-stone-200">{c.fechaMuestreo}</td>
                    <td className="px-3 py-2 font-sans">{TIPO_META[c.tipo].shortLabel}</td>
                    <td className="px-3 py-2 font-sans font-semibold text-stone-900 dark:text-stone-100">{c.parcelaNombre}</td>
                    <td className="px-3 py-2">{c.ph ?? '—'}</td>
                    <td className="px-3 py-2">{c.ceDsM ?? '—'}</td>
                    <td className="px-3 py-2">{c.materiaOrganicaPct !== undefined ? `${c.materiaOrganicaPct}%` : '—'}</td>
                    <td className="px-3 py-2">
                      {[c.nitrogenoPpm ?? '—', c.fosforoPpm ?? '—', c.potasioPpm ?? '—'].join(' / ')}
                    </td>
                    <td className="px-3 py-2">
                      {[c.boroPpm ?? '—', c.zincPpm ?? '—'].join(' / ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Listado de Informes */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
            Historial de Informes de Laboratorio
          </h2>
          <span className="text-xs text-stone-400">{analisisFiltrados.length} registros</span>
        </div>

        {analisisFiltrados.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 dark:text-stone-400 space-y-2">
            <FlaskConical className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="font-semibold text-stone-700 dark:text-stone-300">No hay análisis registrados con los filtros actuales.</p>
            <p>Registra análisis de suelo, agua de riego, foliares, multirresiduos o PCR de Psa para mantener tu historial al día.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {analisisFiltrados.map((item) => {
              const meta = TIPO_META[item.tipo];
              return (
                <div key={item.id} className="p-4 hover:bg-stone-50/70 dark:hover:bg-stone-800/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                      <span className="font-mono text-stone-500 dark:text-stone-400 font-semibold">{item.fechaMuestreo}</span>
                      <span className="font-bold text-stone-900 dark:text-stone-100">{item.parcelaNombre}</span>
                      {item.codigoInforme && (
                        <span className="font-mono text-[11px] bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded text-stone-700 dark:text-stone-300">
                          Inf. {item.codigoInforme}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.resultadoGlobal === 'Óptimo' || item.resultadoGlobal === 'Negativo (Limpio)'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : item.resultadoGlobal === 'Atención / Corregir'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {item.resultadoGlobal}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-600 dark:text-stone-400 flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        <strong>Lab:</strong> {item.laboratorio || 'No indicado'}
                      </span>
                      <span>
                        <strong>Temporada:</strong> {item.temporada}
                      </span>
                      {item.tipo === 'agua' && (
                        <span>
                          <strong>Agua:</strong> E.coli {item.eColi || '—'} · Coliformes {item.coliformesFecales || '—'} · pH {item.ph ?? '—'} · CE {item.ceDsM ?? '—'} dS/m
                        </span>
                      )}
                      {item.tipo === 'multirresiduos' && (
                        <span>
                          <strong>LMR ({item.mercadoObjetivo || 'Exportación'}):</strong> {item.bajoNormaLmr !== false ? 'Cumple norma LMR' : 'Excede LMR'} · Moléculas: {item.moleculasDetectadas || 'No detectadas (< LOQ)'}
                        </span>
                      )}
                      {item.tipo === 'psa_patologia' && (
                        <span>
                          <strong>Órgano:</strong> {item.organoMuestreado || '—'} · <strong>Agente:</strong> {item.agenteDetectado || 'Negativo'}
                        </span>
                      )}
                      {(item.tipo === 'suelo' || item.tipo === 'foliar') && (
                        <span>
                          pH {item.ph ?? '—'} · CE {item.ceDsM ?? '—'} · N {item.nitrogenoPpm ?? '—'} / P {item.fosforoPpm ?? '—'} / K {item.potasioPpm ?? '—'} ppm · B {item.boroPpm ?? '—'} / Zn {item.zincPpm ?? '—'}
                        </span>
                      )}
                    </div>

                    {item.observaciones && <p className="text-[11px] text-stone-500 dark:text-stone-400">{item.observaciones}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.fotoEvidenciaDataUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto(item.fotoEvidenciaDataUrl!)}
                        className="px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Ver Foto
                      </button>
                    )}
                    {item.urlDocumento && (
                      <a
                        href={item.urlDocumento}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        PDF
                      </a>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onDeleteAnalisis(item.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg cursor-pointer"
                        title="Eliminar informe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nuevo Análisis */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-2xl border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-400" />
                Registrar Análisis de Laboratorio
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Tipo de Análisis:</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => {
                      const nextTipo = e.target.value as TipoAnalisisLaboratorio;
                      setForm({
                        ...form,
                        tipo: nextTipo,
                        parcelaId: nextTipo === 'agua' ? 'predio-pozo' : parcelas[0]?.id || 'predio-pozo',
                        resultadoGlobal: nextTipo === 'psa_patologia' ? 'Negativo (Limpio)' : 'Óptimo',
                      });
                    }}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-semibold dark:text-stone-100"
                  >
                    <option value="suelo">Análisis de Suelo</option>
                    <option value="agua">Agua de Riego (BPA/GlobalGAP)</option>
                    <option value="foliar">Análisis Foliar</option>
                    <option value="multirresiduos">Multirresiduos (LMR)</option>
                    <option value="psa_patologia">Patología / PCR Psa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Cuartel / Fuente:</label>
                  <select
                    value={form.parcelaId}
                    onChange={(e) => setForm({ ...form, parcelaId: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                  >
                    <option value="predio-pozo">Pozo / Cabezal de Riego</option>
                    {parcelas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Temporada:</label>
                  <input
                    type="text"
                    value={form.temporada}
                    onChange={(e) => setForm({ ...form, temporada: e.target.value })}
                    placeholder="2025-2026"
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha Muestreo:</label>
                  <input
                    type="date"
                    value={form.fechaMuestreo}
                    onChange={(e) => setForm({ ...form, fechaMuestreo: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Laboratorio:</label>
                  <input
                    type="text"
                    value={form.laboratorio}
                    onChange={(e) => setForm({ ...form, laboratorio: e.target.value })}
                    placeholder="Ej. Agrolab, Agroanálisis UC"
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">N° Informe / Código:</label>
                  <input
                    type="text"
                    value={form.codigoInforme}
                    onChange={(e) => setForm({ ...form, codigoInforme: e.target.value })}
                    placeholder="Ej. INF-2026-041"
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Evaluación / Resultado Global:</label>
                <select
                  value={form.resultadoGlobal}
                  onChange={(e) => setForm({ ...form, resultadoGlobal: e.target.value as AnalisisLaboratorio['resultadoGlobal'] })}
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-bold dark:text-stone-100"
                >
                  <option value="Óptimo">Óptimo</option>
                  <option value="Atención / Corregir">Atención / Corregir</option>
                  <option value="Crítico / Rechazo">Crítico / Rechazo</option>
                  <option value="Negativo (Limpio)">Negativo (Limpio)</option>
                  <option value="Positivo">Positivo</option>
                </select>
              </div>

              {(form.tipo === 'suelo' || form.tipo === 'foliar') && (
                <div className="p-3 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-stone-200 dark:border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">pH</label>
                    <input type="number" step="0.1" value={form.ph} onChange={(e) => setForm({ ...form, ph: e.target.value })} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">CE (dS/m)</label>
                    <input type="number" step="0.01" value={form.ceDsM} onChange={(e) => setForm({ ...form, ceDsM: e.target.value })} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">M.O. (%)</label>
                    <input type="number" step="0.1" value={form.materiaOrganicaPct} onChange={(e) => setForm({ ...form, materiaOrganicaPct: e.target.value })} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">N (ppm)</label>
                    <input type="number" step="0.1" value={form.nitrogenoPpm} onChange={(e) => setForm({ ...form, nitrogenoPpm: e.target.value })} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">P (ppm)</label>
                    <input type="number" step="0.1" value={form.fosforoPpm} onChange={(e) => setForm({ ...form, fosforoPpm: e.target.value })} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">K (ppm)</label>
                    <input type="number" step="0.1" value={form.potasioPpm} onChange={(e) => setForm({ ...form, potasioPpm: e.target.value })} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">Boro (ppm)</label>
                    <input type="number" step="0.01" value={form.boroPpm} onChange={(e) => setForm({ ...form, boroPpm: e.target.value })} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 dark:text-stone-400 mb-1">Zinc (ppm)</label>
                    <input type="number" step="0.01" value={form.zincPpm} onChange={(e) => setForm({ ...form, zincPpm: e.target.value })} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded dark:text-stone-100" />
                  </div>
                </div>
              )}

              {form.tipo === 'agua' && (
                <div className="p-3 bg-cyan-50/70 dark:bg-cyan-950/40 rounded-xl border border-cyan-200 dark:border-cyan-800/80 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-cyan-950 dark:text-cyan-100 mb-1">E. coli (NMP/100mL)</label>
                    <input type="text" value={form.eColi} onChange={(e) => setForm({ ...form, eColi: e.target.value })} placeholder="Ej. < 1.8" className="w-full p-1.5 bg-white dark:bg-stone-800 border border-cyan-300 dark:border-cyan-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-cyan-950 dark:text-cyan-100 mb-1">Coliformes Fecales</label>
                    <input type="text" value={form.coliformesFecales} onChange={(e) => setForm({ ...form, coliformesFecales: e.target.value })} placeholder="Ej. < 100" className="w-full p-1.5 bg-white dark:bg-stone-800 border border-cyan-300 dark:border-cyan-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-cyan-950 dark:text-cyan-100 mb-1">Nitratos (mg/L)</label>
                    <input type="number" step="0.1" value={form.nitratosMgL} onChange={(e) => setForm({ ...form, nitratosMgL: e.target.value })} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-cyan-300 dark:border-cyan-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-cyan-950 dark:text-cyan-100 mb-1">pH Agua</label>
                    <input type="number" step="0.1" value={form.ph} onChange={(e) => setForm({ ...form, ph: e.target.value })} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-cyan-300 dark:border-cyan-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-cyan-950 dark:text-cyan-100 mb-1">CE (dS/m)</label>
                    <input type="number" step="0.01" value={form.ceDsM} onChange={(e) => setForm({ ...form, ceDsM: e.target.value })} className="w-full p-1.5 bg-white dark:bg-stone-800 border border-cyan-300 dark:border-cyan-700 rounded dark:text-stone-100" />
                  </div>
                </div>
              )}

              {form.tipo === 'multirresiduos' && (
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-indigo-950 dark:text-indigo-100 mb-1">Mercado Objetivo (Norma LMR):</label>
                      <input type="text" value={form.mercadoObjetivo} onChange={(e) => setForm({ ...form, mercadoObjetivo: e.target.value })} placeholder="UE / GlobalG.A.P., USA, China" className="w-full p-1.5 bg-white dark:bg-stone-800 border border-indigo-300 dark:border-indigo-700 rounded dark:text-stone-100" />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="inline-flex items-center gap-2 font-bold text-indigo-950 dark:text-indigo-100 cursor-pointer">
                        <input type="checkbox" checked={form.bajoNormaLmr} onChange={(e) => setForm({ ...form, bajoNormaLmr: e.target.checked })} className="rounded" />
                        Cumple Límites Máximos de Residuos (LMR)
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-indigo-950 dark:text-indigo-100 mb-1">Moléculas Detectadas (ppm o &lt; LOQ):</label>
                    <input type="text" value={form.moleculasDetectadas} onChange={(e) => setForm({ ...form, moleculasDetectadas: e.target.value })} placeholder="Ej. Sin trazas detectadas (< 0.01 ppm)" className="w-full p-1.5 bg-white dark:bg-stone-800 border border-indigo-300 dark:border-indigo-700 rounded dark:text-stone-100" />
                  </div>
                </div>
              )}

              {form.tipo === 'psa_patologia' && (
                <div className="p-3 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-rose-950 dark:text-rose-100 mb-1">Órgano / Tejido Muestreado:</label>
                    <input type="text" value={form.organoMuestreado} onChange={(e) => setForm({ ...form, organoMuestreado: e.target.value })} placeholder="Ej. Yemas, hojas, exudado" className="w-full p-1.5 bg-white dark:bg-stone-800 border border-rose-300 dark:border-rose-700 rounded dark:text-stone-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-rose-950 dark:text-rose-100 mb-1">Agente / Resultado PCR:</label>
                    <input type="text" value={form.agenteDetectado} onChange={(e) => setForm({ ...form, agenteDetectado: e.target.value })} placeholder="Ej. No detectado (Negativo Psa)" className="w-full p-1.5 bg-white dark:bg-stone-800 border border-rose-300 dark:border-rose-700 rounded dark:text-stone-100" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Enlace PDF / Drive del Informe (opcional):</label>
                  <input
                    type="url"
                    value={form.urlDocumento}
                    onChange={(e) => setForm({ ...form, urlDocumento: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Foto del Informe / Muestra (comprimida):</label>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full text-[11px] text-stone-600 dark:text-stone-400 bg-white dark:bg-stone-800" />
                  {photoError && <p className="text-rose-600 text-[10px] mt-1">{photoError}</p>}
                  {form.fotoEvidenciaDataUrl && (
                    <img src={form.fotoEvidenciaDataUrl} alt="Vista previa" className="mt-1.5 h-16 rounded-lg border border-stone-200 dark:border-stone-800 object-cover" />
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Observaciones Agronómicas / Plan de Enmienda:</label>
                <textarea
                  rows={2}
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded-xl text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/70 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-xs">
                  Guardar Análisis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zoom Foto */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewPhoto(null)}>
          <div className="max-w-2xl w-full bg-white dark:bg-stone-900 rounded-2xl p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300">Evidencia Adjunta de Laboratorio</span>
              <button type="button" onClick={() => setPreviewPhoto(null)} className="text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={previewPhoto} alt="Evidencia" className="w-full max-h-[75vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
