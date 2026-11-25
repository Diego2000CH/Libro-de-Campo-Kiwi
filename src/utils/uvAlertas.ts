import {
  ConfigAlertaUv,
  ExplotacionAgricola,
  NivelRiesgoUv,
  NotificacionUv,
  Parcela,
  PushSubscriptionRecord,
} from '../types/campo';

export interface ClasificacionUv {
  nivel: NivelRiesgoUv;
  badgeClass: string;
  cardClass: string;
  textClass: string;
  recomendacion: string;
  requiereEpp: boolean;
}

export interface UbicacionGeorreferenciada {
  lat: number;
  lng: number;
  nombre: string;
  fuente: 'personalizada' | 'clima' | 'explotacion' | 'cuartel' | 'predeterminada';
}

export interface PronosticoUvGeorreferenciado {
  fechaLocal: string;
  horaLocalActual: string;
  zonaHoraria: string;
  uvActual: number;
  uvOchoAm: number;
  uvMaximoDia: number;
  horaPicoUv: string;
  horasRiesgoAlto: string;
  nivelRiesgo: NivelRiesgoUv;
  recomendacion: string;
  hourlyToday: { hora: string; uv: number }[];
}

export const DEFAULT_UV_ALERT_CONFIG: ConfigAlertaUv = {
  habilitada: true,
  horaEnvio: '08:00',
  umbralMinimoUv: 0,
  usarUbicacionClima: true,
  notificarTodosUsuarios: true,
  pushCelularHabilitado: true,
  pushSubscriptions: [],
  historialUv: [],
};

export function clasificarRiesgoUv(uv: number): ClasificacionUv {
  const val = Number.isFinite(uv) ? Math.max(0, uv) : 0;
  if (val >= 11) {
    return {
      nivel: 'Extremo',
      badgeClass: 'bg-purple-100 dark:bg-purple-900/50 text-purple-950 dark:text-purple-100 border border-purple-300 dark:border-purple-700/80',
      cardClass: 'bg-purple-50/70 dark:bg-purple-950/35 border-purple-300 dark:border-purple-700/80',
      textClass: 'text-purple-900 dark:text-purple-200',
      requiereEpp: true,
      recomendacion:
        'Radiación UV Extrema (Ley 20.096): Bloqueador FPS 50+ cada 2 hrs, polera manga larga UV, sombrero legionario con cubre-nuca, lentes filtro UV400 y pausas obligatorias bajo sombra entre 11:00 y 16:00 hrs.',
    };
  }
  if (val >= 8) {
    return {
      nivel: 'Muy Alto',
      badgeClass: 'bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700/80',
      cardClass: 'bg-rose-50/70 dark:bg-rose-950/35 border-rose-300 dark:border-rose-700/80',
      textClass: 'text-rose-800 dark:text-rose-300',
      requiereEpp: true,
      recomendacion:
        'Radiación UV Muy Alta: Uso obligatorio en cuadrillas de FPS 50+, sombrero ala ancha/legionario, ropa manga larga y rehidratación frecuente. Evitar exposición directa prolongada entre 11:30 y 15:30 hrs.',
    };
  }
  if (val >= 6) {
    return {
      nivel: 'Alto',
      badgeClass: 'bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700/80',
      cardClass: 'bg-amber-50/70 dark:bg-amber-950/35 border-amber-300 dark:border-amber-700/80',
      textClass: 'text-amber-800 dark:text-amber-300',
      requiereEpp: true,
      recomendacion:
        'Radiación UV Alta: Aplicar protector solar FPS 30+ / 50+ antes de iniciar faenas, usar gorro legionario y lentes UV en labores de poda verde, raleo o riego.',
    };
  }
  if (val >= 3) {
    return {
      nivel: 'Moderado',
      badgeClass: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700/80',
      cardClass: 'bg-yellow-50/60 dark:bg-yellow-950/35 border-yellow-300 dark:border-yellow-700/80',
      textClass: 'text-yellow-800 dark:text-yellow-300',
      requiereEpp: false,
      recomendacion:
        'Radiación UV Moderada: Se recomienda uso de gorro y protector solar FPS 30+ durante el bloque de mayor sol alrededor del mediodía.',
    };
  }
  return {
    nivel: 'Bajo',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/80',
    cardClass: 'bg-emerald-50/60 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/70',
    textClass: 'text-emerald-800 dark:text-emerald-300',
    requiereEpp: false,
    recomendacion:
      'Radiación UV Baja: Condición segura para labores al aire libre. Mantener hidratación habitual de cuadrillas.',
  };
}

