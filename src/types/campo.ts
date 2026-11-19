export type TipoLabor = 
  | 'fitosanitario' 
  | 'fertilizacion' 
  | 'riego' 
  | 'poda' 
  | 'polinizacion' 
  | 'cosecha' 
  | 'monitoreo' 
  | 'mantenimiento' 
  | 'desmalezado';

export type NivelAcceso = 'admin' | 'editor_campo' | 'solo_lectura';

export type RolUsuario = 
  | 'administrador' 
  | 'encargado_campo'
  | 'agronomo' 
  | 'capataz' 
  | 'aplicador_sag' 
  | 'operador_riego'
  | 'solo_lectura';

export interface ExplotacionAgricola {
  id: string;
  nombreFundo: string;
  rut: string;
  comuna: string;
  provincia: string;
  region: string;
  direccion: string;
  representanteLegal: string;
  rutRepresentante: string;
  asesorAgronomo: string;
  registroColegioAgronomos?: string;
  telefonoContacto: string;
  emailContacto: string;
  superficieTotalHa: number;
  superficieKiwisHa: number;
  variedadPrincipal: string; // 'Kiwi Hayward'
  polinizadores: string[]; // ['Tomuri', 'Chieftain', 'M91']
  certificaciones: string[]; // ['GlobalGAP IFA v6', 'Cuaderno Oficial SAG Chile', 'BPA Buenas Prácticas']
  latitud: number;
  longitud: number;
}

export interface Parcela {
  id: string;
  nombre: string;
  codigoCuartel: string;
  sectorRiegoNumero: number; // Sector de riego principal asociado
  superficieHa: number;
  variedad: string; // 'Kiwi Hayward', 'Kiwi Amarillo', etc.
  patronPortainjerto: string; // 'Franco / Semilla Hayward' o 'Bounty'
  polinizador: string; // 'Tomuri / Chieftain (1:8)'
  sistemaConduccion: string; // 'Parrón Español', 'Espaldera en T', 'T-Bar Pergola', o personalizado
  marcoPlantacion: string; // '4.5m x 4.0m'
  plantasPorHa: number; // 555
  anioPlantacion: number;
  estadoFenologico: string; // 'Yema hinchada', 'Floración', 'Cuaja', 'Crecimiento fruto', 'Maduración', 'Post-cosecha'
  fechaEstadoFenologico?: string; // Fecha ISO del último cambio de estado fenológico del cuartel
  estadoActual: string; // 'Normal', 'En Carencia SAG', 'Listo para Cosecha', 'En Riego', etc.
  lmrActivo?: string; // Nombre del producto en carencia
  diasCarenciaRestantes?: number;
  fechaUltimaAplicacion?: string;
  rendimientoEstimadoTonHa: number;
  colorHex: string;
  lat?: number;
  lng?: number;
  sectoresRiego?: (number | string)[]; // Soporte para más de un sector de riego destinado a un solo cuartel
  coordenadasPoligono: { lat: number; lng: number }[];
  notas?: string;
}

export interface SectorRiego {
  id: number | string;
  nombre: string;
  ha?: number;
  caudalDisenoLs?: number;
  descripcion?: string;
}

export type TipoLugarPredio = 
  | 'porton' 
  | 'bodega' 
  | 'caseta_riego' 
  | 'pozo' 
  | 'estacion_meteo' 
  | 'comedor' 
  | 'punto_limpio' 
  | 'taller_maquinaria'
  | 'barbecho'
  | 'oficina'
  | 'casa_patronal'
  | 'cuartel'
  | 'otro';

export interface LugarPredio {
  id: string;
  nombre: string;
  tipo: TipoLugarPredio;
  descripcion: string;
  lat: number;
  lng: number;
  superficieHa?: number; // Para barbechos u otras zonas
  colorHex?: string;
}

