import React, { useState } from 'react';
import { signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { UsuarioPredio } from '../types/campo';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Loader2,
} from 'lucide-react';

interface LoginViewProps {
  usuarios: UsuarioPredio[];
  onLoginSuccess: (usuario: UsuarioPredio) => void;
  onGoogleLoginSuccess?: (firebaseUser: FirebaseUser) => Promise<void> | void;
  fundoNombre: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  usuarios,
  onLoginSuccess,
  onGoogleLoginSuccess,
  fundoNombre,
}) => {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const cleanRut = (str: string) => str.replace(/[^0-9kK]/g, '').toLowerCase();

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      if (onGoogleLoginSuccess) {
        await onGoogleLoginSuccess(result.user);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Se cerró la ventana de Google Sign-In antes de completar el acceso.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('El navegador bloqueó la ventana emergente. Permite popups para iniciar sesión con Google.');
      } else {
        const msg = err instanceof Error ? err.message : 'Error inesperado';
        setErrorMsg(`No se pudo iniciar sesión con Google: ${msg}`);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

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

  const handleQuickLogin = (usuario: UsuarioPredio) => {
    setIdentificador(usuario.email);
    setPassword(usuario.password);
    onLoginSuccess(usuario);
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
            Firebase Auth · Cloud SQL · Firestore
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-stone-100 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-stone-900">Iniciar Sesión</h2>
            <p className="text-xs text-stone-500">
              Conecta tu cuenta Google para sincronización en tiempo real en la nube
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Botón Principal: Google Sign-In via Firebase Auth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-3 px-4 bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-emerald-600 text-stone-800 font-bold rounded-xl text-sm transition-all shadow-xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
            )}
            <span>{googleLoading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-stone-200" />
            <span className="shrink mx-3 text-[10px] font-bold uppercase text-stone-400 tracking-wider">
              o acceso local con RUT / Clave
            </span>
            <div className="flex-grow border-t border-stone-200" />
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="block font-bold text-stone-700 text-[11px] uppercase tracking-wide">
                RUT o Correo Electrónico:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identificador}
                  onChange={(e) => setIdentificador(e.target.value)}
                  placeholder="Ej. 15.892.410-K o correo@huerto.cl"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all"
                  required
                />
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-stone-700 text-[11px] uppercase tracking-wide">
                Clave Personal:
              </label>
              <div className="relative">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña personal"
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
              <span>Ingresar con Clave Local</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-3 border-t border-stone-100 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                Perfiles Prediales:
              </span>
              <span className="text-[10px] text-stone-400">1 clic para entrar</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {usuarios.map((u) => {
                const isAdmin = u.rol === 'administrador';
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickLogin(u)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer group ${
                      isAdmin
                        ? 'bg-emerald-50/70 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-500 text-emerald-950'
                        : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800'
                    }`}
                  >
                    <div className="font-bold truncate text-[11px] group-hover:text-emerald-900">
                      {u.nombre.split(' ')[0]} {u.nombre.split(' ')[1] || ''}
                    </div>
                    <div className="text-[10px] text-stone-500 capitalize flex items-center justify-between mt-0.5">
                      <span>{u.rol.replace('_', ' ')}</span>
                      <span className="font-mono text-[9px] bg-white px-1.5 py-0.2 rounded border border-stone-200">
                        {u.password}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-stone-400 space-y-1">
          <p>© 2026 {fundoNombre}</p>
          <p className="text-[10px] text-emerald-400/70">Sincronización Segura · Firebase & Cloud SQL</p>
        </div>
      </div>
    </div>
  );
};
