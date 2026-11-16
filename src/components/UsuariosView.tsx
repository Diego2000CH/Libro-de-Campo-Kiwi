import React, { useState } from 'react';
import { UsuarioPredio, RolUsuario } from '../types/campo';
import { 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  UserCheck, 
  Phone, 
  Mail,
  Award,
  KeyRound,
  Eye,
  EyeOff,
  Edit2,
  Lock,
  ShieldAlert,
  UserCog
} from 'lucide-react';

interface UsuariosViewProps {
  usuarios: UsuarioPredio[];
  currentUser: UsuarioPredio;
  activeUserId: string;
  onSetActiveUser: (id: string) => void;
  onAddUsuario: (usuario: UsuarioPredio) => void;
  onUpdateUsuario: (usuario: UsuarioPredio) => void;
  onDeleteUsuario: (id: string) => void;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarios,
  currentUser,
  activeUserId,
  onSetActiveUser,
  onAddUsuario,
  onUpdateUsuario,
  onDeleteUsuario
}) => {
  const isAdmin = currentUser.rol === 'administrador';

  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioPredio | null>(null);
  const [isChangeMyPasswordOpen, setIsChangeMyPasswordOpen] = useState(false);
  
  // Como admin, toggle para ver todas las claves
  const [revelarTodasClaves, setRevelarTodasClaves] = useState(false);
  const [clavesVisiblesIndividual, setClavesVisiblesIndividual] = useState<Record<string, boolean>>({});
  const [usuarioToDelete, setUsuarioToDelete] = useState<UsuarioPredio | null>(null);

  // Formulario nuevo usuario
  const [userForm, setUserForm] = useState<Partial<UsuarioPredio>>({
    nombre: '',
    rut: '',
    email: '',
    password: '',
    rol: 'aplicador_sag',
    carnetSAGVigente: true,
    numeroCarnetSAG: 'SAG-MAULE-',
    fechaVencimientoCarnetSAG: '2028-12-31',
    telefono: '+56 9 ',
    cargo: 'Tractorista y Aplicador'
  });

  // Formulario cambio de clave propia
  const [miNuevaClave, setMiNuevaClave] = useState('');
  const [miConfirmarClave, setMiConfirmarClave] = useState('');
  const [miClaveMsg, setMiClaveMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const toggleClaveIndividual = (id: string) => {
    setClavesVisiblesIndividual((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCrearUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.nombre || !userForm.password) return;

    const nuevo: UsuarioPredio = {
      id: `usr-${Date.now()}`,
      nombre: userForm.nombre || '',
      rut: userForm.rut || '12.345.678-9',
      email: userForm.email || 'contacto@fundolacabana.cl',
      password: userForm.password || '1234',
      rol: (userForm.rol as RolUsuario) || 'aplicador_sag',
      carnetSAGVigente: userForm.carnetSAGVigente !== false,
      numeroCarnetSAG: userForm.numeroCarnetSAG || '',
      fechaVencimientoCarnetSAG: userForm.fechaVencimientoCarnetSAG || '2028-12-31',
      telefono: userForm.telefono || '+56 9 ',
      cargo: userForm.cargo || 'Operador de Campo'
    };

    onAddUsuario(nuevo);
    setIsNewUserOpen(false);
    setUserForm({
      nombre: '',
      rut: '',
      email: '',
      password: '',
      rol: 'aplicador_sag',
      carnetSAGVigente: true,
      numeroCarnetSAG: 'SAG-MAULE-',
      fechaVencimientoCarnetSAG: '2028-12-31',
      telefono: '+56 9 ',
      cargo: 'Tractorista y Aplicador'
    });
  };

  const handleGuardarEdicion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    onUpdateUsuario(editingUser);
    setEditingUser(null);
  };

  const handleGuardarMiClave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!miNuevaClave || miNuevaClave !== miConfirmarClave) {
      setMiClaveMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden o están en blanco.' });
      return;
    }

    onUpdateUsuario({
      ...currentUser,
      password: miNuevaClave
    });
    setMiClaveMsg({ tipo: 'ok', texto: '¡Tu clave personal ha sido actualizada con éxito!' });
    setTimeout(() => {
      setIsChangeMyPasswordOpen(false);
      setMiClaveMsg(null);
      setMiNuevaClave('');
      setMiConfirmarClave('');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1">
            <Users className="w-3 h-3" />
            Control de Usuarios & Seguridad Fundo La Cabaña
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Equipo Técnico, Credenciales & Claves
          </h1>
          <p className="text-xs text-stone-500">
            {isAdmin 
              ? 'Panel de Administrador: Control de perfiles, permisos y visualización de claves del equipo.'
              : 'Gestión de perfiles de campo y actualización de tu clave personal.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón cambiar mi propia clave (disponible para todos) */}
          <button
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

          {/* Si es Admin, botón para revelar todas las claves */}
          {isAdmin && (
            <button
              onClick={() => setRevelarTodasClaves(!revelarTodasClaves)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                revelarTodasClaves
                  ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                  : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
              }`}
              title="Solo el Administrador puede ver todas las claves de los usuarios"
            >
              {revelarTodasClaves ? <EyeOff className="w-3.5 h-3.5 text-amber-800" /> : <Eye className="w-3.5 h-3.5 text-emerald-800" />}
              <span>{revelarTodasClaves ? 'Ocultar Claves' : 'Ver Todas las Claves (Admin)'}</span>
            </button>
          )}

          {/* Si es Admin, botón para nuevo usuario */}
          {isAdmin && (
            <button
              onClick={() => setIsNewUserOpen(true)}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Aviso de Seguridad según Rol */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
        isAdmin 
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
          : 'bg-stone-50 border-stone-200 text-stone-700'
      }`}>
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-stone-900">
            {isAdmin 
              ? 'Rol Administrador Activo: Permisos Totales' 
              : `Sesión Activa: ${currentUser.nombre} (${currentUser.cargo})`}
          </p>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            {isAdmin 
              ? 'Como Administrador principal de la app, tienes acceso exclusivo para ver y editar las claves de todos los integrantes del predio. Los demás usuarios solo pueden ver y cambiar su propia clave personal.'
              : 'Por políticas de privacidad, las claves de otros usuarios están protegidas. Puedes ver y editar únicamente tu propia contraseña utilizando el botón "Editar Mi Clave".'}
          </p>
        </div>
      </div>

      {/* Grid de Tarjetas de Usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {usuarios.map((u) => {
          const isUserCurrent = u.id === currentUser.id;
          const isUserActiveSession = u.id === activeUserId;
          const canViewPassword = isAdmin || isUserCurrent;
          const isPasswordVisible = revelarTodasClaves || clavesVisiblesIndividual[u.id];

          return (
            <div
              key={u.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-3.5 transition-all relative ${
                isUserCurrent ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-stone-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-400 capitalize">
                    {u.rol.replace('_', ' ')}
                  </span>
                  <h3 className="font-bold text-sm text-stone-900 mt-0.5">{u.nombre}</h3>
                  <div className="text-[11px] text-stone-500 font-mono">RUT: {u.rut}</div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {isUserCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-white text-[9px] font-bold uppercase">
                      Tú
                    </span>
                  )}
                  {isUserActiveSession && !isUserCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-bold uppercase">
                      Activo
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-stone-600 font-medium bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                {u.cargo}
              </div>

              {/* ZONA DE CONTRASEÑA */}
              <div className="p-2.5 rounded-xl border bg-stone-50 border-stone-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-stone-400" />
                    Clave de Acceso:
                  </span>
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
                      Protegida (Solo Admin)
                    </span>
                  )}
                </div>
              </div>

              {/* Carnet SAG */}
              <div className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                u.carnetSAGVigente 
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                  : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}>
                <div className="flex items-center justify-between font-bold text-[11px]">
                  <span>Carnet Aplicador SAG:</span>
                  <span>{u.carnetSAGVigente ? 'Vigente' : 'No Aplica'}</span>
                </div>
                {u.numeroCarnetSAG && (
                  <div className="font-mono text-[10px]">{u.numeroCarnetSAG}</div>
                )}
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
                  {/* Editar: Admin puede editar a todos; usuario normal solo a sí mismo */}
                  {(isAdmin || isUserCurrent) && (
                    <button
                      onClick={() => setEditingUser({ ...u })}
                      className="p-1.5 text-stone-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title={isUserCurrent ? 'Editar mis datos y clave' : 'Editar usuario y clave'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Editar</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {!isUserActiveSession && (
                    <button
                      onClick={() => onSetActiveUser(u.id)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Seleccionar
                    </button>
                  )}

                  {/* Eliminar: Solo admin puede eliminar usuarios distintos de sí mismo */}
                  {isAdmin && usuarios.length > 1 && !isUserCurrent && (
                    <button
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

      {/* Modal Nuevo Usuario (Admin) */}
      {isNewUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Registrar Nuevo Integrante y Asignar Clave</h3>
              <button onClick={() => setIsNewUserOpen(false)} className="text-emerald-200 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCrearUsuario} className="p-5 space-y-3.5 text-xs max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={userForm.nombre}
                  onChange={(e) => setUserForm({ ...userForm, nombre: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="Ej. Pedro Soto Morales"
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
                    onChange={(e) => setUserForm({ ...userForm, rol: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  >
                    <option value="administrador">Administrador</option>
                    <option value="agronomo">Ingeniero Agrónomo</option>
                    <option value="capataz">Capataz de Campo</option>
                    <option value="aplicador_sag">Aplicador Acreditado SAG</option>
                    <option value="operador_riego">Operador de Riego</option>
                  </select>
                </div>
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
                  Clave Personal de Acceso a la App:
                </label>
                <input
                  type="text"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-sm text-emerald-950"
                  placeholder="Ej. soto2026"
                  required
                />
                <p className="text-[10px] text-emerald-800">
                  Esta clave permitirá al usuario ingresar mediante su RUT o correo.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Cargo Desempeñado:</label>
                <input
                  type="text"
                  value={userForm.cargo}
                  onChange={(e) => setUserForm({ ...userForm, cargo: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                  placeholder="Ej. Operador de Turbo Pulverizador"
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
                    placeholder="SAG-MAULE-88192"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Vencimiento Carnet:</label>
                  <input
                    type="date"
                    value={userForm.fechaVencimientoCarnetSAG || ''}
                    onChange={(e) => setUserForm({ ...userForm, fechaVencimientoCarnetSAG: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
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

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsNewUserOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario & Clave */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                Editar Datos de {editingUser.nombre}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-emerald-200 hover:text-white">✕</button>
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
                    value={editingUser.rol || 'aplicador_sag'}
                    disabled={!isAdmin && editingUser.id !== currentUser.id}
                    onChange={(e) => setEditingUser({ ...editingUser, rol: e.target.value as any })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg disabled:bg-stone-100"
                  >
                    <option value="administrador">Administrador</option>
                    <option value="agronomo">Ingeniero Agrónomo</option>
                    <option value="capataz">Capataz de Campo</option>
                    <option value="aplicador_sag">Aplicador Acreditado SAG</option>
                    <option value="operador_riego">Operador de Riego</option>
                  </select>
                </div>
              </div>

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
                <p className="text-[10px] text-emerald-800">
                  {isAdmin 
                    ? 'Como Administrador puedes restablecer o modificar la clave de este usuario.' 
                    : 'Modifica tu clave de acceso personal.'}
                </p>
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">N° Carnet SAG:</label>
                  <input
                    type="text"
                    value={editingUser.numeroCarnetSAG || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, numeroCarnetSAG: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Vencimiento Carnet:</label>
                  <input
                    type="date"
                    value={editingUser.fechaVencimientoCarnetSAG || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, fechaVencimientoCarnetSAG: e.target.value })}
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Teléfono:</label>
                <input
                  type="text"
                  value={editingUser.telefono || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, telefono: e.target.value })}
                  className="w-full p-2 bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
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
              <button onClick={() => setIsChangeMyPasswordOpen(false)} className="text-emerald-200 hover:text-white">✕</button>
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
                <div className={`p-2.5 rounded-lg text-xs font-bold text-center ${
                  miClaveMsg.tipo === 'ok' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}>
                  {miClaveMsg.texto}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsChangeMyPasswordOpen(false)}
                  className="px-3 py-1.5 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Actualizar Mi Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación Eliminación Usuario */}
      {usuarioToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Eliminar Usuario del Predio</h3>
              <button onClick={() => setUsuarioToDelete(null)} className="text-rose-200 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-stone-700">
                ¿Estás seguro de que deseas eliminar permanentemente la cuenta de <strong>{usuarioToDelete.nombre}</strong>?
              </p>
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-600 text-[11px] space-y-1">
                <div><strong>RUT:</strong> {usuarioToDelete.rut}</div>
                <div><strong>Rol:</strong> {usuarioToDelete.rol} · {usuarioToDelete.cargo}</div>
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