export interface TurnoRiego {
  id: string;
  fecha: string;
  horaInicio: string;
  horaTermino?: string;
  sectorRiegoId: number | string;
  sectorNombre: string;
  cuartelesInvolucrados: string[];
  duracionHoras: number;
  laminaAguaMm: number;
  volumenM3: number;
  caudalimetroInicialM3?: number;
  caudalimetroFinalM3?: number;
  conFertirriego: boolean;
  fertilizanteInyectado?: string;
  dosisFertilizanteKg?: number;
  presionCabezalBar: number;
  presionFinLineaBar: number;
  operadorRiego: string;
  observaciones?: string;
}

export type CategoriaBodega = 'fitosanitario' | 'material_riego';

export type CategoriaFitosanitario = 
  | 'herbicida' 
  | 'fungicida' 
  | 'acaricida' 
  | 'insecticida' 
  | 'coadyuvante' 
  | 'bactericida' 
  | 'bioestimulante' 
  | 'fitorregulador' 
  | 'fungicida_bactericida' 
  | 'elicitor_psa' 
  | 'fertilizante';

export type CategoriaMaterial = 
  | 'insumo_riego' 
  | 'alambre_estructura' 
  | 'polin_madera' 
  | 'malla_cobertor' 
  | 'herramienta_equipo' 
  | 'epp_seguridad' 
  | 'otro';

export type DestinoProducto = 
  | 'kiwi' 
  | 'quinta_frutal' 
  | 'vivero' 
  | 'casa_patronal';

export type EstadoFertilizante = 'liquido' | 'granulado';
export type SolubilidadFertilizante = 'soluble' | 'no_soluble';

export type CategoriaInventario = 
  | 'fitosanitario' 
  | 'fertilizante' 
  | 'insumo_riego' 
  | 'alambre_estructura' 
  | 'polin_madera' 
  | 'malla_cobertor' 
  | 'herramienta_equipo' 
  | 'epp_seguridad' 
  | 'otro';

export interface InsumoInventario {
  id: string;
  nombreComercial: string;
  categoriaBodega?: CategoriaBodega; // Separación estricta de Bodegas
  categoria?: CategoriaInventario;
  
  // Categoría específica de Fitosanitarios / Agroquímicos
  categoriaFito?: CategoriaFitosanitario;
  
  // Categoría específica de Materiales / Riego
  categoriaMaterial?: CategoriaMaterial;
  
  // Para Fitosanitarios
  ingredienteActivo?: string;
  
  // Para Fertilizantes
  estadoFertilizante?: EstadoFertilizante; // Líquido o Granulado
  solubilidadFertilizante?: SolubilidadFertilizante; // Soluble o No soluble
  composicionFertilizante?: string; // Composición N-P-K y microelementos
  
  // Fechas obligatorias de trazabilidad
  fechaElaboracion?: string;
  fechaVencimiento?: string;
  
  // Destino autorizado del producto
  destinosUso?: DestinoProducto[]; // Kiwi, Quinta Frutal, Vivero, Casa Patronal
  
  fabricante: string;
  numeroRegistroSAG?: string;
  tipo: string;
  stockActual: number;
  stockMinimo: number;
  unidad: 'Kg' | 'Litros' | 'cc' | 'ml' | 'gramos' | 'kg' | 'L' | 'unidades' | 'metros' | 'rollos' | 'pares';
  costoUnitarioCLP: number;
  lote?: string;
  tieneCarencia?: boolean; // No todos los productos tienen carencia SAG
  periodoCarenciaDias?: number; // LMR SAG (0 si no tiene)
  tiempoReingresoHoras?: number; // REI
  dosisRecomendadaHa?: string;
  especificacionTecnica?: string;
  ubicacionBodega?: string;
  observaciones?: string;
  consumoHistoricoAcumulado: number;
}

export interface RegistroLabor {
  id: string;
  fecha: string;
  hora?: string;
  parcelaId: string;
  parcelaNombre: string;
  tipoLabor: TipoLabor;
  descripcion: string;
  
