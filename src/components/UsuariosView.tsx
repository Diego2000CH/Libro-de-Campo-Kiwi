import React, { useState } from 'react';
import {
  UsuarioPredio,
  RolUsuario,
  NivelAcceso,
  ModuloPestanaId,
} from '../types/campo';
import {
  MODULOS_EDITABLES_CATALOGO,
  getNivelAcceso,
  getNivelAccesoMeta,
  getPestanasEditables,
  getRolLabel,
  getTabLabel,
  formatUsuarioAccessText,
} from '../utils/permissions';
import {
  Users,
  Plus,
  Trash2,
  ShieldCheck,
  Phone,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Edit2,
  Lock,
  Copy,
  Check,
  ShieldAlert,
  Pencil,
} from 'lucide-react';

interface UsuariosViewProps {
  usuarios: UsuarioPredio[];
  currentUser: UsuarioPredio;
  activeUserId: string;
  fundoNombre?: string;
  onRequestSwitchUser: (targetUser?: UsuarioPredio) => void;
  onAddUsuario: (usuario: UsuarioPredio) => void;
  onUpdateUsuario: (usuario: UsuarioPredio) => void;
  onDeleteUsuario: (id: string) => void;
}

const deriveDefaultNivel = (rol: RolUsuario): NivelAcceso => {
  if (rol === 'administrador') return 'admin';
  if (rol === 'encargado_campo' || rol === 'agronomo' || rol === 'capataz') return 'editor_campo';
  if (rol === 'aplicador_sag' || rol === 'operador_riego') return 'editor_selectivo';
  return 'solo_lectura';
};

const deriveDefaultTabs = (rol: RolUsuario): ModuloPestanaId[] => {
  if (rol === 'aplicador_sag') return ['ordenes'];
  if (rol === 'operador_riego') return ['riego', 'pozo'];
  return [];
};

const CATEGORIAS_MODULOS = [
  'Bodega & Sanidad',
  'Riego & Agua',
  'Campo & Fenología',
  'Cosecha & Calidad',
] as const;

interface SelectorPestanasProps {
  selectedTabs: ModuloPestanaId[];
  onChange: (next: ModuloPestanaId[]) => void;
}

