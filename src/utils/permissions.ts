import { NivelAcceso, RolUsuario, UsuarioPredio } from '../types/campo';

/**
 * Resuelve el nivel efectivo de acceso de un usuario.
 * - 'admin': Solo rol 'administrador' (control total + equipo + reinicio + todas las áreas).
 * - 'editor_campo': Encargado de campo / agrónomo / capataz (puede agregar, editar y eliminar en todas las áreas y fitosanitarios).
 * - 'solo_lectura': Puede entrar e interactuar (ver mapas, filtros, calculadoras, simuladores, reportes, IA), pero NO puede editar ni borrar datos.
 */
export function getNivelAcceso(user?: Partial<UsuarioPredio> | null): NivelAcceso {
  if (!user) return 'solo_lectura';
  if (user.rol === 'administrador') return 'admin';

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

export function canEditAppData(user?: Partial<UsuarioPredio> | null): boolean {
  const nivel = getNivelAcceso(user);
  return nivel === 'admin' || nivel === 'editor_campo';
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

export function getNivelAccesoMeta(nivel: NivelAcceso): {
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
        description: 'Control absoluto: gestiona usuarios/claves, reinicia huerto y edita todas las áreas y fitosanitarios.',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
      };
    case 'editor_campo':
      return {
        label: 'Encargado de Campo (Edición)',
        shortLabel: 'Editor Campo',
        description: 'Puede agregar, editar y quitar productos fitosanitarios, bodega, cuarteles, labores y todas las áreas operativas.',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      };
    case 'solo_lectura':
    default:
      return {
        label: 'Solo Lectura (Consulta)',
        shortLabel: 'Solo Lectura',
        description: 'Puede entrar, navegar mapas, usar calculadoras, filtros y ver reportes, sin editar ni eliminar datos.',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
      };
  }
}

export function formatUsuarioAccessText(u: UsuarioPredio, fundoNombre = 'Fundo La Cabaña'): string {
  const nivel = getNivelAcceso(u);
  const meta = getNivelAccesoMeta(nivel);
  return [
    `[${u.nombre}] — ${getRolLabel(u.rol)} (${meta.shortLabel})`,
    `Predio: ${fundoNombre}`,
    `Usuario (RUT): ${u.rut}`,
    `Usuario (Correo): ${u.email}`,
    `Código / Clave de Acceso: ${u.password}`,
    `Permisos: ${meta.description}`,
  ].join('\n');
}
