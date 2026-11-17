import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  APILoadingStatus,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { Parcela, LugarPredio, TipoLugarPredio, SectorRiego } from '../types/campo';
import { initialSectoresRiego } from '../data/initialData';
import { 
  Compass, 
  MapPin, 
  Layers, 
  Plus, 
  AlertTriangle, 
  Edit3, 
  Trash2,
  TreeDeciduous,
  LocateFixed,
  ExternalLink,
  PenTool,
  Undo2,
  Check,
  X,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

interface ParcelasViewProps {
  parcelas: Parcela[];
  lugares: LugarPredio[];
  mapsApiKey?: string;
  mapsKeyLoading?: boolean;
  mapsKeyError?: string | null;
  onRetryMapsKey?: () => void;
  defaultCenter?: { lat: number; lng: number };
  onAddParcela: (parcela: Parcela) => void;
  onUpdateParcela: (parcela: Parcela) => void;
  onDeleteParcela: (id: string) => void;
  onAddLugar: (lugar: LugarPredio) => void;
  onUpdateLugar?: (lugar: LugarPredio) => void;
  onDeleteLugar: (id: string) => void;
  onRegisterLaborForParcela: (parcelaId: string) => void;
  canEdit?: boolean;
}

const isValidLatLng = (lat?: unknown, lng?: unknown): boolean =>
  typeof lat === 'number' &&
  typeof lng === 'number' &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

const SISTEMAS_CONDUCCION = [
  'Parrón Español',
  'Espaldera en T',
  'T-Bar Pergola',
  'Eje Central Frutícola',
  'Doble Cortina',
  'Otro Sistema'
] as const;

const ESTADOS_OPERATIVOS = [
  'Normal',
  'Listo para Cosecha',
  'En Carencia SAG',
  'En Riego',
  'En Floración',
  'En Crecimiento de Fruto',
  'Receso Invernal'
] as const;

const ESTADOS_FENOLOGICOS = [
  'Receso invernal (Dormancia)',
  'Yema hinchada (BBCH 51)',
  'Brotación y hojas desplegadas (BBCH 15)',
  'Aparición de botones florales (BBCH 55)',
  'Floración y polinización (BBCH 65)',
  'Cuaja y caída de pétalos (BBCH 71)',
  'Crecimiento activo del fruto (BBCH 75)',
  'Maduración y acumulación azúcares (BBCH 85)',
  'Post-cosecha y caída de hojas (BBCH 91)'
];

const COLORES_PRESET = [
  '#059669', // Emerald
  '#0d9488', // Teal
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#dc2626', // Red
  '#4f46e5'  // Indigo
];

// Cálculo de radio métrico en base al área en hectáreas: A = ha * 10.000 m² -> r = sqrt(A / pi)
export const calcularRadioMetros = (ha: number): number => {
  const m2 = (Number(ha) || 1) * 10000;
  return Math.sqrt(m2 / Math.PI);
};

// Cálculo geodésico de área en m² (fórmula esférica sobre WGS84, R = 6.378.137 m)
export const calcularAreaPoligonoM2 = (points: { lat: number; lng: number }[]): number => {
  if (!points || points.length < 3) return 0;
  const R = 6378137;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const lat1 = toRad(p1.lat);
    const lat2 = toRad(p2.lat);
    const dLng = toRad(p2.lng - p1.lng);
    total += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs((total * R * R) / 2);
};

// Centroide ponderado por área para ubicar el marcador del cuartel aunque el polígono sea irregular
export const calcularCentroidePoligono = (
  points: { lat: number; lng: number }[]
): { lat: number; lng: number } | null => {
  const validPoints = (points || []).filter((p) => isValidLatLng(p?.lat, p?.lng));
  if (validPoints.length === 0) return null;
  if (validPoints.length < 3) {
    const sum = validPoints.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), { lat: 0, lng: 0 });
    return {
      lat: Number((sum.lat / validPoints.length).toFixed(6)),
      lng: Number((sum.lng / validPoints.length).toFixed(6)),
    };
  }
  points = validPoints;
  let areaSum = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    const cross = p0.lng * p1.lat - p1.lng * p0.lat;
    areaSum += cross;
    cx += (p0.lng + p1.lng) * cross;
    cy += (p0.lat + p1.lat) * cross;
  }
  if (Math.abs(areaSum) < 1e-12) {
    const sum = points.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), { lat: 0, lng: 0 });
    return {
      lat: Number((sum.lat / points.length).toFixed(6)),
      lng: Number((sum.lng / points.length).toFixed(6)),
    };
  }
  const factor = 1 / (3 * areaSum);
  return {
    lat: Number((cy * factor).toFixed(6)),
    lng: Number((cx * factor).toFixed(6)),
  };
};

// Genera un polígono inicial editable (octágono) alrededor de un centro y superficie en hectáreas
export const generarPoligonoDesdeCirculo = (
  lat: number,
  lng: number,
  ha: number,
  sides = 8
): { lat: number; lng: number }[] => {
  const radiusM = calcularRadioMetros(ha || 1);
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const pts: { lat: number; lng: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    pts.push({
      lat: Number((lat + (radiusM * Math.sin(angle)) / metersPerDegLat).toFixed(6)),
      lng: Number((lng + (radiusM * Math.cos(angle)) / metersPerDegLng).toFixed(6)),
    });
  }
  return pts;
};

// Configuración de tipos de mapa de Google Maps Platform
type MapLayerType =
  | 'google_hibrido'
  | 'google_satelite'
  | 'google_calles'
  | 'google_terreno';

const GOOGLE_MAP_TYPE_ID: Record<MapLayerType, string> = {
  google_hibrido: 'hybrid',
  google_satelite: 'satellite',
  google_calles: 'roadmap',
  google_terreno: 'terrain',
};

const CATEGORIAS_LUGARES: { tipo: TipoLugarPredio; label: string; emoji: string; color: string }[] = [
  { tipo: 'cuartel', label: 'Cuartel de Kiwis', emoji: '🥝', color: '#059669' },
  { tipo: 'barbecho', label: 'Barbecho / Suelo en Descanso', emoji: '🌾', color: '#d97706' },
  { tipo: 'bodega', label: 'Bodega Fitosanitarios & Fertilizantes', emoji: '🧪', color: '#7c3aed' },
  { tipo: 'oficina', label: 'Oficina / Administración', emoji: '🏢', color: '#1e40af' },
  { tipo: 'casa_patronal', label: 'Casa Patronal', emoji: '🏡', color: '#047857' },
  { tipo: 'caseta_riego', label: 'Caseta de Riego & Cabezal', emoji: '💧', color: '#0284c7' },
  { tipo: 'pozo', label: 'Pozo Profundo (Fiscalización DGA)', emoji: '🚰', color: '#0369a1' },
  { tipo: 'taller_maquinaria', label: 'Taller de Maquinaria & Galpón', emoji: '🚜', color: '#ea580c' },
  { tipo: 'porton', label: 'Portón de Acceso Principal', emoji: '🚪', color: '#57534e' },
  { tipo: 'punto_limpio', label: 'Punto Limpio / Triple Lavado SAG', emoji: '♻️', color: '#16a34a' },
  { tipo: 'comedor', label: 'Comedor y Servicios de Faena', emoji: '🍽️', color: '#e11d48' },
  { tipo: 'estacion_meteo', label: 'Estación Meteorológica', emoji: '🌦️', color: '#2563eb' },
  { tipo: 'otro', label: 'Punto Personalizado', emoji: '📍', color: '#dc2626' }
];

const MapCameraController: React.FC<{
  focusTarget: { lat: number; lng: number; ts: number } | null;
  initialCenter: { lat: number; lng: number };
  hasOrchardData: boolean;
}> = ({ focusTarget, initialCenter, hasOrchardData }) => {
  const map = useMap();
  const hasAutoCenteredDataRef = useRef(false);

  useEffect(() => {
    if (map && focusTarget && isValidLatLng(focusTarget.lat, focusTarget.lng)) {
      hasAutoCenteredDataRef.current = true;
      map.panTo({ lat: focusTarget.lat, lng: focusTarget.lng });
      map.setZoom(16);
    }
  }, [map, focusTarget]);

  useEffect(() => {
    if (map && hasOrchardData && !hasAutoCenteredDataRef.current && isValidLatLng(initialCenter.lat, initialCenter.lng)) {
      hasAutoCenteredDataRef.current = true;
      map.setCenter(initialCenter);
    }
  }, [map, hasOrchardData, initialCenter.lat, initialCenter.lng]);

  return null;
};