  // Específico para fitosanitarios y fertilizantes
  insumoId?: string;
  nombreInsumo?: string;
  dosisPorHa?: number;
  volumenCaldoLHa?: number;
  totalInsumoUtilizado?: number;
  unidadMedida?: 'kg' | 'L' | 'unidades' | 'metros' | 'rollos' | 'pares' | string;
  metodoAplicacion?: string; // 'Turbo Pulverizador', 'Bomba de Espalda', 'Fertirriego', 'Manual'
  tractoristaMaquinaria?: string;
  eppUtilizado?: string[];
  periodoCarenciaDias?: number;
  reingresoHoras?: number;
  objetivoPlagaEnfermedad?: string;

  // Específico para Riego
  volumenM3?: number;
  litrosAgua?: number;
  duracionRiegoHoras?: number;
  sectorRiego?: string;
  registroPozoId?: string;

  // Operación y Responsables
  registradoPor: string;
  rutAplicador?: string;
  numeroCarnetSAG?: string;
  aprobadoPorAgronomo?: string;
  condicionesClimaticas?: {
    temperaturaC?: number;
    humedadRelativa?: number;
    velocidadVientoKmH?: number;
  };
  observaciones?: string;
  fotoEvidenciaDataUrl?: string;
}

export interface RegistroExtraccionPozo {
  id: string;
  fecha: string; // Fecha de muestreo
  hora: string; // Hora inicio
  horaTermino?: string; // Hora término
  fechaHoraMuestreo?: string; // Timestamp de fiscalización DGA
  
  // Horómetro y Caudales exigidos por DGA
  horometroInicialHoras: number; // Horómetro inicial bomba (hrs)
  horometroFinalHoras: number; // Horómetro final bomba (hrs)
  horasHorometro: number; // Total horas horómetro
  caudalInicialLs: number; // Caudal inicial L/s al encender
  caudalFinalLs: number; // Caudal final L/s al apagar
  caudalPromedioLs: number; // Caudal promedio L/s
  
  // Flujómetro / Totalizador m³
  lecturaInicialM3: number;
  lecturaFinalM3: number;
  metrosCubicosExtraidos: number;
  litrosTotales: number;
  horasBombeo: number;
  
  // Niveles piezométricos DGA
  nivelEstaticoM?: number; // Nivel estático agua (m)
  nivelDinamicoM?: number; // Nivel dinámico bajo bombeo (m)
  
  // 4 Sectores de Riego
  sectorRiegoNumero?: number; // 1, 2, 3 o 4
  sectorDestino: string; // Sector 1, 2, 3 o 4
  operadorBomba: string;
  observaciones?: string;
}

export interface MuestreoMadurez {
  id: string;
  fecha: string;
  parcelaId: string;
  parcelaNombre: string;
  gradosBrixPromedio: number;
  solidoSolubleMin: number;
  solidoSolubleMax: number;
  firmezaPulpaLb: number; // penetrómetro 14-16 lb
  porcentajeMateriaSeca: number; // > 15.5%
  numeroMuestras: number;
  aptoParaCosechaSAG: boolean; // >= 6.2° Brix
  muestreadoPor: string;
  laboratorio?: string;
  observaciones?: string;
}

export interface RegistroCosechaLote {
  id: string;
  fecha: string;
  parcelaId: string;
  parcelaNombre: string;
  cantidadBins: number;
  pesoNetoKgEstimado: number; // ~390 kg/bin
  cuadrilla: string;
  calibrePredominante: string; // 'Calibre 27', 'Calibre 30', 'Calibre 33', 'Calibre 36'
  packingDestino: string; // 'Frusan Curicó', 'David del Curto', 'Copefrut Teno'
  numeroGuiaDespacho: string;
  choferCamion: string;
  patenteCamion: string;
  estado: 'en_cosecha' | 'despachado_packing' | 'recibido_planta';
  observaciones?: string;
}

export interface ProductoItemOrden {
  insumoId: string;
  nombreInsumo: string;
  categoria?: string;
  ingredienteActivoOComposicion?: string;
  numeroRegistroSAG?: string;
  dosisPorHa: number;
  totalProductoRequerido: number;
  unidad: 'kg' | 'L' | 'unidades';
  carenciaDias: number;
  tiempoReingresoHoras: number;
}

