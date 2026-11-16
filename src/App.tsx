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
import { AsistenteIaView } from './components/AsistenteIaView';
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
  stripDemoRecords
} from './utils/storage';
import { 
  loadDataFromCloud, 
  saveDataToCloud 
} from './services/cloudSync';
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
import { initialClimaLaCabana } from './data/initialData';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  loadOrchardFromFirestore,
  saveOrchardToFirestore,
  subscribeToOrchard,
  syncUserProfileToFirestore,
} from './lib/firestoreSync';
import { RotateCcw, X } from 'lucide-react';

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
  const [clima, setClima] = useState<ClimaCondiciones>(initialClimaLaCabana);

  const [muestreosMadurez, setMuestreosMadurez] = useState<MuestreoMadurez[]>(getStoredMuestreosMadurez);
  const [cosechasLote, setCosechasLote] = useState<RegistroCosechaLote[]>(getStoredCosechasLote);
  const [ordenesTrabajo, setOrdenesTrabajo] = useState<OrdenTrabajoFitosanitaria[]>(getStoredOrdenesTrabajo);
  const [horasFrio, setHorasFrio] = useState<CondicionHorasFrio>(getStoredCondicionHorasFrio);
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

  // Estado de Sincronización en la Nube
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'saving' | 'synced' | 'error' | 'offline'>('loading');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isLoadedInitially, setIsLoadedInitially] = useState(false);
  const lastSyncedPayloadRef = useRef<string>('');
  const skipNextRemoteSaveRef = useRef<boolean>(false);

  // Estados de Modales
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState<RegistroLabor | null>(null);
  const [defaultParcelaId, setDefaultParcelaId] = useState<string | undefined>(undefined);
  const [defaultTipoLabor, setDefaultTipoLabor] = useState<TipoLabor | undefined>(undefined);
  const [isExplotacionModalOpen, setIsExplotacionModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

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
    horasFrio,
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
    if (d.horasFrio) setHorasFrio(d.horasFrio);
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
      carnetSAGVigente: true,
      telefono: '',
      cargo: 'Administrador de Huerto',
    };
  };

  // Defensa de Cuota Google Maps + Resolución de API Key del cliente
  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    if (!mapsApiKey) {
      fetch('/api/maps-client-config')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.apiKey && typeof data.apiKey === 'string') {
            setMapsApiKey(data.apiKey);
          }
        })
        .catch(() => {});
    }
  }, [mapsApiKey]);

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

      setSyncState('loading');
      try {
        await syncUserProfileToFirestore(user);
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

        const remoteState: AppStateData | null =
          firestoreState ||
          (sqlRes?.snapshot && typeof sqlRes.snapshot === 'object'
            ? (sqlRes.snapshot as AppStateData)
            : null);

        if (remoteState && remoteState.explotacion) {
          const serialized = JSON.stringify(remoteState);
          lastSyncedPayloadRef.current = serialized;
          skipNextRemoteSaveRef.current = true;
          applyHydratedState(remoteState);
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

        unsubscribeFirestore = subscribeToOrchard(user.uid, (incomingState) => {
          if (!isMounted) return;
          const incomingSerialized = JSON.stringify(incomingState);
          if (incomingSerialized === lastSyncedPayloadRef.current) {
            return;
          }
          lastSyncedPayloadRef.current = incomingSerialized;
          skipNextRemoteSaveRef.current = true;
          applyHydratedState(incomingState);
          setSyncState('synced');
          setLastSyncTime(
            new Date().toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        });
      } catch (err) {
        console.warn('Error sincronizando usuario Firebase:', err);
        if (isMounted) setSyncState('error');
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // 1. CARGA INICIAL DESDE LA NUBE (JSONBin.io)
  useEffect(() => {
    let isMounted = true;
    async function inicializarNube() {
      setSyncState('loading');
      try {
        const result = await loadDataFromCloud();
        if (!isMounted) return;

        if (result.data && result.data.explotacion) {
          let cloudCleanNeeded = false;
          try {
            cloudCleanNeeded = localStorage.getItem('huerto_real_cloud_cleaned_v1') !== 'true';
          } catch (e) {}

          const d = cloudCleanNeeded ? stripDemoRecords(result.data) : result.data;

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
          if (d.horasFrio) setHorasFrio(d.horasFrio);
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

          if (cloudCleanNeeded) {
            try {
              localStorage.setItem('huerto_real_cloud_cleaned_v1', 'true');
            } catch (e) {}
            saveDataToCloud(d);
          }

          setSyncState('synced');
          const time = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastSyncTime(time);
        } else {
          setSyncState('synced');
        }
      } catch (err) {
        console.warn('Error inicializando nube:', err);
        setSyncState('error');
      } finally {
        if (isMounted) setIsLoadedInitially(true);
      }
    }

    inicializarNube();
    return () => { isMounted = false; };
  }, []);

  const persistAllTargets = async (fullData: AppStateData): Promise<boolean> => {
    const serialized = JSON.stringify(fullData);
    lastSyncedPayloadRef.current = serialized;

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
    return results.some(Boolean);
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

    setSyncState('saving');
    const timer = setTimeout(async () => {
      const fullData = buildFullStateData();
      const ok = await persistAllTargets(fullData);
      if (ok) {
        setSyncState('synced');
        setLastSyncTime(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        setSyncState('error');
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
    setSyncState('saving');
    const fullData = buildFullStateData();
    const ok = await persistAllTargets(fullData);
    if (ok) {
      setSyncState('synced');
      setLastSyncTime(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } else {
      setSyncState('error');
    }
  };

  // Usuario Activo
  const activeUser = usuarios.find((u) => u.id === (currentUser?.id || activeUserId)) || usuarios[0];

  const handleLoginSuccess = (user: UsuarioPredio) => {
    setCurrentUser(user);
    setActiveUserId(user.id);
    try {
      sessionStorage.setItem('fundo_session_user', JSON.stringify(user));
    } catch (e) {}
  };

  const handleGoogleLoginSuccess = async (user: FirebaseUser) => {
    setFirebaseUser(user);
    const mapped = mapFirebaseUserToPredio(user);
    setCurrentUser(mapped);
    setActiveUserId(mapped.id);
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
    setOrdenesTrabajo((prev) => prev.map((o) => (o.id === ordenActualizada.id ? ordenActualizada : o)));
  };

  const handleOpenNewLabor = () => {
    setEditingLabor(null);
    setDefaultParcelaId(undefined);
    setDefaultTipoLabor(undefined);
    setIsLaborModalOpen(true);
  };

  const handleOpenNewLaborWithDefaults = (parcelaId?: string, tipoLabor?: TipoLabor) => {
    setEditingLabor(null);
    setDefaultParcelaId(parcelaId);
    setDefaultTipoLabor(tipoLabor);
    setIsLaborModalOpen(true);
  };

  const handleEditLabor = (labor: RegistroLabor) => {
    setEditingLabor(labor);
    setDefaultParcelaId(undefined);
    setDefaultTipoLabor(undefined);
    setIsLaborModalOpen(true);
  };

  const handleSaveLabor = (laborToSave: RegistroLabor) => {
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
    setFenologia(defaults.fenologia);
    setPolinizacion(defaults.polinizacion);
    setMuestreosBrotacion(defaults.muestreosBrotacion || []);
    setConteosBotones(defaults.conteosBotones || []);
    setSincroniasFlorales(defaults.sincroniasFlorales || []);
    setAplicacionesPolen(defaults.aplicacionesPolen || []);
    setPlanesCargaRaleo(defaults.planesCargaRaleo || []);
    setEvaluacionesCuajaSemillas(defaults.evaluacionesCuajaSemillas || []);
    setTurnosRiego(defaults.turnosRiego || []);
    setActiveUserId(defaults.usuarios[0]?.id || 'usr-1');
    setIsResetConfirmOpen(false);
  };

  const handleVaciarDatosMuestra = () => {
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
    try {
      localStorage.setItem('huerto_real_cloud_cleaned_v1', 'true');
    } catch (e) {}
    void persistAllTargets(blank);
    setIsResetConfirmOpen(false);
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
        activeUser={currentUser || activeUser}
        usuarios={usuarios}
        onSelectUser={(uId) => {
          setActiveUserId(uId);
          const found = usuarios.find((u) => u.id === uId);
          if (found) setCurrentUser(found);
        }}
        onLogout={handleLogout}
        syncState={syncState}
        lastSyncTime={lastSyncTime}
        onForceSync={handleForceSync}
        onOpenResetModal={() => setIsResetConfirmOpen(true)}
      />

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
            horasFrio={horasFrio}
            usuarios={usuarios}
            activeUserId={activeUserId}
            onOpenNewLaborWithDefaults={handleOpenNewLaborWithDefaults}
            onNavigateTab={setActiveTab}
            onEditExplotacion={() => setIsExplotacionModalOpen(true)}
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
            defaultCenter={{
              lat: explotacion.latitud ?? -39.628593,
              lng: explotacion.longitud ?? -72.461085,
            }}
            onAddParcela={(p) => setParcelas((prev) => [...prev, p])}
            onUpdateParcela={(p) => setParcelas((prev) => prev.map((item) => item.id === p.id ? p : item))}
            onDeleteParcela={(id) => setParcelas((prev) => prev.filter((item) => item.id !== id))}
            onAddLugar={(l) => setLugares((prev) => [...prev, l])}
            onUpdateLugar={(l) => setLugares((prev) => prev.map((item) => item.id === l.id ? l : item))}
            onDeleteLugar={(id) => setLugares((prev) => prev.filter((item) => item.id !== id))}
            onRegisterLaborForParcela={(pId) => handleOpenNewLaborWithDefaults(pId, undefined)}
          />
        )}

        {activeTab === 'cosecha' && (
          <CosechaMadurezView
            parcelas={parcelas}
            muestreos={muestreosMadurez}
            onAddMuestreo={(m) => setMuestreosMadurez((prev) => [m, ...prev])}
            onDeleteMuestreo={(id) => setMuestreosMadurez((prev) => prev.filter((m) => m.id !== id))}
            cosechas={cosechasLote}
            onAddCosecha={(c) => setCosechasLote((prev) => [c, ...prev])}
            onDeleteCosecha={(id) => setCosechasLote((prev) => prev.filter((c) => c.id !== id))}
            activeUserName={activeUser?.nombre}
          />
        )}

        {activeTab === 'ordenes' && (
          <OrdenesTrabajoView
            ordenes={ordenesTrabajo}
            parcelas={parcelas}
            inventario={inventario}
            usuarios={usuarios}
            activeUser={activeUser}
            onAddOrden={handleAddOrden}
            onUpdateOrden={handleUpdateOrden}
            onExecuteOrden={(ordenId, aplicadorNombre, firma) => {
              setOrdenesTrabajo((prev) =>
                prev.map((o) => o.id === ordenId ? { 
                  ...o, 
                  estado: 'completada', 
                  aplicadorFirma: firma, 
                  aplicadorNombre, 
                  fechaEjecucion: new Date().toISOString().split('T')[0] 
                } : o)
              );
            }}
            onDeleteOrden={(id) => setOrdenesTrabajo((prev) => prev.filter((o) => o.id !== id))}
          />
        )}

        {(activeTab === 'fitosanitarios' || activeTab === 'inventario') && (
          <FitosanitariosView
            inventario={inventario}
            onAddInsumo={(i) => setInventario((prev) => [...prev, i])}
            onUpdateInsumo={(i) => setInventario((prev) => prev.map((item) => item.id === i.id ? i : item))}
            onDeleteInsumo={(id) => setInventario((prev) => prev.filter((item) => item.id !== id))}
          />
        )}

        {activeTab === 'materiales' && (
          <MaterialesRiegoView
            inventario={inventario}
            onAddInsumo={(i) => setInventario((prev) => [...prev, i])}
            onUpdateInsumo={(i) => setInventario((prev) => prev.map((item) => item.id === i.id ? i : item))}
            onDeleteInsumo={(id) => setInventario((prev) => prev.filter((item) => item.id !== id))}
          />
        )}

        {activeTab === 'pozo' && (
          <PozoView
            registrosPozo={registrosPozo}
            onAddRegistroPozo={(r) => setRegistrosPozo((prev) => [r, ...prev])}
            onUpdateRegistroPozo={(r) => setRegistrosPozo((prev) => prev.map((item) => item.id === r.id ? r : item))}
            onDeleteRegistroPozo={(id) => setRegistrosPozo((prev) => prev.filter((p) => p.id !== id))}
          />
        )}

        {activeTab === 'riego' && (
          <RiegoView
            turnosRiego={turnosRiego}
            onAddTurnoRiego={(t) => setTurnosRiego((prev) => [t, ...prev])}
            onUpdateTurnoRiego={(t) => setTurnosRiego((prev) => prev.map((item) => item.id === t.id ? t : item))}
            onDeleteTurnoRiego={(id) => setTurnosRiego((prev) => prev.filter((t) => t.id !== id))}
            parcelas={parcelas}
            clima={clima}
          />
        )}

        {activeTab === 'maquinarias' && (
          <MaquinariasView
            maquinarias={maquinarias}
            registrosMantencion={registrosMantencion}
            onAddMaquinaria={(m) => setMaquinarias((prev) => [m, ...prev])}
            onUpdateMaquinaria={(m) => setMaquinarias((prev) => prev.map((item) => item.id === m.id ? m : item))}
            onDeleteMaquinaria={(id) => setMaquinarias((prev) => prev.filter((item) => item.id !== id))}
            onAddMantencion={(reg) => setRegistrosMantencion((prev) => [reg, ...prev])}
            onDeleteMantencion={(id) => setRegistrosMantencion((prev) => prev.filter((item) => item.id !== id))}
          />
        )}

        {activeTab === 'fenologia' && (
          <HorasFrioFenologiaView
            parcelas={parcelas}
            horasFrio={horasFrio}
            onUpdateHorasFrio={setHorasFrio}
            fenologia={fenologia}
            onAddFenologia={(f) => setFenologia((prev) => [f, ...prev])}
            onUpdateFenologia={(f) => setFenologia((prev) => prev.map((item) => item.id === f.id ? f : item))}
            onDeleteFenologia={(id) => setFenologia((prev) => prev.filter((f) => f.id !== id))}
            polinizacion={polinizacion}
            onAddPolinizacion={(p) => setPolinizacion((prev) => [p, ...prev])}
            onUpdatePolinizacion={(p) => setPolinizacion((prev) => prev.map((item) => item.id === p.id ? p : item))}
            onDeletePolinizacion={(id) => setPolinizacion((prev) => prev.filter((p) => p.id !== id))}
            activeUserName={activeUser?.nombre}
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
            onAddMuestreoBrotacion={(m) => setMuestreosBrotacion((prev) => [m, ...prev])}
            onUpdateMuestreoBrotacion={(m) => setMuestreosBrotacion((prev) => prev.map((item) => (item.id === m.id ? m : item)))}
            onDeleteMuestreoBrotacion={(id) => setMuestreosBrotacion((prev) => prev.filter((m) => m.id !== id))}
            conteosBotones={conteosBotones}
            onAddConteoBotones={(c) => setConteosBotones((prev) => [c, ...prev])}
            onUpdateConteoBotones={(c) => setConteosBotones((prev) => prev.map((item) => (item.id === c.id ? c : item)))}
            onDeleteConteoBotones={(id) => setConteosBotones((prev) => prev.filter((c) => c.id !== id))}
            sincroniasFlorales={sincroniasFlorales}
            onAddSincroniaFloral={(s) => setSincroniasFlorales((prev) => [s, ...prev])}
            onUpdateSincroniaFloral={(s) => setSincroniasFlorales((prev) => prev.map((item) => (item.id === s.id ? s : item)))}
            onDeleteSincroniaFloral={(id) => setSincroniasFlorales((prev) => prev.filter((s) => s.id !== id))}
            aplicacionesPolen={aplicacionesPolen}
            onAddAplicacionPolen={(a) => setAplicacionesPolen((prev) => [a, ...prev])}
            onUpdateAplicacionPolen={(a) => setAplicacionesPolen((prev) => prev.map((item) => (item.id === a.id ? a : item)))}
            onDeleteAplicacionPolen={(id) => setAplicacionesPolen((prev) => prev.filter((a) => a.id !== id))}
            planesCargaRaleo={planesCargaRaleo}
            onAddPlanCargaRaleo={(p) => setPlanesCargaRaleo((prev) => [p, ...prev])}
            onUpdatePlanCargaRaleo={(p) => setPlanesCargaRaleo((prev) => prev.map((item) => (item.id === p.id ? p : item)))}
            onDeletePlanCargaRaleo={(id) => setPlanesCargaRaleo((prev) => prev.filter((p) => p.id !== id))}
            evaluacionesCuajaSemillas={evaluacionesCuajaSemillas}
            onAddEvaluacionCuajaSemillas={(e) => setEvaluacionesCuajaSemillas((prev) => [e, ...prev])}
            onUpdateEvaluacionCuajaSemillas={(e) => setEvaluacionesCuajaSemillas((prev) => prev.map((item) => (item.id === e.id ? e : item)))}
            onDeleteEvaluacionCuajaSemillas={(id) => setEvaluacionesCuajaSemillas((prev) => prev.filter((e) => e.id !== id))}
            activeUserName={currentUser?.nombre}
          />
        )}

        {activeTab === 'labores' && (
          <LaboresView
            labores={labores}
            parcelas={parcelas}
            onOpenNewLabor={handleOpenNewLabor}
            onEditLabor={handleEditLabor}
            onDeleteLabor={handleDeleteLabor}
          />
        )}

        {activeTab === 'clima' && (
          <ClimaView
            clima={clima}
            onUpdateClima={setClima}
          />
        )}

        {activeTab === 'monitoreo' && (
          <MonitoreoView
            labores={labores}
            parcelas={parcelas}
            onOpenNewLaborWithDefaults={handleOpenNewLaborWithDefaults}
            onSaveQuickObservation={handleSaveLabor}
          />
        )}

        {activeTab === 'calculadora' && (
          <CalculadoraView etoClimaActual={clima?.evapotranspiracionEtoMmDia} />
        )}

        {activeTab === 'asistente_ia' && (
          <AsistenteIaView
            parcelas={parcelas}
            inventario={inventario}
            clima={clima}
            fundoNombre={explotacion.nombreFundo}
            explotacionLatLng={{
              latitude: explotacion.latitud ?? -39.628593,
              longitude: explotacion.longitud ?? -72.461085,
            }}
            getAuthToken={() =>
              auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null)
            }
          />
        )}

        {activeTab === 'informe' && (
          <InformeOficialView
            explotacion={explotacion}
            parcelas={parcelas}
            labores={labores}
            onImportJSON={(e) => {
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
                    if (parsed.horasFrio) setHorasFrio(parsed.horasFrio);
                    if (parsed.fenologia) setFenologia(parsed.fenologia);
                    if (parsed.polinizacion) setPolinizacion(parsed.polinizacion);
                  } catch (err) {
                    console.error('Error importando', err);
                  }
                };
                reader.readAsText(file);
              }
            }}
          />
        )}

        {activeTab === 'usuarios' && (
          <UsuariosView
            usuarios={usuarios}
            currentUser={currentUser}
            activeUserId={currentUser.id || activeUserId}
            onSetActiveUser={(uId) => {
              setActiveUserId(uId);
              const found = usuarios.find((u) => u.id === uId);
              if (found) setCurrentUser(found);
            }}
            onAddUsuario={(u) => setUsuarios((prev) => [...prev, u])}
            onUpdateUsuario={(u) => {
              setUsuarios((prev) => prev.map((item) => item.id === u.id ? u : item));
              if (currentUser && currentUser.id === u.id) {
                setCurrentUser(u);
                try {
                  sessionStorage.setItem('fundo_session_user', JSON.stringify(u));
                } catch (e) {}
              }
            }}
            onDeleteUsuario={(id) => setUsuarios((prev) => prev.filter((item) => item.id !== id))}
          />
        )}
      </main>
      </ErrorBoundary>

      {/* Modales Globales */}
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
        activeUserId={currentUser.id || activeUserId}
        initialLabor={editingLabor}
        defaultParcelaId={defaultParcelaId}
        defaultTipoLabor={defaultTipoLabor}
      />

      <ModalExplotacion
        isOpen={isExplotacionModalOpen}
        onClose={() => setIsExplotacionModalOpen(false)}
        explotacion={explotacion}
        onSave={setExplotacion}
      />

      <AlertasStockModal
        isOpen={isAlertsModalOpen}
        onClose={() => setIsAlertsModalOpen(false)}
        inventario={inventario}
        onUpdateInsumo={(updated) => {
          setInventario((prev) =>
            prev.map((i) => (i.id === updated.id ? updated : i))
          );
        }}
        onDeleteInsumo={(id) => {
          setInventario((prev) => prev.filter((i) => i.id !== id));
        }}
        onClearInventario={() => {
          setInventario([]);
        }}
        onNavigateToInventario={() => {
          setIsAlertsModalOpen(false);
          setActiveTab('fitosanitarios');
        }}
      />

      {/* Modal de Opciones de Reinicio / Huerto en Blanco */}
      {isResetConfirmOpen && (
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
