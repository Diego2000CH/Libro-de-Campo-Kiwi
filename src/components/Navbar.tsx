import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Compass, 
  Apple, 
  FileCheck2, 
  Snowflake, 
  Sprout, 
  Package, 
  Droplet, 
  Gauge,
  Tractor,
  CloudSun, 
  Bug, 
  Calculator, 
  Sparkles, 
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
  CircleDot
} from 'lucide-react';
import { UsuarioPredio } from '../types/campo';
import { SyncStatusBadge } from './SyncStatusBadge';

export type ActiveTab = 
  | 'dashboard' 
  | 'parcelas' 
  | 'cosecha' 
  | 'ordenes' 
  | 'fitosanitarios'
  | 'materiales'
  | 'inventario' 
  | 'pozo' 
  | 'riego'
  | 'maquinarias'
  | 'fenologia' 
  | 'brotacion'
  | 'botones'
  | 'polinizacion'
  | 'carga_raleo'
  | 'cuaja_semillas'
  | 'labores' 
  | 'clima' 
  | 'monitoreo' 
  | 'calculadora' 
  | 'asistente_ia' 
  | 'informe'
  | 'usuarios';

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
  usuarios?: UsuarioPredio[];
  onSelectUser?: (userId: string) => void;
  onLogout?: () => void;
  syncState: 'idle' | 'loading' | 'saving' | 'synced' | 'error' | 'offline';
  lastSyncTime: string | null;
  onForceSync: () => Promise<void>;
  onOpenResetModal?: () => void;
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
  usuarios = [],
  onSelectUser,
  onLogout,
  syncState,
  lastSyncTime,
  onForceSync,
  onOpenResetModal
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
    { id: 'parcelas', label: 'Cuarteles & Mapa', icon: Compass, highlight: true },
    { id: 'cosecha', label: 'Cosecha & °Brix', icon: Apple, badgeText: 'SAG' },
    { id: 'ordenes', label: 'Órdenes & Recetas', icon: FileCheck2 },
    { id: 'fitosanitarios', label: 'Bodega Fitosanitarios', icon: FlaskConical, badgeCount: lowStockFitoCount },
    { id: 'materiales', label: 'Materiales & Riego', icon: Wrench, badgeCount: lowStockMaterialesCount },
    { id: 'pozo', label: 'Control Pozo DGA', icon: Gauge },
    { id: 'riego', label: 'Control Riego', icon: Droplet },
    { id: 'maquinarias', label: 'Maquinarias', icon: Tractor },
    { id: 'fenologia', label: 'Horas Frío & Reposo', icon: Snowflake },
    { id: 'brotacion', label: '% Brotación', icon: Sprout },
    { id: 'botones', label: 'Botones Florales', icon: Flower2 },
    { id: 'polinizacion', label: 'Polinización & Colmenas', icon: Bug },
    { id: 'carga_raleo', label: 'Carga & Raleo', icon: Scissors },
    { id: 'cuaja_semillas', label: 'Cuaja & Semillas', icon: CircleDot },
    { id: 'labores', label: 'Cuaderno Labores', icon: Sprout },
    { id: 'clima', label: 'Clima', icon: CloudSun },
    { id: 'monitoreo', label: 'Plagas & Psa', icon: Bug },
    { id: 'calculadora', label: 'Calculadora', icon: Calculator },
    { id: 'asistente_ia', label: 'Asesor IA', icon: Sparkles, highlight: true },
    { id: 'informe', label: 'Informe SAG', icon: FileText },
    { id: 'usuarios', label: 'Equipo & Claves', icon: Users }
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="no-print bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs">
      {/* Barra superior de identificación y sincronización */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 text-white px-3 sm:px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
          {/* Logo y título */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-xs shadow-xs">
              🥝
            </div>
            <div>
              <span className="font-extrabold tracking-wide text-sm text-emerald-100">{fundoNombre}</span>
              <span className="hidden sm:inline text-emerald-400/80 ml-2 text-[11px]">
                · Cuaderno Oficial SAG Kiwis Hayward (Maule, Chile)
              </span>
            </div>
          </div>

          {/* Estado de sincronización en vivo y selector de usuario */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SyncStatusBadge
              syncState={syncState}
              lastSyncTime={lastSyncTime}
              onForceSync={onForceSync}
            />

            {/* Selector de Usuario Activo & Perfil */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
                title="Usuario activo y sesión"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span className="max-w-[110px] sm:max-w-[140px] truncate text-[11px] font-bold">
                  {activeUser ? activeUser.nombre.split(' ')[0] : 'Sesión'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-800 text-emerald-200 uppercase font-mono">
                  {activeUser?.rol === 'administrador' ? 'Admin' : 'Operador'}
                </span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white text-stone-900 rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-stone-100 bg-stone-50">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Sesión Conectada</div>
                    <div className="font-bold text-stone-900 mt-0.5">{activeUser?.nombre}</div>
                    <div className="text-[11px] text-stone-500 font-mono mt-0.5">RUT: {activeUser?.rut}</div>
                    <div className="text-[10px] text-emerald-800 font-bold capitalize mt-0.5">Rol: {activeUser?.rol.replace('_', ' ')}</div>
                  </div>

                  <div className="px-3 py-1.5 font-bold text-stone-500 text-[10px] uppercase tracking-wider">
                    Cambiar Perfil Rápido
                  </div>

                  {usuarios.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        onSelectUser?.(u.id);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-emerald-50 transition-colors cursor-pointer ${
                        activeUser?.id === u.id ? 'bg-emerald-50/80 font-bold text-emerald-900' : 'text-stone-700'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="text-xs truncate">{u.nombre}</div>
                        <div className="text-[10px] text-stone-400 capitalize">{u.cargo}</div>
                      </div>
                      {u.rol === 'administrador' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-100 text-purple-900 font-bold uppercase shrink-0">
                          Admin
                        </span>
                      )}
                    </button>
                  ))}

                  <div className="border-t border-stone-100 px-3 py-2 mt-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectTab('usuarios');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left flex items-center gap-1.5 text-stone-700 font-medium text-[11px] hover:text-emerald-800 p-1 rounded hover:bg-stone-50 cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-stone-400" />
                      <span>Gestionar Usuarios & Claves</span>
                    </button>

                    {onOpenResetModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenResetModal();
                        }}
                        className="w-full text-left flex items-center gap-1.5 text-amber-800 font-semibold text-[11px] hover:bg-amber-50 p-1 rounded cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
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
                        className="w-full text-left flex items-center gap-1.5 text-rose-700 font-bold text-[11px] hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
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
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-2">
          {/* Navegación Desktop */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-2 scrollbar-none text-xs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id as ActiveTab)}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : item.highlight
                      ? 'text-emerald-900 hover:bg-emerald-50 font-semibold'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : item.highlight ? 'text-emerald-700' : 'text-stone-500'}`} />
                  <span>{item.label}</span>
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {item.badgeCount}
                    </span>
                  )}
                  {item.badgeText && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
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
              className="p-2 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span>Módulos</span>
            </button>
            <span className="text-xs font-bold text-emerald-950 truncate max-w-[140px]">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>

          {/* Botones de acción rápida: Alertas y Nueva Labor */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Campanita de alerta de bodega */}
            <button
              type="button"
              onClick={onOpenAlertsModal}
              className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
                lowStockCount > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
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

            {/* Botón "+ Nueva Labor" */}
            <button
              type="button"
              onClick={onOpenNewLabor}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Nueva Labor</span>
              <span className="sm:hidden">Labor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Menú desplegable móvil */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white px-3 py-3 shadow-lg max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id as ActiveTab)}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800 text-white font-bold'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-700'}`} />
                  <span className="truncate">{item.label}</span>
                  {item.badgeCount !== undefined && item.badgeCount > 0 && (
                    <span className="ml-auto w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
