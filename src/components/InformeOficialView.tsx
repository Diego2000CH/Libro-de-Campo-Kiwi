import React, { useMemo, useState } from 'react';
import {
  AppStateData,
  CondicionHorasFrio,
  ExplotacionAgricola,
  Parcela,
  RegistroLabor,
  SeguimientoFenologico,
} from '../types/campo';
import {
  FileText,
  Printer,
  Download,
  Upload,
  Award,
  CheckCircle2,
  CheckSquare,
  Square,
  FlaskConical,
  Wrench,
  Tractor,
} from 'lucide-react';
import { exportDataAsJSON, getStoredData, getStoredSectoresRiego } from '../utils/storage';
import { estimarEtapaKiwiPorFrioYGradosDia, normalizarCondicionHorasFrio } from '../utils/agroClimaCalculos';
import { obtenerEtapaFenologicaActiva } from '../utils/fenologiaHelper';
import {
  esItemFitosanitario,
  esItemMaterialRiego,
  exportBodegaFitosanitariosPDF,
  exportBodegaRiegoMaterialesPDF,
  exportLibroCompletoPDF,
  exportMaquinariaPDF,
  PDF_SECTIONS_META,
  PdfSectionKey,
} from '../utils/pdfExport';

interface InformeOficialViewProps {
  explotacion: ExplotacionAgricola;
  parcelas: Parcela[];
  labores: RegistroLabor[];
  horasFrio?: CondicionHorasFrio;
  fenologia?: SeguimientoFenologico[];
  fullData?: AppStateData;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isAdmin?: boolean;
}