const MapsApiStatusMonitor: React.FC<{
  onRetryLoad: () => void;
}> = ({ onRetryLoad }) => {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.LOADED || status === APILoadingStatus.NOT_LOADED) {
    return null;
  }

  if (status === APILoadingStatus.LOADING) {
    return (
      <div className="absolute inset-0 z-20 bg-stone-900/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 text-center gap-2 pointer-events-none">
        <Compass className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm font-bold">Cargando mapa satelital del huerto...</p>
        <p className="text-[11px] text-stone-300">Conectando con Google Maps Platform</p>
      </div>
    );
  }

  const isAuthErr = status === APILoadingStatus.AUTH_FAILURE;
  return (
    <div className="absolute inset-0 z-30 bg-stone-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 text-center gap-3">
      <AlertTriangle className="w-9 h-9 text-amber-400" />
      <div className="space-y-1 max-w-md">
        <p className="text-sm font-black">
          {isAuthErr
            ? 'Error de autenticación con Google Maps Platform'
            : 'No se pudo cargar Google Maps en este momento'}
        </p>
        <p className="text-xs text-stone-300 leading-relaxed">
          {isAuthErr
            ? 'La clave de API de Google Maps fue rechazada o restringida para este dominio. Verifica la configuración de la clave o reintenta la conexión.'
            : 'Puede deberse a conexión inestable en terreno o bloqueo temporal de red. Intenta recargar el mapa sin perder tus datos.'}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetryLoad}
        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Reintentar Carga del Mapa</span>
      </button>
    </div>
  );
};

const OrchardRadiusCircle: React.FC<{
  center: { lat: number; lng: number };
  radius: number;
  color: string;
  fillOpacity: number;
  strokeWeight: number;
  onClick?: () => void;
}> = ({ center, radius, color, fillOpacity, strokeWeight, onClick }) => {
  const map = useMap();

  useEffect(() => {
    const winGoogle = (
      window as unknown as {
        google?: {
          maps?: {
            Circle?: new (opts: Record<string, unknown>) => {
              addListener: (event: string, cb: () => void) => { remove: () => void };
              setMap: (target: unknown) => void;
            };
          };
        };
      }
    ).google;

    if (!map || !winGoogle?.maps?.Circle) return;
    const circle = new winGoogle.maps.Circle({
      map,
      center,
      radius,
      strokeColor: color,
      strokeOpacity: 0.9,
      strokeWeight,
      fillColor: color,
      fillOpacity,
      clickable: Boolean(onClick),
    });

    const listener = onClick ? circle.addListener('click', onClick) : null;
    return () => {
      if (listener) listener.remove();
      circle.setMap(null);
    };
  }, [map, center.lat, center.lng, radius, color, fillOpacity, strokeWeight, onClick]);

  return null;
};

const OrchardPolygonOverlay: React.FC<{
  paths: { lat: number; lng: number }[];
  color: string;
  fillOpacity: number;
  strokeWeight: number;
  onClick?: () => void;
}> = ({ paths, color, fillOpacity, strokeWeight, onClick }) => {
  const map = useMap();

  useEffect(() => {
    const winGoogle = (
      window as unknown as {
        google?: {
          maps?: {
            Polygon?: new (opts: Record<string, unknown>) => {
              addListener: (event: string, cb: () => void) => { remove: () => void };
              setMap: (target: unknown) => void;
            };
          };
        };
      }
    ).google;

    if (!map || !winGoogle?.maps?.Polygon || paths.length < 3) return;

    const polygon = new winGoogle.maps.Polygon({
      map,
      paths,
      strokeColor: color,
      strokeOpacity: 0.95,
      strokeWeight,
      fillColor: color,
      fillOpacity,
      clickable: Boolean(onClick),
    });

    const listener = onClick ? polygon.addListener('click', onClick) : null;
    return () => {
      if (listener) listener.remove();
      polygon.setMap(null);
    };
  }, [map, paths, color, fillOpacity, strokeWeight, onClick]);

  return null;
};

interface GoogleMvcPath {
  getLength: () => number;
  getAt: (i: number) => { lat: () => number; lng: () => number };
  removeAt: (i: number) => void;
  addListener: (event: string, cb: () => void) => { remove: () => void };
}

