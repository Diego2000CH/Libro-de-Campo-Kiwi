import { EstadoFenologicoCatalogo, Parcela, SeguimientoFenologico } from '../types/campo';
import { calcularDiasEntreFechas } from './agroClimaCalculos';

export interface BbchSugerencia {
  code: string;
  nombre: string;
  descripcion: string;
}

export const BBCH_SUGERENCIAS: BbchSugerencia[] = [
  { code: 'BBCH 00', nombre: 'Yema dormida (Receso invernal)', descripcion: 'Dormancia invernal, acumulación de horas frío (<7.2°C), poda y amarre.' },
  { code: 'BBCH 01', nombre: 'Hinchazón de yema', descripcion: 'Inicio de movimiento de savia, yemas hinchadas y algodonosas.' },
  { code: 'BBCH 10', nombre: 'Brotación y primeras hojas', descripcion: 'Apertura de brotes y despliegue de primeras hojas verdes.' },
  { code: 'BBCH 51', nombre: 'Inflorescencias visibles', descripcion: 'Aparición de yemas florales mixtas en brotes fructíferos.' },
  { code: 'BBCH 55', nombre: 'Botones florales desarrollados', descripcion: 'Botones florales visibles listos para conteo y raleo de laterales.' },
  { code: 'BBCH 61', nombre: 'Inicio de floración (10%)', descripcion: 'Primeras flores abiertas (10%), ingreso de colmenas al parrón.' },
  { code: 'BBCH 65', nombre: 'Plena floración (50%-100%)', descripcion: 'Máxima floración simultánea macho/hembra y polinización activa.' },
  { code: 'BBCH 69', nombre: 'Cuaja y caída de pétalos', descripcion: 'Fin de floración, fruto cuajado visible y definición de raleo.' },
  { code: 'BBCH 75', nombre: 'Crecimiento rápido de fruto', descripcion: 'Expansión celular del fruto, ajuste hídrico y raleo correctivo.' },
  { code: 'BBCH 81', nombre: 'Inicio de maduración', descripcion: 'Inicio de acumulación de sólidos solubles (°Brix) y materia seca.' },
  { code: 'BBCH 89', nombre: 'Madurez plena de cosecha (≥6.2° Brix)', descripcion: 'Fruta apta para cosecha según normativa SAG y firmeza objetivo.' },
  { code: 'BBCH 91', nombre: 'Post-cosecha y senescencia foliar', descripcion: 'Fertilización de reservas post-cosecha y sello preventivo Psa.' },
];

export function formatEstadoFenologicoLabel(code?: string, nombre?: string): string {
  const c = (code || '').trim();
  const n = (nombre || '').trim();
  if (c && n) {
    if (n.toLowerCase().startsWith(c.toLowerCase())) return n;
    return `${c} · ${n}`;
  }
  return n || c || 'Etapa personalizada';
}

export function parseEstadoFenologicoTexto(texto: string): { code: string; nombre: string } {
  const clean = (texto || '').trim();
  if (!clean) return { code: 'PERS', nombre: '' };
  const sepIdx = clean.indexOf('·');
  if (sepIdx > 0) {
    return {
      code: clean.slice(0, sepIdx).trim(),
      nombre: clean.slice(sepIdx + 1).trim() || clean.slice(0, sepIdx).trim(),
    };
  }
  const bbchMatch = clean.match(/^(BBCH\s*[0-9A-Za-z.-]+)\s*[-:]?\s*(.*)$/i);
  if (bbchMatch) {
    const code = bbchMatch[1].toUpperCase().replace(/\s+/, ' ');
    const nombre = (bbchMatch[2] || '').trim() || code;
    return { code, nombre };
  }
  return { code: 'PERS', nombre: clean };
}

export function combinarCatalogoFenologico(
  personalizados: EstadoFenologicoCatalogo[] = [],
  fenologia: SeguimientoFenologico[] = [],
  parcelas: Parcela[] = []
): (EstadoFenologicoCatalogo & { esBase?: boolean })[] {
  const result: (EstadoFenologicoCatalogo & { esBase?: boolean })[] = [];
  const seen = new Set<string>();

  const register = (item: EstadoFenologicoCatalogo & { esBase?: boolean }) => {
    const labelKey = formatEstadoFenologicoLabel(item.code, item.nombre).toLowerCase();
    const nameKey = (item.nombre || '').trim().toLowerCase();
    if (!nameKey && !item.code.trim()) return;
    if (seen.has(labelKey) || (nameKey && seen.has(nameKey))) return;
    seen.add(labelKey);
    if (nameKey) seen.add(nameKey);
    result.push(item);
  };

  for (const s of BBCH_SUGERENCIAS) {
    register({
      id: `base-${s.code}`,
      code: s.code,
      nombre: s.nombre,
      descripcion: s.descripcion,
      esBase: true,
    });
  }

  for (const p of personalizados || []) {
    register({
      ...p,
      esBase: false,
    });
  }

  for (const f of fenologia || []) {
    const nombre = (f.nombreEtapa || f.estadoDescripcion || '').trim();
    const code = (f.escalaBBCH || 'PERS').trim();
    if (nombre) {
      register({
        id: `used-fen-${f.id}`,
        code,
        nombre,
        descripcion: f.estadoDescripcion,
        esBase: false,
      });
    }
  }

  for (const p of parcelas || []) {
    const txt = (p.estadoFenologico || '').trim();
    if (txt && txt.toLowerCase() !== 'normal' && txt.toLowerCase() !== 'sin definir') {
      const parsed = parseEstadoFenologicoTexto(txt);
      register({
        id: `used-par-${p.id}`,
        code: parsed.code,
        nombre: parsed.nombre,
        esBase: false,
      });
    }
  }

  return result;
}

