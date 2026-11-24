import {
  ClimaCondiciones,
  ConfigControlHeladas,
  MetodoControlHelada,
  NotificacionHelada,
  NotificacionHeladaDestinatario,
  NotificacionesProactivasConfig,
  UsuarioPredio,
} from '../types/campo';
import { getNivelAcceso } from '../utils/permissions';

/**
 * Archivo de configuración central de Control de Heladas y Umbrales Críticos.
 * Define los umbrales térmicos base y la política de notificaciones proactivas
 * hacia el Administrador y todos los usuarios del predio.
 */
export interface HeladasConfigArchivo {
  umbralAlertaPreventivaC: number;
  umbralCriticoC: number;
  umbralApagadoSeguroC: number;
  estadoFenologicoReferencia: string;
  metodoPrincipalPredio: MetodoControlHelada;
  tasaPrecipitacionMmHora: number;
  notificacionesProactivas: NotificacionesProactivasConfig;
}

export const HELADAS_CONFIG: HeladasConfigArchivo = {
  umbralAlertaPreventivaC: 1.5,
  umbralCriticoC: 0.5,
  umbralApagadoSeguroC: 1.5,
  estadoFenologicoReferencia: 'Brotación / Brotes tiernos (BBCH 11-19)',
  metodoPrincipalPredio: 'Aspersión Antihelada Sobre-Copa',
  tasaPrecipitacionMmHora: 3.5,
  notificacionesProactivas: {
    habilitadas: true,
    notificarAdministrador: true,
    notificarTodosUsuarios: true,
    incluirBulboHumedo: true,
    pushNavegadorHabilitado: true,
    cooldownMinutos: 30,
  },
};

export function hasValidSensorReading(clima?: ClimaCondiciones | null): boolean {
  if (!clima) return false;
  if (!clima.direccionViento || clima.direccionViento === 'Sin datos') return false;
  return Number.isFinite(clima.temperaturaActual);
}

// Fórmula psicrométrica de Stull (2011) para temperatura de bulbo húmedo aproximada (°C)
export function calcularBulboHumedoC(tempC: number, hrPct: number): number {
  const rh = Math.max(5, Math.min(100, hrPct));
  const tw =
    tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tempC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;
  return Number(tw.toFixed(1));
}

// Punto de rocío fórmula Magnus (°C)
export function calcularPuntoRocioC(tempC: number, hrPct: number): number {
  const rh = Math.max(5, Math.min(100, hrPct));
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(rh / 100);
  const td = (b * alpha) / (a - alpha);
  return Number(td.toFixed(1));
}

export function resolveUmbralCriticoConfigurado(config?: ConfigControlHeladas | null): number {
  if (config && typeof config.umbralCriticoC === 'number' && Number.isFinite(config.umbralCriticoC)) {
    return config.umbralCriticoC;
  }
  if (config && typeof config.umbralEncendidoC === 'number' && Number.isFinite(config.umbralEncendidoC)) {
    return config.umbralEncendidoC;
  }
  return HELADAS_CONFIG.umbralCriticoC;
}

export interface EvaluacionSensorHelada {
  sensorActivo: boolean;
  bajoUmbralCritico: boolean;
  bajoUmbralAlerta: boolean;
  disparadoPor: 'sensor_aire' | 'bulbo_humedo' | 'ninguno';
  tempSensorC: number;
  tempBulboHumedoC: number;
  umbralCriticoC: number;
  umbralAlertaC: number;
}

export function evaluarRiesgoSensorHelada(
  clima: ClimaCondiciones,
  config: ConfigControlHeladas
): EvaluacionSensorHelada {
  const sensorActivo = hasValidSensorReading(clima);
  const hr = clima.humedadRelativa > 0 ? clima.humedadRelativa : 75;
  const tempSensorC = Number(clima.temperaturaActual ?? 0);
  const tempBulboHumedoC = calcularBulboHumedoC(tempSensorC, hr);
  const umbralCriticoC = resolveUmbralCriticoConfigurado(config);
  const umbralAlertaC =
    typeof config.umbralAlertaC === 'number'
      ? config.umbralAlertaC
      : HELADAS_CONFIG.umbralAlertaPreventivaC;

  const incluirBH =
    config.notificacionesProactivas?.incluirBulboHumedo ??
    HELADAS_CONFIG.notificacionesProactivas.incluirBulboHumedo;

  if (!sensorActivo) {
    return {
      sensorActivo: false,
      bajoUmbralCritico: false,
      bajoUmbralAlerta: false,
      disparadoPor: 'ninguno',
      tempSensorC,
      tempBulboHumedoC,
      umbralCriticoC,
      umbralAlertaC,
    };
  }

  const caeAire = tempSensorC < umbralCriticoC;
  const caeBulbo = incluirBH && tempBulboHumedoC < umbralCriticoC;
  const bajoUmbralCritico = caeAire || caeBulbo;
  const bajoUmbralAlerta = tempSensorC < umbralAlertaC || clima.tempMinima < umbralAlertaC;

  return {
    sensorActivo: true,
    bajoUmbralCritico,
    bajoUmbralAlerta,
    disparadoPor: caeAire ? 'sensor_aire' : caeBulbo ? 'bulbo_humedo' : 'ninguno',
    tempSensorC,
    tempBulboHumedoC,
    umbralCriticoC,
    umbralAlertaC,
  };
}

