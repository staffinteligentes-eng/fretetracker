// =============================================
// PÁGINA DE PERFIL DO USUÁRIO
// =============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ESTADOS_BR, formatarMoeda, calcularEstatisticasFretes } from '@fretetracker/core';
import { clearAllOfflineData } from '@fretetracker/offline';
import type { TipoVeiculo } from '@fretetracker/types';

// Icons
const UserIcon = () => (
  <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const TruckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SyncIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const tiposVeiculo: { value: TipoVeiculo; label: string }[] = [
  { value: 'caminhao', label: 'Caminhão' },
  { value: 'carreta', label: 'Carreta' },
  { value: 'bitrem', label: 'Bitrem' },
  { value: 'van', label: 'Van' },
  { value: 'utilitario', label: 'Utilitário' },
];

export default function Perfil() {
  const navigate = useNavigate();
  const { usuario, fretes, logout, setUsuario, pendingSync } = useStore();

  // Estado do formulário
  const [form, setForm] = useState({
    nome: usuario?.nome || '',
    telefone: usuario?.telefone || '',
    cpf: usuario?.cpf || '',
    placa_veiculo: usuario?.placa_veiculo || '',
    tipo_veiculo: usuario?.tipo_veiculo || 'caminhao',
    consumo_medio: usuario?.consumo_medio?.toString() || '3.5',
  });

  const [saving, setSaving] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Estatísticas
  const stats = calcularEstatisticasFretes(fretes);

  // Atualizar campo
  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Formatar placa enquanto digita
  const formatPlaca = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
  };

  // Salvar perfil
  const handleSave = async () => {
    setSaving(true);

    try {
      // Atualizar usuário no estado
      if (usuario) {
        const updated = {
          ...usuario,
          nome: form.nome.trim(),
          telefone: form.telefone.trim(),
          cpf: form.cpf.trim(),
          placa_veiculo: form.placa_veiculo.trim(),
          tipo_veiculo: form.tipo_veiculo as TipoVeiculo,
          consumo_medio: parseFloat(form.consumo_medio) || 3.5,
          updated_at: new Date().toISOString(),
        };

        setUsuario(updated);

        // TODO: Sincronizar com Supabase
      }
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
    } finally {
      setSaving(false);
    }
  };

  // Fazer logout
  const handleLogout = async () => {
    await clearAllOfflineData();
    logout();
    navigate('/login');
  };

  // Limpar dados offline
  const handleClearData = async () => {
    await clearAllOfflineData();
    setShowConfirmClear(false);
    // Recarregar página
    window.location.reload();
  };

  return (
    <div className="animate-fade-in pb-8">
      {/* Header com Avatar */}
      <div className="text-center mb-6">
        <div className="w-24 h-24 mx-auto bg-dark-700 rounded-full flex items-center justify-center text-dark-400 mb-4">
          <UserIcon />
        </div>
        <h1 className="text-xl font-bold text-white">{usuario?.nome || 'Motorista'}</h1>
        <p className="text-dark-400 text-sm">{usuario?.perfil || 'motorista'}</p>
        {usuario?.placa_veiculo && (
          <div className="mt-2">
            <span className="placa text-lg">{usuario.placa_veiculo}</span>
          </div>
        )}
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-dark-400">Fretes</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-400">{stats.entregues}</p>
          <p className="text-xs text-dark-400">Entregues</p>
        </div>
        <div className="card text-center">
          <p className="text-lg font-bold text-primary-500">{formatarMoeda(stats.comissaoTotal)}</p>
          <p className="text-xs text-dark-400">Ganhos</p>
        </div>
      </div>

      {/* Formulário de Perfil */}
      <div className="card mb-4">
        <h2 className="font-semibold text-white mb-4">Dados Pessoais</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Nome completo</label>
            <input
              type="text"
              className="input"
              value={form.nome}
              onChange={(e) => updateField('nome', e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="label">Telefone</label>
            <input
              type="tel"
              className="input"
              value={form.telefone}
              onChange={(e) => updateField('telefone', e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className="label">CPF</label>
            <input
              type="text"
              className="input"
              value={form.cpf}
              onChange={(e) => updateField('cpf', e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
        </div>
      </div>

      {/* Dados do Veículo */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary-500/15 rounded-lg text-primary-500">
            <TruckIcon />
          </div>
          <h2 className="font-semibold text-white">Veículo</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Placa</label>
            <input
              type="text"
              className="input font-mono uppercase"
              value={form.placa_veiculo}
              onChange={(e) => updateField('placa_veiculo', formatPlaca(e.target.value))}
              placeholder="ABC-1234"
              maxLength={8}
            />
          </div>

          <div>
            <label className="label">Tipo de Veículo</label>
            <select
              className="select"
              value={form.tipo_veiculo}
              onChange={(e) => updateField('tipo_veiculo', e.target.value)}
            >
              {tiposVeiculo.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Consumo médio (km/L)</label>
            <input
              type="number"
              className="input"
              value={form.consumo_medio}
              onChange={(e) => updateField('consumo_medio', e.target.value)}
              placeholder="3.5"
              min="0.5"
              max="20"
              step="0.1"
            />
            <p className="text-xs text-dark-500 mt-1">
              Usado para estimar consumo de combustível
            </p>
          </div>
        </div>
      </div>

      {/* Botão Salvar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full mb-6"
      >
        {saving ? (
          <span className="spinner" />
        ) : (
          <>
            <SaveIcon />
            Salvar Alterações
          </>
        )}
      </button>

      {/* Seção de Dados e Sincronização */}
      <div className="card mb-4">
        <h2 className="font-semibold text-white mb-4">Dados e Sincronização</h2>

        <div className="space-y-3">
          {/* Status de Sync */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <SyncIcon />
              <span className="text-dark-300">Pendentes de sync</span>
            </div>
            <span className={`font-medium ${pendingSync > 0 ? 'text-amber-400' : 'text-green-400'}`}>
              {pendingSync > 0 ? `${pendingSync} item${pendingSync > 1 ? 's' : ''}` : 'Tudo sincronizado'}
            </span>
          </div>

          {/* Limpar Dados */}
          <button
            onClick={() => setShowConfirmClear(true)}
            className="w-full flex items-center justify-between py-3 px-4 bg-dark-900 rounded-lg text-dark-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrashIcon />
              <span>Limpar dados offline</span>
            </div>
          </button>
        </div>
      </div>

      {/* Botão Sair */}
      <button
        onClick={() => setShowConfirmLogout(true)}
        className="btn-danger w-full"
      >
        <LogoutIcon />
        Sair da Conta
      </button>

      {/* Versão */}
      <p className="text-center text-dark-600 text-xs mt-6">
        FreteTracker v1.0.0<br />
        STAFF Soluções Inteligentes LTDA
      </p>

      {/* Modal Confirmar Logout */}
      {showConfirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card max-w-sm w-full animate-slide-up">
            <h3 className="text-lg font-semibold text-white mb-2">Sair da conta?</h3>
            <p className="text-dark-400 text-sm mb-6">
              {pendingSync > 0
                ? `Você tem ${pendingSync} item${pendingSync > 1 ? 's' : ''} pendente${pendingSync > 1 ? 's' : ''} de sincronização. Eles serão perdidos.`
                : 'Seus dados serão mantidos no servidor.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmLogout(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="btn-danger flex-1"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Limpar Dados */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="card max-w-sm w-full animate-slide-up">
            <h3 className="text-lg font-semibold text-white mb-2">Limpar dados offline?</h3>
            <p className="text-dark-400 text-sm mb-6">
              Isso removerá todos os dados armazenados localmente. Dados sincronizados no servidor não serão afetados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearData}
                className="btn-danger flex-1"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
