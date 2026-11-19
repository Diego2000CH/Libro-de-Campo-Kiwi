import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import {
  AppStateData,
  ExplotacionAgricola,
  InsumoInventario,
  MaquinariaEquipo,
  OrdenTrabajoFitosanitaria,
  RegistroExtraccionPozo,
  RegistroLabor,
  RegistroMantencionMaquinaria,
  SectorRiego,
  TurnoRiego,
} from '../types/campo';
import { normalizarCondicionHorasFrio } from './agroClimaCalculos';

export type PdfSectionKey =
  | 'cuarteles'
  | 'bodega_fito'
  | 'bodega_riego'
  | 'maquinaria'
  | 'pozo'
  | 'riego'
  | 'ordenes'
  | 'labores'
  | 'clima_frio'
  | 'fenologia'
  | 'reproductivo'
  | 'cosecha'
  | 'laboratorio_bpa'
  | 'tareas_temporadas';

export interface PdfSectionMeta {
  key: PdfSectionKey;
  label: string;
  description: string;
  countResolver: (data: Partial<AppStateData>, sectores?: SectorRiego[]) => number;
}

const FITO_TYPES = [
  'fungicida',
  'bactericida',
  'insecticida_acaricida',
  'fertilizante_foliar',
  'fertilizante_suelo',
  'herbicida',
  'coadyuvante',
  'rompedor_dormancia',
];

const MATERIAL_TYPES = ['riego', 'alambre', 'polin', 'malla', 'herramienta', 'epp', 'otro'];
const MATERIAL_CATS = [
  'insumo_riego',
  'alambre_estructura',
  'polin_madera',
  'malla_cobertor',
  'herramienta_equipo',
  'epp_seguridad',
  'otro',
];

export function esItemFitosanitario(item: InsumoInventario): boolean {
  if (item.categoriaBodega === 'material_riego') return false;
  if (item.categoriaBodega === 'fitosanitario') return true;
  return (
    FITO_TYPES.includes(item.tipo) ||
    item.categoria === 'fitosanitario' ||
    item.categoria === 'fertilizante'
  );
}

export function esItemMaterialRiego(item: InsumoInventario): boolean {
  if (item.categoriaBodega === 'fitosanitario') return false;
  if (item.categoriaBodega === 'material_riego') return true;
  return (
    MATERIAL_TYPES.includes(item.tipo) ||
    (!!item.categoria && MATERIAL_CATS.includes(item.categoria))
  );
}

export const PDF_SECTIONS_META: PdfSectionMeta[] = [
  {
    key: 'bodega_fito',
    label: 'Bodega de Fitosanitarios & Fertilizantes',
    description: 'Agroquímicos, ingredientes activos, N° SAG, lotes, vencimientos, carencias y stock.',
    countResolver: (d) => (d.inventario || []).filter(esItemFitosanitario).length,
  },
  {
    key: 'bodega_riego',
    label: 'Bodega de Riego, Materiales & Herramientas',
    description: 'Insumos de riego, alambres, polines, mallas, EPP, especificaciones y stock.',
    countResolver: (d) => (d.inventario || []).filter(esItemMaterialRiego).length,
  },
  {
    key: 'maquinaria',
    label: 'Parque de Maquinarias & Mantenciones',
    description: 'Tractores, nebulizadores, horómetros, frecuencia de servicio y bitácora técnica.',
    countResolver: (d) => (d.maquinarias?.length || 0) + (d.registrosMantencion?.length || 0),
  },
  {
    key: 'cuarteles',
    label: 'Cuarteles & Puntos del Predio',
    description: 'Superficie, variedades, portainjertos, polinizadores, conducción y puntos GIS.',
    countResolver: (d) => (d.parcelas?.length || 0) + (d.lugares?.length || 0),
  },
  {
    key: 'pozo',
    label: 'Control de Pozo Profundo DGA',
    description: 'Sectores de riego, horómetros, flujómetros (m³), caudales (L/s) y niveles.',
    countResolver: (d, s) => (d.registrosPozo?.length || 0) + (s?.length || 0),
  },
  {
    key: 'riego',
    label: 'Turnos de Riego & Fertirriego',
    description: 'Horarios, lámina (mm), volumen (m³), fertirriego y presiones de línea.',
    countResolver: (d) => d.turnosRiego?.length || 0,
  },
  {
    key: 'ordenes',
    label: 'Órdenes de Trabajo Fitosanitarias',
    description: 'Recetas agronómicas, mezclas de productos, dosis/ha, EPP, carencia y ejecución.',
    countResolver: (d) => d.ordenesTrabajo?.length || 0,
  },
  {
    key: 'labores',
    label: 'Cuaderno Histórico de Labores',
    description: 'Aplicaciones, podas, fertilizaciones, riegos, monitoreos y responsables.',
    countResolver: (d) => d.labores?.length || 0,
  },
  {
    key: 'clima_frio',
    label: 'Clima, Horas Frío & Grados Día',
    description: 'Resumen agroclimático de temporada y bitácora térmica (HF y GDD).',
    countResolver: (d) => (d.registrosTermicos?.length || 0) + (d.horasFrio ? 1 : 0),
  },
  {
    key: 'fenologia',
    label: 'Seguimiento & Catálogo Fenológico',
    description: 'Estados BBCH por cuartel, fechas, avances y estados personalizados.',
    countResolver: (d) =>
      (d.fenologia?.length || 0) + (d.estadosFenologicosPersonalizados?.length || 0),
  },
  {
    key: 'reproductivo',
    label: 'Ciclo Reproductivo (Brotación a Cuaja)',
    description: 'Brotación, botones florales, sincronía, polinización/colmenas, raleo y cuaja.',
    countResolver: (d) =>
      (d.muestreosBrotacion?.length || 0) +
      (d.conteosBotones?.length || 0) +
      (d.sincroniasFlorales?.length || 0) +
      (d.polinizacion?.length || 0) +
      (d.aplicacionesPolen?.length || 0) +
      (d.planesCargaRaleo?.length || 0) +
      (d.evaluacionesCuajaSemillas?.length || 0),
  },
  {
    key: 'cosecha',
    label: 'Madurez, Cosecha & Packing',
    description: 'Muestreos °Brix/firmeza/MS, despacho de bins y liquidación técnica en kg/cajas.',
    countResolver: (d) =>
      (d.muestreosMadurez?.length || 0) +
      (d.cosechasLote?.length || 0) +
      (d.liquidacionesPacking?.length || 0),
  },
  {
    key: 'laboratorio_bpa',
    label: 'Laboratorio, Envases, Calibración & BPA',
    description: 'Análisis suelo/agua/foliar/LMR, triple lavado, calibraciones y planilla BPA.',
    countResolver: (d) =>
      (d.analisisLaboratorio?.length || 0) +
      (d.registrosEnvases?.length || 0) +
      (d.calibracionesEquipo?.length || 0) +
      (d.planillaBpa?.items?.length || 0),
  },
  {
    key: 'tareas_temporadas',
    label: 'Tareas, Temporadas & Equipo Técnico',
    description: 'Plan de tareas del huerto, comparativo entre temporadas y equipo autorizado.',
    countResolver: (d) =>
      (d.tareasHuerto?.length || 0) +
      (d.resumenesTemporada?.length || 0) +
      (d.usuarios?.length || 0),
  },
];

// Helpers de formato seguro para PDF (sin emojis ni valores undefined/null)
function str(val: unknown, fallback = '—'): string {
  if (val === null || val === undefined) return fallback;
  const s = String(val).trim();
  return s.length > 0 ? s : fallback;
}

