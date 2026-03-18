// =============================================
// FRETETRACKER - ESTADO GLOBAL (ZUSTAND)
// =============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Motorista, Frete, Abastecimento, Despesa } from '@fretetracker/types';

interface AppState {
  // Autenticação
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
  
  // Ações de Auth
  setUsuario: (usuario: Motorista | null) => void;
  logout: () => void;
  
  // Ações de Dados
  setFretes: (fretes: Frete[]) => void;
  addFrete: (frete: Frete) => void;
  updateFrete: (id: string, updates: Partial<Frete>) => void;
  removeFrete: (id: string) => void;
  
  setAbastecimentos: (abastecimentos: Abastecimento[]) => void;
  addAbastecimento: (abastecimento: Abastecimento) => void;
  
  setDespesas: (despesas: Despesa[]) => void;
  addDespesa: (despesa: Despesa) => void;
  
  // Ações de UI
  setLoading: (isLoading: boolean) => void;
  setOnline: (isOnline: boolean) => void;
  setPendingSync: (count: number) => void;
  
  // Reset
  reset: () => void;
}

const initialState = {
  usuario: null,
  isAuthenticated: false,
  fretes: [],
  abastecimentos: [],
  despesas: [],
  isLoading: false,
  isOnline: true,
  pendingSync: 0,
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Auth
      setUsuario: (usuario) => set({ 
        usuario, 
        isAuthenticated: !!usuario 
      }),
      
      logout: () => set({ 
        usuario: null, 
        isAuthenticated: false,
        fretes: [],
        abastecimentos: [],
        despesas: [],
      }),

      // Fretes
      setFretes: (fretes) => set({ fretes }),
      
      addFrete: (frete) => set((state) => ({ 
        fretes: [frete, ...state.fretes] 
      })),
      
      updateFrete: (id, updates) => set((state) => ({
        fretes: state.fretes.map((f) => 
          f.id === id ? { ...f, ...updates } : f
        ),
      })),
      
      removeFrete: (id) => set((state) => ({
        fretes: state.fretes.filter((f) => f.id !== id),
      })),

      // Abastecimentos
      setAbastecimentos: (abastecimentos) => set({ abastecimentos }),
      
      addAbastecimento: (abastecimento) => set((state) => ({
        abastecimentos: [abastecimento, ...state.abastecimentos],
      })),

      // Despesas
      setDespesas: (despesas) => set({ despesas }),
      
      addDespesa: (despesa) => set((state) => ({
        despesas: [despesa, ...state.despesas],
      })),

      // UI
      setLoading: (isLoading) => set({ isLoading }),
      setOnline: (isOnline) => set({ isOnline }),
      setPendingSync: (pendingSync) => set({ pendingSync }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'fretetracker-storage',
      partialize: (state) => ({
        usuario: state.usuario,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Hook para verificar status online
export function useOnlineStatus() {
  const { isOnline, setOnline } = useStore();

  // Verificar status inicial e adicionar listeners
  if (typeof window !== 'undefined') {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar status atual
    if (navigator.onLine !== isOnline) {
      setOnline(navigator.onLine);
    }
  }

  return isOnline;
}

export default useStore;
