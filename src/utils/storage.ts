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
  ResumenTemporada
} from '../types/campo';
import { getNivelAcceso } from './permissions';
import { getTemporadaDefaults, normalizarCondicionHorasFrio } from './agroClimaCalculos';
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
    polinizacion: [],
    muestreosBrotacion: [],
    conteosBotones: [],
    sincroniasFlorales: [],
    aplicacionesPolen: [],
    planesCargaRaleo: [],
    evaluacionesCuajaSemillas: [],
    turnosRiego: [],
    clima: getBlankClima(),
    liquidacionesPacking: [],
    analisisLaboratorio: [],
    registrosEnvases: [],
    calibracionesEquipo: [],
    auditoriaManual: {},
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
    polinizacion: filterOutDemo(data.polinizacion),
    muestreosBrotacion: filterOutDemo(data.muestreosBrotacion),
    conteosBotones: filterOutDemo(data.conteosBotones),
    sincroniasFlorales: filterOutDemo(data.sincroniasFlorales),
    aplicacionesPolen: filterOutDemo(data.aplicacionesPolen),
    planesCargaRaleo: filterOutDemo(data.planesCargaRaleo),
    evaluacionesCuajaSemillas: filterOutDemo(data.evaluacionesCuajaSemillas),
    turnosRiego: filterOutDemo(data.turnosRiego),
    liquidacionesPacking: Array.isArray(data.liquidacionesPacking) ? data.liquidacionesPacking : [],
    analisisLaboratorio: Array.isArray(data.analisisLaboratorio) ? data.analisisLaboratorio : [],
    registrosEnvases: Array.isArray(data.registrosEnvases) ? data.registrosEnvases : [],
    calibracionesEquipo: Array.isArray(data.calibracionesEquipo) ? data.calibracionesEquipo : [],
    auditoriaManual: data.auditoriaManual && typeof data.auditoriaManual === 'object' ? data.auditoriaManual : {},
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
    polinizacion: initialPolinizacion,
    muestreosBrotacion: initialMuestreosBrotacion,
    conteosBotones: initialConteosBotones,
    sincroniasFlorales: initialSincroniasFlorales,
    aplicacionesPolen: initialAplicacionesPolen,
    planesCargaRaleo: initialPlanesCargaRaleo,
    evaluacionesCuajaSemillas: initialEvaluacionesCuajaSemillas,
    turnosRiego: initialTurnosRiego,
    clima: initialClimaLaCabana,
    liquidacionesPacking: [],
    analisisLaboratorio: [],
    registrosEnvases: [],
    calibracionesEquipo: [],
    auditoriaManual: {},
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
      polinizacion: stored.polinizacion || [],
      muestreosBrotacion: stored.muestreosBrotacion || [],
      conteosBotones: stored.conteosBotones || [],
      sincroniasFlorales: stored.sincroniasFlorales || [],
      aplicacionesPolen: stored.aplicacionesPolen || [],
      planesCargaRaleo: stored.planesCargaRaleo || [],
      evaluacionesCuajaSemillas: stored.evaluacionesCuajaSemillas || [],
      turnosRiego: stored.turnosRiego || [],
      liquidacionesPacking: stored.liquidacionesPacking || [],
      analisisLaboratorio: stored.analisisLaboratorio || [],
      registrosEnvases: stored.registrosEnvases || [],
      calibracionesEquipo: stored.calibracionesEquipo || [],
      auditoriaManual: stored.auditoriaManual || {},
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

export function getStoredPolinizacion(): RegistroPolinizacion[] {
  return getStoredData().polinizacion || [];
}

export function getStoredTurnosRiego(): TurnoRiego[] {
  return getStoredData().turnosRiego || [];
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