function num(val: unknown, decimals = 1, fallback = '—'): string {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  if (Number.isNaN(n)) return fallback;
  return Number.isInteger(n) && decimals === 0
    ? n.toLocaleString('es-CL')
    : n.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

function sanitizeFileName(raw: string): string {
  return (raw || 'huerto')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getLastFinalY(doc: jsPDF, fallback = 40): number {
  const internalDoc = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return internalDoc.lastAutoTable?.finalY ?? fallback;
}

function createLandscapeDoc(): jsPDF {
  return new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
}

function drawDocumentHeader(
  doc: jsPDF,
  titulo: string,
  subtitulo: string,
  explotacion?: ExplotacionAgricola,
  extraMeta?: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 12;

  // Banner superior verde oscuro
  doc.setFillColor(6, 78, 59); // #064e3b
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(167, 243, 208); // emerald-200
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CUADERNO DIGITAL DE CAMPO · REGISTRO OFICIAL DE TRAZABILIDAD', marginX, 7.5);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(titulo, marginX, 14.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(236, 253, 245);
  doc.text(subtitulo, marginX, 20);

  const fechaStr = `Emitido: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
  doc.setFontSize(8);
  doc.text(fechaStr, pageWidth - marginX, 14.5, { align: 'right' });
  if (extraMeta) {
    doc.text(extraMeta, pageWidth - marginX, 20, { align: 'right' });
  }

  // Bloque ficha de explotación
  const cardY = 27;
  doc.setFillColor(245, 245, 244); // stone-100
  doc.setDrawColor(214, 211, 209); // stone-300
  doc.roundedRect(marginX, cardY, pageWidth - marginX * 2, 16, 1.5, 1.5, 'FD');

  doc.setTextColor(28, 25, 23); // stone-900
  doc.setFontSize(7.5);

  const predio = explotacion?.nombreFundo || 'Predio Agrícola';
  const rut = explotacion?.rut || 'Sin RUT';
  const ubicacion = [explotacion?.direccion, explotacion?.comuna, explotacion?.region]
    .filter(Boolean)
    .join(', ') || '—';
  const superficie = `${num(explotacion?.superficieKiwisHa ?? 0, 1)} ha Kiwis / ${num(
    explotacion?.superficieTotalHa ?? 0,
    1
  )} ha Totales`;
  const repLegal = explotacion?.representanteLegal || '—';
  const agronomo = explotacion?.asesorAgronomo
    ? `${explotacion.asesorAgronomo}${
        explotacion.registroColegioAgronomos ? ` (Reg. ${explotacion.registroColegioAgronomos})` : ''
      }`
    : '—';
  const certs = explotacion?.certificaciones?.length
    ? explotacion.certificaciones.join(', ')
    : '—';

  doc.setFont('helvetica', 'bold');
  doc.text('Predio:', marginX + 3, cardY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${predio} (RUT ${rut})`, marginX + 15, cardY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Ubicación:', marginX + 95, cardY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(ubicacion.slice(0, 58), marginX + 112, cardY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Superficie:', marginX + 205, cardY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(superficie, marginX + 222, cardY + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Rep. Legal:', marginX + 3, cardY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.text(repLegal.slice(0, 42), marginX + 20, cardY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Asesor Agrónomo:', marginX + 95, cardY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.text(agronomo.slice(0, 48), marginX + 122, cardY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Certificaciones:', marginX + 205, cardY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.text(certs.slice(0, 36), marginX + 229, cardY + 11.5);

  return cardY + 21;
}

function ensureSpaceForSection(doc: jsPDF, currentY: number, minNeeded = 32): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + minNeeded > pageHeight - 14) {
    doc.addPage();
    return 14;
  }
  return currentY;
}

function drawSectionBanner(
  doc: jsPDF,
  y: number,
  title: string,
  countText: string,
  accentRgb: [number, number, number] = [6, 78, 59]
): number {
  const startY = ensureSpaceForSection(doc, y, 28);
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 12;

  doc.setFillColor(236, 253, 245); // suave
  if (accentRgb[0] !== 6) {
    doc.setFillColor(245, 245, 244);
  }
  doc.rect(marginX, startY, pageWidth - marginX * 2, 7.5, 'F');
  doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.rect(marginX, startY, 2.2, 7.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(28, 25, 23);
  doc.text(title, marginX + 5, startY + 5.1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(87, 83, 78);
  doc.text(countText, pageWidth - marginX - 3, startY + 5.1, { align: 'right' });

  return startY + 9.5;
}

function renderTable(
  doc: jsPDF,
  startY: number,
  head: string[],
  body: (string | number)[][],
  emptyText = 'Sin registros ingresados en este módulo.',
  headFillRgb: [number, number, number] = [6, 78, 59],
  columnStyles?: UserOptions['columnStyles']
): number {
  const safeBody =
    body.length > 0
      ? body
      : [[{ content: emptyText, colSpan: head.length, styles: { halign: 'center', fontStyle: 'italic', textColor: [120, 113, 108] } }]];

  autoTable(doc, {
    startY,
    head: [head],
    body: safeBody as UserOptions['body'],
    theme: 'striped',
    margin: { left: 12, right: 12, bottom: 14, top: 12 },
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 1.8,
      textColor: [28, 25, 23],
      overflow: 'linebreak',
      valign: 'middle',
      lineColor: [231, 229, 228],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: headFillRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 244],
    },
    columnStyles,
  });

  return getLastFinalY(doc, startY + 12) + 5;
}

function applyFooters(doc: jsPDF, docLabel: string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 12;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(214, 211, 209);
    doc.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 113, 108);
    doc.text(
      `${docLabel} · Documento generado desde Cuaderno Digital de Campo`,
      marginX,
      pageHeight - 5.5
    );
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - marginX, pageHeight - 5.5, {
      align: 'right',
    });
  }
}

// ==================== CONSTRUCTORES POR SECCIÓN ====================

const DESTINO_LABEL: Record<string, string> = {
  kiwi: 'Kiwi Hayward',
  quinta_frutal: 'Quinta Frutal',
  vivero: 'Vivero',
  casa_patronal: 'Casa Patronal',
};

const CAT_FITO_LABEL: Record<string, string> = {
  herbicida: 'Herbicida',
  fungicida: 'Fungicida',
  acaricida: 'Acaricida',
  insecticida: 'Insecticida',
  coadyuvante: 'Coadyuvante',
  bactericida: 'Bactericida',
  bioestimulante: 'Bioestimulante',
  fitorregulador: 'Fitorregulador',
  fungicida_bactericida: 'Fungicida + Bactericida',
  elicitor_psa: 'Elicitor PSA',
  fertilizante: 'Fertilizante',
};

const CAT_MATERIAL_LABEL: Record<string, string> = {
  insumo_riego: 'Insumos de Riego',
  alambre_estructura: 'Alambres & Estructura',
  polin_madera: 'Polines & Maderas',
  malla_cobertor: 'Mallas & Cobertores',
  herramienta_equipo: 'Herramientas & Equipos',
  epp_seguridad: 'EPP & Seguridad',
  otro: 'Ferretería & Otros',
};

function renderBodegaFitoSection(
  doc: jsPDF,
  startY: number,
  items: InsumoInventario[]
): number {
  let y = drawSectionBanner(
    doc,
    startY,
    'BODEGA DE FITOSANITARIOS & FERTILIZANTES',
    `${items.length} productos`
  );

  const head = [
    'Producto Comercial',
    'Categoría',
    'Ingrediente Activo / Composición',
    'Reg. SAG / Lote',
    'Stock Actual / Mín.',
    'Carencia / REI',
    'Elab. / Venc.',
    'Destinos / Ubicación',
    'Dosis & Obs.',
  ];

  const body = items.map((item) => {
    const catKey = item.categoriaFito || item.tipo || 'fitosanitario';
    const catTxt = CAT_FITO_LABEL[catKey] || str(catKey);
    const composicion =
      catKey === 'fertilizante'
        ? [
            item.composicionFertilizante,
            item.estadoFertilizante,
            item.solubilidadFertilizante,
          ]
            .filter(Boolean)
            .join(' · ') || '—'
        : str(item.ingredienteActivo || item.especificacionTecnica);

    const sagLote = `${str(item.numeroRegistroSAG, 'S/R')}\nLote: ${str(item.lote)}\nFab: ${str(item.fabricante)}`;
    const bajoMin = (item.stockMinimo || 0) > 0 && item.stockActual <= item.stockMinimo;
    const stockTxt = `${num(item.stockActual, 2)} ${item.unidad}\nMín: ${num(
      item.stockMinimo,
      2
    )} ${item.unidad}${bajoMin ? ' (BAJO)' : ''}`;
    const carenciaTxt =
      item.tieneCarencia === false
        ? `Exento\nREI: ${item.tiempoReingresoHoras ?? 0}h`
        : `${item.periodoCarenciaDias ?? 0} días\nREI: ${item.tiempoReingresoHoras ?? 0}h`;
    const fechasTxt = `Elab: ${str(item.fechaElaboracion)}\nVenc: ${str(item.fechaVencimiento)}`;
    const destinosTxt = (item.destinosUso?.length ? item.destinosUso : ['kiwi'])
      .map((d) => DESTINO_LABEL[d] || d)
      .join(', ');
    const ubicDest = `${destinosTxt}\n${str(item.ubicacionBodega)}`;
    const dosisObs = [
      item.dosisRecomendadaHa ? `Dosis: ${item.dosisRecomendadaHa}` : '',
      item.consumoHistoricoAcumulado
        ? `Consumo hist.: ${num(item.consumoHistoricoAcumulado, 2)} ${item.unidad}`
        : '',
      item.observaciones || '',
    ]
      .filter(Boolean)
      .join('\n') || '—';

    return [
      item.nombreComercial,
      catTxt,
      composicion,
      sagLote,
      stockTxt,
      carenciaTxt,
      fechasTxt,
      ubicDest,
      dosisObs,
    ];
  });

  y = renderTable(
    doc,
    y,
    head,
    body,
    'No hay productos fitosanitarios ni fertilizantes registrados en bodega.',
    [6, 78, 59]
  );
  return y;
}

