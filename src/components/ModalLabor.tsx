import React, { useState, useEffect } from 'react';
import { 
  RegistroLabor, 
  Parcela, 
  InsumoInventario, 
  TipoLabor, 
  ClimaCondiciones,
  UsuarioPredio 
} from '../types/campo';
import { 
  X, 
  Save, 
  Sprout, 
  Droplet, 
  ShieldCheck, 
  AlertTriangle,
  Camera,
  Wind
} from 'lucide-react';
import { compressImageToDataUrl } from '../utils/imageCompress';
import { evaluarVentanaPulverizacion } from '../utils/pulverizacionHelper';
import { NumericInput } from './NumericInput';

interface ModalLaborProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (labor: RegistroLabor) => void;
  parcelas: Parcela[];
  inventario: InsumoInventario[];
  climaActual: ClimaCondiciones;
  usuarios: UsuarioPredio[];
  activeUserId: string;
  initialLabor?: RegistroLabor | null;
  defaultParcelaId?: string;
  defaultTipoLabor?: TipoLabor;
}

const getCurrentHHMM = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export const ModalLabor: React.FC<ModalLaborProps> = ({
  isOpen,
  onClose,
  onSave,
  parcelas,
  inventario,
  climaActual,
  usuarios,
  activeUserId,
  initialLabor,
  defaultParcelaId,
  defaultTipoLabor
}) => {
  const activeUser = usuarios.find((u) => u.id === activeUserId) || usuarios[0];
  const defaultAplicadorUser =
    usuarios.find((u) => u.rol === 'aplicador_sag') || activeUser || usuarios[0];

  const fitoFertProductos = inventario.filter((i) => i.categoriaBodega !== 'material_riego');
  const fertProductos = fitoFertProductos.filter(
    (i) =>
      i.tipo?.includes('fertilizante') ||
      i.categoria === 'fertilizante' ||
      i.categoriaFito === 'fertilizante'
  );

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(getCurrentHHMM);
  const [parcelaId, setParcelaId] = useState(parcelas[0]?.id || '');
  const [sectorGeneralNombre, setSectorGeneralNombre] = useState('Huerto General');
  const [superficieManualHa, setSuperficieManualHa] = useState(1.0);
  const [tipoLabor, setTipoLabor] = useState<TipoLabor>('fitosanitario');
  const [descripcion, setDescripcion] = useState('');

  // Fitosanitario / Fertilizante
  const [insumoId, setInsumoId] = useState(fitoFertProductos[0]?.id || '');
  const [nombreInsumoManual, setNombreInsumoManual] = useState('');
  const [unidadManual, setUnidadManual] = useState('Litros');
  const [ingredienteActivo, setIngredienteActivo] = useState('');
  const [composicionQuimica, setComposicionQuimica] = useState('');
  const [dosisPorHa, setDosisPorHa] = useState(1.0);
  const [dosisPorPlanta, setDosisPorPlanta] = useState(0);
  const [unidadDosisPlanta, setUnidadDosisPlanta] = useState('g/planta');
  const [plantasPorHaRef, setPlantasPorHaRef] = useState(555);
  const [volumenCaldoLHa, setVolumenCaldoLHa] = useState(1000);
  const [totalAguaAplicadaL, setTotalAguaAplicadaL] = useState(1000);
  const [metodoAplicacion, setMetodoAplicacion] = useState('Turbo Pulverizador');
  const [tractoristaMaquinaria, setTractoristaMaquinaria] = useState('');
  const [aplicadorSelect, setAplicadorSelect] = useState(defaultAplicadorUser?.nombre || '');
  const [aplicadorManual, setAplicadorManual] = useState('');
  const [objetivoPlaga, setObjetivoPlaga] = useState('Control preventivo Psa / Botrytis');

  // Riego
  const [volumenM3, setVolumenM3] = useState(480);
  const [duracionRiegoHoras, setDuracionRiegoHoras] = useState(6.5);

  const [registradoPor, setRegistradoPor] = useState(activeUser?.nombre || 'Administrador');
  const [observaciones, setObservaciones] = useState('');
  const [fotoEvidenciaDataUrl, setFotoEvidenciaDataUrl] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const getSup = (pId: string) => {
      const p = parcelas.find((x) => x.id === pId);
      return p ? p.superficieHa : 1.0;
    };
    const getPlantas = (pId: string) => {
      const p = parcelas.find((x) => x.id === pId);
      return p?.plantasPorHa && p.plantasPorHa > 0 ? p.plantasPorHa : 555;
    };

    if (initialLabor) {
      const pId = initialLabor.parcelaId || '';
      const sup = initialLabor.superficieTratadaHa || getSup(pId);
      const plantas = initialLabor.plantasPorHaReferencia || getPlantas(pId);
      const ins = inventario.find((i) => i.id === initialLabor.insumoId);
      const caldo = initialLabor.volumenCaldoLHa ?? 1000;
      const appNombre = initialLabor.aplicadorNombre || '';
      const matchedUser = usuarios.find((u) => u.nombre === appNombre);

      setFecha(initialLabor.fecha || new Date().toISOString().split('T')[0]);
      setHora(initialLabor.hora || '08:00');
      setParcelaId(pId);
      setSectorGeneralNombre(initialLabor.parcelaNombre || 'Huerto General');
      setSuperficieManualHa(initialLabor.superficieTratadaHa ?? 1.0);
      setTipoLabor(initialLabor.tipoLabor || 'fitosanitario');
      setDescripcion(initialLabor.descripcion || '');
      setInsumoId(initialLabor.insumoId || '');
      setNombreInsumoManual(initialLabor.insumoId ? '' : (initialLabor.nombreInsumo || ''));
      setUnidadManual(initialLabor.unidadMedida || (initialLabor.tipoLabor === 'fertilizacion' ? 'Kg' : 'Litros'));
      setIngredienteActivo(initialLabor.ingredienteActivo || ins?.ingredienteActivo || '');
      setComposicionQuimica(initialLabor.composicionQuimica || ins?.composicionFertilizante || '');
      const dosisHaVal = initialLabor.dosisPorHa ?? 1.0;
      setDosisPorHa(dosisHaVal);
      setPlantasPorHaRef(plantas);
      setUnidadDosisPlanta(initialLabor.unidadDosisPlanta || 'g/planta');
      setDosisPorPlanta(
        initialLabor.dosisPorPlanta !== undefined
          ? initialLabor.dosisPorPlanta
          : Number(((dosisHaVal * 1000) / plantas).toFixed(1))
      );
      setVolumenCaldoLHa(caldo);
      setTotalAguaAplicadaL(
        initialLabor.totalAguaAplicadaL !== undefined
          ? initialLabor.totalAguaAplicadaL
          : Number((sup * caldo).toFixed(0))
      );
      setMetodoAplicacion(
        initialLabor.metodoAplicacion ||
          (initialLabor.tipoLabor === 'fertilizacion' ? 'Al Voleo Manual' : 'Turbo Pulverizador')
      );
      setTractoristaMaquinaria(initialLabor.tractoristaMaquinaria || '');
      if (matchedUser) {
        setAplicadorSelect(matchedUser.nombre);
        setAplicadorManual('');
      } else if (appNombre) {
        setAplicadorSelect('__manual__');
        setAplicadorManual(appNombre);
      } else {
        setAplicadorSelect(defaultAplicadorUser?.nombre || '__manual__');
        setAplicadorManual('');
      }
      setObjetivoPlaga(
        initialLabor.objetivoPlagaEnfermedad ||
          (initialLabor.tipoLabor === 'fertilizacion'
            ? 'Nutrición mineral al voleo'
            : 'Control preventivo Psa / Botrytis')
      );
      setVolumenM3(initialLabor.volumenM3 ?? 480);
      setDuracionRiegoHoras(initialLabor.duracionRiegoHoras ?? 6.5);
      setRegistradoPor(initialLabor.registradoPor || activeUser?.nombre || 'Administrador');
      setObservaciones(initialLabor.observaciones || '');
      setFotoEvidenciaDataUrl(initialLabor.fotoEvidenciaDataUrl || '');
      setPhotoError(null);
    } else {
      const targetTipo = defaultTipoLabor || 'fitosanitario';
      const pId = defaultParcelaId || parcelas[0]?.id || '';
      const sup = getSup(pId);
      const plantas = getPlantas(pId);
      const initialProd =
        targetTipo === 'fertilizacion'
          ? fertProductos[0] || fitoFertProductos[0]
          : fitoFertProductos[0];
      const dosisInit = targetTipo === 'fertilizacion' ? 150 : 1.0;

      setFecha(new Date().toISOString().split('T')[0]);
      setHora(getCurrentHHMM());
      setParcelaId(pId);
      setSectorGeneralNombre('Huerto General');
      setSuperficieManualHa(1.0);
      setTipoLabor(targetTipo);
      setDescripcion('');
      setInsumoId(initialProd?.id || '');
      setNombreInsumoManual('');
      setUnidadManual(targetTipo === 'fertilizacion' ? 'Kg' : 'Litros');
      setIngredienteActivo(initialProd?.ingredienteActivo || '');
      setComposicionQuimica(initialProd?.composicionFertilizante || '');
      setDosisPorHa(dosisInit);
      setPlantasPorHaRef(plantas);
      setUnidadDosisPlanta('g/planta');
      setDosisPorPlanta(Number(((dosisInit * 1000) / plantas).toFixed(1)));
      setVolumenCaldoLHa(1000);
      setTotalAguaAplicadaL(Number((sup * 1000).toFixed(0)));
      setMetodoAplicacion(targetTipo === 'fertilizacion' ? 'Al Voleo Manual' : 'Turbo Pulverizador');
      setTractoristaMaquinaria('');
      setAplicadorSelect(defaultAplicadorUser?.nombre || '__manual__');
      setAplicadorManual('');
      setObjetivoPlaga(
        targetTipo === 'fertilizacion'
          ? 'Nutrición mineral / Fertilización al voleo'
          : 'Control preventivo Psa / Botrytis'
      );
      setVolumenM3(480);
      setDuracionRiegoHoras(6.5);
      setRegistradoPor(activeUser?.nombre || 'Administrador');
      setObservaciones('');
      setFotoEvidenciaDataUrl('');
      setPhotoError(null);
    }
  }, [initialLabor, defaultParcelaId, defaultTipoLabor, isOpen]);

  if (!isOpen) return null;

  const selectedParcela = parcelas.find((p) => p.id === parcelaId) || null;
  const selectedInsumo = inventario.find((i) => i.id === insumoId) || null;

  const superficieBase = selectedParcela ? selectedParcela.superficieHa : (Number(superficieManualHa) || 1);
  const totalInsumoCalculado = Number((superficieBase * (Number(dosisPorHa) || 0)).toFixed(2));
  const unidadMostrada =
    selectedInsumo?.unidad || unidadManual || (tipoLabor === 'fertilizacion' ? 'Kg' : 'Litros');
  const carenciaMostrada = selectedInsumo?.periodoCarenciaDias ?? 0;
  const evalPulverizacion = evaluarVentanaPulverizacion(climaActual);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setFotoEvidenciaDataUrl(dataUrl);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'No se pudo procesar la foto.');
    }
  };

  const aplicadorNombreFinal =
    aplicadorSelect === '__manual__' ? aplicadorManual.trim() : aplicadorSelect.trim();
  const resolvedAplicadorUser = usuarios.find((u) => u.nombre === aplicadorNombreFinal);

  const productosSelectorList =
    tipoLabor === 'fertilizacion'
      ? [
          ...fertProductos,
          ...fitoFertProductos.filter((p) => !fertProductos.some((f) => f.id === p.id))
        ]
      : fitoFertProductos;

  const convertHaToPlanta = (haVal: number, plantas: number, unitPlanta: string) => {
    if (plantas <= 0) return 0;
    const isSubUnit = unitPlanta === 'g/planta' || unitPlanta === 'ml/planta' || unitPlanta === 'cc/planta';
    return Number((isSubUnit ? (haVal * 1000) / plantas : haVal / plantas).toFixed(isSubUnit ? 1 : 3));
  };

  const convertPlantaToHa = (plantaVal: number, plantas: number, unitPlanta: string) => {
    if (plantas <= 0) return 0;
    const isSubUnit = unitPlanta === 'g/planta' || unitPlanta === 'ml/planta' || unitPlanta === 'cc/planta';
    return Number((isSubUnit ? (plantaVal * plantas) / 1000 : plantaVal * plantas).toFixed(2));
  };

  const handleParcelaChange = (newParcelaId: string) => {
    setParcelaId(newParcelaId);
    const p = parcelas.find((x) => x.id === newParcelaId);
    const sup = p ? p.superficieHa : Number(superficieManualHa) || 1;
    const plantas = p?.plantasPorHa && p.plantasPorHa > 0 ? p.plantasPorHa : 555;
    setPlantasPorHaRef(plantas);
    setTotalAguaAplicadaL(Number((sup * (Number(volumenCaldoLHa) || 0)).toFixed(0)));
    if (tipoLabor === 'fertilizacion') {
      setDosisPorPlanta(convertHaToPlanta(dosisPorHa, plantas, unidadDosisPlanta));
    }
  };

  const handleSuperficieManualChange = (sup: number) => {
    setSuperficieManualHa(sup);
    setTotalAguaAplicadaL(Number((sup * (Number(volumenCaldoLHa) || 0)).toFixed(0)));
  };

  const handleVolumenCaldoChange = (caldo: number) => {
    setVolumenCaldoLHa(caldo);
    setTotalAguaAplicadaL(Number((superficieBase * caldo).toFixed(0)));
  };

  const handleInsumoChange = (newInsumoId: string) => {
    setInsumoId(newInsumoId);
    const ins = inventario.find((i) => i.id === newInsumoId);
    if (ins) {
      setIngredienteActivo(ins.ingredienteActivo || '');
      setComposicionQuimica(ins.composicionFertilizante || '');
    } else {
      setIngredienteActivo('');
      setComposicionQuimica('');
    }
  };

  const handleTipoLaborSwitch = (nextTipo: TipoLabor) => {
    setTipoLabor(nextTipo);
    if (!initialLabor) {
      if (nextTipo === 'fertilizacion') {
        if (metodoAplicacion === 'Turbo Pulverizador' || !metodoAplicacion) {
          setMetodoAplicacion('Al Voleo Manual');
        }
        setUnidadManual('Kg');
        if (objetivoPlaga === 'Control preventivo Psa / Botrytis') {
          setObjetivoPlaga('Nutrición mineral al voleo');
        }
        if (fertProductos.length > 0 && (!selectedInsumo || !fertProductos.some((f) => f.id === selectedInsumo.id))) {
          const fert = fertProductos[0];
          setInsumoId(fert.id);
          setComposicionQuimica(fert.composicionFertilizante || '');
        }
        setDosisPorPlanta(convertHaToPlanta(dosisPorHa, plantasPorHaRef, unidadDosisPlanta));
      } else if (nextTipo === 'fitosanitario') {
        if (metodoAplicacion.toLowerCase().includes('voleo')) {
          setMetodoAplicacion('Turbo Pulverizador');
        }
        setUnidadManual('Litros');
        if (objetivoPlaga === 'Nutrición mineral al voleo' || objetivoPlaga === 'Nutrición mineral / Fertilización al voleo') {
          setObjetivoPlaga('Control preventivo Psa / Botrytis');
        }
        setTotalAguaAplicadaL(Number((superficieBase * (Number(volumenCaldoLHa) || 0)).toFixed(0)));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isFito = tipoLabor === 'fitosanitario';
    const isFert = tipoLabor === 'fertilizacion';
    const isFitoOrFert = isFito || isFert;
    const isRiego = tipoLabor === 'riego';

    const parcelaNombreFinal = selectedParcela?.nombre || sectorGeneralNombre.trim() || 'Huerto General';
    const parcelaIdFinal = selectedParcela?.id || parcelaId || 'general';
    const insumoNombreFinal = selectedInsumo?.nombreComercial || nombreInsumoManual.trim() || undefined;

    const laborToSave: RegistroLabor = {
      id: initialLabor ? initialLabor.id : `lab-${Date.now()}`,
      fecha,
      hora,
      parcelaId: parcelaIdFinal,
      parcelaNombre: parcelaNombreFinal,
      tipoLabor,
      descripcion:
        descripcion.trim() ||
        (isFert
          ? `FERTILIZACIÓN (${metodoAplicacion}): ${insumoNombreFinal || 'Fertilizante'} · ${dosisPorHa} ${unidadMostrada}/ha (${dosisPorPlanta} ${unidadDosisPlanta})`
          : isFito
          ? `FITOSANITARIO: ${insumoNombreFinal || 'Aplicación agrícola'}${ingredienteActivo ? ` (${ingredienteActivo})` : ''} · ${totalAguaAplicadaL} L de agua`
          : isRiego
          ? `RIEGO: ${volumenM3} m³ de agua`
          : `${tipoLabor.toUpperCase()}: Labor agronómica general`),
      insumoId: isFitoOrFert && selectedInsumo ? selectedInsumo.id : undefined,
      nombreInsumo: isFitoOrFert ? insumoNombreFinal : undefined,
      ingredienteActivo: isFito ? (ingredienteActivo.trim() || selectedInsumo?.ingredienteActivo || undefined) : undefined,
      composicionQuimica: isFert ? (composicionQuimica.trim() || selectedInsumo?.composicionFertilizante || undefined) : undefined,
      dosisPorHa: isFitoOrFert ? Number(dosisPorHa) || 0 : undefined,
      dosisPorPlanta: isFert ? Number(dosisPorPlanta) || 0 : undefined,
      unidadDosisPlanta: isFert ? unidadDosisPlanta : undefined,
      plantasPorHaReferencia: isFert ? Number(plantasPorHaRef) || 555 : undefined,
      superficieTratadaHa: isFitoOrFert ? superficieBase : undefined,
      volumenCaldoLHa: isFito ? Number(volumenCaldoLHa) || 0 : undefined,
      totalAguaAplicadaL: isFito ? Number(totalAguaAplicadaL) || 0 : undefined,
      totalInsumoUtilizado: isFitoOrFert && insumoNombreFinal ? totalInsumoCalculado : undefined,
      unidadMedida: isFitoOrFert && insumoNombreFinal ? unidadMostrada : undefined,
      metodoAplicacion: isFitoOrFert ? metodoAplicacion : undefined,
      tractoristaMaquinaria: isFitoOrFert ? tractoristaMaquinaria : undefined,
      aplicadorNombre: isFitoOrFert ? (aplicadorNombreFinal || registradoPor.trim() || undefined) : undefined,
      periodoCarenciaDias: isFito ? carenciaMostrada : 0,
      reingresoHoras: isFito ? (selectedInsumo?.tiempoReingresoHoras ?? 0) : 0,
      objetivoPlagaEnfermedad: isFitoOrFert ? objetivoPlaga : undefined,
      volumenM3: isRiego ? Number(volumenM3) || 0 : undefined,
      litrosAgua: isRiego ? (Number(volumenM3) || 0) * 1000 : undefined,
      duracionRiegoHoras: isRiego ? Number(duracionRiegoHoras) || 0 : undefined,
      sectorRiego: isRiego ? parcelaNombreFinal : undefined,
      registradoPor: registradoPor.trim() || aplicadorNombreFinal || activeUser?.nombre || 'Administrador',
      numeroCarnetSAG: resolvedAplicadorUser?.numeroCarnetSAG || activeUser?.numeroCarnetSAG,
      condicionesClimaticas: {
        temperaturaC: climaActual?.temperaturaActual ?? 20,
        humedadRelativa: climaActual?.humedadRelativa ?? 60,
        velocidadVientoKmH: climaActual?.velocidadVientoKmH ?? 5
      },
      observaciones,
      fotoEvidenciaDataUrl: fotoEvidenciaDataUrl || undefined
    };

    onSave(laborToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-stone-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/70 border border-emerald-500/50 flex items-center justify-center font-bold text-white text-sm">
              <Sprout className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="font-bold text-base">
                {initialLabor ? 'Editar Labor Agronómica' : 'Registrar Nueva Labor en Cuaderno SAG'}
              </h2>
              <p className="text-xs text-emerald-200">Cuaderno Oficial SAG · Trazabilidad de Huerto</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Fila 1: Fecha, Hora y Cuartel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Fecha de la Labor:</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Hora Inicio:</label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Cuartel Destino:</label>
              {parcelas.length > 0 ? (
                <select
                  value={parcelaId}
                  onChange={(e) => handleParcelaChange(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-medium text-xs"
                >
                  {parcelas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.superficieHa} ha)
                    </option>
                  ))}
                  <option value="">Otro sector / Huerto General</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={sectorGeneralNombre}
                  onChange={(e) => setSectorGeneralNombre(e.target.value)}
                  placeholder="Ej. Cuartel 1 / Huerto General"
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-medium text-xs"
                  required
                />
              )}
            </div>
          </div>

          {!selectedParcela && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-amber-900">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {parcelas.length === 0
                    ? 'Aún no has creado cuarteles en "Cuarteles & Mapa". Puedes registrar esta labor indicando sector y hectáreas:'
                    : 'Registrando labor fuera de cuartel específico:'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold">Sup. (ha):</span>
                <NumericInput
                  step="0.1"
                  min="0.1"
                  value={superficieManualHa}
                  emptyFallback={0}
                  onChangeNumber={(val) => handleSuperficieManualChange(val)}
                  className="w-20 p-1 bg-white border border-amber-300 rounded text-xs font-bold font-mono tabular-nums"
                />
              </div>
            </div>
          )}

          {/* Fila 2: Tipo de Labor */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Tipo de Labor Agronómica:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'fitosanitario', label: 'Fitosanitario' },
                { id: 'fertilizacion', label: 'Fertilización / Voleo' },
                { id: 'riego', label: 'Riego Pozo' },
                { id: 'poda', label: 'Poda Canopia' },
                { id: 'polinizacion', label: 'Polinización' },
                { id: 'monitoreo', label: 'Monitoreo' },
                { id: 'cosecha', label: 'Cosecha' },
                { id: 'mantenimiento', label: 'Mantenimiento' }
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => handleTipoLaborSwitch(t.id as TipoLabor)}
                  className={`p-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                    tipoLabor === t.id
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-2xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campos específicos para APLICACIÓN FITOSANITARIA */}
          {tipoLabor === 'fitosanitario' && (
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
              <div className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>Parámetros de Aplicación Fitosanitaria (Producto, Ingrediente Activo, Agua & Aplicador)</span>
              </div>

              <div className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${evalPulverizacion.cardClass}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-black flex items-center gap-1.5 ${evalPulverizacion.textClass}`}>
                    <Wind className="w-3.5 h-3.5 shrink-0" />
                    {evalPulverizacion.titulo}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${evalPulverizacion.badgeClass}`}>
                    Viento {(climaActual?.velocidadVientoKmH ?? 0).toFixed(1)} km/h · HR {Math.round(climaActual?.humedadRelativa ?? 60)}%
                  </span>
                </div>
                <p className={evalPulverizacion.textClass}>{evalPulverizacion.recomendacion}</p>
              </div>

              {productosSelectorList.length > 0 ? (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Producto en Bodega:</label>
                  <select
                    value={insumoId}
                    onChange={(e) => handleInsumoChange(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  >
                    {productosSelectorList.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nombreComercial} ({i.numeroRegistroSAG || 'Sin Reg.'}) · Stock: {i.stockActual} {i.unidad} · Carencia: {i.periodoCarenciaDias ?? 0}d
                      </option>
                    ))}
                    <option value="">Otro producto (ingresar manualmente)</option>
                  </select>
                </div>
              ) : (
                <div className="text-[11px] text-purple-900 bg-white/80 p-2 rounded-lg border border-purple-200">
                  Tu Bodega Fitosanitaria está vacía. Puedes ingresar el nombre del producto manualmente o agregarlo primero en <strong>Bodega Fitosanitarios</strong>.
                </div>
              )}

              {!selectedInsumo && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-700 mb-1">Producto Comercial (Nombre):</label>
                    <input
                      type="text"
                      value={nombreInsumoManual}
                      onChange={(e) => setNombreInsumoManual(e.target.value)}
                      placeholder="Ej. Oxicloruro de Cobre / Nordox 75 WG"
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Unidad:</label>
                    <select
                      value={unidadManual}
                      onChange={(e) => setUnidadManual(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                    >
                      <option value="Litros">Litros</option>
                      <option value="Kg">Kg</option>
                      <option value="cc">cc</option>
                      <option value="ml">ml</option>
                      <option value="gramos">gramos</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Ingrediente Activo */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Ingrediente Activo:</label>
                <input
                  type="text"
                  value={ingredienteActivo}
                  onChange={(e) => setIngredienteActivo(e.target.value)}
                  placeholder="Ej. Óxido Cuproso 75% / Ciprodinil + Fludioxonil"
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Dosis por Ha:</label>
                  <NumericInput
                    step="0.01"
                    min="0"
                    value={dosisPorHa}
                    onChangeNumber={(val) => setDosisPorHa(val)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold font-mono tabular-nums text-xs"
                    required
                  />
                  <span className="text-[10px] text-stone-500 font-mono tabular-nums">
                    Total: {totalInsumoCalculado} {unidadMostrada}
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Mojamiento (L/ha):</label>
                  <NumericInput
                    integer
                    min="0"
                    value={volumenCaldoLHa}
                    onChangeNumber={(val) => handleVolumenCaldoChange(val)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono tabular-nums text-xs"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Total Agua Aplicada (L):</label>
                  <NumericInput
                    min="0"
                    step="1"
                    value={totalAguaAplicadaL}
                    onChangeNumber={(val) => setTotalAguaAplicadaL(val)}
                    className="w-full p-2 bg-white border border-purple-300 rounded-lg font-bold font-mono text-purple-950 tabular-nums text-xs"
                    required
                  />
                  <span className="text-[10px] text-stone-500 font-mono tabular-nums">
                    Base {superficieBase} ha
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Carencia SAG:</label>
                  <div className="p-2 bg-white border border-stone-300 rounded-lg font-bold text-amber-900">
                    {carenciaMostrada > 0 ? `${carenciaMostrada} días LMR` : 'Sin carencia'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Objetivo Fitopatológico / Plaga:</label>
                <input
                  type="text"
                  value={objetivoPlaga}
                  onChange={(e) => setObjetivoPlaga(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  placeholder="Ej. Control preventivo de Botrytis cinerea"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Maquinaria / Pulverizador:</label>
                  <input
                    type="text"
                    value={metodoAplicacion}
                    onChange={(e) => setMetodoAplicacion(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Aplicador Responsable:</label>
                  <select
                    value={aplicadorSelect}
                    onChange={(e) => setAplicadorSelect(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold"
                  >
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.nombre}>
                        {u.nombre} {u.carnetSAGVigente ? '(SAG Vigente)' : ''}
                      </option>
                    ))}
                    <option value="__manual__">Otro aplicador (escribir nombre)</option>
                  </select>
                  {aplicadorSelect === '__manual__' && (
                    <input
                      type="text"
                      value={aplicadorManual}
                      onChange={(e) => setAplicadorManual(e.target.value)}
                      placeholder="Nombre completo del aplicador"
                      className="w-full mt-1.5 p-2 bg-white border border-stone-300 rounded-lg text-xs"
                      required
                    />
                  )}
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tractor / Equipo:</label>
                  <input
                    type="text"
                    value={tractoristaMaquinaria}
                    onChange={(e) => setTractoristaMaquinaria(e.target.value)}
                    placeholder="Ej. Tractor + Nebulizador"
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Campos específicos para FERTILIZACIÓN (AL VOLEO / LOCALIZADA / FOLIAR) */}
          {tipoLabor === 'fertilizacion' && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-emerald-700" />
                <span>Fertilización al Voleo / Suelo (Método, Dosis/ha, Dosis/planta & Composición Química)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Método de Fertilización:</label>
                  <select
                    value={metodoAplicacion}
                    onChange={(e) => setMetodoAplicacion(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-xs"
                  >
                    <option value="Al Voleo Manual">Al Voleo Manual</option>
                    <option value="Al Voleo con Trompo / Abonadora">Al Voleo con Trompo / Abonadora</option>
                    <option value="Localizada en Banda / Taza">Localizada en Banda / Taza</option>
                    <option value="Foliar">Foliar</option>
                    <option value="Fertirriego">Fertirriego</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Producto Comercial (Bodega o Manual):</label>
                  <select
                    value={insumoId}
                    onChange={(e) => handleInsumoChange(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  >
                    {productosSelectorList.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nombreComercial} {i.composicionFertilizante ? `(${i.composicionFertilizante})` : ''} · Stock: {i.stockActual} {i.unidad}
                      </option>
                    ))}
                    <option value="">Ingresar producto comercial manualmente</option>
                  </select>
                </div>
              </div>

              {!selectedInsumo && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-700 mb-1">Nombre del Producto Comercial:</label>
                    <input
                      type="text"
                      value={nombreInsumoManual}
                      onChange={(e) => setNombreInsumoManual(e.target.value)}
                      placeholder="Ej. Urea Granulada 46% / Nitrato de Amonio / Basacote"
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Unidad:</label>
                    <select
                      value={unidadManual}
                      onChange={(e) => setUnidadManual(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                    >
                      <option value="Kg">Kg</option>
                      <option value="Litros">Litros</option>
                      <option value="gramos">gramos</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">Composición Química (N-P-K / Nutrientes):</label>
                <input
                  type="text"
                  value={composicionQuimica}
                  onChange={(e) => setComposicionQuimica(e.target.value)}
                  placeholder="Ej. 46-0-0 (46% N) o N 15.5% - CaO 26% - B 0.3%"
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Dosis / Hectárea ({unidadMostrada}/ha):
                  </label>
                  <NumericInput
                    step="0.1"
                    min="0"
                    value={dosisPorHa}
                    onChangeNumber={(val) => {
                      setDosisPorHa(val);
                      setDosisPorPlanta(convertHaToPlanta(val, plantasPorHaRef, unidadDosisPlanta));
                    }}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-bold font-mono tabular-nums text-xs"
                    required
                  />
                  <span className="text-[10px] text-emerald-900 font-bold font-mono tabular-nums">
                    Total ({superficieBase} ha): {totalInsumoCalculado} {unidadMostrada}
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Dosis por Planta:</label>
                  <NumericInput
                    step="0.1"
                    min="0"
                    value={dosisPorPlanta}
                    onChangeNumber={(val) => {
                      setDosisPorPlanta(val);
                      setDosisPorHa(convertPlantaToHa(val, plantasPorHaRef, unidadDosisPlanta));
                    }}
                    className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-bold font-mono tabular-nums text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Unidad / Planta:</label>
                  <select
                    value={unidadDosisPlanta}
                    onChange={(e) => {
                      const nextUnit = e.target.value;
                      setUnidadDosisPlanta(nextUnit);
                      setDosisPorPlanta(convertHaToPlanta(dosisPorHa, plantasPorHaRef, nextUnit));
                    }}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-medium"
                  >
                    <option value="g/planta">g / planta</option>
                    <option value="kg/planta">kg / planta</option>
                    <option value="ml/planta">ml / planta</option>
                    <option value="L/planta">L / planta</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Plantas / Ha Ref.:</label>
                  <NumericInput
                    integer
                    min="1"
                    step="1"
                    value={plantasPorHaRef}
                    emptyFallback={555}
                    onChangeNumber={(pHa) => {
                      setPlantasPorHaRef(pHa);
                      setDosisPorPlanta(convertHaToPlanta(dosisPorHa, pHa, unidadDosisPlanta));
                    }}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono tabular-nums text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Aplicador / Operador:</label>
                  <select
                    value={aplicadorSelect}
                    onChange={(e) => setAplicadorSelect(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-semibold"
                  >
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.nombre}>
                        {u.nombre} ({u.cargo})
                      </option>
                    ))}
                    <option value="__manual__">Otro aplicador (escribir nombre)</option>
                  </select>
                  {aplicadorSelect === '__manual__' && (
                    <input
                      type="text"
                      value={aplicadorManual}
                      onChange={(e) => setAplicadorManual(e.target.value)}
                      placeholder="Nombre del aplicador"
                      className="w-full mt-1.5 p-2 bg-white border border-stone-300 rounded-lg text-xs"
                    />
                  )}
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Objetivo Nutricional / Equipo:</label>
                  <input
                    type="text"
                    value={objetivoPlaga}
                    onChange={(e) => setObjetivoPlaga(e.target.value)}
                    placeholder="Ej. Corrección de N y K en brotación"
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Campos condicionales para Riego */}
          {tipoLabor === 'riego' && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <div className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                <Droplet className="w-4 h-4 text-blue-700" />
                Parámetros de Riego y Registro en Pozo Profundo
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Volumen Extraído (m³):</label>
                  <NumericInput
                    min="0"
                    value={volumenM3}
                    onChangeNumber={(val) => setVolumenM3(val)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-blue-900 font-mono text-sm"
                    required
                  />
                  <span className="text-[10px] text-stone-400">{(volumenM3 * 1000).toLocaleString('es-CL')} Litros</span>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Duración Bombeo (Horas):</label>
                  <NumericInput
                    min="0"
                    step="0.5"
                    value={duracionRiegoHoras}
                    onChangeNumber={(val) => setDuracionRiegoHoras(val)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-xs"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Descripción y Observaciones */}
          <div>
            <label className="block font-bold text-stone-700 mb-1">Descripción Detallada de la Labor:</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
              placeholder="Detalle de la labor realizada en campo..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Registrado Por (Responsable):</label>
              <input
                type="text"
                value={registradoPor}
                onChange={(e) => setRegistradoPor(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Observaciones Adicionales:</label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Evidencia fotográfica desde celular */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <label className="block font-bold text-stone-700 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-700" />
              <span>Evidencia Fotográfica desde el Celular (opcional):</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="text-[11px] text-stone-600"
              />
              {fotoEvidenciaDataUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={fotoEvidenciaDataUrl}
                    alt="Evidencia de labor"
                    className="h-14 w-14 rounded-lg border border-stone-300 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFotoEvidenciaDataUrl('')}
                    className="px-2 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 cursor-pointer"
                  >
                    Quitar foto
                  </button>
                </div>
              )}
            </div>
            {photoError && <p className="text-rose-600 text-[10px]">{photoError}</p>}
          </div>

          {/* Footer modal */}
          <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 font-bold hover:bg-stone-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar en Cuaderno Oficial</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
