import fs from 'fs';
import os from 'os';
import path from 'path';
import * as webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { orchardSnapshots } from '../db/schema.ts';
import { parseUvForecastResponse } from '../utils/uvAlertas.ts';

interface StoredPushTarget {
  uid: string;
  fundoNombre: string;
  lat: number;
  lng: number;
  ubicacionNombre: string;
  horaEnvio: string;
  umbralMinimoUv: number;
  ultimaAlertaPushFecha?: string;
  subscriptions: Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
    deviceLabel?: string;
    usuarioId?: string;
    createdAtIso?: string;
  }>;
}

const VAPID_FILE = path.join(os.tmpdir(), 'cuaderno-campo-vapid-keys.json');
const memoryTargets = new Map<string, StoredPushTarget>();
const sentTodayByUid = new Map<string, string>();
let vapidConfigured = false;
let publicVapidKeyCache = '';
let schedulerStarted = false;

function ensureVapidKeys(): { publicKey: string; privateKey: string } {
  const envPublic = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const envPrivate = (process.env.VAPID_PRIVATE_KEY || '').trim();
  if (envPublic && envPrivate) {
    if (!vapidConfigured) {
      webpush.setVapidDetails('mailto:alertas@cuadernodecampo.cl', envPublic, envPrivate);
      vapidConfigured = true;
      publicVapidKeyCache = envPublic;
    }
    return { publicKey: envPublic, privateKey: envPrivate };
  }

  try {
    if (fs.existsSync(VAPID_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
      if (parsed?.publicKey && parsed?.privateKey) {
        if (!vapidConfigured) {
          webpush.setVapidDetails(
            'mailto:alertas@cuadernodecampo.cl',
            parsed.publicKey,
            parsed.privateKey
          );
          vapidConfigured = true;
          publicVapidKeyCache = parsed.publicKey;
        }
        return parsed;
      }
    }
  } catch {
    // Regenerar si está corrupto
  }

  const generated = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(generated, null, 2), 'utf-8');
  } catch {
    // Continuar usando memoria si el sistema de archivos es de solo lectura
  }
  webpush.setVapidDetails(
    'mailto:alertas@cuadernodecampo.cl',
    generated.publicKey,
    generated.privateKey
  );
  vapidConfigured = true;
  publicVapidKeyCache = generated.publicKey;
  return generated;
}

export function getPublicVapidKey(): string {
  if (publicVapidKeyCache) return publicVapidKeyCache;
  return ensureVapidKeys().publicKey;
}

export function registerPushSubscriptionInMemory(params: {
  uid: string;
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    deviceLabel?: string;
    usuarioId?: string;
    createdAtIso?: string;
  };
  lat: number;
  lng: number;
  ubicacionNombre: string;
  fundoNombre: string;
  horaEnvio?: string;
  umbralMinimoUv?: number;
}) {
  const existing = memoryTargets.get(params.uid);
  const subs = existing ? [...existing.subscriptions] : [];
  const idx = subs.findIndex((s) => s.endpoint === params.subscription.endpoint);
  if (idx >= 0) {
    subs[idx] = params.subscription;
  } else {
    subs.push(params.subscription);
  }

  memoryTargets.set(params.uid, {
    uid: params.uid,
    fundoNombre: params.fundoNombre || 'Mi Huerto de Kiwis',
    lat: Number.isFinite(params.lat) ? params.lat : -39.628593,
    lng: Number.isFinite(params.lng) ? params.lng : -72.461085,
    ubicacionNombre: params.ubicacionNombre || params.fundoNombre || 'Predio Georreferenciado',
    horaEnvio: params.horaEnvio || '08:00',
    umbralMinimoUv: Number(params.umbralMinimoUv) || 0,
    ultimaAlertaPushFecha: existing?.ultimaAlertaPushFecha,
    subscriptions: subs,
  });
}