function renderBodegaMaterialesSection(
  doc: jsPDF,
  startY: number,
  items: InsumoInventario[]
): number {
  let y = drawSectionBanner(
    doc,
    startY,
    'BODEGA DE MATERIALES, RIEGO & HERRAMIENTAS',
    `${items.length} artículos`,
    [30, 58, 138]
  );

  const head = [
    'Material / Artículo',
    'Categoría',
    'Especificación Técnica',
    'Marca / Proveedor',
    'Stock Actual / Mín.',
    'Consumo Acum.',
    'Elab. / Venc.',
    'Destinos / Ubicación',
    'Observaciones',
  ];

  const body = items.map((item) => {
    const catKey = item.categoriaMaterial || item.categoria || item.tipo || 'otro';
    const catTxt = CAT_MATERIAL_LABEL[catKey] || str(catKey);
    const bajoMin = (item.stockMinimo || 0) > 0 && item.stockActual <= item.stockMinimo;
    const stockTxt = `${num(item.stockActual, 2)} ${item.unidad}\nMín: ${num(
      item.stockMinimo,
      2
    )} ${item.unidad}${bajoMin ? ' (BAJO)' : ''}`;
    const destinosTxt = (item.destinosUso?.length ? item.destinosUso : ['kiwi'])
      .map((d) => DESTINO_LABEL[d] || d)
      .join(', ');

    return [
      item.nombreComercial,
      catTxt,
      str(item.especificacionTecnica || item.ingredienteActivo),
      str(item.fabricante),
      stockTxt,
      `${num(item.consumoHistoricoAcumulado || 0, 2)} ${item.unidad}`,
      `Elab: ${str(item.fechaElaboracion)}\nVenc: ${str(item.fechaVencimiento)}`,
      `${destinosTxt}\n${str(item.ubicacionBodega)}`,
      str(item.observaciones),
    ];
  });

  y = renderTable(
    doc,
    y,
    head,
    body,
    'No hay materiales de riego ni herramientas registrados en bodega.',
    [30, 58, 138]
  );
  return y;
}

const ESTADO_MAQ_LABEL: Record<string, string> = {
  operativo: 'Operativo',
  mantencion_proxima: 'Mantención Próxima',
  en_taller: 'En Taller',
  fuera_servicio: 'Fuera de Servicio',
};

function renderMaquinariaSection(
  doc: jsPDF,
  startY: number,
  maquinarias: MaquinariaEquipo[],
  mantenciones: RegistroMantencionMaquinaria[]
): number {
  let y = drawSectionBanner(
    doc,
    startY,
    'PARQUE DE MAQUINARIAS & EQUIPOS',
    `${maquinarias.length} equipos`,
    [146, 64, 14]
  );

  const headMaq = [
    'Código',
    'Equipo / Nombre',
    'Tipo',
    'Marca / Modelo (Año)',
    'Patente / Serie',
    'Horómetro Actual',
    'Últ. / Próx. Servicio',
    'Estado',
    'Operador & Obs.',
  ];

  const bodyMaq = maquinarias.map((m) => {
    const proxHrs = (m.horometroUltimaMantencion || 0) + (m.frecuenciaMantencionHoras || 250);
    return [
      m.codigoInterno,
      m.nombre,
      str(m.tipo).replace(/_/g, ' '),
      `${str(m.marcaModelo)} (${m.anio || '—'})`,
      str(m.patenteOSerie),
      `${num(m.horometroActual, 1)} hrs`,
      `Últ: ${num(m.horometroUltimaMantencion, 1)}h (${str(
        m.fechaUltimaMantencion
      )})\nPróx: ${num(proxHrs, 1)}h · c/${m.frecuenciaMantencionHoras}h`,
      ESTADO_MAQ_LABEL[m.estado] || m.estado,
      `Operador: ${str(m.operadorAsignado)}\n${str(m.observaciones, '')}`.trim() || '—',
    ];
  });

  y = renderTable(
    doc,
    y,
    headMaq,
    bodyMaq,
    'No hay maquinarias ni equipos registrados.',
    [146, 64, 14]
  );

  y = drawSectionBanner(
    doc,
    y,
    'BITÁCORA HISTÓRICA DE MANTENCIONES DE MAQUINARIA',
    `${mantenciones.length} mantenciones`,
    [146, 64, 14]
  );

  const headMant = [
    'Fecha',
    'Maquinaria',
    'Horómetro',
    'Tipo de Mantención',
    'Taller / Mecánico',
    'Repuestos Utilizados',
    'Observaciones',
  ];

  const bodyMant = mantenciones.map((r) => [
    r.fecha,
    r.maquinariaNombre,
    `${num(r.horometro, 1)} hrs`,
    r.tipoMantencion,
    str(r.tallerOMecanico),
    str(r.repuestosUtilizados),
    str(r.observaciones),
  ]);

  y = renderTable(
    doc,
    y,
    headMant,
    bodyMant,
    'No hay registros de mantenciones técnicas.',
    [120, 53, 15]
  );

  return y;
}

function renderCuartelesSection(
  doc: jsPDF,
  startY: number,
  data: Partial<AppStateData>
): number {
  const parcelas = data.parcelas || [];
  const lugares = data.lugares || [];

  let y = drawSectionBanner(
    doc,
    startY,
    'CUARTELES PRODUCTIVOS DEL HUERTO',
    `${parcelas.length} cuarteles`
  );

  const headP = [
    'Código',
    'Cuartel',
    'Sup. (ha)',
    'Variedad / Portainjerto',
    'Polinizador',
    'Conducción / Marco',
    'Plantas/ha · Año',
    'Sectores Riego',
    'Fenología / Estado',
  ];

  const bodyP = parcelas.map((p) => {
    const sectores = p.sectoresRiego?.length
      ? p.sectoresRiego.join(', ')
      : String(p.sectorRiegoNumero || '—');
    const fen = `${str(p.estadoFenologico)}${
      p.fechaEstadoFenologico ? ` (${p.fechaEstadoFenologico})` : ''
    }\nEstado: ${str(p.estadoActual)}${p.lmrActivo ? ` · LMR: ${p.lmrActivo}` : ''}`;

    return [
      str(p.codigoCuartel),
      p.nombre,
      `${num(p.superficieHa, 2)} ha`,
      `${str(p.variedad)}\nPort: ${str(p.patronPortainjerto)}`,
      str(p.polinizador),
      `${str(p.sistemaConduccion)}\nMarco: ${str(p.marcoPlantacion)}`,
      `${num(p.plantasPorHa, 0)} pl/ha\nAño ${p.anioPlantacion || '—'}`,
      `Sector ${sectores}`,
      fen,
    ];
  });

  y = renderTable(doc, y, headP, bodyP, 'No hay cuarteles registrados.', [6, 78, 59]);

  y = drawSectionBanner(
    doc,
    y,
    'PUNTOS DE INTERÉS & INFRAESTRUCTURA DEL PREDIO',
    `${lugares.length} puntos`,
    [68, 64, 60]
  );

  const headL = ['Nombre', 'Tipo', 'Superficie (ha)', 'Latitud', 'Longitud', 'Descripción'];
  const bodyL = lugares.map((l) => [
    l.nombre,
    str(l.tipo).replace(/_/g, ' '),
    l.superficieHa ? `${num(l.superficieHa, 2)} ha` : '—',
    num(l.lat, 6),
    num(l.lng, 6),
    str(l.descripcion),
  ]);

  y = renderTable(
    doc,
    y,
    headL,
    bodyL,
    'No hay puntos de infraestructura registrados.',
    [68, 64, 60]
  );

  return y;
}

function renderPozoSection(
  doc: jsPDF,
  startY: number,
  registros: RegistroExtraccionPozo[],
  sectores: SectorRiego[]
): number {
  let y = drawSectionBanner(
    doc,
    startY,
    'SECTORES DE RIEGO CONFIGURADOS',
    `${sectores.length} sectores`,
    [30, 64, 175]
  );

  const headS = ['ID', 'Nombre Sector', 'Superficie (ha)', 'Caudal Diseño (L/s)', 'Descripción'];
  const bodyS = sectores.map((s) => [
    String(s.id),
    s.nombre,
    s.ha !== undefined ? `${num(s.ha, 2)} ha` : '—',
    s.caudalDisenoLs !== undefined ? `${num(s.caudalDisenoLs, 1)} L/s` : '—',
    str(s.descripcion),
  ]);

  y = renderTable(
    doc,
    y,
    headS,
    bodyS,
    'Sin sectores de riego configurados.',
    [30, 64, 175]
  );

  y = drawSectionBanner(
    doc,
    y,
    'CONTROL DE POZO PROFUNDO · FISCALIZACIÓN DGA',
    `${registros.length} registros`,
    [30, 64, 175]
  );

  const headR = [
    'Fecha / Hora',
    'Sector Destino',
    'Horómetro (Ini - Fin / Hrs)',
    'Flujómetro m³ (Ini - Fin)',
    'Extraído (m³ / L)',
    'Caudales (Ini / Fin / Prom)',
    'Niveles (Est / Din)',
    'Operador / Obs.',
  ];

  const bodyR = registros.map((r) => [
    `${r.fecha}\n${r.hora}${r.horaTermino ? ` - ${r.horaTermino}` : ''}`,
    str(r.sectorDestino),
    `${num(r.horometroInicialHoras, 1)} - ${num(r.horometroFinalHoras, 1)}\n(${num(
      r.horasHorometro || r.horasBombeo,
      2
    )} hrs)`,
    `${num(r.lecturaInicialM3, 1)} - ${num(r.lecturaFinalM3, 1)}`,
    `${num(r.metrosCubicosExtraidos, 1)} m³\n(${num(r.litrosTotales, 0)} L)`,
    `${num(r.caudalInicialLs, 1)} / ${num(r.caudalFinalLs, 1)} / Prom ${num(
      r.caudalPromedioLs,
      1
    )} L/s`,
    `Est: ${r.nivelEstaticoM ?? '—'} m\nDin: ${r.nivelDinamicoM ?? '—'} m`,
    `${str(r.operadorBomba)}${r.observaciones ? `\n${r.observaciones}` : ''}`,
  ]);

  y = renderTable(
    doc,
    y,
    headR,
    bodyR,
    'No hay muestreos ni lecturas DGA registradas en pozo.',
    [30, 64, 175]
  );

  return y;
}

