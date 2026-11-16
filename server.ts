import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  getOrchardSnapshotByUid,
  getSqlSummaryByUid,
  saveOrchardSnapshotByUid,
} from './src/db/orchardRepo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '4mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/maps-client-config', (_req, res) => {
    const apiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '';
    res.json({ apiKey });
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

  // Gemini API + Google Maps Grounding (gemini-4-hydrogen)
  app.post('/api/gemini/maps-advisor', async (req, res) => {
    try {
      const { prompt, fundoNombre, parcelas, inventario, clima, latLng } = req.body || {};

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'La consulta no puede estar vacía.' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error:
            'GEMINI_API_KEY no está configurada en el servidor. Configúrala en Settings > Secrets.',
        });
      }

      const latitude =
        typeof latLng?.latitude === 'number' ? latLng.latitude : -39.628593;
      const longitude =
        typeof latLng?.longitude === 'number' ? latLng.longitude : -72.461085;

      const parcelasResumen = Array.isArray(parcelas) && parcelas.length > 0
        ? parcelas
            .slice(0, 12)
            .map(
              (p: Record<string, unknown>) =>
                `${p.nombre || 'Cuartel'} (${p.superficieHa || 0} ha, ${p.variedad || 'Hayward'}, estado: ${p.estadoActual || 'Normal'})`
            )
            .join('; ')
        : 'Sin cuarteles registrados aún.';

      const bodegaResumen = Array.isArray(inventario) && inventario.length > 0
        ? inventario
            .slice(0, 15)
            .map(
              (i: Record<string, unknown>) =>
                `${i.nombreComercial || 'Insumo'} (${i.stockActual || 0} ${i.unidad || ''}, carencia: ${i.periodoCarenciaDias ?? 0}d)`
            )
            .join('; ')
        : 'Bodega vacía.';

      const climaResumen = clima
        ? `${clima.temperaturaActual ?? '-'}°C, HR ${clima.humedadRelativa ?? '-'}%, Viento ${clima.velocidadVientoKmH ?? '-'} km/h, Riesgo Psa: ${clima.riesgoPsa ?? '-'}, Botrytis: ${clima.riesgoBotrytis ?? '-'}`
        : 'Sin lectura climática.';

      const systemInstruction = `Eres un Ingeniero Agrónomo Senior especialista en Kiwi Hayward (Actinidia deliciosa) en Chile, normativa SAG, control de Psa y Botrytis, riego de pozo, polinización y madurez (°Brix).
Además tienes acceso a Google Maps Grounding para encontrar agroservicios, distribuidores de insumos agrícolas, laboratorios, oficinas del SAG, plantas de packing, estaciones meteorológicas o ferreterías agrícolas cercanas a la ubicación del predio.
Contexto actual del huerto "${fundoNombre || 'Mi Huerto de Kiwis'}" (coordenadas ${latitude}, ${longitude}):
- Cuarteles: ${parcelasResumen}
- Bodega: ${bodegaResumen}
- Clima: ${climaResumen}
Responde siempre en español claro, técnico y práctico en formato Markdown. Si la pregunta involucra lugares, proveedores, rutas o servicios cercanos, utiliza la herramienta de Google Maps para entregar ubicaciones reales y verificadas.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt.trim(),
        config: {
          systemInstruction,
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude,
                longitude,
              },
            },
          },
        },
      });

      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      const sources: {
        title: string;
        uri: string;
        placeId?: string;
        reviewSnippets?: string[];
      }[] = [];

      for (const chunk of chunks) {
        const mapsData = (chunk as {
          maps?: {
            uri?: string;
            title?: string;
            placeId?: string;
            placeAnswerSources?: {
              reviewSnippets?: Array<{
                content?: string;
                googleMapsUri?: string;
                title?: string;
              }>;
            };
          };
        }).maps;

        if (mapsData?.uri) {
          const snippets = Array.isArray(mapsData.placeAnswerSources?.reviewSnippets)
            ? mapsData.placeAnswerSources!.reviewSnippets!
                .map((s) => s.content || s.title || '')
                .filter(Boolean)
            : [];

          sources.push({
            title: mapsData.title || 'Ver en Google Maps',
            uri: mapsData.uri,
            placeId: mapsData.placeId,
            reviewSnippets: snippets.length > 0 ? snippets : undefined,
          });
        }
      }

      res.json({
        text: response.text || 'No se recibió respuesta del modelo.',
        sources,
      });
    } catch (error: unknown) {
      console.error('Error in /api/gemini/maps-advisor:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        error: `Error consultando al asesor inteligente: ${errMsg}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
