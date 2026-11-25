import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { type AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  getOrchardSnapshotByUid,
  getSqlSummaryByUid,
  saveOrchardSnapshotByUid,
} from './src/db/orchardRepo.ts';
import {
  dispatchUvPushToSubscriptions,
  getMemorySubscriptionsForUid,
  getPublicVapidKey,
  registerPushSubscriptionInMemory,
  startDailyUvPushScheduler,
  unregisterPushSubscriptionInMemory,
} from './src/lib/pushServer.ts';
import {
  fetchFromConfiguredCloudStation,
  getLatestStationReading,
  getWeatherStationServerCapabilities,
  isValidStationCode,
  normalizeIncomingWeatherPayload,
  type StationReadingRecord,
} from './src/lib/weatherStationServer.ts';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: false, limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/maps-client-config', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const apiKey = (
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_KEY ||
      process.env.MAPS_API_KEY ||
      ''
    ).trim();
    res.json({ apiKey, configured: Boolean(apiKey) });
  });

  // Cloud SQL: Cargar estado del huerto autenticado con Firebase Auth
  app.get('/api/orchard/state', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'usuario@huerto.cl';
      const displayName = typeof req.user!.name === 'string' ? req.user!.name : undefined;

      const snapshot = await getOrchardSnapshotByUid(uid, email, displayName);
      const summary = await getSqlSummaryByUid(uid);

      res.json({
        snapshot: snapshot ? snapshot.stateJson : null,
        updatedAt: snapshot ? snapshot.updatedAt : null,
        summary,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch orchard state';
      console.error('Failed to fetch orchard state from Cloud SQL:', error);
      res.status(500).json({ error: message });
    }
  });

  // Cloud SQL: Guardar estado del huerto y sincronizar tablas relacionales
  app.put('/api/orchard/state', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'usuario@huerto.cl';
      const displayName = typeof req.user!.name === 'string' ? req.user!.name : undefined;
      const stateData = req.body?.stateData;

      if (!stateData || typeof stateData !== 'object') {
        return res.status(400).json({ error: 'Invalid stateData payload' });
      }

      const saved = await saveOrchardSnapshotByUid(
        uid,
        email,
        displayName,
        stateData as Record<string, unknown>
      );
      const summary = await getSqlSummaryByUid(uid);

      res.json({
        ok: true,
        updatedAt: saved.updatedAt,
        summary,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save orchard state';
      console.error('Failed to save orchard state to Cloud SQL:', error);
      res.status(500).json({ error: message });
    }
  });

  // Web Push VAPID public key para suscripción móvil
  app.get('/api/push/vapid-public-key', (_req, res) => {
    try {
      const publicKey = getPublicVapidKey();
      res.setHeader('Cache-Control', 'no-store');
      res.json({ publicKey });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to read VAPID key';
      res.status(500).json({ error: message });
    }
  });

  // Suscribir dispositivo móvil / navegador a alertas UV diarias 08:00 AM
  app.post('/api/push/subscribe', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'usuario@huerto.cl';
      const displayName = typeof req.user!.name === 'string' ? req.user!.name : undefined;
      const { subscription, lat, lng, ubicacionNombre, fundoNombre, horaEnvio, umbralMinimoUv } =
        req.body || {};

      if (
        !subscription ||
        typeof subscription.endpoint !== 'string' ||
        !subscription.keys?.p256dh ||
        !subscription.keys?.auth
      ) {
        return res.status(400).json({ error: 'Invalid push subscription payload' });
      }

      registerPushSubscriptionInMemory({
        uid,
        subscription,
        lat: Number(lat),
        lng: Number(lng),
        ubicacionNombre: String(ubicacionNombre || 'Predio Georreferenciado'),
        fundoNombre: String(fundoNombre || 'Mi Huerto de Kiwis'),
        horaEnvio: typeof horaEnvio === 'string' ? horaEnvio : '08:00',
        umbralMinimoUv: Number(umbralMinimoUv) || 0,
      });

      // Persistir también dentro del snapshot en Cloud SQL si existe
      try {
        const snapshot = await getOrchardSnapshotByUid(uid, email, displayName);
        if (snapshot?.stateJson) {
          const stateJson = snapshot.stateJson as Record<string, any>;
          const prevCfg = stateJson.alertaUvConfig || {};
          const prevSubs = Array.isArray(prevCfg.pushSubscriptions)
            ? prevCfg.pushSubscriptions
            : [];
          const nextSubs = [
            ...prevSubs.filter((s: any) => s.endpoint !== subscription.endpoint),
            subscription,
          ].slice(-10);

          await saveOrchardSnapshotByUid(uid, email, displayName, {
            ...stateJson,
            alertaUvConfig: {
              ...prevCfg,
              habilitada: prevCfg.habilitada !== false,
              horaEnvio: typeof horaEnvio === 'string' ? horaEnvio : prevCfg.horaEnvio || '08:00',
              pushCelularHabilitado: true,
              pushSubscriptions: nextSubs,
            },
          });
        }
      } catch (sqlErr) {
        console.warn('Persistencia SQL de suscripción Push diferida:', sqlErr);
      }

      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to subscribe push';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/push/unsubscribe', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const endpoint = req.body?.endpoint;
      if (typeof endpoint === 'string' && endpoint) {
        unregisterPushSubscriptionInMemory(uid, endpoint);
      }
      res.json({ ok: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to unsubscribe push';
      res.status(500).json({ error: message });
    }
  });

  // Enviar notificación Push UV de prueba inmediata al celular
  app.post('/api/push/test-uv', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'usuario@huerto.cl';
      const displayName = typeof req.user!.name === 'string' ? req.user!.name : undefined;
      const { lat, lng, ubicacionNombre, fundoNombre } = req.body || {};

      let subs = getMemorySubscriptionsForUid(uid);
      if (subs.length === 0) {
        try {
          const snapshot = await getOrchardSnapshotByUid(uid, email, displayName);
          const uvCfg = (snapshot?.stateJson as any)?.alertaUvConfig;
          if (Array.isArray(uvCfg?.pushSubscriptions)) {
            subs = uvCfg.pushSubscriptions;
          }
        } catch {
          // Ignorar si SQL no disponible
        }
      }

      if (subs.length === 0) {
        return res.json({ sentCount: 0, message: 'No hay dispositivos Push suscritos aún.' });
      }

      const result = await dispatchUvPushToSubscriptions({
        subscriptions: subs,
        lat: Number.isFinite(Number(lat)) ? Number(lat) : -39.628593,
        lng: Number.isFinite(Number(lng)) ? Number(lng) : -72.461085,
        ubicacionNombre: String(ubicacionNombre || 'Predio Georreferenciado'),
        fundoNombre: String(fundoNombre || 'Mi Huerto de Kiwis'),
        horaProgramada: '08:00',
        isTest: true,
      });

      res.json({ ok: true, sentCount: result.sentCount, uvMaximoDia: result.uvMaximoDia });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send test UV push';
      res.status(500).json({ error: message });
    }
  });

  // ==================== ESTACIÓN METEOROLÓGICA LOCAL (DAVIS / ECOWITT / WEBHOOK IOT) ====================

  const verifyIngestSecretIfConfigured = (req: express.Request): boolean => {
    const expected = (process.env.WEATHER_STATION_INGEST_SECRET || '').trim();
    if (!expected) return true;
    const provided = String(
      req.headers['x-station-secret'] || req.query.secret || req.body?.secret || ''
    ).trim();
    if (!provided) return false;
    const bufA = Buffer.from(expected);
    const bufB = Buffer.from(provided);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  };

  app.all('/api/weather-station/ingest/:stationCode', (req, res) => {
    try {
      const { stationCode } = req.params;
      if (!isValidStationCode(stationCode)) {
        return res.status(400).json({ error: 'Código de estación inválido (usa 3-48 caracteres alfanuméricos o guiones).' });
      }
      if (!verifyIngestSecretIfConfigured(req)) {
        return res.status(401).json({ error: 'Secreto de ingesta inválido.' });
      }
      const payload: Record<string, unknown> = {
        ...(req.query as Record<string, unknown>),
        ...(req.body && typeof req.body === 'object' ? req.body : {}),
      };
      const record = normalizeIncomingWeatherPayload({
        stationCode: stationCode.trim(),
        payload,
      });
      res.json({ ok: true, reading: record });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error procesando trama de estación';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/weather-station/latest/:stationCode', async (req, res) => {
    try {
      const { stationCode } = req.params;
      if (!isValidStationCode(stationCode)) {
        return res.status(400).json({ error: 'Código de estación inválido.' });
      }
      res.setHeader('Cache-Control', 'no-store');
      const capabilities = getWeatherStationServerCapabilities();
      const reading = getLatestStationReading(stationCode.trim());
      res.json({ ok: true, reading, capabilities });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error consultando lectura de estación';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/weather-station/sync', async (req, res) => {
    try {
      const { stationCode, provider, stationName } = req.body || {};
      if (!isValidStationCode(stationCode)) {
        return res.status(400).json({ error: 'Código de estación inválido.' });
      }
      const cleanCode = stationCode.trim();
      const capabilities = getWeatherStationServerCapabilities();
      const validProvider: StationReadingRecord['provider'] | undefined =
        provider === 'dropcontrol_wiseconn' ||
        provider === 'davis_weatherlink' ||
        provider === 'ecowitt_cloud' ||
        provider === 'ecowitt_push' ||
        provider === 'iot_webhook'
          ? provider
          : undefined;

      const cloudReading = await fetchFromConfiguredCloudStation(
        cleanCode,
        validProvider,
        typeof stationName === 'string' ? stationName.trim() : undefined
      );

      if (cloudReading) {
        return res.json({ ok: true, source: 'cloud_api', reading: cloudReading, capabilities });
      }

      const cached = getLatestStationReading(cleanCode);
      if (cached) {
        return res.json({ ok: true, source: 'webhook_cache', reading: cached, capabilities });
      }

      return res.json({
        ok: true,
        source: 'none',
        reading: null,
        capabilities,
        message:
          'Aún no se han recibido tramas HTTP Push ni se encontró WISECONN_API_KEY / credenciales Cloud configuradas en el servidor.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error sincronizando estación meteorológica';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/weather-station/test-ingest/:stationCode', (req, res) => {
    try {
      const { stationCode } = req.params;
      if (!isValidStationCode(stationCode)) {
        return res.status(400).json({ error: 'Código de estación inválido.' });
      }
      const { provider, stationName, baseTempC, baseHumidity, baseWindKmH } = req.body || {};
      const record = normalizeIncomingWeatherPayload({
        stationCode: stationCode.trim(),
        providerHint:
          provider === 'dropcontrol_wiseconn' ||
          provider === 'davis_weatherlink' ||
          provider === 'ecowitt_cloud' ||
          provider === 'ecowitt_push' ||
          provider === 'iot_webhook'
            ? provider
            : 'dropcontrol_wiseconn',
        stationNameHint: typeof stationName === 'string' ? stationName.trim() : undefined,
        payload: {
          tempC: Number.isFinite(Number(baseTempC)) ? Number(baseTempC) : 14.8,
          humedad: Number.isFinite(Number(baseHumidity)) ? Number(baseHumidity) : 78,
          vientoKmH: Number.isFinite(Number(baseWindKmH)) ? Number(baseWindKmH) : 7.4,
          windDirDeg: 225,
          lluviaMm: 0.4,
          humedadFoliarPct: 45,
          radiacionSolarWm2: 520,
          uv: 5.2,
          stationtype:
            provider === 'dropcontrol_wiseconn'
              ? 'DropControl Wiseconn (Prueba)'
              : provider === 'davis_weatherlink'
              ? 'Davis Vantage Pro2 (Prueba)'
              : 'Ecowitt GW2000 (Prueba)',
        },
      });
      res.json({ ok: true, reading: record });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error generando prueba de estación';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    startDailyUvPushScheduler();
  });
}

startServer();
