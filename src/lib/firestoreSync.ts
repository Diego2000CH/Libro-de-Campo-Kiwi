import { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { AppStateData } from '../types/campo';
import { auth, db } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline: operando con caché local hasta recuperar conexión.');
      return false;
    }
    return true;
  }
}

// Firestore does not allow undefined property values in native Maps
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        clean[k] = stripUndefined(v);
      }
    }
    return clean as T;
  }
  return value;
}

function sanitizeUid(uid: string): string {
  return uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
}

export async function syncUserProfileToFirestore(user: User): Promise<void> {
  const safeUid = sanitizeUid(user.uid);
  const path = `users/${safeUid}`;
  const ref = doc(db, 'users', safeUid);

  try {
    const snap = await getDoc(ref);
    const displayName = (user.displayName || user.email?.split('@')[0] || 'Usuario').slice(0, 120);
    const email = (user.email || 'usuario@huerto.cl').slice(0, 200);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: safeUid,
        email,
        displayName,
        role: 'usuario',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        email,
        displayName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadOrchardFromFirestore(uid: string): Promise<AppStateData | null> {
  const safeUid = sanitizeUid(uid);
  const path = `orchards/${safeUid}`;
  const ref = doc(db, 'orchards', safeUid);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    if (data && data.stateData && typeof data.stateData === 'object') {
      return data.stateData as AppStateData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveOrchardToFirestore(
  uid: string,
  state: AppStateData
): Promise<void> {
  const safeUid = sanitizeUid(uid);
  const path = `orchards/${safeUid}`;
  const ref = doc(db, 'orchards', safeUid);

  const nombreFundo = (state.explotacion?.nombreFundo || 'Mi Huerto de Kiwis')
    .trim()
    .slice(0, 120) || 'Mi Huerto de Kiwis';
  const latitud =
    typeof state.explotacion?.latitud === 'number' &&
    state.explotacion.latitud >= -90 &&
    state.explotacion.latitud <= 90
      ? state.explotacion.latitud
      : -39.628593;
  const longitud =
    typeof state.explotacion?.longitud === 'number' &&
    state.explotacion.longitud >= -180 &&
    state.explotacion.longitud <= 180
      ? state.explotacion.longitud
      : -72.461085;

  const cleanStateData = stripUndefined({ ...state }) as unknown as Record<string, unknown>;

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: safeUid,
        nombreFundo,
        latitud,
        longitud,
        stateData: cleanStateData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        nombreFundo,
        latitud,
        longitud,
        stateData: cleanStateData,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToOrchard(
  uid: string,
  onState: (state: AppStateData) => void,
  onError?: (err: Error) => void
): () => void {
  const safeUid = sanitizeUid(uid);
  const path = `orchards/${safeUid}`;
  const ref = doc(db, 'orchards', safeUid);

  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.stateData && typeof data.stateData === 'object') {
          onState(data.stateData as AppStateData);
        }
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (structuredErr) {
        if (onError) {
          onError(structuredErr instanceof Error ? structuredErr : new Error(String(structuredErr)));
        }
      }
    }
  );
}
