// =============================================
// PÁGINA DETALHE DO FRETE
// =============================================

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { 
  formatarMoeda, 
  formatarData, 
  formatarDistancia,
  formatarDuracao,
  gerarDadosImpressao,
  gerarTextoImpressao,
} from '@fretetracker/core';
import { offlineFretes } from '@fretetracker/offline';
import type { StatusFrete } from '@fretetracker/types';

// Icons
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const MapIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const PrinterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const statusConfig: Record<StatusFrete, { label: string; class: string; next?: StatusFrete; nextLabel?: string; nextIcon?: React.FC }> = {
  pendente: { 
    label: 'Pendente', 
    class: 'status-pendente',
    next: 'em_transito',
    nextLabel: 'Iniciar Viagem',
    nextIcon: PlayIcon,
  },
  em_transito: { 
    label: 'Em Trânsito', 
    class: 'status-em_transito',
    next: 'entregue',
    nextLabel: 'Finalizar Entrega',
    nextIcon: CheckIcon,
  },
  entregue: { 
    label: 'Entregue', 
    class: 'status-entregue',
  },
  cancelado: { 
    label: 'Cancelado', 
    class: 'status-cancelado',
  },
};

export default function DetalheFrete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fretes, usuario, updateFrete } = useStore();

  // Buscar frete
  const frete = fretes.find((f) => f.id === id);

  if (!frete) {
    return (
      <div className="animate-fade-in text-center py-12">
        <p className="text-dark-400">Frete não encontrado</p>
        <Link to="/fretes" className="btn-secondary mt-4 inline-flex">
          <ArrowLeftIcon />
          Voltar para lista
        </Link>
      </div>
    );
  }

  const status = statusConfig[frete.status];

  // Atualizar status
  const handleUpdateStatus = async (newStatus: StatusFrete) => {
    try {
      const updates: Partial<typeof frete> = { status: newStatus };
      
      if (newStatus === 'em_transito') {
        updates.data_saida = new Date().toISOString();
      } else if (newStatus === 'entregue') {
        updates.data_chegada = new Date().toISOString();
      }

      await offlineFretes.update(frete.id, updates);
      updateFrete(frete.id, updates);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  // Imprimir comprovante
  const handlePrint = () => {
    const dados = gerarDadosImpressao(
      frete,
      usuario?.nome || 'Motorista',
      usuario?.placa_veiculo || 'XXX-0000'
    );
    const texto = gerarTextoImpressao(dados);
    
    // TODO: Integrar com impressora Bluetooth
    // Por enquanto, mostrar em um alert ou nova janela
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Comprovante - Frete #${dados.numero_frete}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                padding: 10px;
                max-width: 300px;
                margin: 0 auto;
              }
              pre {
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>
            <pre>${texto}</pre>
            <script>window.print();</script>
          </body>
        </html>
      `);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="btn-ghost p-2"
          >
            <ArrowLeftIcon />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Frete #{frete.id.slice(0, 8)}</h1>
            <span className={status.class}>{status.label}</span>
          </div>
        </div>

        <button onClick={handlePrint} className="btn-secondary">
          <PrinterIcon />
        </button>
      </div>

      {/* Card Principal - Trajeto */}
      <div className="card mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div className="w-0.5 h-8 bg-dark-600" />
            <div className="w-3 h-3 rounded-full bg-red-500" />
          </div>
          <div className="flex-1">
            <div className="mb-4">
              <p className="text-dark-400 text-xs uppercase">Origem</p>
              <p className="text-white font-semibold">
                {frete.origem.cidade}, {frete.origem.estado}
              </p>
            </div>
            <div>
              <p className="text-dark-400 text-xs uppercase">Destino</p>
              <p className="text-white font-semibold">
                {frete.destino.cidade}, {frete.destino.estado}
              </p>
            </div>
          </div>
        </div>

        {/* Info da Rota */}
        {(frete.distancia_km || frete.tempo_estimado_min) && (
          <div className="flex items-center gap-4 pt-4 border-t border-dark-700">
            {frete.distancia_km && (
              <div>
                <p className="text-dark-400 text-xs">Distância</p>
                <p className="text-white font-medium">
                  {formatarDistancia(frete.distancia_km)}
                </p>
              </div>
            )}
            {frete.tempo_estimado_min && (
              <div>
                <p className="text-dark-400 text-xs">Tempo estimado</p>
                <p className="text-white font-medium">
                  {formatarDuracao(frete.tempo_estimado_min)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Botão Ver Mapa */}
        <Link
          to={`/mapa/${frete.id}`}
          className="btn-secondary w-full mt-4"
        >
          <MapIcon />
          Ver no Mapa
        </Link>
      </div>

      {/* Card Valores */}
      <div className="card mb-4">
        <h2 className="font-semibold text-white mb-4">Valores</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-dark-400">Valor do frete</span>
            <span className="text-white">{formatarMoeda(frete.valor_frete)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark-400">Comissão ({frete.percentual_comissao}%)</span>
            <span className="text-white">{formatarMoeda(frete.valor_comissao || 0)}</span>
          </div>
          <div className="pt-3 border-t border-dark-700 flex justify-between">
            <span className="text-dark-300 font-medium">Sua comissão</span>
            <span className="text-primary-500 font-bold text-lg">
              {formatarMoeda(frete.valor_comissao || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Card Carga */}
      {frete.descricao_carga && (
        <div className="card mb-4">
          <h2 className="font-semibold text-white mb-2">Carga</h2>
          <p className="text-dark-300">{frete.descricao_carga}</p>
        </div>
      )}

      {/* Card Datas */}
      <div className="card mb-4">
        <h2 className="font-semibold text-white mb-4">Histórico</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-dark-400">Criado em</span>
            <span className="text-white">{formatarData(frete.created_at, 'hora')}</span>
          </div>
          {frete.data_saida && (
            <div className="flex justify-between">
              <span className="text-dark-400">Saída</span>
              <span className="text-white">{formatarData(frete.data_saida, 'hora')}</span>
            </div>
          )}
          {frete.data_chegada && (
            <div className="flex justify-between">
              <span className="text-dark-400">Chegada</span>
              <span className="text-white">{formatarData(frete.data_chegada, 'hora')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Ações de Status */}
      {status.next && (
        <div className="space-y-3">
          <button
            onClick={() => handleUpdateStatus(status.next!)}
            className="btn-primary w-full py-4"
          >
            {status.nextIcon && <status.nextIcon />}
            {status.nextLabel}
          </button>

          {frete.status !== 'cancelado' && (
            <button
              onClick={() => handleUpdateStatus('cancelado')}
              className="btn-danger w-full"
            >
              <XIcon />
              Cancelar Frete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
