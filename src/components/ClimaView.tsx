import React, { useState, useEffect, useMemo } from 'react';
import {
  ClimaCondiciones,
  EventualidadHuerto,
  ExplotacionAgricola,
  Parcela,
  TipoEventualidad
} from '../types/campo';
import {
  CloudSun,
  Thermometer,
  Droplet,
  Wind,
  AlertTriangle,
  CheckCircle2,
  Sun,
  ShieldAlert,
  Edit3,
  MapPin,
  RefreshCw,
  Search,
  Navigation,
  Calendar,
  Info,
  Plus,
  Trash2,
  Snowflake,
  Download,
  CheckSquare,
  Square
} from 'lucide-react';
import { calcularGradosDiaPeriodo } from '../utils/agroClimaCalculos';
import { exportEventualidadesPDF } from '../utils/pdfExport';

interface ClimaViewProps {
  clima: ClimaCondiciones;
  onUpdateClima: (clima: ClimaCondiciones) => void;
  eventualidades?: EventualidadHuerto[];
  parcelas?: Parcela[];
  explotacion?: ExplotacionAgricola;
  activeUserName?: string;
  onAddEventualidad?: (ev: EventualidadHuerto) => void;
  onUpdateEventualidad?: (ev: EventualidadHuerto) => void;
  onDeleteEventualidad?: (id: string) => void;
  canEdit?: boolean;
}

const TIPOS_EVENTUALIDAD: TipoEventualidad[] = [
  'Helada Radiativa',
  'Helada Advectiva',
  'Granizo',
  'Lluvia Intensa / Temporal',
  'Viento Fuerte',
  'Ola de Calor',
  'Corte Energía / Agua',
  'Otra'
];

const SEVERIDADES_EVENTO: EventualidadHuerto['severidad'][] = [
  'Leve',
  'Moderada',
  'Severa',
  'Crítica'
];

function calcularDuracionEventoHrs(inicio?: string, termino?: string): number | undefined {
  if (!inicio || !termino) return undefined;
  const [hi, mi] = inicio.split(':').map(Number);
  const [ht, mt] = termino.split(':').map(Number);
  if ([hi, mi, ht, mt].some((n) => Number.isNaN(n))) return undefined;
  let mIni = hi * 60 + mi;
  let mFin = ht * 60 + mt;
  if (mFin < mIni) mFin += 24 * 60;
  return Number(((mFin - mIni) / 60).toFixed(1));
}