export interface OrdenTrabajoFitosanitaria {
  id: string;
  codigoReceta: string;
  fechaEmision: string;
  fechaProgramada: string;
  
  // Destino de la Aplicación: 'kiwi' | 'quinta_frutal' | 'vivero' | 'casa_patronal'
  destinoAplicacion?: DestinoProducto;
  
  // Si destino === 'kiwi', se seleccionan 1 o más cuarteles
  parcelaIds: string[];
  parcelasNombres: string[];
  
  // Si destino !== 'kiwi' (Quinta Frutal, Vivero, Casa Patronal)
  nombreSectorNoKiwi?: string;
  
  superficieTotalHa: number;
  objetivoFitosanitario: string; // ej. 'Control Psa Post-Poda', 'Botrytis Caída de Pétalos'
  
  // Lista de múltiples productos fitosanitarios/fertilizantes en la misma aplicación
  productos?: ProductoItemOrden[];
  
  // Campos del producto principal (compatibilidad)
  insumoId: string;
  nombreInsumo: string;
  ingredienteActivo: string;
  numeroRegistroSAG: string;
  dosisPorHa: number;
  volumenCaldoLHa: number;
  totalProductoRequerido: number;
  unidad: 'kg' | 'L' | 'unidades';
  
  eppRequerido: string[];
  tiempoReingresoHoras: number;
  carenciaDias: number;
  ingenieroAgronomoNombre: string;
  estado: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada';
  descontadoInventario: boolean; // Descontado automáticamente al emitir la orden
  fechaDescuentoBodega?: string;
  aplicadorNombre?: string;
  aplicadorFirma?: string;
  fechaEjecucion?: string;
  observacionesTecnicas?: string;
}

export type PeriodicidadRegistroTermico = 'diario' | 'semanal' | 'mensual';

export interface RegistroTermicoHuerto {
  id: string;
  periodicidad: PeriodicidadRegistroTermico;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD (igual a fechaInicio si es diario)
  etiquetaPeriodo?: string;
  tempMinC?: number;
  tempMaxC?: number;
  tempBaseGddC?: number;
  diasPeriodo?: number;
  horasFrioPeriodo: number; // Horas Frío (< 7.2°C) en el período
  gradosDiaPeriodo: number; // Grados Día (°D) acumulados en el período
  fuenteDato?: 'Estación Predial' | 'Open-Meteo' | 'Manual';
  observaciones?: string;
}

export interface CondicionHorasFrio {
  fechaCorte: string;
  totalAcumuladoHF: number;
  metaVariedadHF: number; // 850 para Hayward
  modeloCalculo: 'Weinberger (< 7.2°C)' | 'Utah' | 'Dinámico';
  porcentajeCumplimiento: number;
  estadoDormancia: 'Dormancia profunda' | 'Transición' | 'Salida de receso' | 'Yema hinchada';
  recomendacionRompedor: string;
  // Ventanas estacionales y Grados Día (GDD)
  fechaInicioHF?: string; // Ej. 22 de Mayo (YYYY-05-22)
  fechaFinHF?: string; // Ej. 31 de Agosto (YYYY-08-31)
  fechaInicioGD?: string; // Ej. 1 de Julio (YYYY-07-01)
  fechaFinGD?: string; // Ej. 30 de Abril (YYYY-04-30)
  tempBaseGddC?: number; // Default 10°C para Kiwi Hayward
  tempTechoGddC?: number; // Default 30°C umbral superior
  totalAcumuladoGD?: number;
  metaVariedadGD?: number; // Default 1850 °D para madurez Hayward (>= 6.2° Brix)
  sincronizarDesdeRegistros?: boolean; // Recalcular totales sumando los registros dentro de cada ventana
}

