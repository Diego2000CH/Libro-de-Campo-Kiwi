import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Compass, 
  Apple, 
  FileCheck2, 
  Snowflake, 
  Sprout, 
  Droplet, 
  Gauge,
  Tractor,
  CloudSun, 
  Bug, 
  Calculator, 
  FileText, 
  Users, 
  Plus, 
  Bell, 
  Menu, 
  X,
  ChevronDown,
  UserCheck,
  LogOut,
  Key,
  FlaskConical,
  Wrench,
  RotateCcw,
  Flower2,
  Scissors,
  CircleDot,
  KeyRound,
  Lock,
  ShieldCheck,
  CalendarClock,
  ThermometerSnowflake,
  Sun,
  Moon,
  Pencil,
  RefreshCw
} from 'lucide-react';
import { ModuloPestanaId, UsuarioPredio } from '../types/campo';
import { SyncStatusBadge } from './SyncStatusBadge';
import { PWAInstallButton } from './PWAInstallButton';
import {
  canEditTab,
  getNivelAcceso,
  getNivelAccesoMeta,
  getPestanasEditables,
  getRolLabel,
  getTabLabel,
} from '../utils/permissions';
import { AppTheme } from '../hooks/useTheme';

export type ActiveTab = ModuloPestanaId;

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewLabor: () => void;
  fundoNombre: string;
  lowStockCount: number;
  lowStockFitoCount?: number;
  lowStockMaterialesCount?: number;
  onOpenAlertsModal: () => void;
  activeUser?: UsuarioPredio;
  canEdit: boolean;
  isAdmin: boolean;
  onRequestSwitchUser: () => void;
  onLogout?: () => void;
  syncState: 'idle' | 'loading' | 'saving' | 'synced' | 'error' | 'offline';
  lastSyncTime: string | null;
  onForceSync: () => Promise<void>;
  onOpenResetModal?: () => void;
  alertasProactivasCount?: number;
  alertaHeladaActiva?: boolean;
  theme?: AppTheme;
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewLabor,
  fundoNombre,
  lowStockCount,
  lowStockFitoCount = 0,
  lowStockMaterialesCount = 0,
  onOpenAlertsModal,
  activeUser,
  canEdit,
  isAdmin,
  onRequestSwitchUser,
  onLogout,
  syncState,
  lastSyncTime,
  onForceSync,
  onOpenResetModal,
  alertasProactivasCount = 0,
  alertaHeladaActiva = false,
  theme = 'light',
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const nivelAcceso = getNivelAcceso(activeUser);
  const nivelMeta = getNivelAccesoMeta(nivelAcceso, activeUser);
  const editableTabs = getPestanasEditables(activeUser);
  const canEditCurrentTab = activeUser ? canEditTab(activeUser, activeTab) : canEdit;
  const canEditLabores = activeUser ? canEditTab(activeUser, 'labores') : canEdit;

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
    badgeText?: string;
    badgeCount?: number;
  }[] = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'parcelas', label: 'Cuarteles & Mapa', icon: Compass, highlight: true },
    { id: 'cosecha', label: 'Cosecha & °Brix', icon: Apple, badgeText: 'SAG' },
    { id: 'ordenes', label: 'Órdenes & Recetas', icon: FileCheck2 },
    { id: 'fitosanitarios', label: 'Bodega Fitosanitarios', icon: FlaskConical, badgeCount: lowStockFitoCount },
    { id: 'materiales', label: 'Materiales & Riego', icon: Wrench, badgeCount: lowStockMaterialesCount },
    { id: 'pozo', label: 'Control Pozo DGA', icon: Gauge },
    { id: 'riego', label: 'Control Riego', icon: Droplet },
    { id: 'maquinarias', label: 'Maquinarias', icon: Tractor },
    { id: 'fenologia', label: 'Frío, GDD & Fenología', icon: Snowflake },
    { id: 'brotacion', label: '% Brotación', icon: Sprout },
    { id: 'botones', label: 'Botones Florales', icon: Flower2 },
    { id: 'polinizacion', label: 'Polinización & Colmenas', icon: Bug },
    { id: 'carga_raleo', label: 'Carga & Raleo', icon: Scissors },
    { id: 'cuaja_semillas', label: 'Cuaja & Semillas', icon: CircleDot },
    { id: 'labores', label: 'Cuaderno Labores', icon: Sprout },
    { id: 'clima', label: 'Clima', icon: CloudSun },
    { id: 'heladas', label: 'Control Heladas', icon: ThermometerSnowflake, badgeText: alertaHeladaActiva ? 'ALERTA' : undefined },
    { id: 'monitoreo', label: 'Plagas & Psa', icon: Bug },
    { id: 'calculadora', label: 'Calculadora', icon: Calculator },
    { id: 'laboratorio', label: 'Laboratorio', icon: FlaskConical },
    { id: 'auditoria', label: 'Auditoría & BPA', icon: ShieldCheck },
    { id: 'planificacion', label: 'Temporadas & Tareas', icon: CalendarClock, badgeCount: alertasProactivasCount },
    { id: 'informe', label: 'Informes & PDF', icon: FileText },
    { id: 'usuarios', label: isAdmin ? 'Equipo & Claves' : 'Mi Cuenta', icon: Users }
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="no-print bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-40 shadow-xs transition-colors">
      {/* Barra superior de identificación, tema y sincronización (adaptada a Dynamic Island / Notch) */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 text-white px-safe pt-safe-bar pb-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 text-xs">
          {/* Logo y título */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-xs shadow-xs shrink-0">
              🥝
            </div>
            <div className="min-w-0">
              <span className="font-extrabold tracking-wide text-xs sm:text-sm text-emerald-100 truncate block sm:inline">
                {fundoNombre}
              </span>
              <span className="hidden md:inline text-emerald-400/80 ml-2 text-[11px]">
                · Cuaderno Oficial SAG Kiwis Hayward
              </span>
            </div>
          </div>

          {/* Estado de sincronización en vivo, PWA Install, Tema Claro/Oscuro y sesión de usuario */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title={theme === 'dark' ? 'Cambiar a versión clara' : 'Cambiar a versión oscura'}
                aria-label={theme === 'dark' ? 'Cambiar a versión clara' : 'Cambiar a versión oscura'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                )}
                <span className="hidden md:inline">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
              </button>
            )}

            <PWAInstallButton variant="header" />
            <SyncStatusBadge
              syncState={syncState}
              lastSyncTime={lastSyncTime}
              onForceSync={onForceSync}
            />

            {/* Selector de Usuario Activo & Perfil (SIN cambio rápido sin clave) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
                title="Usuario activo y nivel de acceso"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span className="max-w-[90px] sm:max-w-[140px] truncate text-[11px] font-bold">
                  {activeUser ? activeUser.nombre.split(' ')[0] : 'Sesión'}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-mono font-bold ${
                    nivelAcceso === 'admin'
                      ? 'bg-purple-700 text-purple-100'
                      : nivelAcceso === 'editor_campo'
                      ? 'bg-emerald-700 text-emerald-100'
                      : nivelAcceso === 'editor_selectivo'
                      ? 'bg-sky-700 text-sky-100'
                      : 'bg-amber-700 text-amber-100'
                  }`}
                >
                  {nivelMeta.shortLabel}
                </span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-76 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-2.5 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/70 space-y-1">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Sesión Autenticada</div>
                    <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">{activeUser?.nombre}</div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">RUT: {activeUser?.rut}</div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-stone-700 dark:text-stone-300 font-semibold">
                        {getRolLabel(activeUser?.rol || '')}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${nivelMeta.badgeClass}`}>
                        {nivelMeta.shortLabel}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-snug pt-0.5">
                      {nivelMeta.description}
                    </p>
                  </div>

                  <div className="px-2.5 py-2 space-y-1">
                    {onToggleTheme && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleTheme();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left flex items-center justify-between gap-2 text-stone-800 dark:text-stone-200 font-semibold text-[11px] hover:bg-stone-100 dark:hover:bg-stone-800 p-2 rounded-lg cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {theme === 'dark' ? (
                            <Sun className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <Moon className="w-3.5 h-3.5 text-stone-600" />
                          )}
                          <span>{theme === 'dark' ? 'Cambiar a Versión Clara' : 'Cambiar a Versión Oscura'}</span>
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          {theme === 'dark' ? 'Oscuro' : 'Claro'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onRequestSwitchUser();
                      }}
                      className="w-full text-left flex items-center gap-2 text-stone-800 dark:text-stone-200 font-semibold text-[11px] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-900 dark:hover:text-emerald-200 p-2 rounded-lg cursor-pointer transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span>Cambiar de Usuario (Requiere Clave)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleSelectTab('usuarios');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-2 text-stone-700 dark:text-stone-300 font-medium text-[11px] hover:text-emerald-800 dark:hover:text-emerald-300 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/80 cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-stone-400" />
                      <span>{isAdmin ? 'Equipo, Permisos & Códigos' : 'Mi Cuenta y Cambiar Mi Clave'}</span>
                    </button>

                    <PWAInstallButton variant="menu" onAction={() => setUserDropdownOpen(false)} />

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        window.dispatchEvent(new CustomEvent('pwa-check-update'));
                      }}
                      className="w-full text-left flex items-center gap-2 text-stone-700 dark:text-stone-300 font-medium text-[11px] hover:text-emerald-800 dark:hover:text-emerald-300 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/80 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span>Buscar actualización de la app</span>
                    </button>

                    {isAdmin && onOpenResetModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenResetModal();
                        }}
                        className="w-full text-left flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-[11px] hover:bg-amber-50 dark:hover:bg-amber-950/50 p-2 rounded-lg cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        <span>Huerto en Blanco / Reiniciar</span>
                      </button>
                    )}

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-[11px] hover:bg-rose-50 dark:hover:bg-rose-950/50 p-2 rounded-lg cursor-pointer transition-colors border-t border-stone-100 dark:border-stone-800 mt-1 pt-2"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        <span>Cerrar Sesión</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barra principal de navegación */}
      <div className="max-w-7xl mx-auto px-safe">
        <div className="flex items-center justify-between h-14 gap-2">
          {/* Navegación Desktop */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-2 scrollbar-none text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isSelectiveEditable =
                nivelAcceso === 'editor_selectivo' &&
                activeUser &&
                canEditTab(activeUser, item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={
                    nivelAcceso === 'editor_selectivo'
                      ? isSelectiveEditable
                        ? `${item.label} — Edición habilitada`
                        : `${item.label} — Solo Lectura`
                      : item.label
                  }
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : item.highlight
                      ? 'text-emerald-900 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-semibold'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-400'}`} />
                  <span>{item.label}</span>
                  {isSelectiveEditable && (
                    <Pencil
                      className={`w-2.5 h-2.5 ${isActive ? 'text-emerald-200' : 'text-sky-600 dark:text-sky-400'}`}
                    />
                  )}
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {item.badgeCount}
                    </span>
                  )}
                  {item.badgeText && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/70">
                      {item.badgeText}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Menú compacto para tablets y móviles */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span>Módulos</span>
            </button>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate max-w-[140px]">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>

          {/* Botones de acción rápida: Alertas y Nueva Labor / Estado Lectura */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Campanita de alerta de bodega */}
            <button
              type="button"
              onClick={onOpenAlertsModal}
              className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
                lowStockCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/80 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                  : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
              }`}
              title={lowStockCount > 0 ? `${lowStockCount} insumos bajo stock mínimo` : 'Sin alertas críticas'}
            >
              <Bell className="w-4 h-4" />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {lowStockCount}
                </span>
              )}
            </button>

            {canEditLabores && (
              <button
                type="button"
                onClick={onOpenNewLabor}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline">Nueva Labor</span>
                <span className="sm:hidden">Labor</span>
              </button>
            )}

            {!canEditCurrentTab ? (
              <span
                className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/70 text-amber-900 dark:text-amber-200 font-bold text-[11px] rounded-xl flex items-center gap-1 whitespace-nowrap"
                title="Modo Solo Lectura en esta pestaña: puedes explorar e interactuar sin editar registros"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span className="hidden sm:inline">Solo Lectura</span>
              </span>
            ) : (
              nivelAcceso === 'editor_selectivo' && (
                <span
                  className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-700/70 text-sky-900 dark:text-sky-200 font-bold text-[11px] rounded-xl flex items-center gap-1 whitespace-nowrap"
                  title="Tienes permiso de edición habilitado en esta pestaña"
                >
                  <Pencil className="w-3 h-3 text-sky-700 dark:text-sky-400" />
                  <span className="hidden sm:inline">Edición aquí</span>
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Aviso contextual cuando la pestaña actual está en Solo Lectura */}
      {!canEditCurrentTab && (
        <div className="bg-amber-50 dark:bg-amber-950/35 border-t border-amber-200/80 dark:border-amber-800/60 px-3 sm:px-6 py-1.5 text-[11px] text-amber-950 dark:text-amber-200 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
          <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
          {nivelAcceso === 'editor_selectivo' && editableTabs.length > 0 ? (
            <>
              <span>
                <strong>Modo Solo Lectura en esta pestaña.</strong> Tienes edición habilitada en:
              </span>
              <span className="inline-flex flex-wrap items-center justify-center gap-1">
                {editableTabs.map((tId) => (
                  <button
                    key={tId}
                    type="button"
                    onClick={() => handleSelectTab(tId)}
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-stone-900 border border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200 font-bold hover:bg-sky-50 dark:hover:bg-sky-950/60 cursor-pointer transition-colors"
                  >
                    {getTabLabel(tId)} →
                  </button>
                ))}
              </span>
            </>
          ) : (
            <span>
              <strong>Modo Solo Lectura activo:</strong> Puedes navegar, consultar mapas, usar calculadoras y simuladores, pero no puedes agregar, editar ni eliminar información.
            </span>
          )}
        </div>
      )}

      {/* Menú desplegable móvil */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-safe py-3 pb-safe shadow-lg max-h-[75dvh] overflow-y-auto space-y-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isSelectiveEditable =
                nivelAcceso === 'editor_selectivo' &&
                activeUser &&
                canEditTab(activeUser, item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800 text-white font-bold'
                      : 'bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-700 dark:text-emerald-400'}`} />
                  <span className="truncate">{item.label}</span>
                  {isSelectiveEditable && (
                    <Pencil className={`w-3 h-3 shrink-0 ml-auto ${isActive ? 'text-emerald-200' : 'text-sky-600 dark:text-sky-400'}`} />
                  )}
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="ml-auto w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <PWAInstallButton variant="menu" onAction={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
};