const SelectorPestanasEditables: React.FC<SelectorPestanasProps> = ({
  selectedTabs,
  onChange,
}) => {
  const toggleTab = (id: ModuloPestanaId) => {
    if (selectedTabs.includes(id)) {
      onChange(selectedTabs.filter((t) => t !== id));
    } else {
      onChange([...selectedTabs, id]);
    }
  };

  return (
    <div className="p-3 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/70 rounded-xl space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-bold text-sky-950 dark:text-sky-100 text-[11px] flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
            <span>Pestañas con Permiso de Edición ({selectedTabs.length})</span>
          </div>
          <p className="text-[10px] text-sky-800 dark:text-sky-300 leading-snug">
            Marca 1 o más pestañas que este usuario podrá editar. Todas las demás quedarán en{' '}
            <strong>Solo Lectura</strong>.
          </p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(['fitosanitarios'])}
          className="px-2 py-1 rounded-md bg-white dark:bg-stone-900 border border-sky-200 dark:border-sky-800 text-[10px] font-bold text-sky-900 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/50 cursor-pointer"
        >
          Solo Fitosanitarios
        </button>
        <button
          type="button"
          onClick={() => onChange(['ordenes'])}
          className="px-2 py-1 rounded-md bg-white dark:bg-stone-900 border border-sky-200 dark:border-sky-800 text-[10px] font-bold text-sky-900 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/50 cursor-pointer"
        >
          Solo Órdenes
        </button>
        <button
          type="button"
          onClick={() => onChange(['riego', 'pozo'])}
          className="px-2 py-1 rounded-md bg-white dark:bg-stone-900 border border-sky-200 dark:border-sky-800 text-[10px] font-bold text-sky-900 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/50 cursor-pointer"
        >
          Solo Riego y Pozo
        </button>
        <button
          type="button"
          onClick={() => onChange(['cosecha'])}
          className="px-2 py-1 rounded-md bg-white dark:bg-stone-900 border border-sky-200 dark:border-sky-800 text-[10px] font-bold text-sky-900 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/50 cursor-pointer"
        >
          Solo Cosecha
        </button>
        {selectedTabs.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="px-2 py-1 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-[10px] font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Checklist agrupado */}
      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
        {CATEGORIAS_MODULOS.map((cat) => {
          const items = MODULOS_EDITABLES_CATALOGO.filter((m) => m.categoria === cat);
          return (
            <div key={cat} className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {cat}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {items.map((mod) => {
                  const checked = selectedTabs.includes(mod.id);
                  return (
                    <label
                      key={mod.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 font-bold'
                          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:border-sky-300 dark:hover:border-sky-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTab(mod.id)}
                        className="mt-0.5 rounded border-stone-300 dark:border-stone-600 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                      />
                      <span className="leading-tight">
                        <span className="block">{mod.label}</span>
                        <span className="block text-[9px] font-normal text-stone-500 dark:text-stone-400 mt-0.5">
                          {checked ? 'Puede editar' : 'Solo lectura'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTabs.length === 0 && (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-[10px] text-amber-900 dark:text-amber-200 font-medium">
          No hay pestañas seleccionadas: mientras no marques ninguna, el usuario permanecerá en Solo Lectura en toda la app.
        </div>
      )}
    </div>
  );
};

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarios,
  currentUser,
  activeUserId,
  fundoNombre = 'Fundo La Cabaña',
  onRequestSwitchUser,
  onAddUsuario,
  onUpdateUsuario,
  onDeleteUsuario,
}) => {
  const isAdmin = getNivelAcceso(currentUser) === 'admin';

  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioPredio | null>(null);
  const [isChangeMyPasswordOpen, setIsChangeMyPasswordOpen] = useState(false);

  const [revelarTodasClaves, setRevelarTodasClaves] = useState(false);
  const [clavesVisiblesIndividual, setClavesVisiblesIndividual] = useState<Record<string, boolean>>({});
  const [usuarioToDelete, setUsuarioToDelete] = useState<UsuarioPredio | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [userForm, setUserForm] = useState<Partial<UsuarioPredio>>({
    nombre: '',
    rut: '',
    email: '',
    password: '',
    rol: 'solo_lectura',
    nivelAcceso: 'solo_lectura',
    pestanasEditables: [],
    carnetSAGVigente: false,
    numeroCarnetSAG: '',
    fechaVencimientoCarnetSAG: '2028-12-31',
    telefono: '+56 9 ',
    cargo: 'Consulta / Solo Lectura',
  });

  const [miNuevaClave, setMiNuevaClave] = useState('');
  const [miConfirmarClave, setMiConfirmarClave] = useState('');
  const [miClaveMsg, setMiClaveMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const toggleClaveIndividual = (id: string) => {
    setClavesVisiblesIndividual((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => {
        setCopiedId((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      // Silencio si el navegador bloquea portapapeles
    }
  };

  const handleCopyAllCodes = () => {
    const blocks = usuarios.map((u) => formatUsuarioAccessText(u, fundoNombre)).join('\n\n------------------------------\n\n');
    void handleCopyText('ALL_CODES', blocks);
  };

  const openPresetNewUser = (rol: RolUsuario, presetNivel?: NivelAcceso, presetTabs?: ModuloPestanaId[]) => {
    const nivel = presetNivel ?? deriveDefaultNivel(rol);
    const tabs = presetTabs ?? (nivel === 'editor_selectivo' ? deriveDefaultTabs(rol) : []);
    setUserForm({
      nombre: '',
      rut: '',
      email: '',
      password: '',
      rol,
      nivelAcceso: nivel,
      pestanasEditables: tabs,
      carnetSAGVigente: rol === 'encargado_campo' || rol === 'aplicador_sag' || rol === 'agronomo',
      numeroCarnetSAG: rol === 'aplicador_sag' || rol === 'encargado_campo' ? 'SAG-MAULE-' : '',
      fechaVencimientoCarnetSAG: '2028-12-31',
      telefono: '+56 9 ',
      cargo:
        nivel === 'editor_selectivo'
          ? 'Editor de Pestaña Asignada (Resto Solo Lectura)'
          : rol === 'encargado_campo'
          ? 'Encargado de Campo y Bodega Fitosanitaria'
          : rol === 'solo_lectura'
          ? 'Usuario Consulta (Solo Lectura)'
          : getRolLabel(rol),
    });
    setIsNewUserOpen(true);
  };

  const handleCrearUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !userForm.nombre || !userForm.password) return;

    const rol = (userForm.rol as RolUsuario) || 'solo_lectura';
    const nivelAcceso: NivelAcceso =
      rol === 'administrador' ? 'admin' : userForm.nivelAcceso || deriveDefaultNivel(rol);
    const pestanasEditables =
      nivelAcceso === 'editor_selectivo' ? userForm.pestanasEditables || [] : [];

    const nuevo: UsuarioPredio = {
      id: `usr-${Date.now()}`,
      nombre: userForm.nombre || '',
      rut: userForm.rut || '12.345.678-9',
      email: userForm.email || 'usuario@fundolacabana.cl',
      password: userForm.password || '1234',
      rol,
      nivelAcceso,
      pestanasEditables,
      carnetSAGVigente: Boolean(userForm.carnetSAGVigente),
      numeroCarnetSAG: userForm.numeroCarnetSAG || '',
      fechaVencimientoCarnetSAG: userForm.fechaVencimientoCarnetSAG || '2028-12-31',
      telefono: userForm.telefono || '+56 9 ',
      cargo: userForm.cargo || getRolLabel(rol),
    };

    onAddUsuario(nuevo);
    setIsNewUserOpen(false);
  };

  const handleGuardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!isAdmin && editingUser.id !== currentUser.id) return;

    const rolFinal: RolUsuario = isAdmin ? editingUser.rol : currentUser.rol;
    const nivelFinal: NivelAcceso =
      rolFinal === 'administrador'
        ? 'admin'
        : isAdmin
        ? editingUser.nivelAcceso || deriveDefaultNivel(rolFinal)
        : getNivelAcceso(currentUser);
    const tabsFinales: ModuloPestanaId[] = isAdmin
      ? nivelFinal === 'editor_selectivo'
        ? editingUser.pestanasEditables || []
        : []
      : getPestanasEditables(currentUser);

    onUpdateUsuario({
      ...editingUser,
      rol: rolFinal,
      nivelAcceso: nivelFinal,
      pestanasEditables: tabsFinales,
    });
    setEditingUser(null);
  };

  const handleGuardarMiClave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!miNuevaClave || miNuevaClave.trim().length < 4 || miNuevaClave !== miConfirmarClave) {
      setMiClaveMsg({
        tipo: 'error',
        texto: 'Las contraseñas no coinciden o tienen menos de 4 caracteres.',
      });
      return;
    }

    onUpdateUsuario({
      ...currentUser,
      password: miNuevaClave.trim(),
    });
    setMiClaveMsg({ tipo: 'ok', texto: '¡Tu clave personal ha sido actualizada con éxito!' });
    setTimeout(() => {
      setIsChangeMyPasswordOpen(false);
      setMiClaveMsg(null);
      setMiNuevaClave('');
      setMiConfirmarClave('');
    }, 1200);
  };

  const miNivel = getNivelAcceso(currentUser);
  const miNivelMeta = getNivelAccesoMeta(miNivel, currentUser);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Users className="w-3 h-3" />
            Control de Acceso &amp; Permisos · {fundoNombre}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            {isAdmin ? 'Equipo, Niveles de Acceso & Códigos' : 'Mi Cuenta y Niveles de Acceso'}
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {isAdmin
              ? 'Como Administrador puedes crear cuentas, dar edición total, solo lectura o habilitar edición únicamente en pestañas específicas.'
              : 'Las claves y cambios de cuenta están protegidos. Puedes cambiar tu clave personal o iniciar sesión con otra cuenta usando contraseña.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onRequestSwitchUser()}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-300" />
            <span>Cambiar Cuenta (Con Clave)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMiNuevaClave('');
              setMiConfirmarClave('');
              setMiClaveMsg(null);
              setIsChangeMyPasswordOpen(true);
            }}
            className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
            <span>Editar Mi Clave</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setRevelarTodasClaves(!revelarTodasClaves)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  revelarTodasClaves
                    ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-2xs'
                    : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {revelarTodasClaves ? (
                  <EyeOff className="w-3.5 h-3.5 text-amber-800 dark:text-amber-300" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" />
                )}
                <span>{revelarTodasClaves ? 'Ocultar Claves' : 'Ver Claves'}</span>
              </button>

              <button
                type="button"
                onClick={() => openPresetNewUser('solo_lectura')}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Usuario</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Banner de Aviso de Seguridad según Nivel */}
      <div
        className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
          isAdmin
            ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/70 text-purple-950 dark:text-purple-100'
            : miNivel === 'editor_campo'
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-100'
            : miNivel === 'editor_selectivo'
            ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/70 text-sky-950 dark:text-sky-100'
            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70 text-amber-950 dark:text-amber-100'
        }`}
      >
        <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-stone-900 dark:text-stone-100">
              Sesión Actual: {currentUser.nombre} ({getRolLabel(currentUser.rol)})
            </p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${miNivelMeta.badgeClass}`}>
              {miNivelMeta.label}
            </span>
          </div>
          <p className="text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed">{miNivelMeta.description}</p>
        </div>
      </div>

      {/* PANEL EXCLUSIVO ADMIN: Códigos de Acceso por Ítem / Perfil para Copiar y Pegar */}
      {isAdmin && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/70 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
            <div>
              <h2 className="font-black text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                Códigos de Acceso por Ítem (Solo Administrador · Copiar y Pegar)
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                Entrega estas credenciales individuales o restringe a usuarios para que editen solo 1 o algunas pestañas manteniendo el resto en Solo Lectura.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openPresetNewUser('encargado_campo', 'editor_campo')}
                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/70 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                + Crear Editor Total
              </button>
              <button
                type="button"
                onClick={() => openPresetNewUser('operador_riego', 'editor_selectivo', ['riego'])}
                className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-900 dark:text-sky-200 border border-sky-200 dark:border-sky-800/70 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                + Editor por Pestaña
              </button>
              <button
                type="button"
                onClick={() => openPresetNewUser('solo_lectura', 'solo_lectura')}
                className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                + Crear Solo Lectura
              </button>
              <button
                type="button"
                onClick={handleCopyAllCodes}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copiedId === 'ALL_CODES' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'ALL_CODES' ? '¡Todos Copiados!' : 'Copiar Todos los Códigos'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Ítem / Usuario</th>
                  <th className="px-3 py-2.5">Nivel de Acceso y Pestañas</th>
                  <th className="px-3 py-2.5">RUT / Correo</th>
                  <th className="px-3 py-2.5">Código / Clave</th>
                  <th className="px-3 py-2.5 text-right">Copiar y Pegar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {usuarios.map((u) => {
                  const nivel = getNivelAcceso(u);
                  const meta = getNivelAccesoMeta(nivel, u);
                  const userTabs = getPestanasEditables(u);
                  const isCopied = copiedId === `row-${u.id}`;
                  return (
                    <tr key={u.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/50">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-stone-900 dark:text-stone-100">{u.nombre}</div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400">{getRolLabel(u.rol)} · {u.cargo}</div>
                      </td>
                      <td className="px-3 py-2.5 space-y-1">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${meta.badgeClass}`}>
                          {meta.shortLabel}
                        </span>
                        {nivel === 'editor_selectivo' && (
                          <div className="text-[10px] text-sky-900 dark:text-sky-300 font-medium max-w-[230px] leading-snug">
                            {userTabs.length > 0
                              ? `Edita: ${userTabs.map((t) => getTabLabel(t)).join(', ')}`
                              : 'Sin pestañas asignadas (Solo lectura)'}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-stone-700 dark:text-stone-300">
                        <div>{u.rut}</div>
                        <div className="text-stone-500 dark:text-stone-400">{u.email}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-200">
                          {revelarTodasClaves || clavesVisiblesIndividual[u.id] ? u.password : '••••••••'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleCopyText(`row-${u.id}`, formatUsuarioAccessText(u, fundoNombre))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                            isCopied
                              ? 'bg-emerald-700 text-white'
                              : 'bg-stone-100 dark:bg-stone-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-stone-800 dark:text-stone-200 hover:text-emerald-950 dark:hover:text-emerald-200'
                          }`}
                        >
                          {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopied ? 'Copiado' : 'Copiar Acceso'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid de Tarjetas de Usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usuarios.map((u) => {
          const isUserCurrent = u.id === currentUser.id;
          const isUserActiveSession = u.id === activeUserId;
          const canViewPassword = isAdmin || isUserCurrent;
          const isPasswordVisible = revelarTodasClaves || clavesVisiblesIndividual[u.id];
          const nivel = getNivelAcceso(u);
          const meta = getNivelAccesoMeta(nivel, u);
          const userTabs = getPestanasEditables(u);

          return (
            <div
              key={u.id}
              className={`bg-white dark:bg-stone-900 rounded-2xl border p-5 shadow-2xs space-y-3.5 transition-all relative ${
                isUserCurrent
                  ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                  : 'border-stone-200 dark:border-stone-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${meta.badgeClass}`}>
                      {meta.shortLabel}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-stone-400">
                      {getRolLabel(u.rol)}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">{u.nombre}</h3>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">RUT: {u.rut}</div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {isUserCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-white text-[9px] font-bold uppercase">
                      Sesión Actual
                    </span>
                  )}
                  {isUserActiveSession && !isUserCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-[9px] font-bold uppercase">
                      Activo
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-stone-600 dark:text-stone-300 font-medium bg-stone-50 dark:bg-stone-800/70 p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-700 space-y-1.5">
                <div>{u.cargo}</div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-snug">{meta.description}</div>
                {nivel === 'editor_selectivo' && userTabs.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {userTabs.map((tId) => (
                      <span
                        key={tId}
                        className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/50 text-sky-900 dark:text-sky-200 border border-sky-200 dark:border-sky-700/70 text-[9px] font-bold"
                      >
                        ✎ {getTabLabel(tId)}
                      </span>
                    ))}
                    <span className="px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-[9px] font-semibold">
                      Resto: Solo Lectura
                    </span>
                  </div>
                )}
              </div>

              {/* ZONA DE CONTRASEÑA PROTEGIDA */}
              <div className="p-2.5 rounded-xl border bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-700 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                  <span className="font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-stone-400" />
                    Clave de Acceso:
                  </span>
                  <div className="flex items-center gap-1">
                    {canViewPassword && (
                      <button
                        type="button"
                        onClick={() => toggleClaveIndividual(u.id)}
                        className="text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer p-0.5"
                        title={isPasswordVisible ? 'Ocultar' : 'Revelar'}
                      >
                        {isPasswordVisible ? (
                          <EyeOff className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(`card-${u.id}`, formatUsuarioAccessText(u, fundoNombre))}
                        className="text-stone-400 hover:text-emerald-800 dark:hover:text-emerald-400 cursor-pointer p-0.5"
                        title="Copiar credenciales de acceso"
                      >
                        {copiedId === `card-${u.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="font-mono text-xs font-bold tracking-wider">
                  {canViewPassword ? (
                    isPasswordVisible ? (
                      <span className="text-emerald-900 dark:text-emerald-200 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                        {u.password}
                      </span>
                    ) : (
                      <span className="text-stone-500 dark:text-stone-400">••••••••</span>
                    )
                  ) : (
                    <span className="text-stone-400 italic font-normal text-[10px]">
                      Protegida (Solo Administrador)
                    </span>
                  )}
                </div>
              </div>

              {/* Carnet SAG */}
              <div
                className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                  u.carnetSAGVigente
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-200'
                    : 'bg-stone-50 dark:bg-stone-800/70 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-[11px]">
                  <span>Carnet Aplicador SAG:</span>
                  <span>{u.carnetSAGVigente ? 'Vigente' : 'No Aplica'}</span>
                </div>
                {u.numeroCarnetSAG && <div className="font-mono text-[10px]">{u.numeroCarnetSAG}</div>}
                {u.fechaVencimientoCarnetSAG && (
                  <div className="text-[10px] opacity-75">Vence: {u.fechaVencimientoCarnetSAG}</div>
                )}
              </div>

              {/* Contacto */}
              <div className="space-y-1 text-[11px] text-stone-500 dark:text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-stone-400" />
                  <span>{u.telefono}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3 h-3 text-stone-400" />
                  <span className="truncate">{u.email}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-1">
                  {(isAdmin || isUserCurrent) && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingUser({
                          ...u,
                          nivelAcceso: getNivelAcceso(u),
                          pestanasEditables: getPestanasEditables(u),
                        })
                      }
                      className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title={isUserCurrent ? 'Editar mis datos y clave' : 'Editar usuario, permisos por pestaña y clave'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{isAdmin ? 'Editar / Permisos' : 'Editar'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {!isUserCurrent && (
                    <button
                      type="button"
                      onClick={() => onRequestSwitchUser(u)}
                      className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-stone-700 dark:text-stone-200 hover:text-emerald-900 dark:hover:text-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title="Iniciar sesión con esta cuenta ingresando su clave"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Ingresar con Clave</span>
                    </button>
                  )}

                  {isAdmin && usuarios.length > 1 && !isUserCurrent && (
                    <button
                      type="button"
                      onClick={() => setUsuarioToDelete(u)}
                      className="px-2 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nuevo Usuario (Solo Admin) */}
      {isNewUserOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Nuevo Integrante y Nivel de Acceso</h3>
              <button onClick={() => setIsNewUserOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCrearUsuario} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto text-stone-900 dark:text-stone-100">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={userForm.nombre}
                  onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  placeholder="Ej. Marcos Fuentes"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">RUT (Para Login):</label>
                  <input
                    type="text"
                    value={userForm.rut}
                    onChange={(e) => setUserForm({ ...userForm, rut: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg font-mono text-stone-900 dark:text-stone-100"
                    placeholder="18.234.567-8"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Rol en el Fundo:</label>
                  <select
                    value={userForm.rol}
                    onChange={(e) => {
                      const nextRol = e.target.value as RolUsuario;
                      const nextNivel = deriveDefaultNivel(nextRol);
                      setUserForm({
                        ...userForm,
                        rol: nextRol,
                        nivelAcceso: nextNivel,
                        pestanasEditables:
                          nextNivel === 'editor_selectivo' ? deriveDefaultTabs(nextRol) : [],
                      });
                    }}
                    className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  >
                    <option value="encargado_campo">Encargado de Campo</option>
                    <option value="agronomo">Ingeniero Agrónomo</option>
                    <option value="capataz">Capataz de Campo</option>
                    <option value="aplicador_sag">Aplicador Acreditado SAG</option>
                    <option value="operador_riego">Operador de Riego</option>
                    <option value="solo_lectura">Consulta / Solo Lectura</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
              </div>

              {/* Nivel de Acceso explícito */}
              <div className="p-3 bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-xl space-y-2.5">
                <label className="block font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  Nivel de Acceso a la Información:
                </label>
                {userForm.rol === 'administrador' ? (
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/70 rounded-lg text-purple-900 dark:text-purple-200 font-bold text-[11px]">
                    Administrador Total (Gestiona usuarios, reinicia huerto y edita todas las áreas)
                  </div>
                ) : (
                  <>
                    <select
                      value={userForm.nivelAcceso || 'solo_lectura'}
                      onChange={(e) => {
                        const nextNivel = e.target.value as NivelAcceso;
                        setUserForm({
                          ...userForm,
                          nivelAcceso: nextNivel,
                          pestanasEditables:
                            nextNivel === 'editor_selectivo'
                              ? userForm.pestanasEditables?.length
                                ? userForm.pestanasEditables
                                : ['fitosanitarios']
                              : [],
                        });
                      }}
                      className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg font-semibold text-stone-900 dark:text-stone-100"
                    >
                      <option value="editor_campo">
                        Editor Total de Campo (Edita todas las pestañas operativas)
                      </option>
                      <option value="editor_selectivo">
                        Edición Solo en Pestañas Elegidas (Las demás en Solo Lectura)
                      </option>
                      <option value="solo_lectura">
                        Solo Lectura Total (Puede entrar e interactuar, SIN editar ni borrar nada)
                      </option>
                    </select>

                    {userForm.nivelAcceso === 'editor_selectivo' && (
                      <SelectorPestanasEditables
                        selectedTabs={userForm.pestanasEditables || []}
                        onChange={(nextTabs) =>
                          setUserForm({ ...userForm, pestanasEditables: nextTabs })
                        }
                      />
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Correo Electrónico (Para Login):</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  placeholder="usuario@fundolacabana.cl"
                  required
                />
              </div>

              {/* Clave Personal */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/70 rounded-xl space-y-1.5">
                <label className="block font-bold text-emerald-950 dark:text-emerald-200 mb-0.5 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  Código / Clave Personal de Acceso:
                </label>
                <input
                  type="text"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-stone-950 border border-emerald-300 dark:border-emerald-700 rounded-lg font-mono font-bold text-sm text-emerald-950 dark:text-emerald-200"
                  placeholder="Ej. campo2026"
                  required
                />
                <p className="text-[10px] text-emerald-800 dark:text-emerald-300">
                  Luego podrás copiar este código desde la tabla superior para entregarlo al trabajador.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Cargo Desempeñado:</label>
                <input
                  type="text"
                  value={userForm.cargo}
                  onChange={(e) => setUserForm({ ...userForm, cargo: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  placeholder="Ej. Encargado de Bodega y Fitosanitarios"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">N° Carnet SAG:</label>
                  <input
                    type="text"
                    value={userForm.numeroCarnetSAG || ''}
                    onChange={(e) => setUserForm({ ...userForm, numeroCarnetSAG: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg font-mono text-stone-900 dark:text-stone-100"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Teléfono:</label>
                  <input
                    type="text"
                    value={userForm.telefono || ''}
                    onChange={(e) => setUserForm({ ...userForm, telefono: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsNewUserOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario & Permisos */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-lg border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Editar Datos y Permisos de {editingUser.nombre}</h3>
              <button onClick={() => setEditingUser(null)} className="text-emerald-200 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleGuardarEdicion} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto text-stone-900 dark:text-stone-100">
              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={editingUser.nombre || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nombre: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg font-medium text-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">RUT:</label>
                  <input
                    type="text"
                    value={editingUser.rut || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, rut: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg font-mono text-stone-900 dark:text-stone-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Rol:</label>
                  <select
                    value={editingUser.rol || 'solo_lectura'}
                    disabled={!isAdmin}
                    onChange={(e) => {
                      const nextRol = e.target.value as RolUsuario;
                      const nextNivel = deriveDefaultNivel(nextRol);
                      setEditingUser({
                        ...editingUser,
                        rol: nextRol,
                        nivelAcceso: nextNivel,
                        pestanasEditables:
                          nextNivel === 'editor_selectivo'
                            ? editingUser.pestanasEditables?.length
                              ? editingUser.pestanasEditables
                              : deriveDefaultTabs(nextRol)
                            : [],
                      });
                    }}
                    className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg disabled:bg-stone-100 dark:disabled:bg-stone-800 text-stone-900 dark:text-stone-100"
                  >
                    <option value="administrador">Administrador</option>
                    <option value="encargado_campo">Encargado de Campo</option>
                    <option value="agronomo">Ingeniero Agrónomo</option>
                    <option value="capataz">Capataz de Campo</option>
                    <option value="aplicador_sag">Aplicador Acreditado SAG</option>
                    <option value="operador_riego">Operador de Riego</option>
                    <option value="solo_lectura">Consulta / Solo Lectura</option>
                  </select>
                </div>
              </div>

              {isAdmin && (
                <div className="p-3 bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-xl space-y-2.5">
                  <label className="block font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    Nivel de Permisos en la App:
                  </label>
                  {editingUser.rol === 'administrador' ? (
                    <div className="p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/70 rounded-lg text-purple-900 dark:text-purple-200 font-bold text-[11px]">
                      Administrador Total (Control absoluto)
                    </div>
                  ) : (
                    <>
                      <select
                        value={editingUser.nivelAcceso || deriveDefaultNivel(editingUser.rol)}
                        onChange={(e) => {
                          const nextNivel = e.target.value as NivelAcceso;
                          setEditingUser({
                            ...editingUser,
                            nivelAcceso: nextNivel,
                            pestanasEditables:
                              nextNivel === 'editor_selectivo'
                                ? editingUser.pestanasEditables?.length
                                  ? editingUser.pestanasEditables
                                  : ['fitosanitarios']
                                : [],
                          });
                        }}
                        className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg font-semibold text-stone-900 dark:text-stone-100"
                      >
                        <option value="editor_campo">
                          Editor Total de Campo (Edita todas las pestañas operativas)
                        </option>
                        <option value="editor_selectivo">
                          Edición Solo en Pestañas Elegidas (Las demás en Solo Lectura)
                        </option>
                        <option value="solo_lectura">
                          Solo Lectura Total (Interactúa sin editar ni eliminar datos)
                        </option>
                      </select>

                      {editingUser.nivelAcceso === 'editor_selectivo' && (
                        <SelectorPestanasEditables
                          selectedTabs={editingUser.pestanasEditables || []}
                          onChange={(nextTabs) =>
                            setEditingUser({
                              ...editingUser,
                              pestanasEditables: nextTabs,
                            })
                          }
                        />
                      )}
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              {/* Clave Personal */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/70 rounded-xl space-y-1.5">
                <label className="block font-bold text-emerald-950 dark:text-emerald-200 mb-0.5 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  Clave Personal:
                </label>
                <input
                  type="text"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-stone-950 border border-emerald-300 dark:border-emerald-700 rounded-lg font-mono font-bold text-sm text-emerald-950 dark:text-emerald-200"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Cargo Desempeñado:</label>
                <input
                  type="text"
                  value={editingUser.cargo || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, cargo: e.target.value })}
                  className="w-full p-2 bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cambio de Clave Propia (Para cualquier usuario) */}
      {isChangeMyPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Cambiar Mi Clave Personal</h3>
              <button onClick={() => setIsChangeMyPasswordOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleGuardarMiClave} className="p-5 space-y-3.5 text-xs text-stone-900 dark:text-stone-100">
              <div className="text-stone-600 dark:text-stone-400 text-[11px]">
                Usuario: <strong className="text-stone-900 dark:text-stone-100">{currentUser.nombre}</strong> ({currentUser.rut})
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Nueva Contraseña:</label>
                <input
                  type="password"
                  value={miNuevaClave}
                  onChange={(e) => setMiNuevaClave(e.target.value)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg font-mono text-stone-900 dark:text-stone-100"
                  placeholder="Mínimo 4 caracteres"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 dark:text-stone-300 mb-1">Confirmar Nueva Contraseña:</label>
                <input
                  type="password"
                  value={miConfirmarClave}
                  onChange={(e) => setMiConfirmarClave(e.target.value)}
                  className="w-full p-2 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg font-mono text-stone-900 dark:text-stone-100"
                  placeholder="Repite tu contraseña"
                  required
                />
              </div>

              {miClaveMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-bold text-center ${
                    miClaveMsg.tipo === 'ok'
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                  }`}
                >
                  {miClaveMsg.texto}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsChangeMyPasswordOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                >
                  Actualizar Mi Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación Eliminación Usuario */}
      {usuarioToDelete && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Eliminar Usuario del Predio</h3>
              <button onClick={() => setUsuarioToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs text-stone-900 dark:text-stone-100">
              <p className="text-stone-700 dark:text-stone-300">
                ¿Estás seguro de que deseas eliminar permanentemente la cuenta de <strong>{usuarioToDelete.nombre}</strong>?
              </p>
              <div className="p-2.5 bg-stone-50 dark:bg-stone-800/70 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-[11px] space-y-1">
                <div><strong>RUT:</strong> {usuarioToDelete.rut}</div>
                <div><strong>Rol:</strong> {getRolLabel(usuarioToDelete.rol)} · {usuarioToDelete.cargo}</div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setUsuarioToDelete(null)}
                  className="px-3.5 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteUsuario(usuarioToDelete.id);
                    setUsuarioToDelete(null);
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