export interface SeguimientoFenologico {
  id: string;
  fecha: string;
  fechaFin?: string;
  parcelaId: string;
  parcelaNombre: string;
  escalaBBCH: string;
  nombreEtapa?: string;
  estadoEtapa?: 'programado' | 'en_curso' | 'completado';
  estadoDescripcion: string;
  porcentajeAvance: number;
  observaciones: string;
}

export type EstadoPuntoAuditoriaBPA = 'pendiente' | 'cumple' | 'no_cumple' | 'na';

export interface ItemAuditoriaBPA {
  id: string;
  codigo: string;
  seccion: string;
  requisito: string;
  criterioCumplimiento?: string;
  criticidad: 'Mayor' | 'Menor' | 'Recomendación';
  estado: EstadoPuntoAuditoriaBPA;
  observacion?: string;
  accionCorrectiva?: string;
  fechaLimiteAccion?: string;
  responsable?: string;
  fechaVerificacion?: string;
  evidenciaFotoDataUrl?: string;
  autoCheckKey?: string;
  esPersonalizado?: boolean;
}

export interface PlanillaAuditoriaBPA {
  id: string;
  titulo: string;
  temporada: string;
  tipoAuditoria: 'Autoevaluación BPA' | 'GlobalG.A.P. IFA v6' | 'Fiscalización SAG' | 'Pre-Auditoría Exportadora';
  fechaInicio: string;
  fechaUltimaRevision: string;
  auditorResponsable: string;
  notasGenerales?: string;
  items: ItemAuditoriaBPA[];
}

export interface RegistroPolinizacion {
  id: string;
  fecha: string;
  colmenasApisInstaladas: number;
  colmenasBombusInstaladas: number;
  porcentajeFloracionFemenina: number;
  porcentajeFloracionMasculina: number;
  actividadAbejasCalificacion: 'Baja (< 10 abejas/m²)' | 'Media (10-25 abejas/m²)' | 'Óptima (> 25 abejas/m²)';
  temperaturaMediaC: number;
  humedadRelativa: number;
  observaciones: string;
}

export interface UsuarioPredio {
  id: string;
  nombre: string;
  rut: string;
  email: string;
  password: string; // Clave personal de acceso a la app
  rol: RolUsuario;
  nivelAcceso?: NivelAcceso; // Control de permisos: admin | editor_campo | solo_lectura
  carnetSAGVigente: boolean;
  numeroCarnetSAG?: string;
  fechaVencimientoCarnetSAG?: string;
  telefono: string;
  cargo: string;
}

export interface RegistroMantencionMaquinaria {
  id: string;
  maquinariaId: string;
  maquinariaNombre: string;
  fecha: string;
  horometro: number;
  tipoMantencion: string; // 'Cambio aceite motor y filtros', 'Calibración pastillas nebulizador', 'Engrase general', etc.
  tallerOMecanico: string;
  costoCLP: number;
  repuestosUtilizados: string;
  observaciones?: string;
  fotoEvidenciaDataUrl?: string;
}

export interface MaquinariaEquipo {
  id: string;
  codigoInterno: string; // 'TRAC-01', 'PULV-01', etc.
  nombre: string;
  tipo: 'tractor' | 'pulverizador' | 'atomizador' | 'bomba_espalda' | 'camioneta' | 'coloso' | 'desbrozadora' | 'generador' | 'motobomba' | 'otro';
  marcaModelo: string;
  patenteOSerie: string;
  anio: number;
  horometroActual: number; // o Kilómetros
  horometroUltimaMantencion: number;
  frecuenciaMantencionHoras: number; // ej. 250 horas
  estado: 'operativo' | 'mantencion_proxima' | 'en_taller' | 'fuera_servicio';
  operadorAsignado: string;
  fechaUltimaMantencion: string;
  fechaProximaMantencion: string;
  observaciones?: string;
}

export interface ClimaCondiciones {
  temperaturaActual: number;
  tempMinima: number;
  tempMaxima: number;
  humedadRelativa: number;
  velocidadVientoKmH: number;
  direccionViento: string;
  probabilidadLluvia: number;
  alertaHelada: boolean;
  riesgoPsa: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  riesgoBotrytis: 'Bajo' | 'Medio' | 'Alto';
  evapotranspiracionEtoMmDia: number;
  estadoCielo: 'Soleado' | 'Parcialmente Nublado' | 'Nublado' | 'Lluvia Moderada';
}