function renderRiegoSection(
  doc: jsPDF,
  startY: number,
  turnos: TurnoRiego[],
  sectores: SectorRiego[]
): number {
  let y = drawSectionBanner(
    doc,
    startY,
    'CONTROL DE TURNOS DE RIEGO & FERTIRRIEGO',
    `${turnos.length} turnos`,
    [14, 116, 144]
  );

  if (sectores.length > 0 && turnos.length === 0) {
    // Igual mostramos el detalle si no hay turnos
  }

  const head = [
    'Fecha & Horario',
    'Sector',
    'Cuarteles Regados',
    'Duración (hrs)',
    'Lámina (mm)',
    'Volumen (m³)',
    'Fertirriego',
    'Presión Cab. / Fin (Bar)',
    'Operador & Obs.',
  ];

  const body = turnos.map((t) => [
    `${t.fecha}\n${t.horaInicio}${t.horaTermino ? ` - ${t.horaTermino}` : ''}`,
    t.sectorNombre,
    t.cuartelesInvolucrados?.length ? t.cuartelesInvolucrados.join(', ') : '—',
    `${num(t.duracionHoras, 2)} hrs`,
    `${num(t.laminaAguaMm, 1)} mm`,
    `${num(t.volumenM3, 1)} m³`,
    t.conFertirriego
      ? `${str(t.fertilizanteInyectado)} (${num(t.dosisFertilizanteKg, 1)} kg)`
      : 'Solo agua',
    `${num(t.presionCabezalBar, 2)} / ${num(t.presionFinLineaBar, 2)} bar`,
    `${str(t.operadorRiego)}${t.observaciones ? `\n${t.observaciones}` : ''}`,
  ]);

  y = renderTable(
    doc,
    y,
    head,
    body,
    'No hay turnos de riego registrados.',
    [14, 116, 144]
  );
  return y;
}

function renderOrdenesSection(
  doc: jsPDF,
  startY: number,
  ordenes: OrdenTrabajoFitosanitaria[]
): number {
  let y = drawSectionBanner(
    doc,
    startY,
    'ÓRDENES DE TRABAJO Y RECETAS FITOSANITARIAS',
    `${ordenes.length} órdenes`,
    [88, 28, 135]
  );

  const head = [
    'Receta / Fechas',
    'Destino & Cuarteles',
    'Sup. (ha)',
    'Objetivo Fitosanitario',
    'Mezcla de Productos & Dosis',
    'Mojamiento / Carencia / REI',
    'EPP Requerido',
    'Agrónomo / Aplicador',
    'Estado / Obs.',
  ];

  const body = ordenes.map((o) => {
    const dest = DESTINO_LABEL[o.destinoAplicacion || 'kiwi'] || 'Kiwi Hayward';
    const lugares =
      (o.destinoAplicacion || 'kiwi') === 'kiwi'
        ? o.parcelasNombres?.join(', ') || '—'
        : str(o.nombreSectorNoKiwi);

    const prods =
      o.productos && o.productos.length > 0
        ? o.productos
            .map(
              (p) =>
                `• ${p.nombreInsumo} (${p.numeroRegistroSAG || 'S/R'}): ${num(
                  p.dosisPorHa,
                  2
                )} ${p.unidad}/ha -> Total ${num(p.totalProductoRequerido, 2)} ${p.unidad}`
            )
            .join('\n')
        : `${o.nombreInsumo} (${o.numeroRegistroSAG || 'S/R'}): ${num(o.dosisPorHa, 2)} ${
            o.unidad
          }/ha -> Total ${num(o.totalProductoRequerido, 2)} ${o.unidad}`;

    return [
      `${o.codigoReceta}\nEmisión: ${o.fechaEmision}\nProg: ${o.fechaProgramada}`,
      `${dest}\n${lugares}`,
      `${num(o.superficieTotalHa, 2)} ha`,
      o.objetivoFitosanitario,
      prods,
      `Caldo: ${num(o.volumenCaldoLHa, 0)} L/ha\nCarencia: ${o.carenciaDias}d\nREI: ${
        o.tiempoReingresoHoras
      }h`,
      o.eppRequerido?.length ? o.eppRequerido.join(', ') : '—',
      `Agrónomo: ${str(o.ingenieroAgronomoNombre)}\nAplicador: ${str(
        o.aplicadorNombre
      )}${o.fechaEjecucion ? ` (${o.fechaEjecucion})` : ''}`,
      `${o.estado.toUpperCase()}${o.observacionesTecnicas ? `\n${o.observacionesTecnicas}` : ''}`,
    ];
  });

  y = renderTable(
    doc,
    y,
    head,
    body,
    'No hay órdenes de trabajo fitosanitarias emitidas.',
    [88, 28, 135]
  );
  return y;
}

function renderLaboresSection(
  doc: jsPDF,
  startY: number,
  labores: RegistroLabor[]
): number {
  let y = drawSectionBanner(
    doc,
    startY,
    'CUADERNO HISTÓRICO DE LABORES DE CAMPO',
    `${labores.length} labores`
  );

  const head = [
    'Fecha / Hora',
    'Cuartel',
    'Tipo Labor',
    'Insumo / Agua / Dosis',
    'Carencia / REI',
    'Objetivo / Método / Maq.',
    'Responsable / Carnet SAG',
    'Clima & Descripción',
  ];

  const body = labores.map((l) => {
    const insumoTxt = l.nombreInsumo
      ? `${l.nombreInsumo}${l.dosisPorHa ? ` · ${num(l.dosisPorHa, 2)} ${l.unidadMedida || ''}/ha` : ''}${
          l.totalInsumoUtilizado
            ? ` (Total: ${num(l.totalInsumoUtilizado, 2)} ${l.unidadMedida || ''})`
            : ''
        }`
      : l.volumenM3
      ? `${num(l.volumenM3, 1)} m³ (${num(l.duracionRiegoHoras || 0, 1)} hrs)`
      : '—';

    const climaTxt = l.condicionesClimaticas
      ? `${l.condicionesClimaticas.temperaturaC ?? '—'}°C · HR ${
          l.condicionesClimaticas.humedadRelativa ?? '—'
        }% · Viento ${l.condicionesClimaticas.velocidadVientoKmH ?? '—'} km/h`
      : '';

    return [
      `${l.fecha}${l.hora ? `\n${l.hora}` : ''}`,
      l.parcelaNombre,
      l.tipoLabor.toUpperCase(),
      insumoTxt,
      l.periodoCarenciaDias || l.reingresoHoras
        ? `Car: ${l.periodoCarenciaDias ?? 0}d\nREI: ${l.reingresoHoras ?? 0}h`
        : '—',
      [l.objetivoPlagaEnfermedad, l.metodoAplicacion, l.tractoristaMaquinaria]
        .filter(Boolean)
        .join('\n') || '—',
      `${str(l.registradoPor)}${l.numeroCarnetSAG ? `\nCarnet: ${l.numeroCarnetSAG}` : ''}${
        l.aprobadoPorAgronomo ? `\nV°B°: ${l.aprobadoPorAgronomo}` : ''
      }`,
      [climaTxt, l.descripcion, l.observaciones].filter(Boolean).join('\n') || '—',
    ];
  });

  y = renderTable(
    doc,
    y,
    head,
    body,
    'No hay labores de campo registradas.',
    [6, 78, 59]
  );
  return y;
}

