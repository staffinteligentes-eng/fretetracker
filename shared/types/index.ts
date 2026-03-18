// =============================================
// FRETETRACKER - TIPOS COMPARTILHADOS
// =============================================

// Perfis de usuário
export type PerfilUsuario = 'dono' | 'gestor' | 'motorista';

// Status do frete
export type StatusFrete = 'pendente' | 'em_transito' | 'entregue' | 'cancelado';

// Status de sincronização
export type SyncStatus = 'synced' | 'pending' | 'conflict';

// Tipos de despesa
export type TipoDespesa = 'pedagio' | 'alimentacao' | 'manutencao' | 'hospedagem' | 'outros';

// Tipos de veículo
export type TipoVeiculo = 'caminhao' | 'carreta' | 'bitrem' | 'van' | 'utilitario';

// =============================================
// ENTIDADES PRINCIPAIS
// =============================================

export interface Motorista {
  id: string;
  user_id?: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  placa_veiculo?: string;
  tipo_veiculo: TipoVeiculo;
  consumo_medio: number; // km por litro
  perfil: PerfilUsuario;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface LocalFrete {
  cidade: string;
  estado: string;
  coordenadas?: Coordenadas;
}

export interface Frete {
  id: string;
  motorista_id?: string;
  
  // Origem e Destino
  origem: LocalFrete;
  destino: LocalFrete;
  
  // Dados da Rota
  distancia_km?: number;
  tempo_estimado_min?: number;
  consumo_estimado_litros?: number;
  
  // Dados do Frete
  descricao_carga?: string;
  valor_frete: number;
  percentual_comissao: number;
  valor_comissao?: number;
  
  // Status e Datas
  status: StatusFrete;
  data_saida?: string;
  data_chegada?: string;
  
  // Controle de Sync
  sync_status: SyncStatus;
  local_id?: string;
  
  created_at: string;
  updated_at: string;
}

export interface Abastecimento {
  id: string;
  motorista_id?: string;
  frete_id?: string;
  
  data_abastecimento: string;
  litros: number;
  valor_litro?: number;
  valor_total?: number;
  km_odometro?: number;
  posto?: string;
  
  sync_status: SyncStatus;
  local_id?: string;
  created_at: string;
}

export interface Despesa {
  id: string;
  motorista_id?: string;
  frete_id?: string;
  
  tipo: TipoDespesa;
  descricao?: string;
  valor: number;
  data_despesa: string;
  comprovante_url?: string;
  
  sync_status: SyncStatus;
  local_id?: string;
  created_at: string;
}

export interface Impressao {
  id: string;
  frete_id: string;
  tipo: string;
  dados_impressao: Record<string, unknown>;
  impresso_em: string;
}

// =============================================
// DTOs E FORMULÁRIOS
// =============================================

export interface NovoFreteInput {
  origem_cidade: string;
  origem_estado: string;
  destino_cidade: string;
  destino_estado: string;
  descricao_carga?: string;
  valor_frete: number;
  percentual_comissao?: number;
}

export interface NovoAbastecimentoInput {
  frete_id?: string;
  litros: number;
  valor_litro?: number;
  valor_total?: number;
  km_odometro?: number;
  posto?: string;
}

export interface NovaDespesaInput {
  frete_id?: string;
  tipo: TipoDespesa;
  descricao?: string;
  valor: number;
}

// =============================================
// ROTA E MAPA
// =============================================

export interface RotaCalculada {
  origem: Coordenadas;
  destino: Coordenadas;
  distancia_km: number;
  duracao_min: number;
  polyline?: string; // encoded polyline para desenhar no mapa
  passos?: PassoRota[];
}

export interface PassoRota {
  instrucao: string;
  distancia_m: number;
  duracao_seg: number;
}

// =============================================
// IMPRESSÃO TÉRMICA
// =============================================

export interface DadosImpressaoFrete {
  numero_frete: string;
  motorista: string;
  placa: string;
  origem: string;
  destino: string;
  distancia_km: number;
  valor_frete: number;
  percentual_comissao: number;
  valor_comissao: number;
  data_saida: string;
  data_impressao: string;
}

// =============================================
// ESTADO DA APLICAÇÃO
// =============================================

export interface AppState {
  // Usuário
  usuario: Motorista | null;
  isAuthenticated: boolean;
  
  // Dados
  fretes: Frete[];
  abastecimentos: Abastecimento[];
  despesas: Despesa[];
  
  // UI
  isLoading: boolean;
  isOnline: boolean;
  pendingSync: number;
  
  // Rota atual
  rotaAtual: RotaCalculada | null;
}

// =============================================
// SUPABASE DATABASE TYPES
// =============================================

export interface Database {
  public: {
    Tables: {
      motoristas: {
        Row: Motorista;
        Insert: Omit<Motorista, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Motorista, 'id'>>;
      };
      fretes: {
        Row: Frete;
        Insert: Omit<Frete, 'id' | 'created_at' | 'updated_at' | 'valor_comissao'>;
        Update: Partial<Omit<Frete, 'id'>>;
      };
      abastecimentos: {
        Row: Abastecimento;
        Insert: Omit<Abastecimento, 'id' | 'created_at'>;
        Update: Partial<Omit<Abastecimento, 'id'>>;
      };
      despesas: {
        Row: Despesa;
        Insert: Omit<Despesa, 'id' | 'created_at'>;
        Update: Partial<Omit<Despesa, 'id'>>;
      };
      impressoes: {
        Row: Impressao;
        Insert: Omit<Impressao, 'id' | 'impresso_em'>;
        Update: Partial<Omit<Impressao, 'id'>>;
      };
    };
  };
}
