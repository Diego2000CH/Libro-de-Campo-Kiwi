import {
  ModuloPestanaId,
  NivelAcceso,
  RolUsuario,
  UsuarioPredio,
} from '../types/campo';

export interface ModuloEditableItem {
  id: ModuloPestanaId;
  label: string;
  categoria: 'Bodega & Sanidad' | 'Riego & Agua' | 'Campo & Fenología' | 'Cosecha & Calidad';
  descripcion: string;
}

export const MODULOS_EDITABLES_CATALOGO: ModuloEditableItem[] = [
  {
    id: 'fitosanitarios',
    label: 'Bodega Fitosanitarios',
    categoria: 'Bodega & Sanidad',
    descripcion: 'Agregar, editar o quitar fitosanitarios, fertilizantes y enmiendas',
  },
  {
    id: 'ordenes',
    label: 'Órdenes & Recetas',
    categoria: 'Bodega & Sanidad',
    descripcion: 'Emitir recetas agronómicas, firmar y completar aplicaciones SAG',
  },
  {
    id: 'labores',
    label: 'Cuaderno Labores',
    categoria: 'Bodega & Sanidad',
    descripcion: 'Registrar y modificar labores del cuaderno de campo oficial',
  },
  {
    id: 'monitoreo',
    label: 'Plagas & Psa',
    categoria: 'Bodega & Sanidad',
    descripcion: 'Registrar monitoreos sanitarios, síntomas Psa y observaciones',
  },
  {
    id: 'materiales',
    label: 'Materiales & Riego',
    categoria: 'Riego & Agua',
    descripcion: 'Gestionar stock de materiales de riego, alambres, polines y EPP',
  },
  {
    id: 'riego',
    label: 'Control Riego',
    categoria: 'Riego & Agua',
    descripcion: 'Registrar turnos de riego, fertirriego, láminas y presiones',
  },
  {
    id: 'pozo',
    label: 'Control Pozo DGA',
    categoria: 'Riego & Agua',
    descripcion: 'Ingresar lecturas de flujómetro, horómetro, caudales y niveles DGA',
  },
  {
    id: 'clima',
    label: 'Clima',
    categoria: 'Riego & Agua',
    descripcion: 'Actualizar estación meteorológica, eventualidades y alertas UV',
  },
  {
    id: 'heladas',
    label: 'Control Heladas',
    categoria: 'Riego & Agua',
    descripcion: 'Operar turnos antihelada, checklist y umbrales críticos',
  },
  {
    id: 'parcelas',
    label: 'Cuarteles & Mapa',
    categoria: 'Campo & Fenología',
    descripcion: 'Editar cuarteles, polígonos GPS, estados fenológicos y lugares',
  },
  {
    id: 'maquinarias',
    label: 'Maquinarias',
    categoria: 'Campo & Fenología',
    descripcion: 'Administrar tractores, equipos, horómetros y mantenciones',
  },
  {
    id: 'fenologia',
    label: 'Frío, GDD & Fenología',
    categoria: 'Campo & Fenología',
    descripcion: 'Registrar horas frío, grados día y etapas fenológicas BBCH',
  },
  {
    id: 'brotacion',
    label: '% Brotación',
    categoria: 'Campo & Fenología',
    descripcion: 'Ingresar muestreos de brotación de yemas por cuartel',
  },
  {
    id: 'botones',
    label: 'Botones Florales',
    categoria: 'Campo & Fenología',
    descripcion: 'Registrar conteos y avance de raleo de botones florales',
  },
  {
    id: 'polinizacion',
    label: 'Polinización & Colmenas',
    categoria: 'Campo & Fenología',
    descripcion: 'Gestionar colmenas, sincronía floral y aplicaciones de polen',
  },
  {
    id: 'carga_raleo',
    label: 'Carga & Raleo',
    categoria: 'Campo & Fenología',
    descripcion: 'Planificar carga objetivo, jornales y avance de raleo de frutos',
  },
  {
    id: 'cuaja_semillas',
    label: 'Cuaja & Semillas',
    categoria: 'Campo & Fenología',
    descripcion: 'Registrar evaluaciones de cuaja, semillas y calibre proyectado',
  },
  {
    id: 'cosecha',
    label: 'Cosecha & °Brix',
    categoria: 'Cosecha & Calidad',
    descripcion: 'Ingresar muestreos de madurez, cosecha de bins y packing',
  },
  {
    id: 'laboratorio',
    label: 'Laboratorio',
    categoria: 'Cosecha & Calidad',
    descripcion: 'Cargar análisis de suelo, agua, foliares y multirresiduos LMR',
  },
  {
    id: 'auditoria',
    label: 'Auditoría & BPA',
    categoria: 'Cosecha & Calidad',
    descripcion: 'Completar checklist BPA/GlobalGAP, envases y calibraciones',
  },
  {
    id: 'planificacion',
    label: 'Temporadas & Tareas',
    categoria: 'Cosecha & Calidad',
    descripcion: 'Crear y actualizar tareas agronómicas y resúmenes anuales',
  },
];

