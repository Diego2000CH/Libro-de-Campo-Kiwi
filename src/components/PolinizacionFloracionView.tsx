import React, { useState, useEffect, useMemo } from 'react';
import { 
  Parcela, 
  MuestreoBrotacion, 
  ConteoBotonesFlorales, 
  SincroniaFloral, 
  AplicacionPolenAsistido,
  PlanCargaRaleo,
  EvaluacionCuajaSemillas
} from '../types/campo';
import { CargaObjetivoRaleoPanel } from './CargaObjetivoRaleoPanel';
import { CuajaSemillasPanel } from './CuajaSemillasPanel';
import { 
  Flower2, 
  Sprout, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Pencil,
  Calendar, 
  Scale, 
  Sparkles, 
  Clock,
  Bug,
  Layers,
  Filter,
  List,
  AlertTriangle,
  CheckCircle2,
  Scissors,
  CircleDot,
  X
} from 'lucide-react';

interface PolinizacionFloracionViewProps {
  initialTab?: 'brotacion' | 'botones' | 'sincronia' | 'colmenas' | 'polen' | 'carga_raleo' | 'cuaja_semillas';
  parcelas: Parcela[];
  muestreosBrotacion: MuestreoBrotacion[];
  onAddMuestreoBrotacion: (m: MuestreoBrotacion) => void;
  onUpdateMuestreoBrotacion?: (m: MuestreoBrotacion) => void;
  onDeleteMuestreoBrotacion: (id: string) => void;
  conteosBotones: ConteoBotonesFlorales[];
  onAddConteoBotones: (c: ConteoBotonesFlorales) => void;
  onUpdateConteoBotones?: (c: ConteoBotonesFlorales) => void;
  onDeleteConteoBotones: (id: string) => void;
  sincroniasFlorales: SincroniaFloral[];
  onAddSincroniaFloral: (s: SincroniaFloral) => void;
  onUpdateSincroniaFloral?: (s: SincroniaFloral) => void;
  onDeleteSincroniaFloral: (id: string) => void;
  aplicacionesPolen: AplicacionPolenAsistido[];
  onAddAplicacionPolen: (a: AplicacionPolenAsistido) => void;
  onUpdateAplicacionPolen?: (a: AplicacionPolenAsistido) => void;
  onDeleteAplicacionPolen: (id: string) => void;
  planesCargaRaleo: PlanCargaRaleo[];
  onAddPlanCargaRaleo: (p: PlanCargaRaleo) => void;
  onUpdatePlanCargaRaleo: (p: PlanCargaRaleo) => void;
  onDeletePlanCargaRaleo: (id: string) => void;
  evaluacionesCuajaSemillas: EvaluacionCuajaSemillas[];
  onAddEvaluacionCuajaSemillas: (e: EvaluacionCuajaSemillas) => void;
  onUpdateEvaluacionCuajaSemillas: (e: EvaluacionCuajaSemillas) => void;
  onDeleteEvaluacionCuajaSemillas: (id: string) => void;
  activeUserName?: string;
  canEdit?: boolean;
}

const calcularCalificacionAbejas = (
  abejasM2: number
): SincroniaFloral['actividadPolinizadores'] => {
  if (abejasM2 > 25) return 'Óptima (> 25 abejas/m²)';
  if (abejasM2 >= 10) return 'Media (10-25 abejas/m²)';
  return 'Baja (< 10 abejas/m²)';
};