export function unregisterPushSubscriptionInMemory(uid: string, endpoint: string) {
  const existing = memoryTargets.get(uid);
  if (!existing) return;
  existing.subscriptions = existing.subscriptions.filter((s) => s.endpoint !== endpoint);
  if (existing.subscriptions.length === 0) {
    memoryTargets.delete(uid);
  } else {
    memoryTargets.set(uid, existing);
  }
}

export function getMemorySubscriptionsForUid(uid: string) {
  return memoryTargets.get(uid)?.subscriptions || [];
}

async function fetchUvForCoordinates(lat: number, lng: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=uv_index&hourly=uv_index&daily=uv_index_max&forecast_days=2&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo HTTP ${res.status}`);
  }
  const data = await res.json();
  return parseUvForecastResponse(data);
}

export async function dispatchUvPushToSubscriptions(params: {
  subscriptions: StoredPushTarget['subscriptions'];
  lat: number;
  lng: number;
  ubicacionNombre: string;
  fundoNombre: string;
  horaProgramada?: string;
  isTest?: boolean;
}): Promise<{ sentCount: number; expiredEndpoints: string[]; uvMaximoDia: number }> {
  ensureVapidKeys();
  const forecast = await fetchUvForCoordinates(params.lat, params.lng);
  const horaLabel = params.horaProgramada || '08:00';
  const prefix = params.isTest ? '[PRUEBA] ' : '';

  const payload = JSON.stringify({
    title: `${prefix}[${params.fundoNombre}] Radiación UV ${horaLabel} · Máx ${forecast.uvMaximoDia.toFixed(1)} (${forecast.nivelRiesgo})`,
    body: `${params.ubicacionNombre} (${params.lat.toFixed(4)}°, ${params.lng.toFixed(4)}°) · UV 08:00: ${forecast.uvOchoAm.toFixed(1)} · Pico ${forecast.uvMaximoDia.toFixed(1)} a las ${forecast.horaPicoUv}. ${forecast.recomendacion}`,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: params.isTest ? `uv-test-${Date.now()}` : `uv-diaria-${forecast.fechaLocal}`,
    requireInteraction: forecast.uvMaximoDia >= 8,
    data: { url: '/', fechaLocal: forecast.fechaLocal },
  });

  let sentCount = 0;
  const expiredEndpoints: string[] = [];

  for (const sub of params.subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        },
        payload
      );
      sentCount += 1;
    } catch (err: any) {
      const statusCode = err?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        expiredEndpoints.push(sub.endpoint);
      } else {
        console.warn('Error enviando Web Push UV:', statusCode || err?.message || err);
      }
    }
  }

  return { sentCount, expiredEndpoints, uvMaximoDia: forecast.uvMaximoDia };
}

async function runDailyUvPushTick() {
  try {
    ensureVapidKeys();
    const targetsByKey = new Map<string, StoredPushTarget>();

    // 1. Cargar targets desde memoria
    for (const [uid, t] of memoryTargets.entries()) {
      if (t.subscriptions.length > 0) {
        targetsByKey.set(uid, t);
      }
    }

    // 2. Cargar targets persistidos en Cloud SQL (orchardSnapshots)
    let sqlSnapshotIds = new Map<string, { id: number; stateJson: Record<string, unknown> }>();
    try {
      const rows = await db.select().from(orchardSnapshots);
      for (const row of rows) {
        const stateJson = (row.stateJson || {}) as Record<string, any>;
        const uvCfg = stateJson.alertaUvConfig;
        if (!uvCfg || uvCfg.habilitada === false || uvCfg.pushCelularHabilitado === false) {
          continue;
        }
        const subs = Array.isArray(uvCfg.pushSubscriptions) ? uvCfg.pushSubscriptions : [];
        if (subs.length === 0) continue;

        const key = `sql_${row.userId}`;
        sqlSnapshotIds.set(key, { id: row.id, stateJson });

        const lat =
          uvCfg.usarUbicacionClima === false && typeof uvCfg.latitudPersonalizada === 'number'
            ? uvCfg.latitudPersonalizada
            : typeof row.latitud === 'number'
            ? row.latitud
            : -39.628593;
        const lng =
          uvCfg.usarUbicacionClima === false && typeof uvCfg.longitudPersonalizada === 'number'
            ? uvCfg.longitudPersonalizada
            : typeof row.longitud === 'number'
            ? row.longitud
            : -72.461085;

        targetsByKey.set(key, {
          uid: key,
          fundoNombre: row.nombreFundo || 'Mi Huerto de Kiwis',
          lat,
          lng,
          ubicacionNombre: uvCfg.ubicacionNombre || row.nombreFundo || 'Predio Georreferenciado',
          horaEnvio: typeof uvCfg.horaEnvio === 'string' && uvCfg.horaEnvio ? uvCfg.horaEnvio : '08:00',
          umbralMinimoUv: Number(uvCfg.umbralMinimoUv) || 0,
          ultimaAlertaPushFecha: uvCfg.ultimaAlertaPushFecha || uvCfg.ultimaAlertaFecha,
          subscriptions: subs,
        });
      }
    } catch {
      // Si Cloud SQL no está configurado localmente, continuar con targets en memoria
    }

    for (const [key, target] of targetsByKey.entries()) {
      try {
        const forecast = await fetchUvForCoordinates(target.lat, target.lng);
        const alreadySentDate =
          sentTodayByUid.get(key) || target.ultimaAlertaPushFecha || '';

        if (alreadySentDate === forecast.fechaLocal) continue;
        if (forecast.horaLocalActual < target.horaEnvio) continue;
        if (forecast.uvMaximoDia < target.umbralMinimoUv) continue;

        const { sentCount, expiredEndpoints } = await dispatchUvPushToSubscriptions({
          subscriptions: target.subscriptions,
          lat: target.lat,
          lng: target.lng,
          ubicacionNombre: target.ubicacionNombre,
          fundoNombre: target.fundoNombre,
          horaProgramada: target.horaEnvio,
          isTest: false,
        });

        if (sentCount > 0) {
          sentTodayByUid.set(key, forecast.fechaLocal);
          target.ultimaAlertaPushFecha = forecast.fechaLocal;
        }

        // Limpiar endpoints expirados y registrar fecha en Cloud SQL si aplica
        const sqlMeta = sqlSnapshotIds.get(key);
        if (sqlMeta && (sentCount > 0 || expiredEndpoints.length > 0)) {
          const expiredSet = new Set(expiredEndpoints);
          const curUvCfg = (sqlMeta.stateJson.alertaUvConfig || {}) as Record<string, any>;
          const remainingSubs = (Array.isArray(curUvCfg.pushSubscriptions) ? curUvCfg.pushSubscriptions : []).filter(
            (s: any) => !expiredSet.has(s.endpoint)
          );
          const nextState = {
            ...sqlMeta.stateJson,
            alertaUvConfig: {
              ...curUvCfg,
              ultimaAlertaPushFecha:
                sentCount > 0 ? forecast.fechaLocal : curUvCfg.ultimaAlertaPushFecha,
              pushSubscriptions: remainingSubs,
            },
          };
          await db
            .update(orchardSnapshots)
            .set({ stateJson: nextState, updatedAt: new Date() })
            .where(eq(orchardSnapshots.id, sqlMeta.id))
            .catch(() => {});
        }
      } catch (innerErr) {
        console.warn(`Error verificando alerta UV diaria para ${key}:`, innerErr);
      }
    }
  } catch (err) {
    console.warn('Error en tick de notificaciones Push UV:', err);
  }
}

export function startDailyUvPushScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  ensureVapidKeys();
  // Revisión inicial diferida 10s y luego cada 60 segundos
  setTimeout(() => {
    void runDailyUvPushTick();
  }, 10000);
  setInterval(() => {
    void runDailyUvPushTick();
  }, 60 * 1000);
}