const VALID_MODULO_IDS = new Set<ModuloPestanaId>(
  MODULOS_EDITABLES_CATALOGO.map((m) => m.id)
);

export function normalizeTabId(tab: ModuloPestanaId): ModuloPestanaId {
  if (tab === 'inventario') return 'fitosanitarios';
  return tab;
}

export function getTabLabel(tab: ModuloPestanaId): string {
  const norm = normalizeTabId(tab);
  const found = MODULOS_EDITABLES_CATALOGO.find((m) => m.id === norm);
  if (found) return found.label;
  switch (norm) {
    case 'dashboard':
      return 'Resumen';
    case 'calculadora':
      return 'Calculadora';
    case 'informe':
      return 'Informes & PDF';
    case 'usuarios':
      return 'Equipo & Claves';
    default:
      return String(norm);
  }
}

export function getPestanasEditables(
  user?: Partial<UsuarioPredio> | null
): ModuloPestanaId[] {
  if (!user || !Array.isArray(user.pestanasEditables)) return [];
  const seen = new Set<ModuloPestanaId>();
  const result: ModuloPestanaId[] = [];
  for (const raw of user.pestanasEditables) {
    const norm = normalizeTabId(raw);
    if (VALID_MODULO_IDS.has(norm) && !seen.has(norm)) {
      seen.add(norm);
      result.push(norm);
    }
  }
  return result;
}

/**
 * Resuelve el nivel efectivo de acceso de un usuario.
 * - 'admin': Solo rol 'administrador' (control total + equipo + reinicio + todas las áreas).
 * - 'editor_campo': Encargado de campo / agrónomo / capataz (puede agregar, editar y eliminar en todas las áreas).
 * - 'editor_selectivo': Puede editar ÚNICAMENTE las pestañas elegidas por el administrador; el resto queda en Solo Lectura.
 * - 'solo_lectura': Puede entrar e interactuar (ver mapas, filtros, calculadoras, reportes), pero NO puede editar ni borrar datos.
 */
export function getNivelAcceso(user?: Partial<UsuarioPredio> | null): NivelAcceso {
  if (!user) return 'solo_lectura';
  if (user.rol === 'administrador') return 'admin';

  if (user.nivelAcceso === 'editor_selectivo') {
    return 'editor_selectivo';
  }

  if (user.nivelAcceso === 'editor_campo' || user.nivelAcceso === 'solo_lectura') {
    return user.nivelAcceso;
  }

  if (
    user.rol === 'encargado_campo' ||
    user.rol === 'agronomo' ||
    user.rol === 'capataz'
  ) {
    return 'editor_campo';
  }

  return 'solo_lectura';
}

export function isAdminUser(user?: Partial<UsuarioPredio> | null): boolean {
  return getNivelAcceso(user) === 'admin';
}

