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
  Parcela,
  SeguimientoFenologico,
} from '../types/campo';
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Clock,
  CloudSun,
  Download,
  Droplet,
  Edit3,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  Snowflake,
  Square,
  Thermometer,
  ThermometerSnowflake,
  Trash2,
  X,
} from 'lucide-react';
import { exportControlHeladasPDF } from '../utils/pdfExport';
import { combinarCatalogoFenologico } from '../utils/fenologiaHelper';

interface ControlHeladasViewProps {
  controles: ControlHeladaRegistro[];
  onAddControl: (c: ControlHeladaRegistro) => void;
  onUpdateControl: (c: ControlHeladaRegistro) => void;
  onDeleteControl: (id: string) => void;
  config: ConfigControlHeladas;
  onUpdateConfig: (cfg: ConfigControlHeladas) => void;
  clima: ClimaCondiciones;
  parcelas: Parcela[];
  explotacion?: ExplotacionAgricola;
  eventualidades?: EventualidadHuerto[];
  fenologia?: SeguimientoFenologico[];
  estadosFenologicosPersonalizados?: EstadoFenologicoCatalogo[];
  activeUserName?: string;
  canEdit?: boolean;
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

// Fórmula psicrométrica de Stull (2011) para temperatura de bulbo húmedo aproximada (°C)
function calcularBulboHumedoC(tempC: number, hrPct: number): number {
  const rh = Math.max(5, Math.min(100, hrPct));
  const tw =
    tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tempC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;
  return Number(tw.toFixed(1));
}

// Punto de rocío fórmula Magnus (°C)
function calcularPuntoRocioC(tempC: number, hrPct: number): number {
  const rh = Math.max(5, Math.min(100, hrPct));
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(rh / 100);
  const td = (b * alpha) / (a - alpha);
  return Number(td.toFixed(1));
}

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
  parcelas,
  explotacion,
  eventualidades = [],
  fenologia = [],
  estadosFenologicosPersonalizados = [],
  activeUserName = 'Operador Predio',
  canEdit = true,
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

  // Estado editable local de configuración al abrir el panel
  const [draftConfig, setDraftConfig] = useState<ConfigControlHeladas>(config);

