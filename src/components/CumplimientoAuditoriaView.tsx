import React, { useMemo, useState } from 'react';
import {
  AnalisisLaboratorio,
  CalibracionEquipo,
  EstadoPuntoAuditoriaBPA,
  InsumoInventario,
  ItemAuditoriaBPA,
  MuestreoMadurez,
  Parcela,
  PlanillaAuditoriaBPA,
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
  RotateCcw,
  Sparkles,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Search,
  MinusCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { compressImageToDataUrl } from '../utils/imageCompress';
import { createBlankPlanillaBpa, PREFORMED_BPA_TEMPLATE_ITEMS } from '../utils/storage';
import { diasHastaVencimientoProducto } from '../utils/productDates';

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
  auditoriaManual?: Record<string, boolean>;
  onToggleAuditoriaManual?: (key: string) => void;
  planillaBpa: PlanillaAuditoriaBPA;
  onUpdatePlanillaBpa: (next: PlanillaAuditoriaBPA) => void;
  fundoNombre?: string;
  activeUserName?: string;
  canEdit?: boolean;
}

const ESTADO_LABELS: Record<EstadoPuntoAuditoriaBPA, string> = {
  pendiente: 'Pendiente',
  cumple: 'Cumple',
  no_cumple: 'No Cumple',
  na: 'N/A',
};

