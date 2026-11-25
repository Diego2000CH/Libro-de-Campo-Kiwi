import { ClimaCondiciones } from '../types/campo';

export type EstadoVentanaPulverizacion = 'Optima' | 'Precaucion' | 'No Apta';

export interface FactorPulverizacion {
  parametro: 'Viento / Deriva' | 'Humedad Relativa' | 'Temperatura' | 'Lluvia / Lavado';
  valorTexto: string;
  estado: EstadoVentanaPulverizacion;
  detalle: string;
}

export interface EvaluacionVentanaPulverizacion {
  estado: EstadoVentanaPulverizacion;
  titulo: string;
  resumen: string;
  recomendacion: string;
  badgeClass: string;
  cardClass: string;
  textClass: string;
  factores: FactorPulverizacion[];
}

export function evaluarVentanaPulverizacion(
  clima?: Partial<ClimaCondiciones> | null
): EvaluacionVentanaPulverizacion {
  const viento = Number(clima?.velocidadVientoKmH ?? 10);
  const humedad = Number(clima?.humedadRelativa ?? 60);
  const temp = Number(clima?.temperaturaActual ?? 18);
  const probLluvia = Number(clima?.probabilidadLluvia ?? 0);
  const lluviaMm = Number(clima?.precipitacionDiaMm ?? 0);
  const cielo = clima?.estadoCielo || 'Despejado';

  const factores: FactorPulverizacion[] = [];

  // 1. Viento y riesgo de deriva (normativa BPA / SAG)
  if (viento > 15) {
    factores.push({
      parametro: 'Viento / Deriva',
      valorTexto: `${viento.toFixed(1)} km/h`,
      estado: 'No Apta',
      detalle: 'Riesgo alto de deriva (> 15 km/h). Suspender pulverización.',
    });
  } else if (viento > 10) {
    factores.push({
      parametro: 'Viento / Deriva',
      valorTexto: `${viento.toFixed(1)} km/h`,
      estado: 'Precaucion',
      detalle: 'Deriva moderada (10–15 km/h). Usar boquillas antideriva y reducir presión.',
    });
  } else {
    factores.push({
      parametro: 'Viento / Deriva',
      valorTexto: `${viento.toFixed(1)} km/h`,
      estado: 'Optima',
      detalle: 'Sin viento limitante (<= 10 km/h). Depósito uniforme en follaje.',
    });
  }

  // 2. Humedad Relativa
  if (humedad < 35) {
    factores.push({
      parametro: 'Humedad Relativa',
      valorTexto: `${Math.round(humedad)}%`,
      estado: 'No Apta',
      detalle: 'HR crítica (< 35%). Evaporación rápida de gotas antes de llegar al objetivo.',
    });
  } else if (humedad > 92) {
    factores.push({
      parametro: 'Humedad Relativa',
      valorTexto: `${Math.round(humedad)}%`,
      estado: 'Precaucion',
      detalle: 'HR muy alta (> 92%). Riesgo de escurrimiento en hoja mojada.',
    });
  } else if (humedad < 45 || humedad > 82) {
    factores.push({
      parametro: 'Humedad Relativa',
      valorTexto: `${Math.round(humedad)}%`,
      estado: 'Precaucion',
      detalle:
        humedad < 45
          ? 'HR baja (35–44%). Incorporar coadyuvante humectante/antievaporante.'
          : 'HR elevada (83–92%). Ajustar volumen de mojamiento para evitar chorreo.',
    });
  } else {
    factores.push({
      parametro: 'Humedad Relativa',
      valorTexto: `${Math.round(humedad)}%`,
      estado: 'Optima',
      detalle: 'Rango óptimo (45–82%) para absorción y cobertura foliar.',
    });
  }

  // 3. Temperatura ambiente
  if (temp > 28 || temp < 4) {
    factores.push({
      parametro: 'Temperatura',
      valorTexto: `${temp.toFixed(1)}°C`,
      estado: 'No Apta',
      detalle:
        temp > 28
          ? 'Temperatura excesiva (> 28°C). Riesgo de fitotoxicidad y volatilización.'
          : 'Temperatura muy baja (< 4°C). Riesgo de escarcha / mala absorción.',
    });
  } else if (temp > 25 || temp < 8) {
    factores.push({
      parametro: 'Temperatura',
      valorTexto: `${temp.toFixed(1)}°C`,
      estado: 'Precaucion',
      detalle:
        temp > 25
          ? 'Calor moderado (25–28°C). Preferir aplicación temprana o al atardecer.'
          : 'Ambiente frío (4–8°C). Verificar ausencia de rocío congelado.',
    });
  } else {
    factores.push({
      parametro: 'Temperatura',
      valorTexto: `${temp.toFixed(1)}°C`,
      estado: 'Optima',
      detalle: 'Rango térmico seguro (8–25°C) para caldo fitosanitario.',
    });
  }

  // 4. Lluvia / Lavado
  if (cielo === 'Lluvia Moderada' || probLluvia >= 60 || lluviaMm >= 1.0) {
    factores.push({
      parametro: 'Lluvia / Lavado',
      valorTexto: lluviaMm > 0 ? `${lluviaMm.toFixed(1)} mm (${probLluvia}%)` : `${probLluvia}% prob.`,
      estado: 'No Apta',
      detalle: 'Alta probabilidad de lavado por lluvia. Postergar aplicación.',
    });
  } else if (probLluvia >= 35 || lluviaMm > 0.1) {
    factores.push({
      parametro: 'Lluvia / Lavado',
      valorTexto: `${probLluvia}% prob.`,
      estado: 'Precaucion',
      detalle: 'Posibilidad de llovizna (35–59%). Usar adherente y vigilar ventana seca (2–4 hrs).',
    });
  } else {
    factores.push({
      parametro: 'Lluvia / Lavado',
      valorTexto: `${probLluvia}% prob.`,
      estado: 'Optima',
      detalle: 'Sin riesgo inmediato de lavado por precipitación.',
    });
  }

  const hayNoApto = factores.some((f) => f.estado === 'No Apta');
  const hayPrecaucion = factores.some((f) => f.estado === 'Precaucion');

  if (hayNoApto) {
    const bloqueantes = factores
      .filter((f) => f.estado === 'No Apta')
      .map((f) => `${f.parametro} (${f.valorTexto})`)
      .join(', ');
    return {
      estado: 'No Apta',
      titulo: 'NO APTO PARA PULVERIZAR (Riesgo de Deriva / Lavado)',
      resumen: `Condiciones fuera de rango en: ${bloqueantes}.`,
      recomendacion:
        'Suspende o reprograma la aplicación fitosanitaria para evitar deriva hacia deslindes, pérdida de eficacia o lavado del producto.',
      badgeClass: 'bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700/80',
      cardClass: 'bg-rose-50/75 dark:bg-rose-950/35 border-rose-300 dark:border-rose-700/80',
      textClass: 'text-rose-900 dark:text-rose-200',
      factores,
    };
  }

  if (hayPrecaucion) {
    const alertas = factores
      .filter((f) => f.estado === 'Precaucion')
      .map((f) => `${f.parametro} (${f.valorTexto})`)
      .join(', ');
    return {
      estado: 'Precaucion',
      titulo: 'VENTANA CON PRECAUCIÓN',
      resumen: `Vigilar parámetros ajustados: ${alertas}.`,
      recomendacion:
        'Aplica solo con boquillas de baja deriva/baja presión, ajusta velocidad del tractor y evalúa agregar coadyuvante.',
      badgeClass: 'bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700/80',
      cardClass: 'bg-amber-50/70 dark:bg-amber-950/35 border-amber-300 dark:border-amber-700/80',
      textClass: 'text-amber-900 dark:text-amber-200',
      factores,
    };
  }

  return {
    estado: 'Optima',
    titulo: 'VENTANA ÓPTIMA DE PULVERIZACIÓN',
    resumen: `Viento ${viento.toFixed(1)} km/h · HR ${Math.round(humedad)}% · ${temp.toFixed(1)}°C · ${probLluvia}% lluvia.`,
    recomendacion:
      'Condiciones ideales para pulverización uniforme con mínima deriva y excelente adherencia foliar.',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/80',
    cardClass: 'bg-emerald-50/70 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/70',
    textClass: 'text-emerald-900 dark:text-emerald-200',
    factores,
  };
}

