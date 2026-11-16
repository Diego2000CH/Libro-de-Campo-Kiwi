import React, { useState, useEffect } from 'react';
import { ClimaCondiciones } from '../types/campo';
import { 
  CloudSun, 
  Thermometer, 
  Droplet, 
  Wind, 
  AlertTriangle, 
  CheckCircle2, 
  Sun, 
  CloudRain,
  ShieldAlert,
  Compass,
  Edit3,
  X,
  Check,
  MapPin,
  RefreshCw,
  Search,
  Navigation,
  Calendar,
  Waves,
  Info
} from 'lucide-react';

interface ClimaViewProps {
  clima: ClimaCondiciones;
  onUpdateClima: (clima: ClimaCondiciones) => void;
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
  clima,
  onUpdateClima
}) => {
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

      // Actualizar estado global del applet
      onUpdateClima(nuevoClima);
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
      alert('Tu navegador no soporta geolocalización.');
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
        alert('No se pudo obtener la posición GPS: ' + err.message);
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

            <button
              onClick={handleOpenEdit}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Ajuste manual de parámetros de estación"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-600" />
              <span>Ajuste Manual</span>
            </button>
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
        <div className="p-4 bg-cyan-50 border-2 border-cyan-300 rounded-2xl text-cyan-950 flex items-start gap-3 shadow-xs">
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
          <div className="text-[10px] text-stone-400">
            Sensor a 2.0 m sobre nivel de copa
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
