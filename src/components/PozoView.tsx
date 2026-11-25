import React, { useState, useEffect } from 'react';
import { RegistroExtraccionPozo, SectorRiego, ExplotacionAgricola } from '../types/campo';
import { getStoredSectoresRiego, saveStoredSectoresRiego } from '../utils/storage';
import { exportPozoPDF } from '../utils/pdfExport';
import { 
  Droplet, 
  Plus, 
  Trash2, 
  Edit3, 
  Gauge, 
  Clock, 
  Calendar, 
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Activity,
  AlertCircle,
  Settings,
  X,
  Check,
  Download
} from 'lucide-react';

interface PozoViewProps {
  registrosPozo: RegistroExtraccionPozo[];
  onAddRegistroPozo: (registro: RegistroExtraccionPozo) => void;
  onUpdateRegistroPozo: (registro: RegistroExtraccionPozo) => void;
  onDeleteRegistroPozo: (id: string) => void;
  explotacion?: ExplotacionAgricola;
  canEdit?: boolean;
}

export const PozoView: React.FC<PozoViewProps> = ({
  registrosPozo,
  onAddRegistroPozo,
  onUpdateRegistroPozo,
  onDeleteRegistroPozo,
  explotacion,
  canEdit = true
}) => {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<RegistroExtraccionPozo | null>(null);
  const [registroToDelete, setRegistroToDelete] = useState<RegistroExtraccionPozo | null>(null);

  // Sectores de Riego dinámicos y 100% editables por el usuario
  const [sectoresRiego, setSectoresRiego] = useState<SectorRiego[]>(getStoredSectoresRiego);

  useEffect(() => {
    const handleUpdate = () => {
      setSectoresRiego(getStoredSectoresRiego());
    };
    window.addEventListener('fundo_sectores_updated', handleUpdate);
    return () => window.removeEventListener('fundo_sectores_updated', handleUpdate);
  }, []);

  const [isSectoresModalOpen, setIsSectoresModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<SectorRiego | null>(null);
  const [sectorForm, setSectorForm] = useState<SectorRiego>({
    id: 1,
    nombre: '',
    ha: 0,
    caudalDisenoLs: 0,
    descripcion: ''
  });

  // Totales generales
  const totalM3 = registrosPozo.reduce((acc, r) => acc + (r.metrosCubicosExtraidos || 0), 0);
  const totalLitros = registrosPozo.reduce((acc, r) => acc + (r.litrosTotales || 0), 0);
  const totalHoras = registrosPozo.reduce((acc, r) => acc + (r.horasBombeo || r.horasHorometro || 0), 0);
  const caudalPromedioGlobal = totalHoras > 0 ? (totalLitros / (totalHoras * 3600)).toFixed(1) : '0.0';

  const ultimaLecturaM3 = registrosPozo.length > 0
    ? Math.max(...registrosPozo.map((r) => r.lecturaFinalM3 || 0))
    : 0;

  const ultimoHorometro = registrosPozo.length > 0
    ? Math.max(...registrosPozo.map((r) => r.horometroFinalHoras || 0))
    : 0;

  // Estado formulario
  const [formPozo, setFormPozo] = useState<Partial<RegistroExtraccionPozo>>({
    fecha: new Date().toISOString().split('T')[0],
    hora: '08:00',
    fechaHoraMuestreo: new Date().toISOString().replace('T', ' ').substring(0, 16),
    sectorRiegoNumero: 1,
    sectorDestino: '',
    horometroInicialHoras: 0,
    horometroFinalHoras: 0,
    horasHorometro: 0,
    caudalInicialLs: 0,
    caudalFinalLs: 0,
    caudalPromedioLs: 0,
    lecturaInicialM3: 0,
    lecturaFinalM3: 0,
    metrosCubicosExtraidos: 0,
    litrosTotales: 0,
    horasBombeo: 0,
    nivelEstaticoM: 0,
    nivelDinamicoM: 0,
    operadorBomba: '',
    observaciones: ''
  });

  // Cálculos automáticos para el formulario
  const m3Form = Math.max(0, (formPozo.lecturaFinalM3 || 0) - (formPozo.lecturaInicialM3 || 0));
  const hrsHorometroForm = Math.max(0, Number(((formPozo.horometroFinalHoras || 0) - (formPozo.horometroInicialHoras || 0)).toFixed(2)));
  const caudalCalcLs = hrsHorometroForm > 0 
    ? Number(((m3Form * 1000) / (hrsHorometroForm * 3600)).toFixed(1))
    : formPozo.caudalInicialLs || 0;

  const handleOpenEdit = (registro: RegistroExtraccionPozo) => {
    setEditingRegistro(registro);
    setFormPozo({ ...registro });
    setIsEditModalOpen(true);
  };

  const handleOpenNew = () => {
    const firstSector = sectoresRiego[0];
    setFormPozo({
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().substring(0, 5),
      fechaHoraMuestreo: new Date().toISOString().replace('T', ' ').substring(0, 16),
      sectorRiegoNumero: firstSector ? Number(firstSector.id) || 1 : 1,
      sectorDestino: firstSector ? firstSector.nombre : '',
      horometroInicialHoras: ultimoHorometro,
      horometroFinalHoras: ultimoHorometro,
      horasHorometro: 0,
      caudalInicialLs: 0,
      caudalFinalLs: 0,
      caudalPromedioLs: 0,
      lecturaInicialM3: ultimaLecturaM3,
      lecturaFinalM3: ultimaLecturaM3,
      metrosCubicosExtraidos: 0,
      litrosTotales: 0,
      horasBombeo: 0,
      nivelEstaticoM: 0,
      nivelDinamicoM: 0,
      operadorBomba: '',
      observaciones: ''
    });
    setIsNewModalOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    const m3 = Math.max(0, (formPozo.lecturaFinalM3 || 0) - (formPozo.lecturaInicialM3 || 0));
    const litros = m3 * 1000;
    const hrsHorom = Math.max(0, Number(((formPozo.horometroFinalHoras || 0) - (formPozo.horometroInicialHoras || 0)).toFixed(2)));
    const caudalMedio = hrsHorom > 0 
      ? Number(((litros) / (hrsHorom * 3600)).toFixed(1))
      : Number((((formPozo.caudalInicialLs || 0) + (formPozo.caudalFinalLs || 0)) / 2).toFixed(1));

    const nuevo: RegistroExtraccionPozo = {
      id: `pz-${Date.now()}`,
      fecha: formPozo.fecha || new Date().toISOString().split('T')[0],
      hora: formPozo.hora || '08:00',
      fechaHoraMuestreo: formPozo.fechaHoraMuestreo || `${formPozo.fecha} ${formPozo.hora}`,
      sectorRiegoNumero: Number(formPozo.sectorRiegoNumero) || 1,
      horometroInicialHoras: Number(formPozo.horometroInicialHoras) || 0,
      horometroFinalHoras: Number(formPozo.horometroFinalHoras) || 0,
      horasHorometro: hrsHorom,
      caudalInicialLs: Number(formPozo.caudalInicialLs) || 0,
      caudalFinalLs: Number(formPozo.caudalFinalLs) || 0,
      caudalPromedioLs: caudalMedio,
      lecturaInicialM3: Number(formPozo.lecturaInicialM3) || 0,
      lecturaFinalM3: Number(formPozo.lecturaFinalM3) || 0,
      metrosCubicosExtraidos: m3,
      litrosTotales: litros,
      horasBombeo: hrsHorom,
      nivelEstaticoM: Number(formPozo.nivelEstaticoM) || 0,
      nivelDinamicoM: Number(formPozo.nivelDinamicoM) || 0,
      sectorDestino: formPozo.sectorDestino || `Sector ${formPozo.sectorRiegoNumero || 1}`,
      operadorBomba: formPozo.operadorBomba || 'Operador Bomba',
      observaciones: formPozo.observaciones || ''
    };

    onAddRegistroPozo(nuevo);
    setIsNewModalOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegistro) return;

    const m3 = Math.max(0, (formPozo.lecturaFinalM3 || 0) - (formPozo.lecturaInicialM3 || 0));
    const litros = m3 * 1000;
    const hrsHorom = Math.max(0, Number(((formPozo.horometroFinalHoras || 0) - (formPozo.horometroInicialHoras || 0)).toFixed(2)));
    const caudalMedio = hrsHorom > 0 
      ? Number(((litros) / (hrsHorom * 3600)).toFixed(1))
      : Number((((formPozo.caudalInicialLs || 20) + (formPozo.caudalFinalLs || 20)) / 2).toFixed(1));

    const actualizado: RegistroExtraccionPozo = {
      ...editingRegistro,
      ...formPozo as RegistroExtraccionPozo,
      metrosCubicosExtraidos: m3,
      litrosTotales: litros,
      horasHorometro: hrsHorom,
      horasBombeo: hrsHorom,
      caudalPromedioLs: caudalMedio
    };

    onUpdateRegistroPozo(actualizado);
    setIsEditModalOpen(false);
    setEditingRegistro(null);
  };

  const handleOpenAddSector = () => {
    const nextId = sectoresRiego.length > 0 ? Math.max(...sectoresRiego.map(s => Number(s.id) || 0)) + 1 : 1;
    setSectorForm({
      id: nextId,
      nombre: `Sector ${nextId}`,
      ha: 0,
      caudalDisenoLs: 0,
      descripcion: ''
    });
    setEditingSector(null);
  };

  const handleEditSector = (sec: SectorRiego) => {
    setEditingSector(sec);
    setSectorForm({ ...sec });
  };

  const handleSaveSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorForm.nombre) return;
    let updated: SectorRiego[];
    if (editingSector) {
      updated = sectoresRiego.map((s) => s.id === editingSector.id ? { ...sectorForm, id: editingSector.id } : s);
    } else {
      updated = [...sectoresRiego, { ...sectorForm }];
    }
    setSectoresRiego(updated);
    saveStoredSectoresRiego(updated);
    setEditingSector(null);
  };

  const handleDeleteSector = (sectorId: number | string) => {
    const updated = sectoresRiego.filter((s) => s.id !== sectorId);
    setSectoresRiego(updated);
    saveStoredSectoresRiego(updated);
    if (editingSector?.id === sectorId) {
      setEditingSector(null);
    }
  };

  // Desglose por Sector de Riego (1 a N)
  const statsSectores = sectoresRiego.map((s) => {
    const regSector = registrosPozo.filter((r) => r.sectorRiegoNumero === s.id || r.sectorDestino?.includes(`Sector ${s.id}`));
    const m3Sector = regSector.reduce((acc, r) => acc + (r.metrosCubicosExtraidos || 0), 0);
    const hrsSector = regSector.reduce((acc, r) => acc + (r.horasBombeo || r.horasHorometro || 0), 0);
    const m3Ha = (s.ha && s.ha > 0) ? (m3Sector / s.ha).toFixed(0) : '0';
    return {
      ...s,
      m3Total: m3Sector,
      horasTotal: hrsSector,
      m3PorHa: m3Ha,
      cantidadRiegos: regSector.length
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Gauge className="w-3 h-3 text-blue-700 dark:text-blue-400" />
            Pozo Profundo · Fiscalización DGA
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Control de Pozo Profundo & Fiscalización DGA
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Monitoreo reglamentario obligatorio para la Dirección General de Aguas (DGA): horómetro, flujómetro (m³), caudales inicial/final (L/s), niveles piezométricos y libro oficial.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          <button
            type="button"
            onClick={() => exportPozoPDF(registrosPozo, sectoresRiego, explotacion)}
            className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold border border-stone-300 dark:border-stone-700 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-blue-800 dark:text-blue-300" />
            <span>Exportar PDF ({registrosPozo.length})</span>
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => setIsSectoresModalOpen(true)}
                className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold border border-stone-300 dark:border-stone-700 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                title="Editar o agregar sectores de riego del predio"
              >
                <Settings className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                <span>Gestionar Sectores de Riego</span>
              </button>

              <button
                onClick={handleOpenNew}
                className="px-3.5 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Anotar Muestreo / Lectura DGA</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas DGA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Volumen Extraído Total</div>
          <div className="text-2xl font-black text-blue-950 dark:text-blue-100 mt-1">{totalM3.toLocaleString('es-CL')} m³</div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{(totalLitros / 1000000).toFixed(2)} Millones de Litros</div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Caudal Medio Operativo</div>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">{caudalPromedioGlobal} L/s</div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Promedio de bombeo registrado</div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Horómetro Acumulado</div>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1 font-mono">{ultimoHorometro.toFixed(1)} hrs</div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Totalizador acumulado de bomba</div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Última Lectura Totalizador</div>
          <div className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1 font-mono">{ultimaLecturaM3.toLocaleString('es-CL')} m³</div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">Flujómetro / caudalímetro del predio</div>
        </div>
      </div>

      {/* Control por Sectores de Riego */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Balance Hídrico por Sectores de Riego ({statsSectores.length} {statsSectores.length === 1 ? 'sector' : 'sectores'} · {statsSectores.reduce((a, s) => a + (s.ha || 0), 0).toFixed(1)} ha)
          </h2>
          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
            Cuaderno SAG & GlobalGAP
          </span>
        </div>

        {statsSectores.length === 0 ? (
          <div className="p-6 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 text-center space-y-2">
            <p className="text-xs font-bold text-stone-700 dark:text-stone-300">No hay sectores de riego configurados todavía.</p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">Agrega los sectores reales de tu huerto para visualizar el balance hídrico por sector.</p>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsSectoresModalOpen(true)}
                className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Configurar Sectores de Riego</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {statsSectores.map((sec) => (
              <div key={sec.id} className="p-3.5 bg-blue-50/40 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-950 dark:text-blue-100">Sector {sec.id}</span>
                    <span className="text-[10px] font-mono font-bold text-stone-500 dark:text-stone-400 bg-white dark:bg-stone-900 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-800">
                      {sec.ha} Ha
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 line-clamp-1">{sec.nombre}</div>
                </div>

                <div className="mt-3 pt-2 border-t border-blue-100/80 dark:border-blue-900/60 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400 text-[11px]">Volumen:</span>
                    <span className="font-mono font-bold text-blue-900 dark:text-blue-200">{sec.m3Total.toLocaleString('es-CL')} m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400 text-[11px]">Lámina aplicada:</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">{sec.m3PorHa} m³/ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 dark:text-stone-400 text-[11px]">Horas bombeo:</span>
                    <span className="font-mono text-stone-800 dark:text-stone-200">{sec.horasTotal.toFixed(1)} hrs</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Planilla Oficial DGA */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              Planilla Oficial de Fiscalización DGA (Dirección General de Aguas)
            </h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
              Horómetro inicial/final, Caudal L/s inicial/final, Fecha y hora exacta de muestreo. Registros 100% editables.
            </p>
          </div>
          <span className="text-xs text-stone-400 font-medium">{registrosPozo.length} muestreos</span>
        </div>

        {registrosPozo.length === 0 ? (
          <div className="p-8 text-center text-stone-400 space-y-2">
            <Gauge className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-sm text-stone-700 dark:text-stone-300">No hay lecturas ni muestreos de pozo registrados</p>
            <p className="text-xs">Comienza registrando la primera lectura oficial de horómetro y flujómetro.</p>
            {canEdit && (
              <button
                type="button"
                onClick={handleOpenNew}
                className="mt-2 px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Anotar Muestreo / Lectura DGA</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-3">Fecha & Hora Muestreo</th>
                  <th className="px-3 py-3">Sector Riego</th>
                  <th className="px-3 py-3">Horómetro (Ini / Fin)</th>
                  <th className="px-3 py-3">Horas Op.</th>
                  <th className="px-3 py-3">Caudal L/s (Ini / Fin)</th>
                  <th className="px-3 py-3">Caudal Med.</th>
                  <th className="px-3 py-3">Flujómetro (Ini / Fin)</th>
                  <th className="px-3 py-3">Volumen m³</th>
                  <th className="px-3 py-3">Niveles Piez.</th>
                  <th className="px-3 py-3">Operador</th>
                  {canEdit && <th className="px-3 py-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                {registrosPozo.map((r) => {
                  const horomIni = r.horometroInicialHoras || 0;
                  const horomFin = r.horometroFinalHoras || (horomIni + r.horasBombeo);
                  const qIni = r.caudalInicialLs || r.caudalPromedioLs;
                  const qFin = r.caudalFinalLs || r.caudalPromedioLs;

                  return (
                    <tr key={r.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/60 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-mono font-medium text-stone-900 dark:text-stone-100">
                          {r.fechaHoraMuestreo || `${r.fecha} ${r.hora}`}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 whitespace-nowrap">
                          {r.sectorDestino || `Sector ${r.sectorRiegoNumero || 1}`}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap">
                        {horomIni.toFixed(1)} &rarr; <span className="font-bold text-stone-900 dark:text-stone-100">{horomFin.toFixed(1)} h</span>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-blue-950 dark:text-blue-100 whitespace-nowrap">
                        {(r.horasHorometro || r.horasBombeo).toFixed(1)} h
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap">
                        {qIni} &rarr; <span className="font-bold text-emerald-900 dark:text-emerald-200">{qFin} L/s</span>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-emerald-900 dark:text-emerald-200 whitespace-nowrap">
                        {r.caudalPromedioLs} L/s
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap text-stone-600 dark:text-stone-400">
                        {r.lecturaInicialM3.toLocaleString('es-CL')} &rarr; {r.lecturaFinalM3.toLocaleString('es-CL')}
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-blue-950 dark:text-blue-100 whitespace-nowrap">
                        {r.metrosCubicosExtraidos.toLocaleString('es-CL')} m³
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap text-stone-500 dark:text-stone-400">
                        Est: {r.nivelEstaticoM ? `${r.nivelEstaticoM}m` : '—'} / Din: {r.nivelDinamicoM ? `${r.nivelDinamicoM}m` : '—'}
                      </td>
                      <td className="px-3 py-3 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                        {r.operadorBomba}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="px-2 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Editar lectura DGA"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => setRegistroToDelete(r)}
                              className="px-2 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Eliminar lectura DGA"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Nueva Lectura DGA */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="bg-blue-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-400" />
                Nueva Lectura Oficial DGA - Pozo Profundo
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-blue-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveNew} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha y Hora de Muestreo DGA:</label>
                  <input
                    type="text"
                    value={formPozo.fechaHoraMuestreo}
                    onChange={(e) => setFormPozo({ ...formPozo, fechaHoraMuestreo: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-medium dark:text-stone-100"
                    placeholder="2026-03-24 07:30"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Sector de Riego:</label>
                  {sectoresRiego.length > 0 ? (
                    <select
                      value={formPozo.sectorRiegoNumero}
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        const sec = sectoresRiego.find((s) => Number(s.id) === num);
                        setFormPozo({
                          ...formPozo,
                          sectorRiegoNumero: num,
                          sectorDestino: sec ? sec.nombre : `Sector ${num}`
                        });
                      }}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-bold text-blue-900 dark:text-blue-200"
                    >
                      {sectoresRiego.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre} ({s.ha || 0} ha)</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formPozo.sectorDestino || ''}
                      onChange={(e) => setFormPozo({ ...formPozo, sectorDestino: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-bold text-blue-900 dark:text-blue-200"
                      placeholder="Ej. Sector 1 o Cuartel Norte"
                      required
                    />
                  )}
                </div>
              </div>

              {/* Horómetro */}
              <div className="p-3 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  Horómetro de la Bomba (Horas reales de funcionamiento)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Horómetro Inicial:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formPozo.horometroInicialHoras}
                      onChange={(e) => setFormPozo({ ...formPozo, horometroInicialHoras: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Horómetro Final:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formPozo.horometroFinalHoras}
                      onChange={(e) => setFormPozo({ ...formPozo, horometroFinalHoras: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold text-blue-900 dark:text-blue-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Horas Calculadas:</label>
                    <div className="p-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg font-mono font-black text-stone-900 dark:text-stone-100">
                      {hrsHorometroForm} hrs
                    </div>
                  </div>
                </div>
              </div>

              {/* Caudales Inicial y Final */}
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                <div className="font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5 text-xs">
                  <Gauge className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  Caudal Instantáneo Registrado (Litros por segundo - L/s)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Caudal Inicial (L/s):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formPozo.caudalInicialLs}
                      onChange={(e) => setFormPozo({ ...formPozo, caudalInicialLs: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Caudal Final (L/s):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formPozo.caudalFinalLs}
                      onChange={(e) => setFormPozo({ ...formPozo, caudalFinalLs: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Caudal Promedio:</label>
                    <div className="p-2 bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 rounded-lg font-mono font-black text-emerald-900 dark:text-emerald-200">
                      {caudalCalcLs} L/s
                    </div>
                  </div>
                </div>
              </div>

              {/* Flujómetro m3 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Lectura Flujómetro Inicial (m³):</label>
                  <input
                    type="number"
                    value={formPozo.lecturaInicialM3}
                    onChange={(e) => setFormPozo({ ...formPozo, lecturaInicialM3: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Lectura Flujómetro Final (m³):</label>
                  <input
                    type="number"
                    value={formPozo.lecturaFinalM3}
                    onChange={(e) => setFormPozo({ ...formPozo, lecturaFinalM3: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold text-blue-900 dark:text-blue-200"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl flex items-center justify-between text-xs">
                <span>Volumen Extraído: <strong className="font-mono text-blue-950 dark:text-blue-100 font-black">{m3Form} m³</strong></span>
                <span>Equivalente: <strong className="font-mono text-blue-950 dark:text-blue-100 font-black">{(m3Form * 1000).toLocaleString('es-CL')} L</strong></span>
              </div>

              {/* Niveles Piezométricos & Operador */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nivel Estático (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formPozo.nivelEstaticoM}
                    onChange={(e) => setFormPozo({ ...formPozo, nivelEstaticoM: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nivel Dinámico (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formPozo.nivelDinamicoM}
                    onChange={(e) => setFormPozo({ ...formPozo, nivelDinamicoM: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Operador Responsable:</label>
                  <input
                    type="text"
                    value={formPozo.operadorBomba}
                    onChange={(e) => setFormPozo({ ...formPozo, operadorBomba: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Observaciones / Presión Cabezal:</label>
                <textarea
                  value={formPozo.observaciones}
                  onChange={(e) => setFormPozo({ ...formPozo, observaciones: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/70 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Guardar en Registro DGA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Lectura DGA */}
      {isEditModalOpen && editingRegistro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                Editar Registro DGA (ID: {editingRegistro.id})
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-stone-300 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha y Hora de Muestreo:</label>
                  <input
                    type="text"
                    value={formPozo.fechaHoraMuestreo}
                    onChange={(e) => setFormPozo({ ...formPozo, fechaHoraMuestreo: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-medium dark:text-stone-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Sector de Riego:</label>
                  <select
                    value={formPozo.sectorRiegoNumero}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      const sec = sectoresRiego.find((s) => Number(s.id) === num);
                      setFormPozo({
                        ...formPozo,
                        sectorRiegoNumero: num,
                        sectorDestino: sec ? sec.nombre : `Sector ${num}`
                      });
                    }}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-bold text-blue-900 dark:text-blue-200"
                  >
                    {sectoresRiego.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre} ({s.ha || 0} ha)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Horómetro */}
              <div className="p-3 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  Horómetro de la Bomba
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Horómetro Inicial:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formPozo.horometroInicialHoras}
                      onChange={(e) => setFormPozo({ ...formPozo, horometroInicialHoras: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Horómetro Final:</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formPozo.horometroFinalHoras}
                      onChange={(e) => setFormPozo({ ...formPozo, horometroFinalHoras: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold text-blue-900 dark:text-blue-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Horas Calculadas:</label>
                    <div className="p-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg font-mono font-black text-stone-900 dark:text-stone-100">
                      {hrsHorometroForm} hrs
                    </div>
                  </div>
                </div>
              </div>

              {/* Caudales */}
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                <div className="font-bold text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5 text-xs">
                  <Gauge className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  Caudal Registrado (L/s)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Caudal Inicial (L/s):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formPozo.caudalInicialLs}
                      onChange={(e) => setFormPozo({ ...formPozo, caudalInicialLs: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Caudal Final (L/s):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formPozo.caudalFinalLs}
                      onChange={(e) => setFormPozo({ ...formPozo, caudalFinalLs: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-0.5">Caudal Promedio:</label>
                    <div className="p-2 bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 rounded-lg font-mono font-black text-emerald-900 dark:text-emerald-200">
                      {caudalCalcLs} L/s
                    </div>
                  </div>
                </div>
              </div>

              {/* Flujómetro m3 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Lectura Flujómetro Inicial (m³):</label>
                  <input
                    type="number"
                    value={formPozo.lecturaInicialM3}
                    onChange={(e) => setFormPozo({ ...formPozo, lecturaInicialM3: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Lectura Flujómetro Final (m³):</label>
                  <input
                    type="number"
                    value={formPozo.lecturaFinalM3}
                    onChange={(e) => setFormPozo({ ...formPozo, lecturaFinalM3: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold text-blue-900 dark:text-blue-200"
                    required
                  />
                </div>
              </div>

              {/* Niveles Piezométricos & Operador */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nivel Estático (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formPozo.nivelEstaticoM}
                    onChange={(e) => setFormPozo({ ...formPozo, nivelEstaticoM: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nivel Dinámico (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formPozo.nivelDinamicoM}
                    onChange={(e) => setFormPozo({ ...formPozo, nivelDinamicoM: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Operador Responsable:</label>
                  <input
                    type="text"
                    value={formPozo.operadorBomba}
                    onChange={(e) => setFormPozo({ ...formPozo, operadorBomba: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Observaciones:</label>
                <textarea
                  value={formPozo.observaciones}
                  onChange={(e) => setFormPozo({ ...formPozo, observaciones: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/70 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Actualizar Registro DGA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Eliminación Lectura DGA */}
      {registroToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Eliminar Lectura Oficial DGA</h3>
              <button onClick={() => setRegistroToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-stone-700 dark:text-stone-300">
                ¿Estás seguro de que deseas eliminar la lectura del pozo registrada el <strong>{registroToDelete.fechaHoraMuestreo || registroToDelete.fecha}</strong>?
              </p>
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 text-[11px] space-y-1">
                <div><strong>Sector:</strong> {registroToDelete.sectorDestino}</div>
                <div><strong>Volumen:</strong> {registroToDelete.metrosCubicosExtraidos} m³</div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setRegistroToDelete(null)}
                  className="px-3.5 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/70 cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteRegistroPozo(registroToDelete.id);
                    setRegistroToDelete(null);
                  }}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GESTIÓN DE SECTORES DE RIEGO */}
      {isSectoresModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <div className="bg-blue-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                Configuración y Edición de Sectores de Riego
              </h3>
              <button onClick={() => { setIsSectoresModalOpen(false); setEditingSector(null); }} className="text-blue-200 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs">Sectores Activos del Predio ({sectoresRiego.length})</h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Puedes editar nombres, hectáreas y caudales de diseño para cálculo de balance hídrico.</p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddSector}
                  className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Sector</span>
                </button>
              </div>

              {/* Formulario para Crear / Editar Sector */}
              <form onSubmit={handleSaveSector} className="p-3.5 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/80 space-y-3">
                <div className="font-bold text-blue-950 dark:text-blue-100 flex items-center justify-between">
                  <span>{editingSector ? `Editando: ${editingSector.nombre}` : 'Agregar o Modificar Sector'}</span>
                  {editingSector && (
                    <button
                      type="button"
                      onClick={() => { setEditingSector(null); setSectorForm({ id: 0, nombre: '', ha: 5.0, caudalDisenoLs: 20.0, descripcion: '' }); }}
                      className="text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 text-[11px] underline cursor-pointer"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nombre del Sector:</label>
                    <input
                      type="text"
                      value={sectorForm.nombre}
                      onChange={(e) => setSectorForm({ ...sectorForm, nombre: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-bold dark:text-stone-100"
                      placeholder="ej. Sector 1 - Parrón Español Norte"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Superficie (Ha):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={sectorForm.ha || 0}
                      onChange={(e) => setSectorForm({ ...sectorForm, ha: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Caudal Diseño (L/s):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={sectorForm.caudalDisenoLs || 0}
                      onChange={(e) => setSectorForm({ ...sectorForm, caudalDisenoLs: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Descripción / Tipo de Emisor:</label>
                    <input
                      type="text"
                      value={sectorForm.descripcion || ''}
                      onChange={(e) => setSectorForm({ ...sectorForm, descripcion: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                      placeholder="ej. Goteo autocompensado 2.3 L/h"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{editingSector ? 'Guardar Cambios del Sector' : 'Agregar Sector'}</span>
                  </button>
                </div>
              </form>

              {/* Lista de Sectores Existentes */}
              <div className="space-y-2">
                {sectoresRiego.length === 0 ? (
                  <div className="p-4 text-center text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-stone-200 dark:border-stone-800">
                    No hay sectores configurados. Usa el formulario superior para crear tu primer sector.
                  </div>
                ) : (
                  sectoresRiego.map((sec) => (
                    <div key={sec.id} className="p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 shadow-2xs hover:border-blue-300 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-950 dark:text-blue-100 px-2 py-0.5 rounded">
                            Sector {sec.id}
                          </span>
                          <strong className="text-stone-900 dark:text-stone-100 text-xs">{sec.nombre}</strong>
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                          {sec.ha || 0} Hectáreas · Caudal diseño: {sec.caudalDisenoLs || 0} L/s {sec.descripcion ? `· ${sec.descripcion}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditSector(sec)}
                          className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSector(sec.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer transition-colors"
                          title="Eliminar sector"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => { setIsSectoresModalOpen(false); setEditingSector(null); }}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
