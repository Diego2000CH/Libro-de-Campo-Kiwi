import { 
  AppStateData, 
  ExplotacionAgricola, 
  Parcela, 
  RegistroLabor, 
  InsumoInventario, 
  RegistroExtraccionPozo,
  LugarPredio,
  UsuarioPredio,
  MuestreoMadurez,
  RegistroCosechaLote,
  OrdenTrabajoFitosanitaria,
  CondicionHorasFrio,
  SeguimientoFenologico,
  EstadoFenologicoCatalogo,
  RegistroPolinizacion,
  MaquinariaEquipo,
  RegistroMantencionMaquinaria,
  TurnoRiego,
  SectorRiego,
  ClimaCondiciones,
  MuestreoBrotacion,
  ConteoBotonesFlorales,
  SincroniaFloral,
  AplicacionPolenAsistido,
  PlanCargaRaleo,
  EvaluacionCuajaSemillas,
  RegistroTermicoHuerto,
  LiquidacionPacking,
  AnalisisLaboratorio,
  RegistroEnvaseLimpio,
  CalibracionEquipo,
  TareaAgronomica,
  ResumenTemporada,
  ItemAuditoriaBPA,
  PlanillaAuditoriaBPA,
  EventualidadHuerto,
  ControlHeladaRegistro,
  ConfigControlHeladas
} from '../types/campo';
import { getNivelAcceso } from './permissions';
import { getTemporadaDefaults, normalizarCondicionHorasFrio } from './agroClimaCalculos';
import { HELADAS_CONFIG } from '../config/heladasConfig';
import {
  initialExplotacion,
  initialParcelas,
  initialLugares,
  initialInventario,
  initialLabores,
  initialRegistrosPozo,
  initialMuestreosMadurez,
  initialCosechasLote,
  initialOrdenesTrabajo,
  initialCondicionHorasFrio,
  initialFenologia,
  initialPolinizacion,
  initialUsuarios,
  initialClimaLaCabana,
  initialMaquinarias,
  initialRegistrosMantencion,
  initialTurnosRiego,
  initialMuestreosBrotacion,
  initialConteosBotones,
  initialSincroniasFlorales,
  initialAplicacionesPolen,
  initialPlanesCargaRaleo,
  initialEvaluacionesCuajaSemillas,
  initialRegistrosTermicos,
  initialSectoresRiego
} from '../data/initialData';
import { loadDataFromLocalStorage, saveDataToLocalStorage } from '../services/cloudSync';

const REAL_ORCHARD_CLEANED_KEY = 'huerto_real_vaciado_v2';
const SECTORES_RIEGO_STORAGE_KEY = 'fundo_sectores_riego';

export function getBlankClima(): ClimaCondiciones {
  return {
    temperaturaActual: 0,
    tempMinima: 0,
    tempMaxima: 0,
    humedadRelativa: 0,
    velocidadVientoKmH: 0,
    direccionViento: 'Sin datos',
    probabilidadLluvia: 0,
    alertaHelada: false,
    riesgoPsa: 'Bajo',
    riesgoBotrytis: 'Bajo',
    evapotranspiracionEtoMmDia: 0,
    estadoCielo: 'Soleado',
  };
}

