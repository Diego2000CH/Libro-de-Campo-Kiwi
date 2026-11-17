import { CondicionHorasFrio, RegistroTermicoHuerto } from '../types/campo';

export interface EtapaFenologicaKiwiGDD {
  id: string;
  nombre: string;
  bbch: string;
  gddMin: number;
  gddMax: number;
  descripcion: string;
  colorHex: string;
}

export const ETAPAS_GDD_KIWI: EtapaFenologicaKiwiGDD[] = [
  {
    id: 'dormancia',
    nombre: 'Receso Invernal / Acumulación de Frío',
    bbch: 'BBCH 00',
    gddMin: 0,
    gddMax: 150,
    descripcion: 'Acumulación de Horas Frío (<7.2°C) entre mayo y agosto; evaluación de rompedores de dormancia.',
    colorHex: '#3b82f6',
  },
  {
    id: 'brotacion',
    nombre: 'Yema Hinchada & Brotación',
    bbch: 'BBCH 01–15',
    gddMin: 150,
    gddMax: 300,
    descripcion: 'Apertura de yemas y despliegue de primeras hojas; alta sensibilidad a heladas primaverales.',
    colorHex: '#10b981',
  },
  {
    id: 'botones',
    nombre: 'Desarrollo de Brotes & Botón Floral',
    bbch: 'BBCH 51–57',
    gddMin: 300,
    gddMax: 520,
    descripcion: 'Elongación de brotes frutales, diferenciación y raleo temprano de botones laterales/mariposas.',
    colorHex: '#14b8a6',
  },
  {
    id: 'floracion',
    nombre: 'Floración & Polinización Cruzada',
    bbch: 'BBCH 61–69',
    gddMin: 520,
    gddMax: 740,
    descripcion: 'Apertura floral Hayward + machos Tomuri/Chieftain; ingreso de colmenas y aplicación de polen.',
    colorHex: '#f59e0b',
  },
  {
    id: 'cuaja',
    nombre: 'Cuaja & División Celular del Fruto',
    bbch: 'BBCH 71–73',
    gddMin: 740,
    gddMax: 1050,
    descripcion: 'Crecimiento celular rápido (primeras 6 semanas post-flor); alta demanda de calcio, agua y raleo.',
    colorHex: '#8b5cf6',
  },
  {
    id: 'llenado',
    nombre: 'Expansión de Fruto & Llenado',
    bbch: 'BBCH 75–81',
    gddMin: 1050,
    gddMax: 1650,
    descripcion: 'Expansión volumétrica del kiwi, manejo de canopia/poda en verde y ajuste hídrico ETo.',
    colorHex: '#0ea5e9',
  },
  {
    id: 'madurez',
    nombre: 'Maduración & Cosecha (≥ 6.2° Brix)',
    bbch: 'BBCH 85–89',
    gddMin: 1650,
    gddMax: 2200,
    descripcion: 'Acumulación de materia seca (>15.5%) y sólidos solubles para autorización de cosecha SAG.',
    colorHex: '#059669',
  },
];

export function getTemporadaDefaults(refDate?: string): {
  fechaInicioHF: string;
  fechaFinHF: string;
  fechaInicioGD: string;
  fechaFinGD: string;
  tempBaseGddC: number;
  tempTechoGddC: number;
  metaVariedadHF: number;
  metaVariedadGD: number;
} {
  const baseDate = refDate ? new Date(`${refDate}T12:00:00`) : new Date();
  const year = Number.isNaN(baseDate.getTime()) ? new Date().getFullYear() : baseDate.getFullYear();
  const month = Number.isNaN(baseDate.getTime()) ? new Date().getMonth() + 1 : baseDate.getMonth() + 1;

  // En Chile (hemisferio sur), la temporada agrícola comienza en mayo/julio del año N y cosecha en marzo/abril del año N+1
  const seasonStartYear = month <= 4 ? year - 1 : year;

  return {
    fechaInicioHF: `${seasonStartYear}-05-22`,
    fechaFinHF: `${seasonStartYear}-08-31`,
    fechaInicioGD: `${seasonStartYear}-07-01`,
    fechaFinGD: `${seasonStartYear + 1}-04-30`,
    tempBaseGddC: 10,
    tempTechoGddC: 30,
    metaVariedadHF: 850,
    metaVariedadGD: 1850,
  };
}

