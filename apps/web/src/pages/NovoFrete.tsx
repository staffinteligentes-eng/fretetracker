// =============================================
// PÁGINA NOVO FRETE
// =============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { 
  ESTADOS_BR, 
  calcularComissao, 
  calcularConsumo,
  validarNovoFrete,
  formatarMoeda,
  type ErroValidacao 
} from '@fretetracker/core';
import { offlineFretes } from '@fretetracker/offline';
import type { Frete, StatusFrete, LocalFrete } from '@fretetracker/types';

// Icons
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const MapPinIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const MoneyIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function NovoFrete() {
  const navigate = useNavigate();
  const { usuario, addFrete, setLoading, isOnline } = useStore();

  // Estado do formulário
  const [form, setForm] = useState({
    origem_cidade: '',
    origem_estado: 'SC',
    destino_cidade: '',
    destino_estado: '',
    descricao_carga: '',
    valor_frete: '',
    percentual_comissao: '10',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Calcular comissão em tempo real
  const valorFrete = parseFloat(form.valor_frete) || 0;
  const percentual = parseFloat(form.percentual_comissao) || 0;
  const valorComissao = calcularComissao(valorFrete, percentual);

  // Atualizar campo do formulário
  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validar e enviar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar
    const validationErrors = validarNovoFrete({
      origem_cidade: form.origem_cidade,
      origem_estado: form.origem_estado,
      destino_cidade: form.destino_cidade,
      destino_estado: form.destino_estado,
      valor_frete: valorFrete,
    });

    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach((err) => {
        errorMap[err.campo] = err.mensagem;
      });
      setErrors(errorMap);
      return;
    }

    setSubmitting(true);
    setLoading(true);

    try {
      // Montar objeto do frete
      const novoFrete: Omit<Frete, 'id' | 'local_id' | 'sync_status' | 'created_at' | 'updated_at'> = {
        motorista_id: usuario?.id,
        origem: {
          cidade: form.origem_cidade.trim(),
          estado: form.origem_estado,
        },
        destino: {
          cidade: form.destino_cidade.trim(),
          estado: form.destino_estado,
        },
        descricao_carga: form.descricao_carga.trim() || undefined,
        valor_frete: valorFrete,
        percentual_comissao: percentual,
        valor_comissao: valorComissao,
        status: 'pendente' as StatusFrete,
      };

      // Salvar offline (funciona mesmo sem internet)
      const freteCriado = await offlineFretes.create(novoFrete);

      // Adicionar ao estado global
      addFrete(freteCriado);

      // Navegar para o mapa ou lista
      navigate(`/mapa/${freteCriado.id}`);
    } catch (err) {
      console.error('Erro ao criar frete:', err);
      setErrors({ submit: 'Erro ao criar frete. Tente novamente.' });
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost p-2"
        >
          <ArrowLeftIcon />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Novo Frete</h1>
          <p className="text-sm text-dark-400">Preencha os dados do frete</p>
        </div>
      </div>

      {/* Indicador Offline */}
      {!isOnline && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
          📴 Você está offline. O frete será sincronizado quando a conexão voltar.
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ORIGEM */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-500/15 rounded-lg text-green-400">
              <MapPinIcon />
            </div>
            <h2 className="font-semibold text-white">Origem</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Cidade</label>
              <input
                type="text"
                className={errors.origem_cidade ? 'input-error' : 'input'}
                placeholder="Ex: Chapecó"
                value={form.origem_cidade}
                onChange={(e) => updateField('origem_cidade', e.target.value)}
              />
              {errors.origem_cidade && (
                <p className="text-red-400 text-xs mt-1">{errors.origem_cidade}</p>
              )}
            </div>

            <div>
              <label className="label">Estado</label>
              <select
                className="select"
                value={form.origem_estado}
                onChange={(e) => updateField('origem_estado', e.target.value)}
              >
                {ESTADOS_BR.map((estado) => (
                  <option key={estado.sigla} value={estado.sigla}>
                    {estado.sigla}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DESTINO */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-red-500/15 rounded-lg text-red-400">
              <MapPinIcon />
            </div>
            <h2 className="font-semibold text-white">Destino</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Cidade</label>
              <input
                type="text"
                className={errors.destino_cidade ? 'input-error' : 'input'}
                placeholder="Ex: São Paulo"
                value={form.destino_cidade}
                onChange={(e) => updateField('destino_cidade', e.target.value)}
              />
              {errors.destino_cidade && (
                <p className="text-red-400 text-xs mt-1">{errors.destino_cidade}</p>
              )}
            </div>

            <div>
              <label className="label">Estado</label>
              <select
                className={errors.destino_estado ? 'select border-red-500' : 'select'}
                value={form.destino_estado}
                onChange={(e) => updateField('destino_estado', e.target.value)}
              >
                <option value="">UF</option>
                {ESTADOS_BR.map((estado) => (
                  <option key={estado.sigla} value={estado.sigla}>
                    {estado.sigla}
                  </option>
                ))}
              </select>
              {errors.destino_estado && (
                <p className="text-red-400 text-xs mt-1">{errors.destino_estado}</p>
              )}
            </div>
          </div>
        </div>

        {/* CARGA */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-500/15 rounded-lg text-blue-400">
              <TruckIcon />
            </div>
            <h2 className="font-semibold text-white">Carga</h2>
          </div>

          <div>
            <label className="label">Descrição da carga (opcional)</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Grãos de soja"
              value={form.descricao_carga}
              onChange={(e) => updateField('descricao_carga', e.target.value)}
            />
          </div>
        </div>

        {/* VALORES */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-primary-500/15 rounded-lg text-primary-500">
              <MoneyIcon />
            </div>
            <h2 className="font-semibold text-white">Valores</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Valor do Frete (R$)</label>
              <input
                type="number"
                className={errors.valor_frete ? 'input-error' : 'input'}
                placeholder="0,00"
                value={form.valor_frete}
                onChange={(e) => updateField('valor_frete', e.target.value)}
                min="0"
                step="0.01"
              />
              {errors.valor_frete && (
                <p className="text-red-400 text-xs mt-1">{errors.valor_frete}</p>
              )}
            </div>

            <div>
              <label className="label">Percentual de Comissão (%)</label>
              <input
                type="number"
                className="input"
                placeholder="10"
                value={form.percentual_comissao}
                onChange={(e) => updateField('percentual_comissao', e.target.value)}
                min="0"
                max="100"
                step="0.5"
              />
            </div>

            {/* Resumo da Comissão */}
            {valorFrete > 0 && (
              <div className="p-4 bg-dark-900 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">Sua comissão:</span>
                  <span className="text-2xl font-bold text-primary-500">
                    {formatarMoeda(valorComissao)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Erro geral */}
        {errors.submit && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-4 text-lg"
        >
          {submitting ? (
            <span className="spinner" />
          ) : (
            <>
              <CheckIcon />
              Criar Frete e Ver Rota
            </>
          )}
        </button>
      </form>
    </div>
  );
}