function renderClimaFrioSection(doc: jsPDF, startY: number, data: Partial<AppStateData>): number {
  const hf = normalizarCondicionHorasFrio(data.horasFrio, data.registrosTermicos);
  const regs = data.registrosTermicos || [];
  const clima = data.clima;

  let y = drawSectionBanner(
    doc,
    startY,
    'AGROCLIMA, HORAS FRÍO & GRADOS DÍA (GDD)',
    `${regs.length} registros térmicos`,
    [3, 105, 161]
  );

  const summaryHead = ['Indicador Agroclimático', 'Valor Actual / Acumulado', 'Meta / Parámetro', 'Detalle'];
  const summaryBody: (string | number)[][] = [
    [
      'Horas Frío (< 7.2°C)',
      `${num(hf.totalAcumuladoHF, 1)} HF (${num(hf.porcentajeCumplimiento, 1)}%)`,
      `Meta: ${num(hf.metaVariedadHF, 0)} HF · Modelo: ${hf.modeloCalculo}`,
      `Ventana: ${str(hf.fechaInicioHF)} a ${str(hf.fechaFinHF)} · Estado: ${hf.estadoDormancia}`,
    ],
    [
      `Grados Día (Base ${hf.tempBaseGddC ?? 10}°C)`,
      `${num(hf.totalAcumuladoGD ?? 0, 1)} °D`,
      `Meta Madurez: ${num(hf.metaVariedadGD ?? 1850, 0)} °D (Techo ${hf.tempTechoGddC ?? 30}°C)`,
      `Ventana: ${str(hf.fechaInicioGD)} a ${str(hf.fechaFinGD)}`,
    ],
  ];

  if (clima) {
    summaryBody.push([
      'Condición Climática Predial',
      `${num(clima.temperaturaActual, 1)}°C (Mín ${num(clima.tempMinima, 1)}° / Máx ${num(
        clima.tempMaxima,
        1
      )}°)`,
      `HR ${num(clima.humedadRelativa, 0)}% · Viento ${num(clima.velocidadVientoKmH, 1)} km/h (${
        clima.direccionViento
      })`,
      `ETo: ${num(clima.evapotranspiracionEtoMmDia, 2)} mm/día · Riesgo PSA: ${
        clima.riesgoPsa
      } · Botrytis: ${clima.riesgoBotrytis}`,
    ]);
  }

  y = renderTable(doc, y, summaryHead, summaryBody, 'Sin datos agroclimáticos.', [3, 105, 161]);

  if (regs.length > 0) {
    const headT = [
      'Periodicidad',
      'Desde - Hasta',
      'Etiqueta',
      'T° Mín / Máx (Base)',
      'Horas Frío (<7.2°C)',
      'Grados Día (°D)',
      'Fuente',
      'Observaciones',
    ];
    const bodyT = regs.map((r) => [
      r.periodicidad.toUpperCase(),
      `${r.fechaInicio} a ${r.fechaFin}`,
      str(r.etiquetaPeriodo),
      `${r.tempMinC ?? '—'}° / ${r.tempMaxC ?? '—'}° (Base ${r.tempBaseGddC ?? 10}°C)`,
      `${num(r.horasFrioPeriodo, 1)} HF`,
      `${num(r.gradosDiaPeriodo, 1)} °D`,
      str(r.fuenteDato),
      str(r.observaciones),
    ]);
    y = renderTable(doc, y, headT, bodyT, 'Sin registros térmicos periódicos.', [3, 105, 161]);
  }

  return y;
}

function renderFenologiaSection(doc: jsPDF, startY: number, data: Partial<AppStateData>): number {
  const fenologia = data.fenologia || [];
  const customStates = data.estadosFenologicosPersonalizados || [];

  let y = drawSectionBanner(
    doc,
    startY,
    'SEGUIMIENTO FENOLÓGICO & ESTADOS PERSONALIZADOS',
    `${fenologia.length} registros`,
    [21, 128, 61]
  );

  const headF = [
    'Fecha Inicio / Término',
    'Cuartel',
    'BBCH',
    'Etapa Fenológica',
    'Estado Etapa',
    '% Avance',
    'Descripción & Observaciones',
  ];

  const bodyF = fenologia.map((f) => [
    `${f.fecha}${f.fechaFin ? ` a ${f.fechaFin}` : ''}`,
    f.parcelaNombre,
    f.escalaBBCH,
    str(f.nombreEtapa || f.estadoDescripcion),
    str(f.estadoEtapa || 'en_curso').replace(/_/g, ' '),
    `${num(f.porcentajeAvance, 0)}%`,
    [f.estadoDescripcion, f.observaciones].filter(Boolean).join(' · ') || '—',
  ]);

  y = renderTable(
    doc,
    y,
    headF,
    bodyF,
    'No hay registros fenológicos ingresados.',
    [21, 128, 61]
  );

  if (customStates.length > 0) {
    const headC = ['Código BBCH', 'Nombre del Estado Personalizado', 'Descripción Agronómica'];
    const bodyC = customStates.map((c) => [c.code, c.nombre, str(c.descripcion)]);
    y = renderTable(doc, y, headC, bodyC, '', [21, 128, 61]);
  }

  return y;
}

