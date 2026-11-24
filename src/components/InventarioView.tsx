import React, { useState } from 'react';
import { InsumoInventario, CategoriaInventario } from '../types/campo';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Wrench,
  Grid,
  Droplets,
  Layers,
  Shield,
  Scissors,
  Check
} from 'lucide-react';
import {
  diasHastaVencimientoProducto,
  formatProductDateLabel,
  getCurrentYearMonth,
  isCategoriaSinVencimientoDefault,
  isFullDayDate,
  isProductoSinVencimiento,
  toDayValue,
  toMonthValue,
} from '../utils/productDates';

interface InventarioViewProps {
  inventario: InsumoInventario[];
  onAddInsumo: (insumo: InsumoInventario) => void;
  onUpdateInsumo: (insumo: InsumoInventario) => void;
  onDeleteInsumo: (id: string) => void;
}

const CATEGORIAS_CONFIG: { id: string; label: string; icon: string; countBadge?: number }[] = [
  { id: 'todos', label: 'Todos los Productos', icon: '📦' },
  { id: 'fitosanitario', label: 'Fitosanitarios', icon: '🧪' },
  { id: 'fertilizante', label: 'Fertilizantes', icon: '🌱' },
  { id: 'insumo_riego', label: 'Insumos de Riego', icon: '💧' },
  { id: 'alambre_estructura', label: 'Alambres & Estructura', icon: '⛓️' },
  { id: 'polin_madera', label: 'Polines & Maderas', icon: '🪵' },
  { id: 'malla_cobertor', label: 'Mallas & Cobertores', icon: '🕸️' },
  { id: 'herramienta_equipo', label: 'Herramientas & Equipos', icon: '✂️' },
  { id: 'epp_seguridad', label: 'EPP & Seguridad', icon: '🦺' },
  { id: 'otro', label: 'Otros Insumos', icon: '📋' }
];

