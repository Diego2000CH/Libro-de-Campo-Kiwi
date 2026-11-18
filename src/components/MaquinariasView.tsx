import React, { useState } from 'react';
import { MaquinariaEquipo, RegistroMantencionMaquinaria } from '../types/campo';
import { 
  Tractor, 
  Plus, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Calendar,
  Fuel,
  User,
  History,
  TrendingUp,
  Search,
  Filter
} from 'lucide-react';

interface MaquinariasViewProps {
  maquinarias: MaquinariaEquipo[];
  registrosMantencion: RegistroMantencionMaquinaria[];
  onAddMaquinaria: (maquinaria: MaquinariaEquipo) => void;
  onUpdateMaquinaria: (maquinaria: MaquinariaEquipo) => void;
  onDeleteMaquinaria: (id: string) => void;
  onAddMantencion: (mantencion: RegistroMantencionMaquinaria, nuevoHorometro?: number) => void;
  onDeleteMantencion: (id: string) => void;
  canEdit?: boolean;
}

export const MaquinariasView: React.FC<MaquinariasViewProps> = ({
  maquinarias,
  registrosMantencion,
  onAddMaquinaria,
  onUpdateMaquinaria,
  onDeleteMaquinaria,
  onAddMantencion,
  onDeleteMantencion,
  canEdit = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [selectedMaquinaria, setSelectedMaquinaria] = useState<MaquinariaEquipo | null>(null);
  
  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHorometroModalOpen, setIsHorometroModalOpen] = useState(false);
  const [isMantencionModalOpen, setIsMantencionModalOpen] = useState(false);
  const [maquinariaToDelete, setMaquinariaToDelete] = useState<MaquinariaEquipo | null>(null);

  // Formulario de Maquinaria (Crear / Editar)
  const [maquinariaForm, setMaquinariaForm] = useState<Partial<MaquinariaEquipo>>({
    codigoInterno: 'EQ-0' + (maquinarias.length + 1),
    nombre: '',
    tipo: 'tractor',
    marcaModelo: '',
    patenteOSerie: '',
    anio: new Date().getFullYear(),
    horometroActual: 0,
    horometroUltimaMantencion: 0,
    frecuenciaMantencionHoras: 250,
    estado: 'operativo',
    operadorAsignado: '',
    fechaUltimaMantencion: new Date().toISOString().split('T')[0],
    fechaProximaMantencion: '',
    observaciones: ''
  });

  // Formulario rápido para actualizar horómetro
  const [nuevoHorometroValor, setNuevoHorometroValor] = useState<number>(0);

  // Formulario de Mantención
  const [mantencionForm, setMantencionForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    horometro: 0,
    tipoMantencion: '',
    tallerOMecanico: '',
    costoCLP: 0,
    repuestosUtilizados: '',
    observaciones: ''
  });

  // Filtrado
  const filteredMaquinarias = maquinarias.filter((m) => {
    const matchSearch = m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.codigoInterno.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.marcaModelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.patenteOSerie.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.operadorAsignado.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = tipoFilter === 'todos' || m.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  // Estadísticas
  const totalEquipos = maquinarias.length;
  const operativos = maquinarias.filter((m) => m.estado === 'operativo').length;
  const enMantencion = maquinarias.filter((m) => m.estado === 'mantencion_proxima' || m.estado === 'en_taller').length;
  const gastoTotalMantenciones = registrosMantencion.reduce((acc, r) => acc + (r.costoCLP || 0), 0);

  // Apertura de modal de edición
  const handleOpenEdit = (m: MaquinariaEquipo) => {
    setSelectedMaquinaria(m);
    setMaquinariaForm({ ...m });
    setIsEditModalOpen(true);
  };

  // Apertura de modal horómetro
  const handleOpenHorometro = (m: MaquinariaEquipo) => {
    setSelectedMaquinaria(m);
    setNuevoHorometroValor(m.horometroActual);
    setIsHorometroModalOpen(true);
  };

  // Apertura de modal mantención
  const handleOpenMantencion = (m: MaquinariaEquipo) => {
    setSelectedMaquinaria(m);
    setMantencionForm({
      fecha: new Date().toISOString().split('T')[0],
      horometro: m.horometroActual,
      tipoMantencion: 'Mantención preventiva ' + m.frecuenciaMantencionHoras + ' hrs',
      tallerOMecanico: 'Mecánico de Planta / Taller Central',
      costoCLP: 120000,
      repuestosUtilizados: 'Aceite motor, filtros, engrase',
      observaciones: 'Mantención realizada según pauta del fabricante'
    });
    setIsMantencionModalOpen(true);
  };

  // Guardar nueva maquinaria
  const handleSaveNewMaquinaria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maquinariaForm.nombre || !maquinariaForm.codigoInterno) return;

    const nueva: MaquinariaEquipo = {
      id: `maq-${Date.now()}`,
      codigoInterno: maquinariaForm.codigoInterno || `EQ-${Date.now()}`,
      nombre: maquinariaForm.nombre,
      tipo: (maquinariaForm.tipo as any) || 'tractor',
      marcaModelo: maquinariaForm.marcaModelo || '',
      patenteOSerie: maquinariaForm.patenteOSerie || 'S/N',
      anio: Number(maquinariaForm.anio) || new Date().getFullYear(),
      horometroActual: Number(maquinariaForm.horometroActual) || 0,
      horometroUltimaMantencion: Number(maquinariaForm.horometroUltimaMantencion) || 0,
      frecuenciaMantencionHoras: Number(maquinariaForm.frecuenciaMantencionHoras) || 250,
      estado: (maquinariaForm.estado as any) || 'operativo',
      operadorAsignado: maquinariaForm.operadorAsignado || 'Operador Asignado',
      fechaUltimaMantencion: maquinariaForm.fechaUltimaMantencion || new Date().toISOString().split('T')[0],
      fechaProximaMantencion: maquinariaForm.fechaProximaMantencion || 'Según horómetro',
      observaciones: maquinariaForm.observaciones || ''
    };

    onAddMaquinaria(nueva);
    setIsNewModalOpen(false);
  };

  // Guardar edición de maquinaria
  const handleSaveEditMaquinaria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaquinaria) return;

    const actualizada: MaquinariaEquipo = {
      ...selectedMaquinaria,
      ...maquinariaForm as MaquinariaEquipo
    };

    onUpdateMaquinaria(actualizada);
    setIsEditModalOpen(false);
    setSelectedMaquinaria(null);
  };

  // Guardar nuevo horómetro
  const handleSaveHorometro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaquinaria) return;

    const proximaMantencionHoras = selectedMaquinaria.horometroUltimaMantencion + selectedMaquinaria.frecuenciaMantencionHoras;
    const horasRestantes = proximaMantencionHoras - nuevoHorometroValor;
    
    let nuevoEstado = selectedMaquinaria.estado;
    if (horasRestantes <= 0) {
      nuevoEstado = 'mantencion_proxima';
    } else if (horasRestantes <= 30 && nuevoEstado === 'operativo') {
      nuevoEstado = 'mantencion_proxima';
    }

    const actualizada: MaquinariaEquipo = {
      ...selectedMaquinaria,
      horometroActual: nuevoHorometroValor,
      estado: nuevoEstado
    };

    onUpdateMaquinaria(actualizada);
    setIsHorometroModalOpen(false);
    setSelectedMaquinaria(null);
  };

  // Guardar registro de mantención
  const handleSaveMantencion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaquinaria) return;

    const nuevoRegistro: RegistroMantencionMaquinaria = {
      id: `mant-${Date.now()}`,
      maquinariaId: selectedMaquinaria.id,
      maquinariaNombre: `${selectedMaquinaria.codigoInterno} - ${selectedMaquinaria.nombre}`,
      fecha: mantencionForm.fecha,
      horometro: Number(mantencionForm.horometro),
      tipoMantencion: mantencionForm.tipoMantencion,
      tallerOMecanico: mantencionForm.tallerOMecanico,
      costoCLP: Number(mantencionForm.costoCLP),
      repuestosUtilizados: mantencionForm.repuestosUtilizados,
      observaciones: mantencionForm.observaciones
    };

    // Al registrar mantención, se actualiza la maquinaria:
    // horometroUltimaMantencion = horometro del servicio
    // estado vuelve a 'operativo'
    const maquinariaActualizada: MaquinariaEquipo = {
      ...selectedMaquinaria,
      horometroActual: Math.max(selectedMaquinaria.horometroActual, Number(mantencionForm.horometro)),
      horometroUltimaMantencion: Number(mantencionForm.horometro),
      fechaUltimaMantencion: mantencionForm.fecha,
      estado: 'operativo'
    };

    onAddMantencion(nuevoRegistro);
    onUpdateMaquinaria(maquinariaActualizada);
    setIsMantencionModalOpen(false);
    setSelectedMaquinaria(null);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Tractor className="w-3.5 h-3.5 text-amber-700" />
            Parque de Maquinarias & Equipos de Campo
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Control de Maquinarias, Tractores & Nebulizadores
          </h1>
          <p className="text-xs text-stone-500">
            Control de horómetros reales, planes de mantención preventiva cada 250 horas, calibraciones de turbo-atomizadores y asignación de operarios.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setMaquinariaForm({
                codigoInterno: 'EQ-0' + (maquinarias.length + 1),
                nombre: '',
                tipo: 'tractor',
                marcaModelo: '',
                patenteOSerie: '',
                anio: new Date().getFullYear(),
                horometroActual: 0,
                horometroUltimaMantencion: 0,
                frecuenciaMantencionHoras: 250,
                estado: 'operativo',
                operadorAsignado: '',
                fechaUltimaMantencion: new Date().toISOString().split('T')[0],
                fechaProximaMantencion: 'Al cumplir 250 hrs',
                observaciones: ''
              });
              setIsNewModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-center transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Maquinaria</span>
          </button>
        )}
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Total Equipos Activos</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{totalEquipos}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Tractores, nebulizadores y vehículos</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Estado Operativo</div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{operativos} / {totalEquipos}</div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Listos para labores fitosanitarias</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Mantenciones Pendientes</div>
          <div className={`text-2xl font-black mt-1 ${enMantencion > 0 ? 'text-amber-800' : 'text-stone-700'}`}>
            {enMantencion}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Próximos a superar umbral horómetro</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Inversión Mantenciones</div>
          <div className="text-2xl font-black text-blue-950 mt-1">${gastoTotalMantenciones.toLocaleString('es-CL')}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">{registrosMantencion.length} registros en historial</div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por código, modelo, operario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setTipoFilter('todos')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              tipoFilter === 'todos' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Todos ({maquinarias.length})
          </button>
          <button
            onClick={() => setTipoFilter('tractor')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              tipoFilter === 'tractor' ? 'bg-amber-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Tractores
          </button>
          <button
            onClick={() => setTipoFilter('pulverizador')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              tipoFilter === 'pulverizador' ? 'bg-blue-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Pulverizadores / Nebulizadores
          </button>
          <button
            onClick={() => setTipoFilter('camioneta')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              tipoFilter === 'camioneta' ? 'bg-purple-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Camionetas
          </button>
          <button
            onClick={() => setTipoFilter('motobomba')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              tipoFilter === 'motobomba' ? 'bg-cyan-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Bombas & Motores
          </button>
        </div>
      </div>

      {/* Grid de Maquinarias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaquinarias.map((m) => {
          const proximaMantencionHoras = m.horometroUltimaMantencion + m.frecuenciaMantencionHoras;
          const horasRestantes = proximaMantencionHoras - m.horometroActual;
          const porcentajeUso = Math.min(100, Math.max(0, ((m.horometroActual - m.horometroUltimaMantencion) / m.frecuenciaMantencionHoras) * 100));
          const necesitaAtencion = horasRestantes <= 25 || m.estado === 'mantencion_proxima';

          return (
            <div
              key={m.id}
              className={`bg-white rounded-2xl border p-4.5 shadow-2xs flex flex-col justify-between transition-all hover:border-stone-400 ${
                necesitaAtencion ? 'border-amber-300 ring-1 ring-amber-200' : 'border-stone-200'
              }`}
            >
              <div>
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">
                        {m.codigoInterno}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        m.estado === 'operativo' 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' 
                          : m.estado === 'mantencion_proxima'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-rose-100 text-rose-900 border border-rose-200'
                      }`}>
                        {m.estado === 'operativo' ? 'Operativo' : m.estado === 'mantencion_proxima' ? 'Mantención Próxima' : m.estado}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-stone-900 mt-2">{m.nombre}</h3>
                    <p className="text-xs text-stone-500">{m.marcaModelo} · {m.anio} · Pat/Serie: <strong className="font-mono text-stone-700">{m.patenteOSerie}</strong></p>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Editar ficha maquinaria"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => setMaquinariaToDelete(m)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Eliminar maquinaria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Horómetro Actual */}
                <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      Horómetro Actual:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black font-mono text-stone-900">{m.horometroActual} hrs</span>
                      {canEdit && (
                        <button
                          onClick={() => handleOpenHorometro(m)}
                          className="px-2 py-0.5 bg-white border border-stone-300 rounded text-[11px] font-bold text-stone-700 hover:bg-stone-100 cursor-pointer"
                          title="Actualizar horómetro"
                        >
                          Ajustar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Barra de progreso de mantención */}
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[10px] text-stone-500 font-medium mb-1">
                      <span>Últ. Mantención: {m.horometroUltimaMantencion}h</span>
                      <span>Próxima: {proximaMantencionHoras}h ({horasRestantes > 0 ? `quedan ${horasRestantes}h` : `¡VENCIDA por ${Math.abs(horasRestantes)}h!`})</span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          horasRestantes <= 0 ? 'bg-rose-600' : horasRestantes <= 25 ? 'bg-amber-600' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${porcentajeUso}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Detalles de Operación */}
                <div className="mt-3 space-y-1.5 text-xs text-stone-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-stone-400 text-[11px]">
                      <User className="w-3 h-3" /> Operador habitual:
                    </span>
                    <span className="font-medium text-stone-900">{m.operadorAsignado}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-stone-400 text-[11px]">
                      <Calendar className="w-3 h-3" /> Último Servicio:
                    </span>
                    <span className="font-mono text-[11px] text-stone-700">{m.fechaUltimaMantencion}</span>
                  </div>
                  {m.observaciones && (
                    <p className="text-[11px] text-stone-500 italic mt-1 bg-stone-50/70 p-1.5 rounded-lg border border-stone-100">
                      "{m.observaciones}"
                    </p>
                  )}
                </div>
              </div>

              {/* Botón de Mantención */}
              {canEdit && (
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenMantencion(m)}
                    className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    <span>Registrar Servicio / Mantención</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Historial de Mantenciones */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-800" />
            Bitácora Oficial de Mantenciones & Reparaciones
          </h2>
          <span className="text-xs text-stone-500 font-medium">{registrosMantencion.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Maquinaria / Equipo</th>
                <th className="px-4 py-3">Horómetro</th>
                <th className="px-4 py-3">Labor / Tipo Mantención</th>
                <th className="px-4 py-3">Mecánico / Taller</th>
                <th className="px-4 py-3">Repuestos / Insumos</th>
                <th className="px-4 py-3">Costo (CLP)</th>
                {canEdit && <th className="px-4 py-3 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {registrosMantencion.map((reg) => (
                <tr key={reg.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">{reg.fecha}</td>
                  <td className="px-4 py-3 font-bold text-stone-900 whitespace-nowrap">{reg.maquinariaNombre}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-950">{reg.horometro} hrs</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-stone-900">{reg.tipoMantencion}</span>
                    {reg.observaciones && <p className="text-[10px] text-stone-400 mt-0.5">{reg.observaciones}</p>}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{reg.tallerOMecanico}</td>
                  <td className="px-4 py-3 text-stone-500 text-[11px] max-w-xs truncate">{reg.repuestosUtilizados}</td>
                  <td className="px-4 py-3 font-mono font-bold text-stone-900">${reg.costoCLP.toLocaleString('es-CL')}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDeleteMantencion(reg.id)}
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
      </div>

      {/* MODAL: Nueva Maquinaria */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Tractor className="w-4 h-4 text-emerald-400" />
                Registrar Nueva Maquinaria o Equipo
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveNewMaquinaria} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Código Interno:</label>
                  <input
                    type="text"
                    value={maquinariaForm.codigoInterno || ''}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, codigoInterno: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    placeholder="TRAC-02"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tipo de Equipo:</label>
                  <select
                    value={maquinariaForm.tipo || 'tractor'}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, tipo: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="tractor">Tractor Agrícola</option>
                    <option value="pulverizador">Pulverizador / Turbo-Atomizador</option>
                    <option value="atomizador">Nebulizador Neumático</option>
                    <option value="bomba_espalda">Bomba de Espalda Motorizada</option>
                    <option value="camioneta">Camioneta de Operaciones</option>
                    <option value="coloso">Carro / Coloso Cosecha</option>
                    <option value="desbrozadora">Desbrozadora / Trituradora</option>
                    <option value="motobomba">Motobomba / Generador</option>
                    <option value="otro">Otro Equipo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Nombre Descriptivo:</label>
                <input
                  type="text"
                  value={maquinariaForm.nombre || ''}
                  onChange={(e) => setMaquinariaForm({ ...maquinariaForm, nombre: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  placeholder="ej. Tractor John Deere 5075E 4WD Frutero"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Marca y Modelo:</label>
                  <input
                    type="text"
                    value={maquinariaForm.marcaModelo || ''}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, marcaModelo: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="John Deere 5075E"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Patente / N° Serie:</label>
                  <input
                    type="text"
                    value={maquinariaForm.patenteOSerie || ''}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, patenteOSerie: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    placeholder="JD-5075-882"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Año:</label>
                  <input
                    type="number"
                    value={maquinariaForm.anio ?? 2020}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, anio: parseInt(e.target.value) || 2020 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Horómetro Actual:</label>
                  <input
                    type="number"
                    value={maquinariaForm.horometroActual ?? 0}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, horometroActual: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Horómetro Últ. Mant.:</label>
                  <input
                    type="number"
                    value={maquinariaForm.horometroUltimaMantencion ?? 0}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, horometroUltimaMantencion: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Frecuencia Mant. (hrs):</label>
                  <input
                    type="number"
                    value={maquinariaForm.frecuenciaMantencionHoras ?? 250}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, frecuenciaMantencionHoras: parseInt(e.target.value) || 250 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Operador Asignado:</label>
                  <input
                    type="text"
                    value={maquinariaForm.operadorAsignado || ''}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, operadorAsignado: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="Nombre del operario"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Estado Operativo:</label>
                  <select
                    value={maquinariaForm.estado || 'operativo'}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, estado: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="operativo">Operativo 100%</option>
                    <option value="mantencion_proxima">Mantención Próxima</option>
                    <option value="en_taller">En Taller / Reparación</option>
                    <option value="fuera_servicio">Fuera de Servicio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones / Especificaciones:</label>
                <textarea
                  value={maquinariaForm.observaciones || ''}
                  onChange={(e) => setMaquinariaForm({ ...maquinariaForm, observaciones: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="Detalles sobre filtros, calibraciones de toberas, etc."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Guardar Maquinaria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Maquinaria */}
      {isEditModalOpen && selectedMaquinaria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                Editar Ficha: {selectedMaquinaria.codigoInterno}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-stone-300 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveEditMaquinaria} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Código Interno:</label>
                  <input
                    type="text"
                    value={maquinariaForm.codigoInterno || ''}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, codigoInterno: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Estado Operativo:</label>
                  <select
                    value={maquinariaForm.estado || 'operativo'}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, estado: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="operativo">Operativo 100%</option>
                    <option value="mantencion_proxima">Mantención Próxima</option>
                    <option value="en_taller">En Taller / Reparación</option>
                    <option value="fuera_servicio">Fuera de Servicio</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Nombre Descriptivo:</label>
                <input
                  type="text"
                  value={maquinariaForm.nombre || ''}
                  onChange={(e) => setMaquinariaForm({ ...maquinariaForm, nombre: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Marca y Modelo:</label>
                  <input
                    type="text"
                    value={maquinariaForm.marcaModelo || ''}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, marcaModelo: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Patente / Serie:</label>
                  <input
                    type="text"
                    value={maquinariaForm.patenteOSerie || ''}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, patenteOSerie: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Año:</label>
                  <input
                    type="number"
                    value={maquinariaForm.anio ?? 2020}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, anio: parseInt(e.target.value) || 2020 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Horómetro Actual:</label>
                  <input
                    type="number"
                    value={maquinariaForm.horometroActual ?? 0}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, horometroActual: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Horómetro Mantención:</label>
                  <input
                    type="number"
                    value={maquinariaForm.horometroUltimaMantencion ?? 0}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, horometroUltimaMantencion: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Frecuencia (hrs):</label>
                  <input
                    type="number"
                    value={maquinariaForm.frecuenciaMantencionHoras ?? 250}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, frecuenciaMantencionHoras: parseInt(e.target.value) || 250 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Operador Asignado:</label>
                  <input
                    type="text"
                    value={maquinariaForm.operadorAsignado || ''}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, operadorAsignado: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha Últ. Mantención:</label>
                  <input
                    type="date"
                    value={maquinariaForm.fechaUltimaMantencion || ''}
                    onChange={(e) => setMaquinariaForm({ ...maquinariaForm, fechaUltimaMantencion: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones:</label>
                <textarea
                  value={maquinariaForm.observaciones || ''}
                  onChange={(e) => setMaquinariaForm({ ...maquinariaForm, observaciones: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ajustar Horómetro */}
      {isHorometroModalOpen && selectedMaquinaria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 overflow-hidden">
            <div className="bg-blue-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Actualizar Horómetro
              </h3>
              <button onClick={() => setIsHorometroModalOpen(false)} className="text-blue-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveHorometro} className="p-5 space-y-4 text-xs">
              <div>
                <div className="text-stone-500 font-medium">Equipo:</div>
                <div className="font-bold text-sm text-stone-900">{selectedMaquinaria.codigoInterno} - {selectedMaquinaria.nombre}</div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <label className="block font-bold text-stone-700 mb-1">Nueva Lectura de Horas:</label>
                <input
                  type="number"
                  step="0.5"
                  value={nuevoHorometroValor}
                  onChange={(e) => setNuevoHorometroValor(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-lg font-mono font-bold text-blue-950"
                  required
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Lectura anterior: {selectedMaquinaria.horometroActual} hrs
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsHorometroModalOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Confirmar Lectura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Mantención */}
      {isMantencionModalOpen && selectedMaquinaria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-amber-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                Registrar Mantención: {selectedMaquinaria.codigoInterno}
              </h3>
              <button onClick={() => setIsMantencionModalOpen(false)} className="text-amber-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveMantencion} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha de Mantención:</label>
                  <input
                    type="date"
                    value={mantencionForm.fecha}
                    onChange={(e) => setMantencionForm({ ...mantencionForm, fecha: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Horómetro al Servicio:</label>
                  <input
                    type="number"
                    value={mantencionForm.horometro}
                    onChange={(e) => setMantencionForm({ ...mantencionForm, horometro: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-amber-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Labor / Tipo de Mantención:</label>
                <input
                  type="text"
                  value={mantencionForm.tipoMantencion}
                  onChange={(e) => setMantencionForm({ ...mantencionForm, tipoMantencion: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  placeholder="ej. Cambio de aceite motor 15W40, filtro aceite y petróleo"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Taller o Mecánico Responsable:</label>
                  <input
                    type="text"
                    value={mantencionForm.tallerOMecanico}
                    onChange={(e) => setMantencionForm({ ...mantencionForm, tallerOMecanico: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="ej. Mecánico Central / Concesionario"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Costo Total del Servicio (CLP):</label>
                  <input
                    type="number"
                    value={mantencionForm.costoCLP}
                    onChange={(e) => setMantencionForm({ ...mantencionForm, costoCLP: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Repuestos e Insumos Utilizados:</label>
                <textarea
                  value={mantencionForm.repuestosUtilizados}
                  onChange={(e) => setMantencionForm({ ...mantencionForm, repuestosUtilizados: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="ej. Filtro primario, filtro secundario, 12L aceite John Deere Plus 50 II, grasa de litio"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones Técnicas:</label>
                <textarea
                  value={mantencionForm.observaciones}
                  onChange={(e) => setMantencionForm({ ...mantencionForm, observaciones: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="Estado general de correas, toberas, presión de neumáticos..."
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Al registrar este servicio, el horómetro de mantención se actualizará automáticamente y el equipo pasará a estado <strong>Operativo</strong>.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsMantencionModalOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-800 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Guardar Mantención en Bitácora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Eliminación Maquinaria */}
      {maquinariaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Eliminar Maquinaria / Equipo</h3>
              <button onClick={() => setMaquinariaToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-stone-700">
                ¿Estás seguro de que deseas eliminar la maquinaria <strong>{maquinariaToDelete.nombre}</strong> ({maquinariaToDelete.codigoInterno})?
              </p>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-600 text-[11px] space-y-1">
                <div><strong>Patente / Serie:</strong> {maquinariaToDelete.patenteOSerie}</div>
                <div><strong>Horómetro:</strong> {maquinariaToDelete.horometroActual} hrs</div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setMaquinariaToDelete(null)}
                  className="px-3.5 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteMaquinaria(maquinariaToDelete.id);
                    setMaquinariaToDelete(null);
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
    </div>
  );
};
