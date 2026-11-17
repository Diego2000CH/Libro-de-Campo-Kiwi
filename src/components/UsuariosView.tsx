import React, { useState } from 'react';
import { UsuarioPredio, RolUsuario, NivelAcceso } from '../types/campo';
import {
  getNivelAcceso,
  getNivelAccesoMeta,
  getRolLabel,
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
  return 'solo_lectura';
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

  // Como admin, toggle para ver todas las claves y feedback de copiado
  const [revelarTodasClaves, setRevelarTodasClaves] = useState(false);
  const [clavesVisiblesIndividual, setClavesVisiblesIndividual] = useState<Record<string, boolean>>({});
  const [usuarioToDelete, setUsuarioToDelete] = useState<UsuarioPredio | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Formulario nuevo usuario
  const [userForm, setUserForm] = useState<Partial<UsuarioPredio>>({
    nombre: '',
    rut: '',
    email: '',
    password: '',
    rol: 'solo_lectura',
    nivelAcceso: 'solo_lectura',
    carnetSAGVigente: false,
    numeroCarnetSAG: '',
    fechaVencimientoCarnetSAG: '2028-12-31',
    telefono: '+56 9 ',
    cargo: 'Consulta / Solo Lectura',
  });

  // Formulario cambio de clave propia
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

  const openPresetNewUser = (rol: RolUsuario) => {
    const nivel = deriveDefaultNivel(rol);
    setUserForm({
      nombre: '',
      rut: '',
      email: '',
      password: '',
      rol,
      nivelAcceso: nivel,
      carnetSAGVigente: rol === 'encargado_campo' || rol === 'aplicador_sag' || rol === 'agronomo',
      numeroCarnetSAG: rol === 'aplicador_sag' || rol === 'encargado_campo' ? 'SAG-MAULE-' : '',
      fechaVencimientoCarnetSAG: '2028-12-31',
      telefono: '+56 9 ',
      cargo:
        rol === 'encargado_campo'
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

    const nuevo: UsuarioPredio = {
      id: `usr-${Date.now()}`,
      nombre: userForm.nombre || '',
      rut: userForm.rut || '12.345.678-9',
      email: userForm.email || 'usuario@fundolacabana.cl',
      password: userForm.password || '1234',
      rol,
      nivelAcceso,
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

    onUpdateUsuario({
      ...editingUser,
      rol: rolFinal,
      nivelAcceso: nivelFinal,
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
  const miNivelMeta = getNivelAccesoMeta(miNivel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Users className="w-3 h-3" />
            Control de Acceso & Permisos · {fundoNombre}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {isAdmin ? 'Equipo, Niveles de Acceso & Códigos' : 'Mi Cuenta y Niveles de Acceso'}
          </h1>
          <p className="text-xs text-stone-500">
            {isAdmin
              ? 'Como Administrador puedes crear cuentas, definir niveles de edición/lectura y copiar códigos para tu equipo.'
              : 'Las claves y cambios de cuenta están protegidos. Puedes cambiar tu clave personal o iniciar sesión con otra cuenta usando contraseña.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onRequestSwitchUser()}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
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
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-stone-600" />
            <span>Editar Mi Clave</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setRevelarTodasClaves(!revelarTodasClaves)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  revelarTodasClaves
                    ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {revelarTodasClaves ? <EyeOff className="w-3.5 h-3.5 text-amber-800" /> : <Eye className="w-3.5 h-3.5 text-emerald-800" />}
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
            ? 'bg-purple-50/70 border-purple-200 text-purple-950'
            : miNivel === 'editor_campo'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}
      >
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-stone-900">
              Sesión Actual: {currentUser.nombre} ({getRolLabel(currentUser.rol)})
            </p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${miNivelMeta.badgeClass}`}>
              {miNivelMeta.label}
            </span>
          </div>
          <p className="text-[11px] text-stone-700 leading-relaxed">{miNivelMeta.description}</p>
        </div>
      </div>

      {/* PANEL EXCLUSIVO ADMIN: Códigos de Acceso por Ítem / Perfil para Copiar y Pegar */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h2 className="font-black text-sm text-stone-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-700" />
                Códigos de Acceso por Ítem (Solo Administrador · Copiar y Pegar)
              </h2>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Entrega estas credenciales individuales a cada persona según el nivel de permisos que necesite. Nadie puede entrar como Administrador sin tu clave.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openPresetNewUser('encargado_campo')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-[11px] font-bold cursor-pointer"
              >
                + Crear Encargado Campo
              </button>
              <button
                type="button"
                onClick={() => openPresetNewUser('solo_lectura')}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold cursor-pointer"
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
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2.5">Ítem / Usuario</th>
                  <th className="px-3 py-2.5">Nivel de Acceso</th>
                  <th className="px-3 py-2.5">RUT / Correo</th>
                  <th className="px-3 py-2.5">Código / Clave</th>
                  <th className="px-3 py-2.5 text-right">Copiar y Pegar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {usuarios.map((u) => {
                  const nivel = getNivelAcceso(u);
                  const meta = getNivelAccesoMeta(nivel);
                  const isCopied = copiedId === `row-${u.id}`;
                  return (
                    <tr key={u.id} className="hover:bg-stone-50/70">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-stone-900">{u.nombre}</div>
                        <div className="text-[10px] text-stone-500">{getRolLabel(u.rol)} · {u.cargo}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${meta.badgeClass}`}>
                          {meta.shortLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-stone-700">
                        <div>{u.rut}</div>
                        <div className="text-stone-500">{u.email}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-950">
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
                              : 'bg-stone-100 hover:bg-emerald-100 text-stone-800 hover:text-emerald-950'
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
          const meta = getNivelAccesoMeta(nivel);

          return (
            <div
              key={u.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-3.5 transition-all relative ${
                isUserCurrent ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-stone-200'
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
                  <h3 className="font-bold text-sm text-stone-900">{u.nombre}</h3>
                  <div className="text-[11px] text-stone-500 font-mono">RUT: {u.rut}</div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {isUserCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-white text-[9px] font-bold uppercase">
                      Sesión Actual
                    </span>
                  )}
                  {isUserActiveSession && !isUserCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-bold uppercase">
                      Activo
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-stone-600 font-medium bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 space-y-1">
                <div>{u.cargo}</div>
                <div className="text-[10px] text-stone-500 leading-snug">{meta.description}</div>
              </div>

              {/* ZONA DE CONTRASEÑA PROTEGIDA */}
              <div className="p-2.5 rounded-xl border bg-stone-50 border-stone-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-stone-400" />
                    Clave de Acceso:
                  </span>
                  <div className="flex items-center gap-1">
                    {canViewPassword && (
                      <button
                        type="button"
                        onClick={() => toggleClaveIndividual(u.id)}
                        className="text-stone-400 hover:text-stone-800 cursor-pointer p-0.5"
                        title={isPasswordVisible ? 'Ocultar' : 'Revelar'}
                      >
                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(`card-${u.id}`, formatUsuarioAccessText(u, fundoNombre))}
                        className="text-stone-400 hover:text-emerald-800 cursor-pointer p-0.5"
                        title="Copiar credenciales de acceso"
                      >
                        {copiedId === `card-${u.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
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
                      <span className="text-emerald-900 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300">
                        {u.password}
                      </span>
                    ) : (
                      <span className="text-stone-500">••••••••</span>
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
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-stone-50 border-stone-200 text-stone-600'
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
              <div className="space-y-1 text-[11px] text-stone-500">
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
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
                <div className="flex items-center gap-1">
                  {(isAdmin || isUserCurrent) && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingUser({
                          ...u,
                          nivelAcceso: getNivelAcceso(u),
                        })
                      }
                      className="p-1.5 text-stone-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title={isUserCurrent ? 'Editar mis datos y clave' : 'Editar usuario, permisos y clave'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Editar</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {!isUserCurrent && (
                    <button
                      type="button"
                      onClick={() => onRequestSwitchUser(u)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
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
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Nuevo Integrante y Nivel de Acceso</h3>
              <button onClick={() => setIsNewUserOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCrearUsuario} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={userForm.nombre}
                  onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="Ej. Marcos Fuentes"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">RUT (Para Login):</label>
                  <input
                    type="text"
                    value={userForm.rut}
                    onChange={(e) => setUserForm({ ...userForm, rut: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    placeholder="18.234.567-8"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Rol en el Fundo:</label>
                  <select
                    value={userForm.rol}
                    onChange={(e) => {
                      const nextRol = e.target.value as RolUsuario;
                      setUserForm({
                        ...userForm,
                        rol: nextRol,
                        nivelAcceso: deriveDefaultNivel(nextRol),
                      });
                    }}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
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
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
                <label className="block font-bold text-stone-800 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
                  Nivel de Acceso a la Información:
                </label>
                {userForm.rol === 'administrador' ? (
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 font-bold text-[11px]">
                    Administrador Total (Gestiona usuarios, reinicia huerto y edita todas las áreas)
                  </div>
                ) : (
                  <select
                    value={userForm.nivelAcceso || 'solo_lectura'}
                    onChange={(e) =>
                      setUserForm({ ...userForm, nivelAcceso: e.target.value as NivelAcceso })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-semibold"
                  >
                    <option value="editor_campo">
                      Encargado de Campo (Agrega/edita/quita Fitosanitarios y todas las áreas)
                    </option>
                    <option value="solo_lectura">
                      Solo Lectura (Puede entrar e interactuar, SIN editar ni borrar nada)
                    </option>
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Correo Electrónico (Para Login):</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="usuario@fundolacabana.cl"
                  required
                />
              </div>

              {/* Clave Personal */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                <label className="block font-bold text-emerald-950 mb-0.5 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                  Código / Clave Personal de Acceso:
                </label>
                <input
                  type="text"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-sm text-emerald-950"
                  placeholder="Ej. campo2026"
                  required
                />
                <p className="text-[10px] text-emerald-800">
                  Luego podrás copiar este código desde la tabla superior para entregarlo al trabajador.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Cargo Desempeñado:</label>
                <input
                  type="text"
                  value={userForm.cargo}
                  onChange={(e) => setUserForm({ ...userForm, cargo: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="Ej. Encargado de Bodega y Fitosanitarios"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° Carnet SAG:</label>
                  <input
                    type="text"
                    value={userForm.numeroCarnetSAG || ''}
                    onChange={(e) => setUserForm({ ...userForm, numeroCarnetSAG: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Teléfono:</label>
                  <input
                    type="text"
                    value={userForm.telefono || ''}
                    onChange={(e) => setUserForm({ ...userForm, telefono: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsNewUserOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Editar Datos de {editingUser.nombre}</h3>
              <button onClick={() => setEditingUser(null)} className="text-emerald-200 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleGuardarEdicion} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={editingUser.nombre || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, nombre: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">RUT:</label>
                  <input
                    type="text"
                    value={editingUser.rut || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, rut: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Rol:</label>
                  <select
                    value={editingUser.rol || 'solo_lectura'}
                    disabled={!isAdmin}
                    onChange={(e) => {
                      const nextRol = e.target.value as RolUsuario;
                      setEditingUser({
                        ...editingUser,
                        rol: nextRol,
                        nivelAcceso: deriveDefaultNivel(nextRol),
                      });
                    }}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg disabled:bg-stone-100"
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
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5">
                  <label className="block font-bold text-stone-800 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
                    Nivel de Permisos en la App:
                  </label>
                  {editingUser.rol === 'administrador' ? (
                    <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 font-bold text-[11px]">
                      Administrador Total (Control absoluto)
                    </div>
                  ) : (
                    <select
                      value={editingUser.nivelAcceso || deriveDefaultNivel(editingUser.rol)}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          nivelAcceso: e.target.value as NivelAcceso,
                        })
                      }
                      className="w-full p-2 bg-white border border-stone-300 rounded-lg font-semibold"
                    >
                      <option value="editor_campo">
                        Encargado de Campo (Agrega/edita/quita Fitosanitarios y todas las áreas)
                      </option>
                      <option value="solo_lectura">
                        Solo Lectura (Interactúa sin editar ni eliminar datos)
                      </option>
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-stone-700 mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  required
                />
              </div>

              {/* Clave Personal */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                <label className="block font-bold text-emerald-950 mb-0.5 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                  Clave Personal:
                </label>
                <input
                  type="text"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-sm text-emerald-950"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Cargo Desempeñado:</label>
                <input
                  type="text"
                  value={editingUser.cargo || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, cargo: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Cambiar Mi Clave Personal</h3>
              <button onClick={() => setIsChangeMyPasswordOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleGuardarMiClave} className="p-5 space-y-3.5 text-xs">
              <div className="text-stone-600 text-[11px]">
                Usuario: <strong className="text-stone-900">{currentUser.nombre}</strong> ({currentUser.rut})
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Nueva Contraseña:</label>
                <input
                  type="password"
                  value={miNuevaClave}
                  onChange={(e) => setMiNuevaClave(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                  placeholder="Mínimo 4 caracteres"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Confirmar Nueva Contraseña:</label>
                <input
                  type="password"
                  value={miConfirmarClave}
                  onChange={(e) => setMiConfirmarClave(e.target.value)}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                  placeholder="Repite tu contraseña"
                  required
                />
              </div>

              {miClaveMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-bold text-center ${
                    miClaveMsg.tipo === 'ok'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  {miClaveMsg.texto}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsChangeMyPasswordOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer"
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Eliminar Usuario del Predio</h3>
              <button onClick={() => setUsuarioToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-stone-700">
                ¿Estás seguro de que deseas eliminar permanentemente la cuenta de <strong>{usuarioToDelete.nombre}</strong>?
              </p>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-600 text-[11px] space-y-1">
                <div><strong>RUT:</strong> {usuarioToDelete.rut}</div>
                <div><strong>Rol:</strong> {getRolLabel(usuarioToDelete.rol)} · {usuarioToDelete.cargo}</div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setUsuarioToDelete(null)}
                  className="px-3.5 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50 cursor-pointer font-medium"
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
