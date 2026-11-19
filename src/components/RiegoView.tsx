import React, { useState, useEffect } from 'react';
import {
  TurnoRiego,
  SectorRiego,
  Parcela,
  ClimaCondiciones,
  ExplotacionAgricola,
  MetodoRiego
} from '../types/campo';
import { getStoredSectoresRiego, saveStoredSectoresRiego } from '../utils/storage';
import { exportRiegoPDF } from '../utils/pdfExport';
import {
  Droplet,
  Plus,
  Trash2,
  Edit3,
  Clock,
  FileSpreadsheet,
  Layers,
  Activity,
  AlertCircle,
  Settings,
  Waves,
  Zap,
  Download,
  Gauge,
  Filter,
  FlaskConical,
  CheckSquare,
  Square
} from 'lucide-react';

interface RiegoViewProps {
  turnosRiego: TurnoRiego[];
  onAddTurnoRiego: (turno: TurnoRiego) => void;
  onUpdateTurnoRiego: (turno: TurnoRiego) => void;
  onDeleteTurnoRiego: (id: string) => void;
  parcelas: Parcela[];
  clima?: ClimaCondiciones;
  explotacion?: ExplotacionAgricola;
  canEdit?: boolean;
}

const EFICIENCIA_POR_METODO: Record<MetodoRiego, number> = {
  Goteo: 90,
  Microaspersión: 85,
  'Aspersión Antihelada': 75,
  'Surco / Tendido': 60,
  Otro: 85
};

function calcularDuracionEntreHoras(inicio?: string, termino?: string): number {
  if (!inicio || !termino) return 0;
  const [hi, mi] = inicio.split(':').map(Number);
  const [ht, mt] = termino.split(':').map(Number);
  if ([hi, mi, ht, mt].some((n) => Number.isNaN(n))) return 0;
  let minsInicio = hi * 60 + mi;
  let minsTermino = ht * 60 + mt;
  if (minsTermino < minsInicio) {
    minsTermino += 24 * 60; // Turno nocturno que cruza medianoche
  }
  const diffHrs = (minsTermino - minsInicio) / 60;
  return Number(diffHrs.toFixed(2));
}

