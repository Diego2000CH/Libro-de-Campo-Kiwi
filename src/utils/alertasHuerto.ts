import {
  AnalisisLaboratorio,
  CalibracionEquipo,
  InsumoInventario,
  MaquinariaEquipo,
  Parcela,
  TareaAgronomica,
  UsuarioPredio,
} from '../types/campo';
import type { ActiveTab } from '../components/Navbar';

export interface AlertaProactivaHuerto {
  id: string;
  severidad: 'critica' | 'advertencia' | 'info';
  categoria: 'Bodega' | 'Personal SAG' | 'Maquinaria' | 'Calibración' | 'Laboratorio' | 'Carencia SAG' | 'Calendario';
  titulo: string;
  detalle: string;
  tabDestino: ActiveTab;
}

function diasHasta(fechaIso?: string): number | null {
  if (!fechaIso) return null;
  const parsed = Date.parse(fechaIso);
  if (!Number.isFinite(parsed)) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const diff = parsed - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function generarAlertasProactivasHuerto(params: {
  inventario: InsumoInventario[];
  usuarios: UsuarioPredio[];
  maquinarias: MaquinariaEquipo[];
  calibracionesEquipo: CalibracionEquipo[];
  analisisLaboratorio: AnalisisLaboratorio[];
  parcelas: Parcela[];
  tareasHuerto: TareaAgronomica[];
}): AlertaProactivaHuerto[] {
  const {
    inventario,
    usuarios,
    maquinarias,
    calibracionesEquipo,
    analisisLaboratorio,
    parcelas,
    tareasHuerto,
  } = params;

  const alertas: AlertaProactivaHuerto[] = [];

  // 1. Insumos vencidos o por vencer en 30 días + stock crítico
  for (const ins of inventario) {
    const dVenc = diasHasta(ins.fechaVencimiento);
    if (dVenc !== null && dVenc < 0) {
      alertas.push({
        id: `ins-venc-${ins.id}`,
        severidad: 'critica',
        categoria: 'Bodega',
        titulo: `Producto vencido: ${ins.nombreComercial}`,
        detalle: `Venció hace ${Math.abs(dVenc)} días (${ins.fechaVencimiento}). Retirar o segregar en bodega.`,
        tabDestino: ins.categoriaBodega === 'material_riego' ? 'materiales' : 'fitosanitarios',
      });
    } else if (dVenc !== null && dVenc <= 30) {
      alertas.push({
        id: `ins-prox-${ins.id}`,
        severidad: 'advertencia',
        categoria: 'Bodega',
        titulo: `Producto próximo a vencer: ${ins.nombreComercial}`,
        detalle: `Vence en ${dVenc} días (${ins.fechaVencimiento}). Stock: ${ins.stockActual} ${ins.unidad}.`,
        tabDestino: ins.categoriaBodega === 'material_riego' ? 'materiales' : 'fitosanitarios',
      });
    }

    if ((ins.stockMinimo || 0) > 0 && (ins.stockActual || 0) <= (ins.stockMinimo || 0)) {
      alertas.push({
        id: `ins-stock-${ins.id}`,
        severidad: 'advertencia',
        categoria: 'Bodega',
        titulo: `Stock bajo mínimo: ${ins.nombreComercial}`,
        detalle: `Disponible ${ins.stockActual} ${ins.unidad} (mínimo ${ins.stockMinimo} ${ins.unidad}).`,
        tabDestino: ins.categoriaBodega === 'material_riego' ? 'materiales' : 'fitosanitarios',
      });
    }
  }

  // 2. Carnets SAG de aplicadores vencidos o por vencer (<= 45 días)
  for (const u of usuarios) {
    if (u.fechaVencimientoCarnetSAG) {
      const d = diasHasta(u.fechaVencimientoCarnetSAG);
      if (d !== null && d < 0) {
        alertas.push({
          id: `sag-venc-${u.id}`,
          severidad: 'critica',
          categoria: 'Personal SAG',
          titulo: `Carnet SAG vencido: ${u.nombre}`,
          detalle: `Venció el ${u.fechaVencimientoCarnetSAG}. No puede firmar aplicaciones fitosanitarias.`,
          tabDestino: 'usuarios',
        });
      } else if (d !== null && d <= 45) {
        alertas.push({
          id: `sag-prox-${u.id}`,
          severidad: 'advertencia',
          categoria: 'Personal SAG',
          titulo: `Carnet SAG próximo a vencer: ${u.nombre}`,
          detalle: `Vence en ${d} días (${u.fechaVencimientoCarnetSAG}).`,
          tabDestino: 'usuarios',
        });
      }
    }
  }

  // 3. Maquinarias con mantención próxima o vencida por horómetro
  for (const m of maquinarias) {
    const proximoHorometro = (m.horometroUltimaMantencion || 0) + (m.frecuenciaMantencionHoras || 250);
    const restantes = proximoHorometro - (m.horometroActual || 0);
    if (m.estado === 'en_taller' || m.estado === 'fuera_servicio' || restantes <= 0) {
      alertas.push({
        id: `maq-crit-${m.id}`,
        severidad: 'critica',
        categoria: 'Maquinaria',
        titulo: `Mantención requerida: ${m.nombre}`,
        detalle:
          restantes <= 0
            ? `Superó el horómetro objetivo (${m.horometroActual} / ${proximoHorometro} hrs).`
            : `Estado actual: ${m.estado.replace('_', ' ')}.`,
        tabDestino: 'maquinarias',
      });
    } else if (m.estado === 'mantencion_proxima' || restantes <= 25) {
      alertas.push({
        id: `maq-prox-${m.id}`,
        severidad: 'advertencia',
        categoria: 'Maquinaria',
        titulo: `Mantención próxima: ${m.nombre}`,
        detalle: `Faltan ${Math.round(restantes)} hrs para servicio (${m.horometroActual}/${proximoHorometro} hrs).`,
        tabDestino: 'maquinarias',
      });
    }
  }

  // 4. Calibraciones de equipos vencidas o próximas (<= 30 días)
  for (const cal of calibracionesEquipo) {
    const d = diasHasta(cal.fechaProximaCalibracion);
    if (cal.resultado === 'Fuera de Servicio' || (d !== null && d < 0)) {
      alertas.push({
        id: `cal-venc-${cal.id}`,
        severidad: 'critica',
        categoria: 'Calibración',
        titulo: `Calibración vencida: ${cal.equipoNombre}`,
        detalle:
          d !== null && d < 0
            ? `Venció el ${cal.fechaProximaCalibracion}. Recalibrar antes de operar.`
            : `Equipo marcado como Fuera de Servicio.`,
        tabDestino: 'auditoria',
      });
    } else if (d !== null && d <= 30) {
      alertas.push({
        id: `cal-prox-${cal.id}`,
        severidad: 'advertencia',
        categoria: 'Calibración',
        titulo: `Calibración próxima: ${cal.equipoNombre}`,
        detalle: `Renovar calibración antes del ${cal.fechaProximaCalibracion} (${d} días).`,
        tabDestino: 'auditoria',
      });
    }
  }

  // 5. Análisis de Laboratorio con alertas o agua > 365 días
  const aguaSorted = analisisLaboratorio
    .filter((a) => a.tipo === 'agua')
    .sort((a, b) => Date.parse(b.fechaMuestreo) - Date.parse(a.fechaMuestreo));
  if (aguaSorted.length > 0) {
    const diasDesdeAgua = diasHasta(aguaSorted[0].fechaMuestreo);
    if (diasDesdeAgua !== null && diasDesdeAgua < -365) {
      alertas.push({
        id: `lab-agua-antigua`,
        severidad: 'advertencia',
        categoria: 'Laboratorio',
        titulo: 'Análisis de agua con más de 1 año',
        detalle: `Último análisis registrado el ${aguaSorted[0].fechaMuestreo}. GlobalGAP exige vigencia anual.`,
        tabDestino: 'laboratorio',
      });
    }
  }

  for (const lab of analisisLaboratorio) {
    if (lab.resultadoGlobal === 'Crítico / Rechazo' || lab.resultadoGlobal === 'Positivo' || lab.bajoNormaLmr === false) {
      alertas.push({
        id: `lab-crit-${lab.id}`,
        severidad: 'critica',
        categoria: 'Laboratorio',
        titulo: `Alerta laboratorio (${lab.tipo.toUpperCase()}): ${lab.parcelaNombre}`,
        detalle: `Informe ${lab.codigoInforme || lab.fechaMuestreo}: ${lab.resultadoGlobal}.`,
        tabDestino: 'laboratorio',
      });
    }
  }

  // 6. Cuarteles en carencia SAG
  for (const p of parcelas) {
    if (p.estadoActual === 'En Carencia SAG') {
      alertas.push({
        id: `carencia-${p.id}`,
        severidad: 'info',
        categoria: 'Carencia SAG',
        titulo: `Cuartel en carencia SAG: ${p.nombre}`,
        detalle: `${p.lmrActivo || 'Aplicación reciente'}${p.diasCarenciaRestantes ? ` (${p.diasCarenciaRestantes} días restantes)` : ''}. No cosechar hasta liberar LMR.`,
        tabDestino: 'cosecha',
      });
    }
  }

  // 7. Tareas agronómicas vencidas o próximas en 7 días
  for (const t of tareasHuerto) {
    if (t.estado === 'Completada') continue;
    const d = diasHasta(t.fechaLimite);
    if (d !== null && d < 0) {
      alertas.push({
        id: `tarea-venc-${t.id}`,
        severidad: 'critica',
        categoria: 'Calendario',
        titulo: `Tarea atrasada: ${t.titulo}`,
        detalle: `Fecha límite ${t.fechaLimite} · Responsable: ${t.responsable || 'Sin asignar'}.`,
        tabDestino: 'planificacion',
      });
    } else if (d !== null && d <= 7) {
      alertas.push({
        id: `tarea-prox-${t.id}`,
        severidad: 'advertencia',
        categoria: 'Calendario',
        titulo: `Tarea próxima (${d === 0 ? 'hoy' : `en ${d} d`}): ${t.titulo}`,
        detalle: `${t.categoria} · Responsable: ${t.responsable || 'Sin asignar'}.`,
        tabDestino: 'planificacion',
      });
    }
  }

  const peso = { critica: 0, advertencia: 1, info: 2 };
  return alertas.sort((a, b) => peso[a.severidad] - peso[b.severidad]);
}
