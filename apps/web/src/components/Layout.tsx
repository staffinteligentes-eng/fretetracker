// =============================================
// LAYOUT PRINCIPAL COM NAVEGAÇÃO
// =============================================

import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../store';

// Icons (usando SVG inline para não precisar de dependência extra)
const HomeIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const MapIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const navItems = [
  { path: '/', label: 'Início', icon: HomeIcon },
  { path: '/fretes', label: 'Fretes', icon: TruckIcon },
  { path: '/novo-frete', label: 'Novo', icon: PlusIcon, highlight: true },
  { path: '/mapa', label: 'Mapa', icon: MapIcon },
  { path: '/perfil', label: 'Perfil', icon: UserIcon },
];

export default function Layout() {
  const usuario = useStore((state) => state.usuario);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700 px-4 py-3 safe-top">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <TruckIcon />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-white">FreteTracker</h1>
              <p className="text-xs text-dark-400">
                {usuario?.nome || 'Motorista'}
              </p>
            </div>
          </div>

          {/* Placa do veículo */}
          {usuario?.placa_veiculo && (
            <div className="placa">
              {usuario.placa_veiculo}
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto pb-20">
        <div className="max-w-7xl mx-auto p-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 safe-bottom">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                    item.highlight
                      ? 'bg-primary-500 text-dark-900 -mt-4 shadow-lg shadow-primary-500/30'
                      : isActive
                      ? 'text-primary-500'
                      : 'text-dark-400 hover:text-dark-200'
                  }`}
                >
                  <Icon />
                  <span className={`text-xs font-medium ${item.highlight ? 'sr-only' : ''}`}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
