import React, { useState, useEffect } from 'react';
import { TurnoRiego, SectorRiego, Parcela, ClimaCondiciones } from '../types/campo';
import { initialSectoresRiego } from '../data/initialData';
import { 
  Droplet, 
  Plus, 
  Trash2, 
  Edit3, 
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
  Sparkles,
  Waves,
  Zap,
  Info
} from 'lucide-react';

interface RiegoViewProps {
  turnosRiego: TurnoRiego[];
  onAddTurnoRiego: (turno: TurnoRiego) => void;
  onUpdateTurnoRiego: (turno: TurnoRiego) => void;
  onDeleteTurnoRiego: (id: string) => void;
  parcelas: Parcela[];
  clima?: ClimaCondiciones;
}

export const RiegoView: React.FC<RiegoViewProps> = ({
  turnosRiego,
  onAddTurnoRiego,
  onUpdateTurnoRiego,
  onDeleteTurnoRiego,
  parcelas,
  clima
}) => {
  const [isNewTurnoOpen, setIsNewTurnoOpen] = useState(false);
  const [isEditTurnoOpen, setIsEditTurnoOpen] = useState(false);
  const [editingTurno, setEditingTurno] = useState<TurnoRiego | null>(null);
  const [turnoToDelete, setTurnoToDelete] = useState<TurnoRiego | null>(null);

  // Sectores de Riego dinámicos
  const [sectoresRiego, setSectoresRiego] = useState<SectorRiego[]>(() => {
    try {
      const saved = localStorage.getItem('fundo_sectores_riego');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error leyendo sectores de riego:', e);
    }
    return initialSectoresRiego;
  });

  const [isSectoresModalOpen, setIsSectoresModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<SectorRiego | null>(null);
  const [sectorForm, setSectorForm] = useState<SectorRiego>({
    id: 1,
    nombre: '',
    ha: 5.0,
    caudalDisenoLs: 20.0,
    descripcion: ''
  });

  // Escuchar actualizaciones de sectores de riego
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const saved = localStorage.getItem('fundo_sectores_riego');
        if (saved) setSectoresRiego(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener('fundo_sectores_updated', handleUpdate);
    return () => window.removeEventListener('fundo_sectores_updated', handleUpdate);
  }, []);

  const saveSectores = (newSectores: SectorRiego[]) => {
    setSectoresRiego(newSectores);
    localStorage.setItem('fundo_sectores_riego', JSON.stringify(newSectores));
    window.dispatchEvent(new Event('fundo_sectores_updated'));
  };

  // Totales de turnos de riego
  const totalHorasRegadas = turnosRiego.reduce((acc, t) => acc + (t.duracionHoras || 0), 0);
  const totalM3Riego = turnosRiego.reduce((acc, t) => acc + (t.volumenM3 || 0), 0);
  const totalLaminaMm = turnosRiego.reduce((acc, t) => acc + (t.laminaAguaMm || 0), 0);
  const laminaPromedio = turnosRiego.length > 0 ? (totalLaminaMm / turnosRiego.length).toFixed(1) : '4.6';

  // Demanda hídrica diaria de referencia
  const etoActual = clima?.evapotranspiracionEtoMmDia ?? 4.5;
  const kcEstimado = 1.05; // Kc Kiwi Hayward pleno crecimiento
  const demandaEtc = Number((etoActual * kcEstimado).toFixed(1));

  // Estado del Formulario de Turno
  const [formTurno, setFormTurno] = useState<Partial<TurnoRiego>>({
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: '08:00',
    horaTermino: '14:30',
    sectorRiegoId: 1,
    sectorNombre: 'Sector 1 - Parrón Español Norte',
    cuartelesInvolucrados: ['Cuartel 1 - Parrón Norte'],
    duracionHoras: 6.5,
    laminaAguaMm: 4.8,
    volumenM3: 260,
    conFertirriego: false,
    fertilizanteInyectado: '',
    dosisFertilizanteKg: 0,
    presionCabezalBar: 3.8,
    presionFinLineaBar: 1.8,
    operadorRiego: 'Rodrigo Tapia San Martín',
    observaciones: 'Turno de riego programado por goteo doble línea. Presión óptima.'
  });

  // Abrir nuevo turno
  const handleOpenNewTurno = (sectorIdPreset?: number | string) => {
    const secId = sectorIdPreset || sectoresRiego[0]?.id || 1;
    const sec = sectoresRiego.find(s => String(s.id) === String(secId)) || sectoresRiego[0];
    const cuartelesDelSector = parcelas
      .filter(p => (p.sectoresRiego && p.sectoresRiego.some(s => String(s) === String(secId))) || String(p.sectorRiegoNumero) === String(secId))
      .map(p => p.nombre);

    const supHa = sec?.ha || 5.0;
    const caudalLs = sec?.caudalDisenoLs || 20.0;
    const duracion = 6.5;
    const m3Calculado = Math.round((caudalLs * duracion * 3600) / 1000);
    const laminaCalculada = Number(((m3Calculado / (supHa * 10))).toFixed(1));

    setFormTurno({
      fecha: new Date().toISOString().split('T')[0],
      horaInicio: '08:00',
      horaTermino: '14:30',
      sectorRiegoId: secId,
      sectorNombre: sec?.nombre || `Sector ${secId}`,
      cuartelesInvolucrados: cuartelesDelSector.length > 0 ? cuartelesDelSector : [`Cuartel Sector ${secId}`],
      duracionHoras: duracion,
      laminaAguaMm: laminaCalculada || 4.8,
      volumenM3: m3Calculado || 260,
      conFertirriego: false,
      fertilizanteInyectado: '',
      dosisFertilizanteKg: 0,
      presionCabezalBar: 3.8,
      presionFinLineaBar: 1.8,
      operadorRiego: 'Rodrigo Tapia San Martín',
      observaciones: 'Riego por goteo con presiones nominales verificadas en manómetro.'
    });
    setIsNewTurnoOpen(true);
  };

  const handleOpenEditTurno = (turno: TurnoRiego) => {
    setEditingTurno(turno);
    setFormTurno({ ...turno });
    setIsEditTurnoOpen(true);
  };

  // Cambio de sector en el formulario
  const handleSectorChange = (secId: string | number) => {
    const sec = sectoresRiego.find(s => String(s.id) === String(secId));
    const cuartelesDelSector = parcelas
      .filter(p => (p.sectoresRiego && p.sectoresRiego.some(s => String(s) === String(secId))) || String(p.sectorRiegoNumero) === String(secId))
      .map(p => p.nombre);

    const supHa = sec?.ha || 5.0;
    const caudalLs = sec?.caudalDisenoLs || 20.0;
    const duracion = formTurno.duracionHoras || 6.5;
    const m3 = Math.round((caudalLs * duracion * 3600) / 1000);
    const lamina = Number(((m3 / (supHa * 10))).toFixed(1));

    setFormTurno(prev => ({
      ...prev,
      sectorRiegoId: secId,
      sectorNombre: sec?.nombre || `Sector ${secId}`,
      cuartelesInvolucrados: cuartelesDelSector.length > 0 ? cuartelesDelSector : [`Sector ${secId}`],
      volumenM3: m3,
      laminaAguaMm: lamina
    }));
  };

  // Cambio de duración en horas
  const handleDuracionChange = (hrs: number) => {
    const sec = sectoresRiego.find(s => String(s.id) === String(formTurno.sectorRiegoId));
    const supHa = sec?.ha || 5.0;
    const caudalLs = sec?.caudalDisenoLs || 20.0;
    const m3 = Math.round((caudalLs * hrs * 3600) / 1000);
    const lamina = Number(((m3 / (supHa * 10))).toFixed(1));

    setFormTurno(prev => ({
      ...prev,
      duracionHoras: hrs,
      volumenM3: m3,
      laminaAguaMm: lamina
    }));
  };

  const handleSaveNewTurno = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevo: TurnoRiego = {
      id: `tr-${Date.now()}`,
      fecha: formTurno.fecha || new Date().toISOString().split('T')[0],
      horaInicio: formTurno.horaInicio || '08:00',
      horaTermino: formTurno.horaTermino || '14:30',
      sectorRiegoId: formTurno.sectorRiegoId || 1,
      sectorNombre: formTurno.sectorNombre || 'Sector 1',
      cuartelesInvolucrados: formTurno.cuartelesInvolucrados || [],
      duracionHoras: formTurno.duracionHoras || 6.5,
      laminaAguaMm: formTurno.laminaAguaMm || 4.5,
      volumenM3: formTurno.volumenM3 || 260,
      conFertirriego: !!formTurno.conFertirriego,
      fertilizanteInyectado: formTurno.conFertirriego ? formTurno.fertilizanteInyectado : '',
      dosisFertilizanteKg: formTurno.conFertirriego ? formTurno.dosisFertilizanteKg : 0,
      presionCabezalBar: formTurno.presionCabezalBar || 3.8,
      presionFinLineaBar: formTurno.presionFinLineaBar || 1.8,
      operadorRiego: formTurno.operadorRiego || 'Operador de Riego',
      observaciones: formTurno.observaciones || ''
    };
    onAddTurnoRiego(nuevo);
    setIsNewTurnoOpen(false);
  };

  const handleSaveEditTurno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTurno) return;
    const updated: TurnoRiego = {
      ...editingTurno,
      fecha: formTurno.fecha || editingTurno.fecha,
      horaInicio: formTurno.horaInicio || editingTurno.horaInicio,
      horaTermino: formTurno.horaTermino || editingTurno.horaTermino,
      sectorRiegoId: formTurno.sectorRiegoId || editingTurno.sectorRiegoId,
      sectorNombre: formTurno.sectorNombre || editingTurno.sectorNombre,
      cuartelesInvolucrados: formTurno.cuartelesInvolucrados || editingTurno.cuartelesInvolucrados,
      duracionHoras: formTurno.duracionHoras ?? editingTurno.duracionHoras,
      laminaAguaMm: formTurno.laminaAguaMm ?? editingTurno.laminaAguaMm,
      volumenM3: formTurno.volumenM3 ?? editingTurno.volumenM3,
      conFertirriego: !!formTurno.conFertirriego,
      fertilizanteInyectado: formTurno.conFertirriego ? formTurno.fertilizanteInyectado : '',
      dosisFertilizanteKg: formTurno.conFertirriego ? formTurno.dosisFertilizanteKg : 0,
      presionCabezalBar: formTurno.presionCabezalBar ?? editingTurno.presionCabezalBar,
      presionFinLineaBar: formTurno.presionFinLineaBar ?? editingTurno.presionFinLineaBar,
      operadorRiego: formTurno.operadorRiego || editingTurno.operadorRiego,
      observaciones: formTurno.observaciones || ''
    };
    onUpdateTurnoRiego(updated);
    setIsEditTurnoOpen(false);
    setEditingTurno(null);
  };

  // Gestión de Sectores
  const handleOpenAddSector = () => {
    const nextId = sectoresRiego.length > 0 
      ? Math.max(...sectoresRiego.map(s => typeof s.id === 'number' ? s.id : parseInt(String(s.id)) || 0)) + 1 
      : 1;
    setEditingSector(null);
    setSectorForm({
      id: nextId,
      nombre: `Sector ${nextId} - Nuevo Sector`,
      ha: 5.0,
      caudalDisenoLs: 20.0,
      descripcion: 'Goteros autocompensados 2.0 L/h cada 0.8m'
    });
  };

  const handleOpenEditSector = (sec: SectorRiego) => {
    setEditingSector(sec);
    setSectorForm({ ...sec });
  };

  const handleSaveSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSector) {
      saveSectores(sectoresRiego.map(s => s.id === editingSector.id ? sectorForm : s));
    } else {
      saveSectores([...sectoresRiego, sectorForm]);
    }
    setEditingSector(null);
    setSectorForm({
      id: Date.now(),
      nombre: '',
      ha: 5.0,
      caudalDisenoLs: 20.0,
      descripcion: ''
    });
  };

  const handleDeleteSector = (id: number | string) => {
    if (sectoresRiego.length <= 1) {
      alert('Debe mantenerse al menos 1 sector de riego.');
      return;
    }
    if (confirm('¿Eliminar este sector de riego?')) {
      saveSectores(sectoresRiego.filter(s => s.id !== id));
      if (editingSector?.id === id) setEditingSector(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Droplet className="w-3 h-3 text-cyan-700" />
            Manejo Hídrico de Precisión Kiwis
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Control de Riego de Sectores
          </h1>
          <p className="text-xs text-stone-500">
            Bitácora de turnos de riego, reposición de lámina ETo vs Kc, inyección de fertirriego y control de presiones por sector.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsSectoresModalOpen(true)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-stone-600" />
            <span>Gestionar Sectores</span>
          </button>

          <button
            onClick={() => handleOpenNewTurno()}
            className="px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Turno de Riego</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen Hídrico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Horas Regadas</span>
            <Clock className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{totalHorasRegadas.toFixed(1)} hrs</div>
          <p className="text-[11px] text-stone-500">{turnosRiego.length} turnos registrados</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Volumen Aplicado</span>
            <Waves className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{totalM3Riego.toLocaleString('es-CL')} m³</div>
          <p className="text-[11px] text-stone-500">{(totalM3Riego * 1000).toLocaleString('es-CL')} litros de agua</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Lámina Promedio</span>
            <Droplet className="w-4 h-4 text-cyan-700" />
          </div>
          <div className="text-2xl font-black text-stone-900">{laminaPromedio} mm</div>
          <p className="text-[11px] text-stone-500">Por evento de riego</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Demanda Huerto (ETc)</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{demandaEtc} mm/día</div>
          <p className="text-[11px] text-emerald-700 font-medium">ETo ({etoActual}) × Kc ({kcEstimado})</p>
        </div>
      </div>

      {/* Grid de los Sectores de Riego */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-700" />
            Sectores de Riego del Huerto ({sectoresRiego.length} sectores)
          </h2>
          <span className="text-xs text-stone-400">
            Total superficie bajo riego: {sectoresRiego.reduce((a, s) => a + (s.ha || 0), 0).toFixed(1)} ha
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sectoresRiego.map((sec) => {
            const cuarteles = parcelas.filter(p => 
              (p.sectoresRiego && p.sectoresRiego.some(s => String(s) === String(sec.id))) || 
              String(p.sectorRiegoNumero) === String(sec.id)
            );
            const turnosSector = turnosRiego.filter(t => String(t.sectorRiegoId) === String(sec.id));
            const ultTurno = turnosSector[0];

            return (
              <div key={sec.id} className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-900 font-extrabold text-[11px]">
                    Sector {sec.id}
                  </span>
                  <span className="text-xs font-mono font-bold text-stone-700">
                    {sec.ha || 5.0} ha
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm leading-tight">
                    {sec.nombre}
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
                    {sec.descripcion || 'Sin descripción técnica'}
                  </p>
                </div>

                <div className="p-2.5 bg-stone-50 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Caudal de diseño:</span>
                    <strong className="text-stone-900 font-mono">{sec.caudalDisenoLs || 20} L/s</strong>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Cuarteles abastecidos:</span>
                    <strong className="text-cyan-800">{cuarteles.length > 0 ? cuarteles.map(c => c.codigoCuartel).join(', ') : 'Ninguno'}</strong>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Último riego:</span>
                    <strong className="text-stone-700">{ultTurno ? ultTurno.fecha : 'Sin registros'}</strong>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenNewTurno(sec.id)}
                  className="w-full py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-700" />
                  <span>Regar este Sector</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bitácora de Turnos de Riego */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden space-y-0">
        <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-700" />
            <h2 className="font-bold text-sm text-stone-900">
              Bitácora Oficial de Turnos de Riego
            </h2>
            <span className="text-xs text-stone-400">({turnosRiego.length} registros)</span>
          </div>
          <div className="text-[11px] text-stone-500">
            Cumplimiento normas de aseguramiento de calidad y trazabilidad hídrica
          </div>
        </div>

        {turnosRiego.length === 0 ? (
          <div className="p-8 text-center text-stone-400 space-y-2">
            <Droplet className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-sm text-stone-700">No hay turnos de riego registrados</p>
            <p className="text-xs">Comienza registrando el primer turno de riego del huerto.</p>
            <button
              onClick={() => handleOpenNewTurno()}
              className="mt-2 px-3 py-1.5 bg-cyan-800 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Turno</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="p-3">Fecha & Horario</th>
                  <th className="p-3">Sector & Cuarteles</th>
                  <th className="p-3">Duración</th>
                  <th className="p-3">Lámina (mm)</th>
                  <th className="p-3">Volumen (m³)</th>
                  <th className="p-3">Fertirriego</th>
                  <th className="p-3">Presiones</th>
                  <th className="p-3">Operador</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {turnosRiego.map((turno) => (
                  <tr key={turno.id} className="hover:bg-cyan-50/40 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-stone-900">{turno.fecha}</div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {turno.horaInicio} {turno.horaTermino ? `- ${turno.horaTermino}` : ''}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-extrabold text-cyan-950">{turno.sectorNombre}</div>
                      <div className="text-[11px] text-stone-500">
                        {turno.cuartelesInvolucrados?.join(', ') || 'Cuartel general'}
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-stone-900">
                      {turno.duracionHoras} hrs
                    </td>
                    <td className="p-3 font-mono font-black text-cyan-800">
                      {turno.laminaAguaMm} mm
                    </td>
                    <td className="p-3 font-mono font-bold text-stone-900">
                      {turno.volumenM3} m³
                    </td>
                    <td className="p-3">
                      {turno.conFertirriego ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <Zap className="w-3 h-3 text-emerald-600" />
                          <span>{turno.fertilizanteInyectado || 'Fertirriego'} {turno.dosisFertilizanteKg ? `(${turno.dosisFertilizanteKg} kg)` : ''}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 text-[11px]">Agua pura</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-stone-600">
                      <span>Cab: <strong>{turno.presionCabezalBar}b</strong></span> · <span>Fin: <strong>{turno.presionFinLineaBar}b</strong></span>
                    </td>
                    <td className="p-3 text-[11px] text-stone-600">
                      {turno.operadorRiego}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditTurno(turno)}
                          className="p-1.5 text-stone-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar turno"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTurnoToDelete(turno)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar turno"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NUEVO / EDITAR TURNO */}
      {(isNewTurnoOpen || isEditTurnoOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-cyan-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Droplet className="w-4 h-4 text-cyan-300" />
                {isEditTurnoOpen ? 'Editar Turno de Riego' : 'Registrar Nuevo Turno de Riego'}
              </h3>
              <button 
                onClick={() => { setIsNewTurnoOpen(false); setIsEditTurnoOpen(false); }} 
                className="text-cyan-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={isEditTurnoOpen ? handleSaveEditTurno : handleSaveNewTurno} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Sector de Riego:</label>
                  <select
                    value={formTurno.sectorRiegoId}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    required
                  >
                    {sectoresRiego.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} ({s.ha} ha)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha:</label>
                  <input
                    type="date"
                    value={formTurno.fecha}
                    onChange={(e) => setFormTurno({ ...formTurno, fecha: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Hora Inicio:</label>
                  <input
                    type="time"
                    value={formTurno.horaInicio}
                    onChange={(e) => setFormTurno({ ...formTurno, horaInicio: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Hora Término:</label>
                  <input
                    type="time"
                    value={formTurno.horaTermino}
                    onChange={(e) => setFormTurno({ ...formTurno, horaTermino: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Duración (hrs):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formTurno.duracionHoras}
                    onChange={(e) => handleDuracionChange(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-cyan-50/60 border border-cyan-200 rounded-xl">
                <div>
                  <label className="block font-bold text-cyan-900 mb-1">Lámina Aplicada (mm):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formTurno.laminaAguaMm}
                    onChange={(e) => setFormTurno({ ...formTurno, laminaAguaMm: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-cyan-300 rounded-lg font-black font-mono text-cyan-950"
                    required
                  />
                  <span className="text-[10px] text-cyan-800">1 mm = 10 m³/ha</span>
                </div>
                <div>
                  <label className="block font-bold text-cyan-900 mb-1">Volumen Total (m³):</label>
                  <input
                    type="number"
                    value={formTurno.volumenM3}
                    onChange={(e) => setFormTurno({ ...formTurno, volumenM3: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-cyan-300 rounded-lg font-black font-mono text-cyan-950"
                    required
                  />
                  <span className="text-[10px] text-cyan-800">
                    ≈ {((formTurno.volumenM3 || 0) * 1000).toLocaleString('es-CL')} Litros
                  </span>
                </div>
              </div>

              {/* Fertirriego */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!formTurno.conFertirriego}
                    onChange={(e) => setFormTurno({ ...formTurno, conFertirriego: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span className="font-bold text-stone-800 text-xs">
                    Inyección de Fertilizante en este Turno (Fertirriego)
                  </span>
                </label>

                {formTurno.conFertirriego && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block font-semibold text-stone-600 mb-1">Fertilizante Inyectado:</label>
                      <input
                        type="text"
                        placeholder="ej. Calcinit (Nitrato de Calcio)"
                        value={formTurno.fertilizanteInyectado || ''}
                        onChange={(e) => setFormTurno({ ...formTurno, fertilizanteInyectado: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-600 mb-1">Dosis Total (kg):</label>
                      <input
                        type="number"
                        placeholder="ej. 50"
                        value={formTurno.dosisFertilizanteKg || ''}
                        onChange={(e) => setFormTurno({ ...formTurno, dosisFertilizanteKg: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Presiones y Operador */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Presión Cabezal (bar):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formTurno.presionCabezalBar}
                    onChange={(e) => setFormTurno({ ...formTurno, presionCabezalBar: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Presión Fin Línea (bar):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formTurno.presionFinLineaBar}
                    onChange={(e) => setFormTurno({ ...formTurno, presionFinLineaBar: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Operador Responsable:</label>
                  <input
                    type="text"
                    value={formTurno.operadorRiego}
                    onChange={(e) => setFormTurno({ ...formTurno, operadorRiego: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones:</label>
                <textarea
                  rows={2}
                  value={formTurno.observaciones || ''}
                  onChange={(e) => setFormTurno({ ...formTurno, observaciones: e.target.value })}
                  placeholder="ej. Válvula 2 con filtro secundario limpio. Goteros con flujo regular."
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => { setIsNewTurnoOpen(false); setIsEditTurnoOpen(false); }}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-800 hover:bg-cyan-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  {isEditTurnoOpen ? 'Guardar Cambios' : 'Registrar Turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTIÓN DE SECTORES DE RIEGO */}
      {isSectoresModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-cyan-950 text-white p-4 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-300" />
                Configuración y Gestión de Sectores de Riego
              </h3>
              <button onClick={() => setIsSectoresModalOpen(false)} className="text-cyan-200 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <p className="text-stone-500">
                  Agrega, renombra, ajusta hectáreas y caudales de diseño de cada sector del huerto.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddSector}
                  className="px-3 py-1 bg-cyan-800 hover:bg-cyan-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Sector</span>
                </button>
              </div>

              {/* Formulario de Sector (Nuevo / Editar) */}
              <form onSubmit={handleSaveSector} className="p-4 bg-cyan-50/60 border border-cyan-200 rounded-xl space-y-3">
                <div className="font-bold text-cyan-950">
                  {editingSector ? `Editando Sector ${editingSector.id}` : 'Crear / Configurar Sector'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-stone-700 mb-1">Nombre del Sector:</label>
                    <input
                      type="text"
                      placeholder="ej. Sector 1 - Parrón Español Norte"
                      value={sectorForm.nombre}
                      onChange={(e) => setSectorForm({ ...sectorForm, nombre: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Superficie (ha):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={sectorForm.ha}
                      onChange={(e) => setSectorForm({ ...sectorForm, ha: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Caudal de Diseño (L/s):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={sectorForm.caudalDisenoLs}
                      onChange={(e) => setSectorForm({ ...sectorForm, caudalDisenoLs: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Descripción / Tipo de Goteros:</label>
                    <input
                      type="text"
                      placeholder="ej. Goteros autocompensados 2.0 L/h cada 0.8m"
                      value={sectorForm.descripcion || ''}
                      onChange={(e) => setSectorForm({ ...sectorForm, descripcion: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {editingSector && (
                    <button
                      type="button"
                      onClick={() => setEditingSector(null)}
                      className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-600 bg-white hover:bg-stone-50 cursor-pointer"
                    >
                      Cancelar Edición
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-cyan-800 hover:bg-cyan-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    {editingSector ? 'Actualizar Sector' : 'Guardar Sector'}
                  </button>
                </div>
              </form>

              {/* Lista de Sectores Existentes */}
              <div className="space-y-2">
                <div className="font-bold text-stone-800 text-xs">Sectores Actuales:</div>
                <div className="space-y-1.5">
                  {sectoresRiego.map((sec) => (
                    <div key={sec.id} className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between hover:border-cyan-300 transition-colors">
                      <div>
                        <div className="font-bold text-stone-900 text-xs flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 font-extrabold text-[10px]">
                            ID {sec.id}
                          </span>
                          <span>{sec.nombre}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {sec.ha} ha · {sec.caudalDisenoLs} L/s · {sec.descripcion}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSector(sec)}
                          className="p-1.5 text-stone-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSector(sec.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsSectoresModalOpen(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR TURNO */}
      {turnoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-sm text-stone-900">¿Eliminar Turno de Riego?</h3>
            </div>
            <p className="text-xs text-stone-600">
              Se eliminará el turno del <strong>{turnoToDelete.fecha}</strong> para el <strong>{turnoToDelete.sectorNombre}</strong> ({turnoToDelete.duracionHoras} hrs, {turnoToDelete.volumenM3} m³).
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setTurnoToDelete(null)}
                className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTurnoRiego(turnoToDelete.id);
                  setTurnoToDelete(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Eliminar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