export const buildPreformedFenologiaKiwi = (
  parcelaId: string,
  parcelaNombre: string
): SeguimientoFenologico[] => {
  const hoy = new Date();
  const hoyISO = hoy.toISOString().split('T')[0];
  const month = hoy.getMonth() + 1;
  const startYear = month >= 6 ? hoy.getFullYear() : hoy.getFullYear() - 1;
  const endYear = startYear + 1;

  const etapas: {
    code: string;
    nombre: string;
    fecha: string;
    fechaFin: string;
    descripcion: string;
  }[] = [
    {
      code: 'BBCH 00',
      nombre: 'Yema dormida (Receso invernal)',
      fecha: `${startYear}-06-01`,
      fechaFin: `${startYear}-08-15`,
      descripcion: 'Acumulación de horas frío (<7.2°C), poda invernal y amarre de cargadores.',
    },
    {
      code: 'BBCH 01',
      nombre: 'Hinchazón de yema',
      fecha: `${startYear}-08-16`,
      fechaFin: `${startYear}-09-05`,
      descripcion: 'Inicio de movimiento de savia (lloro), hinchazón de yemas y aplicaciones preventivas.',
    },
    {
      code: 'BBCH 10',
      nombre: 'Brotación y primeras hojas',
      fecha: `${startYear}-09-06`,
      fechaFin: `${startYear}-09-25`,
      descripcion: 'Despliegue de primeras hojas y brotes; inicio de registro de Grados Día (>10°C).',
    },
    {
      code: 'BBCH 55',
      nombre: 'Botones florales',
      fecha: `${startYear}-09-26`,
      fechaFin: `${startYear}-10-28`,
      descripcion: 'Aparición de botones florales; conteo de carga inicial y raleo de botones dobles/laterales.',
    },
    {
      code: 'BBCH 61',
      nombre: 'Inicio de floración (10%)',
      fecha: `${startYear}-10-29`,
      fechaFin: `${startYear}-11-10`,
      descripcion: 'Apertura de primeras flores femeninas y machos polinizadores; ingreso de colmenas.',
    },
    {
      code: 'BBCH 65',
      nombre: 'Plena floración',
      fecha: `${startYear}-11-11`,
      fechaFin: `${startYear}-11-22`,
      descripcion: 'Máxima floración simultánea, evaluación de actividad de abejas y polinización asistida.',
    },
    {
      code: 'BBCH 69',
      nombre: 'Cuaja y caída de pétalos',
      fecha: `${startYear}-11-23`,
      fechaFin: `${startYear}-12-10`,
      descripcion: 'Evaluación de porcentaje de cuaja, semillas por fruto y planificación final de raleo.',
    },
    {
      code: 'BBCH 75',
      nombre: 'Crecimiento de fruto',
      fecha: `${startYear}-12-11`,
      fechaFin: `${endYear}-03-15`,
      descripcion: 'División y expansión celular, ajuste de riego por ETo y control de calibre objetivo.',
    },
    {
      code: 'BBCH 89',
      nombre: 'Madurez y cosecha (≥6.2° Brix)',
      fecha: `${endYear}-03-16`,
      fechaFin: `${endYear}-05-10`,
      descripcion: 'Muestreo semanal de °Brix, firmeza y materia seca; cosecha y despacho a packing con QR.',
    },
    {
      code: 'BBCH 91',
      nombre: 'Post-cosecha y receso',
      fecha: `${endYear}-05-11`,
      fechaFin: `${endYear}-06-15`,
      descripcion: 'Fertilización de reservas y aplicación otoñal de cobre para prevención de Psa.',
    },
  ];

  const stamp = Date.now();
  return etapas.map((etapa, idx) => {
    let estadoEtapa: 'programado' | 'en_curso' | 'completado' = 'programado';
    let porcentajeAvance = 0;

    if (hoyISO > etapa.fechaFin) {
      estadoEtapa = 'completado';
      porcentajeAvance = 100;
    } else if (hoyISO >= etapa.fecha && hoyISO <= etapa.fechaFin) {
      estadoEtapa = 'en_curso';
      const totalDias = Math.max(1, calcularDiasEntreFechas(etapa.fecha, etapa.fechaFin));
      const diasTrans = Math.max(1, calcularDiasEntreFechas(etapa.fecha, hoyISO));
      porcentajeAvance = Math.min(95, Math.max(10, Math.round((diasTrans / totalDias) * 100)));
    }

    return {
      id: `fen-tpl-${stamp}-${idx}`,
      fecha: etapa.fecha,
      fechaFin: etapa.fechaFin,
      parcelaId,
      parcelaNombre,
      escalaBBCH: etapa.code,
      nombreEtapa: etapa.nombre,
      estadoDescripcion: etapa.descripcion,
      estadoEtapa,
      porcentajeAvance,
      observaciones: '',
    };
  });
};

export function resolveEstadoEtapa(
  f: SeguimientoFenologico
): 'programado' | 'en_curso' | 'completado' {
  if (f.estadoEtapa) return f.estadoEtapa;
  if ((f.porcentajeAvance ?? 0) >= 100) return 'completado';
  if ((f.porcentajeAvance ?? 0) > 0) return 'en_curso';
  return 'programado';
}

export function obtenerEtapaFenologicaActiva(
  fenologia: SeguimientoFenologico[]
): SeguimientoFenologico | null {
  if (!fenologia || fenologia.length === 0) return null;
  const enCurso = fenologia
    .filter((f) => resolveEstadoEtapa(f) === 'en_curso')
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (enCurso.length > 0) return enCurso[0];

  const completadas = fenologia
    .filter((f) => resolveEstadoEtapa(f) === 'completado')
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (completadas.length > 0) return completadas[0];

  return [...fenologia].sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
}