export function getStoredSectoresRiego(): SectorRiego[] {
  try {
    const raw = localStorage.getItem(SECTORES_RIEGO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error leyendo sectores de riego:', e);
    return [];
  }
}

export function saveStoredSectoresRiego(sectores: SectorRiego[]): void {
  try {
    localStorage.setItem(SECTORES_RIEGO_STORAGE_KEY, JSON.stringify(sectores));
    window.dispatchEvent(new Event('fundo_sectores_updated'));
  } catch (e) {
    console.warn('Error guardando sectores de riego:', e);
  }
}

export function cleanDemoSectoresRiego(): void {
  try {
    const raw = localStorage.getItem(SECTORES_RIEGO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SECTORES_RIEGO_STORAGE_KEY, '[]');
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    const demoSet = new Map(initialSectoresRiego.map((s) => [String(s.id), s.nombre]));
    const onlyDemo = parsed.every(
      (s: SectorRiego) => demoSet.has(String(s.id)) && demoSet.get(String(s.id)) === s.nombre
    );
    if (onlyDemo) {
      saveStoredSectoresRiego([]);
    }
  } catch (e) {
    console.warn('Error limpiando sectores demo:', e);
  }
}

// IDs de los registros ficticios de demostración para poder purgarlos sin borrar datos reales del usuario
export const DEMO_RECORD_IDS = new Set<string>([
  'cuartel-1', 'cuartel-2', 'cuartel-3', 'cuartel-4',
  'lug-1', 'lug-2', 'lug-3', 'lug-4', 'lug-5', 'lug-6', 'lug-7', 'lug-8', 'lug-9', 'lug-10', 'lug-11',
  'tr-01', 'tr-02', 'tr-03',
  'ins-1', 'ins-2', 'ins-3', 'ins-4', 'ins-5', 'ins-6', 'ins-7', 'ins-8',
  'mat-r1', 'mat-r2', 'mat-r3', 'mat-r4',
  'mat-a1', 'mat-a2', 'mat-a3',
  'mat-p1', 'mat-p2',
  'mat-m1', 'mat-m2',
  'mat-h1', 'mat-h2', 'mat-h3', 'mat-h4', 'mat-h5',
  'lab-101', 'lab-102', 'lab-103',
  'pz-01', 'pz-02', 'pz-03',
  'maq-1', 'maq-2', 'maq-3', 'maq-4', 'maq-5', 'maq-6',
  'man-1', 'man-2',
  'mm-01', 'mm-02', 'mm-03',
  'cos-01',
  'ot-2026-08', 'ot-2026-09',
  'fen-01', 'fen-02',
  'pol-01',
  'mb-01', 'mb-02', 'mb-03',
  'cbf-01', 'cbf-02', 'cbf-03',
  'sf-01', 'sf-02',
  'apa-01',
  'pcr-01',
  'ecs-01', 'ecs-02',
  'rt-01', 'rt-02', 'rt-03', 'rt-04', 'rt-05', 'rt-06'
]);

export function getBlankExplotacion(): ExplotacionAgricola {
  return {
    id: 'exp-huerto-real',
    nombreFundo: 'Mi Huerto de Kiwis',
    rut: '',
    comuna: '',
    provincia: '',
    region: '',
    direccion: 'Entrada Principal',
    representanteLegal: '',
    rutRepresentante: '',
    asesorAgronomo: '',
    registroColegioAgronomos: '',
    telefonoContacto: '',
    emailContacto: '',
    superficieTotalHa: 0,
    superficieKiwisHa: 0,
    variedadPrincipal: 'Kiwi Hayward (Actinidia deliciosa)',
    polinizadores: [],
    certificaciones: [],
    latitud: -39.628593,
    longitud: -72.461085
  };
}

export function getBlankHorasFrio(): CondicionHorasFrio {
  const defaults = getTemporadaDefaults();
  return {
    fechaCorte: new Date().toISOString().split('T')[0],
    totalAcumuladoHF: 0,
    metaVariedadHF: defaults.metaVariedadHF,
    modeloCalculo: 'Weinberger (< 7.2°C)',
    porcentajeCumplimiento: 0,
    estadoDormancia: 'Dormancia profunda',
    recomendacionRompedor: '',
    fechaInicioHF: defaults.fechaInicioHF,
    fechaFinHF: defaults.fechaFinHF,
    fechaInicioGD: defaults.fechaInicioGD,
    fechaFinGD: defaults.fechaFinGD,
    tempBaseGddC: defaults.tempBaseGddC,
    tempTechoGddC: defaults.tempTechoGddC,
    totalAcumuladoGD: 0,
    metaVariedadGD: defaults.metaVariedadGD,
    sincronizarDesdeRegistros: false
  };
}

export const PREFORMED_BPA_TEMPLATE_ITEMS: Omit<ItemAuditoriaBPA, 'estado'>[] = [
  // 01. Bodega de Fitosanitarios & Fertilizantes
  {
    id: 'bpa-01-1',
    codigo: '01.1',
    seccion: '01. Bodega de Fitosanitarios & Fertilizantes',
    requisito: 'Bodega cerrada con llave, ventilación adecuada, señalética de peligro y bandeja antiderrame operativa.',
    criterioCumplimiento: 'Acceso restringido solo a personal autorizado; piso impermeable y kit antiderrame con arena/aserrín.',
    criticidad: 'Mayor',
  },
  {
    id: 'bpa-01-2',
    codigo: '01.2',
    seccion: '01. Bodega de Fitosanitarios & Fertilizantes',
    requisito: 'Productos almacenados en envases originales, etiqueta legible, autorizados por SAG y sin productos vencidos.',
    criterioCumplimiento: 'Todo el stock vigente y segregado físicamente (herbicidas separados de fungicidas/fertilizantes).',
    criticidad: 'Mayor',
    autoCheckKey: 'auto_bodega',
  },
  {
    id: 'bpa-01-3',
    codigo: '01.3',
    seccion: '01. Bodega de Fitosanitarios & Fertilizantes',
    requisito: 'Carpeta de Hojas de Datos de Seguridad (HDS) visible y elementos exclusivos de pesaje/medición.',
    criterioCumplimiento: 'HDS actualizadas disponibles en bodega + balanza y probetas calibradas de uso exclusivo químico.',
    criticidad: 'Menor',
  },
  {
    id: 'bpa-01-4',
    codigo: '01.4',
    seccion: '01. Bodega de Fitosanitarios & Fertilizantes',
    requisito: 'Inventario actualizado de entradas, salidas, lotes y fechas de vencimiento en Cuaderno de Campo.',
    criterioCumplimiento: 'Existencia física coincide con el stock registrado en Bodega Fitosanitarios.',
    criticidad: 'Menor',
  },
  // 02. Aplicaciones Fitosanitarias, LMR & Equipos
  {
    id: 'bpa-02-1',
    codigo: '02.1',
    seccion: '02. Aplicaciones Fitosanitarias, LMR & Equipos',
    requisito: 'Aplicadores cuentan con Carnet Oficial de Aplicador SAG vigente y capacitación documentada.',
    criterioCumplimiento: 'Carnets vigentes sin fecha vencida registrados en Equipo & Usuarios.',
    criticidad: 'Mayor',
    autoCheckKey: 'auto_sag',
  },
  {
    id: 'bpa-02-2',
    codigo: '02.2',
    seccion: '02. Aplicaciones Fitosanitarias, LMR & Equipos',
    requisito: 'Equipos pulverizadores, nebulizadores e instrumentos (refractómetro, romana) con calibración vigente.',
    criterioCumplimiento: 'Aforo de boquillas, manómetro y calibración al menos 1 vez por temporada con registro.',
    criticidad: 'Mayor',
    autoCheckKey: 'auto_calibracion',
  },
  {
    id: 'bpa-02-3',
    codigo: '02.3',
    seccion: '02. Aplicaciones Fitosanitarias, LMR & Equipos',
    requisito: 'Respeto estricto de días de Carencia (LMR) y tiempos de Reingreso (REI) con orden de aplicación firmada.',
    criterioCumplimiento: 'Órdenes de trabajo con fecha, dosis, cuartel, viento/clima, aplicador y señalética de No Ingresar.',
    criticidad: 'Mayor',
  },
  {
    id: 'bpa-02-4',
    codigo: '02.4',
    seccion: '02. Aplicaciones Fitosanitarias, LMR & Equipos',
    requisito: 'Análisis Multirresiduos (LMR) pre-cosecha conforme según tolerancias del mercado de destino.',
    criterioCumplimiento: 'Informe de laboratorio acreditado bajo norma LMR sin detecciones no autorizadas.',
    criticidad: 'Mayor',
    autoCheckKey: 'auto_lmr',
  },
  // 03. Seguridad Laboral, Higiene & Prevención Psa
  {
    id: 'bpa-03-1',
    codigo: '03.1',
    seccion: '03. Seguridad Laboral, Higiene & Prevención Psa',
    requisito: 'Entrega y uso correcto de EPP completo (traje impermeable, mascarilla doble filtro, antiparras, guantes nitrilo).',
    criterioCumplimiento: 'Registro firmado de entrega de EPP y zona limpia separada para guardar ropa de trabajo.',
    criticidad: 'Mayor',
  },
  {
    id: 'bpa-03-2',
    codigo: '03.2',
    seccion: '03. Seguridad Laboral, Higiene & Prevención Psa',
    requisito: 'Servicios higiénicos / baños en terreno limpios, con agua potable, jabón, toalla desechable y basurero.',
    criterioCumplimiento: 'Disponibles a menos de 500 m del área de trabajo de cuadrillas de poda, raleo y cosecha.',
    criticidad: 'Mayor',
  },
  {
    id: 'bpa-03-3',
    codigo: '03.3',
    seccion: '03. Seguridad Laboral, Higiene & Prevención Psa',
    requisito: 'Botiquín de primeros auxilios completo vigente, ducha de emergencia y lavaojos operativos.',
    criterioCumplimiento: 'Insumos de botiquín sin vencer; números de emergencia (CITUC / Mutual / Ambulancia) publicados.',
    criticidad: 'Mayor',
  },
  {
    id: 'bpa-03-4',
    codigo: '03.4',
    seccion: '03. Seguridad Laboral, Higiene & Prevención Psa',
    requisito: 'Protocolo activo de bioseguridad y desinfección de tijeras, serruchos y calzado entre cuarteles (Psa).',
    criterioCumplimiento: 'Uso de amonio cuaternario o alcohol en poda/raleo y sellado inmediato de cortes gruesos.',
    criticidad: 'Mayor',
  },
  // 04. Manejo de Envases, Residuos & Punto Limpio
  {
    id: 'bpa-04-1',
    codigo: '04.1',
    seccion: '04. Manejo de Envases, Residuos & Punto Limpio',
    requisito: 'Triple lavado inmediato, perforación e inutilización de envases vacíos y entrega a Campo Limpio.',
    criterioCumplimiento: 'Comprobantes de entrega en centro de acopio registrados en pestaña Triple Lavado.',
    criticidad: 'Mayor',
    autoCheckKey: 'auto_envases',
  },
  {
    id: 'bpa-04-2',
    codigo: '04.2',
    seccion: '04. Manejo de Envases, Residuos & Punto Limpio',
    requisito: 'Zona de mezcla y lavado de equipos ubicada lejos de pozos, canales de riego o cursos de agua (> 20 m).',
    criterioCumplimiento: 'Barbecho o cama biológica operativa sin escurrimientos hacia acequias ni napas.',
    criticidad: 'Mayor',
  },
  {
    id: 'bpa-04-3',
    codigo: '04.3',
    seccion: '04. Manejo de Envases, Residuos & Punto Limpio',
    requisito: 'Segregación ordenada de residuos domésticos, plásticos agrícolas, chatarra y aceites usados de maquinaria.',
    criterioCumplimiento: 'Punto limpio señalizado y retiro autorizado de residuos peligrosos/aceites.',
    criticidad: 'Menor',
  },
  // 05. Recurso Hídrico, Pozo DGA & Laboratorio
  {
    id: 'bpa-05-1',
    codigo: '05.1',
    seccion: '05. Recurso Hídrico, Pozo DGA & Laboratorio',
    requisito: 'Análisis microbiológico y fisicoquímico de agua de riego vigente (< 12 meses) con parámetros conformes.',
    criterioCumplimiento: 'Informe E. coli / coliformes y CE/pH ingresado en módulo Laboratorio.',
    criticidad: 'Mayor',
    autoCheckKey: 'auto_agua',
  },
  {
    id: 'bpa-05-2',
    codigo: '05.2',
    seccion: '05. Recurso Hídrico, Pozo DGA & Laboratorio',
    requisito: 'Extracción de pozo registrada con flujómetro totalizador, horómetro y caudales según exigencia DGA.',
    criterioCumplimiento: 'Bitácora de Control Pozo DGA al día con lecturas reales.',
    criticidad: 'Mayor',
    autoCheckKey: 'auto_pozo',
  },
  {
    id: 'bpa-05-3',
    codigo: '05.3',
    seccion: '05. Recurso Hídrico, Pozo DGA & Laboratorio',
    requisito: 'Cabezal de riego / fertirriego limpio, sin filtraciones y equipado con válvula antirretorno.',
    criterioCumplimiento: 'Evita devolución de fertilizantes hacia la captación del pozo profundo.',
    criticidad: 'Mayor',
  },
  {
    id: 'bpa-05-4',
    codigo: '05.4',
    seccion: '05. Recurso Hídrico, Pozo DGA & Laboratorio',
    requisito: 'Justificación técnica de fertilización respaldada por análisis foliar o de suelo de la temporada.',
    criterioCumplimiento: 'Recomendación agronómica coherente con análisis de Laboratorio y dosis por cuartel.',
    criticidad: 'Recomendación',
  },
  // 06. Cosecha, Madurez & Trazabilidad
  {
    id: 'bpa-06-1',
    codigo: '06.1',
    seccion: '06. Cosecha, Madurez & Trazabilidad',
    requisito: 'Muestreos oficiales de madurez (≥ 6.2° Brix, firmeza y materia seca) verificados antes de cosechar cada cuartel.',
    criterioCumplimiento: 'Todos los despachos de bins respaldados por muestreo de madurez aprobado y sin carencia LMR activa.',
    criticidad: 'Mayor',
    autoCheckKey: 'auto_madurez',
  },
  {
    id: 'bpa-06-2',
    codigo: '06.2',
    seccion: '06. Cosecha, Madurez & Trazabilidad',
    requisito: 'Bins cosecheros, capachos y camiones inspeccionados, limpios, sin astillas, aceites ni contaminantes.',
    criterioCumplimiento: 'Guías de despacho con número de lote, cuartel de origen, patente y código QR de trazabilidad.',
    criticidad: 'Mayor',
  },
  {
    id: 'bpa-06-3',
    codigo: '06.3',
    seccion: '06. Cosecha, Madurez & Trazabilidad',
    requisito: 'Mapa del predio actualizado con cuarteles, pozos, bodegas, puntos limpios y zonas de riesgo sanitario.',
    criterioCumplimiento: 'Trazabilidad espacial clara entre mapa predial, cuaderno de labores y etiquetas de despacho.',
    criticidad: 'Menor',
  },
  {
    id: 'bpa-06-4',
    codigo: '06.4',
    seccion: '06. Cosecha, Madurez & Trazabilidad',
    requisito: 'Procedimiento de manejo de reclamos, retiro/recuperación de producto (Recall) y evaluación anual de riesgos BPA.',
    criterioCumplimiento: 'Planilla de auditoría interna completada antes del inicio de cosecha.',
    criticidad: 'Menor',
  },
];

export function createBlankPlanillaBpa(activeUserName = ''): PlanillaAuditoriaBPA {
  const hoy = new Date().toISOString().split('T')[0];
  const yr = new Date().getFullYear();
  const month = new Date().getMonth() + 1;
  const temporada = month >= 5 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`;

  return {
    id: `bpa-${Date.now()}`,
    titulo: 'Planilla Oficial de Autoevaluación BPA / GlobalG.A.P. IFA v6',
    temporada,
    tipoAuditoria: 'Autoevaluación BPA',
    fechaInicio: hoy,
    fechaUltimaRevision: hoy,
    auditorResponsable: activeUserName || '',
    notasGenerales: '',
    items: PREFORMED_BPA_TEMPLATE_ITEMS.map((item) => ({
      ...item,
      estado: 'pendiente',
      observacion: '',
      accionCorrectiva: '',
      fechaLimiteAccion: '',
      responsable: '',
      fechaVerificacion: '',
      evidenciaFotoDataUrl: undefined,
    })),
  };
}

export function normalizePlanillaBpa(raw?: PlanillaAuditoriaBPA | null): PlanillaAuditoriaBPA {
  if (!raw || !Array.isArray(raw.items) || raw.items.length === 0) {
    return createBlankPlanillaBpa();
  }
  return {
    id: raw.id || `bpa-${Date.now()}`,
    titulo: raw.titulo || 'Planilla Oficial de Autoevaluación BPA / GlobalG.A.P. IFA v6',
    temporada: raw.temporada || `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
    tipoAuditoria: raw.tipoAuditoria || 'Autoevaluación BPA',
    fechaInicio: raw.fechaInicio || new Date().toISOString().split('T')[0],
    fechaUltimaRevision: raw.fechaUltimaRevision || new Date().toISOString().split('T')[0],
    auditorResponsable: raw.auditorResponsable || '',
    notasGenerales: raw.notasGenerales || '',
    items: raw.items.map((it) => ({
      ...it,
      estado: it.estado || 'pendiente',
      criticidad: it.criticidad || 'Mayor',
    })),
  };
}

