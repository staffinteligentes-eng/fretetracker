// =============================================
// FRETETRACKER - SISTEMA OFFLINE
// IndexedDB para Web, AsyncStorage para Mobile
// =============================================

import type { Frete, Abastecimento, Despesa, Motorista, SyncStatus } from '@fretetracker/types';

// Nome do banco de dados
const DB_NAME = 'fretetracker_offline';
const DB_VERSION = 1;

// Stores (tabelas) do IndexedDB
const STORES = {
  FRETES: 'fretes',
  ABASTECIMENTOS: 'abastecimentos',
  DESPESAS: 'despesas',
  MOTORISTA: 'motorista',
  SYNC_QUEUE: 'sync_queue',
  SETTINGS: 'settings',
} as const;

// =============================================
// INDEXEDDB SETUP
// =============================================

let dbInstance: IDBDatabase | null = null;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store de Fretes
      if (!db.objectStoreNames.contains(STORES.FRETES)) {
        const fretesStore = db.createObjectStore(STORES.FRETES, { keyPath: 'id' });
        fretesStore.createIndex('sync_status', 'sync_status', { unique: false });
        fretesStore.createIndex('local_id', 'local_id', { unique: false });
        fretesStore.createIndex('motorista_id', 'motorista_id', { unique: false });
        fretesStore.createIndex('status', 'status', { unique: false });
      }

      // Store de Abastecimentos
      if (!db.objectStoreNames.contains(STORES.ABASTECIMENTOS)) {
        const abastStore = db.createObjectStore(STORES.ABASTECIMENTOS, { keyPath: 'id' });
        abastStore.createIndex('sync_status', 'sync_status', { unique: false });
        abastStore.createIndex('frete_id', 'frete_id', { unique: false });
      }

      // Store de Despesas
      if (!db.objectStoreNames.contains(STORES.DESPESAS)) {
        const despesasStore = db.createObjectStore(STORES.DESPESAS, { keyPath: 'id' });
        despesasStore.createIndex('sync_status', 'sync_status', { unique: false });
        despesasStore.createIndex('frete_id', 'frete_id', { unique: false });
      }

      // Store do Motorista (usuário logado)
      if (!db.objectStoreNames.contains(STORES.MOTORISTA)) {
        db.createObjectStore(STORES.MOTORISTA, { keyPath: 'id' });
      }

      // Fila de sincronização
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('table', 'table', { unique: false });
        syncStore.createIndex('action', 'action', { unique: false });
        syncStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Configurações
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });
}

// =============================================
// OPERAÇÕES GENÉRICAS
// =============================================

async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const store = await getStore(storeName);
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: string, data: T): Promise<T> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

