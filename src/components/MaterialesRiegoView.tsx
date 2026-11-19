import React, { useState } from 'react';
import { InsumoInventario, CategoriaMaterial, DestinoProducto, ExplotacionAgricola } from '../types/campo';
import { exportBodegaRiegoMaterialesPDF } from '../utils/pdfExport';
import { 
  Wrench, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Package, 
  Droplet, 
  Scissors, 
  Grid, 
  Shield, 
  Calendar, 
  Layers,
  Sparkles,
  Download
} from 'lucide-react';

interface MaterialesRiegoViewProps {
  inventario: InsumoInventario[];
  onAddInsumo: (insumo: InsumoInventario) => void;
  onUpdateInsumo: (insumo: InsumoInventario) => void;
  onDeleteInsumo: (id: string) => void;
  explotacion?: ExplotacionAgricola;
  canEdit?: boolean;
}

const CATEGORIAS_MATERIALES: { id: string; label: string; icon: string }[] = [
  { id: 'todos', label: 'Todos los Materiales', icon: '📦' },
  { id: 'insumo_riego', label: 'Insumos de Riego', icon: '💧' },
  { id: 'alambre_estructura', label: 'Alambres & Estructura', icon: '⛓️' },
  { id: 'polin_madera', label: 'Polines & Maderas', icon: '🪵' },
  { id: 'malla_cobertor', label: 'Mallas & Cobertores', icon: '🕸️' },
  { id: 'herramienta_equipo', label: 'Herramientas & Equipos', icon: '✂️' },
  { id: 'epp_seguridad', label: 'EPP & Seguridad', icon: '🦺' },
  { id: 'otro', label: 'Ferretería & Otros', icon: '🔩' }
];

const DESTINOS_CONFIG: { id: DestinoProducto; label: string; icon: string }[] = [
  { id: 'kiwi', label: 'Kiwi Hayward', icon: '🥝' },
  { id: 'quinta_frutal', label: 'Quinta Frutal', icon: '🍎' },
  { id: 'vivero', label: 'Vivero', icon: '🌱' },
  { id: 'casa_patronal', label: 'Casa Patronal', icon: '🏡' }
];

