import React, { useState } from 'react';
import { 
  OrdenTrabajoFitosanitaria, 
  Parcela, 
  InsumoInventario, 
  UsuarioPredio,
  DestinoProducto,
  ProductoItemOrden
} from '../types/campo';
import { 
  FileCheck2, 
  Plus, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  Trash2, 
  Edit3,
  FileText,
  UserCheck,
  Check,
  Package,
  Layers,
  FlaskConical,
  X,
  Droplet,
  ChevronRight,
  Info
} from 'lucide-react';

interface OrdenesTrabajoViewProps {
  ordenes: OrdenTrabajoFitosanitaria[];
  parcelas: Parcela[];
  inventario: InsumoInventario[];
  usuarios: UsuarioPredio[];
  activeUser?: UsuarioPredio;
  onAddOrden: (orden: OrdenTrabajoFitosanitaria) => void;
  onUpdateOrden?: (orden: OrdenTrabajoFitosanitaria) => void;
  onExecuteOrden: (ordenId: string, aplicadorNombre: string, firma: string) => void;
  onDeleteOrden: (id: string) => void;
  canEdit?: boolean;
}

const DESTINOS_APLICACION: { id: DestinoProducto; label: string; icon: string }[] = [
  { id: 'kiwi', label: 'Kiwi Hayward', icon: '🥝' },
  { id: 'quinta_frutal', label: 'Quinta Frutal', icon: '🍎' },
  { id: 'vivero', label: 'Vivero de Plantas', icon: '🌱' },
  { id: 'casa_patronal', label: 'Casa Patronal / Parque', icon: '🏡' }
];