export function resolveOrchardGeoLocation(
  explotacion?: ExplotacionAgricola | null,
  parcelas?: Parcela[] | null,
  uvConfig?: ConfigAlertaUv | null
): UbicacionGeorreferenciada {
  if (
    uvConfig &&
    uvConfig.usarUbicacionClima === false &&
    typeof uvConfig.latitudPersonalizada === 'number' &&
    typeof uvConfig.longitudPersonalizada === 'number' &&
    Number.isFinite(uvConfig.latitudPersonalizada) &&
    Number.isFinite(uvConfig.longitudPersonalizada)
  ) {
    return {
      lat: uvConfig.latitudPersonalizada,
      lng: uvConfig.longitudPersonalizada,
      nombre:
        uvConfig.ubicacionNombre ||
        `Punto Georreferenciado (${uvConfig.latitudPersonalizada.toFixed(4)}°, ${uvConfig.longitudPersonalizada.toFixed(4)}°)`,
      fuente: 'personalizada',
    };
  }

  if (typeof window !== 'undefined') {
    try {
      const savedLat = Number.parseFloat(localStorage.getItem('fundo_clima_lat') || '');
      const savedLng = Number.parseFloat(localStorage.getItem('fundo_clima_lng') || '');
      const savedName = localStorage.getItem('fundo_clima_nombre') || '';
      if (Number.isFinite(savedLat) && Number.isFinite(savedLng) && savedLat !== -34.9828) {
        return {
          lat: savedLat,
          lng: savedLng,
          nombre:
            savedName ||
            explotacion?.nombreFundo ||
            `Predio (${savedLat.toFixed(4)}°, ${savedLng.toFixed(4)}°)`,
          fuente: 'clima',
        };
      }
    } catch {
      // Ignorar si localStorage no está disponible
    }
  }

  if (
    explotacion &&
    typeof explotacion.latitud === 'number' &&
    typeof explotacion.longitud === 'number' &&
    Number.isFinite(explotacion.latitud) &&
    Number.isFinite(explotacion.longitud)
  ) {
    return {
      lat: explotacion.latitud,
      lng: explotacion.longitud,
      nombre: `${explotacion.nombreFundo}${explotacion.comuna ? ` (${explotacion.comuna})` : ''}`,
      fuente: 'explotacion',
    };
  }

  if (Array.isArray(parcelas) && parcelas.length > 0) {
    for (const p of parcelas) {
      if (typeof p.lat === 'number' && typeof p.lng === 'number') {
        return {
          lat: p.lat,
          lng: p.lng,
          nombre: `${p.nombre} (${p.lat.toFixed(4)}°, ${p.lng.toFixed(4)}°)`,
          fuente: 'cuartel',
        };
      }
      if (Array.isArray(p.coordenadasPoligono) && p.coordenadasPoligono.length > 0) {
        const avgLat =
          p.coordenadasPoligono.reduce((acc, c) => acc + c.lat, 0) /
          p.coordenadasPoligono.length;
        const avgLng =
          p.coordenadasPoligono.reduce((acc, c) => acc + c.lng, 0) /
          p.coordenadasPoligono.length;
        return {
          lat: Number(avgLat.toFixed(6)),
          lng: Number(avgLng.toFixed(6)),
          nombre: `${p.nombre} (${avgLat.toFixed(4)}°, ${avgLng.toFixed(4)}°)`,
          fuente: 'cuartel',
        };
      }
    }
  }

  return {
    lat: -39.628593,
    lng: -72.461085,
    nombre: 'Entrada Principal (-39.6286, -72.4611)',
    fuente: 'predeterminada',
  };
}

