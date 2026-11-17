import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { AuthRequest, requireAuth } from './src/middleware/auth.ts';
import {
  getOrchardSnapshotByUid,
  getSqlSummaryByUid,
  saveOrchardSnapshotByUid,
} from './src/db/orchardRepo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
