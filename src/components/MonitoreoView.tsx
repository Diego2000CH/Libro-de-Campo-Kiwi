import React, { useState } from 'react';
import { Parcela, RegistroLabor, TipoLabor } from '../types/campo';
import { 
  Bug, 
  ShieldAlert, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Eye, 
  Search,
  FileCheck2
} from 'lucide-react';

interface MonitoreoViewProps {
  labores: RegistroLabor[];
  parcelas: Parcela[];
  onOpenNewLaborWithDefaults: (parcelaId?: string, tipoLabor?: TipoLabor) => void;
  onSaveQuickObservation: (labor: RegistroLabor) => void;
  canEdit?: boolean;
}

export const MonitoreoView: React.FC<MonitoreoViewProps> = ({
  labores,
  parcelas,
  onOpenNewLaborWithDefaults,
  onSaveQuickObservation,
  canEdit = true
}) => {
  const [selectedPlaga, setSelectedPlaga] = useState<string>('todas');
  const [isQuickObsOpen, setIsQuickObsOpen] = useState(false);

  const [obsForm, setObsForm] = useState({
    parcelaId: parcelas[0]?.id || '',
    plaga: 'Psa (Pseudomonas syringae pv. actinidiae)',
    severidad: 'Leve (Monitoreo Preventivo)',
    descripcion: 'Inspección de 20 plantas por hilera en parrón. Sin exudados ni manchas angulares.'
  });

  const monitoreos = labores.filter((l) => l.tipoLabor === 'monitoreo');

  const handleGuardarObservacion = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parcelas.find((item) => item.id === obsForm.parcelaId);

    const nuevaLabor: RegistroLabor = {
      id: `lab-mon-${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
      parcelaId: obsForm.parcelaId,
      parcelaNombre: p ? p.nombre : 'Cuartel',
      tipoLabor: 'monitoreo',
      descripcion: `[${obsForm.plaga}] Severidad: ${obsForm.severidad}. ${obsForm.descripcion}`,
      objetivoPlagaEnfermedad: obsForm.plaga,
      registradoPor: 'Ing. Agr. Rodrigo Valenzuela (Monitoreo Fitosanitario SAG)',
      observaciones: 'Monitoreo preventivo protocolizado GlobalGAP'
    };

    onSaveQuickObservation(nuevaLabor);
    setIsQuickObsOpen(false);
  };

  const plagasFrecuentes = [
    {
      id: 'psa',
      nombre: 'Psa (Pseudomonas syringae pv. actinidiae)',
      tipo: 'Bacteria Cuarentenaria SAG',
      sintomas: 'Exudados bacterianos rojizos o blancos en madera, manchas angulares con halo clorótico en hojas y muerte de brotes.',
      controlSugerido: 'Cobre preventivo (Cuprocol / Mastercop), sellado con pintura poda + fungicida, desinfección de tijeras con alcohol 70% o amonio cuaternario.',
      severidadPredio: 'Bajo Control'
    },
    {
      id: 'botrytis',
      nombre: 'Botrytis cinerea (Pudrición Peduncular)',
      tipo: 'Hongo de Fruto y Flor',
      sintomas: 'Micelio grisáceo en restos florales y pudrición blanda acuosa en pedúnculo durante almacenaje en frío (cámara 0°C).',
      controlSugerido: 'Switch 62.5 WG o Luna Tranquility en caída de sépalos y precosecha respetando LMR.',
      severidadPredio: 'En Carencia SAG (Cuartel 2)'
    },
    {
      id: 'brevipalpus',
      nombre: 'Falsa Arañita del Kiwi (Brevipalpus chilensis)',
      tipo: 'Ácaro Cuarentenario (Mercado USA)',
      sintomas: 'Pardeamiento de hojas y cáliz de fruta, presencia de huevos rojizos en peciolos.',
      controlSugerido: 'Envidor 240 SC o acaricidas registrados SAG con verificación de LMR.',
      severidadPredio: 'Nivel Cero Detectado'
    },
    {
      id: 'escama',
      nombre: 'Escama de San José (Diaspidiotus perniciosus)',
      tipo: 'Insecto Hemíptero',
      sintomas: 'Escudos redondeados grisáceos adheridos a cargadores y frutos con aureola rojiza.',
      controlSugerido: 'Aceite mineral en receso invernal + fosforados o piriproxifeno.',
      severidadPredio: 'Control Invernal OK'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Bug className="w-3 h-3 text-rose-700" />
            Sanidad Vegetal & Control Fitosanitario
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Monitoreo de Psa, Botrytis & Plagas
          </h1>
          <p className="text-xs text-stone-500">
            Detección temprana de síntomas de bacteriosis Psa, falsa arañita y hongos para cumplimiento de protocolos SAG.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsQuickObsOpen(true)}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Inspección de Campo</span>
          </button>
        )}
      </div>

      {/* Tarjetas de Plagas Clave de Hayward */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plagasFrecuentes.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3 text-xs">
            <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-400">{p.tipo}</span>
                <h3 className="font-bold text-sm text-stone-900 mt-0.5">{p.nombre}</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                {p.severidadPredio}
              </span>
            </div>

            <div className="space-y-1.5 text-stone-600">
              <p><strong>Síntomas en Terreno:</strong> {p.sintomas}</p>
              <p className="text-emerald-900"><strong>Estrategia Recomendada:</strong> {p.controlSugerido}</p>
            </div>

            {canEdit && (
              <div className="pt-2 border-t border-stone-100 flex justify-end">
                <button
                  onClick={() => onOpenNewLaborWithDefaults(undefined, 'fitosanitario')}
                  className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Recetar Tratamiento en Cuaderno →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Historial de Inspecciones Registradas */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-700" />
            Registro de Inspecciones Sanitarias en Cuarteles
          </h2>
          <span className="text-xs text-stone-400">{monitoreos.length} inspecciones</span>
        </div>

        <div className="divide-y divide-stone-100 text-xs">
          {monitoreos.map((m) => (
            <div key={m.id} className="p-4 hover:bg-stone-50 transition-colors space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-stone-500 font-bold">{m.fecha}</span>
                  <span className="font-bold text-stone-900">{m.parcelaNombre}</span>
                </div>
                <span className="text-stone-500 text-[11px]">{m.registradoPor}</span>
              </div>
              <p className="text-stone-700">{m.descripcion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Nueva Observación */}
      {isQuickObsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 overflow-hidden">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Inspección Fitosanitaria de Plagas</h3>
              <button onClick={() => setIsQuickObsOpen(false)} className="text-rose-200 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleGuardarObservacion} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Cuartel Inspeccionado:</label>
                <select
                  value={obsForm.parcelaId}
                  onChange={(e) => setObsForm({ ...obsForm, parcelaId: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  required
                >
                  {parcelas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Organismo / Plaga Monitoreada:</label>
                <select
                  value={obsForm.plaga}
                  onChange={(e) => setObsForm({ ...obsForm, plaga: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                >
                  <option value="Psa (Pseudomonas syringae pv. actinidiae)">Psa (Pseudomonas syringae pv. actinidiae)</option>
                  <option value="Botrytis cinerea">Botrytis cinerea (Moho gris)</option>
                  <option value="Brevipalpus chilensis">Brevipalpus chilensis (Falsa arañita)</option>
                  <option value="Diaspidiotus perniciosus">Diaspidiotus perniciosus (Escama San José)</option>
                  <option value="Burrito de la vid">Burrito de la vid (Naupactus xanthographus)</option>
                  <option value="Malezas / Fitotoxicidad">Malezas / Fitotoxicidad</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Severidad / Nivel Detectado:</label>
                <select
                  value={obsForm.severidad}
                  onChange={(e) => setObsForm({ ...obsForm, severidad: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                >
                  <option value="Nivel Cero / Sin Síntomas (Limpio)">Nivel Cero / Sin Síntomas (Limpio)</option>
                  <option value="Leve (Bajo Umbral de Daño Económico)">Leve (Bajo Umbral de Daño Económico)</option>
                  <option value="Medio (Requiere Aplicación Próxima)">Medio (Requiere Aplicación Próxima)</option>
                  <option value="Crítico (Foco Activo de Intervención Urgente)">Crítico (Foco Activo de Intervención Urgente)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Detalle de la Inspección / Órganos Afectados:</label>
                <textarea
                  value={obsForm.descripcion}
                  onChange={(e) => setObsForm({ ...obsForm, descripcion: e.target.value })}
                  rows={3}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsQuickObsOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-800 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Registrar Inspección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