function sumarHorasAHora(inicio: string, duracionHrs: number): string {
  const [hi, mi] = inicio.split(':').map(Number);
  if (Number.isNaN(hi) || Number.isNaN(mi) || duracionHrs <= 0) return inicio;
  const totalMins = (hi * 60 + mi + Math.round(duracionHrs * 60)) % (24 * 60);
  const hh = Math.floor(totalMins / 60)
    .toString()
    .padStart(2, '0');
  const mm = (totalMins % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function calcularCaudalLs(volumenM3: number, duracionHoras: number): number {
  if (volumenM3 <= 0 || duracionHoras <= 0) return 0;
  return Number(((volumenM3 * 1000) / (duracionHoras * 3600)).toFixed(2));
}

function calcularLaminaBruta(volumenM3: number, superficieHa: number): number {
  if (volumenM3 <= 0 || superficieHa <= 0) return 0;
  return Number((volumenM3 / (superficieHa * 10)).toFixed(1));
}

function calcularLaminaNeta(laminaBrutaMm: number, eficienciaPct: number): number {
  if (laminaBrutaMm <= 0 || eficienciaPct <= 0) return 0;
  return Number((laminaBrutaMm * (eficienciaPct / 100)).toFixed(1));
}

export const RiegoView: React.FC<RiegoViewProps> = ({
  turnosRiego,
  onAddTurnoRiego,
  onUpdateTurnoRiego,
  onDeleteTurnoRiego,
  parcelas,
  clima,
  explotacion,
  canEdit = true
}) => {
  const [isNewTurnoOpen, setIsNewTurnoOpen] = useState(false);
  const [isEditTurnoOpen, setIsEditTurnoOpen] = useState(false);
  const [editingTurno, setEditingTurno] = useState<TurnoRiego | null>(null);
  const [turnoToDelete, setTurnoToDelete] = useState<TurnoRiego | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Sectores de Riego dinámicos
  const [sectoresRiego, setSectoresRiego] = useState<SectorRiego[]>(getStoredSectoresRiego);
  const [isSectoresModalOpen, setIsSectoresModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<SectorRiego | null>(null);
  const [sectorForm, setSectorForm] = useState<SectorRiego>({
    id: 1,
    nombre: '',
    ha: 0,
    caudalDisenoLs: 0,
    descripcion: ''
  });

  useEffect(() => {
    const handleUpdate = () => {
      setSectoresRiego(getStoredSectoresRiego());
    };
    window.addEventListener('fundo_sectores_updated', handleUpdate);
    return () => window.removeEventListener('fundo_sectores_updated', handleUpdate);
  }, []);

  const saveSectores = (newSectores: SectorRiego[]) => {
    setSectoresRiego(newSectores);
    saveStoredSectoresRiego(newSectores);
  };

  // Métricas globales reales
  const totalHorasRegadas = turnosRiego.reduce((acc, t) => acc + (t.duracionHoras || 0), 0);
  const totalM3Riego = turnosRiego.reduce((acc, t) => acc + (t.volumenM3 || 0), 0);
  const totalLaminaMm = turnosRiego.reduce((acc, t) => acc + (t.laminaAguaMm || 0), 0);
  const laminaPromedio = turnosRiego.length > 0 ? (totalLaminaMm / turnosRiego.length).toFixed(1) : '0.0';
  const totalLaminaNetaMm = turnosRiego.reduce((acc, t) => {
    const ef = t.eficienciaRiegoPct ?? 90;
    const neta = t.laminaNetaMm ?? calcularLaminaNeta(t.laminaAguaMm || 0, ef);
    return acc + neta;
  }, 0);
  const laminaNetaPromedio =
    turnosRiego.length > 0 ? (totalLaminaNetaMm / turnosRiego.length).toFixed(1) : '0.0';

  const ultimoCaudalimetroM3 =
    turnosRiego.length > 0
      ? Math.max(...turnosRiego.map((t) => t.caudalimetroFinalM3 || 0))
      : 0;

  const caudalPromedioLs = (() => {
    const valid = turnosRiego
      .map((t) => t.caudalMedidoLs ?? calcularCaudalLs(t.volumenM3 || 0, t.duracionHoras || 0))
      .filter((q) => q > 0);
    if (valid.length === 0) return '0.00';
    return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2);
  })();

  // Demanda hídrica diaria de referencia
  const etoActual = clima?.evapotranspiracionEtoMmDia ?? 0;
  const kcEstimado = 1.05; // Kc Kiwi Hayward pleno crecimiento
  const demandaEtc = Number((etoActual * kcEstimado).toFixed(1));

  const [formTurno, setFormTurno] = useState<Partial<TurnoRiego>>({
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: '08:00',
    horaTermino: '12:00',
    sectorRiegoId: '',
    sectorNombre: '',
    cuartelesIds: [],
    cuartelesInvolucrados: [],
    superficieRegadaHa: 0,
    metodoRiego: 'Goteo',
    duracionHoras: 4,
    laminaAguaMm: 0,
    laminaNetaMm: 0,
    eficienciaRiegoPct: 90,
    volumenM3: 0,
    caudalimetroInicialM3: 0,
    caudalimetroFinalM3: 0,
    caudalInicialLs: undefined,
    caudalFinalLs: undefined,
    caudalMedidoLs: 0,
    conFertirriego: false,
    fertilizanteInyectado: '',
    dosisFertilizanteKg: 0,
    presionPreFiltroBar: undefined,
    presionCabezalBar: 0,
    presionFinLineaBar: 0,
    estadoFiltros: 'Limpios',
    ceAguaDsM: undefined,
    phAgua: undefined,
    tensionSueloCb: undefined,
    humedadSueloPct: undefined,
    etoReferenciaMm: etoActual || undefined,
    kcAplicado: kcEstimado,
    operadorRiego: '',
    observaciones: ''
  });

  const getParcelasForSector = (secId?: number | string): Parcela[] => {
    if (secId === undefined || secId === '') return [];
    return parcelas.filter(
      (p) =>
        (p.sectoresRiego && p.sectoresRiego.some((s) => String(s) === String(secId))) ||
        String(p.sectorRiegoNumero) === String(secId)
    );
  };

  const resolveSuperficieHa = (secId: number | string | undefined, selectedParcelasIds: string[]): number => {
    const selectedHa = parcelas
      .filter((p) => selectedParcelasIds.includes(p.id))
      .reduce((acc, p) => acc + (p.superficieHa || 0), 0);
    if (selectedHa > 0) return Number(selectedHa.toFixed(2));
    const sec = sectoresRiego.find((s) => String(s.id) === String(secId));
    return sec?.ha && sec.ha > 0 ? Number(sec.ha.toFixed(2)) : 0;
  };

  // Recalcular derivados hidráulicos consistentemente
  const recomputeHydraulics = (
    draft: Partial<TurnoRiego>,
    options?: { preferSectorFlowIfNoVol?: boolean }
  ): Partial<TurnoRiego> => {
    const dur = Math.max(0, Number(draft.duracionHoras ?? 0));
    const supHa = Math.max(0, Number(draft.superficieRegadaHa ?? 0));
    const ef = Math.min(100, Math.max(10, Number(draft.eficienciaRiegoPct ?? 90)));
    const ini = Number(draft.caudalimetroInicialM3 ?? 0);
    const fin = Number(draft.caudalimetroFinalM3 ?? 0);

    let vol = Math.max(0, Number(draft.volumenM3 ?? 0));
    if (fin > ini) {
      vol = Number((fin - ini).toFixed(2));
    } else if (options?.preferSectorFlowIfNoVol && vol === 0 && dur > 0) {
      const sec = sectoresRiego.find((s) => String(s.id) === String(draft.sectorRiegoId));
      if (sec?.caudalDisenoLs && sec.caudalDisenoLs > 0) {
        vol = Number(((sec.caudalDisenoLs * dur * 3600) / 1000).toFixed(1));
      }
    }

    const qMedido = calcularCaudalLs(vol, dur);
    const lamBruta = supHa > 0 ? calcularLaminaBruta(vol, supHa) : Number(draft.laminaAguaMm ?? 0);
    const lamNeta = calcularLaminaNeta(lamBruta, ef);

    return {
      ...draft,
      volumenM3: vol,
      caudalMedidoLs: qMedido,
      laminaAguaMm: lamBruta,
      laminaNetaMm: lamNeta,
      eficienciaRiegoPct: ef
    };
  };

  const handleOpenNewTurno = (sectorIdPreset?: number | string) => {
    setFormError(null);
    const sec = sectorIdPreset
      ? sectoresRiego.find((s) => String(s.id) === String(sectorIdPreset))
      : sectoresRiego[0];
    const secId = sec?.id ?? '';
    const matchedParcelas = getParcelasForSector(secId);
    const ids = matchedParcelas.map((p) => p.id);
    const nombres = matchedParcelas.map((p) => p.nombre);
    const supHa = resolveSuperficieHa(secId, ids);
    const horaIni = '08:00';
    const horaFin = '12:00';
    const dur = calcularDuracionEntreHoras(horaIni, horaFin);

    const base: Partial<TurnoRiego> = {
      fecha: new Date().toISOString().split('T')[0],
      horaInicio: horaIni,
      horaTermino: horaFin,
      sectorRiegoId: secId,
      sectorNombre: sec?.nombre || '',
      cuartelesIds: ids,
      cuartelesInvolucrados: nombres,
      superficieRegadaHa: supHa,
      metodoRiego: 'Goteo',
      duracionHoras: dur,
      eficienciaRiegoPct: 90,
      caudalimetroInicialM3: ultimoCaudalimetroM3,
      caudalimetroFinalM3: ultimoCaudalimetroM3,
      volumenM3: 0,
      laminaAguaMm: 0,
      laminaNetaMm: 0,
      caudalInicialLs: undefined,
      caudalFinalLs: undefined,
      caudalMedidoLs: 0,
      conFertirriego: false,
      fertilizanteInyectado: '',
      dosisFertilizanteKg: 0,
      presionPreFiltroBar: undefined,
      presionCabezalBar: 0,
      presionFinLineaBar: 0,
      estadoFiltros: 'Limpios',
      ceAguaDsM: undefined,
      phAgua: undefined,
      tensionSueloCb: undefined,
      humedadSueloPct: undefined,
      etoReferenciaMm: etoActual || undefined,
      kcAplicado: kcEstimado,
      operadorRiego: '',
      observaciones: ''
    };

    setFormTurno(recomputeHydraulics(base, { preferSectorFlowIfNoVol: true }));
    setIsNewTurnoOpen(true);
  };

  const handleOpenEditTurno = (turno: TurnoRiego) => {
    setFormError(null);
    setEditingTurno(turno);
    const inferredIds =
      turno.cuartelesIds && turno.cuartelesIds.length > 0
        ? turno.cuartelesIds
        : parcelas
            .filter((p) => turno.cuartelesInvolucrados?.includes(p.nombre))
            .map((p) => p.id);
    const supHa =
      turno.superficieRegadaHa && turno.superficieRegadaHa > 0
        ? turno.superficieRegadaHa
        : resolveSuperficieHa(turno.sectorRiegoId, inferredIds);
    const ef = turno.eficienciaRiegoPct ?? EFICIENCIA_POR_METODO[turno.metodoRiego || 'Goteo'] ?? 90;

    setFormTurno(
      recomputeHydraulics({
        ...turno,
        cuartelesIds: inferredIds,
        superficieRegadaHa: supHa,
        metodoRiego: turno.metodoRiego || 'Goteo',
        eficienciaRiegoPct: ef,
        estadoFiltros: turno.estadoFiltros || 'Limpios',
        caudalimetroInicialM3: turno.caudalimetroInicialM3 ?? 0,
        caudalimetroFinalM3: turno.caudalimetroFinalM3 ?? 0
      })
    );
    setIsEditTurnoOpen(true);
  };

  const handleSectorChange = (secId: string | number) => {
    const sec = sectoresRiego.find((s) => String(s.id) === String(secId));
    const matchedParcelas = getParcelasForSector(secId);
    const ids = matchedParcelas.map((p) => p.id);
    const nombres = matchedParcelas.map((p) => p.nombre);
    const supHa = resolveSuperficieHa(secId, ids);

    setFormTurno((prev) =>
      recomputeHydraulics(
        {
          ...prev,
          sectorRiegoId: secId,
          sectorNombre: sec?.nombre || `Sector ${secId}`,
          cuartelesIds: ids,
          cuartelesInvolucrados: nombres,
          superficieRegadaHa: supHa
        },
        { preferSectorFlowIfNoVol: (prev.caudalimetroFinalM3 ?? 0) <= (prev.caudalimetroInicialM3 ?? 0) }
      )
    );
  };

  const handleToggleCuartel = (parcela: Parcela) => {
    setFormTurno((prev) => {
      const currentIds = prev.cuartelesIds || [];
      const exists = currentIds.includes(parcela.id);
      const nextIds = exists
        ? currentIds.filter((id) => id !== parcela.id)
        : [...currentIds, parcela.id];
      const nextNames = parcelas
        .filter((p) => nextIds.includes(p.id))
        .map((p) => p.nombre);
      const nextSup = resolveSuperficieHa(prev.sectorRiegoId, nextIds);
      return recomputeHydraulics({
        ...prev,
        cuartelesIds: nextIds,
        cuartelesInvolucrados: nextNames,
        superficieRegadaHa: nextSup
      });
    });
  };

  const handleHoraChange = (field: 'horaInicio' | 'horaTermino', val: string) => {
    setFormTurno((prev) => {
      const nextInicio = field === 'horaInicio' ? val : prev.horaInicio || '08:00';
      const nextTermino = field === 'horaTermino' ? val : prev.horaTermino || '';
      const dur = nextTermino ? calcularDuracionEntreHoras(nextInicio, nextTermino) : prev.duracionHoras || 0;
      const hasMeterDelta = (prev.caudalimetroFinalM3 ?? 0) > (prev.caudalimetroInicialM3 ?? 0);
      return recomputeHydraulics(
        {
          ...prev,
          [field]: val,
          duracionHoras: dur,
          volumenM3: hasMeterDelta ? prev.volumenM3 : 0
        },
        { preferSectorFlowIfNoVol: !hasMeterDelta }
      );
    });
  };

  const handleDuracionChange = (hrs: number) => {
    setFormTurno((prev) => {
      const hasMeterDelta = (prev.caudalimetroFinalM3 ?? 0) > (prev.caudalimetroInicialM3 ?? 0);
      const nextTermino =
        prev.horaInicio && hrs > 0 ? sumarHorasAHora(prev.horaInicio, hrs) : prev.horaTermino;
      return recomputeHydraulics(
        {
          ...prev,
          duracionHoras: hrs,
          horaTermino: nextTermino,
          volumenM3: hasMeterDelta ? prev.volumenM3 : 0
        },
        { preferSectorFlowIfNoVol: !hasMeterDelta }
      );
    });
  };

  const handleCaudalimetroChange = (
    field: 'caudalimetroInicialM3' | 'caudalimetroFinalM3',
    value: number
  ) => {
    setFormTurno((prev) => recomputeHydraulics({ ...prev, [field]: value }));
  };

  const handleMetodoChange = (metodo: MetodoRiego) => {
    const ef = EFICIENCIA_POR_METODO[metodo] ?? 90;
    setFormTurno((prev) => recomputeHydraulics({ ...prev, metodoRiego: metodo, eficienciaRiegoPct: ef }));
  };

  const handleVolumenManualChange = (vol: number) => {
    setFormTurno((prev) => {
      const dur = prev.duracionHoras || 0;
      const supHa = prev.superficieRegadaHa || 0;
      const ef = prev.eficienciaRiegoPct || 90;
      const lamBruta = supHa > 0 ? calcularLaminaBruta(vol, supHa) : prev.laminaAguaMm || 0;
      return {
        ...prev,
        volumenM3: vol,
        caudalMedidoLs: calcularCaudalLs(vol, dur),
        laminaAguaMm: lamBruta,
        laminaNetaMm: calcularLaminaNeta(lamBruta, ef)
      };
    });
  };

  const buildTurnoPayload = (baseId?: string): TurnoRiego | null => {
    const caudIni = Number(formTurno.caudalimetroInicialM3 ?? 0);
    const caudFin = Number(formTurno.caudalimetroFinalM3 ?? 0);
    if (caudFin > 0 && caudFin < caudIni) {
      setFormError(
        `El caudalímetro final (${caudFin} m³) no puede ser menor al caudalímetro inicial (${caudIni} m³).`
      );
      return null;
    }

    const duracion = Number(formTurno.duracionHoras ?? 0);
    if (duracion <= 0) {
      setFormError('La duración del turno debe ser mayor a 0 horas.');
      return null;
    }

    const volFinal =
      caudFin > caudIni ? Number((caudFin - caudIni).toFixed(2)) : Number(formTurno.volumenM3 ?? 0);
    const supHa = Number(formTurno.superficieRegadaHa ?? 0);
    const ef = Number(formTurno.eficienciaRiegoPct ?? 90);
    const lamBruta =
      supHa > 0 && volFinal > 0
        ? calcularLaminaBruta(volFinal, supHa)
        : Number(formTurno.laminaAguaMm ?? 0);
    const lamNeta = calcularLaminaNeta(lamBruta, ef);
    const qMedido =
      volFinal > 0
        ? calcularCaudalLs(volFinal, duracion)
        : formTurno.caudalInicialLs || formTurno.caudalFinalLs
        ? Number(
            (
              ((formTurno.caudalInicialLs ?? formTurno.caudalFinalLs ?? 0) +
                (formTurno.caudalFinalLs ?? formTurno.caudalInicialLs ?? 0)) /
              2
            ).toFixed(2)
          )
        : 0;

    return {
      id: baseId || `tr-${Date.now()}`,
      fecha: formTurno.fecha || new Date().toISOString().split('T')[0],
      horaInicio: formTurno.horaInicio || '08:00',
      horaTermino: formTurno.horaTermino || '',
      sectorRiegoId: formTurno.sectorRiegoId || formTurno.sectorNombre || 'general',
      sectorNombre: formTurno.sectorNombre || `Sector ${formTurno.sectorRiegoId || 1}`,
      cuartelesIds: formTurno.cuartelesIds || [],
      cuartelesInvolucrados: formTurno.cuartelesInvolucrados || [],
      superficieRegadaHa: supHa,
      metodoRiego: formTurno.metodoRiego || 'Goteo',
      duracionHoras: duracion,
      laminaAguaMm: lamBruta,
      laminaNetaMm: lamNeta,
      eficienciaRiegoPct: ef,
      volumenM3: volFinal,
      caudalimetroInicialM3: caudIni,
      caudalimetroFinalM3: caudFin,
      caudalInicialLs: formTurno.caudalInicialLs,
      caudalFinalLs: formTurno.caudalFinalLs,
      caudalMedidoLs: qMedido,
      conFertirriego: !!formTurno.conFertirriego,
      fertilizanteInyectado: formTurno.conFertirriego ? formTurno.fertilizanteInyectado : '',
      dosisFertilizanteKg: formTurno.conFertirriego ? formTurno.dosisFertilizanteKg : 0,
      presionPreFiltroBar: formTurno.presionPreFiltroBar,
      presionCabezalBar: Number(formTurno.presionCabezalBar ?? 0),
      presionFinLineaBar: Number(formTurno.presionFinLineaBar ?? 0),
      estadoFiltros: formTurno.estadoFiltros || 'Limpios',
      ceAguaDsM: formTurno.ceAguaDsM,
      phAgua: formTurno.phAgua,
      tensionSueloCb: formTurno.tensionSueloCb,
      humedadSueloPct: formTurno.humedadSueloPct,
      etoReferenciaMm: formTurno.etoReferenciaMm,
      kcAplicado: formTurno.kcAplicado,
      operadorRiego: formTurno.operadorRiego || 'Operador de Riego',
      observaciones: formTurno.observaciones || ''
    };
  };

  const handleSaveNewTurno = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const payload = buildTurnoPayload();
    if (!payload) return;
    onAddTurnoRiego(payload);
    setIsNewTurnoOpen(false);
  };

  const handleSaveEditTurno = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTurno) return;
    setFormError(null);
    const payload = buildTurnoPayload(editingTurno.id);
    if (!payload) return;
    onUpdateTurnoRiego(payload);
    setIsEditTurnoOpen(false);
    setEditingTurno(null);
  };

  // Gestión de Sectores
  const handleOpenAddSector = () => {
    const nextId =
      sectoresRiego.length > 0
        ? Math.max(...sectoresRiego.map((s) => (typeof s.id === 'number' ? s.id : parseInt(String(s.id)) || 0))) + 1
        : 1;
    setEditingSector(null);
    setSectorForm({
      id: nextId,
      nombre: `Sector ${nextId}`,
      ha: 0,
      caudalDisenoLs: 0,
      descripcion: ''
    });
  };

  const handleOpenEditSector = (sec: SectorRiego) => {
    setEditingSector(sec);
    setSectorForm({ ...sec });
  };

  const handleSaveSector = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSector) {
      saveSectores(sectoresRiego.map((s) => (s.id === editingSector.id ? sectorForm : s)));
    } else {
      saveSectores([...sectoresRiego, sectorForm]);
    }
    setEditingSector(null);
    setSectorForm({
      id: Date.now(),
      nombre: '',
      ha: 0,
      caudalDisenoLs: 0,
      descripcion: ''
    });
  };

  const handleDeleteSector = (id: number | string) => {
    saveSectores(sectoresRiego.filter((s) => s.id !== id));
    if (editingSector?.id === id) setEditingSector(null);
  };

  const meterDiffPreview =
    (formTurno.caudalimetroFinalM3 ?? 0) > (formTurno.caudalimetroInicialM3 ?? 0)
      ? Number(((formTurno.caudalimetroFinalM3 ?? 0) - (formTurno.caudalimetroInicialM3 ?? 0)).toFixed(2))
      : 0;
  const volPreview = Number(formTurno.volumenM3 ?? 0);
  const supPreview = Number(formTurno.superficieRegadaHa ?? 0);
  const m3PorHaPreview = supPreview > 0 && volPreview > 0 ? (volPreview / supPreview).toFixed(1) : '—';
  const qM3HoraPreview =
    (formTurno.duracionHoras ?? 0) > 0 && volPreview > 0
      ? (volPreview / (formTurno.duracionHoras || 1)).toFixed(1)
      : '0.0';
  const deltaPresionFiltro =
    formTurno.presionPreFiltroBar !== undefined && (formTurno.presionCabezalBar ?? 0) > 0
      ? Number((formTurno.presionPreFiltroBar - (formTurno.presionCabezalBar ?? 0)).toFixed(2))
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-800 mb-1">
            <Droplet className="w-3.5 h-3.5 text-cyan-700" />
            <span>Manejo Hídrico & Medición Estándar</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Control de Riego, Caudalímetros y Parámetros Hidráulicos
          </h1>
          <p className="text-xs text-stone-500">
            Registro por caudalímetro (inicial/final m³), caudal L/s, lámina bruta/neta, eficiencia, presiones de filtros/línea, CE/pH y humedad de suelo.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          <button
            type="button"
            onClick={() => exportRiegoPDF(turnosRiego, sectoresRiego, explotacion)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-cyan-800" />
            <span>Exportar PDF ({turnosRiego.length})</span>
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setIsSectoresModalOpen(true)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Settings className="w-3.5 h-3.5 text-stone-600" />
                <span>Gestionar Sectores</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenNewTurno()}
                className="px-4 py-2 bg-cyan-800 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Turno de Riego</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tarjetas de Resumen Hídrico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Horas Regadas</span>
            <Clock className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono tabular-nums">
            {totalHorasRegadas.toFixed(1)} hrs
          </div>
          <p className="text-[11px] text-stone-500">{turnosRiego.length} turnos registrados</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Volumen & Caudalímetro</span>
            <Waves className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono tabular-nums">
            {totalM3Riego.toLocaleString('es-CL')} m³
          </div>
          <p className="text-[11px] text-stone-500 font-mono tabular-nums">
            {ultimoCaudalimetroM3 > 0
              ? `Últ. lectura: ${ultimoCaudalimetroM3.toLocaleString('es-CL')} m³`
              : `${(totalM3Riego * 1000).toLocaleString('es-CL')} litros totales`}
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Caudal Operativo Prom.</span>
            <Gauge className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono tabular-nums">
            {caudalPromedioLs} L/s
          </div>
          <p className="text-[11px] text-stone-500 font-mono tabular-nums">
            ≈ {(Number(caudalPromedioLs) * 3.6).toFixed(1)} m³/hora
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Lámina Bruta / Neta</span>
            <Droplet className="w-4 h-4 text-cyan-700" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono tabular-nums">
            {laminaPromedio} mm
          </div>
          <p className="text-[11px] text-cyan-800 font-mono tabular-nums font-semibold">
            Neta prom.: {laminaNetaPromedio} mm/turno
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Demanda Huerto (ETc)</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono tabular-nums">
            {demandaEtc} mm/día
          </div>
          <p className="text-[11px] text-emerald-700 font-medium font-mono tabular-nums">
            ETo ({etoActual}) × Kc ({kcEstimado})
          </p>
        </div>
      </div>

      {/* Grid de los Sectores de Riego */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-700" />
            Sectores de Riego del Huerto ({sectoresRiego.length} sectores)
          </h2>
          <span className="text-xs text-stone-400 font-mono tabular-nums">
            Superficie bajo riego: {sectoresRiego.reduce((a, s) => a + (s.ha || 0), 0).toFixed(1)} ha
          </span>
        </div>

        {sectoresRiego.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-dashed border-stone-300 text-center space-y-2">
            <p className="text-xs font-bold text-stone-700">No hay sectores de riego configurados todavía.</p>
            <p className="text-[11px] text-stone-500">
              Agrega tus sectores reales de riego para calcular láminas, caudales y asociar cuarteles automáticamente.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsSectoresModalOpen(true)}
                className="px-3 py-1.5 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Configurar Sectores de Riego</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sectoresRiego.map((sec) => {
              const cuarteles = getParcelasForSector(sec.id);
              const turnosSector = turnosRiego.filter((t) => String(t.sectorRiegoId) === String(sec.id));
              const ultTurno = turnosSector[0];

              return (
                <div
                  key={sec.id}
                  className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-900 font-extrabold text-[11px]">
                      Sector {sec.id}
                    </span>
                    <span className="text-xs font-mono font-bold text-stone-700 tabular-nums">
                      {sec.ha || 0} ha
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-stone-900 text-sm leading-tight">{sec.nombre}</h3>
                    <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
                      {sec.descripcion || 'Sin descripción técnica'}
                    </p>
                  </div>

                  <div className="p-2.5 bg-stone-50 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Caudal de diseño:</span>
                      <strong className="text-stone-900 font-mono tabular-nums">{sec.caudalDisenoLs || 0} L/s</strong>
                    </div>
                    <div className="flex justify-between text-stone-600 gap-2">
                      <span>Cuarteles:</span>
                      <strong className="text-cyan-800 text-right">
                        {cuarteles.length > 0 ? cuarteles.map((c) => c.codigoCuartel).join(', ') : 'Ninguno'}
                      </strong>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>Último riego:</span>
                      <strong className="text-stone-700 font-mono">{ultTurno ? ultTurno.fecha : 'Sin registros'}</strong>
                    </div>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenNewTurno(sec.id)}
                      className="w-full py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-cyan-700" />
                      <span>Regar este Sector</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bitácora de Turnos de Riego */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden space-y-0">
        <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-700" />
            <h2 className="font-bold text-sm text-stone-900">Bitácora Oficial de Turnos de Riego</h2>
            <span className="text-xs text-stone-400 font-mono tabular-nums">({turnosRiego.length} registros)</span>
          </div>
          <div className="text-[11px] text-stone-500">
            Trazabilidad hidráulica estándar: caudalímetros, caudales, láminas bruta/neta, presiones y suelo
          </div>
        </div>

        {turnosRiego.length === 0 ? (
          <div className="p-8 text-center text-stone-400 space-y-2">
            <Droplet className="w-10 h-10 mx-auto text-stone-300" />
            <p className="font-bold text-sm text-stone-700">No hay turnos de riego registrados</p>
            <p className="text-xs">Comienza registrando el primer turno de riego con tus parámetros estándar y caudalímetro.</p>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleOpenNewTurno()}
                className="mt-2 px-3 py-1.5 bg-cyan-800 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Turno</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="p-3">Fecha & Horario</th>
                  <th className="p-3">Sector / Método / Cuarteles</th>
                  <th className="p-3">Duración & Caudal</th>
                  <th className="p-3">Caudalímetro (Ini / Fin)</th>
                  <th className="p-3">Volumen (m³)</th>
                  <th className="p-3">Lámina Bruta / Neta</th>
                  <th className="p-3">Presiones & Filtros</th>
                  <th className="p-3">Agua & Suelo</th>
                  <th className="p-3">Fertirriego</th>
                  <th className="p-3">Operador</th>
                  {canEdit && <th className="p-3 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {turnosRiego.map((turno) => {
                  const qMedido =
                    turno.caudalMedidoLs ?? calcularCaudalLs(turno.volumenM3 || 0, turno.duracionHoras || 0);
                  const ef = turno.eficienciaRiegoPct ?? 90;
                  const neta = turno.laminaNetaMm ?? calcularLaminaNeta(turno.laminaAguaMm || 0, ef);
                  return (
                    <tr key={turno.id} className="hover:bg-cyan-50/40 transition-colors align-top">
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-stone-900 font-mono">{turno.fecha}</div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {turno.horaInicio}
                          {turno.horaTermino ? ` - ${turno.horaTermino}` : ''}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-extrabold text-cyan-950">{turno.sectorNombre}</div>
                        <div className="text-[10px] font-semibold text-stone-600">
                          {turno.metodoRiego || 'Goteo'}
                          {turno.superficieRegadaHa ? ` · ${turno.superficieRegadaHa} ha` : ''}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {turno.cuartelesInvolucrados?.length
                            ? turno.cuartelesInvolucrados.join(', ')
                            : 'Sin cuartel asignado'}
                        </div>
                      </td>
                      <td className="p-3 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-stone-900">{turno.duracionHoras} hrs</div>
                        <div className="text-[11px] text-indigo-800 font-semibold">
                          {qMedido > 0 ? `${qMedido} L/s` : '—'}
                        </div>
                        {turno.duracionHoras > 0 && turno.volumenM3 > 0 && (
                          <div className="text-[10px] text-stone-400">
                            {(turno.volumenM3 / turno.duracionHoras).toFixed(1)} m³/h
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-stone-700 tabular-nums whitespace-nowrap">
                        {turno.caudalimetroInicialM3 !== undefined || turno.caudalimetroFinalM3 !== undefined ? (
                          <div>
                            <div>
                              Ini:{' '}
                              <strong className="text-stone-900">
                                {(turno.caudalimetroInicialM3 ?? 0).toLocaleString('es-CL')}
                              </strong>
                            </div>
                            <div>
                              Fin:{' '}
                              <strong className="text-cyan-900">
                                {(turno.caudalimetroFinalM3 ?? 0).toLocaleString('es-CL')}
                              </strong>
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="p-3 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-stone-900">{turno.volumenM3.toLocaleString('es-CL')} m³</div>
                        {turno.superficieRegadaHa && turno.superficieRegadaHa > 0 && (
                          <div className="text-[10px] text-stone-500">
                            {(turno.volumenM3 / turno.superficieRegadaHa).toFixed(1)} m³/ha
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-black text-cyan-800">{turno.laminaAguaMm} mm bruta</div>
                        <div className="text-[11px] text-emerald-700 font-semibold">
                          {neta} mm neta ({ef}%)
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                        {turno.presionPreFiltroBar !== undefined && (
                          <div>Pre: <strong>{turno.presionPreFiltroBar}b</strong></div>
                        )}
                        <div>
                          Cab: <strong>{turno.presionCabezalBar}b</strong> · Fin:{' '}
                          <strong>{turno.presionFinLineaBar}b</strong>
                        </div>
                        <div className="text-[10px] text-stone-500 font-sans">
                          Filtros: {turno.estadoFiltros || 'Limpios'}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-stone-600 whitespace-nowrap">
                        {turno.ceAguaDsM !== undefined ||
                        turno.phAgua !== undefined ||
                        turno.tensionSueloCb !== undefined ||
                        turno.humedadSueloPct !== undefined ? (
                          <div className="space-y-0.5">
                            {turno.ceAguaDsM !== undefined && <div>CE: {turno.ceAguaDsM} dS/m</div>}
                            {turno.phAgua !== undefined && <div>pH: {turno.phAgua}</div>}
                            {turno.tensionSueloCb !== undefined && <div>Tens: {turno.tensionSueloCb} cb</div>}
                            {turno.humedadSueloPct !== undefined && <div>Hum: {turno.humedadSueloPct}%</div>}
                          </div>
                        ) : (
                          <span className="text-stone-400 font-sans">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {turno.conFertirriego ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                            <Zap className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>
                              {turno.fertilizanteInyectado || 'Fertirriego'}{' '}
                              {turno.dosisFertilizanteKg ? `(${turno.dosisFertilizanteKg} kg)` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 text-[11px]">Agua pura</span>
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-stone-600">{turno.operadorRiego}</td>
                      {canEdit && (
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTurno(turno)}
                              className="p-1.5 text-stone-500 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar turno"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTurnoToDelete(turno)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar turno"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* MODAL NUEVO / EDITAR TURNO */}
      {(isNewTurnoOpen || isEditTurnoOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-stone-200 overflow-hidden">
            <div className="bg-cyan-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Droplet className="w-4 h-4 text-cyan-300" />
                {isEditTurnoOpen ? 'Editar Turno de Riego' : 'Registrar Turno de Riego con Parámetros Estándar'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsNewTurnoOpen(false);
                  setIsEditTurnoOpen(false);
                }}
                className="text-cyan-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={isEditTurnoOpen ? handleSaveEditTurno : handleSaveNewTurno}
              className="p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto"
            >
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Sector, Fecha, Horario y Duración */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Sector de Riego:</label>
                  {sectoresRiego.length > 0 ? (
                    <select
                      value={formTurno.sectorRiegoId}
                      onChange={(e) => handleSectorChange(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                      required
                    >
                      <option value="" disabled>
                        Seleccionar sector...
                      </option>
                      {sectoresRiego.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} ({s.ha || 0} ha)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formTurno.sectorNombre || ''}
                      onChange={(e) => setFormTurno({ ...formTurno, sectorNombre: e.target.value })}
                      placeholder="Ej. Sector 1 o Cuartel Norte"
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Método de Riego:</label>
                  <select
                    value={formTurno.metodoRiego || 'Goteo'}
                    onChange={(e) => handleMetodoChange(e.target.value as MetodoRiego)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-semibold"
                  >
                    <option value="Goteo">Goteo (Efic. 90%)</option>
                    <option value="Microaspersión">Microaspersión (Efic. 85%)</option>
                    <option value="Aspersión Antihelada">Aspersión Antihelada (Efic. 75%)</option>
                    <option value="Surco / Tendido">Surco / Tendido (Efic. 60%)</option>
                    <option value="Otro">Otro (Efic. 85%)</option>
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

              {/* Selección de Cuarteles y Superficie real */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-stone-800">
                    Cuarteles Involucrados y Superficie Regada
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-stone-600">Superficie (ha):</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formTurno.superficieRegadaHa ?? 0}
                      onChange={(e) =>
                        setFormTurno((prev) =>
                          recomputeHydraulics({
                            ...prev,
                            superficieRegadaHa: parseFloat(e.target.value) || 0
                          })
                        )
                      }
                      className="w-24 p-1.5 bg-white border border-stone-300 rounded-lg font-mono font-bold text-right tabular-nums"
                    />
                  </div>
                </div>

                {parcelas.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {parcelas.map((p) => {
                      const checked = (formTurno.cuartelesIds || []).includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleToggleCuartel(p)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                            checked
                              ? 'bg-cyan-800 text-white border-cyan-800'
                              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          {checked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          <span>
                            {p.codigoCuartel ? `${p.codigoCuartel} · ` : ''}
                            {p.nombre} ({p.superficieHa} ha)
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Nombre de cuartel(es) regado(s) separados por coma"
                    value={(formTurno.cuartelesInvolucrados || []).join(', ')}
                    onChange={(e) =>
                      setFormTurno({
                        ...formTurno,
                        cuartelesInvolucrados: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Hora Inicio:</label>
                  <input
                    type="time"
                    value={formTurno.horaInicio}
                    onChange={(e) => handleHoraChange('horaInicio', e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Hora Término:</label>
                  <input
                    type="time"
                    value={formTurno.horaTermino}
                    onChange={(e) => handleHoraChange('horaTermino', e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Duración (hrs):</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={formTurno.duracionHoras}
                    onChange={(e) => handleDuracionChange(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold font-mono tabular-nums"
                    required
                  />
                </div>
              </div>

              {/* 2. Caudalímetro (Inicial y Final) + Caudal Medido */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                    <Gauge className="w-4 h-4 text-cyan-700" />
                    <span>Medición por Caudalímetro (Totalizador m³) & Caudales (L/s)</span>
                  </span>
                  {meterDiffPreview > 0 && (
                    <span className="text-[11px] font-mono font-bold text-cyan-800 tabular-nums">
                      Δ Caudalímetro: {meterDiffPreview.toLocaleString('es-CL')} m³
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Caudalímetro Inicial (m³):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formTurno.caudalimetroInicialM3 ?? 0}
                      onChange={(e) =>
                        handleCaudalimetroChange('caudalimetroInicialM3', parseFloat(e.target.value) || 0)
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Caudalímetro Final (m³):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formTurno.caudalimetroFinalM3 ?? 0}
                      onChange={(e) =>
                        handleCaudalimetroChange('caudalimetroFinalM3', parseFloat(e.target.value) || 0)
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-cyan-950 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 mb-1">Caudal Inicial (L/s):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Opcional"
                      value={formTurno.caudalInicialLs ?? ''}
                      onChange={(e) =>
                        setFormTurno({
                          ...formTurno,
                          caudalInicialLs: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 mb-1">Caudal Final (L/s):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Opcional"
                      value={formTurno.caudalFinalLs ?? ''}
                      onChange={(e) =>
                        setFormTurno({
                          ...formTurno,
                          caudalFinalLs: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Volumen, Eficiencia y Lámina Bruta / Neta */}
              <div className="p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl space-y-2.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block font-bold text-cyan-900 mb-1">Volumen Total (m³):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formTurno.volumenM3 ?? 0}
                      onChange={(e) => handleVolumenManualChange(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-cyan-300 rounded-lg font-black font-mono text-cyan-950 tabular-nums"
                      required
                    />
                    <span className="text-[10px] text-cyan-800 font-mono tabular-nums">
                      {m3PorHaPreview !== '—' ? `${m3PorHaPreview} m³/ha` : 'Ingresa ha para m³/ha'}
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-cyan-900 mb-1">Caudal Calculado:</label>
                    <div className="p-2 bg-white border border-cyan-200 rounded-lg font-mono font-black text-indigo-900 tabular-nums">
                      {formTurno.caudalMedidoLs || 0} L/s
                    </div>
                    <span className="text-[10px] text-cyan-800 font-mono tabular-nums">
                      {qM3HoraPreview} m³/hora
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-cyan-900 mb-1">Eficiencia (%):</label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      step="1"
                      value={formTurno.eficienciaRiegoPct ?? 90}
                      onChange={(e) =>
                        setFormTurno((prev) =>
                          recomputeHydraulics({
                            ...prev,
                            eficienciaRiegoPct: parseFloat(e.target.value) || 90
                          })
                        )
                      }
                      className="w-full p-2 bg-white border border-cyan-300 rounded-lg font-bold font-mono text-cyan-950 tabular-nums"
                    />
                    <span className="text-[10px] text-cyan-800">Uniformidad sistema</span>
                  </div>

                  <div>
                    <label className="block font-bold text-cyan-900 mb-1">Lámina Bruta / Neta:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formTurno.laminaAguaMm ?? 0}
                      onChange={(e) => {
                        const bruta = parseFloat(e.target.value) || 0;
                        setFormTurno((prev) => ({
                          ...prev,
                          laminaAguaMm: bruta,
                          laminaNetaMm: calcularLaminaNeta(bruta, prev.eficienciaRiegoPct ?? 90)
                        }));
                      }}
                      className="w-full p-2 bg-white border border-cyan-300 rounded-lg font-black font-mono text-cyan-950 tabular-nums"
                      required
                    />
                    <span className="text-[10px] text-emerald-800 font-bold font-mono tabular-nums">
                      Neta: {formTurno.laminaNetaMm ?? 0} mm
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Presiones Hidráulicas y Control de Filtros */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                    <Filter className="w-3.5 h-3.5 text-cyan-700" />
                    <span>Presiones de Operación (bar) & Cabezal de Filtrado</span>
                  </span>
                  {deltaPresionFiltro !== null && (
                    <span
                      className={`text-[11px] font-mono font-bold tabular-nums ${
                        deltaPresionFiltro > 0.5 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      ΔP Filtros: {deltaPresionFiltro} bar {deltaPresionFiltro > 0.5 ? '(Retrolavar)' : '(OK)'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-semibold text-stone-600 mb-1">Pre-Filtro (bar):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Opcional"
                      value={formTurno.presionPreFiltroBar ?? ''}
                      onChange={(e) =>
                        setFormTurno({
                          ...formTurno,
                          presionPreFiltroBar: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Cabezal / Salida (bar):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formTurno.presionCabezalBar ?? 0}
                      onChange={(e) =>
                        setFormTurno({ ...formTurno, presionCabezalBar: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono tabular-nums"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Fin de Línea (bar):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formTurno.presionFinLineaBar ?? 0}
                      onChange={(e) =>
                        setFormTurno({ ...formTurno, presionFinLineaBar: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono tabular-nums"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Estado de Filtros:</label>
                    <select
                      value={formTurno.estadoFiltros || 'Limpios'}
                      onChange={(e) =>
                        setFormTurno({
                          ...formTurno,
                          estadoFiltros: e.target.value as TurnoRiego['estadoFiltros']
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-semibold"
                    >
                      <option value="Limpios">Limpios</option>
                      <option value="Requiere Retrolavado">Requiere Retrolavado</option>
                      <option value="Mantención">En Mantención</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 5. Calidad de Agua (CE / pH) y Humedad de Suelo (Tensiómetro) */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Parámetros Estándar de Agua y Suelo (Opcional)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-semibold text-stone-600 mb-1">CE Agua (dS/m):</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      placeholder="ej. 0.45"
                      value={formTurno.ceAguaDsM ?? ''}
                      onChange={(e) =>
                        setFormTurno({
                          ...formTurno,
                          ceAguaDsM: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 mb-1">pH Agua / Solución:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="14"
                      placeholder="ej. 6.5"
                      value={formTurno.phAgua ?? ''}
                      onChange={(e) =>
                        setFormTurno({
                          ...formTurno,
                          phAgua: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 mb-1">Tensiómetro Suelo (cb):</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="ej. 18"
                      value={formTurno.tensionSueloCb ?? ''}
                      onChange={(e) =>
                        setFormTurno({
                          ...formTurno,
                          tensionSueloCb: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-600 mb-1">Humedad Suelo (%):</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      placeholder="ej. 28"
                      value={formTurno.humedadSueloPct ?? ''}
                      onChange={(e) =>
                        setFormTurno({
                          ...formTurno,
                          humedadSueloPct: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* 6. Fertirriego */}
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
                        placeholder="ej. Nitrato de Calcio / Ácido Fosfórico"
                        value={formTurno.fertilizanteInyectado || ''}
                        onChange={(e) => setFormTurno({ ...formTurno, fertilizanteInyectado: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-stone-600 mb-1">Dosis Total (kg):</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="ej. 50"
                        value={formTurno.dosisFertilizanteKg || ''}
                        onChange={(e) =>
                          setFormTurno({ ...formTurno, dosisFertilizanteKg: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold tabular-nums"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 7. Operador y Observaciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Operador Responsable:</label>
                  <input
                    type="text"
                    value={formTurno.operadorRiego}
                    onChange={(e) => setFormTurno({ ...formTurno, operadorRiego: e.target.value })}
                    placeholder="Nombre del operador o regador"
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Observaciones Técnicas:</label>
                  <input
                    type="text"
                    value={formTurno.observaciones || ''}
                    onChange={(e) => setFormTurno({ ...formTurno, observaciones: e.target.value })}
                    placeholder="ej. Retrolavado realizado, goteros uniformes."
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewTurnoOpen(false);
                    setIsEditTurnoOpen(false);
                  }}
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
              <button
                type="button"
                onClick={() => setIsSectoresModalOpen(false)}
                className="text-cyan-200 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <p className="text-stone-500">
                  Agrega, renombra, ajusta hectáreas reales y caudales de diseño de cada sector del huerto.
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
                      step="0.01"
                      min="0"
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
                      step="0.1"
                      min="0"
                      value={sectorForm.caudalDisenoLs}
                      onChange={(e) =>
                        setSectorForm({ ...sectorForm, caudalDisenoLs: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Descripción / Tipo de Emisores:</label>
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

              <div className="space-y-2">
                <div className="font-bold text-stone-800 text-xs">Sectores Actuales:</div>
                <div className="space-y-1.5">
                  {sectoresRiego.map((sec) => (
                    <div
                      key={sec.id}
                      className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between hover:border-cyan-300 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-stone-900 text-xs flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 font-extrabold text-[10px]">
                            ID {sec.id}
                          </span>
                          <span>{sec.nombre}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5 font-mono">
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
              Se eliminará el turno del <strong>{turnoToDelete.fecha}</strong> para el{' '}
              <strong>{turnoToDelete.sectorNombre}</strong> ({turnoToDelete.duracionHoras} hrs,{' '}
              {turnoToDelete.volumenM3} m³).
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