export const InformeOficialView: React.FC<InformeOficialViewProps> = ({
  explotacion,
  parcelas,
  labores,
  horasFrio,
  fenologia = [],
  fullData,
  onImportJSON,
  isAdmin = true
}) => {
  const [selectedSections, setSelectedSections] = useState<PdfSectionKey[]>(
    () => PDF_SECTIONS_META.map((s) => s.key)
  );
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);

  const resolvedData: Partial<AppStateData> = useMemo(
    () =>
      fullData ?? {
        explotacion,
        parcelas,
        labores,
        horasFrio,
        fenologia,
      },
    [fullData, explotacion, parcelas, labores, horasFrio, fenologia]
  );

  const sectoresRiego = useMemo(() => getStoredSectoresRiego(), []);
  const inventarioAll = resolvedData.inventario || [];
  const itemsFito = useMemo(() => inventarioAll.filter(esItemFitosanitario), [inventarioAll]);
  const itemsRiegoMat = useMemo(() => inventarioAll.filter(esItemMaterialRiego), [inventarioAll]);
  const maquinariasList = resolvedData.maquinarias || [];
  const mantencionesList = resolvedData.registrosMantencion || [];

  const hfNorm = normalizarCondicionHorasFrio(horasFrio);
  const etapaActual = estimarEtapaKiwiPorFrioYGradosDia(
    hfNorm.totalAcumuladoHF ?? 0,
    hfNorm.metaVariedadHF ?? 850,
    hfNorm.totalAcumuladoGD ?? 0,
    hfNorm.metaVariedadGD ?? 1850
  );
  const etapaRegistrada = obtenerEtapaFenologicaActiva(fenologia);

  const notifyPdf = (message: string) => {
    setPdfFeedback(message);
    window.setTimeout(() => {
      setPdfFeedback((prev) => (prev === message ? null : prev));
    }, 5000);
  };

  const handleToggleSection = (key: PdfSectionKey) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleExportTodoPDF = () => {
    exportLibroCompletoPDF(resolvedData, undefined, sectoresRiego);
    notifyPdf('PDF completo del huerto generado y descargado (todos los módulos).');
  };

  const handleExportSeleccionPDF = () => {
    if (selectedSections.length === 0) return;
    exportLibroCompletoPDF(resolvedData, selectedSections, sectoresRiego);
    notifyPdf(`PDF personalizado generado con ${selectedSections.length} módulo(s).`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Hora',
      'Cuartel',
      'Tipo Labor',
      'Insumo / Producto Comercial',
      'Ingrediente Activo / Composicion',
      'Metodo Aplicacion',
      'Dosis / Ha',
      'Dosis / Planta',
      'Mojamiento L/ha',
      'Total Agua Aplicada (L)',
      'Total Utilizado',
      'Carencia SAG (Dias)',
      'Reingreso REI (Horas)',
      'Objetivo Plaga/Enfermedad',
      'Aplicador / Responsable',
      'Carnet SAG N°',
      'Maquinaria / Tractor',
      'Observaciones'
    ];

    const rows = labores.map((l) => [
      `"${l.fecha}"`,
      `"${l.hora || ''}"`,
      `"${l.parcelaNombre}"`,
      `"${l.tipoLabor}"`,
      `"${l.nombreInsumo || ''}"`,
      `"${l.ingredienteActivo || l.composicionQuimica || ''}"`,
      `"${l.metodoAplicacion || ''}"`,
      `"${l.dosisPorHa || ''}"`,
      `"${l.dosisPorPlanta !== undefined ? `${l.dosisPorPlanta} ${l.unidadDosisPlanta || 'g/planta'}` : ''}"`,
      `"${l.volumenCaldoLHa || ''}"`,
      `"${l.totalAguaAplicadaL ?? ''}"`,
      `"${l.totalInsumoUtilizado ? `${l.totalInsumoUtilizado} ${l.unidadMedida || ''}` : l.volumenM3 ? `${l.volumenM3} m3` : ''}"`,
      `"${l.periodoCarenciaDias || 0}"`,
      `"${l.reingresoHoras || 0}"`,
      `"${l.objetivoPlagaEnfermedad || ''}"`,
      `"${l.aplicadorNombre || l.registradoPor}"`,
      `"${l.numeroCarnetSAG || ''}"`,
      `"${l.tractoristaMaquinaria || ''}"`,
      `"${(l.descripcion || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (explotacion?.nombreFundo || 'fundo_la_cabana').toLowerCase().replace(/\s+/g, '_');
    link.setAttribute('download', `cuaderno_campo_sag_${safeName}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const current = getStoredData();
    exportDataAsJSON(current);
  };

  const laboresFitosanitarias = labores.filter((l) => l.tipoLabor === 'fitosanitario' || l.tipoLabor === 'fertilizacion');

  return (
    <div className="space-y-6">
      {/* Botones de Acción (Ocultos al imprimir) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Award className="w-3 h-3" />
            Resolución SAG N° 2433 / GlobalGAP IFA v6
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Informes Oficiales & Exportación PDF Integral
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Descarga reportes PDF descargables de cualquier módulo o del huerto completo, además del cuaderno oficial imprimible para SAG y GlobalGAP.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportTodoPDF}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Todo a PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cuaderno</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Respaldo JSON</span>
          </button>

          {isAdmin && (
            <label className="px-3 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0">
              <Upload className="w-4 h-4" />
              <span>Importar JSON</span>
              <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* CENTRO DE EXPORTACIÓN PDF INTEGRAL */}
      <div className="no-print bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
          <div>
            <h2 className="text-base font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Centro de Exportación PDF por Módulos</span>
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Descarga informes PDF directos de tus bodegas y maquinaria, o selecciona qué módulos combinar en un único documento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                exportBodegaFitosanitariosPDF(itemsFito, explotacion);
                notifyPdf(`PDF de Bodega Fitosanitarios descargado (${itemsFito.length} productos).`);
              }}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-stone-800 dark:text-stone-200 hover:text-emerald-950 dark:hover:text-emerald-100 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <FlaskConical className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Bodega Fitosanitarios PDF</span>
              <span className="font-mono tabular-nums text-stone-500 dark:text-stone-400">({itemsFito.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportBodegaRiegoMaterialesPDF(itemsRiegoMat, explotacion);
                notifyPdf(`PDF de Bodega Riego & Materiales descargado (${itemsRiegoMat.length} artículos).`);
              }}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800/70 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-stone-800 dark:text-stone-200 hover:text-blue-950 dark:hover:text-blue-100 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Wrench className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Bodega Riego & Materiales PDF</span>
              <span className="font-mono tabular-nums text-stone-500 dark:text-stone-400">({itemsRiegoMat.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportMaquinariaPDF(maquinariasList, mantencionesList, explotacion);
                notifyPdf(`PDF de Maquinaria y Mantenciones descargado (${maquinariasList.length} equipos).`);
              }}
              className="px-3 py-2 bg-stone-50 dark:bg-stone-800/70 hover:bg-amber-50 dark:hover:bg-amber-950/60 text-stone-800 dark:text-stone-200 hover:text-amber-950 dark:hover:text-amber-100 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Tractor className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
              <span>Maquinaria & Mantenciones PDF</span>
              <span className="font-mono tabular-nums text-stone-500 dark:text-stone-400">({maquinariasList.length})</span>
            </button>
          </div>
        </div>

        {pdfFeedback && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span>{pdfFeedback}</span>
          </div>
        )}

        {/* Selector de módulos para PDF combinado */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Armar PDF Combinado ({selectedSections.length} de {PDF_SECTIONS_META.length} módulos seleccionados):
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedSections(PDF_SECTIONS_META.map((s) => s.key))}
                className="px-2.5 py-1 text-[11px] font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg cursor-pointer transition-colors"
              >
                Seleccionar Todo
              </button>
              <button
                type="button"
                onClick={() => setSelectedSections([])}
                className="px-2.5 py-1 text-[11px] font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg cursor-pointer transition-colors"
              >
                Ninguno
              </button>
              <button
                type="button"
                disabled={selectedSections.length === 0}
                onClick={handleExportSeleccionPDF}
                className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Selección a PDF ({selectedSections.length})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {PDF_SECTIONS_META.map((sec) => {
              const checked = selectedSections.includes(sec.key);
              const count = sec.countResolver(resolvedData, sectoresRiego);
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => handleToggleSection(sec.key)}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                    checked
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-stone-900 dark:text-stone-100'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/70'
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{sec.label}</span>
                      <span className="text-[11px] font-mono tabular-nums font-bold text-stone-600 dark:text-stone-400 shrink-0">
                        {count}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug line-clamp-2">
                      {sec.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL IMPRIMIBLE */}
      <div className="print-sheet bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-6 sm:p-10 shadow-sm space-y-6 text-stone-900 dark:text-stone-100 print:border-none print:shadow-none print:p-0">
        {/* Encabezado Oficial */}
        <div className="border-b-2 border-stone-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              República de Chile · Servicio Agrícola y Ganadero (SAG)
            </div>
            <h2 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100 mt-0.5">
              REGISTRO OFICIAL DE APLICACIONES FITOSANITARIAS Y LABORES DE CAMPO
            </h2>
            <div className="text-xs text-stone-600 dark:text-stone-400 font-medium">
              Especie: Kiwi Hayward (<em>Actinidia deliciosa</em>) · Temporada Agrícola 2026
            </div>
          </div>
          <div className="text-right text-xs space-y-0.5 sm:self-end">
            <div className="font-bold text-stone-900 dark:text-stone-100">CUADERNO N° {explotacion?.rut || '76.892.410-K'}-2026</div>
            <div className="text-stone-500 dark:text-stone-400 text-[11px]">Fecha de Emisión: {new Date().toLocaleDateString('es-CL')}</div>
          </div>
        </div>

        {/* Ficha del Predio */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3.5 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-stone-200 dark:border-stone-800">
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Explotación / Predio:</span>
            <strong className="text-stone-900 dark:text-stone-100 font-bold">{explotacion?.nombreFundo || 'Mi Huerto de Kiwis'}</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">RUT del Predio:</span>
            <span className="font-mono font-medium">{explotacion?.rut || '—'}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Ubicación / Comuna:</span>
            <span>{explotacion?.direccion || '—'}{explotacion?.comuna ? `, ${explotacion.comuna}` : ''}{explotacion?.region ? ` (${explotacion.region})` : ''}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Superficie Total:</span>
            <strong className="text-stone-900 dark:text-stone-100">{explotacion?.superficieKiwisHa ?? 0} ha de Kiwis ({explotacion?.superficieTotalHa ?? 0} ha predio)</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Representante Legal:</span>
            <span>{explotacion?.representanteLegal || '—'}{explotacion?.rutRepresentante ? ` (RUT ${explotacion.rutRepresentante})` : ''}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Asesor Agrónomo Responsable:</span>
            <strong>{explotacion?.asesorAgronomo || '—'}</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Registro Colegio Agrónomos:</span>
            <span className="font-mono">{explotacion?.registroColegioAgronomos || '—'}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Certificaciones Vigentes:</span>
            <span className="text-emerald-800 dark:text-emerald-300 font-semibold">{explotacion?.certificaciones?.length ? explotacion.certificaciones.join(', ') : '—'}</span>
          </div>
        </div>

        {/* Resumen Agroclimático Oficial (Horas Frío & Grados Día) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs p-3.5 bg-emerald-50/50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
          <div>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold block">
              Horas Frío (&lt;7.2°C · {hfNorm.fechaInicioHF} a {hfNorm.fechaFinHF}):
            </span>
            <strong className="text-blue-900 dark:text-blue-200 font-mono">
              {hfNorm.totalAcumuladoHF} / {hfNorm.metaVariedadHF} HF
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold block">
              Grados Día (Base {hfNorm.tempBaseGddC}°C · {hfNorm.fechaInicioGD} a {hfNorm.fechaFinGD}):
            </span>
            <strong className="text-amber-900 dark:text-amber-200 font-mono">
              {hfNorm.totalAcumuladoGD} / {hfNorm.metaVariedadGD} °D
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold block">
              {etapaRegistrada
                ? `Estado Fenológico (${etapaRegistrada.escalaBBCH}):`
                : `Estado Fenológico Estimado (${etapaActual.etapaActual.bbch}):`}
            </span>
            <strong className="text-emerald-900 dark:text-emerald-200 block">
              {etapaRegistrada ? etapaRegistrada.nombreEtapa : etapaActual.etapaActual.nombre}
            </strong>
            {etapaRegistrada?.fecha && (
              <span className="text-[10px] font-mono tabular-nums text-stone-600 dark:text-stone-400">
                {etapaRegistrada.fecha}
                {etapaRegistrada.fechaFin ? ` a ${etapaRegistrada.fechaFin}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Tabla Oficial SAG de Aplicaciones de Plaguicidas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 uppercase tracking-wide">
              1. Registro de Aplicaciones Fitosanitarias (Plaguicidas con Registro SAG)
            </h3>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">Total aplicaciones: {laboresFitosanitarias.length}</span>
          </div>

          <div className="overflow-x-auto border border-stone-300 dark:border-stone-700 rounded-xl">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-stone-100 dark:bg-stone-800 border-b border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold uppercase text-[9px]">
                <tr>
                  <th className="p-2 border-r border-stone-300 dark:border-stone-700">Fecha</th>
                  <th className="p-2 border-r border-stone-300 dark:border-stone-700">Cuartel</th>
                  <th className="p-2 border-r border-stone-300 dark:border-stone-700">Producto Comercial</th>
                  <th className="p-2 border-r border-stone-300 dark:border-stone-700">Ing. Activo / Comp.</th>
                  <th className="p-2 border-r border-stone-300 dark:border-stone-700">Dosis (Ha / Planta)</th>
                  <th className="p-2 border-r border-stone-300 dark:border-stone-700">Agua Total (L) / Caldo</th>
                  <th className="p-2 border-r border-stone-300 dark:border-stone-700">Total Utilizado</th>
                  <th className="p-2 border-r border-stone-300 dark:border-stone-700">Carencia (Días)</th>
                  <th className="p-2 border-r border-stone-300 dark:border-stone-700">Reingreso (Hrs)</th>
                  <th className="p-2 border-r border-stone-300 dark:border-stone-700">Objetivo / Método</th>
                  <th className="p-2 border-r border-stone-300 dark:border-stone-700">Aplicador / Carnet SAG</th>
                  <th className="p-2">Firma / V°B°</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {laboresFitosanitarias.map((l) => (
                  <tr key={l.id} className="text-stone-800 dark:text-stone-200">
                    <td className="p-2 font-mono border-r border-stone-200 dark:border-stone-800 whitespace-nowrap">{l.fecha}</td>
                    <td className="p-2 font-semibold border-r border-stone-200 dark:border-stone-800">{l.parcelaNombre}</td>
                    <td className="p-2 font-bold border-r border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100">{l.nombreInsumo}</td>
                    <td className="p-2 border-r border-stone-200 dark:border-stone-800 text-[10px]">
                      {l.ingredienteActivo || l.composicionQuimica || '—'}
                    </td>
                    <td className="p-2 font-mono border-r border-stone-200 dark:border-stone-800">
                      <div>{l.dosisPorHa} {l.unidadMedida}/ha</div>
                      {l.dosisPorPlanta !== undefined && (
                        <div className="text-[10px] text-emerald-800 dark:text-emerald-300">{l.dosisPorPlanta} {l.unidadDosisPlanta || 'g/planta'}</div>
                      )}
                    </td>
                    <td className="p-2 font-mono border-r border-stone-200 dark:border-stone-800">
                      {l.tipoLabor === 'fitosanitario' ? (
                        <>
                          {l.totalAguaAplicadaL ? <strong>{l.totalAguaAplicadaL.toLocaleString('es-CL')} L</strong> : null}
                          <div className="text-[10px] text-stone-500 dark:text-stone-400">{l.volumenCaldoLHa || 1000} L/ha</div>
                        </>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="p-2 font-bold font-mono border-r border-stone-200 dark:border-stone-800">{l.totalInsumoUtilizado} {l.unidadMedida}</td>
                    <td className="p-2 font-bold text-center border-r border-stone-200 dark:border-stone-800">{l.periodoCarenciaDias || 0}d</td>
                    <td className="p-2 font-mono text-center border-r border-stone-200 dark:border-stone-800">{l.reingresoHoras || 12}h</td>
                    <td className="p-2 border-r border-stone-200 dark:border-stone-800 text-[10px]">
                      <div>{l.objetivoPlagaEnfermedad || 'Control Fitosanitario'}</div>
                      {l.metodoAplicacion && <div className="text-stone-500 dark:text-stone-400">{l.metodoAplicacion}</div>}
                    </td>
                    <td className="p-2 border-r border-stone-200 dark:border-stone-800 text-[10px]">
                      <div className="font-semibold">{l.aplicadorNombre || l.registradoPor}</div>
                      {l.numeroCarnetSAG && <div className="font-mono text-stone-500 dark:text-stone-400 font-bold">{l.numeroCarnetSAG}</div>}
                    </td>
                    <td className="p-2 text-center font-serif text-[10px] text-stone-400 italic">
                      Registrado
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Firmas de Responsabilidad Legal */}
        <div className="pt-10 grid grid-cols-2 gap-10 text-center text-xs page-break-inside-avoid">
          <div className="space-y-1">
            <div className="border-b border-stone-400 dark:border-stone-600 w-56 mx-auto h-12" />
            <div className="font-bold text-stone-900 dark:text-stone-100">{explotacion?.asesorAgronomo || 'Asesor Agrónomo'}</div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">Ingeniero Agrónomo Asesor {explotacion?.registroColegioAgronomos ? `(Reg. ${explotacion.registroColegioAgronomos})` : ''}</div>
          </div>

          <div className="space-y-1">
            <div className="border-b border-stone-400 dark:border-stone-600 w-56 mx-auto h-12" />
            <div className="font-bold text-stone-900 dark:text-stone-100">{explotacion?.representanteLegal || 'Representante Legal'}</div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400">Representante Legal · {explotacion?.nombreFundo || 'Mi Huerto'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