export function buildDestinatariosNotificacionHelada(
  usuarios: UsuarioPredio[],
  notifCfg: NotificacionesProactivasConfig
): NotificacionHeladaDestinatario[] {
  const destinatarios: NotificacionHeladaDestinatario[] = [];
  const seenIds = new Set<string>();

  // 1. Priorizar explícitamente al/los Administrador(es)
  for (const u of usuarios) {
    const esAdmin = u.rol === 'administrador' || getNivelAcceso(u) === 'admin';
    if (esAdmin && notifCfg.notificarAdministrador && !seenIds.has(u.id)) {
      seenIds.add(u.id);
      destinatarios.push({
        usuarioId: u.id,
        nombre: u.nombre,
        rol: u.rol,
        esAdministrador: true,
        email: u.email,
        telefono: u.telefono,
        estadoEntrega: 'enviada',
      });
    }
  }

  // 2. Incluir a todos los demás usuarios cuando esté habilitado
  if (notifCfg.notificarTodosUsuarios) {
    for (const u of usuarios) {
      if (seenIds.has(u.id)) continue;
      const esAdmin = u.rol === 'administrador' || getNivelAcceso(u) === 'admin';
      seenIds.add(u.id);
      destinatarios.push({
        usuarioId: u.id,
        nombre: u.nombre,
        rol: u.rol,
        esAdministrador: esAdmin,
        email: u.email,
        telefono: u.telefono,
        estadoEntrega: 'enviada',
      });
    }
  }

  return destinatarios;
}

export function shouldDispatchAutoFrostNotification(
  evalSensor: EvaluacionSensorHelada,
  config: ConfigControlHeladas
): boolean {
  const notifCfg = config.notificacionesProactivas || HELADAS_CONFIG.notificacionesProactivas;
  if (!notifCfg.habilitadas) return false;
  if (!evalSensor.sensorActivo || !evalSensor.bajoUmbralCritico) return false;

  const historial = config.historialNotificaciones || [];
  const ultimasCriticas = historial.filter(
    (n) => n.tipo === 'umbral_critico_sensor' || n.tipo === 'umbral_bulbo_humedo'
  );
  if (ultimasCriticas.length === 0) return true;

  const ultima = [...ultimasCriticas].sort((a, b) =>
    b.fechaHoraIso.localeCompare(a.fechaHoraIso)
  )[0];
  const ultimaMs = Date.parse(ultima.fechaHoraIso);
  const cooldownMs = Math.max(1, notifCfg.cooldownMinutos || 30) * 60 * 1000;
  const elapsedMs = Date.now() - ultimaMs;

  // Re-emitir antes del cooldown solo si la temperatura siguió bajando >= 1.0°C respecto al aviso previo
  const caidaSignificativa = evalSensor.tempSensorC <= ultima.tempSensorC - 1.0;
  return !Number.isFinite(ultimaMs) || elapsedMs >= cooldownMs || caidaSignificativa;
}

export function buildNotificacionHelada(params: {
  tipo: NotificacionHelada['tipo'];
  evalSensor: EvaluacionSensorHelada;
  clima: ClimaCondiciones;
  config: ConfigControlHeladas;
  usuarios: UsuarioPredio[];
  emitidoPor: string;
  canales: string[];
}): NotificacionHelada {
  const { tipo, evalSensor, clima, config, usuarios, emitidoPor, canales } = params;
  const notifCfg = config.notificacionesProactivas || HELADAS_CONFIG.notificacionesProactivas;
  const destinatarios = buildDestinatariosNotificacionHelada(usuarios, notifCfg);
  const adminsCount = destinatarios.filter((d) => d.esAdministrador).length;
  const totalCount = destinatarios.length;

  const isBulbo = tipo === 'umbral_bulbo_humedo';
  const isManual = tipo === 'aviso_manual';

  const titulo = isManual
    ? `Aviso Preventivo de Helada (${evalSensor.tempSensorC.toFixed(1)}°C)`
    : isBulbo
    ? `Alerta Crítica Bulbo Húmedo (${evalSensor.tempBulboHumedoC.toFixed(1)}°C < ${evalSensor.umbralCriticoC.toFixed(1)}°C)`
    : `ALERTA CRÍTICA DE HELADA: Sensor ${evalSensor.tempSensorC.toFixed(1)}°C (< ${evalSensor.umbralCriticoC.toFixed(1)}°C)`;

  const mensaje = isManual
    ? `Aviso enviado al Administrador (${adminsCount}) y equipo (${totalCount} usuarios). Sensor actual: ${evalSensor.tempSensorC.toFixed(1)}°C, mínima prevista ${clima.tempMinima.toFixed(1)}°C. Etapa: ${config.estadoFenologicoReferencia}.`
    : `La temperatura detectada (${isBulbo ? `bulbo húmedo ${evalSensor.tempBulboHumedoC.toFixed(1)}°C` : `sensor aire ${evalSensor.tempSensorC.toFixed(1)}°C`}) cayó por debajo del umbral crítico configurado (${evalSensor.umbralCriticoC.toFixed(1)}°C). Activar ${config.metodoPrincipalPredio}. Notificados: Administrador (${adminsCount}) y ${totalCount - adminsCount} usuarios del predio.`;

  return {
    id: `noti-hel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fechaHoraIso: new Date().toISOString(),
    tipo,
    severidad: isManual ? 'advertencia' : 'critica',
    titulo,
    mensaje,
    tempSensorC: evalSensor.tempSensorC,
    tempMinimaPronosticoC: clima.tempMinima,
    tempBulboHumedoC: evalSensor.tempBulboHumedoC,
    umbralCriticoConfiguradoC: evalSensor.umbralCriticoC,
    estadoFenologico: config.estadoFenologicoReferencia,
    emitidoPor,
    canales,
    destinatarios,
  };
}