function renderReproductivoSection(doc: jsPDF, startY: number, data: Partial<AppStateData>): number {
  let y = startY;

  const brot = data.muestreosBrotacion || [];
  y = drawSectionBanner(doc, y, 'CICLO REPRODUCTIVO · 1. MUESTREO DE BROTACIÓN', `${brot.length} registros`, [5, 150, 105]);
  y = renderTable(
    doc,
    y,
    ['Fecha', 'Cuartel / Hilera', 'Cargadores / Yemas', '% Brotación', 'Con Flor / Ciegos', 'Base / Medio / Punta', 'Evaluador & Obs.'],
    brot.map((b) => [
      b.fecha,
      `${b.parcelaNombre}${b.hilera ? ` · ${b.hilera}` : ''}`,
      `${b.cargadoresEvaluados} carg. · ${b.yemasBrotadas}/${b.yemasTotales} yemas`,
      `${num(b.porcentajeBrotacion, 1)}%`,
      `Flor: ${b.brotesConFlor} (${num(b.porcentajeBrotesConFlor, 1)}%)\nCiegos: ${b.brotesVegetativosCiegos}`,
      `${num(b.brotacionBasePct, 0)}% / ${num(b.brotacionMedioPct, 0)}% / ${num(b.brotacionPuntaPct, 0)}%`,
      `${str(b.evaluador)}${b.observaciones ? `\n${b.observaciones}` : ''}`,
    ]),
    'Sin muestreos de brotación registrados.',
    [5, 150, 105]
  );

  const botones = data.conteosBotones || [];
  y = drawSectionBanner(doc, y, 'CICLO REPRODUCTIVO · 2. CONTEO DE BOTONES FLORALES', `${botones.length} registros`, [5, 150, 105]);
  y = renderTable(
    doc,
    y,
    ['Fecha', 'Cuartel / Hilera', 'Brotes Eval.', 'Botones/Brote', 'King / Dobles / Planas', 'Densidad (/m²)', 'Raleo & Evaluador'],
    botones.map((c) => [
      c.fecha,
      `${c.parcelaNombre}${c.hilera ? ` · ${c.hilera}` : ''}`,
      c.brotesEvaluados,
      num(c.botonesPorBrotePromedio, 2),
      `King: ${c.botonesUnicosKing} · Dob: ${c.botonesDoblesTriplesMariposas} · Def: ${c.floresDefectuosasPlanas}`,
      `${num(c.densidadBotonesPorM2, 1)} /m²`,
      `${c.estadoRaleoBotones} (${num(c.porcentajeAvanceRaleo, 0)}%) · ${str(c.evaluador)}`,
    ]),
    'Sin conteos de botones florales registrados.',
    [5, 150, 105]
  );

  const sinc = data.sincroniasFlorales || [];
  const polin = data.polinizacion || [];
  const polen = data.aplicacionesPolen || [];

  y = drawSectionBanner(
    doc,
    y,
    'CICLO REPRODUCTIVO · 3. SINCRONÍA FLORAL, COLMENAS & POLEN ASISTIDO',
    `${sinc.length + polin.length + polen.length} registros`,
    [180, 83, 9]
  );

  if (sinc.length > 0 || polin.length === 0) {
    y = renderTable(
      doc,
      y,
      ['Fecha', 'Cuartel', '% Flor Hembra / Macho', 'Sincronía (Desfase)', 'Colmenas Apis / Bombus', 'Actividad Abejas', 'T° / HR / Obs.'],
      sinc.map((s) => [
        s.fecha,
        s.parcelaNombre,
        `${num(s.porcentajeFloracionHembra, 0)}% / ${num(s.porcentajeFloracionMacho, 0)}%`,
        `${s.estadoSincronia} (${s.diasDesfase} d)`,
        `Apis: ${s.colmenasApisInstaladas} · Bombus: ${s.colmenasBombusInstaladas}`,
        `${s.abejasPorM2} ab/m² · ${s.actividadPolinizadores}`,
        `${num(s.temperaturaAmbienteC, 1)}°C · ${num(s.humedadRelativa, 0)}%\n${str(s.observaciones, '')}`,
      ]),
      'Sin registros de sincronía floral.',
      [180, 83, 9]
    );
  }

  if (polin.length > 0) {
    y = renderTable(
      doc,
      y,
      ['Fecha', 'Colmenas Apis / Bombus', '% Flor Fem / Masc', 'Actividad Abejas', 'T° / HR', 'Observaciones'],
      polin.map((p) => [
        p.fecha,
        `Apis: ${p.colmenasApisInstaladas} · Bombus: ${p.colmenasBombusInstaladas}`,
        `${num(p.porcentajeFloracionFemenina, 0)}% / ${num(p.porcentajeFloracionMasculina, 0)}%`,
        p.actividadAbejasCalificacion,
        `${num(p.temperaturaMediaC, 1)}°C · ${num(p.humedadRelativa, 0)}%`,
        str(p.observaciones),
      ]),
      '',
      [180, 83, 9]
    );
  }

  if (polen.length > 0) {
    y = renderTable(
      doc,
      y,
      ['Fecha / Hora', 'Cuarteles', 'Tipo Polen (Lote / Viabilidad)', 'Método & Dosis', 'Equipo / Operador', 'Clima & Obs.'],
      polen.map((a) => [
        `${a.fecha} ${a.hora}`,
        a.parcelasNombres.join(', '),
        `${a.tipoPolen}\nLote ${a.lotePolen} · ${num(a.viabilidadPolenPorcentaje, 0)}%`,
        `${a.metodoAplicacion}\n${num(a.dosisGramosPorHa, 0)} g/ha`,
        `${a.equipoMaquinaria}\n${a.operador}`,
        `${a.condicionesClimaticas}${a.observaciones ? `\n${a.observaciones}` : ''}`,
      ]),
      '',
      [180, 83, 9]
    );
  }

  const raleos = data.planesCargaRaleo || [];
  y = drawSectionBanner(doc, y, 'CICLO REPRODUCTIVO · 4. PLANES DE CARGA & RALEO (SIN COSTOS)', `${raleos.length} planes`, [5, 150, 105]);
  y = renderTable(
    doc,
    y,
    ['Fecha Plan', 'Cuartel', 'Meta Ton/ha · Peso Objetivo', 'Frutos Obj./Planta vs Carga Actual', 'A Ralear Total Cuartel', 'Ventana & Cuadrilla', 'Estado / Avance / Resp.'],
    raleos.map((r) => [
      r.fechaPlanificacion,
      `${r.parcelaNombre} (${num(r.superficieHa, 1)} ha)`,
      `${num(r.tonHaObjetivo, 1)} ton/ha · ${num(r.pesoFrutoObjetivoGr, 0)} g`,
      `Obj: ${num(r.frutosObjetivoPlanta, 0)} /pl vs Actual: ${num(r.cargaActualPorPlanta, 0)} /pl\nExcedente: ${num(
        r.excedentePorPlanta,
        0
      )} (${num(r.porcentajeRaleoRequerido, 1)}%)`,
      `${num(r.totalFrutosARalearCuartel, 0)} frutos`,
      `${r.fechaInicioPlanificada} a ${r.fechaTerminoPlanificada}\n${r.cuadrillaPersonas} pers · ${num(
        r.jornalesEstimadosTotales,
        0
      )} jornales`,
      `${r.estado} (${num(r.avanceRealPct, 0)}%)\nResp: ${str(r.responsable)}`,
    ]),
    'Sin planes de carga ni raleo registrados.',
    [5, 150, 105]
  );

  const cuajas = data.evaluacionesCuajaSemillas || [];
  y = drawSectionBanner(doc, y, 'CICLO REPRODUCTIVO · 5. EVALUACIÓN DE CUAJA & CONTEO DE SEMILLAS', `${cuajas.length} evaluaciones`, [5, 150, 105]);
  y = renderTable(
    doc,
    y,
    ['Fecha (DPP)', 'Cuartel', '% Cuaja (Frutos/Flores)', 'Frutos/m² · Deformes', 'Peso Prom. Muestra', 'Semillas Prom. (Mín-Máx)', '>1000 Sem. / Calibre Proy.', 'Calificación & Evaluador'],
    cuajas.map((e) => [
      `${e.fecha} (+${e.diasPostPlenaFlor}d)`,
      `${e.parcelaNombre}${e.hilera ? ` · ${e.hilera}` : ''}`,
      `${num(e.porcentajeCuaja, 1)}% (${e.frutosCuajados}/${e.floresEvaluadas})`,
      `${num(e.frutosPorM2Estimado, 1)} /m² · ${num(e.frutosDeformesAbanicoPct, 1)}% def.`,
      `${num(e.pesoPromedioFrutoMuestraGr, 1)} g (${e.frutosCortadosMuestra} fr.)`,
      `${num(e.semillasPromedioPorFruto, 0)} (${e.semillasMinFruto}-${e.semillasMaxFruto})`,
      `${num(e.porcentajeFrutosSobre1000Semillas, 0)}% · ${e.calibreProyectado}`,
      `${e.calificacionPolinizacion} · ${str(e.evaluador)}`,
    ]),
    'Sin evaluaciones de cuaja y semillas registradas.',
    [5, 150, 105]
  );

  return y;
}

function renderCosechaSection(doc: jsPDF, startY: number, data: Partial<AppStateData>): number {
  let y = startY;
  const muestreos = data.muestreosMadurez || [];
  const cosechas = data.cosechasLote || [];
  const liquidaciones = data.liquidacionesPacking || [];

  y = drawSectionBanner(doc, y, 'COSECHA & MADUREZ · 1. MUESTREOS DE MADUREZ SAG (°BRIX)', `${muestreos.length} muestreos`, [161, 98, 7]);
  y = renderTable(
    doc,
    y,
    ['Fecha', 'Cuartel', '°Brix Prom. (Mín-Máx)', 'Firmeza Pulpa (lb)', '% Materia Seca', 'N° Muestras', 'Apto Cosecha SAG', 'Muestreado por / Lab.'],
    muestreos.map((m) => [
      m.fecha,
      m.parcelaNombre,
      `${num(m.gradosBrixPromedio, 1)}° (${num(m.solidoSolubleMin, 1)}-${num(m.solidoSolubleMax, 1)})`,
      `${num(m.firmezaPulpaLb, 1)} lb`,
      `${num(m.porcentajeMateriaSeca, 1)}%`,
      m.numeroMuestras,
      m.aptoParaCosechaSAG ? 'APTO (>= 6.2° Brix)' : 'No apto aún',
      `${str(m.muestreadoPor)}${m.laboratorio ? `\nLab: ${m.laboratorio}` : ''}`,
    ]),
    'Sin muestreos de madurez registrados.',
    [161, 98, 7]
  );

  y = drawSectionBanner(doc, y, 'COSECHA & MADUREZ · 2. LOTES COSECHADOS & DESPACHO A PACKING', `${cosechas.length} lotes`, [161, 98, 7]);
  y = renderTable(
    doc,
    y,
    ['Fecha', 'Cuartel', 'Bins / Kg Neto Est.', 'Calibre Predom.', 'Cuadrilla', 'Packing Destino & Guía', 'Chofer / Patente', 'Estado & Obs.'],
    cosechas.map((c) => [
      c.fecha,
      c.parcelaNombre,
      `${c.cantidadBins} bins · ${num(c.pesoNetoKgEstimado, 0)} kg`,
      c.calibrePredominante,
      str(c.cuadrilla),
      `${str(c.packingDestino)}\nGuía: ${str(c.numeroGuiaDespacho)}`,
      `${str(c.choferCamion)} (${str(c.patenteCamion)})`,
      `${c.estado.replace(/_/g, ' ')}${c.observaciones ? `\n${c.observaciones}` : ''}`,
    ]),
    'Sin lotes de cosecha registrados.',
    [161, 98, 7]
  );

  if (liquidaciones.length > 0) {
    y = drawSectionBanner(doc, y, 'COSECHA & MADUREZ · 3. RECEPCIÓN TÉCNICA EN PACKING (VOLUMEN & CALIBRES)', `${liquidaciones.length} registros`, [161, 98, 7]);
    y = renderTable(
      doc,
      y,
      ['Fecha / Guía', 'Cuartel', 'Packing / Exportadora', 'Kg Recibidos', 'Kg Exportables (%)', 'Kg Descarte', 'Cajas Exportables', 'Distribución Calibres & Estado'],
      liquidaciones.map((l) => [
        `${l.fechaLiquidacion}\nGuía: ${l.numeroGuiaDespacho}`,
        l.parcelaNombre,
        l.packingExportadora,
        `${num(l.kilosRecibidosKg, 0)} kg`,
        `${num(l.kilosEmbaladosExportacionKg, 0)} kg (${num(l.porcentajeExportable, 1)}%)`,
        `${num(l.kilosDescarteKg, 0)} kg`,
        num(l.cajasExportables, 0),
        `${str(l.distribucionCalibres)} · ${l.estado}`,
      ]),
      '',
      [161, 98, 7]
    );
  }

  return y;
}

