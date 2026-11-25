import React, { useMemo, useState } from 'react';
import {
  ClimaCondiciones,
  CondicionHorasFrio,
  EstadoFenologicoCatalogo,
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
import {
  BBCH_SUGERENCIAS,
  buildPreformedFenologiaKiwi,
  combinarCatalogoFenologico,
  formatEstadoFenologicoLabel,
  obtenerEtapaFenologicaActiva,
  parseEstadoFenologicoTexto,
  resolveEstadoEtapa,
} from '../utils/fenologiaHelper';
import { GraficosTermicosHuerto } from './GraficosTermicosHuerto';
import {
  Calendar,
  CheckCircle2,
  CloudSun,
  Flame,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Snowflake,
  Sprout,
  Thermometer,
  Trash2,
  X,
} from 'lucide-react';

interface HorasFrioFenologiaViewProps {
  parcelas: Parcela[];
  onUpdateParcela?: (p: Parcela) => void;
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
  onReplaceFenologia?: (list: SeguimientoFenologico[]) => void;
  estadosFenologicosPersonalizados?: EstadoFenologicoCatalogo[];
  onAddEstadoFenologicoCustom?: (item: EstadoFenologicoCatalogo) => void;
  onDeleteEstadoFenologicoCustom?: (id: string) => void;
  polinizacion: RegistroPolinizacion[];
  onAddPolinizacion: (p: RegistroPolinizacion) => void;
  onUpdatePolinizacion?: (p: RegistroPolinizacion) => void;
  onDeletePolinizacion: (id: string) => void;
  activeUserName?: string;
  canEdit?: boolean;
}

export const HorasFrioFenologiaView: React.FC<HorasFrioFenologiaViewProps> = ({
  parcelas,
  onUpdateParcela,
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
  onReplaceFenologia,
  estadosFenologicosPersonalizados = [],
  onAddEstadoFenologicoCustom,
  onDeleteEstadoFenologicoCustom,
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
  const [fenParcelaFiltro, setFenParcelaFiltro] = useState<string>('todos');
  const [fenEstadoFiltro, setFenEstadoFiltro] = useState<'todos' | 'programado' | 'en_curso' | 'completado'>('todos');
  const [confirmResetFenMode, setConfirmResetFenMode] = useState<'none' | 'clear' | 'template'>('none');
  const [editingCuartelEstadoId, setEditingCuartelEstadoId] = useState<string | null>(null);
  const [cuartelEstadoDraft, setCuartelEstadoDraft] = useState<string>('');
  const [cuartelFechaDraft, setCuartelFechaDraft] = useState<string>('');
  const [isCatalogoFormOpen, setIsCatalogoFormOpen] = useState(false);
  const [nuevoCatCode, setNuevoCatCode] = useState('');
  const [nuevoCatNombre, setNuevoCatNombre] = useState('');
  const [nuevoCatDesc, setNuevoCatDesc] = useState('');
  const [isNewPolinizacionOpen, setIsNewPolinizacionOpen] = useState(false);
  const [editingPolId, setEditingPolId] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const catalogoEstados = useMemo(
    () => combinarCatalogoFenologico(estadosFenologicosPersonalizados, fenologia, parcelas),
    [estadosFenologicosPersonalizados, fenologia, parcelas]
  );

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
    return obtenerEtapaFenologicaActiva(fenologia);
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

  // Formulario Fenología BBCH con fechas y estado
  const getDefaultFenForm = () => {
    const hoy = todayISO();
    const fin = new Date(`${hoy}T12:00:00`);
    fin.setDate(fin.getDate() + 14);
    return {
      fecha: hoy,
      fechaFin: fin.toISOString().split('T')[0],
      parcelaId: fenParcelaFiltro !== 'todos' ? fenParcelaFiltro : (parcelas[0]?.id || 'general'),
      escalaBBCH: 'BBCH 65',
      nombreEtapa: 'Plena floración',
      estadoDescripcion: 'Plena floración en cuartel',
      estadoEtapa: 'en_curso' as 'programado' | 'en_curso' | 'completado',
      porcentajeAvance: 50,
      observaciones: '',
      sincronizarCuartel: false,
      guardarEnCatalogo: true,
    };
  };
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
  const handleOpenNewFen = (preset?: { escalaBBCH?: string; nombreEtapa?: string; estadoDescripcion?: string }) => {
    setEditingFenId(null);
    const base = getDefaultFenForm();
    if (preset) {
      setFenForm({
        ...base,
        escalaBBCH: preset.escalaBBCH || base.escalaBBCH,
        nombreEtapa: preset.nombreEtapa || base.nombreEtapa,
        estadoDescripcion: preset.estadoDescripcion || base.estadoDescripcion,
      });
    } else {
      setFenForm(base);
    }
    setIsNewFenologiaOpen(true);
  };

  const handleOpenEditFen = (f: SeguimientoFenologico) => {
    setEditingFenId(f.id);
    const sug = catalogoEstados.find((s) => s.code.toLowerCase() === (f.escalaBBCH || '').toLowerCase());
    setFenForm({
      fecha: f.fecha || todayISO(),
      fechaFin: f.fechaFin || f.fecha || todayISO(),
      parcelaId: f.parcelaId || 'general',
      escalaBBCH: f.escalaBBCH || 'BBCH 65',
      nombreEtapa: f.nombreEtapa || sug?.nombre || '',
      estadoDescripcion: f.estadoDescripcion || '',
      estadoEtapa: f.estadoEtapa || ((f.porcentajeAvance ?? 0) >= 100 ? 'completado' : (f.porcentajeAvance ?? 0) > 0 ? 'en_curso' : 'programado'),
      porcentajeAvance: f.porcentajeAvance ?? 50,
      observaciones: f.observaciones || '',
      sincronizarCuartel: false,
      guardarEnCatalogo: false,
    });
    setIsNewFenologiaOpen(true);
  };

  const guardarEstadoCatalogoSiNoExiste = (codeRaw: string, nombreRaw: string, descRaw?: string) => {
    if (!onAddEstadoFenologicoCustom) return;
    const code = (codeRaw || 'PERS').trim() || 'PERS';
    const nombre = (nombreRaw || '').trim();
    if (!nombre) return;
    const yaExiste = catalogoEstados.some(
      (c) =>
        c.nombre.trim().toLowerCase() === nombre.toLowerCase() &&
        c.code.trim().toLowerCase() === code.toLowerCase()
    );
    if (yaExiste) return;
    onAddEstadoFenologicoCustom({
      id: `efp-${Date.now()}`,
      code,
      nombre,
      descripcion: descRaw?.trim() || undefined,
    });
  };

  const persistirFenologia = (keepOpenForNext: boolean) => {
    const p = parcelas.find((item) => item.id === fenForm.parcelaId);
    const nombreCuartel = fenForm.parcelaId === 'general' ? 'Huerto General' : (p ? p.nombre : 'Huerto General');
    const sug = catalogoEstados.find((s) => s.code.toLowerCase() === fenForm.escalaBBCH.trim().toLowerCase());
    const nombreEtapaFinal = fenForm.nombreEtapa.trim() || sug?.nombre || fenForm.escalaBBCH.trim();
    const escalaFinal = fenForm.escalaBBCH.trim() || 'PERS';

    const payload: SeguimientoFenologico = {
      id: editingFenId || `fen-${Date.now()}`,
      fecha: fenForm.fecha || todayISO(),
      fechaFin: fenForm.fechaFin || undefined,
      parcelaId: fenForm.parcelaId || 'general',
      parcelaNombre: nombreCuartel,
      escalaBBCH: escalaFinal,
      nombreEtapa: nombreEtapaFinal,
      estadoDescripcion: fenForm.estadoDescripcion.trim() || nombreEtapaFinal,
      estadoEtapa: fenForm.estadoEtapa,
      porcentajeAvance: Number(fenForm.porcentajeAvance) || 0,
      observaciones: fenForm.observaciones.trim(),
    };
    if (editingFenId && onUpdateFenologia) {
      onUpdateFenologia(payload);
    } else {
      onAddFenologia(payload);
    }

    if (fenForm.guardarEnCatalogo) {
      guardarEstadoCatalogoSiNoExiste(escalaFinal, nombreEtapaFinal, payload.estadoDescripcion);
    }

    if (fenForm.sincronizarCuartel && p && onUpdateParcela) {
      onUpdateParcela({
        ...p,
        estadoFenologico: formatEstadoFenologicoLabel(escalaFinal, nombreEtapaFinal),
        fechaEstadoFenologico: payload.fecha,
      });
    }

    if (keepOpenForNext) {
      setEditingFenId(null);
      setFenForm({
        ...getDefaultFenForm(),
        parcelaId: fenForm.parcelaId,
        escalaBBCH: '',
        nombreEtapa: '',
        estadoDescripcion: '',
      });
    } else {
      setIsNewFenologiaOpen(false);
      setEditingFenId(null);
    }
  };

  const handleSaveFenologia = (e: React.FormEvent) => {
    e.preventDefault();
    persistirFenologia(false);
  };

  const handleCreateCustomCatalogoItem = (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = nuevoCatNombre.trim();
    if (!nombre || !onAddEstadoFenologicoCustom) return;
    const code = nuevoCatCode.trim() || `ET-${estadosFenologicosPersonalizados.length + 1}`;
    guardarEstadoCatalogoSiNoExiste(code, nombre, nuevoCatDesc);
    setNuevoCatCode('');
    setNuevoCatNombre('');
    setNuevoCatDesc('');
    setIsCatalogoFormOpen(false);
  };

  const handleToggleEstadoEtapa = (f: SeguimientoFenologico) => {
    if (!canEdit || !onUpdateFenologia) return;
    const actual = f.estadoEtapa || ((f.porcentajeAvance ?? 0) >= 100 ? 'completado' : (f.porcentajeAvance ?? 0) > 0 ? 'en_curso' : 'programado');
    const siguiente: Record<'programado' | 'en_curso' | 'completado', 'programado' | 'en_curso' | 'completado'> = {
      programado: 'en_curso',
      en_curso: 'completado',
      completado: 'programado',
    };
    const nextEstado = siguiente[actual];
    const nextAvance = nextEstado === 'completado' ? 100 : nextEstado === 'programado' ? 0 : (f.porcentajeAvance > 0 && f.porcentajeAvance < 100 ? f.porcentajeAvance : 50);
    onUpdateFenologia({
      ...f,
      estadoEtapa: nextEstado,
      porcentajeAvance: nextAvance,
    });
  };

  const handleLoadPreformedFenologia = () => {
    const targetId = fenParcelaFiltro !== 'todos' ? fenParcelaFiltro : 'general';
    const targetParcela = parcelas.find((p) => p.id === targetId);
    const targetNombre = targetId === 'general' ? 'Huerto General' : (targetParcela?.nombre || 'Huerto General');
    const plantilla = buildPreformedFenologiaKiwi(targetId, targetNombre);

    if (onReplaceFenologia) {
      onReplaceFenologia(plantilla);
    } else {
      plantilla.forEach((item) => onAddFenologia(item));
    }
    setConfirmResetFenMode('none');
  };

  const handleClearAllFenologia = () => {
    if (onReplaceFenologia) {
      onReplaceFenologia([]);
    } else {
      fenologia.forEach((item) => onDeleteFenologia(item.id));
    }
    setConfirmResetFenMode('none');
  };

  const handleGuardarEstadoCuartel = (p: Parcela) => {
    if (!onUpdateParcela) return;
    onUpdateParcela({
      ...p,
      estadoFenologico: cuartelEstadoDraft.trim() || 'Normal',
      fechaEstadoFenologico: cuartelFechaDraft || todayISO(),
    });
    setEditingCuartelEstadoId(null);
  };

  const fenologiaFiltradaOrdenada = useMemo(() => {
    return [...fenologia]
      .filter((f) => {
        if (fenParcelaFiltro !== 'todos' && f.parcelaId !== fenParcelaFiltro) return false;
        const est = f.estadoEtapa || ((f.porcentajeAvance ?? 0) >= 100 ? 'completado' : (f.porcentajeAvance ?? 0) > 0 ? 'en_curso' : 'programado');
        if (fenEstadoFiltro !== 'todos' && est !== fenEstadoFiltro) return false;
        return true;
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [fenologia, fenParcelaFiltro, fenEstadoFiltro]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Snowflake className="w-3 h-3 text-blue-700 dark:text-blue-400" />
            Fisiología Térmica & Fenología del Kiwi Hayward
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Horas Frío, Grados Día (°D) &amp; Fenología
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Acumulación de Frío (22 May – 31 Ago), Grados Día (1 Jul – 30 Abr), gráficos interactivos, escala BBCH y polinización.
          </p>
        </div>

        {/* Botones de navegación interna */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold flex flex-wrap">
            <button
              type="button"
              onClick={() => setSubTab('horas_frio')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                subTab === 'horas_frio'
                  ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
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
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              Estados Fenológicos ({fenologia.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('polinizacion')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                subTab === 'polinizacion'
                  ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
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
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5 shrink-0" />
                    {ultimoBBCH
                      ? `Estado Actual: ${ultimoBBCH.nombreEtapa || ultimoBBCH.estadoDescripcion}`
                      : `Estado Estimado: ${estimacionKiwi.etapaActual.nombre}`}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-800/80 text-emerald-100 font-mono text-[10px] font-bold">
                    {ultimoBBCH ? ultimoBBCH.escalaBBCH : estimacionKiwi.etapaActual.bbch}
                  </span>
                </div>
                <p className="text-stone-200 text-[11px] leading-relaxed">
                  {ultimoBBCH ? ultimoBBCH.estadoDescripcion : estimacionKiwi.diagnosticoIntegrado}
                </p>
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1.5 border-t border-white/10">
                  <span className="text-[10px] text-amber-200/90 font-mono">
                    {ultimoBBCH
                      ? `${ultimoBBCH.parcelaNombre} · ${ultimoBBCH.fecha}${ultimoBBCH.fechaFin ? ` → ${ultimoBBCH.fechaFin}` : ''}`
                      : `Estimado térmico: ${estimacionKiwi.etapaActual.bbch}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubTab('fenologia')}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-stone-950 dark:text-stone-50 font-bold rounded-lg text-[11px] cursor-pointer transition-colors"
                  >
                    {canEdit ? 'Editar Estados & Fechas →' : 'Ver Estados Fenológicos →'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Sincronización con Registros + Acciones Rápidas Diario / Semanal / Mensual */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Ingreso y Edición de Mediciones (Diario, Semanal o Mensual)</span>
                {safeHF.sincronizarDesdeRegistros ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                    Totales auto-calculados desde registros
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px] font-bold">
                    Totales globales editables manualmente
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Suma en ventana actual: <strong>{sumasRegistros.totalHFVentana} HF</strong> ({sumasRegistros.registrosEnVentanaHF} reg. en 22 May–31 Ago) y{' '}
                <strong>{sumasRegistros.totalGDVentana} °D</strong> ({sumasRegistros.registrosEnVentanaGD} reg. en 1 Jul–30 Abr).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit && registrosTermicos.length > 0 && (
                <button
                  type="button"
                  onClick={() => sincronizarTotalesConLista(registrosTermicos, safeHF)}
                  className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Sumar registros dentro de cada ventana estacional y actualizar los totales principales"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
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
                    <span>Diario</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNewRegTermico('semanal')}
                    className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Semanal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNewRegTermico('mensual')}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Mensual</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Gráficos Interactivos */}
          <GraficosTermicosHuerto registros={registrosTermicos} horasFrio={safeHF} />

          {/* Tabla de Registros Térmicos (Siempre Editables) */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100">
                  Bitácora de Horas Frío y Grados Día ({registrosFiltrados.length} registros)
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Todos los registros diarios, semanales y mensuales se pueden editar o corregir en cualquier momento.
                </p>
              </div>

              <div className="inline-flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl border border-stone-200 dark:border-stone-800 text-[11px] font-bold">
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
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {registrosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-stone-500 dark:text-stone-400 text-xs space-y-2">
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
                  <thead className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold uppercase text-[10px]">
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
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {registrosFiltrados.map((reg) => {
                      const inHF = estaEnVentana(reg.fechaInicio, reg.fechaFin, safeHF.fechaInicioHF, safeHF.fechaFinHF);
                      const inGD = estaEnVentana(reg.fechaInicio, reg.fechaFin, safeHF.fechaInicioGD, safeHF.fechaFinGD);
                      const delKey = `rt-${reg.id}`;

                      return (
                        <tr key={reg.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-stone-900 dark:text-stone-100">
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
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : reg.periodicidad === 'semanal'
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {reg.periodicidad}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-stone-700 dark:text-stone-300">
                            {typeof reg.tempMinC === 'number' || typeof reg.tempMaxC === 'number'
                              ? `${reg.tempMinC ?? '—'}° / ${reg.tempMaxC ?? '—'}°C`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-blue-800 dark:text-blue-300">
                            {reg.horasFrioPeriodo} HF
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                            {reg.gradosDiaPeriodo} °D
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                              {inHF && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80">
                                  Ventana HF
                                </span>
                              )}
                              {inGD && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
                                  Ventana °D
                                </span>
                              )}
                              {!inHF && !inGD && (
                                <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                                  Fuera de ventana
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-stone-600 dark:text-stone-400 max-w-[220px]">
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
                                  className="p-1.5 text-stone-500 dark:text-stone-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg cursor-pointer"
                                  title="Editar registro"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {confirmDeleteKey === delKey ? (
                                  <div className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-lg px-1.5 py-0.5">
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
                                      className="px-1.5 py-0.5 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-semibold text-[10px] cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteKey(delKey)}
                                    className="p-1.5 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg cursor-pointer"
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

          {/* Escala de Etapas Kiwi Hayward por Grados Día + Etapas Adicionales */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-extrabold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-600" />
                Referencia Fenológica por Grados Día &amp; Etapas Registradas
              </h3>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                  Acumulado actual: <strong className="text-amber-700 dark:text-amber-400">{safeHF.totalAcumuladoGD ?? 0} °D</strong>
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleOpenNewFen()}
                    className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Otra Etapa</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {ETAPAS_GDD_KIWI.map((etapa) => {
                const isCurrent = etapa.id === estimacionKiwi.etapaActual.id;
                const completed = (safeHF.totalAcumuladoGD ?? 0) >= etapa.gddMax;
                const recordedMatch = fenologia.find(
                  (f) =>
                    f.escalaBBCH.toLowerCase() === etapa.bbch.toLowerCase() ||
                    (f.nombreEtapa || '').toLowerCase() === etapa.nombre.toLowerCase()
                );
                return (
                  <div
                    key={etapa.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                      isCurrent
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-300'
                        : completed
                        ? 'bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-800 opacity-90'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                          {etapa.bbch}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          {etapa.gddMin}–{etapa.gddMax} °D
                        </span>
                      </div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-xs pt-0.5">{etapa.nombre}</div>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-snug">{etapa.descripcion}</p>
                      {recordedMatch && (
                        <div className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                          {recordedMatch.fecha}
                          {recordedMatch.fechaFin ? ` → ${recordedMatch.fechaFin}` : ''}
                        </div>
                      )}
                      {isCurrent && (
                        <div className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 pt-0.5">
                          ● Etapa estimada actual
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          if (recordedMatch) {
                            handleOpenEditFen(recordedMatch);
                          } else {
                            handleOpenNewFen({
                              escalaBBCH: etapa.bbch,
                              nombreEtapa: etapa.nombre,
                              estadoDescripcion: etapa.descripcion,
                            });
                          }
                        }}
                        className="w-full py-1 px-2 bg-white dark:bg-stone-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-stone-200 dark:border-stone-800 hover:border-emerald-300 rounded-lg text-[10px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>{recordedMatch ? 'Editar Fechas / Estado' : 'Registrar Fechas'}</span>
                      </button>
                    )}
                  </div>
                );
              })}

              {fenologia
                .filter(
                  (f) =>
                    !ETAPAS_GDD_KIWI.some(
                      (e) =>
                        f.escalaBBCH.toLowerCase() === e.bbch.toLowerCase() ||
                        (f.nombreEtapa || '').toLowerCase() === e.nombre.toLowerCase()
                    )
                )
                .map((extra) => (
                  <div
                    key={extra.id}
                    className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/40 flex flex-col justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200">
                          {extra.escalaBBCH}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Adicional</span>
                      </div>
                      <div className="font-bold text-stone-900 dark:text-stone-100 text-xs pt-0.5">
                        {extra.nombreEtapa || extra.estadoDescripcion}
                      </div>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-snug line-clamp-2">
                        {extra.estadoDescripcion}
                      </p>
                      <div className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                        {extra.fecha}
                        {extra.fechaFin ? ` → ${extra.fechaFin}` : ''}
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditFen(extra)}
                        className="w-full py-1 px-2 bg-white dark:bg-stone-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-stone-200 dark:border-stone-800 hover:border-emerald-300 rounded-lg text-[10px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar Fechas / Estado</span>
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Información Técnica de Hayward y Machos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">Kiwi Hayward (Femenino)</h3>
              <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                Exigente en frío: 800 - 1.000 HF (22 May – 31 Ago) y ~1.850 °D base 10°C (1 Jul – 30 Abr) para alcanzar ≥ 6.2° Brix.
              </p>
              <div className="text-emerald-800 dark:text-emerald-300 font-bold text-[11px] pt-1 border-t border-stone-100 dark:border-stone-800">
                Meta predial: {safeHF.metaVariedadHF} HF / {safeHF.metaVariedadGD ?? 1850} °D
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">Polinizador Tomuri (Macho)</h3>
              <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                Florece tardíamente con floración prolongada. Requiere ~750-800 HF y ~520-580 °D para coincidir con Hayward.
              </p>
              <div className="text-blue-800 dark:text-blue-300 font-bold text-[11px] pt-1 border-t border-stone-100 dark:border-stone-800">
                10% plantas prediales
              </div>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">Polinizador Chieftain (Macho)</h3>
              <p className="text-stone-500 dark:text-stone-400 text-[11px]">
                Floración precoz y abundante polen fértil. Requiere ~700-750 HF y ~480-520 °D desde julio.
              </p>
              <div className="text-purple-800 dark:text-purple-300 font-bold text-[11px] pt-1 border-t border-stone-100 dark:border-stone-800">
                5% plantas prediales
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PESTAÑA 2: Fenología Editables con Fechas y Planilla Kiwi */}
      {subTab === 'fenologia' && (
        <div className="space-y-4">
          {/* Encabezado y Acciones */}
          <div className="bg-white dark:bg-stone-900 p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
              <div>
                <h2 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                  Estados Fenológicos de Plantas &amp; Fechas por Cuartel
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Edita el estado actual de cada cuartel, carga la planilla estacional preformada o programa etapas personalizadas con fecha de inicio y término.
                </p>
              </div>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmResetFenMode(confirmResetFenMode === 'template' ? 'none' : 'template')}
                    className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Cargar Planilla Kiwi (10 etapas)</span>
                  </button>
                  {fenologia.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setConfirmResetFenMode(confirmResetFenMode === 'clear' ? 'none' : 'clear')}
                      className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-stone-700 dark:text-stone-300 hover:text-rose-800 dark:hover:text-rose-300 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reiniciar Estados</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenNewFen()}
                    className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Registrar Etapa &amp; Fecha</span>
                  </button>
                </div>
              )}
            </div>

            {/* Confirmación Inline para Cargar Planilla o Reiniciar */}
            {confirmResetFenMode !== 'none' && (
              <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                confirmResetFenMode === 'clear'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-100'
              }`}>
                <div>
                  {confirmResetFenMode === 'template' ? (
                    <span>
                      <strong>¿Cargar planilla fenológica Kiwi Hayward (10 etapas con fechas de temporada)?</strong>{' '}
                      Se aplicará para{' '}
                      <strong>
                        {fenParcelaFiltro !== 'todos'
                          ? (parcelas.find((p) => p.id === fenParcelaFiltro)?.nombre || 'Huerto General')
                          : 'Huerto General'}
                      </strong>{' '}
                      reemplazando la lista actual para iniciar limpio.
                    </span>
                  ) : (
                    <span>
                      <strong>¿Vaciar todos los registros fenológicos ({fenologia.length})?</strong> Podrás volver a cargar la planilla o crear tus etapas desde cero.
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={confirmResetFenMode === 'template' ? handleLoadPreformedFenologia : handleClearAllFenologia}
                    className={`px-3 py-1.5 rounded-lg font-bold text-white cursor-pointer ${
                      confirmResetFenMode === 'clear' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-amber-800 hover:bg-amber-900'
                    }`}
                  >
                    {confirmResetFenMode === 'template' ? 'Sí, Cargar Planilla' : 'Sí, Reiniciar Todo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetFenMode('none')}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
              <select
                value={fenParcelaFiltro}
                onChange={(e) => setFenParcelaFiltro(e.target.value)}
                className="p-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-800 dark:text-stone-200"
              >
                <option value="todos">Todos los cuarteles ({fenologia.length})</option>
                <option value="general">Huerto General</option>
                {parcelas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>

              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'todos', label: 'Todos' },
                    { id: 'en_curso', label: 'En curso' },
                    { id: 'programado', label: 'Programado' },
                    { id: 'completado', label: 'Completado' },
                  ] as const
                ).map((est) => (
                  <button
                    key={est.id}
                    type="button"
                    onClick={() => setFenEstadoFiltro(est.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                      fenEstadoFiltro === est.id
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {est.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Catálogo de Estados Fenológicos Personalizados + Botón Agregar Nuevos */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Catálogo de Estados Fenológicos ({catalogoEstados.length} disponibles · {estadosFenologicosPersonalizados.length} personalizados)
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Puedes agregar todos los estados fenológicos adicionales que necesites y usarlos luego en cualquier cuartel o cronograma.
                </p>
              </div>
              {canEdit && onAddEstadoFenologicoCustom && (
                <button
                  type="button"
                  onClick={() => setIsCatalogoFormOpen((v) => !v)}
                  className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCatalogoFormOpen ? 'Cerrar Formulario' : 'Agregar Nuevo Estado al Catálogo'}</span>
                </button>
              )}
            </div>

            {isCatalogoFormOpen && canEdit && onAddEstadoFenologicoCustom && (
              <form
                onSubmit={handleCreateCustomCatalogoItem}
                className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs items-end"
              >
                <div className="sm:col-span-3">
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Código / Sigla:</label>
                  <input
                    type="text"
                    value={nuevoCatCode}
                    onChange={(e) => setNuevoCatCode(e.target.value)}
                    placeholder="Ej. BBCH 07 o Lloro"
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nombre del Estado Fenológico:</label>
                  <input
                    type="text"
                    value={nuevoCatNombre}
                    onChange={(e) => setNuevoCatNombre(e.target.value)}
                    placeholder="Ej. Yema algodonosa / Botón rosado"
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-semibold dark:text-stone-100"
                    required
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Descripción (opcional):</label>
                  <input
                    type="text"
                    value={nuevoCatDesc}
                    onChange={(e) => setNuevoCatDesc(e.target.value)}
                    placeholder="Detalle técnico..."
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                  />
                </div>
                <div className="sm:col-span-2 flex gap-1.5">
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}

            {estadosFenologicosPersonalizados.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {estadosFenologicosPersonalizados.map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-[11px]"
                  >
                    <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200">{item.code}</span>
                    <span className="text-stone-800 dark:text-stone-200 font-semibold">{item.nombre}</span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenNewFen({
                            escalaBBCH: item.code,
                            nombreEtapa: item.nombre,
                            estadoDescripcion: item.descripcion || item.nombre,
                          })
                        }
                        className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-100 font-bold underline text-[10px] cursor-pointer ml-1"
                        title="Registrar etapa con fechas usando este estado"
                      >
                        + Fecha
                      </button>
                    )}
                    {canEdit && onDeleteEstadoFenologicoCustom && (
                      <button
                        type="button"
                        onClick={() => onDeleteEstadoFenologicoCustom(item.id)}
                        className="text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer"
                        title="Quitar estado personalizado del catálogo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editor Directo del Estado Fenológico Actual por Cuartel */}
          {parcelas.length > 0 && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Sprout className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  Estado Fenológico Actual por Cuartel (Edición Directa)
                </h3>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">{parcelas.length} cuarteles</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {parcelas.map((p) => {
                  const isEditing = editingCuartelEstadoId === p.id;
                  const draftEnCatalogo = catalogoEstados.some(
                    (c) =>
                      formatEstadoFenologicoLabel(c.code, c.nombre).toLowerCase() ===
                        cuartelEstadoDraft.trim().toLowerCase() ||
                      c.nombre.toLowerCase() === cuartelEstadoDraft.trim().toLowerCase()
                  );
                  return (
                    <div key={p.id} className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-emerald-800 dark:text-emerald-300">{p.codigoCuartel}</span>
                          <div className="font-bold text-stone-900 dark:text-stone-100">{p.nombre}</div>
                        </div>
                        {canEdit && onUpdateParcela && !isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCuartelEstadoId(p.id);
                              setCuartelEstadoDraft(p.estadoFenologico || '');
                              setCuartelFechaDraft(p.fechaEstadoFenologico || todayISO());
                            }}
                            className="px-2 py-1 bg-white dark:bg-stone-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:text-emerald-900 dark:hover:text-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <select
                            value={
                              catalogoEstados.some(
                                (s) => formatEstadoFenologicoLabel(s.code, s.nombre) === cuartelEstadoDraft
                              )
                                ? cuartelEstadoDraft
                                : ''
                            }
                            onChange={(e) => {
                              if (e.target.value) setCuartelEstadoDraft(e.target.value);
                            }}
                            className="w-full p-1.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs text-stone-700 dark:text-stone-300"
                          >
                            <option value="">Seleccionar de la lista o escribir abajo...</option>
                            {catalogoEstados.map((s) => {
                              const label = formatEstadoFenologicoLabel(s.code, s.nombre);
                              return (
                                <option key={s.id} value={label}>
                                  {label}
                                </option>
                              );
                            })}
                          </select>
                          <input
                            type="text"
                            list="bbch-nombres-list"
                            value={cuartelEstadoDraft}
                            onChange={(e) => setCuartelEstadoDraft(e.target.value)}
                            placeholder="O escribe cualquier estado fenológico nuevo..."
                            className="w-full p-1.5 bg-white dark:bg-stone-800 border border-emerald-400 dark:border-emerald-600 rounded-lg text-xs font-semibold dark:text-stone-100"
                          />
                          {onAddEstadoFenologicoCustom && cuartelEstadoDraft.trim() && !draftEnCatalogo && (
                            <button
                              type="button"
                              onClick={() => {
                                const parsed = parseEstadoFenologicoTexto(cuartelEstadoDraft);
                                guardarEstadoCatalogoSiNoExiste(parsed.code, parsed.nombre);
                              }}
                              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              + Guardar &quot;{cuartelEstadoDraft.trim()}&quot; en el catálogo
                            </button>
                          )}
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 shrink-0">Fecha:</label>
                            <input
                              type="date"
                              value={cuartelFechaDraft}
                              onChange={(e) => setCuartelFechaDraft(e.target.value)}
                              className="flex-1 p-1 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-mono dark:text-stone-100"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCuartelEstadoId(null)}
                              className="px-2.5 py-1 border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 rounded-lg text-[11px] text-stone-600 dark:text-stone-400 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGuardarEstadoCuartel(p)}
                              className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Save className="w-3 h-3" />
                              <span>Guardar</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 bg-white dark:bg-stone-900 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
                          <span className="truncate">{p.estadoFenologico || 'Sin estado asignado'}</span>
                          {p.fechaEstadoFenologico && (
                            <span className="font-mono tabular-nums text-[10px] text-stone-500 dark:text-stone-400 shrink-0">
                              {p.fechaEstadoFenologico}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <datalist id="bbch-nombres-list">
                {catalogoEstados.map((s) => (
                  <option key={s.id} value={formatEstadoFenologicoLabel(s.code, s.nombre)} />
                ))}
              </datalist>
            </div>
          )}

          {/* Lista Cronológica de Etapas Fenológicas */}
          {fenologiaFiltradaOrdenada.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center text-stone-500 dark:text-stone-400 text-xs space-y-3">
              <p>
                {fenologia.length === 0
                  ? 'No hay etapas fenológicas registradas. Puedes cargar la planilla estándar de 10 etapas del kiwi o agregar una etapa manual.'
                  : 'No hay etapas que coincidan con el filtro seleccionado.'}
              </p>
              {canEdit && fenologia.length === 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadPreformedFenologia}
                    className="px-3.5 py-2 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-950 dark:text-amber-100 rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Cargar Planilla Kiwi Preformada</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNewFen()}
                    className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Etapa Desde Cero</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fenologiaFiltradaOrdenada.map((f) => {
                const delKey = `fen-${f.id}`;
                const est = resolveEstadoEtapa(f);
                const estadoLabel =
                  est === 'completado' ? 'Completado' : est === 'en_curso' ? 'En curso' : 'Programado';
                const estadoStyle =
                  est === 'completado'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/80'
                    : est === 'en_curso'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/80'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800';

                return (
                  <div key={f.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-2xs space-y-2.5 text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-mono font-bold text-[10px]">
                            {f.escalaBBCH}
                          </span>
                          <button
                            type="button"
                            disabled={!canEdit || !onUpdateFenologia}
                            onClick={() => handleToggleEstadoEtapa(f)}
                            title={canEdit ? 'Clic para cambiar estado (Programado → En curso → Completado)' : undefined}
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${estadoStyle} ${canEdit && onUpdateFenologia ? 'cursor-pointer hover:opacity-85' : ''}`}
                          >
                            {estadoLabel}
                          </button>
                        </div>
                        <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                          {f.nombreEtapa || f.estadoDescripcion}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                          <span className="font-semibold text-stone-700 dark:text-stone-300">{f.parcelaNombre}</span>
                          <span>·</span>
                          <span className="font-mono tabular-nums text-stone-700 dark:text-stone-300">
                            {f.fecha}
                            {f.fechaFin && f.fechaFin !== f.fecha ? ` → ${f.fechaFin}` : ''}
                          </span>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditFen(f)}
                            className="px-2 py-1 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="Editar etapa y fechas"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                          {confirmDeleteKey === delKey ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-lg px-1.5 py-0.5">
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
                                className="px-1.5 py-0.5 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-semibold text-[10px] cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteKey(delKey)}
                              className="p-1.5 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer"
                              title="Eliminar etapa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {f.nombreEtapa && f.estadoDescripcion && f.estadoDescripcion !== f.nombreEtapa && (
                      <p className="text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
                        {f.estadoDescripcion}
                      </p>
                    )}

                    <div className="space-y-1 pt-1 border-t border-stone-100 dark:border-stone-800">
                      <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400">
                        <span>Avance de etapa:</span>
                        <span className="font-mono tabular-nums font-bold text-emerald-800 dark:text-emerald-300">{f.porcentajeAvance}%</span>
                      </div>
                      <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            est === 'completado' ? 'bg-emerald-600' : est === 'en_curso' ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-700'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, f.porcentajeAvance))}%` }}
                        />
                      </div>
                    </div>

                    {f.observaciones && (
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 italic bg-stone-50 dark:bg-stone-800/70 p-2 rounded-lg">
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
            <div>
              <h2 className="font-bold text-sm text-stone-900 dark:text-stone-100">Control de Polinización Mixta (Apis + Bombus)</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
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
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8 text-center text-stone-500 dark:text-stone-400 text-xs">
              No hay registros generales de colmenas aún. Haz clic en &quot;Nuevo Registro Colmenas&quot; para agregar uno.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {polinizacion.map((p) => {
                const delKey = `pol-${p.id}`;
                const apisHa = totalHa > 0 ? (p.colmenasApisInstaladas / totalHa).toFixed(1) : null;
                const bombusHa = totalHa > 0 ? (p.colmenasBombusInstaladas / totalHa).toFixed(1) : null;

                return (
                  <div key={p.id} className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-3 text-xs">
                    <div className="flex justify-between items-start gap-2 border-b border-stone-100 dark:border-stone-800 pb-2">
                      <div>
                        <span className="font-mono text-stone-400 text-[10px]">{p.fecha}</span>
                        <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm mt-0.5">Polinización Mixta del Huerto</h3>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPol(p)}
                            className="p-1.5 text-stone-500 dark:text-stone-400 hover:text-amber-800 dark:hover:text-amber-300 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/60 cursor-pointer"
                            title="Editar registro de colmenas"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteKey === delKey ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-lg px-1.5 py-0.5">
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
                                className="px-1.5 py-0.5 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-semibold text-[10px] cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteKey(delKey)}
                              className="p-1.5 text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 cursor-pointer"
                              title="Eliminar registro de colmenas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/80">
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase">Colmenas Apis mellifera</div>
                        <div className="font-black text-amber-950 dark:text-amber-100 text-base mt-0.5">{p.colmenasApisInstaladas} colmenas</div>
                        <div className="text-[10px] text-amber-800 dark:text-amber-300">
                          {apisHa !== null ? `${apisHa} colmenas/ha en ${totalHa.toFixed(1)} ha` : 'Meta: 8-10 colmenas/ha'}
                        </div>
                      </div>

                      <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/80">
                        <div className="text-[10px] text-purple-700 dark:text-purple-400 font-bold uppercase">Colmenas Bombus terrestris</div>
                        <div className="font-black text-purple-950 dark:text-purple-100 text-base mt-0.5">{p.colmenasBombusInstaladas} colmenas</div>
                        <div className="text-[10px] text-purple-800 dark:text-purple-300">
                          {bombusHa !== null ? `${bombusHa} colonias/ha` : 'Meta: 1-3 colonias/ha'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/70 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                      <div className="flex justify-between">
                        <span>Actividad de vuelo en parrón:</span>
                        <strong className="text-emerald-800 dark:text-emerald-300">{p.actividadAbejasCalificacion}</strong>
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
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 italic bg-stone-50 dark:bg-stone-800/70 p-2 rounded-lg border border-stone-100 dark:border-stone-800">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Editar Horas Frío, Grados Día y Ventanas de Temporada</h3>
              <button type="button" onClick={() => setIsEditHFOpen(false)} className="text-stone-300 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveHF} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hfForm.sincronizarDesdeRegistros}
                  onChange={(e) => setHfForm({ ...hfForm, sincronizarDesdeRegistros: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-emerald-700"
                />
                <div>
                  <div className="font-bold text-emerald-950 dark:text-emerald-100">
                    Calcular totales automáticamente desde los registros diarios/semanales/mensuales
                  </div>
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    Si está desactivado, puedes ingresar manualmente el total acumulado global abajo en cualquier momento.
                  </div>
                </div>
              </label>

              {/* Bloque Horas Frío */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 space-y-3">
                <div className="font-extrabold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                  <Snowflake className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>Horas Frío (&lt; 7.2°C) · Ventana 22 May – 31 Ago</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Acumulado HF:</label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={hfForm.sincronizarDesdeRegistros}
                      value={hfForm.totalAcumuladoHF}
                      onChange={(e) => setHfForm({ ...hfForm, totalAcumuladoHF: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-bold text-blue-900 dark:text-blue-200 disabled:bg-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Meta Hayward:</label>
                    <input
                      type="number"
                      value={hfForm.metaVariedadHF}
                      onChange={(e) => setHfForm({ ...hfForm, metaVariedadHF: parseInt(e.target.value) || 850 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Inicio Frío:</label>
                    <input
                      type="date"
                      value={hfForm.fechaInicioHF}
                      onChange={(e) => setHfForm({ ...hfForm, fechaInicioHF: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Término Frío:</label>
                    <input
                      type="date"
                      value={hfForm.fechaFinHF}
                      onChange={(e) => setHfForm({ ...hfForm, fechaFinHF: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Modelo de Frío:</label>
                    <select
                      value={hfForm.modeloCalculo}
                      onChange={(e) => setHfForm({ ...hfForm, modeloCalculo: e.target.value as CondicionHorasFrio['modeloCalculo'] })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                    >
                      <option value="Weinberger (< 7.2°C)">Weinberger (&lt; 7.2°C)</option>
                      <option value="Utah">Modelo Utah</option>
                      <option value="Dinámico">Modelo Dinámico (Porciones)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Estado Dormancia:</label>
                    <select
                      value={hfForm.estadoDormancia}
                      onChange={(e) => setHfForm({ ...hfForm, estadoDormancia: e.target.value as CondicionHorasFrio['estadoDormancia'] })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
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
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-3">
                <div className="font-extrabold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>Grados Día (GDD °D) · Ventana 1 Jul – 30 Abr</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Acumulado °D:</label>
                    <input
                      type="number"
                      step="0.1"
                      disabled={hfForm.sincronizarDesdeRegistros}
                      value={hfForm.totalAcumuladoGD}
                      onChange={(e) => setHfForm({ ...hfForm, totalAcumuladoGD: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-bold text-amber-900 dark:text-amber-200 disabled:bg-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Meta Madurez (°D):</label>
                    <input
                      type="number"
                      value={hfForm.metaVariedadGD}
                      onChange={(e) => setHfForm({ ...hfForm, metaVariedadGD: parseInt(e.target.value) || 1850 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Inicio °D:</label>
                    <input
                      type="date"
                      value={hfForm.fechaInicioGD}
                      onChange={(e) => setHfForm({ ...hfForm, fechaInicioGD: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Término °D:</label>
                    <input
                      type="date"
                      value={hfForm.fechaFinGD}
                      onChange={(e) => setHfForm({ ...hfForm, fechaFinGD: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">T° Base (°C):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={hfForm.tempBaseGddC}
                      onChange={(e) => setHfForm({ ...hfForm, tempBaseGddC: parseFloat(e.target.value) || 10 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">T° Techo (°C):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={hfForm.tempTechoGddC}
                      onChange={(e) => setHfForm({ ...hfForm, tempTechoGddC: parseFloat(e.target.value) || 30 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha Corte:</label>
                    <input
                      type="date"
                      value={hfForm.fechaCorte}
                      onChange={(e) => setHfForm({ ...hfForm, fechaCorte: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Diagnóstico / Recomendación Técnica:</label>
                <textarea
                  value={hfForm.recomendacionRompedor}
                  onChange={(e) => setHfForm({ ...hfForm, recomendacionRompedor: e.target.value })}
                  rows={3}
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs dark:text-stone-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsEditHFOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/70 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingRegId ? 'Editar Medición de Horas Frío & Grados Día' : 'Ingresar Medición de Horas Frío & Grados Día'}
              </h3>
              <button type="button" onClick={() => setIsRegTermicoOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveRegTermico} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Selector Periodicidad */}
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Frecuencia del Registro:</label>
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
                          : 'bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">
                    {regForm.periodicidad === 'diario' ? 'Fecha:' : 'Fecha Inicio:'}
                  </label>
                  <input
                    type="date"
                    value={regForm.fechaInicio}
                    onChange={(e) => handleChangeRegFechas(e.target.value, regForm.fechaFin)}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    required
                  />
                </div>
                {regForm.periodicidad !== 'diario' && (
                  <div>
                    <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha Término:</label>
                    <input
                      type="date"
                      value={regForm.fechaFin}
                      onChange={(e) => handleChangeRegFechas(regForm.fechaInicio, e.target.value)}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Días del Período:</label>
                  <input
                    type="number"
                    min="1"
                    value={regForm.diasPeriodo}
                    onChange={(e) => setRegForm({ ...regForm, diasPeriodo: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Etiqueta (opcional):</label>
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
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fuente del Dato:</label>
                  <select
                    value={regForm.fuenteDato}
                    onChange={(e) => setRegForm({ ...regForm, fuenteDato: e.target.value as RegistroTermicoHuerto['fuenteDato'] })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                  >
                    <option value="Estación Predial">Estación Predial</option>
                    <option value="Open-Meteo">Open-Meteo</option>
                    <option value="Manual">Ingreso Manual</option>
                  </select>
                </div>
              </div>

              {/* Bloque auxiliar de temperaturas para calcular °D */}
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-stone-800 dark:text-stone-200">Temperaturas &amp; Cálculo Asistido de Grados Día</span>
                  <div className="flex items-center gap-1.5">
                    {clima && (
                      <button
                        type="button"
                        onClick={handleTraerDeEstacionClima}
                        className="px-2 py-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <CloudSun className="w-3 h-3" />
                        <span>Usar Clima Hoy</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRecalcularGddEnModal}
                      className="px-2 py-1 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Calcular °D
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">T° Mínima (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={regForm.tempMinC}
                      onChange={(e) => setRegForm({ ...regForm, tempMinC: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">T° Máxima (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={regForm.tempMaxC}
                      onChange={(e) => setRegForm({ ...regForm, tempMaxC: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">T° Base (°C):</label>
                    <input
                      type="number"
                      step="0.5"
                      value={regForm.tempBaseGddC}
                      onChange={(e) => setRegForm({ ...regForm, tempBaseGddC: parseFloat(e.target.value) || 10 })}
                      className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    />
                  </div>
                </div>
              </div>

              {/* Valores finales editables de HF y GDD */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80">
                  <label className="block font-bold text-blue-950 dark:text-blue-100 mb-1">Horas Frío del Período (&lt;7.2°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={regForm.horasFrioPeriodo}
                    onChange={(e) => setRegForm({ ...regForm, horasFrioPeriodo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-blue-300 dark:border-blue-700 rounded-lg font-mono font-black text-blue-900 dark:text-blue-200 text-sm"
                    required
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80">
                  <label className="block font-bold text-amber-950 dark:text-amber-100 mb-1">Grados Día del Período (°D):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={regForm.gradosDiaPeriodo}
                    onChange={(e) => setRegForm({ ...regForm, gradosDiaPeriodo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-700 rounded-lg font-mono font-black text-amber-900 dark:text-amber-200 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Observaciones:</label>
                <textarea
                  value={regForm.observaciones}
                  onChange={(e) => setRegForm({ ...regForm, observaciones: e.target.value })}
                  rows={2}
                  placeholder="Ej. Helada matinal en sector bajo, brotación observada en yemas apicales..."
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs dark:text-stone-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsRegTermicoOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/70 cursor-pointer"
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

      {/* MODAL 3: CREAR / EDITAR REGISTRO FENOLÓGICO BBCH CON FECHAS */}
      {isNewFenologiaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingFenId ? 'Editar Etapa Fenológica & Fechas' : 'Registrar Etapa Fenológica & Fechas'}
              </h3>
              <button type="button" onClick={() => setIsNewFenologiaOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveFenologia} className="p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha Inicio:</label>
                  <input
                    type="date"
                    value={fenForm.fecha}
                    onChange={(e) => setFenForm({ ...fenForm, fecha: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha Término / Est.:</label>
                  <input
                    type="date"
                    value={fenForm.fechaFin}
                    onChange={(e) => setFenForm({ ...fenForm, fechaFin: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Cuartel:</label>
                  <select
                    value={fenForm.parcelaId}
                    onChange={(e) => setFenForm({ ...fenForm, parcelaId: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-semibold dark:text-stone-100"
                  >
                    <option value="general">Huerto General</option>
                    {parcelas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Código / Escala BBCH o Personalizado:</label>
                  <input
                    type="text"
                    list="bbch-sugerencias-modal"
                    value={fenForm.escalaBBCH}
                    onChange={(e) => {
                      const val = e.target.value;
                      const match = catalogoEstados.find((s) => s.code.toLowerCase() === val.trim().toLowerCase());
                      setFenForm((prev) => ({
                        ...prev,
                        escalaBBCH: val,
                        nombreEtapa: match ? match.nombre : prev.nombreEtapa,
                        estadoDescripcion: match?.descripcion || prev.estadoDescripcion,
                      }));
                    }}
                    placeholder="Ej. BBCH 65 o Etapa personalizada"
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono font-bold dark:text-stone-100"
                    required
                  />
                  <datalist id="bbch-sugerencias-modal">
                    {catalogoEstados.map((s) => (
                      <option key={s.id} value={s.code}>{s.nombre}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nombre de la Etapa:</label>
                  <input
                    type="text"
                    value={fenForm.nombreEtapa}
                    onChange={(e) => setFenForm({ ...fenForm, nombreEtapa: e.target.value })}
                    placeholder="Ej. Plena floración, Lloro de savia, Pinta..."
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-semibold dark:text-stone-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Estado de la Etapa:</label>
                  <select
                    value={fenForm.estadoEtapa}
                    onChange={(e) => {
                      const next = e.target.value as 'programado' | 'en_curso' | 'completado';
                      setFenForm((prev) => ({
                        ...prev,
                        estadoEtapa: next,
                        porcentajeAvance: next === 'completado' ? 100 : next === 'programado' ? 0 : (prev.porcentajeAvance || 50),
                      }));
                    }}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-semibold dark:text-stone-100"
                  >
                    <option value="programado">Programado</option>
                    <option value="en_curso">En curso</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">% de Avance:</label>
                  <input
                    type="number"
                    value={fenForm.porcentajeAvance}
                    onChange={(e) => setFenForm({ ...fenForm, porcentajeAvance: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-mono dark:text-stone-100"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Descripción / Manejo Técnico:</label>
                <textarea
                  value={fenForm.estadoDescripcion}
                  onChange={(e) => setFenForm({ ...fenForm, estadoDescripcion: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs dark:text-stone-100"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Observaciones:</label>
                <textarea
                  value={fenForm.observaciones}
                  onChange={(e) => setFenForm({ ...fenForm, observaciones: e.target.value })}
                  rows={2}
                  placeholder="Notas de campo, homogeneidad de brotación, riego o poda..."
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs dark:text-stone-100"
                />
              </div>

              {onAddEstadoFenologicoCustom && (
                <label className="flex items-center gap-2 p-2.5 bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800 rounded-xl text-[11px] font-semibold text-stone-800 dark:text-stone-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fenForm.guardarEnCatalogo}
                    onChange={(e) => setFenForm({ ...fenForm, guardarEnCatalogo: e.target.checked })}
                    className="w-4 h-4 text-emerald-700 dark:text-emerald-400 rounded cursor-pointer bg-white dark:bg-stone-800"
                  />
                  <span>Guardar este estado en el catálogo para reutilizarlo en otros cuarteles</span>
                </label>
              )}

              {fenForm.parcelaId !== 'general' && onUpdateParcela && (
                <label className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-[11px] font-semibold text-emerald-950 dark:text-emerald-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fenForm.sincronizarCuartel}
                    onChange={(e) => setFenForm({ ...fenForm, sincronizarCuartel: e.target.checked })}
                    className="w-4 h-4 text-emerald-700 dark:text-emerald-400 rounded cursor-pointer bg-white dark:bg-stone-800"
                  />
                  <span>Actualizar también el estado fenológico actual de este cuartel</span>
                </label>
              )}

              <div className="pt-2 flex flex-wrap justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsNewFenologiaOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/70 cursor-pointer"
                >
                  Cancelar
                </button>
                {!editingFenId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!fenForm.nombreEtapa.trim() && !fenForm.escalaBBCH.trim()) return;
                      persistirFenologia(true);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 font-bold rounded-lg cursor-pointer"
                  >
                    Guardar y Agregar Otro
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  {editingFenId ? 'Actualizar Etapa' : 'Guardar Etapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREAR / EDITAR POLINIZACIÓN & COLMENAS */}
      {isNewPolinizacionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 dark:bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-md border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-amber-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingPolId ? 'Editar Registro de Colmenas y Polinización' : 'Registrar Conteo de Colmenas y Polinización'}
              </h3>
              <button type="button" onClick={() => setIsNewPolinizacionOpen(false)} className="text-amber-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSavePolinizacion} className="p-5 space-y-3 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha de Evaluación:</label>
                <input
                  type="date"
                  value={polForm.fecha}
                  onChange={(e) => setPolForm({ ...polForm, fecha: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Colmenas Apis:</label>
                  <input
                    type="number"
                    min="0"
                    value={polForm.colmenasApisInstaladas}
                    onChange={(e) => setPolForm({ ...polForm, colmenasApisInstaladas: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-bold dark:text-stone-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Colmenas Bombus:</label>
                  <input
                    type="number"
                    min="0"
                    value={polForm.colmenasBombusInstaladas}
                    onChange={(e) => setPolForm({ ...polForm, colmenasBombusInstaladas: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg font-bold dark:text-stone-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">% Floración Femenina:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={polForm.porcentajeFloracionFemenina}
                    onChange={(e) => setPolForm({ ...polForm, porcentajeFloracionFemenina: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">% Floración Masculina:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={polForm.porcentajeFloracionMasculina}
                    onChange={(e) => setPolForm({ ...polForm, porcentajeFloracionMasculina: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Calificación de Vuelo de Abejas:</label>
                <select
                  value={polForm.actividadAbejasCalificacion}
                  onChange={(e) => setPolForm({ ...polForm, actividadAbejasCalificacion: e.target.value as RegistroPolinizacion['actividadAbejasCalificacion'] })}
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                >
                  <option value="Óptima (> 25 abejas/m²)">Óptima (&gt; 25 abejas/m²)</option>
                  <option value="Media (10-25 abejas/m²)">Media (10-25 abejas/m²)</option>
                  <option value="Baja (< 10 abejas/m²)">Baja (&lt; 10 abejas/m²)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Temperatura Media (°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={polForm.temperaturaMediaC}
                    onChange={(e) => setPolForm({ ...polForm, temperaturaMediaC: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Humedad Relativa (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={polForm.humedadRelativa}
                    onChange={(e) => setPolForm({ ...polForm, humedadRelativa: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg dark:text-stone-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Observaciones:</label>
                <textarea
                  value={polForm.observaciones}
                  onChange={(e) => setPolForm({ ...polForm, observaciones: e.target.value })}
                  rows={2}
                  placeholder="Ej. Ubicación de colmenas, horario de pecoreo, uniformidad..."
                  className="w-full p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-xs dark:text-stone-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsNewPolinizacionOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/70 cursor-pointer"
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
