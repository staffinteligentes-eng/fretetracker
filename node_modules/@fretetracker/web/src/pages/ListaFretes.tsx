// =============================================
// PÁGINA LISTA DE FRETES
// =============================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { formatarMoeda, formatarData } from '@fretetracker/core';
import type { Frete, StatusFrete } from '@fretetracker/types';

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SyncIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const statusConfig: Record<StatusFrete, { label: string; class: string }> = {
  pendente: { label: 'Pendente', class: 'status-pendente' },
  em_transito: { label: 'Em Trânsito', class: 'status-em_transito' },
  entregue: { label: 'Entregue', class: 'status-entregue' },
  cancelado: { label: 'Cancelado', class: 'status-cancelado' },
};

function FreteItem({ frete }: { frete: Frete }) {
  const status = statusConfig[frete.status];
  const isPending = frete.sync_status === 'pending';

  return (
    <Link
      to={`/fretes/${frete.id}`}
      className="card-hover block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-dark-400">
            <span>{frete.origem.cidade}/{frete.origem.estado}</span>
            <ArrowRightIcon />
            <span className="text-white font-medium">
              {frete.destino.cidade}/{frete.destino.estado}
            </span>
          </div>
          {frete.descricao_carga && (
            <p className="text-xs text-dark-500 mt-1">{frete.descricao_carga}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isPending && (
            <span className="text-amber-400" title="Pendente de sync">
              <SyncIcon />
            </span>
          )}
          <span className={status.class}>{status.label}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-dark-400">
          {frete.distancia_km && (
            <span>{frete.distancia_km.toFixed(0)} km</span>
          )}
          <span>{formatarData(frete.created_at)}</span>
        </div>
        <span className="text-primary-500 font-semibold">
          {formatarMoeda(frete.valor_comissao || 0)}
        </span>
      </div>
    </Link>
  );
}

export default function ListaFretes() {
  const { fretes } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFrete | 'todos'>('todos');
  const [showFilters, setShowFilters] = useState(false);

  // Filtrar fretes
  const fretesFiltrados = useMemo(() => {
    return fretes.filter((frete) => {
      // Filtro de status
      if (statusFilter !== 'todos' && frete.status !== statusFilter) {
        return false;
      }

      // Filtro de busca
      if (search) {
        const searchLower = search.toLowerCase();
        const matchOrigem = 
          frete.origem.cidade.toLowerCase().includes(searchLower) ||
          frete.origem.estado.toLowerCase().includes(searchLower);
        const matchDestino = 
          frete.destino.cidade.toLowerCase().includes(searchLower) ||
          frete.destino.estado.toLowerCase().includes(searchLower);
        const matchCarga = frete.descricao_carga?.toLowerCase().includes(searchLower);

        if (!matchOrigem && !matchDestino && !matchCarga) {
          return false;
        }
      }

      return true;
    });
  }, [fretes, search, statusFilter]);

  // Contagem por status
  const countByStatus = useMemo(() => {
    return fretes.reduce((acc, frete) => {
      acc[frete.status] = (acc[frete.status] || 0) + 1;
      return acc;
    }, {} as Record<StatusFrete, number>);
  }, [fretes]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Meus Fretes</h1>
          <p className="text-sm text-dark-400">
            {fretes.length} frete{fretes.length !== 1 ? 's' : ''} registrado{fretes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/novo-frete" className="btn-primary">
          <PlusIcon />
          Novo
        </Link>
      </div>

      {/* Busca e Filtros */}
      <div className="space-y-3 mb-6">
        {/* Campo de Busca */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-dark-500">
            <SearchIcon />
          </div>
          <input
            type="text"
            className="input pl-10"
            placeholder="Buscar por cidade, estado ou carga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Toggle de Filtros */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-dark-400 hover:text-white transition-colors"
        >
          <FilterIcon />
          Filtros
          {statusFilter !== 'todos' && (
            <span className="px-2 py-0.5 bg-primary-500/20 text-primary-500 rounded text-xs">
              1
            </span>
          )}
        </button>

        {/* Filtros expandidos */}
        {showFilters && (
          <div className="card animate-slide-up">
            <p className="text-sm text-dark-400 mb-3">Filtrar por status:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`badge ${
                  statusFilter === 'todos'
                    ? 'bg-white/10 text-white border-white/20'
                    : 'badge-neutral'
                }`}
              >
                Todos ({fretes.length})
              </button>
              {(Object.entries(statusConfig) as [StatusFrete, { label: string; class: string }][]).map(
                ([status, config]) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`badge ${
                      statusFilter === status ? config.class : 'badge-neutral'
                    }`}
                  >
                    {config.label} ({countByStatus[status] || 0})
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lista de Fretes */}
      {fretesFiltrados.length > 0 ? (
        <div className="space-y-3">
          {fretesFiltrados.map((frete) => (
            <FreteItem key={frete.id} frete={frete} />
          ))}
        </div>
      ) : fretes.length > 0 ? (
        <div className="card text-center py-12">
          <div className="text-dark-600 mb-4">
            <SearchIcon />
          </div>
          <p className="text-dark-400">Nenhum frete encontrado</p>
          <p className="text-dark-500 text-sm mt-1">
            Tente ajustar os filtros ou a busca
          </p>
          <button
            onClick={() => {
              setSearch('');
              setStatusFilter('todos');
            }}
            className="btn-secondary mt-4"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="text-dark-600 mb-4 flex justify-center">
            <TruckIcon />
          </div>
          <p className="text-dark-400">Nenhum frete registrado</p>
          <p className="text-dark-500 text-sm mt-1">
            Comece criando seu primeiro frete
          </p>
          <Link to="/novo-frete" className="btn-primary mt-4 inline-flex">
            <PlusIcon />
            Criar primeiro frete
          </Link>
        </div>
      )}
    </div>
  );
}