export interface EvaluacionCarenciaCosecha {
  fechaLiberacionIso: string;
  diasCarencia: number;
  diasHastaCosecha?: number;
  margenDias?: number;
  nivel: 'seguro' | 'estrecho' | 'critico' | 'sin_referencia';
  mensaje: string;
}

export function evaluarCarenciaVsCosecha(params: {
  fechaAplicacion: string;
  carenciaDias: number;
  fechaCosechaEstimada?: string;
}): EvaluacionCarenciaCosecha {
  const carencia = Math.max(0, Math.round(Number(params.carenciaDias) || 0));
  const baseDate = params.fechaAplicacion
    ? new Date(`${params.fechaAplicacion}T12:00:00`)
    : new Date();
  const libDate = new Date(baseDate.getTime() + carencia * 24 * 60 * 60 * 1000);
  const fechaLiberacionIso = libDate.toISOString().split('T')[0];

  if (!params.fechaCosechaEstimada) {
    return {
      fechaLiberacionIso,
      diasCarencia: carencia,
      nivel: 'sin_referencia',
      mensaje:
        carencia > 0
          ? `Carencia SAG ${carencia} días (liberación LMR el ${fechaLiberacionIso}). Ingresa una fecha estimada de cosecha para validar margen.`
          : 'Sin período de carencia restrictivo (0 días).',
    };
  }

  const harvestDate = new Date(`${params.fechaCosechaEstimada}T12:00:00`);
  const diasHastaCosecha = Math.round(
    (harvestDate.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  const margenDias = diasHastaCosecha - carencia;

  if (carencia === 0) {
    return {
      fechaLiberacionIso,
      diasCarencia: 0,
      diasHastaCosecha,
      margenDias,
      nivel: 'seguro',
      mensaje: `Producto sin carencia (0 días). Apto antes de cosecha (${params.fechaCosechaEstimada}).`,
    };
  }

  if (margenDias < 0) {
    return {
      fechaLiberacionIso,
      diasCarencia: carencia,
      diasHastaCosecha,
      margenDias,
      nivel: 'critico',
      mensaje: `BLOQUEO LMR: La carencia de ${carencia} días libera recién el ${fechaLiberacionIso} (${Math.abs(margenDias)} día(s) DESPUÉS de la cosecha estimada ${params.fechaCosechaEstimada}).`,
    };
  }

  if (margenDias <= 7) {
    return {
      fechaLiberacionIso,
      diasCarencia: carencia,
      diasHastaCosecha,
      margenDias,
      nivel: 'estrecho',
      mensaje: `MARGEN ESTRECHO: Libera el ${fechaLiberacionIso}, quedando solo ${margenDias} día(s) antes de la cosecha estimada (${params.fechaCosechaEstimada}).`,
    };
  }

  return {
    fechaLiberacionIso,
    diasCarencia: carencia,
    diasHastaCosecha,
    margenDias,
    nivel: 'seguro',
    mensaje: `Cumple LMR: Libera el ${fechaLiberacionIso} (${margenDias} días de holgura antes de cosecha).`,
  };
}