function renderLaboratorioBpaSection(doc: jsPDF, startY: number, data: Partial<AppStateData>): number {
  let y = startY;
  const analisis = data.analisisLaboratorio || [];
  const envases = data.registrosEnvases || [];
  const calibraciones = data.calibracionesEquipo || [];
  const planilla = data.planillaBpa;

  y = drawSectionBanner(doc, y, 'LABORATORIO · ANÁLISIS SUELO, AGUA, FOLIAR, MULTIRRESIDUOS & PSA', `${analisis.length} informes`, [79, 70, 229]);
  y = renderTable(
    doc,
    y,
    ['Tipo', 'Muestreo / Resultado', 'Cuartel / Predio', 'Laboratorio & N° Informe', 'Resultado Global', 'Parámetros Técnicos', 'Observaciones'],
    analisis.map((a) => {
      const params = [
        a.ph !== undefined ? `pH ${a.ph}` : '',
        a.ceDsM !== undefined ? `CE ${a.ceDsM}` : '',
        a.nitrogenoPpm !== undefined ? `N ${a.nitrogenoPpm}ppm` : '',
        a.fosforoPpm !== undefined ? `P ${a.fosforoPpm}ppm` : '',
        a.potasioPpm !== undefined ? `K ${a.potasioPpm}ppm` : '',
        a.eColi ? `E.coli: ${a.eColi}` : '',
        a.moleculasDetectadas ? `Moléc: ${a.moleculasDetectadas}` : '',
        a.agenteDetectado ? `Agente: ${a.agenteDetectado}` : '',
      ]
        .filter(Boolean)
        .join(' · ') || '—';

      return [
        a.tipo.toUpperCase(),
        `Muest: ${a.fechaMuestreo}\nRes: ${a.fechaResultado}`,
        a.parcelaNombre,
        `${a.laboratorio}\nInf: ${a.codigoInforme}`,
        a.resultadoGlobal,
        params,
        str(a.observaciones),
      ];
    }),
    'Sin informes de laboratorio registrados.',
    [79, 70, 229]
  );

  y = drawSectionBanner(doc, y, 'MANEJO DE ENVASES VACÍOS (TRIPLE LAVADO & CAMPO LIMPIO)', `${envases.length} entregas`, [79, 70, 229]);
  y = renderTable(
    doc,
    y,
    ['Fecha', 'Producto / Envase', 'Cantidad & Capacidad', 'Triple Lavado', 'Perforado', 'Centro Acopio / Comprobante', 'Responsable & Obs.'],
    envases.map((e) => [
      e.fecha,
      e.productoNombre,
      `${e.cantidadEnvases} x ${e.capacidadUnidad}`,
      e.tripleLavadoRealizado ? 'Sí' : 'No',
      e.perforadoInutilizado ? 'Sí' : 'No',
      `${e.centroAcopioDestino}${e.numeroComprobante ? `\nComp: ${e.numeroComprobante}` : ''}`,
      `${str(e.responsable)}${e.observaciones ? `\n${e.observaciones}` : ''}`,
    ]),
    'Sin entregas de envases vacíos registradas.',
    [79, 70, 229]
  );

  y = drawSectionBanner(doc, y, 'CALIBRACIÓN DE MAQUINARIA & EQUIPOS DE MEDICIÓN', `${calibraciones.length} calibraciones`, [79, 70, 229]);
  y = renderTable(
    doc,
    y,
    ['Fecha Calib. / Próx.', 'Equipo', 'Tipo', 'Patrón / Método', 'Desviación %', 'Resultado & Cert.', 'Responsable & Obs.'],
    calibraciones.map((c) => [
      `${c.fechaCalibracion}\nPróx: ${c.fechaProximaCalibracion}`,
      c.equipoNombre,
      c.tipoEquipo,
      c.patronMetodo,
      `${num(c.desviacionPct, 2)}%`,
      `${c.resultado}${c.numeroCertificado ? `\nCert: ${c.numeroCertificado}` : ''}`,
      `${str(c.responsable)}${c.observaciones ? `\n${c.observaciones}` : ''}`,
    ]),
    'Sin calibraciones de equipos registradas.',
    [79, 70, 229]
  );

  if (planilla && planilla.items.length > 0) {
    y = drawSectionBanner(
      doc,
      y,
      `PLANILLA INTERACTIVA DE AUDITORÍA BPA (${planilla.tipoAuditoria} · ${planilla.temporada})`,
      `${planilla.items.length} puntos`,
      [6, 78, 59]
    );
    y = renderTable(
      doc,
      y,
      ['Código', 'Sección', 'Requisito BPA / GlobalGAP', 'Criticidad', 'Estado', 'Observación / Acción Correctiva', 'Responsable / Plazo'],
      planilla.items.map((it) => [
        it.codigo,
        it.seccion,
        it.requisito,
        it.criticidad,
        it.estado.toUpperCase().replace(/_/g, ' '),
        [it.observacion, it.accionCorrectiva ? `Acción: ${it.accionCorrectiva}` : '']
          .filter(Boolean)
          .join('\n') || '—',
        `${str(it.responsable)}${it.fechaLimiteAccion ? `\nLímite: ${it.fechaLimiteAccion}` : ''}`,
      ]),
      'Planilla BPA vacía.',
      [6, 78, 59]
    );
  }

  return y;
}

function renderTareasTemporadasSection(doc: jsPDF, startY: number, data: Partial<AppStateData>): number {
  let y = startY;
  const tareas = data.tareasHuerto || [];
  const resumenes = data.resumenesTemporada || [];
  const usuarios = data.usuarios || [];

  y = drawSectionBanner(doc, y, 'PLAN DE TAREAS AGRONÓMICAS DEL HUERTO', `${tareas.length} tareas`, [51, 65, 85]);
  y = renderTable(
    doc,
    y,
    ['Título de la Tarea', 'Categoría', 'Cuartel', 'Fecha Límite / Temp.', 'Prioridad', 'Estado', 'Responsable & Obs.'],
    tareas.map((t) => [
      t.titulo,
      t.categoria,
      str(t.parcelaNombre, 'Predio Completo'),
      `${t.fechaLimite} (${t.temporada})`,
      t.prioridad,
      t.estado,
      `${str(t.responsable)}${t.observaciones ? `\n${t.observaciones}` : ''}`,
    ]),
    'Sin tareas agronómicas registradas.',
    [51, 65, 85]
  );

  if (resumenes.length > 0) {
    y = drawSectionBanner(doc, y, 'HISTORIAL COMPARATIVO DE TEMPORADAS (SIN PRECIOS)', `${resumenes.length} temporadas`, [51, 65, 85]);
    y = renderTable(
      doc,
      y,
      ['Temporada', 'Horas Frío Tot.', 'Grados Día Tot.', 'Agua (m³/ha)', '% Cuaja Prom.', 'Cosecha (Ton/ha)', 'Observaciones'],
      resumenes.map((r) => [
        r.temporada,
        `${num(r.horasFrioTotales, 0)} HF`,
        `${num(r.gradosDiaTotales, 0)} °D`,
        `${num(r.aguaConsumidaM3Ha, 0)} m³/ha`,
        `${num(r.porcentajeCuajaPromedio, 1)}%`,
        `${num(r.cosechaTonHa, 1)} ton/ha`,
        str(r.observaciones),
      ]),
      '',
      [51, 65, 85]
    );
  }

  y = drawSectionBanner(doc, y, 'EQUIPO TÉCNICO & PERSONAL AUTORIZADO DEL PREDIO', `${usuarios.length} integrantes`, [51, 65, 85]);
  y = renderTable(
    doc,
    y,
    ['Nombre Completo', 'RUT', 'Cargo / Rol', 'Carnet Aplicador SAG', 'Teléfono', 'Correo Electrónico'],
    usuarios.map((u) => [
      u.nombre,
      u.rut,
      `${u.cargo} (${u.rol.replace(/_/g, ' ')})`,
      u.carnetSAGVigente
        ? `Vigente${u.numeroCarnetSAG ? ` · N° ${u.numeroCarnetSAG}` : ''}${
            u.fechaVencimientoCarnetSAG ? ` (Venc: ${u.fechaVencimientoCarnetSAG})` : ''
          }`
        : 'No aplica / No vigente',
      str(u.telefono),
      str(u.email),
    ]),
    'Sin personal registrado.',
    [51, 65, 85]
  );

  return y;
}

// ==================== EXPORTADORES DEDICADOS POR MÓDULO ====================

export function exportBodegaFitosanitariosPDF(
  items: InsumoInventario[],
  explotacion?: ExplotacionAgricola,
  filtroLabel?: string
): void {
  const doc = createLandscapeDoc();
  const sub = filtroLabel
    ? `Inventario Bodega de Fitosanitarios y Fertilizantes · Filtro: ${filtroLabel}`
    : 'Inventario Completo de Bodega de Fitosanitarios y Fertilizantes (SAG / BPA)';
  const startY = drawDocumentHeader(
    doc,
    'BODEGA DE FITOSANITARIOS & FERTILIZANTES',
    sub,
    explotacion,
    `Total: ${items.length} productos`
  );
  renderBodegaFitoSection(doc, startY, items);
  applyFooters(doc, explotacion?.nombreFundo || 'Bodega de Fitosanitarios');
  doc.save(`bodega_fitosanitarios_${sanitizeFileName(explotacion?.nombreFundo || 'huerto')}.pdf`);
}

