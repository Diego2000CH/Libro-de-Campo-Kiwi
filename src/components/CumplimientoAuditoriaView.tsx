import React, { useMemo, useState } from 'react';
import {
  AnalisisLaboratorio,
  CalibracionEquipo,
  InsumoInventario,
  MuestreoMadurez,
  Parcela,
  RegistroCosechaLote,
  RegistroEnvaseLimpio,
  RegistroExtraccionPozo,
  UsuarioPredio,
} from '../types/campo';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Recycle,
  Wrench,
  Plus,
  Trash2,
  Camera,
  X,
  ClipboardCheck,
} from 'lucide-react';
import { compressImageToDataUrl } from '../utils/imageCompress';

interface CumplimientoAuditoriaViewProps {
  usuarios: UsuarioPredio[];
  inventario: InsumoInventario[];
  analisisLaboratorio: AnalisisLaboratorio[];
  registrosPozo: RegistroExtraccionPozo[];
  cosechasLote: RegistroCosechaLote[];
  muestreosMadurez: MuestreoMadurez[];
  parcelas: Parcela[];
  registrosEnvases: RegistroEnvaseLimpio[];
  onAddEnvase: (r: RegistroEnvaseLimpio) => void;
  onDeleteEnvase: (id: string) => void;
  calibracionesEquipo: CalibracionEquipo[];
  onAddCalibracion: (c: CalibracionEquipo) => void;
  onDeleteCalibracion: (id: string) => void;
  auditoriaManual: Record<string, boolean>;
  onToggleAuditoriaManual: (key: string) => void;
  activeUserName?: string;
  canEdit?: boolean;
}

const CHECKS_MANUALES = [
  { id: 'bodega_llave', titulo: 'Bodega Fitosanitarios cerrada con llave, señalética de peligro y bandeja antiderrame' },
  { id: 'higiene_campo', titulo: 'Baños químicos / sanitarios en terreno limpios y con punto de lavado de manos' },
  { id: 'botiquin_ducha', titulo: 'Botiquín de primeros auxilios vigente y ducha de emergencia / lavaojos operativa' },
  { id: 'epp_completo', titulo: 'Entrega documentada de EPP completo a aplicadores (traje, mascarilla filtro, guantes nitrilo)' },
  { id: 'carteles_reingreso', titulo: 'Señalética de "No Ingresar / Tiempo de Reingreso" instalada durante aplicaciones' },
  { id: 'tijeras_desinfeccion', titulo: 'Protocolo de desinfección de tijeras y herramientas entre cuarteles (prevención Psa)' },
];

