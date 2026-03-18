// =============================================
// PÁGINA DE LOGIN
// =============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { supabase, auth, db } from '@fretetracker/supabase';

export default function Login() {
  const navigate = useNavigate();
  const { setUsuario, setLoading } = useStore();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [error, setError] = useState('');
  const [loading, setLocalLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLocalLoading(true);
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const { user } = await auth.signIn(email, password);
        
        if (user) {
          // Buscar dados do motorista
          let motorista = await db.motoristas.getByUserId(user.id);
          
          // Se não existe, criar perfil básico
          if (!motorista) {
            motorista = await db.motoristas.create({
              user_id: user.id,
              nome: user.user_metadata?.nome || email.split('@')[0],
              tipo_veiculo: 'caminhao',
              consumo_medio: 3.5,
              perfil: 'motorista',
              ativo: true,
            });
          }

          setUsuario(motorista);
          navigate('/');
        }
      } else {
        // Cadastro
        const { user } = await auth.signUp(email, password, nome);
        
        if (user) {
          // Criar perfil do motorista
          const motorista = await db.motoristas.create({
            user_id: user.id,
            nome: nome,
            tipo_veiculo: 'caminhao',
            consumo_medio: 3.5,
            perfil: 'motorista',
            ativo: true,
          });

          setUsuario(motorista);
          navigate('/');
        }
      }
    } catch (err: any) {
      console.error('Erro de auth:', err);
      setError(
        err.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : err.message || 'Erro ao fazer login'
      );
    } finally {
      setLocalLoading(false);
      setLoading(false);
    }
  };

  // Login de demonstração (para testes)
  const handleDemoLogin = async () => {
    setLocalLoading(true);
    
    // Simular usuário demo
    const demoUser = {
      id: 'demo-user',
      user_id: 'demo-user',
      nome: 'Motorista Demo',
      cpf: '000.000.000-00',
      telefone: '(00) 00000-0000',
      placa_veiculo: 'ABC-1234',
      tipo_veiculo: 'caminhao' as const,
      consumo_medio: 3.5,
      perfil: 'motorista' as const,
      ativo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUsuario(demoUser);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
          <svg className="w-10 h-10 text-dark-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h1 className="font-display font-bold text-3xl text-white">FreteTracker</h1>
        <p className="text-dark-400 mt-2">Gestão inteligente de fretes</p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-md card">
        <h2 className="text-xl font-semibold text-white mb-6">
          {isLogin ? 'Entrar na conta' : 'Criar conta'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="label">Nome completo</label>
              <input
                type="text"
                className="input"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="spinner" />
            ) : isLogin ? (
              'Entrar'
            ) : (
              'Criar conta'
            )}
          </button>
        </form>

        {/* Alternar Login/Cadastro */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary-500 hover:text-primary-400 text-sm"
          >
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>
        </div>

        {/* Divisor */}
        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-dark-700" />
          <span className="text-dark-500 text-sm">ou</span>
          <div className="flex-1 h-px bg-dark-700" />
        </div>

        {/* Login Demo */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="btn-secondary w-full"
        >
          Entrar como Demo
        </button>
      </div>

      {/* Footer */}
      <p className="mt-8 text-dark-500 text-xs text-center">
        STAFF Soluções Inteligentes LTDA<br />
        © 2024 FreteTracker
      </p>
    </div>
  );
}
