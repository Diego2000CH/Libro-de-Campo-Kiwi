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
  Sun,
  Moon,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { AppTheme } from '../hooks/useTheme';

interface LoginViewProps {
  usuarios: UsuarioPredio[];
  onLoginSuccess: (usuario: UsuarioPredio) => void;
  fundoNombre: string;
  theme?: AppTheme;
  onToggleTheme?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  usuarios,
  onLoginSuccess,
  fundoNombre,
  theme = 'light',
  onToggleTheme,
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
    <div className="min-h-[100dvh] bg-stone-100 dark:bg-stone-950 flex flex-col justify-center items-center px-safe pt-safe-screen pb-safe-main relative overflow-hidden select-none transition-colors">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-stone-100 to-teal-50 dark:from-emerald-950 dark:via-stone-950 dark:to-teal-950 opacity-95 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/15 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/15 dark:bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      {onToggleTheme && (
        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-20">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-stone-900/90 hover:bg-white dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-stone-700" />
                <span>Modo Oscuro</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xl border border-emerald-400/30 text-3xl mb-1 animate-in zoom-in-90 duration-300">
            🥝
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-tight">
            {fundoNombre}
          </h1>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            Cuaderno de Campo SAG &amp; Control Integral Kiwi Hayward
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            Acceso Protegido por Credenciales
          </div>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="border-b border-stone-100 dark:border-stone-800 pb-3">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Iniciar Sesión</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Ingresa con tu RUT o correo y clave asignada según tu nivel de permisos
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 rounded-xl text-rose-900 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="block font-bold text-stone-700 dark:text-stone-300 text-[11px] uppercase tracking-wide">
                RUT o Correo Electrónico:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="Ej. 15.892.410-K o correo@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white dark:focus:bg-stone-900 transition-all"
                  required
                />
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-stone-700 dark:text-stone-300 text-[11px] uppercase tracking-wide">
                Clave / Código de Acceso:
              </label>
              <div className="relative">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña personal"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white dark:focus:bg-stone-900 transition-all"
                  required
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
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

          <div className="pt-3 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400 flex items-start gap-2 bg-stone-50/80 dark:bg-stone-800/60 p-3 rounded-xl">
            <Lock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              El acceso rápido está deshabilitado por seguridad. Cada integrante debe ingresar con su usuario y clave asignada por el Administrador.
            </p>
          </div>
        </div>

        <PWAInstallButton variant="card" />

        <div className="text-center text-xs text-stone-500 dark:text-stone-400 space-y-1 pb-2">
          <p>© 2026 {fundoNombre}</p>
          <p className="text-[10px] text-emerald-800/80 dark:text-emerald-400/70">
            Control de Roles: Administrador · Editor Total / Por Pestaña · Solo Lectura
          </p>
        </div>
      </div>
    </div>
  );
};
