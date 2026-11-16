import React from 'react';
import { ExplotacionAgricola, Parcela, RegistroLabor } from '../types/campo';
import { 
  FileText, 
  Printer, 
  Download, 
  Upload, 
  ShieldCheck, 
  Award,
  CheckCircle2
} from 'lucide-react';
import { exportDataAsJSON, getStoredData } from '../utils/storage';

interface InformeOficialViewProps {
  explotacion: ExplotacionAgricola;
  parcelas: Parcela[];
  labores: RegistroLabor[];
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const InformeOficialView: React.FC<InformeOficialViewProps> = ({
  explotacion,
  parcelas,
  labores,
  onImportJSON
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Fecha',
      'Hora',
      'Cuartel',
      'Tipo Labor',
      'Insumo / Producto',
      'Dosis / Ha',
      'Volumen Caldo L/ha',
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
      `"${l.dosisPorHa || ''}"`,
      `"${l.volumenCaldoLHa || ''}"`,
      `"${l.totalInsumoUtilizado ? `${l.totalInsumoUtilizado} ${l.unidadMedida || ''}` : l.volumenM3 ? `${l.volumenM3} m3` : ''}"`,
      `"${l.periodoCarenciaDias || 0}"`,
      `"${l.reingresoHoras || 0}"`,
      `"${l.objetivoPlagaEnfermedad || ''}"`,
      `"${l.registradoPor}"`,
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
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Award className="w-3 h-3" />
            Resolución SAG N° 2433 / GlobalGAP IFA v6
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Cuaderno de Campo Oficial para Fiscalización
          </h1>
          <p className="text-xs text-stone-500">
            Formato oficial estandarizado para inspectores del SAG, certificadoras internacionales y trazabilidad de exportación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cuaderno Oficial</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel / CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Copia Respaldo JSON</span>
          </button>

          <label className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Importar JSON</span>
            <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
          </label>
        </div>
      </div>

      {/* DOCUMENTO OFICIAL IMPRIMIBLE */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-10 shadow-sm space-y-6 text-stone-900 print:border-none print:shadow-none print:p-0">
        {/* Encabezado Oficial */}
        <div className="border-b-2 border-stone-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              República de Chile · Servicio Agrícola y Ganadero (SAG)
            </div>
            <h2 className="text-2xl font-black tracking-tight text-stone-900 mt-0.5">
              REGISTRO OFICIAL DE APLICACIONES FITOSANITARIAS Y LABORES DE CAMPO
            </h2>
            <div className="text-xs text-stone-600 font-medium">
              Especie: Kiwi Hayward (<em>Actinidia deliciosa</em>) · Temporada Agrícola 2026
            </div>
          </div>
          <div className="text-right text-xs space-y-0.5 sm:self-end">
            <div className="font-bold text-stone-900">CUADERNO N° {explotacion?.rut || '76.892.410-K'}-2026</div>
            <div className="text-stone-500 text-[11px]">Fecha de Emisión: {new Date().toLocaleDateString('es-CL')}</div>
          </div>
        </div>

        {/* Ficha del Predio */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3.5 bg-stone-50 rounded-xl border border-stone-200">
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Explotación / Predio:</span>
            <strong className="text-stone-900 font-bold">{explotacion?.nombreFundo || 'Fundo La Cabaña'}</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">RUT del Predio:</span>
            <span className="font-mono font-medium">{explotacion?.rut || '76.892.410-K'}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Ubicación / Comuna:</span>
            <span>{explotacion?.direccion || 'Camino Los Niches Km 8.4'}, {explotacion?.comuna || 'Curicó'} ({explotacion?.region || 'Maule'})</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Superficie Total:</span>
            <strong className="text-stone-900">{explotacion?.superficieKiwisHa ?? 12.5} ha de Kiwis ({explotacion?.superficieTotalHa ?? 15.0} ha predio)</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Representante Legal:</span>
            <span>{explotacion?.representanteLegal || 'Rodrigo Valenzuela'} (RUT {explotacion?.rutRepresentante || '12.456.789-0'})</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Asesor Agrónomo Responsable:</span>
            <strong>{explotacion?.asesorAgronomo || 'Rodrigo Valenzuela'}</strong>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Registro Colegio Agrónomos:</span>
            <span className="font-mono">{explotacion?.registroColegioAgronomos || 'COL-AGR-4912'}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Certificaciones Vigentes:</span>
            <span className="text-emerald-800 font-semibold">{(explotacion?.certificaciones || ['GlobalGAP IFA v6', 'Buenas Prácticas Agrícolas SAG']).join(', ')}</span>
          </div>
        </div>

        {/* Tabla Oficial SAG de Aplicaciones de Plaguicidas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
              1. Registro de Aplicaciones Fitosanitarias (Plaguicidas con Registro SAG)
            </h3>
            <span className="text-[11px] text-stone-500 font-mono">Total aplicaciones: {laboresFitosanitarias.length}</span>
          </div>

          <div className="overflow-x-auto border border-stone-300 rounded-xl">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-stone-100 border-b border-stone-300 text-stone-700 font-bold uppercase text-[9px]">
                <tr>
                  <th className="p-2 border-r border-stone-300">Fecha</th>
                  <th className="p-2 border-r border-stone-300">Cuartel</th>
                  <th className="p-2 border-r border-stone-300">Producto Comercial</th>
                  <th className="p-2 border-r border-stone-300">Reg. SAG</th>
                  <th className="p-2 border-r border-stone-300">Dosis/Ha</th>
                  <th className="p-2 border-r border-stone-300">Mojamiento L/ha</th>
                  <th className="p-2 border-r border-stone-300">Total Utilizado</th>
                  <th className="p-2 border-r border-stone-300">Carencia (Días)</th>
                  <th className="p-2 border-r border-stone-300">Reingreso (Hrs)</th>
                  <th className="p-2 border-r border-stone-300">Objetivo / Plaga</th>
                  <th className="p-2 border-r border-stone-300">Aplicador / Carnet SAG</th>
                  <th className="p-2">Firma / V°B°</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {laboresFitosanitarias.map((l) => (
                  <tr key={l.id} className="text-stone-800">
                    <td className="p-2 font-mono border-r border-stone-200 whitespace-nowrap">{l.fecha}</td>
                    <td className="p-2 font-semibold border-r border-stone-200">{l.parcelaNombre}</td>
                    <td className="p-2 font-bold border-r border-stone-200 text-stone-900">{l.nombreInsumo}</td>
                    <td className="p-2 font-mono border-r border-stone-200 whitespace-nowrap">SAG</td>
                    <td className="p-2 font-mono border-r border-stone-200">{l.dosisPorHa} {l.unidadMedida}/ha</td>
                    <td className="p-2 font-mono border-r border-stone-200">{l.volumenCaldoLHa || 1000} L</td>
                    <td className="p-2 font-bold font-mono border-r border-stone-200">{l.totalInsumoUtilizado} {l.unidadMedida}</td>
                    <td className="p-2 font-bold text-center border-r border-stone-200">{l.periodoCarenciaDias || 0}d</td>
                    <td className="p-2 font-mono text-center border-r border-stone-200">{l.reingresoHoras || 12}h</td>
                    <td className="p-2 border-r border-stone-200 text-[10px]">{l.objetivoPlagaEnfermedad || 'Control Fitosanitario'}</td>
                    <td className="p-2 border-r border-stone-200 text-[10px]">
                      <div>{l.registradoPor}</div>
                      {l.numeroCarnetSAG && <div className="font-mono text-stone-500 font-bold">{l.numeroCarnetSAG}</div>}
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
            <div className="border-b border-stone-400 w-56 mx-auto h-12" />
            <div className="font-bold text-stone-900">{explotacion?.asesorAgronomo || 'Rodrigo Valenzuela'}</div>
            <div className="text-[11px] text-stone-500">Ingeniero Agrónomo Asesor (Reg. SAG / Col. 4912)</div>
          </div>

          <div className="space-y-1">
            <div className="border-b border-stone-400 w-56 mx-auto h-12" />
            <div className="font-bold text-stone-900">{explotacion?.representanteLegal || 'Rodrigo Valenzuela'}</div>
            <div className="text-[11px] text-stone-500">Representante Legal · {explotacion?.nombreFundo || 'Fundo La Cabaña'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