export function parseUvForecastResponse(data: any): PronosticoUvGeorreferenciado {
  const currentTimeStr: string =
    typeof data?.current?.time === 'string'
      ? data.current.time
      : new Date().toISOString().slice(0, 16);
  const [fechaLocal, horaLocalActual = '08:00'] = currentTimeStr.split('T');
  const zonaHoraria: string = typeof data?.timezone === 'string' ? data.timezone : 'America/Santiago';

  const hourlyTimes: string[] = Array.isArray(data?.hourly?.time) ? data.hourly.time : [];
  const hourlyUv: number[] = Array.isArray(data?.hourly?.uv_index) ? data.hourly.uv_index : [];

  const todayHourly: { hora: string; uv: number }[] = [];
  for (let i = 0; i < hourlyTimes.length; i++) {
    const t = hourlyTimes[i];
    if (typeof t === 'string' && t.startsWith(fechaLocal)) {
      const hhmm = t.split('T')[1]?.slice(0, 5) || '00:00';
      todayHourly.push({
        hora: hhmm,
        uv: Math.round((Number(hourlyUv[i]) || 0) * 10) / 10,
      });
    }
  }

  const ochoAmEntry = todayHourly.find((h) => h.hora.startsWith('08:'));
  const uvActualRaw = Number(data?.current?.uv_index);
  const uvActual = Number.isFinite(uvActualRaw) ? Math.round(uvActualRaw * 10) / 10 : 0;
  const uvOchoAm = ochoAmEntry ? ochoAmEntry.uv : uvActual;

  const dailyMaxRaw = Number(data?.daily?.uv_index_max?.[0]);
  const maxFromHourly =
    todayHourly.length > 0 ? Math.max(...todayHourly.map((h) => h.uv)) : uvActual;
  const uvMaximoDia = Number.isFinite(dailyMaxRaw)
    ? Math.round(Math.max(dailyMaxRaw, maxFromHourly) * 10) / 10
    : Math.round(maxFromHourly * 10) / 10;

  let horaPicoUv = '13:00 hrs';
  if (todayHourly.length > 0) {
    const peakItem = todayHourly.reduce(
      (best, cur) => (cur.uv > best.uv ? cur : best),
      todayHourly[0]
    );
    horaPicoUv = `${peakItem.hora} hrs`;
  }

  const highRiskHours = todayHourly.filter((h) => h.uv >= 6);
  const horasRiesgoAlto =
    highRiskHours.length > 0
      ? `${highRiskHours[0].hora} a ${highRiskHours[highRiskHours.length - 1].hora} hrs`
      : 'Sin horas de riesgo alto hoy';

  const clasif = clasificarRiesgoUv(uvMaximoDia);

  return {
    fechaLocal,
    horaLocalActual: horaLocalActual.slice(0, 5),
    zonaHoraria,
    uvActual,
    uvOchoAm,
    uvMaximoDia,
    horaPicoUv,
    horasRiesgoAlto,
    nivelRiesgo: clasif.nivel,
    recomendacion: clasif.recomendacion,
    hourlyToday: todayHourly,
  };
}

