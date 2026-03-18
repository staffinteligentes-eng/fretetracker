// =============================================
// FRETETRACKER - APP PRINCIPAL
// =============================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useStore } from './store';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NovoFrete from './pages/NovoFrete';
import ListaFretes from './pages/ListaFretes';
import DetalheFrete from './pages/DetalheFrete';
import Mapa from './pages/Mapa';
import Perfil from './pages/Perfil';

// Components
import Layout from './components/Layout';
import SyncIndicator from './components/SyncIndicator';

// Auth Guard
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { setOnline, isOnline } = useStore();

  // Monitorar status de conexão
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Status inicial
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  return (
    <BrowserRouter>
      {/* Indicador de Sync Global */}
      <SyncIndicator />

      <Routes>
        {/* Rota pública */}
        <Route path="/login" element={<Login />} />

        {/* Rotas protegidas com Layout */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="novo-frete" element={<NovoFrete />} />
          <Route path="fretes" element={<ListaFretes />} />
          <Route path="fretes/:id" element={<DetalheFrete />} />
          <Route path="mapa" element={<Mapa />} />
          <Route path="mapa/:freteId" element={<Mapa />} />
          <Route path="perfil" element={<Perfil />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
