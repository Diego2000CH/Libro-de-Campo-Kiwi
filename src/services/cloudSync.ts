import { AppStateData } from '../types/campo';

// Credenciales oficiales provistas por el usuario
export const DEFAULT_BIN_ID = '6ad7b16dffd5d160537cefc6';
export const DEFAULT_MASTER_KEY = '$2a$10$g/sLJaV5/DFNZaxvcx30vOOjHCH2Zt/2zWfsJ34Apx959RD8Tug3W';

const LOCAL_STORAGE_KEY = 'fundo_la_cabana_app_data_v2';
const SYNC_CONFIG_KEY = 'fundo_la_cabana_cloud_config';

export interface CloudConfig {
  binId: string;
  masterKey: string;
  autoSync: boolean;
  lastSyncTime: string | null;
  lastSyncStatus: 'success' | 'error' | 'idle';
  lastErrorMsg?: string;
}

export function getCloudConfig(): CloudConfig {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        binId: parsed.binId || DEFAULT_BIN_ID,
        masterKey: parsed.masterKey || DEFAULT_MASTER_KEY,
        autoSync: parsed.autoSync !== false,
        lastSyncTime: parsed.lastSyncTime || null,
        lastSyncStatus: parsed.lastSyncStatus || 'idle',
        lastErrorMsg: parsed.lastErrorMsg
      };
    }
  } catch (e) {
    console.warn('Error leyendo configuración de nube:', e);
  }

  return {
    binId: DEFAULT_BIN_ID,
    masterKey: DEFAULT_MASTER_KEY,
    autoSync: true,
    lastSyncTime: null,
    lastSyncStatus: 'idle'
  };
}

export function saveCloudConfig(config: Partial<CloudConfig>): CloudConfig {
  const current = getCloudConfig();
  const updated: CloudConfig = { ...current, ...config };
  try {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error guardando configuración de nube:', e);
  }
  return updated;
}

/**
 * Carga los datos desde la Nube (JSONBin.io)
 */
export async function loadDataFromCloud(): Promise<{ data: AppStateData | null; source: 'cloud' | 'local'; offline?: boolean; error?: string }> {
  const config = getCloudConfig();
  const binId = config.binId.trim();
  const masterKey = config.masterKey.trim();

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const local = loadDataFromLocalStorage();
    return { data: local, source: 'local', offline: true, error: 'Sin conexión a internet (usando respaldo local)' };
  }

  if (!binId) {
    const local = loadDataFromLocalStorage();
    return { data: local, source: 'local', error: 'No hay Bin ID configurado' };
  }

  try {
    // Timeout de 9 segundos para terrenos con conectividad móvil lenta
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      method: 'GET',
      headers: {
        'X-Master-Key': masterKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`JSONBin error ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    // JSONBin devuelve `{ record: { ... }, metadata: { ... } }`
    const record = json.record ? json.record : json;

    if (record && record.explotacion) {
      saveCloudConfig({
        lastSyncTime: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        lastSyncStatus: 'success',
        lastErrorMsg: undefined
      });
      // Guardar también copia local como respaldo
      saveDataToLocalStorage(record);
      return { data: record as AppStateData, source: 'cloud' };
    } else {
      // El bin existe pero está vacío o con formato previo
      const local = loadDataFromLocalStorage();
      return { data: local, source: 'local', error: 'El bin en la nube no contiene datos estructurados del fundo' };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error de conexión';
    console.warn('Fallo al obtener datos de la nube, usando respaldo local:', err);
    saveCloudConfig({
      lastSyncStatus: 'error',
      lastErrorMsg: message
    });
    const local = loadDataFromLocalStorage();
    return { data: local, source: 'local', error: message };
  }
}

/**
 * Guarda los datos en la Nube (JSONBin.io) y en LocalStorage
 */
export async function saveDataToCloud(data: AppStateData): Promise<{ success: boolean; offline?: boolean; error?: string }> {
  // Primero guardamos siempre en localStorage de forma instantánea
  saveDataToLocalStorage(data);

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { success: false, offline: true, error: 'Sin conexión a internet (guardado localmente)' };
  }

  const config = getCloudConfig();
  const binId = config.binId.trim();
  const masterKey = config.masterKey.trim();

  if (!binId || !config.autoSync) {
    return { success: true };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const payload = {
      ...data,
      ultimaActualizacion: new Date().toISOString()
    };

    const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': masterKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    saveCloudConfig({
      lastSyncTime: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      lastSyncStatus: 'success',
      lastErrorMsg: undefined
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al sincronizar con la nube';
    console.error('Error guardando en JSONBin:', err);
    saveCloudConfig({
      lastSyncStatus: 'error',
      lastErrorMsg: message
    });
    return { success: false, error: message };
  }
}

export function loadDataFromLocalStorage(): AppStateData | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error leyendo localStorage:', e);
  }
  return null;
}

export function saveDataToLocalStorage(data: AppStateData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error guardando en localStorage:', e);
  }
}
