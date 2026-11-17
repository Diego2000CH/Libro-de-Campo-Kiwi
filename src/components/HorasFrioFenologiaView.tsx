import React, { useMemo, useState } from 'react';
import {
  ClimaCondiciones,
  CondicionHorasFrio,
  Parcela,
  PeriodicidadRegistroTermico,
  RegistroPolinizacion,
  RegistroTermicoHuerto,
  SeguimientoFenologico,
} from '../types/campo';
import {
  calcularDiasEntreFechas,
  calcularGradosDiaPeriodo,
  estaEnVentana,
  estimarEtapaKiwiPorFrioYGradosDia,
  ETAPAS_GDD_KIWI,
  getTemporadaDefaults,
  normalizarCondicionHorasFrio,
  sumarRegistrosTermicos,
} from '../utils/agroClimaCalculos';
import { GraficosTermicosHuerto } from './GraficosTermicosHuerto';
import {
  Calendar,
  CheckCircle2,
  CloudSun,
  Flame,
  Pencil,
  Plus,
  RefreshCw,
  Snowflake,
  Sprout,
  Thermometer,
  Trash2,
} from 'lucide-react';

interface HorasFrioFenologiaViewProps {
  parcelas: Parcela[];
  horasFrio: CondicionHorasFrio;
  onUpdateHorasFrio: (hf: CondicionHorasFrio) => void;
  registrosTermicos?: RegistroTermicoHuerto[];
  onAddRegistroTermico?: (r: RegistroTermicoHuerto) => void;
  onUpdateRegistroTermico?: (r: RegistroTermicoHuerto) => void;
  onDeleteRegistroTermico?: (id: string) => void;
  clima?: ClimaCondiciones;
  fenologia: SeguimientoFenologico[];
  onAddFenologia: (f: SeguimientoFenologico) => void;
  onUpdateFenologia?: (f: SeguimientoFenologico) => void;
  onDeleteFenologia: (id: string) => void;
  polinizacion: RegistroPolinizacion[];
  onAddPolinizacion: (p: RegistroPolinizacion) => void;
  onUpdatePolinizacion?: (p: RegistroPolinizacion) => void;
  onDeletePolinizacion: (id: string) => void;
  activeUserName?: string;
  canEdit?: boolean;
}