export function canEditTab(
  user: Partial<UsuarioPredio> | null | undefined,
  tab: ModuloPestanaId
): boolean {
  const nivel = getNivelAcceso(user);
  if (nivel === 'admin' || nivel === 'editor_campo') return true;
  if (nivel === 'editor_selectivo') {
    const norm = normalizeTabId(tab);
    return getPestanasEditables(user).includes(norm);
  }
  return false;
}

export function canEditAppData(user?: Partial<UsuarioPredio> | null): boolean {
  const nivel = getNivelAcceso(user);
  if (nivel === 'admin' || nivel === 'editor_campo') return true;
  if (nivel === 'editor_selectivo') {
    return getPestanasEditables(user).length > 0;
  }
  return false;
}

export function getEditableTabLabels(user?: Partial<UsuarioPredio> | null): string[] {
  return getPestanasEditables(user).map((t) => getTabLabel(t));
}

export function getRolLabel(rol: RolUsuario | string): string {
  switch (rol) {
    case 'administrador':
      return 'Administrador';
    case 'encargado_campo':
      return 'Encargado de Campo';
    case 'agronomo':
      return 'Ingeniero Agrónomo';
    case 'capataz':
      return 'Capataz de Campo';
    case 'aplicador_sag':
      return 'Aplicador Acreditado SAG';
    case 'operador_riego':
      return 'Operador de Riego';
    case 'solo_lectura':
      return 'Consulta / Solo Lectura';
    default:
      return String(rol || 'Usuario').replace(/_/g, ' ');
  }
}

export function getNivelAccesoMeta(
  nivel: NivelAcceso,
  user?: Partial<UsuarioPredio> | null
): {
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
} {
  switch (nivel) {
    case 'admin':
      return {
        label: 'Administrador Total',
        shortLabel: 'Admin',
        description:
          'Control absoluto: gestiona usuarios/claves, reinicia huerto y edita todas las áreas y fitosanitarios.',
        badgeClass:
          'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-700/70',
      };
    case 'editor_campo':
      return {
        label: 'Encargado de Campo (Edición Total)',
        shortLabel: 'Editor Campo',
        description:
          'Puede agregar, editar y quitar productos fitosanitarios, bodega, cuarteles, labores y todas las áreas operativas.',
        badgeClass:
          'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700/70',
      };
    case 'editor_selectivo': {
      const labels = getEditableTabLabels(user);
      return {
        label:
          labels.length > 0
            ? `Edición en ${labels.length} pestaña${labels.length > 1 ? 's' : ''} (Resto Solo Lectura)`
            : 'Edición por Pestañas (Sin pestañas asignadas)',
        shortLabel:
          labels.length === 1
            ? '1 Pestaña'
            : labels.length > 1
            ? `${labels.length} Pestañas`
            : 'Por Pestaña',
        description:
          labels.length > 0
            ? `Solo puede editar en: ${labels.join(', ')}. Todas las demás pestañas se mantienen en Solo Lectura.`
            : 'Modo por pestañas activo sin módulos asignados: actualmente opera en Solo Lectura hasta que el Administrador marque al menos una pestaña.',
        badgeClass:
          'bg-sky-100 dark:bg-sky-900/50 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-700/70',
      };
    }
    case 'solo_lectura':
    default:
      return {
        label: 'Solo Lectura (Consulta)',
        shortLabel: 'Solo Lectura',
        description:
          'Puede entrar, navegar mapas, usar calculadoras, filtros y ver reportes, sin editar ni eliminar datos.',
        badgeClass:
          'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700/70',
      };
  }
}

export function formatUsuarioAccessText(
  u: UsuarioPredio,
  fundoNombre = 'Fundo La Cabaña'
): string {
  const nivel = getNivelAcceso(u);
  const meta = getNivelAccesoMeta(nivel, u);
  return [
    `[${u.nombre}] — ${getRolLabel(u.rol)} (${meta.shortLabel})`,
    `Predio: ${fundoNombre}`,
    `Usuario (RUT): ${u.rut}`,
    `Usuario (Correo): ${u.email}`,
    `Código / Clave de Acceso: ${u.password}`,
    `Permisos: ${meta.description}`,
  ].join('\n');
}
