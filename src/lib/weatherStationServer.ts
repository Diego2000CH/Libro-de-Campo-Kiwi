import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ClimaCondiciones } from '../types/campo.ts';

export interface StationReadingRecord {
  stationCode: string;
  provider: 'dropcontrol_wiseconn' | 'ecowitt_push' | 'davis_weatherlink' | 'ecowitt_cloud' | 'iot_webhook';
  stationName: string;
  receivedAtIso: string;
  clima: ClimaCondiciones;
  rawSummary: string;
}

const STATION_CACHE_FILE = path.join(os.tmpdir(), 'cuaderno-campo-weather-stations.json');
const stationStore = new Map<string, StationReadingRecord>();
let cacheLoaded = false;

export function isValidStationCode(code: unknown): code is string {
  return typeof code === 'string' && /^[a-zA-Z0-9_-]{3,48}$/.test(code.trim());
}

function loadStationCacheOnce() {
  if (cacheLoaded) return;
  cacheLoaded = true;
  try {
    if (fs.existsSync(STATION_CACHE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STATION_CACHE_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (isValidStationCode(k) && v && typeof v === 'object') {
            stationStore.set(k, v as StationReadingRecord);
          }
        }
      }
    }
  } catch {
    // Ignorar caché ilegible
  }
}

function persistStationCache() {
  try {
    const obj: Record<string, StationReadingRecord> = {};
    for (const [k, v] of stationStore.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(STATION_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // Continuar en memoria si el sistema de archivos es de solo lectura
  }
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function calcDewPointC(tempC: number, rh: number): number {
  const safeRh = Math.max(1, Math.min(100, rh));
  const a = 17.27;
  const b = 237.7;
  const gamma = (a * tempC) / (b + tempC) + Math.log(safeRh / 100);
  return round1((b * gamma) / (a - gamma));
}

function calcWetBulbC(tempC: number, rh: number): number {
  const safeRh = Math.max(1, Math.min(100, rh));
  const tw =
    tempC * Math.atan(0.151977 * Math.sqrt(safeRh + 8.313659)) +
    Math.atan(tempC + safeRh) -
    Math.atan(safeRh - 1.676331) +
    0.00391838 * Math.pow(safeRh, 1.5) * Math.atan(0.023101 * safeRh) -
    4.686035;
  return round1(tw);
}

function degToCompass(deg: number): string {
  const dirs = [
    'Norte (N)',
    'Nor-Este (NE)',
    'Este (E)',
    'Sur-Este (SE)',
    'Sur (S)',
    'Sur-Poniente (SW)',
    'Poniente (W)',
    'Nor-Poniente (NW)',
  ];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx] || 'Sur (S)';
}

function fToC(f: number): number {
  return round1(((f - 32) * 5) / 9);
}

function mphToKmH(mph: number): number {
  return round1(mph * 1.60934);
}

function inToMm(inches: number): number {
  return round1(inches * 25.4);
}

function pickNum(...values: unknown[]): number | undefined {
  for (const v of values) {
    if (v === undefined || v === null || v === '') continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function normalizeIncomingWeatherPayload(params: {
  stationCode: string;
  payload: Record<string, unknown>;
  providerHint?: StationReadingRecord['provider'];
  stationNameHint?: string;
}): StationReadingRecord {
  const { stationCode, payload } = params;

  // Soporta Ecowitt / Wunderground (°F, mph, in) y payloads métricos JSON (°C, km/h, mm)
  const tempCRaw =
    pickNum(payload.tempC, payload.temperatureC, payload.temperaturaActual, payload.temp_c) ??
    (pickNum(payload.tempf, payload.tempinf) !== undefined
      ? fToC(pickNum(payload.tempf, payload.tempinf)!)
      : 18.0);

  const prevExisting = getLatestStationReading(stationCode);
  const prevMin = prevExisting?.clima.tempMinima;
  const prevMax = prevExisting?.clima.tempMaxima;

  const tempMin =
    pickNum(payload.tempMinC, payload.tempMinima) ??
    (prevMin !== undefined ? Math.min(prevMin, tempCRaw) : tempCRaw);
  const tempMax =
    pickNum(payload.tempMaxC, payload.tempMaxima) ??
    (prevMax !== undefined ? Math.max(prevMax, tempCRaw) : tempCRaw);

  const humedad = Math.max(
    1,
    Math.min(
      100,
      Math.round(
        pickNum(payload.humedad, payload.humidity, payload.humedadRelativa, payload.humidityin) ?? 65
      )
    )
  );

  const vientoKmH =
    pickNum(payload.vientoKmH, payload.windSpeedKmH, payload.velocidadVientoKmH) ??
    (pickNum(payload.windspeedmph, payload.windgustmph) !== undefined
      ? mphToKmH(pickNum(payload.windspeedmph, payload.windgustmph)!)
      : 6.5);

  const windDirRaw = payload.direccionViento;
  const windDeg = pickNum(payload.winddir, payload.windDirDeg);
  const direccionViento =
    typeof windDirRaw === 'string' && windDirRaw.trim()
      ? windDirRaw.trim()
      : windDeg !== undefined
      ? degToCompass(windDeg)
      : 'Sur-Poniente (SW)';

  const lluviaMm =
    pickNum(payload.lluviaMm, payload.precipitacionDiaMm, payload.rainMm) ??
    (pickNum(payload.dailyrainin, payload.rainin) !== undefined
      ? inToMm(pickNum(payload.dailyrainin, payload.rainin)!)
      : 0);

  const lluviaHoraMm =
    pickNum(payload.rainRateMmH) ??
    (pickNum(payload.rainratein) !== undefined ? inToMm(pickNum(payload.rainratein)!) : 0);

  const humedadFoliarPct = pickNum(
    payload.humedadFoliarPct,
    payload.leafwetness_ch1,
    payload.leafWetnessPct
  );
  const radiacionSolarWm2 = pickNum(payload.radiacionSolarWm2, payload.solarradiation, payload.solarRad);
  const uv = pickNum(payload.uv, payload.uvIndex, payload.indiceUvActual);

  const puntoRocioC = pickNum(payload.puntoRocioC) ?? calcDewPointC(tempCRaw, humedad);
  const bulboHumedoC = pickNum(payload.temperaturaBulboHumedoC) ?? calcWetBulbC(tempCRaw, humedad);

  let riesgoPsa: ClimaCondiciones['riesgoPsa'] = 'Bajo';
  const leafWetHigh = (humedadFoliarPct ?? 0) >= 60;
  if ((tempCRaw >= 9 && tempCRaw <= 22) && (lluviaHoraMm > 0.5 || lluviaMm > 2 || humedad >= 85 || leafWetHigh)) {
    riesgoPsa = lluviaHoraMm > 1.5 || (leafWetHigh && humedad >= 88) ? 'Crítico' : 'Alto';
  } else if ((tempCRaw >= 9 && tempCRaw <= 22) && (humedad >= 72 || lluviaMm > 0.2)) {
    riesgoPsa = 'Medio';
  }

  let riesgoBotrytis: ClimaCondiciones['riesgoBotrytis'] = 'Bajo';
  if ((humedad >= 85 || leafWetHigh) && tempCRaw >= 13) {
    riesgoBotrytis = 'Alto';
  } else if (humedad >= 75) {
    riesgoBotrytis = 'Medio';
  }

  let estadoCielo: ClimaCondiciones['estadoCielo'] = 'Parcialmente Nublado';
  if (lluviaHoraMm > 0.2) {
    estadoCielo = 'Lluvia Moderada';
  } else if ((radiacionSolarWm2 ?? 0) >= 450 || humedad < 55) {
    estadoCielo = 'Soleado';
  } else if (humedad >= 85) {
    estadoCielo = 'Nublado';
  }

  const probLluvia =
    pickNum(payload.probabilidadLluvia) ?? (lluviaHoraMm > 0.2 ? 90 : humedad >= 88 ? 45 : 10);

  const stationTypeStr = String(payload.stationtype || payload.model || '').toLowerCase();
  const provider: StationReadingRecord['provider'] =
    params.providerHint ||
    (stationTypeStr.includes('wiseconn') || stationTypeStr.includes('dropcontrol')
      ? 'dropcontrol_wiseconn'
      : stationTypeStr.includes('davis') || stationTypeStr.includes('vantage')
      ? 'davis_weatherlink'
      : payload.PASSKEY || stationTypeStr.includes('ecowitt') || payload.tempf !== undefined
      ? 'ecowitt_push'
      : 'iot_webhook');

  const fuenteDatos: ClimaCondiciones['fuenteDatos'] =
    provider === 'dropcontrol_wiseconn'
      ? 'DropControl Wiseconn'
      : provider === 'davis_weatherlink'
      ? 'Estación Davis'
      : provider === 'ecowitt_push' || provider === 'ecowitt_cloud'
      ? 'Estación Ecowitt'
      : 'Estación Local IoT';

  const stationName =
    params.stationNameHint ||
    (typeof payload.stationName === 'string' && payload.stationName.trim()) ||
    `Estación ${stationCode}`;

  const receivedAtIso = new Date().toISOString();

  const clima: ClimaCondiciones = {
    temperaturaActual: round1(tempCRaw),
    tempMinima: round1(tempMin),
    tempMaxima: round1(tempMax),
    humedadRelativa: humedad,
    velocidadVientoKmH: round1(vientoKmH),
    direccionViento,
    probabilidadLluvia: Math.round(probLluvia),
    alertaHelada: tempCRaw <= 1.5 || tempMin <= 1.5 || bulboHumedoC <= 0.5,
    riesgoPsa,
    riesgoBotrytis,
    evapotranspiracionEtoMmDia: round1(
      pickNum(payload.eto, payload.evapotranspiracionEtoMmDia) ??
        Math.max(1.2, Math.min(7.5, 0.004 * (radiacionSolarWm2 ?? 350) + (tempCRaw - 5) * 0.12))
    ),
    estadoCielo,
    indiceUvActual: uv !== undefined ? round1(uv) : undefined,
    fuenteDatos,
    estacionId: stationCode,
    estacionNombre: stationName,
    estacionUltimaLecturaIso: receivedAtIso,
    temperaturaBulboHumedoC: bulboHumedoC,
    puntoRocioC,
    humedadFoliarPct: humedadFoliarPct !== undefined ? Math.round(humedadFoliarPct) : undefined,
    precipitacionDiaMm: round1(lluviaMm),
    radiacionSolarWm2: radiacionSolarWm2 !== undefined ? Math.round(radiacionSolarWm2) : undefined,
  };

  const record: StationReadingRecord = {
    stationCode,
    provider,
    stationName,
    receivedAtIso,
    clima,
    rawSummary: `T° ${clima.temperaturaActual}°C · HR ${clima.humedadRelativa}% · Viento ${clima.velocidadVientoKmH} km/h · BH ${bulboHumedoC}°C`,
  };

  loadStationCacheOnce();
  stationStore.set(stationCode, record);
  persistStationCache();

  return record;
}

export function getLatestStationReading(stationCode: string): StationReadingRecord | null {
  loadStationCacheOnce();
  return stationStore.get(stationCode) || null;
}

export function getWeatherStationServerCapabilities() {
  return {
    wiseconnCloudConfigured: Boolean(process.env.WISECONN_API_KEY),
    ecowittCloudConfigured: Boolean(
      process.env.ECOWITT_APP_KEY && process.env.ECOWITT_API_KEY && process.env.ECOWITT_MAC
    ),
    davisCloudConfigured: Boolean(
      process.env.DAVIS_API_KEY && process.env.DAVIS_API_SECRET && process.env.DAVIS_STATION_ID
    ),
    ingestSecretConfigured: Boolean(process.env.WEATHER_STATION_INGEST_SECRET),
  };
}

function extractWiseconnMeasureValue(m: any): number | undefined {
  const candidates = [
    m?.lastData?.value,
    m?.lastData?.val,
    m?.lastValue,
    m?.value,
    m?.data?.[0]?.value,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null || c === '') continue;
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export async function fetchFromConfiguredCloudStation(
  stationCode: string,
  preferredProvider?: StationReadingRecord['provider'],
  stationName?: string
): Promise<StationReadingRecord | null> {
  // 0. DropControl by Wiseconn REST API v2 (credenciales exclusivamente desde process.env)
  const wiseconnKey = (process.env.WISECONN_API_KEY || '').trim();
  const wiseconnFarmEnv = (process.env.WISECONN_FARM_ID || '').trim();
  const wiseconnBaseUrl = (process.env.WISECONN_BASE_URL || 'https://apiv2.wiseconn.com').replace(/\/+$/, '');

  if (
    (preferredProvider === 'dropcontrol_wiseconn' || !preferredProvider) &&
    wiseconnKey
  ) {
    const headers: Record<string, string> = {
      apiKey: wiseconnKey,
      Accept: 'application/json',
    };

    let targetFarmId = wiseconnFarmEnv;
    let discoveredFarmName = '';

    if (!targetFarmId) {
      const farmsRes = await fetch(`${wiseconnBaseUrl}/farms`, { headers });
      if (!farmsRes.ok) {
        throw new Error(`DropControl Wiseconn HTTP ${farmsRes.status} al consultar /farms`);
      }
      const farmsJson = (await farmsRes.json()) as any;
      const farmsList = Array.isArray(farmsJson) ? farmsJson : farmsJson?.data || [];
      if (farmsList.length > 0) {
        targetFarmId = String(farmsList[0].id ?? '');
        discoveredFarmName = String(farmsList[0].name ?? '');
      }
    }

    if (!targetFarmId) {
      throw new Error('No se encontraron predios (farms) asociados a esa API Key de DropControl.');
    }

    const measuresRes = await fetch(
      `${wiseconnBaseUrl}/farms/${encodeURIComponent(targetFarmId)}/measures`,
      { headers }
    );
    if (!measuresRes.ok) {
      throw new Error(`DropControl Wiseconn HTTP ${measuresRes.status} al consultar /measures`);
    }
    const measuresRaw = (await measuresRes.json()) as any;
    const measures: any[] = Array.isArray(measuresRaw) ? measuresRaw : measuresRaw?.data || [];

    const mapped: Record<string, unknown> = {
      stationtype: 'DropControl Wiseconn',
      stationName: stationName || discoveredFarmName || `DropControl Predio #${targetFarmId}`,
    };

    for (const m of measures) {
      const val = extractWiseconnMeasureValue(m);
      if (val === undefined) continue;
      const label = `${m?.name || ''} ${m?.physicalType || ''} ${m?.sensorType || ''} ${m?.readType || ''}`.toLowerCase();
      const unit = String(m?.unit || '').toLowerCase();

      if (
        mapped.tempC === undefined &&
        (label.includes('air temp') || label.includes('temperatura ambiente') || label.includes('temperatura del aire') || (label.includes('temp') && !label.includes('suelo') && !label.includes('soil') && !label.includes('dew') && !label.includes('rocio') && !label.includes('wet') && !label.includes('bulbo')))
      ) {
        mapped.tempC = unit.includes('f') ? fToC(val) : val;
      } else if (
        mapped.humedad === undefined &&
        (label.includes('humidity') || label.includes('humedad relativa') || (label.includes('hum') && !label.includes('suelo') && !label.includes('soil') && !label.includes('foliar') && !label.includes('leaf')))
      ) {
        mapped.humedad = val;
      } else if (
        mapped.vientoKmH === undefined &&
        (label.includes('wind speed') || label.includes('velocidad viento') || label.includes('viento'))
      ) {
        mapped.vientoKmH = unit.includes('m/s') ? round1(val * 3.6) : unit.includes('mph') ? mphToKmH(val) : val;
      } else if (
        mapped.windDirDeg === undefined &&
        (label.includes('wind dir') || label.includes('direccion') || label.includes('dirección'))
      ) {
        mapped.windDirDeg = val;
      } else if (
        mapped.lluviaMm === undefined &&
        (label.includes('rain') || label.includes('lluvia') || label.includes('precip'))
      ) {
        mapped.lluviaMm = unit.includes('in') ? inToMm(val) : val;
      } else if (
        mapped.radiacionSolarWm2 === undefined &&
        (label.includes('solar') || label.includes('radiacion') || label.includes('radiación')) &&
        !label.includes('uv')
      ) {
        mapped.radiacionSolarWm2 = val;
      } else if (mapped.uv === undefined && label.includes('uv')) {
        mapped.uv = val;
      } else if (
        mapped.humedadFoliarPct === undefined &&
        (label.includes('leaf') || label.includes('foliar') || label.includes('mojado'))
      ) {
        mapped.humedadFoliarPct = val;
      } else if (mapped.eto === undefined && (label.includes('eto') || label.includes('evapotran'))) {
        mapped.eto = val;
      } else if (
        mapped.puntoRocioC === undefined &&
        (label.includes('dew') || label.includes('rocio') || label.includes('rocío'))
      ) {
        mapped.puntoRocioC = val;
      } else if (
        mapped.temperaturaBulboHumedoC === undefined &&
        (label.includes('wet bulb') || label.includes('bulbo humedo') || label.includes('bulbo húmedo'))
      ) {
        mapped.temperaturaBulboHumedoC = val;
      }
    }

    return normalizeIncomingWeatherPayload({
      stationCode,
      providerHint: 'dropcontrol_wiseconn',
      stationNameHint: String(mapped.stationName),
      payload: mapped,
    });
  }

  // 1. Davis WeatherLink v2 Cloud (credenciales exclusivamente desde process.env)
  const davisKey = (process.env.DAVIS_API_KEY || '').trim();
  const davisSecret = (process.env.DAVIS_API_SECRET || '').trim();
  const davisStationId = (process.env.DAVIS_STATION_ID || '').trim();

  if (
    (preferredProvider === 'davis_weatherlink' || !preferredProvider) &&
    davisKey &&
    davisSecret &&
    davisStationId
  ) {
    const t = Math.floor(Date.now() / 1000);
    const canonical = `api-key${davisKey}station-id${davisStationId}t${t}`;
    const apiSignature = crypto.createHmac('sha256', davisSecret).update(canonical).digest('hex');
    const url = `https://api.weatherlink.com/v2/current/${encodeURIComponent(davisStationId)}?api-key=${encodeURIComponent(davisKey)}&t=${t}&api-signature=${apiSignature}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Davis WeatherLink HTTP ${res.status}`);
    }
    const json = (await res.json()) as any;
    const sensorData = json?.sensors?.[0]?.data?.[0] || {};
    return normalizeIncomingWeatherPayload({
      stationCode,
      providerHint: 'davis_weatherlink',
      stationNameHint: stationName || `Davis WeatherLink #${davisStationId}`,
      payload: {
        tempf: sensorData.temp,
        humidity: sensorData.hum,
        windspeedmph: sensorData.wind_speed_last ?? sensorData.wind_speed_avg_last_10_min,
        winddir: sensorData.wind_dir_last,
        dailyrainin: sensorData.rainfall_daily_in,
        rainratein: sensorData.rain_rate_last_in,
        solarradiation: sensorData.solar_rad,
        uv: sensorData.uv_index,
        leafwetness_ch1: sensorData.wet_leaf_at_1,
        stationtype: 'Davis WeatherLink v2',
      },
    });
  }

  // 2. Ecowitt Cloud API v3 (credenciales exclusivamente desde process.env)
  const ecoApp = (process.env.ECOWITT_APP_KEY || '').trim();
  const ecoKey = (process.env.ECOWITT_API_KEY || '').trim();
  const ecoMac = (process.env.ECOWITT_MAC || '').trim();

  if (
    (preferredProvider === 'ecowitt_cloud' || !preferredProvider) &&
    ecoApp &&
    ecoKey &&
    ecoMac
  ) {
    const url = `https://api.ecowitt.net/api/v3/device/real_time?application_key=${encodeURIComponent(ecoApp)}&api_key=${encodeURIComponent(ecoKey)}&mac=${encodeURIComponent(ecoMac)}&call_back=all&temp_unitid=1&wind_speed_unitid=7&rainfall_unitid=12`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Ecowitt Cloud HTTP ${res.status}`);
    }
    const json = (await res.json()) as any;
    const d = json?.data || {};
    return normalizeIncomingWeatherPayload({
      stationCode,
      providerHint: 'ecowitt_cloud',
      stationNameHint: stationName || `Ecowitt Cloud (${ecoMac})`,
      payload: {
        tempC: d?.outdoor?.temperature?.value,
        humedad: d?.outdoor?.humidity?.value,
        vientoKmH: d?.wind?.wind_speed?.value,
        windDirDeg: d?.wind?.wind_direction?.value,
        lluviaMm: d?.rainfall?.daily?.value,
        rainRateMmH: d?.rainfall?.rain_rate?.value,
        radiacionSolarWm2: d?.solar_and_uvi?.solar?.value,
        uv: d?.solar_and_uvi?.uvi?.value,
        humedadFoliarPct: d?.leaf_wetness_ch1?.value,
        stationtype: 'Ecowitt Cloud v3',
      },
    });
  }

  return null;
}