async function remove(storeName: string, id: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
  const store = await getStore(storeName);
  const index = store.index(indexName);
  return new Promise((resolve, reject) => {
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const store = await getStore(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// =============================================
// GERAÇÃO DE ID LOCAL
// =============================================

function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================
// API OFFLINE - FRETES
// =============================================

export const offlineFretes = {
  async getAll(): Promise<Frete[]> {
    return getAll<Frete>(STORES.FRETES);
  },

  async getById(id: string): Promise<Frete | undefined> {
    return getById<Frete>(STORES.FRETES, id);
  },

  async save(frete: Frete): Promise<Frete> {
    return put<Frete>(STORES.FRETES, frete);
  },

  async create(frete: Omit<Frete, 'id' | 'local_id' | 'sync_status'>): Promise<Frete> {
    const localId = generateLocalId();
    const newFrete: Frete = {
      ...frete,
      id: localId,
      local_id: localId,
      sync_status: 'pending' as SyncStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    await put<Frete>(STORES.FRETES, newFrete);
    await addToSyncQueue('fretes', 'insert', newFrete);
    
    return newFrete;
  },

  async update(id: string, updates: Partial<Frete>): Promise<Frete | undefined> {
    const existing = await getById<Frete>(STORES.FRETES, id);
    if (!existing) return undefined;

    const updated: Frete = {
      ...existing,
      ...updates,
      sync_status: 'pending' as SyncStatus,
      updated_at: new Date().toISOString(),
    };

    await put<Frete>(STORES.FRETES, updated);
    await addToSyncQueue('fretes', 'update', updated);

    return updated;
  },

  async delete(id: string): Promise<void> {
    const existing = await getById<Frete>(STORES.FRETES, id);
    if (existing) {
      await remove(STORES.FRETES, id);
      await addToSyncQueue('fretes', 'delete', { id });
    }
  },

  async getPending(): Promise<Frete[]> {
    return getByIndex<Frete>(STORES.FRETES, 'sync_status', 'pending');
  },

  async markSynced(id: string, serverId?: string): Promise<void> {
    const existing = await getById<Frete>(STORES.FRETES, id);
    if (existing) {
      const updated: Frete = {
        ...existing,
        id: serverId || existing.id,
        sync_status: 'synced' as SyncStatus,
      };
      
      // Se o ID mudou (era local, agora é do servidor), remover o antigo
      if (serverId && serverId !== id) {
        await remove(STORES.FRETES, id);
      }
      
      await put<Frete>(STORES.FRETES, updated);
    }
  },

  async bulkSave(fretes: Frete[]): Promise<void> {
    for (const frete of fretes) {
      await put<Frete>(STORES.FRETES, frete);
    }
  },

  async clear(): Promise<void> {
    await clearStore(STORES.FRETES);
  },
};

// =============================================
// API OFFLINE - ABASTECIMENTOS
// =============================================

export const offlineAbastecimentos = {
  async getAll(): Promise<Abastecimento[]> {
    return getAll<Abastecimento>(STORES.ABASTECIMENTOS);
  },

  async getByFreteId(freteId: string): Promise<Abastecimento[]> {
    return getByIndex<Abastecimento>(STORES.ABASTECIMENTOS, 'frete_id', freteId);
  },

  async save(abastecimento: Abastecimento): Promise<Abastecimento> {
    return put<Abastecimento>(STORES.ABASTECIMENTOS, abastecimento);
  },

  async create(abastecimento: Omit<Abastecimento, 'id' | 'local_id' | 'sync_status'>): Promise<Abastecimento> {
    const localId = generateLocalId();
    const newAbastecimento: Abastecimento = {
      ...abastecimento,
      id: localId,
      local_id: localId,
      sync_status: 'pending' as SyncStatus,
      created_at: new Date().toISOString(),
    };
    
    await put<Abastecimento>(STORES.ABASTECIMENTOS, newAbastecimento);
    await addToSyncQueue('abastecimentos', 'insert', newAbastecimento);
    
    return newAbastecimento;
  },

  async bulkSave(abastecimentos: Abastecimento[]): Promise<void> {
    for (const abastecimento of abastecimentos) {
      await put<Abastecimento>(STORES.ABASTECIMENTOS, abastecimento);
    }
  },

  async clear(): Promise<void> {
    await clearStore(STORES.ABASTECIMENTOS);
  },
};

// =============================================
// API OFFLINE - DESPESAS
// =============================================

export const offlineDespesas = {
  async getAll(): Promise<Despesa[]> {
    return getAll<Despesa>(STORES.DESPESAS);
  },

  async getByFreteId(freteId: string): Promise<Despesa[]> {
    return getByIndex<Despesa>(STORES.DESPESAS, 'frete_id', freteId);
  },

  async save(despesa: Despesa): Promise<Despesa> {
    return put<Despesa>(STORES.DESPESAS, despesa);
  },

  async create(despesa: Omit<Despesa, 'id' | 'local_id' | 'sync_status'>): Promise<Despesa> {
    const localId = generateLocalId();
    const newDespesa: Despesa = {
      ...despesa,
      id: localId,
      local_id: localId,
      sync_status: 'pending' as SyncStatus,
      created_at: new Date().toISOString(),
    };
    
    await put<Despesa>(STORES.DESPESAS, newDespesa);
    await addToSyncQueue('despesas', 'insert', newDespesa);
    
    return newDespesa;
  },

  async bulkSave(despesas: Despesa[]): Promise<void> {
    for (const despesa of despesas) {
      await put<Despesa>(STORES.DESPESAS, despesa);
    }
  },

  async clear(): Promise<void> {
    await clearStore(STORES.DESPESAS);
  },
};

// =============================================
// API OFFLINE - MOTORISTA (USUÁRIO LOGADO)
// =============================================

export const offlineMotorista = {
  async get(): Promise<Motorista | undefined> {
    const all = await getAll<Motorista>(STORES.MOTORISTA);
    return all[0];
  },

  async save(motorista: Motorista): Promise<Motorista> {
    // Limpar qualquer motorista anterior
    await clearStore(STORES.MOTORISTA);
    return put<Motorista>(STORES.MOTORISTA, motorista);
  },

  async clear(): Promise<void> {
    await clearStore(STORES.MOTORISTA);
  },
};

// =============================================
// FILA DE SINCRONIZAÇÃO
// =============================================

interface SyncQueueItem {
  id?: number;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: unknown;
  created_at: string;
  retries: number;
}

async function addToSyncQueue(table: string, action: 'insert' | 'update' | 'delete', data: unknown): Promise<void> {
  const item: SyncQueueItem = {
    table,
    action,
    data,
    created_at: new Date().toISOString(),
    retries: 0,
  };
  await put<SyncQueueItem>(STORES.SYNC_QUEUE, item);
}

export const syncQueue = {
  async getAll(): Promise<SyncQueueItem[]> {
    return getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
  },

  async remove(id: number): Promise<void> {
    await remove(STORES.SYNC_QUEUE, String(id));
  },

  async clear(): Promise<void> {
    await clearStore(STORES.SYNC_QUEUE);
  },

  async incrementRetry(id: number): Promise<void> {
    const item = await getById<SyncQueueItem>(STORES.SYNC_QUEUE, String(id));
    if (item) {
      item.retries += 1;
      await put<SyncQueueItem>(STORES.SYNC_QUEUE, item);
    }
  },

  async getPendingCount(): Promise<number> {
    const items = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    return items.length;
  },
};

// =============================================
// CONFIGURAÇÕES OFFLINE
// =============================================

interface Setting {
  key: string;
  value: unknown;
}

export const offlineSettings = {
  async get<T>(key: string): Promise<T | undefined> {
    const setting = await getById<Setting>(STORES.SETTINGS, key);
    return setting?.value as T | undefined;
  },

  async set<T>(key: string, value: T): Promise<void> {
    await put<Setting>(STORES.SETTINGS, { key, value });
  },

  async remove(key: string): Promise<void> {
    await remove(STORES.SETTINGS, key);
  },
};

// =============================================
// LIMPAR TODOS OS DADOS OFFLINE
// =============================================

export async function clearAllOfflineData(): Promise<void> {
  await offlineFretes.clear();
  await offlineAbastecimentos.clear();
  await offlineDespesas.clear();
  await offlineMotorista.clear();
  await syncQueue.clear();
}

// =============================================
// EXPORTAR TUDO
// =============================================

export default {
  fretes: offlineFretes,
  abastecimentos: offlineAbastecimentos,
  despesas: offlineDespesas,
  motorista: offlineMotorista,
  syncQueue,
  settings: offlineSettings,
  clearAll: clearAllOfflineData,
};