export interface MuestreoBrotacion {
  id: string;
  fecha: string;
  parcelaId: string;
  parcelaNombre: string;
  hilera?: string; // ej. "Hilera 5" o número de hilera
  plantasMuestreadas?: number;
  variedad: string;
  cargadoresEvaluados: number;
  yemasTotales: number;
  yemasBrotadas: number;
  porcentajeBrotacion: number; // (yemasBrotadas / yemasTotales) * 100
  brotesConFlor: number;
  brotesVegetativosCiegos: number;
  porcentajeBrotesConFlor: number; // (brotesConFlor / yemasBrotadas) * 100
  brotacionBasePct: number;
  brotacionMedioPct: number;
  brotacionPuntaPct: number;
  evaluador: string;
  observaciones?: string;
}

export interface ConteoBotonesFlorales {
  id: string;
  fecha: string;
  parcelaId: string;
  parcelaNombre: string;
  hilera?: string; // ej. "Hilera 8" o número de hilera
  plantasMuestreadas?: number;
  brotesEvaluados: number;
  botonesPorBrotePromedio: number;
  botonesUnicosKing: number;
  botonesDoblesTriplesMariposas: number;
  floresDefectuosasPlanas: number;
  densidadBotonesPorM2: number;
  estadoRaleoBotones: 'Pendiente' | 'En curso' | 'Finalizado';
  porcentajeAvanceRaleo: number;
  jornalesPorHaUtilizados?: number;
  evaluador: string;
  observaciones?: string;
}

export interface SincroniaFloral {
  id: string;
  fecha: string;
  parcelaId: string;
  parcelaNombre: string;
  porcentajeFloracionHembra: number; // % flor abierta Hayward
  porcentajeFloracionMacho: number; // % flor abierta Tomuri / Chieftain
  estadoSincronia: 'Sincronizado' | 'Macho adelantado' | 'Macho retrasado';
  diasDesfase: number;
  colmenasApisInstaladas: number;
  colmenasBombusInstaladas: number;
  abejasPorM2: number;
  actividadPolinizadores: 'Baja (< 10 abejas/m²)' | 'Media (10-25 abejas/m²)' | 'Óptima (> 25 abejas/m²)';
  temperaturaAmbienteC: number;
  humedadRelativa: number;
  observaciones?: string;
}

export interface AplicacionPolenAsistido {
  id: string;
  fecha: string;
  hora: string;
  parcelasIds: string[];
  parcelasNombres: string[];
  tipoPolen: 'Polen Puro Liofilizado Tomuri' | 'Polen Fresco Cosecha Propia' | 'Polen Comercial Certificado';
  lotePolen: string;
  viabilidadPolenPorcentaje: number;
  metodoAplicacion: 'Pulverización Líquida en Suspensión' | 'Electrostático Neumático (Duster en Seco)' | 'Aplicador Manual';
  dosisGramosPorHa: number;
  volumenAguaLHa?: number;
  equipoMaquinaria: string;
  operador: string;
  condicionesClimaticas: string;
  observaciones?: string;
}

export interface PlanCargaRaleo {
  id: string;
  fechaPlanificacion: string;
  parcelaId: string;
  parcelaNombre: string;
  superficieHa: number;
  plantasPorHa: number;
  porcentajePlantasHembra: number;
  tonHaObjetivo: number;
  pesoFrutoObjetivoGr: number;
  margenSeguridadPct: number;
  frutosObjetivoHa: number;
  frutosObjetivoM2: number;
  frutosObjetivoPlanta: number;
  cargaActualPorPlanta: number;
  excedentePorPlanta: number;
  porcentajeRaleoRequerido: number;
  totalFrutosARalearCuartel: number;
  fechaInicioPlanificada: string;
  fechaTerminoPlanificada: string;
  rendimientoJornalPlantasDia: number;
  cuadrillaPersonas: number;
  costoJornalCLP: number;
  jornalesEstimadosTotales: number;
  diasEstimadosFaena: number;
  costoEstimadoTotalCLP: number;
  prioridadRaleo: '1° Flores laterales y mariposas' | '2° Frutos deformes y chicos' | '3° Ajuste de carga final';
  estado: 'Planificado' | 'En ejecución' | 'Completado';
  avanceRealPct: number;
  responsable: string;
  observaciones?: string;
}

