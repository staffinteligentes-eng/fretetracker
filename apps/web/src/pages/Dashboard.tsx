// =============================================
// DASHBOARD PRINCIPAL
// =============================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { formatarMoeda, calcularEstatisticasFretes } from '@fretetracker/core';
import type { Frete } from '@fretetracker/types';

// Icons
const TruckIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const MoneyIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.FC; 
  label: string; 
  value: string | number; 
  color: string;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-dark-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon />
        </div>
      </div>
    </div>
  );
}

function FreteCard({ frete }: { frete: Frete }) {
  const statusColors = {
    pendente: 'status-pendente',
    em_transito: 'status-em_transito',
    entregue: 'status-entregue',
    cancelado: 'status-cancelado',
  };

  const statusLabels = {
    pendente: 'Pendente',
    em_transito: 'Em Trânsito',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
  };

  return (
    <Link to={`/fretes/${frete.id}`} className="card-hover block">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-dark-400">
            {frete.origem.cidade}/{frete.origem.estado}
          </p>
          <div className="flex items-center gap-2 text-white">
            <ArrowRightIcon />
            <span className="font-medium">
              {frete.destino.cidade}/{frete.destino.estado}
            </span>
          </div>
        </div>
        <span className={statusColors[frete.status]}>
          {statusLabels[frete.status]}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-dark-400">
          {frete.distancia_km ? `${frete.distancia_km.toFixed(0)} km` : '--'}
        </span>
        <span className="text-primary-500 font-semibold">
          {formatarMoeda(frete.valor_comissao || 0)}
        </span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { usuario, fretes, setFretes } = useStore();
  const [loading, setLoading] = useState(true);

  // Calcular estatísticas
  const stats = calcularEstatisticasFretes(fretes);

  // Fretes recentes (últimos 5)
  const fretesRecentes = fretes.slice(0, 5);

  // Carregar dados
  useEffect(() => {
    // TODO: Carregar do Supabase ou offline
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Olá, {usuario?.nome?.split(' ')[0] || 'Motorista'}! 👋
        </h1>
        <p className="text-dark-400 mt-1">
          Aqui está o resumo dos seus fretes
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={TruckIcon}
          label="Total de Fretes"
          value={stats.total}
          color="bg-blue-500/15 text-blue-400"
        />
        <StatCard
          icon={ClockIcon}
          label="Em Trânsito"
          value={stats.emTransito}
          color="bg-amber-500/15 text-amber-400"
        />
        <StatCard
          icon={CheckIcon}
          label="Entregues"
          value={stats.entregues}
          color="bg-green-500/15 text-green-400"
        />
        <StatCard
          icon={MoneyIcon}
          label="Comissão Total"
          value={formatarMoeda(stats.comissaoTotal)}
          color="bg-primary-500/15 text-primary-500"
        />
      </div>

      {/* Ação Rápida */}
      <Link to="/novo-frete" className="card-hover flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <PlusIcon />
          </div>
          <div>
            <p className="font-semibold text-white">Novo Frete</p>
            <p className="text-sm text-dark-400">Registrar um novo frete</p>
          </div>
        </div>
        <ArrowRightIcon />
      </Link>

      {/* Fretes Recentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Fretes Recentes</h2>
          <Link to="/fretes" className="text-primary-500 text-sm hover:text-primary-400">
            Ver todos
          </Link>
        </div>

        {loading ? (
          <div className="card flex items-center justify-center py-8">
            <span className="spinner text-primary-500" />
          </div>
        ) : fretesRecentes.length > 0 ? (
          <div className="space-y-3">
            {fretesRecentes.map((frete) => (
              <FreteCard key={frete.id} frete={frete} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <TruckIcon />
            <p className="text-dark-400 mt-2">Nenhum frete registrado</p>
            <Link to="/novo-frete" className="btn-primary mt-4 inline-flex">
              <PlusIcon />
              Criar primeiro frete
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
