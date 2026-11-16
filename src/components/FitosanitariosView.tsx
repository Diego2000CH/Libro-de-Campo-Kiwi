import React, { useState } from 'react';
import { 
  InsumoInventario, 
  CategoriaFitosanitario, 
  DestinoProducto,
  EstadoFertilizante,
  SolubilidadFertilizante
} from '../types/campo';
import { 
  FlaskConical, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Clock, 
  Calendar,
  Sparkles,
  Droplet,
  Tag,
  Info,
  Layers,
  Leaf
} from 'lucide-react';

interface FitosanitariosViewProps {
  inventario: InsumoInventario[];
  onAddInsumo: (insumo: InsumoInventario) => void;
  onUpdateInsumo: (insumo: InsumoInventario) => void;
  onDeleteInsumo: (id: string) => void;
}

const CATEGORIAS_FITOSANITARIOS: { id: string; label: string; icon: string }[] = [
  { id: 'todos', label: 'Todos los Agroquímicos', icon: '🧪' },
  { id: 'herbicida', label: 'Herbicida', icon: '🌾' },
  { id: 'fungicida', label: 'Fungicida', icon: '🍄' },
  { id: 'acaricida', label: 'Acaricida', icon: '🕷️' },
  { id: 'insecticida', label: 'Insecticida', icon: '🐛' },
  { id: 'coadyuvante', label: 'Coadyuvante', icon: '💧' },
  { id: 'bactericida', label: 'Bactericida', icon: '🦠' },
  { id: 'bioestimulante', label: 'Bioestimulante', icon: '🌿' },
  { id: 'fitorregulador', label: 'Fitorregulador', icon: '⚡' },
  { id: 'fungicida_bactericida', label: 'Fungicida + Bactericida', icon: '🛡️' },
  { id: 'elicitor_psa', label: 'Elicitor PSA', icon: '🚨' },
  { id: 'fertilizante', label: 'Fertilizante', icon: '🌱' }
];

const DESTINOS_CONFIG: { id: DestinoProducto; label: string; icon: string }[] = [
  { id: 'kiwi', label: 'Kiwi Hayward', icon: '🥝' },
  { id: 'quinta_frutal', label: 'Quinta Frutal', icon: '🍎' },
  { id: 'vivero', label: 'Vivero', icon: '🌱' },
  { id: 'casa_patronal', label: 'Casa Patronal', icon: '🏡' }
];