export function getDefaultConfigControlHeladas(): ConfigControlHeladas {
  return {
    umbralAlertaC: HELADAS_CONFIG.umbralAlertaPreventivaC,
    umbralEncendidoC: HELADAS_CONFIG.umbralCriticoC,
    umbralCriticoC: HELADAS_CONFIG.umbralCriticoC,
    umbralApagadoC: HELADAS_CONFIG.umbralApagadoSeguroC,
    estadoFenologicoReferencia: HELADAS_CONFIG.estadoFenologicoReferencia,
    metodoPrincipalPredio: HELADAS_CONFIG.metodoPrincipalPredio,
    tasaPrecipitacionMmHora: HELADAS_CONFIG.tasaPrecipitacionMmHora,
    checklist: {
      aspersoresLimpiosDestapados: false,
      bombaPresionVerificada: false,
      caudalimetroOperativo: false,
      combustibleEnergiaRespaldo: false,
      sensoresTermicosCalibrados: false,
      sueloHumedoSinMalezaAlta: false,
      fechaUltimaVerificacion: '',
      responsableChecklist: '',
    },
    protocoloEmergenciaNotas:
      'En noches despejadas con baja humedad relativa, iniciar aspersión guiándose por la temperatura de bulbo húmedo (+0.5°C a +1.0°C) y detener solo cuando el hielo superficial comience a fundirse sobre las yemas/brotes.',
    notificacionesProactivas: {
      ...HELADAS_CONFIG.notificacionesProactivas,
    },
    historialNotificaciones: [],
  };
}