interface GeoResultado {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

interface DiaPronostico {
  fecha: string;
  tempMin: number;
  tempMax: number;
  precipitacionMm: number;
  probabilidadLluvia: number;
  eto: number;
  codigoClima: number;
  descripcion: string;
}

// Ubicación oficial configurada por el usuario: Entrada Principal
export const UBICACION_ENTRADA_PRINCIPAL = {
  nombre: 'Entrada Principal (-39.6286, -72.4611)',
  lat: -39.628593,
  lng: -72.461085
};

// Comunas y puntos clave para selección rápida
const COMUNAS_RAPIDAS = [
  { nombre: 'Entrada Principal Fundo', region: 'Mi Predio', lat: -39.628593, lng: -72.461085 },
  { nombre: 'Curicó', region: 'Maule', lat: -34.9828, lng: -71.2394 },
  { nombre: 'Sagrada Familia', region: 'Maule', lat: -35.0342, lng: -71.3853 },
  { nombre: 'Romeral', region: 'Maule', lat: -34.9667, lng: -71.1333 },
  { nombre: 'Molina', region: 'Maule', lat: -35.1147, lng: -71.2828 },
  { nombre: 'Lanco / Panguipulli', region: 'Los Ríos', lat: -39.6000, lng: -72.4600 },
  { nombre: 'San Fernando', region: 'O\'Higgins', lat: -34.5833, lng: -70.9833 },
  { nombre: 'Talca', region: 'Maule', lat: -35.4264, lng: -71.6554 }
];

export const ClimaView: React.FC<ClimaViewProps> = ({
  clima: climaProp,
  onUpdateClima,
  eventualidades = [],
  parcelas = [],
  explotacion,
  activeUserName = 'Encargado de Huerto',
  onAddEventualidad,
  onUpdateEventualidad,
  onDeleteEventualidad,
  canEdit = true
}) => {
  const [localClima, setLocalClima] = useState<ClimaCondiciones>(climaProp);
  const clima = canEdit ? climaProp : localClima;
  // Ubicación seleccionada (prioriza la Entrada Principal especificada por el usuario)
  const [ubicacionNombre, setUbicacionNombre] = useState<string>(() => {
    const saved = localStorage.getItem('fundo_clima_nombre');
    if (!saved || saved.includes('Curicó')) {
      return UBICACION_ENTRADA_PRINCIPAL.nombre;
    }
    return saved;
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number }>(() => {
    const savedLat = localStorage.getItem('fundo_clima_lat');
    const savedLng = localStorage.getItem('fundo_clima_lng');
    if (!savedLat || parseFloat(savedLat) === -34.9828) {
      return {
        lat: UBICACION_ENTRADA_PRINCIPAL.lat,
        lng: UBICACION_ENTRADA_PRINCIPAL.lng
      };
    }
    return {
      lat: parseFloat(savedLat),
      lng: savedLng ? parseFloat(savedLng) : UBICACION_ENTRADA_PRINCIPAL.lng
    };
  });

  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<GeoResultado[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResultados, setShowResultados] = useState(false);
  const [isLoadingClima, setIsLoadingClima] = useState(false);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<string>(() => {
    return localStorage.getItem('fundo_clima_ultima_sync') || 'En línea';
  });
  const [pronostico7Dias, setPronostico7Dias] = useState<DiaPronostico[]>([]);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  // Modal para edición manual de respaldo
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState<ClimaCondiciones>({ ...clima });

  // Estado de Bitácora Anual de Eventualidades (Heladas, Granizo, Temporales)
  const currentYear = new Date().getFullYear();
  const [filtroAnio, setFiltroAnio] = useState<string>('todos');
  const [filtroTipoEv, setFiltroTipoEv] = useState<string>('todos');
  const [isEventoModalOpen, setIsEventoModalOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<EventualidadHuerto | null>(null);
  const [eventoToDelete, setEventoToDelete] = useState<EventualidadHuerto | null>(null);
  const [eventoForm, setEventoForm] = useState<Partial<EventualidadHuerto>>({
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: '03:00',
    horaTermino: '07:30',
    duracionHoras: 4.5,
    anio: currentYear,
    tipo: 'Helada Radiativa',
    severidad: 'Moderada',
    tempMinimaC: undefined,
    tempMaximaC: undefined,
    precipitacionMm: undefined,
    vientoKmH: undefined,
    parcelasIds: [],
    parcelasNombres: [],
    estadoFenologico: '',
    danioEstimadoPct: 0,
    medidaMitigacion: '',
    registradoPor: activeUserName,
    observaciones: ''
  });

  const aniosDisponibles = useMemo(() => {
    const years = new Set<number>([currentYear]);
    eventualidades.forEach((ev) => {
      if (ev.anio) years.add(ev.anio);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [eventualidades, currentYear]);

  const eventualidadesFiltradas = useMemo(() => {
    return eventualidades
      .filter((ev) => (filtroAnio === 'todos' ? true : String(ev.anio) === filtroAnio))
      .filter((ev) => (filtroTipoEv === 'todos' ? true : ev.tipo === filtroTipoEv))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [eventualidades, filtroAnio, filtroTipoEv]);

  const statsEventualidades = useMemo(() => {
    const heladas = eventualidadesFiltradas.filter((ev) =>
      ev.tipo.toLowerCase().includes('helada')
    );
    const tempsMin = eventualidadesFiltradas
      .map((ev) => ev.tempMinimaC)
      .filter((t): t is number => typeof t === 'number' && !Number.isNaN(t));
    const minAbsoluta = tempsMin.length > 0 ? Math.min(...tempsMin) : null;
    const horasTotales = eventualidadesFiltradas.reduce(
      (acc, ev) => acc + (ev.duracionHoras || 0),
      0
    );
    return {
      total: eventualidadesFiltradas.length,
      heladas: heladas.length,
      minAbsoluta,
      horasTotales: Number(horasTotales.toFixed(1))
    };
  }, [eventualidadesFiltradas]);

  // Función para convertir grados a puntos cardinales
  const getDireccionViento = (deg: number): string => {
    const direcciones = [
      'Norte (N)', 'Nor-Este (NE)', 'Este (E)', 'Sur-Este (SE)', 
      'Sur (S)', 'Sur-Poniente (SW)', 'Poniente (W)', 'Nor-Poniente (NW)'
    ];
    const idx = Math.round(deg / 45) % 8;
    return direcciones[idx] || 'Sur (S)';
  };

  // Función para interpretar el código WMO de clima
  const interpretarCodigoWmo = (codigo: number): { descripcion: string; estadoCielo: ClimaCondiciones['estadoCielo'] } => {
    if (codigo === 0) return { descripcion: 'Despejado / Soleado', estadoCielo: 'Soleado' };
    if (codigo === 1 || codigo === 2) return { descripcion: 'Parcialmente Nublado', estadoCielo: 'Parcialmente Nublado' };
    if (codigo === 3) return { descripcion: 'Nublado', estadoCielo: 'Nublado' };
    if (codigo === 45 || codigo === 48) return { descripcion: 'Niebla / Neblina matinal', estadoCielo: 'Nublado' };
    if (codigo >= 51 && codigo <= 55) return { descripcion: 'Llovizna leve', estadoCielo: 'Lluvia Moderada' };
    if (codigo >= 61 && codigo <= 67) return { descripcion: 'Lluvia Moderada / Intensa', estadoCielo: 'Lluvia Moderada' };
    if (codigo >= 80 && codigo <= 82) return { descripcion: 'Chubascos', estadoCielo: 'Lluvia Moderada' };
    if (codigo >= 95) return { descripcion: 'Tormenta Eléctrica', estadoCielo: 'Lluvia Moderada' };
    return { descripcion: 'Despejado', estadoCielo: 'Soleado' };
  };

  // Consulta en vivo a Open-Meteo API
  const fetchClimaEnVivo = async (lat: number, lng: number, nombre?: string) => {
    setIsLoadingClima(true);
    setErrorMensaje(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration,precipitation_sum,precipitation_probability_max,weather_code&timezone=auto`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error en servidor meteorológico (${res.status})`);
      const data = await res.json();

      const current = data.current;
      const daily = data.daily;

      if (!current || !daily) {
        throw new Error('Datos climáticos incompletos recibidos');
      }

      const tempActual = Math.round((current.temperature_2m ?? 20) * 10) / 10;
      const tempMin = Math.round((daily.temperature_2m_min?.[0] ?? 8) * 10) / 10;
      const tempMax = Math.round((daily.temperature_2m_max?.[0] ?? 25) * 10) / 10;
      const humedad = Math.round(current.relative_humidity_2m ?? 60);
      const vientoKmH = Math.round((current.wind_speed_10m ?? 5) * 10) / 10;
      const direccionViento = getDireccionViento(current.wind_direction_10m ?? 180);
      const precipitacionActual = current.precipitation ?? 0;
      const probLluvia = daily.precipitation_probability_max?.[0] ?? 0;
      const eto = Math.round((daily.et0_fao_evapotranspiration?.[0] ?? 4.2) * 10) / 10;
      const weatherCode = current.weather_code ?? 0;
      const { estadoCielo } = interpretarCodigoWmo(weatherCode);

      // Modelos Fitosanitarios para Kiwi Hayward:
      // Psa (Pseudomonas syringae pv. actinidiae):
      // Favorable: temp entre 10°C y 20°C, alta humedad (>80%) o lluvia.
      let riesgoPsa: ClimaCondiciones['riesgoPsa'] = 'Bajo';
      if ((tempActual >= 9 && tempActual <= 22) && (precipitacionActual > 0.5 || probLluvia >= 60 || humedad >= 85)) {
        riesgoPsa = precipitacionActual > 2 ? 'Crítico' : 'Alto';
      } else if ((tempActual >= 9 && tempActual <= 22) && (humedad >= 70 || probLluvia >= 30)) {
        riesgoPsa = 'Medio';
      }

      // Botrytis cinerea:
      // Favorable: alta humedad relativa (>80-85%) y temperaturas moderadas (14°C - 23°C).
      let riesgoBotrytis: ClimaCondiciones['riesgoBotrytis'] = 'Bajo';
      if (humedad >= 85 && tempActual >= 13) {
        riesgoBotrytis = 'Alto';
      } else if (humedad >= 75) {
        riesgoBotrytis = 'Medio';
      }

      const nuevoClima: ClimaCondiciones = {
        temperaturaActual: tempActual,
        tempMinima: tempMin,
        tempMaxima: tempMax,
        humedadRelativa: humedad,
        velocidadVientoKmH: vientoKmH,
        direccionViento: direccionViento,
        probabilidadLluvia: probLluvia,
        alertaHelada: tempMin <= 1.5,
        riesgoPsa: riesgoPsa,
        riesgoBotrytis: riesgoBotrytis,
        evapotranspiracionEtoMmDia: eto,
        estadoCielo: estadoCielo
      };

      // Guardar pronóstico de 7 días
      const pronosticos: DiaPronostico[] = [];
      if (daily.time && Array.isArray(daily.time)) {
        for (let i = 0; i < Math.min(daily.time.length, 7); i++) {
          const wCode = daily.weather_code?.[i] ?? 0;
          const { descripcion } = interpretarCodigoWmo(wCode);
          pronosticos.push({
            fecha: daily.time[i],
            tempMin: Math.round((daily.temperature_2m_min?.[i] ?? 0) * 10) / 10,
            tempMax: Math.round((daily.temperature_2m_max?.[i] ?? 0) * 10) / 10,
            precipitacionMm: Math.round((daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
            probabilidadLluvia: daily.precipitation_probability_max?.[i] ?? 0,
            eto: Math.round((daily.et0_fao_evapotranspiration?.[i] ?? 0) * 10) / 10,
            codigoClima: wCode,
            descripcion
          });
        }
      }
      setPronostico7Dias(pronosticos);

      const timestamp = `Hoy a las ${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs`;
      setUltimaSincronizacion(timestamp);
      localStorage.setItem('fundo_clima_ultima_sync', timestamp);

      if (nombre) {
        setUbicacionNombre(nombre);
        localStorage.setItem('fundo_clima_nombre', nombre);
      }
      localStorage.setItem('fundo_clima_lat', lat.toString());
      localStorage.setItem('fundo_clima_lng', lng.toString());
      setCoords({ lat, lng });

      // Actualizar vista local y estado global si tiene permiso de edición
      setLocalClima(nuevoClima);
      if (canEdit) {
        onUpdateClima(nuevoClima);
      }
    } catch (err: any) {
      console.error('Error al obtener clima en vivo:', err);
      setErrorMensaje(err.message || 'No se pudo conectar a la estación meteorológica');
    } finally {
      setIsLoadingClima(false);
    }
  };

  // Carga automática inicial al montar el componente
  useEffect(() => {
    fetchClimaEnVivo(coords.lat, coords.lng, ubicacionNombre);
  }, []);

  // Búsqueda de comuna en Open-Meteo Geocoding
  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busquedaTexto.trim()) return;

    setIsSearching(true);
    setErrorMensaje(null);
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(busquedaTexto.trim())}&count=6&language=es&format=json`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setResultadosBusqueda(data.results);
        setShowResultados(true);
      } else {
        setResultadosBusqueda([]);
        setErrorMensaje(`No se encontraron localidades para "${busquedaTexto}". Intenta con otra comuna o ciudad.`);
      }
    } catch (err: any) {
      console.error('Error buscando ubicación:', err);
      setErrorMensaje('Error de red al buscar la ubicación.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSeleccionarUbicacion = (item: GeoResultado) => {
    const nombreCompleto = `${item.name}${item.admin1 ? `, ${item.admin1}` : ''}${item.country ? ` (${item.country})` : ''}`;
    setShowResultados(false);
    setBusquedaTexto('');
    fetchClimaEnVivo(item.latitude, item.longitude, nombreCompleto);
  };

  // Obtener GPS del navegador
  const handleUsarGps = () => {
    if (!navigator.geolocation) {
      setErrorMensaje('Tu navegador no soporta geolocalización GPS.');
      return;
    }
    setIsLoadingClima(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const nombreGps = `GPS Mi Huerto (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
        fetchClimaEnVivo(lat, lng, nombreGps);
      },
      (err) => {
        setIsLoadingClima(false);
        setErrorMensaje('No se pudo obtener la posición GPS: ' + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Manejo de guardado manual de emergencia
  const handleOpenEdit = () => {
    setFormData({ ...clima });
    setIsEditOpen(true);
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateClima(formData);
    setUltimaSincronizacion(`Manual (${new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })})`);
    setIsEditOpen(false);
  };

  // Gestión de Eventualidades Climáticas (Heladas, Granizo, etc.)
  const handleOpenNewEvento = (preset?: Partial<EventualidadHuerto>) => {
    const today = new Date().toISOString().split('T')[0];
    const yearFromDate = parseInt(today.split('-')[0], 10) || currentYear;
    setEditingEvento(null);
    setEventoForm({
      fecha: today,
      horaInicio: '03:00',
      horaTermino: '07:30',
      duracionHoras: 4.5,
      anio: yearFromDate,
      tipo: preset?.tipo || 'Helada Radiativa',
      severidad: preset?.severidad || 'Moderada',
      tempMinimaC: preset?.tempMinimaC,
      tempMaximaC: preset?.tempMaximaC,
      precipitacionMm: preset?.precipitacionMm,
      vientoKmH: preset?.vientoKmH,
      parcelasIds: [],
      parcelasNombres: [],
      estadoFenologico: parcelas[0]?.estadoFenologico || '',
      danioEstimadoPct: 0,
      medidaMitigacion: preset?.medidaMitigacion || '',
      registradoPor: activeUserName,
      observaciones: ''
    });
    setIsEventoModalOpen(true);
  };

  const handleOpenEditEvento = (ev: EventualidadHuerto) => {
    setEditingEvento(ev);
    setEventoForm({ ...ev });
    setIsEventoModalOpen(true);
  };

  const handleToggleParcelaEvento = (p: Parcela) => {
    setEventoForm((prev) => {
      const currentIds = prev.parcelasIds || [];
      const exists = currentIds.includes(p.id);
      const nextIds = exists
        ? currentIds.filter((id) => id !== p.id)
        : [...currentIds, p.id];
      const nextNames = parcelas
        .filter((item) => nextIds.includes(item.id))
        .map((item) => item.nombre);
      return {
        ...prev,
        parcelasIds: nextIds,
        parcelasNombres: nextNames
      };
    });
  };

  const handleEventoHoraChange = (field: 'horaInicio' | 'horaTermino', val: string) => {
    setEventoForm((prev) => {
      const nextIni = field === 'horaInicio' ? val : prev.horaInicio;
      const nextFin = field === 'horaTermino' ? val : prev.horaTermino;
      const dur = calcularDuracionEventoHrs(nextIni, nextFin);
      return {
        ...prev,
        [field]: val,
        duracionHoras: dur !== undefined ? dur : prev.duracionHoras
      };
    });
  };

  const handleSaveEvento = (e: React.FormEvent) => {
    e.preventDefault();
    const fechaStr = eventoForm.fecha || new Date().toISOString().split('T')[0];
    const anioCalculado = parseInt(fechaStr.split('-')[0], 10) || eventoForm.anio || currentYear;
    const payload: EventualidadHuerto = {
      id: editingEvento ? editingEvento.id : `ev-${Date.now()}`,
      fecha: fechaStr,
      horaInicio: eventoForm.horaInicio || undefined,
      horaTermino: eventoForm.horaTermino || undefined,
      duracionHoras: eventoForm.duracionHoras,
      anio: anioCalculado,
      tipo: (eventoForm.tipo as TipoEventualidad) || 'Helada Radiativa',
      severidad: (eventoForm.severidad as EventualidadHuerto['severidad']) || 'Moderada',
      tempMinimaC: eventoForm.tempMinimaC,
      tempMaximaC: eventoForm.tempMaximaC,
      precipitacionMm: eventoForm.precipitacionMm,
      vientoKmH: eventoForm.vientoKmH,
      parcelasIds: eventoForm.parcelasIds || [],
      parcelasNombres: eventoForm.parcelasNombres || [],
      estadoFenologico: eventoForm.estadoFenologico || '',
      danioEstimadoPct: eventoForm.danioEstimadoPct,
      medidaMitigacion: eventoForm.medidaMitigacion || '',
      registradoPor: eventoForm.registradoPor || activeUserName,
      observaciones: eventoForm.observaciones || ''
    };

    if (editingEvento) {
      onUpdateEventualidad?.(payload);
    } else {
      onAddEventualidad?.(payload);
    }
    setIsEventoModalOpen(false);
    setEditingEvento(null);
  };

  return (
    <div className="space-y-6">
      {/* Header con Estado de Sincronización */}
      <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold uppercase tracking-wider mb-1">
              <CloudSun className="w-3.5 h-3.5 text-blue-700 animate-pulse" />
              Clima Agronómico en Vivo Automático (Open-Meteo)
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Estación Agro-Climática Kiwis
            </h1>
            <p className="text-xs text-stone-500">
              Datos meteorológicos en tiempo real, modelo predictivo de Psa, Botrytis y evapotranspiración de riego (ETo).
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => fetchClimaEnVivo(coords.lat, coords.lng, ubicacionNombre)}
              disabled={isLoadingClima}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              title="Actualizar datos climáticos en tiempo real"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingClima ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isLoadingClima ? 'Sincronizando...' : 'Actualizar Clima en Vivo'}</span>
            </button>

            {canEdit && (
              <button
                onClick={handleOpenEdit}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Ajuste manual de parámetros de estación"
              >
                <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                <span>Ajuste Manual</span>
              </button>
            )}
          </div>
        </div>

        {/* Barra de Ubicación & Búsqueda */}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Ubicación actual */}
            <div className="flex items-center gap-2 text-xs">
              <span className="p-1.5 bg-blue-700 text-white rounded-lg">
                <MapPin className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Ubicación del Huerto:</div>
                <div className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                  <span>{ubicacionNombre}</span>
                  <span className="text-[10px] font-mono font-normal text-stone-500 bg-stone-200 px-1.5 py-0.5 rounded">
                    {coords.lat.toFixed(3)}°, {coords.lng.toFixed(3)}°
                  </span>
                </div>
              </div>
            </div>

            {/* Buscador de comuna / GPS */}
            <form onSubmit={handleBuscar} className="flex items-center gap-2 flex-1 max-w-md relative">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={busquedaTexto}
                  onChange={(e) => setBusquedaTexto(e.target.value)}
                  placeholder="Ingresa comuna o ciudad (ej. Sagrada Familia, Curicó)..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-blue-600 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
              >
                {isSearching ? '...' : 'Buscar'}
              </button>

              <button
                type="button"
                onClick={handleUsarGps}
                className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Detectar mi ubicación actual vía GPS"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mi GPS</span>
              </button>
            </form>
          </div>

          {/* Menú flotante de resultados de búsqueda */}
          {showResultados && resultadosBusqueda.length > 0 && (
            <div className="p-2 bg-white rounded-xl border border-blue-200 shadow-md space-y-1 animate-in fade-in">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider px-2 py-1">
                Selecciona la localidad correspondiente:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                {resultadosBusqueda.map((res) => (
                  <button
                    key={res.id}
                    onClick={() => handleSeleccionarUbicacion(res)}
                    className="p-2 text-left hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-colors flex items-center justify-between text-xs cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-stone-900">{res.name}</span>
                      <span className="text-stone-500 text-[11px] ml-1">
                        {res.admin1 ? `· ${res.admin1}` : ''} ({res.country})
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {res.latitude.toFixed(2)}°, {res.longitude.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
              <div className="text-right pt-1">
                <button
                  onClick={() => setShowResultados(false)}
                  className="text-[11px] text-stone-500 hover:text-stone-800 px-2 cursor-pointer"
                >
                  Cerrar lista
                </button>
              </div>
            </div>
          )}

          {/* Chips rápidos de comunas kiwistas y ubicación principal */}
          <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-stone-200/60">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mr-1">Ubicación predial:</span>
            {COMUNAS_RAPIDAS.map((c) => (
              <button
                key={c.nombre}
                onClick={() => {
                  const label = c.nombre === 'Entrada Principal Fundo'
                    ? 'Entrada Principal (-39.6286, -72.4611)'
                    : `${c.nombre}, Región del ${c.region}`;
                  fetchClimaEnVivo(c.lat, c.lng, label);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
                  c.nombre === 'Entrada Principal Fundo'
                    ? ubicacionNombre.includes('Entrada Principal')
                      ? 'bg-emerald-800 text-white border-emerald-800 font-bold shadow-2xs'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 font-bold'
                    : ubicacionNombre.startsWith(c.nombre)
                    ? 'bg-blue-700 text-white border-blue-700 font-bold'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {c.nombre === 'Entrada Principal Fundo' && <span>⭐</span>}
                {c.nombre}
              </button>
            ))}
          </div>

          {/* Alerta de sincronización o error */}
          {errorMensaje && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMensaje}</span>
            </div>
          )}

          <div className="text-[10px] text-stone-500 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
              Estado: Sincronización satelital Open-Meteo ({ultimaSincronizacion})
            </span>
            <span>No requiere ingreso manual diario</span>
          </div>
        </div>
      </div>

      {/* Banners Agronómicos de Alerta Crítica (SAG & Fitosanitarios) */}
      {clima.velocidadVientoKmH > 15 && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-black uppercase tracking-wider text-rose-900 text-[11px]">
              ⚠️ ALERTA SAG: VIENTO SUPERIOR A 15 KM/H ({clima.velocidadVientoKmH} km/h)
            </div>
            <p className="leading-relaxed">
              La normativa del SAG prohíbe aplicaciones fitosanitarias con viento mayor a 15 km/h debido al riesgo crítico de deriva hacia predios colindantes y pérdida de eficacia del caldo fitosanitario. Se recomienda suspender o reprogramar pulverizaciones.
            </p>
          </div>
        </div>
      )}

      {clima.alertaHelada && (
        <div className="p-4 bg-cyan-50 border-2 border-cyan-300 rounded-2xl text-cyan-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <Thermometer className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-black uppercase tracking-wider text-cyan-900 text-[11px]">
                ❄️ ALERTA DE HELADA AGRONÓMICA: MÍNIMA PRONOSTICADA {clima.tempMinima}°C
              </div>
              <p className="leading-relaxed">
                Temperaturas cercanas o bajo cero dañan irreversiblemente los brotes tiernos y racimos florales de Hayward. Activar sistemas de mitigación (aspersión antiheladas sub/sobre copa o torres de viento).
              </p>
            </div>
          </div>
          {canEdit && onAddEventualidad && (
            <button
              type="button"
              onClick={() =>
                handleOpenNewEvento({
                  tipo: 'Helada Radiativa',
                  tempMinimaC: clima.tempMinima,
                  severidad: clima.tempMinima <= -2 ? 'Crítica' : clima.tempMinima <= 0 ? 'Severa' : 'Moderada',
                  medidaMitigacion: 'Aspersión antiheladas / Monitoreo térmico'
                })
              }
              className="px-3.5 py-2 bg-cyan-900 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Snowflake className="w-3.5 h-3.5" />
              <span>Registrar Helada en Bitácora</span>
            </button>
          )}
        </div>
      )}

      {/* Tarjetas Principales de Sensores de Estación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Temperatura */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Temperatura Aire</span>
            <Thermometer className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-3xl font-black text-stone-900">
            {clima.temperaturaActual}°C
          </div>
          <div className="text-[11px] text-stone-600 flex justify-between font-mono bg-stone-50 px-2 py-1 rounded">
            <span>Mín: <strong className="text-blue-700">{clima.tempMinima}°C</strong></span>
            <span>Máx: <strong className="text-amber-700">{clima.tempMaxima}°C</strong></span>
          </div>
          <div className="text-[10px] text-amber-800 font-bold flex items-center justify-between">
            <span>GDD hoy (base 10°C):</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 font-mono">
              +{calcularGradosDiaPeriodo(clima.tempMinima, clima.tempMaxima, 10, 30, 1)} °D
            </span>
          </div>
        </div>

        {/* Humedad & Estado Cielo */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Humedad Relativa</span>
            <Droplet className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-3xl font-black text-stone-900">
            {clima.humedadRelativa}%
          </div>
          <div className="text-[11px] text-stone-700 bg-stone-50 px-2 py-1 rounded flex justify-between">
            <span>Cielo:</span>
            <strong className="text-stone-900">{clima.estadoCielo}</strong>
          </div>
          <div className="text-[10px] text-stone-400">
            {clima.probabilidadLluvia > 0 ? `Prob. lluvia: ${clima.probabilidadLluvia}%` : 'Sin lluvia prevista'}
          </div>
        </div>

        {/* Viento y Deriva SAG */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Viento & Deriva</span>
            <Wind className="w-4 h-4 text-stone-700" />
          </div>
          <div className="text-3xl font-black text-stone-900 flex items-baseline gap-1">
            {clima.velocidadVientoKmH}
            <span className="text-sm font-semibold text-stone-500">km/h</span>
          </div>
          <div className="text-[11px] text-stone-700 bg-stone-50 px-2 py-1 rounded truncate">
            {clima.direccionViento}
          </div>
          <div className="text-[10px]">
            {clima.velocidadVientoKmH <= 15 ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Apto para pulverizar (&lt;15 km/h)
              </span>
            ) : (
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Riesgo de deriva SAG (&gt;15 km/h)
              </span>
            )}
          </div>
        </div>

        {/* Evapotranspiración ETo */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Demanda ETo (FAO-56)</span>
            <Sun className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-stone-900 flex items-baseline gap-1">
            {clima.evapotranspiracionEtoMmDia}
            <span className="text-sm font-semibold text-stone-500">mm/día</span>
          </div>
          <div className="text-[11px] text-stone-700 bg-stone-50 px-2 py-1 rounded">
            ≈ {Math.round(clima.evapotranspiracionEtoMmDia * 10)} m³ de agua/ha/día
          </div>
          <div className="text-[10px] text-stone-400">
            Cálculo Penman-Monteith para riego
          </div>
        </div>
      </div>

      {/* Modelos Fitosanitarios Predictivos para Huerto de Kiwis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Psa */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              Modelo Predictivo Bacteriosis Psa (SAG)
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
              clima.riesgoPsa === 'Crítico'
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : clima.riesgoPsa === 'Alto'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : clima.riesgoPsa === 'Medio'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              Riesgo {clima.riesgoPsa}
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            La bacteria <em>Pseudomonas syringae</em> pv. <em>actinidiae</em> prolifera con temperaturas entre 10°C y 20°C acompañadas de agua libre en hojas (lluvias &gt; 1 mm o rocío prolongado con humedad &gt; 80%).
          </p>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
            <div className="font-bold text-stone-900">Recomendación Técnica Oficial:</div>
            {clima.riesgoPsa === 'Alto' || clima.riesgoPsa === 'Crítico' ? (
              <p className="text-rose-900">
                ⚠️ Condiciones favorables para ingreso bacteriano por estomas e hidátodos. Aplicar fungicida cúprico preventivo (Cuprocol / Mastercop) antes de lluvia o inmediatamente post poda/granizo.
              </p>
            ) : clima.riesgoPsa === 'Medio' ? (
              <p className="text-amber-900">
                Mantener monitoreo de cancros y exudados en cargadores. Desinfectar herramientas de poda en cuarteles con antecedentes.
              </p>
            ) : (
              <p className="text-emerald-900">
                Condiciones estables sin alta presión bacteriana. Mantener sellado preventivo de cortes sólo en labores de poda verde o desbrote.
              </p>
            )}
          </div>
        </div>

        {/* Botrytis */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-700" />
              Modelo Predictivo Botrytis cinerea
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
              clima.riesgoBotrytis === 'Alto'
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : clima.riesgoBotrytis === 'Medio'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}>
              Riesgo {clima.riesgoBotrytis}
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            El hongo de <em>Botrytis</em> ataca órganos florales caídos y pedúnculos de kiwi con humedad relativa &gt; 85% sostenida por más de 12 a 14 horas seguidas en floración o precosecha.
          </p>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
            <div className="font-bold text-stone-900">Recomendación Técnica Oficial:</div>
            {clima.riesgoBotrytis === 'Alto' ? (
              <p className="text-rose-900">
                ⚠️ Alta humedad atmosférica prolongada. Priorizar botriticidas específicos autorizados (Fludioxonil / Luna Tranquility) respetando rigurosamente los días de carencia SAG antes de cosecha.
              </p>
            ) : (
              <p className="text-stone-700">
                Humedad ambiental en rango seguro. Mantener ventilación en parrón español mediante manejo adecuado de canopia y deschuponado.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pronóstico Agronómico Extendido a 7 Días */}
      {pronostico7Dias.length > 0 && (
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-700" />
              <h3 className="font-bold text-sm text-stone-900">
                Pronóstico Agronómico a 7 Días (Planificación de Riego y Pulverizaciones)
              </h3>
            </div>
            <span className="text-[11px] text-stone-500 font-medium">
              Datos para {ubicacionNombre}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {pronostico7Dias.map((dia, idx) => {
              const fechaObj = new Date(dia.fecha + 'T12:00:00');
              const diaNombre = idx === 0 ? 'Hoy' : fechaObj.toLocaleDateString('es-CL', { weekday: 'short' });
              const fechaCorta = fechaObj.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
              const tieneHelada = dia.tempMin <= 1.5;
              const tieneLluvia = dia.precipitacionMm > 0.5 || dia.probabilidadLluvia >= 50;

              return (
                <div
                  key={dia.fecha}
                  className={`p-3 rounded-xl border flex flex-col justify-between text-center transition-all ${
                    idx === 0 
                      ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-200' 
                      : tieneHelada 
                      ? 'bg-cyan-50/50 border-cyan-300' 
                      : tieneLluvia 
                      ? 'bg-indigo-50/50 border-indigo-200'
                      : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div>
                    <div className="font-extrabold text-xs text-stone-900 uppercase">
                      {diaNombre}
                    </div>
                    <div className="text-[10px] text-stone-400 capitalize mb-1">
                      {fechaCorta}
                    </div>
                    <div className="text-[10px] font-semibold text-stone-700 h-6 flex items-center justify-center line-clamp-2 px-0.5">
                      {dia.descripcion}
                    </div>
                  </div>

                  <div className="my-2 space-y-1">
                    <div className="text-base font-black text-stone-900">
                      {dia.tempMax}°
                    </div>
                    <div className={`text-xs font-bold font-mono ${tieneHelada ? 'text-cyan-700' : 'text-blue-700'}`}>
                      {dia.tempMin}°C
                    </div>
                  </div>

                  <div className="text-[10px] text-stone-500 border-t border-stone-200/80 pt-1.5 space-y-0.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span>Lluvia:</span>
                      <strong className={dia.probabilidadLluvia > 40 ? 'text-indigo-700 font-bold' : ''}>
                        {dia.probabilidadLluvia}%
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span>ETo:</span>
                      <strong className="text-amber-700 font-bold">{dia.eto} mm</strong>
                    </div>
                  </div>

                  {tieneHelada && (
                    <div className="mt-1.5 bg-cyan-100 text-cyan-800 text-[9px] font-bold py-0.5 rounded uppercase">
                      Helada
                    </div>
                  )}
                  {dia.precipitacionMm > 2 && (
                    <div className="mt-1.5 bg-indigo-100 text-indigo-800 text-[9px] font-bold py-0.5 rounded uppercase">
                      {dia.precipitacionMm} mm
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BITÁCORA ANUAL DE EVENTUALIDADES CLIMÁTICAS (HELADAS, GRANIZO, TEMPORALES) */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-800 mb-0.5">
              <Snowflake className="w-3.5 h-3.5 text-cyan-700" />
              <span>Registro Histórico Anual del Predio</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
              Bitácora Anual de Heladas y Eventualidades Climáticas
            </h2>
            <p className="text-xs text-stone-500">
              Registra heladas radiativas/advectivas, granizos, lluvias intensas, vientos fuertes u otras eventualidades ocurridas durante el año, su impacto y mitigación.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-800"
              aria-label="Filtrar eventualidades por año"
            >
              <option value="todos">Todos los años ({eventualidades.length})</option>
              {aniosDisponibles.map((yr) => (
                <option key={yr} value={String(yr)}>
                  Año {yr}
                </option>
              ))}
            </select>

            <select
              value={filtroTipoEv}
              onChange={(e) => setFiltroTipoEv(e.target.value)}
              className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold text-stone-800"
              aria-label="Filtrar eventualidades por tipo"
            >
              <option value="todos">Todos los eventos</option>
              {TIPOS_EVENTUALIDAD.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() =>
                exportEventualidadesPDF(
                  eventualidadesFiltradas,
                  explotacion,
                  filtroAnio === 'todos' ? undefined : `Año ${filtroAnio}`
                )
              }
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-cyan-800" />
              <span>PDF ({eventualidadesFiltradas.length})</span>
            </button>

            {canEdit && onAddEventualidad && (
              <button
                type="button"
                onClick={() => handleOpenNewEvento()}
                className="px-4 py-2 bg-cyan-900 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Helada / Eventualidad</span>
              </button>
            )}
          </div>
        </div>

        {/* Resumen Anual de Eventualidades */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-stone-50/70 border-b border-stone-200">
          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Eventualidades Filtradas
            </div>
            <div className="text-xl font-black text-stone-900 font-mono tabular-nums mt-0.5">
              {statsEventualidades.total}
            </div>
            <div className="text-[11px] text-stone-500">
              {filtroAnio === 'todos' ? 'Histórico total' : `Temporada ${filtroAnio}`}
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">
              Heladas Registradas
            </div>
            <div className="text-xl font-black text-cyan-900 font-mono tabular-nums mt-0.5">
              {statsEventualidades.heladas}
            </div>
            <div className="text-[11px] text-stone-500">Radiativas y advectivas</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Mínima Absoluta
            </div>
            <div className="text-xl font-black text-blue-900 font-mono tabular-nums mt-0.5">
              {statsEventualidades.minAbsoluta !== null ? `${statsEventualidades.minAbsoluta}°C` : '—'}
            </div>
            <div className="text-[11px] text-stone-500">Menor temperatura registrada</div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-stone-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Duración Acumulada
            </div>
            <div className="text-xl font-black text-stone-900 font-mono tabular-nums mt-0.5">
              {statsEventualidades.horasTotales} hrs
            </div>
            <div className="text-[11px] text-stone-500">Horas bajo eventos críticos</div>
          </div>
        </div>

        {/* Tabla de Eventualidades */}
        {eventualidadesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-stone-400 space-y-2">
            <Snowflake className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-sm text-stone-700">
              No hay eventualidades registradas para este filtro
            </p>
            <p className="text-xs">
              Registra heladas, granizos, temporales o cortes de riego ocurridos en el año para mantener trazabilidad técnica y análisis de daño.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="p-3">Fecha & Horario</th>
                  <th className="p-3">Eventualidad</th>
                  <th className="p-3">Severidad & Daño</th>
                  <th className="p-3">Mediciones (T° / Lluvia / Viento)</th>
                  <th className="p-3">Cuarteles & Fenología</th>
                  <th className="p-3">Mitigación & Respuesta</th>
                  <th className="p-3">Responsable</th>
                  {canEdit && <th className="p-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {eventualidadesFiltradas.map((ev) => (
                  <tr key={ev.id} className="hover:bg-cyan-50/30 transition-colors align-top">
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold text-stone-900 font-mono">{ev.fecha}</div>
                      {(ev.horaInicio || ev.duracionHoras) && (
                        <div className="text-[11px] text-stone-500 font-mono">
                          {ev.horaInicio || ''}
                          {ev.horaTermino ? ` - ${ev.horaTermino}` : ''}
                          {ev.duracionHoras ? ` (${ev.duracionHoras}h)` : ''}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-extrabold text-stone-900">{ev.tipo}</div>
                      <div className="text-[10px] text-stone-400 font-mono">Año {ev.anio}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${
                          ev.severidad === 'Crítica'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : ev.severidad === 'Severa'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : ev.severidad === 'Moderada'
                            ? 'bg-cyan-50 text-cyan-800 border-cyan-300'
                            : 'bg-stone-100 text-stone-700 border-stone-300'
                        }`}
                      >
                        {ev.severidad}
                      </span>
                      {ev.danioEstimadoPct !== undefined && ev.danioEstimadoPct > 0 && (
                        <div className="text-[11px] font-mono text-rose-700 font-bold mt-1">
                          Daño est.: {ev.danioEstimadoPct}%
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] tabular-nums whitespace-nowrap">
                      {ev.tempMinimaC !== undefined && (
                        <div className={ev.tempMinimaC <= 0 ? 'text-cyan-800 font-bold' : ''}>
                          T° Mín: {ev.tempMinimaC}°C
                        </div>
                      )}
                      {ev.tempMaximaC !== undefined && <div>T° Máx: {ev.tempMaximaC}°C</div>}
                      {ev.precipitacionMm !== undefined && <div>Lluvia: {ev.precipitacionMm} mm</div>}
                      {ev.vientoKmH !== undefined && <div>Viento: {ev.vientoKmH} km/h</div>}
                      {ev.tempMinimaC === undefined &&
                        ev.tempMaximaC === undefined &&
                        ev.precipitacionMm === undefined &&
                        ev.vientoKmH === undefined && <span className="text-stone-400">—</span>}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-stone-800">
                        {ev.parcelasNombres?.length
                          ? ev.parcelasNombres.join(', ')
                          : 'Todo el predio'}
                      </div>
                      {ev.estadoFenologico && (
                        <div className="text-[11px] text-stone-500">Etapa: {ev.estadoFenologico}</div>
                      )}
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="text-stone-800 font-medium">
                        {ev.medidaMitigacion || 'Sin medida registrada'}
                      </div>
                      {ev.observaciones && (
                        <div className="text-[11px] text-stone-500 mt-0.5">{ev.observaciones}</div>
                      )}
                    </td>
                    <td className="p-3 text-[11px] text-stone-600 whitespace-nowrap">
                      {ev.registradoPor}
                    </td>
                    {canEdit && (
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEvento(ev)}
                            className="p-1.5 text-stone-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg cursor-pointer"
                            title="Editar eventualidad"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEventoToDelete(ev)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Eliminar eventualidad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR / EDITAR EVENTUALIDAD CLIMÁTICA */}
      {isEventoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 overflow-hidden">
            <div className="bg-cyan-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-cyan-300" />
                {editingEvento
                  ? 'Editar Eventualidad Climática'
                  : 'Registrar Helada o Eventualidad Anual'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEventoModalOpen(false)}
                className="text-cyan-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvento} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tipo de Eventualidad:</label>
                  <select
                    value={eventoForm.tipo || 'Helada Radiativa'}
                    onChange={(e) =>
                      setEventoForm({ ...eventoForm, tipo: e.target.value as TipoEventualidad })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    required
                  >
                    {TIPOS_EVENTUALIDAD.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha del Evento:</label>
                  <input
                    type="date"
                    value={eventoForm.fecha || ''}
                    onChange={(e) => setEventoForm({ ...eventoForm, fecha: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Severidad:</label>
                  <select
                    value={eventoForm.severidad || 'Moderada'}
                    onChange={(e) =>
                      setEventoForm({
                        ...eventoForm,
                        severidad: e.target.value as EventualidadHuerto['severidad']
                      })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                  >
                    {SEVERIDADES_EVENTO.map((sev) => (
                      <option key={sev} value={sev}>
                        {sev}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Hora Inicio:</label>
                  <input
                    type="time"
                    value={eventoForm.horaInicio || ''}
                    onChange={(e) => handleEventoHoraChange('horaInicio', e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Hora Término:</label>
                  <input
                    type="time"
                    value={eventoForm.horaTermino || ''}
                    onChange={(e) => handleEventoHoraChange('horaTermino', e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Duración (hrs):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={eventoForm.duracionHoras ?? ''}
                    onChange={(e) =>
                      setEventoForm({
                        ...eventoForm,
                        duracionHoras: e.target.value === '' ? undefined : parseFloat(e.target.value)
                      })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="font-bold text-stone-800">Mediciones Registradas en el Evento</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-semibold text-stone-600 mb-1">T° Mínima (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="ej. -1.8"
                      value={eventoForm.tempMinimaC ?? ''}
                      onChange={(e) =>
                        setEventoForm({
                          ...eventoForm,
                          tempMinimaC: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 mb-1">T° Máxima (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Opcional"
                      value={eventoForm.tempMaximaC ?? ''}
                      onChange={(e) =>
                        setEventoForm({
                          ...eventoForm,
                          tempMaximaC: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 mb-1">Lluvia (mm):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Opcional"
                      value={eventoForm.precipitacionMm ?? ''}
                      onChange={(e) =>
                        setEventoForm({
                          ...eventoForm,
                          precipitacionMm: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 mb-1">Viento (km/h):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="Opcional"
                      value={eventoForm.vientoKmH ?? ''}
                      onChange={(e) =>
                        setEventoForm({
                          ...eventoForm,
                          vientoKmH: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Cuarteles afectados */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">
                    Cuarteles Afectados (vacío = todo el predio)
                  </span>
                  <span className="text-[11px] text-stone-500">
                    {eventoForm.parcelasIds?.length || 0} seleccionados
                  </span>
                </div>
                {parcelas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {parcelas.map((p) => {
                      const checked = (eventoForm.parcelasIds || []).includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleToggleParcelaEvento(p)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer ${
                            checked
                              ? 'bg-cyan-900 text-white border-cyan-900'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {checked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          <span>{p.codigoCuartel ? `${p.codigoCuartel} · ` : ''}{p.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-500">
                    No hay cuarteles creados; se registrará para todo el predio.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Estado Fenológico:</label>
                  <input
                    type="text"
                    placeholder="ej. Brotes tiernos / Plena flor"
                    value={eventoForm.estadoFenologico || ''}
                    onChange={(e) =>
                      setEventoForm({ ...eventoForm, estadoFenologico: e.target.value })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Daño Estimado (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={eventoForm.danioEstimadoPct ?? 0}
                    onChange={(e) =>
                      setEventoForm({
                        ...eventoForm,
                        danioEstimadoPct: e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                      })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Registrado Por:</label>
                  <input
                    type="text"
                    value={eventoForm.registradoPor || ''}
                    onChange={(e) =>
                      setEventoForm({ ...eventoForm, registradoPor: e.target.value })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Medida de Mitigación / Acción Realizada:
                </label>
                <input
                  type="text"
                  placeholder="ej. Activación aspersión antiheladas 03:15 hrs / Aplicación cobre post-helada"
                  value={eventoForm.medidaMitigacion || ''}
                  onChange={(e) =>
                    setEventoForm({ ...eventoForm, medidaMitigacion: e.target.value })
                  }
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-600 mb-1">Observaciones:</label>
                <textarea
                  rows={2}
                  placeholder="Detalle de zonas bajas afectadas, daños en yemas/brotes o seguimiento..."
                  value={eventoForm.observaciones || ''}
                  onChange={(e) => setEventoForm({ ...eventoForm, observaciones: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEventoModalOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-900 hover:bg-cyan-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  {editingEvento ? 'Guardar Cambios' : 'Registrar Eventualidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR EVENTUALIDAD */}
      {eventoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-sm text-stone-900">¿Eliminar Eventualidad?</h3>
            </div>
            <p className="text-xs text-stone-600">
              Se eliminará el registro de <strong>{eventoToDelete.tipo}</strong> del{' '}
              <strong>{eventoToDelete.fecha}</strong>.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setEventoToDelete(null)}
                className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEventualidad?.(eventoToDelete.id);
                  setEventoToDelete(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CLIMA (MANUAL DE RESPALDO) */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-blue-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-blue-300" />
                Ajuste Manual de Parámetros Meteorológicos
              </h3>
              <button onClick={() => setIsEditOpen(false)} className="text-blue-200 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveManual} className="p-5 space-y-3 text-xs max-h-[85vh] overflow-y-auto">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Nota: El clima se actualiza automáticamente con satélite según tu comuna. Usa este formulario sólo para forzar lecturas de estación física Davis local.
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Temp Actual (°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temperaturaActual}
                    onChange={(e) => setFormData({ ...formData, temperaturaActual: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Mínima (°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tempMinima}
                    onChange={(e) => setFormData({ ...formData, tempMinima: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Máxima (°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tempMaxima}
                    onChange={(e) => setFormData({ ...formData, tempMaxima: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Humedad Relativa (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.humedadRelativa}
                    onChange={(e) => setFormData({ ...formData, humedadRelativa: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Velocidad Viento (km/h):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.velocidadVientoKmH}
                    onChange={(e) => setFormData({ ...formData, velocidadVientoKmH: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Dirección Viento:</label>
                  <input
                    type="text"
                    value={formData.direccionViento}
                    onChange={(e) => setFormData({ ...formData, direccionViento: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="ej. Sur-Poniente (SW)"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Evapotranspiración ETo (mm/día):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.evapotranspiracionEtoMmDia}
                    onChange={(e) => setFormData({ ...formData, evapotranspiracionEtoMmDia: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Riesgo Psa:</label>
                  <select
                    value={formData.riesgoPsa}
                    onChange={(e) => setFormData({ ...formData, riesgoPsa: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                  >
                    <option value="Bajo">Bajo</option>
                    <option value="Medio">Medio</option>
                    <option value="Alto">Alto</option>
                    <option value="Crítico">Crítico</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Riesgo Botrytis:</label>
                  <select
                    value={formData.riesgoBotrytis}
                    onChange={(e) => setFormData({ ...formData, riesgoBotrytis: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                  >
                    <option value="Bajo">Bajo</option>
                    <option value="Medio">Medio</option>
                    <option value="Alto">Alto</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Estado Cielo:</label>
                  <select
                    value={formData.estadoCielo}
                    onChange={(e) => setFormData({ ...formData, estadoCielo: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="Soleado">Soleado</option>
                    <option value="Parcialmente Nublado">Parcialmente Nublado</option>
                    <option value="Nublado">Nublado</option>
                    <option value="Lluvia Moderada">Lluvia Moderada</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Guardar Mediciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