  const openConfigPanel = () => {
    setDraftConfig(config);
    setShowConfigPanel((prev) => !prev);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(draftConfig);
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
      umbralApagadoC: Math.max(u.alertaSugeridaC, u.encendidoSugeridoC + 1.0),
      estadoFenologicoReferencia: `${u.etapa} (${u.bbch})`,
    };
    onUpdateConfig(nextCfg);
    setDraftConfig(nextCfg);
  };

  // Cálculos térmicos en vivo
  const hrLive = clima.humedadRelativa > 0 ? clima.humedadRelativa : 75;
  const twActual = calcularBulboHumedoC(clima.temperaturaActual, hrLive);
  const twMinima = calcularBulboHumedoC(clima.tempMinima, hrLive);
  const tdActual = calcularPuntoRocioC(clima.temperaturaActual, hrLive);

  const riesgoHeladaNivel = useMemo(() => {
    const tEval = Math.min(clima.temperaturaActual, clima.tempMinima);
    if (tEval <= config.umbralEncendidoC || twMinima <= config.umbralEncendidoC) {
      return {
        nivel: 'ENCENDIDO / ACCIÓN INMEDIATA',
        badgeClass: 'bg-rose-600 text-white',
        cardClass: 'bg-rose-50 border-rose-300 text-rose-950',
        mensaje: `Mínima pronosticada (${clima.tempMinima}°C) o bulbo húmedo (${twMinima}°C) iguala/supera el umbral de encendido (${config.umbralEncendidoC}°C).`,
      };
    }
    if (tEval <= config.umbralAlertaC || tdActual <= 0) {
      return {
        nivel: 'ALERTA PREVENTIVA NOCTURNA',
        badgeClass: 'bg-amber-600 text-white',
        cardClass: 'bg-amber-50 border-amber-300 text-amber-950',
        mensaje: `Condición de riesgo térmico (Mín ${clima.tempMinima}°C · Punto rocío ${tdActual}°C · Viento ${clima.velocidadVientoKmH} km/h). Preparar equipos y cuadrilla.`,
      };
    }
    return {
      nivel: 'SIN RIESGO INMINENTE',
      badgeClass: 'bg-emerald-700 text-white',
      cardClass: 'bg-emerald-50/70 border-emerald-200 text-emerald-950',
      mensaje: `Temperaturas sobre umbral de alerta (${config.umbralAlertaC}°C). Mantener monitoreo estándar y checklist pre-temporada al día.`,
    };
  }, [clima, config, twMinima, tdActual]);

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
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-800 text-[11px] font-bold uppercase tracking-wider mb-1">
            <ThermometerSnowflake className="w-4 h-4 text-cyan-700" />
            <span>Defensa Activa Antiheladas · Kiwi Hayward</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Control de Heladas &amp; Protocolo Térmico Nocturno
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Monitoreo de umbrales críticos por fenología, temperatura de bulbo húmedo, turnos de aspersión/torres, caudalímetros y evaluación post-evento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canEdit && (
            <button
              type="button"
              onClick={openConfigPanel}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5 text-stone-700" />
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
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-700" />
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
                className="px-3 py-2 bg-white/80 hover:bg-white text-stone-900 border border-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <CloudSun className="w-3.5 h-3.5 text-amber-600" />
                <span>Ver Pronóstico en Clima</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-3 bg-white/85 rounded-xl border border-stone-200/80">
            <div className="text-[10px] font-bold uppercase text-stone-500">T° Aire / Mín</div>
            <div className="text-base font-black text-stone-900 font-mono tabular-nums mt-0.5">
              {clima.temperaturaActual.toFixed(1)}° / {clima.tempMinima.toFixed(1)}°C
            </div>
          </div>
          <div className="p-3 bg-white/85 rounded-xl border border-stone-200/80">
            <div className="text-[10px] font-bold uppercase text-stone-500">Bulbo Húmedo Est.</div>
            <div className="text-base font-black text-cyan-900 font-mono tabular-nums mt-0.5">
              {twActual.toFixed(1)}° / Mín {twMinima.toFixed(1)}°C
            </div>
          </div>
          <div className="p-3 bg-white/85 rounded-xl border border-stone-200/80">
            <div className="text-[10px] font-bold uppercase text-stone-500">Punto de Rocío</div>
            <div className="text-base font-black text-stone-900 font-mono tabular-nums mt-0.5">
              {tdActual.toFixed(1)}°C
            </div>
          </div>
          <div className="p-3 bg-white/85 rounded-xl border border-stone-200/80">
            <div className="text-[10px] font-bold uppercase text-stone-500">HR &amp; Viento</div>
            <div className="text-sm font-black text-stone-900 font-mono tabular-nums mt-0.5">
              {hrLive}% · {clima.velocidadVientoKmH} km/h
            </div>
          </div>
          <div className="p-3 bg-white/85 rounded-xl border border-stone-200/80">
            <div className="text-[10px] font-bold uppercase text-stone-500">Umbral Encendido</div>
            <div className="text-base font-black text-rose-800 font-mono tabular-nums mt-0.5">
              ≤ {config.umbralEncendidoC.toFixed(1)}°C
            </div>
          </div>
          <div className="p-3 bg-white/85 rounded-xl border border-stone-200/80">
            <div className="text-[10px] font-bold uppercase text-stone-500">Umbral Apagado</div>
            <div className="text-base font-black text-emerald-800 font-mono tabular-nums mt-0.5">
              ≥ {config.umbralApagadoC.toFixed(1)}°C
            </div>
          </div>
        </div>
      </div>

      {/* Panel Desplegable de Configuración de Umbrales */}
      {showConfigPanel && canEdit && (
        <form
          onSubmit={handleSaveConfig}
          className="bg-white rounded-2xl border border-cyan-300 p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-cyan-700" />
              <span>Configuración de Protocolo y Umbrales Antihelada del Huerto</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowConfigPanel(false)}
              className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Umbral Alerta Preventiva (°C):
              </label>
              <input
                type="number"
                step="0.1"
                value={draftConfig.umbralAlertaC}
                onChange={(e) =>
                  setDraftConfig({ ...draftConfig, umbralAlertaC: Number(e.target.value) })
                }
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Umbral Encendido Sistemas (°C):
              </label>
              <input
                type="number"
                step="0.1"
                value={draftConfig.umbralEncendidoC}
                onChange={(e) =>
                  setDraftConfig({ ...draftConfig, umbralEncendidoC: Number(e.target.value) })
                }
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Umbral Apagado Seguro (°C):
              </label>
              <input
                type="number"
                step="0.1"
                value={draftConfig.umbralApagadoC}
                onChange={(e) =>
                  setDraftConfig({ ...draftConfig, umbralApagadoC: Number(e.target.value) })
                }
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
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
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl"
              >
                {METODOS_CONTROL.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Tasa Precipitación Aspersión (mm/hr):
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={draftConfig.tasaPrecipitacionMmHora ?? ''}
                onChange={(e) =>
                  setDraftConfig({
                    ...draftConfig,
                    tasaPrecipitacionMmHora: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="Ej. 3.5"
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Estado Fenológico de Referencia:
              </label>
              <select
                value={draftConfig.estadoFenologicoReferencia}
                onChange={(e) =>
                  setDraftConfig({ ...draftConfig, estadoFenologicoReferencia: e.target.value })
                }
                className="w-full p-2.5 bg-white border border-stone-300 rounded-xl"
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

          <div className="text-xs">
            <label className="block font-bold text-stone-700 mb-1">
              Protocolo / Notas de Operación de Emergencia:
            </label>
            <textarea
              rows={2}
              value={draftConfig.protocoloEmergenciaNotas || ''}
              onChange={(e) =>
                setDraftConfig({ ...draftConfig, protocoloEmergenciaNotas: e.target.value })
              }
              className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfigPanel(false)}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-900 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Guardar Umbrales
            </button>
          </div>
        </form>
      )}

      {/* Doble Columna: Umbrales Críticos Kiwi Hayward + Checklist Operacional Pre-Helada */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Tabla Umbrales Críticos por Fenología */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-cyan-700" />
                <span>Umbrales Críticos por Estado Fenológico (Kiwi Hayward)</span>
              </h2>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Temperaturas letales T10 (inicio daño) y T90 (daño severo). Haz clic en &ldquo;Usar&rdquo; para ajustar los umbrales del predio.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-50 text-stone-600 font-bold uppercase text-[10px] border-b border-stone-200">
                <tr>
                  <th className="p-2.5">Estado Fenológico</th>
                  <th className="p-2.5 font-mono">T10 Daño</th>
                  <th className="p-2.5 font-mono">T90 Letal</th>
                  <th className="p-2.5 font-mono">Encendido Sug.</th>
                  <th className="p-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {UMBRALES_KIWI_HAYWARD.map((u) => {
                  const isCurrent = config.estadoFenologicoReferencia
                    .toLowerCase()
                    .includes(u.etapa.split(' ')[0].toLowerCase());
                  return (
                    <tr
                      key={u.bbch}
                      className={isCurrent ? 'bg-cyan-50/70' : 'hover:bg-stone-50/60'}
                    >
                      <td className="p-2.5">
                        <div className="font-bold text-stone-900">
                          {u.etapa} <span className="text-[10px] font-mono text-stone-500">({u.bbch})</span>
                        </div>
                        <div className="text-[10px] text-stone-500 leading-snug mt-0.5">
                          {u.notaAgronomica}
                        </div>
                      </td>
                      <td className="p-2.5 font-mono tabular-nums font-bold text-amber-800 whitespace-nowrap">
                        {u.t10C.toFixed(1)}°C
                      </td>
                      <td className="p-2.5 font-mono tabular-nums font-bold text-rose-700 whitespace-nowrap">
                        {u.t90C.toFixed(1)}°C
                      </td>
                      <td className="p-2.5 font-mono tabular-nums font-bold text-cyan-800 whitespace-nowrap">
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
                                : 'bg-stone-100 hover:bg-cyan-100 text-stone-800'
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
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Checklist Pre-Helada (Alistamiento)</span>
              </h2>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {config.checklist.fechaUltimaVerificacion
                  ? `Último chequeo: ${config.checklist.fechaUltimaVerificacion} (${config.checklist.responsableChecklist || 'Equipo'})`
                  : 'Verifica los puntos críticos antes del pronóstico nocturno.'}
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded font-mono tabular-nums text-xs font-black border ${
                checklistCompletados === checklistItems.length
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
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
                      ? 'bg-emerald-50/70 border-emerald-200 text-stone-900'
                      : 'bg-stone-50/60 border-stone-200 text-stone-700 hover:bg-stone-100'
                  } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {checked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-snug">{item.label}</div>
                    <div className="text-[10px] text-stone-500 leading-snug mt-0.5">
                      {item.detail}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {config.protocoloEmergenciaNotas && (
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-700 leading-relaxed">
              <strong className="text-stone-900 block mb-0.5">Nota técnica de operación:</strong>
              {config.protocoloEmergenciaNotas}
            </div>
          )}
        </div>
      </div>

      {/* KPIs de Operación Antihelada */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Turnos Controlados
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono tabular-nums mt-1">
            {kpis.totalTurnos}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Mínima Absoluta
          </div>
          <div className="text-2xl font-black text-cyan-900 font-mono tabular-nums mt-1">
            {kpis.minAbsoluta !== null ? `${kpis.minAbsoluta.toFixed(1)}°C` : '—'}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Horas de Defensa
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono tabular-nums mt-1">
            {kpis.totalHoras} <span className="text-xs font-semibold text-stone-500">hrs</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Agua Antihelada
          </div>
          <div className="text-2xl font-black text-blue-900 font-mono tabular-nums mt-1">
            {kpis.totalAguaM3.toLocaleString('es-CL')} <span className="text-xs font-semibold text-stone-500">m³</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Daño Prom. Post-Evento
          </div>
          <div className="text-2xl font-black text-emerald-800 font-mono tabular-nums mt-1">
            {kpis.promDanio}%
          </div>
        </div>
      </div>

      {/* Bitácora Operacional de Turnos de Control de Heladas */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h2 className="font-bold text-base text-stone-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-700" />
              <span>Bitácora de Operación de Control Activo de Heladas</span>
            </h2>
            <p className="text-xs text-stone-500">
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
                className="pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-700"
              />
            </div>

            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold"
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
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold"
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
              className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold"
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
          <div className="p-8 rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-center space-y-2.5">
            <Snowflake className="w-8 h-8 text-cyan-700 mx-auto opacity-75" />
            <div className="text-sm font-bold text-stone-800">
              No hay turnos de control de heladas registrados
            </div>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
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
                  className="p-4 rounded-2xl border border-stone-200 bg-stone-50/40 hover:bg-white transition-colors space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono tabular-nums font-black text-sm text-stone-900">
                        {reg.fecha}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[11px] font-semibold text-stone-700">
                        {reg.tipoHelada}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-[11px] font-bold text-cyan-900">
                        {reg.metodoControl}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          reg.estadoTurno === 'Activo en Operación'
                            ? 'bg-rose-600 text-white'
                            : reg.estadoTurno === 'En Alerta'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {reg.estadoTurno}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono tabular-nums text-stone-600 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {reg.horaInicio}
                        {reg.horaTermino ? ` → ${reg.horaTermino}` : ''} ({reg.duracionHoras} hrs)
                      </span>
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(reg)}
                            className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 cursor-pointer"
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
                                className="px-2 py-1 rounded-lg bg-stone-200 text-stone-700 text-[11px] font-bold cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(reg.id)}
                              className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-rose-50 hover:text-rose-700 text-stone-500 cursor-pointer"
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
                    <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        T° Mínima Aire
                      </div>
                      <div
                        className={`font-mono tabular-nums font-black text-sm mt-0.5 ${
                          isDangerTemp ? 'text-rose-700' : 'text-cyan-900'
                        }`}
                      >
                        {reg.tempMinimaAireC.toFixed(1)}°C
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono">
                        Enc: {reg.tempEncendidoC.toFixed(1)}°C
                        {reg.tempApagadoC !== undefined ? ` · Apag: ${reg.tempApagadoC.toFixed(1)}°C` : ''}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        Bulbo Húmedo / Atm
                      </div>
                      <div className="font-mono tabular-nums font-bold text-stone-900 mt-0.5">
                        {reg.tempBulboHumedoC !== undefined
                          ? `${reg.tempBulboHumedoC.toFixed(1)}°C BH`
                          : 'BH —'}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono">
                        {reg.vientoKmH !== undefined ? `${reg.vientoKmH} km/h` : 'Viento —'} ·{' '}
                        {reg.humedadRelativaPct !== undefined ? `HR ${reg.humedadRelativaPct}%` : 'HR —'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        Agua / Caudalímetro
                      </div>
                      <div className="font-mono tabular-nums font-bold text-blue-900 mt-0.5">
                        {reg.volumenAguaM3 !== undefined ? `${reg.volumenAguaM3} m³` : '—'}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono truncate">
                        {reg.caudalimetroInicialM3 !== undefined || reg.caudalimetroFinalM3 !== undefined
                          ? `${reg.caudalimetroInicialM3 ?? '—'} → ${reg.caudalimetroFinalM3 ?? '—'}`
                          : reg.presionOperacionBar !== undefined
                          ? `Presión ${reg.presionOperacionBar} bar`
                          : 'Sin caudalímetro'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        Equipo / Combustible
                      </div>
                      <div className="font-mono tabular-nums font-bold text-stone-900 mt-0.5">
                        {reg.horasEquipo !== undefined ? `${reg.horasEquipo} hrs eq.` : `${reg.duracionHoras} hrs`}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono">
                        {reg.litrosCombustible !== undefined ? `${reg.litrosCombustible} L comb.` : reg.presionOperacionBar !== undefined ? `${reg.presionOperacionBar} bar` : '—'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        Cuarteles Protegidos
                      </div>
                      <div className="font-bold text-stone-900 truncate mt-0.5" title={reg.parcelasNombres.join(', ')}>
                        {reg.parcelasNombres.join(', ')}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono truncate">
                        {reg.superficieProtegidaHa} ha · {reg.estadoFenologico}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-stone-200">
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        Post-Evento &amp; Resp.
                      </div>
                      <div
                        className={`font-mono tabular-nums font-bold mt-0.5 ${
                          (reg.danioEstimadoPct || 0) > 10 ? 'text-rose-700' : 'text-emerald-800'
                        }`}
                      >
                        Daño est.: {reg.danioEstimadoPct ?? 0}%
                      </div>
                      <div className="text-[10px] text-stone-500 truncate">
                        {reg.operadorResponsable}
                      </div>
                    </div>
                  </div>

                  {(reg.tratamientoPostHelada || reg.observaciones) && (
                    <div className="text-[11px] text-stone-600 bg-white px-3 py-2 rounded-xl border border-stone-200/80 flex flex-wrap gap-x-4 gap-y-1">
                      {reg.tratamientoPostHelada && (
                        <span>
                          <strong className="text-stone-800">Tratamiento Post-Helada:</strong>{' '}
                          {reg.tratamientoPostHelada}
                        </span>
                      )}
                      {reg.observaciones && (
                        <span>
                          <strong className="text-stone-800">Obs:</strong> {reg.observaciones}
                        </span>
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
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Eventualidades de Helada Registradas en Clima ({eventualidadesHelada.length})</span>
              </h3>
              <p className="text-[11px] text-stone-500">
                Eventos climáticos anotados en la bitácora anual del módulo Clima.
              </p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('clima')}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Abrir Clima →
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {eventualidadesHelada.slice(0, 6).map((ev) => (
              <div key={ev.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <div className="flex items-center justify-between font-bold text-stone-900">
                  <span className="font-mono tabular-nums">{ev.fecha}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900">
                    {ev.tipo}
                  </span>
                </div>
                <div className="text-[11px] text-stone-600 font-mono">
                  Mín: {ev.tempMinimaC ?? '—'}°C · Severidad: {ev.severidad}
                  {ev.danioEstimadoPct !== undefined ? ` · Daño ${ev.danioEstimadoPct}%` : ''}
                </div>
                {ev.medidaMitigacion && (
                  <div className="text-[11px] text-stone-500 truncate">{ev.medidaMitigacion}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Registro / Edición de Control de Helada */}
      {isModalOpen && canEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
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
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Datos Base y Método */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha Evento *:</label>
                  <input
                    type="date"
                    value={fFecha}
                    onChange={(e) => {
                      setFFecha(e.target.value);
                      setFTemporada(getTemporadaPorFecha(e.target.value));
                    }}
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Temporada:</label>
                  <input
                    type="text"
                    value={fTemporada}
                    onChange={(e) => setFTemporada(e.target.value)}
                    placeholder="2025-2026"
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Estado del Turno:</label>
                  <select
                    value={fEstadoTurno}
                    onChange={(e) => setFEstadoTurno(e.target.value as EstadoTurnoHelada)}
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl"
                  >
                    {ESTADOS_TURNO.map((est) => (
                      <option key={est} value={est}>
                        {est}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tipo de Helada:</label>
                  <select
                    value={fTipoHelada}
                    onChange={(e) =>
                      setFTipoHelada(e.target.value as ControlHeladaRegistro['tipoHelada'])
                    }
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl"
                  >
                    <option value="Helada Radiativa">Helada Radiativa (Inversión / Sin viento)</option>
                    <option value="Helada Advectiva">Helada Advectiva (Masa polar + viento)</option>
                    <option value="Mixta / Preventivo">Mixta / Operación Preventiva</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Método de Control Antihelada *:</label>
                  <select
                    value={fMetodo}
                    onChange={(e) => setFMetodo(e.target.value as MetodoControlHelada)}
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl font-semibold"
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
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                  Ventana Horaria &amp; Registro Térmico
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Hora Encendido *:</label>
                    <input
                      type="time"
                      value={fHoraInicio}
                      onChange={(e) => {
                        setFHoraInicio(e.target.value);
                        recalcDuracion(e.target.value, fHoraTermino);
                      }}
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Hora Término:</label>
                    <input
                      type="time"
                      value={fHoraTermino}
                      onChange={(e) => {
                        setFHoraTermino(e.target.value);
                        recalcDuracion(fHoraInicio, e.target.value);
                      }}
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Duración (hrs):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fDuracionHoras}
                      onChange={(e) => setFDuracionHoras(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Operador Responsable:</label>
                    <input
                      type="text"
                      value={fOperador}
                      onChange={(e) => setFOperador(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">T° Encendido (°C) *:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fTempEncendido}
                      onChange={(e) => setFTempEncendido(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">T° Mínima Aire (°C) *:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fTempMinima}
                      onChange={(e) => setFTempMinima(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">T° Bulbo Húmedo (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fTempBulboHumedo}
                      onChange={(e) => setFTempBulboHumedo(e.target.value)}
                      placeholder="Opcional"
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">T° Apagado (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={fTempApagado}
                      onChange={(e) => setFTempApagado(e.target.value)}
                      placeholder="Opcional"
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Viento (km/h):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fViento}
                      onChange={(e) => setFViento(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Humedad Relativa (%):</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={fHumedad}
                      onChange={(e) => setFHumedad(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Consumo Hídrico / Caudalímetro / Energía */}
              <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-blue-700" />
                  <span>Medición Hídrica (Caudalímetro / Presión) &amp; Consumo Equipos</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Caudalímetro Inicial (m³):</label>
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
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Caudalímetro Final (m³):</label>
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
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Volumen Agua Aplicado (m³):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fVolumenAgua}
                      onChange={(e) => setFVolumenAgua(e.target.value)}
                      placeholder="Auto o manual"
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono font-bold text-blue-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Presión Aspersión (bar):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fPresionBar}
                      onChange={(e) => setFPresionBar(e.target.value)}
                      placeholder="Ej. 3.2"
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Horas Equipo / Bomba:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fHorasEquipo}
                      onChange={(e) => setFHorasEquipo(e.target.value)}
                      placeholder="Hrs operación"
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Combustible (Litros):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={fCombustible}
                      onChange={(e) => setFCombustible(e.target.value)}
                      placeholder="Diésel / Gas L"
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Cuarteles Protegidos & Evaluación Post-Evento */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-700">
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
                        className="text-[11px] font-bold text-cyan-800 hover:underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFParcelasIds([]);
                          recalcSuperficieFromParcelas([]);
                        }}
                        className="text-[11px] font-bold text-stone-500 hover:underline cursor-pointer"
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
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
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
                    <label className="block font-bold text-stone-700 mb-1">Superficie Protegida (ha):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={fSuperficieHa}
                      onChange={(e) => setFSuperficieHa(e.target.value)}
                      className="w-full p-2.5 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Estado Fenológico:</label>
                    <select
                      value={fEstadoFenologico}
                      onChange={(e) => setFEstadoFenologico(e.target.value)}
                      className="w-full p-2.5 bg-white border border-stone-300 rounded-xl"
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
                    <label className="block font-bold text-stone-700 mb-1">Daño Post-Evento Estimado (%):</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={fDanioPct}
                      onChange={(e) => setFDanioPct(e.target.value)}
                      className="w-full p-2.5 bg-white border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Medida / Tratamiento Post-Helada (si aplica):
                  </label>
                  <input
                    type="text"
                    value={fTratamientoPost}
                    onChange={(e) => setFTratamientoPost(e.target.value)}
                    placeholder="Ej. Aplicación preventiva de Cobre + Bioestimulante / Aminoácidos para cicatrización"
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Observaciones del Turno:</label>
                  <textarea
                    rows={2}
                    value={fObservaciones}
                    onChange={(e) => setFObservaciones(e.target.value)}
                    placeholder="Notas sobre inversión térmica, comportamiento de aspersores, cobertura de hielo o sectores fríos..."
                    className="w-full p-2.5 bg-white border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer"
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
    </div>
  );
};
