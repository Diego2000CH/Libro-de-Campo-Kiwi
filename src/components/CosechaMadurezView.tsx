import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  LiquidacionPacking,
  MuestreoMadurez,
  OrdenTrabajoFitosanitaria,
  Parcela,
  RegistroCosechaLote,
  RegistroLabor,
} from '../types/campo';
import {
  Apple,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Truck,
  Gauge,
  Trash2,
  Award,
  QrCode,
  Package,
  Printer,
  X,
  ShieldCheck,
} from 'lucide-react';

interface CosechaMadurezViewProps {
  fundoNombre?: string;
  parcelas: Parcela[];
  muestreos: MuestreoMadurez[];
  onAddMuestreo: (muestreo: MuestreoMadurez) => void;
  onDeleteMuestreo: (id: string) => void;
  cosechas: RegistroCosechaLote[];
  onAddCosecha: (cosecha: RegistroCosechaLote) => void;
  onDeleteCosecha: (id: string) => void;
  liquidaciones?: LiquidacionPacking[];
  onAddLiquidacion?: (l: LiquidacionPacking) => void;
  onDeleteLiquidacion?: (id: string) => void;
  labores?: RegistroLabor[];
  ordenesTrabajo?: OrdenTrabajoFitosanitaria[];
  activeUserName?: string;
  canEdit?: boolean;
}