export function normalizeConfigControlHeladas(
  raw?: ConfigControlHeladas | null
): ConfigControlHeladas {
  const def = getDefaultConfigControlHeladas();
  if (!raw || typeof raw !== 'object') return def;
  const umbralCriticoVal =
    typeof raw.umbralCriticoC === 'number' && Number.isFinite(raw.umbralCriticoC)
      ? raw.umbralCriticoC
      : typeof raw.umbralEncendidoC === 'number' && Number.isFinite(raw.umbralEncendidoC)
      ? raw.umbralEncendidoC
      : def.umbralCriticoC;

  return {
    umbralAlertaC: typeof raw.umbralAlertaC === 'number' ? raw.umbralAlertaC : def.umbralAlertaC,
    umbralEncendidoC:
      typeof raw.umbralEncendidoC === 'number' ? raw.umbralEncendidoC : def.umbralEncendidoC,
    umbralCriticoC: umbralCriticoVal,
    umbralApagadoC:
      typeof raw.umbralApagadoC === 'number' ? raw.umbralApagadoC : def.umbralApagadoC,
    estadoFenologicoReferencia:
      raw.estadoFenologicoReferencia || def.estadoFenologicoReferencia,
    metodoPrincipalPredio: raw.metodoPrincipalPredio || def.metodoPrincipalPredio,
    tasaPrecipitacionMmHora:
      typeof raw.tasaPrecipitacionMmHora === 'number'
        ? raw.tasaPrecipitacionMmHora
        : def.tasaPrecipitacionMmHora,
    checklist: {
      ...def.checklist,
      ...(raw.checklist || {}),
    },
    protocoloEmergenciaNotas:
      raw.protocoloEmergenciaNotas !== undefined
        ? raw.protocoloEmergenciaNotas
        : def.protocoloEmergenciaNotas,
    notificacionesProactivas: {
      ...HELADAS_CONFIG.notificacionesProactivas,
      ...(raw.notificacionesProactivas || {}),
    },
    historialNotificaciones: Array.isArray(raw.historialNotificaciones)
      ? raw.historialNotificaciones.slice(0, 40)
      : [],
  };
}