export async function fetchGeoreferencedUvForecast(
  lat: number,
  lng: number
): Promise<PronosticoUvGeorreferenciado> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=uv_index&hourly=uv_index&daily=uv_index_max&forecast_days=2&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Error consultando radiación UV (${res.status})`);
  }
  const data = await res.json();
  return parseUvForecastResponse(data);
}

export function shouldTriggerDailyUvAlert(
  config: ConfigAlertaUv,
  fechaLocal: string,
  horaLocalActual: string,
  uvMaximoDia: number
): boolean {
  if (!config.habilitada) return false;
  if (config.ultimaAlertaFecha === fechaLocal) return false;
  const horaProgramada = config.horaEnvio || '08:00';
  if (horaLocalActual < horaProgramada) return false;
  const umbral = Number(config.umbralMinimoUv) || 0;
  return uvMaximoDia >= umbral;
}

export function buildNotificacionUv(params: {
  forecast: PronosticoUvGeorreferenciado;
  ubicacion: UbicacionGeorreferenciada;
  horaProgramada: string;
  canales: string[];
}): NotificacionUv {
  const { forecast, ubicacion, horaProgramada, canales } = params;
  return {
    id: `uv-${forecast.fechaLocal}-${Date.now()}`,
    fechaLocal: forecast.fechaLocal,
    fechaHoraIso: new Date().toISOString(),
    horaProgramada,
    uvOchoAm: forecast.uvOchoAm,
    uvActual: forecast.uvActual,
    uvMaximoDia: forecast.uvMaximoDia,
    horaPicoUv: forecast.horaPicoUv,
    horasRiesgoAlto: forecast.horasRiesgoAlto,
    nivelRiesgo: forecast.nivelRiesgo,
    ubicacionNombre: ubicacion.nombre,
    latitud: ubicacion.lat,
    longitud: ubicacion.lng,
    zonaHoraria: forecast.zonaHoraria,
    recomendacion: forecast.recomendacion,
    canales,
    leida: false,
  };
}

export async function sendMobileUvNotification(
  notif: NotificacionUv,
  fundoNombre?: string
): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const title = `${fundoNombre ? `[${fundoNombre}] ` : ''}Alerta Radiación UV ${notif.horaProgramada} · Máx ${notif.uvMaximoDia.toFixed(1)} (${notif.nivelRiesgo})`;
  const body = `Ubicación: ${notif.ubicacionNombre} (${notif.latitud.toFixed(4)}°, ${notif.longitud.toFixed(4)}°)\nUV 08:00: ${notif.uvOchoAm.toFixed(1)} · Pico ${notif.uvMaximoDia.toFixed(1)} a las ${notif.horaPicoUv}.\n${notif.recomendacion}`;

  const options: NotificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `uv-diaria-${notif.fechaLocal}`,
    requireInteraction: notif.uvMaximoDia >= 8,
    data: { url: '/' },
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    }
  } catch {
    // Fallback a Notification API directa
  }

  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        // Ignorar
      }
    };
    return true;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeDeviceToWebPush(params: {
  token?: string | null;
  ubicacion: UbicacionGeorreferenciada;
  fundoNombre: string;
  horaEnvio: string;
  umbralMinimoUv: number;
  usuarioId?: string;
}): Promise<{ subscription: PushSubscriptionRecord | null; serverSynced: boolean }> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return { subscription: null, serverSynced: false };
  }

  const keyRes = await fetch('/api/push/vapid-public-key', { cache: 'no-store' });
  if (!keyRes.ok) {
    throw new Error('No se pudo obtener la clave Push del servidor.');
  }
  const { publicKey } = await keyRes.json();
  if (!publicKey) {
    throw new Error('Clave VAPID pública no disponible.');
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('La suscripción Push del navegador resultó incompleta.');
  }

  const deviceLabel =
    typeof navigator !== 'undefined'
      ? /android/i.test(navigator.userAgent)
        ? 'Celular Android'
        : /iphone|ipad/i.test(navigator.userAgent)
        ? 'iPhone / iPad'
        : 'Navegador Escritorio'
      : 'Dispositivo';

  const record: PushSubscriptionRecord = {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    deviceLabel,
    usuarioId: params.usuarioId,
    createdAtIso: new Date().toISOString(),
  };

  let serverSynced = false;
  if (params.token) {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.token}`,
      },
      body: JSON.stringify({
        subscription: record,
        lat: params.ubicacion.lat,
        lng: params.ubicacion.lng,
        ubicacionNombre: params.ubicacion.nombre,
        fundoNombre: params.fundoNombre,
        horaEnvio: params.horaEnvio || '08:00',
        umbralMinimoUv: params.umbralMinimoUv ?? 0,
      }),
    });
    serverSynced = res.ok;
  }

  return { subscription: record, serverSynced };
}

export async function sendServerTestUvPush(params: {
  token: string;
  lat: number;
  lng: number;
  ubicacionNombre: string;
  fundoNombre: string;
}): Promise<{ sentCount: number }> {
  const res = await fetch('/api/push/test-uv', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      lat: params.lat,
      lng: params.lng,
      ubicacionNombre: params.ubicacionNombre,
      fundoNombre: params.fundoNombre,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Error enviando notificación Push de prueba');
  }
  return res.json();
}
