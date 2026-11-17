import fs from 'fs';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function resolveProjectId(): string | undefined {
  try {
    const raw = fs.readFileSync(
      new URL('../../firebase-applet-config.json', import.meta.url),
      'utf8'
    );
    const parsed = JSON.parse(raw) as { projectId?: string };
    if (parsed?.projectId) return parsed.projectId;
  } catch {
    // Fallback to environment variable if config file is unavailable
  }
  return process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
}

if (!getApps().length) {
  const projectId = resolveProjectId();
  initializeApp(projectId ? { projectId } : {});
}

export const adminAuth = getAuth();
