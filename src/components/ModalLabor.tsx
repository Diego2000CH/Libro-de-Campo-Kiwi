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
  AlertTriangle 
} from 'lucide-react';

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

  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(getCurrentHHMM);
  const [parcelaId, setParcelaId] = useState(parcelas[0]?.id || '');
  const [sectorGeneralNombre, setSectorGeneralNombre] = useState('Huerto General');
  const [superficieManualHa, setSuperficieManualHa] = useState(1.0);
  const [tipoLabor, setTipoLabor] = useState<TipoLabor>('fitosanitario');
  const [descripcion, setDescripcion] = useState('');
  
  // Fitosanitario / Fertilizante
  const [insumoId, setInsumoId] = useState(inventario[0]?.id || '');
  const [nombreInsumoManual, setNombreInsumoManual] = useState('');
  const [unidadManual, setUnidadManual] = useState('Litros');
  const [dosisPorHa, setDosisPorHa] = useState(1.0);
  const [volumenCaldoLHa, setVolumenCaldoLHa] = useState(1000);
  const [metodoAplicacion, setMetodoAplicacion] = useState('Turbo Pulverizador');
  const [tractoristaMaquinaria, setTractoristaMaquinaria] = useState('');
  const [objetivoPlaga, setObjetivoPlaga] = useState('Control preventivo Psa / Botrytis');

  // Riego
  const [volumenM3, setVolumenM3] = useState(480);
  const [duracionRiegoHoras, setDuracionRiegoHoras] = useState(6.5);

  const [registradoPor, setRegistradoPor] = useState(activeUser?.nombre || 'Administrador');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialLabor) {
      setFecha(initialLabor.fecha || new Date().toISOString().split('T')[0]);
      setHora(initialLabor.hora || '08:00');
      setParcelaId(initialLabor.parcelaId || '');
      setSectorGeneralNombre(initialLabor.parcelaNombre || 'Huerto General');
      setTipoLabor(initialLabor.tipoLabor || 'fitosanitario');
      setDescripcion(initialLabor.descripcion || '');
      setInsumoId(initialLabor.insumoId || '');
      setNombreInsumoManual(initialLabor.insumoId ? '' : (initialLabor.nombreInsumo || ''));
      setUnidadManual(initialLabor.unidadMedida || 'Litros');
      setDosisPorHa(initialLabor.dosisPorHa ?? 1.0);
      setVolumenCaldoLHa(initialLabor.volumenCaldoLHa ?? 1000);
      setMetodoAplicacion(initialLabor.metodoAplicacion || 'Turbo Pulverizador');
      setTractoristaMaquinaria(initialLabor.tractoristaMaquinaria || '');
      setObjetivoPlaga(initialLabor.objetivoPlagaEnfermedad || 'Control preventivo Psa / Botrytis');
      setVolumenM3(initialLabor.volumenM3 ?? 480);
      setDuracionRiegoHoras(initialLabor.duracionRiegoHoras ?? 6.5);
      setRegistradoPor(initialLabor.registradoPor || activeUser?.nombre || 'Administrador');
      setObservaciones(initialLabor.observaciones || '');
    } else {
      setFecha(new Date().toISOString().split('T')[0]);
      setHora(getCurrentHHMM());
      setParcelaId(defaultParcelaId || parcelas[0]?.id || '');
      setSectorGeneralNombre('Huerto General');
      setSuperficieManualHa(1.0);
      setTipoLabor(defaultTipoLabor || 'fitosanitario');
      setDescripcion('');
      setInsumoId(inventario[0]?.id || '');
      setNombreInsumoManual('');
      setUnidadManual('Litros');
      setDosisPorHa(1.0);
      setVolumenCaldoLHa(1000);
      setMetodoAplicacion('Turbo Pulverizador');
      setTractoristaMaquinaria('');
      setObjetivoPlaga('Control preventivo Psa / Botrytis');
      setVolumenM3(480);
      setDuracionRiegoHoras(6.5);
      setRegistradoPor(activeUser?.nombre || 'Administrador');
      setObservaciones('');
    }
  }, [initialLabor, defaultParcelaId, defaultTipoLabor, isOpen, activeUser, parcelas, inventario]);

  if (!isOpen) return null;

  const selectedParcela = parcelas.find((p) => p.id === parcelaId) || null;
  const selectedInsumo = inventario.find((i) => i.id === insumoId) || null;

  const superficieBase = selectedParcela ? selectedParcela.superficieHa : (Number(superficieManualHa) || 1);
  const totalInsumoCalculado = Number((superficieBase * (Number(dosisPorHa) || 0)).toFixed(2));
  const unidadMostrada = selectedInsumo?.unidad || unidadManual || 'Litros';
  const carenciaMostrada = selectedInsumo?.periodoCarenciaDias ?? 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isFitoOrFert = tipoLabor === 'fitosanitario' || tipoLabor === 'fertilizacion';
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
        `${tipoLabor.toUpperCase()}: ${
          isFitoOrFert
            ? insumoNombreFinal || 'Aplicación agrícola'
            : isRiego
            ? `${volumenM3} m³ de agua`
            : 'Labor agronómica general'
        }`,
      insumoId: isFitoOrFert && selectedInsumo ? selectedInsumo.id : undefined,
      nombreInsumo: isFitoOrFert ? insumoNombreFinal : undefined,
      dosisPorHa: isFitoOrFert ? Number(dosisPorHa) || 0 : undefined,
      volumenCaldoLHa: isFitoOrFert ? Number(volumenCaldoLHa) || 0 : undefined,
      totalInsumoUtilizado: isFitoOrFert && insumoNombreFinal ? totalInsumoCalculado : undefined,
      unidadMedida: isFitoOrFert && insumoNombreFinal ? unidadMostrada : undefined,
      metodoAplicacion: isFitoOrFert ? metodoAplicacion : undefined,
      tractoristaMaquinaria: isFitoOrFert ? tractoristaMaquinaria : undefined,
      periodoCarenciaDias: isFitoOrFert ? carenciaMostrada : 0,
      reingresoHoras: isFitoOrFert ? (selectedInsumo?.tiempoReingresoHoras ?? 0) : 0,
      objetivoPlagaEnfermedad: isFitoOrFert ? objetivoPlaga : undefined,
      volumenM3: isRiego ? Number(volumenM3) || 0 : undefined,
      litrosAgua: isRiego ? (Number(volumenM3) || 0) * 1000 : undefined,
      duracionRiegoHoras: isRiego ? Number(duracionRiegoHoras) || 0 : undefined,
      sectorRiego: isRiego ? parcelaNombreFinal : undefined,
      registradoPor: registradoPor.trim() || activeUser?.nombre || 'Administrador',
      numeroCarnetSAG: activeUser?.numeroCarnetSAG,
      condicionesClimaticas: {
        temperaturaC: climaActual?.temperaturaActual ?? 20,
        humedadRelativa: climaActual?.humedadRelativa ?? 60,
        velocidadVientoKmH: climaActual?.velocidadVientoKmH ?? 5
      },
      observaciones
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
                  onChange={(e) => setParcelaId(e.target.value)}
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
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={superficieManualHa}
                  onChange={(e) => setSuperficieManualHa(parseFloat(e.target.value) || 1)}
                  className="w-20 p-1 bg-white border border-amber-300 rounded text-xs font-bold"
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
                { id: 'fertilizacion', label: 'Fertilización' },
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
                  onClick={() => setTipoLabor(t.id as TipoLabor)}
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

          {/* Campos condicionales para Fitosanitarios / Fertilizantes */}
          {(tipoLabor === 'fitosanitario' || tipoLabor === 'fertilizacion') && (
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
              <div className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                Parámetros del Agroquímico / Fertilizante
              </div>

              {inventario.length > 0 ? (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Producto en Bodega:</label>
                  <select
                    value={insumoId}
                    onChange={(e) => setInsumoId(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  >
                    {inventario.map((i) => (
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
                    <label className="block font-bold text-stone-700 mb-1">Nombre del Producto (Manual):</label>
                    <input
                      type="text"
                      value={nombreInsumoManual}
                      onChange={(e) => setNombreInsumoManual(e.target.value)}
                      placeholder="Ej. Oxicloruro de Cobre / Aminoácidos"
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Dosis por Ha:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={dosisPorHa}
                    onChange={(e) => setDosisPorHa(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-xs"
                    required
                  />
                  <span className="text-[10px] text-stone-500">Total: {totalInsumoCalculado} {unidadMostrada}</span>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Mojamiento (L/ha):</label>
                  <input
                    type="number"
                    min="0"
                    value={volumenCaldoLHa}
                    onChange={(e) => setVolumenCaldoLHa(parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                    placeholder="1000"
                  />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  <label className="block font-bold text-stone-700 mb-1">Tractorista / Operador:</label>
                  <input
                    type="text"
                    value={tractoristaMaquinaria}
                    onChange={(e) => setTractoristaMaquinaria(e.target.value)}
                    placeholder="Nombre operador / equipo"
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
                  <input
                    type="number"
                    min="0"
                    value={volumenM3}
                    onChange={(e) => setVolumenM3(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-blue-900 font-mono text-sm"
                    required
                  />
                  <span className="text-[10px] text-stone-400">{(volumenM3 * 1000).toLocaleString('es-CL')} Litros</span>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Duración Bombeo (Horas):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={duracionRiegoHoras}
                    onChange={(e) => setDuracionRiegoHoras(parseFloat(e.target.value) || 0)}
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
