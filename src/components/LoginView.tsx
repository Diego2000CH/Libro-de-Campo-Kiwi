import React, { useState } from 'react';
import { UsuarioPredio } from '../types/campo';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface LoginViewProps {
  usuarios: UsuarioPredio[];
  onLoginSuccess: (usuario: UsuarioPredio) => void;
  fundoNombre: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  usuarios,
  onLoginSuccess,
  fundoNombre,
}) => {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanRut = (str: string) => str.replace(/[^0-9kK]/g, '').toLowerCase();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const inputClean = identificador.trim().toLowerCase();
    const passInput = password.trim();

    if (!inputClean || !passInput) {
      setErrorMsg('Por favor ingresa tu RUT o correo y tu clave personal.');
      return;
    }

    const usuarioEncontrado = usuarios.find((u) => {
      const emailMatch = u.email.toLowerCase() === inputClean;
      const rutDirectMatch = u.rut.toLowerCase() === inputClean;
      const rutCleanMatch = cleanRut(u.rut) === cleanRut(inputClean);
      return emailMatch || rutDirectMatch || rutCleanMatch;
    });

    if (!usuarioEncontrado) {
      setErrorMsg(`No encontramos ningún usuario con ese RUT o Correo en ${fundoNombre}.`);
      return;
    }

    if (usuarioEncontrado.password !== passInput) {
      setErrorMsg('La clave ingresada es incorrecta. Por favor verifica tus credenciales.');
      return;
    }

    onLoginSuccess(usuarioEncontrado);
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-stone-950 to-teal-950 opacity-90 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xl border border-emerald-400/30 text-3xl mb-1 animate-in zoom-in-90 duration-300">
            🥝
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {fundoNombre}
          </h1>
          <p className="text-xs text-emerald-300 font-medium">
            Cuaderno de Campo SAG & Control Integral Kiwi Hayward
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Acceso Protegido por Credenciales
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-100 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-stone-900">Iniciar Sesión</h2>
            <p className="text-xs text-stone-500">
              Ingresa con tu RUT o correo y clave asignada según tu nivel de permisos
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block font-bold text-stone-700 text-[11px] uppercase tracking-wide">
                RUT o Correo Electrónico:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="Ej. 15.892.410-K o correo@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all"
                  required
                />
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-stone-700 text-[11px] uppercase tracking-wide">
                Clave / Código de Acceso:
              </label>
              <div className="relative">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña personal"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all"
                  required
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  title={mostrarPassword ? 'Ocultar clave' : 'Mostrar clave'}
                >
                  {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Ingresar a la Aplicación</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-start gap-2 bg-stone-50/80 p-3 rounded-xl">
            <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              El acceso rápido está deshabilitado por seguridad. Cada integrante debe ingresar con su usuario y clave asignada por el Administrador.
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-stone-400 space-y-1">
          <p>© 2026 {fundoNombre}</p>
          <p className="text-[10px] text-emerald-400/70">Control de Roles: Administrador · Encargado de Campo · Solo Lectura</p>
        </div>
      </div>
    </div>
  );
};
