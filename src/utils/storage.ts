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
  MuestreoBrotacion,
  ConteoBotonesFlorales,
  SincroniaFloral,
  AplicacionPolenAsistido,
  PlanCargaRaleo,
  EvaluacionCuajaSemillas
} from '../types/campo';
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
  initialEvaluacionesCuajaSemillas
} from '../data/initialData';
import { loadDataFromLocalStorage, saveDataToLocalStorage } from '../services/cloudSync';

const REAL_ORCHARD_CLEANED_KEY = 'huerto_real_vaciado_v1';

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
  'ecs-01', 'ecs-02'
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
  return {
    fechaCorte: new Date().toISOString().split('T')[0],
    totalAcumuladoHF: 0,
    metaVariedadHF: 850,
    modeloCalculo: 'Weinberger (< 7.2°C)',
    porcentajeCumplimiento: 0,
    estadoDormancia: 'Dormancia profunda',
    recomendacionRompedor: ''
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
    fenologia: [],
    polinizacion: [],
    muestreosBrotacion: [],
    conteosBotones: [],
    sincroniasFlorales: [],
    aplicacionesPolen: [],
    planesCargaRaleo: [],
    evaluacionesCuajaSemillas: [],
    turnosRiego: [],
    clima: initialClimaLaCabana,
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
    horasFrio: isDemoHorasFrio ? getBlankHorasFrio() : (data.horasFrio || getBlankHorasFrio()),
    fenologia: filterOutDemo(data.fenologia),
    polinizacion: filterOutDemo(data.polinizacion),
    muestreosBrotacion: filterOutDemo(data.muestreosBrotacion),
    conteosBotones: filterOutDemo(data.conteosBotones),
    sincroniasFlorales: filterOutDemo(data.sincroniasFlorales),
    aplicacionesPolen: filterOutDemo(data.aplicacionesPolen),
    planesCargaRaleo: filterOutDemo(data.planesCargaRaleo),
    evaluacionesCuajaSemillas: filterOutDemo(data.evaluacionesCuajaSemillas),
    turnosRiego: filterOutDemo(data.turnosRiego)
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
    ultimaActualizacion: new Date().toISOString()
  };
}

export function getStoredData(): AppStateData {
  const stored = loadDataFromLocalStorage();
  if (stored && stored.explotacion) {
    // Asegurar que usuarios tengan contraseñas si provienen de versión anterior
    if (stored.usuarios && stored.usuarios.length) {
      stored.usuarios = stored.usuarios.map((u) => {
        if (!u.password) {
          const match = initialUsuarios.find((initU) => initU.id === u.id || initU.rut === u.rut);
          return {
            ...u,
            password: match ? match.password : '1234'
          };
        }
        return u;
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
      horasFrio: stored.horasFrio || getBlankHorasFrio(),
      fenologia: stored.fenologia || [],
      polinizacion: stored.polinizacion || [],
      muestreosBrotacion: stored.muestreosBrotacion || [],
      conteosBotones: stored.conteosBotones || [],
      sincroniasFlorales: stored.sincroniasFlorales || [],
      aplicacionesPolen: stored.aplicacionesPolen || [],
      planesCargaRaleo: stored.planesCargaRaleo || [],
      evaluacionesCuajaSemillas: stored.evaluacionesCuajaSemillas || [],
      turnosRiego: stored.turnosRiego || []
    };

    // Purga automática de datos ficticios la primera vez (conserva 100% los datos reales del usuario)
    let alreadyCleaned = false;
    try {
      alreadyCleaned = localStorage.getItem(REAL_ORCHARD_CLEANED_KEY) === 'true';
    } catch (e) {}

    if (!alreadyCleaned) {
      const cleaned = stripDemoRecords(normalized);
      saveDataToLocalStorage(cleaned);
      try {
        localStorage.setItem(REAL_ORCHARD_CLEANED_KEY, 'true');
      } catch (e) {}
      return cleaned;
    }

    return normalized;
  }

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
  return getStoredData().horasFrio || getBlankHorasFrio();
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

export function resetStorageToDefaults(): AppStateData {
  const demo = getDemoSampleData();
  saveDataToLocalStorage(demo);
  return demo;
}

export function resetStorageToRealOrchard(
  preserveExplotacion?: ExplotacionAgricola,
  preserveUsuarios?: UsuarioPredio[]
): AppStateData {
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
