import React, { useMemo, useState } from 'react';
import {
  ActiveTab,
} from './Navbar';
import {
  ChecklistControlHeladas,
  ClimaCondiciones,
  ConfigControlHeladas,
  ControlHeladaRegistro,
  EstadoFenologicoCatalogo,
  EstadoTurnoHelada,
  EventualidadHuerto,
  ExplotacionAgricola,
  MetodoControlHelada,
  NotificacionHelada,
  Parcela,
  SeguimientoFenologico,
  UsuarioPredio,
} from '../types/campo';
import {
  AlertTriangle,
  Bell,
  BellRing,
  Camera,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  CloudSun,
  Copy,
  Download,
  Droplet,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  Snowflake,
  Square,
  Thermometer,
  ThermometerSnowflake,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { exportControlHeladasPDF } from '../utils/pdfExport';
import { compressImageToDataUrl } from '../utils/imageCompress';
import { combinarCatalogoFenologico } from '../utils/fenologiaHelper';
import {
  HELADAS_CONFIG,
  buildDestinatariosNotificacionHelada,
  buildNotificacionHelada,
  calcularBulboHumedoC,
  calcularPuntoRocioC,
  evaluarRiesgoSensorHelada,
  resolveUmbralCriticoConfigurado,
} from '../config/heladasConfig';
import {
  BrowserNotificationPermissionState,
  broadcastFrostNotification,
  formatFrostAlertShareText,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  sendBrowserFrostNotification,
} from '../utils/notificacionesHelada';

interface ControlHeladasViewProps {
  controles: ControlHeladaRegistro[];
  onAddControl: (c: ControlHeladaRegistro) => void;
  onUpdateControl: (c: ControlHeladaRegistro) => void;
  onDeleteControl: (id: string) => void;
  config: ConfigControlHeladas;
  onUpdateConfig: (cfg: ConfigControlHeladas) => void;
  clima: ClimaCondiciones;
  onUpdateClima?: (clima: ClimaCondiciones) => void;
  parcelas: Parcela[];
  explotacion?: ExplotacionAgricola;
  eventualidades?: EventualidadHuerto[];
  fenologia?: SeguimientoFenologico[];
  estadosFenologicosPersonalizados?: EstadoFenologicoCatalogo[];
  usuarios?: UsuarioPredio[];
  activeUser?: UsuarioPredio;
  activeUserName?: string;
  canEdit?: boolean;
  onAcknowledgeNotificacion?: (notificacionId: string) => void;
  onNavigateTab?: (tab: ActiveTab) => void;
}

const METODOS_CONTROL: MetodoControlHelada[] = [
  'Aspersión Antihelada Sobre-Copa',
  'Microaspersión Sub-Copa',
  'Torres de Viento / Ventiladores',
  'Calefactores / Estufas',
  'Riego Nocturno / Suelo Húmedo',
  'Barreras / Manejo Cobertura',
  'Combinado',
];

const ESTADOS_TURNO: EstadoTurnoHelada[] = [
  'En Alerta',
  'Activo en Operación',
  'Finalizado',
  'Evaluado Post-Evento',
];

interface UmbralFenologicoKiwi {
  etapa: string;
  bbch: string;
  t10C: number;
  t90C: number;
  encendidoSugeridoC: number;
  alertaSugeridaC: number;
  notaAgronomica: string;
}

const UMBRALES_KIWI_HAYWARD: UmbralFenologicoKiwi[] = [
  {
    etapa: 'Dormancia Invernal',
    bbch: 'BBCH 00',
    t10C: -8.0,
    t90C: -12.0,
    encendidoSugeridoC: -4.0,
    alertaSugeridaC: -2.0,
    notaAgronomica: 'Madera y yemas dormantes tolerantes; riesgo solo en heladas polares severas.',
  },
  {
    etapa: 'Yema Hinchada / Algodón',
    bbch: 'BBCH 01-07',
    t10C: -3.0,
    t90C: -5.0,
    encendidoSugeridoC: -1.0,
    alertaSugeridaC: 0.5,
    notaAgronomica: 'Pérdida gradual de resistencia al frío; vigilar humedad relativa y viento.',
  },
  {
    etapa: 'Brotación / Brotes Tiernos',
    bbch: 'BBCH 09-19',
    t10C: -1.0,
    t90C: -2.2,
    encendidoSugeridoC: 0.5,
    alertaSugeridaC: 1.5,
    notaAgronomica: 'Máxima sensibilidad de tejidos herbáceos. Encender aspersión antes de 0°C de bulbo húmedo.',
  },
  {
    etapa: 'Botón Floral Visible',
    bbch: 'BBCH 51-59',
    t10C: -0.5,
    t90C: -1.5,
    encendidoSugeridoC: 0.8,
    alertaSugeridaC: 1.8,
    notaAgronomica: 'Daño directo compromete flor rey y potencia productiva de la temporada.',
  },
  {
    etapa: 'Floración / Cuaja Inicial',
    bbch: 'BBCH 61-71',
    t10C: 0.0,
    t90C: -1.0,
    encendidoSugeridoC: 1.0,
    alertaSugeridaC: 2.0,
    notaAgronomica: 'Cero tolerancia a tejido congelado. Mantener aspersión continua hasta deshielo.',
  },
];

function calcularDuracionHoras(horaInicio?: string, horaTermino?: string): number {
  if (!horaInicio || !horaTermino) return 0;
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaTermino.split(':').map(Number);
  if ([h1, m1, h2, m2].some((v) => Number.isNaN(v))) return 0;
  let min1 = h1 * 60 + m1;
  let min2 = h2 * 60 + m2;
  if (min2 < min1) min2 += 24 * 60; // Turno nocturno que cruza medianoche
  return Number(((min2 - min1) / 60).toFixed(2));
}

function getTemporadaPorFecha(fecha: string): string {
  const d = fecha ? new Date(`${fecha}T12:00:00`) : new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export const ControlHeladasView: React.FC<ControlHeladasViewProps> = ({
  controles,
  onAddControl,
  onUpdateControl,
  onDeleteControl,
  config,
  onUpdateConfig,
  clima,
  onUpdateClima,
  parcelas,
  explotacion,
  eventualidades = [],
  fenologia = [],
  estadosFenologicosPersonalizados = [],
  usuarios = [],
  activeUser,
  activeUserName = 'Operador Predio',
  canEdit = true,
  onAcknowledgeNotificacion,
  onNavigateTab,
}) => {
  const [filtroAnio, setFiltroAnio] = useState<string>('todos');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingControl, setEditingControl] = useState<ControlHeladaRegistro | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fotoZoomUrl, setFotoZoomUrl] = useState<string | null>(null);

  // Estado del centro de notificaciones proactivas y sensor
  const [browserPermission, setBrowserPermission] = useState<BrowserNotificationPermissionState>(
    () => getBrowserNotificationPermission()
  );
  const [isSyncingSensor, setIsSyncingSensor] = useState<boolean>(false);
  const [sensorFeedback, setSensorFeedback] = useState<string | null>(null);
  const [sensorTempInput, setSensorTempInput] = useState<string>(() =>
    clima.direccionViento !== 'Sin datos' ? String(clima.temperaturaActual) : ''
  );
  const [sensorHrInput, setSensorHrInput] = useState<string>(() =>
    clima.humedadRelativa > 0 ? String(clima.humedadRelativa) : '78'
  );
  const [sensorVientoInput, setSensorVientoInput] = useState<string>(() =>
    clima.velocidadVientoKmH > 0 ? String(clima.velocidadVientoKmH) : '3'
  );
  const [copiedNotifId, setCopiedNotifId] = useState<string | null>(null);

  // Estado editable local de configuración al abrir el panel
  const [draftConfig, setDraftConfig] = useState<ConfigControlHeladas>(config);

  const openConfigPanel = () => {
    setDraftConfig({
      ...config,
      umbralCriticoC: resolveUmbralCriticoConfigurado(config),
      notificacionesProactivas: {
        ...HELADAS_CONFIG.notificacionesProactivas,
        ...(config.notificacionesProactivas || {}),
      },
    });
    setShowConfigPanel((prev) => !prev);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const umbralCriticoNorm = Number(
      draftConfig.umbralCriticoC ?? draftConfig.umbralEncendidoC ?? HELADAS_CONFIG.umbralCriticoC
    );
    onUpdateConfig({
      ...config,
      ...draftConfig,
      umbralCriticoC: umbralCriticoNorm,
      umbralEncendidoC: Number.isFinite(draftConfig.umbralEncendidoC)
        ? draftConfig.umbralEncendidoC
        : umbralCriticoNorm,
      notificacionesProactivas: {
        ...HELADAS_CONFIG.notificacionesProactivas,
        ...(draftConfig.notificacionesProactivas || {}),
      },
      historialNotificaciones: config.historialNotificaciones || [],
    });
    setShowConfigPanel(false);
  };

  const handleToggleChecklistItem = (key: keyof Omit<ChecklistControlHeladas, 'fechaUltimaVerificacion' | 'responsableChecklist'>) => {
    if (!canEdit) return;
    const todayStr = new Date().toISOString().split('T')[0];
    onUpdateConfig({
      ...config,
      checklist: {
        ...config.checklist,
        [key]: !config.checklist[key],
        fechaUltimaVerificacion: todayStr,
        responsableChecklist: activeUserName,
      },
    });
  };

  const handleApplyUmbralSugerido = (u: UmbralFenologicoKiwi) => {
    if (!canEdit) return;
    const nextCfg: ConfigControlHeladas = {
      ...config,
      umbralAlertaC: u.alertaSugeridaC,
      umbralEncendidoC: u.encendidoSugeridoC,
      umbralCriticoC: u.encendidoSugeridoC,
      umbralApagadoC: Math.max(u.alertaSugeridaC, u.encendidoSugeridoC + 1.0),
      estadoFenologicoReferencia: `${u.etapa} (${u.bbch})`,
    };
    onUpdateConfig(nextCfg);
    setDraftConfig(nextCfg);
  };

  // Cálculos térmicos y evaluación del umbral crítico en vivo
  const hrLive = clima.humedadRelativa > 0 ? clima.humedadRelativa : 75;
  const twActual = calcularBulboHumedoC(clima.temperaturaActual, hrLive);
  const twMinima = calcularBulboHumedoC(clima.tempMinima, hrLive);
  const tdActual = calcularPuntoRocioC(clima.temperaturaActual, hrLive);

  const evalSensor = useMemo(
    () => evaluarRiesgoSensorHelada(clima, config),
    [clima, config]
  );

  const notifPolicy = config.notificacionesProactivas || HELADAS_CONFIG.notificacionesProactivas;
  const umbralCriticoActivo = resolveUmbralCriticoConfigurado(config);
  const destinatariosConfigurados = useMemo(
    () => buildDestinatariosNotificacionHelada(usuarios, notifPolicy),
    [usuarios, notifPolicy]
  );
  const adminsConfigurados = useMemo(
    () => destinatariosConfigurados.filter((d) => d.esAdministrador),
    [destinatariosConfigurados]
  );
  const otrosUsuariosConfigurados = useMemo(
    () => destinatariosConfigurados.filter((d) => !d.esAdministrador),
    [destinatariosConfigurados]
  );
  const historialNotificaciones = useMemo(
    () =>
      [...(config.historialNotificaciones || [])].sort((a, b) =>
        b.fechaHoraIso.localeCompare(a.fechaHoraIso)
      ),
    [config.historialNotificaciones]
  );

  const handleRequestBrowserPush = async () => {
    const res = await requestBrowserNotificationPermission();
    setBrowserPermission(res);
    if (res === 'granted') {
      setSensorFeedback('Notificaciones push del navegador activadas para alertas críticas de helada.');
    } else if (res === 'denied') {
      setSensorFeedback('El navegador bloqueó las notificaciones push. Habilítalas en el candado de la barra de direcciones; los avisos internos del huerto siguen activos.');
    }
  };

  const handleSyncSensorLive = async () => {
    if (!onUpdateClima) return;
    setIsSyncingSensor(true);
    setSensorFeedback(null);
    const lat = explotacion?.latitud ?? -39.628593;
    const lng = explotacion?.longitud ?? -72.461085;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,et0_fao_evapotranspiration&timezone=America%2FSantiago&forecast_days=3`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Error consultando Open-Meteo');
      const data = await resp.json();
      const tActual = Number((data?.current?.temperature_2m ?? clima.temperaturaActual).toFixed(1));
      const tMin = Number((data?.daily?.temperature_2m_min?.[0] ?? tActual).toFixed(1));
      const tMax = Number((data?.daily?.temperature_2m_max?.[0] ?? Math.max(tActual, 12)).toFixed(1));
      const hr = Math.round(data?.current?.relative_humidity_2m ?? 75);
      const wind = Number((data?.current?.wind_speed_10m ?? 4).toFixed(1));
      const rainProb = Math.round(data?.daily?.precipitation_probability_max?.[0] ?? 10);
      const eto = Number((data?.daily?.et0_fao_evapotranspiration?.[0] ?? 2.0).toFixed(2));
      const wCode = Number(data?.current?.weather_code ?? 0);

      const nextClima: ClimaCondiciones = {
        ...clima,
        temperaturaActual: tActual,
        tempMinima: tMin,
        tempMaxima: tMax,
        humedadRelativa: hr,
        velocidadVientoKmH: wind,
        direccionViento: 'Sensor Estación / Open-Meteo',
        probabilidadLluvia: rainProb,
        evapotranspiracionEtoMmDia: eto,
        alertaHelada: tActual < umbralCriticoActivo || tMin <= config.umbralAlertaC,
        estadoCielo: wCode >= 51 ? 'Lluvia Moderada' : wCode >= 2 ? 'Nublado' : 'Soleado',
      };
      onUpdateClima(nextClima);
      setSensorTempInput(String(tActual));
      setSensorHrInput(String(hr));
      setSensorVientoInput(String(wind));
      setSensorFeedback(
        tActual < umbralCriticoActivo
          ? `Sensor actualizado en ${tActual.toFixed(1)}°C (< umbral crítico ${umbralCriticoActivo.toFixed(1)}°C). Notificación automática activada.`
          : `Sensor sincronizado en vivo: ${tActual.toFixed(1)}°C (mínima hoy ${tMin.toFixed(1)}°C, HR ${hr}%).`
      );
    } catch {
      setSensorFeedback('No se pudo conectar con la estación meteorológica en línea. Puedes ingresar la lectura manual del sensor de terreno.');
    } finally {
      setIsSyncingSensor(false);
    }
  };

  const handleApplySensorTerreno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !onUpdateClima) return;
    const tNum = Number(sensorTempInput);
    if (!Number.isFinite(tNum)) {
      setSensorFeedback('Ingresa una temperatura numérica válida para el sensor.');
      return;
    }
    const hrNum = Math.max(10, Math.min(100, Number(sensorHrInput) || 78));
    const vientoNum = Math.max(0, Number(sensorVientoInput) || 0);
    const nextClima: ClimaCondiciones = {
      ...clima,
      temperaturaActual: Number(tNum.toFixed(1)),
      tempMinima:
        clima.direccionViento === 'Sin datos'
          ? Number(tNum.toFixed(1))
          : Math.min(clima.tempMinima, Number(tNum.toFixed(1))),
      tempMaxima:
        clima.direccionViento === 'Sin datos'
          ? Number(Math.max(tNum, 8).toFixed(1))
          : clima.tempMaxima,
      humedadRelativa: hrNum,
      velocidadVientoKmH: vientoNum,
      direccionViento: 'Sensor Terreno Predio',
      alertaHelada: tNum < umbralCriticoActivo || tNum <= config.umbralAlertaC,
    };
    onUpdateClima(nextClima);
    setSensorFeedback(
      tNum < umbralCriticoActivo
        ? `Lectura de sensor registrada (${tNum.toFixed(1)}°C < ${umbralCriticoActivo.toFixed(1)}°C). Se despachó alerta proactiva al Administrador y usuarios.`
        : `Lectura de sensor actualizada a ${tNum.toFixed(1)}°C (HR ${hrNum}%).`
    );
  };

  const handleSendManualFrostNotice = async () => {
    if (!canEdit) return;
    const canales: string[] = ['Panel Huerto & Nube', 'Canal Multi-Pestaña'];
    if (notifPolicy.pushNavegadorHabilitado && getBrowserNotificationPermission() === 'granted') {
      canales.push('Push Navegador');
    }

    const evalForNotice = evalSensor.sensorActivo
      ? evalSensor
      : {
          ...evalSensor,
          sensorActivo: true,
          tempSensorC: Number(sensorTempInput) || clima.temperaturaActual,
        };

    const notif = buildNotificacionHelada({
      tipo: evalSensor.bajoUmbralCritico ? 'umbral_critico_sensor' : 'aviso_manual',
      evalSensor: evalForNotice,
      clima,
      config,
      usuarios,
      emitidoPor: activeUser?.nombre || activeUserName,
      canales,
    });

    onUpdateConfig({
      ...config,
      historialNotificaciones: [notif, ...(config.historialNotificaciones || [])].slice(0, 40),
    });
    broadcastFrostNotification(notif);
    if (notifPolicy.pushNavegadorHabilitado) {
      await sendBrowserFrostNotification(notif, explotacion?.nombreFundo);
    }
    setSensorFeedback(
      `Aviso enviado a Administrador (${adminsConfigurados.length}) y ${Math.max(0, destinatariosConfigurados.length - adminsConfigurados.length)} usuarios del equipo.`
    );
  };

  const handleClearHistorialNotificaciones = () => {
    if (!canEdit) return;
    onUpdateConfig({
      ...config,
      historialNotificaciones: [],
    });
    setSensorFeedback('Historial de notificaciones proactivas limpiado.');
  };

  const handleCopyNotificacion = async (notif: NotificacionHelada) => {
    const text = formatFrostAlertShareText(notif, explotacion?.nombreFundo);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotifId(notif.id);
      setTimeout(() => setCopiedNotifId((prev) => (prev === notif.id ? null : prev)), 2500);
    } catch {
      setSensorFeedback('No se pudo copiar al portapapeles en este navegador.');
    }
  };

  const riesgoHeladaNivel = useMemo(() => {
    if (!evalSensor.sensorActivo) {
      return {
        nivel: 'ESPERANDO LECTURA DE SENSOR',
        badgeClass: 'bg-stone-700 text-white',
        cardClass: 'bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100',
        mensaje: `Sin lectura activa del sensor térmico. Sincroniza la estación en vivo o ingresa la lectura de terreno para evaluar el umbral crítico configurado (${umbralCriticoActivo.toFixed(1)}°C).`,
      };
    }
    const tEval = Math.min(clima.temperaturaActual, clima.tempMinima);
    if (evalSensor.bajoUmbralCritico || tEval <= config.umbralEncendidoC || twMinima <= config.umbralEncendidoC) {
      return {
        nivel: 'UMBRAL CRÍTICO / ACCIÓN INMEDIATA',
        badgeClass: 'bg-rose-600 text-white',
        cardClass: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100',
        mensaje: `Sensor en ${clima.temperaturaActual.toFixed(1)}°C (bulbo húmedo ${twActual.toFixed(1)}°C, mínima ${clima.tempMinima.toFixed(1)}°C) bajo umbral crítico configurado (${umbralCriticoActivo.toFixed(1)}°C). Activar defensa antihelada y notificar al equipo.`,
      };
    }
    if (tEval <= config.umbralAlertaC || tdActual <= 0) {
      return {
        nivel: 'ALERTA PREVENTIVA NOCTURNA',
        badgeClass: 'bg-amber-600 text-white',
        cardClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100',
        mensaje: `Condición de riesgo térmico (Sensor ${clima.temperaturaActual.toFixed(1)}°C · Mín ${clima.tempMinima.toFixed(1)}°C · Punto rocío ${tdActual.toFixed(1)}°C · Viento ${clima.velocidadVientoKmH} km/h). Preparar equipos y cuadrilla.`,
      };
    }
    return {
      nivel: 'SIN RIESGO INMINENTE',
      badgeClass: 'bg-emerald-700 text-white',
      cardClass: 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100',
      mensaje: `Temperaturas sobre umbral crítico (${umbralCriticoActivo.toFixed(1)}°C) y preventivo (${config.umbralAlertaC.toFixed(1)}°C). Monitoreo automático activo.`,
    };
  }, [clima, config, evalSensor, twActual, twMinima, tdActual, umbralCriticoActivo]);

  const checklistItems: {
    key: keyof Omit<ChecklistControlHeladas, 'fechaUltimaVerificacion' | 'responsableChecklist'>;
    label: string;
    detail: string;
  }[] = [
    {
      key: 'aspersoresLimpiosDestapados',
      label: 'Aspersores y microaspersores destapados',
      detail: 'Verificar rotación libre de rotores y ausencia de sedimentos en líneas laterales.',
    },
    {
      key: 'bombaPresionVerificada',
      label: 'Bomba principal, presión (bar) y válvulas probadas',
      detail: 'Prueba en seco/carga con manómetro en cabecera y revisión de sellos.',
    },
    {
      key: 'caudalimetroOperativo',
      label: 'Caudalímetro operativo y lectura inicial anotada',
      detail: 'Lectura base m³ registrada antes del turno nocturno.',
    },
    {
      key: 'combustibleEnergiaRespaldo',
      label: 'Estanque de combustible / grupo electrógeno al 100%',
      detail: 'Autonomía garantizada para al menos 10 horas continuas de helada.',
    },
    {
      key: 'sensoresTermicosCalibrados',
      label: 'Termómetros min/máx y bulbo húmedo calibrados',
      detail: 'Verificación en punto de rocío/hielo en sectores bajos (ollas térmicas).',
    },
    {
      key: 'sueloHumedoSinMalezaAlta',
      label: 'Suelo húmedo compacto y entrehilera desmalezada',
      detail: 'Maximiza almacenamiento térmico diurno del suelo sin interferencia vegetal.',
    },
  ];

  const checklistCompletados = checklistItems.filter((it) => Boolean(config.checklist[it.key])).length;

  // Estados fenológicos disponibles
  const estadosFenologicosOpciones = useMemo<string[]>(() => {
    const catalogo = combinarCatalogoFenologico(
      estadosFenologicosPersonalizados,
      fenologia,
      parcelas
    );
    return catalogo.map((c) => `${c.nombre} (${c.code})`);
  }, [estadosFenologicosPersonalizados, fenologia, parcelas]);

  // Filtros de bitácora
  const aniosDisponibles = useMemo(() => {
    const set = new Set<number>();
    controles.forEach((c) => {
      if (c.anio) set.add(c.anio);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [controles]);

  const controlesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return [...controles]
      .filter((c) => {
        if (filtroAnio !== 'todos' && String(c.anio) !== filtroAnio) return false;
        if (filtroMetodo !== 'todos' && c.metodoControl !== filtroMetodo) return false;
        if (filtroEstado !== 'todos' && c.estadoTurno !== filtroEstado) return false;
        if (q) {
          const hay = [
            c.fecha,
            c.tipoHelada,
            c.metodoControl,
            c.estadoFenologico,
            c.operadorResponsable,
            c.tratamientoPostHelada || '',
            c.observaciones || '',
            ...(c.parcelasNombres || []),
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [controles, filtroAnio, filtroMetodo, filtroEstado, busqueda]);

  // KPIs calculados sobre la vista filtrada
  const kpis = useMemo(() => {
    const totalTurnos = controlesFiltrados.length;
    const minAbsoluta =
      totalTurnos > 0 ? Math.min(...controlesFiltrados.map((c) => c.tempMinimaAireC)) : null;
    const totalHoras = controlesFiltrados.reduce((acc, c) => acc + (c.duracionHoras || 0), 0);
    const totalAguaM3 = controlesFiltrados.reduce((acc, c) => acc + (c.volumenAguaM3 || 0), 0);
    const conDanio = controlesFiltrados.filter((c) => typeof c.danioEstimadoPct === 'number');
    const promDanio =
      conDanio.length > 0
        ? conDanio.reduce((acc, c) => acc + (c.danioEstimadoPct || 0), 0) / conDanio.length
        : 0;
    return {
      totalTurnos,
      minAbsoluta,
      totalHoras: Number(totalHoras.toFixed(1)),
      totalAguaM3: Number(totalAguaM3.toFixed(1)),
      promDanio: Number(promDanio.toFixed(1)),
    };
  }, [controlesFiltrados]);

  // Eventualidades de helada registradas en módulo Clima
  const eventualidadesHelada = useMemo(
    () =>
      eventualidades.filter(
        (ev) => ev.tipo === 'Helada Radiativa' || ev.tipo === 'Helada Advectiva'
      ),
    [eventualidades]
  );

  // Estado del formulario modal
  const todayIso = new Date().toISOString().split('T')[0];
  const [fFecha, setFFecha] = useState(todayIso);
  const [fTemporada, setFTemporada] = useState(getTemporadaPorFecha(todayIso));
  const [fTipoHelada, setFTipoHelada] = useState<ControlHeladaRegistro['tipoHelada']>('Helada Radiativa');
  const [fMetodo, setFMetodo] = useState<MetodoControlHelada>(config.metodoPrincipalPredio);
  const [fEstadoTurno, setFEstadoTurno] = useState<EstadoTurnoHelada>('Finalizado');
  const [fHoraInicio, setFHoraInicio] = useState('01:30');
  const [fHoraTermino, setFHoraTermino] = useState('08:00');
  const [fDuracionHoras, setFDuracionHoras] = useState('6.5');
  const [fTempEncendido, setFTempEncendido] = useState(String(config.umbralEncendidoC));
  const [fTempMinima, setFTempMinima] = useState('-1.5');
  const [fTempBulboHumedo, setFTempBulboHumedo] = useState('');
  const [fTempApagado, setFTempApagado] = useState(String(config.umbralApagadoC));
  const [fViento, setFViento] = useState('');
  const [fHumedad, setFHumedad] = useState('');
  const [fPresionBar, setFPresionBar] = useState('');
  const [fCaudIni, setFCaudIni] = useState('');
  const [fCaudFin, setFCaudFin] = useState('');
  const [fVolumenAgua, setFVolumenAgua] = useState('');
  const [fHorasEquipo, setFHorasEquipo] = useState('');
  const [fCombustible, setFCombustible] = useState('');
  const [fParcelasIds, setFParcelasIds] = useState<string[]>([]);
  const [fSuperficieHa, setFSuperficieHa] = useState('');
  const [fEstadoFenologico, setFEstadoFenologico] = useState(config.estadoFenologicoReferencia);
  const [fDanioPct, setFDanioPct] = useState('0');
  const [fTratamientoPost, setFTratamientoPost] = useState('');
  const [fOperador, setFOperador] = useState(activeUserName);
  const [fObservaciones, setFObservaciones] = useState('');
  const [fFotoEvidenciaDataUrl, setFFotoEvidenciaDataUrl] = useState('');

  const recalcDuracion = (ini: string, fin: string) => {
    const hrs = calcularDuracionHoras(ini, fin);
    if (hrs > 0) setFDuracionHoras(String(hrs));
  };

  const recalcAguaFromCaudalimetros = (iniStr: string, finStr: string) => {
    const ini = Number(iniStr);
    const fin = Number(finStr);
    if (iniStr !== '' && finStr !== '' && Number.isFinite(ini) && Number.isFinite(fin) && fin >= ini) {
      setFVolumenAgua(String(Number((fin - ini).toFixed(2))));
    }
  };

  const recalcSuperficieFromParcelas = (ids: string[]) => {
    if (ids.length === 0) {
      const totalAll = parcelas.reduce((s, p) => s + (p.superficieHa || 0), 0);
      setFSuperficieHa(totalAll > 0 ? String(Number(totalAll.toFixed(2))) : '0');
      return;
    }
    const sum = parcelas
      .filter((p) => ids.includes(p.id))
      .reduce((s, p) => s + (p.superficieHa || 0), 0);
    setFSuperficieHa(String(Number(sum.toFixed(2))));
  };

  const handleOpenNewModal = (prefillFromClima = false) => {
    if (!canEdit) return;
    setFormError(null);
    setEditingControl(null);
    const hoy = new Date().toISOString().split('T')[0];
    setFFecha(hoy);
    setFTemporada(getTemporadaPorFecha(hoy));
    setFTipoHelada(clima.velocidadVientoKmH > 12 ? 'Helada Advectiva' : 'Helada Radiativa');
    setFMetodo(config.metodoPrincipalPredio);
    setFEstadoTurno(prefillFromClima ? 'Activo en Operación' : 'Finalizado');
    setFHoraInicio('01:30');
    setFHoraTermino(prefillFromClima ? '' : '08:00');
    setFDuracionHoras(prefillFromClima ? '0' : '6.5');
    setFTempEncendido(String(config.umbralEncendidoC));
    setFTempMinima(prefillFromClima ? String(clima.tempMinima) : '-1.5');
    setFTempBulboHumedo(
      prefillFromClima ? String(calcularBulboHumedoC(clima.tempMinima, hrLive)) : ''
    );
    setFTempApagado(String(config.umbralApagadoC));
    setFViento(prefillFromClima ? String(clima.velocidadVientoKmH) : String(clima.velocidadVientoKmH || ''));
    setFHumedad(prefillFromClima ? String(hrLive) : String(clima.humedadRelativa || ''));
    setFPresionBar('');
    setFCaudIni('');
    setFCaudFin('');
    setFVolumenAgua('');
    setFHorasEquipo('');
    setFCombustible('');
    const allIds = parcelas.map((p) => p.id);
    setFParcelasIds(allIds);
    recalcSuperficieFromParcelas(allIds);
    setFEstadoFenologico(config.estadoFenologicoReferencia);
    setFDanioPct('0');
    setFTratamientoPost('');
    setFOperador(activeUserName);
    setFObservaciones('');
    setFFotoEvidenciaDataUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (reg: ControlHeladaRegistro) => {
    if (!canEdit) return;
    setFormError(null);
    setEditingControl(reg);
    setFFecha(reg.fecha);
    setFTemporada(reg.temporada);
    setFTipoHelada(reg.tipoHelada);
    setFMetodo(reg.metodoControl);
    setFEstadoTurno(reg.estadoTurno);
    setFHoraInicio(reg.horaInicio);
    setFHoraTermino(reg.horaTermino || '');
    setFDuracionHoras(String(reg.duracionHoras ?? 0));
    setFTempEncendido(String(reg.tempEncendidoC));
    setFTempMinima(String(reg.tempMinimaAireC));
    setFTempBulboHumedo(reg.tempBulboHumedoC !== undefined ? String(reg.tempBulboHumedoC) : '');
    setFTempApagado(reg.tempApagadoC !== undefined ? String(reg.tempApagadoC) : '');
    setFViento(reg.vientoKmH !== undefined ? String(reg.vientoKmH) : '');
    setFHumedad(reg.humedadRelativaPct !== undefined ? String(reg.humedadRelativaPct) : '');
    setFPresionBar(reg.presionOperacionBar !== undefined ? String(reg.presionOperacionBar) : '');
    setFCaudIni(reg.caudalimetroInicialM3 !== undefined ? String(reg.caudalimetroInicialM3) : '');
    setFCaudFin(reg.caudalimetroFinalM3 !== undefined ? String(reg.caudalimetroFinalM3) : '');
    setFVolumenAgua(reg.volumenAguaM3 !== undefined ? String(reg.volumenAguaM3) : '');
    setFHorasEquipo(reg.horasEquipo !== undefined ? String(reg.horasEquipo) : '');
    setFCombustible(reg.litrosCombustible !== undefined ? String(reg.litrosCombustible) : '');
    setFParcelasIds(reg.parcelasIds || []);
    setFSuperficieHa(String(reg.superficieProtegidaHa ?? 0));
    setFEstadoFenologico(reg.estadoFenologico || config.estadoFenologicoReferencia);
    setFDanioPct(reg.danioEstimadoPct !== undefined ? String(reg.danioEstimadoPct) : '0');
    setFTratamientoPost(reg.tratamientoPostHelada || '');
    setFOperador(reg.operadorResponsable || activeUserName);
    setFObservaciones(reg.observaciones || '');
    setFFotoEvidenciaDataUrl(reg.fotoEvidenciaDataUrl || '');
    setIsModalOpen(true);
  };

  const handleToggleParcela = (id: string) => {
    setFParcelasIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      recalcSuperficieFromParcelas(next);
      return next;
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fFecha) {
      setFormError('Debes indicar la fecha del evento o turno antihelada.');
      return;
    }
    if (!fHoraInicio) {
      setFormError('Debes indicar la hora de inicio del control.');
      return;
    }
    const tMinNum = Number(fTempMinima);
    const tEncNum = Number(fTempEncendido);
    if (!Number.isFinite(tMinNum) || !Number.isFinite(tEncNum)) {
      setFormError('Ingresa temperaturas válidas (°C) de encendido y mínima alcanzada.');
      return;
    }
    if (fCaudIni !== '' && fCaudFin !== '' && Number(fCaudFin) < Number(fCaudIni)) {
      setFormError('El caudalímetro final (m³) no puede ser menor al caudalímetro inicial.');
      return;
    }

    const parsedYear = Number(fFecha.slice(0, 4)) || new Date().getFullYear();
    const parcelasSelected = parcelas.filter((p) => fParcelasIds.includes(p.id));
    const supHa = Number(fSuperficieHa) || 0;

    const record: ControlHeladaRegistro = {
      id: editingControl ? editingControl.id : `hel-${Date.now()}`,
      fecha: fFecha,
      anio: parsedYear,
      temporada: fTemporada.trim() || getTemporadaPorFecha(fFecha),
      tipoHelada: fTipoHelada,
      metodoControl: fMetodo,
      estadoTurno: fEstadoTurno,
      horaInicio: fHoraInicio,
      horaTermino: fHoraTermino || undefined,
      duracionHoras: Number(fDuracionHoras) || 0,
      tempEncendidoC: tEncNum,
      tempMinimaAireC: tMinNum,
      tempBulboHumedoC: fTempBulboHumedo !== '' ? Number(fTempBulboHumedo) : undefined,
      tempApagadoC: fTempApagado !== '' ? Number(fTempApagado) : undefined,
      vientoKmH: fViento !== '' ? Number(fViento) : undefined,
      humedadRelativaPct: fHumedad !== '' ? Number(fHumedad) : undefined,
      presionOperacionBar: fPresionBar !== '' ? Number(fPresionBar) : undefined,
      caudalimetroInicialM3: fCaudIni !== '' ? Number(fCaudIni) : undefined,
      caudalimetroFinalM3: fCaudFin !== '' ? Number(fCaudFin) : undefined,
      volumenAguaM3: fVolumenAgua !== '' ? Number(fVolumenAgua) : undefined,
      horasEquipo: fHorasEquipo !== '' ? Number(fHorasEquipo) : undefined,
      litrosCombustible: fCombustible !== '' ? Number(fCombustible) : undefined,
      parcelasIds: fParcelasIds,
      parcelasNombres:
        parcelasSelected.length > 0
          ? parcelasSelected.map((p) => p.nombre)
          : ['Todo el predio'],
      superficieProtegidaHa: supHa,
      estadoFenologico: fEstadoFenologico.trim() || config.estadoFenologicoReferencia,
      danioEstimadoPct: fDanioPct !== '' ? Number(fDanioPct) : undefined,
      tratamientoPostHelada: fTratamientoPost.trim() || undefined,
      operadorResponsable: fOperador.trim() || activeUserName,
      observaciones: fObservaciones.trim() || undefined,
      fotoEvidenciaDataUrl: fFotoEvidenciaDataUrl || undefined,
    };

    if (editingControl) {
      onUpdateControl(record);
    } else {
      onAddControl(record);
    }
    setIsModalOpen(false);
    setEditingControl(null);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del Módulo */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 text-[11px] font-bold uppercase tracking-wider mb-1">
            <ThermometerSnowflake className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
            <span>Defensa Activa Antiheladas · Kiwi Hayward</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Control de Heladas &amp; Protocolo Térmico Nocturno
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Monitoreo de umbrales críticos por fenología, temperatura de bulbo húmedo, turnos de aspersión/torres, caudalímetros y evaluación post-evento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canEdit && (
            <button
              type="button"
              onClick={openConfigPanel}
              className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" />
              <span>Configurar Umbrales</span>
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              exportControlHeladasPDF(
                controlesFiltrados,
                config,
                explotacion,
                filtroAnio !== 'todos' ? `Año ${filtroAnio}` : undefined
              )
            }
            className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
            <span>Exportar PDF</span>
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => handleOpenNewModal(false)}
              className="px-3.5 py-2 bg-cyan-900 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Control de Helada</span>
            </button>
          )}
        </div>
      </div>

      {/* Estado de Alerta en Vivo + Psicrometría (Bulbo Húmedo & Punto de Rocío) */}
      <div className={`rounded-2xl border p-5 shadow-2xs space-y-4 ${riesgoHeladaNivel.cardClass}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${riesgoHeladaNivel.badgeClass}`}>
                {riesgoHeladaNivel.nivel}
              </span>
              <span className="text-xs font-bold opacity-80">
                Referencia activa: {config.estadoFenologicoReferencia}
              </span>
            </div>
            <p className="text-xs leading-relaxed font-medium">{riesgoHeladaNivel.mensaje}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={() => handleOpenNewModal(true)}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Snowflake className="w-3.5 h-3.5 text-cyan-300" />
                <span>Iniciar Turno Antihelada Ahora</span>
              </button>
            )}
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('clima')}
                className="px-3 py-2 bg-white/80 dark:bg-stone-900/90 hover:bg-white dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <CloudSun className="w-3.5 h-3.5 text-amber-600" />
                <span>Ver Pronóstico en Clima</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-3 bg-white/85 dark:bg-stone-900/90 rounded-xl border border-stone-200/80 dark:border-stone-800">
            <div className="text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400">T° Aire / Mín</div>
            <div className="text-base font-black text-stone-900 dark:text-stone-100 font-mono tabular-nums mt-0.5">
              {clima.temperaturaActual.toFixed(1)}° / {clima.tempMinima.toFixed(1)}°C
            </div>
          </div>
          <div className="p-3 bg-white/85 dark:bg-stone-900/90 rounded-xl border border-stone-200/80 dark:border-stone-800">
            <div className="text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400">Bulbo Húmedo Est.</div>
            <div className="text-base font-black text-cyan-900 dark:text-cyan-200 font-mono tabular-nums mt-0.5">
              {twActual.toFixed(1)}° / Mín {twMinima.toFixed(1)}°C
            </div>
          </div>
          <div className="p-3 bg-white/85 dark:bg-stone-900/90 rounded-xl border border-stone-200/80 dark:border-stone-800">
            <div className="text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400">Punto de Rocío</div>
            <div className="text-base font-black text-stone-900 dark:text-stone-100 font-mono tabular-nums mt-0.5">
              {tdActual.toFixed(1)}°C
            </div>
          </div>
          <div className="p-3 bg-white/85 dark:bg-stone-900/90 rounded-xl border border-stone-200/80 dark:border-stone-800">
            <div className="text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400">HR &amp; Viento</div>
            <div className="text-sm font-black text-stone-900 dark:text-stone-100 font-mono tabular-nums mt-0.5">
              {hrLive}% · {clima.velocidadVientoKmH} km/h
            </div>
          </div>
          <div className="p-3 bg-white/85 dark:bg-stone-900/90 rounded-xl border border-stone-200/80 dark:border-stone-800">
            <div className="text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400">Umbral Encendido</div>
            <div className="text-base font-black text-rose-800 dark:text-rose-300 font-mono tabular-nums mt-0.5">
              ≤ {config.umbralEncendidoC.toFixed(1)}°C
            </div>
          </div>
          <div className="p-3 bg-white/85 dark:bg-stone-900/90 rounded-xl border border-stone-200/80 dark:border-stone-800">
            <div className="text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400">Umbral Apagado</div>
            <div className="text-base font-black text-emerald-800 dark:text-emerald-300 font-mono tabular-nums mt-0.5">
              ≥ {config.umbralApagadoC.toFixed(1)}°C
            </div>
          </div>
        </div>
      </div>

      {/* Panel Desplegable de Configuración de Umbrales y Notificaciones Proactivas */}
      {showConfigPanel && canEdit && (
        <form
          onSubmit={handleSaveConfig}
          className="bg-white dark:bg-stone-900 rounded-2xl border border-cyan-300 dark:border-cyan-700 p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                <span>Configuración de Protocolo, Umbral Crítico y Notificaciones Proactivas</span>
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                Base predeterminada definida en <span className="font-mono text-stone-700 dark:text-stone-300">src/config/heladasConfig.ts</span> (Umbral crítico inicial: {HELADAS_CONFIG.umbralCriticoC.toFixed(1)}°C).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowConfigPanel(false)}
              className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                Umbral Crítico Notificación Sensor (°C):
              </label>
              <input
                type="number"
                step="0.1"
                value={draftConfig.umbralCriticoC ?? draftConfig.umbralEncendidoC}
                onChange={(e) =>
                  setDraftConfig({
                    ...draftConfig,
                    umbralCriticoC: Number(e.target.value),
                  })
                }
                className="w-full p-2.5 bg-white dark:bg-stone-800 border border-rose-300 dark:border-rose-700 rounded-xl font-mono font-bold text-rose-900 dark:text-rose-200"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                Umbral Alerta Preventiva (°C):
              </label>
              <input
                type="number"
                step="0.1"
                value={draftConfig.umbralAlertaC}
                onChange={(e) =>
                  setDraftConfig({ ...draftConfig, umbralAlertaC: Number(e.target.value) })
                }
                className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                Umbral Encendido Sistemas (°C):
              </label>
              <input
                type="number"
                step="0.1"
                value={draftConfig.umbralEncendidoC}
                onChange={(e) =>
                  setDraftConfig({ ...draftConfig, umbralEncendidoC: Number(e.target.value) })
                }
                className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                Umbral Apagado Seguro (°C):
              </label>
              <input
                type="number"
                step="0.1"
                value={draftConfig.umbralApagadoC}
                onChange={(e) =>
                  setDraftConfig({ ...draftConfig, umbralApagadoC: Number(e.target.value) })
                }
                className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                Método Principal del Predio:
              </label>
              <select
                value={draftConfig.metodoPrincipalPredio}
                onChange={(e) =>
                  setDraftConfig({
                    ...draftConfig,
                    metodoPrincipalPredio: e.target.value as MetodoControlHelada,
                  })
                }
                className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl dark:text-stone-100"
              >
                {METODOS_CONTROL.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                Estado Fenológico de Referencia:
              </label>
              <select
                value={draftConfig.estadoFenologicoReferencia}
                onChange={(e) =>
                  setDraftConfig({ ...draftConfig, estadoFenologicoReferencia: e.target.value })
                }
                className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl dark:text-stone-100"
              >
                {estadosFenologicosOpciones.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
                {!estadosFenologicosOpciones.includes(draftConfig.estadoFenologicoReferencia) && (
                  <option value={draftConfig.estadoFenologicoReferencia}>
                    {draftConfig.estadoFenologicoReferencia}
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 space-y-3 text-xs">
            <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                Reglas de Envío Proactivo (Administrador y Usuarios)
              </span>
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">Cooldown (min):</label>
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={draftConfig.notificacionesProactivas?.cooldownMinutos ?? 30}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      notificacionesProactivas: {
                        ...HELADAS_CONFIG.notificacionesProactivas,
                        ...(draftConfig.notificacionesProactivas || {}),
                        cooldownMinutos: Math.max(1, Number(e.target.value) || 30),
                      },
                    })
                  }
                  className="w-20 p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono text-center dark:text-stone-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                { key: 'habilitadas' as const, label: 'Notificaciones proactivas activas' },
                { key: 'notificarAdministrador' as const, label: 'Notificar al Administrador del predio' },
                { key: 'notificarTodosUsuarios' as const, label: 'Notificar a todos los usuarios' },
                { key: 'incluirBulboHumedo' as const, label: 'Alertar también por Bulbo Húmedo < umbral' },
                { key: 'pushNavegadorHabilitado' as const, label: 'Emitir Push del Navegador al cruzar umbral' },
              ].map((opt) => {
                const checked = Boolean(
                  draftConfig.notificacionesProactivas?.[opt.key] ??
                    HELADAS_CONFIG.notificacionesProactivas[opt.key]
                );
                return (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 p-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl cursor-pointer hover:border-cyan-300"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          notificacionesProactivas: {
                            ...HELADAS_CONFIG.notificacionesProactivas,
                            ...(draftConfig.notificacionesProactivas || {}),
                            [opt.key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-stone-300 dark:border-stone-700 text-cyan-800 dark:text-cyan-300 bg-white dark:bg-stone-800"
                    />
                    <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
              Protocolo / Notas de Operación de Emergencia:
            </label>
            <textarea
              rows={2}
              value={draftConfig.protocoloEmergenciaNotas || ''}
              onChange={(e) =>
                setDraftConfig({ ...draftConfig, protocoloEmergenciaNotas: e.target.value })
              }
              className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs dark:text-stone-100"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfigPanel(false)}
              className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-900 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              Guardar Umbrales y Notificaciones
            </button>
          </div>
        </form>
      )}

      {/* Centro de Notificaciones Proactivas (Administrador & Todos los Usuarios) */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <BellRing className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
              <h2 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                Notificaciones Proactivas · Sensor vs Umbral Crítico
              </h2>
              <span className="text-[11px] font-mono tabular-nums font-bold text-stone-600 dark:text-stone-400">
                Umbral configurado: &lt; {umbralCriticoActivo.toFixed(1)}°C
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Envía aviso automático al <strong className="text-stone-700 dark:text-stone-300">Administrador</strong> ({adminsConfigurados.length}) y a <strong className="text-stone-700 dark:text-stone-300">todos los usuarios</strong> ({otrosUsuariosConfigurados.length}) cuando la temperatura del sensor cae bajo el umbral crítico de <span className="font-mono text-stone-700 dark:text-stone-300">heladasConfig.ts</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRequestBrowserPush}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                browserPermission === 'granted'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                  : browserPermission === 'denied'
                  ? 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                  : 'bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800/70 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>
                {browserPermission === 'granted'
                  ? 'Push Navegador Activo'
                  : browserPermission === 'denied'
                  ? 'Push Bloqueado'
                  : browserPermission === 'unsupported'
                  ? 'Push No Soportado'
                  : 'Activar Push Navegador'}
              </span>
            </button>

            {canEdit && onUpdateClima && (
              <button
                type="button"
                disabled={isSyncingSensor}
                onClick={handleSyncSensorLive}
                className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-800 dark:text-cyan-300 ${isSyncingSensor ? 'animate-spin' : ''}`} />
                <span>{isSyncingSensor ? 'Sincronizando...' : 'Sincronizar Sensor en Vivo'}</span>
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={handleSendManualFrostNotice}
                className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar Aviso al Equipo</span>
              </button>
            )}
          </div>
        </div>

        {/* Estado en vivo + Lectura directa sensor de terreno */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-cyan-800 dark:text-cyan-300" />
                Lectura de Sensor Térmico
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono truncate max-w-[200px]" title={clima.estacionNombre || clima.direccionViento}>
                {evalSensor.sensorActivo
                  ? clima.fuenteDatos && clima.fuenteDatos !== 'Open-Meteo Satelital'
                    ? `${clima.fuenteDatos}${clima.estacionNombre ? ` · ${clima.estacionNombre}` : ''}`
                    : clima.direccionViento
                  : 'Sin lectura activa'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800">
                <div className="text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400">Sensor Aire</div>
                <div
                  className={`text-base font-black font-mono tabular-nums mt-0.5 ${
                    evalSensor.sensorActivo && evalSensor.tempSensorC < umbralCriticoActivo
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-stone-900 dark:text-stone-100'
                  }`}
                >
                  {evalSensor.sensorActivo ? `${evalSensor.tempSensorC.toFixed(1)}°C` : '—'}
                </div>
              </div>
              <div className="p-2.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800">
                <div className="text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400">Bulbo Húmedo</div>
                <div
                  className={`text-base font-black font-mono tabular-nums mt-0.5 ${
                    evalSensor.sensorActivo && evalSensor.tempBulboHumedoC < umbralCriticoActivo
                      ? 'text-rose-700 dark:text-rose-400'
                      : 'text-cyan-900 dark:text-cyan-200'
                  }`}
                >
                  {evalSensor.sensorActivo ? `${evalSensor.tempBulboHumedoC.toFixed(1)}°C` : '—'}
                </div>
              </div>
              <div className="p-2.5 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800">
                <div className="text-[10px] font-bold uppercase text-stone-500 dark:text-stone-400">Umbral Crítico</div>
                <div className="text-base font-black font-mono tabular-nums text-rose-800 dark:text-rose-300 mt-0.5">
                  &lt; {umbralCriticoActivo.toFixed(1)}°C
                </div>
              </div>
            </div>

            {canEdit && onUpdateClima && (
              <form onSubmit={handleApplySensorTerreno} className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
                <div className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                  Ingresar Lectura Manual de Sensor en Terreno:
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-stone-500 dark:text-stone-400 mb-0.5">T° Sensor (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sensorTempInput}
                      onChange={(e) => setSensorTempInput(e.target.value)}
                      placeholder="Ej. 0.2"
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono text-xs dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500 dark:text-stone-400 mb-0.5">Humedad (%)</label>
                    <input
                      type="number"
                      step="1"
                      min="10"
                      max="100"
                      value={sensorHrInput}
                      onChange={(e) => setSensorHrInput(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono text-xs dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-500 dark:text-stone-400 mb-0.5">Viento (km/h)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={sensorVientoInput}
                      onChange={(e) => setSensorVientoInput(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono text-xs dark:text-stone-100"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-3 bg-cyan-900 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
                >
                  Aplicar Lectura Sensor &amp; Evaluar Umbral
                </button>
              </form>
            )}
          </div>

          {/* Destinatarios configurados: Administrador + Todos los Usuarios */}
          <div className="lg:col-span-7 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-800 dark:text-cyan-300" />
                Destinatarios de Alerta Proactiva ({destinatariosConfigurados.length} configurados)
              </span>
              <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                {notifPolicy.habilitadas ? 'Despacho automático ACTIVO' : 'Despacho automático PAUSADO'} · Cooldown {notifPolicy.cooldownMinutos} min
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  Administrador del Predio ({adminsConfigurados.length})
                </div>
                {adminsConfigurados.length === 0 ? (
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Sin administrador asignado.</p>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {adminsConfigurados.map((adm) => (
                      <div key={adm.usuarioId} className="py-1.5 first:pt-0 last:pb-0">
                        <div className="font-bold text-stone-900 dark:text-stone-100">{adm.nombre}</div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400">
                          {adm.email || 'Sin correo'} {adm.telefono ? `· ${adm.telefono}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  Todos los Usuarios del Equipo ({otrosUsuariosConfigurados.length})
                </div>
                {otrosUsuariosConfigurados.length === 0 ? (
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {notifPolicy.notificarTodosUsuarios
                      ? 'No hay usuarios adicionales registrados en Equipo & Usuarios.'
                      : 'Envío a usuarios adicionales desactivado en configuración.'}
                  </p>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-32 overflow-y-auto pr-1">
                    {otrosUsuariosConfigurados.map((usr) => (
                      <div key={usr.usuarioId} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">{usr.nombre}</div>
                          <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                            {usr.rol.replace(/_/g, ' ')} {usr.telefono ? `· ${usr.telefono}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {sensorFeedback && (
          <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/80 text-xs text-cyan-950 dark:text-cyan-100 flex items-center justify-between gap-2">
            <span className="font-medium">{sensorFeedback}</span>
            <button
              type="button"
              onClick={() => setSensorFeedback(null)}
              className="text-cyan-800 dark:text-cyan-300 hover:text-cyan-950 dark:hover:text-cyan-100 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Historial de Notificaciones Proactivas Despachadas */}
        <div className="space-y-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Bitácora de Notificaciones Enviadas ({historialNotificaciones.length})
            </h3>
            {canEdit && historialNotificaciones.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistorialNotificaciones}
                className="text-[11px] font-bold text-stone-500 dark:text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer whitespace-nowrap"
              >
                Limpiar historial
              </button>
            )}
          </div>

          {historialNotificaciones.length === 0 ? (
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400">
              No se han emitido notificaciones críticas aún. Cuando el sensor baje de{' '}
              <span className="font-mono font-bold text-stone-700 dark:text-stone-300">{umbralCriticoActivo.toFixed(1)}°C</span>, el sistema generará un aviso automático para el Administrador y todo el equipo.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {historialNotificaciones.map((notif) => {
                const leidosCount = notif.destinatarios.filter((d) => d.estadoEntrega === 'leida').length;
                const miRegistro = activeUser
                  ? notif.destinatarios.find((d) => d.usuarioId === activeUser.id)
                  : undefined;
                const fechaFmt = new Date(notif.fechaHoraIso).toLocaleString('es-CL', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-xl border space-y-2.5 ${
                      notif.severidad === 'critica'
                        ? 'bg-rose-50/50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80'
                        : 'bg-amber-50/50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-black ${
                              notif.severidad === 'critica' ? 'text-rose-900 dark:text-rose-200' : 'text-amber-900 dark:text-amber-200'
                            }`}
                          >
                            {notif.titulo}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono tabular-nums">
                          {fechaFmt} · Sensor: {notif.tempSensorC.toFixed(1)}°C · Umbral Crítico:{' '}
                          {notif.umbralCriticoConfiguradoC.toFixed(1)}°C
                          {notif.tempBulboHumedoC !== undefined
                            ? ` · BH: ${notif.tempBulboHumedoC.toFixed(1)}°C`
                            : ''}{' '}
                          · Emisor: {notif.emitidoPor}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono tabular-nums font-bold text-stone-700 dark:text-stone-300">
                          Confirmados {leidosCount}/{notif.destinatarios.length}
                        </span>
                        {onAcknowledgeNotificacion && miRegistro && miRegistro.estadoEntrega !== 'leida' && (
                          <button
                            type="button"
                            onClick={() => onAcknowledgeNotificacion(notif.id)}
                            className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <Check className="w-3 h-3" />
                            <span>Confirmar Lectura</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyNotificacion(notif)}
                          className="px-2.5 py-1 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedNotifId === notif.id ? 'Copiado' : 'Copiar Aviso'}</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed">{notif.mensaje}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-600 dark:text-stone-400 pt-1 border-t border-stone-200/70 dark:border-stone-800">
                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        Canales: {notif.canales.join(' · ')}
                      </span>
                      <span className="text-stone-400">|</span>
                      <span className="font-semibold text-stone-700 dark:text-stone-300">Destinatarios:</span>
                      {notif.destinatarios.map((d) => (
                        <span key={d.usuarioId} className="inline-flex items-center gap-1">
                          <span className={d.esAdministrador ? 'font-bold text-rose-900 dark:text-rose-300' : 'text-stone-800 dark:text-stone-200'}>
                            {d.nombre}
                            {d.esAdministrador ? ' (Admin)' : ''}
                          </span>
                          <span
                            className={`font-mono text-[10px] ${
                              d.estadoEntrega === 'leida' ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-stone-500 dark:text-stone-400'
                            }`}
                          >
                            [{d.estadoEntrega === 'leida' ? 'Leída' : 'Enviada'}]
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Doble Columna: Umbrales Críticos Kiwi Hayward + Checklist Operacional Pre-Helada */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Tabla Umbrales Críticos por Fenología */}
        <div className="lg:col-span-7 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div>
              <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
                <span>Umbrales Críticos por Estado Fenológico (Kiwi Hayward)</span>
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                Temperaturas letales T10 (inicio daño) y T90 (daño severo). Haz clic en &ldquo;Usar&rdquo; para ajustar los umbrales del predio.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-stone-200 dark:border-stone-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-50 dark:bg-stone-800/70 text-stone-600 dark:text-stone-400 font-bold uppercase text-[10px] border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="p-2.5">Estado Fenológico</th>
                  <th className="p-2.5 font-mono">T10 Daño</th>
                  <th className="p-2.5 font-mono">T90 Letal</th>
                  <th className="p-2.5 font-mono">Encendido Sug.</th>
                  <th className="p-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {UMBRALES_KIWI_HAYWARD.map((u) => {
                  const isCurrent = config.estadoFenologicoReferencia
                    .toLowerCase()
                    .includes(u.etapa.split(' ')[0].toLowerCase());
                  return (
                    <tr
                      key={u.bbch}
                      className={isCurrent ? 'bg-cyan-50/70 dark:bg-cyan-950/40' : 'hover:bg-stone-50/60 dark:hover:bg-stone-800/50'}
                    >
                      <td className="p-2.5">
                        <div className="font-bold text-stone-900 dark:text-stone-100">
                          {u.etapa} <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400">({u.bbch})</span>
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-snug mt-0.5">
                          {u.notaAgronomica}
                        </div>
                      </td>
                      <td className="p-2.5 font-mono tabular-nums font-bold text-amber-800 dark:text-amber-300 whitespace-nowrap">
                        {u.t10C.toFixed(1)}°C
                      </td>
                      <td className="p-2.5 font-mono tabular-nums font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap">
                        {u.t90C.toFixed(1)}°C
                      </td>
                      <td className="p-2.5 font-mono tabular-nums font-bold text-cyan-800 dark:text-cyan-300 whitespace-nowrap">
                        ≤ {u.encendidoSugeridoC.toFixed(1)}°C
                      </td>
                      <td className="p-2.5 text-right">
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => handleApplyUmbralSugerido(u)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                              isCurrent
                                ? 'bg-cyan-900 text-white'
                                : 'bg-stone-100 dark:bg-stone-800 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-stone-800 dark:text-stone-200'
                            }`}
                          >
                            {isCurrent ? 'Activo' : 'Usar'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400">
                            {isCurrent ? 'Activo' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Checklist Operacional Pre-Helada */}
        <div className="lg:col-span-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
            <div>
              <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Checklist Pre-Helada (Alistamiento)</span>
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                {config.checklist.fechaUltimaVerificacion
                  ? `Último chequeo: ${config.checklist.fechaUltimaVerificacion} (${config.checklist.responsableChecklist || 'Equipo'})`
                  : 'Verifica los puntos críticos antes del pronóstico nocturno.'}
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded font-mono tabular-nums text-xs font-black border ${
                checklistCompletados === checklistItems.length
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80'
              }`}
            >
              {checklistCompletados}/{checklistItems.length}
            </span>
          </div>

          <div className="space-y-2">
            {checklistItems.map((item) => {
              const checked = Boolean(config.checklist[item.key]);
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => handleToggleChecklistItem(item.key)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-colors flex items-start gap-2.5 ${
                    checked
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-stone-900 dark:text-stone-100'
                      : 'bg-stone-50/60 dark:bg-stone-800/70 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {checked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-snug">{item.label}</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-snug mt-0.5">
                      {item.detail}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {config.protocoloEmergenciaNotas && (
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed">
              <strong className="text-stone-900 dark:text-stone-100 block mb-0.5">Nota técnica de operación:</strong>
              {config.protocoloEmergenciaNotas}
            </div>
          )}
        </div>
      </div>

      {/* KPIs de Operación Antihelada */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Turnos Controlados
          </div>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100 font-mono tabular-nums mt-1">
            {kpis.totalTurnos}
          </div>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Mínima Absoluta
          </div>
          <div className="text-2xl font-black text-cyan-900 dark:text-cyan-200 font-mono tabular-nums mt-1">
            {kpis.minAbsoluta !== null ? `${kpis.minAbsoluta.toFixed(1)}°C` : '—'}
          </div>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Horas de Defensa
          </div>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100 font-mono tabular-nums mt-1">
            {kpis.totalHoras} <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">hrs</span>
          </div>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Agua Antihelada
          </div>
          <div className="text-2xl font-black text-blue-900 dark:text-blue-200 font-mono tabular-nums mt-1">
            {kpis.totalAguaM3.toLocaleString('es-CL')} <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">m³</span>
          </div>
        </div>
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Daño Prom. Post-Evento
          </div>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 font-mono tabular-nums mt-1">
            {kpis.promDanio}%
          </div>
        </div>
      </div>

      {/* Bitácora Operacional de Turnos de Control de Heladas */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-4">
          <div>
            <h2 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
              <span>Bitácora de Operación de Control Activo de Heladas</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Registro detallado de encendido, temperaturas críticas, consumo de agua o combustible, sectores protegidos y tratamiento post-helada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cuartel, operador..."
                className="pl-8 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-700 dark:text-stone-100"
              />
            </div>

            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold dark:text-stone-100"
            >
              <option value="todos">Todos los años</option>
              {aniosDisponibles.map((a) => (
                <option key={a} value={String(a)}>
                  Año {a}
                </option>
              ))}
            </select>

            <select
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold dark:text-stone-100"
            >
              <option value="todos">Todos los métodos</option>
              {METODOS_CONTROL.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold dark:text-stone-100"
            >
              <option value="todos">Todos los estados</option>
              {ESTADOS_TURNO.map((est) => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>
          </div>
        </div>

        {controlesFiltrados.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/70 text-center space-y-2.5">
            <Snowflake className="w-8 h-8 text-cyan-700 dark:text-cyan-400 mx-auto opacity-75" />
            <div className="text-sm font-bold text-stone-800 dark:text-stone-200">
              No hay turnos de control de heladas registrados
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
              Registra aquí cada noche en que actives aspersión antiheladas, torres de viento, calefactores o riego nocturno para respaldar tu trazabilidad BPA/SAG.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleOpenNewModal(false)}
                className="px-4 py-2 bg-cyan-900 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Primer Control de Helada</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {controlesFiltrados.map((reg) => {
              const isDangerTemp = reg.tempMinimaAireC <= -1;
              return (
                <div
                  key={reg.id}
                  className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-800/70 hover:bg-white dark:hover:bg-stone-800 transition-colors space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono tabular-nums font-black text-sm text-stone-900 dark:text-stone-100">
                        {reg.fecha}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                        {reg.tipoHelada}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/80 text-[11px] font-bold text-cyan-900 dark:text-cyan-200">
                        {reg.metodoControl}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          reg.estadoTurno === 'Activo en Operación'
                            ? 'bg-rose-600 text-white'
                            : reg.estadoTurno === 'En Alerta'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/80'
                        }`}
                      >
                        {reg.estadoTurno}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono tabular-nums text-stone-600 dark:text-stone-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {reg.horaInicio}
                        {reg.horaTermino ? ` → ${reg.horaTermino}` : ''} ({reg.duracionHoras} hrs)
                      </span>
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(reg)}
                            className="p-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer"
                            title="Editar turno"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === reg.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteControl(reg.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Eliminar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[11px] font-bold cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(reg.id)}
                              className="p-1.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-700 dark:hover:text-rose-400 text-stone-500 dark:text-stone-400 cursor-pointer"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        T° Mínima Aire
                      </div>
                      <div
                        className={`font-mono tabular-nums font-black text-sm mt-0.5 ${
                          isDangerTemp ? 'text-rose-700 dark:text-rose-400' : 'text-cyan-900 dark:text-cyan-200'
                        }`}
                      >
                        {reg.tempMinimaAireC.toFixed(1)}°C
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                        Enc: {reg.tempEncendidoC.toFixed(1)}°C
                        {reg.tempApagadoC !== undefined ? ` · Apag: ${reg.tempApagadoC.toFixed(1)}°C` : ''}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        Bulbo Húmedo / Atm
                      </div>
                      <div className="font-mono tabular-nums font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                        {reg.tempBulboHumedoC !== undefined
                          ? `${reg.tempBulboHumedoC.toFixed(1)}°C BH`
                          : 'BH —'}
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                        {reg.vientoKmH !== undefined ? `${reg.vientoKmH} km/h` : 'Viento —'} ·{' '}
                        {reg.humedadRelativaPct !== undefined ? `HR ${reg.humedadRelativaPct}%` : 'HR —'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        Agua / Caudalímetro
                      </div>
                      <div className="font-mono tabular-nums font-bold text-blue-900 dark:text-blue-200 mt-0.5">
                        {reg.volumenAguaM3 !== undefined ? `${reg.volumenAguaM3} m³` : '—'}
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono truncate">
                        {reg.caudalimetroInicialM3 !== undefined || reg.caudalimetroFinalM3 !== undefined
                          ? `${reg.caudalimetroInicialM3 ?? '—'} → ${reg.caudalimetroFinalM3 ?? '—'}`
                          : reg.presionOperacionBar !== undefined
                          ? `Presión ${reg.presionOperacionBar} bar`
                          : 'Sin caudalímetro'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        Equipo / Combustible
                      </div>
                      <div className="font-mono tabular-nums font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                        {reg.horasEquipo !== undefined ? `${reg.horasEquipo} hrs eq.` : `${reg.duracionHoras} hrs`}
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                        {reg.litrosCombustible !== undefined ? `${reg.litrosCombustible} L comb.` : reg.presionOperacionBar !== undefined ? `${reg.presionOperacionBar} bar` : '—'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        Cuarteles Protegidos
                      </div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 truncate mt-0.5" title={reg.parcelasNombres.join(', ')}>
                        {reg.parcelasNombres.join(', ')}
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono truncate">
                        {reg.superficieProtegidaHa} ha · {reg.estadoFenologico}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        Post-Evento &amp; Resp.
                      </div>
                      <div
                        className={`font-mono tabular-nums font-bold mt-0.5 ${
                          (reg.danioEstimadoPct || 0) > 10 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        Daño est.: {reg.danioEstimadoPct ?? 0}%
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                        {reg.operadorResponsable}
                      </div>
                    </div>
                  </div>

                  {(reg.tratamientoPostHelada || reg.observaciones || reg.fotoEvidenciaDataUrl) && (
                    <div className="text-[11px] text-stone-600 dark:text-stone-400 bg-white dark:bg-stone-900 px-3 py-2 rounded-xl border border-stone-200/80 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {reg.tratamientoPostHelada && (
                          <span>
                            <strong className="text-stone-800 dark:text-stone-200">Tratamiento Post-Helada:</strong>{' '}
                            {reg.tratamientoPostHelada}
                          </span>
                        )}
                        {reg.observaciones && (
                          <span>
                            <strong className="text-stone-800 dark:text-stone-200">Obs:</strong> {reg.observaciones}
                          </span>
                        )}
                      </div>
                      {reg.fotoEvidenciaDataUrl && (
                        <button
                          type="button"
                          onClick={() => setFotoZoomUrl(reg.fotoEvidenciaDataUrl!)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-800 text-[10px] font-bold text-stone-800 dark:text-stone-200 cursor-pointer shrink-0"
                        >
                          <img
                            src={reg.fotoEvidenciaDataUrl}
                            alt="Evidencia control heladas"
                            className="w-6 h-6 rounded object-cover border border-stone-300 dark:border-stone-700"
                          />
                          <span>Ver Evidencia Fotográfica</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Vinculación con Eventualidades de Helada en Clima */}
      {eventualidadesHelada.length > 0 && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Eventualidades de Helada Registradas en Clima ({eventualidadesHelada.length})</span>
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Eventos climáticos anotados en la bitácora anual del módulo Clima.
              </p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('clima')}
                className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Abrir Clima →
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {eventualidadesHelada.slice(0, 6).map((ev) => (
              <div key={ev.id} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 space-y-1">
                <div className="flex items-center justify-between font-bold text-stone-900 dark:text-stone-100">
                  <span className="font-mono tabular-nums">{ev.fecha}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200">
                    {ev.tipo}
                  </span>
                </div>
                <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono">
                  Mín: {ev.tempMinimaC ?? '—'}°C · Severidad: {ev.severidad}
                  {ev.danioEstimadoPct !== undefined ? ` · Daño ${ev.danioEstimadoPct}%` : ''}
                </div>
                {ev.medidaMitigacion && (
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{ev.medidaMitigacion}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Registro / Edición de Control de Helada */}
      {isModalOpen && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 dark:bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-3xl border border-stone-200 dark:border-stone-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="bg-cyan-950 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ThermometerSnowflake className="w-5 h-5 text-cyan-300" />
                <h3 className="font-bold text-sm sm:text-base">
                  {editingControl ? 'Editar Turno de Control de Helada' : 'Registrar Control Activo de Helada'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-cyan-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 overflow-y-auto text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Datos Base y Método */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha Evento *:</label>
                  <input
                    type="date"
                    value={fFecha}
                    onChange={(e) => {
                      setFFecha(e.target.value);
                      setFTemporada(getTemporadaPorFecha(e.target.value));
                    }}
                    className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Temporada:</label>
                  <input
                    type="text"
                    value={fTemporada}
                    onChange={(e) => setFTemporada(e.target.value)}
                    placeholder="2025-2026"
                    className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Estado del Turno:</label>
                  <select
                    value={fEstadoTurno}
                    onChange={(e) => setFEstadoTurno(e.target.value as EstadoTurnoHelada)}
                    className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl dark:text-stone-100"
                  >
                    {ESTADOS_TURNO.map((est) => (
                      <option key={est} value={est}>
                        {est}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Tipo de Helada:</label>
                  <select
                    value={fTipoHelada}
                    onChange={(e) =>
                      setFTipoHelada(e.target.value as ControlHeladaRegistro['tipoHelada'])
                    }
                    className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl dark:text-stone-100"
                  >
                    <option value="Helada Radiativa">Helada Radiativa (Inversión / Sin viento)</option>
                    <option value="Helada Advectiva">Helada Advectiva (Masa polar + viento)</option>
                    <option value="Mixta / Preventivo">Mixta / Operación Preventiva</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Método de Control Antihelada *:</label>
                  <select
                    value={fMetodo}
                    onChange={(e) => setFMetodo(e.target.value as MetodoControlHelada)}
                    className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-semibold dark:text-stone-100"
                  >
                    {METODOS_CONTROL.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Horarios & Temperaturas */}
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  Ventana Horaria &amp; Registro Térmico
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Hora Encendido *:</label>
                    <input
                      type="time"
                      value={fHoraInicio}
                      onChange={(e) => {
                        setFHoraInicio(e.target.value);
                        recalcDuracion(e.target.value, fHoraTermino);
                      }}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Hora Término:</label>
                    <input
                      type="time"
                      value={fHoraTermino}
                      onChange={(e) => {
                        setFHoraTermino(e.target.value);
                        recalcDuracion(fHoraInicio, e.target.value);
                      }}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Duración (hrs):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fDuracionHoras}
                      onChange={(e) => setFDuracionHoras(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Operador Responsable:</label>
                    <input
                      type="text"
                      value={fOperador}
                      onChange={(e) => setFOperador(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl dark:text-stone-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">T° Encendido (°C) *:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fTempEncendido}
                      onChange={(e) => setFTempEncendido(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">T° Mínima Aire (°C) *:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fTempMinima}
                      onChange={(e) => setFTempMinima(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">T° Bulbo Húmedo (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fTempBulboHumedo}
                      onChange={(e) => setFTempBulboHumedo(e.target.value)}
                      placeholder="Opcional"
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">T° Apagado (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fTempApagado}
                      onChange={(e) => setFTempApagado(e.target.value)}
                      placeholder="Opcional"
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Viento (km/h):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fViento}
                      onChange={(e) => setFViento(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Humedad Relativa (%):</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={fHumedad}
                      onChange={(e) => setFHumedad(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                </div>
              </div>

              {/* Consumo Hídrico / Caudalímetro / Energía */}
              <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>Medición Hídrica (Caudalímetro / Presión) &amp; Consumo Equipos</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Caudalímetro Inicial (m³):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fCaudIni}
                      onChange={(e) => {
                        setFCaudIni(e.target.value);
                        recalcAguaFromCaudalimetros(e.target.value, fCaudFin);
                      }}
                      placeholder="Lectura m³"
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Caudalímetro Final (m³):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fCaudFin}
                      onChange={(e) => {
                        setFCaudFin(e.target.value);
                        recalcAguaFromCaudalimetros(fCaudIni, e.target.value);
                      }}
                      placeholder="Lectura m³"
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Volumen Agua Aplicado (m³):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fVolumenAgua}
                      onChange={(e) => setFVolumenAgua(e.target.value)}
                      placeholder="Auto o manual"
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono font-bold text-blue-900 dark:text-blue-200"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Presión Aspersión (bar):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fPresionBar}
                      onChange={(e) => setFPresionBar(e.target.value)}
                      placeholder="Ej. 3.2"
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Horas Equipo / Bomba:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fHorasEquipo}
                      onChange={(e) => setFHorasEquipo(e.target.value)}
                      placeholder="Hrs operación"
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Combustible (Litros):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fCombustible}
                      onChange={(e) => setFCombustible(e.target.value)}
                      placeholder="Diésel / Gas L"
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                </div>
              </div>

              {/* Cuarteles Protegidos & Evaluación Post-Evento */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-700 dark:text-stone-300">
                    Cuarteles Protegidos ({fParcelasIds.length} seleccionados):
                  </label>
                  {parcelas.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const all = parcelas.map((p) => p.id);
                          setFParcelasIds(all);
                          recalcSuperficieFromParcelas(all);
                        }}
                        className="text-[11px] font-bold text-cyan-800 dark:text-cyan-300 hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFParcelasIds([]);
                          recalcSuperficieFromParcelas([]);
                        }}
                        className="text-[11px] font-bold text-stone-500 dark:text-stone-400 hover:underline cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  )}
                </div>

                {parcelas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {parcelas.map((p) => {
                      const active = fParcelasIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleToggleParcela(p.id)}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-colors ${
                            active
                              ? 'bg-cyan-900 text-white border-cyan-900'
                              : 'bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                          }`}
                        >
                          {p.nombre} ({p.superficieHa} ha)
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Superficie Protegida (ha):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={fSuperficieHa}
                      onChange={(e) => setFSuperficieHa(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Estado Fenológico:</label>
                    <select
                      value={fEstadoFenologico}
                      onChange={(e) => setFEstadoFenologico(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl dark:text-stone-100"
                    >
                      {estadosFenologicosOpciones.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                      {!estadosFenologicosOpciones.includes(fEstadoFenologico) && (
                        <option value={fEstadoFenologico}>{fEstadoFenologico}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Daño Post-Evento Estimado (%):</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={fDanioPct}
                      onChange={(e) => setFDanioPct(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl font-mono dark:text-stone-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Medida / Tratamiento Post-Helada (si aplica):
                  </label>
                  <input
                    type="text"
                    value={fTratamientoPost}
                    onChange={(e) => setFTratamientoPost(e.target.value)}
                    placeholder="Ej. Aplicación preventiva de Cobre + Bioestimulante / Aminoácidos para cicatrización"
                    className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl dark:text-stone-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Observaciones del Turno:</label>
                  <textarea
                    rows={2}
                    value={fObservaciones}
                    onChange={(e) => setFObservaciones(e.target.value)}
                    placeholder="Notas sobre inversión térmica, comportamiento de aspersores, cobertura de hielo o sectores fríos..."
                    className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl dark:text-stone-100"
                  />
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 rounded-xl space-y-2">
                  <label className="block font-bold text-stone-700 dark:text-stone-300">
                    Evidencia Fotográfica desde Celular (hielo, aspersores, daño en yemas — se incluye en PDF):
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="px-3 py-2 bg-white dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-800 dark:text-stone-200 inline-flex items-center gap-1.5 cursor-pointer">
                      <Camera className="w-4 h-4 text-cyan-800 dark:text-cyan-300" />
                      <span>{fFotoEvidenciaDataUrl ? 'Cambiar Foto' : 'Tomar / Subir Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const dataUrl = await compressImageToDataUrl(file, 600, 0.55);
                            setFFotoEvidenciaDataUrl(dataUrl);
                          } catch {
                            // ignorar
                          }
                        }}
                      />
                    </label>
                    {fFotoEvidenciaDataUrl && (
                      <div className="flex items-center gap-2">
                        <img
                          src={fFotoEvidenciaDataUrl}
                          alt="Evidencia helada"
                          className="w-14 h-14 rounded-lg object-cover border border-stone-300 dark:border-stone-700 cursor-pointer"
                          onClick={() => setFotoZoomUrl(fFotoEvidenciaDataUrl)}
                        />
                        <button
                          type="button"
                          onClick={() => setFFotoEvidenciaDataUrl('')}
                          className="px-2 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-900 hover:bg-cyan-800 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {editingControl ? 'Guardar Cambios' : 'Guardar Turno Antihelada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Zoom Foto Evidencia */}
      {fotoZoomUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs"
          onClick={() => setFotoZoomUrl(null)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-stone-200 dark:border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-stone-900 text-white flex items-center justify-between text-xs font-bold">
              <span>Evidencia Fotográfica · Control de Heladas</span>
              <button
                type="button"
                onClick={() => setFotoZoomUrl(null)}
                className="p-1 text-stone-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
              <img
                src={fotoZoomUrl}
                alt="Evidencia control heladas"
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