export const HorasFrioFenologiaView: React.FC<HorasFrioFenologiaViewProps> = ({
  parcelas,
  horasFrio,
  onUpdateHorasFrio,
  registrosTermicos = [],
  onAddRegistroTermico,
  onUpdateRegistroTermico,
  onDeleteRegistroTermico,
  clima,
  fenologia,
  onAddFenologia,
  onUpdateFenologia,
  onDeleteFenologia,
  polinizacion,
  onAddPolinizacion,
  onUpdatePolinizacion,
  onDeletePolinizacion,
  canEdit = true,
}) => {
  const [subTab, setSubTab] = useState<'horas_frio' | 'fenologia' | 'polinizacion'>('horas_frio');
  const [isEditHFOpen, setIsEditHFOpen] = useState(false);
  const [isRegTermicoOpen, setIsRegTermicoOpen] = useState(false);
  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const [filtroTablaTermica, setFiltroTablaTermica] = useState<'todos' | PeriodicidadRegistroTermico>('todos');

  const [isNewFenologiaOpen, setIsNewFenologiaOpen] = useState(false);
  const [editingFenId, setEditingFenId] = useState<string | null>(null);
  const [isNewPolinizacionOpen, setIsNewPolinizacionOpen] = useState(false);
  const [editingPolId, setEditingPolId] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const todayISO = () => new Date().toISOString().split('T')[0];

  const totalHa = parcelas.reduce((acc, p) => acc + (p.superficieHa || 0), 0);

  const safeHF = useMemo(
    () => normalizarCondicionHorasFrio(horasFrio, registrosTermicos),
    [horasFrio, registrosTermicos]
  );

  const defaults = useMemo(
    () => getTemporadaDefaults(safeHF.fechaCorte),
    [safeHF.fechaCorte]
  );

  const sumasRegistros = useMemo(
    () => sumarRegistrosTermicos(registrosTermicos, safeHF),
    [registrosTermicos, safeHF]
  );

  const estimacionKiwi = useMemo(
    () =>
      estimarEtapaKiwiPorFrioYGradosDia(
        safeHF.totalAcumuladoHF || 0,
        safeHF.metaVariedadHF || 850,
        safeHF.totalAcumuladoGD || 0,
        safeHF.metaVariedadGD || 1850
      ),
    [safeHF]
  );

  const ultimoBBCH = useMemo(() => {
    if (!fenologia.length) return null;
    return [...fenologia].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  }, [fenologia]);

  // Formulario Resumen y Ventanas (Horas Frío + Grados Día)
  const [hfForm, setHfForm] = useState({
    fechaCorte: safeHF.fechaCorte,
    totalAcumuladoHF: safeHF.totalAcumuladoHF || 0,
    metaVariedadHF: safeHF.metaVariedadHF || 850,
    modeloCalculo: safeHF.modeloCalculo,
    estadoDormancia: safeHF.estadoDormancia,
    recomendacionRompedor: safeHF.recomendacionRompedor || '',
    fechaInicioHF: safeHF.fechaInicioHF || defaults.fechaInicioHF,
    fechaFinHF: safeHF.fechaFinHF || defaults.fechaFinHF,
    totalAcumuladoGD: safeHF.totalAcumuladoGD ?? 0,
    metaVariedadGD: safeHF.metaVariedadGD ?? 1850,
    fechaInicioGD: safeHF.fechaInicioGD || defaults.fechaInicioGD,
    fechaFinGD: safeHF.fechaFinGD || defaults.fechaFinGD,
    tempBaseGddC: safeHF.tempBaseGddC ?? 10,
    tempTechoGddC: safeHF.tempTechoGddC ?? 30,
    sincronizarDesdeRegistros: safeHF.sincronizarDesdeRegistros ?? false,
  });

  // Formulario Registro Térmico (Diario / Semanal / Mensual)
  const getDefaultRegForm = (periodicidad: PeriodicidadRegistroTermico = 'diario') => {
    const hoy = todayISO();
    let fechaFin = hoy;
    let dias = 1;
    if (periodicidad === 'semanal') {
      const d = new Date(`${hoy}T12:00:00`);
      d.setDate(d.getDate() + 6);
      fechaFin = d.toISOString().split('T')[0];
      dias = 7;
    } else if (periodicidad === 'mensual') {
      const d = new Date(`${hoy}T12:00:00`);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      fechaFin = lastDay.toISOString().split('T')[0];
      dias = calcularDiasEntreFechas(`${hoy.slice(0, 8)}01`, fechaFin);
    }

    const tMin = clima?.tempMinima ?? 7.5;
    const tMax = clima?.tempMaxima ?? 21.0;
    const tBase = safeHF.tempBaseGddC ?? 10;
    const tTecho = safeHF.tempTechoGddC ?? 30;
    const gddSugerido = calcularGradosDiaPeriodo(tMin, tMax, tBase, tTecho, dias);

    return {
      periodicidad,
      fechaInicio: periodicidad === 'mensual' ? `${hoy.slice(0, 8)}01` : hoy,
      fechaFin,
      etiquetaPeriodo: '',
      tempMinC: tMin,
      tempMaxC: tMax,
      tempBaseGddC: tBase,
      diasPeriodo: dias,
      horasFrioPeriodo: 0,
      gradosDiaPeriodo: gddSugerido,
      fuenteDato: 'Manual' as RegistroTermicoHuerto['fuenteDato'],
      observaciones: '',
    };
  };
  const [regForm, setRegForm] = useState(() => getDefaultRegForm('diario'));

  // Formulario Fenología BBCH
  const getDefaultFenForm = () => ({
    fecha: todayISO(),
    parcelaId: parcelas[0]?.id || 'general',
    escalaBBCH: 'BBCH 65',
    estadoDescripcion: 'Plena floración en cuartel',
    porcentajeAvance: 50,
    observaciones: '',
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
    observaciones: '',
  });
  const [polForm, setPolForm] = useState(getDefaultPolForm);

  // Helpers sincronización totales desde registros
  const sincronizarTotalesConLista = (listaActualizada: RegistroTermicoHuerto[], baseCond: CondicionHorasFrio) => {
    const sumas = sumarRegistrosTermicos(listaActualizada, baseCond);
    const metaHF = baseCond.metaVariedadHF || 850;
    const pct = Number(((sumas.totalHFVentana / metaHF) * 100).toFixed(1));
    onUpdateHorasFrio({
      ...baseCond,
      totalAcumuladoHF: sumas.totalHFVentana,
      totalAcumuladoGD: sumas.totalGDVentana,
      porcentajeCumplimiento: pct,
      fechaCorte: todayISO(),
      sincronizarDesdeRegistros: true,
    });
  };

  // Abrir modal editar resumen & ventanas
  const handleOpenEditHF = () => {
    setHfForm({
      fechaCorte: safeHF.fechaCorte || todayISO(),
      totalAcumuladoHF: safeHF.totalAcumuladoHF || 0,
      metaVariedadHF: safeHF.metaVariedadHF || 850,
      modeloCalculo: safeHF.modeloCalculo || 'Weinberger (< 7.2°C)',
      estadoDormancia: safeHF.estadoDormancia || 'Dormancia profunda',
      recomendacionRompedor: safeHF.recomendacionRompedor || '',
      fechaInicioHF: safeHF.fechaInicioHF || defaults.fechaInicioHF,
      fechaFinHF: safeHF.fechaFinHF || defaults.fechaFinHF,
      totalAcumuladoGD: safeHF.totalAcumuladoGD ?? 0,
      metaVariedadGD: safeHF.metaVariedadGD ?? 1850,
      fechaInicioGD: safeHF.fechaInicioGD || defaults.fechaInicioGD,
      fechaFinGD: safeHF.fechaFinGD || defaults.fechaFinGD,
      tempBaseGddC: safeHF.tempBaseGddC ?? 10,
      tempTechoGddC: safeHF.tempTechoGddC ?? 30,
      sincronizarDesdeRegistros: safeHF.sincronizarDesdeRegistros ?? false,
    });
    setIsEditHFOpen(true);
  };

  const handleSaveHF = (e: React.FormEvent) => {
    e.preventDefault();
    const sumasConNuevasVentanas = sumarRegistrosTermicos(registrosTermicos, {
      ...safeHF,
      fechaInicioHF: hfForm.fechaInicioHF,
      fechaFinHF: hfForm.fechaFinHF,
      fechaInicioGD: hfForm.fechaInicioGD,
      fechaFinGD: hfForm.fechaFinGD,
    });

    const acumuladoHF = hfForm.sincronizarDesdeRegistros
      ? sumasConNuevasVentanas.totalHFVentana
      : Number(hfForm.totalAcumuladoHF) || 0;
    const acumuladoGD = hfForm.sincronizarDesdeRegistros
      ? sumasConNuevasVentanas.totalGDVentana
      : Number(hfForm.totalAcumuladoGD) || 0;

    const metaHF = Number(hfForm.metaVariedadHF) || 850;
    const metaGD = Number(hfForm.metaVariedadGD) || 1850;
    const pctHF = Number(((acumuladoHF / metaHF) * 100).toFixed(1));

    onUpdateHorasFrio({
      ...safeHF,
      fechaCorte: hfForm.fechaCorte || todayISO(),
      totalAcumuladoHF: acumuladoHF,
      metaVariedadHF: metaHF,
      modeloCalculo: hfForm.modeloCalculo,
      estadoDormancia: hfForm.estadoDormancia,
      porcentajeCumplimiento: pctHF,
      recomendacionRompedor: hfForm.recomendacionRompedor,
      fechaInicioHF: hfForm.fechaInicioHF,
      fechaFinHF: hfForm.fechaFinHF,
      fechaInicioGD: hfForm.fechaInicioGD,
      fechaFinGD: hfForm.fechaFinGD,
      tempBaseGddC: Number(hfForm.tempBaseGddC) || 10,
      tempTechoGddC: Number(hfForm.tempTechoGddC) || 30,
      totalAcumuladoGD: acumuladoGD,
      metaVariedadGD: metaGD,
      sincronizarDesdeRegistros: hfForm.sincronizarDesdeRegistros,
    });
    setIsEditHFOpen(false);
  };

  // Abrir modal nuevo / editar registro térmico (diario, semanal, mensual)
  const handleOpenNewRegTermico = (periodicidad: PeriodicidadRegistroTermico = 'diario') => {
    setEditingRegId(null);
    setRegForm(getDefaultRegForm(periodicidad));
    setIsRegTermicoOpen(true);
  };

  const handleOpenEditRegTermico = (reg: RegistroTermicoHuerto) => {
    setEditingRegId(reg.id);
    const dias =
      reg.diasPeriodo || calcularDiasEntreFechas(reg.fechaInicio, reg.fechaFin || reg.fechaInicio);
    setRegForm({
      periodicidad: reg.periodicidad,
      fechaInicio: reg.fechaInicio,
      fechaFin: reg.fechaFin || reg.fechaInicio,
      etiquetaPeriodo: reg.etiquetaPeriodo || '',
      tempMinC: reg.tempMinC ?? 6,
      tempMaxC: reg.tempMaxC ?? 18,
      tempBaseGddC: reg.tempBaseGddC ?? safeHF.tempBaseGddC ?? 10,
      diasPeriodo: dias,
      horasFrioPeriodo: reg.horasFrioPeriodo ?? 0,
      gradosDiaPeriodo: reg.gradosDiaPeriodo ?? 0,
      fuenteDato: reg.fuenteDato || 'Manual',
      observaciones: reg.observaciones || '',
    });
    setIsRegTermicoOpen(true);
  };

  const handleChangeRegPeriodicidad = (nextPer: PeriodicidadRegistroTermico) => {
    const baseIni = regForm.fechaInicio || todayISO();
    let nextIni = baseIni;
    let nextFin = baseIni;

    if (nextPer === 'diario') {
      nextFin = baseIni;
    } else if (nextPer === 'semanal') {
      const d = new Date(`${baseIni}T12:00:00`);
      if (!Number.isNaN(d.getTime())) {
        d.setDate(d.getDate() + 6);
        nextFin = d.toISOString().split('T')[0];
      }
    } else if (nextPer === 'mensual') {
      const d = new Date(`${baseIni}T12:00:00`);
      if (!Number.isNaN(d.getTime())) {
        nextIni = `${baseIni.slice(0, 8)}01`;
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        nextFin = last.toISOString().split('T')[0];
      }
    }

    const dias = calcularDiasEntreFechas(nextIni, nextFin);
    const gddCalc = calcularGradosDiaPeriodo(
      regForm.tempMinC,
      regForm.tempMaxC,
      regForm.tempBaseGddC,
      safeHF.tempTechoGddC ?? 30,
      dias
    );

    setRegForm((prev) => ({
      ...prev,
      periodicidad: nextPer,
      fechaInicio: nextIni,
      fechaFin: nextFin,
      diasPeriodo: dias,
      gradosDiaPeriodo: editingRegId ? prev.gradosDiaPeriodo : gddCalc,
    }));
  };

  const handleChangeRegFechas = (fechaInicio: string, fechaFinInput: string) => {
    const fechaFin = regForm.periodicidad === 'diario' ? fechaInicio : fechaFinInput || fechaInicio;
    const dias = calcularDiasEntreFechas(fechaInicio, fechaFin);
    setRegForm((prev) => ({
      ...prev,
      fechaInicio,
      fechaFin,
      diasPeriodo: dias,
    }));
  };

  const handleRecalcularGddEnModal = () => {
    const dias = Math.max(1, Number(regForm.diasPeriodo) || calcularDiasEntreFechas(regForm.fechaInicio, regForm.fechaFin));
    const gdd = calcularGradosDiaPeriodo(
      Number(regForm.tempMinC) || 0,
      Number(regForm.tempMaxC) || 0,
      Number(regForm.tempBaseGddC) || 10,
      safeHF.tempTechoGddC ?? 30,
      dias
    );
    setRegForm((prev) => ({ ...prev, gradosDiaPeriodo: gdd }));
  };

  const handleTraerDeEstacionClima = () => {
    if (!clima) return;
    const dias = Math.max(1, Number(regForm.diasPeriodo) || 1);
    const gdd = calcularGradosDiaPeriodo(
      clima.tempMinima,
      clima.tempMaxima,
      Number(regForm.tempBaseGddC) || 10,
      safeHF.tempTechoGddC ?? 30,
      dias
    );
    // Estimación orientativa de horas frío si Tmin < 7.2°C
    const hfEstimada =
      clima.tempMinima < 7.2
        ? Number((Math.max(0, Math.min(14, (7.2 - clima.tempMinima) * 1.4)) * dias).toFixed(1))
        : 0;
    setRegForm((prev) => ({
      ...prev,
      tempMinC: clima.tempMinima,
      tempMaxC: clima.tempMaxima,
      gradosDiaPeriodo: gdd,
      horasFrioPeriodo: prev.horasFrioPeriodo === 0 ? hfEstimada : prev.horasFrioPeriodo,
      fuenteDato: 'Open-Meteo',
    }));
  };

  const handleSaveRegTermico = (e: React.FormEvent) => {
    e.preventDefault();
    const fechaIni = regForm.fechaInicio || todayISO();
    const fechaFin = regForm.periodicidad === 'diario' ? fechaIni : regForm.fechaFin || fechaIni;
    const payload: RegistroTermicoHuerto = {
      id: editingRegId || `rt-${Date.now()}`,
      periodicidad: regForm.periodicidad,
      fechaInicio: fechaIni,
      fechaFin,
      etiquetaPeriodo: regForm.etiquetaPeriodo.trim() || undefined,
      tempMinC: Number(regForm.tempMinC),
      tempMaxC: Number(regForm.tempMaxC),
      tempBaseGddC: Number(regForm.tempBaseGddC) || 10,
      diasPeriodo: Number(regForm.diasPeriodo) || calcularDiasEntreFechas(fechaIni, fechaFin),
      horasFrioPeriodo: Math.max(0, Number(regForm.horasFrioPeriodo) || 0),
      gradosDiaPeriodo: Math.max(0, Number(regForm.gradosDiaPeriodo) || 0),
      fuenteDato: regForm.fuenteDato || 'Manual',
      observaciones: regForm.observaciones.trim() || undefined,
    };

    let nextLista: RegistroTermicoHuerto[];
    if (editingRegId && onUpdateRegistroTermico) {
      onUpdateRegistroTermico(payload);
      nextLista = registrosTermicos.map((r) => (r.id === editingRegId ? payload : r));
    } else if (onAddRegistroTermico) {
      onAddRegistroTermico(payload);
      nextLista = [payload, ...registrosTermicos];
    } else {
      nextLista = registrosTermicos;
    }

    if (safeHF.sincronizarDesdeRegistros) {
      sincronizarTotalesConLista(nextLista, safeHF);
    }

    setIsRegTermicoOpen(false);
    setEditingRegId(null);
  };

  const handleDeleteRegTermico = (id: string) => {
    if (!onDeleteRegistroTermico) return;
    onDeleteRegistroTermico(id);
    const nextLista = registrosTermicos.filter((r) => r.id !== id);
    if (safeHF.sincronizarDesdeRegistros) {
      sincronizarTotalesConLista(nextLista, safeHF);
    }
    setConfirmDeleteKey(null);
  };

  // Fenología BBCH handlers
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
      observaciones: f.observaciones || '',
    });
    setIsNewFenologiaOpen(true);
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
      observaciones: fenForm.observaciones,
    };
    if (editingFenId && onUpdateFenologia) {
      onUpdateFenologia(payload);
    } else {
      onAddFenologia(payload);
    }
    setIsNewFenologiaOpen(false);
    setEditingFenId(null);
  };

  // Polinización handlers
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
      observaciones: p.observaciones || '',
    });
    setIsNewPolinizacionOpen(true);
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
      observaciones: polForm.observaciones,
    };
    if (editingPolId && onUpdatePolinizacion) {
      onUpdatePolinizacion(payload);
    } else {
      onAddPolinizacion(payload);
    }
    setIsNewPolinizacionOpen(false);
    setEditingPolId(null);
  };

  const registrosFiltrados = useMemo(() => {
    return registrosTermicos
      .filter((r) => filtroTablaTermica === 'todos' || r.periodicidad === filtroTablaTermica)
      .slice()
      .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio) || b.fechaFin.localeCompare(a.fechaFin));
  }, [registrosTermicos, filtroTablaTermica]);

  const formatFechaBonita = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Snowflake className="w-3 h-3 text-blue-700" />
            Fisiología Térmica & Fenología del Kiwi Hayward
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Horas Frío, Grados Día (°D) &amp; Fenología
          </h1>
          <p className="text-xs text-stone-500">
            Acumulación de Frío (22 May – 31 Ago), Grados Día (1 Jul – 30 Abr), gráficos interactivos, escala BBCH y polinización.
          </p>
        </div>

        {/* Botones de navegación interna */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-semibold flex flex-wrap">
            <button
              type="button"
              onClick={() => setSubTab('horas_frio')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                subTab === 'horas_frio'
                  ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Frío &amp; Grados Día ({registrosTermicos.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('fenologia')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                subTab === 'fenologia'
                  ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Escala BBCH ({fenologia.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('polinizacion')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                subTab === 'polinizacion'
                  ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Polinización ({polinizacion.length})
            </button>
          </div>
        </div>
      </div>

      {/* SUB-PESTAÑA 1: Horas Frío & Grados Día */}
      {subTab === 'horas_frio' && (
        <div className="space-y-5">
          {/* Tarjetas Duales: Horas Frío + Grados Día */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tarjeta 1: Horas Frío (22 Mayo - 31 Agosto) */}
            <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm border border-blue-900/40 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <span className="text-blue-300 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <Snowflake className="w-3.5 h-3.5" />
                      {safeHF.modeloCalculo} · Ventana: {formatFechaBonita(safeHF.fechaInicioHF)} al {formatFechaBonita(safeHF.fechaFinHF)}
                    </span>
                    <h2 className="text-3xl font-extrabold tracking-tight mt-1">
                      {safeHF.totalAcumuladoHF} <span className="text-lg font-semibold text-blue-200">Horas Frío</span>
                    </h2>
                    <p className="text-xs text-blue-200 mt-0.5">
                      Meta Hayward: <strong>{safeHF.metaVariedadHF} HF</strong> · Estado: <strong>{safeHF.estadoDormancia}</strong>
                    </p>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleOpenEditHF}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors border border-white/15 self-start cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar Frío / Ventanas</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Cumplimiento de frío invernal</span>
                    <span className="font-mono font-bold text-blue-300">{estimacionKiwi.cumplimientoHFPct}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, estimacionKiwi.cumplimientoHFPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1">
                <div className="font-bold text-blue-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Estrategia de Frío &amp; Rompedor de Dormancia
                </div>
                <p className="text-blue-100 text-[11px] leading-relaxed">
                  {safeHF.recomendacionRompedor || 'Sin notas registradas.'}
                </p>
              </div>
            </div>

            {/* Tarjeta 2: Grados Día (1 Julio - 30 Abril) + Estimación de Estado del Huerto */}
            <div className="bg-gradient-to-br from-amber-950 via-stone-900 to-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-amber-900/40 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <span className="text-amber-300 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      Base {safeHF.tempBaseGddC ?? 10}°C (Techo {safeHF.tempTechoGddC ?? 30}°C) · {formatFechaBonita(safeHF.fechaInicioGD)} al {formatFechaBonita(safeHF.fechaFinGD)}
                    </span>
                    <h2 className="text-3xl font-extrabold tracking-tight mt-1">
                      {safeHF.totalAcumuladoGD ?? 0} <span className="text-lg font-semibold text-amber-200">Grados Día (°D)</span>
                    </h2>
                    <p className="text-xs text-amber-100/90 mt-0.5">
                      Meta cosecha Hayward: <strong>{safeHF.metaVariedadGD ?? 1850} °D</strong> · Corte: {safeHF.fechaCorte}
                    </p>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleOpenEditHF}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors border border-white/15 self-start cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar °D / Base</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Progreso térmico hacia madurez (≥6.2° Brix)</span>
                    <span className="font-mono font-bold text-amber-300">{estimacionKiwi.cumplimientoGDPct}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, estimacionKiwi.cumplimientoGDPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Estimación Integrada del Estado Fenológico del Huerto */}
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5 shrink-0" />
                    Estado Estimado: {estimacionKiwi.etapaActual.nombre}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-800/80 text-emerald-100 font-mono text-[10px] font-bold">
                    {estimacionKiwi.etapaActual.bbch}
                  </span>
                </div>
                <p className="text-stone-200 text-[11px] leading-relaxed">
                  {estimacionKiwi.diagnosticoIntegrado}
                </p>
                {ultimoBBCH && (
                  <div className="text-[10px] text-amber-200/90 pt-1 border-t border-white/10">
                    Último registro en terreno: <strong>{ultimoBBCH.escalaBBCH}</strong> en {ultimoBBCH.parcelaNombre} ({ultimoBBCH.fecha})
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Sincronización con Registros + Acciones Rápidas Diario / Semanal / Mensual */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-extrabold text-stone-900 flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span>Ingreso y Edición de Mediciones (Diario, Semanal o Mensual)</span>
                {safeHF.sincronizarDesdeRegistros ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Totales auto-calculados desde registros
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-bold">
                    Totales globales editables manualmente
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500">
                Suma en ventana actual: <strong>{sumasRegistros.totalHFVentana} HF</strong> ({sumasRegistros.registrosEnVentanaHF} reg. en 22 May–31 Ago) y{' '}
                <strong>{sumasRegistros.totalGDVentana} °D</strong> ({sumasRegistros.registrosEnVentanaGD} reg. en 1 Jul–30 Abr).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit && registrosTermicos.length > 0 && (
                <button
                  type="button"
                  onClick={() => sincronizarTotalesConLista(registrosTermicos, safeHF)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Sumar registros dentro de cada ventana estacional y actualizar los totales principales"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Sincronizar Totales</span>
                </button>
              )}

              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenNewRegTermico('diario')}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Diario</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNewRegTermico('semanal')}
                    className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Semanal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNewRegTermico('mensual')}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Mensual</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Gráficos Interactivos */}
          <GraficosTermicosHuerto registros={registrosTermicos} horasFrio={safeHF} />

          {/* Tabla de Registros Térmicos (Siempre Editables) */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-stone-900">
                  Bitácora de Horas Frío y Grados Día ({registrosFiltrados.length} registros)
                </h3>
                <p className="text-[11px] text-stone-500">
                  Todos los registros diarios, semanales y mensuales se pueden editar o corregir en cualquier momento.
                </p>
              </div>

              <div className="inline-flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-[11px] font-bold">
                {(
                  [
                    { id: 'todos', label: 'Todos' },
                    { id: 'diario', label: 'Diarios' },
                    { id: 'semanal', label: 'Semanales' },
                    { id: 'mensual', label: 'Mensuales' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroTablaTermica(f.id)}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                      filtroTablaTermica === f.id
                        ? 'bg-emerald-800 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {registrosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-xs space-y-2">
                <p>No hay registros térmicos ingresados aún para este filtro.</p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleOpenNewRegTermico('diario')}
                    className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                  >
                    + Ingresar Primer Registro (Diario / Semanal / Mensual)
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Período</th>
                      <th className="px-4 py-3">Frecuencia</th>
                      <th className="px-4 py-3">T° Mín / Máx</th>
                      <th className="px-4 py-3 text-right">Horas Frío</th>
                      <th className="px-4 py-3 text-right">Grados Día (°D)</th>
                      <th className="px-4 py-3">Ventanas</th>
                      <th className="px-4 py-3">Notas / Fuente</th>
                      {canEdit && <th className="px-4 py-3 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {registrosFiltrados.map((reg) => {
                      const inHF = estaEnVentana(reg.fechaInicio, reg.fechaFin, safeHF.fechaInicioHF, safeHF.fechaFinHF);
                      const inGD = estaEnVentana(reg.fechaInicio, reg.fechaFin, safeHF.fechaInicioGD, safeHF.fechaFinGD);
                      const delKey = `rt-${reg.id}`;

                      return (
                        <tr key={reg.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-stone-900">
                              {reg.etiquetaPeriodo || (reg.fechaInicio === reg.fechaFin ? reg.fechaInicio : `${reg.fechaInicio} → ${reg.fechaFin}`)}
                            </div>
                            <div className="text-[10px] font-mono text-stone-400">
                              {reg.fechaInicio === reg.fechaFin
                                ? reg.fechaInicio
                                : `${reg.fechaInicio} al ${reg.fechaFin}`}
                              {reg.diasPeriodo ? ` (${reg.diasPeriodo}d)` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                reg.periodicidad === 'diario'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : reg.periodicidad === 'semanal'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {reg.periodicidad}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-stone-700">
                            {typeof reg.tempMinC === 'number' || typeof reg.tempMaxC === 'number'
                              ? `${reg.tempMinC ?? '—'}° / ${reg.tempMaxC ?? '—'}°C`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-blue-800">
                            {reg.horasFrioPeriodo} HF
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
                            {reg.gradosDiaPeriodo} °D
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                              {inHF && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  Ventana HF
                                </span>
                              )}
                              {inGD && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  Ventana °D
                                </span>
                              )}
                              {!inHF && !inGD && (
                                <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                                  Fuera de ventana
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-stone-600 max-w-[220px]">
                            {reg.fuenteDato && (
                              <span className="text-[10px] font-semibold text-stone-400 mr-1">
                                [{reg.fuenteDato}]
                              </span>
                            )}
                            <span className="line-clamp-2">{reg.observaciones || '—'}</span>
                          </td>
                          {canEdit && (
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRegTermico(reg)}
                                  className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                  title="Editar registro"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {confirmDeleteKey === delKey ? (
                                  <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRegTermico(reg.id)}
                                      className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-[10px] cursor-pointer"
                                    >
                                      Eliminar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteKey(null)}
                                      className="px-1.5 py-0.5 text-stone-600 hover:text-stone-900 font-semibold text-[10px] cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteKey(delKey)}
                                    className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                                    title="Eliminar registro"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
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

          {/* Escala de Etapas Kiwi Hayward por Grados Día */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-600" />
                Referencia Fenológica por Grados Día (1 Julio – 30 Abril · Kiwi Hayward)
              </h3>
              <span className="text-[11px] font-mono text-stone-500">
                Acumulado actual: <strong className="text-amber-700">{safeHF.totalAcumuladoGD ?? 0} °D</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {ETAPAS_GDD_KIWI.map((etapa) => {
                const isCurrent = etapa.id === estimacionKiwi.etapaActual.id;
                const completed = (safeHF.totalAcumuladoGD ?? 0) >= etapa.gddMax;
                return (
                  <div
                    key={etapa.id}
                    className={`p-3 rounded-xl border transition-all space-y-1 ${
                      isCurrent
                        ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300'
                        : completed
                        ? 'bg-stone-50 border-stone-200 opacity-85'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                        {etapa.bbch}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-amber-700">
                        {etapa.gddMin}–{etapa.gddMax} °D
                      </span>
                    </div>
                    <div className="font-bold text-stone-900 text-xs pt-0.5">{etapa.nombre}</div>
                    <p className="text-[10px] text-stone-500 leading-snug">{etapa.descripcion}</p>
                    {isCurrent && (
                      <div className="text-[10px] font-black text-emerald-800 pt-0.5">
                        ● Etapa estimada actual
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Información Técnica de Hayward y Machos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-2">
              <h3 className="font-bold text-sm text-stone-900">Kiwi Hayward (Femenino)</h3>
              <p className="text-stone-500 text-[11px]">
                Exigente en frío: 800 - 1.000 HF (22 May – 31 Ago) y ~1.850 °D base 10°C (1 Jul – 30 Abr) para alcanzar ≥ 6.2° Brix.
              </p>
              <div className="text-emerald-800 font-bold text-[11px] pt-1 border-t border-stone-100">
                Meta predial: {safeHF.metaVariedadHF} HF / {safeHF.metaVariedadGD ?? 1850} °D
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-2">
              <h3 className="font-bold text-sm text-stone-900">Polinizador Tomuri (Macho)</h3>
              <p className="text-stone-500 text-[11px]">
                Florece tardíamente con floración prolongada. Requiere ~750-800 HF y ~520-580 °D para coincidir con Hayward.
              </p>
              <div className="text-blue-800 font-bold text-[11px] pt-1 border-t border-stone-100">
                10% plantas prediales
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-2">
              <h3 className="font-bold text-sm text-stone-900">Polinizador Chieftain (Macho)</h3>
              <p className="text-stone-500 text-[11px]">
                Floración precoz y abundante polen fértil. Requiere ~700-750 HF y ~480-520 °D desde julio.
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
            {canEdit && (
              <button
                type="button"
                onClick={handleOpenNewFen}
                className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Estado BBCH</span>
              </button>
            )}
          </div>

          {fenologia.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 text-xs">
              No hay estados fenológicos registrados aún. Haz clic en &quot;Registrar Estado BBCH&quot; para ingresar el primero.
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
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditFen(f)}
                            className="p-1.5 text-stone-500 hover:text-emerald-800 rounded-lg hover:bg-emerald-50 cursor-pointer"
                            title="Editar estado BBCH"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteKey === delKey ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteFenologia(f.id);
                                  setConfirmDeleteKey(null);
                                }}
                                className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-[10px] cursor-pointer"
                              >
                                Eliminar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteKey(null)}
                                className="px-1.5 py-0.5 text-stone-600 hover:text-stone-900 font-semibold text-[10px] cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteKey(delKey)}
                              className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer"
                              title="Eliminar estado BBCH"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
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
            {canEdit && (
              <button
                type="button"
                onClick={handleOpenNewPol}
                className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Registro Colmenas</span>
              </button>
            )}
          </div>

          {polinizacion.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 text-xs">
              No hay registros generales de colmenas aún. Haz clic en &quot;Nuevo Registro Colmenas&quot; para agregar uno.
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
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPol(p)}
                            className="p-1.5 text-stone-500 hover:text-amber-800 rounded-lg hover:bg-amber-50 cursor-pointer"
                            title="Editar registro de colmenas"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteKey === delKey ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeletePolinizacion(p.id);
                                  setConfirmDeleteKey(null);
                                }}
                                className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-[10px] cursor-pointer"
                              >
                                Eliminar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteKey(null)}
                                className="px-1.5 py-0.5 text-stone-600 hover:text-stone-900 font-semibold text-[10px] cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteKey(delKey)}
                              className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer"
                              title="Eliminar registro de colmenas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
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

      {/* MODAL 1: EDITAR RESUMEN, VENTANAS Y METAS (HORAS FRÍO + GRADOS DÍA) */}
      {isEditHFOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Editar Horas Frío, Grados Día y Ventanas de Temporada</h3>
              <button type="button" onClick={() => setIsEditHFOpen(false)} className="text-stone-300 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveHF} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hfForm.sincronizarDesdeRegistros}
                  onChange={(e) => setHfForm({ ...hfForm, sincronizarDesdeRegistros: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-emerald-700"
                />
                <div>
                  <div className="font-bold text-emerald-950">
                    Calcular totales automáticamente desde los registros diarios/semanales/mensuales
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Si está desactivado, puedes ingresar manualmente el total acumulado global abajo en cualquier momento.
                  </div>
                </div>
              </label>

              {/* Bloque Horas Frío */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                <div className="font-extrabold text-blue-950 flex items-center gap-1.5">
                  <Snowflake className="w-4 h-4 text-blue-700" />
                  <span>Horas Frío (&lt; 7.2°C) · Ventana 22 May – 31 Ago</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Acumulado HF:</label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={hfForm.sincronizarDesdeRegistros}
                      value={hfForm.totalAcumuladoHF}
                      onChange={(e) => setHfForm({ ...hfForm, totalAcumuladoHF: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-blue-900 disabled:bg-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Meta Hayward:</label>
                    <input
                      type="number"
                      value={hfForm.metaVariedadHF}
                      onChange={(e) => setHfForm({ ...hfForm, metaVariedadHF: parseInt(e.target.value) || 850 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Inicio Frío:</label>
                    <input
                      type="date"
                      value={hfForm.fechaInicioHF}
                      onChange={(e) => setHfForm({ ...hfForm, fechaInicioHF: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Término Frío:</label>
                    <input
                      type="date"
                      value={hfForm.fechaFinHF}
                      onChange={(e) => setHfForm({ ...hfForm, fechaFinHF: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Modelo de Frío:</label>
                    <select
                      value={hfForm.modeloCalculo}
                      onChange={(e) => setHfForm({ ...hfForm, modeloCalculo: e.target.value as CondicionHorasFrio['modeloCalculo'] })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    >
                      <option value="Weinberger (< 7.2°C)">Weinberger (&lt; 7.2°C)</option>
                      <option value="Utah">Modelo Utah</option>
                      <option value="Dinámico">Modelo Dinámico (Porciones)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Estado Dormancia:</label>
                    <select
                      value={hfForm.estadoDormancia}
                      onChange={(e) => setHfForm({ ...hfForm, estadoDormancia: e.target.value as CondicionHorasFrio['estadoDormancia'] })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    >
                      <option value="Dormancia profunda">Dormancia profunda</option>
                      <option value="Transición">Transición</option>
                      <option value="Salida de receso">Salida de receso</option>
                      <option value="Yema hinchada">Yema hinchada</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bloque Grados Día */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="font-extrabold text-amber-950 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-700" />
                  <span>Grados Día (GDD °D) · Ventana 1 Jul – 30 Abr</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Acumulado °D:</label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={hfForm.sincronizarDesdeRegistros}
                      value={hfForm.totalAcumuladoGD}
                      onChange={(e) => setHfForm({ ...hfForm, totalAcumuladoGD: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-amber-900 disabled:bg-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Meta Madurez (°D):</label>
                    <input
                      type="number"
                      value={hfForm.metaVariedadGD}
                      onChange={(e) => setHfForm({ ...hfForm, metaVariedadGD: parseInt(e.target.value) || 1850 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Inicio °D:</label>
                    <input
                      type="date"
                      value={hfForm.fechaInicioGD}
                      onChange={(e) => setHfForm({ ...hfForm, fechaInicioGD: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Término °D:</label>
                    <input
                      type="date"
                      value={hfForm.fechaFinGD}
                      onChange={(e) => setHfForm({ ...hfForm, fechaFinGD: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">T° Base (°C):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={hfForm.tempBaseGddC}
                      onChange={(e) => setHfForm({ ...hfForm, tempBaseGddC: parseFloat(e.target.value) || 10 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">T° Techo (°C):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={hfForm.tempTechoGddC}
                      onChange={(e) => setHfForm({ ...hfForm, tempTechoGddC: parseFloat(e.target.value) || 30 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Fecha Corte:</label>
                    <input
                      type="date"
                      value={hfForm.fechaCorte}
                      onChange={(e) => setHfForm({ ...hfForm, fechaCorte: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
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
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREAR / EDITAR REGISTRO TÉRMICO (DIARIO / SEMANAL / MENSUAL) */}
      {isRegTermicoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingRegId ? 'Editar Medición de Horas Frío & Grados Día' : 'Ingresar Medición de Horas Frío & Grados Día'}
              </h3>
              <button type="button" onClick={() => setIsRegTermicoOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveRegTermico} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Selector Periodicidad */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Frecuencia del Registro:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'diario', label: 'Diario (1 día)' },
                      { id: 'semanal', label: 'Semanal (7 días)' },
                      { id: 'mensual', label: 'Mensual (Mes)' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleChangeRegPeriodicidad(opt.id)}
                      className={`py-2 px-2 rounded-xl border font-bold cursor-pointer transition-colors ${
                        regForm.periodicidad === opt.id
                          ? 'bg-emerald-800 text-white border-emerald-800'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {regForm.periodicidad === 'diario' ? 'Fecha:' : 'Fecha Inicio:'}
                  </label>
                  <input
                    type="date"
                    value={regForm.fechaInicio}
                    onChange={(e) => handleChangeRegFechas(e.target.value, regForm.fechaFin)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                {regForm.periodicidad !== 'diario' && (
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Fecha Término:</label>
                    <input
                      type="date"
                      value={regForm.fechaFin}
                      onChange={(e) => handleChangeRegFechas(regForm.fechaInicio, e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Días del Período:</label>
                  <input
                    type="number"
                    min="1"
                    value={regForm.diasPeriodo}
                    onChange={(e) => setRegForm({ ...regForm, diasPeriodo: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Etiqueta (opcional):</label>
                  <input
                    type="text"
                    value={regForm.etiquetaPeriodo}
                    onChange={(e) => setRegForm({ ...regForm, etiquetaPeriodo: e.target.value })}
                    placeholder={
                      regForm.periodicidad === 'mensual'
                        ? 'Ej. Agosto 2026'
                        : regForm.periodicidad === 'semanal'
                        ? 'Ej. Semana 28 (Jul)'
                        : 'Ej. Lectura Día'
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fuente del Dato:</label>
                  <select
                    value={regForm.fuenteDato}
                    onChange={(e) => setRegForm({ ...regForm, fuenteDato: e.target.value as RegistroTermicoHuerto['fuenteDato'] })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  >
                    <option value="Estación Predial">Estación Predial</option>
                    <option value="Open-Meteo">Open-Meteo</option>
                    <option value="Manual">Ingreso Manual</option>
                  </select>
                </div>
              </div>

              {/* Bloque auxiliar de temperaturas para calcular °D */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-stone-800">Temperaturas &amp; Cálculo Asistido de Grados Día</span>
                  <div className="flex items-center gap-1.5">
                    {clima && (
                      <button
                        type="button"
                        onClick={handleTraerDeEstacionClima}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <CloudSun className="w-3 h-3" />
                        <span>Usar Clima Hoy</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRecalcularGddEnModal}
                      className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Calcular °D
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">T° Mínima (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={regForm.tempMinC}
                      onChange={(e) => setRegForm({ ...regForm, tempMinC: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">T° Máxima (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={regForm.tempMaxC}
                      onChange={(e) => setRegForm({ ...regForm, tempMaxC: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">T° Base (°C):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={regForm.tempBaseGddC}
                      onChange={(e) => setRegForm({ ...regForm, tempBaseGddC: parseFloat(e.target.value) || 10 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Valores finales editables de HF y GDD */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <label className="block font-bold text-blue-950 mb-1">Horas Frío del Período (&lt;7.2°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={regForm.horasFrioPeriodo}
                    onChange={(e) => setRegForm({ ...regForm, horasFrioPeriodo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-blue-300 rounded-lg font-mono font-black text-blue-900 text-sm"
                    required
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <label className="block font-bold text-amber-950 mb-1">Grados Día del Período (°D):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={regForm.gradosDiaPeriodo}
                    onChange={(e) => setRegForm({ ...regForm, gradosDiaPeriodo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono font-black text-amber-900 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones:</label>
                <textarea
                  value={regForm.observaciones}
                  onChange={(e) => setRegForm({ ...regForm, observaciones: e.target.value })}
                  rows={2}
                  placeholder="Ej. Helada matinal en sector bajo, brotación observada en yemas apicales..."
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsRegTermicoOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingRegId ? 'Actualizar Registro' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREAR / EDITAR REGISTRO FENOLÓGICO BBCH */}
      {isNewFenologiaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingFenId ? 'Editar Estado Fenológico BBCH' : 'Registrar Estado Fenológico BBCH'}
              </h3>
              <button type="button" onClick={() => setIsNewFenologiaOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
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

      {/* MODAL 4: CREAR / EDITAR POLINIZACIÓN & COLMENAS */}
      {isNewPolinizacionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-amber-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingPolId ? 'Editar Registro de Colmenas y Polinización' : 'Registrar Conteo de Colmenas y Polinización'}
              </h3>
              <button type="button" onClick={() => setIsNewPolinizacionOpen(false)} className="text-amber-200 hover:text-white cursor-pointer">✕</button>
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