export const OrdenesTrabajoView: React.FC<OrdenesTrabajoViewProps> = ({
  ordenes,
  parcelas,
  inventario,
  usuarios,
  activeUser,
  onAddOrden,
  onUpdateOrden,
  onExecuteOrden,
  onDeleteOrden,
  canEdit = true
}) => {
  const [isNewOrdenOpen, setIsNewOrdenOpen] = useState(false);
  const [isEditOrdenOpen, setIsEditOrdenOpen] = useState(false);
  const [editingOrden, setEditingOrden] = useState<OrdenTrabajoFitosanitaria | null>(null);
  const [ordenToDelete, setOrdenToDelete] = useState<OrdenTrabajoFitosanitaria | null>(null);

  const [executingOrdenId, setExecutingOrdenId] = useState<string | null>(null);
  const [aplicadorSeleccionado, setAplicadorSeleccionado] = useState(
    usuarios.find((u) => u.rol === 'aplicador_sag')?.nombre || activeUser?.nombre || ''
  );
  const [firmaDigital, setFirmaDigital] = useState('Aplicador Autorizado SAG');

  // Filtrar solo los productos aptos para recetas (Fitosanitarios y Fertilizantes)
  const productosFitoDisponibles = inventario.filter((item) => {
    if (item.categoriaBodega === 'material_riego') return false;
    if (item.categoriaBodega === 'fitosanitario') return true;
    const fitoTypes = ['fungicida', 'bactericida', 'insecticida_acaricida', 'fertilizante_foliar', 'fertilizante_suelo', 'herbicida', 'coadyuvante', 'rompedor_dormancia'];
    return fitoTypes.includes(item.tipo) || item.categoria === 'fitosanitario' || item.categoria === 'fertilizante';
  });

  // Estado del Formulario de NUEVA Orden
  const [destinoSeleccionado, setDestinoSeleccionado] = useState<DestinoProducto>('kiwi');
  const [selectedCuartelIds, setSelectedCuartelIds] = useState<string[]>(parcelas[0]?.id ? [parcelas[0].id] : []);
  const [nombreSectorNoKiwi, setNombreSectorNoKiwi] = useState<string>('');
  const [superficieNoKiwiHa, setSuperficieNoKiwiHa] = useState<number>(1.0);
  const [objetivoFitosanitario, setObjetivoFitosanitario] = useState<string>('');
  const [volumenCaldoLHa, setVolumenCaldoLHa] = useState<number>(1000);
  const [observacionesTecnicas, setObservacionesTecnicas] = useState<string>('');

  // Lista de Productos en la Mezcla (múltiples productos por aplicación)
  const [productosMezcla, setProductosMezcla] = useState<{
    insumoId: string;
    dosisPorHa: number;
  }[]>([
    {
      insumoId: productosFitoDisponibles[0]?.id || inventario[0]?.id || '',
      dosisPorHa: 2.5
    }
  ]);

  // Superficie Total Calculada
  const superficieTotalCalculada = destinoSeleccionado === 'kiwi'
    ? Number(
        selectedCuartelIds.reduce((sum, id) => {
          const p = parcelas.find((item) => item.id === id);
          return sum + (p?.superficieHa || 0);
        }, 0).toFixed(2)
      )
    : Number(superficieNoKiwiHa || 0);

  // Toggle de selección de cuarteles cuando destino === 'kiwi'
  const handleToggleCuartel = (cuartelId: string) => {
    setSelectedCuartelIds((prev) => {
      if (prev.includes(cuartelId)) {
        if (prev.length === 1) return prev; // Mantener al menos 1 cuartel
        return prev.filter((id) => id !== cuartelId);
      }
      return [...prev, cuartelId];
    });
  };

  // Agregar otro producto a la mezcla
  const handleAddProductoMezcla = () => {
    const primerDisponible = productosFitoDisponibles.find(
      (p) => !productosMezcla.some((m) => m.insumoId === p.id)
    ) || productosFitoDisponibles[0] || inventario[0];

    if (!primerDisponible) return;

    setProductosMezcla((prev) => [
      ...prev,
      {
        insumoId: primerDisponible.id,
        dosisPorHa: primerDisponible.categoriaFito === 'coadyuvante' ? 0.5 : 1.0
      }
    ]);
  };

  // Remover producto de la mezcla
  const handleRemoveProductoMezcla = (index: number) => {
    if (productosMezcla.length <= 1) return;
    setProductosMezcla((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Actualizar producto en la mezcla
  const handleUpdateProductoMezcla = (index: number, field: 'insumoId' | 'dosisPorHa', value: any) => {
    setProductosMezcla((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Apertura modal nuevo con reseteo
  const handleOpenNewOrden = () => {
    setDestinoSeleccionado('kiwi');
    setSelectedCuartelIds(parcelas[0]?.id ? [parcelas[0].id] : []);
    setNombreSectorNoKiwi('');
    setSuperficieNoKiwiHa(0);
    setObjetivoFitosanitario('');
    setVolumenCaldoLHa(1000);
    setObservacionesTecnicas('');
    setProductosMezcla([
      {
        insumoId: productosFitoDisponibles[0]?.id || inventario[0]?.id || '',
        dosisPorHa: 0
      }
    ]);
    setIsNewOrdenOpen(true);
  };

  // Creación de la Orden
  const handleCrearOrden = (e: React.FormEvent) => {
    e.preventDefault();

    if (destinoSeleccionado === 'kiwi' && selectedCuartelIds.length === 0) {
      alert('Debe seleccionar al menos 1 cuartel de Kiwi para la aplicación.');
      return;
    }

    if (productosMezcla.length === 0) {
      alert('Debe agregar al menos un producto a la mezcla fitosanitaria.');
      return;
    }

    // Construir lista de productos con cálculos
    const productosOrden: ProductoItemOrden[] = productosMezcla
      .map((item) => {
        const ins = inventario.find((i) => i.id === item.insumoId) || productosFitoDisponibles[0];
        if (!ins) return null;
        const totalReq = Number((superficieTotalCalculada * item.dosisPorHa).toFixed(2));
        return {
          insumoId: ins.id,
          nombreInsumo: ins.nombreComercial,
          categoria: ins.categoriaFito || ins.tipo,
          ingredienteActivoOComposicion: ins.composicionFertilizante || ins.ingredienteActivo || ins.especificacionTecnica || '',
          numeroRegistroSAG: ins.numeroRegistroSAG || 'SAG',
          dosisPorHa: Number(item.dosisPorHa),
          totalProductoRequerido: totalReq,
          unidad: (ins.unidad === 'kg' || ins.unidad === 'L' || ins.unidad === 'unidades') ? ins.unidad : 'kg',
          carenciaDias: ins.periodoCarenciaDias || 0,
          tiempoReingresoHoras: ins.tiempoReingresoHoras || 0
        } as ProductoItemOrden;
      })
      .filter((x): x is ProductoItemOrden => x !== null);

    if (productosOrden.length === 0) {
      alert('No hay productos válidos disponibles en Bodega Fitosanitaria.');
      return;
    }

    const primerProd = productosOrden[0];
    const maxCarencia = Math.max(...productosOrden.map((p) => p.carenciaDias), 0);
    const maxReingreso = Math.max(...productosOrden.map((p) => p.tiempoReingresoHoras), 0);

    const nombresCuarteles = destinoSeleccionado === 'kiwi'
      ? selectedCuartelIds.map((id) => parcelas.find((p) => p.id === id)?.nombre || id)
      : [nombreSectorNoKiwi];

    const nuevaOrden: OrdenTrabajoFitosanitaria = {
      id: `ot-${Date.now()}`,
      codigoReceta: `REC-AGR-2026-${Math.floor(10 + Math.random() * 89)}`,
      fechaEmision: new Date().toISOString().split('T')[0],
      fechaProgramada: new Date().toISOString().split('T')[0],
      destinoAplicacion: destinoSeleccionado,
      parcelaIds: destinoSeleccionado === 'kiwi' ? selectedCuartelIds : [],
      parcelasNombres: nombresCuarteles,
      nombreSectorNoKiwi: destinoSeleccionado !== 'kiwi' ? nombreSectorNoKiwi : undefined,
      superficieTotalHa: superficieTotalCalculada,
      objetivoFitosanitario,
      productos: productosOrden,
      // Compatibilidad con campos raíz
      insumoId: primerProd.insumoId,
      nombreInsumo: productosOrden.map((p) => p.nombreInsumo).join(' + '),
      ingredienteActivo: productosOrden.map((p) => p.ingredienteActivoOComposicion).filter(Boolean).join(' + '),
      numeroRegistroSAG: productosOrden.map((p) => p.numeroRegistroSAG).join(' / '),
      dosisPorHa: primerProd.dosisPorHa,
      volumenCaldoLHa: Number(volumenCaldoLHa),
      totalProductoRequerido: primerProd.totalProductoRequerido,
      unidad: primerProd.unidad,
      eppRequerido: [
        'Traje impermeable Tyvek',
        'Máscara doble filtro Vapores y Polvos',
        'Guantes de nitrilo puño largo',
        'Botas de goma PVC',
        'Antiparras de ventilación indirecta'
      ],
      tiempoReingresoHoras: maxReingreso,
      carenciaDias: maxCarencia,
      ingenieroAgronomoNombre: activeUser?.nombre || 'Responsable Técnico',
      estado: 'en_proceso',
      descontadoInventario: true, // Se descuentan todos los productos al emitir la orden
      fechaDescuentoBodega: new Date().toISOString().split('T')[0],
      observacionesTecnicas
    };

    onAddOrden(nuevaOrden);
    setIsNewOrdenOpen(false);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (orden: OrdenTrabajoFitosanitaria) => {
    setEditingOrden(orden);
    setIsEditOrdenOpen(true);
  };

  // Guardar edición
  const handleGuardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrden || !onUpdateOrden) return;

    onUpdateOrden(editingOrden);
    setIsEditOrdenOpen(false);
    setEditingOrden(null);
  };

  const handleConfirmarEjecucion = (ordenId: string) => {
    onExecuteOrden(ordenId, aplicadorSeleccionado, firmaDigital);
    setExecutingOrdenId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-bold uppercase tracking-wider mb-1">
            <FileCheck2 className="w-3 h-3 text-purple-700" />
            Recetas Agronómicas Oficiales SAG / BPA
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Órdenes de Trabajo Fitosanitarias
          </h1>
          <p className="text-xs text-stone-500">
            Prescripción fitopatológica para <strong>Kiwi Hayward (multi-cuartel)</strong>, Quinta Frutal, Vivero o Casa Patronal, con mezcla de <strong>múltiples productos</strong> y descuento automático de bodega.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenNewOrden}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-center transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Emitir Nueva Receta Fitosanitaria</span>
          </button>
        )}
      </div>

      {/* Tarjeta Informativa de Descuento Automático de Bodega */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-950">
        <div className="flex items-center gap-2.5">
          <Package className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <strong className="font-bold">Descuento Multiproducto de Bodega Automatizado:</strong>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              Al emitir cada orden, todos los insumos de la mezcla se descuentan automáticamente del stock de bodega según la superficie tratada y la dosis prescrita.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10px] uppercase shrink-0">
          Trazabilidad SAG Activa
        </span>
      </div>

      {/* Lista de Órdenes de Trabajo Emitidas */}
      <div className="space-y-4">
        {ordenes.map((orden) => {
          const isCompletada = orden.estado === 'completada';
          const destino = orden.destinoAplicacion || 'kiwi';
          const cfgDestino = DESTINOS_APLICACION.find((d) => d.id === destino);
          const listaProductos = orden.productos && orden.productos.length > 0
            ? orden.productos
            : [
                {
                  insumoId: orden.insumoId,
                  nombreInsumo: orden.nombreInsumo,
                  categoria: 'fitosanitario',
                  ingredienteActivoOComposicion: orden.ingredienteActivo,
                  numeroRegistroSAG: orden.numeroRegistroSAG,
                  dosisPorHa: orden.dosisPorHa,
                  totalProductoRequerido: orden.totalProductoRequerido,
                  unidad: orden.unidad,
                  carenciaDias: orden.carenciaDias,
                  tiempoReingresoHoras: orden.tiempoReingresoHoras
                }
              ];

          return (
            <div
              key={orden.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs transition-all space-y-4 ${
                isCompletada ? 'border-emerald-200' : 'border-amber-300 ring-1 ring-amber-200'
              }`}
            >
              {/* Header de la tarjeta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                    isCompletada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {isCompletada ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5 animate-pulse" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-stone-900">{orden.codigoReceta}</span>
                      
                      {/* Destino Tag */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 flex items-center gap-1 border border-emerald-200">
                        <span>{cfgDestino?.icon}</span>
                        <span>{cfgDestino?.label}</span>
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isCompletada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {orden.estado === 'completada' ? 'Aplicado en Terreno' : 'Pendiente / En Proceso'}
                      </span>

                      {orden.descontadoInventario && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1">
                          <Package className="w-3 h-3 text-blue-700" />
                          Stock Descontado en Bodega
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 mt-0.5">
                      Emitida el {orden.fechaEmision} por <strong>{orden.ingenieroAgronomoNombre}</strong>
                    </div>
                  </div>
                </div>

                {/* Acciones de la orden */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {!isCompletada ? (
                    canEdit ? (
                      <button
                        onClick={() => setExecutingOrdenId(orden.id)}
                        className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Finalizar Aplicación
                      </button>
                    ) : null
                  ) : (
                    <div className="text-right text-[11px] text-stone-500">
                      <div>Aplicador: <strong className="text-emerald-950">{orden.aplicadorNombre}</strong></div>
                      <div className="text-[10px] text-stone-400">{orden.fechaEjecucion}</div>
                    </div>
                  )}

                  {canEdit && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(orden)}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Editar receta fitosanitaria"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => setOrdenToDelete(orden)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Eliminar receta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Información de Destino y Cuarteles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                  <div className="text-[10px] text-stone-400 font-bold uppercase">
                    {destino === 'kiwi' ? 'Cuarteles de Kiwi Tratados' : 'Sector / Zona Tratada'}
                  </div>
                  <div className="font-bold text-stone-900 mt-0.5">
                    {(orden.parcelasNombres || []).join(', ') || 'Cuarteles de Kiwi'}
                  </div>
                  <div className="text-[11px] text-emerald-800 font-bold mt-0.5">
                    Superficie Total: {orden.superficieTotalHa} ha
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                  <div className="text-[10px] text-stone-400 font-bold uppercase">Objetivo Fitosanitario</div>
                  <div className="font-bold text-stone-900 mt-0.5">{orden.objetivoFitosanitario}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Mojamiento: {orden.volumenCaldoLHa || 1000} L caldo/ha
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                  <div className="text-[10px] text-stone-400 font-bold uppercase">Carencia y Reingreso Máximos</div>
                  <div className="font-bold text-amber-900 mt-0.5">
                    Carencia LMR: {orden.carenciaDias} días
                  </div>
                  <div className="text-[11px] text-stone-600 mt-0.5">
                    Reingreso (REI): {orden.tiempoReingresoHoras} horas
                  </div>
                </div>
              </div>

              {/* TABLA DE PRODUCTOS EN LA MEZCLA */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1.5 uppercase">
                    <FlaskConical className="w-3.5 h-3.5 text-emerald-700" />
                    Mezcla de Productos en Tanque ({listaProductos.length} insumos):
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Descuento total calculado según superficie
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-[10px] text-stone-500 uppercase font-bold border-b border-stone-200">
                      <tr>
                        <th className="p-2.5">Producto Prescrito</th>
                        <th className="p-2.5">Ingrediente Activo / Composición</th>
                        <th className="p-2.5">Reg. SAG</th>
                        <th className="p-2.5 text-right">Dosis / Ha</th>
                        <th className="p-2.5 text-right font-black text-emerald-950">Total Descontado</th>
                        <th className="p-2.5 text-center">Carencia</th>
                        <th className="p-2.5 text-center">REI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {listaProductos.map((prod, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/70">
                          <td className="p-2.5 font-bold text-stone-900">
                            {prod.nombreInsumo}
                            {prod.categoria && (
                              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-stone-100 text-stone-600 uppercase">
                                {prod.categoria.replace('_', ' ')}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-stone-600 font-mono text-[11px]">
                            {prod.ingredienteActivoOComposicion || 'N/A'}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-stone-500">
                            {prod.numeroRegistroSAG || 'SAG'}
                          </td>
                          <td className="p-2.5 text-right font-bold text-stone-800">
                            {prod.dosisPorHa} {prod.unidad}/ha
                          </td>
                          <td className="p-2.5 text-right font-black text-emerald-900 bg-emerald-50/50">
                            {prod.totalProductoRequerido} {prod.unidad}
                          </td>
                          <td className="p-2.5 text-center font-bold text-amber-900">
                            {prod.carenciaDias}d
                          </td>
                          <td className="p-2.5 text-center text-stone-600">
                            {prod.tiempoReingresoHoras}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* EPP Requerido y Observaciones */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs pt-2 border-t border-stone-100 text-stone-600">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-stone-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    EPP Obligatorio:
                  </span>
                  {orden.eppRequerido.map((epp, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md text-[10px]">
                      {epp}
                    </span>
                  ))}
                </div>

                {orden.observacionesTecnicas && (
                  <div className="text-[11px] text-stone-500 italic">
                    "{orden.observacionesTecnicas}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Emitir Nueva Receta Fitosanitaria Multiproducto */}
      {isNewOrdenOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-stone-200 overflow-hidden">
            <div className="bg-purple-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-purple-400" />
                Emitir Orden Fitosanitaria (Descuento Automático Bodega)
              </h3>
              <button onClick={() => setIsNewOrdenOpen(false)} className="text-purple-200 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCrearOrden} className="p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              {/* Alerta de Descuento Inmediato */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-950 text-[11px] flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  Al emitir esta receta, se rebajarán de forma automática todas las cantidades prescritas del stock de la bodega de fitosanitarios.
                </span>
              </div>

              {/* 1. SELECCIÓN DE DESTINO DEL PRODUCTO */}
              <div>
                <label className="block font-bold text-stone-800 mb-1.5 uppercase tracking-wider text-[11px]">
                  1. Destino de la Aplicación:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DESTINOS_APLICACION.map((d) => {
                    const isSelected = destinoSeleccionado === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDestinoSeleccionado(d.id)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-100 border-purple-400 text-purple-950 ring-1 ring-purple-300 shadow-xs'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <span className="text-xl">{d.icon}</span>
                        <span>{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. CUARTELES (SOLO SI DESTINO ES KIWI) O SECTOR ALTERNATIVO */}
              {destinoSeleccionado === 'kiwi' ? (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-950 text-xs">
                        Seleccionar Cuarteles de Kiwi Destino (Puede seleccionar más de 1):
                      </span>
                      <p className="text-[11px] text-emerald-800">
                        Marque todos los cuarteles que recibirán esta aplicación fitosanitaria.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCuartelIds(parcelas.map((p) => p.id))}
                        className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                      >
                        Todos
                      </button>
                      <span className="text-stone-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCuartelIds(parcelas[0]?.id ? [parcelas[0].id] : [])}
                        className="text-[10px] font-bold text-stone-500 hover:text-stone-800 underline cursor-pointer"
                      >
                        Solo uno
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parcelas.length === 0 ? (
                      <div className="col-span-full p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                        ⚠️ No tienes cuarteles registrados. Ve a la pestaña <strong>Cuarteles & Mapa</strong> para crear tus cuarteles reales o selecciona otro destino (Quinta Frutal, Vivero, o Casa Patronal) arriba.
                      </div>
                    ) : (
                      parcelas.map((p) => {
                        const isChecked = selectedCuartelIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-white border-emerald-500 shadow-2xs ring-1 ring-emerald-300'
                                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCuartel(p.id)}
                              className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="text-xs">
                              <strong className="text-stone-900 block">{p.nombre}</strong>
                              <div className="text-[11px] text-stone-500">
                                {p.superficieHa} ha · {p.sistemaConduccion} · Sector Riego {p.sectorRiegoNumero}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs font-bold text-emerald-950 border-t border-emerald-200/60">
                    <span>Cuarteles seleccionados: {selectedCuartelIds.length}</span>
                    <span className="text-sm">Superficie Total a Tratar: {superficieTotalCalculada} ha</span>
                  </div>
                </div>
              ) : (
                /* Si destino NO es Kiwi: Quinta Frutal, Vivero o Casa Patronal */
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
                  <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-purple-700" />
                    Destino no-kiwi: Ingrese sector específico y superficie
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-stone-700 mb-1">Nombre del Sector o Plantación:</label>
                      <input
                        type="text"
                        value={nombreSectorNoKiwi}
                        onChange={(e) => setNombreSectorNoKiwi(e.target.value)}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                        placeholder="ej. Quinta Frutal - Manzanos y Nogales"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Superficie a Tratar (ha):</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        value={superficieNoKiwiHa}
                        onChange={(e) => setSuperficieNoKiwiHa(parseFloat(e.target.value) || 0.1)}
                        className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-emerald-900"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PRODUCTOS EN LA MEZCLA (Múltiples productos para la misma aplicación) */}
              <div className="space-y-3 p-3.5 bg-stone-50 border border-stone-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-stone-900 text-xs uppercase tracking-wider block">
                      3. Mezcla de Productos Fitosanitarios / Fertilizantes:
                    </label>
                    <p className="text-[11px] text-stone-500">
                      Puede agregar múltiples productos a la misma aplicación (ej. Bactericida + Fungicida + Coadyuvante).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddProductoMezcla}
                    className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Otro Producto</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {productosMezcla.map((item, index) => {
                    const insumoSeleccionado = inventario.find((i) => i.id === item.insumoId) || productosFitoDisponibles[0];
                    const totalReq = Number((superficieTotalCalculada * item.dosisPorHa).toFixed(2));
                    const stockSuficiente = insumoSeleccionado ? insumoSeleccionado.stockActual >= totalReq : false;

                    return (
                      <div
                        key={index}
                        className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-2 relative"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-900 font-bold text-xs flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                                Producto Fitosanitario / Fertilizante:
                              </label>
                              <select
                                value={item.insumoId}
                                onChange={(e) => handleUpdateProductoMezcla(index, 'insumoId', e.target.value)}
                                className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-xs"
                              >
                                {productosFitoDisponibles.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.nombreComercial} ({f.categoriaFito || f.tipo}) · Stock: {f.stockActual} {f.unidad}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-stone-500 uppercase mb-0.5">
                                Dosis / Ha ({insumoSeleccionado?.unidad}/ha):
                              </label>
                              <input
                                type="number"
                                step="0.05"
                                min="0.01"
                                value={item.dosisPorHa}
                                onChange={(e) => handleUpdateProductoMezcla(index, 'dosisPorHa', parseFloat(e.target.value) || 0)}
                                className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-xs"
                                required
                              />
                            </div>
                          </div>

                          {productosMezcla.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveProductoMezcla(index)}
                              className="p-1.5 text-stone-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 cursor-pointer"
                              title="Quitar producto de la mezcla"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Detalles de Trazabilidad del Producto Seleccionado */}
                        {insumoSeleccionado && (
                          <div className="p-2 bg-stone-50 rounded-lg text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-600 border border-stone-100">
                            <div>
                              <span className="text-stone-400 text-[10px] uppercase block font-bold">Activo / Comp:</span>
                              <strong className="text-stone-800 truncate block">
                                {insumoSeleccionado.composicionFertilizante || insumoSeleccionado.ingredienteActivo || 'N/A'}
                              </strong>
                            </div>

                            <div>
                              <span className="text-stone-400 text-[10px] uppercase block font-bold">Stock Bodega:</span>
                              <span className={`font-bold ${insumoSeleccionado.stockActual <= insumoSeleccionado.stockMinimo ? 'text-rose-700' : 'text-emerald-950'}`}>
                                {insumoSeleccionado.stockActual} {insumoSeleccionado.unidad}
                              </span>
                            </div>

                            <div>
                              <span className="text-stone-400 text-[10px] uppercase block font-bold">Carencia / REI:</span>
                              <span>{insumoSeleccionado.periodoCarenciaDias || 0}d / {insumoSeleccionado.tiempoReingresoHoras || 0}h</span>
                            </div>

                            <div className="text-right">
                              <span className="text-stone-400 text-[10px] uppercase block font-bold">Total a Descontar:</span>
                              <strong className="text-emerald-900 font-black text-xs">
                                {totalReq} {insumoSeleccionado.unidad}
                              </strong>
                            </div>
                          </div>
                        )}

                        {!stockSuficiente && insumoSeleccionado && (
                          <div className="text-[10px] text-rose-700 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Atención: La cantidad requerida ({totalReq} {insumoSeleccionado.unidad}) supera el stock actual disponible ({insumoSeleccionado.stockActual} {insumoSeleccionado.unidad}).
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. OBJETIVO, MOJAMIENTO Y MAQUINARIA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Objetivo Fitosanitario:</label>
                  <input
                    type="text"
                    value={objetivoFitosanitario}
                    onChange={(e) => setObjetivoFitosanitario(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                    placeholder="ej. Control preventivo Psa y Botrytis"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Volumen Mojamiento (L/ha):</label>
                  <input
                    type="number"
                    step="50"
                    value={volumenCaldoLHa}
                    onChange={(e) => setVolumenCaldoLHa(parseInt(e.target.value) || 1000)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones Técnicas / Maquinaria:</label>
                <textarea
                  value={observacionesTecnicas}
                  onChange={(e) => setObservacionesTecnicas(e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsNewOrdenOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-800 hover:bg-purple-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Emitir Orden y Descontar Bodega ({productosMezcla.length} insumos)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ejecutar y Firmar Orden en Terreno */}
      {executingOrdenId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 p-5 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Finalizar y Firmar Aplicación SAG
            </h3>
            <p className="text-stone-500 text-[11px]">
              El aplicador autorizado debe validar la ejecución según la receta agronómica oficial y normas SAG.
            </p>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Aplicador Responsable con Carnet SAG:</label>
              <select
                value={aplicadorSeleccionado}
                onChange={(e) => setAplicadorSeleccionado(e.target.value)}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.nombre}>
                    {u.nombre} ({u.cargo} - {u.carnetSAGVigente ? 'SAG Vigente' : 'Sin carnet'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Firma Digital / Declaración:</label>
              <input
                type="text"
                value={firmaDigital}
                onChange={(e) => setFirmaDigital(e.target.value)}
                className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono text-[11px]"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setExecutingOrdenId(null)}
                className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmarEjecucion(executingOrdenId)}
                className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Confirmar Ejecución
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar Orden Existente */}
      {isEditOrdenOpen && editingOrden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 overflow-hidden">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                Editar Orden: {editingOrden.codigoReceta}
              </h3>
              <button onClick={() => setIsEditOrdenOpen(false)} className="text-stone-300 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="p-5 space-y-3 text-xs max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Objetivo Fitosanitario:</label>
                <input
                  type="text"
                  value={editingOrden.objetivoFitosanitario}
                  onChange={(e) => setEditingOrden({ ...editingOrden, objetivoFitosanitario: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Superficie Total (ha):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingOrden.superficieTotalHa}
                    onChange={(e) => setEditingOrden({ ...editingOrden, superficieTotalHa: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Volumen Caldo (L/ha):</label>
                  <input
                    type="number"
                    value={editingOrden.volumenCaldoLHa}
                    onChange={(e) => setEditingOrden({ ...editingOrden, volumenCaldoLHa: parseInt(e.target.value) || 1000 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Carencia (Días LMR):</label>
                  <input
                    type="number"
                    value={editingOrden.carenciaDias}
                    onChange={(e) => setEditingOrden({ ...editingOrden, carenciaDias: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold text-amber-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Reingreso REI (Horas):</label>
                  <input
                    type="number"
                    value={editingOrden.tiempoReingresoHoras}
                    onChange={(e) => setEditingOrden({ ...editingOrden, tiempoReingresoHoras: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Estado de la Aplicación:</label>
                <select
                  value={editingOrden.estado}
                  onChange={(e) => setEditingOrden({ ...editingOrden, estado: e.target.value as any })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-bold"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En Proceso / Emitida</option>
                  <option value="completada">Completada / Aplicada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Observaciones Técnicas:</label>
                <textarea
                  value={editingOrden.observacionesTecnicas || ''}
                  onChange={(e) => setEditingOrden({ ...editingOrden, observacionesTecnicas: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditOrdenOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Eliminación In-App */}
      {ordenToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Eliminar Orden Fitosanitaria</h3>
              <button onClick={() => setOrdenToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-stone-700">
                ¿Estás seguro de que deseas eliminar permanentemente la receta <strong>{ordenToDelete.codigoReceta}</strong>?
              </p>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-600 text-[11px]">
                <strong>Objetivo:</strong> {ordenToDelete.objetivoFitosanitario}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setOrdenToDelete(null)}
                  className="px-3.5 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteOrden(ordenToDelete.id);
                    setOrdenToDelete(null);
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