export const CosechaMadurezView: React.FC<CosechaMadurezViewProps> = ({
  fundoNombre = 'Mi Huerto de Kiwis',
  parcelas,
  muestreos,
  onAddMuestreo,
  onDeleteMuestreo,
  cosechas,
  onAddCosecha,
  onDeleteCosecha,
  liquidaciones = [],
  onAddLiquidacion,
  onDeleteLiquidacion,
  labores = [],
  ordenesTrabajo = [],
  activeUserName,
  canEdit = true,
}) => {
  const [activeTabSub, setActiveTabSub] = useState<'madurez' | 'cosecha_bins' | 'liquidaciones'>('madurez');
  const [isNewMuestreoOpen, setIsNewMuestreoOpen] = useState(false);
  const [isNewCosechaOpen, setIsNewCosechaOpen] = useState(false);
  const [isNewLiquidacionOpen, setIsNewLiquidacionOpen] = useState(false);

  // Pasaporte QR de Trazabilidad
  const [qrLoteSeleccionado, setQrLoteSeleccionado] = useState<RegistroCosechaLote | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Formulario nuevo muestreo
  const [muestreoForm, setMuestreoForm] = useState({
    parcelaId: parcelas[0]?.id || '',
    gradosBrixPromedio: 6.2,
    solidoSolubleMin: 5.9,
    solidoSolubleMax: 6.5,
    firmezaPulpaLb: 15.5,
    porcentajeMateriaSeca: 16.0,
    numeroMuestras: 30,
    observaciones: '',
  });

  // Formulario nueva cosecha
  const [cosechaForm, setCosechaForm] = useState({
    parcelaId: parcelas[0]?.id || '',
    cantidadBins: 0,
    cuadrilla: '',
    calibrePredominante: '',
    packingDestino: '',
    numeroGuiaDespacho: `GD-${Math.floor(10000 + Math.random() * 90000)}`,
    choferCamion: '',
    patenteCamion: '',
    observaciones: '',
  });

  // Formulario nueva liquidación packing
  const [liqForm, setLiqForm] = useState({
    cosechaLoteId: cosechas[0]?.id || '',
    numeroGuiaDespacho: cosechas[0]?.numeroGuiaDespacho || '',
    fechaLiquidacion: new Date().toISOString().split('T')[0],
    parcelaId: cosechas[0]?.parcelaId || parcelas[0]?.id || '',
    packingExportadora: cosechas[0]?.packingDestino || '',
    kilosRecibidosKg: cosechas[0]?.pesoNetoKgEstimado || 0,
    kilosEmbaladosExportacionKg: 0,
    cajasExportables: 0,
    distribucionCalibres: '',
    retornoTotalUSD: 0,
    tipoCambioCLP: 950,
    estado: 'Liquidado' as LiquidacionPacking['estado'],
    observaciones: '',
  });

  const totalBinsCosechados = cosechas.reduce((acc, c) => acc + c.cantidadBins, 0);
  const totalKilosCosechados = cosechas.reduce((acc, c) => acc + c.pesoNetoKgEstimado, 0);

  const ultimoPacking = cosechas[0]?.packingDestino || '—';
  const ultimoCalibre = cosechas[0]?.calibrePredominante || '—';

  // Métricas de Recepción Packing (físicas, sin precios)
  const totalKgRecibidosLiq = liquidaciones.reduce((acc, l) => acc + l.kilosRecibidosKg, 0);
  const totalKgExportablesLiq = liquidaciones.reduce((acc, l) => acc + l.kilosEmbaladosExportacionKg, 0);
  const pctExportableGlobal =
    totalKgRecibidosLiq > 0 ? ((totalKgExportablesLiq / totalKgRecibidosLiq) * 100).toFixed(1) : '0.0';
  const totalCajasExportables = liquidaciones.reduce((acc, l) => acc + (l.cajasExportables || 0), 0);
  const totalKgDescarte = liquidaciones.reduce(
    (acc, l) => acc + (l.kilosDescarteKg ?? Math.max(0, l.kilosRecibidosKg - l.kilosEmbaladosExportacionKg)),
    0
  );

  // Auditoría de Trazabilidad para un lote específico (Brix + Carencia SAG + Riego + Liquidación)
  const trazabilidadLote = useMemo(() => {
    if (!qrLoteSeleccionado) return null;
    const fechaCosechaMs = Date.parse(qrLoteSeleccionado.fecha);
    const parcela = parcelas.find((p) => p.id === qrLoteSeleccionado.parcelaId);

    const muestreoPrevio = muestreos
      .filter((m) => m.parcelaId === qrLoteSeleccionado.parcelaId)
      .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))[0];

    // Buscar aplicaciones fitosanitarias del cuartel y verificar carencia
    const aplicacionesFito = labores.filter(
      (l) => l.parcelaId === qrLoteSeleccionado.parcelaId && l.tipoLabor === 'fitosanitario'
    );
    const ordenesCuartel = ordenesTrabajo.filter(
      (o) => o.parcelaIds.includes(qrLoteSeleccionado.parcelaId) && o.estado !== 'cancelada'
    );

    const carenciasVioladas: string[] = [];
    for (const app of aplicacionesFito) {
      const carencia = app.periodoCarenciaDias || 0;
      if (carencia > 0) {
        const appMs = Date.parse(app.fecha);
        if (Number.isFinite(appMs) && Number.isFinite(fechaCosechaMs)) {
          const diasTranscurridos = Math.floor((fechaCosechaMs - appMs) / 86400000);
          if (diasTranscurridos >= 0 && diasTranscurridos < carencia) {
            carenciasVioladas.push(
              `${app.nombreInsumo || app.descripcion} (${diasTranscurridos}/${carencia} días)`
            );
          }
        }
      }
    }
    for (const ord of ordenesCuartel) {
      const carencia = ord.carenciaDias || 0;
      const fechaRef = ord.fechaEjecucion || ord.fechaProgramada;
      if (carencia > 0 && fechaRef) {
        const appMs = Date.parse(fechaRef);
        if (Number.isFinite(appMs) && Number.isFinite(fechaCosechaMs)) {
          const diasTranscurridos = Math.floor((fechaCosechaMs - appMs) / 86400000);
          if (diasTranscurridos >= 0 && diasTranscurridos < carencia) {
            carenciasVioladas.push(`${ord.nombreInsumo} (${diasTranscurridos}/${carencia} días)`);
          }
        }
      }
    }

    const liquidacionAsociada = liquidaciones.find(
      (l) =>
        l.cosechaLoteId === qrLoteSeleccionado.id ||
        l.numeroGuiaDespacho === qrLoteSeleccionado.numeroGuiaDespacho
    );

    return {
      parcela,
      muestreoPrevio,
      brixOk: muestreoPrevio ? muestreoPrevio.gradosBrixPromedio >= 6.2 : null,
      carenciasVioladas,
      lmrCumple: carenciasVioladas.length === 0,
      ultimasAplicacionesCount: aplicacionesFito.length + ordenesCuartel.length,
      liquidacionAsociada,
    };
  }, [qrLoteSeleccionado, parcelas, muestreos, labores, ordenesTrabajo, liquidaciones]);

  // Generar código QR real con la info de trazabilidad del lote
  useEffect(() => {
    if (!qrLoteSeleccionado || !trazabilidadLote) {
      setQrDataUrl('');
      return;
    }

    const payloadTexto = [
      `TRAZABILIDAD HUERTO: ${fundoNombre}`,
      `GUIA/LOTE: ${qrLoteSeleccionado.numeroGuiaDespacho}`,
      `FECHA COSECHA: ${qrLoteSeleccionado.fecha}`,
      `CUARTEL: ${qrLoteSeleccionado.parcelaNombre}`,
      `BINS/KG: ${qrLoteSeleccionado.cantidadBins} bins / ${qrLoteSeleccionado.pesoNetoKgEstimado} kg`,
      `MADUREZ BRIX: ${trazabilidadLote.muestreoPrevio ? `${trazabilidadLote.muestreoPrevio.gradosBrixPromedio}° Brix` : 'Sin muestreo'}`,
      `CARENCIA SAG/LMR: ${trazabilidadLote.lmrCumple ? 'CUMPLE (0 dias carencia)' : `ALERTA: ${trazabilidadLote.carenciasVioladas.join(', ')}`}`,
      `DESTINO: ${qrLoteSeleccionado.packingDestino || 'Sin destino'}`,
    ].join('\n');

    QRCode.toDataURL(payloadTexto, {
      width: 240,
      margin: 2,
      color: { dark: '#064e3b', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('Error generando QR:', err));
  }, [qrLoteSeleccionado, trazabilidadLote, fundoNombre]);

  const handleGuardarMuestreo = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parcelas.find((item) => item.id === muestreoForm.parcelaId);
    const brix = Number(muestreoForm.gradosBrixPromedio);
    const aptoSAG = brix >= 6.2;

    const nuevo: MuestreoMadurez = {
      id: `mm-${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
      parcelaId: muestreoForm.parcelaId,
      parcelaNombre: p ? p.nombre : 'Cuartel',
      gradosBrixPromedio: brix,
      solidoSolubleMin: Number(muestreoForm.solidoSolubleMin),
      solidoSolubleMax: Number(muestreoForm.solidoSolubleMax),
      firmezaPulpaLb: Number(muestreoForm.firmezaPulpaLb),
      porcentajeMateriaSeca: Number(muestreoForm.porcentajeMateriaSeca),
      numeroMuestras: Number(muestreoForm.numeroMuestras),
      aptoParaCosechaSAG: aptoSAG,
      muestreadoPor: activeUserName || 'Responsable de Campo',
      observaciones: muestreoForm.observaciones,
    };

    onAddMuestreo(nuevo);
    setIsNewMuestreoOpen(false);
  };

  const handleGuardarCosecha = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parcelas.find((item) => item.id === cosechaForm.parcelaId);
    const bins = Number(cosechaForm.cantidadBins);
    const kilos = bins * 390;

    const nuevo: RegistroCosechaLote = {
      id: `cos-${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
      parcelaId: cosechaForm.parcelaId,
      parcelaNombre: p ? p.nombre : 'Cuartel',
      cantidadBins: bins,
      pesoNetoKgEstimado: kilos,
      cuadrilla: cosechaForm.cuadrilla,
      calibrePredominante: cosechaForm.calibrePredominante,
      packingDestino: cosechaForm.packingDestino,
      numeroGuiaDespacho: cosechaForm.numeroGuiaDespacho,
      choferCamion: cosechaForm.choferCamion,
      patenteCamion: cosechaForm.patenteCamion,
      estado: 'despachado_packing',
      observaciones: cosechaForm.observaciones,
    };

    onAddCosecha(nuevo);
    setIsNewCosechaOpen(false);
  };

  const handleSelectLoteParaLiq = (cosechaId: string) => {
    const lote = cosechas.find((c) => c.id === cosechaId);
    if (!lote) {
      setLiqForm((prev) => ({ ...prev, cosechaLoteId: cosechaId }));
      return;
    }
    setLiqForm((prev) => ({
      ...prev,
      cosechaLoteId: lote.id,
      numeroGuiaDespacho: lote.numeroGuiaDespacho,
      parcelaId: lote.parcelaId,
      packingExportadora: lote.packingDestino,
      kilosRecibidosKg: lote.pesoNetoKgEstimado,
    }));
  };

  const handleGuardarLiquidacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddLiquidacion) return;
    const p = parcelas.find((item) => item.id === liqForm.parcelaId);
    const kgRec = Number(liqForm.kilosRecibidosKg) || 0;
    const kgExp = Number(liqForm.kilosEmbaladosExportacionKg) || 0;
    const kgDesc = Math.max(0, kgRec - kgExp);
    const pctExp = kgRec > 0 ? Number(((kgExp / kgRec) * 100).toFixed(1)) : 0;

    onAddLiquidacion({
      id: `liq-${Date.now()}`,
      cosechaLoteId: liqForm.cosechaLoteId || undefined,
      numeroGuiaDespacho: liqForm.numeroGuiaDespacho.trim(),
      fechaLiquidacion: liqForm.fechaLiquidacion,
      parcelaId: liqForm.parcelaId,
      parcelaNombre: p ? p.nombre : 'Cuartel',
      packingExportadora: liqForm.packingExportadora.trim(),
      kilosRecibidosKg: kgRec,
      kilosEmbaladosExportacionKg: kgExp,
      kilosDescarteKg: kgDesc,
      porcentajeExportable: pctExp,
      cajasExportables: Number(liqForm.cajasExportables) || 0,
      distribucionCalibres: liqForm.distribucionCalibres.trim(),
      retornoTotalUSD: 0,
      tipoCambioCLP: 0,
      retornoTotalCLP: 0,
      precioPromedioUSDKg: 0,
      estado: liqForm.estado,
      observaciones: liqForm.observaciones.trim() || undefined,
    });
    setIsNewLiquidacionOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Award className="w-3 h-3" />
            Resolución SAG · Trazabilidad QR &amp; Packing
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Cosecha, Madurez (°Brix), Trazabilidad QR &amp; Packing
          </h1>
          <p className="text-xs text-stone-500">
            Control de sólidos solubles (mín. 6.2° Brix), pasaporte QR por guía con verificación automática de LMR y recepción de fruta en packing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold flex flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTabSub('madurez')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTabSub === 'madurez' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              °Brix & Madurez SAG
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSub('cosecha_bins')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTabSub === 'cosecha_bins' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Bins, Guías & QR ({cosechas.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTabSub('liquidaciones')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTabSub === 'liquidaciones' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Recepción Packing ({liquidaciones.length})
            </button>
          </div>

          {canEdit && activeTabSub === 'madurez' && (
            <button
              type="button"
              onClick={() => setIsNewMuestreoOpen(true)}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Muestreo °Brix</span>
            </button>
          )}
          {canEdit && activeTabSub === 'cosecha_bins' && (
            <button
              type="button"
              onClick={() => setIsNewCosechaOpen(true)}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Despacho Bins</span>
            </button>
          )}
          {canEdit && activeTabSub === 'liquidaciones' && onAddLiquidacion && (
            <button
              type="button"
              onClick={() => setIsNewLiquidacionOpen(true)}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Recepción Packing</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-PESTAÑA 1: Madurez y Grados Brix */}
      {activeTabSub === 'madurez' && (
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-stone-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm shrink-0">
                6.2°
              </div>
              <div>
                <div className="font-bold text-sm text-emerald-950">Umbral Mínimo Obligatorio de Cosecha: 6.2° Brix</div>
                <div className="text-[11px] text-emerald-800">
                  Ningún lote de Kiwi Hayward puede cosecharse con menos de 6.2° Brix según normativa SAG y Comité del Kiwi. Firmeza objetivo: 14.0 a 16.5 lb.
                </div>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-800 text-white font-mono font-bold text-[11px] whitespace-nowrap">
              Norma SAG Vigente
            </div>
          </div>

          {parcelas.length === 0 ? (
            <div className="p-8 bg-white border border-stone-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto text-xl">
                🥝
              </div>
              <h3 className="font-bold text-stone-800 text-sm">Tu huerto aún no tiene cuarteles creados</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Para comenzar con tu huerto real, ve a la pestaña <strong>Cuarteles & Mapa</strong> y agrega tus cuarteles reales.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {parcelas.map((p) => {
                const ultimoMuestreo = muestreos
                  .filter((m) => m.parcelaId === p.id)
                  .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

                const brix = ultimoMuestreo ? ultimoMuestreo.gradosBrixPromedio : 0;
                const apto = ultimoMuestreo ? brix >= 6.2 : false;

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      !ultimoMuestreo
                        ? 'bg-white border-stone-200 text-stone-800 shadow-2xs'
                        : apto
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-2xs'
                        : 'bg-amber-50/70 border-amber-300 text-amber-950 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs truncate">{p.nombre}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          !ultimoMuestreo
                            ? 'bg-stone-200 text-stone-700'
                            : apto
                            ? 'bg-emerald-800 text-white'
                            : 'bg-amber-700 text-white'
                        }`}
                      >
                        {!ultimoMuestreo ? 'SIN MUESTREO' : apto ? 'AUTORIZADO SAG' : 'EN MADURACIÓN'}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 my-2">
                      <span className="text-3xl font-black">{ultimoMuestreo ? `${brix.toFixed(1)}°` : '—'}</span>
                      <span className="text-xs font-semibold opacity-70">Brix prom.</span>
                    </div>

                    <div className="space-y-1 text-[11px] opacity-80 pt-1 border-t border-current/10">
                      <div className="flex justify-between">
                        <span>Firmeza penetrómetro:</span>
                        <strong className="font-mono">{ultimoMuestreo ? `${ultimoMuestreo.firmezaPulpaLb} lb` : '—'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Materia Seca (% MS):</span>
                        <strong className="font-mono">{ultimoMuestreo ? `${ultimoMuestreo.porcentajeMateriaSeca}%` : '—'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Último muestreo:</span>
                        <span className="font-mono">{ultimoMuestreo?.fecha || 'Sin fecha'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Historial de Muestreos */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-700" />
                Historial de Mediciones de Madurez y Refractómetro
              </h2>
              <span className="text-xs text-stone-400">{muestreos.length} muestreos oficiales</span>
            </div>

            {muestreos.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                No hay muestreos de madurez registrados aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Cuartel</th>
                      <th className="px-4 py-3">°Brix Prom.</th>
                      <th className="px-4 py-3">Rango Min-Max</th>
                      <th className="px-4 py-3">Firmeza (lb)</th>
                      <th className="px-4 py-3">% Mat. Seca</th>
                      <th className="px-4 py-3">Estado SAG</th>
                      <th className="px-4 py-3">Responsable</th>
                      {canEdit && <th className="px-4 py-3 text-right">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {muestreos.map((m) => (
                      <tr key={m.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium">{m.fecha}</td>
                        <td className="px-4 py-3 font-semibold text-stone-900">{m.parcelaNombre}</td>
                        <td className="px-4 py-3 font-bold text-sm text-emerald-900">{m.gradosBrixPromedio}°</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-stone-500">
                          {m.solidoSolubleMin}° - {m.solidoSolubleMax}°
                        </td>
                        <td className="px-4 py-3 font-mono">{m.firmezaPulpaLb} lb</td>
                        <td className="px-4 py-3 font-mono">{m.porcentajeMateriaSeca}%</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.aptoParaCosechaSAG ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.aptoParaCosechaSAG ? 'Apto SAG (≥6.2°)' : 'Bajo 6.2° Brix'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{m.muestreadoPor}</td>
                        {canEdit && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => onDeleteMuestreo(m.id)}
                              className="p-1 text-stone-400 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                              title="Eliminar registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-PESTAÑA 2: Cosecha, Despacho de Bins & Trazabilidad QR */}
      {activeTabSub === 'cosecha_bins' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Total Bins Cosechados</div>
              <div className="text-2xl font-black text-stone-900 mt-1">{totalBinsCosechados} bins</div>
              <div className="text-[11px] text-stone-500 mt-0.5">~390 kg de fruta limpia / bin</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Kilos Netos Estimados</div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{(totalKilosCosechados / 1000).toFixed(1)} ton</div>
              <div className="text-[11px] text-stone-500 mt-0.5">{totalKilosCosechados.toLocaleString('es-CL')} kg despachados</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Último Packing Destino</div>
              <div className="text-base font-bold text-stone-900 mt-1 truncate">{ultimoPacking}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Exportadora registrada</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Último Calibre Declarado</div>
              <div className="text-base font-bold text-stone-900 mt-1 truncate">{ultimoCalibre}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Según despacho más reciente</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-700" />
                Guías de Despacho & Pasaporte QR de Trazabilidad
              </h2>
              <span className="text-xs text-stone-400">{cosechas.length} despachos registrados</span>
            </div>

            {cosechas.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                Aún no hay guías de despacho registradas. Registra un despacho para generar su etiqueta QR de trazabilidad completa.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Guía Despacho</th>
                      <th className="px-4 py-3">Cuartel Origen</th>
                      <th className="px-4 py-3">Bins / Kg</th>
                      <th className="px-4 py-3">Packing Destino</th>
                      <th className="px-4 py-3">Chofer / Patente</th>
                      <th className="px-4 py-3 text-right">Trazabilidad QR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {cosechas.map((c) => (
                      <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium">{c.fecha}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-950">{c.numeroGuiaDespacho}</td>
                        <td className="px-4 py-3 font-semibold text-stone-900">{c.parcelaNombre}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-stone-900">{c.cantidadBins} bins</span>
                          <div className="font-mono text-[10px] text-stone-500">{c.pesoNetoKgEstimado.toLocaleString('es-CL')} kg</div>
                        </td>
                        <td className="px-4 py-3 font-medium text-stone-900">{c.packingDestino}</td>
                        <td className="px-4 py-3 text-stone-600 text-[11px]">
                          <div>{c.choferCamion || '—'}</div>
                          <div className="font-mono text-stone-400">{c.patenteCamion || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setQrLoteSeleccionado(c)}
                              className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Ver QR</span>
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => onDeleteCosecha(c.id)}
                                className="p-1.5 text-stone-400 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                                title="Eliminar despacho"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-PESTAÑA 3: Recepción y Embalaje de Packing */}
      {activeTabSub === 'liquidaciones' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Kilos Recibidos Packing</div>
              <div className="text-2xl font-black text-stone-900 mt-1 font-mono tabular-nums">{totalKgRecibidosLiq.toLocaleString('es-CL')} kg</div>
              <div className="text-[11px] text-stone-500 mt-0.5">{liquidaciones.length} recepciones</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Embalaje Exportación</div>
              <div className="text-2xl font-black text-emerald-900 mt-1 font-mono tabular-nums">{pctExportableGlobal}%</div>
              <div className="text-[11px] text-stone-500 mt-0.5">{totalKgExportablesLiq.toLocaleString('es-CL')} kg embalados</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Cajas Embaladas</div>
              <div className="text-2xl font-black text-emerald-800 mt-1 font-mono tabular-nums">{totalCajasExportables.toLocaleString('es-CL')}</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Cajas exportación acumuladas</div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
              <div className="text-[10px] text-stone-400 font-bold uppercase">Fruta Descarte / Merma</div>
              <div className="text-2xl font-black text-stone-900 mt-1 font-mono tabular-nums">{totalKgDescarte.toLocaleString('es-CL')} kg</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Diferencia recepción vs embalado</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-700" />
                Cartolas de Recepción y Embalaje en Packing
              </h2>
            </div>

            {liquidaciones.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                No hay recepciones de packing registradas aún. Registra los kilos recibidos, exportables, cajas y calibres de tus guías de despacho.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Fecha Recepción</th>
                      <th className="px-4 py-3">Guía / Cuartel</th>
                      <th className="px-4 py-3">Packing</th>
                      <th className="px-4 py-3">Recibido / Exportable</th>
                      <th className="px-4 py-3">Cajas &amp; Calibres</th>
                      <th className="px-4 py-3">Descarte / Estado</th>
                      {canEdit && <th className="px-4 py-3 text-right">Acción</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {liquidaciones.map((l) => (
                      <tr key={l.id} className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-mono">{l.fechaLiquidacion}</td>
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-emerald-950">{l.numeroGuiaDespacho}</div>
                          <div className="text-[11px] text-stone-500">{l.parcelaNombre}</div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-stone-800">{l.packingExportadora}</td>
                        <td className="px-4 py-3 font-mono">
                          <div>{l.kilosRecibidosKg.toLocaleString('es-CL')} kg rec.</div>
                          <div className="text-emerald-800 font-bold">
                            {l.kilosEmbaladosExportacionKg.toLocaleString('es-CL')} kg ({l.porcentajeExportable}%)
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold">{l.cajasExportables} cajas</div>
                          <div className="text-[10px] text-stone-500">{l.distribucionCalibres || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono font-semibold text-stone-800">
                            {(l.kilosDescarteKg ?? Math.max(0, l.kilosRecibidosKg - l.kilosEmbaladosExportacionKg)).toLocaleString('es-CL')} kg desc.
                          </div>
                          <div className="text-[10px] text-emerald-800 font-semibold">
                            {l.estado === 'Liquidado' ? 'Embalado Final' : 'En Proceso'}
                          </div>
                        </td>
                        {canEdit && onDeleteLiquidacion && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => onDeleteLiquidacion(l.id)}
                              className="p-1 text-stone-400 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PASAPORTE QR DE TRAZABILIDAD */}
      {qrLoteSeleccionado && trazabilidadLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="no-print bg-emerald-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Pasaporte de Trazabilidad & Etiqueta QR</h3>
              </div>
              <button type="button" onClick={() => setQrLoteSeleccionado(null)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                {qrDataUrl && (
                  <div className="p-2 bg-white rounded-xl border border-stone-200 shadow-2xs shrink-0">
                    <img src={qrDataUrl} alt={`QR Guía ${qrLoteSeleccionado.numeroGuiaDespacho}`} className="w-40 h-40" />
                  </div>
                )}
                <div className="space-y-1.5 flex-1 text-center sm:text-left">
                  <div className="text-[10px] font-bold uppercase text-emerald-800">{fundoNombre}</div>
                  <div className="text-lg font-black text-stone-900 font-mono">
                    {qrLoteSeleccionado.numeroGuiaDespacho}
                  </div>
                  <div className="text-xs font-bold text-stone-700">
                    Cuartel: {qrLoteSeleccionado.parcelaNombre}
                  </div>
                  <div className="text-[11px] text-stone-600">
                    Fecha Cosecha: <strong className="font-mono">{qrLoteSeleccionado.fecha}</strong> ·{' '}
                    <strong>{qrLoteSeleccionado.cantidadBins} bins</strong> ({qrLoteSeleccionado.pesoNetoKgEstimado.toLocaleString('es-CL')} kg)
                  </div>
                  <div className="text-[11px] text-stone-600">
                    Destino: <strong>{qrLoteSeleccionado.packingDestino || 'Sin especificar'}</strong>
                  </div>
                </div>
              </div>

              {/* Verificación Automática SAG & LMR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className={`p-3.5 rounded-xl border ${
                    trazabilidadLote.brixOk === true
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase opacity-75">Madurez Pre-Cosecha</div>
                  <div className="font-black text-sm mt-0.5">
                    {trazabilidadLote.muestreoPrevio
                      ? `${trazabilidadLote.muestreoPrevio.gradosBrixPromedio}° Brix (${trazabilidadLote.brixOk ? 'Apto ≥6.2°' : 'Bajo 6.2°'})`
                      : 'Sin muestreo °Brix en este cuartel'}
                  </div>
                  {trazabilidadLote.muestreoPrevio && (
                    <div className="text-[11px] mt-1">
                      Firmeza: {trazabilidadLote.muestreoPrevio.firmezaPulpaLb} lb · MS: {trazabilidadLote.muestreoPrevio.porcentajeMateriaSeca}%
                    </div>
                  )}
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    trazabilidadLote.lmrCumple
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase opacity-75">Verificación Carencia SAG (LMR)</div>
                  <div className="font-black text-sm mt-0.5 flex items-center gap-1.5">
                    {trazabilidadLote.lmrCumple ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                        <span>LMR CUMPLE (0 días carencia)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-700" />
                        <span>ALERTA CARENCIA ACTIVA</span>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] mt-1">
                    {trazabilidadLote.lmrCumple
                      ? `${trazabilidadLote.ultimasAplicacionesCount} tratamiento(s) revisado(s) sin carencia activa al cosechar.`
                      : trazabilidadLote.carenciasVioladas.join(' · ')}
                  </div>
                </div>
              </div>

              {trazabilidadLote.liquidacionAsociada && (
                <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950">
                  <div className="text-[10px] font-bold uppercase">Recepción de Packing Vinculada</div>
                  <div className="font-bold text-xs mt-1">
                    {trazabilidadLote.liquidacionAsociada.kilosEmbaladosExportacionKg.toLocaleString('es-CL')} kg exportables ({trazabilidadLote.liquidacionAsociada.porcentajeExportable}%) ·{' '}
                    {trazabilidadLote.liquidacionAsociada.cajasExportables} cajas ·{' '}
                    Descarte: {(trazabilidadLote.liquidacionAsociada.kilosDescarteKg ?? 0).toLocaleString('es-CL')} kg
                  </div>
                </div>
              )}

              <div className="no-print flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Tarjeta QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setQrLoteSeleccionado(null)}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Muestreo °Brix */}
      {isNewMuestreoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Nuevo Muestreo de °Brix (Refractómetro)</h3>
              <button type="button" onClick={() => setIsNewMuestreoOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleGuardarMuestreo} className="p-5 space-y-3.5 text-xs">
              {parcelas.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  ⚠️ No tienes cuarteles registrados. Primero debes crear al menos un cuartel en <strong>Cuarteles & Mapa</strong>.
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cuartel Muestreado:</label>
                  <select
                    value={muestreoForm.parcelaId || (parcelas[0]?.id ?? '')}
                    onChange={(e) => setMuestreoForm({ ...muestreoForm, parcelaId: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    required
                  >
                    {parcelas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} ({p.superficieHa} ha)</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">°Brix Promedio:</label>
                  <input type="number" step="0.1" value={muestreoForm.gradosBrixPromedio} onChange={(e) => setMuestreoForm({ ...muestreoForm, gradosBrixPromedio: parseFloat(e.target.value) || 0 })} className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-emerald-900" required />
                  <span className="text-[10px] text-stone-400">SAG Mín: 6.2°</span>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Mínimo:</label>
                  <input type="number" step="0.1" value={muestreoForm.solidoSolubleMin} onChange={(e) => setMuestreoForm({ ...muestreoForm, solidoSolubleMin: parseFloat(e.target.value) || 0 })} className="w-full p-2 bg-white border border-stone-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Máximo:</label>
                  <input type="number" step="0.1" value={muestreoForm.solidoSolubleMax} onChange={(e) => setMuestreoForm({ ...muestreoForm, solidoSolubleMax: parseFloat(e.target.value) || 0 })} className="w-full p-2 bg-white border border-stone-300 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Firmeza Penetrómetro (lb):</label>
                  <input type="number" step="0.1" value={muestreoForm.firmezaPulpaLb} onChange={(e) => setMuestreoForm({ ...muestreoForm, firmezaPulpaLb: parseFloat(e.target.value) || 0 })} className="w-full p-2 bg-white border border-stone-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Materia Seca (% MS):</label>
                  <input type="number" step="0.1" value={muestreoForm.porcentajeMateriaSeca} onChange={(e) => setMuestreoForm({ ...muestreoForm, porcentajeMateriaSeca: parseFloat(e.target.value) || 0 })} className="w-full p-2 bg-white border border-stone-300 rounded-lg" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones / Calibración Refractómetro:</label>
                <textarea value={muestreoForm.observaciones} onChange={(e) => setMuestreoForm({ ...muestreoForm, observaciones: e.target.value })} rows={2} className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs" />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button type="button" onClick={() => setIsNewMuestreoOpen(false)} className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer">Guardar Muestreo Oficial</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Despacho Bins */}
      {isNewCosechaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Despacho de Bins de Cosecha</h3>
              <button type="button" onClick={() => setIsNewCosechaOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleGuardarCosecha} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cuartel Origen:</label>
                  {parcelas.length === 0 ? (
                    <input type="text" value={cosechaForm.parcelaId} onChange={(e) => setCosechaForm({ ...cosechaForm, parcelaId: e.target.value })} placeholder="Nombre cuartel" className="w-full p-2 border border-stone-300 rounded-lg" required />
                  ) : (
                    <select value={cosechaForm.parcelaId || (parcelas[0]?.id ?? '')} onChange={(e) => setCosechaForm({ ...cosechaForm, parcelaId: e.target.value })} className="w-full p-2 bg-white border border-stone-300 rounded-lg" required>
                      {parcelas.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cantidad de Bins:</label>
                  <input type="number" min="1" value={cosechaForm.cantidadBins} onChange={(e) => setCosechaForm({ ...cosechaForm, cantidadBins: parseInt(e.target.value) || 0 })} className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-emerald-900" required />
                  <span className="text-[10px] text-stone-400">Total: {(cosechaForm.cantidadBins * 390).toLocaleString('es-CL')} kg netos</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° Guía de Despacho:</label>
                  <input type="text" value={cosechaForm.numeroGuiaDespacho} onChange={(e) => setCosechaForm({ ...cosechaForm, numeroGuiaDespacho: e.target.value })} className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono" required />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Packing / Exportadora:</label>
                  <input type="text" value={cosechaForm.packingDestino} onChange={(e) => setCosechaForm({ ...cosechaForm, packingDestino: e.target.value })} placeholder="Nombre packing" className="w-full p-2 bg-white border border-stone-300 rounded-lg" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Chofer del Camión:</label>
                  <input type="text" value={cosechaForm.choferCamion} onChange={(e) => setCosechaForm({ ...cosechaForm, choferCamion: e.target.value })} className="w-full p-2 bg-white border border-stone-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Patente Camión:</label>
                  <input type="text" value={cosechaForm.patenteCamion} onChange={(e) => setCosechaForm({ ...cosechaForm, patenteCamion: e.target.value })} className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Calibre Predominante:</label>
                  <input type="text" value={cosechaForm.calibrePredominante} onChange={(e) => setCosechaForm({ ...cosechaForm, calibrePredominante: e.target.value })} placeholder="Ej. Calibre 30" className="w-full p-2 bg-white border border-stone-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cuadrilla Cosecha:</label>
                  <input type="text" value={cosechaForm.cuadrilla} onChange={(e) => setCosechaForm({ ...cosechaForm, cuadrilla: e.target.value })} placeholder="Ej. Cuadrilla 1" className="w-full p-2 bg-white border border-stone-300 rounded-lg" />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button type="button" onClick={() => setIsNewCosechaOpen(false)} className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer">Registrar Despacho</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Liquidación Packing */}
      {isNewLiquidacionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Recepción y Embalaje de Packing</h3>
              <button type="button" onClick={() => setIsNewLiquidacionOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleGuardarLiquidacion} className="p-5 space-y-3.5 text-xs">
              {cosechas.length > 0 && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Vincular Guía Despacho (opcional):</label>
                  <select value={liqForm.cosechaLoteId} onChange={(e) => handleSelectLoteParaLiq(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-lg">
                    <option value="">Ingreso manual</option>
                    {cosechas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.numeroGuiaDespacho} · {c.parcelaNombre} ({c.pesoNetoKgEstimado} kg)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° Guía Despacho:</label>
                  <input type="text" value={liqForm.numeroGuiaDespacho} onChange={(e) => setLiqForm({ ...liqForm, numeroGuiaDespacho: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg font-mono" required />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha Recepción:</label>
                  <input type="date" value={liqForm.fechaLiquidacion} onChange={(e) => setLiqForm({ ...liqForm, fechaLiquidacion: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Packing / Exportadora:</label>
                  <input type="text" value={liqForm.packingExportadora} onChange={(e) => setLiqForm({ ...liqForm, packingExportadora: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cuartel:</label>
                  <select value={liqForm.parcelaId} onChange={(e) => setLiqForm({ ...liqForm, parcelaId: e.target.value })} className="w-full p-2 border border-stone-300 rounded-lg">
                    {parcelas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                    {parcelas.length === 0 && <option value="predio">General</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Kg Recibidos:</label>
                  <input type="number" min="0" value={liqForm.kilosRecibidosKg} onChange={(e) => setLiqForm({ ...liqForm, kilosRecibidosKg: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 rounded-lg font-mono" required />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Kg Exportables:</label>
                  <input type="number" min="0" value={liqForm.kilosEmbaladosExportacionKg} onChange={(e) => setLiqForm({ ...liqForm, kilosEmbaladosExportacionKg: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 rounded-lg font-mono font-bold text-emerald-900" required />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cajas Embaladas:</label>
                  <input type="number" min="0" value={liqForm.cajasExportables} onChange={(e) => setLiqForm({ ...liqForm, cajasExportables: parseInt(e.target.value) || 0 })} className="w-full p-2 border border-stone-300 rounded-lg font-mono" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Distribución de Calibres:</label>
                <input type="text" value={liqForm.distribucionCalibres} onChange={(e) => setLiqForm({ ...liqForm, distribucionCalibres: e.target.value })} placeholder="Ej. C27: 25%, C30: 45%, C33: 20%, C36: 10%" className="w-full p-2 border border-stone-300 rounded-lg" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Estado Recepción:</label>
                  <select
                    value={liqForm.estado}
                    onChange={(e) => setLiqForm({ ...liqForm, estado: e.target.value as LiquidacionPacking['estado'] })}
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  >
                    <option value="Liquidado">Embalado Final</option>
                    <option value="En Proceso">En Proceso</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Observaciones de Recepción:</label>
                  <input
                    type="text"
                    value={liqForm.observaciones}
                    onChange={(e) => setLiqForm({ ...liqForm, observaciones: e.target.value })}
                    placeholder="Condición de fruta, firmeza en línea..."
                    className="w-full p-2 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button type="button" onClick={() => setIsNewLiquidacionOpen(false)} className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer">Guardar Recepción</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