export function getBlankRealOrchardData(
  preserveExplotacion?: ExplotacionAgricola,
  preserveUsuarios?: UsuarioPredio[]
): AppStateData {
  const cleanExplotacion =
    preserveExplotacion && preserveExplotacion.nombreFundo !== 'Fundo La Cabaña'
      ? preserveExplotacion
      : getBlankExplotacion();

  return {
    explotacion: cleanExplotacion,
    parcelas: [],
    labores: [],
    inventario: [],
    registrosPozo: [],
    maquinarias: [],
    registrosMantencion: [],
    lugares: [],
    usuarios: preserveUsuarios && preserveUsuarios.length > 0 ? preserveUsuarios : initialUsuarios,
    activeUserId: (preserveUsuarios && preserveUsuarios[0]?.id) || initialUsuarios[0].id,
    muestreosMadurez: [],
    cosechasLote: [],
    ordenesTrabajo: [],
    horasFrio: getBlankHorasFrio(),
    registrosTermicos: [],
    fenologia: [],
    estadosFenologicosPersonalizados: [],
    polinizacion: [],
    muestreosBrotacion: [],
    conteosBotones: [],
    sincroniasFlorales: [],
    aplicacionesPolen: [],
    planesCargaRaleo: [],
    evaluacionesCuajaSemillas: [],
    turnosRiego: [],
    clima: getBlankClima(),
    eventualidades: [],
    controlesHelada: [],
    configControlHeladas: getDefaultConfigControlHeladas(),
    liquidacionesPacking: [],
    analisisLaboratorio: [],
    registrosEnvases: [],
    calibracionesEquipo: [],
    auditoriaManual: {},
    planillaBpa: createBlankPlanillaBpa(),
    tareasHuerto: [],
    resumenesTemporada: [],
    ultimaActualizacion: new Date().toISOString()
  };
}

