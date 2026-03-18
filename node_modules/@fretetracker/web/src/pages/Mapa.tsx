// =============================================
// PÁGINA DO MAPA - VISUALIZAÇÃO DE ROTAS
// =============================================

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store';
import { formatarDistancia, formatarDuracao, formatarMoeda } from '@fretetracker/core';
import type { Frete, Coordenadas } from '@fretetracker/types';

// Corrigir ícones do Leaflet
import 'leaflet/dist/leaflet.css';

// Ícones customizados
const createIcon = (color: string) => L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const originIcon = createIcon('#22c55e'); // Verde
const destIcon = createIcon('#ef4444');   // Vermelho
const currentIcon = createIcon('#3b82f6'); // Azul

// Icons SVG
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const NavigationIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

// Componente para ajustar bounds do mapa
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);

  return null;
}

// Componente para localização atual
function CurrentLocation({ onLocation }: { onLocation: (coords: Coordenadas) => void }) {
  const map = useMap();
  const [loading, setLoading] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        onLocation(coords);
        map.setView([coords.lat, coords.lng], 15);
        setLoading(false);
      },
      (err) => {
        console.error('Erro de geolocalização:', err);
        alert('Não foi possível obter sua localização');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <button
      onClick={handleGetLocation}
      disabled={loading}
      className="absolute bottom-24 right-4 z-[1000] btn-primary p-3 rounded-full shadow-lg"
    >
      {loading ? (
        <span className="spinner" />
      ) : (
        <NavigationIcon />
      )}
    </button>
  );
}

