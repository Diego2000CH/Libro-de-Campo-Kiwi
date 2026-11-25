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
import { ControlHeladasView } from './components/ControlHeladasView';
import { MonitoreoView } from './components/MonitoreoView';
import { CalculadoraView } from './components/CalculadoraView';
import { InformeOficialView } from './components/InformeOficialView';
import { UsuariosView } from './components/UsuariosView';
import { LoginView } from './components/LoginView';
import { ModalLabor } from './components/ModalLabor';
import { ModalExplotacion } from './components/ModalExplotacion';
import { AlertasStockModal } from './components/AlertasStockModal';
import { PolinizacionFloracionView } from './components/PolinizacionFloracionView';
import { LaboratorioView } from './components/LaboratorioView';
import { CumplimientoAuditoriaView } from './components/CumplimientoAuditoriaView';
import { PlanificacionTemporadasView } from './components/PlanificacionTemporadasView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  generarAlertasProactivasHuerto,
  isInsumoStockBajoActivo,
} from './utils/alertasHuerto';

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
  getStoredEstadosFenologicosPersonalizados,
  getStoredPolinizacion, 
  getStoredTurnosRiego,
  getStoredEventualidades,
  getStoredControlesHelada,
  getStoredConfigControlHeladas,
  getDefaultConfigControlHeladas,
  normalizeConfigControlHeladas,
  getStoredConfigAlertaUv,
  getDefaultConfigAlertaUv,
  normalizeConfigAlertaUv,
  getStoredMuestreosBrotacion,
  getStoredConteosBotones,
  getStoredSincroniasFlorales,
  getStoredAplicacionesPolen,
  getStoredPlanesCargaRaleo,
  getStoredEvaluacionesCuajaSemillas,
  getStoredLiquidacionesPacking,
  getStoredAnalisisLaboratorio,
  getStoredRegistrosEnvases,
  getStoredCalibracionesEquipo,
  getStoredAuditoriaManual,
  getStoredPlanillaBpa,
  createBlankPlanillaBpa,
  normalizePlanillaBpa,
  getStoredTareasHuerto,
  getStoredResumenesTemporada,
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
  EstadoFenologicoCatalogo,
  RegistroPolinizacion,
  MuestreoBrotacion,
  ConteoBotonesFlorales,
  SincroniaFloral,
  AplicacionPolenAsistido,
  PlanCargaRaleo,
  EvaluacionCuajaSemillas,
  TurnoRiego,
  EventualidadHuerto,
  ControlHeladaRegistro,
  ConfigControlHeladas,
  ConfigAlertaUv,
  NotificacionUv,
  LiquidacionPacking,
  AnalisisLaboratorio,
  RegistroEnvaseLimpio,
  CalibracionEquipo,
  TareaAgronomica,
  ResumenTemporada,
  PlanillaAuditoriaBPA,
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
import {
  HELADAS_CONFIG,
  buildNotificacionHelada,
  evaluarRiesgoSensorHelada,
  shouldDispatchAutoFrostNotification,
} from './config/heladasConfig';
import {
  broadcastFrostNotification,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserFrostNotification,
  subscribeFrostBroadcast,
} from './utils/notificacionesHelada';
import {
  buildNotificacionUv,
  fetchGeoreferencedUvForecast,
  resolveOrchardGeoLocation,
  sendMobileUvNotification,
  sendServerTestUvPush,
  shouldTriggerDailyUvAlert,
  subscribeDeviceToWebPush,
} from './utils/uvAlertas';
import { BellRing, Check, KeyRound, Lock, RotateCcw, ShieldAlert, Snowflake, Sun, X } from 'lucide-react';

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
  const [estadosFenologicosCustom, setEstadosFenologicosCustom] = useState<EstadoFenologicoCatalogo[]>(
    getStoredEstadosFenologicosPersonalizados
  );
  const [polinizacion, setPolinizacion] = useState<RegistroPolinizacion[]>(getStoredPolinizacion);
  const [turnosRiego, setTurnosRiego] = useState<TurnoRiego[]>(getStoredTurnosRiego);
  const [eventualidades, setEventualidades] = useState<EventualidadHuerto[]>(getStoredEventualidades);
  const [controlesHelada, setControlesHelada] = useState<ControlHeladaRegistro[]>(getStoredControlesHelada);
  const [configControlHeladas, setConfigControlHeladas] = useState<ConfigControlHeladas>(
    getStoredConfigControlHeladas
  );
  const [alertaUvConfig, setAlertaUvConfig] = useState<ConfigAlertaUv>(
    getStoredConfigAlertaUv
  );
  const [muestreosBrotacion, setMuestreosBrotacion] = useState<MuestreoBrotacion[]>(getStoredMuestreosBrotacion);
  const [conteosBotones, setConteosBotones] = useState<ConteoBotonesFlorales[]>(getStoredConteosBotones);
  const [sincroniasFlorales, setSincroniasFlorales] = useState<SincroniaFloral[]>(getStoredSincroniasFlorales);
  const [aplicacionesPolen, setAplicacionesPolen] = useState<AplicacionPolenAsistido[]>(getStoredAplicacionesPolen);
  const [planesCargaRaleo, setPlanesCargaRaleo] = useState<PlanCargaRaleo[]>(getStoredPlanesCargaRaleo);
  const [evaluacionesCuajaSemillas, setEvaluacionesCuajaSemillas] = useState<EvaluacionCuajaSemillas[]>(getStoredEvaluacionesCuajaSemillas);
  const [liquidacionesPacking, setLiquidacionesPacking] = useState<LiquidacionPacking[]>(getStoredLiquidacionesPacking);
  const [analisisLaboratorio, setAnalisisLaboratorio] = useState<AnalisisLaboratorio[]>(getStoredAnalisisLaboratorio);
  const [registrosEnvases, setRegistrosEnvases] = useState<RegistroEnvaseLimpio[]>(getStoredRegistrosEnvases);
  const [calibracionesEquipo, setCalibracionesEquipo] = useState<CalibracionEquipo[]>(getStoredCalibracionesEquipo);
  const [auditoriaManual, setAuditoriaManual] = useState<Record<string, boolean>>(getStoredAuditoriaManual);
  const [planillaBpa, setPlanillaBpa] = useState<PlanillaAuditoriaBPA>(getStoredPlanillaBpa);
  const [tareasHuerto, setTareasHuerto] = useState<TareaAgronomica[]>(getStoredTareasHuerto);
  const [resumenesTemporada, setResumenesTemporada] = useState<ResumenTemporada[]>(getStoredResumenesTemporada);
  const [pendingOfflineSync, setPendingOfflineSync] = useState<boolean>(false);

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
    estadosFenologicosPersonalizados: estadosFenologicosCustom,
    polinizacion,
    muestreosBrotacion,
    conteosBotones,
    sincroniasFlorales,
    aplicacionesPolen,
    planesCargaRaleo,
    evaluacionesCuajaSemillas,
    turnosRiego,
    clima,
    eventualidades,
    controlesHelada,
    configControlHeladas,
    alertaUvConfig,
    liquidacionesPacking,
    analisisLaboratorio,
    registrosEnvases,
    calibracionesEquipo,
    auditoriaManual,
    planillaBpa,
    tareasHuerto,
    resumenesTemporada,
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
    if (Array.isArray(d.estadosFenologicosPersonalizados)) setEstadosFenologicosCustom(d.estadosFenologicosPersonalizados);
    if (Array.isArray(d.polinizacion)) setPolinizacion(d.polinizacion);
    if (Array.isArray(d.muestreosBrotacion)) setMuestreosBrotacion(d.muestreosBrotacion);
    if (Array.isArray(d.conteosBotones)) setConteosBotones(d.conteosBotones);
    if (Array.isArray(d.sincroniasFlorales)) setSincroniasFlorales(d.sincroniasFlorales);
    if (Array.isArray(d.aplicacionesPolen)) setAplicacionesPolen(d.aplicacionesPolen);
    if (Array.isArray(d.planesCargaRaleo)) setPlanesCargaRaleo(d.planesCargaRaleo);
    if (Array.isArray(d.evaluacionesCuajaSemillas)) setEvaluacionesCuajaSemillas(d.evaluacionesCuajaSemillas);
    if (Array.isArray(d.turnosRiego)) setTurnosRiego(d.turnosRiego);
    if (d.clima) setClima(d.clima);
    if (Array.isArray(d.eventualidades)) setEventualidades(d.eventualidades);
    if (Array.isArray(d.controlesHelada)) setControlesHelada(d.controlesHelada);
    if (d.configControlHeladas && typeof d.configControlHeladas === 'object') {
      setConfigControlHeladas(normalizeConfigControlHeladas(d.configControlHeladas));
    }
    if (d.alertaUvConfig && typeof d.alertaUvConfig === 'object') {
      setAlertaUvConfig(normalizeConfigAlertaUv(d.alertaUvConfig));
    }
    if (Array.isArray(d.liquidacionesPacking)) setLiquidacionesPacking(d.liquidacionesPacking);
    if (Array.isArray(d.analisisLaboratorio)) setAnalisisLaboratorio(d.analisisLaboratorio);
    if (Array.isArray(d.registrosEnvases)) setRegistrosEnvases(d.registrosEnvases);
    if (Array.isArray(d.calibracionesEquipo)) setCalibracionesEquipo(d.calibracionesEquipo);
    if (d.auditoriaManual && typeof d.auditoriaManual === 'object') setAuditoriaManual(d.auditoriaManual);
    if (d.planillaBpa && typeof d.planillaBpa === 'object') setPlanillaBpa(normalizePlanillaBpa(d.planillaBpa));
    if (Array.isArray(d.tareasHuerto)) setTareasHuerto(d.tareasHuerto);
    if (Array.isArray(d.resumenesTemporada)) setResumenesTemporada(d.resumenesTemporada);
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

  // Monitoreo de red del navegador (Offline / Online) con auto-sincronización al volver la señal
  useEffect(() => {
    const onOffline = () => setSyncState('offline');
    const onOnline = () => {
      setSyncState((prev) => (prev === 'offline' ? 'idle' : prev));
      if (!mapsApiKey) {
        void fetchMapsClientConfig(4);
      }
      if (pendingOfflineSync) {
        void handleForceSync();
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [mapsApiKey, pendingOfflineSync]);

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
      setPendingOfflineSync(true);
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

  // Auto-sincronización periódica con estación meteorológica local (si está habilitada)
  useEffect(() => {
    const cfg = explotacion.estacionMeteoConfig;
    if (!cfg?.habilitada || !cfg?.autoSincronizar || !cfg.codigoEstacion) return;
    const cleanCode = cfg.codigoEstacion.trim();
    if (!/^[a-zA-Z0-9_-]{3,48}$/.test(cleanCode)) return;

    let cancelled = false;
    const pollStation = async () => {
      try {
        const res = await fetch('/api/weather-station/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stationCode: cleanCode,
            provider: cfg.proveedor,
            stationName: cfg.estacionNombre,
          }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data?.reading?.clima && !cancelled) {
          setClima((prev) => ({
            ...prev,
            ...data.reading.clima,
            indiceUvActual: data.reading.clima.indiceUvActual ?? prev.indiceUvActual,
            indiceUvMaximo: prev.indiceUvMaximo,
            nivelRiesgoUv: prev.nivelRiesgoUv,
            horaPicoUv: prev.horaPicoUv,
          }));
        }
      } catch {
        // Silencioso en segundo plano
      }
    };

    void pollStation();
    const intervalId = window.setInterval(pollStation, 180000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    explotacion.estacionMeteoConfig?.habilitada,
    explotacion.estacionMeteoConfig?.autoSincronizar,
    explotacion.estacionMeteoConfig?.codigoEstacion,
    explotacion.estacionMeteoConfig?.proveedor,
    explotacion.estacionMeteoConfig?.estacionNombre,
  ]);

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
    estadosFenologicosCustom,
    polinizacion,
    muestreosBrotacion,
    conteosBotones,
    sincroniasFlorales,
    aplicacionesPolen,
    planesCargaRaleo,
    evaluacionesCuajaSemillas,
    turnosRiego,
    clima,
    eventualidades,
    controlesHelada,
    configControlHeladas,
    alertaUvConfig,
    liquidacionesPacking,
    analisisLaboratorio,
    registrosEnvases,
    calibracionesEquipo,
    auditoriaManual,
    planillaBpa,
    tareasHuerto,
    resumenesTemporada
  ]);

  // Forzar sincronización manual
  const handleForceSync = async () => {
    setSyncState(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'saving');
    const fullData = buildFullStateData();
    const status = await persistAllTargets(fullData);
    setSyncState(status);
    if (status === 'synced') {
      setPendingOfflineSync(false);
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

  const handleAddEstadoFenologicoCustom = guardEdit((item: EstadoFenologicoCatalogo) => {
    setEstadosFenologicosCustom((prev) => {
      const dup = prev.some(
        (e) =>
          e.nombre.trim().toLowerCase() === item.nombre.trim().toLowerCase() &&
          e.code.trim().toLowerCase() === item.code.trim().toLowerCase()
      );
      return dup ? prev : [...prev, item];
    });
  });

  const handleDeleteEstadoFenologicoCustom = guardEdit((id: string) => {
    setEstadosFenologicosCustom((prev) => prev.filter((item) => item.id !== id));
  });

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
      setSwitchError('Esta cuenta no tiene clave asignada. Solicita una clave al Administrador.');
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
    setEstadosFenologicosCustom([]);
    setPolinizacion(defaults.polinizacion);
    setMuestreosBrotacion(defaults.muestreosBrotacion || []);
    setConteosBotones(defaults.conteosBotones || []);
    setSincroniasFlorales(defaults.sincroniasFlorales || []);
    setAplicacionesPolen(defaults.aplicacionesPolen || []);
    setPlanesCargaRaleo(defaults.planesCargaRaleo || []);
    setEvaluacionesCuajaSemillas(defaults.evaluacionesCuajaSemillas || []);
    setTurnosRiego(defaults.turnosRiego || []);
    setEventualidades([]);
    setControlesHelada([]);
    setConfigControlHeladas(getDefaultConfigControlHeladas());
    setAlertaUvConfig(getDefaultConfigAlertaUv());
    setLiquidacionesPacking([]);
    setAnalisisLaboratorio([]);
    setRegistrosEnvases([]);
    setCalibracionesEquipo([]);
    setAuditoriaManual({});
    setPlanillaBpa(createBlankPlanillaBpa());
    setTareasHuerto([]);
    setResumenesTemporada([]);
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
    setEventualidades([]);
    setControlesHelada([]);
    setConfigControlHeladas(getDefaultConfigControlHeladas());
    setAlertaUvConfig(getDefaultConfigAlertaUv());
    setHorasFrio(blank.horasFrio);
    setRegistrosTermicos([]);
    setFenologia([]);
    setEstadosFenologicosCustom([]);
    setPolinizacion([]);
    setMuestreosBrotacion([]);
    setConteosBotones([]);
    setSincroniasFlorales([]);
    setAplicacionesPolen([]);
    setPlanesCargaRaleo([]);
    setEvaluacionesCuajaSemillas([]);
    setRegistrosMantencion([]);
    setInventario([]); // Limpia la bodega para que no haya alertas de productos no ingresados
    setLiquidacionesPacking([]);
    setAnalisisLaboratorio([]);
    setRegistrosEnvases([]);
    setCalibracionesEquipo([]);
    setAuditoriaManual({});
    setPlanillaBpa(createBlankPlanillaBpa());
    setTareasHuerto([]);
    setResumenesTemporada([]);
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

  const handleUpdateInsumoSafe = guardEdit((updated: InsumoInventario) => {
    const normalized: InsumoInventario =
      (updated.stockMinimo || 0) > 0 && (updated.stockActual || 0) > (updated.stockMinimo || 0)
        ? { ...updated, alertaStockOculta: false }
        : updated;
    setInventario((prev) => prev.map((i) => (i.id === normalized.id ? normalized : i)));
  });

  const handleDismissLowStockAlert = guardEdit((insumoId: string) => {
    setInventario((prev) =>
      prev.map((i) => (i.id === insumoId ? { ...i, alertaStockOculta: true } : i))
    );
  });

  const handleDismissAllLowStockAlerts = guardEdit((insumoIds: string[]) => {
    const idSet = new Set(insumoIds);
    setInventario((prev) =>
      prev.map((i) => (idSet.has(i.id) ? { ...i, alertaStockOculta: true } : i))
    );
  });

  const handleRestoreLowStockAlert = guardEdit((insumoId: string) => {
    setInventario((prev) =>
      prev.map((i) => (i.id === insumoId ? { ...i, alertaStockOculta: false } : i))
    );
  });

  const handleRestoreAllLowStockAlerts = guardEdit(() => {
    setInventario((prev) =>
      prev.map((i) => (i.alertaStockOculta ? { ...i, alertaStockOculta: false } : i))
    );
  });

  const lowStockCount = inventario.filter(isInsumoStockBajoActivo).length;

  const lowStockFitoCount = inventario.filter((i) => {
    if (i.categoriaBodega === 'material_riego') return false;
    const isFito =
      i.categoriaBodega === 'fitosanitario' ||
      i.categoria === 'fitosanitario' ||
      i.categoria === 'fertilizante';
    return isFito && isInsumoStockBajoActivo(i);
  }).length;

  const lowStockMaterialesCount = inventario.filter((i) => {
    if (i.categoriaBodega === 'fitosanitario') return false;
    const isMat =
      i.categoriaBodega === 'material_riego' ||
      (i.categoria && i.categoria !== 'fitosanitario' && i.categoria !== 'fertilizante');
    return Boolean(isMat) && isInsumoStockBajoActivo(i);
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

  const alertasProactivas = React.useMemo(
    () =>
      generarAlertasProactivasHuerto({
        inventario,
        usuarios,
        maquinarias,
        calibracionesEquipo,
        analisisLaboratorio,
        parcelas,
        tareasHuerto,
      }),
    [inventario, usuarios, maquinarias, calibracionesEquipo, analisisLaboratorio, parcelas, tareasHuerto]
  );

  const evalSensorGlobal = React.useMemo(
    () => evaluarRiesgoSensorHelada(clima, configControlHeladas),
    [clima, configControlHeladas]
  );

  const lastAutoFrostDispatchRef = useRef<string>('');
  const [liveBroadcastAlert, setLiveBroadcastAlert] = useState<string | null>(null);

  useEffect(() => {
    return subscribeFrostBroadcast((notif) => {
      setLiveBroadcastAlert(notif.titulo);
    });
  }, []);

  useEffect(() => {
    if (!isLoadedInitially) return;
    if (!shouldDispatchAutoFrostNotification(evalSensorGlobal, configControlHeladas)) return;

    const triggerKey = `${evalSensorGlobal.disparadoPor}-${evalSensorGlobal.tempSensorC.toFixed(1)}-${evalSensorGlobal.umbralCriticoC.toFixed(1)}`;
    if (lastAutoFrostDispatchRef.current === triggerKey) return;
    lastAutoFrostDispatchRef.current = triggerKey;

    const notifCfg = configControlHeladas.notificacionesProactivas || HELADAS_CONFIG.notificacionesProactivas;
    const canales: string[] = ['Panel Huerto & Nube', 'Canal Multi-Pestaña'];
    if (notifCfg.pushNavegadorHabilitado && getBrowserNotificationPermission() === 'granted') {
      canales.push('Push Navegador');
    }

    const nuevaNotif = buildNotificacionHelada({
      tipo:
        evalSensorGlobal.disparadoPor === 'bulbo_humedo'
          ? 'umbral_bulbo_humedo'
          : 'umbral_critico_sensor',
      evalSensor: evalSensorGlobal,
      clima,
      config: configControlHeladas,
      usuarios,
      emitidoPor: 'Monitor Automático Sensor Heladas',
      canales,
    });

    setConfigControlHeladas((prev) => ({
      ...prev,
      historialNotificaciones: [nuevaNotif, ...(prev.historialNotificaciones || [])].slice(0, 40),
    }));

    broadcastFrostNotification(nuevaNotif);
    if (notifCfg.pushNavegadorHabilitado) {
      void sendBrowserFrostNotification(nuevaNotif, explotacion.nombreFundo);
    }
  }, [isLoadedInitially, evalSensorGlobal, clima, configControlHeladas, usuarios, explotacion.nombreFundo]);

  const handleAcknowledgeNotificacionHelada = (notificacionId: string) => {
    if (!activeUser) return;
    const nowIso = new Date().toISOString();
    setConfigControlHeladas((prev) => ({
      ...prev,
      historialNotificaciones: (prev.historialNotificaciones || []).map((notif) =>
        notif.id !== notificacionId
          ? notif
          : {
              ...notif,
              destinatarios: notif.destinatarios.map((d) =>
                d.usuarioId === activeUser.id
                  ? { ...d, estadoEntrega: 'leida', fechaLecturaIso: nowIso }
                  : d
              ),
            }
      ),
    }));
  };

  const unreadFrostNotifForUser = React.useMemo(() => {
    if (!activeUser) return null;
    const hist = configControlHeladas.historialNotificaciones || [];
    return (
      hist.find((n) =>
        n.destinatarios.some((d) => d.usuarioId === activeUser.id && d.estadoEntrega !== 'leida')
      ) || null
    );
  }, [configControlHeladas.historialNotificaciones, activeUser]);

  // Monitor Diario 08:00 AM de Radiación UV Georreferenciada
  const uvDispatchLockRef = useRef<string>('');
  const [unreadUvNotif, setUnreadUvNotif] = useState<NotificacionUv | null>(null);

  useEffect(() => {
    const todayIso = new Date().toISOString().split('T')[0];
    const pendingToday = (alertaUvConfig.historialUv || []).find(
      (n) => n.fechaLocal === todayIso && !n.leida
    );
    if (pendingToday) {
      setUnreadUvNotif(pendingToday);
    }
  }, [alertaUvConfig.historialUv]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('fundo_uv_alerts');
    channel.onmessage = (event) => {
      if (event.data && event.data.id) {
        setUnreadUvNotif(event.data as NotificacionUv);
      }
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (!isLoadedInitially || !alertaUvConfig.habilitada) return;
    if (alertaUvConfig.notificarTodosUsuarios === false && !isAdmin) return;

    let cancelled = false;

    const checkAndDispatchUvAlert = async () => {
      try {
        const ubicacion = resolveOrchardGeoLocation(explotacion, parcelas, alertaUvConfig);
        const forecast = await fetchGeoreferencedUvForecast(ubicacion.lat, ubicacion.lng);
        if (cancelled) return;

        setClima((prev) => {
          if (
            prev.indiceUvActual === forecast.uvActual &&
            prev.indiceUvMaximo === forecast.uvMaximoDia &&
            prev.nivelRiesgoUv === forecast.nivelRiesgo &&
            prev.horaPicoUv === forecast.horaPicoUv
          ) {
            return prev;
          }
          return {
            ...prev,
            indiceUvActual: forecast.uvActual,
            indiceUvMaximo: forecast.uvMaximoDia,
            nivelRiesgoUv: forecast.nivelRiesgo,
            horaPicoUv: forecast.horaPicoUv,
          };
        });

        if (
          !shouldTriggerDailyUvAlert(
            alertaUvConfig,
            forecast.fechaLocal,
            forecast.horaLocalActual,
            forecast.uvMaximoDia
          )
        ) {
          return;
        }

        if (uvDispatchLockRef.current === forecast.fechaLocal) return;
        uvDispatchLockRef.current = forecast.fechaLocal;

        const canales: string[] = ['Panel Huerto & Nube'];
        if (
          alertaUvConfig.pushCelularHabilitado !== false &&
          getBrowserNotificationPermission() === 'granted'
        ) {
          canales.push('Notificación Celular');
        }
        if ((alertaUvConfig.pushSubscriptions || []).length > 0) {
          canales.push('Web Push Segundo Plano');
        }

        const notif = buildNotificacionUv({
          forecast,
          ubicacion,
          horaProgramada: alertaUvConfig.horaEnvio || '08:00',
          canales,
        });

        setAlertaUvConfig((prev) => {
          if (prev.ultimaAlertaFecha === forecast.fechaLocal) return prev;
          return {
            ...prev,
            ultimaAlertaFecha: forecast.fechaLocal,
            ultimaAlertaIso: new Date().toISOString(),
            historialUv: [notif, ...(prev.historialUv || [])].slice(0, 30),
          };
        });

        setUnreadUvNotif(notif);
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          try {
            const ch = new BroadcastChannel('fundo_uv_alerts');
            ch.postMessage(notif);
            ch.close();
          } catch {
            // Ignorar error de BroadcastChannel
          }
        }

        if (alertaUvConfig.pushCelularHabilitado !== false) {
          await sendMobileUvNotification(notif, explotacion.nombreFundo);
        }
      } catch (err) {
        console.warn('Error verificando radiación UV diaria:', err);
      }
    };

    void checkAndDispatchUvAlert();
    const interval = window.setInterval(() => {
      void checkAndDispatchUvAlert();
    }, 60 * 1000);

    // Programación exacta a la hora configurada (08:00 AM por defecto) si la pestaña queda abierta
    const [targetHourStr, targetMinStr] = (alertaUvConfig.horaEnvio || '08:00').split(':');
    const targetH = Number.parseInt(targetHourStr || '8', 10);
    const targetM = Number.parseInt(targetMinStr || '0', 10);
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(Number.isFinite(targetH) ? targetH : 8, Number.isFinite(targetM) ? targetM : 0, 5, 0);
    if (nextRun.getTime() <= now.getTime()) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    const msUntilExact = Math.max(1000, nextRun.getTime() - now.getTime());
    const exactTimer = window.setTimeout(() => {
      void checkAndDispatchUvAlert();
    }, msUntilExact);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void checkAndDispatchUvAlert();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(exactTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [
    isLoadedInitially,
    isAdmin,
    alertaUvConfig.habilitada,
    alertaUvConfig.horaEnvio,
    alertaUvConfig.umbralMinimoUv,
    alertaUvConfig.ultimaAlertaFecha,
    alertaUvConfig.usarUbicacionClima,
    alertaUvConfig.latitudPersonalizada,
    alertaUvConfig.longitudPersonalizada,
    alertaUvConfig.notificarTodosUsuarios,
    alertaUvConfig.pushCelularHabilitado,
    explotacion.nombreFundo,
    explotacion.latitud,
    explotacion.longitud,
    parcelas,
  ]);

  const handleAcknowledgeUvNotif = (notifId: string) => {
    setUnreadUvNotif(null);
    setAlertaUvConfig((prev) => ({
      ...prev,
      historialUv: (prev.historialUv || []).map((item) =>
        item.id === notifId ? { ...item, leida: true } : item
      ),
    }));
  };

  const handleActivateMobileUvPush = async (opts: {
    lat: number;
    lng: number;
    nombre: string;
  }): Promise<{ ok: boolean; message: string }> => {
    const perm = await requestBrowserNotificationPermission();
    if (perm === 'denied') {
      return {
        ok: false,
        message:
          'Permiso bloqueado en tu celular/navegador. Habilita las notificaciones del sitio en la configuración del navegador.',
      };
    }
    if (perm !== 'granted') {
      return {
        ok: false,
        message: 'Debes aceptar el permiso de notificaciones para recibir alertas UV en el celular.',
      };
    }

    try {
      const fbUser = auth.currentUser || firebaseUser;
      const token = fbUser ? await fbUser.getIdToken() : null;
      const { subscription, serverSynced } = await subscribeDeviceToWebPush({
        token,
        ubicacion: {
          lat: opts.lat,
          lng: opts.lng,
          nombre: opts.nombre,
          fuente: 'personalizada',
        },
        fundoNombre: explotacion.nombreFundo,
        horaEnvio: alertaUvConfig.horaEnvio || '08:00',
        umbralMinimoUv: alertaUvConfig.umbralMinimoUv ?? 0,
        usuarioId: activeUser?.id,
      });

      setAlertaUvConfig((prev) => {
        const existingSubs = prev.pushSubscriptions || [];
        const nextSubs = subscription
          ? [
              ...existingSubs.filter((s) => s.endpoint !== subscription.endpoint),
              subscription,
            ]
          : existingSubs;
        return {
          ...prev,
          habilitada: true,
          pushCelularHabilitado: true,
          ubicacionNombre: opts.nombre,
          pushSubscriptions: nextSubs,
        };
      });

      return {
        ok: true,
        message: serverSynced
          ? `Celular vinculado con Web Push. Recibirás la alerta UV diaria a las ${alertaUvConfig.horaEnvio || '08:00'} hrs según (${opts.lat.toFixed(4)}°, ${opts.lng.toFixed(4)}°).`
          : `Notificaciones locales activadas para este dispositivo a las ${alertaUvConfig.horaEnvio || '08:00'} hrs. Inicia sesión con Google para sincronizar Push en segundo plano.`,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.message || 'No se pudo completar la vinculación Push del dispositivo.',
      };
    }
  };

  const handleTriggerTestUvAlert = async (opts: {
    lat: number;
    lng: number;
    nombre: string;
  }): Promise<{ ok: boolean; message: string }> => {
    try {
      const forecast = await fetchGeoreferencedUvForecast(opts.lat, opts.lng);
      setClima((prev) => ({
        ...prev,
        indiceUvActual: forecast.uvActual,
        indiceUvMaximo: forecast.uvMaximoDia,
        nivelRiesgoUv: forecast.nivelRiesgo,
        horaPicoUv: forecast.horaPicoUv,
      }));

      const notif = buildNotificacionUv({
        forecast,
        ubicacion: {
          lat: opts.lat,
          lng: opts.lng,
          nombre: opts.nombre,
          fuente: 'personalizada',
        },
        horaProgramada: alertaUvConfig.horaEnvio || '08:00',
        canales: ['Prueba Manual', 'Notificación Celular'],
      });

      setAlertaUvConfig((prev) => ({
        ...prev,
        historialUv: [notif, ...(prev.historialUv || [])].slice(0, 30),
      }));
      setUnreadUvNotif(notif);

      const localSent = await sendMobileUvNotification(notif, explotacion.nombreFundo);

      let serverSentCount = 0;
      const fbUser = auth.currentUser || firebaseUser;
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          const res = await sendServerTestUvPush({
            token,
            lat: opts.lat,
            lng: opts.lng,
            ubicacionNombre: opts.nombre,
            fundoNombre: explotacion.nombreFundo,
          });
          serverSentCount = res.sentCount || 0;
        } catch (err) {
          console.warn('Envío Push servidor opcional omitido:', err);
        }
      }

      return {
        ok: true,
        message:
          serverSentCount > 0
            ? `Alerta UV de prueba enviada a ${serverSentCount} celular(es) vinculado(s) (UV Máx ${forecast.uvMaximoDia.toFixed(1)} · ${forecast.nivelRiesgo}).`
            : localSent
            ? `Notificación UV enviada a este dispositivo (UV Máx ${forecast.uvMaximoDia.toFixed(1)} · ${forecast.nivelRiesgo}).`
            : `Alerta UV generada en pantalla (UV Máx ${forecast.uvMaximoDia.toFixed(1)} · ${forecast.nivelRiesgo}). Activa el permiso del navegador para recibirla en el celular.`,
      };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.message || 'Error consultando el índice UV para la ubicación georreferenciada.',
      };
    }
  };

  // Si no hay usuario logueado en la sesión, renderizar pantalla de Login obligatoria
  if (!currentUser) {
    return (
      <>
        {quotaBanner}
        <LoginView
          usuarios={usuarios}
          onLoginSuccess={handleLoginSuccess}
          fundoNombre={explotacion.nombreFundo}
        />
        <OfflineIndicator hasPendingSync={pendingOfflineSync} onRetrySync={handleForceSync} />
      </>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-stone-50 flex flex-col font-sans text-stone-900 selection:bg-emerald-200 selection:text-emerald-950">
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
        alertasProactivasCount={alertasProactivas.length}
        alertaHeladaActiva={Boolean(
          clima?.alertaHelada ||
            evalSensorGlobal.bajoUmbralCritico ||
            Boolean(unreadFrostNotifForUser) ||
            (evalSensorGlobal.sensorActivo && clima.tempMinima <= configControlHeladas.umbralAlertaC)
        )}
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

      {(unreadFrostNotifForUser || evalSensorGlobal.bajoUmbralCritico || liveBroadcastAlert) && (
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3">
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <BellRing className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div className="min-w-0 space-y-0.5">
                <div className="font-black text-rose-900">
                  {unreadFrostNotifForUser?.titulo ||
                    liveBroadcastAlert ||
                    `ALERTA CRÍTICA DE HELADA: Sensor ${evalSensorGlobal.tempSensorC.toFixed(1)}°C (< ${evalSensorGlobal.umbralCriticoC.toFixed(1)}°C)`}
                </div>
                <p className="text-[11px] text-rose-900 leading-snug">
                  {unreadFrostNotifForUser?.mensaje ||
                    `Temperatura bajo umbral crítico (${evalSensorGlobal.umbralCriticoC.toFixed(1)}°C). Notificación dirigida al Administrador y a todo el equipo.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeTab !== 'heladas' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('heladas')}
                  className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Snowflake className="w-3.5 h-3.5 text-cyan-800" />
                  <span>Ir a Control Heladas</span>
                </button>
              )}
              {unreadFrostNotifForUser && (
                <button
                  type="button"
                  onClick={() => {
                    handleAcknowledgeNotificacionHelada(unreadFrostNotifForUser.id);
                    setLiveBroadcastAlert(null);
                  }}
                  className="px-3 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar Lectura</span>
                </button>
              )}
              {!unreadFrostNotifForUser && liveBroadcastAlert && (
                <button
                  type="button"
                  onClick={() => setLiveBroadcastAlert(null)}
                  className="p-1 text-rose-700 hover:text-rose-950 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {unreadUvNotif && (
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3">
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <Sun className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="min-w-0 space-y-0.5">
                <div className="font-black text-amber-950">
                  Alerta Diaria Radiación UV ({unreadUvNotif.horaProgramada} hrs) · Máx {unreadUvNotif.uvMaximoDia.toFixed(1)} ({unreadUvNotif.nivelRiesgo})
                </div>
                <p className="text-[11px] text-amber-900 leading-snug">
                  <span className="font-semibold">{unreadUvNotif.ubicacionNombre}</span> ({unreadUvNotif.latitud.toFixed(4)}°, {unreadUvNotif.longitud.toFixed(4)}°) · Pico a las {unreadUvNotif.horaPicoUv}. {unreadUvNotif.recomendacion}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeTab !== 'clima' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('clima')}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-700" />
                  <span>Ver Clima y UV</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleAcknowledgeUvNotif(unreadUvNotif.id)}
                className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Entendido</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ErrorBoundary fallbackTab={() => setActiveTab('dashboard')}>
        <main className="flex-1 max-w-7xl w-full mx-auto px-safe sm:px-6 lg:px-8 pt-5 pb-safe-main sm:py-6">
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
            alertasProactivas={alertasProactivas}
            onDismissLowStockAlert={handleDismissLowStockAlert}
            fenologia={fenologia}
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
            estadosFenologicosPersonalizados={estadosFenologicosCustom}
            onAddEstadoFenologicoCustom={handleAddEstadoFenologicoCustom}
          />
        )}

        {activeTab === 'cosecha' && (
          <CosechaMadurezView
            fundoNombre={explotacion.nombreFundo}
            parcelas={parcelas}
            muestreos={muestreosMadurez}
            onAddMuestreo={guardEdit((m) => setMuestreosMadurez((prev) => [m, ...prev]))}
            onDeleteMuestreo={guardEdit((id) => setMuestreosMadurez((prev) => prev.filter((m) => m.id !== id)))}
            cosechas={cosechasLote}
            onAddCosecha={guardEdit((c) => setCosechasLote((prev) => [c, ...prev]))}
            onDeleteCosecha={guardEdit((id) => setCosechasLote((prev) => prev.filter((c) => c.id !== id)))}
            liquidaciones={liquidacionesPacking}
            onAddLiquidacion={guardEdit((l) => setLiquidacionesPacking((prev) => [l, ...prev]))}
            onDeleteLiquidacion={guardEdit((id) => setLiquidacionesPacking((prev) => prev.filter((l) => l.id !== id)))}
            labores={labores}
            ordenesTrabajo={ordenesTrabajo}
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
            explotacion={explotacion}
            clima={clima}
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
            explotacion={explotacion}
            canEdit={canEdit}
            onAddInsumo={guardEdit((i) => setInventario((prev) => [...prev, i]))}
            onUpdateInsumo={handleUpdateInsumoSafe}
            onDeleteInsumo={guardEdit((id) => setInventario((prev) => prev.filter((item) => item.id !== id)))}
            onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
          />
        )}

        {activeTab === 'materiales' && (
          <MaterialesRiegoView
            inventario={inventario}
            explotacion={explotacion}
            canEdit={canEdit}
            onAddInsumo={guardEdit((i) => setInventario((prev) => [...prev, i]))}
            onUpdateInsumo={handleUpdateInsumoSafe}
            onDeleteInsumo={guardEdit((id) => setInventario((prev) => prev.filter((item) => item.id !== id)))}
            onOpenAlertsModal={() => setIsAlertsModalOpen(true)}
          />
        )}

        {activeTab === 'pozo' && (
          <PozoView
            registrosPozo={registrosPozo}
            explotacion={explotacion}
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
            explotacion={explotacion}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'maquinarias' && (
          <MaquinariasView
            maquinarias={maquinarias}
            registrosMantencion={registrosMantencion}
            explotacion={explotacion}
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
            onUpdateParcela={guardEdit((p) => setParcelas((prev) => prev.map((item) => (item.id === p.id ? p : item))))}
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
            onReplaceFenologia={guardEdit(setFenologia)}
            polinizacion={polinizacion}
            onAddPolinizacion={guardEdit((p) => setPolinizacion((prev) => [p, ...prev]))}
            onUpdatePolinizacion={guardEdit((p) => setPolinizacion((prev) => prev.map((item) => item.id === p.id ? p : item)))}
            onDeletePolinizacion={guardEdit((id) => setPolinizacion((prev) => prev.filter((p) => p.id !== id)))}
            estadosFenologicosPersonalizados={estadosFenologicosCustom}
            onAddEstadoFenologicoCustom={handleAddEstadoFenologicoCustom}
            onDeleteEstadoFenologicoCustom={handleDeleteEstadoFenologicoCustom}
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
            onUpdateParcela={guardEdit((p) => setParcelas((prev) => prev.map((item) => (item.id === p.id ? p : item))))}
            fenologia={fenologia}
            onAddFenologia={guardEdit((f) => setFenologia((prev) => [f, ...prev]))}
            onUpdateFenologia={guardEdit((f) => setFenologia((prev) => prev.map((item) => (item.id === f.id ? f : item))))}
            estadosFenologicosPersonalizados={estadosFenologicosCustom}
            onAddEstadoFenologicoCustom={handleAddEstadoFenologicoCustom}
            activeUserName={activeUser?.nombre}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'labores' && (
          <LaboresView
            labores={labores}
            parcelas={parcelas}
            explotacion={explotacion}
            canEdit={canEdit}
            onOpenNewLabor={handleOpenNewLabor}
            onOpenNewFertilizacion={() => handleOpenNewLaborWithDefaults(undefined, 'fertilizacion')}
            onEditLabor={handleEditLabor}
            onDeleteLabor={handleDeleteLabor}
          />
        )}

        {activeTab === 'clima' && (
          <ClimaView
            clima={clima}
            onUpdateClima={guardEdit(setClima)}
            alertaUvConfig={alertaUvConfig}
            onUpdateAlertaUvConfig={guardEdit(setAlertaUvConfig)}
            onActivateMobileUvPush={handleActivateMobileUvPush}
            onTriggerTestUvAlert={handleTriggerTestUvAlert}
            eventualidades={eventualidades}
            parcelas={parcelas}
            explotacion={explotacion}
            onUpdateExplotacion={guardEdit(setExplotacion)}
            activeUserName={activeUser?.nombre}
            onAddEventualidad={guardEdit((ev) => setEventualidades((prev) => [ev, ...prev]))}
            onUpdateEventualidad={guardEdit((ev) =>
              setEventualidades((prev) => prev.map((item) => (item.id === ev.id ? ev : item)))
            )}
            onDeleteEventualidad={guardEdit((id) =>
              setEventualidades((prev) => prev.filter((item) => item.id !== id))
            )}
            canEdit={canEdit}
            onNavigateControlHeladas={() => setActiveTab('heladas')}
          />
        )}

        {activeTab === 'heladas' && (
          <ControlHeladasView
            controles={controlesHelada}
            onAddControl={guardEdit((c) => setControlesHelada((prev) => [c, ...prev]))}
            onUpdateControl={guardEdit((c) =>
              setControlesHelada((prev) => prev.map((item) => (item.id === c.id ? c : item)))
            )}
            onDeleteControl={guardEdit((id) =>
              setControlesHelada((prev) => prev.filter((item) => item.id !== id))
            )}
            config={configControlHeladas}
            onUpdateConfig={guardEdit(setConfigControlHeladas)}
            clima={clima}
            onUpdateClima={guardEdit(setClima)}
            parcelas={parcelas}
            explotacion={explotacion}
            eventualidades={eventualidades}
            fenologia={fenologia}
            estadosFenologicosPersonalizados={estadosFenologicosCustom}
            usuarios={usuarios}
            activeUser={activeUser}
            activeUserName={activeUser?.nombre}
            canEdit={canEdit}
            onAcknowledgeNotificacion={handleAcknowledgeNotificacionHelada}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'monitoreo' && (
          <MonitoreoView
            labores={labores}
            parcelas={parcelas}
            explotacion={explotacion}
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

        {activeTab === 'laboratorio' && (
          <LaboratorioView
            analisis={analisisLaboratorio}
            parcelas={parcelas}
            onAddAnalisis={guardEdit((a) => setAnalisisLaboratorio((prev) => [a, ...prev]))}
            onDeleteAnalisis={guardEdit((id) => setAnalisisLaboratorio((prev) => prev.filter((a) => a.id !== id)))}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'auditoria' && (
          <CumplimientoAuditoriaView
            usuarios={usuarios}
            inventario={inventario}
            analisisLaboratorio={analisisLaboratorio}
            registrosPozo={registrosPozo}
            cosechasLote={cosechasLote}
            muestreosMadurez={muestreosMadurez}
            parcelas={parcelas}
            registrosEnvases={registrosEnvases}
            onAddEnvase={guardEdit((r) => setRegistrosEnvases((prev) => [r, ...prev]))}
            onDeleteEnvase={guardEdit((id) => setRegistrosEnvases((prev) => prev.filter((e) => e.id !== id)))}
            calibracionesEquipo={calibracionesEquipo}
            onAddCalibracion={guardEdit((c) => setCalibracionesEquipo((prev) => [c, ...prev]))}
            onDeleteCalibracion={guardEdit((id) => setCalibracionesEquipo((prev) => prev.filter((c) => c.id !== id)))}
            auditoriaManual={auditoriaManual}
            onToggleAuditoriaManual={guardEdit((key) =>
              setAuditoriaManual((prev) => ({ ...prev, [key]: !prev[key] }))
            )}
            planillaBpa={planillaBpa}
            onUpdatePlanillaBpa={guardEdit((nextPlanilla) => setPlanillaBpa(nextPlanilla))}
            fundoNombre={explotacion.nombreFundo}
            activeUserName={activeUser?.nombre}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'planificacion' && (
          <PlanificacionTemporadasView
            parcelas={parcelas}
            usuarios={usuarios}
            horasFrio={normalizarCondicionHorasFrio(horasFrio, registrosTermicos)}
            turnosRiego={turnosRiego}
            registrosPozo={registrosPozo}
            cosechasLote={cosechasLote}
            liquidacionesPacking={liquidacionesPacking}
            evaluacionesCuaja={evaluacionesCuajaSemillas}
            tareasHuerto={tareasHuerto}
            onAddTarea={guardEdit((t) => setTareasHuerto((prev) => [t, ...prev]))}
            onUpdateTarea={guardEdit((t) => setTareasHuerto((prev) => prev.map((item) => (item.id === t.id ? t : item))))}
            onDeleteTarea={guardEdit((id) => setTareasHuerto((prev) => prev.filter((t) => t.id !== id)))}
            resumenesTemporada={resumenesTemporada}
            onAddResumenTemporada={guardEdit((r) => setResumenesTemporada((prev) => [r, ...prev]))}
            onDeleteResumenTemporada={guardEdit((id) => setResumenesTemporada((prev) => prev.filter((r) => r.id !== id)))}
            alertasProactivas={alertasProactivas}
            onDismissLowStockAlert={handleDismissLowStockAlert}
            onNavigateTab={setActiveTab}
            fenologia={fenologia}
            onAddFenologia={guardEdit((f) => setFenologia((prev) => [f, ...prev]))}
            onUpdateFenologia={guardEdit((f) => setFenologia((prev) => prev.map((item) => (item.id === f.id ? f : item))))}
            onDeleteFenologia={guardEdit((id) => setFenologia((prev) => prev.filter((f) => f.id !== id)))}
            onReplaceFenologia={guardEdit(setFenologia)}
            onUpdateParcela={guardEdit((p) => setParcelas((prev) => prev.map((item) => (item.id === p.id ? p : item))))}
            estadosFenologicosPersonalizados={estadosFenologicosCustom}
            onAddEstadoFenologicoCustom={handleAddEstadoFenologicoCustom}
            onDeleteEstadoFenologicoCustom={handleDeleteEstadoFenologicoCustom}
            canEdit={canEdit}
          />
        )}

        {activeTab === 'informe' && (
          <InformeOficialView
            explotacion={explotacion}
            parcelas={parcelas}
            labores={labores}
            horasFrio={normalizarCondicionHorasFrio(horasFrio, registrosTermicos)}
            fenologia={fenologia}
            fullData={buildFullStateData()}
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
                    if (Array.isArray(parsed.estadosFenologicosPersonalizados)) setEstadosFenologicosCustom(parsed.estadosFenologicosPersonalizados);
                    if (parsed.polinizacion) setPolinizacion(parsed.polinizacion);
                    if (Array.isArray(parsed.turnosRiego)) setTurnosRiego(parsed.turnosRiego);
                    if (Array.isArray(parsed.eventualidades)) setEventualidades(parsed.eventualidades);
                    if (Array.isArray(parsed.controlesHelada)) setControlesHelada(parsed.controlesHelada);
                    if (parsed.configControlHeladas && typeof parsed.configControlHeladas === 'object') {
                      setConfigControlHeladas(normalizeConfigControlHeladas(parsed.configControlHeladas));
                    }
                    if (parsed.alertaUvConfig && typeof parsed.alertaUvConfig === 'object') {
                      setAlertaUvConfig(normalizeConfigAlertaUv(parsed.alertaUvConfig));
                    }
                    if (Array.isArray(parsed.liquidacionesPacking)) setLiquidacionesPacking(parsed.liquidacionesPacking);
                    if (Array.isArray(parsed.analisisLaboratorio)) setAnalisisLaboratorio(parsed.analisisLaboratorio);
                    if (Array.isArray(parsed.registrosEnvases)) setRegistrosEnvases(parsed.registrosEnvases);
                    if (Array.isArray(parsed.calibracionesEquipo)) setCalibracionesEquipo(parsed.calibracionesEquipo);
                    if (parsed.auditoriaManual && typeof parsed.auditoriaManual === 'object') setAuditoriaManual(parsed.auditoriaManual);
                    if (parsed.planillaBpa && typeof parsed.planillaBpa === 'object') setPlanillaBpa(normalizePlanillaBpa(parsed.planillaBpa));
                    if (Array.isArray(parsed.tareasHuerto)) setTareasHuerto(parsed.tareasHuerto);
                    if (Array.isArray(parsed.resumenesTemporada)) setResumenesTemporada(parsed.resumenesTemporada);
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
        onUpdateInsumo={handleUpdateInsumoSafe}
        onDismissAlert={handleDismissLowStockAlert}
        onDismissAllAlerts={handleDismissAllLowStockAlerts}
        onRestoreAlert={handleRestoreLowStockAlert}
        onRestoreAllAlerts={handleRestoreAllLowStockAlerts}
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
                    placeholder="Ej. 12.845.219-4 o correo@gmail.com"
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

      <OfflineIndicator hasPendingSync={pendingOfflineSync} onRetrySync={handleForceSync} />
    </div>
  );
}