export interface EvaluacionCuajaSemillas {
  id: string;
  fecha: string;
  diasPostPlenaFlor: number;
  parcelaId: string;
  parcelaNombre: string;
  hilera?: string;
  floresEvaluadas: number;
  frutosCuajados: number;
  porcentajeCuaja: number;
  frutosCuajadosPorPlanta?: number;
  frutosPorM2Estimado: number;
  frutosDeformesAbanicoPct: number;
  pesoPromedioFrutoMuestraGr: number;
  frutosCortadosMuestra: number;
  semillasPromedioPorFruto: number;
  semillasMinFruto: number;
  semillasMaxFruto: number;
  porcentajeFrutosSobre1000Semillas: number;
  calibreProyectado: string;
  calificacionPolinizacion: 'Excelente' | 'Aceptable' | 'Deficiente';
  evaluador: string;
  observaciones?: string;
}

export interface LiquidacionPacking {
  id: string;
  cosechaLoteId?: string;
  numeroGuiaDespacho: string;
  fechaLiquidacion: string;
  parcelaId: string;
  parcelaNombre: string;
  packingExportadora: string;
  kilosRecibidosKg: number;
  kilosEmbaladosExportacionKg: number;
  kilosDescarteKg: number;
  porcentajeExportable: number;
  cajasExportables: number;
  distribucionCalibres: string; // ej. "C27: 25%, C30: 42%, C33: 23%, C36: 10%"
  retornoTotalUSD: number;
  tipoCambioCLP: number;
  retornoTotalCLP: number;
  precioPromedioUSDKg: number;
  estado: 'Pendiente' | 'Parcial' | 'Liquidado';
  observaciones?: string;
}

export type TipoAnalisisLaboratorio = 'suelo' | 'agua' | 'foliar' | 'multirresiduos' | 'psa_patologia';

export interface AnalisisLaboratorio {
  id: string;
  tipo: TipoAnalisisLaboratorio;
  fechaMuestreo: string;
  fechaResultado: string;
  temporada: string;
  parcelaId: string; // ID de cuartel o 'predio-pozo'
  parcelaNombre: string;
  laboratorio: string;
  codigoInforme: string;
  resultadoGlobal: 'Óptimo' | 'Atención / Corregir' | 'Crítico / Rechazo' | 'Negativo (Limpio)' | 'Positivo';
  // Parámetros Suelo / Foliar / Agua
  ph?: number;
  ceDsM?: number;
  materiaOrganicaPct?: number;
  nitrogenoPpm?: number;
  fosforoPpm?: number;
  potasioPpm?: number;
  boroPpm?: number;
  zincPpm?: number;
  // Parámetros Agua (GlobalGAP / BPA)
  coliformesFecales?: string;
  eColi?: string;
  nitratosMgL?: number;
  // Parámetros Multirresiduos (LMR)
  moleculasDetectadas?: string;
  bajoNormaLmr?: boolean;
  mercadoObjetivo?: string;
  // Patología / Psa
  organoMuestreado?: string;
  agenteDetectado?: string;
  urlDocumento?: string;
  fotoEvidenciaDataUrl?: string;
  observaciones?: string;
}

export interface RegistroEnvaseLimpio {
  id: string;
  fecha: string;
  productoNombre: string;
  cantidadEnvases: number;
  capacidadUnidad: string; // ej. '1 L', '5 L', '20 Kg'
  tripleLavadoRealizado: boolean;
  perforadoInutilizado: boolean;
  centroAcopioDestino: string; // ej. 'Campo Limpio / Punto Acopio Comunal'
  numeroComprobante?: string;
  responsable: string;
  observaciones?: string;
}

