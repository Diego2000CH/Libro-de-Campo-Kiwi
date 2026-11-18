import React, { useState, useEffect, useRef } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ParcelasView } from './components/ParcelasView';
import { CosechaMadurezView } from './components/CosechaMadurezView';
import { OrdenesTrabajoView } from './components/OrdenesTrabajoView';
import { HorasFrioFenologiaView } from './components/HorasFrioFenologiaView';
import { LaboresView } from './components/LaboresView';
import { InventarioView } from './components/InventarioView';
import { FitosanitariosView } from './components/FitosanitariosView';
import { MaterialesRiegoView } from './components/MaterialesRiegoView';
import { PozoView } from './components/PozoView';
import { RiegoView } from './components/RiegoView';
import { MaquinariasView } from './components/MaquinariasView';
import { ClimaView } from './components/ClimaView';
import { MonitoreoView } from './components/MonitoreoView';
import { CalculadoraView } from './components/CalculadoraView';
import { InformeOficialView } from './components/InformeOficialView';
import { UsuariosView } from './components/UsuariosView';
import { LoginView } from './components/LoginView';
import { ModalLabor } from './components/ModalLabor';
import { ModalExplotacion } from './components/ModalExplotacion';
import { AlertasStockModal } from './components/AlertasStockModal';
import { PolinizacionFloracionView } from './components/PolinizacionFloracionView';
import { ErrorBoundary } from './components/ErrorBoundary';