export const CumplimientoAuditoriaView: React.FC<CumplimientoAuditoriaViewProps> = ({
  usuarios,
  inventario,
  analisisLaboratorio,
  registrosPozo,
  cosechasLote,
  muestreosMadurez,
  registrosEnvases,
  onAddEnvase,
  onDeleteEnvase,
  calibracionesEquipo,
  onAddCalibracion,
  onDeleteCalibracion,
  planillaBpa,
  onUpdatePlanillaBpa,
  fundoNombre = 'Mi Huerto de Kiwis',
  activeUserName = '',
  canEdit = true,
}) => {
  const [subTab, setSubTab] = useState<'checklist' | 'envases' | 'calibraciones'>('checklist');
  const [isEnvaseModalOpen, setIsEnvaseModalOpen] = useState(false);
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Filtros de Planilla BPA
  const [busquedaBpa, setBusquedaBpa] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoPuntoAuditoriaBPA>('todos');
  const [filtroSeccion, setFiltroSeccion] = useState<string>('todas');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showAutoChecksBanner, setShowAutoChecksBanner] = useState(false);

  // Confirmaciones en línea (sin window.confirm)
  const [confirmResetMode, setConfirmResetMode] = useState<'none' | 'answers_only' | 'full_template'>('none');
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const todayISO = () => new Date().toISOString().split('T')[0];

  const [newItemForm, setNewItemForm] = useState<{
    seccion: string;
    seccionPersonalizada: string;
    codigo: string;
    requisito: string;
    criterioCumplimiento: string;
    criticidad: ItemAuditoriaBPA['criticidad'];
  }>({
    seccion: '01. Bodega de Fitosanitarios & Fertilizantes',
    seccionPersonalizada: '',
    codigo: '',
    requisito: '',
    criterioCumplimiento: '',
    criticidad: 'Mayor',
  });

  const [envaseForm, setEnvaseForm] = useState({
    fecha: todayISO(),
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
    fechaCalibracion: todayISO(),
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

    const productosVencidos = inventario.filter((i) => {
      const dias = diasHastaVencimientoProducto(i);
      return dias !== null && dias < 0;
    });

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
        ok: inventario.length > 0 && productosVencidos.length === 0,
        detalle:
          inventario.length === 0
            ? 'Bodega aún sin productos ingresados.'
            : productosVencidos.length > 0
            ? `${productosVencidos.length} insumo(s) con fecha vencida en inventario.`
            : `${inventario.length} insumo(s) vigentes sin fechas vencidas.`,
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
        ok: cosechasLote.length > 0 && cosechasSinBrixOk.length === 0,
        detalle:
          cosechasLote.length === 0
            ? 'Sin despachos de cosecha registrados aún.'
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

  // Métricas en vivo de la planilla BPA
  const statsBpa = useMemo(() => {
    const items = planillaBpa.items || [];
    const total = items.length;
    const cumple = items.filter((i) => i.estado === 'cumple').length;
    const noCumple = items.filter((i) => i.estado === 'no_cumple').length;
    const na = items.filter((i) => i.estado === 'na').length;
    const pendiente = items.filter((i) => i.estado === 'pendiente').length;
    const evaluables = Math.max(0, total - na);
    const porcentaje = evaluables > 0 ? Math.round((cumple / evaluables) * 100) : 0;
    const revisados = cumple + noCumple + na;
    return { total, cumple, noCumple, na, pendiente, evaluables, porcentaje, revisados };
  }, [planillaBpa]);

  const seccionesUnicas = useMemo(() => {
    const seen = new Set<string>();
    (planillaBpa.items || []).forEach((i) => seen.add(i.seccion));
    return Array.from(seen);
  }, [planillaBpa]);

  const itemsFiltrados = useMemo(() => {
    const q = busquedaBpa.trim().toLowerCase();
    return (planillaBpa.items || []).filter((item) => {
      if (filtroEstado !== 'todos' && item.estado !== filtroEstado) return false;
      if (filtroSeccion !== 'todas' && item.seccion !== filtroSeccion) return false;
      if (q) {
        const hay = `${item.codigo} ${item.seccion} ${item.requisito} ${item.criterioCumplimiento || ''} ${item.observacion || ''} ${item.accionCorrectiva || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [planillaBpa, busquedaBpa, filtroEstado, filtroSeccion]);

  const itemsPorSeccion = useMemo(() => {
    const groups: Record<string, ItemAuditoriaBPA[]> = {};
    itemsFiltrados.forEach((it) => {
      if (!groups[it.seccion]) groups[it.seccion] = [];
      groups[it.seccion].push(it);
    });
    return Object.entries(groups);
  }, [itemsFiltrados]);

  // Actualizar cabecera de planilla
  const updatePlanillaHeader = (patch: Partial<PlanillaAuditoriaBPA>) => {
    onUpdatePlanillaBpa({
      ...planillaBpa,
      ...patch,
      fechaUltimaRevision: todayISO(),
    });
  };

  // Actualizar un item de la planilla
  const updateItem = (itemId: string, patch: Partial<ItemAuditoriaBPA>) => {
    const hoy = todayISO();
    onUpdatePlanillaBpa({
      ...planillaBpa,
      fechaUltimaRevision: hoy,
      items: planillaBpa.items.map((it) => {
        if (it.id !== itemId) return it;
        const nextEstado = patch.estado ?? it.estado;
        return {
          ...it,
          ...patch,
          fechaVerificacion:
            patch.fechaVerificacion !== undefined
              ? patch.fechaVerificacion
              : nextEstado !== 'pendiente'
              ? it.fechaVerificacion || hoy
              : '',
          responsable:
            patch.responsable !== undefined
              ? patch.responsable
              : nextEstado !== 'pendiente'
              ? it.responsable || planillaBpa.auditorResponsable || activeUserName
              : '',
        };
      }),
    });
  };

  // Auto-evaluar puntos vinculados con los datos actuales del huerto
  const handleAutoEvaluarDesdeRegistros = () => {
    const hoy = todayISO();
    let evaluados = 0;
    const nextItems = planillaBpa.items.map((it) => {
      if (!it.autoCheckKey) return it;
      const check = checksAutomaticos.find((c) => c.id === it.autoCheckKey);
      if (!check) return it;
      evaluados++;
      return {
        ...it,
        estado: (check.ok ? 'cumple' : 'no_cumple') as EstadoPuntoAuditoriaBPA,
        observacion: check.detalle,
        accionCorrectiva: check.ok
          ? it.accionCorrectiva || ''
          : it.accionCorrectiva || `Regularizar: ${check.detalle}`,
        fechaVerificacion: hoy,
        responsable: it.responsable || planillaBpa.auditorResponsable || activeUserName || 'Sistema Huerto',
      };
    });

    onUpdatePlanillaBpa({
      ...planillaBpa,
      fechaUltimaRevision: hoy,
      items: nextItems,
    });
    setShowAutoChecksBanner(true);
    setStatusNotice(`Se auto-evaluaron ${evaluados} puntos conectados a los registros en vivo del huerto.`);
  };

  // Reiniciar planilla desde cero
  const handleReiniciarDesdeCero = (incluirPreguntasBase: boolean) => {
    const hoy = todayISO();
    if (incluirPreguntasBase) {
      const fresh = createBlankPlanillaBpa(activeUserName);
      onUpdatePlanillaBpa(fresh);
      setStatusNotice('Planilla reiniciada desde cero con las preguntas preformadas BPA en estado Pendiente.');
    } else {
      onUpdatePlanillaBpa({
        ...planillaBpa,
        fechaInicio: hoy,
        fechaUltimaRevision: hoy,
        notasGenerales: '',
        items: planillaBpa.items.map((it) => ({
          ...it,
          estado: 'pendiente',
          observacion: '',
          accionCorrectiva: '',
          fechaLimiteAccion: '',
          responsable: '',
          fechaVerificacion: '',
          evidenciaFotoDataUrl: undefined,
        })),
      });
      setStatusNotice('Todas las respuestas y evidencias fueron puestas en cero (Pendiente), conservando tus puntos.');
    }
    setExpandedItemId(null);
    setConfirmResetMode('none');
  };

  const handleAgregarItemPersonalizado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.requisito.trim()) return;
    const seccionFinal =
      newItemForm.seccion === '__nueva__'
        ? newItemForm.seccionPersonalizada.trim() || '07. Requisitos Personalizados'
        : newItemForm.seccion;

    const countSeccion = planillaBpa.items.filter((i) => i.seccion === seccionFinal).length + 1;
    const codigoFinal = newItemForm.codigo.trim() || `${seccionFinal.slice(0, 2)}.${countSeccion}`;

    const nuevoItem: ItemAuditoriaBPA = {
      id: `bpa-custom-${Date.now()}`,
      codigo: codigoFinal,
      seccion: seccionFinal,
      requisito: newItemForm.requisito.trim(),
      criterioCumplimiento: newItemForm.criterioCumplimiento.trim() || undefined,
      criticidad: newItemForm.criticidad,
      estado: 'pendiente',
      esPersonalizado: true,
    };

    onUpdatePlanillaBpa({
      ...planillaBpa,
      fechaUltimaRevision: todayISO(),
      items: [...planillaBpa.items, nuevoItem],
    });

    setIsAddItemModalOpen(false);
    setNewItemForm((prev) => ({
      ...prev,
      codigo: '',
      requisito: '',
      criterioCumplimiento: '',
    }));
    setStatusNotice(`Punto "${codigoFinal}" agregado a la planilla BPA.`);
  };

  const handleDeleteItem = (itemId: string) => {
    onUpdatePlanillaBpa({
      ...planillaBpa,
      fechaUltimaRevision: todayISO(),
      items: planillaBpa.items.filter((it) => it.id !== itemId),
    });
    setConfirmDeleteItemId(null);
    if (expandedItemId === itemId) setExpandedItemId(null);
  };

  const handleItemPhotoUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file);
      updateItem(itemId, { evidenciaFotoDataUrl: dataUrl });
    } catch (err) {
      console.warn('Error comprimiendo evidencia BPA:', err);
    }
  };

  const handleExportCsvBpa = () => {
    const escapeCsv = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
    const headers = [
      'Código',
      'Sección',
      'Criticidad',
      'Requisito',
      'Criterio',
      'Estado',
      'Fecha Verificación',
      'Responsable',
      'Observación / Hallazgo',
      'Acción Correctiva',
      'Fecha Límite Acción',
    ];
    const rows = planillaBpa.items.map((it) =>
      [
        it.codigo,
        it.seccion,
        it.criticidad,
        it.requisito,
        it.criterioCumplimiento || '',
        ESTADO_LABELS[it.estado],
        it.fechaVerificacion || '',
        it.responsable || '',
        it.observacion || '',
        it.accionCorrectiva || '',
        it.fechaLimiteAccion || '',
      ]
        .map(escapeCsv)
        .join(',')
    );

    const metaHeader = [
      `Predio: ${fundoNombre}`,
      `Planilla: ${planillaBpa.titulo}`,
      `Tipo: ${planillaBpa.tipoAuditoria}`,
      `Temporada: ${planillaBpa.temporada}`,
      `Auditor: ${planillaBpa.auditorResponsable || 'Sin especificar'}`,
      `Cumplimiento: ${statsBpa.porcentaje}% (${statsBpa.cumple}/${statsBpa.evaluables})`,
    ]
      .map(escapeCsv)
      .join(',');

    const csv = '\uFEFF' + [metaHeader, headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planilla_auditoria_bpa_${planillaBpa.temporada}_${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
    <div className="space-y-5">
      {/* Encabezado Principal */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200">
        <div>
          <div className="text-[11px] font-semibold text-emerald-800 tracking-wide flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GlobalG.A.P. IFA v6 · Buenas Prácticas Agrícolas · Normativa SAG</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-0.5">
            Auditoría BPA, Envases Limpios &amp; Calibraciones
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Planilla interactiva preformada con reinicio desde cero, acciones correctivas, evidencias fotográficas y respaldo técnico.
          </p>
        </div>

        <div className="p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold flex flex-wrap gap-1 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setSubTab('checklist')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
              subTab === 'checklist' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Planilla BPA ({statsBpa.revisados}/{statsBpa.total})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('envases')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
              subTab === 'envases' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Triple Lavado ({registrosEnvases.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('calibraciones')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-colors ${
              subTab === 'calibraciones' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Calibraciones ({calibracionesEquipo.length})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PLANILLA INTERACTIVA BPA */}
      {subTab === 'checklist' && (
        <div className="space-y-4">
          {/* Aviso de acción realizada */}
          {statusNotice && (
            <div className="no-print p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{statusNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Panel de Resumen + Barra de Cumplimiento + Acciones */}
          <div className="bg-emerald-950 text-white rounded-2xl p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-emerald-300">
                  {fundoNombre} · {planillaBpa.tipoAuditoria} · Temporada {planillaBpa.temporada}
                </div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-black font-mono tabular-nums">
                    {statsBpa.porcentaje}%
                  </span>
                  <span className="text-xs text-emerald-200 font-mono tabular-nums">
                    {statsBpa.cumple} Cumple · {statsBpa.noCumple} No Cumple · {statsBpa.pendiente} Pendientes · {statsBpa.na} N/A
                  </span>
                </div>
                <div className="w-full sm:w-96 h-2.5 bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all"
                    style={{ width: `${statsBpa.porcentaje}%` }}
                  />
                </div>
              </div>

              {/* Botones Principales de Gestión de Planilla */}
              <div className="no-print flex flex-wrap items-center gap-2">
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={handleAutoEvaluarDesdeRegistros}
                      className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                      title="Completa automáticamente los puntos conectados a Bodega, SAG, Laboratorio, Pozo y Cosecha"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Auto-evaluar con Registros</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddItemModalOpen(true)}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Punto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmResetMode((prev) => (prev === 'none' ? 'answers_only' : 'none'))
                      }
                      className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reiniciar Planilla</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleExportCsvBpa}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            {/* Confirmación Inline de Reinicio desde Cero */}
            {canEdit && confirmResetMode !== 'none' && (
              <div className="no-print p-4 bg-stone-900/90 border border-amber-400/40 rounded-xl space-y-2.5 text-xs">
                <div className="font-bold text-amber-200 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>Reiniciar Planilla de Auditoría BPA</span>
                </div>
                <p className="text-stone-200 text-[11px]">
                  Elige cómo deseas reiniciar tu planilla para comenzar una nueva revisión desde cero:
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleReiniciarDesdeCero(true)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Reiniciar desde cero (Plantilla base limpia · {PREFORMED_BPA_TEMPLATE_ITEMS.length} puntos)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReiniciarDesdeCero(false)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Solo limpiar respuestas (Mantener puntos personalizados)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetMode('none')}
                    className="px-3 py-1.5 border border-white/25 text-stone-200 hover:bg-white/10 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ficha Editable de la Auditoría Actual */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-bold text-stone-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Datos de la Planilla &amp; Auditoría</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoChecksBanner((v) => !v)}
                className="no-print text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>{showAutoChecksBanner ? 'Ocultar diagnóstico en vivo (8 puntos)' : 'Ver diagnóstico en vivo del huerto (8 puntos)'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Nombre / Título Planilla:</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={planillaBpa.titulo}
                  onChange={(e) => updatePlanillaHeader({ titulo: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg font-semibold text-stone-900 disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Norma / Tipo:</label>
                <select
                  disabled={!canEdit}
                  value={planillaBpa.tipoAuditoria}
                  onChange={(e) =>
                    updatePlanillaHeader({
                      tipoAuditoria: e.target.value as PlanillaAuditoriaBPA['tipoAuditoria'],
                    })
                  }
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg font-medium text-stone-900 disabled:opacity-75"
                >
                  <option value="Autoevaluación BPA">Autoevaluación BPA</option>
                  <option value="GlobalG.A.P. IFA v6">GlobalG.A.P. IFA v6</option>
                  <option value="Fiscalización SAG">Fiscalización SAG</option>
                  <option value="Pre-Auditoría Exportadora">Pre-Auditoría Exportadora</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Temporada / Fecha:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={planillaBpa.temporada}
                    onChange={(e) => updatePlanillaHeader({ temporada: e.target.value })}
                    placeholder="2025-2026"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg font-mono text-stone-900 disabled:opacity-75"
                  />
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={planillaBpa.fechaInicio}
                    onChange={(e) => updatePlanillaHeader({ fechaInicio: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg font-mono text-stone-900 disabled:opacity-75"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">Auditor / Responsable:</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={planillaBpa.auditorResponsable}
                  onChange={(e) => updatePlanillaHeader({ auditorResponsable: e.target.value })}
                  placeholder={activeUserName || 'Nombre del auditor'}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 disabled:opacity-75"
                />
              </div>
            </div>

            {/* Panel desplegable de diagnóstico automático en vivo */}
            {showAutoChecksBanner && (
              <div className="pt-3 border-t border-stone-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {checksAutomaticos.map((c) => (
                  <div
                    key={c.id}
                    className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
                      c.ok ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
                    }`}
                  >
                    {c.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-stone-900">{c.titulo}</div>
                      <div className="text-stone-600 mt-0.5">{c.detalle}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Barra de Búsqueda y Filtros */}
          <div className="no-print bg-white rounded-2xl border border-stone-200 p-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={busquedaBpa}
                onChange={(e) => setBusquedaBpa(e.target.value)}
                placeholder="Buscar punto por código, requisito, criterio u observación..."
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filtroSeccion}
                onChange={(e) => setFiltroSeccion(e.target.value)}
                className="p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 max-w-xs"
              >
                <option value="todas">Todas las secciones ({seccionesUnicas.length})</option>
                {seccionesUnicas.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>

              <div className="inline-flex bg-stone-100 p-1 rounded-xl border border-stone-200 gap-1">
                {(
                  [
                    { id: 'todos', label: 'Todos' },
                    { id: 'pendiente', label: 'Pendiente' },
                    { id: 'cumple', label: 'Cumple' },
                    { id: 'no_cumple', label: 'No Cumple' },
                    { id: 'na', label: 'N/A' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroEstado(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                      filtroEstado === f.id
                        ? 'bg-emerald-800 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista Interactiva por Secciones */}
          {itemsPorSeccion.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-xs text-stone-500 space-y-2">
              <p>No hay puntos que coincidan con el filtro seleccionado.</p>
              <button
                type="button"
                onClick={() => {
                  setBusquedaBpa('');
                  setFiltroEstado('todos');
                  setFiltroSeccion('todas');
                }}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg cursor-pointer"
              >
                Mostrar todos los puntos
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {itemsPorSeccion.map(([seccion, items]) => {
                const secCumple = items.filter((i) => i.estado === 'cumple').length;
                const secNoCumple = items.filter((i) => i.estado === 'no_cumple').length;
                return (
                  <div key={seccion} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                    <div className="px-5 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 flex-wrap">
                      <h2 className="font-bold text-xs sm:text-sm text-stone-900">{seccion}</h2>
                      <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                        {secCumple} cumple / {items.length} puntos
                        {secNoCumple > 0 ? ` · ${secNoCumple} hallazgo(s)` : ''}
                      </div>
                    </div>

                    <div className="divide-y divide-stone-100">
                      {items.map((item) => {
                        const isExpanded = expandedItemId === item.id;
                        const hasDetails = Boolean(
                          item.observacion ||
                            item.accionCorrectiva ||
                            item.evidenciaFotoDataUrl ||
                            item.fechaVerificacion
                        );

                        return (
                          <div
                            key={item.id}
                            className={`p-4 transition-colors ${
                              item.estado === 'no_cumple'
                                ? 'bg-rose-50/40'
                                : item.estado === 'cumple'
                                ? 'bg-emerald-50/20'
                                : ''
                            }`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                              {/* Columna de texto del punto */}
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 text-[11px] text-stone-500 flex-wrap">
                                  <span className="font-mono font-bold text-stone-800 tabular-nums">
                                    {item.codigo}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className={`font-semibold ${
                                      item.criticidad === 'Mayor'
                                        ? 'text-rose-800'
                                        : item.criticidad === 'Menor'
                                        ? 'text-amber-800'
                                        : 'text-stone-600'
                                    }`}
                                  >
                                    Obligación {item.criticidad}
                                  </span>
                                  {item.autoCheckKey && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-emerald-700 font-medium">
                                        Vinculado a registros
                                      </span>
                                    </>
                                  )}
                                  {item.fechaVerificacion && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-mono tabular-nums">
                                        Rev: {item.fechaVerificacion}
                                      </span>
                                    </>
                                  )}
                                </div>

                                <div className="text-xs sm:text-sm font-semibold text-stone-900 leading-snug">
                                  {item.requisito}
                                </div>

                                {item.criterioCumplimiento && (
                                  <p className="text-[11px] text-stone-500 leading-relaxed">
                                    {item.criterioCumplimiento}
                                  </p>
                                )}

                                {(item.observacion || item.accionCorrectiva) && !isExpanded && (
                                  <div className="pt-1 text-[11px] text-stone-700 space-y-0.5">
                                    {item.observacion && (
                                      <div>
                                        <span className="font-semibold text-stone-500">Nota:</span>{' '}
                                        {item.observacion}
                                      </div>
                                    )}
                                    {item.estado === 'no_cumple' && item.accionCorrectiva && (
                                      <div className="text-rose-800 font-medium">
                                        Acción correctiva: {item.accionCorrectiva}
                                        {item.fechaLimiteAccion ? ` (Plazo: ${item.fechaLimiteAccion})` : ''}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Controles interactivos de estado + detalle */}
                              <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
                                <div className="inline-flex bg-stone-100 p-0.5 rounded-xl border border-stone-200 gap-0.5 text-[11px] font-bold">
                                  <button
                                    type="button"
                                    disabled={!canEdit}
                                    onClick={() => updateItem(item.id, { estado: 'cumple' })}
                                    className={`px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-60 ${
                                      item.estado === 'cumple'
                                        ? 'bg-emerald-700 text-white shadow-2xs'
                                        : 'text-stone-600 hover:text-emerald-800 hover:bg-white'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Cumple</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={!canEdit}
                                    onClick={() => {
                                      updateItem(item.id, { estado: 'no_cumple' });
                                      setExpandedItemId(item.id);
                                    }}
                                    className={`px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-60 ${
                                      item.estado === 'no_cumple'
                                        ? 'bg-rose-700 text-white shadow-2xs'
                                        : 'text-stone-600 hover:text-rose-800 hover:bg-white'
                                    }`}
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>No Cumple</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={!canEdit}
                                    onClick={() => updateItem(item.id, { estado: 'na' })}
                                    className={`px-2 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-60 ${
                                      item.estado === 'na'
                                        ? 'bg-stone-700 text-white shadow-2xs'
                                        : 'text-stone-600 hover:text-stone-900 hover:bg-white'
                                    }`}
                                  >
                                    <MinusCircle className="w-3.5 h-3.5" />
                                    <span>N/A</span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={!canEdit}
                                    onClick={() => updateItem(item.id, { estado: 'pendiente' })}
                                    className={`px-2 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-60 ${
                                      item.estado === 'pendiente'
                                        ? 'bg-amber-600 text-white shadow-2xs'
                                        : 'text-stone-500 hover:text-amber-800 hover:bg-white'
                                    }`}
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Pend.</span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedItemId((prev) => (prev === item.id ? null : item.id))
                                  }
                                  className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                                    isExpanded || hasDetails
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                      : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                                  }`}
                                >
                                  {item.evidenciaFotoDataUrl && <Camera className="w-3 h-3 text-emerald-700" />}
                                  <span>Notas / Evidencia</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Editor Desplegable de Detalle, Acción Correctiva y Foto */}
                            {isExpanded && (
                              <div className="no-print mt-3 pt-3 border-t border-stone-200 space-y-3 text-xs">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="md:col-span-2">
                                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                                      Observaciones / Evidencia de Verificación:
                                    </label>
                                    <textarea
                                      rows={2}
                                      disabled={!canEdit}
                                      value={item.observacion || ''}
                                      onChange={(e) =>
                                        updateItem(item.id, { observacion: e.target.value })
                                      }
                                      placeholder="Ej. Carpeta HDS completa en estante 1; registro firmado al día..."
                                      className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                                    <div>
                                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                                        Responsable Revisión:
                                      </label>
                                      <input
                                        type="text"
                                        disabled={!canEdit}
                                        value={item.responsable || ''}
                                        onChange={(e) =>
                                          updateItem(item.id, { responsable: e.target.value })
                                        }
                                        placeholder={activeUserName || 'Encargado BPA'}
                                        className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                                        Fecha Verificación:
                                      </label>
                                      <input
                                        type="date"
                                        disabled={!canEdit}
                                        value={item.fechaVerificacion || ''}
                                        onChange={(e) =>
                                          updateItem(item.id, { fechaVerificacion: e.target.value })
                                        }
                                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {item.estado === 'no_cumple' && (
                                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="md:col-span-3">
                                      <label className="block text-[11px] font-bold text-rose-900 mb-1">
                                        Plan de Acción Correctiva Requerida:
                                      </label>
                                      <input
                                        type="text"
                                        disabled={!canEdit}
                                        value={item.accionCorrectiva || ''}
                                        onChange={(e) =>
                                          updateItem(item.id, { accionCorrectiva: e.target.value })
                                        }
                                        placeholder="Describe la medida correctiva para cerrar la no conformidad..."
                                        className="w-full p-2 bg-white border border-rose-300 rounded-lg"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-rose-900 mb-1">
                                        Plazo Límite:
                                      </label>
                                      <input
                                        type="date"
                                        disabled={!canEdit}
                                        value={item.fechaLimiteAccion || ''}
                                        onChange={(e) =>
                                          updateItem(item.id, { fechaLimiteAccion: e.target.value })
                                        }
                                        className="w-full p-2 bg-white border border-rose-300 rounded-lg font-mono"
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {canEdit && (
                                      <label className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-[11px] font-semibold text-stone-800 inline-flex items-center gap-1.5 cursor-pointer">
                                        <Camera className="w-3.5 h-3.5 text-emerald-700" />
                                        <span>
                                          {item.evidenciaFotoDataUrl ? 'Cambiar Foto Evidencia' : 'Adjuntar Foto Evidencia'}
                                        </span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => handleItemPhotoUpload(item.id, e)}
                                          className="hidden"
                                        />
                                      </label>
                                    )}

                                    {item.evidenciaFotoDataUrl && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setPreviewPhoto(item.evidenciaFotoDataUrl!)}
                                          className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-[11px] font-semibold cursor-pointer"
                                        >
                                          Ver Foto Adjunta
                                        </button>
                                        {canEdit && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateItem(item.id, { evidenciaFotoDataUrl: undefined })
                                            }
                                            className="px-2 py-1.5 text-rose-700 hover:bg-rose-50 rounded-lg text-[11px] font-semibold cursor-pointer"
                                          >
                                            Quitar Foto
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  {canEdit && (
                                    <div>
                                      {confirmDeleteItemId === item.id ? (
                                        <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
                                          <span className="text-[11px] text-rose-900 font-semibold">
                                            ¿Quitar punto?
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="px-2 py-0.5 bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                          >
                                            Sí, eliminar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteItemId(null)}
                                            className="px-1.5 py-0.5 text-stone-600 text-[10px] font-semibold cursor-pointer"
                                          >
                                            No
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteItemId(item.id)}
                                          className="px-2.5 py-1.5 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          <span>Eliminar Punto</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: Triple Lavado */}
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
                      <td className="px-4 py-3 font-mono tabular-nums">{r.fecha}</td>
                      <td className="px-4 py-3 font-bold text-stone-900">{r.productoNombre}</td>
                      <td className="px-4 py-3 font-mono tabular-nums">
                        {r.cantidadEnvases} u ({r.capacidadUnidad})
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-800">
                        {r.tripleLavadoRealizado ? '3x Lavado OK' : 'Sin 3x Lavado'}
                        {r.perforadoInutilizado ? ' · Perforado' : ''}
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

      {/* SUBTAB 3: Calibraciones */}
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
                        <td className="px-4 py-3 font-mono tabular-nums">{c.fechaCalibracion}</td>
                        <td className={`px-4 py-3 font-mono tabular-nums font-bold ${vencido ? 'text-rose-700' : 'text-stone-700'}`}>
                          {c.fechaProximaCalibracion}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-stone-900">{c.equipoNombre}</div>
                          <div className="text-[10px] text-stone-500">{c.tipoEquipo}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{c.patronMetodo || '—'}</div>
                          <div className="font-mono tabular-nums text-[10px] text-stone-500">Desv: {c.desviacionPct}%</div>
                        </td>
                        <td className="px-4 py-3 font-bold">
                          <span
                            className={
                              c.resultado === 'Aprobado / Calibrado'
                                ? 'text-emerald-800'
                                : c.resultado === 'Requiere Ajuste'
                                ? 'text-amber-800'
                                : 'text-rose-800'
                            }
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

      {/* Modal Agregar Punto Personalizado a Planilla BPA */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Agregar Punto de Verificación BPA</h3>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAgregarItemPersonalizado} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Sección de la Planilla:</label>
                <select
                  value={newItemForm.seccion}
                  onChange={(e) => setNewItemForm({ ...newItemForm, seccion: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded-lg"
                >
                  {seccionesUnicas.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                  <option value="__nueva__">+ Crear nueva sección personalizada</option>
                </select>
              </div>

              {newItemForm.seccion === '__nueva__' && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre Nueva Sección:</label>
                  <input
                    type="text"
                    value={newItemForm.seccionPersonalizada}
                    onChange={(e) =>
                      setNewItemForm({ ...newItemForm, seccionPersonalizada: e.target.value })
                    }
                    placeholder="Ej. 07. Requisitos Exportadora / Orgánico"
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Código (opcional):</label>
                  <input
                    type="text"
                    value={newItemForm.codigo}
                    onChange={(e) => setNewItemForm({ ...newItemForm, codigo: e.target.value })}
                    placeholder="Ej. 01.5"
                    className="w-full p-2 border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nivel de Criticidad:</label>
                  <select
                    value={newItemForm.criticidad}
                    onChange={(e) =>
                      setNewItemForm({
                        ...newItemForm,
                        criticidad: e.target.value as ItemAuditoriaBPA['criticidad'],
                      })
                    }
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  >
                    <option value="Mayor">Obligación Mayor</option>
                    <option value="Menor">Obligación Menor</option>
                    <option value="Recomendación">Recomendación</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Requisito / Pregunta a Verificar:</label>
                <textarea
                  rows={2}
                  value={newItemForm.requisito}
                  onChange={(e) => setNewItemForm({ ...newItemForm, requisito: e.target.value })}
                  placeholder="Ej. Registro de lavado y sanitización de capachos semanalmente..."
                  className="w-full p-2 border border-stone-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Criterio de Cumplimiento (opcional):</label>
                <textarea
                  rows={2}
                  value={newItemForm.criterioCumplimiento}
                  onChange={(e) =>
                    setNewItemForm({ ...newItemForm, criterioCumplimiento: e.target.value })
                  }
                  placeholder="Cómo se verifica en terreno o en documentación..."
                  className="w-full p-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Agregar a Planilla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Envases */}
      {isEnvaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Triple Lavado &amp; Entrega de Envases</h3>
              <button
                type="button"
                onClick={() => setIsEnvaseModalOpen(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEnvase} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha:</label>
                  <input
                    type="date"
                    value={envaseForm.fecha}
                    onChange={(e) => setEnvaseForm({ ...envaseForm, fecha: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Producto / Envase:</label>
                  <input
                    type="text"
                    value={envaseForm.productoNombre}
                    onChange={(e) => setEnvaseForm({ ...envaseForm, productoNombre: e.target.value })}
                    placeholder="Ej. Cobre / Fungicida"
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cantidad de Envases:</label>
                  <input
                    type="number"
                    min="1"
                    value={envaseForm.cantidadEnvases}
                    onChange={(e) =>
                      setEnvaseForm({ ...envaseForm, cantidadEnvases: parseInt(e.target.value) || 1 })
                    }
                    className="w-full p-2 border border-stone-300 rounded-lg font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Capacidad Unitaria:</label>
                  <input
                    type="text"
                    value={envaseForm.capacidadUnidad}
                    onChange={(e) => setEnvaseForm({ ...envaseForm, capacidadUnidad: e.target.value })}
                    placeholder="1 L, 5 L, 20 Kg"
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <label className="inline-flex items-center gap-2 font-bold text-emerald-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={envaseForm.tripleLavadoRealizado}
                    onChange={(e) =>
                      setEnvaseForm({ ...envaseForm, tripleLavadoRealizado: e.target.checked })
                    }
                  />
                  Triple Lavado ejecutado
                </label>
                <label className="inline-flex items-center gap-2 font-bold text-emerald-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={envaseForm.perforadoInutilizado}
                    onChange={(e) =>
                      setEnvaseForm({ ...envaseForm, perforadoInutilizado: e.target.checked })
                    }
                  />
                  Envase perforado e inutilizado
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Centro de Acopio:</label>
                  <input
                    type="text"
                    value={envaseForm.centroAcopioDestino}
                    onChange={(e) =>
                      setEnvaseForm({ ...envaseForm, centroAcopioDestino: e.target.value })
                    }
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° Comprobante / Guía:</label>
                  <input
                    type="text"
                    value={envaseForm.numeroComprobante}
                    onChange={(e) =>
                      setEnvaseForm({ ...envaseForm, numeroComprobante: e.target.value })
                    }
                    className="w-full p-2 border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEnvaseModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Guardar
                </button>
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
              <button
                type="button"
                onClick={() => setIsCalModalOpen(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCalibracion} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre / ID Equipo:</label>
                  <input
                    type="text"
                    value={calForm.equipoNombre}
                    onChange={(e) => setCalForm({ ...calForm, equipoNombre: e.target.value })}
                    placeholder="Ej. Nebulizador 2000L"
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tipo Equipo:</label>
                  <select
                    value={calForm.tipoEquipo}
                    onChange={(e) =>
                      setCalForm({
                        ...calForm,
                        tipoEquipo: e.target.value as CalibracionEquipo['tipoEquipo'],
                      })
                    }
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  >
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
                  <input
                    type="date"
                    value={calForm.fechaCalibracion}
                    onChange={(e) => setCalForm({ ...calForm, fechaCalibracion: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Próxima Calibración:</label>
                  <input
                    type="date"
                    value={calForm.fechaProximaCalibracion}
                    onChange={(e) =>
                      setCalForm({ ...calForm, fechaProximaCalibracion: e.target.value })
                    }
                    className="w-full p-2 border border-stone-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Método / Patrón Usado:</label>
                  <input
                    type="text"
                    value={calForm.patronMetodo}
                    onChange={(e) => setCalForm({ ...calForm, patronMetodo: e.target.value })}
                    placeholder="Ej. Aforo boquillas L/min / Agua destilada 0°"
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Desviación %:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calForm.desviacionPct}
                    onChange={(e) =>
                      setCalForm({ ...calForm, desviacionPct: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full p-2 border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Resultado:</label>
                  <select
                    value={calForm.resultado}
                    onChange={(e) =>
                      setCalForm({
                        ...calForm,
                        resultado: e.target.value as CalibracionEquipo['resultado'],
                      })
                    }
                    className="w-full p-2 border border-stone-300 rounded-lg font-bold"
                  >
                    <option value="Aprobado / Calibrado">Aprobado / Calibrado</option>
                    <option value="Requiere Ajuste">Requiere Ajuste</option>
                    <option value="Fuera de Servicio">Fuera de Servicio</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Foto Certificado / Boquillas:</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="w-full text-[11px]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsCalModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Guardar Calibración
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="max-w-xl w-full bg-white rounded-2xl p-3 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-stone-700">Foto Evidencia</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewPhoto}
              alt="Evidencia BPA / Calibración"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