export function exportBodegaRiegoMaterialesPDF(
  items: InsumoInventario[],
  explotacion?: ExplotacionAgricola,
  filtroLabel?: string
): void {
  const doc = createLandscapeDoc();
  const sub = filtroLabel
    ? `Inventario Bodega Materiales, Riego & Herramientas · Filtro: ${filtroLabel}`
    : 'Inventario Completo de Bodega de Riego, Materiales, Estructuras y Herramientas';
  const startY = drawDocumentHeader(
    doc,
    'BODEGA DE MATERIALES, RIEGO & HERRAMIENTAS',
    sub,
    explotacion,
    `Total: ${items.length} artículos`
  );
  renderBodegaMaterialesSection(doc, startY, items);
  applyFooters(doc, explotacion?.nombreFundo || 'Bodega de Materiales y Riego');
  doc.save(`bodega_riego_materiales_${sanitizeFileName(explotacion?.nombreFundo || 'huerto')}.pdf`);
}

export function exportMaquinariaPDF(
  maquinarias: MaquinariaEquipo[],
  mantenciones: RegistroMantencionMaquinaria[],
  explotacion?: ExplotacionAgricola,
  filtroLabel?: string
): void {
  const doc = createLandscapeDoc();
  const sub = filtroLabel
    ? `Parque de Maquinarias y Bitácora Técnica · Filtro: ${filtroLabel}`
    : 'Inventario de Maquinarias, Horómetros y Bitácora de Mantenciones Técnicas';
  const startY = drawDocumentHeader(
    doc,
    'PARQUE DE MAQUINARIAS & MANTENCIONES',
    sub,
    explotacion,
    `${maquinarias.length} equipos · ${mantenciones.length} mantenciones`
  );
  renderMaquinariaSection(doc, startY, maquinarias, mantenciones);
  applyFooters(doc, explotacion?.nombreFundo || 'Control de Maquinarias');
  doc.save(`maquinarias_mantenciones_${sanitizeFileName(explotacion?.nombreFundo || 'huerto')}.pdf`);
}

export function exportPozoPDF(
  registros: RegistroExtraccionPozo[],
  sectores: SectorRiego[],
  explotacion?: ExplotacionAgricola
): void {
  const doc = createLandscapeDoc();
  const startY = drawDocumentHeader(
    doc,
    'CONTROL DE POZO PROFUNDO · FISCALIZACIÓN DGA',
    'Sectores de Riego, Horómetros, Flujómetros (m³), Caudales (L/s) y Niveles Piezométricos',
    explotacion,
    `${registros.length} registros`
  );
  renderPozoSection(doc, startY, registros, sectores);
  applyFooters(doc, explotacion?.nombreFundo || 'Control Pozo DGA');
  doc.save(`control_pozo_dga_${sanitizeFileName(explotacion?.nombreFundo || 'huerto')}.pdf`);
}

export function exportRiegoPDF(
  turnos: TurnoRiego[],
  sectores: SectorRiego[],
  explotacion?: ExplotacionAgricola
): void {
  const doc = createLandscapeDoc();
  const startY = drawDocumentHeader(
    doc,
    'CONTROL DE TURNOS DE RIEGO & FERTIRRIEGO',
    'Bitácora de Turnos de Riego, Láminas, Volúmenes (m³), Fertirriego y Presiones',
    explotacion,
    `${turnos.length} turnos`
  );
  renderRiegoSection(doc, startY, turnos, sectores);
  applyFooters(doc, explotacion?.nombreFundo || 'Control de Riego');
  doc.save(`turnos_riego_${sanitizeFileName(explotacion?.nombreFundo || 'huerto')}.pdf`);
}

export function exportOrdenesTrabajoPDF(
  ordenes: OrdenTrabajoFitosanitaria[],
  explotacion?: ExplotacionAgricola
): void {
  const doc = createLandscapeDoc();
  const startY = drawDocumentHeader(
    doc,
    'ÓRDENES DE TRABAJO Y RECETAS FITOSANITARIAS',
    'Prescripciones Agronómicas, Mezclas Multiproducto, Carencias SAG, EPP y Ejecución',
    explotacion,
    `${ordenes.length} órdenes`
  );
  renderOrdenesSection(doc, startY, ordenes);
  applyFooters(doc, explotacion?.nombreFundo || 'Órdenes Fitosanitarias');
  doc.save(`ordenes_fitosanitarias_${sanitizeFileName(explotacion?.nombreFundo || 'huerto')}.pdf`);
}

export function exportLaboresPDF(
  labores: RegistroLabor[],
  explotacion?: ExplotacionAgricola,
  filtroLabel?: string
): void {
  const doc = createLandscapeDoc();
  const sub = filtroLabel
    ? `Cuaderno Histórico de Labores de Campo · Filtro: ${filtroLabel}`
    : 'Cuaderno Oficial de Aplicaciones Fitosanitarias, Riegos, Podas, Monitoreos y Cosechas';
  const startY = drawDocumentHeader(
    doc,
    'CUADERNO HISTÓRICO DE LABORES DE CAMPO',
    sub,
    explotacion,
    `${labores.length} labores`
  );
  renderLaboresSection(doc, startY, labores);
  applyFooters(doc, explotacion?.nombreFundo || 'Cuaderno de Labores');
  doc.save(`cuaderno_labores_${sanitizeFileName(explotacion?.nombreFundo || 'huerto')}.pdf`);
}

// ==================== EXPORTADOR MAESTRO INTEGRAL DEL HUERTO ====================

export function exportLibroCompletoPDF(
  data: Partial<AppStateData>,
  selectedSections?: PdfSectionKey[],
  sectoresRiego: SectorRiego[] = []
): void {
  const sectionsToInclude =
    selectedSections && selectedSections.length > 0
      ? selectedSections
      : PDF_SECTIONS_META.map((s) => s.key);

  const doc = createLandscapeDoc();
  let y = drawDocumentHeader(
    doc,
    'REPORTE INTEGRAL DE TRAZABILIDAD DEL HUERTO',
    'Exportación Completa de Bodegas, Maquinaria, Riego, Campo, Fenología, Cosecha, Laboratorio y Auditoría BPA',
    data.explotacion,
    `${sectionsToInclude.length} módulos incluidos`
  );

  // Tabla índice de resumen con conteo de registros
  y = drawSectionBanner(
    doc,
    y,
    'RESUMEN EJECUTIVO DE MÓDULOS EXPORTADOS',
    `${sectionsToInclude.length} secciones`
  );
  const summaryRows = PDF_SECTIONS_META.filter((m) => sectionsToInclude.includes(m.key)).map(
    (m, idx) => [
      `${idx + 1}`,
      m.label,
      m.description,
      `${m.countResolver(data, sectoresRiego)} registros`,
    ]
  );

  y = renderTable(
    doc,
    y,
    ['#', 'Módulo / Registro', 'Contenido Incluido', 'Cantidad'],
    summaryRows,
    'No se seleccionaron módulos.',
    [6, 78, 59]
  );

  const inventario = data.inventario || [];

  for (const section of sectionsToInclude) {
    switch (section) {
      case 'bodega_fito':
        y = renderBodegaFitoSection(doc, y, inventario.filter(esItemFitosanitario));
        break;
      case 'bodega_riego':
        y = renderBodegaMaterialesSection(doc, y, inventario.filter(esItemMaterialRiego));
        break;
      case 'maquinaria':
        y = renderMaquinariaSection(
          doc,
          y,
          data.maquinarias || [],
          data.registrosMantencion || []
        );
        break;
      case 'cuarteles':
        y = renderCuartelesSection(doc, y, data);
        break;
      case 'pozo':
        y = renderPozoSection(doc, y, data.registrosPozo || [], sectoresRiego);
        break;
      case 'riego':
        y = renderRiegoSection(doc, y, data.turnosRiego || [], sectoresRiego);
        break;
      case 'ordenes':
        y = renderOrdenesSection(doc, y, data.ordenesTrabajo || []);
        break;
      case 'labores':
        y = renderLaboresSection(doc, y, data.labores || []);
        break;
      case 'clima_frio':
        y = renderClimaFrioSection(doc, y, data);
        break;
      case 'fenologia':
        y = renderFenologiaSection(doc, y, data);
        break;
      case 'reproductivo':
        y = renderReproductivoSection(doc, y, data);
        break;
      case 'cosecha':
        y = renderCosechaSection(doc, y, data);
        break;
      case 'laboratorio_bpa':
        y = renderLaboratorioBpaSection(doc, y, data);
        break;
      case 'tareas_temporadas':
        y = renderTareasTemporadasSection(doc, y, data);
        break;
    }
  }

  applyFooters(doc, data.explotacion?.nombreFundo || 'Reporte Integral del Huerto');
  const today = new Date().toISOString().split('T')[0];
  doc.save(
    `reporte_completo_${sanitizeFileName(data.explotacion?.nombreFundo || 'huerto')}_${today}.pdf`
  );
}