import { 
  getStoredExplotacion, 
  getStoredParcelas, 
  getStoredLabores, 
  getStoredInventario, 
  getStoredRegistrosPozo, 
  getStoredMaquinarias,
  getStoredRegistrosMantencion,
  getStoredLugares, 
  getStoredUsuarios, 
  getStoredActiveUserId, 
  getStoredMuestreosMadurez, 
  getStoredCosechasLote, 
  getStoredOrdenesTrabajo, 
  getStoredCondicionHorasFrio, 
  getStoredRegistrosTermicos,
  getStoredFenologia, 
  getStoredPolinizacion, 
  getStoredTurnosRiego,
  getStoredMuestreosBrotacion,
  getStoredConteosBotones,
  getStoredSincroniasFlorales,
  getStoredAplicacionesPolen,
  getStoredPlanesCargaRaleo,
  getStoredEvaluacionesCuajaSemillas,
  resetStorageToDefaults,
  resetStorageToRealOrchard,
  stripDemoRecords,
  getBlankClima,
  cleanDemoSectoresRiego,
  saveStoredSectoresRiego
} from './utils/storage';
import { 
  loadDataFromCloud, 
  saveDataToCloud,
  saveDataToLocalStorage
} from './services/cloudSync';
import { normalizarCondicionHorasFrio } from './utils/agroClimaCalculos';
import { 
  ExplotacionAgricola, 
  Parcela, 
  RegistroLabor, 
  TipoLabor, 
  InsumoInventario, 
  RegistroExtraccionPozo,
  MaquinariaEquipo,
  RegistroMantencionMaquinaria,
  ClimaCondiciones,
  LugarPredio,
  UsuarioPredio,
  MuestreoMadurez,
  RegistroCosechaLote,
  OrdenTrabajoFitosanitaria,
  CondicionHorasFrio,
  RegistroTermicoHuerto,
  SeguimientoFenologico,
  RegistroPolinizacion,
  MuestreoBrotacion,
  ConteoBotonesFlorales,
  SincroniaFloral,
  AplicacionPolenAsistido,
  PlanCargaRaleo,
  EvaluacionCuajaSemillas,
  TurnoRiego,
  AppStateData
} from './types/campo';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  loadOrchardFromFirestore,
  saveOrchardToFirestore,
  subscribeToOrchard,
  syncUserProfileToFirestore,
} from './lib/firestoreSync';
import {
  canEditAppData,
  getNivelAcceso,
  getNivelAccesoMeta,
  getRolLabel,
  isAdminUser,
} from './utils/permissions';
import { KeyRound, Lock, RotateCcw, ShieldAlert, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Estado Principal de Datos
  const [explotacion, setExplotacion] = useState<ExplotacionAgricola>(getStoredExplotacion);
  const [parcelas, setParcelas] = useState<Parcela[]>(getStoredParcelas);
  const [labores, setLabores] = useState<RegistroLabor[]>(getStoredLabores);
  const [inventario, setInventario] = useState<InsumoInventario[]>(getStoredInventario);
  const [registrosPozo, setRegistrosPozo] = useState<RegistroExtraccionPozo[]>(getStoredRegistrosPozo);
  const [maquinarias, setMaquinarias] = useState<MaquinariaEquipo[]>(getStoredMaquinarias);
  const [registrosMantencion, setRegistrosMantencion] = useState<RegistroMantencionMaquinaria[]>(getStoredRegistrosMantencion);
  const [lugares, setLugares] = useState<LugarPredio[]>(getStoredLugares);
  const [usuarios, setUsuarios] = useState<UsuarioPredio[]>(getStoredUsuarios);
  const [activeUserId, setActiveUserId] = useState<string>(getStoredActiveUserId);
  const [clima, setClima] = useState<ClimaCondiciones>(getBlankClima);

  const [muestreosMadurez, setMuestreosMadurez] = useState<MuestreoMadurez[]>(getStoredMuestreosMadurez);
  const [cosechasLote, setCosechasLote] = useState<RegistroCosechaLote[]>(getStoredCosechasLote);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<OrdenTrabajoFitosanitaria[]>(getStoredOrdenesTrabajo);
  const [horasFrio, setHorasFrio] = useState<CondicionHorasFrio>(getStoredCondicionHorasFrio);
  const [registrosTermicos, setRegistrosTermicos] = useState<RegistroTermicoHuerto[]>(getStoredRegistrosTermicos);
  const [fenologia, setFenologia] = useState<SeguimientoFenologico[]>(getStoredFenologia);
  const [polinizacion, setPolinizacion] = useState<RegistroPolinizacion[]>(getStoredPolinizacion);
  const [turnosRiego, setTurnosRiego] = useState<TurnoRiego[]>(getStoredTurnosRiego);
  const [muestreosBrotacion, setMuestreosBrotacion] = useState<MuestreoBrotacion[]>(getStoredMuestreosBrotacion);
  const [conteosBotones, setConteosBotones] = useState<ConteoBotonesFlorales[]>(getStoredConteosBotones);
  const [sincroniasFlorales, setSincroniasFlorales] = useState<SincroniaFloral[]>(getStoredSincroniasFlorales);
  const [aplicacionesPolen, setAplicacionesPolen] = useState<AplicacionPolenAsistido[]>(getStoredAplicacionesPolen);
  const [planesCargaRaleo, setPlanesCargaRaleo] = useState<PlanCargaRaleo[]>(getStoredPlanesCargaRaleo);
  const [evaluacionesCuajaSemillas, setEvaluacionesCuajaSemillas] = useState<EvaluacionCuajaSemillas[]>(getStoredEvaluacionesCuajaSemillas);

  // Estado de Sesión / Autenticación de Usuario
  const [currentUser, setCurrentUser] = useState<UsuarioPredio | null>(() => {
    try {
      const storedSession = sessionStorage.getItem('fundo_session_user');
      if (storedSession) {
        return JSON.parse(storedSession);
      }
    } catch (e) {
      console.warn('Error leyendo sesión:', e);
    }
    // Si no hay sesión previa guardada, iniciamos pidiendo credenciales
    return null;
  });

  // Estado de Autenticación Firebase & Cuota de Google Maps
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [mapsKeyLoading, setMapsKeyLoading] = useState<boolean>(
    () => !import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  );
  const [mapsKeyError, setMapsKeyError] = useState<string | null>(null);

  // Estado de Sincronización en la Nube
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'saving' | 'synced' | 'error' | 'offline'>(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'loading'
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isLoadedInitially, setIsLoadedInitially] = useState(false);
  const lastSyncedPayloadRef = useRef<string>('');
  const skipNextRemoteSaveRef = useRef<boolean>(false);
  const firebaseSessionActiveRef = useRef<boolean>(false);
  const remoteHydratedRef = useRef<boolean>(false);

  // Estados de Modales
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState<RegistroLabor | null>(null);
  const [defaultParcelaId, setDefaultParcelaId] = useState<string | undefined>(undefined);
  const [defaultTipoLabor, setDefaultTipoLabor] = useState<TipoLabor | undefined>(undefined);
  const [isExplotacionModalOpen, setIsExplotacionModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Modal de cambio de cuenta (siempre exige contraseña, nunca acceso directo)
  const [isSwitchUserModalOpen, setIsSwitchUserModalOpen] = useState(false);
  const [switchTargetUser, setSwitchTargetUser] = useState<UsuarioPredio | null>(null);
  const [switchIdentifier, setSwitchIdentifier] = useState('');
  const [switchPassword, setSwitchPassword] = useState('');
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [permissionErrorToast, setPermissionErrorToast] = useState<string | null>(null);

  const buildFullStateData = (): AppStateData => ({
    explotacion,
    parcelas,
    labores,
    inventario,
    registrosPozo,
    maquinarias,
    registrosMantencion,
    lugares,
    usuarios,
    activeUserId,
    muestreosMadurez,
    cosechasLote,
    ordenesTrabajo,
    horasFrio: normalizarCondicionHorasFrio(horasFrio, registrosTermicos),
    registrosTermicos,
    fenologia,
    polinizacion,
    muestreosBrotacion,
    conteosBotones,
    sincroniasFlorales,
    aplicacionesPolen,
    planesCargaRaleo,
    evaluacionesCuajaSemillas,
    turnosRiego,
    clima,
    ultimaActualizacion: new Date().toISOString(),
  });

  const applyHydratedState = (d: Partial<AppStateData>) => {
    if (d.explotacion) setExplotacion(d.explotacion);
    if (Array.isArray(d.parcelas)) setParcelas(d.parcelas);
    if (Array.isArray(d.labores)) setLabores(d.labores);
    if (Array.isArray(d.inventario)) setInventario(d.inventario);
    if (Array.isArray(d.registrosPozo)) setRegistrosPozo(d.registrosPozo);
    if (Array.isArray(d.maquinarias)) setMaquinarias(d.maquinarias);
    if (Array.isArray(d.registrosMantencion)) setRegistrosMantencion(d.registrosMantencion);
    if (Array.isArray(d.lugares)) setLugares(d.lugares);
    if (d.usuarios?.length) setUsuarios(d.usuarios);
    if (d.activeUserId) setActiveUserId(d.activeUserId);
    if (Array.isArray(d.muestreosMadurez)) setMuestreosMadurez(d.muestreosMadurez);
    if (Array.isArray(d.cosechasLote)) setCosechasLote(d.cosechasLote);
    if (Array.isArray(d.ordenesTrabajo)) setOrdenesTrabajo(d.ordenesTrabajo);
    const hydratedRegs = Array.isArray(d.registrosTermicos) ? d.registrosTermicos : registrosTermicos;
    if (Array.isArray(d.registrosTermicos)) setRegistrosTermicos(d.registrosTermicos);
    if (d.horasFrio) setHorasFrio(normalizarCondicionHorasFrio(d.horasFrio, hydratedRegs));
    if (Array.isArray(d.fenologia)) setFenologia(d.fenologia);
    if (Array.isArray(d.polinizacion)) setPolinizacion(d.polinizacion);
    if (Array.isArray(d.muestreosBrotacion)) setMuestreosBrotacion(d.muestreosBrotacion);
    if (Array.isArray(d.conteosBotones)) setConteosBotones(d.conteosBotones);
    if (Array.isArray(d.sincroniasFlorales)) setSincroniasFlorales(d.sincroniasFlorales);
    if (Array.isArray(d.aplicacionesPolen)) setAplicacionesPolen(d.aplicacionesPolen);
    if (Array.isArray(d.planesCargaRaleo)) setPlanesCargaRaleo(d.planesCargaRaleo);
    if (Array.isArray(d.evaluacionesCuajaSemillas)) setEvaluacionesCuajaSemillas(d.evaluacionesCuajaSemillas);
    if (Array.isArray(d.turnosRiego)) setTurnosRiego(d.turnosRiego);
    if (d.clima) setClima(d.clima);
  };

  const mapFirebaseUserToPredio = (user: FirebaseUser): UsuarioPredio => {
    const emailLower = (user.email || '').toLowerCase();
    const existing = usuarios.find(
      (u) => u.email.toLowerCase() === emailLower && emailLower !== ''
    );
    if (existing) {
      return {
        ...existing,
        nombre: user.displayName || existing.nombre,
      };
    }
    return {
      id: `fb-${user.uid.slice(0, 12)}`,
      nombre: user.displayName || user.email?.split('@')[0] || 'Usuario Google',
      rut: 'Google Auth',
      email: user.email || '',
      password: '',
      rol: 'administrador',
      nivelAcceso: 'admin',
      carnetSAGVigente: true,
      telefono: '',
      cargo: 'Administrador de Huerto',
    };
  };

  // Defensa de Cuota Google Maps + Resolución resiliente de API Key del cliente
  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const mapsFetchInFlightRef = useRef<Promise<void> | null>(null);

  const fetchMapsClientConfig = async (retries = 5) => {
    if (mapsFetchInFlightRef.current) {
      return mapsFetchInFlightRef.current;
    }

    const run = async () => {
      const envKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
      if (envKey) {
        setMapsApiKey(envKey);
        setMapsKeyLoading(false);
        setMapsKeyError(null);
        return;
      }

      setMapsKeyLoading(true);
      setMapsKeyError(null);

      const delays = [0, 800, 1800, 3500, 5000];
      let serverRespondedWithoutKey = false;

      for (let attempt = 0; attempt < retries; attempt++) {
        const waitMs = delays[Math.min(attempt, delays.length - 1)];
        if (waitMs > 0) {
          await new Promise((r) => setTimeout(r, waitMs));
        }
        try {
          const res = await fetch(`/api/maps-client-config?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            throw new Error('Respuesta no JSON desde /api/maps-client-config');
          }
          const data = await res.json();
          if (data?.apiKey && typeof data.apiKey === 'string' && data.apiKey.trim()) {
            setMapsApiKey(data.apiKey.trim());
            setMapsKeyLoading(false);
            setMapsKeyError(null);
            return;
          }
          serverRespondedWithoutKey = true;
          break;
        } catch (err) {
          console.warn(`Intento ${attempt + 1} al obtener clave Google Maps falló:`, err);
        }
      }

      setMapsKeyLoading(false);
      setMapsKeyError(
        serverRespondedWithoutKey
          ? 'El servidor aún no tiene configurada GOOGLE_MAPS_API_KEY o VITE_GOOGLE_MAPS_API_KEY.'
          : 'No se pudo obtener la clave de Google Maps desde el servidor.'
      );
    };

    const promise = run().finally(() => {
      mapsFetchInFlightRef.current = null;
    });
    mapsFetchInFlightRef.current = promise;
    return promise;
  };

  useEffect(() => {
    if (!mapsApiKey) {
      void fetchMapsClientConfig(5);
    } else {
      setMapsKeyLoading(false);
    }
  }, []);

  // Reintento automático al abrir Cuarteles & Mapa si la clave aún no se cargó
  useEffect(() => {
    if (activeTab === 'parcelas' && !mapsApiKey && !mapsKeyLoading) {
      void fetchMapsClientConfig(4);
    }
  }, [activeTab, mapsApiKey]);

  // Monitoreo de red del navegador (Offline / Online)
  useEffect(() => {
    const onOffline = () => setSyncState('offline');
    const onOnline = () => {
      setSyncState((prev) => (prev === 'offline' ? 'idle' : prev));
      if (!mapsApiKey) {
        void fetchMapsClientConfig(4);
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [mapsApiKey]);

  const parseTimestampMs = (iso?: string): number => {
    if (!iso) return 0;
    const ms = Date.parse(iso);
    return Number.isFinite(ms) ? ms : 0;
  };

  const pickNewestState = (
    a: AppStateData | null,
    b: AppStateData | null
  ): AppStateData | null => {
    if (a && !b) return a;
    if (b && !a) return b;
    if (!a && !b) return null;
    const tsA = parseTimestampMs(a?.ultimaActualizacion);
    const tsB = parseTimestampMs(b?.ultimaActualizacion);
    return tsB > tsA ? b : a;
  };

  // Autenticación Firebase + Sincronización con Firestore y Cloud SQL
  useEffect(() => {
    let isMounted = true;
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      firebaseSessionActiveRef.current = Boolean(user);
      setFirebaseUser(user);

      if (!user) {
        return;
      }

      const mappedUser = mapFirebaseUserToPredio(user);
      setCurrentUser(mappedUser);
      setActiveUserId(mappedUser.id);
      setUsuarios((prev) => {
        if (prev.some((u) => u.id === mappedUser.id)) return prev;
        return [mappedUser, ...prev];
      });
      try {
        sessionStorage.setItem('fundo_session_user', JSON.stringify(mappedUser));
      } catch (e) {}

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSyncState('offline');
        setIsLoadedInitially(true);
        return;
      }

      setSyncState('loading');
      try {
        await syncUserProfileToFirestore(user).catch((err) => {
          console.warn('Perfil de usuario Firestore diferido:', err);
        });
        const token = await user.getIdToken();

        const [firestoreState, sqlRes] = await Promise.all([
          loadOrchardFromFirestore(user.uid).catch((err) => {
            console.warn('No se pudo leer Firestore:', err);
            return null;
          }),
          fetch('/api/orchard/state', {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch((err) => {
              console.warn('No se pudo leer Cloud SQL:', err);
              return null;
            }),
        ]);

        if (!isMounted) return;

        const sqlState =
          sqlRes?.snapshot && typeof sqlRes.snapshot === 'object'
            ? (sqlRes.snapshot as AppStateData)
            : null;
        const remoteState = pickNewestState(firestoreState, sqlState);

        if (remoteState && remoteState.explotacion) {
          let cloudCleanNeeded = false;
          try {
            cloudCleanNeeded = localStorage.getItem('huerto_real_cloud_cleaned_v2') !== 'true';
          } catch (e) {}

          const cleanRemoteState = cloudCleanNeeded ? stripDemoRecords(remoteState) : remoteState;
          if (cloudCleanNeeded) {
            cleanDemoSectoresRiego();
            try {
              localStorage.setItem('huerto_real_cloud_cleaned_v2', 'true');
            } catch (e) {}
            void saveOrchardToFirestore(user.uid, cleanRemoteState).catch(() => {});
            void fetch('/api/orchard/state', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ stateData: cleanRemoteState }),
            }).catch(() => {});
          }

          remoteHydratedRef.current = true;
          const serialized = JSON.stringify(cleanRemoteState);
          lastSyncedPayloadRef.current = serialized;
          skipNextRemoteSaveRef.current = true;
          applyHydratedState(cleanRemoteState);
          saveDataToLocalStorage(cleanRemoteState);
          setSyncState('synced');
          setLastSyncTime(
            new Date().toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        } else {
          // Sembrar Firestore y Cloud SQL con el estado actual del huerto si es el primer acceso
          const seedState = buildFullStateData();
          remoteHydratedRef.current = true;
          lastSyncedPayloadRef.current = JSON.stringify(seedState);
          await Promise.allSettled([
            saveOrchardToFirestore(user.uid, seedState),
            fetch('/api/orchard/state', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ stateData: seedState }),
            }),
          ]);
          setSyncState('synced');
        }

        unsubscribeFirestore = subscribeToOrchard(
          user.uid,
          (incomingState) => {
            if (!isMounted) return;
            const incomingSerialized = JSON.stringify(incomingState);
            if (incomingSerialized === lastSyncedPayloadRef.current) {
              return;
            }
            remoteHydratedRef.current = true;
            lastSyncedPayloadRef.current = incomingSerialized;
            skipNextRemoteSaveRef.current = true;
            applyHydratedState(incomingState);
            saveDataToLocalStorage(incomingState);
            setSyncState('synced');
            setLastSyncTime(
              new Date().toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            );
          },
          (err) => {
            console.warn('Error en suscripción en vivo Firestore:', err.message);
            if (isMounted) {
              setSyncState(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error');
            }
          }
        );
      } catch (err) {
        console.warn('Error sincronizando usuario Firebase:', err);
        if (isMounted) {
          setSyncState(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error');
        }
      } finally {
        if (isMounted) setIsLoadedInitially(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // 1. CARGA INICIAL DESDE LA NUBE (JSONBin.io cuando no hay sesión Firebase hidratada)
  useEffect(() => {
    let isMounted = true;
    async function inicializarNube() {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setSyncState('offline');
        if (isMounted) setIsLoadedInitially(true);
        return;
      }

      if (!firebaseSessionActiveRef.current) {
        setSyncState('loading');
      }

      try {
        const result = await loadDataFromCloud();
        if (!isMounted) return;

        // No sobrescribir si Firebase/Cloud SQL ya hidrató el huerto del usuario
        if (firebaseSessionActiveRef.current || remoteHydratedRef.current || auth.currentUser) {
          return;
        }

        if (result.offline) {
          setSyncState('offline');
          return;
        }

        if (result.data && result.data.explotacion) {
          let cloudCleanNeeded = false;
          try {
            cloudCleanNeeded = localStorage.getItem('huerto_real_cloud_cleaned_v2') !== 'true';
          } catch (e) {}

          const d = cloudCleanNeeded ? stripDemoRecords(result.data) : result.data;
          lastSyncedPayloadRef.current = JSON.stringify(d);
          skipNextRemoteSaveRef.current = true;
          applyHydratedState(d);

          if (cloudCleanNeeded) {
            cleanDemoSectoresRiego();
            try {
              localStorage.setItem('huerto_real_cloud_cleaned_v2', 'true');
            } catch (e) {}
            void saveDataToCloud(d);
          }

          setSyncState(result.source === 'cloud' ? 'synced' : result.error ? 'error' : 'synced');
          const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSyncTime(time);
        } else {
          setSyncState('synced');
        }
      } catch (err) {
        console.warn('Error inicializando nube:', err);
        if (!firebaseSessionActiveRef.current) {
          setSyncState(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error');
        }
      } finally {
        if (isMounted) setIsLoadedInitially(true);
      }
    }

    inicializarNube();
    return () => { isMounted = false; };
  }, []);

  const persistAllTargets = async (fullData: AppStateData): Promise<'synced' | 'offline' | 'error'> => {
    const serialized = JSON.stringify(fullData);
    lastSyncedPayloadRef.current = serialized;
    saveDataToLocalStorage(fullData);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return 'offline';
    }

    const tasks: Promise<boolean>[] = [
      saveDataToCloud(fullData)
        .then((r) => r.success)
        .catch(() => false),
    ];

    const currentFbUser = auth.currentUser || firebaseUser;
    if (currentFbUser) {
      tasks.push(
        saveOrchardToFirestore(currentFbUser.uid, fullData)
          .then(() => true)
          .catch((err) => {
            console.warn('Error guardando en Firestore:', err);
            return false;
          })
      );

      tasks.push(
        currentFbUser
          .getIdToken()
          .then((token) =>
            fetch('/api/orchard/state', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ stateData: fullData }),
            })
          )
          .then((r) => r.ok)
          .catch((err) => {
            console.warn('Error guardando en Cloud SQL:', err);
            return false;
          })
      );
    }

    const results = await Promise.all(tasks);
    return results.some(Boolean) ? 'synced' : 'error';
  };

  // 2. GUARDADO AUTOMÁTICO EN LA NUBE (Debounce de 800ms)
  const isFirstSyncRef = useRef(true);
  useEffect(() => {
    if (!isLoadedInitially) return;
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }
    if (skipNextRemoteSaveRef.current) {
      skipNextRemoteSaveRef.current = false;
      return;
    }

    setSyncState(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'saving');
    const timer = setTimeout(async () => {
      const fullData = buildFullStateData();
      const status = await persistAllTargets(fullData);
      setSyncState(status);
      if (status === 'synced') {
        setLastSyncTime(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    isLoadedInitially,
    explotacion,
    parcelas,
    labores,
    inventario,
    registrosPozo,
    maquinarias,
    registrosMantencion,
    lugares,
    usuarios,
    activeUserId,
    muestreosMadurez,
    cosechasLote,
    ordenesTrabajo,
    horasFrio,
    registrosTermicos,
    fenologia,
    polinizacion,
    muestreosBrotacion,
    conteosBotones,
    sincroniasFlorales,
    aplicacionesPolen,
    planesCargaRaleo,
    evaluacionesCuajaSemillas,
    turnosRiego,
    clima
  ]);

  // Forzar sincronización manual
  const handleForceSync = async () => {
    setSyncState(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'saving');
    const fullData = buildFullStateData();
    const status = await persistAllTargets(fullData);
    setSyncState(status);
    if (status === 'synced') {
      setLastSyncTime(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  // Usuario Activo y Permisos
  const activeUser = usuarios.find((u) => u.id === (currentUser?.id || activeUserId)) || currentUser || usuarios[0];
  const isAdmin = isAdminUser(activeUser);
  const canEdit = canEditAppData(activeUser);

  const notifyPermissionDenied = (required: 'edit' | 'admin') => {
    setPermissionErrorToast(
      required === 'admin'
        ? 'Acción restringida: solo el Administrador del Huerto puede realizar esta operación.'
        : 'Modo Solo Lectura: puedes explorar mapas, filtros y simuladores, pero no agregar, editar ni eliminar datos.'
    );
  };

  const guardEdit = <T extends unknown[]>(fn: (...args: T) => void) => (...args: T) => {
    if (!canEdit) {
      notifyPermissionDenied('edit');
      return;
    }
    fn(...args);
  };

  const guardAdmin = <T extends unknown[]>(fn: (...args: T) => void) => (...args: T) => {
    if (!isAdmin) {
      notifyPermissionDenied('admin');
      return;
    }
    fn(...args);
  };

  const openSwitchUserModal = (target?: UsuarioPredio) => {
    setSwitchTargetUser(target || null);
    setSwitchIdentifier(
      target ? (target.rut && target.rut !== 'Google Auth' ? target.rut : target.email) : ''
    );
    setSwitchPassword('');
    setSwitchError(null);
    setIsSwitchUserModalOpen(true);
  };

  const handleConfirmSwitchUser = (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError(null);

    const normalizeRut = (str: string) => str.replace(/[\.\s]/g, '').toLowerCase();
    const idNorm = switchIdentifier.trim().toLowerCase();
    const rutNorm = normalizeRut(switchIdentifier);

    const matched = switchTargetUser
      ? usuarios.find((u) => u.id === switchTargetUser.id)
      : usuarios.find((u) => {
          const uRut = normalizeRut(u.rut || '');
          const uEmail = (u.email || '').toLowerCase();
          return (uRut !== '' && uRut === rutNorm) || (uEmail !== '' && uEmail === idNorm);
        });

    if (!matched) {
      setSwitchError('No se encontró ningún usuario con ese RUT o correo.');
      return;
    }

    if (!matched.password) {
      setSwitchError('Esta cuenta inicia sesión únicamente con Google. Cierra sesión e ingresa con Google.');
      return;
    }

    if (matched.password !== switchPassword) {
      setSwitchError('Clave incorrecta. Se requiere la contraseña personal de esa cuenta.');
      return;
    }

    setActiveUserId(matched.id);
    setCurrentUser(matched);
    setPermissionErrorToast(null);
    try {
      sessionStorage.setItem('fundo_session_user', JSON.stringify(matched));
    } catch (err) {}
    setIsSwitchUserModalOpen(false);
    setSwitchTargetUser(null);
    setSwitchPassword('');
  };

  const handleLoginSuccess = (user: UsuarioPredio) => {
    setCurrentUser(user);
    setActiveUserId(user.id);
    setPermissionErrorToast(null);
    try {
      sessionStorage.setItem('fundo_session_user', JSON.stringify(user));
    } catch (e) {}
  };

  const handleGoogleLoginSuccess = async (user: FirebaseUser) => {
    setFirebaseUser(user);
    const mapped = mapFirebaseUserToPredio(user);
    setCurrentUser(mapped);
    setActiveUserId(mapped.id);
    setPermissionErrorToast(null);
    setUsuarios((prev) => {
      if (prev.some((u) => u.id === mapped.id)) return prev;
      return [mapped, ...prev];
    });
    try {
      sessionStorage.setItem('fundo_session_user', JSON.stringify(mapped));
    } catch (e) {}
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setFirebaseUser(null);
    setPermissionErrorToast(null);
    setIsSwitchUserModalOpen(false);
    try {
      sessionStorage.removeItem('fundo_session_user');
    } catch (e) {}
    if (auth.currentUser) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Error cerrando sesión Firebase:', e);
      }
    }
  };

  // Manejo de Órdenes Fitosanitarias con DESCUENTO AUTOMÁTICO INMEDIATO DE TODOS LOS PRODUCTOS
  const handleAddOrden = (nuevaOrden: OrdenTrabajoFitosanitaria) => {
    // 1. Recopilar todos los productos que deben descontarse de la bodega
    const itemsADescontar: { insumoId: string; cantidad: number }[] = [];

    if (nuevaOrden.productos && nuevaOrden.productos.length > 0) {
      for (const prod of nuevaOrden.productos) {
        if (prod.insumoId && prod.totalProductoRequerido > 0) {
          itemsADescontar.push({ insumoId: prod.insumoId, cantidad: prod.totalProductoRequerido });
        }
      }
    } else if (nuevaOrden.insumoId && nuevaOrden.totalProductoRequerido > 0) {
      itemsADescontar.push({ insumoId: nuevaOrden.insumoId, cantidad: nuevaOrden.totalProductoRequerido });
    }

    if (itemsADescontar.length > 0) {
      setInventario((prev) =>
        prev.map((item) => {
          const matched = itemsADescontar.find((d) => d.insumoId === item.id);
          if (matched) {
            const nuevoStock = Math.max(0, Number((item.stockActual - matched.cantidad).toFixed(2)));
            return {
              ...item,
              stockActual: nuevoStock,
              consumoHistoricoAcumulado: Number(((item.consumoHistoricoAcumulado || 0) + matched.cantidad).toFixed(2))
            };
          }
          return item;
        })
      );
    }

    // 2. Guardar orden con marca de stock descontado
    const ordenConDescuento: OrdenTrabajoFitosanitaria = {
      ...nuevaOrden,
      descontadoInventario: true,
      fechaDescuentoBodega: new Date().toISOString().split('T')[0]
    };

    setOrdenesTrabajo((prev) => [ordenConDescuento, ...prev]);
  };

  const handleUpdateOrden = (ordenActualizada: OrdenTrabajoFitosanitaria) => {
    if (!canEdit) {
      notifyPermissionDenied('edit');
      return;
    }
    setOrdenesTrabajo((prev) => prev.map((o) => (o.id === ordenActualizada.id ? ordenActualizada : o)));
  };

  const handleOpenNewLabor = () => {
    if (!canEdit) {
      notifyPermissionDenied('edit');
      return;
    }
    setEditingLabor(null);
    setDefaultParcelaId(undefined);
    setDefaultTipoLabor(undefined);
    setIsLaborModalOpen(true);
  };

  const handleOpenNewLaborWithDefaults = (parcelaId?: string, tipoLabor?: TipoLabor) => {
    if (!canEdit) {
      notifyPermissionDenied('edit');
      return;
    }
    setEditingLabor(null);
    setDefaultParcelaId(parcelaId);
    setDefaultTipoLabor(tipoLabor);
    setIsLaborModalOpen(true);
  };

  const handleEditLabor = (labor: RegistroLabor) => {
    if (!canEdit) {
      notifyPermissionDenied('edit');
      return;
    }
    setEditingLabor(labor);
    setDefaultParcelaId(undefined);
    setDefaultTipoLabor(undefined);
    setIsLaborModalOpen(true);
  };

  const handleSaveLabor = (laborToSave: RegistroLabor) => {
    if (!canEdit) {
      notifyPermissionDenied('edit');
      return;
    }
    // Descuento de stock si aplica a la labor
    if (laborToSave.insumoId && laborToSave.totalInsumoUtilizado) {
      const cantidad = Number(laborToSave.totalInsumoUtilizado);
      setInventario((prev) =>
        prev.map((item) => {
          if (item.id === laborToSave.insumoId) {
            return {
              ...item,
              stockActual: Math.max(0, Number((item.stockActual - cantidad).toFixed(2))),
              consumoHistoricoAcumulado: Number(((item.consumoHistoricoAcumulado || 0) + cantidad).toFixed(2))
            };
          }
          return item;
        })
      );
    }

    setLabores((prev) => {
      const idx = prev.findIndex((l) => l.id === laborToSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = laborToSave;
        return copy;
      }
      return [laborToSave, ...prev];
    });

    setEditingLabor(null);
    setIsLaborModalOpen(false);
  };

  const handleDeleteLabor = (id: string) => {
    if (!canEdit) {
      notifyPermissionDenied('edit');
      return;
    }
    const labor = labores.find((l) => l.id === id);
    if (labor) {
      if (labor.insumoId && labor.totalInsumoUtilizado) {
        const restoreAmount = Number(labor.totalInsumoUtilizado);
        setInventario((prev) => 
          prev.map((item) => {
            if (item.id === labor.insumoId) {
              return {
                ...item,
                stockActual: Number((item.stockActual + restoreAmount).toFixed(2)),
                consumoHistoricoAcumulado: Math.max(0, Number((item.consumoHistoricoAcumulado - restoreAmount).toFixed(2)))
              };
            }
            return item;
          })
        );
      }
      if (labor.registroPozoId) {
        setRegistrosPozo((prev) => prev.filter((r) => r.id !== labor.registroPozoId));
      }
    }
    setLabores((prev) => prev.filter((l) => l.id !== id));
  };

  const handleExecuteReset = () => {
    if (!isAdmin) {
      notifyPermissionDenied('admin');
      return;
    }
    const defaults = resetStorageToDefaults();
    setExplotacion(defaults.explotacion);
    setParcelas(defaults.parcelas);
    setLabores(defaults.labores);
    setInventario(defaults.inventario);
    setRegistrosPozo(defaults.registrosPozo);
    setMaquinarias(defaults.maquinarias);
    setRegistrosMantencion(defaults.registrosMantencion);
    setLugares(defaults.lugares);
    setUsuarios(defaults.usuarios);
    setMuestreosMadurez(defaults.muestreosMadurez);
    setCosechasLote(defaults.cosechasLote);
    setOrdenesTrabajo(defaults.ordenesTrabajo);
    setHorasFrio(defaults.horasFrio);
    setRegistrosTermicos(defaults.registrosTermicos || []);
    setFenologia(defaults.fenologia);
    setPolinizacion(defaults.polinizacion);
    setMuestreosBrotacion(defaults.muestreosBrotacion || []);
    setConteosBotones(defaults.conteosBotones || []);
    setSincroniasFlorales(defaults.sincroniasFlorales || []);
    setAplicacionesPolen(defaults.aplicacionesPolen || []);
    setPlanesCargaRaleo(defaults.planesCargaRaleo || []);
    setEvaluacionesCuajaSemillas(defaults.evaluacionesCuajaSemillas || []);
    setTurnosRiego(defaults.turnosRiego || []);
    setIsResetConfirmOpen(false);
  };

  const handleVaciarDatosMuestra = () => {
    if (!isAdmin) {
      notifyPermissionDenied('admin');
      return;
    }
    // Deja el huerto 100% en blanco para ingresar datos reales (local y en la nube)
    const blank = resetStorageToRealOrchard(explotacion, usuarios);
    setExplotacion(blank.explotacion);
    setParcelas([]);
    setLabores([]);
    setLugares([]);
    setMaquinarias([]);
    setCosechasLote([]);
    setMuestreosMadurez([]);
    setOrdenesTrabajo([]);
    setRegistrosPozo([]);
    setTurnosRiego([]);
    setHorasFrio(blank.horasFrio);
    setRegistrosTermicos([]);
    setFenologia([]);
    setPolinizacion([]);
    setMuestreosBrotacion([]);
    setConteosBotones([]);
    setSincroniasFlorales([]);
    setAplicacionesPolen([]);
    setPlanesCargaRaleo([]);
    setEvaluacionesCuajaSemillas([]);
    setRegistrosMantencion([]);
    setInventario([]); // Limpia la bodega para que no haya alertas de productos no ingresados
    saveStoredSectoresRiego([]);
    try {
      localStorage.setItem('huerto_real_cloud_cleaned_v2', 'true');
    } catch (e) {}
    void persistAllTargets(blank);
    setIsResetConfirmOpen(false);
  };

  const handleUpdateUsuarioSafe = (u: UsuarioPredio) => {
    if (!isAdmin) {
      if (!activeUser || u.id !== activeUser.id) {
        notifyPermissionDenied('admin');
        return;
      }
      // Un usuario no-admin solo puede editar su propia clave/datos, nunca su rol ni nivelAcceso
      const safeUser: UsuarioPredio = {
        ...u,
        rol: activeUser.rol,
        nivelAcceso: activeUser.nivelAcceso,
      };
      setUsuarios((prev) => prev.map((item) => (item.id === safeUser.id ? safeUser : item)));
      setCurrentUser(safeUser);
      try {
        sessionStorage.setItem('fundo_session_user', JSON.stringify(safeUser));
      } catch (e) {}
      return;
    }

    setUsuarios((prev) => prev.map((item) => (item.id === u.id ? u : item)));
    if (activeUser && activeUser.id === u.id) {
      setCurrentUser(u);
      try {
        sessionStorage.setItem('fundo_session_user', JSON.stringify(u));
      } catch (e) {}
    }
  };

  const lowStockCount = inventario.filter((i) => (i.stockMinimo || 0) > 0 && i.stockActual <= (i.stockMinimo || 0)).length;
  
  const lowStockFitoCount = inventario.filter((i) => {
    if (i.categoriaBodega === 'material_riego') return false;
    const isFito = i.categoriaBodega === 'fitosanitario' || i.categoria === 'fitosanitario' || i.categoria === 'fertilizante';
    return isFito && (i.stockMinimo || 0) > 0 && i.stockActual <= (i.stockMinimo || 0);
  }).length;

  const lowStockMaterialesCount = inventario.filter((i) => {
    if (i.categoriaBodega === 'fitosanitario') return false;
    const isMat = i.categoriaBodega === 'material_riego' || (i.categoria && i.categoria !== 'fitosanitario' && i.categoria !== 'fertilizante');
    return isMat && (i.stockMinimo || 0) > 0 && i.stockActual <= (i.stockMinimo || 0);
  }).length;

  const quotaBanner = mapsQuotaExceeded ? (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-950 hover:text-amber-800"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
    </div>
  ) : null;

  // Si no hay usuario logueado en la sesión, renderizar pantalla de Login obligatoria
  if (!currentUser) {
    return (
      <>
        {quotaBanner}
        <LoginView
          usuarios={usuarios}
          onLoginSuccess={handleLoginSuccess}
          onGoogleLoginSuccess={handleGoogleLoginSuccess}
          fundoNombre={explotacion.nombreFundo}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-900 selection:bg-emerald-200 selection:text-emerald-950">
      {quotaBanner}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewLabor={handleOpenNewLabor}
        fundoNombre={explotacion.nombreFundo}
        lowStockCount={lowStockCount}
        lowStockFitoCount={lowStockFitoCount}
        lowStockMaterialesCount={lowStockMaterialesCount}
        onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
        activeUser={activeUser}
        canEdit={canEdit}
        isAdmin={isAdmin}
        onRequestSwitchUser={() => openSwitchUserModal()}
        onLogout={handleLogout}
        syncState={syncState}
        lastSyncTime={lastSyncTime}
        onForceSync={handleForceSync}
        onOpenResetModal={guardAdmin(() => setIsResetConfirmOpen(true))}
      />

      {permissionErrorToast && (
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{permissionErrorToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setPermissionErrorToast(null)}
              className="text-rose-700 hover:text-rose-950 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ErrorBoundary fallbackTab={() => setActiveTab('dashboard')}>
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            explotacion={explotacion}
            parcelas={parcelas}
            labores={labores}
            inventario={inventario}
            registrosPozo={registrosPozo}
            clima={clima}
            horasFrio={normalizarCondicionHorasFrio(horasFrio, registrosTermicos)}
            usuarios={usuarios}
            activeUserId={activeUser?.id || activeUserId}
            canEdit={canEdit}
            isAdmin={isAdmin}
            onOpenNewLaborWithDefaults={handleOpenNewLaborWithDefaults}
            onNavigateTab={setActiveTab}
            onEditExplotacion={guardAdmin(() => setIsExplotacionModalOpen(true))}
            onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
            onEditLabor={handleEditLabor}
            onDeleteLabor={handleDeleteLabor}
          />
        )}

        {activeTab === 'parcelas' && (
          <ParcelasView
            parcelas={parcelas}
            lugares={lugares}
            mapsApiKey={mapsApiKey}
            mapsKeyLoading={mapsKeyLoading}
            mapsKeyError={mapsKeyError}
            onRetryMapsKey={() => void fetchMapsClientConfig(3)}
            defaultCenter={{
              lat: explotacion.latitud ?? -39.628593,
              lng: explotacion.longitud ?? -72.461085,
            }}
            canEdit={canEdit}
            onAddParcela={guardEdit((p) => setParcelas((prev) => [...prev, p]))}
            onUpdateParcela={guardEdit((p) => setParcelas((prev) => prev.map((item) => item.id === p.id ? p : item)))}
            onDeleteParcela={guardEdit((id) => setParcelas((prev) => prev.filter((item) => item.id !== id)))}
            onAddLugar={guardEdit((l) => setLugares((prev) => [...prev, l]))}
            onUpdateLugar={guardEdit((l) => setLugares((prev) => prev.map((item) => item.id === l.id ? l : item)))}
            onDeleteLugar={guardEdit((id) => setLugares((prev) => prev.filter((item) => item.id !== id)))}
            onRegisterLaborForParcela={(pId) => handleOpenNewLaborWithDefaults(pId, undefined)}
          />
        )}

        {activeTab === 'cosecha' && (
          <CosechaMadurezView
            parcelas={parcelas}
            muestreos={muestreosMadurez}
            onAddMuestreo={guardEdit((m) => setMuestreosMadurez((prev) => [m, ...prev]))}
            onDeleteMuestreo={guardEdit((id) => setMuestreosMadurez((prev) => prev.filter((m) => m.id !== id)))}
            cosechas={cosechasLote}
            onAddCosecha={guardEdit((c) => setCosechasLote((prev) => [c, ...prev]))}
            onDeleteCosecha={guardEdit((id) => setCosechasLote((prev) => prev.filter((c) => c.id !== id)))}
            activeUserName={activeUser?.nombre}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'ordenes' && (
          <OrdenesTrabajoView
            ordenes={ordenesTrabajo}
            parcelas={parcelas}
            inventario={inventario}
            usuarios={usuarios}
            activeUser={activeUser}
            canEdit={canEdit}
            onAddOrden={guardEdit(handleAddOrden)}
            onUpdateOrden={handleUpdateOrden}
            onExecuteOrden={guardEdit((ordenId, aplicadorNombre, firma) => {
              setOrdenesTrabajo((prev) =>
                prev.map((o) => o.id === ordenId ? { 
                  ...o, 
                  estado: 'completada', 
                  aplicadorFirma: firma, 
                  aplicadorNombre, 
                  fechaEjecucion: new Date().toISOString().split('T')[0] 
                } : o)
              );
            })}
            onDeleteOrden={guardEdit((id) => setOrdenesTrabajo((prev) => prev.filter((o) => o.id !== id)))}
          />
        )}

        {(activeTab === 'fitosanitarios' || activeTab === 'inventario') && (
          <FitosanitariosView
            inventario={inventario}
            canEdit={canEdit}
            onAddInsumo={guardEdit((i) => setInventario((prev) => [...prev, i]))}
            onUpdateInsumo={guardEdit((i) => setInventario((prev) => prev.map((item) => item.id === i.id ? i : item)))}
            onDeleteInsumo={guardEdit((id) => setInventario((prev) => prev.filter((item) => item.id !== id)))}
          />
        )}

        {activeTab === 'materiales' && (
          <MaterialesRiegoView
            inventario={inventario}
            canEdit={canEdit}
            onAddInsumo={guardEdit((i) => setInventario((prev) => [...prev, i]))}
            onUpdateInsumo={guardEdit((i) => setInventario((prev) => prev.map((item) => item.id === i.id ? i : item)))}
            onDeleteInsumo={guardEdit((id) => setInventario((prev) => prev.filter((item) => item.id !== id)))}
          />
        )}

        {activeTab === 'pozo' && (
          <PozoView
            registrosPozo={registrosPozo}
            canEdit={canEdit}
            onAddRegistroPozo={guardEdit((r) => setRegistrosPozo((prev) => [r, ...prev]))}
            onUpdateRegistroPozo={guardEdit((r) => setRegistrosPozo((prev) => prev.map((item) => item.id === r.id ? r : item)))}
            onDeleteRegistroPozo={guardEdit((id) => setRegistrosPozo((prev) => prev.filter((p) => p.id !== id)))}
          />
        )}

        {activeTab === 'riego' && (
          <RiegoView
            turnosRiego={turnosRiego}
            onAddTurnoRiego={guardEdit((t) => setTurnosRiego((prev) => [t, ...prev]))}
            onUpdateTurnoRiego={guardEdit((t) => setTurnosRiego((prev) => prev.map((item) => item.id === t.id ? t : item)))}
            onDeleteTurnoRiego={guardEdit((id) => setTurnosRiego((prev) => prev.filter((t) => t.id !== id)))}
            parcelas={parcelas}
            clima={clima}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'maquinarias' && (
          <MaquinariasView
            maquinarias={maquinarias}
            registrosMantencion={registrosMantencion}
            canEdit={canEdit}
            onAddMaquinaria={guardEdit((m) => setMaquinarias((prev) => [m, ...prev]))}
            onUpdateMaquinaria={guardEdit((m) => setMaquinarias((prev) => prev.map((item) => item.id === m.id ? m : item)))}
            onDeleteMaquinaria={guardEdit((id) => setMaquinarias((prev) => prev.filter((item) => item.id !== id)))}
            onAddMantencion={guardEdit((reg) => setRegistrosMantencion((prev) => [reg, ...prev]))}
            onDeleteMantencion={guardEdit((id) => setRegistrosMantencion((prev) => prev.filter((item) => item.id !== id)))}
          />
        )}

        {activeTab === 'fenologia' && (
          <HorasFrioFenologiaView
            parcelas={parcelas}
            horasFrio={horasFrio}
            onUpdateHorasFrio={guardEdit(setHorasFrio)}
            registrosTermicos={registrosTermicos}
            onAddRegistroTermico={guardEdit((r) => setRegistrosTermicos((prev) => [r, ...prev]))}
            onUpdateRegistroTermico={guardEdit((r) =>
              setRegistrosTermicos((prev) => prev.map((item) => (item.id === r.id ? r : item)))
            )}
            onDeleteRegistroTermico={guardEdit((id) =>
              setRegistrosTermicos((prev) => prev.filter((item) => item.id !== id))
            )}
            clima={clima}
            fenologia={fenologia}
            onAddFenologia={guardEdit((f) => setFenologia((prev) => [f, ...prev]))}
            onUpdateFenologia={guardEdit((f) => setFenologia((prev) => prev.map((item) => item.id === f.id ? f : item)))}
            onDeleteFenologia={guardEdit((id) => setFenologia((prev) => prev.filter((f) => f.id !== id)))}
            polinizacion={polinizacion}
            onAddPolinizacion={guardEdit((p) => setPolinizacion((prev) => [p, ...prev]))}
            onUpdatePolinizacion={guardEdit((p) => setPolinizacion((prev) => prev.map((item) => item.id === p.id ? p : item)))}
            onDeletePolinizacion={guardEdit((id) => setPolinizacion((prev) => prev.filter((p) => p.id !== id)))}
            activeUserName={activeUser?.nombre}
            canEdit={canEdit}
          />
        )}

        {(activeTab === 'brotacion' || activeTab === 'botones' || activeTab === 'polinizacion' || activeTab === 'carga_raleo' || activeTab === 'cuaja_semillas') && (
          <PolinizacionFloracionView
            initialTab={
              activeTab === 'brotacion'
                ? 'brotacion'
                : activeTab === 'botones'
                ? 'botones'
                : activeTab === 'carga_raleo'
                ? 'carga_raleo'
                : activeTab === 'cuaja_semillas'
                ? 'cuaja_semillas'
                : 'colmenas'
            }
            parcelas={parcelas}
            muestreosBrotacion={muestreosBrotacion}
            onAddMuestreoBrotacion={guardEdit((m) => setMuestreosBrotacion((prev) => [m, ...prev]))}
            onUpdateMuestreoBrotacion={guardEdit((m) => setMuestreosBrotacion((prev) => prev.map((item) => (item.id === m.id ? m : item))))}
            onDeleteMuestreoBrotacion={guardEdit((id) => setMuestreosBrotacion((prev) => prev.filter((m) => m.id !== id)))}
            conteosBotones={conteosBotones}
            onAddConteoBotones={guardEdit((c) => setConteosBotones((prev) => [c, ...prev]))}
            onUpdateConteoBotones={guardEdit((c) => setConteosBotones((prev) => prev.map((item) => (item.id === c.id ? c : item))))}
            onDeleteConteoBotones={guardEdit((id) => setConteosBotones((prev) => prev.filter((c) => c.id !== id)))}
            sincroniasFlorales={sincroniasFlorales}
            onAddSincroniaFloral={guardEdit((s) => setSincroniasFlorales((prev) => [s, ...prev]))}
            onUpdateSincroniaFloral={guardEdit((s) => setSincroniasFlorales((prev) => prev.map((item) => (item.id === s.id ? s : item))))}
            onDeleteSincroniaFloral={guardEdit((id) => setSincroniasFlorales((prev) => prev.filter((s) => s.id !== id)))}
            aplicacionesPolen={aplicacionesPolen}
            onAddAplicacionPolen={guardEdit((a) => setAplicacionesPolen((prev) => [a, ...prev]))}
            onUpdateAplicacionPolen={guardEdit((a) => setAplicacionesPolen((prev) => prev.map((item) => (item.id === a.id ? a : item))))}
            onDeleteAplicacionPolen={guardEdit((id) => setAplicacionesPolen((prev) => prev.filter((a) => a.id !== id)))}
            planesCargaRaleo={planesCargaRaleo}
            onAddPlanCargaRaleo={guardEdit((p) => setPlanesCargaRaleo((prev) => [p, ...prev]))}
            onUpdatePlanCargaRaleo={guardEdit((p) => setPlanesCargaRaleo((prev) => prev.map((item) => (item.id === p.id ? p : item))))}
            onDeletePlanCargaRaleo={guardEdit((id) => setPlanesCargaRaleo((prev) => prev.filter((p) => p.id !== id)))}
            evaluacionesCuajaSemillas={evaluacionesCuajaSemillas}
            onAddEvaluacionCuajaSemillas={guardEdit((e) => setEvaluacionesCuajaSemillas((prev) => [e, ...prev]))}
            onUpdateEvaluacionCuajaSemillas={guardEdit((e) => setEvaluacionesCuajaSemillas((prev) => prev.map((item) => (item.id === e.id ? e : item))))}
            onDeleteEvaluacionCuajaSemillas={guardEdit((id) => setEvaluacionesCuajaSemillas((prev) => prev.filter((e) => e.id !== id)))}
            activeUserName={activeUser?.nombre}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'labores' && (
          <LaboresView
            labores={labores}
            parcelas={parcelas}
            canEdit={canEdit}
            onOpenNewLabor={handleOpenNewLabor}
            onEditLabor={handleEditLabor}
            onDeleteLabor={handleDeleteLabor}
          />
        )}

        {activeTab === 'clima' && (
          <ClimaView
            clima={clima}
            onUpdateClima={guardEdit(setClima)}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'monitoreo' && (
          <MonitoreoView
            labores={labores}
            parcelas={parcelas}
            canEdit={canEdit}
            onOpenNewLaborWithDefaults={handleOpenNewLaborWithDefaults}
            onSaveQuickObservation={handleSaveLabor}
          />
        )}

        {activeTab === 'calculadora' && (
          <CalculadoraView
            etoClimaActual={clima?.evapotranspiracionEtoMmDia}
            horasFrio={normalizarCondicionHorasFrio(horasFrio, registrosTermicos)}
            tempMinActual={clima?.tempMinima}
            tempMaxActual={clima?.tempMaxima}
          />
        )}

        {activeTab === 'informe' && (
          <InformeOficialView
            explotacion={explotacion}
            parcelas={parcelas}
            labores={labores}
            horasFrio={normalizarCondicionHorasFrio(horasFrio, registrosTermicos)}
            isAdmin={isAdmin}
            onImportJSON={guardAdmin((e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const parsed = JSON.parse(event.target?.result as string);
                    if (parsed.explotacion) setExplotacion(parsed.explotacion);
                    if (parsed.parcelas) setParcelas(parsed.parcelas);
                    if (parsed.labores) setLabores(parsed.labores);
                    if (parsed.inventario) setInventario(parsed.inventario);
                    if (parsed.registrosPozo) setRegistrosPozo(parsed.registrosPozo);
                    if (parsed.maquinarias) setMaquinarias(parsed.maquinarias);
                    if (parsed.registrosMantencion) setRegistrosMantencion(parsed.registrosMantencion);
                    if (parsed.lugares) setLugares(parsed.lugares);
                    if (parsed.usuarios) setUsuarios(parsed.usuarios);
                    if (parsed.muestreosMadurez) setMuestreosMadurez(parsed.muestreosMadurez);
                    if (parsed.cosechasLote) setCosechasLote(parsed.cosechasLote);
                    if (parsed.ordenesTrabajo) setOrdenesTrabajo(parsed.ordenesTrabajo);
                    const importedRegs = Array.isArray(parsed.registrosTermicos) ? parsed.registrosTermicos : registrosTermicos;
                    if (Array.isArray(parsed.registrosTermicos)) setRegistrosTermicos(parsed.registrosTermicos);
                    if (parsed.horasFrio) setHorasFrio(normalizarCondicionHorasFrio(parsed.horasFrio, importedRegs));
                    if (parsed.fenologia) setFenologia(parsed.fenologia);
                    if (parsed.polinizacion) setPolinizacion(parsed.polinizacion);
                  } catch (err) {
                    console.error('Error importando', err);
                  }
                };
                reader.readAsText(file);
              }
            })}
          />
        )}

        {activeTab === 'usuarios' && (
          <UsuariosView
            usuarios={usuarios}
            currentUser={activeUser}
            activeUserId={activeUser?.id || activeUserId}
            fundoNombre={explotacion.nombreFundo}
            onRequestSwitchUser={openSwitchUserModal}
            onAddUsuario={guardAdmin((u) => setUsuarios((prev) => [...prev, u]))}
            onUpdateUsuario={handleUpdateUsuarioSafe}
            onDeleteUsuario={guardAdmin((id) => setUsuarios((prev) => prev.filter((item) => item.id !== id)))}
          />
        )}
      </main>
      </ErrorBoundary>

      {/* Modales Globales */}
      {canEdit && (
        <ModalLabor
          isOpen={isLaborModalOpen}
          onClose={() => {
            setIsLaborModalOpen(false);
            setEditingLabor(null);
          }}
          onSave={handleSaveLabor}
          parcelas={parcelas}
          inventario={inventario}
          climaActual={clima}
          usuarios={usuarios}
          activeUserId={activeUser?.id || activeUserId}
          initialLabor={editingLabor}
          defaultParcelaId={defaultParcelaId}
          defaultTipoLabor={defaultTipoLabor}
        />
      )}

      {isAdmin && (
        <ModalExplotacion
          isOpen={isExplotacionModalOpen}
          onClose={() => setIsExplotacionModalOpen(false)}
          explotacion={explotacion}
          onSave={guardAdmin(setExplotacion)}
        />
      )}

      <AlertasStockModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        inventario={inventario}
        canEdit={canEdit}
        isAdmin={isAdmin}
        onUpdateInsumo={guardEdit((updated) => {
          setInventario((prev) =>
            prev.map((i) => (i.id === updated.id ? updated : i))
          );
        })}
        onDeleteInsumo={guardEdit((id) => {
          setInventario((prev) => prev.filter((i) => i.id !== id));
        })}
        onClearInventario={guardAdmin(() => {
          setInventario([]);
        })}
        onNavigateToInventario={() => {
          setIsAlertsModalOpen(false);
          setActiveTab('fitosanitarios');
        }}
      />

      {/* Modal Seguro de Cambio de Cuenta (Exige Contraseña Obligatoria) */}
      {isSwitchUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Cambiar de Usuario (Verificación de Clave)</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSwitchUserModalOpen(false);
                  setSwitchTargetUser(null);
                  setSwitchPassword('');
                  setSwitchError(null);
                }}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSwitchUser} className="p-5 space-y-3.5 text-xs">
              {switchTargetUser ? (
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-stone-500">Cuenta Seleccionada</div>
                  <div className="font-bold text-sm text-stone-900">{switchTargetUser.nombre}</div>
                  <div className="text-[11px] text-stone-600 flex items-center gap-2">
                    <span>{getRolLabel(switchTargetUser.rol)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getNivelAccesoMeta(getNivelAcceso(switchTargetUser)).badgeClass}`}>
                      {getNivelAccesoMeta(getNivelAcceso(switchTargetUser)).shortLabel}
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">RUT o Correo del Usuario:</label>
                  <input
                    type="text"
                    value={switchIdentifier}
                    onChange={(e) => setSwitchIdentifier(e.target.value)}
                    placeholder="Ej. 12.845.219-4 o usuario@fundolacabana.cl"
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Código o Clave Personal Obligatoria:</span>
                </label>
                <input
                  type="password"
                  value={switchPassword}
                  onChange={(e) => setSwitchPassword(e.target.value)}
                  placeholder="Ingresa la contraseña de la cuenta..."
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                  autoFocus
                />
              </div>

              {switchError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{switchError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSwitchUserModalOpen(false);
                    setSwitchTargetUser(null);
                    setSwitchPassword('');
                    setSwitchError(null);
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-50 cursor-pointer font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
                >
                  Verificar e Ingresar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Opciones de Reinicio / Huerto en Blanco (Solo Administrador) */}
      {isAdmin && isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">Gestión de Datos del Huerto</h3>
              </div>
              <button onClick={() => setIsResetConfirmOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-stone-600">
                Selecciona cómo deseas configurar la base de datos de tu huerto:
              </p>

              {/* Opción 1: Iniciar Huerto en Blanco (Sin datos ficticios) */}
              <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                    🌱 Iniciar Huerto en Blanco (100% Real)
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-700 text-white font-bold">
                    Recomendado
                  </span>
                </div>
                <p className="text-emerald-900 text-[11px] leading-relaxed">
                  Elimina todos los cuarteles, labores, cosechas y órdenes de muestra ficticios. Te permite registrar desde cero tus cuarteles reales, variedades, densidades y faenas.
                </p>
                <button
                  type="button"
                  onClick={handleVaciarDatosMuestra}
                  className="w-full mt-2 py-2 px-3 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  Vaciar Datos Ficticios e Iniciar Huerto Real
                </button>
              </div>

              {/* Opción 2: Restaurar Valores de Fábrica */}
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-1.5">
                <span className="font-bold text-stone-800 text-xs">
                  🔄 Restaurar Datos de Demostración (Fundo La Cabaña)
                </span>
                <p className="text-stone-500 text-[11px] leading-relaxed">
                  Recarga los 4 cuarteles de ejemplo, mediciones SAG y recetas demostrativas.
                </p>
                <button
                  type="button"
                  onClick={handleExecuteReset}
                  className="w-full mt-1 py-1.5 px-3 border border-stone-300 hover:bg-stone-100 text-stone-700 font-medium rounded-lg cursor-pointer transition-colors"
                >
                  Cargar Datos de Muestra de Fábrica
                </button>
              </div>

              <div className="flex justify-end pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-4 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