export const FitosanitariosView: React.FC<FitosanitariosViewProps> = ({
  inventario,
  onAddInsumo,
  onUpdateInsumo,
  onDeleteInsumo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todos');
  const [selectedDestino, setSelectedDestino] = useState<string>('todos');

  // Modales
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<InsumoInventario | null>(null);
  const [insumoToDelete, setInsumoToDelete] = useState<InsumoInventario | null>(null);
  const [reponiendoId, setReponiendoId] = useState<string | null>(null);
  const [cantidadReponer, setCantidadReponer] = useState<number>(10);

  // Formulario Fitosanitario / Fertilizante
  const [formFito, setFormFito] = useState<{
    nombreComercial: string;
    categoriaFito: CategoriaFitosanitario;
    ingredienteActivo: string;
    estadoFertilizante: EstadoFertilizante;
    solubilidadFertilizante: SolubilidadFertilizante;
    composicionFertilizante: string;
    fechaElaboracion: string;
    fechaVencimiento: string;
    destinosUso: DestinoProducto[];
    fabricante: string;
    numeroRegistroSAG: string;
    stockActual: number;
    stockMinimo: number;
    unidad: 'Kg' | 'Litros' | 'cc' | 'ml' | 'gramos';
    costoUnitarioCLP: number;
    lote: string;
    tieneCarencia: boolean;
    periodoCarenciaDias: number;
    tiempoReingresoHoras: number;
    dosisRecomendadaHa: string;
    ubicacionBodega: string;
    observaciones: string;
  }>({
    nombreComercial: '',
    categoriaFito: 'fungicida',
    ingredienteActivo: '',
    estadoFertilizante: 'granulado',
    solubilidadFertilizante: 'soluble',
    composicionFertilizante: '',
    fechaElaboracion: new Date().toISOString().split('T')[0],
    fechaVencimiento: '2028-12-31',
    destinosUso: ['kiwi'],
    fabricante: '',
    numeroRegistroSAG: 'SAG ',
    stockActual: 10,
    stockMinimo: 5,
    unidad: 'Kg',
    costoUnitarioCLP: 45000,
    lote: `LT-${new Date().getFullYear()}`,
    tieneCarencia: true,
    periodoCarenciaDias: 7,
    tiempoReingresoHoras: 12,
    dosisRecomendadaHa: '1.0 kg/ha',
    ubicacionBodega: 'Bodega Químicos SAG - Estante A',
    observaciones: ''
  });

  // Filtrar solo los productos de Bodega Fitosanitarios
  const fitosanitarios = inventario.filter((item) => {
    if (item.categoriaBodega === 'material_riego') return false;
    if (item.categoriaBodega === 'fitosanitario') return true;
    // Fallback para items existentes
    const fitoTypes = ['fungicida', 'bactericida', 'insecticida_acaricida', 'fertilizante_foliar', 'fertilizante_suelo', 'herbicida', 'coadyuvante', 'rompedor_dormancia'];
    return fitoTypes.includes(item.tipo) || item.categoria === 'fitosanitario' || item.categoria === 'fertilizante';
  });

  // Filtrado por categoría, destino y búsqueda
  const fitoFiltrados = fitosanitarios.filter((item) => {
    const itemCat = item.categoriaFito || (
      item.tipo === 'herbicida' ? 'herbicida' :
      item.tipo === 'fungicida' ? 'fungicida' :
      item.tipo === 'insecticida_acaricida' ? 'insecticida' :
      item.tipo === 'bactericida' ? 'bactericida' :
      item.tipo === 'fertilizante_foliar' || item.tipo === 'fertilizante_suelo' ? 'fertilizante' :
      item.tipo === 'coadyuvante' ? 'coadyuvante' :
      item.tipo === 'rompedor_dormancia' ? 'fertilizante' : 'fungicida'
    );

    const matchesCat = selectedCategoria === 'todos' || itemCat === selectedCategoria;
    
    // Destinos
    const destinos = item.destinosUso || ['kiwi'];
    const matchesDestino = selectedDestino === 'todos' || destinos.includes(selectedDestino as DestinoProducto);

    // Texto
    const searchString = `${item.nombreComercial} ${item.ingredienteActivo || ''} ${item.composicionFertilizante || ''} ${item.numeroRegistroSAG || ''} ${item.fabricante} ${item.lote || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());

    return matchesCat && matchesDestino && matchesSearch;
  });

  const lowStockCount = fitosanitarios.filter((i) => (i.stockMinimo || 0) > 0 && i.stockActual <= (i.stockMinimo || 0)).length;
  const valorTotalFito = fitosanitarios.reduce((acc, i) => acc + (i.stockActual * i.costoUnitarioCLP), 0);

  // Apertura modal nuevo
  const handleOpenNew = () => {
    const defaultCat = (selectedCategoria !== 'todos' ? selectedCategoria : 'fungicida') as CategoriaFitosanitario;
    const isExempt = defaultCat === 'fertilizante' || defaultCat === 'coadyuvante' || defaultCat === 'bioestimulante';
    setFormFito({
      nombreComercial: '',
      categoriaFito: defaultCat,
      ingredienteActivo: '',
      estadoFertilizante: 'granulado',
      solubilidadFertilizante: 'soluble',
      composicionFertilizante: '',
      fechaElaboracion: new Date().toISOString().split('T')[0],
      fechaVencimiento: '2028-12-31',
      destinosUso: ['kiwi'],
      fabricante: '',
      numeroRegistroSAG: defaultCat === 'fertilizante' ? 'SAG F-' : 'SAG ',
      stockActual: 10,
      stockMinimo: 5,
      unidad: defaultCat === 'fertilizante' ? 'Kg' : 'Kg',
      costoUnitarioCLP: 35000,
      lote: `LT-${new Date().getFullYear()}`,
      tieneCarencia: !isExempt,
      periodoCarenciaDias: isExempt ? 0 : 7,
      tiempoReingresoHoras: isExempt ? 4 : 12,
      dosisRecomendadaHa: '1.0 kg/ha',
      ubicacionBodega: 'Bodega Químicos SAG - Estante A',
      observaciones: ''
    });
    setIsNewModalOpen(true);
  };

  // Apertura modal editar
  const handleOpenEdit = (item: InsumoInventario) => {
    setEditingInsumo(item);
    const hasCarencia = item.tieneCarencia ?? ((item.periodoCarenciaDias || 0) > 0);
    const validUnidad = (['Kg', 'Litros', 'cc', 'ml', 'gramos'].includes(item.unidad as string))
      ? (item.unidad as any)
      : (item.unidad === 'kg' ? 'Kg' : item.unidad === 'L' ? 'Litros' : 'Kg');

    setFormFito({
      nombreComercial: item.nombreComercial,
      categoriaFito: (item.categoriaFito || (item.categoria === 'fertilizante' ? 'fertilizante' : 'fungicida')) as CategoriaFitosanitario,
      ingredienteActivo: item.ingredienteActivo || '',
      estadoFertilizante: item.estadoFertilizante || 'granulado',
      solubilidadFertilizante: item.solubilidadFertilizante || 'soluble',
      composicionFertilizante: item.composicionFertilizante || '',
      fechaElaboracion: item.fechaElaboracion || '2024-01-01',
      fechaVencimiento: item.fechaVencimiento || '2028-12-31',
      destinosUso: item.destinosUso && item.destinosUso.length > 0 ? item.destinosUso : ['kiwi'],
      fabricante: item.fabricante,
      numeroRegistroSAG: item.numeroRegistroSAG || 'SAG',
      stockActual: item.stockActual,
      stockMinimo: item.stockMinimo,
      unidad: validUnidad,
      costoUnitarioCLP: item.costoUnitarioCLP,
      lote: item.lote || '',
      tieneCarencia: hasCarencia,
      periodoCarenciaDias: item.periodoCarenciaDias || 0,
      tiempoReingresoHoras: item.tiempoReingresoHoras || 0,
      dosisRecomendadaHa: item.dosisRecomendadaHa || '',
      ubicacionBodega: item.ubicacionBodega || 'Bodega Químicos SAG',
      observaciones: item.observaciones || ''
    });
    setIsEditModalOpen(true);
  };

  const handleToggleDestino = (dest: DestinoProducto) => {
    setFormFito((prev) => {
      const exists = prev.destinosUso.includes(dest);
      if (exists) {
        if (prev.destinosUso.length === 1) return prev; // Al menos 1
        return { ...prev, destinosUso: prev.destinosUso.filter((d) => d !== dest) };
      }
      return { ...prev, destinosUso: [...prev.destinosUso, dest] };
    });
  };

  const handleGuardarNuevo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFito.nombreComercial) return;

    const nuevo: InsumoInventario = {
      id: `fito-${Date.now()}`,
      nombreComercial: formFito.nombreComercial,
      categoriaBodega: 'fitosanitario',
      categoria: formFito.categoriaFito === 'fertilizante' ? 'fertilizante' : 'fitosanitario',
      categoriaFito: formFito.categoriaFito,
      tipo: formFito.categoriaFito === 'fertilizante' ? 'fertilizante_suelo' : (formFito.categoriaFito as any),
      ingredienteActivo: formFito.categoriaFito === 'fertilizante' ? undefined : formFito.ingredienteActivo,
      estadoFertilizante: formFito.categoriaFito === 'fertilizante' ? formFito.estadoFertilizante : undefined,
      solubilidadFertilizante: formFito.categoriaFito === 'fertilizante' ? formFito.solubilidadFertilizante : undefined,
      composicionFertilizante: formFito.categoriaFito === 'fertilizante' ? formFito.composicionFertilizante : undefined,
      fechaElaboracion: formFito.fechaElaboracion,
      fechaVencimiento: formFito.fechaVencimiento,
      destinosUso: formFito.destinosUso,
      fabricante: formFito.fabricante || 'Fabricante Agroquímico',
      numeroRegistroSAG: formFito.numeroRegistroSAG || 'SAG',
      stockActual: Number(formFito.stockActual) || 0,
      stockMinimo: Number(formFito.stockMinimo) || 0,
      unidad: formFito.unidad,
      costoUnitarioCLP: Number(formFito.costoUnitarioCLP) || 0,
      lote: formFito.lote || `LT-${Date.now().toString().slice(-4)}`,
      tieneCarencia: formFito.tieneCarencia,
      periodoCarenciaDias: formFito.tieneCarencia ? (Number(formFito.periodoCarenciaDias) || 0) : 0,
      tiempoReingresoHoras: Number(formFito.tiempoReingresoHoras) || 0,
      dosisRecomendadaHa: formFito.dosisRecomendadaHa || '',
      ubicacionBodega: formFito.ubicacionBodega || 'Bodega Químicos SAG',
      observaciones: formFito.observaciones || '',
      consumoHistoricoAcumulado: 0
    };

    onAddInsumo(nuevo);
    setIsNewModalOpen(false);
  };

  const handleGuardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInsumo || !formFito.nombreComercial) return;

    const actualizado: InsumoInventario = {
      ...editingInsumo,
      nombreComercial: formFito.nombreComercial,
      categoriaBodega: 'fitosanitario',
      categoria: formFito.categoriaFito === 'fertilizante' ? 'fertilizante' : 'fitosanitario',
      categoriaFito: formFito.categoriaFito,
      tipo: formFito.categoriaFito === 'fertilizante' ? 'fertilizante_suelo' : (formFito.categoriaFito as any),
      ingredienteActivo: formFito.categoriaFito === 'fertilizante' ? undefined : formFito.ingredienteActivo,
      estadoFertilizante: formFito.categoriaFito === 'fertilizante' ? formFito.estadoFertilizante : undefined,
      solubilidadFertilizante: formFito.categoriaFito === 'fertilizante' ? formFito.solubilidadFertilizante : undefined,
      composicionFertilizante: formFito.categoriaFito === 'fertilizante' ? formFito.composicionFertilizante : undefined,
      fechaElaboracion: formFito.fechaElaboracion,
      fechaVencimiento: formFito.fechaVencimiento,
      destinosUso: formFito.destinosUso,
      fabricante: formFito.fabricante,
      numeroRegistroSAG: formFito.numeroRegistroSAG,
      stockActual: Number(formFito.stockActual) || 0,
      stockMinimo: Number(formFito.stockMinimo) || 0,
      unidad: formFito.unidad,
      costoUnitarioCLP: Number(formFito.costoUnitarioCLP) || 0,
      lote: formFito.lote,
      tieneCarencia: formFito.tieneCarencia,
      periodoCarenciaDias: formFito.tieneCarencia ? (Number(formFito.periodoCarenciaDias) || 0) : 0,
      tiempoReingresoHoras: Number(formFito.tiempoReingresoHoras) || 0,
      dosisRecomendadaHa: formFito.dosisRecomendadaHa,
      ubicacionBodega: formFito.ubicacionBodega,
      observaciones: formFito.observaciones
    };

    onUpdateInsumo(actualizado);
    setIsEditModalOpen(false);
    setEditingInsumo(null);
  };

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
            <FlaskConical className="w-3 h-3 text-emerald-700" />
            Bodega Exclusiva de Fitosanitarios (SAG)
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Bodega de Fitosanitarios
          </h1>
          <p className="text-xs text-stone-500">
            Control fitosanitario oficial de Herbicidas, Fungicidas, Acaricidas, Insecticidas, Coadyuvantes, Bactericidas, Bioestimulantes, Fitorreguladores, Elicitor PSA y Fertilizantes.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-center transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Ingresar Producto Fitosanitario</span>
        </button>
      </div>

      {/* Alerta de Stock Crítico */}
      {lowStockCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <strong className="font-bold">Alerta Fitosanitaria: {lowStockCount} productos bajo el umbral mínimo de seguridad.</strong>
              <div className="text-[11px] text-rose-800 mt-0.5">
                Revise stock de fungicidas de floración y bactericidas de cobre previo a eventos de lluvia o poda.
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 font-bold text-[10px] uppercase shrink-0">
            Reposición SAG Requerida
          </span>
        </div>
      )}

      {/* Tarjetas de Métricas de Agroquímicos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Total Productos Registrados</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{fitosanitarios.length}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Agroquímicos con registro SAG</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Valorización Bodega Químicos</div>
          <div className="text-2xl font-black text-emerald-950 mt-1">${valorTotalFito.toLocaleString('es-CL')}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Costo total inventariado</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Bajo Stock Mínimo</div>
          <div className={`text-2xl font-black mt-1 ${lowStockCount > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
            {lowStockCount}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Alertas automáticas activas</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <div className="text-[10px] text-stone-400 font-bold uppercase">Productos Filtrados</div>
          <div className="text-2xl font-black text-blue-950 mt-1">{fitoFiltrados.length}</div>
          <div className="text-[11px] text-stone-500 mt-0.5">Visibles en vista actual</div>
        </div>
      </div>

      {/* Pestañas de las 11 Categorías Exigidas */}
      <div className="bg-white rounded-2xl border border-stone-200 p-2 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {CATEGORIAS_FITOSANITARIOS.map((cat) => {
            const isSelected = selectedCategoria === cat.id;
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
            placeholder="Buscar por nombre comercial, ingrediente activo, composición, registro SAG o lote..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700"
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
                selectedDestino === d.id ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Productos Fitosanitarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fitoFiltrados.length === 0 ? (
          <div className="col-span-full p-8 sm:p-10 bg-white rounded-2xl border border-dashed border-stone-300 text-center space-y-3">
            <FlaskConical className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="font-bold text-stone-800 text-sm">No hay productos en Bodega de Fitosanitarios</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Puedes ingresar productos agroquímicos reales (Herbicidas, Fungicidas, Acaricidas, etc.) con sus unidades exactas en Kg, Litros, cc, ml o gramos.
            </p>
            <button
              onClick={handleOpenNew}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Ingresar Primer Producto</span>
            </button>
          </div>
        ) : fitoFiltrados.map((item) => {
            const isLow = (item.stockMinimo || 0) > 0 && item.stockActual <= (item.stockMinimo || 0);
            const isFertilizante = item.categoriaFito === 'fertilizante' || item.tipo.includes('fertilizante');
            const destinos = item.destinosUso || ['kiwi'];
            const hasCarencia = item.tieneCarencia ?? ((item.periodoCarenciaDias || 0) > 0);

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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] text-stone-500 font-bold uppercase bg-stone-100 px-1.5 py-0.5 rounded">
                          {item.numeroRegistroSAG || 'SAG N/A'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 uppercase">
                          {(item.categoriaFito || item.tipo).replace('_', ' ')}
                        </span>
                        {!hasCarencia && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 uppercase">
                            Exento SAG
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-stone-900 text-sm mt-1">{item.nombreComercial}</h3>
                      <div className="text-[11px] text-stone-500 font-medium">{item.fabricante}</div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                      isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isLow ? 'STOCK BAJO' : 'OK'}
                    </span>
                  </div>

                  {/* Ingrediente Activo O Composición de Fertilizante */}
                  <div className="mt-3 p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs">
                    {isFertilizante ? (
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-emerald-900 font-bold uppercase mb-1">
                          <span>Fertilizante Nutricional</span>
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.2 rounded bg-emerald-200/80 text-emerald-950 font-bold">
                              {item.estadoFertilizante === 'liquido' ? 'Líquido' : 'Granulado'}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 font-bold">
                              {item.solubilidadFertilizante === 'no_soluble' ? 'No Soluble' : 'Soluble'}
                            </span>
                          </div>
                        </div>
                        <div className="font-mono font-bold text-stone-800 text-[11px]">
                          Composición: {item.composicionFertilizante || item.ingredienteActivo || 'N-P-K no especificado'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[10px] text-stone-500 font-bold uppercase block">Ingrediente Activo:</span>
                        <span className="font-bold text-emerald-950 text-[11px]">
                          {item.ingredienteActivo || 'No especificado'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stock Actual y Mínimo */}
                  <div className="flex items-baseline justify-between p-3 bg-stone-50 rounded-xl border border-stone-200 mt-2.5">
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

                  {/* Trazabilidad: Fechas Elaboración / Vencimiento & Destino */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-600 mt-2.5">
                    <div className="p-1.5 bg-stone-50 rounded-lg">
                      <span className="text-stone-400 block text-[10px] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" /> F. Elaboración:
                      </span>
                      <strong className="font-mono text-stone-800">{item.fechaElaboracion || 'N/A'}</strong>
                    </div>
                    <div className="p-1.5 bg-stone-50 rounded-lg">
                      <span className="text-stone-400 block text-[10px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" /> F. Vencimiento:
                      </span>
                      <strong className="font-mono text-amber-900">{item.fechaVencimiento || '2028-12-31'}</strong>
                    </div>
                    <div className="p-1.5 bg-stone-50 rounded-lg">
                      <span className="text-stone-400 block text-[10px]">Carencia SAG:</span>
                      {hasCarencia && (item.periodoCarenciaDias || 0) > 0 ? (
                        <strong className="text-amber-900">{item.periodoCarenciaDias} días</strong>
                      ) : (
                        <strong className="text-emerald-700 font-bold">Exento (0d)</strong>
                      )}
                    </div>
                    <div className="p-1.5 bg-stone-50 rounded-lg">
                      <span className="text-stone-400 block text-[10px]">Reingreso REI:</span>
                      <strong className="text-stone-800">{item.tiempoReingresoHoras || 0} horas</strong>
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
                    title="Editar producto fitosanitario"
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
            <h3 className="font-bold text-sm text-stone-900">Ingreso de Guía / Factura a Bodega Químicos</h3>
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

      {/* MODAL: Nuevo Producto Fitosanitario / Fertilizante */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 overflow-hidden">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-400" />
                Registrar Fitosanitario o Fertilizante
              </h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleGuardarNuevo} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Categoría del Producto:</label>
                  <select
                    value={formFito.categoriaFito}
                    onChange={(e) => setFormFito({ ...formFito, categoriaFito: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-emerald-900"
                  >
                    <option value="herbicida">Herbicida</option>
                    <option value="fungicida">Fungicida</option>
                    <option value="acaricida">Acaricida</option>
                    <option value="insecticida">Insecticida</option>
                    <option value="coadyuvante">Coadyuvante</option>
                    <option value="bactericida">Bactericida</option>
                    <option value="bioestimulante">Bioestimulante</option>
                    <option value="fitorregulador">Fitorregulador</option>
                    <option value="fungicida_bactericida">Fungicida + Bactericida</option>
                    <option value="elicitor_psa">Elicitor PSA</option>
                    <option value="fertilizante">Fertilizante</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre Comercial:</label>
                  <input
                    type="text"
                    value={formFito.nombreComercial}
                    onChange={(e) => setFormFito({ ...formFito, nombreComercial: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    placeholder="ej. Switch 62.5 WG"
                    required
                  />
                </div>
              </div>

              {/* Si es Fertilizante: Estado (Líquido/Granulado), Solubilidad (Soluble/No soluble) y Composición */}
              {formFito.categoriaFito === 'fertilizante' ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2.5">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                    <Leaf className="w-3.5 h-3.5 text-emerald-700" />
                    Especificaciones Exclusivas de Fertilizante
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Estado Físico:</label>
                      <select
                        value={formFito.estadoFertilizante}
                        onChange={(e) => setFormFito({ ...formFito, estadoFertilizante: e.target.value as any })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                      >
                        <option value="liquido">Líquido</option>
                        <option value="granulado">Granulado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Solubilidad:</label>
                      <select
                        value={formFito.solubilidadFertilizante}
                        onChange={(e) => setFormFito({ ...formFito, solubilidadFertilizante: e.target.value as any })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                      >
                        <option value="soluble">Soluble (Fertirriego / Foliar)</option>
                        <option value="no_soluble">No Soluble (Aplicación al suelo)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Composición del Fertilizante (N-P-K y elementos):</label>
                    <input
                      type="text"
                      value={formFito.composicionFertilizante}
                      onChange={(e) => setFormFito({ ...formFito, composicionFertilizante: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-medium"
                      placeholder="ej. N 15.5% + CaO 26.5% o 21-0-0 + 24S"
                      required
                    />
                  </div>
                </div>
              ) : (
                /* Para Fitosanitarios: Ingrediente Activo */
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Ingrediente Activo:</label>
                  <input
                    type="text"
                    value={formFito.ingredienteActivo}
                    onChange={(e) => setFormFito({ ...formFito, ingredienteActivo: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                    placeholder="ej. Cyprodinil 37.5% + Fludioxonil 25.0%"
                    required
                  />
                </div>
              )}

              {/* Fechas Obligatorias: Elaboración y Vencimiento */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha de Elaboración:</label>
                  <input
                    type="date"
                    value={formFito.fechaElaboracion}
                    onChange={(e) => setFormFito({ ...formFito, fechaElaboracion: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha de Vencimiento:</label>
                  <input
                    type="date"
                    value={formFito.fechaVencimiento}
                    onChange={(e) => setFormFito({ ...formFito, fechaVencimiento: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-amber-900"
                    required
                  />
                </div>
              </div>

              {/* Destino del Producto (Kiwi, Quinta Frutal, Vivero, Casa Patronal) */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Destinado a (selecciona los aplicables):</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DESTINOS_CONFIG.map((d) => {
                    const isChecked = formFito.destinosUso.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleToggleDestino(d.id)}
                        className={`p-2 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-1 ring-emerald-300'
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

              {/* Registro SAG, Fabricante y Lote */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° Registro SAG:</label>
                  <input
                    type="text"
                    value={formFito.numeroRegistroSAG}
                    onChange={(e) => setFormFito({ ...formFito, numeroRegistroSAG: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fabricante:</label>
                  <input
                    type="text"
                    value={formFito.fabricante}
                    onChange={(e) => setFormFito({ ...formFito, fabricante: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="ej. Syngenta, Bayer, Yara"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° de Lote:</label>
                  <input
                    type="text"
                    value={formFito.lote}
                    onChange={(e) => setFormFito({ ...formFito, lote: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Stock, Unidad y Costo */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Inicial:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formFito.stockActual}
                    onChange={(e) => setFormFito({ ...formFito, stockActual: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Mínimo:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formFito.stockMinimo}
                    onChange={(e) => setFormFito({ ...formFito, stockMinimo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Unidad de Medida:</label>
                  <select
                    value={formFito.unidad}
                    onChange={(e) => setFormFito({ ...formFito, unidad: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-emerald-950"
                  >
                    <option value="Kg">Kg</option>
                    <option value="Litros">Litros</option>
                    <option value="cc">cc</option>
                    <option value="ml">ml</option>
                    <option value="gramos">gramos</option>
                  </select>
                </div>
              </div>

              {/* Carencia SAG y Reingreso */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={formFito.tieneCarencia}
                    onChange={(e) => setFormFito({
                      ...formFito,
                      tieneCarencia: e.target.checked,
                      periodoCarenciaDias: e.target.checked ? (formFito.periodoCarenciaDias || 7) : 0
                    })}
                    className="w-4 h-4 rounded text-emerald-700 cursor-pointer"
                  />
                  <span>¿Tiene período de carencia (LMR SAG)?</span>
                </label>

                {formFito.tieneCarencia ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Carencia SAG (Días LMR):</label>
                      <input
                        type="number"
                        min="1"
                        value={formFito.periodoCarenciaDias}
                        onChange={(e) => setFormFito({ ...formFito, periodoCarenciaDias: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-amber-900"
                        placeholder="ej. 7, 14 días"
                        required={formFito.tieneCarencia}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Reingreso (Horas REI):</label>
                      <input
                        type="number"
                        min="0"
                        value={formFito.tiempoReingresoHoras}
                        onChange={(e) => setFormFito({ ...formFito, tiempoReingresoHoras: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 font-medium">
                    ✓ Producto <strong>Exento de Carencia SAG (0 días)</strong>. Válido para fertilizantes, bioestimulantes, coadyuvantes u orgánicos sin LMR.
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones / Ubicación en Bodega:</label>
                <textarea
                  value={formFito.observaciones}
                  onChange={(e) => setFormFito({ ...formFito, observaciones: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="Detalles sobre mezcla, advertencias toxicológicas, estantería..."
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
                  Guardar en Bodega Fitosanitarios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Producto Fitosanitario (100% Editable) */}
      {isEditModalOpen && editingInsumo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                Editar Fitosanitario: {editingInsumo.nombreComercial}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-stone-300 hover:text-white cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleGuardarEdicion} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Categoría del Producto:</label>
                  <select
                    value={formFito.categoriaFito}
                    onChange={(e) => setFormFito({ ...formFito, categoriaFito: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-emerald-900"
                  >
                    <option value="herbicida">Herbicida</option>
                    <option value="fungicida">Fungicida</option>
                    <option value="acaricida">Acaricida</option>
                    <option value="insecticida">Insecticida</option>
                    <option value="coadyuvante">Coadyuvante</option>
                    <option value="bactericida">Bactericida</option>
                    <option value="bioestimulante">Bioestimulante</option>
                    <option value="fitorregulador">Fitorregulador</option>
                    <option value="fungicida_bactericida">Fungicida + Bactericida</option>
                    <option value="elicitor_psa">Elicitor PSA</option>
                    <option value="fertilizante">Fertilizante</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Nombre Comercial:</label>
                  <input
                    type="text"
                    value={formFito.nombreComercial}
                    onChange={(e) => setFormFito({ ...formFito, nombreComercial: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              {/* Si es Fertilizante */}
              {formFito.categoriaFito === 'fertilizante' ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2.5">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                    <Leaf className="w-3.5 h-3.5 text-emerald-700" />
                    Especificaciones Exclusivas de Fertilizante
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Estado Físico:</label>
                      <select
                        value={formFito.estadoFertilizante}
                        onChange={(e) => setFormFito({ ...formFito, estadoFertilizante: e.target.value as any })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                      >
                        <option value="liquido">Líquido</option>
                        <option value="granulado">Granulado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Solubilidad:</label>
                      <select
                        value={formFito.solubilidadFertilizante}
                        onChange={(e) => setFormFito({ ...formFito, solubilidadFertilizante: e.target.value as any })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                      >
                        <option value="soluble">Soluble (Fertirriego / Foliar)</option>
                        <option value="no_soluble">No Soluble (Aplicación al suelo)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Composición del Fertilizante:</label>
                    <input
                      type="text"
                      value={formFito.composicionFertilizante}
                      onChange={(e) => setFormFito({ ...formFito, composicionFertilizante: e.target.value })}
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-medium"
                      required
                    />
                  </div>
                </div>
              ) : (
                /* Ingrediente Activo */
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Ingrediente Activo:</label>
                  <input
                    type="text"
                    value={formFito.ingredienteActivo}
                    onChange={(e) => setFormFito({ ...formFito, ingredienteActivo: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                    required
                  />
                </div>
              )}

              {/* Fechas de Elaboración y Vencimiento */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha de Elaboración:</label>
                  <input
                    type="date"
                    value={formFito.fechaElaboracion}
                    onChange={(e) => setFormFito({ ...formFito, fechaElaboracion: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fecha de Vencimiento:</label>
                  <input
                    type="date"
                    value={formFito.fechaVencimiento}
                    onChange={(e) => setFormFito({ ...formFito, fechaVencimiento: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-amber-900"
                    required
                  />
                </div>
              </div>

              {/* Destinos */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Destinado a:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DESTINOS_CONFIG.map((d) => {
                    const isChecked = formFito.destinosUso.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleToggleDestino(d.id)}
                        className={`p-2 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-1 ring-emerald-300'
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

              {/* Registro SAG, Fabricante y Lote */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° Registro SAG:</label>
                  <input
                    type="text"
                    value={formFito.numeroRegistroSAG}
                    onChange={(e) => setFormFito({ ...formFito, numeroRegistroSAG: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Fabricante:</label>
                  <input
                    type="text"
                    value={formFito.fabricante}
                    onChange={(e) => setFormFito({ ...formFito, fabricante: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° Lote:</label>
                  <input
                    type="text"
                    value={formFito.lote}
                    onChange={(e) => setFormFito({ ...formFito, lote: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Stock, Unidad y Costo */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Actual:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formFito.stockActual}
                    onChange={(e) => setFormFito({ ...formFito, stockActual: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-emerald-950"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Mínimo:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formFito.stockMinimo}
                    onChange={(e) => setFormFito({ ...formFito, stockMinimo: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Unidad de Medida:</label>
                  <select
                    value={formFito.unidad}
                    onChange={(e) => setFormFito({ ...formFito, unidad: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-emerald-950"
                  >
                    <option value="Kg">Kg</option>
                    <option value="Litros">Litros</option>
                    <option value="cc">cc</option>
                    <option value="ml">ml</option>
                    <option value="gramos">gramos</option>
                  </select>
                </div>
              </div>

              {/* Carencia SAG y Reingreso */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={formFito.tieneCarencia}
                    onChange={(e) => setFormFito({
                      ...formFito,
                      tieneCarencia: e.target.checked,
                      periodoCarenciaDias: e.target.checked ? (formFito.periodoCarenciaDias || 7) : 0
                    })}
                    className="w-4 h-4 rounded text-emerald-700 cursor-pointer"
                  />
                  <span>¿Tiene período de carencia (LMR SAG)?</span>
                </label>

                {formFito.tieneCarencia ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Carencia (Días LMR):</label>
                      <input
                        type="number"
                        min="1"
                        value={formFito.periodoCarenciaDias}
                        onChange={(e) => setFormFito({ ...formFito, periodoCarenciaDias: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-amber-900"
                        placeholder="ej. 7, 14 días"
                        required={formFito.tieneCarencia}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Reingreso (Horas REI):</label>
                      <input
                        type="number"
                        min="0"
                        value={formFito.tiempoReingresoHoras}
                        onChange={(e) => setFormFito({ ...formFito, tiempoReingresoHoras: parseInt(e.target.value) || 0 })}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 font-medium">
                    ✓ Producto <strong>Exento de Carencia SAG (0 días)</strong>.
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones:</label>
                <textarea
                  value={formFito.observaciones}
                  onChange={(e) => setFormFito({ ...formFito, observaciones: e.target.value })}
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

      {/* MODAL: Confirmación Eliminación Insumo Fitosanitario */}
      {insumoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Eliminar Producto Fitosanitario</h3>
              <button onClick={() => setInsumoToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-stone-700">
                ¿Estás seguro de que deseas eliminar permanentemente <strong>{insumoToDelete.nombreComercial}</strong> de la bodega?
              </p>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-600 text-[11px] space-y-1">
                <div><strong>Categoría:</strong> {insumoToDelete.categoriaFito || insumoToDelete.tipo}</div>
                <div><strong>Stock actual:</strong> {insumoToDelete.stockActual} {insumoToDelete.unidad}</div>
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