export interface CalibracionEquipo {
  id: string;
  fechaCalibracion: string;
  fechaProximaCalibracion: string;
  equipoNombre: string;
  tipoEquipo: 'Pulverizador / Nebulizador' | 'Refractómetro' | 'Penetrómetro' | 'Romana / Báscula' | 'Medidor pH/CE' | 'Otro';
  patronMetodo: string;
  desviacionPct: number;
  numeroCertificado?: string;
  resultado: 'Aprobado / Calibrado' | 'Requiere Ajuste' | 'Fuera de Servicio';
  responsable: string;
  fotoEvidenciaDataUrl?: string;
  observaciones?: string;
}

export type CategoriaTareaHuerto =
  | 'Poda & Amarre'
  | 'Riego & Pozo'
  | 'Fitosanitario'
  | 'Fertilización'
  | 'Polinización & Raleo'
  | 'Cosecha & Madurez'
  | 'Maquinaria & Calibración'
  | 'Auditoría & Laboratorio';

export interface TareaAgronomica {
  id: string;
  titulo: string;
  categoria: CategoriaTareaHuerto;
  fechaLimite: string;
  temporada: string;
  parcelaId?: string;
  parcelaNombre?: string;
  responsable: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  estado: 'Pendiente' | 'En curso' | 'Completada';
  observaciones?: string;
}

export interface ResumenTemporada {
  id: string;
  temporada: string; // ej. "2024-2025"
  horasFrioTotales: number;
  gradosDiaTotales: number;
  aguaConsumidaM3Ha: number;
  porcentajeCuajaPromedio: number;
  cosechaTonHa: number;
  retornoPromedioUSDKg: number;
  observaciones?: string;
}

export interface EstadoFenologicoCatalogo {
  id: string;
  code: string;
  nombre: string;
  descripcion?: string;
}

export interface AppStateData {
  explotacion: ExplotacionAgricola;
  parcelas: Parcela[];
  labores: RegistroLabor[];
  inventario: InsumoInventario[];
  registrosPozo: RegistroExtraccionPozo[];
  maquinarias: MaquinariaEquipo[];
  registrosMantencion: RegistroMantencionMaquinaria[];
  lugares: LugarPredio[];
  usuarios: UsuarioPredio[];
  activeUserId: string;
  muestreosMadurez: MuestreoMadurez[];
  cosechasLote: RegistroCosechaLote[];
  ordenesTrabajo: OrdenTrabajoFitosanitaria[];
  horasFrio: CondicionHorasFrio;
  registrosTermicos?: RegistroTermicoHuerto[];
  fenologia: SeguimientoFenologico[];
  estadosFenologicosPersonalizados?: EstadoFenologicoCatalogo[];
  polinizacion: RegistroPolinizacion[];
  muestreosBrotacion?: MuestreoBrotacion[];
  conteosBotones?: ConteoBotonesFlorales[];
  sincroniasFlorales?: SincroniaFloral[];
  aplicacionesPolen?: AplicacionPolenAsistido[];
  planesCargaRaleo?: PlanCargaRaleo[];
  evaluacionesCuajaSemillas?: EvaluacionCuajaSemillas[];
  turnosRiego?: TurnoRiego[];
  clima?: ClimaCondiciones;
  liquidacionesPacking?: LiquidacionPacking[];
  analisisLaboratorio?: AnalisisLaboratorio[];
  registrosEnvases?: RegistroEnvaseLimpio[];
  calibracionesEquipo?: CalibracionEquipo[];
  auditoriaManual?: Record<string, boolean>;
  planillaBpa?: PlanillaAuditoriaBPA;
  tareasHuerto?: TareaAgronomica[];
  resumenesTemporada?: ResumenTemporada[];
  ultimaActualizacion?: string;
}



