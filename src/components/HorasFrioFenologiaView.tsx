import React, { useState } from 'react';
import { 
  CondicionHorasFrio, 
  SeguimientoFenologico, 
  RegistroPolinizacion, 
  Parcela 
} from '../types/campo';
import { 
  Snowflake, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Pencil
} from 'lucide-react';

interface HorasFrioFenologiaViewProps {
  parcelas: Parcela[];
  horasFrio: CondicionHorasFrio;
  onUpdateHorasFrio: (hf: CondicionHorasFrio) => void;
  fenologia: SeguimientoFenologico[];
  onAddFenologia: (f: SeguimientoFenologico) => void;
  onUpdateFenologia?: (f: SeguimientoFenologico) => void;
  onDeleteFenologia: (id: string) => void;
  polinizacion: RegistroPolinizacion[];
  onAddPolinizacion: (p: RegistroPolinizacion) => void;
  onUpdatePolinizacion?: (p: RegistroPolinizacion) => void;
  onDeletePolinizacion: (id: string) => void;
  activeUserName?: string;
}

export const HorasFrioFenologiaView: React.FC<HorasFrioFenologiaViewProps> = ({
  parcelas,
  horasFrio,
  onUpdateHorasFrio,
  fenologia,
  onAddFenologia,
  onUpdateFenologia,
  onDeleteFenologia,
  polinizacion,
  onAddPolinizacion,
  onUpdatePolinizacion,
  onDeletePolinizacion,
}) => {
  const [subTab, setSubTab] = useState<'horas_frio' | 'fenologia' | 'polinizacion'>('horas_frio');
  const [isEditHFOpen, setIsEditHFOpen] = useState(false);
  const [isNewFenologiaOpen, setIsNewFenologiaOpen] = useState(false);
  const [editingFenId, setEditingFenId] = useState<string | null>(null);
  const [isNewPolinizacionOpen, setIsNewPolinizacionOpen] = useState(false);
  const [editingPolId, setEditingPolId] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const todayISO = () => new Date().toISOString().split('T')[0];

  const totalHa = parcelas.reduce((acc, p) => acc + (p.superficieHa || 0), 0);

  const safeHF: CondicionHorasFrio = horasFrio || {
    fechaCorte: todayISO(),
    totalAcumuladoHF: 815,
    metaVariedadHF: 850,
    modeloCalculo: 'Weinberger (< 7.2°C)',
    porcentajeCumplimiento: 95.8,
    estadoDormancia: 'Salida de receso',
    recomendacionRompedor: 'Evaluación según acumulación de frío'
  };

  // Formulario Horas Frío
  const [hfForm, setHfForm] = useState({
    totalAcumuladoHF: safeHF.totalAcumuladoHF || 815,
    metaVariedadHF: safeHF.metaVariedadHF || 850,
    recomendacionRompedor: safeHF.recomendacionRompedor || ''
  });

  // Formulario Fenología
  const getDefaultFenForm = () => ({
    fecha: todayISO(),
    parcelaId: parcelas[0]?.id || 'general',
    escalaBBCH: 'BBCH 65',
    estadoDescripcion: 'Plena floración en cuartel',
    porcentajeAvance: 50,
    observaciones: ''
  });
  const [fenForm, setFenForm] = useState(getDefaultFenForm);

  // Formulario Polinización
  const getDefaultPolForm = () => ({
    fecha: todayISO(),
    colmenasApisInstaladas: totalHa > 0 ? Math.round(totalHa * 8) : 40,
    colmenasBombusInstaladas: totalHa > 0 ? Math.round(totalHa * 2) : 10,
    porcentajeFloracionFemenina: 50,
    porcentajeFloracionMasculina: 60,
    actividadAbejasCalificacion: 'Óptima (> 25 abejas/m²)' as RegistroPolinizacion['actividadAbejasCalificacion'],
    temperaturaMediaC: 21.5,
    humedadRelativa: 55,
    observaciones: ''
  });
  const [polForm, setPolForm] = useState(getDefaultPolForm);

  const handleOpenEditHF = () => {
    setHfForm({
      totalAcumuladoHF: safeHF.totalAcumuladoHF || 0,
      metaVariedadHF: safeHF.metaVariedadHF || 850,
      recomendacionRompedor: safeHF.recomendacionRompedor || ''
    });
    setIsEditHFOpen(true);
  };

  const handleOpenNewFen = () => {
    setEditingFenId(null);
    setFenForm(getDefaultFenForm());
    setIsNewFenologiaOpen(true);
  };

  const handleOpenEditFen = (f: SeguimientoFenologico) => {
    setEditingFenId(f.id);
    setFenForm({
      fecha: f.fecha || todayISO(),
      parcelaId: f.parcelaId || parcelas[0]?.id || 'general',
      escalaBBCH: f.escalaBBCH || 'BBCH 65',
      estadoDescripcion: f.estadoDescripcion || '',
      porcentajeAvance: f.porcentajeAvance ?? 50,
      observaciones: f.observaciones || ''
    });
    setIsNewFenologiaOpen(true);
  };

  const handleOpenNewPol = () => {
    setEditingPolId(null);
    setPolForm(getDefaultPolForm());
    setIsNewPolinizacionOpen(true);
  };

  const handleOpenEditPol = (p: RegistroPolinizacion) => {
    setEditingPolId(p.id);
    setPolForm({
      fecha: p.fecha || todayISO(),
      colmenasApisInstaladas: p.colmenasApisInstaladas ?? 0,
      colmenasBombusInstaladas: p.colmenasBombusInstaladas ?? 0,
      porcentajeFloracionFemenina: p.porcentajeFloracionFemenina ?? 0,
      porcentajeFloracionMasculina: p.porcentajeFloracionMasculina ?? 0,
      actividadAbejasCalificacion: p.actividadAbejasCalificacion || 'Óptima (> 25 abejas/m²)',
      temperaturaMediaC: p.temperaturaMediaC ?? 20,
      humedadRelativa: p.humedadRelativa ?? 55,
      observaciones: p.observaciones || ''
    });
    setIsNewPolinizacionOpen(true);
  };

  const handleSaveHF = (e: React.FormEvent) => {
    e.preventDefault();
    const acumulado = Number(hfForm.totalAcumuladoHF);
    const meta = Number(hfForm.metaVariedadHF) || 1;
    const pct = Number(((acumulado / meta) * 100).toFixed(1));

    onUpdateHorasFrio({
      ...safeHF,
      totalAcumuladoHF: acumulado,
      metaVariedadHF: meta,
      porcentajeCumplimiento: pct,
      recomendacionRompedor: hfForm.recomendacionRompedor,
      fechaCorte: todayISO()
    });
    setIsEditHFOpen(false);
  };

  const handleSaveFenologia = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parcelas.find((item) => item.id === fenForm.parcelaId);
    const payload: SeguimientoFenologico = {
      id: editingFenId || `fen-${Date.now()}`,
      fecha: fenForm.fecha || todayISO(),
      parcelaId: fenForm.parcelaId || 'general',
      parcelaNombre: p ? p.nombre : 'Huerto General',
      escalaBBCH: fenForm.escalaBBCH,
      estadoDescripcion: fenForm.estadoDescripcion,
      porcentajeAvance: Number(fenForm.porcentajeAvance) || 0,
      observaciones: fenForm.observaciones
    };
    if (editingFenId && onUpdateFenologia) {
      onUpdateFenologia(payload);
    } else {
      onAddFenologia(payload);
    }
    setIsNewFenologiaOpen(false);
    setEditingFenId(null);
  };

  const handleSavePolinizacion = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: RegistroPolinizacion = {
      id: editingPolId || `pol-${Date.now()}`,
      fecha: polForm.fecha || todayISO(),
      colmenasApisInstaladas: Number(polForm.colmenasApisInstaladas) || 0,
      colmenasBombusInstaladas: Number(polForm.colmenasBombusInstaladas) || 0,
      porcentajeFloracionFemenina: Number(polForm.porcentajeFloracionFemenina) || 0,
      porcentajeFloracionMasculina: Number(polForm.porcentajeFloracionMasculina) || 0,
      actividadAbejasCalificacion: polForm.actividadAbejasCalificacion,
      temperaturaMediaC: Number(polForm.temperaturaMediaC) || 0,
      humedadRelativa: Number(polForm.humedadRelativa) || 0,
      observaciones: polForm.observaciones
    };
    if (editingPolId && onUpdatePolinizacion) {
      onUpdatePolinizacion(payload);
    } else {
      onAddPolinizacion(payload);
    }
    setIsNewPolinizacionOpen(false);
    setEditingPolId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Snowflake className="w-3 h-3 text-blue-700" />
            Fisiología del Kiwi Hayward
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Horas Frío, Fenología & Polinización
          </h1>
          <p className="text-xs text-stone-500">
            Modelo Weinberger (&lt;7.2°C), rompedores de dormancia (Erger/Cianamida), escala BBCH y colmenas mixtas (Apis + Bombus).
          </p>
        </div>

        {/* Botones de navegación interna */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold flex flex-wrap">
            <button
              onClick={() => setSubTab('horas_frio')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                subTab === 'horas_frio' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Horas Frío & Rompedores
            </button>
            <button
              onClick={() => setSubTab('fenologia')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                subTab === 'fenologia' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Escala BBCH ({fenologia.length})
            </button>
            <button
              onClick={() => setSubTab('polinizacion')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                subTab === 'polinizacion' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Polinización (Colmenas) ({polinizacion.length})
            </button>
          </div>
        </div>
      </div>

      {/* SUB-PESTAÑA 1: Horas Frío */}
      {subTab === 'horas_frio' && (
        <div className="space-y-5">
          {/* Tarjeta de Progreso Principal */}
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm border border-blue-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-blue-300 font-bold uppercase text-[10px] tracking-wider">
                  Modelo Weinberger (&lt; 7.2°C) · Actualizado: {safeHF.fechaCorte}
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight mt-1">
                  {safeHF.totalAcumuladoHF} Horas Frío Acumuladas
                </h2>
                <p className="text-xs text-blue-200 mt-0.5">
                  Meta para brotación regular de Kiwi Hayward: <strong>{safeHF.metaVariedadHF} Horas Frío</strong>.
                </p>
              </div>

              <button
                onClick={handleOpenEditHF}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors border border-white/10 self-start sm:self-center cursor-pointer"
              >
                Actualizar Lectura de Frío
              </button>
            </div>

            {/* Barra de progreso */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>Progreso hacia la meta</span>
                <span className="font-mono font-bold text-blue-300">{safeHF.porcentajeCumplimiento}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, safeHF.porcentajeCumplimiento)}%` }} 
                />
              </div>
            </div>

            {/* Recomendación de Rompedor de Dormancia */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-blue-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Diagnóstico y Estrategia de Rompedor de Dormancia
              </div>
              <p className="text-blue-100 text-[11px] leading-relaxed">
                {safeHF.recomendacionRompedor}
              </p>
            </div>
          </div>

          {/* Información Técnica de Hayward y Machos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-2">
              <h3 className="font-bold text-sm text-stone-900">Kiwi Hayward (Femenino)</h3>
              <p className="text-stone-500 text-[11px]">
                Exigente en frío: 800 - 1.000 HF. Un déficit de frío provoca brotación desuniforme, escasa floración y baja fertilidad de yemas.
              </p>
              <div className="text-emerald-800 font-bold text-[11px] pt-1 border-t border-stone-100">
                Meta predial: 850 HF
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-2">
              <h3 className="font-bold text-sm text-stone-900">Polinizador Tomuri (Macho)</h3>
              <p className="text-stone-500 text-[11px]">
                Florece tardíamente con floración prolongada. Requiere ~750-800 HF. Crucial sincronizar la caída de pétalos con la apertura de flores femeninas.
              </p>
              <div className="text-blue-800 font-bold text-[11px] pt-1 border-t border-stone-100">
                10% plantas prediales
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-2">
              <h3 className="font-bold text-sm text-stone-900">Polinizador Chieftain (Macho)</h3>
              <p className="text-stone-500 text-[11px]">
                Floración precoz y abundante polen fértil. Requiere ~700-750 HF. Complementa la primera semana de floración del cuartel.
              </p>
              <div className="text-purple-800 font-bold text-[11px] pt-1 border-t border-stone-100">
                5% plantas prediales
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PESTAÑA 2: Fenología Escala BBCH */}
      {subTab === 'fenologia' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-stone-200">
            <div>
              <h2 className="font-bold text-sm text-stone-900">Seguimiento Fenológico BBCH por Cuartel</h2>
              <p className="text-xs text-stone-500">Registro, edición y eliminación de estados del ciclo vegetativo y reproductivo.</p>
            </div>
            <button
              onClick={handleOpenNewFen}
              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Estado BBCH</span>
            </button>
          </div>

          {fenologia.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 text-xs">
              No hay estados fenológicos registrados aún. Haz clic en "Registrar Estado BBCH" para ingresar el primero.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fenologia.map((f) => {
                const delKey = `fen-${f.id}`;
                return (
                  <div key={f.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-2.5 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                          {f.escalaBBCH}
                        </span>
                        <h3 className="font-bold text-stone-900 text-sm mt-1">{f.parcelaNombre}</h3>
                        <span className="text-[10px] text-stone-400">{f.fecha}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditFen(f)}
                          className="p-1.5 text-stone-500 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 cursor-pointer"
                          title="Editar estado BBCH"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteKey === delKey ? (
                          <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                            <button
                              onClick={() => {
                                onDeleteFenologia(f.id);
                                setConfirmDeleteKey(null);
                              }}
                              className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-[10px] cursor-pointer"
                            >
                              Eliminar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteKey(null)}
                              className="px-1.5 py-0.5 text-stone-600 hover:text-stone-900 font-semibold text-[10px] cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteKey(delKey)}
                            className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Eliminar estado BBCH"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-stone-700 leading-relaxed font-medium">
                      {f.estadoDescripcion}
                    </p>

                    <div className="space-y-1 pt-1 border-t border-stone-100">
                      <div className="flex justify-between text-[11px] text-stone-500">
                        <span>Avance en el cuartel:</span>
                        <span className="font-bold text-emerald-800">{f.porcentajeAvance}%</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1.5">
                        <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.max(0, f.porcentajeAvance))}%` }} />
                      </div>
                    </div>

                    {f.observaciones && (
                      <div className="text-[11px] text-stone-500 italic bg-stone-50 p-2 rounded-lg">
                        {f.observaciones}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-PESTAÑA 3: Polinización (Colmenas) */}
      {subTab === 'polinizacion' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-stone-200">
            <div>
              <h2 className="font-bold text-sm text-stone-900">Control de Polinización Mixta (Apis + Bombus)</h2>
              <p className="text-xs text-stone-500">
                El kiwi requiere al menos 800 a 1.200 granos de polen por fruto para calibre comercial.
                {totalHa > 0 && ` Superficie predial actual: ${totalHa.toFixed(1)} ha.`}
              </p>
            </div>
            <button
              onClick={handleOpenNewPol}
              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Registro Colmenas</span>
            </button>
          </div>

          {polinizacion.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 text-xs">
              No hay registros generales de colmenas aún. Haz clic en "Nuevo Registro Colmenas" para agregar uno.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {polinizacion.map((p) => {
                const delKey = `pol-${p.id}`;
                const apisHa = totalHa > 0 ? (p.colmenasApisInstaladas / totalHa).toFixed(1) : null;
                const bombusHa = totalHa > 0 ? (p.colmenasBombusInstaladas / totalHa).toFixed(1) : null;

                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3 text-xs">
                    <div className="flex justify-between items-start gap-2 border-b border-stone-100 pb-2">
                      <div>
                        <span className="font-mono text-stone-400 text-[10px]">{p.fecha}</span>
                        <h3 className="font-bold text-stone-900 text-sm mt-0.5">Polinización Mixta del Huerto</h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditPol(p)}
                          className="p-1.5 text-stone-500 hover:text-amber-800 rounded-lg hover:bg-amber-50 cursor-pointer"
                          title="Editar registro de colmenas"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteKey === delKey ? (
                          <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                            <button
                              onClick={() => {
                                onDeletePolinizacion(p.id);
                                setConfirmDeleteKey(null);
                              }}
                              className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-[10px] cursor-pointer"
                            >
                              Eliminar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteKey(null)}
                              className="px-1.5 py-0.5 text-stone-600 hover:text-stone-900 font-semibold text-[10px] cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteKey(delKey)}
                            className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Eliminar registro de colmenas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="text-[10px] text-amber-700 font-bold uppercase">Colmenas Apis mellifera</div>
                        <div className="font-black text-amber-950 text-base mt-0.5">{p.colmenasApisInstaladas} colmenas</div>
                        <div className="text-[10px] text-amber-800">
                          {apisHa !== null ? `${apisHa} colmenas/ha en ${totalHa.toFixed(1)} ha` : 'Meta: 8-10 colmenas/ha'}
                        </div>
                      </div>

                      <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                        <div className="text-[10px] text-purple-700 font-bold uppercase">Colmenas Bombus terrestris</div>
                        <div className="font-black text-purple-950 text-base mt-0.5">{p.colmenasBombusInstaladas} colmenas</div>
                        <div className="text-[10px] text-purple-800">
                          {bombusHa !== null ? `${bombusHa} colonias/ha` : 'Meta: 1-3 colonias/ha'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                      <div className="flex justify-between">
                        <span>Actividad de vuelo en parrón:</span>
                        <strong className="text-emerald-800">{p.actividadAbejasCalificacion}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Floración Femenina:</span>
                        <strong>{p.porcentajeFloracionFemenina}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Floración Masculina (Tomuri/Chieftain):</span>
                        <strong>{p.porcentajeFloracionMasculina}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Condiciones ambientales:</span>
                        <strong>{p.temperaturaMediaC}°C · {p.humedadRelativa}% HR</strong>
                      </div>
                    </div>

                    {p.observaciones && (
                      <p className="text-[11px] text-stone-500 italic bg-stone-50 p-2 rounded-lg border border-stone-100">
                        {p.observaciones}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Actualizar Horas Frío */}
      {isEditHFOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 overflow-hidden">
            <div className="bg-blue-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Actualizar Horas Frío y Rompedores</h3>
              <button onClick={() => setIsEditHFOpen(false)} className="text-blue-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveHF} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Horas Frío Acumuladas (&lt;7.2°C):</label>
                <input
                  type="number"
                  value={hfForm.totalAcumuladoHF}
                  onChange={(e) => setHfForm({ ...hfForm, totalAcumuladoHF: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-blue-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Meta Variedad Hayward (HF):</label>
                <input
                  type="number"
                  value={hfForm.metaVariedadHF}
                  onChange={(e) => setHfForm({ ...hfForm, metaVariedadHF: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Diagnóstico / Recomendación Técnica:</label>
                <textarea
                  value={hfForm.recomendacionRompedor}
                  onChange={(e) => setHfForm({ ...hfForm, recomendacionRompedor: e.target.value })}
                  rows={3}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditHFOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Guardar Lectura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Registro Fenológico */}
      {isNewFenologiaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingFenId ? 'Editar Estado Fenológico BBCH' : 'Registrar Estado Fenológico BBCH'}
              </h3>
              <button onClick={() => setIsNewFenologiaOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveFenologia} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha:</label>
                  <input
                    type="date"
                    value={fenForm.fecha}
                    onChange={(e) => setFenForm({ ...fenForm, fecha: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cuartel:</label>
                  <select
                    value={fenForm.parcelaId}
                    onChange={(e) => setFenForm({ ...fenForm, parcelaId: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  >
                    {parcelas.length === 0 ? (
                      <option value="general">Huerto General</option>
                    ) : (
                      parcelas.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Escala BBCH:</label>
                <select
                  value={fenForm.escalaBBCH}
                  onChange={(e) => setFenForm({ ...fenForm, escalaBBCH: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                >
                  <option value="BBCH 00">BBCH 00 - Yema de invierno dormida</option>
                  <option value="BBCH 01">BBCH 01 - Inicio de hinchazón de yema</option>
                  <option value="BBCH 10">BBCH 10 - Primeras hojas visibles</option>
                  <option value="BBCH 51">BBCH 51 - Inflorescencias visibles</option>
                  <option value="BBCH 61">BBCH 61 - Inicio de floración (10% flores abiertas)</option>
                  <option value="BBCH 65">BBCH 65 - Plena flor (50% flores abiertas)</option>
                  <option value="BBCH 69">BBCH 69 - Fin de floración y caída de pétalos</option>
                  <option value="BBCH 75">BBCH 75 - Crecimiento rápido del fruto</option>
                  <option value="BBCH 81">BBCH 81 - Inicio de maduración de fruta</option>
                  <option value="BBCH 85">BBCH 85 - Maduración avanzada (acumulación °Brix)</option>
                  <option value="BBCH 89">BBCH 89 - Madurez plena de cosecha (≥6.2° Brix)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Descripción del Estado:</label>
                <textarea
                  value={fenForm.estadoDescripcion}
                  onChange={(e) => setFenForm({ ...fenForm, estadoDescripcion: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">% de Avance en el Cuartel:</label>
                <input
                  type="number"
                  value={fenForm.porcentajeAvance}
                  onChange={(e) => setFenForm({ ...fenForm, porcentajeAvance: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones:</label>
                <textarea
                  value={fenForm.observaciones}
                  onChange={(e) => setFenForm({ ...fenForm, observaciones: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsNewFenologiaOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingFenId ? 'Actualizar Estado BBCH' : 'Guardar Estado BBCH'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Polinización & Colmenas */}
      {isNewPolinizacionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-amber-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingPolId ? 'Editar Registro de Colmenas y Polinización' : 'Registrar Conteo de Colmenas y Polinización'}
              </h3>
              <button onClick={() => setIsNewPolinizacionOpen(false)} className="text-amber-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSavePolinizacion} className="p-5 space-y-3 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Fecha de Evaluación:</label>
                <input
                  type="date"
                  value={polForm.fecha}
                  onChange={(e) => setPolForm({ ...polForm, fecha: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Colmenas Apis:</label>
                  <input
                    type="number"
                    min="0"
                    value={polForm.colmenasApisInstaladas}
                    onChange={(e) => setPolForm({ ...polForm, colmenasApisInstaladas: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Colmenas Bombus:</label>
                  <input
                    type="number"
                    min="0"
                    value={polForm.colmenasBombusInstaladas}
                    onChange={(e) => setPolForm({ ...polForm, colmenasBombusInstaladas: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">% Floración Femenina:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={polForm.porcentajeFloracionFemenina}
                    onChange={(e) => setPolForm({ ...polForm, porcentajeFloracionFemenina: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">% Floración Masculina:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={polForm.porcentajeFloracionMasculina}
                    onChange={(e) => setPolForm({ ...polForm, porcentajeFloracionMasculina: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Calificación de Vuelo de Abejas:</label>
                <select
                  value={polForm.actividadAbejasCalificacion}
                  onChange={(e) => setPolForm({ ...polForm, actividadAbejasCalificacion: e.target.value as RegistroPolinizacion['actividadAbejasCalificacion'] })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                >
                  <option value="Óptima (> 25 abejas/m²)">Óptima (&gt; 25 abejas/m²)</option>
                  <option value="Media (10-25 abejas/m²)">Media (10-25 abejas/m²)</option>
                  <option value="Baja (< 10 abejas/m²)">Baja (&lt; 10 abejas/m²)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Temperatura Media (°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={polForm.temperaturaMediaC}
                    onChange={(e) => setPolForm({ ...polForm, temperaturaMediaC: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Humedad Relativa (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={polForm.humedadRelativa}
                    onChange={(e) => setPolForm({ ...polForm, humedadRelativa: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones:</label>
                <textarea
                  value={polForm.observaciones}
                  onChange={(e) => setPolForm({ ...polForm, observaciones: e.target.value })}
                  rows={2}
                  placeholder="Ej. Ubicación de colmenas, horario de pecoreo, uniformidad..."
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsNewPolinizacionOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-800 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingPolId ? 'Actualizar Registro' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
