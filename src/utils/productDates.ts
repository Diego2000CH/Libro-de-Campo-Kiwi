import { InsumoInventario } from '../types/campo';

const CATEGORIES_NO_EXPIRATION_DEFAULT = new Set([
  'material_riego',
  'insumo_riego',
  'alambre_estructura',
  'polin_madera',
  'malla_cobertor',
  'herramienta_equipo',
  'epp_seguridad',
  'otro',
  'riego',
  'alambre',
  'polin',
  'malla',
  'herramienta',
  'epp',
]);

export function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function isFullDayDate(value?: string): boolean {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()));
}

export function toMonthValue(value?: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : trimmed;
}

export function toDayValue(value?: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  return trimmed;
}

/**
 * Formatea YYYY-MM como MM/AAAA (ej. 03/2024) y YYYY-MM-DD como DD/MM/AAAA.
 */
export function formatProductDateLabel(value?: string, emptyLabel = '—'): string {
  if (!value || !value.trim()) return emptyLabel;
  const trimmed = value.trim();
  const ym = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    return `${ym[2]}/${ym[1]}`;
  }
  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  }
  return trimmed;
}

export function isCategoriaSinVencimientoDefault(cat?: string): boolean {
  if (!cat) return false;
  return CATEGORIES_NO_EXPIRATION_DEFAULT.has(cat);
}

export function isProductoSinVencimiento(
  item?: Partial<InsumoInventario> | null
): boolean {
  if (!item) return true;
  if (item.sinVencimiento === true) return true;
  if (!item.fechaVencimiento || !item.fechaVencimiento.trim()) return true;
  return false;
}

/**
 * Convierte YYYY-MM al último milisegundo del mes correspondiente, y YYYY-MM-DD al final de ese día.
 */
export function parseExpirationEndTimestamp(fecha?: string): number | null {
  if (!fecha || !fecha.trim()) return null;
  const trimmed = fecha.trim();

  const ym = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    if (month < 1 || month > 12) return null;
    // Día 0 del mes siguiente = último día del mes indicado
    return new Date(year, month, 0, 23, 59, 59, 999).getTime();
  }

  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function diasHastaVencimientoProducto(
  item?: Partial<InsumoInventario> | null
): number | null {
  if (!item || isProductoSinVencimiento(item)) return null;
  const endTs = parseExpirationEndTimestamp(item.fechaVencimiento);
  if (endTs === null) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = endTs - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) - 1;
}