export function stripDemoRecords(data: AppStateData): AppStateData {
  const filterOutDemo = <T extends { id: string }>(arr?: T[]): T[] =>
    Array.isArray(arr) ? arr.filter((item) => !DEMO_RECORD_IDS.has(item.id)) : [];

  const isDemoExplotacion =
    data.explotacion?.id === 'exp-la-cabana' &&
    data.explotacion?.nombreFundo === 'Fundo La Cabaña';

  const isDemoHorasFrio =
    data.horasFrio?.fechaCorte === initialCondicionHorasFrio.fechaCorte &&
    data.horasFrio?.totalAcumuladoHF === initialCondicionHorasFrio.totalAcumuladoHF;

  return {
    ...data,
    explotacion: isDemoExplotacion ? getBlankExplotacion() : data.explotacion,
    parcelas: filterOutDemo(data.parcelas),
    labores: filterOutDemo(data.labores),
    inventario: filterOutDemo(data.inventario),
    registrosPozo: filterOutDemo(data.registrosPozo),
    maquinarias: filterOutDemo(data.maquinarias),
    registrosMantencion: filterOutDemo(data.registrosMantencion),
    lugares: filterOutDemo(data.lugares),
    muestreosMadurez: filterOutDemo(data.muestreosMadurez),
    cosechasLote: filterOutDemo(data.cosechasLote),
    ordenesTrabajo: filterOutDemo(data.ordenesTrabajo),
    horasFrio: isDemoHorasFrio
      ? getBlankHorasFrio()
      : normalizarCondicionHorasFrio(data.horasFrio, filterOutDemo(data.registrosTermicos)),
    registrosTermicos: filterOutDemo(data.registrosTermicos),
    fenologia: filterOutDemo(data.fenologia),
    estadosFenologicosPersonalizados: Array.isArray(data.estadosFenologicosPersonalizados)
      ? data.estadosFenologicosPersonalizados
      : [],
    polinizacion: filterOutDemo(data.polinizacion),
    muestreosBrotacion: filterOutDemo(data.muestreosBrotacion),
    conteosBotones: filterOutDemo(data.conteosBotones),
    sincroniasFlorales: filterOutDemo(data.sincroniasFlorales),
    aplicacionesPolen: filterOutDemo(data.aplicacionesPolen),
    planesCargaRaleo: filterOutDemo(data.planesCargaRaleo),
    evaluacionesCuajaSemillas: filterOutDemo(data.evaluacionesCuajaSemillas),
    turnosRiego: filterOutDemo(data.turnosRiego),
    eventualidades: Array.isArray(data.eventualidades) ? data.eventualidades : [],
    controlesHelada: Array.isArray(data.controlesHelada) ? data.controlesHelada : [],
    configControlHeladas: normalizeConfigControlHeladas(data.configControlHeladas),
    liquidacionesPacking: Array.isArray(data.liquidacionesPacking) ? data.liquidacionesPacking : [],
    analisisLaboratorio: Array.isArray(data.analisisLaboratorio) ? data.analisisLaboratorio : [],
    registrosEnvases: Array.isArray(data.registrosEnvases) ? data.registrosEnvases : [],
    calibracionesEquipo: Array.isArray(data.calibracionesEquipo) ? data.calibracionesEquipo : [],
    auditoriaManual: data.auditoriaManual && typeof data.auditoriaManual === 'object' ? data.auditoriaManual : {},
    planillaBpa: normalizePlanillaBpa(data.planillaBpa),
    tareasHuerto: Array.isArray(data.tareasHuerto) ? data.tareasHuerto : [],
    resumenesTemporada: Array.isArray(data.resumenesTemporada) ? data.resumenesTemporada : []
  };
}

export function getFullInitialData(): AppStateData {
  // Por defecto el sistema inicia como Huerto Real 100% en blanco (sin datos ficticios)
  return getBlankRealOrchardData();
}