export const PolinizacionFloracionView: React.FC<PolinizacionFloracionViewProps> = ({
  initialTab = 'brotacion',
  parcelas,
  muestreosBrotacion,
  onAddMuestreoBrotacion,
  onUpdateMuestreoBrotacion,
  onDeleteMuestreoBrotacion,
  conteosBotones,
  onAddConteoBotones,
  onUpdateConteoBotones,
  onDeleteConteoBotones,
  sincroniasFlorales,
  onAddSincroniaFloral,
  onUpdateSincroniaFloral,
  onDeleteSincroniaFloral,
  aplicacionesPolen,
  onAddAplicacionPolen,
  onUpdateAplicacionPolen,
  onDeleteAplicacionPolen,
  planesCargaRaleo,
  onAddPlanCargaRaleo,
  onUpdatePlanCargaRaleo,
  onDeletePlanCargaRaleo,
  evaluacionesCuajaSemillas,
  onAddEvaluacionCuajaSemillas,
  onUpdateEvaluacionCuajaSemillas,
  onDeleteEvaluacionCuajaSemillas,
  activeUserName = 'Administrador',
  canEdit = true
}) => {
  const [activeTab, setActiveTab] = useState<'brotacion' | 'botones' | 'sincronia' | 'colmenas' | 'polen' | 'carga_raleo' | 'cuaja_semillas'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Modo de visualización: por Hilera o Consolidado por Cuartel
  const [vistaModoBrotacion, setVistaModoBrotacion] = useState<'hilera' | 'cuartel'>('hilera');
  const [vistaModoBotones, setVistaModoBotones] = useState<'hilera' | 'cuartel'>('hilera');

  // Filtro por Cuartel
  const [cuartelFiltro, setCuartelFiltro] = useState<string>('todos');

  // Modales y IDs en edición (null = creando nuevo)
  const [isModalBrotacionOpen, setIsModalBrotacionOpen] = useState(false);
  const [editingBrotacionId, setEditingBrotacionId] = useState<string | null>(null);

  const [isModalBotonesOpen, setIsModalBotonesOpen] = useState(false);
  const [editingBotonesId, setEditingBotonesId] = useState<string | null>(null);

  const [isModalSincroniaOpen, setIsModalSincroniaOpen] = useState(false);
  const [editingSincroniaId, setEditingSincroniaId] = useState<string | null>(null);

  const [isModalPolenOpen, setIsModalPolenOpen] = useState(false);
  const [editingPolenId, setEditingPolenId] = useState<string | null>(null);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);

  const todayISO = () => new Date().toISOString().split('T')[0];

  // Defaults para formularios
  const getDefaultBrotacion = () => ({
    fecha: todayISO(),
    parcelaId: parcelas[0]?.id || 'general',
    hilera: 'Hilera 1',
    plantasMuestreadas: 6,
    variedad: 'Kiwi Hayward',
    cargadoresEvaluados: 12,
    yemasTotales: 330,
    yemasBrotadas: 235,
    brotesConFlor: 175,
    brotesVegetativosCiegos: 60,
    brotacionBasePct: 56,
    brotacionMedioPct: 74,
    brotacionPuntaPct: 82,
    evaluador: activeUserName || 'Administrador',
    observaciones: ''
  });

  const getDefaultBotones = () => ({
    fecha: todayISO(),
    parcelaId: parcelas[0]?.id || 'general',
    hilera: 'Hilera 1',
    plantasMuestreadas: 6,
    brotesEvaluados: 45,
    botonesPorBrotePromedio: 3.5,
    botonesUnicosKing: 105,
    botonesDoblesTriplesMariposas: 40,
    floresDefectuosasPlanas: 10,
    densidadBotonesPorM2: 42,
    estadoRaleoBotones: 'Pendiente' as 'Pendiente' | 'En curso' | 'Finalizado',
    porcentajeAvanceRaleo: 0,
    jornalesPorHaUtilizados: 0,
    evaluador: activeUserName || 'Administrador',
    observaciones: ''
  });

  const getDefaultSincronia = () => ({
    fecha: todayISO(),
    parcelaId: parcelas[0]?.id || 'general',
    porcentajeFloracionHembra: 45,
    porcentajeFloracionMacho: 55,
    estadoSincronia: 'Sincronizado' as SincroniaFloral['estadoSincronia'],
    diasDesfase: 0,
    colmenasApisInstaladas: 40,
    colmenasBombusInstaladas: 10,
    abejasPorM2: 24,
    actividadPolinizadores: 'Media (10-25 abejas/m²)' as SincroniaFloral['actividadPolinizadores'],
    temperaturaAmbienteC: 22.5,
    humedadRelativa: 54,
    observaciones: ''
  });

  const getDefaultPolen = () => ({
    fecha: todayISO(),
    hora: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    parcelasIds: parcelas.length > 0 ? [parcelas[0].id] : [],
    tipoPolen: 'Polen Puro Liofilizado Tomuri' as AplicacionPolenAsistido['tipoPolen'],
    lotePolen: 'POL-2026-T1',
    viabilidadPolenPorcentaje: 88,
    metodoAplicacion: 'Pulverización Líquida en Suspensión' as AplicacionPolenAsistido['metodoAplicacion'],
    dosisGramosPorHa: 350,
    volumenAguaLHa: 200,
    equipoMaquinaria: 'Tractor New Holland TT4.75 + Nebulizador electrostático',
    operador: activeUserName || 'Administrador',
    condicionesClimaticas: 'T° 21.5°C, HR 55%, Viento < 5 km/h (Calma)',
    observaciones: ''
  });

  const [formBrotacion, setFormBrotacion] = useState(getDefaultBrotacion);
  const [formBotones, setFormBotones] = useState(getDefaultBotones);
  const [formSincronia, setFormSincronia] = useState(getDefaultSincronia);
  const [formPolen, setFormPolen] = useState(getDefaultPolen);

  // Abrir modales en modo Crear o Editar
  const handleOpenNewBrotacion = () => {
    setEditingBrotacionId(null);
    setFormBrotacion(getDefaultBrotacion());
    setIsModalBrotacionOpen(true);
  };

  const handleOpenEditBrotacion = (m: MuestreoBrotacion) => {
    setEditingBrotacionId(m.id);
    setFormBrotacion({
      fecha: m.fecha || todayISO(),
      parcelaId: m.parcelaId || parcelas[0]?.id || '',
      hilera: m.hilera || 'Hilera 1',
      plantasMuestreadas: m.plantasMuestreadas ?? 6,
      variedad: m.variedad || 'Kiwi Hayward',
      cargadoresEvaluados: m.cargadoresEvaluados ?? 10,
      yemasTotales: m.yemasTotales ?? 0,
      yemasBrotadas: m.yemasBrotadas ?? 0,
      brotesConFlor: m.brotesConFlor ?? 0,
      brotesVegetativosCiegos: m.brotesVegetativosCiegos ?? 0,
      brotacionBasePct: m.brotacionBasePct ?? 0,
      brotacionMedioPct: m.brotacionMedioPct ?? 0,
      brotacionPuntaPct: m.brotacionPuntaPct ?? 0,
      evaluador: m.evaluador || activeUserName || 'Administrador',
      observaciones: m.observaciones || ''
    });
    setIsModalBrotacionOpen(true);
  };

  const handleOpenNewBotones = () => {
    setEditingBotonesId(null);
    setFormBotones(getDefaultBotones());
    setIsModalBotonesOpen(true);
  };

  const handleOpenEditBotones = (c: ConteoBotonesFlorales) => {
    setEditingBotonesId(c.id);
    setFormBotones({
      fecha: c.fecha || todayISO(),
      parcelaId: c.parcelaId || parcelas[0]?.id || '',
      hilera: c.hilera || 'Hilera 1',
      plantasMuestreadas: c.plantasMuestreadas ?? 6,
      brotesEvaluados: c.brotesEvaluados ?? 40,
      botonesPorBrotePromedio: c.botonesPorBrotePromedio ?? 3.0,
      botonesUnicosKing: c.botonesUnicosKing ?? 0,
      botonesDoblesTriplesMariposas: c.botonesDoblesTriplesMariposas ?? 0,
      floresDefectuosasPlanas: c.floresDefectuosasPlanas ?? 0,
      densidadBotonesPorM2: c.densidadBotonesPorM2 ?? 0,
      estadoRaleoBotones: c.estadoRaleoBotones || 'Pendiente',
      porcentajeAvanceRaleo: c.porcentajeAvanceRaleo ?? 0,
      jornalesPorHaUtilizados: c.jornalesPorHaUtilizados ?? 0,
      evaluador: c.evaluador || activeUserName || 'Administrador',
      observaciones: c.observaciones || ''
    });
    setIsModalBotonesOpen(true);
  };

  const handleOpenNewSincronia = () => {
    setEditingSincroniaId(null);
    setFormSincronia(getDefaultSincronia());
    setIsModalSincroniaOpen(true);
  };

  const handleOpenEditSincronia = (s: SincroniaFloral) => {
    setEditingSincroniaId(s.id);
    setFormSincronia({
      fecha: s.fecha || todayISO(),
      parcelaId: s.parcelaId || parcelas[0]?.id || 'general',
      porcentajeFloracionHembra: s.porcentajeFloracionHembra ?? 0,
      porcentajeFloracionMacho: s.porcentajeFloracionMacho ?? 0,
      estadoSincronia: s.estadoSincronia || 'Sincronizado',
      diasDesfase: s.diasDesfase ?? 0,
      colmenasApisInstaladas: s.colmenasApisInstaladas ?? 0,
      colmenasBombusInstaladas: s.colmenasBombusInstaladas ?? 0,
      abejasPorM2: s.abejasPorM2 ?? 0,
      actividadPolinizadores: s.actividadPolinizadores || calcularCalificacionAbejas(s.abejasPorM2 ?? 0),
      temperaturaAmbienteC: s.temperaturaAmbienteC ?? 20,
      humedadRelativa: s.humedadRelativa ?? 55,
      observaciones: s.observaciones || ''
    });
    setIsModalSincroniaOpen(true);
  };

  const handleOpenNewPolen = () => {
    setEditingPolenId(null);
    setFormPolen(getDefaultPolen());
    setIsModalPolenOpen(true);
  };

  const handleOpenEditPolen = (a: AplicacionPolenAsistido) => {
    setEditingPolenId(a.id);
    setFormPolen({
      fecha: a.fecha || todayISO(),
      hora: a.hora || '10:00',
      parcelasIds: a.parcelasIds && a.parcelasIds.length > 0 ? a.parcelasIds : (parcelas[0] ? [parcelas[0].id] : []),
      tipoPolen: a.tipoPolen || 'Polen Puro Liofilizado Tomuri',
      lotePolen: a.lotePolen || '',
      viabilidadPolenPorcentaje: a.viabilidadPolenPorcentaje ?? 85,
      metodoAplicacion: a.metodoAplicacion || 'Pulverización Líquida en Suspensión',
      dosisGramosPorHa: a.dosisGramosPorHa ?? 350,
      volumenAguaLHa: a.volumenAguaLHa ?? 200,
      equipoMaquinaria: a.equipoMaquinaria || '',
      operador: a.operador || activeUserName || 'Administrador',
      condicionesClimaticas: a.condicionesClimaticas || '',
      observaciones: a.observaciones || ''
    });
    setIsModalPolenOpen(true);
  };

  // Filtrado por cuartel
  const filteredBrotacion = useMemo(() => {
    if (cuartelFiltro === 'todos') return muestreosBrotacion;
    return muestreosBrotacion.filter((m) => m.parcelaId === cuartelFiltro);
  }, [muestreosBrotacion, cuartelFiltro]);

  const filteredBotones = useMemo(() => {
    if (cuartelFiltro === 'todos') return conteosBotones;
    return conteosBotones.filter((c) => c.parcelaId === cuartelFiltro);
  }, [conteosBotones, cuartelFiltro]);

  const filteredSincronias = useMemo(() => {
    if (cuartelFiltro === 'todos') return sincroniasFlorales;
    return sincroniasFlorales.filter((s) => s.parcelaId === cuartelFiltro);
  }, [sincroniasFlorales, cuartelFiltro]);

  const filteredPolen = useMemo(() => {
    if (cuartelFiltro === 'todos') return aplicacionesPolen;
    return aplicacionesPolen.filter((a) => a.parcelasIds.includes(cuartelFiltro));
  }, [aplicacionesPolen, cuartelFiltro]);

  // Consolidado por Cuartel para Brotación
  const consolidadoBrotacionPorCuartel = useMemo(() => {
    const map = new Map<string, {
      parcelaId: string;
      parcelaNombre: string;
      hilerasEvaluadas: string[];
      totalPlantas: number;
      totalCargadores: number;
      totalYemas: number;
      totalBrotadas: number;
      totalBrotesFlor: number;
      totalCiegos: number;
    }>();

    muestreosBrotacion.forEach((m) => {
      const existing = map.get(m.parcelaId) || {
        parcelaId: m.parcelaId,
        parcelaNombre: m.parcelaNombre,
        hilerasEvaluadas: [],
        totalPlantas: 0,
        totalCargadores: 0,
        totalYemas: 0,
        totalBrotadas: 0,
        totalBrotesFlor: 0,
        totalCiegos: 0
      };

      if (m.hilera && !existing.hilerasEvaluadas.includes(m.hilera)) {
        existing.hilerasEvaluadas.push(m.hilera);
      }
      existing.totalPlantas += m.plantasMuestreadas || 0;
      existing.totalCargadores += m.cargadoresEvaluados || 0;
      existing.totalYemas += m.yemasTotales || 0;
      existing.totalBrotadas += m.yemasBrotadas || 0;
      existing.totalBrotesFlor += m.brotesConFlor || 0;
      existing.totalCiegos += m.brotesVegetativosCiegos || 0;

      map.set(m.parcelaId, existing);
    });

    return Array.from(map.values()).map((c) => ({
      ...c,
      porcentajeBrotacion: c.totalYemas > 0 ? Number(((c.totalBrotadas / c.totalYemas) * 100).toFixed(1)) : 0,
      porcentajeBrotesConFlor: c.totalBrotadas > 0 ? Number(((c.totalBrotesFlor / c.totalBrotadas) * 100).toFixed(1)) : 0
    }));
  }, [muestreosBrotacion]);

  // Consolidado por Cuartel para Botones Florales
  const consolidadoBotonesPorCuartel = useMemo(() => {
    const map = new Map<string, {
      parcelaId: string;
      parcelaNombre: string;
      hilerasEvaluadas: string[];
      totalBrotes: number;
      totalBotonesKing: number;
      totalMariposas: number;
      totalPlanas: number;
      sumaAvanceRaleo: number;
      conteoRegistros: number;
      totalJornales: number;
    }>();

    conteosBotones.forEach((c) => {
      const existing = map.get(c.parcelaId) || {
        parcelaId: c.parcelaId,
        parcelaNombre: c.parcelaNombre,
        hilerasEvaluadas: [],
        totalBrotes: 0,
        totalBotonesKing: 0,
        totalMariposas: 0,
        totalPlanas: 0,
        sumaAvanceRaleo: 0,
        conteoRegistros: 0,
        totalJornales: 0
      };

      if (c.hilera && !existing.hilerasEvaluadas.includes(c.hilera)) {
        existing.hilerasEvaluadas.push(c.hilera);
      }
      existing.totalBrotes += c.brotesEvaluados || 0;
      existing.totalBotonesKing += c.botonesUnicosKing || 0;
      existing.totalMariposas += c.botonesDoblesTriplesMariposas || 0;
      existing.totalPlanas += c.floresDefectuosasPlanas || 0;
      existing.sumaAvanceRaleo += c.porcentajeAvanceRaleo || 0;
      existing.totalJornales += c.jornalesPorHaUtilizados || 0;
      existing.conteoRegistros += 1;

      map.set(c.parcelaId, existing);
    });

    return Array.from(map.values()).map((c) => ({
      ...c,
      promedioAvanceRaleo: c.conteoRegistros > 0 ? Math.round(c.sumaAvanceRaleo / c.conteoRegistros) : 0,
      totalBotones: c.totalBotonesKing + c.totalMariposas + c.totalPlanas,
      pctKing: (c.totalBotonesKing + c.totalMariposas + c.totalPlanas) > 0
        ? Number(((c.totalBotonesKing / (c.totalBotonesKing + c.totalMariposas + c.totalPlanas)) * 100).toFixed(1))
        : 0
    }));
  }, [conteosBotones]);

  // KPIs Resumen Global
  const avgBrotacion = muestreosBrotacion.length > 0
    ? (muestreosBrotacion.reduce((acc, m) => acc + m.porcentajeBrotacion, 0) / muestreosBrotacion.length).toFixed(1)
    : '0';

  const avgFertilidad = muestreosBrotacion.length > 0
    ? (muestreosBrotacion.reduce((acc, m) => acc + m.porcentajeBrotesConFlor, 0) / muestreosBrotacion.length).toFixed(1)
    : '0';

  const avgBotonesPorBrote = conteosBotones.length > 0
    ? (conteosBotones.reduce((acc, c) => acc + c.botonesPorBrotePromedio, 0) / conteosBotones.length).toFixed(1)
    : '0';

  // Último registro por cuartel para calcular total de colmenas instaladas sin duplicar
  const resumenColmenasPorCuartel = useMemo(() => {
    const latestByParcela = new Map<string, SincroniaFloral>();
    sincroniasFlorales.forEach((s) => {
      const prev = latestByParcela.get(s.parcelaId);
      if (!prev || s.fecha >= prev.fecha) {
        latestByParcela.set(s.parcelaId, s);
      }
    });
    const list = Array.from(latestByParcela.values());
    const apis = list.reduce((acc, s) => acc + (s.colmenasApisInstaladas || 0), 0);
    const bombus = list.reduce((acc, s) => acc + (s.colmenasBombusInstaladas || 0), 0);
    const totalHa = parcelas.reduce((acc, p) => acc + (p.superficieHa || 0), 0);
    const densidadApisHa = totalHa > 0 ? Number((apis / totalHa).toFixed(1)) : 0;
    return { apis, bombus, totalHa, densidadApisHa };
  }, [sincroniasFlorales, parcelas]);

  // Handlers de guardado (Crear o Actualizar)
  const handleSaveBrotacion = (e: React.FormEvent) => {
    e.preventDefault();
    const selParcela = parcelas.find((p) => p.id === formBrotacion.parcelaId);
    const yemasTot = Number(formBrotacion.yemasTotales) || 1;
    const yemasBrot = Number(formBrotacion.yemasBrotadas) || 0;
    const brotPct = Number(((yemasBrot / yemasTot) * 100).toFixed(1));
    const brotesFlor = Number(formBrotacion.brotesConFlor) || 0;
    const brotesFlorPct = yemasBrot > 0 ? Number(((brotesFlor / yemasBrot) * 100).toFixed(1)) : 0;

    const payload: MuestreoBrotacion = {
      id: editingBrotacionId || `mb-${Date.now()}`,
      fecha: formBrotacion.fecha || todayISO(),
      parcelaId: formBrotacion.parcelaId || 'general',
      parcelaNombre: selParcela?.nombre || 'Huerto General',
      hilera: formBrotacion.hilera || 'Hilera 1',
      plantasMuestreadas: Number(formBrotacion.plantasMuestreadas) || 5,
      variedad: formBrotacion.variedad,
      cargadoresEvaluados: Number(formBrotacion.cargadoresEvaluados) || 1,
      yemasTotales: yemasTot,
      yemasBrotadas: yemasBrot,
      porcentajeBrotacion: brotPct,
      brotesConFlor: brotesFlor,
      brotesVegetativosCiegos: Number(formBrotacion.brotesVegetativosCiegos) || 0,
      porcentajeBrotesConFlor: brotesFlorPct,
      brotacionBasePct: Number(formBrotacion.brotacionBasePct) || 0,
      brotacionMedioPct: Number(formBrotacion.brotacionMedioPct) || 0,
      brotacionPuntaPct: Number(formBrotacion.brotacionPuntaPct) || 0,
      evaluador: formBrotacion.evaluador || activeUserName,
      observaciones: formBrotacion.observaciones
    };

    if (editingBrotacionId && onUpdateMuestreoBrotacion) {
      onUpdateMuestreoBrotacion(payload);
    } else {
      onAddMuestreoBrotacion(payload);
    }
    setIsModalBrotacionOpen(false);
    setEditingBrotacionId(null);
  };

  const handleSaveBotones = (e: React.FormEvent) => {
    e.preventDefault();
    const selParcela = parcelas.find((p) => p.id === formBotones.parcelaId);

    const payload: ConteoBotonesFlorales = {
      id: editingBotonesId || `cbf-${Date.now()}`,
      fecha: formBotones.fecha || todayISO(),
      parcelaId: formBotones.parcelaId || 'general',
      parcelaNombre: selParcela?.nombre || 'Huerto General',
      hilera: formBotones.hilera || 'Hilera 1',
      plantasMuestreadas: Number(formBotones.plantasMuestreadas) || 5,
      brotesEvaluados: Number(formBotones.brotesEvaluados) || 1,
      botonesPorBrotePromedio: Number(formBotones.botonesPorBrotePromedio) || 0,
      botonesUnicosKing: Number(formBotones.botonesUnicosKing) || 0,
      botonesDoblesTriplesMariposas: Number(formBotones.botonesDoblesTriplesMariposas) || 0,
      floresDefectuosasPlanas: Number(formBotones.floresDefectuosasPlanas) || 0,
      densidadBotonesPorM2: Number(formBotones.densidadBotonesPorM2) || 0,
      estadoRaleoBotones: formBotones.estadoRaleoBotones,
      porcentajeAvanceRaleo: Number(formBotones.porcentajeAvanceRaleo) || 0,
      jornalesPorHaUtilizados: Number(formBotones.jornalesPorHaUtilizados) || 0,
      evaluador: formBotones.evaluador || activeUserName,
      observaciones: formBotones.observaciones
    };

    if (editingBotonesId && onUpdateConteoBotones) {
      onUpdateConteoBotones(payload);
    } else {
      onAddConteoBotones(payload);
    }
    setIsModalBotonesOpen(false);
    setEditingBotonesId(null);
  };

  const handleSaveSincronia = (e: React.FormEvent) => {
    e.preventDefault();
    const selParcela = parcelas.find((p) => p.id === formSincronia.parcelaId);
    const abejasNum = Number(formSincronia.abejasPorM2) || 0;

    const payload: SincroniaFloral = {
      id: editingSincroniaId || `sf-${Date.now()}`,
      fecha: formSincronia.fecha || todayISO(),
      parcelaId: formSincronia.parcelaId || 'general',
      parcelaNombre: selParcela?.nombre || 'Huerto General',
      porcentajeFloracionHembra: Number(formSincronia.porcentajeFloracionHembra) || 0,
      porcentajeFloracionMacho: Number(formSincronia.porcentajeFloracionMacho) || 0,
      estadoSincronia: formSincronia.estadoSincronia,
      diasDesfase: Number(formSincronia.diasDesfase) || 0,
      colmenasApisInstaladas: Number(formSincronia.colmenasApisInstaladas) || 0,
      colmenasBombusInstaladas: Number(formSincronia.colmenasBombusInstaladas) || 0,
      abejasPorM2: abejasNum,
      actividadPolinizadores: formSincronia.actividadPolinizadores || calcularCalificacionAbejas(abejasNum),
      temperaturaAmbienteC: Number(formSincronia.temperaturaAmbienteC) || 0,
      humedadRelativa: Number(formSincronia.humedadRelativa) || 0,
      observaciones: formSincronia.observaciones
    };

    if (editingSincroniaId && onUpdateSincroniaFloral) {
      onUpdateSincroniaFloral(payload);
    } else {
      onAddSincroniaFloral(payload);
    }
    setIsModalSincroniaOpen(false);
    setEditingSincroniaId(null);
  };

  const handleSavePolen = (e: React.FormEvent) => {
    e.preventDefault();
    const nombres = parcelas
      .filter((p) => formPolen.parcelasIds.includes(p.id))
      .map((p) => p.nombre);

    const payload: AplicacionPolenAsistido = {
      id: editingPolenId || `apa-${Date.now()}`,
      fecha: formPolen.fecha || todayISO(),
      hora: formPolen.hora || '10:00',
      parcelasIds: formPolen.parcelasIds,
      parcelasNombres: nombres.length > 0 ? nombres : ['Sin cuartel específico'],
      tipoPolen: formPolen.tipoPolen,
      lotePolen: formPolen.lotePolen,
      viabilidadPolenPorcentaje: Number(formPolen.viabilidadPolenPorcentaje) || 0,
      metodoAplicacion: formPolen.metodoAplicacion,
      dosisGramosPorHa: Number(formPolen.dosisGramosPorHa) || 0,
      volumenAguaLHa: Number(formPolen.volumenAguaLHa) || 0,
      equipoMaquinaria: formPolen.equipoMaquinaria,
      operador: formPolen.operador || activeUserName,
      condicionesClimaticas: formPolen.condicionesClimaticas,
      observaciones: formPolen.observaciones
    };

    if (editingPolenId && onUpdateAplicacionPolen) {
      onUpdateAplicacionPolen(payload);
    } else {
      onAddAplicacionPolen(payload);
    }
    setIsModalPolenOpen(false);
    setEditingPolenId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950 via-stone-900 to-emerald-950 text-white p-5 sm:p-7 shadow-sm border border-amber-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-700/80 text-amber-200 text-[10px] font-bold uppercase tracking-wider">
              <Flower2 className="w-3.5 h-3.5" />
              <span>Etapa Reproductiva · Evaluación por Hilera y Consolidado por Cuartel</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {activeTab === 'brotacion' && 'Control de % de Brotación & Yemas'}
              {activeTab === 'botones' && 'Conteo de Botones Florales & Raleo'}
              {(activeTab === 'colmenas' || activeTab === 'sincronia' || activeTab === 'polen') && 'Polinización, Colmenas & Sincronía Floral'}
              {activeTab === 'carga_raleo' && 'Cálculo de Carga Objetivo y Planificación de Raleo'}
              {activeTab === 'cuaja_semillas' && 'Evaluación de Cuaja Post-Floración y Conteo de Semillas'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl">
              Registra, edita o elimina muestreos por hilera, conteos de abejas, sincronía floral, cálculo de carga objetivo/raleo y evaluación post-floración de cuaja y semillas.
            </p>
          </div>

          {canEdit && activeTab !== 'carga_raleo' && activeTab !== 'cuaja_semillas' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (activeTab === 'brotacion') handleOpenNewBrotacion();
                  else if (activeTab === 'botones') handleOpenNewBotones();
                  else if (activeTab === 'sincronia' || activeTab === 'colmenas') handleOpenNewSincronia();
                  else if (activeTab === 'polen') handleOpenNewPolen();
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {activeTab === 'brotacion' && 'Muestrear Hilera (Brotación)'}
                {activeTab === 'botones' && 'Contar Hilera (Botones)'}
                {activeTab === 'colmenas' && 'Registrar Actividad Abejas'}
                {activeTab === 'sincronia' && 'Registrar Sincronía Floral'}
                {activeTab === 'polen' && 'Registrar Polen Asistido'}
              </button>
            </div>
          )}
        </div>

        {/* KPIs Resumen Superior */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-xs">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-stone-300 text-[11px] font-medium flex items-center gap-1">
              <Sprout className="w-3.5 h-3.5 text-emerald-400" />
              % Brotación Promedio
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">
              {avgBrotacion}%
            </div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5">Óptimo Hayward: &gt;65%</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-stone-300 text-[11px] font-medium flex items-center gap-1">
              <Flower2 className="w-3.5 h-3.5 text-amber-400" />
              Fertilidad de Yemas
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">
              {avgFertilidad}%
            </div>
            <div className="text-[10px] text-amber-300/80 mt-0.5">Brotes mixtos con flor</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-stone-300 text-[11px] font-medium flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-blue-400" />
              Botones / Brote Promedio
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">
              {avgBotonesPorBrote} bot.
            </div>
            <div className="text-[10px] text-blue-300/80 mt-0.5">Carga previa a raleo</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-stone-300 text-[11px] font-medium flex items-center gap-1">
              <Bug className="w-3.5 h-3.5 text-rose-400" />
              Colmenas en Huerto
            </div>
            <div className="text-lg sm:text-xl font-black text-white mt-1">
              {resumenColmenasPorCuartel.apis} Apis · {resumenColmenasPorCuartel.bombus} Bombus
            </div>
            <div className="text-[10px] text-rose-300/80 mt-0.5">
              {resumenColmenasPorCuartel.totalHa > 0
                ? `${resumenColmenasPorCuartel.densidadApisHa} colm. Apis/ha (meta 8-10/ha)`
                : 'Meta: 8-10 colm/ha'}
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Sub-pestañas sincronizado */}
      <div className="flex border-b border-stone-200 bg-white rounded-xl p-1 shadow-2xs gap-1 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('brotacion')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'brotacion'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Sprout className="w-4 h-4" />
          % Brotación & Yemas ({muestreosBrotacion.length})
        </button>

        <button
          onClick={() => setActiveTab('botones')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'botones'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Flower2 className="w-4 h-4" />
          Botones Florales & Raleo ({conteosBotones.length})
        </button>

        <button
          onClick={() => setActiveTab('colmenas')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'colmenas'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Bug className="w-4 h-4" />
          Colmenas & Conteo de Abejas ({sincroniasFlorales.length})
        </button>

        <button
          onClick={() => setActiveTab('sincronia')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'sincronia'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Sincronía Floral (Hayward vs Machos) ({sincroniasFlorales.length})
        </button>

        <button
          onClick={() => setActiveTab('polen')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'polen'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Aplicación de Polen Asistido ({aplicacionesPolen.length})
        </button>

        <button
          onClick={() => setActiveTab('carga_raleo')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'carga_raleo'
              ? 'bg-indigo-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Scissors className="w-4 h-4" />
          Carga Objetivo & Raleo ({planesCargaRaleo.length})
        </button>

        <button
          onClick={() => setActiveTab('cuaja_semillas')}
          className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'cuaja_semillas'
              ? 'bg-teal-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          Cuaja & Conteo de Semillas ({evaluacionesCuajaSemillas.length})
        </button>
      </div>

      {/* SECCIÓN 1: % DE BROTACIÓN & YEMAS (CON SWITCH HILERA / CUARTEL) */}
      {activeTab === 'brotacion' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
              <button
                onClick={() => setVistaModoBrotacion('hilera')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  vistaModoBrotacion === 'hilera'
                    ? 'bg-white text-emerald-950 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Detalle por Hilera
              </button>
              <button
                onClick={() => setVistaModoBrotacion('cuartel')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  vistaModoBrotacion === 'cuartel'
                    ? 'bg-white text-emerald-950 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Consolidado por Cuartel
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={cuartelFiltro}
                  onChange={(e) => setCuartelFiltro(e.target.value)}
                  className="p-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-800"
                >
                  <option value="todos">Todos los cuarteles</option>
                  {parcelas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {canEdit && (
                <button
                  onClick={handleOpenNewBrotacion}
                  className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Muestrear Hilera
                </button>
              )}
            </div>
          </div>

          {vistaModoBrotacion === 'hilera' && (
            <div>
              {filteredBrotacion.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-stone-500 border border-stone-200">
                  <Sprout className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                  <p className="font-bold text-stone-700">Sin muestreos por hilera registrados</p>
                  <p className="text-xs text-stone-500 mt-1">Presiona "Muestrear Hilera" para ingresar el conteo de yemas de la hilera.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-100/90 text-stone-700 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider">
                          <th className="p-3">Hilera / Cuartel</th>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Plantas</th>
                          <th className="p-3">Cargadores</th>
                          <th className="p-3">Yemas Totales</th>
                          <th className="p-3">Brotadas</th>
                          <th className="p-3">% Brotación</th>
                          <th className="p-3">Brotes c/Flor</th>
                          <th className="p-3">Distribución Base/Medio/Punta</th>
                          {canEdit && <th className="p-3 text-right">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredBrotacion.map((m) => (
                          <tr key={m.id} className="hover:bg-stone-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-[11px]">
                                  {m.hilera || 'Hilera -'}
                                </span>
                              </div>
                              <div className="text-[11px] text-stone-500 mt-0.5">{m.parcelaNombre}</div>
                            </td>
                            <td className="p-3 font-medium text-stone-700">{m.fecha}</td>
                            <td className="p-3 font-semibold text-stone-800">{m.plantasMuestreadas || 6} pl.</td>
                            <td className="p-3 font-semibold text-stone-800">{m.cargadoresEvaluados} carg.</td>
                            <td className="p-3 font-mono font-bold text-stone-900">{m.yemasTotales}</td>
                            <td className="p-3 font-mono font-bold text-emerald-800">{m.yemasBrotadas}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full font-black text-xs ${
                                m.porcentajeBrotacion >= 65
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : m.porcentajeBrotacion >= 50
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-rose-100 text-rose-900'
                              }`}>
                                {m.porcentajeBrotacion}%
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-amber-900">{m.brotesConFlor}</span>
                              <span className="text-[10px] text-stone-500 ml-1">({m.porcentajeBrotesConFlor}%)</span>
                            </td>
                            <td className="p-3 text-[10px] text-stone-600 font-mono">
                              B: {m.brotacionBasePct}% · M: {m.brotacionMedioPct}% · P: {m.brotacionPuntaPct}%
                            </td>
                            {canEdit && (
                              <td className="p-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenEditBrotacion(m)}
                                    className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                    title="Editar registro de hilera"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteMuestreoBrotacion(m.id)}
                                    className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                                    title="Eliminar registro de hilera"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {vistaModoBrotacion === 'cuartel' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {consolidadoBrotacionPorCuartel.map((c) => (
                <div key={c.parcelaId} className="bg-white rounded-xl border border-stone-200 shadow-2xs p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-stone-900">{c.parcelaNombre}</h3>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {c.hilerasEvaluadas.length} hileras evaluadas: <span className="font-semibold text-stone-700">{c.hilerasEvaluadas.join(', ') || 'Sin especificar'}</span>
                      </div>
                    </div>
                    <span className="text-xs bg-emerald-100 text-emerald-950 font-black px-2.5 py-1 rounded-full">
                      {c.porcentajeBrotacion}% Promedio
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-stone-500">Cargadores Muestreados</div>
                      <div className="text-base font-black text-stone-900 mt-0.5">{c.totalCargadores}</div>
                      <div className="text-[9px] text-stone-400">Total cuartel</div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-emerald-800 font-bold">Yemas Brotadas</div>
                      <div className="text-base font-black text-emerald-900 mt-0.5">{c.totalBrotadas} / {c.totalYemas}</div>
                      <div className="text-[9px] text-emerald-700">{c.porcentajeBrotacion}% efectivas</div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-amber-800 font-bold">Brotes c/Flor</div>
                      <div className="text-base font-black text-amber-900 mt-0.5">{c.totalBrotesFlor}</div>
                      <div className="text-[9px] text-amber-700">{c.porcentajeBrotesConFlor}% fertilidad</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-stone-600">
                      <span>Nivel de Brotación Cuartel:</span>
                      <span>{c.porcentajeBrotacion}% ({c.porcentajeBrotacion >= 65 ? 'Óptimo' : 'Bajo'})</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          c.porcentajeBrotacion >= 65 ? 'bg-emerald-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(c.porcentajeBrotacion, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: BOTONES FLORALES & RALEO */}
      {activeTab === 'botones' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
              <button
                onClick={() => setVistaModoBotones('hilera')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  vistaModoBotones === 'hilera'
                    ? 'bg-white text-amber-950 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Detalle por Hilera
              </button>
              <button
                onClick={() => setVistaModoBotones('cuartel')}
                className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  vistaModoBotones === 'cuartel'
                    ? 'bg-white text-amber-950 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Consolidado por Cuartel
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={cuartelFiltro}
                  onChange={(e) => setCuartelFiltro(e.target.value)}
                  className="p-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-800"
                >
                  <option value="todos">Todos los cuarteles</option>
                  {parcelas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              {canEdit && (
                <button
                  onClick={handleOpenNewBotones}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Contar Hilera
                </button>
              )}
            </div>
          </div>

          {vistaModoBotones === 'hilera' && (
            <div>
              {filteredBotones.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-stone-500 border border-stone-200">
                  <Flower2 className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                  <p className="font-bold text-stone-700">Sin conteos de botones por hilera registrados</p>
                  <p className="text-xs text-stone-500 mt-1">Presiona "Contar Hilera" para registrar flores King y mariposas de cada hilera.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-100/90 text-stone-700 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider">
                          <th className="p-3">Hilera / Cuartel</th>
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Brotes Evaluados</th>
                          <th className="p-3">Botones/Brote</th>
                          <th className="p-3">Botones King</th>
                          <th className="p-3">Mariposas / Defectos</th>
                          <th className="p-3">Densidad bot/m²</th>
                          <th className="p-3">Avance Raleo</th>
                          {canEdit && <th className="p-3 text-right">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredBotones.map((c) => (
                          <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono text-[11px]">
                                  {c.hilera || 'Hilera -'}
                                </span>
                              </div>
                              <div className="text-[11px] text-stone-500 mt-0.5">{c.parcelaNombre}</div>
                            </td>
                            <td className="p-3 font-medium text-stone-700">{c.fecha}</td>
                            <td className="p-3 font-semibold text-stone-800">{c.brotesEvaluados} brotes</td>
                            <td className="p-3 font-mono font-bold text-stone-900">{c.botonesPorBrotePromedio}</td>
                            <td className="p-3 font-mono font-bold text-emerald-800">{c.botonesUnicosKing} King</td>
                            <td className="p-3 font-mono font-bold text-rose-800">
                              {c.botonesDoblesTriplesMariposas + c.floresDefectuosasPlanas} a ralear
                            </td>
                            <td className="p-3 font-mono text-stone-700">{c.densidadBotonesPorM2} bot/m²</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                c.estadoRaleoBotones === 'Finalizado'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : c.estadoRaleoBotones === 'En curso'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-stone-100 text-stone-700'
                              }`}>
                                {c.estadoRaleoBotones} ({c.porcentajeAvanceRaleo}%)
                              </span>
                            </td>
                            {canEdit && (
                              <td className="p-3 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => handleOpenEditBotones(c)}
                                    className="p-1.5 text-stone-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg cursor-pointer"
                                    title="Editar conteo de hilera"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteConteoBotones(c.id)}
                                    className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                                    title="Eliminar registro"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {vistaModoBotones === 'cuartel' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {consolidadoBotonesPorCuartel.map((c) => (
                <div key={c.parcelaId} className="bg-white rounded-xl border border-stone-200 shadow-2xs p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-stone-900">{c.parcelaNombre}</h3>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {c.hilerasEvaluadas.length} hileras evaluadas: <span className="font-semibold text-stone-700">{c.hilerasEvaluadas.join(', ') || 'Sin especificar'}</span>
                      </div>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-950 font-black px-2.5 py-1 rounded-full">
                      {c.promedioAvanceRaleo}% Raleo Cuartel
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-emerald-800 font-bold">Flores King Totales</div>
                      <div className="text-base font-black text-emerald-900 mt-0.5">{c.totalBotonesKing}</div>
                      <div className="text-[9px] text-emerald-700">{c.pctKing}% del total</div>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-rose-800 font-bold">Mariposas / Defectos</div>
                      <div className="text-base font-black text-rose-900 mt-0.5">{c.totalMariposas + c.totalPlanas}</div>
                      <div className="text-[9px] text-rose-700">A eliminar en raleo</div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] text-stone-500">Jornales Acumulados</div>
                      <div className="text-base font-black text-stone-900 mt-0.5">{c.totalJornales.toFixed(1)}</div>
                      <div className="text-[9px] text-stone-400">Jornales/ha invertidos</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-stone-600">
                      <span>Progreso de Raleo de Botones Cuartel:</span>
                      <span>{c.promedioAvanceRaleo}% completado</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-600 h-2 rounded-full transition-all"
                        style={{ width: `${c.promedioAvanceRaleo}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 3: COLMENAS & CONTEO DE ABEJAS (CON AGREGAR, EDITAR Y ELIMINAR) */}
      {activeTab === 'colmenas' && (
        <div className="space-y-4">
          <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
              <Bug className="w-4 h-4 text-rose-700" />
              Manejo de Colmenas y Pecoreo en Floración del Kiwi Hayward
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-stone-700 text-xs">
              <div className="bg-white p-3 rounded-lg border border-rose-100">
                <span className="font-bold text-rose-800 block mb-1">Dosis Recomendada SAG</span>
                8 a 10 colmenas/ha de <em>Apis mellifera</em> (con 8 marcos de cría activa) + 2 a 3 colonias/ha de abejorros <em>Bombus terrestris</em> para pecoreo con viento o frío.
              </div>
              <div className="bg-white p-3 rounded-lg border border-rose-100">
                <span className="font-bold text-rose-800 block mb-1">Horario Óptimo de Conteo</span>
                Entre las 11:00 y las 15:30 horas, con temperatura superior a 15°C y vientos bajo 12 km/h. La flor del kiwi no tiene néctar, sólo polen.
              </div>
              <div className="bg-white p-3 rounded-lg border border-rose-100">
                <span className="font-bold text-rose-800 block mb-1">Umbral Crítico</span>
                Si el conteo es inferior a 10 abejas/m² en plena flor, se requiere reforzar inmediatamente con polinización artificial con polen asistido.
              </div>
            </div>
          </div>

          {/* Barra de filtro + botón */}
          <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={cuartelFiltro}
                onChange={(e) => setCuartelFiltro(e.target.value)}
                className="p-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-800"
              >
                <option value="todos">Todos los cuarteles</option>
                {parcelas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              {resumenColmenasPorCuartel.totalHa > 0 && (
                <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 ${
                  resumenColmenasPorCuartel.densidadApisHa >= 8
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                }`}>
                  {resumenColmenasPorCuartel.densidadApisHa >= 8 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  Cobertura actual: {resumenColmenasPorCuartel.densidadApisHa} colmenas Apis/ha
                </span>
              )}
            </div>

            {canEdit && (
              <button
                onClick={handleOpenNewSincronia}
                className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Conteo de Pecoreo / Colmenas
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
              <div className="font-bold text-sm text-stone-900">Historial de Conteo de Polinizadores y Colmenas ({filteredSincronias.length})</div>
            </div>

            {filteredSincronias.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                <Bug className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="font-bold text-stone-700 text-sm">Sin conteos de colmenas o abejas registrados</p>
                <p className="text-xs text-stone-500 mt-1">Presiona "Registrar Conteo de Pecoreo / Colmenas" para ingresar tus datos.</p>
              </div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100/80 text-stone-600 border-b border-stone-200 text-[11px] uppercase tracking-wider">
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Cuartel</th>
                      <th className="p-3">Colmenas Apis</th>
                      <th className="p-3">Colmenas Bombus</th>
                      <th className="p-3">Abejas / m²</th>
                      <th className="p-3">Calificación</th>
                      <th className="p-3">Clima</th>
                      {canEdit && <th className="p-3 text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredSincronias.map((s) => (
                      <tr key={s.id} className="hover:bg-stone-50">
                        <td className="p-3 font-medium text-stone-900 whitespace-nowrap">{s.fecha}</td>
                        <td className="p-3">
                          <div className="font-semibold text-stone-900">{s.parcelaNombre}</div>
                          {s.observaciones && (
                            <div className="text-[10px] text-stone-500 italic truncate max-w-[220px]" title={s.observaciones}>
                              {s.observaciones}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-bold text-amber-800 whitespace-nowrap">{s.colmenasApisInstaladas} colmenas</td>
                        <td className="p-3 font-bold text-stone-700 whitespace-nowrap">{s.colmenasBombusInstaladas} colonias</td>
                        <td className="p-3 font-black text-stone-900 whitespace-nowrap">{s.abejasPorM2} abejas/m²</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            s.actividadPolinizadores.includes('Óptima')
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.actividadPolinizadores.includes('Media')
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {s.actividadPolinizadores}
                          </span>
                        </td>
                        <td className="p-3 text-stone-500 whitespace-nowrap">{s.temperaturaAmbienteC}°C · {s.humedadRelativa}% HR</td>
                        {canEdit && (
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditSincronia(s)}
                                className="p-1.5 text-stone-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="Editar conteo de colmenas y pecoreo"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {pendingDeleteKey === `col-${s.id}` ? (
                                <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                                  <button
                                    onClick={() => {
                                      onDeleteSincroniaFloral(s.id);
                                      setPendingDeleteKey(null);
                                    }}
                                    className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-[10px] cursor-pointer"
                                  >
                                    Eliminar
                                  </button>
                                  <button
                                    onClick={() => setPendingDeleteKey(null)}
                                    className="px-1.5 py-0.5 text-stone-600 hover:text-stone-900 font-semibold text-[10px] cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setPendingDeleteKey(`col-${s.id}`)}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN 4: SINCRONÍA FLORAL (CON AGREGAR, EDITAR Y ELIMINAR) */}
      {activeTab === 'sincronia' && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-blue-900">
                <TrendingUp className="w-4 h-4" />
                Sincronía Floral Hayward (Hembra) vs Polinizadores (Tomuri / Chieftain):
              </span>
              <p className="text-stone-600 text-[11px] max-w-3xl">
                El kiwi es una especie dioica estricta. Las flores femeninas sólo son receptivas durante 3 a 5 días tras la apertura. Es crucial que los machos florezcan al unísono con las hembras para asegurar granos de polen viables en el estigma.
              </p>
            </div>
            {canEdit && (
              <button
                onClick={handleOpenNewSincronia}
                className="px-3.5 py-2 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-lg shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Curva Floral
              </button>
            )}
          </div>

          {/* Filtro por cuartel */}
          <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <span className="font-bold text-stone-600">Filtrar por Cuartel:</span>
            <select
              value={cuartelFiltro}
              onChange={(e) => setCuartelFiltro(e.target.value)}
              className="p-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-800"
            >
              <option value="todos">Todos los cuarteles</option>
              {parcelas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {filteredSincronias.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-stone-500 border border-stone-200">
              <TrendingUp className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="font-bold text-stone-700">Sin curvas de sincronía floral registradas</p>
              <p className="text-xs text-stone-500 mt-1">Presiona "Registrar Curva Floral" para evaluar el porcentaje de apertura entre hembras y machos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSincronias.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-stone-200 shadow-2xs p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-stone-900">{s.parcelaNombre}</div>
                      <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Fecha: {s.fecha} · T°: {s.temperaturaAmbienteC}°C · HR: {s.humedadRelativa}%
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.estadoSincronia === 'Sincronizado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {s.estadoSincronia} ({s.diasDesfase >= 0 ? `+${s.diasDesfase}` : s.diasDesfase} d)
                      </span>

                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleOpenEditSincronia(s)}
                            className="p-1.5 text-stone-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="Editar sincronía floral"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {pendingDeleteKey === `sin-${s.id}` ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                              <button
                                onClick={() => {
                                  onDeleteSincroniaFloral(s.id);
                                  setPendingDeleteKey(null);
                                }}
                                className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-[10px] cursor-pointer"
                              >
                                Eliminar
                              </button>
                              <button
                                onClick={() => setPendingDeleteKey(null)}
                                className="px-1.5 py-0.5 text-stone-600 hover:text-stone-900 font-semibold text-[10px] cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setPendingDeleteKey(`sin-${s.id}`)}
                              className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Eliminar sincronía floral"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Comparación Hembra vs Macho */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-stone-700">
                        <span>🌸 Hembra (Hayward):</span>
                        <span>{s.porcentajeFloracionHembra}% flor abierta</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden mt-1">
                        <div
                          className="bg-pink-500 h-2.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, s.porcentajeFloracionHembra))}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-stone-700">
                        <span>🌼 Machos (Tomuri / Chieftain):</span>
                        <span>{s.porcentajeFloracionMacho}% flor abierta</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden mt-1">
                        <div
                          className="bg-amber-500 h-2.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, s.porcentajeFloracionMacho))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                    <div>
                      <div className="text-[10px] text-stone-500">Actividad de Pecoreo</div>
                      <div className="font-bold text-stone-800 mt-0.5">{s.actividadPolinizadores}</div>
                      <div className="text-[10px] text-stone-500">{s.abejasPorM2} abejas/m²</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-500">Colmenas de Apoyo</div>
                      <div className="font-bold text-stone-800 mt-0.5">{s.colmenasApisInstaladas} Apis</div>
                      <div className="text-[10px] text-stone-500">{s.colmenasBombusInstaladas} Bombus</div>
                    </div>
                  </div>

                  {s.observaciones && (
                    <div className="text-xs text-stone-600 bg-stone-50 p-2 rounded border border-stone-200 italic">
                      "{s.observaciones}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 5: POLEN ASISTIDO (CON AGREGAR, EDITAR Y ELIMINAR) */}
      {activeTab === 'polen' && (
        <div className="space-y-4">
          <div className="bg-stone-900 text-white rounded-xl p-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-stone-800">
            <div className="space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-400">
                <Sparkles className="w-4 h-4" />
                Polinización Artificial / Aplicación de Polen Asistido
              </span>
              <p className="text-stone-300 text-[11px] max-w-3xl">
                Garantiza entre 1.000 y 1.400 semillas por fruto de kiwi Hayward, requisito biológico indispensable para alcanzar calibres sobre calibre 27-30 (105 a 125 gramos). Se aplica al 40-50% y 80% de flor abierta con polen de viabilidad comprobada &gt;80%.
              </p>
            </div>
            {canEdit && (
              <button
                onClick={handleOpenNewPolen}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Nueva Aplicación de Polen
              </button>
            )}
          </div>

          {filteredPolen.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-stone-500 border border-stone-200">
              <Sparkles className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="font-bold text-stone-700">Sin aplicaciones de polen registradas</p>
              <p className="text-xs text-stone-500 mt-1">Presiona "Nueva Aplicación de Polen" para registrar la pulverización electrostática o líquida.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPolen.map((a) => (
                <div key={a.id} className="bg-white rounded-xl border border-stone-200 shadow-2xs p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-stone-900">{a.tipoPolen}</div>
                      <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Fecha: {a.fecha} a las {a.hora} hrs · Lote: {a.lotePolen}
                      </div>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditPolen(a)}
                          className="p-1.5 text-stone-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg cursor-pointer"
                          title="Editar aplicación de polen"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {pendingDeleteKey === `pol-${a.id}` ? (
                          <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-1.5 py-0.5">
                            <button
                              onClick={() => {
                                onDeleteAplicacionPolen(a.id);
                                setPendingDeleteKey(null);
                              }}
                              className="px-2 py-0.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-[10px] cursor-pointer"
                            >
                              Eliminar
                            </button>
                            <button
                              onClick={() => setPendingDeleteKey(null)}
                              className="px-1.5 py-0.5 text-stone-600 hover:text-stone-900 font-semibold text-[10px] cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPendingDeleteKey(`pol-${a.id}`)}
                            className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-xs">
                    <span className="font-bold text-stone-700">Cuarteles tratados: </span>
                    <span className="text-stone-600">{a.parcelasNombres.join(', ')}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-amber-800 font-bold">Dosis / Ha</div>
                      <div className="text-lg font-black text-amber-900 mt-0.5">{a.dosisGramosPorHa} g/ha</div>
                      <div className="text-[9px] text-amber-700">Polen puro</div>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-emerald-800 font-bold">Viabilidad</div>
                      <div className="text-lg font-black text-emerald-900 mt-0.5">{a.viabilidadPolenPorcentaje}%</div>
                      <div className="text-[9px] text-emerald-700">Germinación test</div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-stone-500">Método</div>
                      <div className="text-[11px] font-bold text-stone-800 mt-1 line-clamp-1" title={a.metodoAplicacion}>{a.metodoAplicacion}</div>
                      <div className="text-[9px] text-stone-400">{a.volumenAguaLHa ? `${a.volumenAguaLHa} L agua/ha` : 'Seco'}</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-100 space-y-1">
                    <div><strong>Equipo:</strong> {a.equipoMaquinaria || 'No especificado'}</div>
                    <div><strong>Operador:</strong> {a.operador || 'No especificado'}</div>
                    <div><strong>Clima durante faena:</strong> {a.condicionesClimaticas || 'No registrado'}</div>
                  </div>

                  {a.observaciones && (
                    <div className="text-xs text-stone-600 bg-stone-50 p-2 rounded border border-stone-200 italic">
                      "{a.observaciones}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 6: CÁLCULO DE CARGA OBJETIVO Y PLANIFICACIÓN DE RALEO */}
      {activeTab === 'carga_raleo' && (
        <CargaObjetivoRaleoPanel
          parcelas={parcelas}
          conteosBotones={conteosBotones}
          evaluacionesCuaja={evaluacionesCuajaSemillas}
          planesCargaRaleo={planesCargaRaleo}
          onAddPlan={onAddPlanCargaRaleo}
          onUpdatePlan={onUpdatePlanCargaRaleo}
          onDeletePlan={onDeletePlanCargaRaleo}
          activeUserName={activeUserName}
          canEdit={canEdit}
        />
      )}

      {/* SECCIÓN 7: EVALUACIÓN DE CUAJA POST-FLORACIÓN Y CONTEO DE SEMILLAS */}
      {activeTab === 'cuaja_semillas' && (
        <CuajaSemillasPanel
          parcelas={parcelas}
          evaluaciones={evaluacionesCuajaSemillas}
          onAddEvaluacion={onAddEvaluacionCuajaSemillas}
          onUpdateEvaluacion={onUpdateEvaluacionCuajaSemillas}
          onDeleteEvaluacion={onDeleteEvaluacionCuajaSemillas}
          activeUserName={activeUserName}
          canEdit={canEdit}
        />
      )}

      {/* MODAL 1: MUESTREO DE BROTACIÓN (CREAR / EDITAR) */}
      {isModalBrotacionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-400" />
                {editingBrotacionId ? 'Editar Muestreo de Brotación por Hilera' : 'Registrar Muestreo de Brotación por Hilera'}
              </h3>
              <button onClick={() => setIsModalBrotacionOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrotacion} className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="font-bold text-stone-700 block mb-1">Fecha:</label>
                  <input
                    type="date"
                    value={formBrotacion.fecha}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, fecha: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label className="font-bold text-stone-700 block mb-1">Cuartel:</label>
                  <select
                    value={formBrotacion.parcelaId}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, parcelaId: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs font-semibold"
                    required
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
                <div className="col-span-1">
                  <label className="font-bold text-stone-700 block mb-1">Hilera:</label>
                  <input
                    type="text"
                    value={formBrotacion.hilera}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, hilera: e.target.value })}
                    placeholder="Ej. Hilera 4"
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs font-bold text-emerald-900 bg-emerald-50/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Plantas en la Hilera:</label>
                  <input
                    type="number"
                    min="1"
                    value={formBrotacion.plantasMuestreadas}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, plantasMuestreadas: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Cargadores Evaluados:</label>
                  <input
                    type="number"
                    min="1"
                    value={formBrotacion.cargadoresEvaluados}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, cargadoresEvaluados: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Yemas Tot.:</label>
                  <input
                    type="number"
                    min="1"
                    value={formBrotacion.yemasTotales}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, yemasTotales: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Brotadas:</label>
                  <input
                    type="number"
                    min="0"
                    value={formBrotacion.yemasBrotadas}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, yemasBrotadas: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Con Flor:</label>
                  <input
                    type="number"
                    min="0"
                    value={formBrotacion.brotesConFlor}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, brotesConFlor: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Ciegos:</label>
                  <input
                    type="number"
                    min="0"
                    value={formBrotacion.brotesVegetativosCiegos}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, brotesVegetativosCiegos: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">% Base:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formBrotacion.brotacionBasePct}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, brotacionBasePct: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">% Medio:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formBrotacion.brotacionMedioPct}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, brotacionMedioPct: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">% Punta:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formBrotacion.brotacionPuntaPct}
                    onChange={(e) => setFormBrotacion({ ...formBrotacion, brotacionPuntaPct: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <div className="text-[10px] text-emerald-800 font-bold uppercase">% Brotación en esta Hilera:</div>
                  <div className="text-xl font-black text-emerald-950">
                    {formBrotacion.yemasTotales > 0
                      ? ((formBrotacion.yemasBrotadas / formBrotacion.yemasTotales) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-emerald-800 font-bold uppercase">% Brotes con Flor:</div>
                  <div className="text-xl font-black text-emerald-950">
                    {formBrotacion.yemasBrotadas > 0
                      ? ((formBrotacion.brotesConFlor / formBrotacion.yemasBrotadas) * 100).toFixed(1)
                      : 0}%
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Evaluador:</label>
                <input
                  type="text"
                  value={formBrotacion.evaluador}
                  onChange={(e) => setFormBrotacion({ ...formBrotacion, evaluador: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Observaciones:</label>
                <textarea
                  rows={2}
                  value={formBrotacion.observaciones}
                  onChange={(e) => setFormBrotacion({ ...formBrotacion, observaciones: e.target.value })}
                  placeholder="Ej. Brotes de vigor uniforme, sin signos de Psa..."
                  className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalBrotacionOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingBrotacionId ? 'Actualizar Hilera' : 'Guardar Hilera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONTEO DE BOTONES FLORALES (CREAR / EDITAR) */}
      {isModalBotonesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="bg-amber-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Flower2 className="w-4 h-4 text-amber-400" />
                {editingBotonesId ? 'Editar Conteo de Botones por Hilera' : 'Registrar Conteo de Botones por Hilera'}
              </h3>
              <button onClick={() => setIsModalBotonesOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBotones} className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Fecha:</label>
                  <input
                    type="date"
                    value={formBotones.fecha}
                    onChange={(e) => setFormBotones({ ...formBotones, fecha: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Cuartel:</label>
                  <select
                    value={formBotones.parcelaId}
                    onChange={(e) => setFormBotones({ ...formBotones, parcelaId: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs font-semibold"
                    required
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
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Hilera:</label>
                  <input
                    type="text"
                    value={formBotones.hilera}
                    onChange={(e) => setFormBotones({ ...formBotones, hilera: e.target.value })}
                    placeholder="Ej. Hilera 4"
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs font-bold text-amber-900 bg-amber-50/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Brotes Evaluados:</label>
                  <input
                    type="number"
                    min="1"
                    value={formBotones.brotesEvaluados}
                    onChange={(e) => setFormBotones({ ...formBotones, brotesEvaluados: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Botones/Brote:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formBotones.botonesPorBrotePromedio}
                    onChange={(e) => setFormBotones({ ...formBotones, botonesPorBrotePromedio: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Densidad bot/m²:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formBotones.densidadBotonesPorM2}
                    onChange={(e) => setFormBotones({ ...formBotones, densidadBotonesPorM2: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Botones King (Únicos):</label>
                  <input
                    type="number"
                    min="0"
                    value={formBotones.botonesUnicosKing}
                    onChange={(e) => setFormBotones({ ...formBotones, botonesUnicosKing: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Mariposas / Triples:</label>
                  <input
                    type="number"
                    min="0"
                    value={formBotones.botonesDoblesTriplesMariposas}
                    onChange={(e) => setFormBotones({ ...formBotones, botonesDoblesTriplesMariposas: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Flores Planas:</label>
                  <input
                    type="number"
                    min="0"
                    value={formBotones.floresDefectuosasPlanas}
                    onChange={(e) => setFormBotones({ ...formBotones, floresDefectuosasPlanas: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Estado de Raleo:</label>
                  <select
                    value={formBotones.estadoRaleoBotones}
                    onChange={(e) => setFormBotones({ ...formBotones, estadoRaleoBotones: e.target.value as any })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En curso">En curso</option>
                    <option value="Finalizado">Finalizado</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">% Avance Raleo:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formBotones.porcentajeAvanceRaleo}
                    onChange={(e) => setFormBotones({ ...formBotones, porcentajeAvanceRaleo: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Jornales/ha:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formBotones.jornalesPorHaUtilizados}
                    onChange={(e) => setFormBotones({ ...formBotones, jornalesPorHaUtilizados: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Observaciones:</label>
                <textarea
                  rows={2}
                  value={formBotones.observaciones}
                  onChange={(e) => setFormBotones({ ...formBotones, observaciones: e.target.value })}
                  placeholder="Ej. Raleo selectivo de mariposas..."
                  className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalBotonesOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingBotonesId ? 'Actualizar Conteo' : 'Guardar Conteo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SINCRONÍA FLORAL & COLMENAS (CREAR / EDITAR COMPLETO) */}
      {isModalSincroniaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Bug className="w-4 h-4 text-rose-400" />
                {editingSincroniaId ? 'Editar Registro de Colmenas & Sincronía Floral' : 'Registrar Sincronía Floral & Conteo de Abejas'}
              </h3>
              <button onClick={() => setIsModalSincroniaOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSincronia} className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Fecha de Muestreo:</label>
                  <input
                    type="date"
                    value={formSincronia.fecha}
                    onChange={(e) => setFormSincronia({ ...formSincronia, fecha: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Cuartel:</label>
                  <select
                    value={formSincronia.parcelaId}
                    onChange={(e) => setFormSincronia({ ...formSincronia, parcelaId: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs font-semibold"
                    required
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

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
                <div className="font-bold text-blue-950 text-[11px] uppercase tracking-wider">
                  Sincronía Floral (Hayward vs Polinizadores)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">% Flor Abierta Hayward:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formSincronia.porcentajeFloracionHembra}
                      onChange={(e) => setFormSincronia({ ...formSincronia, porcentajeFloracionHembra: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">% Flor Abierta Machos:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formSincronia.porcentajeFloracionMacho}
                      onChange={(e) => setFormSincronia({ ...formSincronia, porcentajeFloracionMacho: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Estado de Sincronía:</label>
                    <select
                      value={formSincronia.estadoSincronia}
                      onChange={(e) => setFormSincronia({ ...formSincronia, estadoSincronia: e.target.value as SincroniaFloral['estadoSincronia'] })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg text-xs"
                    >
                      <option value="Sincronizado">Sincronizado</option>
                      <option value="Macho adelantado">Macho adelantado</option>
                      <option value="Macho retrasado">Macho retrasado</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Días de Desfase:</label>
                    <input
                      type="number"
                      value={formSincronia.diasDesfase}
                      onChange={(e) => setFormSincronia({ ...formSincronia, diasDesfase: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2.5">
                <div className="font-bold text-rose-950 text-[11px] uppercase tracking-wider">
                  Colmenas & Conteo de Pecoreo
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Colmenas Apis:</label>
                    <input
                      type="number"
                      min="0"
                      value={formSincronia.colmenasApisInstaladas}
                      onChange={(e) => setFormSincronia({ ...formSincronia, colmenasApisInstaladas: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Colonias Bombus:</label>
                    <input
                      type="number"
                      min="0"
                      value={formSincronia.colmenasBombusInstaladas}
                      onChange={(e) => setFormSincronia({ ...formSincronia, colmenasBombusInstaladas: Number(e.target.value) })}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Abejas / m²:</label>
                    <input
                      type="number"
                      min="0"
                      value={formSincronia.abejasPorM2}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormSincronia({
                          ...formSincronia,
                          abejasPorM2: val,
                          actividadPolinizadores: calcularCalificacionAbejas(val)
                        });
                      }}
                      className="w-full p-2 border border-stone-300 bg-white rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Calificación de Actividad:</label>
                  <select
                    value={formSincronia.actividadPolinizadores}
                    onChange={(e) => setFormSincronia({ ...formSincronia, actividadPolinizadores: e.target.value as SincroniaFloral['actividadPolinizadores'] })}
                    className="w-full p-2 border border-stone-300 bg-white rounded-lg text-xs"
                  >
                    <option value="Baja (< 10 abejas/m²)">Baja (&lt; 10 abejas/m²)</option>
                    <option value="Media (10-25 abejas/m²)">Media (10-25 abejas/m²)</option>
                    <option value="Óptima (> 25 abejas/m²)">Óptima (&gt; 25 abejas/m²)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Temperatura Ambiente (°C):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formSincronia.temperaturaAmbienteC}
                    onChange={(e) => setFormSincronia({ ...formSincronia, temperaturaAmbienteC: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Humedad Relativa (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formSincronia.humedadRelativa}
                    onChange={(e) => setFormSincronia({ ...formSincronia, humedadRelativa: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Observaciones:</label>
                <textarea
                  rows={2}
                  value={formSincronia.observaciones}
                  onChange={(e) => setFormSincronia({ ...formSincronia, observaciones: e.target.value })}
                  placeholder="Ej. Pecoreo activo al mediodía, buena apertura floral..."
                  className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalSincroniaOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingSincroniaId ? 'Actualizar Registro' : 'Guardar Sincronía & Colmenas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: APLICACIÓN DE POLEN ASISTIDO (CREAR / EDITAR COMPLETO) */}
      {isModalPolenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                {editingPolenId ? 'Editar Aplicación de Polen Asistido' : 'Registrar Aplicación de Polen Asistido'}
              </h3>
              <button onClick={() => setIsModalPolenOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePolen} className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Fecha:</label>
                  <input
                    type="date"
                    value={formPolen.fecha}
                    onChange={(e) => setFormPolen({ ...formPolen, fecha: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Hora de Aplicación:</label>
                  <input
                    type="text"
                    value={formPolen.hora}
                    onChange={(e) => setFormPolen({ ...formPolen, hora: e.target.value })}
                    placeholder="Ej. 10:00"
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Cuarteles Destino:</label>
                <div className="grid grid-cols-2 gap-2 border border-stone-200 p-2.5 rounded-lg bg-stone-50 max-h-32 overflow-y-auto">
                  {parcelas.map((p) => (
                    <label key={p.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPolen.parcelasIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormPolen({ ...formPolen, parcelasIds: [...formPolen.parcelasIds, p.id] });
                          } else {
                            setFormPolen({ ...formPolen, parcelasIds: formPolen.parcelasIds.filter((id) => id !== p.id) });
                          }
                        }}
                        className="rounded text-amber-600"
                      />
                      <span className="text-[11px] font-medium text-stone-800">{p.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Tipo de Polen:</label>
                  <select
                    value={formPolen.tipoPolen}
                    onChange={(e) => setFormPolen({ ...formPolen, tipoPolen: e.target.value as AplicacionPolenAsistido['tipoPolen'] })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  >
                    <option value="Polen Puro Liofilizado Tomuri">Polen Puro Liofilizado Tomuri</option>
                    <option value="Polen Fresco Cosecha Propia">Polen Fresco Cosecha Propia</option>
                    <option value="Polen Comercial Certificado">Polen Comercial Certificado</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Lote del Polen:</label>
                  <input
                    type="text"
                    value={formPolen.lotePolen}
                    onChange={(e) => setFormPolen({ ...formPolen, lotePolen: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Método de Aplicación:</label>
                <select
                  value={formPolen.metodoAplicacion}
                  onChange={(e) => setFormPolen({ ...formPolen, metodoAplicacion: e.target.value as AplicacionPolenAsistido['metodoAplicacion'] })}
                  className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                >
                  <option value="Pulverización Líquida en Suspensión">Pulverización Líquida en Suspensión</option>
                  <option value="Electrostático Neumático (Duster en Seco)">Electrostático Neumático (Duster en Seco)</option>
                  <option value="Aplicador Manual">Aplicador Manual</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Dosis (g/ha):</label>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={formPolen.dosisGramosPorHa}
                    onChange={(e) => setFormPolen({ ...formPolen, dosisGramosPorHa: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">% Viabilidad:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formPolen.viabilidadPolenPorcentaje}
                    onChange={(e) => setFormPolen({ ...formPolen, viabilidadPolenPorcentaje: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Vol. Agua (L/ha):</label>
                  <input
                    type="number"
                    min="0"
                    value={formPolen.volumenAguaLHa}
                    onChange={(e) => setFormPolen({ ...formPolen, volumenAguaLHa: Number(e.target.value) })}
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Equipo / Maquinaria:</label>
                  <input
                    type="text"
                    value={formPolen.equipoMaquinaria}
                    onChange={(e) => setFormPolen({ ...formPolen, equipoMaquinaria: e.target.value })}
                    placeholder="Ej. Nebulizador electrostático"
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Operador:</label>
                  <input
                    type="text"
                    value={formPolen.operador}
                    onChange={(e) => setFormPolen({ ...formPolen, operador: e.target.value })}
                    placeholder="Nombre del aplicador"
                    className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Condiciones Climáticas:</label>
                <input
                  type="text"
                  value={formPolen.condicionesClimaticas}
                  onChange={(e) => setFormPolen({ ...formPolen, condicionesClimaticas: e.target.value })}
                  placeholder="Ej. T° 21.5°C, HR 58%, Viento 3.5 km/h"
                  className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Observaciones:</label>
                <textarea
                  rows={2}
                  value={formPolen.observaciones}
                  onChange={(e) => setFormPolen({ ...formPolen, observaciones: e.target.value })}
                  placeholder="Ej. Aplicación en 40-50% de floración abierta..."
                  className="w-full p-2 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalPolenOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingPolenId ? 'Actualizar Aplicación' : 'Guardar Aplicación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