export const CumplimientoAuditoriaView: React.FC<CumplimientoAuditoriaViewProps> = ({
  usuarios,
  inventario,
  analisisLaboratorio,
  registrosPozo,
  cosechasLote,
  muestreosMadurez,
  parcelas,
  registrosEnvases,
  onAddEnvase,
  onDeleteEnvase,
  calibracionesEquipo,
  onAddCalibracion,
  onDeleteCalibracion,
  auditoriaManual,
  onToggleAuditoriaManual,
  activeUserName,
  canEdit = true,
}) => {
  const [subTab, setSubTab] = useState<'checklist' | 'envases' | 'calibraciones'>('checklist');
  const [isEnvaseModalOpen, setIsEnvaseModalOpen] = useState(false);
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const [envaseForm, setEnvaseForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    productoNombre: '',
    cantidadEnvases: 1,
    capacidadUnidad: '1 L',
    tripleLavadoRealizado: true,
    perforadoInutilizado: true,
    centroAcopioDestino: 'Campo Limpio - Centro de Acopio Comunal',
    numeroComprobante: '',
    observaciones: '',
  });

  const [calForm, setCalForm] = useState<{
    fechaCalibracion: string;
    fechaProximaCalibracion: string;
    equipoNombre: string;
    tipoEquipo: CalibracionEquipo['tipoEquipo'];
    patronMetodo: string;
    desviacionPct: number;
    numeroCertificado: string;
    resultado: CalibracionEquipo['resultado'];
    fotoEvidenciaDataUrl: string;
    observaciones: string;
  }>({
    fechaCalibracion: new Date().toISOString().split('T')[0],
    fechaProximaCalibracion: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
    equipoNombre: '',
    tipoEquipo: 'Pulverizador / Nebulizador',
    patronMetodo: '',
    desviacionPct: 0,
    numeroCertificado: '',
    resultado: 'Aprobado / Calibrado',
    fotoEvidenciaDataUrl: '',
    observaciones: '',
  });

  // Semáforo automático conectado a datos reales del huerto
  const checksAutomaticos = useMemo(() => {
    const hoyMs = Date.now();
    const aplicadores = usuarios.filter((u) => u.rol === 'aplicador_sag' || u.carnetSAGVigente);
    const carnetsVencidos = usuarios.filter(
      (u) => u.fechaVencimientoCarnetSAG && Date.parse(u.fechaVencimientoCarnetSAG) < hoyMs
    );

    const productosVencidos = inventario.filter(
      (i) => i.fechaVencimiento && Date.parse(i.fechaVencimiento) < hoyMs
    );

    const ultimoAgua = analisisLaboratorio
      .filter((a) => a.tipo === 'agua')
      .sort((a, b) => Date.parse(b.fechaMuestreo) - Date.parse(a.fechaMuestreo))[0];
    const aguaVigente = ultimoAgua
      ? (hoyMs - Date.parse(ultimoAgua.fechaMuestreo)) / 86400000 <= 365
      : false;

    const lmrReciente = analisisLaboratorio.some(
      (a) => a.tipo === 'multirresiduos' && a.bajoNormaLmr !== false
    );

    const calsVigentes = calibracionesEquipo.filter(
      (c) => c.resultado === 'Aprobado / Calibrado' && Date.parse(c.fechaProximaCalibracion) >= hoyMs
    );

    const cosechasSinBrixOk = cosechasLote.filter((c) => {
      const m = muestreosMadurez
        .filter((mu) => mu.parcelaId === c.parcelaId)
        .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))[0];
      return !m || m.gradosBrixPromedio < 6.2;
    });

    return [
      {
        id: 'auto_sag',
        titulo: 'Aplicadores con Carnet SAG Vigente',
        ok: aplicadores.length > 0 && carnetsVencidos.length === 0,
        detalle:
          carnetsVencidos.length > 0
            ? `${carnetsVencidos.length} carnet(s) SAG vencido(s).`
            : aplicadores.length > 0
            ? `${aplicadores.length} aplicador(es) habilitado(s) sin vencimientos.`
            : 'Sin aplicadores SAG registrados en Equipo.',
      },
      {
        id: 'auto_bodega',
        titulo: 'Bodega libre de productos vencidos',
        ok: productosVencidos.length === 0,
        detalle:
          productosVencidos.length > 0
            ? `${productosVencidos.length} insumo(s) con fecha vencida en inventario.`
            : 'Ningún insumo vencido en inventario.',
      },
      {
        id: 'auto_agua',
        titulo: 'Análisis de Agua de Riego vigente (< 12 meses)',
        ok: aguaVigente,
        detalle: aguaVigente
          ? `Vigente (${ultimoAgua.fechaMuestreo} · ${ultimoAgua.resultadoGlobal}).`
          : 'Falta registrar análisis de agua vigente en Laboratorio.',
      },
      {
        id: 'auto_lmr',
        titulo: 'Análisis Multirresiduos (LMR) registrado y conforme',
        ok: lmrReciente,
        detalle: lmrReciente
          ? 'Existe informe LMR aprobado para exportación.'
          : 'Sin informe multirresiduos registrado aún.',
      },
      {
        id: 'auto_calibracion',
        titulo: 'Equipos calibrados vigentes (Pulverizador / Refractómetro)',
        ok: calsVigentes.length > 0,
        detalle:
          calsVigentes.length > 0
            ? `${calsVigentes.length} certificado(s) de calibración vigente(s).`
            : 'Sin calibraciones vigentes registradas.',
      },
      {
        id: 'auto_envases',
        titulo: 'Triple Lavado y entrega de envases vacíos (Campo Limpio)',
        ok: registrosEnvases.length > 0 && registrosEnvases.every((e) => e.tripleLavadoRealizado),
        detalle:
          registrosEnvases.length > 0
            ? `${registrosEnvases.reduce((acc, e) => acc + e.cantidadEnvases, 0)} envases entregados con triple lavado.`
            : 'Aún no registras entregas de envases vacíos.',
      },
      {
        id: 'auto_pozo',
        titulo: 'Fiscalización de Pozo DGA con lecturas al día',
        ok: registrosPozo.length > 0,
        detalle:
          registrosPozo.length > 0
            ? `${registrosPozo.length} lectura(s) de flujómetro/horómetro registradas.`
            : 'Sin lecturas DGA registradas en Control Pozo.',
      },
      {
        id: 'auto_madurez',
        titulo: 'Despachos de cosecha respaldados con ≥ 6.2° Brix',
        ok: cosechasLote.length === 0 || cosechasSinBrixOk.length === 0,
        detalle:
          cosechasLote.length === 0
            ? 'Sin despachos de cosecha aún.'
            : cosechasSinBrixOk.length === 0
            ? 'Todos los lotes despachados cuentan con respaldo ≥ 6.2° Brix.'
            : `${cosechasSinBrixOk.length} lote(s) sin muestreo ≥ 6.2° Brix previo.`,
      },
    ];
  }, [
    usuarios,
    inventario,
    analisisLaboratorio,
    calibracionesEquipo,
    registrosEnvases,
    registrosPozo,
    cosechasLote,
    muestreosMadurez,
  ]);

  const totalPuntos = checksAutomaticos.length + CHECKS_MANUALES.length;
  const puntosCumplidos =
    checksAutomaticos.filter((c) => c.ok).length +
    CHECKS_MANUALES.filter((m) => Boolean(auditoriaManual[m.id])).length;
  const porcentajeCumplimiento = Math.round((puntosCumplidos / totalPuntos) * 100);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setCalForm((prev) => ({ ...prev, fotoEvidenciaDataUrl: dataUrl }));
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSaveEnvase = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEnvase({
      id: `env-${Date.now()}`,
      fecha: envaseForm.fecha,
      productoNombre: envaseForm.productoNombre.trim(),
      cantidadEnvases: Number(envaseForm.cantidadEnvases) || 1,
      capacidadUnidad: envaseForm.capacidadUnidad,
      tripleLavadoRealizado: envaseForm.tripleLavadoRealizado,
      perforadoInutilizado: envaseForm.perforadoInutilizado,
      centroAcopioDestino: envaseForm.centroAcopioDestino.trim(),
      numeroComprobante: envaseForm.numeroComprobante.trim() || undefined,
      responsable: activeUserName || 'Responsable de Bodega',
      observaciones: envaseForm.observaciones.trim() || undefined,
    });
    setIsEnvaseModalOpen(false);
    setEnvaseForm((prev) => ({
      ...prev,
      productoNombre: '',
      numeroComprobante: '',
      observaciones: '',
    }));
  };

  const handleSaveCalibracion = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCalibracion({
      id: `cal-${Date.now()}`,
      fechaCalibracion: calForm.fechaCalibracion,
      fechaProximaCalibracion: calForm.fechaProximaCalibracion,
      equipoNombre: calForm.equipoNombre.trim(),
      tipoEquipo: calForm.tipoEquipo,
      patronMetodo: calForm.patronMetodo.trim(),
      desviacionPct: Number(calForm.desviacionPct) || 0,
      numeroCertificado: calForm.numeroCertificado.trim() || undefined,
      resultado: calForm.resultado,
      responsable: activeUserName || 'Encargado Técnico',
      fotoEvidenciaDataUrl: calForm.fotoEvidenciaDataUrl || undefined,
      observaciones: calForm.observaciones.trim() || undefined,
    });
    setIsCalModalOpen(false);
    setCalForm((prev) => ({
      ...prev,
      equipoNombre: '',
      patronMetodo: '',
      numeroCertificado: '',
      fotoEvidenciaDataUrl: '',
      observaciones: '',
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3 h-3" />
            GlobalG.A.P. IFA v6 · BPA · SAG Chile
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Auditoría, Envases Limpios & Calibraciones
          </h1>
          <p className="text-xs text-stone-500">
            Verificación automática en tiempo real de requisitos de auditoría, triple lavado de envases y certificados de calibración.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold flex">
            <button
              type="button"
              onClick={() => setSubTab('checklist')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                subTab === 'checklist' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600'
              }`}
            >
              Checklist Auditoría
            </button>
            <button
              type="button"
              onClick={() => setSubTab('envases')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                subTab === 'envases' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600'
              }`}
            >
              Triple Lavado ({registrosEnvases.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('calibraciones')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                subTab === 'calibraciones' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600'
              }`}
            >
              Calibraciones ({calibracionesEquipo.length})
            </button>
          </div>
        </div>
      </div>

      {/* Subtab 1: Checklist */}
      {subTab === 'checklist' && (
        <div className="space-y-5">
          {/* Barra de Cumplimiento */}
          <div className="bg-gradient-to-r from-emerald-950 to-teal-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Índice de Preparación para Auditoría
              </div>
              <div className="text-3xl font-black mt-1">
                {porcentajeCumplimiento}%{' '}
                <span className="text-sm font-medium text-emerald-200">
                  ({puntosCumplidos} de {totalPuntos} puntos cumplidos)
                </span>
              </div>
              <div className="w-full sm:w-80 h-2.5 bg-white/15 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: `${porcentajeCumplimiento}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-emerald-100 max-w-xs">
              Los 8 puntos automáticos se validan solos con los datos de tus módulos; los 6 de terreno se marcan durante tu ronda de inspección.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Verificaciones Automáticas */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
              <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50">
                <h2 className="font-bold text-xs uppercase tracking-wider text-stone-700 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-700" />
                  Validación Automática del Sistema
                </h2>
              </div>
              <div className="divide-y divide-stone-100 text-xs">
                {checksAutomaticos.map((c) => (
                  <div key={c.id} className="p-3.5 flex items-start gap-3">
                    {c.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-stone-900">{c.titulo}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">{c.detalle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verificaciones Manuales */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
              <div className="px-5 py-3.5 border-b border-stone-200 bg-stone-50">
                <h2 className="font-bold text-xs uppercase tracking-wider text-stone-700 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Inspección Presencial de Predio & Bodega
                </h2>
              </div>
              <div className="divide-y divide-stone-100 text-xs">
                {CHECKS_MANUALES.map((m) => {
                  const checked = Boolean(auditoriaManual[m.id]);
                  return (
                    <label
                      key={m.id}
                      className={`p-3.5 flex items-start gap-3 ${canEdit ? 'cursor-pointer hover:bg-stone-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!canEdit}
                        onChange={() => onToggleAuditoriaManual(m.id)}
                        className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className={`font-medium ${checked ? 'text-emerald-950 font-semibold' : 'text-stone-700'}`}>
                        {m.titulo}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Triple Lavado */}
      {subTab === 'envases' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Recycle className="w-4 h-4 text-emerald-700" />
                Registro de Triple Lavado y Entrega de Envases Vacíos
              </h2>
              <p className="text-[11px] text-stone-500">
                Trazabilidad exigida por SAG y Campo Limpio para disposición final de envases fitosanitarios.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEnvaseModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Entrega</span>
              </button>
            )}
          </div>

          {registrosEnvases.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              No hay entregas de envases registradas aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Producto / Envase</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Protocolo</th>
                    <th className="px-4 py-3">Centro Acopio / Comprobante</th>
                    <th className="px-4 py-3">Responsable</th>
                    {canEdit && <th className="px-4 py-3 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {registrosEnvases.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 font-mono">{r.fecha}</td>
                      <td className="px-4 py-3 font-bold text-stone-900">{r.productoNombre}</td>
                      <td className="px-4 py-3 font-mono">
                        {r.cantidadEnvases} u ({r.capacidadUnidad})
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {r.tripleLavadoRealizado ? '3x Lavado OK' : 'Sin 3x Lavado'}
                          {r.perforadoInutilizado ? ' · Perforado' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-800">{r.centroAcopioDestino}</div>
                        {r.numeroComprobante && (
                          <div className="font-mono text-[10px] text-stone-500">Comp: {r.numeroComprobante}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{r.responsable}</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteEnvase(r.id)}
                            className="p-1 text-stone-400 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Subtab 3: Calibraciones */}
      {subTab === 'calibraciones' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-700" />
                Calibración de Equipos (Nebulizadores, Refractómetros, Romanas)
              </h2>
              <p className="text-[11px] text-stone-500">
                Control de calibración periódica exigida para asegurar dosis exactas y lecturas oficiales de cosecha.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsCalModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Calibración</span>
              </button>
            )}
          </div>

          {calibracionesEquipo.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              No hay calibraciones registradas aún.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Fecha Cal.</th>
                    <th className="px-4 py-3">Próxima</th>
                    <th className="px-4 py-3">Equipo / Tipo</th>
                    <th className="px-4 py-3">Método / Desviación</th>
                    <th className="px-4 py-3">Resultado</th>
                    <th className="px-4 py-3">Evidencia</th>
                    {canEdit && <th className="px-4 py-3 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {calibracionesEquipo.map((c) => {
                    const vencido = Date.parse(c.fechaProximaCalibracion) < Date.now();
                    return (
                      <tr key={c.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-mono">{c.fechaCalibracion}</td>
                        <td className={`px-4 py-3 font-mono font-bold ${vencido ? 'text-rose-700' : 'text-stone-700'}`}>
                          {c.fechaProximaCalibracion}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-stone-900">{c.equipoNombre}</div>
                          <div className="text-[10px] text-stone-500">{c.tipoEquipo}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{c.patronMetodo || '—'}</div>
                          <div className="font-mono text-[10px] text-stone-500">Desv: {c.desviacionPct}%</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.resultado === 'Aprobado / Calibrado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.resultado === 'Requiere Ajuste'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {c.resultado}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {c.fotoEvidenciaDataUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewPhoto(c.fotoEvidenciaDataUrl!)}
                              className="px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Camera className="w-3 h-3" /> Foto
                            </button>
                          ) : (
                            <span className="text-stone-400 text-[10px]">—</span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => onDeleteCalibracion(c.id)}
                              className="p-1 text-stone-400 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Envases */}
      {isEnvaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Triple Lavado & Entrega de Envases</h3>
              <button type="button" onClick={() => setIsEnvaseModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEnvase} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha:</label>
                  <input type="date" value={envaseForm.fecha} onChange={(e) => setEnvaseForm({ ...envaseForm, fecha: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Producto / Envase:</label>
                  <input type="text" value={envaseForm.productoNombre} onChange={(e) => setEnvaseForm({ ...envaseForm, productoNombre: e.target.value })} placeholder="Ej. Cobre / Fungicida" className="w-full p-2 border border-stone-300 rounded-lg" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cantidad de Envases:</label>
                  <input type="number" min="1" value={envaseForm.cantidadEnvases} onChange={(e) => setEnvaseForm({ ...envaseForm, cantidadEnvases: parseInt(e.target.value) || 1 })} className="w-full p-2 border border-stone-300 rounded-lg font-bold" required />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Capacidad Unitaria:</label>
                  <input type="text" value={envaseForm.capacidadUnidad} onChange={(e) => setEnvaseForm({ ...envaseForm, capacidadUnidad: e.target.value })} placeholder="1 L, 5 L, 20 Kg" className="w-full p-2 border border-stone-300 rounded-lg" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <label className="inline-flex items-center gap-2 font-bold text-emerald-950 cursor-pointer">
                  <input type="checkbox" checked={envaseForm.tripleLavadoRealizado} onChange={(e) => setEnvaseForm({ ...envaseForm, tripleLavadoRealizado: e.target.checked })} />
                  Triple Lavado ejecutado
                </label>
                <label className="inline-flex items-center gap-2 font-bold text-emerald-950 cursor-pointer">
                  <input type="checkbox" checked={envaseForm.perforadoInutilizado} onChange={(e) => setEnvaseForm({ ...envaseForm, perforadoInutilizado: e.target.checked })} />
                  Envase perforado e inutilizado
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Centro de Acopio:</label>
                  <input type="text" value={envaseForm.centroAcopioDestino} onChange={(e) => setEnvaseForm({ ...envaseForm, centroAcopioDestino: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° Comprobante / Guía:</label>
                  <input type="text" value={envaseForm.numeroComprobante} onChange={(e) => setEnvaseForm({ ...envaseForm, numeroComprobante: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button type="button" onClick={() => setIsEnvaseModalOpen(false)} className="px-4 py-2 border border-stone-300 rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Calibración */}
      {isCalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Calibración de Equipo</h3>
              <button type="button" onClick={() => setIsCalModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCalibracion} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre / ID Equipo:</label>
                  <input type="text" value={calForm.equipoNombre} onChange={(e) => setCalForm({ ...calForm, equipoNombre: e.target.value })} placeholder="Ej. Nebulizador 2000L" className="w-full p-2 border border-stone-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tipo Equipo:</label>
                  <select value={calForm.tipoEquipo} onChange={(e) => setCalForm({ ...calForm, tipoEquipo: e.target.value as CalibracionEquipo['tipoEquipo'] })} className="w-full p-2 border border-stone-300 rounded-lg">
                    <option value="Pulverizador / Nebulizador">Pulverizador / Nebulizador</option>
                    <option value="Refractómetro">Refractómetro</option>
                    <option value="Penetrómetro">Penetrómetro</option>
                    <option value="Romana / Báscula">Romana / Báscula</option>
                    <option value="Medidor pH/CE">Medidor pH/CE</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha Calibración:</label>
                  <input type="date" value={calForm.fechaCalibracion} onChange={(e) => setCalForm({ ...calForm, fechaCalibracion: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Próxima Calibración:</label>
                  <input type="date" value={calForm.fechaProximaCalibracion} onChange={(e) => setCalForm({ ...calForm, fechaProximaCalibracion: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Método / Patrón Usado:</label>
                  <input type="text" value={calForm.patronMetodo} onChange={(e) => setCalForm({ ...calForm, patronMetodo: e.target.value })} placeholder="Ej. Aforo boquillas L/min / Agua destilada 0°" className="w-full p-2 border border-stone-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Desviación %:</label>
                  <input type="number" step="0.1" value={calForm.desviacionPct} onChange={(e) => setCalForm({ ...calForm, desviacionPct: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 rounded-lg font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Resultado:</label>
                  <select value={calForm.resultado} onChange={(e) => setCalForm({ ...calForm, resultado: e.target.value as CalibracionEquipo['resultado'] })} className="w-full p-2 border border-stone-300 rounded-lg font-bold">
                    <option value="Aprobado / Calibrado">Aprobado / Calibrado</option>
                    <option value="Requiere Ajuste">Requiere Ajuste</option>
                    <option value="Fuera de Servicio">Fuera de Servicio</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Foto Certificado / Boquillas:</label>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full text-[11px]" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button type="button" onClick={() => setIsCalModalOpen(false)} className="px-4 py-2 border border-stone-300 rounded-xl cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer">Guardar Calibración</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPreviewPhoto(null)}>
          <div className="max-w-xl w-full bg-white rounded-2xl p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-700">Foto Evidencia de Calibración</span>
              <button type="button" onClick={() => setPreviewPhoto(null)} className="text-stone-500 hover:text-stone-900 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <img src={previewPhoto} alt="Calibración" className="w-full max-h-[75vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