export function getDemoSampleData(): AppStateData {
  return {
    explotacion: initialExplotacion,
    parcelas: initialParcelas,
    labores: initialLabores,
    inventario: initialInventario,
    registrosPozo: initialRegistrosPozo,
    maquinarias: initialMaquinarias,
    registrosMantencion: initialRegistrosMantencion,
    lugares: initialLugares,
    usuarios: initialUsuarios,
    activeUserId: initialUsuarios[0].id,
    muestreosMadurez: initialMuestreosMadurez,
    cosechasLote: initialCosechasLote,
    ordenesTrabajo: initialOrdenesTrabajo,
    horasFrio: initialCondicionHorasFrio,
    registrosTermicos: initialRegistrosTermicos,
    fenologia: initialFenologia,
    estadosFenologicosPersonalizados: [],
    polinizacion: initialPolinizacion,
    muestreosBrotacion: initialMuestreosBrotacion,
    conteosBotones: initialConteosBotones,
    sincroniasFlorales: initialSincroniasFlorales,
    aplicacionesPolen: initialAplicacionesPolen,
    planesCargaRaleo: initialPlanesCargaRaleo,
    evaluacionesCuajaSemillas: initialEvaluacionesCuajaSemillas,
    turnosRiego: initialTurnosRiego,
    clima: initialClimaLaCabana,
    eventualidades: [],
    controlesHelada: [],
    configControlHeladas: getDefaultConfigControlHeladas(),
    liquidacionesPacking: [],
    analisisLaboratorio: [],
    registrosEnvases: [],
    calibracionesEquipo: [],
    auditoriaManual: {},
    planillaBpa: createBlankPlanillaBpa(),
    tareasHuerto: [],
    resumenesTemporada: [],
    ultimaActualizacion: new Date().toISOString()
  };
}

export function getStoredData(): AppStateData {
  const stored = loadDataFromLocalStorage();
  if (stored && stored.explotacion) {
    // Asegurar que usuarios tengan contraseñas y nivelAcceso si provienen de versión anterior
    if (stored.usuarios && stored.usuarios.length) {
      stored.usuarios = stored.usuarios.map((u) => {
        const match = initialUsuarios.find((initU) => initU.id === u.id || initU.rut === u.rut);
        const password = u.password || (match ? match.password : '1234');
        const nivelAcceso = getNivelAcceso({ ...u, password });
        return {
          ...u,
          password,
          nivelAcceso
        };
      });
    } else {
      stored.usuarios = initialUsuarios;
    }

    // Normalizar arreglos faltantes como [] sin volver a inyectar datos ficticios
    const normalized: AppStateData = {
      ...stored,
      parcelas: stored.parcelas || [],
      labores: stored.labores || [],
      inventario: stored.inventario || [],
      registrosPozo: stored.registrosPozo || [],
      maquinarias: stored.maquinarias || [],
      registrosMantencion: stored.registrosMantencion || [],
      lugares: stored.lugares || [],
      muestreosMadurez: stored.muestreosMadurez || [],
      cosechasLote: stored.cosechasLote || [],
      ordenesTrabajo: stored.ordenesTrabajo || [],
      horasFrio: normalizarCondicionHorasFrio(stored.horasFrio, stored.registrosTermicos || []),
      registrosTermicos: stored.registrosTermicos || [],
      fenologia: stored.fenologia || [],
      estadosFenologicosPersonalizados: stored.estadosFenologicosPersonalizados || [],
      polinizacion: stored.polinizacion || [],
      muestreosBrotacion: stored.muestreosBrotacion || [],
      conteosBotones: stored.conteosBotones || [],
      sincroniasFlorales: stored.sincroniasFlorales || [],
      aplicacionesPolen: stored.aplicacionesPolen || [],
      planesCargaRaleo: stored.planesCargaRaleo || [],
      evaluacionesCuajaSemillas: stored.evaluacionesCuajaSemillas || [],
      turnosRiego: stored.turnosRiego || [],
      eventualidades: stored.eventualidades || [],
      controlesHelada: stored.controlesHelada || [],
      configControlHeladas: normalizeConfigControlHeladas(stored.configControlHeladas),
      liquidacionesPacking: stored.liquidacionesPacking || [],
      analisisLaboratorio: stored.analisisLaboratorio || [],
      registrosEnvases: stored.registrosEnvases || [],
      calibracionesEquipo: stored.calibracionesEquipo || [],
      auditoriaManual: stored.auditoriaManual || {},
      planillaBpa: normalizePlanillaBpa(stored.planillaBpa),
      tareasHuerto: stored.tareasHuerto || [],
      resumenesTemporada: stored.resumenesTemporada || []
    };

    // Purga automática de datos ficticios la primera vez (conserva 100% los datos reales del usuario)
    let alreadyCleaned = false;
    try {
      alreadyCleaned = localStorage.getItem(REAL_ORCHARD_CLEANED_KEY) === 'true';
    } catch (e) {}

    if (!alreadyCleaned) {
      cleanDemoSectoresRiego();
      const cleaned = stripDemoRecords(normalized);
      saveDataToLocalStorage(cleaned);
      try {
        localStorage.setItem(REAL_ORCHARD_CLEANED_KEY, 'true');
      } catch (e) {}
      return cleaned;
    }

    return normalized;
  }

  cleanDemoSectoresRiego();
  const blank = getBlankRealOrchardData();
  saveDataToLocalStorage(blank);
  try {
    localStorage.setItem(REAL_ORCHARD_CLEANED_KEY, 'true');
  } catch (e) {}
  return blank;
}

export function getStoredExplotacion(): ExplotacionAgricola {
  return getStoredData().explotacion;
}

export function getStoredParcelas(): Parcela[] {
  return getStoredData().parcelas;
}

export function getStoredLabores(): RegistroLabor[] {
  return getStoredData().labores;
}