const EditableDraftPolygon: React.FC<{
  points: { lat: number; lng: number }[];
  color: string;
  onChangePoints: (pts: { lat: number; lng: number }[]) => void;
}> = ({ points, color, onChangePoints }) => {
  const map = useMap();
  const onChangeRef = React.useRef(onChangePoints);
  onChangeRef.current = onChangePoints;

  const polygonRef = React.useRef<{
    setPath: (p: { lat: number; lng: number }[]) => void;
    getPath: () => GoogleMvcPath | undefined | null;
    setMap: (m: unknown) => void;
    setOptions: (opts: Record<string, unknown>) => void;
    addListener: (
      event: string,
      cb: (ev: { vertex?: number }) => void
    ) => { remove: () => void };
  } | null>(null);
  const polylineRef = React.useRef<{
    setPath: (p: { lat: number; lng: number }[]) => void;
    setMap: (m: unknown) => void;
    setOptions?: (opts: Record<string, unknown>) => void;
  } | null>(null);
  const internalEditRef = React.useRef(false);
  const programmaticUpdateRef = React.useRef(false);
  const bindPathListenersRef = React.useRef<() => void>(() => {});
  const pathKey = JSON.stringify(points);

  useEffect(() => {
    const winGoogle = (
      window as unknown as {
        google?: {
          maps?: {
            Polygon?: new (opts: Record<string, unknown>) => {
              setPath: (p: { lat: number; lng: number }[]) => void;
              getPath: () => GoogleMvcPath | undefined | null;
              setMap: (m: unknown) => void;
              setOptions: (opts: Record<string, unknown>) => void;
              addListener: (
                event: string,
                cb: (ev: { vertex?: number }) => void
              ) => { remove: () => void };
            };
            Polyline?: new (opts: Record<string, unknown>) => {
              setPath: (p: { lat: number; lng: number }[]) => void;
              setMap: (m: unknown) => void;
              setOptions?: (opts: Record<string, unknown>) => void;
            };
          };
        };
      }
    ).google;

    if (!map || !winGoogle?.maps?.Polygon || !winGoogle?.maps?.Polyline) return;

    const poly = new winGoogle.maps.Polygon({
      map: points.length >= 3 ? map : null,
      paths: points.length >= 3 ? points : [],
      strokeColor: color,
      strokeOpacity: 1,
      strokeWeight: 2.5,
      fillColor: color,
      fillOpacity: 0.35,
      editable: true,
      draggable: false,
      clickable: true,
      zIndex: 40,
    });

    const line = new winGoogle.maps.Polyline({
      map: points.length > 0 && points.length < 3 ? map : null,
      path: points.length > 0 && points.length < 3 ? points : [],
      strokeColor: color,
      strokeOpacity: 0.95,
      strokeWeight: 3,
      zIndex: 40,
    });

    polygonRef.current = poly;
    polylineRef.current = line;

    const syncFromMvc = () => {
      if (programmaticUpdateRef.current) return;
      const mvcPath = poly.getPath();
      if (!mvcPath) return;
      const next: { lat: number; lng: number }[] = [];
      for (let i = 0; i < mvcPath.getLength(); i++) {
        const pt = mvcPath.getAt(i);
        next.push({
          lat: Number(pt.lat().toFixed(6)),
          lng: Number(pt.lng().toFixed(6)),
        });
      }
      internalEditRef.current = true;
      onChangeRef.current(next);
    };

    let pathListeners: { remove: () => void }[] = [];
    const bindPathListeners = () => {
      pathListeners.forEach((l) => l.remove());
      pathListeners = [];
      const mvcPath = poly.getPath();
      if (!mvcPath || typeof mvcPath.addListener !== 'function') return;
      pathListeners = [
        mvcPath.addListener('set_at', syncFromMvc),
        mvcPath.addListener('insert_at', syncFromMvc),
        mvcPath.addListener('remove_at', syncFromMvc),
      ];
    };
    bindPathListenersRef.current = bindPathListeners;
    if (points.length >= 3) {
      bindPathListeners();
    }

    const rightClickListener = poly.addListener('rightclick', (ev) => {
      if (typeof ev.vertex === 'number') {
        const mvcPath = poly.getPath();
        if (mvcPath && mvcPath.getLength() > 0) {
          mvcPath.removeAt(ev.vertex);
        }
      }
    });

    return () => {
      rightClickListener.remove();
      pathListeners.forEach((l) => l.remove());
      pathListeners = [];
      bindPathListenersRef.current = () => {};
      poly.setMap(null);
      line.setMap(null);
      polygonRef.current = null;
      polylineRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const poly = polygonRef.current;
    const line = polylineRef.current;
    if (!poly || !line || !map) return;

    poly.setOptions({ strokeColor: color, fillColor: color });
    line.setOptions?.({ strokeColor: color });

    if (internalEditRef.current) {
      internalEditRef.current = false;
      if (points.length >= 3) {
        return;
      }
    }

    if (points.length >= 3) {
      programmaticUpdateRef.current = true;
      line.setMap(null);
      poly.setMap(map);
      poly.setPath(points);
      bindPathListenersRef.current();
      programmaticUpdateRef.current = false;
    } else if (points.length > 0) {
      poly.setMap(null);
      line.setMap(map);
      line.setPath(points);
    } else {
      poly.setMap(null);
      line.setMap(null);
    }
  }, [map, color, pathKey]);

  return (
    <>
      {points.length < 3 &&
        points.map((pt, idx) => (
          <AdvancedMarker key={`draft-pt-${idx}`} position={pt} title={`Vértice ${idx + 1}`}>
            <div
              style={{ backgroundColor: color }}
              className="w-5 h-5 rounded-full text-white font-black text-[10px] border-2 border-white shadow-md flex items-center justify-center"
            >
              {idx + 1}
            </div>
          </AdvancedMarker>
        ))}
    </>
  );
};

const CuartelAdvancedMarker: React.FC<{
  parcela: Parcela;
  isSelected: boolean;
  onSelect: () => void;
  onCloseInfo: () => void;
  onStartEditPolygon: (parcela: Parcela) => void;
  showInfo: boolean;
  canEdit?: boolean;
}> = ({ parcela, isSelected, onSelect, onCloseInfo, onStartEditPolygon, showInfo, canEdit = true }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const validPolyPoints = Array.isArray(parcela.coordenadasPoligono)
    ? parcela.coordenadasPoligono.filter((pt) => isValidLatLng(pt?.lat, pt?.lng))
    : [];
  const hasPolygon = validPolyPoints.length >= 3;
  const polygonCenter = hasPolygon ? calcularCentroidePoligono(validPolyPoints) : null;
  const fallbackPos = isValidLatLng(parcela.lat, parcela.lng)
    ? { lat: Number(parcela.lat), lng: Number(parcela.lng) }
    : null;
  const markerPos = polygonCenter || fallbackPos;
  if (!markerPos || !isValidLatLng(markerPos.lat, markerPos.lng)) {
    return null;
  }
  const areaPoligonoHa = hasPolygon
    ? calcularAreaPoligonoM2(validPolyPoints) / 10000
    : 0;
  const radioM = calcularRadioMetros(parcela.superficieHa || 1);
  const sectoresText =
    parcela.sectoresRiego && parcela.sectoresRiego.length > 0
      ? parcela.sectoresRiego.map((s) => `Sector ${s}`).join(', ')
      : `Sector ${parcela.sectorRiegoNumero || 1}`;

  return (
    <>
      {hasPolygon ? (
        <OrchardPolygonOverlay
          paths={validPolyPoints}
          color={parcela.colorHex || '#059669'}
          fillOpacity={isSelected ? 0.42 : 0.26}
          strokeWeight={isSelected ? 3 : 2}
          onClick={onSelect}
        />
      ) : (
        <OrchardRadiusCircle
          center={markerPos}
          radius={radioM}
          color={parcela.colorHex || '#059669'}
          fillOpacity={isSelected ? 0.42 : 0.24}
          strokeWeight={isSelected ? 3 : 1.8}
          onClick={onSelect}
        />
      )}
      <AdvancedMarker
        ref={markerRef}
        position={markerPos}
        onClick={onSelect}
        title={`${parcela.codigoCuartel} · ${parcela.nombre}`}
      >
        <div
          style={{ backgroundColor: parcela.colorHex || '#059669' }}
          className="px-2 py-0.5 rounded-full text-white font-black text-[11px] shadow-md border-2 border-white whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
        >
          <span>🥝</span>
          <span>{parcela.codigoCuartel || parcela.nombre}</span>
        </div>
      </AdvancedMarker>

      {showInfo && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo} maxWidth={280}>
          <div className="text-xs text-stone-800 space-y-1.5 p-0.5">
            <div className="font-black text-sm text-emerald-950">
              🥝 {parcela.codigoCuartel} · {parcela.nombre}
            </div>
            <div>
              <strong>Superficie:</strong> {parcela.superficieHa} ha (
              {(parcela.superficieHa * 10000).toLocaleString('es-CL')} m²)
            </div>
            <div>
              <strong>Geometría:</strong>{' '}
              {hasPolygon ? (
                <span className="text-emerald-800 font-bold">
                  Polígono ({parcela.coordenadasPoligono.length} vértices · {areaPoligonoHa.toFixed(2)} ha)
                </span>
              ) : (
                <span>Círculo aprox. (radio {radioM.toFixed(1)} m)</span>
              )}
            </div>
            <div>
              <strong>Sectores Riego:</strong>{' '}
              <span className="text-blue-800 font-bold">{sectoresText}</span>
            </div>
            <div>
              <strong>Variedad:</strong> {parcela.variedad}
            </div>
            <div>
              <strong>Estado:</strong> {parcela.estadoActual}
            </div>
            <div className="pt-1.5 border-t border-stone-200 flex items-center justify-between gap-2">
              <span className="text-[10px] text-stone-500">
                📍 {markerPos.lat.toFixed(5)}, {markerPos.lng.toFixed(5)}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onStartEditPolygon(parcela)}
                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-[10px] font-bold cursor-pointer"
                >
                  ✏️ {hasPolygon ? 'Editar Polígono' : 'Trazar Polígono'}
                </button>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const LugarAdvancedMarker: React.FC<{
  lugar: LugarPredio;
  catInfo: { tipo: string; label: string; emoji: string; color: string };
  showInfo: boolean;
  onSelect: () => void;
  onCloseInfo: () => void;
}> = ({ lugar, catInfo, showInfo, onSelect, onCloseInfo }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  if (!isValidLatLng(lugar.lat, lugar.lng)) return null;
  const color = lugar.colorHex || catInfo.color;

  return (
    <>
      {lugar.superficieHa && lugar.superficieHa > 0 ? (
        <OrchardRadiusCircle
          center={{ lat: lugar.lat, lng: lugar.lng }}
          radius={calcularRadioMetros(lugar.superficieHa)}
          color={color}
          fillOpacity={0.28}
          strokeWeight={2}
          onClick={onSelect}
        />
      ) : null}
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: lugar.lat, lng: lugar.lng }}
        onClick={onSelect}
        title={lugar.nombre}
      >
        <div
          style={{ backgroundColor: color }}
          className="px-2 py-0.5 rounded-full text-white font-bold text-[11px] shadow-md border-2 border-white whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
        >
          <span>{catInfo.emoji}</span>
          <span>{lugar.nombre}</span>
        </div>
      </AdvancedMarker>

      {showInfo && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo} maxWidth={250}>
          <div className="text-xs text-stone-800 space-y-1 p-0.5">
            <div className="font-black text-sm" style={{ color }}>
              {catInfo.emoji} {lugar.nombre}
            </div>
            <div className="font-bold text-[11px] text-stone-500">{catInfo.label}</div>
            {lugar.superficieHa ? (
              <div>
                <strong>Superficie:</strong> {lugar.superficieHa} ha (
                {(lugar.superficieHa * 10000).toLocaleString('es-CL')} m²)
              </div>
            ) : null}
            <div className="text-stone-600">{lugar.descripcion || 'Sin descripción'}</div>
            <div className="text-[10px] text-stone-400 pt-1">
              📍 {lugar.lat.toFixed(5)}, {lugar.lng.toFixed(5)}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const ParcelasView: React.FC<ParcelasViewProps> = ({
  parcelas,
  lugares,
  mapsApiKey,
  mapsKeyLoading = false,
  mapsKeyError = null,
  onRetryMapsKey,
  defaultCenter,
  onAddParcela,
  onUpdateParcela,
  onDeleteParcela,
  onAddLugar,
  onUpdateLugar,
  onDeleteLugar,
  onRegisterLaborForParcela,
  canEdit = true
}) => {
  const orchardOrigin =
    defaultCenter && isValidLatLng(defaultCenter.lat, defaultCenter.lng)
      ? defaultCenter
      : { lat: -39.628593, lng: -72.461085 };
  const [mapProviderKey, setMapProviderKey] = useState(0);
  const [selectedParcelaId, setSelectedParcelaId] = useState<string>(parcelas[0]?.id || '');
  const [activeInfoId, setActiveInfoId] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('google_hibrido');
  const [filtroCapa, setFiltroCapa] = useState<'todos' | 'cuarteles' | 'barbecho' | 'infraestructura' | 'riego'>('todos');
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number; ts: number } | null>(null);

  // Coordenadas del último clic en el mapa
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Modo interactivo de dibujo / edición de polígonos irregulares en el mapa
  const [polygonEditorMode, setPolygonEditorMode] = useState<{
    kind: 'new' | 'edit' | 'modal_edit';
    parcelaId?: string;
    colorHex: string;
    nombreLabel: string;
  } | null>(null);
  const [draftPolygonPoints, setDraftPolygonPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [syncAreaWithPolygon, setSyncAreaWithPolygon] = useState<boolean>(true);

  // Sectores de riego disponibles
  const [sectoresDisponibles, setSectoresDisponibles] = useState<SectorRiego[]>(() => {
    try {
      const saved = localStorage.getItem('fundo_sectores_riego');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error leyendo sectores:', e);
    }
    return initialSectoresRiego;
  });

  useEffect(() => {
    const handleSectoresUpdate = () => {
      try {
        const saved = localStorage.getItem('fundo_sectores_riego');
        if (saved) setSectoresDisponibles(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('fundo_sectores_updated', handleSectoresUpdate);
    return () => window.removeEventListener('fundo_sectores_updated', handleSectoresUpdate);
  }, []);
  
  // Modales
  const [isAddParcelaOpen, setIsAddParcelaOpen] = useState(false);
  const [isEditParcelaOpen, setIsEditParcelaOpen] = useState(false);
  const [isAddLugarOpen, setIsAddLugarOpen] = useState(false);
  const [isEditLugarOpen, setIsEditLugarOpen] = useState(false);
  const [editingLugar, setEditingLugar] = useState<LugarPredio | null>(null);
  const [cuartelToDelete, setCuartelToDelete] = useState<Parcela | null>(null);
  const [lugarToDelete, setLugarToDelete] = useState<LugarPredio | null>(null);

  // Cuartel actualmente seleccionado
  const selectedParcela = parcelas.find((p) => p.id === selectedParcelaId) || parcelas[0] || null;

  // Formulario Cuartel
  const [parcelaForm, setParcelaForm] = useState<{
    nombre: string;
    codigoCuartel: string;
    sectorRiegoNumero: 1 | 2 | 3 | 4;
    sectoresRiego: (number | string)[];
    superficieHa: number;
    variedad: string;
    patronPortainjerto: string;
    polinizador: string;
    sistemaConduccion: 'Parrón Español' | 'Espaldera en T' | 'T-Bar Pergola';
    marcoPlantacion: string;
    plantasPorHa: number;
    totalPlantasCalculado: number;
    anioPlantacion: number;
    estadoFenologico: string;
    estadoActual: 'Normal' | 'En Carencia SAG' | 'Listo para Cosecha' | 'En Riego';
    lmrActivo: string;
    diasCarenciaRestantes: number;
    rendimientoEstimadoTonHa: number;
    colorHex: string;
    lat: number;
    lng: number;
    coordenadasPoligono: { lat: number; lng: number }[];
  }>({
    nombre: '',
    codigoCuartel: '',
    sectorRiegoNumero: 1,
    sectoresRiego: [1],
    superficieHa: 5.0,
    variedad: 'Kiwi Hayward',
    patronPortainjerto: 'Franco / Semilla Hayward',
    polinizador: 'Tomuri / Chieftain (1:8)',
    sistemaConduccion: 'Parrón Español',
    marcoPlantacion: '4.5m x 4.0m',
    plantasPorHa: 555,
    totalPlantasCalculado: 2775,
    anioPlantacion: 2018,
    estadoFenologico: 'Maduración y acumulación azúcares',
    estadoActual: 'Normal',
    lmrActivo: '',
    diasCarenciaRestantes: 0,
    rendimientoEstimadoTonHa: 40.0,
    colorHex: '#059669',
    lat: orchardOrigin.lat,
    lng: orchardOrigin.lng,
    coordenadasPoligono: []
  });

  // Formulario Lugar / Punto Importante
  const [lugarForm, setLugarForm] = useState<LugarPredio>({
    id: '',
    nombre: '',
    tipo: 'barbecho',
    descripcion: '',
    lat: orchardOrigin.lat,
    lng: orchardOrigin.lng,
    superficieHa: 0,
    colorHex: '#d97706'
  });

  const totalHa = parcelas.reduce((acc, p) => acc + (p.superficieHa || 0), 0);

  const conCoords = parcelas.filter(
    (p) =>
      isValidLatLng(p.lat, p.lng) ||
      (Array.isArray(p.coordenadasPoligono) &&
        p.coordenadasPoligono.filter((pt) => isValidLatLng(pt?.lat, pt?.lng)).length >= 3)
  );
  const lugCoords = lugares.filter((l) => isValidLatLng(l.lat, l.lng));
  const selectedCenter =
    selectedParcela && isValidLatLng(selectedParcela.lat, selectedParcela.lng)
      ? { lat: Number(selectedParcela.lat), lng: Number(selectedParcela.lng) }
      : selectedParcela && Array.isArray(selectedParcela.coordenadasPoligono)
      ? calcularCentroidePoligono(selectedParcela.coordenadasPoligono)
      : null;
  const firstParcelaCenter = conCoords[0]
    ? isValidLatLng(conCoords[0].lat, conCoords[0].lng)
      ? { lat: Number(conCoords[0].lat), lng: Number(conCoords[0].lng) }
      : calcularCentroidePoligono(conCoords[0].coordenadasPoligono)
    : null;
  const firstLugarCenter = lugCoords[0]
    ? { lat: Number(lugCoords[0].lat), lng: Number(lugCoords[0].lng) }
    : null;
  const initialMapCenter = selectedCenter || firstParcelaCenter || firstLugarCenter || orchardOrigin;
  const hasOrchardData = conCoords.length > 0 || lugCoords.length > 0;

  const draftAreaM2 = calcularAreaPoligonoM2(draftPolygonPoints);
  const draftAreaHa = Number((draftAreaM2 / 10000).toFixed(2));

  const handleMapClick = useCallback(
    (ev: MapMouseEvent) => {
      if (!canEdit) return;
      const latLng = ev.detail?.latLng;
      if (!latLng) return;
      const point = {
        lat: Number(latLng.lat.toFixed(6)),
        lng: Number(latLng.lng.toFixed(6)),
      };

      if (polygonEditorMode) {
        setDraftPolygonPoints((prev) => [...prev, point]);
        return;
      }

      setClickedCoords({
        lat: Number(latLng.lat.toFixed(5)),
        lng: Number(latLng.lng.toFixed(5)),
      });
    },
    [canEdit, polygonEditorMode]
  );

  // Centrar mapa en una coordenada
  const centrarMapa = (lat: number, lng: number) => {
    setFocusTarget({ lat, lng, ts: Date.now() });
  };

  // Iniciar Trazado de Nuevo Cuartel (Polígono Libre)
  const handleStartNewPolygon = (initialPoint?: { lat: number; lng: number }) => {
    const nextNum = parcelas.length + 1;
    const color = COLORES_PRESET[(nextNum - 1) % COLORES_PRESET.length];
    setActiveInfoId(null);
    setClickedCoords(null);
    setSyncAreaWithPolygon(true);
    setDraftPolygonPoints(initialPoint ? [initialPoint] : []);
    setPolygonEditorMode({
      kind: 'new',
      colorHex: color,
      nombreLabel: `Nuevo Cuartel ${nextNum}`,
    });
  };

  // Iniciar Edición del Polígono de un Cuartel Existente
  const handleStartEditPolygonForParcela = (cuartel: Parcela) => {
    setIsEditParcelaOpen(false);
    setIsAddParcelaOpen(false);
    setActiveInfoId(null);
    setClickedCoords(null);
    setSelectedParcelaId(cuartel.id);
    setSyncAreaWithPolygon(true);

    const existingPoly =
      Array.isArray(cuartel.coordenadasPoligono) && cuartel.coordenadasPoligono.length >= 3
        ? cuartel.coordenadasPoligono
        : [];
    setDraftPolygonPoints(existingPoly);
    setPolygonEditorMode({
      kind: 'edit',
      parcelaId: cuartel.id,
      colorHex: cuartel.colorHex || '#059669',
      nombreLabel: `${cuartel.codigoCuartel} · ${cuartel.nombre}`,
    });

    const center =
      (existingPoly.length >= 3 ? calcularCentroidePoligono(existingPoly) : null) ||
      (typeof cuartel.lat === 'number' && typeof cuartel.lng === 'number'
        ? { lat: cuartel.lat, lng: cuartel.lng }
        : null);
    if (center) {
      centrarMapa(center.lat, center.lng);
    }
  };

  // Convertir el círculo actual en un polígono octogonal editable para deformarlo sobre el terreno
  const handleConvertCircleToDraftPolygon = () => {
    if (!polygonEditorMode) return;
    if (polygonEditorMode.kind === 'edit' && polygonEditorMode.parcelaId) {
      const target = parcelas.find((p) => p.id === polygonEditorMode.parcelaId);
      if (target) {
        const lat = target.lat ?? orchardOrigin.lat;
        const lng = target.lng ?? orchardOrigin.lng;
        setDraftPolygonPoints(generarPoligonoDesdeCirculo(lat, lng, target.superficieHa || 2));
        return;
      }
    }
    setDraftPolygonPoints(
      generarPoligonoDesdeCirculo(
        parcelaForm.lat || orchardOrigin.lat,
        parcelaForm.lng || orchardOrigin.lng,
        parcelaForm.superficieHa || 2
      )
    );
  };

  // Guardar Polígono Trazado o Editado
  const handleConfirmPolygonEditor = () => {
    if (!polygonEditorMode || draftPolygonPoints.length < 3) return;
    const centroid = calcularCentroidePoligono(draftPolygonPoints) || orchardOrigin;
    const measuredHa = Number((calcularAreaPoligonoM2(draftPolygonPoints) / 10000).toFixed(2));

    if (polygonEditorMode.kind === 'new') {
      const nextNum = parcelas.length + 1;
      const defaultSector = nextNum % 4 || 4;
      setParcelaForm({
        nombre: `Cuartel ${nextNum}`,
        codigoCuartel: `C${nextNum}`,
        sectorRiegoNumero: defaultSector as any,
        sectoresRiego: [defaultSector],
        superficieHa: measuredHa > 0 ? measuredHa : 1.0,
        variedad: 'Kiwi Hayward',
        patronPortainjerto: 'Franco / Semilla Hayward',
        polinizador: 'Tomuri / Chieftain (1:8)',
        sistemaConduccion: 'Parrón Español',
        marcoPlantacion: '4.5m x 4.0m',
        plantasPorHa: 555,
        totalPlantasCalculado: Math.round((measuredHa > 0 ? measuredHa : 1.0) * 555),
        anioPlantacion: 2020,
        estadoFenologico: 'Maduración y acumulación azúcares',
        estadoActual: 'Normal',
        lmrActivo: '',
        diasCarenciaRestantes: 0,
        rendimientoEstimadoTonHa: 38.0,
        colorHex: polygonEditorMode.colorHex,
        lat: centroid.lat,
        lng: centroid.lng,
        coordenadasPoligono: draftPolygonPoints,
      });
      setPolygonEditorMode(null);
      setDraftPolygonPoints([]);
      setIsAddParcelaOpen(true);
      return;
    }

    if (polygonEditorMode.kind === 'edit' && polygonEditorMode.parcelaId) {
      const target = parcelas.find((p) => p.id === polygonEditorMode.parcelaId);
      if (target) {
        onUpdateParcela({
          ...target,
          coordenadasPoligono: draftPolygonPoints,
          lat: centroid.lat,
          lng: centroid.lng,
          superficieHa: syncAreaWithPolygon && measuredHa > 0 ? measuredHa : target.superficieHa,
        });
      }
      setPolygonEditorMode(null);
      setDraftPolygonPoints([]);
      return;
    }
  };

  const handleCancelPolygonEditor = () => {
    setPolygonEditorMode(null);
    setDraftPolygonPoints([]);
  };

  // Abrir Modal para Crear Cuartel
  const handleOpenAddParcela = (presetCoords?: { lat: number; lng: number }) => {
    const nextNum = parcelas.length + 1;
    const defaultSector = ((nextNum % 4) || 4);
    setParcelaForm({
      nombre: `Cuartel ${nextNum}`,
      codigoCuartel: `C${nextNum}`,
      sectorRiegoNumero: defaultSector as any,
      sectoresRiego: [defaultSector],
      superficieHa: 5.0,
      variedad: 'Kiwi Hayward',
      patronPortainjerto: 'Franco / Semilla Hayward',
      polinizador: 'Tomuri / Chieftain (1:8)',
      sistemaConduccion: 'Parrón Español',
      marcoPlantacion: '4.5m x 4.0m',
      plantasPorHa: 555,
      totalPlantasCalculado: Math.round(5.0 * 555),
      anioPlantacion: 2020,
      estadoFenologico: 'Maduración y acumulación azúcares',
      estadoActual: 'Normal',
      lmrActivo: '',
      diasCarenciaRestantes: 0,
      rendimientoEstimadoTonHa: 38.0,
      colorHex: COLORES_PRESET[(nextNum - 1) % COLORES_PRESET.length],
      lat: presetCoords?.lat ?? orchardOrigin.lat,
      lng: presetCoords?.lng ?? orchardOrigin.lng,
      coordenadasPoligono: []
    });
    setIsAddParcelaOpen(true);
  };

  // Abrir Modal para Editar Cuartel
  const handleOpenEditParcela = (cuartel: Parcela) => {
    const secs = (cuartel.sectoresRiego && cuartel.sectoresRiego.length > 0)
      ? cuartel.sectoresRiego
      : [cuartel.sectorRiegoNumero || 1];

    setParcelaForm({
      nombre: cuartel.nombre,
      codigoCuartel: cuartel.codigoCuartel || '',
      sectorRiegoNumero: (cuartel.sectorRiegoNumero || 1) as any,
      sectoresRiego: secs,
      superficieHa: cuartel.superficieHa || 0,
      variedad: cuartel.variedad || 'Kiwi Hayward',
      patronPortainjerto: cuartel.patronPortainjerto || '',
      polinizador: cuartel.polinizador || '',
      sistemaConduccion: (cuartel.sistemaConduccion as any) || 'Parrón Español',
      marcoPlantacion: cuartel.marcoPlantacion || '4.5m x 4.0m',
      plantasPorHa: cuartel.plantasPorHa || 555,
      totalPlantasCalculado: Math.round((cuartel.superficieHa || 0) * (cuartel.plantasPorHa || 555)),
      anioPlantacion: cuartel.anioPlantacion || 2018,
      estadoFenologico: cuartel.estadoFenologico || 'Maduración',
      estadoActual: cuartel.estadoActual || 'Normal',
      lmrActivo: cuartel.lmrActivo || '',
      diasCarenciaRestantes: cuartel.diasCarenciaRestantes || 0,
      rendimientoEstimadoTonHa: cuartel.rendimientoEstimadoTonHa || 35.0,
      colorHex: cuartel.colorHex || '#059669',
      lat: cuartel.lat ?? orchardOrigin.lat,
      lng: cuartel.lng ?? orchardOrigin.lng,
      coordenadasPoligono: Array.isArray(cuartel.coordenadasPoligono) ? cuartel.coordenadasPoligono : []
    });
    setIsEditParcelaOpen(true);
  };

  // Abrir Modal para Crear Lugar / Punto Importante
  const handleOpenAddLugar = (presetCoords?: { lat: number; lng: number }) => {
    setEditingLugar(null);
    setLugarForm({
      id: `lug-${Date.now()}`,
      nombre: '',
      tipo: 'barbecho',
      descripcion: '',
      lat: presetCoords?.lat ?? (selectedParcela?.lat || orchardOrigin.lat),
      lng: presetCoords?.lng ?? (selectedParcela?.lng || orchardOrigin.lng),
      superficieHa: 0,
      colorHex: '#d97706'
    });
    setIsAddLugarOpen(true);
  };

  // Abrir Modal para Editar Lugar
  const handleOpenEditLugar = (lugar: LugarPredio) => {
    setEditingLugar(lugar);
    setLugarForm({ ...lugar });
    setIsEditLugarOpen(true);
  };

  // Guardar Nuevo / Editar Lugar
  const handleSaveLugar = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLugar && onUpdateLugar) {
      onUpdateLugar(lugarForm);
    } else {
      onAddLugar(lugarForm);
    }
    setIsAddLugarOpen(false);
    setIsEditLugarOpen(false);
    setEditingLugar(null);
    setClickedCoords(null);
  };

  // Guardar Nuevo Cuartel
  const handleSaveAddParcela = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `cuartel-${Date.now()}`;
    const newParcela: Parcela = {
      id,
      nombre: parcelaForm.nombre,
      codigoCuartel: parcelaForm.codigoCuartel,
      sectorRiegoNumero: parcelaForm.sectorRiegoNumero,
      sectoresRiego: parcelaForm.sectoresRiego,
      superficieHa: parcelaForm.superficieHa,
      variedad: parcelaForm.variedad,
      patronPortainjerto: parcelaForm.patronPortainjerto,
      polinizador: parcelaForm.polinizador,
      sistemaConduccion: parcelaForm.sistemaConduccion,
      marcoPlantacion: parcelaForm.marcoPlantacion,
      plantasPorHa: parcelaForm.plantasPorHa,
      anioPlantacion: parcelaForm.anioPlantacion,
      estadoFenologico: parcelaForm.estadoFenologico,
      estadoActual: parcelaForm.estadoActual,
      lmrActivo: parcelaForm.lmrActivo,
      diasCarenciaRestantes: parcelaForm.diasCarenciaRestantes,
      rendimientoEstimadoTonHa: parcelaForm.rendimientoEstimadoTonHa,
      colorHex: parcelaForm.colorHex,
      lat: parcelaForm.lat,
      lng: parcelaForm.lng,
      coordenadasPoligono: parcelaForm.coordenadasPoligono || []
    };
    onAddParcela(newParcela);
    setSelectedParcelaId(id);
    setIsAddParcelaOpen(false);
    setClickedCoords(null);
  };

  // Guardar Cuartel Editado
  const handleSaveEditParcela = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcela) return;
    const updatedParcela: Parcela = {
      ...selectedParcela,
      nombre: parcelaForm.nombre,
      codigoCuartel: parcelaForm.codigoCuartel,
      sectorRiegoNumero: parcelaForm.sectorRiegoNumero,
      sectoresRiego: parcelaForm.sectoresRiego,
      superficieHa: parcelaForm.superficieHa,
      variedad: parcelaForm.variedad,
      patronPortainjerto: parcelaForm.patronPortainjerto,
      polinizador: parcelaForm.polinizador,
      sistemaConduccion: parcelaForm.sistemaConduccion,
      marcoPlantacion: parcelaForm.marcoPlantacion,
      plantasPorHa: parcelaForm.plantasPorHa,
      anioPlantacion: parcelaForm.anioPlantacion,
      estadoFenologico: parcelaForm.estadoFenologico,
      estadoActual: parcelaForm.estadoActual,
      lmrActivo: parcelaForm.lmrActivo,
      diasCarenciaRestantes: parcelaForm.diasCarenciaRestantes,
      rendimientoEstimadoTonHa: parcelaForm.rendimientoEstimadoTonHa,
      colorHex: parcelaForm.colorHex,
      lat: parcelaForm.lat,
      lng: parcelaForm.lng,
      coordenadasPoligono: parcelaForm.coordenadasPoligono || selectedParcela.coordenadasPoligono || []
    };
    onUpdateParcela(updatedParcela);
    setIsEditParcelaOpen(false);
  };

  const handleToggleSectorRiego = (sectorId: number | string) => {
    setParcelaForm((prev) => {
      const exists = prev.sectoresRiego.some((s) => String(s) === String(sectorId));
      let updated: (number | string)[];
      if (exists) {
        if (prev.sectoresRiego.length <= 1) return prev;
        updated = prev.sectoresRiego.filter((s) => String(s) !== String(sectorId));
      } else {
        updated = [...prev.sectoresRiego, sectorId];
      }
      return {
        ...prev,
        sectoresRiego: updated,
        sectorRiegoNumero: (typeof updated[0] === 'number' ? updated[0] : parseInt(String(updated[0])) || 1) as any
      };
    });
  };

  const handleUsarGpsEnForm = (esLugar = false) => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        if (esLugar) {
          setLugarForm(prev => ({ ...prev, lat, lng }));
        } else {
          setParcelaForm(prev => ({ ...prev, lat, lng }));
        }
      },
      (err) => alert('Error obteniendo GPS: ' + err.message)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Compass className="w-3 h-3 text-emerald-700" />
            Catastro Predial & Mapa Satelital
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Mapa del Huerto &amp; Cuarteles de Kiwi
          </h1>
          <p className="text-xs text-stone-500">
            Vista satelital Google Maps con trazado dinámico de polígonos irregulares por contorno real del terreno, marcadores e infraestructura.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleStartNewPolygon()}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Trazar Polígono de Cuartel</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddLugar()}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>+ Agregar Punto</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddParcela()}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Cuartel Rápido</span>
            </button>
          </div>
        )}
      </div>

      {/* CONTENEDOR DEL MAPA SATELITAL INTERACTIVO */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {/* Barra de Controles y Selector de Capas */}
        <div className="p-3 bg-stone-900 text-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 text-xs">
          {/* Selector de Capa de Mapa */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-stone-300" />
              Capa de Mapa:
            </span>
            <div className="inline-flex rounded-lg bg-stone-800 p-0.5 border border-stone-700">
              <button
                type="button"
                onClick={() => setMapLayer('google_hibrido')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  mapLayer === 'google_hibrido'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                🛰️ Google Híbrido
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('google_satelite')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  mapLayer === 'google_satelite'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                🌍 Google Satélite
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('google_calles')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  mapLayer === 'google_calles'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                🗺️ Google Calles
              </button>
              <button
                type="button"
                onClick={() => setMapLayer('google_terreno')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  mapLayer === 'google_terreno'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                ⛰️ Relieve
              </button>
            </div>
          </div>

          {/* Filtros de Capas Visibles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">Ver:</span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'cuarteles', label: `🥝 Cuarteles (${parcelas.length})` },
              { id: 'barbecho', label: `🌾 Barbechos` },
              { id: 'infraestructura', label: `🏢 Bodegas & Oficinas` },
              { id: 'riego', label: `💧 Riego & Pozo` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltroCapa(f.id as any)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                  filtroCapa === f.id
                    ? 'bg-emerald-700 text-white border-emerald-600'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visualizador del Mapa Oficial Google Maps Platform */}
        <div className="relative w-full h-[520px] bg-stone-900">
          {mapsApiKey ? (
            <APIProvider
              key={`gmp-${mapProviderKey}-${mapsApiKey.slice(-6)}`}
              apiKey={mapsApiKey}
              libraries={['marker', 'geometry', 'places']}
              language="es"
              region="CL"
            >
              <MapsApiStatusMonitor
                onRetryLoad={() => {
                  setMapProviderKey((prev) => prev + 1);
                  onRetryMapsKey?.();
                }}
              />
              <GoogleMap
                mapId="DEMO_MAP_ID"
                mapTypeId={GOOGLE_MAP_TYPE_ID[mapLayer]}
                defaultCenter={initialMapCenter}
                defaultZoom={15}
                gestureHandling="greedy"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '520px' }}
                onClick={handleMapClick}
              >
                <MapCameraController
                  focusTarget={focusTarget}
                  initialCenter={initialMapCenter}
                  hasOrchardData={hasOrchardData}
                />

                {/* 1. Cuarteles de Kiwi (oculta el que se está editando en borrador) */}
                {(filtroCapa === 'todos' || filtroCapa === 'cuarteles') &&
                  conCoords
                    .filter((p) => !(polygonEditorMode?.kind === 'edit' && polygonEditorMode.parcelaId === p.id))
                    .map((p) => (
                      <CuartelAdvancedMarker
                        key={p.id}
                        parcela={p}
                        isSelected={selectedParcelaId === p.id}
                        showInfo={activeInfoId === p.id}
                        canEdit={canEdit}
                        onSelect={() => {
                          if (polygonEditorMode) return;
                          setSelectedParcelaId(p.id);
                          setActiveInfoId(p.id);
                        }}
                        onCloseInfo={() => setActiveInfoId(null)}
                        onStartEditPolygon={handleStartEditPolygonForParcela}
                      />
                    ))}

                {/* 1b. Polígono editable en borrador */}
                {polygonEditorMode && (
                  <EditableDraftPolygon
                    points={draftPolygonPoints}
                    color={polygonEditorMode.colorHex}
                    onChangePoints={setDraftPolygonPoints}
                  />
                )}

                {/* 2. Puntos Importantes del Predio */}
                {lugCoords
                  .filter((lug) => {
                    if (filtroCapa === 'cuarteles') return false;
                    if (filtroCapa === 'barbecho') return lug.tipo === 'barbecho';
                    if (filtroCapa === 'infraestructura') {
                      return ['bodega', 'oficina', 'casa_patronal', 'comedor', 'punto_limpio', 'taller_maquinaria', 'porton'].includes(lug.tipo);
                    }
                    if (filtroCapa === 'riego') {
                      return ['caseta_riego', 'pozo', 'estacion_meteo'].includes(lug.tipo);
                    }
                    return true;
                  })
                  .map((lug) => {
                    const catInfo = CATEGORIAS_LUGARES.find((c) => c.tipo === lug.tipo) || {
                      tipo: 'otro',
                      label: 'Punto Predial',
                      emoji: '📍',
                      color: lug.colorHex || '#dc2626',
                    };
                    return (
                      <LugarAdvancedMarker
                        key={lug.id}
                        lugar={lug}
                        catInfo={catInfo}
                        showInfo={activeInfoId === lug.id}
                        onSelect={() => {
                          if (!polygonEditorMode) setActiveInfoId(lug.id);
                        }}
                        onCloseInfo={() => setActiveInfoId(null)}
                      />
                    );
                  })}

                {/* 3. Marcador temporal al hacer clic */}
                {clickedCoords && !polygonEditorMode && (
                  <AdvancedMarker position={clickedCoords} title="Punto seleccionado">
                    <div className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[11px] border-2 border-white shadow-lg">
                      📍 Nuevo Punto
                    </div>
                  </AdvancedMarker>
                )}
              </GoogleMap>
            </APIProvider>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 text-xs gap-3 p-6 text-center">
              {mapsKeyLoading ? (
                <>
                  <Compass className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="font-bold text-sm text-white">Conectando con Google Maps Platform...</p>
                  <p className="text-stone-400 max-w-md">
                    Obteniendo credenciales seguras de mapa satelital del servidor.
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-9 h-9 text-amber-400" />
                  <p className="font-bold text-sm text-white">
                    {mapsKeyError || 'Mapa satelital temporalmente desconectado'}
                  </p>
                  <p className="text-stone-400 max-w-md leading-relaxed">
                    Verifica que <code className="text-emerald-300">GOOGLE_MAPS_API_KEY</code> (o{' '}
                    <code className="text-emerald-300">VITE_GOOGLE_MAPS_API_KEY</code>) esté configurada o reintenta la conexión con el servidor.
                  </p>
                  {onRetryMapsKey && (
                    <button
                      type="button"
                      onClick={onRetryMapsKey}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reintentar Conexión Mapa</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Panel Flotante de Dibujo / Edición Dinámica de Polígono */}
          {polygonEditorMode && (
            <div className="absolute bottom-3 left-3 right-3 z-30 bg-stone-900/95 text-white p-3.5 rounded-2xl border border-emerald-500/50 shadow-2xl backdrop-blur-md space-y-2.5 text-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/20"
                    style={{ backgroundColor: polygonEditorMode.colorHex }}
                  >
                    <PenTool className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-black text-sm flex items-center gap-2 flex-wrap">
                      <span>
                        {polygonEditorMode.kind === 'new'
                          ? `Trazando Polígono: ${polygonEditorMode.nombreLabel}`
                          : `Editando Contorno: ${polygonEditorMode.nombreLabel}`}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-800 text-emerald-200 font-mono text-[11px]">
                        {draftPolygonPoints.length} vértices · {draftAreaHa.toFixed(2)} ha ({Math.round(draftAreaM2).toLocaleString('es-CL')} m²)
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 mt-0.5">
                      Haz clic en el mapa para agregar esquinas según la forma real del terreno. Con 3 o más puntos podrás arrastrar las esquinas o los puntos intermedios blancos para ajustar curvas y deslindes (clic derecho en un vértice para quitarlo).
                    </p>
                  </div>
                </div>

                {polygonEditorMode.kind === 'edit' && (
                  <label className="flex items-center gap-1.5 text-[11px] text-emerald-200 font-semibold shrink-0 cursor-pointer bg-stone-800/80 px-2.5 py-1.5 rounded-lg border border-stone-700">
                    <input
                      type="checkbox"
                      checked={syncAreaWithPolygon}
                      onChange={(e) => setSyncAreaWithPolygon(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-emerald-500"
                    />
                    <span>Ajustar hectáreas ({draftAreaHa.toFixed(2)} ha)</span>
                  </label>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap pt-1.5 border-t border-stone-700/80">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setDraftPolygonPoints((prev) => prev.slice(0, -1))}
                    disabled={draftPolygonPoints.length === 0}
                    className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Deshacer punto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftPolygonPoints([])}
                    disabled={draftPolygonPoints.length === 0}
                    className="px-2.5 py-1.5 bg-stone-800 hover:bg-rose-900/70 disabled:opacity-40 text-stone-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Redibujar desde cero</span>
                  </button>
                  {draftPolygonPoints.length === 0 && polygonEditorMode.kind === 'edit' && (
                    <button
                      type="button"
                      onClick={handleConvertCircleToDraftPolygon}
                      className="px-2.5 py-1.5 bg-amber-700/80 hover:bg-amber-600 text-white rounded-lg font-bold cursor-pointer"
                    >
                      Partir desde octágono ajustable
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelPolygonEditor}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPolygonEditor}
                    disabled={draftPolygonPoints.length < 3}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {polygonEditorMode.kind === 'new'
                        ? 'Finalizar y Crear Cuartel'
                        : 'Guardar Polígono'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Banner Flotante al Hacer Clic en el Mapa */}
          {clickedCoords && !polygonEditorMode && (
            <div className="absolute bottom-4 left-4 right-4 z-20 bg-stone-900/95 text-white p-3.5 rounded-xl border border-stone-700 shadow-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="p-1.5 bg-emerald-700 rounded-lg">📍</span>
                <div>
                  <div className="font-extrabold text-sm">Punto marcado en el mapa:</div>
                  <div className="text-stone-300 font-mono text-[11px]">
                    Lat: {clickedCoords.lat} · Lng: {clickedCoords.lng}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleStartNewPolygon(clickedCoords)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  ✏️ Iniciar Polígono Desde Aquí
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddLugar(clickedCoords)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  + Agregar Marcador / Punto Aquí
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddParcela(clickedCoords)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  + Crear Cuartel Aquí
                </button>
                <button
                  type="button"
                  onClick={() => setClickedCoords(null)}
                  className="p-1.5 text-stone-400 hover:text-white cursor-pointer"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Leyenda de Puntos & Marcadores */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2 flex-wrap text-xs text-stone-600">
          <div className="flex items-center gap-3 flex-wrap text-[11px]">
            <span className="font-bold text-stone-800">Leyenda:</span>
            <span>🥝 Cuartel (Polígono real / círculo ha)</span>
            <span>🌾 Barbecho</span>
            <span>🧪 Bodega</span>
            <span>🏢 Oficina</span>
            <span>🏡 Casa Patronal</span>
            <span>💧 Caseta Riego</span>
            <span>🚰 Pozo DGA</span>
            <span>🚜 Taller</span>
          </div>
          <span className="text-[10px] text-stone-400">
            Usa «Trazar Polígono de Cuartel» para marcar la forma exacta de terrenos irregulares.
          </span>
        </div>
      </div>

      {/* LISTA DE PUNTOS IMPORTANTES DEL PREDIO (Lugares) */}
      <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h2 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              Puntos Importantes del Predio ({lugares.length} puntos registrados)
            </h2>
            <p className="text-[11px] text-stone-400">
              Barbechos, bodegas, oficinas, casetas de riego, pozos y áreas de acopio
            </p>
          </div>

          {canEdit && (
            <button
              onClick={() => handleOpenAddLugar()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Punto</span>
            </button>
          )}
        </div>

        {lugares.length === 0 ? (
          <div className="p-6 text-center text-stone-400 text-xs">
            No hay puntos de infraestructura o barbechos registrados. Agrega uno con el botón superior.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lugares.map((lug) => {
              const catInfo = CATEGORIAS_LUGARES.find(c => c.tipo === lug.tipo) || {
                tipo: 'otro',
                label: 'Punto Predial',
                emoji: '📍',
                color: '#dc2626'
              };

              return (
                <div 
                  key={lug.id} 
                  className="p-3.5 bg-stone-50 hover:bg-white rounded-xl border border-stone-200 hover:border-amber-300 transition-all flex flex-col justify-between text-xs space-y-2 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-extrabold text-stone-900 flex items-center gap-1.5">
                        <span className="text-base">{catInfo.emoji}</span>
                        <span>{lug.nombre}</span>
                      </div>
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: lug.colorHex || catInfo.color }}
                      >
                        {catInfo.label}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-500 line-clamp-2">
                      {lug.descripcion || 'Sin descripción'}
                    </p>

                    {lug.superficieHa ? (
                      <div className="text-[11px] font-bold text-amber-800">
                        Superficie: {lug.superficieHa} ha ({(lug.superficieHa * 10000).toLocaleString('es-CL')} m²)
                      </div>
                    ) : null}

                    <div className="text-[10px] font-mono text-stone-400">
                      Lat: {lug.lat.toFixed(5)} · Lng: {lug.lng.toFixed(5)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-200/60">
                    <button
                      type="button"
                      onClick={() => centrarMapa(lug.lat, lug.lng)}
                      className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver en Mapa</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditLugar(lug)}
                          className="p-1.5 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLugarToDelete(lug)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LISTA / TARJETAS DE CUARTELES DE KIWI */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
            <TreeDeciduous className="w-4 h-4 text-emerald-700" />
            Cuarteles de Kiwi Registrados ({parcelas.length} cuarteles · {totalHa.toFixed(1)} ha totales)
          </h2>
        </div>

        {parcelas.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center text-stone-400 space-y-2">
            <TreeDeciduous className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-sm text-stone-700">No hay cuarteles registrados en tu huerto</p>
            <p className="text-xs">Comienza agregando tu primer cuartel real con sus hectáreas y coordenadas.</p>
            {canEdit && (
              <button
                onClick={() => handleOpenAddParcela()}
                className="mt-2 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Agregar Cuartel
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {parcelas.map((p) => {
              const hasPolygon = Array.isArray(p.coordenadasPoligono) && p.coordenadasPoligono.length >= 3;
              const radioM = calcularRadioMetros(p.superficieHa || 1);
              const isSelected = selectedParcelaId === p.id;
              const sectoresText = (p.sectoresRiego && p.sectoresRiego.length > 0)
                ? p.sectoresRiego.map(s => `Sector ${s}`).join(', ')
                : `Sector ${p.sectorRiegoNumero || 1}`;
              const displayCenter =
                (hasPolygon ? calcularCentroidePoligono(p.coordenadasPoligono) : null) ||
                (typeof p.lat === 'number' && typeof p.lng === 'number' ? { lat: p.lat, lng: p.lng } : null);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedParcelaId(p.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white space-y-3 ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-stone-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span 
                      className="px-2 py-0.5 rounded-md font-extrabold text-white text-[10px]"
                      style={{ backgroundColor: p.colorHex || '#059669' }}
                    >
                      {p.codigoCuartel}
                    </span>
                    <span className="font-mono font-bold text-xs text-stone-800">
                      {p.superficieHa} ha
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-stone-900 text-sm">{p.nombre}</h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">{p.variedad} · {p.sistemaConduccion}</p>
                  </div>

                  <div className="p-2 bg-stone-50 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Geometría:</span>
                      {hasPolygon ? (
                        <strong className="text-emerald-800 font-mono">
                          Polígono ({p.coordenadasPoligono.length} vért.)
                        </strong>
                      ) : (
                        <strong className="text-stone-900 font-mono">Círculo ({radioM.toFixed(0)} m)</strong>
                      )}
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Sectores Riego:</span>
                      <strong className="text-cyan-800">{sectoresText}</strong>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Estado actual:</span>
                      <strong className="text-stone-800">{p.estadoActual}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-100 gap-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (displayCenter) centrarMapa(displayCenter.lat, displayCenter.lng);
                        }}
                        className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                      >
                        Centrar
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditPolygonForParcela(p);
                          }}
                          className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-0.5"
                          title="Dibujar o ajustar el contorno irregular del cuartel"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>{hasPolygon ? 'Polígono' : 'Trazar'}</span>
                        </button>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditParcela(p);
                          }}
                          className="p-1.5 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          title="Editar cuartel"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCuartelToDelete(p);
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Eliminar cuartel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL AGREGAR / EDITAR LUGAR O PUNTO IMPORTANTE */}
      {(isAddLugarOpen || isEditLugarOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-amber-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                {isEditLugarOpen ? 'Editar Punto Predial' : 'Agregar Punto / Marcador Importante'}
              </h3>
              <button 
                onClick={() => { setIsAddLugarOpen(false); setIsEditLugarOpen(false); }} 
                className="text-amber-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLugar} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nombre del Lugar / Punto:</label>
                <input
                  type="text"
                  placeholder="ej. Barbecho Sector Norte, Bodega Químicos SAG, Oficina Central..."
                  value={lugarForm.nombre}
                  onChange={(e) => setLugarForm({ ...lugarForm, nombre: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Categoría / Tipo de Instalación:</label>
                <select
                  value={lugarForm.tipo}
                  onChange={(e) => {
                    const t = e.target.value as TipoLugarPredio;
                    const cat = CATEGORIAS_LUGARES.find(c => c.tipo === t);
                    setLugarForm({ ...lugarForm, tipo: t, colorHex: cat?.color || lugarForm.colorHex });
                  }}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                  required
                >
                  {CATEGORIAS_LUGARES.map((cat) => (
                    <option key={cat.tipo} value={cat.tipo}>
                      {cat.emoji} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordenadas GPS */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800">Coordenadas Geográficas (Lat / Lng):</label>
                  <button
                    type="button"
                    onClick={() => handleUsarGpsEnForm(true)}
                    className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <LocateFixed className="w-3 h-3" />
                    <span>Mi GPS</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">Latitud:</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={lugarForm.lat}
                      onChange={(e) => setLugarForm({ ...lugarForm, lat: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 bg-white border border-stone-300 rounded font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">Longitud:</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={lugarForm.lng}
                      onChange={(e) => setLugarForm({ ...lugarForm, lng: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 bg-white border border-stone-300 rounded font-mono font-bold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Superficie si aplica (especialmente Barbecho) */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Superficie en Hectáreas (Opcional - Dibuja círculo en mapa):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="ej. 3.2 ha para Barbecho"
                  value={lugarForm.superficieHa || ''}
                  onChange={(e) => setLugarForm({ ...lugarForm, superficieHa: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400">
                  Si ingresas hectáreas, se dibujará el círculo exacto de superficie en el mapa.
                </span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Color del Marcador:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={lugarForm.colorHex || '#d97706'}
                    onChange={(e) => setLugarForm({ ...lugarForm, colorHex: e.target.value })}
                    className="w-9 h-9 rounded cursor-pointer border border-stone-300"
                  />
                  <span className="font-mono text-xs">{lugarForm.colorHex}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Descripción / Notas:</label>
                <textarea
                  rows={2}
                  placeholder="Detalles de la instalación, medidas de seguridad, faenas..."
                  value={lugarForm.descripcion || ''}
                  onChange={(e) => setLugarForm({ ...lugarForm, descripcion: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => { setIsAddLugarOpen(false); setIsEditLugarOpen(false); }}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  {isEditLugarOpen ? 'Guardar Cambios' : 'Crear Marcador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR / EDITAR CUARTEL */}
      {(isAddParcelaOpen || isEditParcelaOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <TreeDeciduous className="w-4 h-4 text-emerald-400" />
                {isAddParcelaOpen ? 'Agregar Nuevo Cuartel' : `Editar: ${parcelaForm.nombre}`}
              </h3>
              <button 
                onClick={() => { setIsAddParcelaOpen(false); setIsEditParcelaOpen(false); }} 
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form 
              onSubmit={isAddParcelaOpen ? handleSaveAddParcela : handleSaveEditParcela} 
              className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre del Cuartel:</label>
                  <input
                    type="text"
                    value={parcelaForm.nombre}
                    onChange={(e) => setParcelaForm({ ...parcelaForm, nombre: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    placeholder="ej. Cuartel 1 - Parrón Norte"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Código Oficial:</label>
                  <input
                    type="text"
                    value={parcelaForm.codigoCuartel}
                    onChange={(e) => setParcelaForm({ ...parcelaForm, codigoCuartel: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    placeholder="ej. C1 o C1-PN"
                    required
                  />
                </div>
              </div>

              {/* Coordenadas & Polígono Real / Círculo */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-stone-800">Ubicación, Polígono y Superficie:</span>
                  <div className="flex items-center gap-1.5">
                    {isEditParcelaOpen && selectedParcela && (
                      <button
                        type="button"
                        onClick={() => handleStartEditPolygonForParcela(selectedParcela)}
                        className="px-2 py-0.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PenTool className="w-3 h-3" />
                        <span>Editar Contorno en Mapa</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleUsarGpsEnForm(false)}
                      className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <LocateFixed className="w-3 h-3" />
                      <span>Mi GPS</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">Latitud Centro:</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={parcelaForm.lat}
                      onChange={(e) => setParcelaForm({ ...parcelaForm, lat: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 bg-white border border-stone-300 rounded font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">Longitud Centro:</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={parcelaForm.lng}
                      onChange={(e) => setParcelaForm({ ...parcelaForm, lng: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 bg-white border border-stone-300 rounded font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-0.5">Superficie (ha):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={parcelaForm.superficieHa}
                      onChange={(e) => setParcelaForm({ ...parcelaForm, superficieHa: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 bg-white border border-stone-300 rounded font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="text-[10px] text-emerald-800 bg-emerald-50 p-2 rounded flex justify-between items-center font-bold">
                  {parcelaForm.coordenadasPoligono && parcelaForm.coordenadasPoligono.length >= 3 ? (
                    <>
                      <span>Polígono georreferenciado ({parcelaForm.coordenadasPoligono.length} vértices):</span>
                      <span className="font-mono text-emerald-950 font-black">
                        {(calcularAreaPoligonoM2(parcelaForm.coordenadasPoligono) / 10000).toFixed(2)} ha medidas
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Sin polígono aún (usa círculo aprox.):</span>
                      <span className="font-mono text-emerald-950 font-black">
                        Radio {calcularRadioMetros(parcelaForm.superficieHa).toFixed(1)} metros
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Sectores de Riego Múltiples */}
              <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-xl space-y-2">
                <label className="block font-bold text-cyan-950">
                  Sectores de Riego Destinados (Puedes seleccionar más de uno):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {sectoresDisponibles.map((sec) => {
                    const isChecked = parcelaForm.sectoresRiego.some((s) => String(s) === String(sec.id));
                    return (
                      <label 
                        key={sec.id} 
                        className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                          isChecked 
                            ? 'bg-cyan-700 text-white border-cyan-700 font-bold' 
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSectorRiego(sec.id)}
                          className="w-3.5 h-3.5 rounded"
                        />
                        <span className="truncate">Sector {sec.id}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Variedad:</label>
                  <input
                    type="text"
                    value={parcelaForm.variedad}
                    onChange={(e) => setParcelaForm({ ...parcelaForm, variedad: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Portainjerto:</label>
                  <input
                    type="text"
                    value={parcelaForm.patronPortainjerto}
                    onChange={(e) => setParcelaForm({ ...parcelaForm, patronPortainjerto: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Polinizador:</label>
                  <input
                    type="text"
                    value={parcelaForm.polinizador}
                    onChange={(e) => setParcelaForm({ ...parcelaForm, polinizador: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Sistema de Conducción:</label>
                  <select
                    value={parcelaForm.sistemaConduccion}
                    onChange={(e) => setParcelaForm({ ...parcelaForm, sistemaConduccion: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                  >
                    {SISTEMAS_CONDUCCION.map((sis) => (
                      <option key={sis} value={sis}>{sis}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Color Identificador:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={parcelaForm.colorHex}
                      onChange={(e) => setParcelaForm({ ...parcelaForm, colorHex: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer border border-stone-300"
                    />
                    <span className="font-mono text-xs">{parcelaForm.colorHex}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => { setIsAddParcelaOpen(false); setIsEditParcelaOpen(false); }}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  {isEditParcelaOpen ? 'Guardar Cambios' : 'Crear Cuartel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR CUARTEL */}
      {cuartelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-sm text-stone-900">¿Eliminar Cuartel?</h3>
            </div>
            <p className="text-xs text-stone-600">
              ¿Estás seguro de eliminar el <strong>{cuartelToDelete.nombre}</strong> ({cuartelToDelete.superficieHa} ha)?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCuartelToDelete(null)}
                className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteParcela(cuartelToDelete.id);
                  setCuartelToDelete(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Eliminar Cuartel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR LUGAR */}
      {lugarToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-sm text-stone-900">¿Eliminar Punto del Mapa?</h3>
            </div>
            <p className="text-xs text-stone-600">
              ¿Estás seguro de eliminar el marcador <strong>{lugarToDelete.nombre}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setLugarToDelete(null)}
                className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteLugar(lugarToDelete.id);
                  setLugarToDelete(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Eliminar Punto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
