// =============================================
// FRETETRACKER - CLIENTE SUPABASE
// =============================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@fretetracker/types';

// Configuração do Supabase
const SUPABASE_URL = 'https://dqchduhgzhpjdcefldth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0FE-gJWLCHyn8IPvo-sMUg_5AxpYgVU';

// Cliente Supabase tipado
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Exportar configuração para uso em outros lugares
export const config = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
};

// =============================================
// HELPERS DE AUTENTICAÇÃO
// =============================================

export const auth = {
  // Login com email/senha
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Cadastro
  async signUp(email: string, password: string, nome: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome },
      },
    });
    if (error) throw error;
    return data;
  },

  // Logout
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Usuário atual
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Sessão atual
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Listener de mudança de auth
  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// =============================================
// HELPERS DE DADOS
// =============================================

export const db = {
  // MOTORISTAS
  motoristas: {
    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from('motoristas')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },

    async getAll() {
      const { data, error } = await supabase
        .from('motoristas')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },

    async create(motorista: Database['public']['Tables']['motoristas']['Insert']) {
      const { data, error } = await supabase
        .from('motoristas')
        .insert(motorista)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Database['public']['Tables']['motoristas']['Update']) {
      const { data, error } = await supabase
        .from('motoristas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },

  // FRETES
  fretes: {
    async getAll(motoristaId?: string) {
      let query = supabase
        .from('fretes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (motoristaId) {
        query = query.eq('motorista_id', motoristaId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async getById(id: string) {
      const { data, error } = await supabase
        .from('fretes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    async create(frete: Database['public']['Tables']['fretes']['Insert']) {
      const { data, error } = await supabase
        .from('fretes')
        .insert(frete)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: Database['public']['Tables']['fretes']['Update']) {
      const { data, error } = await supabase
        .from('fretes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('fretes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    // Buscar fretes pendentes de sync
    async getPendingSync() {
      const { data, error } = await supabase
        .from('fretes')
        .select('*')
        .eq('sync_status', 'pending');
      if (error) throw error;
      return data;
    },
  },

  // ABASTECIMENTOS
  abastecimentos: {
    async getAll(motoristaId?: string) {
      let query = supabase
        .from('abastecimentos')
        .select('*')
        .order('data_abastecimento', { ascending: false });
      
      if (motoristaId) {
        query = query.eq('motorista_id', motoristaId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async create(abastecimento: Database['public']['Tables']['abastecimentos']['Insert']) {
      const { data, error } = await supabase
        .from('abastecimentos')
        .insert(abastecimento)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },

  // DESPESAS
  despesas: {
    async getAll(motoristaId?: string) {
      let query = supabase
        .from('despesas')
        .select('*')
        .order('data_despesa', { ascending: false });
      
      if (motoristaId) {
        query = query.eq('motorista_id', motoristaId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async create(despesa: Database['public']['Tables']['despesas']['Insert']) {
      const { data, error } = await supabase
        .from('despesas')
        .insert(despesa)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },
};

// =============================================
// REALTIME SUBSCRIPTIONS
// =============================================

export const realtime = {
  // Escutar mudanças em fretes
  subscribeFretes(callback: (payload: unknown) => void) {
    return supabase
      .channel('fretes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fretes' },
        callback
      )
      .subscribe();
  },

  // Escutar mudanças em abastecimentos
  subscribeAbastecimentos(callback: (payload: unknown) => void) {
    return supabase
      .channel('abastecimentos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'abastecimentos' },
        callback
      )
      .subscribe();
  },

  // Escutar mudanças em despesas
  subscribeDespesas(callback: (payload: unknown) => void) {
    return supabase
      .channel('despesas-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'despesas' },
        callback
      )
      .subscribe();
  },

  // Cancelar subscription
  unsubscribe(channel: ReturnType<typeof supabase.channel>) {
    return supabase.removeChannel(channel);
  },
};

export default supabase;