export function getStoredInventario(): InsumoInventario[] {
  return getStoredData().inventario;
}

export function getStoredRegistrosPozo(): RegistroExtraccionPozo[] {
  return getStoredData().registrosPozo;
}

export function getStoredMaquinarias(): MaquinariaEquipo[] {
  return getStoredData().maquinarias || [];
}

export function getStoredRegistrosMantencion(): RegistroMantencionMaquinaria[] {
  return getStoredData().registrosMantencion || [];
}

export function getStoredLugares(): LugarPredio[] {
  return getStoredData().lugares || [];
}

export function getStoredUsuarios(): UsuarioPredio[] {
  return getStoredData().usuarios || initialUsuarios;
}

export function getStoredActiveUserId(): string {
  return getStoredData().activeUserId || initialUsuarios[0].id;
}

export function getStoredMuestreosMadurez(): MuestreoMadurez[] {
  return getStoredData().muestreosMadurez || [];
}

export function getStoredCosechasLote(): RegistroCosechaLote[] {
  return getStoredData().cosechasLote || [];
}

export function getStoredOrdenesTrabajo(): OrdenTrabajoFitosanitaria[] {
  return getStoredData().ordenesTrabajo || [];
}

export function getStoredCondicionHorasFrio(): CondicionHorasFrio {
  const data = getStoredData();
  return normalizarCondicionHorasFrio(data.horasFrio, data.registrosTermicos || []);
}

export function getStoredRegistrosTermicos(): RegistroTermicoHuerto[] {
  return getStoredData().registrosTermicos || [];
}

export function getStoredFenologia(): SeguimientoFenologico[] {
  return getStoredData().fenologia || [];
}

export function getStoredEstadosFenologicosPersonalizados(): EstadoFenologicoCatalogo[] {
  return getStoredData().estadosFenologicosPersonalizados || [];
}

export function getStoredPolinizacion(): RegistroPolinizacion[] {
  return getStoredData().polinizacion || [];
}

export function getStoredTurnosRiego(): TurnoRiego[] {
  return getStoredData().turnosRiego || [];
}

export function getStoredEventualidades(): EventualidadHuerto[] {
  return getStoredData().eventualidades || [];
}

export function getStoredControlesHelada(): ControlHeladaRegistro[] {
  return getStoredData().controlesHelada || [];
}

export function getStoredConfigControlHeladas(): ConfigControlHeladas {
  return normalizeConfigControlHeladas(getStoredData().configControlHeladas);
}

export function getStoredMuestreosBrotacion(): MuestreoBrotacion[] {
  return getStoredData().muestreosBrotacion || [];
}

export function getStoredConteosBotones(): ConteoBotonesFlorales[] {
  return getStoredData().conteosBotones || [];
}

export function getStoredSincroniasFlorales(): SincroniaFloral[] {
  return getStoredData().sincroniasFlorales || [];
}

export function getStoredAplicacionesPolen(): AplicacionPolenAsistido[] {
  return getStoredData().aplicacionesPolen || [];
}

export function getStoredPlanesCargaRaleo(): PlanCargaRaleo[] {
  return getStoredData().planesCargaRaleo || [];
}

export function getStoredEvaluacionesCuajaSemillas(): EvaluacionCuajaSemillas[] {
  return getStoredData().evaluacionesCuajaSemillas || [];
}

export function getStoredLiquidacionesPacking(): LiquidacionPacking[] {
  return getStoredData().liquidacionesPacking || [];
}

export function getStoredAnalisisLaboratorio(): AnalisisLaboratorio[] {
  return getStoredData().analisisLaboratorio || [];
}

export function getStoredRegistrosEnvases(): RegistroEnvaseLimpio[] {
  return getStoredData().registrosEnvases || [];
}

export function getStoredCalibracionesEquipo(): CalibracionEquipo[] {
  return getStoredData().calibracionesEquipo || [];
}

export function getStoredAuditoriaManual(): Record<string, boolean> {
  return getStoredData().auditoriaManual || {};
}

export function getStoredPlanillaBpa(): PlanillaAuditoriaBPA {
  return normalizePlanillaBpa(getStoredData().planillaBpa);
}

export function getStoredTareasHuerto(): TareaAgronomica[] {
  return getStoredData().tareasHuerto || [];
}

export function getStoredResumenesTemporada(): ResumenTemporada[] {
  return getStoredData().resumenesTemporada || [];
}

export function resetStorageToDefaults(): AppStateData {
  const demo = getDemoSampleData();
  saveDataToLocalStorage(demo);
  return demo;
}

export function resetStorageToRealOrchard(
  preserveExplotacion?: ExplotacionAgricola,
  preserveUsuarios?: UsuarioPredio[]
): AppStateData {
  saveStoredSectoresRiego([]);
  const blank = getBlankRealOrchardData(preserveExplotacion, preserveUsuarios);
  saveDataToLocalStorage(blank);
  try {
    localStorage.setItem(REAL_ORCHARD_CLEANED_KEY, 'true');
  } catch (e) {}
  return blank;
}

export function exportDataAsJSON(data: AppStateData): void {
  const str = JSON.stringify(data, null, 2);
  const blob = new Blob([str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `cuaderno_campo_huerto_kiwis_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
