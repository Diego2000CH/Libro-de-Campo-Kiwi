import React, { useState } from 'react';
import { 
  Calculator, 
  Droplet, 
  Sprout, 
  Wind, 
  ArrowRight, 
  Gauge, 
  CheckCircle2,
  Tractor,
  Layers,
  FlaskConical,
  Scale,
  Snowflake,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Info,
  Calendar,
  Flower2
} from 'lucide-react';

interface CalculadoraViewProps {
  etoClimaActual?: number;
}

export const CalculadoraView: React.FC<CalculadoraViewProps> = ({
  etoClimaActual = 4.5
}) => {
  const [activeTab, setActiveTab] = useState<
    'pulverizacion' | 'riego' | 'fertirriego' | 'cosecha_raleo' | 'horas_frio' | 'polinizacion'
  >('pulverizacion');

  // ==========================================
  // PESTAÑA 1: CALIBRACIÓN PULVERIZADOR & ESTANCADA (SAG)
  // ==========================================
  const [estanqueCapacidadL, setEstanqueCapacidadL] = useState(2000);
  const [mojamientoLHa, setMojamientoLHa] = useState(1200);
  const [velocidadKmH, setVelocidadKmH] = useState(4.5);
  const [distanciaHilerasM, setDistanciaHilerasM] = useState(4.5);
  const [numeroBoquillas, setNumeroBoquillas] = useState(16);
  const [dosisHa, setDosisHa] = useState(1.5);
  const [unidadDosis, setUnidadDosis] = useState<'kg' | 'L' | 'cc' | 'gramos'>('kg');
  const [superficieCuartelHa, setSuperficieCuartelHa] = useState(5.0);

  // Fórmulas Pulverización
  const caudalTotalLMin = Number(((mojamientoLHa * velocidadKmH * distanciaHilerasM) / 600).toFixed(2));
  const caudalPorBoquillaLMin = Number((caudalTotalLMin / Math.max(1, numeroBoquillas)).toFixed(2));
  const hectareasPorEstanque = Number((estanqueCapacidadL / Math.max(1, mojamientoLHa)).toFixed(2));
  const productoPorEstanque = Number((hectareasPorEstanque * dosisHa).toFixed(2));
  const estanquesNecesarios = Number((superficieCuartelHa / Math.max(0.1, hectareasPorEstanque)).toFixed(1));
  const minutosVaciadoEstanque = Number((estanqueCapacidadL / Math.max(0.1, caudalTotalLMin)).toFixed(1));

  // Color ISO sugerido de boquillas según caudal a 3 bar
  const getColorBoquilla = (lmin: number) => {
    if (lmin < 0.6) return { color: 'Naranjo ISO (0.4 L/min)', hex: '#f97316' };
    if (lmin < 0.9) return { color: 'Amarillo ISO 02 (0.8 L/min)', hex: '#eab308' };
    if (lmin < 1.1) return { color: 'Lila ISO 025 (1.0 L/min)', hex: '#a855f7' };
    if (lmin < 1.4) return { color: 'Azul ISO 03 (1.2 L/min)', hex: '#3b82f6' };
    if (lmin < 1.8) return { color: 'Rojo ISO 04 (1.6 L/min)', hex: '#ef4444' };
    return { color: 'Verde ISO 05 (> 2.0 L/min)', hex: '#10b981' };
  };
  const boquillaSugerida = getColorBoquilla(caudalPorBoquillaLMin);

  // ==========================================
  // PESTAÑA 2: RIEGO & BALANCE HÍDRICO (ETo & Kc)
  // ==========================================
  const [etoMmDia, setEtoMmDia] = useState(etoClimaActual);
  const [kcKiwi, setKcKiwi] = useState(1.05); // Kc Kiwi Hayward
  const [eficienciaRiego, setEficienciaRiego] = useState(0.90); // Goteo 90%
  const [superficieRiegoHa, setSuperficieRiegoHa] = useState(5.0);
  const [caudalPozoLs, setCaudalPozoLs] = useState(20.0);
  const [goteroCaudalLh, setGoteroCaudalLh] = useState(2.0);
  const [goteroDistanciaM, setGoteroDistanciaM] = useState(0.75);
  const [lineasPorHilera, setLineasPorHilera] = useState(2);

  // Fórmulas Riego
  const etcDemandaNetaMm = Number((etoMmDia * kcKiwi).toFixed(2));
  const laminaBrutaMm = Number((etcDemandaNetaMm / Math.max(0.5, eficienciaRiego)).toFixed(2));
  const m3TotalesTurno = Number((laminaBrutaMm * 10 * superficieRiegoHa).toFixed(1));
  const horasBombeoEstimadas = Number(((m3TotalesTurno * 1000) / (caudalPozoLs * 3600)).toFixed(1));
  const precipitacionSistemaMmH = Number((((goteroCaudalLh * lineasPorHilera) / (distanciaHilerasM * goteroDistanciaM))).toFixed(2));
  const horasPorPrecipitacion = Number((laminaBrutaMm / Math.max(0.1, precipitacionSistemaMmH)).toFixed(1));

  // ==========================================
  // PESTAÑA 3: FERTIRRIEGO & UNIDADES NUTRICIONALES
  // ==========================================
  const [ufNitrogeno, setUfNitrogeno] = useState(35);
  const [ufFosforo, setUfFosforo] = useState(15);
  const [ufPotasio, setUfPotasio] = useState(50);
  const [ufCalcio, setUfCalcio] = useState(25);
  const [haFertirriego, setHaFertirriego] = useState(5.0);

  // Conversión a fertilizantes comerciales comunes de Kiwis:
  // Calcinit (Nitrato de Calcio): 15.5% N, 26.5% CaO
  // Sulfato de Potasio: 50% K2O
  // MAP Soluble: 12% N, 61% P2O5
  // Urea: 46% N
  const kgCalcinit = Number(((ufCalcio / 0.265) * haFertirriego).toFixed(1));
  const nAportadoCalcinit = Number(((kgCalcinit * 0.155) / haFertirriego).toFixed(1));
  const nRestante = Math.max(0, ufNitrogeno - nAportadoCalcinit);
  const kgUrea = Number(((nRestante / 0.46) * haFertirriego).toFixed(1));
  const kgSulfatoPotasio = Number(((ufPotasio / 0.50) * haFertirriego).toFixed(1));
  const kgMap = Number(((ufFosforo / 0.61) * haFertirriego).toFixed(1));

  // ==========================================
  // PESTAÑA 4: ESTIMACIÓN DE COSECHA & RALEO
  // ==========================================
  const [distanciaPlantasM, setDistanciaPlantasM] = useState(4.0);
  const [cargadoresPorPlanta, setCargadoresPorPlanta] = useState(28);
  const [yemasPorCargador, setYemasPorCargador] = useState(12);
  const [porcentajeBrotacion, setPorcentajeBrotacion] = useState(75);
  const [frutosPorBrote, setFrutosPorBrote] = useState(3.2);
  const [frutosObjetivoPlanta, setFrutosObjetivoPlanta] = useState(380);
  const [pesoFrutoGramos, setPesoFrutoGramos] = useState(115); // Calibre 30 (115g)

  const plantasPorHaCalc = Math.round(10000 / (distanciaHilerasM * distanciaPlantasM));
  const brotesPorPlanta = Math.round(cargadoresPorPlanta * yemasPorCargador * (porcentajeBrotacion / 100));
  const frutosPotencialesPlanta = Math.round(brotesPorPlanta * frutosPorBrote);
  const frutosARalear = Math.max(0, frutosPotencialesPlanta - frutosObjetivoPlanta);
  const porcentajeRaleo = frutosPotencialesPlanta > 0 ? Math.round((frutosARalear / frutosPotencialesPlanta) * 100) : 0;
  const kilosPorPlanta = Number(((frutosObjetivoPlanta * pesoFrutoGramos) / 1000).toFixed(1));
  const toneladasPorHa = Number(((kilosPorPlanta * plantasPorHaCalc) / 1000).toFixed(1));
  const totalBinesCuartel = Math.round((toneladasPorHa * superficieCuartelHa * 1000) / 400);

  // ==========================================
  // PESTAÑA 5: HORAS FRÍO & ROMPEDOR DE DORMANCIA
  // ==========================================
  const [horasFrioAcumuladas, setHorasFrioAcumuladas] = useState(720);
  const [metaHorasFrio, setMetaHorasFrio] = useState(850);
  const [porcentajeDormex, setPorcentajeDormex] = useState(3.0); // 3% Cianamida Hidrogenada
  const [mojamientoDormexLHa, setMojamientoDormexLHa] = useState(1000);

  const deficitHF = Math.max(0, metaHorasFrio - horasFrioAcumuladas);
  const cumplimientoHF = Math.min(100, Math.round((horasFrioAcumuladas / metaHorasFrio) * 100));
  const litrosDormexHa = Number(((mojamientoDormexLHa * porcentajeDormex) / 100).toFixed(1));

  // ==========================================
  // PESTAÑA 6: POLINIZACIÓN & COLMENAS / POLEN
  // ==========================================
  const [colmenasPorHaApis, setColmenasPorHaApis] = useState(10);
  const [colmenasPorHaBombus, setColmenasPorHaBombus] = useState(4);
  const [gramosPolenHa, setGramosPolenHa] = useState(400); // 400 g/ha polen comercial

  const totalApis = Math.round(colmenasPorHaApis * superficieCuartelHa);
  const totalBombus = Math.round(colmenasPorHaBombus * superficieCuartelHa);
  const totalPolenKg = Number(((gramosPolenHa * superficieCuartelHa) / 1000).toFixed(2));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
          <Calculator className="w-3.5 h-3.5" />
          Suite Integral de Cálculos Agronómicos & Kiwicultura
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          Calculadora Agronómica de Alta Precisión
        </h1>
        <p className="text-xs text-stone-500">
          Calibración de pulverizadores SAG, balances de riego Penman-Monteith, fertirriego, estimación de cosecha, horas frío y polinización.
        </p>

        {/* Selector de Pestañas de la Calculadora */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 border-t border-stone-100 mt-4 pb-1">
          <button
            onClick={() => setActiveTab('pulverizacion')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'pulverizacion'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Tractor className="w-3.5 h-3.5" />
            <span>Pulverización & Estancada</span>
          </button>

          <button
            onClick={() => setActiveTab('riego')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'riego'
                ? 'bg-cyan-800 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>Riego & Demanda ETo</span>
          </button>

          <button
            onClick={() => setActiveTab('fertirriego')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'fertirriego'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Fertirriego (U.F.)</span>
          </button>

          <button
            onClick={() => setActiveTab('cosecha_raleo')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'cosecha_raleo'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Cosecha & Raleo</span>
          </button>

          <button
            onClick={() => setActiveTab('horas_frio')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'horas_frio'
                ? 'bg-blue-800 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5" />
            <span>Horas Frío & Rompedor</span>
          </button>

          <button
            onClick={() => setActiveTab('polinizacion')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'polinizacion'
                ? 'bg-rose-800 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <Flower2 className="w-3.5 h-3.5" />
            <span>Polinización & Polen</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}

      {/* 1. PULVERIZACIÓN & ESTANCADA */}
      {activeTab === 'pulverizacion' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Parámetros de Entrada */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <Tractor className="w-4 h-4 text-emerald-700" />
                  Parámetros de Calibración de Pulverizador SAG
                </h2>
                <p className="text-[11px] text-stone-400">
                  Ajuste de velocidad, ancho de hilera, boquillas y volumen de caldo
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                Fórmula Oficial SAG
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Capacidad del Estanque (L):</label>
                <div className="flex gap-1.5 mb-1.5">
                  {[2000, 1500, 1000, 20].map((litros) => (
                    <button
                      key={litros}
                      type="button"
                      onClick={() => setEstanqueCapacidadL(litros)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer border ${
                        estanqueCapacidadL === litros
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {litros} L
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={estanqueCapacidadL}
                  onChange={(e) => setEstanqueCapacidadL(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Mojamiento por Hectárea (L/ha):</label>
                <input
                  type="number"
                  step="50"
                  value={mojamientoLHa}
                  onChange={(e) => setMojamientoLHa(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400">Parrón Kiwi adulto: 1.000 a 1.500 L/ha</span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Velocidad del Tractor (km/h):</label>
                <input
                  type="number"
                  step="0.1"
                  value={velocidadKmH}
                  onChange={(e) => setVelocidadKmH(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
                <span className="text-[10px] text-stone-400">Rango óptimo parrón: 3.5 a 5.0 km/h</span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Distancia entre Hileras (m):</label>
                <input
                  type="number"
                  step="0.1"
                  value={distanciaHilerasM}
                  onChange={(e) => setDistanciaHilerasM(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
                <span className="text-[10px] text-stone-400">Parrón La Cabaña: 4.5 m</span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Número de Boquillas Abiertas:</label>
                <input
                  type="number"
                  min="1"
                  value={numeroBoquillas}
                  onChange={(e) => setNumeroBoquillas(parseInt(e.target.value) || 1)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400">Arco turbo nebulizador (ej. 16 pastillas)</span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Superficie Cuartel a Tratar (ha):</label>
                <input
                  type="number"
                  step="0.1"
                  value={superficieCuartelHa}
                  onChange={(e) => setSuperficieCuartelHa(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
              </div>

              <div className="sm:col-span-2 grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Dosis Recomendada por Ha:</label>
                  <input
                    type="number"
                    step="0.05"
                    value={dosisHa}
                    onChange={(e) => setDosisHa(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Unidad de Medida:</label>
                  <select
                    value={unidadDosis}
                    onChange={(e) => setUnidadDosis(e.target.value as any)}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-bold"
                  >
                    <option value="kg">kg (Kilos)</option>
                    <option value="L">L (Litros)</option>
                    <option value="cc">cc (Centímetros cúbicos)</option>
                    <option value="gramos">gramos</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta de Resultados */}
          <div className="space-y-4">
            <div className="bg-emerald-950 text-white rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-800 pb-2">
                <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                  Resultados de Calibración
                </span>
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-emerald-900/60 rounded-xl border border-emerald-800">
                  <div className="text-[10px] text-emerald-300 uppercase font-bold">Caudal por Boquilla</div>
                  <div className="text-2xl font-black text-white">
                    {caudalPorBoquillaLMin} <span className="text-xs font-normal text-emerald-200">L/min</span>
                  </div>
                  <div className="text-[11px] text-emerald-200 mt-1 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: boquillaSugerida.hex }}></span>
                    <span>Sugerida: <strong>{boquillaSugerida.color}</strong></span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-900/60 rounded-xl border border-emerald-800">
                  <div className="text-[10px] text-emerald-300 uppercase font-bold">Dosis por Estancada ({estanqueCapacidadL} L)</div>
                  <div className="text-2xl font-black text-emerald-300">
                    {productoPorEstanque} <span className="text-xs font-semibold text-white">{unidadDosis}</span>
                  </div>
                  <div className="text-[11px] text-emerald-200 mt-1">
                    Para 1/2 estanque: <strong>{(productoPorEstanque / 2).toFixed(2)} {unidadDosis}</strong>
                  </div>
                </div>

                <div className="p-3 bg-emerald-900/60 rounded-xl border border-emerald-800 space-y-1 text-xs">
                  <div className="flex justify-between text-emerald-200">
                    <span>Hectáreas por estanque:</span>
                    <strong className="text-white">{hectareasPorEstanque} ha</strong>
                  </div>
                  <div className="flex justify-between text-emerald-200">
                    <span>Estanques para {superficieCuartelHa} ha:</span>
                    <strong className="text-white">{estanquesNecesarios} estancadas</strong>
                  </div>
                  <div className="flex justify-between text-emerald-200">
                    <span>Tiempo de vaciado:</span>
                    <strong className="text-white">{minutosVaciadoEstanque} min</strong>
                  </div>
                  <div className="flex justify-between text-emerald-200">
                    <span>Caudal total aguilón:</span>
                    <strong className="text-white">{caudalTotalLMin} L/min</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Acreditación SAG:</strong> Antes de aplicar, verificar en probeta graduada que el gasto real de cada pastilla no difiera en más de ±5% respecto al caudal nominal calculado ({caudalPorBoquillaLMin} L/min).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. RIEGO & DEMANDA ETo */}
      {activeTab === 'riego' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-cyan-700" />
                  Balance Hídrico & Tiempo de Bombeo (Penman-Monteith)
                </h2>
                <p className="text-[11px] text-stone-400">
                  Cálculo de reposición de lámina según ETo de la estación y coeficiente de cultivo (Kc)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEtoMmDia(etoClimaActual)}
                className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="Tomar lectura de ETo en vivo de la estación meteorológica"
              >
                <RefreshCw className="w-3 h-3 text-cyan-700" />
                <span>Usar ETo Estación ({etoClimaActual} mm)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Evapotranspiración ETo (mm/día):</label>
                <input
                  type="number"
                  step="0.1"
                  value={etoMmDia}
                  onChange={(e) => setEtoMmDia(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Etapa Fenológica (Kc Kiwi Hayward):</label>
                <select
                  value={kcKiwi}
                  onChange={(e) => setKcKiwi(parseFloat(e.target.value))}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-bold"
                >
                  <option value={0.35}>Brotación y hojas tiernas (Kc 0.35)</option>
                  <option value={0.60}>Botón floral y prefloración (Kc 0.60)</option>
                  <option value={0.85}>Floración y caída de pétalos (Kc 0.85)</option>
                  <option value={1.05}>Crecimiento activo del fruto (Kc 1.05 - Verano)</option>
                  <option value={1.15}>Llenado de fruto y acumulación azúcares (Kc 1.15)</option>
                  <option value={0.50}>Post-cosecha y senescencia (Kc 0.50)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Superficie del Sector (ha):</label>
                <input
                  type="number"
                  step="0.1"
                  value={superficieRiegoHa}
                  onChange={(e) => setSuperficieRiegoHa(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Caudal del Pozo / Bomba (L/s):</label>
                <input
                  type="number"
                  step="0.5"
                  value={caudalPozoLs}
                  onChange={(e) => setCaudalPozoLs(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2 grid grid-cols-3 gap-2 pt-2 border-t border-stone-100">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Caudal Gotero (L/h):</label>
                  <input
                    type="number"
                    step="0.2"
                    value={goteroCaudalLh}
                    onChange={(e) => setGoteroCaudalLh(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Distancia Goteros (m):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={goteroDistanciaM}
                    onChange={(e) => setGoteroDistanciaM(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Líneas por Hilera:</label>
                  <select
                    value={lineasPorHilera}
                    onChange={(e) => setLineasPorHilera(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-bold"
                  >
                    <option value={1}>1 línea por hilera</option>
                    <option value={2}>2 líneas (doble línea goteo)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta de Resultados Riego */}
          <div className="bg-cyan-950 text-white rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-800 pb-2">
              <span className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider">
                Tiempo & Lámina de Riego
              </span>
              <Droplet className="w-4 h-4 text-cyan-300" />
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-cyan-900/60 rounded-xl border border-cyan-800">
                <div className="text-[10px] text-cyan-300 uppercase font-bold">Tiempo de Riego Recomendado</div>
                <div className="text-3xl font-black text-white">
                  {horasBombeoEstimadas} <span className="text-xs font-normal text-cyan-200">horas de bomba</span>
                </div>
                <div className="text-[11px] text-cyan-200 mt-1">
                  Basado en caudal de pozo ({caudalPozoLs} L/s)
                </div>
              </div>

              <div className="p-3 bg-cyan-900/60 rounded-xl border border-cyan-800">
                <div className="text-[10px] text-cyan-300 uppercase font-bold">Demanda Diaria Neta (ETc)</div>
                <div className="text-2xl font-black text-cyan-300">
                  {etcDemandaNetaMm} <span className="text-xs font-normal text-white">mm/día</span>
                </div>
                <div className="text-[11px] text-cyan-200 mt-1">
                  Lámina Bruta a reponer: <strong>{laminaBrutaMm} mm</strong>
                </div>
              </div>

              <div className="p-3 bg-cyan-900/60 rounded-xl border border-cyan-800 space-y-1 text-xs">
                <div className="flex justify-between text-cyan-200">
                  <span>Volumen total turno:</span>
                  <strong className="text-white">{m3TotalesTurno} m³</strong>
                </div>
                <div className="flex justify-between text-cyan-200">
                  <span>Litros totales de agua:</span>
                  <strong className="text-white">{(m3TotalesTurno * 1000).toLocaleString('es-CL')} L</strong>
                </div>
                <div className="flex justify-between text-cyan-200">
                  <span>Precipitación del sistema:</span>
                  <strong className="text-white">{precipitacionSistemaMmH} mm/hora</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. FERTIRRIEGO & UNIDADES NUTRICIONALES */}
      {activeTab === 'fertirriego' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-purple-700" />
                  Calculadora de Fertirriego & Unidades de Fertilizante (U.F.)
                </h2>
                <p className="text-[11px] text-stone-400">
                  Convierte requerimientos nutricionales (N, P, K, Ca) a kilos de fertilizantes comerciales reales
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold text-[10px]">
                Nutrición Kiwi Hayward
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">U.F. Nitrógeno (N):</label>
                <input
                  type="number"
                  value={ufNitrogeno}
                  onChange={(e) => setUfNitrogeno(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">U.F. Fósforo (P₂O₅):</label>
                <input
                  type="number"
                  value={ufFosforo}
                  onChange={(e) => setUfFosforo(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">U.F. Potasio (K₂O):</label>
                <input
                  type="number"
                  value={ufPotasio}
                  onChange={(e) => setUfPotasio(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">U.F. Calcio (CaO):</label>
                <input
                  type="number"
                  value={ufCalcio}
                  onChange={(e) => setUfCalcio(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block font-bold text-stone-700 mb-1 text-xs">Superficie a Fertirregar (ha):</label>
              <input
                type="number"
                step="0.1"
                value={haFertirriego}
                onChange={(e) => setHaFertirriego(parseFloat(e.target.value) || 0)}
                className="w-full sm:w-1/2 p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono text-xs font-bold"
              />
            </div>

            {/* Alerta de Incompatibilidad Química */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div>
                <strong>Regla de Oro en Fertirriego:</strong> ¡NUNCA mezclar Nitrato de Calcio con Sulfato de Potasio o Fosfatos en el mismo estanque concentrado! Precipitan formando Sulfato de Calcio (yeso insoluble) que tapa los goteros. Disolver y aplicar en tanques separados (Tanque A y Tanque B).
              </div>
            </div>
          </div>

          {/* Tarjeta de Kilos de Fertilizante Comercial */}
          <div className="bg-purple-950 text-white rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-purple-800 pb-2">
              <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">
                Fertilizantes Comerciales a Inyectar
              </span>
              <FlaskConical className="w-4 h-4 text-purple-300" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-purple-900/60 rounded-xl border border-purple-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">Nitrato de Calcio (Calcinit)</div>
                  <div className="text-[10px] text-purple-300">15.5% N + 26.5% CaO</div>
                </div>
                <div className="text-xl font-black text-purple-200 font-mono">
                  {kgCalcinit} <span className="text-xs font-normal">kg</span>
                </div>
              </div>

              <div className="p-3 bg-purple-900/60 rounded-xl border border-purple-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">Sulfato de Potasio Soluble</div>
                  <div className="text-[10px] text-purple-300">50% K₂O + 18% S</div>
                </div>
                <div className="text-xl font-black text-purple-200 font-mono">
                  {kgSulfatoPotasio} <span className="text-xs font-normal">kg</span>
                </div>
              </div>

              <div className="p-3 bg-purple-900/60 rounded-xl border border-purple-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">Fosfato Monoamónico (MAP)</div>
                  <div className="text-[10px] text-purple-300">12% N + 61% P₂O₅</div>
                </div>
                <div className="text-xl font-black text-purple-200 font-mono">
                  {kgMap} <span className="text-xs font-normal">kg</span>
                </div>
              </div>

              <div className="p-3 bg-purple-900/60 rounded-xl border border-purple-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">Urea Soluble (Complemento N)</div>
                  <div className="text-[10px] text-purple-300">46% Nitrógeno</div>
                </div>
                <div className="text-xl font-black text-purple-200 font-mono">
                  {kgUrea} <span className="text-xs font-normal">kg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. COSECHA & RALEO */}
      {activeTab === 'cosecha_raleo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-700" />
                  Estimación de Rendimiento, Carga & Raleo de Kiwis
                </h2>
                <p className="text-[11px] text-stone-400">
                  Calcula la intensidad de raleo y proyecta los kilos/planta y toneladas/ha esperadas
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px]">
                Kiwi Hayward
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Cargadores por Planta:</label>
                <input
                  type="number"
                  value={cargadoresPorPlanta}
                  onChange={(e) => setCargadoresPorPlanta(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Yemas por Cargador:</label>
                <input
                  type="number"
                  value={yemasPorCargador}
                  onChange={(e) => setYemasPorCargador(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Brotación Efectiva (%):</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={porcentajeBrotacion}
                  onChange={(e) => setPorcentajeBrotacion(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Frutos Cuajados/Brote:</label>
                <input
                  type="number"
                  step="0.1"
                  value={frutosPorBrote}
                  onChange={(e) => setFrutosPorBrote(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Frutos Objetivo/Planta:</label>
                <input
                  type="number"
                  value={frutosObjetivoPlanta}
                  onChange={(e) => setFrutosObjetivoPlanta(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Calibre / Peso Medio (g):</label>
                <select
                  value={pesoFrutoGramos}
                  onChange={(e) => setPesoFrutoGramos(parseInt(e.target.value))}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-bold"
                >
                  <option value={135}>Calibre 27 (~135 g)</option>
                  <option value={122}>Calibre 30 (~122 g - Óptimo)</option>
                  <option value={108}>Calibre 33 (~108 g)</option>
                  <option value={96}>Calibre 36 (~96 g)</option>
                  <option value={85}>Calibre 39 (~85 g)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tarjeta Resultados Cosecha */}
          <div className="bg-amber-950 text-white rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-amber-800 pb-2">
              <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                Proyección de Cosecha & Raleo
              </span>
              <Scale className="w-4 h-4 text-amber-300" />
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-amber-900/60 rounded-xl border border-amber-800">
                <div className="text-[10px] text-amber-300 uppercase font-bold">Rendimiento Proyectado</div>
                <div className="text-3xl font-black text-amber-200">
                  {toneladasPorHa} <span className="text-xs font-normal text-white">Ton/ha</span>
                </div>
                <div className="text-[11px] text-amber-200 mt-1">
                  Kilos por planta: <strong>{kilosPorPlanta} kg/pl</strong> ({plantasPorHaCalc} pl/ha)
                </div>
              </div>

              <div className="p-3 bg-amber-900/60 rounded-xl border border-amber-800 space-y-1 text-xs">
                <div className="flex justify-between text-amber-200">
                  <span>Frutos potenciales:</span>
                  <strong className="text-white">{frutosPotencialesPlanta} frutos/pl</strong>
                </div>
                <div className="flex justify-between text-amber-200">
                  <span>Frutos a ralear:</span>
                  <strong className="text-rose-300">{frutosARalear} frutos/pl ({porcentajeRaleo}%)</strong>
                </div>
                <div className="flex justify-between text-amber-200">
                  <span>Bines estimados ({superficieCuartelHa} ha):</span>
                  <strong className="text-white">{totalBinesCuartel} bines (400kg)</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. HORAS FRÍO & ROMPEDOR */}
      {activeTab === 'horas_frio' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-blue-700" />
                  Calculadora de Horas Frío & Dosis de Cianamida Hidrogenada
                </h2>
                <p className="text-[11px] text-stone-400">
                  Evaluación de receso invernal y dosificación de rompedores de dormancia
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[10px]">
                Weinberger (&lt; 7.2°C)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Horas Frío Acumuladas:</label>
                <input
                  type="number"
                  value={horasFrioAcumuladas}
                  onChange={(e) => setHorasFrioAcumuladas(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Requerimiento Varietal (HF):</label>
                <input
                  type="number"
                  value={metaHorasFrio}
                  onChange={(e) => setMetaHorasFrio(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
                <span className="text-[10px] text-stone-400">Kiwi Hayward: 800 a 950 HF</span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Concentración Rompedor (%):</label>
                <input
                  type="number"
                  step="0.5"
                  value={porcentajeDormex}
                  onChange={(e) => setPorcentajeDormex(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400">Cianamida Hidrogenada: 2.5% a 4.0%</span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Mojamiento Requerido (L/ha):</label>
                <input
                  type="number"
                  step="100"
                  value={mojamientoDormexLHa}
                  onChange={(e) => setMojamientoDormexLHa(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-950 text-white rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-blue-800 pb-2">
              <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">
                Diagnóstico de Salida de Receso
              </span>
              <Snowflake className="w-4 h-4 text-blue-300" />
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-blue-900/60 rounded-xl border border-blue-800">
                <div className="text-[10px] text-blue-300 uppercase font-bold">Cumplimiento de Frío</div>
                <div className="text-3xl font-black text-white">
                  {cumplimientoHF}%
                </div>
                <div className="text-[11px] text-blue-200 mt-1">
                  Déficit: <strong>{deficitHF} Horas Frío</strong>
                </div>
              </div>

              <div className="p-3 bg-blue-900/60 rounded-xl border border-blue-800 space-y-1 text-xs">
                <div className="flex justify-between text-blue-200">
                  <span>Dosis producto comercial:</span>
                  <strong className="text-white">{litrosDormexHa} L/ha</strong>
                </div>
                <div className="flex justify-between text-blue-200">
                  <span>Ventana óptima aplicación:</span>
                  <strong className="text-amber-300">30 a 40 días pre-brotación</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. POLINIZACIÓN */}
      {activeTab === 'polinizacion' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                  <Flower2 className="w-4 h-4 text-rose-700" />
                  Calculadora de Colmenas & Polen Asistido
                </h2>
                <p className="text-[11px] text-stone-400">
                  Dotación recomendada de abejas melíferas, abejorros Bombus y polen en suspensión
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10px]">
                Polinización Cruzada
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Colmenas Apis (por ha):</label>
                <input
                  type="number"
                  value={colmenasPorHaApis}
                  onChange={(e) => setColmenasPorHaApis(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400">Recomendado: 8 a 12 colm/ha</span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Colmenas Bombus (por ha):</label>
                <input
                  type="number"
                  value={colmenasPorHaBombus}
                  onChange={(e) => setColmenasPorHaBombus(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
                <span className="text-[10px] text-stone-400">Para días fríos/nublados</span>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Polen Comercial (g/ha):</label>
                <input
                  type="number"
                  step="50"
                  value={gramosPolenHa}
                  onChange={(e) => setGramosPolenHa(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
                <span className="text-[10px] text-stone-400">Aspersión asistida</span>
              </div>
            </div>
          </div>

          <div className="bg-rose-950 text-white rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-rose-800 pb-2">
              <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">
                Total para el Huerto ({superficieCuartelHa} ha)
              </span>
              <Flower2 className="w-4 h-4 text-rose-300" />
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-rose-900/60 rounded-xl border border-rose-800 space-y-1 text-xs">
                <div className="flex justify-between text-rose-200">
                  <span>Colmenas Apis Mellifera:</span>
                  <strong className="text-xl font-black text-white">{totalApis} colmenas</strong>
                </div>
                <div className="flex justify-between text-rose-200">
                  <span>Colmenas Bombus:</span>
                  <strong className="text-white">{totalBombus} colmenas</strong>
                </div>
                <div className="flex justify-between text-rose-200">
                  <span>Polen puro requerido:</span>
                  <strong className="text-amber-300">{totalPolenKg} kg de polen</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