export function calcularDiasEntreFechas(fechaInicio: string, fechaFin: string): number {
  if (!fechaInicio || !fechaFin) return 1;
  const start = new Date(`${fechaInicio}T12:00:00`).getTime();
  const end = new Date(`${fechaFin}T12:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  const diffDays = Math.round((end - start) / 86400000) + 1;
  return Math.max(1, diffDays);
}

/**
 * Calcula Grados Día acumulados para un período usando temperatura media diaria acotada:
 * TmaxEfectiva = min(tempMaxC, tempTechoC)
 * TminEfectiva = max(tempMinC, tempBaseC) si está por debajo de base para método modificado,
 * o promedio clásico (Tmin + min(Tmax, Ttecho)) / 2 - Tbase, truncado en >= 0.
 */
export function calcularGradosDiaPeriodo(
  tempMinC: number,
  tempMaxC: number,
  tempBaseC = 10,
  tempTechoC = 30,
  dias = 1
): number {
  const safeMin = Number.isFinite(tempMinC) ? tempMinC : 0;
  const safeMax = Number.isFinite(tempMaxC) ? Math.max(safeMin, tempMaxC) : safeMin;
  const cappedMax = Math.min(safeMax, tempTechoC);
  const tMedia = (safeMin + cappedMax) / 2;
  const gddDiario = Math.max(0, tMedia - tempBaseC);
  return Number((gddDiario * Math.max(1, dias)).toFixed(1));
}

export function estaEnVentana(
  fechaInicioReg: string,
  fechaFinReg: string,
  ventanaInicio?: string,
  ventanaFin?: string
): boolean {
  if (!ventanaInicio || !ventanaFin) return true;
  const regIni = fechaInicioReg || fechaFinReg;
  const regFin = fechaFinReg || fechaInicioReg;
  if (!regIni || !regFin) return true;
  return regFin >= ventanaInicio && regIni <= ventanaFin;
}

export function sumarRegistrosTermicos(
  registros: RegistroTermicoHuerto[],
  condicion: Partial<CondicionHorasFrio>
): {
  totalHFVentana: number;
  totalGDVentana: number;
  totalHFTodos: number;
  totalGDTodos: number;
  registrosEnVentanaHF: number;
  registrosEnVentanaGD: number;
} {
  const defaults = getTemporadaDefaults(condicion.fechaCorte);
  const iniHF = condicion.fechaInicioHF || defaults.fechaInicioHF;
  const finHF = condicion.fechaFinHF || defaults.fechaFinHF;
  const iniGD = condicion.fechaInicioGD || defaults.fechaInicioGD;
  const finGD = condicion.fechaFinGD || defaults.fechaFinGD;

  let totalHFVentana = 0;
  let totalGDVentana = 0;
  let totalHFTodos = 0;
  let totalGDTodos = 0;
  let registrosEnVentanaHF = 0;
  let registrosEnVentanaGD = 0;

  for (const r of registros) {
    const hf = Number(r.horasFrioPeriodo) || 0;
    const gd = Number(r.gradosDiaPeriodo) || 0;
    totalHFTodos += hf;
    totalGDTodos += gd;

    if (estaEnVentana(r.fechaInicio, r.fechaFin, iniHF, finHF)) {
      totalHFVentana += hf;
      registrosEnVentanaHF += 1;
    }
    if (estaEnVentana(r.fechaInicio, r.fechaFin, iniGD, finGD)) {
      totalGDVentana += gd;
      registrosEnVentanaGD += 1;
    }
  }

  return {
    totalHFVentana: Number(totalHFVentana.toFixed(1)),
    totalGDVentana: Number(totalGDVentana.toFixed(1)),
    totalHFTodos: Number(totalHFTodos.toFixed(1)),
    totalGDTodos: Number(totalGDTodos.toFixed(1)),
    registrosEnVentanaHF,
    registrosEnVentanaGD,
  };
}

export function normalizarCondicionHorasFrio(
  hf?: CondicionHorasFrio,
  registrosTermicos: RegistroTermicoHuerto[] = []
): CondicionHorasFrio {
  const defaults = getTemporadaDefaults(hf?.fechaCorte);
  const sumas = sumarRegistrosTermicos(registrosTermicos, {
    ...hf,
    fechaInicioHF: hf?.fechaInicioHF || defaults.fechaInicioHF,
    fechaFinHF: hf?.fechaFinHF || defaults.fechaFinHF,
    fechaInicioGD: hf?.fechaInicioGD || defaults.fechaInicioGD,
    fechaFinGD: hf?.fechaFinGD || defaults.fechaFinGD,
  });

  const usarRegistros = hf?.sincronizarDesdeRegistros === true && registrosTermicos.length > 0;
  const totalHF = usarRegistros
    ? sumas.totalHFVentana
    : hf?.totalAcumuladoHF ?? (registrosTermicos.length > 0 ? sumas.totalHFVentana : 0);
  const totalGD = usarRegistros
    ? sumas.totalGDVentana
    : hf?.totalAcumuladoGD ?? (registrosTermicos.length > 0 ? sumas.totalGDVentana : 0);

  const metaHF = hf?.metaVariedadHF && hf.metaVariedadHF > 0 ? hf.metaVariedadHF : defaults.metaVariedadHF;
  const metaGD = hf?.metaVariedadGD && hf.metaVariedadGD > 0 ? hf.metaVariedadGD : defaults.metaVariedadGD;
  const pctHF = Number(((totalHF / metaHF) * 100).toFixed(1));

  return {
    fechaCorte: hf?.fechaCorte || new Date().toISOString().split('T')[0],
    totalAcumuladoHF: totalHF,
    metaVariedadHF: metaHF,
    modeloCalculo: hf?.modeloCalculo || 'Weinberger (< 7.2°C)',
    porcentajeCumplimiento: pctHF,
    estadoDormancia:
      hf?.estadoDormancia ||
      (totalGD >= 150
        ? 'Yema hinchada'
        : pctHF >= 85
        ? 'Salida de receso'
        : pctHF >= 50
        ? 'Transición'
        : 'Dormancia profunda'),
    recomendacionRompedor:
      hf?.recomendacionRompedor ||
      'Evaluar acumulación de Horas Frío (<7.2°C) entre 22 de mayo y 31 de agosto para decidir aplicación de rompedores de dormancia.',
    fechaInicioHF: hf?.fechaInicioHF || defaults.fechaInicioHF,
    fechaFinHF: hf?.fechaFinHF || defaults.fechaFinHF,
    fechaInicioGD: hf?.fechaInicioGD || defaults.fechaInicioGD,
    fechaFinGD: hf?.fechaFinGD || defaults.fechaFinGD,
    tempBaseGddC: hf?.tempBaseGddC ?? defaults.tempBaseGddC,
    tempTechoGddC: hf?.tempTechoGddC ?? defaults.tempTechoGddC,
    totalAcumuladoGD: totalGD,
    metaVariedadGD: metaGD,
    sincronizarDesdeRegistros: hf?.sincronizarDesdeRegistros ?? false,
  };
}

export function estimarEtapaKiwiPorFrioYGradosDia(
  hfAcum: number,
  hfMeta: number,
  gdAcum: number,
  gdMeta: number
): {
  etapaActual: EtapaFenologicaKiwiGDD;
  siguienteEtapa: EtapaFenologicaKiwiGDD | null;
  gdFaltantesSiguiente: number;
  cumplimientoHFPct: number;
  cumplimientoGDPct: number;
  diagnosticoIntegrado: string;
} {
  const safeMetaHF = Math.max(1, hfMeta || 850);
  const safeMetaGD = Math.max(1, gdMeta || 1850);
  const cumplimientoHFPct = Number(Math.min(100, (hfAcum / safeMetaHF) * 100).toFixed(1));
  const cumplimientoGDPct = Number(Math.min(100, (gdAcum / safeMetaGD) * 100).toFixed(1));

  let idx = ETAPAS_GDD_KIWI.findIndex((e) => gdAcum >= e.gddMin && gdAcum < e.gddMax);
  if (idx === -1) {
    idx = gdAcum >= ETAPAS_GDD_KIWI[ETAPAS_GDD_KIWI.length - 1].gddMax ? ETAPAS_GDD_KIWI.length - 1 : 0;
  }

  const etapaActual = ETAPAS_GDD_KIWI[idx];
  const siguienteEtapa = idx < ETAPAS_GDD_KIWI.length - 1 ? ETAPAS_GDD_KIWI[idx + 1] : null;
  const gdFaltantesSiguiente = siguienteEtapa ? Math.max(0, Number((siguienteEtapa.gddMin - gdAcum).toFixed(1))) : 0;

  let diagnosticoIntegrado = '';
  if (gdAcum < 150) {
    if (hfAcum >= safeMetaHF) {
      diagnosticoIntegrado = `Frío invernal cumplido (${hfAcum}/${safeMetaHF} HF). El huerto está listo para brotación homogénea apenas se acumulen >150 °D desde julio.`;
    } else if (hfAcum >= safeMetaHF * 0.75) {
      diagnosticoIntegrado = `En salida de receso (${hfAcum}/${safeMetaHF} HF). Evaluar rompedor de dormancia (Erger/Cianamida) según ventana de 30-40 días pre-brotación.`;
    } else {
      diagnosticoIntegrado = `Acumulando frío invernal (${hfAcum}/${safeMetaHF} HF). Mantener seguimiento hasta el 31 de agosto para definir estrategia de brotación.`;
    }
  } else if (gdAcum < 520) {
    const calidadBrotacion =
      hfAcum >= safeMetaHF * 0.9
        ? 'brotación uniforme esperada por buen frío invernal'
        : 'posible brotación escalonada por déficit parcial de frío (<90% meta HF)';
    diagnosticoIntegrado = `Fase vegetativa activa (${gdAcum} °D, ${etapaActual.bbch}): ${calidadBrotacion}. Faltan ${gdFaltantesSiguiente} °D para inicio de floración (~520 °D).`;
  } else if (gdAcum < 740) {
    diagnosticoIntegrado = `Ventana crítica de floración y polinización (${gdAcum} °D, ${etapaActual.bbch}). Asegurar sincronía macho/hembra y cobertura de colmenas (8-10 Apis + Bombus/ha).`;
  } else if (gdAcum < 1050) {
    diagnosticoIntegrado = `Etapa de cuaja y división celular (${gdAcum} °D, ${etapaActual.bbch}). Priorizar calcio soluble, raleo temprano de laterales y control hídrico ETo.`;
  } else if (gdAcum < 1650) {
    diagnosticoIntegrado = `Llenado y expansión de fruto (${gdAcum} °D, ${etapaActual.bbch}). Faltan ${gdFaltantesSiguiente} °D para alcanzar umbral de maduración (~1.650 °D).`;
  } else {
    diagnosticoIntegrado = `Madurez fisiológica de cosecha (${gdAcum} °D, ${etapaActual.bbch}). Verificar muestreos semanales de refractometría (≥ 6.2° Brix SAG) y materia seca.`;
  }

  return {
    etapaActual,
    siguienteEtapa,
    gdFaltantesSiguiente,
    cumplimientoHFPct,
    cumplimientoGDPct,
    diagnosticoIntegrado,
  };
}