// Geocoding (converter cidade/estado em coordenadas)
async function geocode(cidade: string, estado: string): Promise<Coordenadas | null> {
  try {
    const query = encodeURIComponent(`${cidade}, ${estado}, Brasil`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (err) {
    console.error('Erro no geocoding:', err);
  }
  return null;
}

// Calcular rota usando OSRM
async function calcularRota(origem: Coordenadas, destino: Coordenadas) {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`
    );
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distancia_km: route.distance / 1000,
        duracao_min: Math.round(route.duration / 60),
        geometry: route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]),
      };
    }
  } catch (err) {
    console.error('Erro ao calcular rota:', err);
  }
  return null;
}

export default function Mapa() {
  const { freteId } = useParams<{ freteId?: string }>();
  const navigate = useNavigate();
  const { fretes, updateFrete } = useStore();

  const [currentLocation, setCurrentLocation] = useState<Coordenadas | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeData, setRouteData] = useState<{
    origem?: Coordenadas;
    destino?: Coordenadas;
    geometry?: [number, number][];
    distancia_km?: number;
    duracao_min?: number;
  }>({});

  // Frete selecionado
  const frete = freteId ? fretes.find((f) => f.id === freteId) : null;

  // Carregar coordenadas e rota
  useEffect(() => {
    if (!frete) {
      setLoading(false);
      return;
    }

    const loadRoute = async () => {
      setLoading(true);

      // Geocodificar origem e destino
      let origem = frete.origem.coordenadas;
      let destino = frete.destino.coordenadas;

      if (!origem) {
        origem = await geocode(frete.origem.cidade, frete.origem.estado);
      }
      if (!destino) {
        destino = await geocode(frete.destino.cidade, frete.destino.estado);
      }

      if (origem && destino) {
        // Calcular rota
        const rota = await calcularRota(origem, destino);
        
        setRouteData({
          origem,
          destino,
          geometry: rota?.geometry,
          distancia_km: rota?.distancia_km,
          duracao_min: rota?.duracao_min,
        });

        // Atualizar frete com distância e tempo (se ainda não tiver)
        if (!frete.distancia_km && rota) {
          updateFrete(frete.id, {
            distancia_km: rota.distancia_km,
            tempo_estimado_min: rota.duracao_min,
          });
        }
      }

      setLoading(false);
    };

    loadRoute();
  }, [frete?.id]);

  // Centro padrão (Brasil)
  const defaultCenter: [number, number] = [-15.7801, -47.9292];
  
  // Bounds para ajustar visualização
  const bounds = routeData.origem && routeData.destino
    ? L.latLngBounds(
        [routeData.origem.lat, routeData.origem.lng],
        [routeData.destino.lat, routeData.destino.lng]
      )
    : undefined;

  return (
    <div className="fixed inset-0 bg-dark-900 flex flex-col">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700 px-4 py-3 safe-top z-[1001]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="btn-ghost p-2"
          >
            <ArrowLeftIcon />
          </button>
          
          {frete ? (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-dark-400 truncate">
                {frete.origem.cidade}/{frete.origem.estado}
                {' → '}
                {frete.destino.cidade}/{frete.destino.estado}
              </p>
              {routeData.distancia_km && (
                <p className="text-white font-semibold">
                  {formatarDistancia(routeData.distancia_km)}
                  {routeData.duracao_min && (
                    <span className="text-dark-400 font-normal ml-2">
                      ~{formatarDuracao(routeData.duracao_min)}
                    </span>
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="flex-1">
              <p className="text-white font-semibold">Mapa</p>
              <p className="text-sm text-dark-400">Selecione um frete para ver a rota</p>
            </div>
          )}
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-dark-900/80 flex items-center justify-center">
            <div className="text-center">
              <span className="spinner text-primary-500 w-8 h-8" />
              <p className="text-dark-400 mt-2">Carregando rota...</p>
            </div>
          </div>
        )}

        <MapContainer
          center={
            routeData.origem
              ? [routeData.origem.lat, routeData.origem.lng]
              : defaultCenter
          }
          zoom={6}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Ajustar bounds */}
          {bounds && <FitBounds bounds={bounds} />}

          {/* Marcador de Origem */}
          {routeData.origem && (
            <Marker position={[routeData.origem.lat, routeData.origem.lng]} icon={originIcon}>
              <Popup>
                <div className="text-dark-900">
                  <strong>Origem</strong>
                  <br />
                  {frete?.origem.cidade}, {frete?.origem.estado}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Marcador de Destino */}
          {routeData.destino && (
            <Marker position={[routeData.destino.lat, routeData.destino.lng]} icon={destIcon}>
              <Popup>
                <div className="text-dark-900">
                  <strong>Destino</strong>
                  <br />
                  {frete?.destino.cidade}, {frete?.destino.estado}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Linha da Rota */}
          {routeData.geometry && (
            <Polyline
              positions={routeData.geometry}
              pathOptions={{
                color: '#F59E0B',
                weight: 4,
                opacity: 0.8,
              }}
            />
          )}

          {/* Localização Atual */}
          {currentLocation && (
            <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentIcon}>
              <Popup>
                <div className="text-dark-900">
                  <strong>Você está aqui</strong>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Botão de localização */}
          <CurrentLocation onLocation={setCurrentLocation} />
        </MapContainer>
      </div>

      {/* Footer com info do frete */}
      {frete && (
        <div className="bg-dark-800 border-t border-dark-700 p-4 safe-bottom">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Comissão</p>
              <p className="text-primary-500 font-bold text-xl">
                {formatarMoeda(frete.valor_comissao || 0)}
              </p>
            </div>
            <Link
              to={`/fretes/${frete.id}`}
              className="btn-primary"
            >
              Ver Detalhes
            </Link>
          </div>
        </div>
      )}

      {/* Lista de fretes se não tiver um selecionado */}
      {!frete && fretes.length > 0 && (
        <div className="bg-dark-800 border-t border-dark-700 p-4 safe-bottom max-h-48 overflow-auto">
          <p className="text-dark-400 text-sm mb-3">Selecione um frete:</p>
          <div className="space-y-2">
            {fretes.slice(0, 5).map((f) => (
              <Link
                key={f.id}
                to={`/mapa/${f.id}`}
                className="card-hover block py-2 px-3"
              >
                <p className="text-sm text-white">
                  {f.origem.cidade}/{f.origem.estado} → {f.destino.cidade}/{f.destino.estado}
                </p>
                <p className="text-xs text-dark-400">{formatarMoeda(f.valor_comissao || 0)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