export const InventarioView: React.FC<InventarioViewProps> = ({
  inventario,
  onAddInsumo,
  onUpdateInsumo,
  onDeleteInsumo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');
  
  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<InsumoInventario | null>(null);
  const [insumoToDelete, setInsumoToDelete] = useState<InsumoInventario | null>(null);
  const [reponiendoId, setReponiendoId] = useState<string | null>(null);
  const [cantidadReponer, setCantidadReponer] = useState<number>(10);

  const [usarDiaExacto, setUsarDiaExacto] = useState<boolean>(false);

  // Formulario Base (usado para Crear y Editar)
  const [formData, setFormData] = useState<Partial<InsumoInventario>>({
    nombreComercial: '',
    categoria: 'insumo_riego',
    tipo: 'riego',
    ingredienteActivo: '',
    fabricante: '',
    numeroRegistroSAG: 'N/A',
    stockActual: 10,
    stockMinimo: 5,
    unidad: 'unidades',
    costoUnitarioCLP: 0,
    lote: `LT-${new Date().getFullYear()}`,
    fechaElaboracion: getCurrentYearMonth(),
    sinVencimiento: true,
    fechaVencimiento: '',
    periodoCarenciaDias: 0,
    tiempoReingresoHoras: 0,
    dosisRecomendadaHa: '',
    especificacionTecnica: '',
    ubicacionBodega: 'Bodega Principal',
    observaciones: ''
  });

  // Filtrado
  const insumosFiltrados = inventario.filter((item) => {
    // Normalizar categoría o tipo
    const itemCat = item.categoria || (
      item.tipo === 'fungicida' || item.tipo === 'bactericida' || item.tipo === 'insecticida_acaricida' || item.tipo === 'herbicida' || item.tipo === 'rompedor_dormancia'
        ? 'fitosanitario'
        : item.tipo === 'fertilizante_foliar' || item.tipo === 'fertilizante_suelo'
        ? 'fertilizante'
        : item.tipo === 'riego'
        ? 'insumo_riego'
        : item.tipo === 'alambre'
        ? 'alambre_estructura'
        : item.tipo === 'polin'
        ? 'polin_madera'
        : item.tipo === 'malla'
        ? 'malla_cobertor'
        : item.tipo === 'herramienta'
        ? 'herramienta_equipo'
        : item.tipo === 'epp'
        ? 'epp_seguridad'
        : 'otro'
    );

    const matchesCat = selectedCategoria === 'todos' || itemCat === selectedCategoria;
    const textSearch = `${item.nombreComercial} ${item.ingredienteActivo || ''} ${item.especificacionTecnica || ''} ${item.numeroRegistroSAG || ''} ${item.fabricante || ''} ${item.ubicacionBodega || ''}`.toLowerCase();
    const matchesText = textSearch.includes(searchTerm.toLowerCase());
    return matchesCat && matchesText;
  });

  const lowStockCount = inventario.filter((i) => i.stockActual <= i.stockMinimo).length;
  const stockOptimoCount = inventario.filter((i) => i.stockActual > i.stockMinimo).length;

  // Apertura de modal de edición
  const handleOpenEdit = (insumo: InsumoInventario) => {
    setEditingInsumo(insumo);
    const hasExactDay = isFullDayDate(insumo.fechaElaboracion) || isFullDayDate(insumo.fechaVencimiento);
    setUsarDiaExacto(hasExactDay);
    const sinVenc = isProductoSinVencimiento(insumo);
    setFormData({
      ...insumo,
      fechaElaboracion: hasExactDay ? (insumo.fechaElaboracion || '') : toMonthValue(insumo.fechaElaboracion),
      sinVencimiento: sinVenc,
      fechaVencimiento: sinVenc ? '' : (hasExactDay ? (insumo.fechaVencimiento || '') : toMonthValue(insumo.fechaVencimiento)),
    });
    setIsEditModalOpen(true);
  };

  // Apertura de modal de creación
  const handleOpenNew = () => {
    const defaultCat = (selectedCategoria !== 'todos' ? selectedCategoria : 'insumo_riego') as CategoriaInventario;
    setUsarDiaExacto(false);
    setFormData({
      nombreComercial: '',
      categoria: defaultCat,
      tipo: defaultCat === 'fitosanitario' ? 'fungicida' : defaultCat === 'fertilizante' ? 'fertilizante_suelo' : defaultCat === 'insumo_riego' ? 'riego' : defaultCat === 'alambre_estructura' ? 'alambre' : defaultCat === 'polin_madera' ? 'polin' : defaultCat === 'malla_cobertor' ? 'malla' : defaultCat === 'herramienta_equipo' ? 'herramienta' : defaultCat === 'epp_seguridad' ? 'epp' : 'otro',
      ingredienteActivo: '',
      fabricante: '',
      numeroRegistroSAG: defaultCat === 'fitosanitario' ? 'SAG ' : 'N/A',
      stockActual: 10,
      stockMinimo: 5,
      unidad: defaultCat === 'fitosanitario' || defaultCat === 'fertilizante' ? 'kg' : defaultCat === 'alambre_estructura' ? 'rollos' : defaultCat === 'polin_madera' ? 'unidades' : defaultCat === 'malla_cobertor' ? 'rollos' : defaultCat === 'herramienta_equipo' ? 'unidades' : 'unidades',
      costoUnitarioCLP: 0,
      lote: `LT-${new Date().getFullYear()}`,
      fechaElaboracion: getCurrentYearMonth(),
      sinVencimiento: isCategoriaSinVencimientoDefault(defaultCat),
      fechaVencimiento: '',
      periodoCarenciaDias: 0,
      tiempoReingresoHoras: 0,
      dosisRecomendadaHa: '',
      especificacionTecnica: '',
      ubicacionBodega: 'Bodega de Materiales y Riego',
      observaciones: ''
    });
    setIsNewModalOpen(true);
  };

  // Guardar nuevo insumo
  const handleCrearInsumo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombreComercial) return;

    const cat = formData.categoria || 'otro';
    const tipoMap: Record<string, any> = {
      fitosanitario: 'fungicida',
      fertilizante: 'fertilizante_suelo',
      insumo_riego: 'riego',
      alambre_estructura: 'alambre',
      polin_madera: 'polin',
      malla_cobertor: 'malla',
      herramienta_equipo: 'herramienta',
      epp_seguridad: 'epp',
      otro: 'otro'
    };

    const sinVenc = Boolean(formData.sinVencimiento) || !formData.fechaVencimiento?.trim();
    const nuevo: InsumoInventario = {
      id: `ins-${Date.now()}`,
      nombreComercial: formData.nombreComercial,
      categoriaBodega: (cat === 'fitosanitario' || cat === 'fertilizante') ? 'fitosanitario' : 'material_riego',
      categoria: cat,
      tipo: formData.tipo || tipoMap[cat] || 'otro',
      ingredienteActivo: formData.ingredienteActivo || '',
      fabricante: formData.fabricante || 'Proveedor Agrícola',
      numeroRegistroSAG: formData.numeroRegistroSAG || 'N/A',
      stockActual: Number(formData.stockActual) || 0,
      stockMinimo: Number(formData.stockMinimo) || 0,
      unidad: (formData.unidad as any) || 'unidades',
      costoUnitarioCLP: 0,
      lote: formData.lote || `LT-${Date.now().toString().slice(-4)}`,
      fechaElaboracion: formData.fechaElaboracion?.trim() || undefined,
      sinVencimiento: sinVenc,
      fechaVencimiento: sinVenc ? undefined : formData.fechaVencimiento?.trim(),
      periodoCarenciaDias: Number(formData.periodoCarenciaDias) || 0,
      tiempoReingresoHoras: Number(formData.tiempoReingresoHoras) || 0,
      dosisRecomendadaHa: formData.dosisRecomendadaHa || '',
      especificacionTecnica: formData.especificacionTecnica || '',
      ubicacionBodega: formData.ubicacionBodega || 'Bodega General',
      observaciones: formData.observaciones || '',
      consumoHistoricoAcumulado: 0
    };

    onAddInsumo(nuevo);
    setIsNewModalOpen(false);
  };

  // Guardar edición
  const handleGuardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInsumo || !formData.nombreComercial) return;

    const sinVenc = Boolean(formData.sinVencimiento) || !formData.fechaVencimiento?.trim();
    const actualizado: InsumoInventario = {
      ...editingInsumo,
      ...formData as InsumoInventario,
      fechaElaboracion: formData.fechaElaboracion?.trim() || undefined,
      sinVencimiento: sinVenc,
      fechaVencimiento: sinVenc ? undefined : formData.fechaVencimiento?.trim(),
      stockActual: Number(formData.stockActual) || 0,
      stockMinimo: Number(formData.stockMinimo) || 0,
      costoUnitarioCLP: 0,
      periodoCarenciaDias: Number(formData.periodoCarenciaDias) || 0,
      tiempoReingresoHoras: Number(formData.tiempoReingresoHoras) || 0
    };

    onUpdateInsumo(actualizado);
    setIsEditModalOpen(false);
    setEditingInsumo(null);
  };

  // Confirmar reposición rápida
  const handleConfirmarReposicion = (insumoId: string) => {
    const item = inventario.find((i) => i.id === insumoId);
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Package className="w-3 h-3" />
            Bodega General & Materiales Fundo La Cabaña
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Inventario Integral de Insumos & Materiales
          </h1>
          <p className="text-xs text-stone-500">
            Control de agroquímicos SAG, insumos de riego por goteo, alambres, polines impregnados, mallas sombreadoras y herramientas podadoras.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-center transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Nuevo Producto</span>
        </button>
      </div>

      {/* Alerta de Stock Crítico */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <strong className="font-bold">Alerta de Bodega: {lowStockCount} artículos se encuentran bajo el umbral mínimo.</strong>
              <div className="text-[11px] text-rose-800 mt-0.5">
                Revise el inventario de materiales críticos antes de cuadrillas de poda, amarraje o floración.
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 font-bold text-[10px] uppercase">
            Reposición Necesaria
          </span>
        </div>
      )}

      {/* Tarjetas de Métricas de Bodega */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Total Artículos Registrados</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{inventario.length}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">En todas las categorías del huerto</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Stock en Nivel Óptimo</div>
          <div className="text-2xl font-black text-emerald-950 mt-1 font-mono tabular-nums">{stockOptimoCount}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Productos sobre stock mínimo</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Bajo Stock Mínimo</div>
          <div className={`text-2xl font-black mt-1 ${lowStockCount > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
            {lowStockCount}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Alertas automáticas activas</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Categoría Seleccionada</div>
          <div className="text-2xl font-black text-blue-950 mt-1">{insumosFiltrados.length}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Productos visibles actualmente</div>
        </div>
      </div>

      {/* Pestañas de Categorías */}
      <div className="bg-white rounded-2xl border border-stone-200 p-2 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {CATEGORIAS_CONFIG.map((cat) => {
            const isSelected = selectedCategoria === cat.id;
            const count = cat.id === 'todos' 
              ? inventario.length 
              : inventario.filter((i) => {
                  const itemCat = i.categoria || (
                    i.tipo === 'fungicida' || i.tipo === 'bactericida' || i.tipo === 'insecticida_acaricida' || i.tipo === 'herbicida' || i.tipo === 'rompedor_dormancia' ? 'fitosanitario' :
                    i.tipo === 'fertilizante_foliar' || i.tipo === 'fertilizante_suelo' ? 'fertilizante' :
                    i.tipo === 'riego' ? 'insumo_riego' :
                    i.tipo === 'alambre' ? 'alambre_estructura' :
                    i.tipo === 'polin' ? 'polin_madera' :
                    i.tipo === 'malla' ? 'malla_cobertor' :
                    i.tipo === 'herramienta' ? 'herramienta_equipo' :
                    i.tipo === 'epp' ? 'epp_seguridad' : 'otro'
                  );
                  return itemCat === cat.id;
                }).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoria(cat.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-stone-200 text-stone-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre comercial, especificación técnica, medida, lote o ubicación..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </div>
        <div className="text-xs text-stone-500 font-medium">
          Mostrando <strong>{insumosFiltrados.length}</strong> de {inventario.length} productos
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insumosFiltrados.map((item) => {
          const isLow = item.stockActual <= item.stockMinimo;
          const isQuimico = item.categoria === 'fitosanitario' || item.categoria === 'fertilizante' || 
            ['fungicida', 'bactericida', 'insecticida_acaricida', 'fertilizante_foliar', 'fertilizante_suelo'].includes(item.tipo);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between transition-all ${
                isLow ? 'border-rose-300 ring-1 ring-rose-200' : 'border-stone-200 hover:border-emerald-300'
              }`}
            >
              <div>
                {/* Header producto */}
                <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-stone-400 font-bold uppercase">
                        {item.numeroRegistroSAG && item.numeroRegistroSAG !== 'N/A' ? item.numeroRegistroSAG : item.fabricante}
                      </span>
                      {item.ubicacionBodega && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-medium">
                          {item.ubicacionBodega}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-stone-900 text-sm mt-0.5">{item.nombreComercial}</h3>
                    <div className="text-[11px] text-stone-500 line-clamp-2">
                      {item.especificacionTecnica || item.ingredienteActivo || item.fabricante}
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                    isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isLow ? 'STOCK BAJO' : 'OK'}
                  </span>
                </div>

                {/* Stock Actual y Mínimo */}
                <div className="flex items-baseline justify-between p-3 bg-stone-50 rounded-xl border border-stone-200 mt-3">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Stock Disponible</span>
                    <div className={`text-2xl font-black ${isLow ? 'text-rose-700' : 'text-emerald-950'}`}>
                      {item.stockActual} <span className="text-xs font-semibold text-stone-500">{item.unidad}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Stock Mínimo</span>
                    <span className="font-mono text-xs font-bold text-stone-600">{item.stockMinimo} {item.unidad}</span>
                  </div>
                </div>

                {/* Ficha técnica o de aplicación */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-600 mt-3">
                  {isQuimico ? (
                    <>
                      <div className="p-1.5 bg-stone-50 rounded-lg">
                        <span className="text-stone-400 block text-[10px]">Carencia LMR:</span>
                        <strong className="text-amber-900">{item.periodoCarenciaDias || 0} días</strong>
                      </div>
                      <div className="p-1.5 bg-stone-50 rounded-lg">
                        <span className="text-stone-400 block text-[10px]">Reingreso REI:</span>
                        <strong className="text-stone-800">{item.tiempoReingresoHoras || 0} horas</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-1.5 bg-stone-50 rounded-lg">
                        <span className="text-stone-400 block text-[10px]">Categoría:</span>
                        <strong className="text-stone-800 capitalize">{(item.categoria || item.tipo).replace('_', ' ')}</strong>
                      </div>
                      <div className="p-1.5 bg-stone-50 rounded-lg">
                        <span className="text-stone-400 block text-[10px]">Ubicación:</span>
                        <strong className="text-stone-900 truncate block">{item.ubicacionBodega || 'Bodega General'}</strong>
                      </div>
                    </>
                  )}
                  <div className="p-1.5 bg-stone-50 rounded-lg">
                    <span className="text-stone-400 block text-[10px]">Fabricación:</span>
                    <span className="font-mono text-stone-700 truncate block">
                      {formatProductDateLabel(item.fechaElaboracion, 'No registrada')}
                    </span>
                  </div>
                  <div className="p-1.5 bg-stone-50 rounded-lg">
                    <span className="text-stone-400 block text-[10px]">Vencimiento:</span>
                    {(() => {
                      if (isProductoSinVencimiento(item)) {
                        return <span className="font-mono text-stone-600">Sin vencimiento</span>;
                      }
                      const dVenc = diasHastaVencimientoProducto(item);
                      const cls =
                        dVenc !== null && dVenc < 0
                          ? 'text-rose-700 font-bold'
                          : dVenc !== null && dVenc <= 30
                          ? 'text-amber-800 font-bold'
                          : 'text-stone-700';
                      return (
                        <span className={`font-mono ${cls}`}>
                          {formatProductDateLabel(item.fechaVencimiento, 'Sin vencimiento')}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {item.observaciones && (
                  <p className="text-[11px] text-stone-500 italic mt-2 bg-stone-50 p-1.5 rounded-lg border border-stone-100">
                    "{item.observaciones}"
                  </p>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100 mt-3">
                <button
                  onClick={() => {
                    setReponiendoId(item.id);
                    setCantidadReponer(item.stockMinimo * 2 || 10);
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Reponer
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Editar producto"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => setInsumoToDelete(item)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Eliminar insumo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Reposición Rápida */}
      {reponiendoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 p-5 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-stone-900">Ingreso de Guía / Factura a Bodega</h3>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Cantidad a Ingresar en Stock:</label>
              <input
                type="number"
                step="0.5"
                value={cantidadReponer}
                onChange={(e) => setCantidadReponer(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-base text-emerald-900"
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
                className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Confirmar Ingreso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Crear Nuevo Producto */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Agregar Nuevo Producto al Inventario
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCrearInsumo} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Categoría del Producto:</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => {
                      const nextCat = e.target.value as CategoriaInventario;
                      setFormData({
                        ...formData,
                        categoria: nextCat,
                        sinVencimiento: isCategoriaSinVencimientoDefault(nextCat),
                        fechaVencimiento: isCategoriaSinVencimientoDefault(nextCat)
                          ? ''
                          : formData.fechaVencimiento,
                      });
                    }}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="fitosanitario">Fitosanitarios & Químicos (SAG)</option>
                    <option value="fertilizante">Fertilizantes de Suelo / Foliares</option>
                    <option value="insumo_riego">Insumos de Riego (Goteros, Válvulas, Tuberías)</option>
                    <option value="alambre_estructura">Alambres Acerados & Tensores</option>
                    <option value="polin_madera">Polines & Maderas Impregnadas</option>
                    <option value="malla_cobertor">Mallas Raschel & Cobertores</option>
                    <option value="herramienta_equipo">Herramientas (Tijeras, Penetrómetros)</option>
                    <option value="epp_seguridad">EPP & Seguridad</option>
                    <option value="otro">Otros Materiales</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre Comercial / Descripción:</label>
                  <input
                    type="text"
                    value={formData.nombreComercial}
                    onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    placeholder="ej. Gotero Autocompensante Netafim 2.0 L/h"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Especificación Técnica o Ingrediente:</label>
                  <input
                    type="text"
                    value={formData.especificacionTecnica || formData.ingredienteActivo}
                    onChange={(e) => setFormData({ ...formData, especificacionTecnica: e.target.value, ingredienteActivo: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="ej. Autocompensante antisucción, paso laberinto"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fabricante o Proveedor:</label>
                  <input
                    type="text"
                    value={formData.fabricante}
                    onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="ej. Netafim, Inchalam, Syngenta, Felco"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Unidad de Medida:</label>
                  <select
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="unidades">Unidades (c/u)</option>
                    <option value="kg">Kilos (kg)</option>
                    <option value="L">Litros (L)</option>
                    <option value="rollos">Rollos</option>
                    <option value="metros">Metros (m)</option>
                    <option value="pares">Pares</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Inicial:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.stockActual}
                    onChange={(e) => setFormData({ ...formData, stockActual: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Mínimo (Alerta):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.stockMinimo}
                    onChange={(e) => setFormData({ ...formData, stockMinimo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Ubicación Bodega:</label>
                  <input
                    type="text"
                    value={formData.ubicacionBodega}
                    onChange={(e) => setFormData({ ...formData, ubicacionBodega: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="ej. Pasillo Riego, Estante 3"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° Registro SAG / Serie:</label>
                  <input
                    type="text"
                    value={formData.numeroRegistroSAG}
                    onChange={(e) => setFormData({ ...formData, numeroRegistroSAG: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    placeholder="SAG 1234 o N/A"
                  />
                </div>
              </div>

              {/* Fechas de Fabricación y Vencimiento (Mes/Año por defecto + opción Sin vencimiento) */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.sinVencimiento)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sinVencimiento: e.target.checked,
                          fechaVencimiento: e.target.checked ? '' : formData.fechaVencimiento,
                        })
                      }
                      className="rounded border-stone-300 text-emerald-800"
                    />
                    <span>Sin fecha de vencimiento (ej. martillos, herramientas, materiales)</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usarDiaExacto}
                      onChange={(e) => {
                        const exact = e.target.checked;
                        setUsarDiaExacto(exact);
                        setFormData((prev) => ({
                          ...prev,
                          fechaElaboracion: exact
                            ? toDayValue(prev.fechaElaboracion)
                            : toMonthValue(prev.fechaElaboracion),
                          fechaVencimiento: exact
                            ? toDayValue(prev.fechaVencimiento)
                            : toMonthValue(prev.fechaVencimiento),
                        }));
                      }}
                      className="rounded border-stone-300 text-emerald-800"
                    />
                    <span>Incluir día exacto</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Fecha Fabricación {usarDiaExacto ? '(Día/Mes/Año)' : '(Mes/Año)'}:
                    </label>
                    <input
                      type={usarDiaExacto ? 'date' : 'month'}
                      value={formData.fechaElaboracion || ''}
                      onChange={(e) => setFormData({ ...formData, fechaElaboracion: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Fecha Vencimiento {usarDiaExacto ? '(Día/Mes/Año)' : '(Mes/Año)'}:
                    </label>
                    {formData.sinVencimiento ? (
                      <div className="w-full p-2 bg-stone-100 border border-stone-200 rounded-lg font-mono text-stone-500">
                        Sin vencimiento (No aplica)
                      </div>
                    ) : (
                      <input
                        type={usarDiaExacto ? 'date' : 'month'}
                        value={formData.fechaVencimiento || ''}
                        onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-amber-900"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Si es fitosanitario / fertilizante */}
              {(formData.categoria === 'fitosanitario' || formData.categoria === 'fertilizante') && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Carencia DGA/SAG (Días LMR):</label>
                    <input
                      type="number"
                      value={formData.periodoCarenciaDias}
                      onChange={(e) => setFormData({ ...formData, periodoCarenciaDias: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-amber-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Reingreso (Horas REI):</label>
                    <input
                      type="number"
                      value={formData.tiempoReingresoHoras}
                      onChange={(e) => setFormData({ ...formData, tiempoReingresoHoras: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones / Especificaciones:</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="Detalles sobre uso, garantías, compatibilidades, etc."
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
                  Guardar en Bodega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Producto (100% Editable) */}
      {isEditModalOpen && editingInsumo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                Editar Producto: {editingInsumo.nombreComercial}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-stone-300 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleGuardarEdicion} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Categoría:</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="fitosanitario">Fitosanitarios & Químicos (SAG)</option>
                    <option value="fertilizante">Fertilizantes de Suelo / Foliares</option>
                    <option value="insumo_riego">Insumos de Riego</option>
                    <option value="alambre_estructura">Alambres Acerados & Tensores</option>
                    <option value="polin_madera">Polines & Maderas Impregnadas</option>
                    <option value="malla_cobertor">Mallas Raschel & Cobertores</option>
                    <option value="herramienta_equipo">Herramientas & Equipos</option>
                    <option value="epp_seguridad">EPP & Seguridad</option>
                    <option value="otro">Otros Materiales</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre Comercial:</label>
                  <input
                    type="text"
                    value={formData.nombreComercial}
                    onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Especificación / Ingrediente:</label>
                  <input
                    type="text"
                    value={formData.especificacionTecnica || formData.ingredienteActivo}
                    onChange={(e) => setFormData({ ...formData, especificacionTecnica: e.target.value, ingredienteActivo: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fabricante o Proveedor:</label>
                  <input
                    type="text"
                    value={formData.fabricante}
                    onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Unidad:</label>
                  <select
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value="unidades">Unidades (c/u)</option>
                    <option value="kg">Kilos (kg)</option>
                    <option value="L">Litros (L)</option>
                    <option value="rollos">Rollos</option>
                    <option value="metros">Metros (m)</option>
                    <option value="pares">Pares</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Actual:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.stockActual}
                    onChange={(e) => setFormData({ ...formData, stockActual: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-emerald-950"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Mínimo:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.stockMinimo}
                    onChange={(e) => setFormData({ ...formData, stockMinimo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Ubicación Bodega:</label>
                  <input
                    type="text"
                    value={formData.ubicacionBodega}
                    onChange={(e) => setFormData({ ...formData, ubicacionBodega: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Lote / Registro SAG:</label>
                  <input
                    type="text"
                    value={formData.numeroRegistroSAG}
                    onChange={(e) => setFormData({ ...formData, numeroRegistroSAG: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Fechas de Fabricación y Vencimiento (Mes/Año por defecto + opción Sin vencimiento) */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.sinVencimiento)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sinVencimiento: e.target.checked,
                          fechaVencimiento: e.target.checked ? '' : formData.fechaVencimiento,
                        })
                      }
                      className="rounded border-stone-300 text-emerald-800"
                    />
                    <span>Sin fecha de vencimiento (solo fabricación)</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usarDiaExacto}
                      onChange={(e) => {
                        const exact = e.target.checked;
                        setUsarDiaExacto(exact);
                        setFormData((prev) => ({
                          ...prev,
                          fechaElaboracion: exact
                            ? toDayValue(prev.fechaElaboracion)
                            : toMonthValue(prev.fechaElaboracion),
                          fechaVencimiento: exact
                            ? toDayValue(prev.fechaVencimiento)
                            : toMonthValue(prev.fechaVencimiento),
                        }));
                      }}
                      className="rounded border-stone-300 text-emerald-800"
                    />
                    <span>Incluir día exacto</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Fecha Fabricación {usarDiaExacto ? '(Día/Mes/Año)' : '(Mes/Año)'}:
                    </label>
                    <input
                      type={usarDiaExacto ? 'date' : 'month'}
                      value={formData.fechaElaboracion || ''}
                      onChange={(e) => setFormData({ ...formData, fechaElaboracion: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      Fecha Vencimiento {usarDiaExacto ? '(Día/Mes/Año)' : '(Mes/Año)'}:
                    </label>
                    {formData.sinVencimiento ? (
                      <div className="w-full p-2 bg-stone-100 border border-stone-200 rounded-lg font-mono text-stone-500">
                        Sin vencimiento (No aplica)
                      </div>
                    ) : (
                      <input
                        type={usarDiaExacto ? 'date' : 'month'}
                        value={formData.fechaVencimiento || ''}
                        onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-amber-900"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Si es agroquímico */}
              {(formData.categoria === 'fitosanitario' || formData.categoria === 'fertilizante') && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Carencia (Días LMR):</label>
                    <input
                      type="number"
                      value={formData.periodoCarenciaDias}
                      onChange={(e) => setFormData({ ...formData, periodoCarenciaDias: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-amber-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Reingreso (Horas REI):</label>
                    <input
                      type="number"
                      value={formData.tiempoReingresoHoras}
                      onChange={(e) => setFormData({ ...formData, tiempoReingresoHoras: parseInt(e.target.value) || 0 })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones:</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
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

      {/* MODAL: Confirmación Eliminación Insumo */}
      {insumoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Eliminar del Inventario</h3>
              <button onClick={() => setInsumoToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-stone-700">
                ¿Estás seguro de que deseas eliminar permanentemente <strong>{insumoToDelete.nombreComercial}</strong>?
              </p>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-600 text-[11px] space-y-1">
                <div><strong>Stock actual:</strong> {insumoToDelete.stockActual} {insumoToDelete.unidad}</div>
                <div><strong>Ubicación:</strong> {insumoToDelete.ubicacionBodega}</div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setInsumoToDelete(null)}
                  className="px-3.5 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteInsumo(insumoToDelete.id);
                    setInsumoToDelete(null);
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