export const MaterialesRiegoView: React.FC<MaterialesRiegoViewProps> = ({
  inventario,
  onAddInsumo,
  onUpdateInsumo,
  onDeleteInsumo,
  explotacion,
  canEdit = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');
  const [selectedDestino, setSelectedDestino] = useState<string>('todos');

  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InsumoInventario | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<InsumoInventario | null>(null);
  const [reponiendoId, setReponiendoId] = useState<string | null>(null);
  const [cantidadReponer, setCantidadReponer] = useState<number>(10);

  // Formulario Materiales
  const [formMaterial, setFormMaterial] = useState<{
    nombreComercial: string;
    categoriaMaterial: CategoriaMaterial;
    fabricante: string;
    especificacionTecnica: string;
    stockActual: number;
    stockMinimo: number;
    unidad: InsumoInventario['unidad'];
    costoUnitarioCLP: number;
    fechaElaboracion: string;
    fechaVencimiento: string;
    destinosUso: DestinoProducto[];
    ubicacionBodega: string;
    observaciones: string;
  }>({
    nombreComercial: '',
    categoriaMaterial: 'insumo_riego',
    fabricante: '',
    especificacionTecnica: '',
    stockActual: 10,
    stockMinimo: 5,
    unidad: 'unidades',
    costoUnitarioCLP: 0,
    fechaElaboracion: new Date().toISOString().split('T')[0],
    fechaVencimiento: '2030-12-31',
    destinosUso: ['kiwi'],
    ubicacionBodega: 'Bodega de Materiales y Riego',
    observaciones: ''
  });

  // Filtrar solo los materiales, riego y herramientas (excluye fitosanitarios y fertilizantes)
  const materiales = inventario.filter((item) => {
    if (item.categoriaBodega === 'fitosanitario') return false;
    if (item.categoriaBodega === 'material_riego') return true;
    const materialTypes = ['riego', 'alambre', 'polin', 'malla', 'herramienta', 'epp', 'otro'];
    return materialTypes.includes(item.tipo) || (
      item.categoria && ['insumo_riego', 'alambre_estructura', 'polin_madera', 'malla_cobertor', 'herramienta_equipo', 'epp_seguridad', 'otro'].includes(item.categoria)
    );
  });

  // Filtrado por categoría, destino y búsqueda
  const materialesFiltrados = materiales.filter((item) => {
    const itemCat = item.categoriaMaterial || (
      item.tipo === 'riego' ? 'insumo_riego' :
      item.tipo === 'alambre' ? 'alambre_estructura' :
      item.tipo === 'polin' ? 'polin_madera' :
      item.tipo === 'malla' ? 'malla_cobertor' :
      item.tipo === 'herramienta' ? 'herramienta_equipo' :
      item.tipo === 'epp' ? 'epp_seguridad' : 'otro'
    );

    const matchesCat = selectedCategoria === 'todos' || itemCat === selectedCategoria;
    const destinos = item.destinosUso || ['kiwi'];
    const matchesDestino = selectedDestino === 'todos' || destinos.includes(selectedDestino as DestinoProducto);

    const searchString = `${item.nombreComercial} ${item.especificacionTecnica || ''} ${item.fabricante || ''} ${item.ubicacionBodega || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());

    return matchesCat && matchesDestino && matchesSearch;
  });

  const lowStockCount = materiales.filter((i) => i.stockActual <= i.stockMinimo).length;
  const stockOptimoCount = materiales.filter((i) => i.stockActual > i.stockMinimo).length;

  const handleOpenNew = () => {
    const defaultCat = (selectedCategoria !== 'todos' ? selectedCategoria : 'insumo_riego') as CategoriaMaterial;
    setFormMaterial({
      nombreComercial: '',
      categoriaMaterial: defaultCat,
      fabricante: '',
      especificacionTecnica: '',
      stockActual: 10,
      stockMinimo: 5,
      unidad: defaultCat === 'insumo_riego' ? 'unidades' : defaultCat === 'alambre_estructura' ? 'rollos' : defaultCat === 'polin_madera' ? 'unidades' : defaultCat === 'malla_cobertor' ? 'rollos' : 'unidades',
      costoUnitarioCLP: 0,
      fechaElaboracion: new Date().toISOString().split('T')[0],
      fechaVencimiento: '2030-12-31',
      destinosUso: ['kiwi'],
      ubicacionBodega: 'Bodega Materiales - Pañol Central',
      observaciones: ''
    });
    setIsNewModalOpen(true);
  };

  const handleOpenEdit = (item: InsumoInventario) => {
    setEditingItem(item);
    setFormMaterial({
      nombreComercial: item.nombreComercial,
      categoriaMaterial: (item.categoriaMaterial || (item.tipo === 'riego' ? 'insumo_riego' : item.tipo === 'alambre' ? 'alambre_estructura' : item.tipo === 'polin' ? 'polin_madera' : item.tipo === 'malla' ? 'malla_cobertor' : item.tipo === 'herramienta' ? 'herramienta_equipo' : item.tipo === 'epp' ? 'epp_seguridad' : 'otro')) as CategoriaMaterial,
      fabricante: item.fabricante,
      especificacionTecnica: item.especificacionTecnica || item.ingredienteActivo || '',
      stockActual: item.stockActual,
      stockMinimo: item.stockMinimo,
      unidad: item.unidad,
      costoUnitarioCLP: 0,
      fechaElaboracion: item.fechaElaboracion || '2024-01-01',
      fechaVencimiento: item.fechaVencimiento || '2030-12-31',
      destinosUso: item.destinosUso && item.destinosUso.length > 0 ? item.destinosUso : ['kiwi'],
      ubicacionBodega: item.ubicacionBodega || 'Bodega de Materiales',
      observaciones: item.observaciones || ''
    });
    setIsEditModalOpen(true);
  };

  const handleToggleDestino = (dest: DestinoProducto) => {
    setFormMaterial((prev) => {
      const exists = prev.destinosUso.includes(dest);
      if (exists) {
        if (prev.destinosUso.length === 1) return prev;
        return { ...prev, destinosUso: prev.destinosUso.filter((d) => d !== dest) };
      }
      return { ...prev, destinosUso: [...prev.destinosUso, dest] };
    });
  };

  const handleGuardarNuevo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMaterial.nombreComercial) return;

    const tipoMap: Record<string, any> = {
      insumo_riego: 'riego',
      alambre_estructura: 'alambre',
      polin_madera: 'polin',
      malla_cobertor: 'malla',
      herramienta_equipo: 'herramienta',
      epp_seguridad: 'epp',
      otro: 'otro'
    };

    const nuevo: InsumoInventario = {
      id: `mat-${Date.now()}`,
      nombreComercial: formMaterial.nombreComercial,
      categoriaBodega: 'material_riego',
      categoria: formMaterial.categoriaMaterial as any,
      categoriaMaterial: formMaterial.categoriaMaterial,
      tipo: tipoMap[formMaterial.categoriaMaterial] || 'otro',
      especificacionTecnica: formMaterial.especificacionTecnica,
      fabricante: formMaterial.fabricante || 'Proveedor Materiales',
      stockActual: Number(formMaterial.stockActual) || 0,
      stockMinimo: Number(formMaterial.stockMinimo) || 0,
      unidad: formMaterial.unidad,
      costoUnitarioCLP: 0,
      fechaElaboracion: formMaterial.fechaElaboracion,
      fechaVencimiento: formMaterial.fechaVencimiento,
      destinosUso: formMaterial.destinosUso,
      ubicacionBodega: formMaterial.ubicacionBodega,
      observaciones: formMaterial.observaciones,
      consumoHistoricoAcumulado: 0
    };

    onAddInsumo(nuevo);
    setIsNewModalOpen(false);
  };

  const handleGuardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formMaterial.nombreComercial) return;

    const tipoMap: Record<string, any> = {
      insumo_riego: 'riego',
      alambre_estructura: 'alambre',
      polin_madera: 'polin',
      malla_cobertor: 'malla',
      herramienta_equipo: 'herramienta',
      epp_seguridad: 'epp',
      otro: 'otro'
    };

    const actualizado: InsumoInventario = {
      ...editingItem,
      nombreComercial: formMaterial.nombreComercial,
      categoriaBodega: 'material_riego',
      categoria: formMaterial.categoriaMaterial as any,
      categoriaMaterial: formMaterial.categoriaMaterial,
      tipo: tipoMap[formMaterial.categoriaMaterial] || editingItem.tipo,
      especificacionTecnica: formMaterial.especificacionTecnica,
      fabricante: formMaterial.fabricante,
      stockActual: Number(formMaterial.stockActual) || 0,
      stockMinimo: Number(formMaterial.stockMinimo) || 0,
      unidad: formMaterial.unidad,
      costoUnitarioCLP: 0,
      fechaElaboracion: formMaterial.fechaElaboracion,
      fechaVencimiento: formMaterial.fechaVencimiento,
      destinosUso: formMaterial.destinosUso,
      ubicacionBodega: formMaterial.ubicacionBodega,
      observaciones: formMaterial.observaciones
    };

    onUpdateInsumo(actualizado);
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  const handleConfirmarReposicion = (id: string) => {
    const item = inventario.find((i) => i.id === id);
    if (!item) return;
    onUpdateInsumo({
      ...item,
      stockActual: Number((item.stockActual + Number(cantidadReponer)).toFixed(2))
    });
    setReponiendoId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Wrench className="w-3 h-3 text-blue-700" />
            Bodega de Infraestructura, Riego & Herramientas
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Bodega Materiales, Riego & Herramientas
          </h1>
          <p className="text-xs text-stone-500">
            Control de insumos de riego por goteo, alambres de parrón, polines impregnados, mallas sombreadoras y herramientas de campo (separado de productos fitosanitarios).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          <button
            type="button"
            onClick={() => {
              const catName = CATEGORIAS_MATERIALES.find((c) => c.id === selectedCategoria)?.label;
              const filtro = selectedCategoria !== 'todos' || searchTerm ? `${catName || 'Todos'}${searchTerm ? ` · "${searchTerm}"` : ''}` : undefined;
              exportBodegaRiegoMaterialesPDF(materialesFiltrados, explotacion, filtro);
            }}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4 text-blue-900" />
            <span>Exportar PDF ({materialesFiltrados.length})</span>
          </button>

          {canEdit && (
            <button
              onClick={handleOpenNew}
              className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Material o Herramienta</span>
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Stock Crítico */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="font-bold">Alerta de Pañol: {lowStockCount} materiales con stock bajo el umbral mínimo.</strong>
              <div className="text-[11px] text-amber-800 mt-0.5">
                Revise repuestos de goteros, mangueras y tensores antes de faenas de poda y amarraje.
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] uppercase shrink-0">
            Comprar Repuestos
          </span>
        </div>
      )}

      {/* Tarjetas de Métricas de Materiales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Total Artículos Registrados</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{materiales.length}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Equipos, riego y ferretería</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Stock en Nivel Óptimo</div>
          <div className="text-2xl font-black text-blue-950 mt-1 font-mono tabular-nums">{stockOptimoCount}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Artículos sobre umbral mínimo</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Bajo Stock Mínimo</div>
          <div className={`text-2xl font-black mt-1 ${lowStockCount > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
            {lowStockCount}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Alertas de reposición</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Artículos Visibles</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{materialesFiltrados.length}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">En filtros actuales</div>
        </div>
      </div>

      {/* Pestañas de Categorías de Materiales */}
      <div className="bg-white rounded-2xl border border-stone-200 p-2 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {CATEGORIAS_MATERIALES.map((cat) => {
            const isSelected = selectedCategoria === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoria(cat.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtros por Destino y Búsqueda */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, medida, fabricante o ubicación en pañol..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-700"
          />
        </div>

        {/* Filtro Destino */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-stone-400 font-bold text-[11px] uppercase mr-1">Destino:</span>
          <button
            onClick={() => setSelectedDestino('todos')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              selectedDestino === 'todos' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Todos
          </button>
          {DESTINOS_CONFIG.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDestino(d.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1 ${
                selectedDestino === d.id ? 'bg-blue-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Materiales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materialesFiltrados.map((item) => {
          const isLow = item.stockActual <= item.stockMinimo;
          const destinos = item.destinosUso || ['kiwi'];

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between transition-all ${
                isLow ? 'border-amber-300 ring-1 ring-amber-200' : 'border-stone-200 hover:border-blue-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 uppercase">
                        {(item.categoriaMaterial || item.categoria || item.tipo).replace('_', ' ')}
                      </span>
                      {item.ubicacionBodega && (
                        <span className="text-[10px] text-stone-500 font-medium">
                          {item.ubicacionBodega}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-stone-900 text-sm mt-1">{item.nombreComercial}</h3>
                    <div className="text-[11px] text-stone-500">{item.fabricante}</div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                    isLow ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isLow ? 'STOCK BAJO' : 'OK'}
                  </span>
                </div>

                {/* Especificación Técnica */}
                {item.especificacionTecnica && (
                  <div className="mt-2.5 p-2 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-700">
                    <span className="text-[10px] text-stone-400 font-bold uppercase block">Ficha Técnica:</span>
                    <span className="font-medium text-[11px]">{item.especificacionTecnica}</span>
                  </div>
                )}

                {/* Stock Actual y Mínimo */}
                <div className="flex items-baseline justify-between p-3 bg-stone-50 rounded-xl border border-stone-200 mt-2.5">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Stock Disponible</span>
                    <div className={`text-2xl font-black ${isLow ? 'text-amber-800' : 'text-blue-950'}`}>
                      {item.stockActual} <span className="text-xs font-semibold text-stone-500">{item.unidad}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Stock Mínimo</span>
                    <span className="font-mono text-xs font-bold text-stone-600">{item.stockMinimo} {item.unidad}</span>
                  </div>
                </div>

                {/* Trazabilidad: Fechas */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-600 mt-2.5">
                  <div className="p-1.5 bg-stone-50 rounded-lg">
                    <span className="text-stone-400 block text-[10px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-stone-400" /> F. Elaboración:
                    </span>
                    <strong className="font-mono text-stone-800">{item.fechaElaboracion || 'N/A'}</strong>
                  </div>
                  <div className="p-1.5 bg-stone-50 rounded-lg">
                    <span className="text-stone-400 block text-[10px]">F. Vencimiento / Garantía:</span>
                    <strong className="font-mono text-stone-900">{item.fechaVencimiento || 'N/A'}</strong>
                  </div>
                </div>

                {/* Destinos Autorizados */}
                <div className="mt-2.5 pt-2 border-t border-stone-100">
                  <span className="text-[10px] font-bold text-stone-400 uppercase block mb-1">Destinado a:</span>
                  <div className="flex flex-wrap gap-1">
                    {destinos.map((d) => {
                      const cfg = DESTINOS_CONFIG.find((c) => c.id === d);
                      return (
                        <span key={d} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-200 flex items-center gap-1">
                          <span>{cfg?.icon}</span>
                          <span>{cfg?.label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {item.observaciones && (
                  <p className="text-[11px] text-stone-500 italic mt-2 bg-stone-50 p-1.5 rounded-lg border border-stone-100">
                    "{item.observaciones}"
                  </p>
                )}
              </div>

              {/* Botones de Acción */}
              {canEdit && (
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100 mt-3">
                  <button
                    onClick={() => {
                      setReponiendoId(item.id);
                      setCantidadReponer(item.stockMinimo * 2 || 10);
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Reponer
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Editar material"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => setMaterialToDelete(item)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Eliminar material"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL: Reposición Rápida */}
      {reponiendoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 p-5 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-stone-900">Ingreso de Material a Pañol</h3>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Cantidad a Ingresar en Stock:</label>
              <input
                type="number"
                step="0.5"
                value={cantidadReponer}
                onChange={(e) => setCantidadReponer(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-base text-blue-950"
                min="0.1"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setReponiendoId(null)}
                className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmarReposicion(reponiendoId)}
                className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg cursor-pointer"
              >
                Confirmar Ingreso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Material o Herramienta */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 overflow-hidden">
            <div className="bg-blue-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-400" />
                Registrar Nuevo Material o Herramienta
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-blue-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleGuardarNuevo} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Categoría del Material:</label>
                  <select
                    value={formMaterial.categoriaMaterial}
                    onChange={(e) => setFormMaterial({ ...formMaterial, categoriaMaterial: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-blue-950"
                  >
                    <option value="insumo_riego">Insumos de Riego (Goteros, Tuberías, Válvulas)</option>
                    <option value="alambre_estructura">Alambres Acerados & Tensores</option>
                    <option value="polin_madera">Polines & Maderas Impregnadas</option>
                    <option value="malla_cobertor">Mallas Raschel & Cobertores</option>
                    <option value="herramienta_equipo">Herramientas (Tijeras, Penetrómetros)</option>
                    <option value="epp_seguridad">EPP & Seguridad</option>
                    <option value="otro">Ferretería & Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre Comercial / Descripción:</label>
                  <input
                    type="text"
                    value={formMaterial.nombreComercial}
                    onChange={(e) => setFormMaterial({ ...formMaterial, nombreComercial: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    placeholder="ej. Gotero Autocompensado Netafim 4 L/h"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Especificación Técnica / Medidas:</label>
                  <input
                    type="text"
                    value={formMaterial.especificacionTecnica}
                    onChange={(e) => setFormMaterial({ ...formMaterial, especificacionTecnica: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="ej. Diámetro 4-5 pulgadas, largo 2.40m CCA"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fabricante o Proveedor:</label>
                  <input
                    type="text"
                    value={formMaterial.fabricante}
                    onChange={(e) => setFormMaterial({ ...formMaterial, fabricante: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="ej. Netafim, Inchalam, Felco, Marienberg"
                  />
                </div>
              </div>

              {/* Fechas de Elaboración / Adquisición y Vencimiento */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha de Elaboración / Adquisición:</label>
                  <input
                    type="date"
                    value={formMaterial.fechaElaboracion}
                    onChange={(e) => setFormMaterial({ ...formMaterial, fechaElaboracion: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha de Vencimiento / Garantía:</label>
                  <input
                    type="date"
                    value={formMaterial.fechaVencimiento}
                    onChange={(e) => setFormMaterial({ ...formMaterial, fechaVencimiento: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-blue-900"
                    required
                  />
                </div>
              </div>

              {/* Destinos */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Destinado a:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DESTINOS_CONFIG.map((d) => {
                    const isChecked = formMaterial.destinosUso.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleToggleDestino(d.id)}
                        className={`p-2 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-blue-100 border-blue-400 text-blue-950 ring-1 ring-blue-300'
                            : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-base">{d.icon}</span>
                        <span>{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock y Unidad */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Inicial:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formMaterial.stockActual}
                    onChange={(e) => setFormMaterial({ ...formMaterial, stockActual: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Mínimo:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formMaterial.stockMinimo}
                    onChange={(e) => setFormMaterial({ ...formMaterial, stockMinimo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Unidad:</label>
                  <select
                    value={formMaterial.unidad}
                    onChange={(e) => setFormMaterial({ ...formMaterial, unidad: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="unidades">Unidades (c/u)</option>
                    <option value="metros">Metros (m)</option>
                    <option value="rollos">Rollos</option>
                    <option value="pares">Pares</option>
                    <option value="kg">Kilos (kg)</option>
                    <option value="L">Litros (L)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Ubicación en Pañol / Galpón:</label>
                <input
                  type="text"
                  value={formMaterial.ubicacionBodega}
                  onChange={(e) => setFormMaterial({ ...formMaterial, ubicacionBodega: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="ej. Rack Mallas, Caseta Riego, Estante 2"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones:</label>
                <textarea
                  value={formMaterial.observaciones}
                  onChange={(e) => setFormMaterial({ ...formMaterial, observaciones: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="Detalles sobre asignación, vida útil, repuestos..."
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
                  className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Guardar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Material (100% Editable) */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                Editar Material: {editingItem.nombreComercial}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-stone-300 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleGuardarEdicion} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Categoría del Material:</label>
                  <select
                    value={formMaterial.categoriaMaterial}
                    onChange={(e) => setFormMaterial({ ...formMaterial, categoriaMaterial: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-blue-950"
                  >
                    <option value="insumo_riego">Insumos de Riego</option>
                    <option value="alambre_estructura">Alambres Acerados & Tensores</option>
                    <option value="polin_madera">Polines & Maderas</option>
                    <option value="malla_cobertor">Mallas Raschel & Cobertores</option>
                    <option value="herramienta_equipo">Herramientas & Equipos</option>
                    <option value="epp_seguridad">EPP & Seguridad</option>
                    <option value="otro">Ferretería & Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre Comercial:</label>
                  <input
                    type="text"
                    value={formMaterial.nombreComercial}
                    onChange={(e) => setFormMaterial({ ...formMaterial, nombreComercial: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Especificación Técnica:</label>
                  <input
                    type="text"
                    value={formMaterial.especificacionTecnica}
                    onChange={(e) => setFormMaterial({ ...formMaterial, especificacionTecnica: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fabricante o Proveedor:</label>
                  <input
                    type="text"
                    value={formMaterial.fabricante}
                    onChange={(e) => setFormMaterial({ ...formMaterial, fabricante: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha Elaboración / Adquisición:</label>
                  <input
                    type="date"
                    value={formMaterial.fechaElaboracion}
                    onChange={(e) => setFormMaterial({ ...formMaterial, fechaElaboracion: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha Vencimiento / Garantía:</label>
                  <input
                    type="date"
                    value={formMaterial.fechaVencimiento}
                    onChange={(e) => setFormMaterial({ ...formMaterial, fechaVencimiento: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-blue-900"
                    required
                  />
                </div>
              </div>

              {/* Destinos */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Destinado a:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DESTINOS_CONFIG.map((d) => {
                    const isChecked = formMaterial.destinosUso.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleToggleDestino(d.id)}
                        className={`p-2 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-blue-100 border-blue-400 text-blue-950 ring-1 ring-blue-300'
                            : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-base">{d.icon}</span>
                        <span>{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock y Unidad */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Actual:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formMaterial.stockActual}
                    onChange={(e) => setFormMaterial({ ...formMaterial, stockActual: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-blue-950"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Mínimo:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formMaterial.stockMinimo}
                    onChange={(e) => setFormMaterial({ ...formMaterial, stockMinimo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Unidad:</label>
                  <select
                    value={formMaterial.unidad}
                    onChange={(e) => setFormMaterial({ ...formMaterial, unidad: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="unidades">Unidades (c/u)</option>
                    <option value="metros">Metros (m)</option>
                    <option value="rollos">Rollos</option>
                    <option value="pares">Pares</option>
                    <option value="kg">Kilos (kg)</option>
                    <option value="L">Litros (L)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Ubicación en Pañol:</label>
                <input
                  type="text"
                  value={formMaterial.ubicacionBodega}
                  onChange={(e) => setFormMaterial({ ...formMaterial, ubicacionBodega: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones:</label>
                <textarea
                  value={formMaterial.observaciones}
                  onChange={(e) => setFormMaterial({ ...formMaterial, observaciones: e.target.value })}
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
                  Guardar Modificaciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Eliminación de Material */}
      {materialToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Eliminar Material / Herramienta</h3>
              <button onClick={() => setMaterialToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-stone-700">
                ¿Estás seguro de que deseas eliminar <strong>{materialToDelete.nombreComercial}</strong> del pañol de materiales e insumos?
              </p>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-600 text-[11px]">
                Stock registrado: <strong>{materialToDelete.stockActual} {materialToDelete.unidad}</strong>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setMaterialToDelete(null)}
                  className="px-3.5 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteInsumo(materialToDelete.id);
                    setMaterialToDelete(null);
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
