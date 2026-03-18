// =============================================
// FRETETRACKER - SERVIÇO DE SINCRONIZAÇÃO
// Sincroniza dados offline com Supabase
// =============================================

import { supabase, db } from '@fretetracker/supabase';
import offline, { syncQueue, offlineFretes, offlineAbastecimentos, offlineDespesas } from './index';
import type { Frete, Abastecimento, Despesa, SyncStatus } from '@fretetracker/types';

// =============================================
// ESTADO DE CONEXÃO
// =============================================

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let syncInProgress = false;

export function getOnlineStatus(): boolean {
  return isOnline;
}

export function setOnlineStatus(status: boolean): void {
  isOnline = status;
}

// Listener de conexão (para web)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    // Tentar sincronizar quando voltar online
    syncAll().catch(console.error);
  });

  window.addEventListener('offline', () => {
    isOnline = false;
  });
}

// =============================================
// SINCRONIZAÇÃO PRINCIPAL
// =============================================

export async function syncAll(): Promise<{ success: boolean; synced: number; errors: number }> {
  if (!isOnline || syncInProgress) {
    return { success: false, synced: 0, errors: 0 };
  }

  syncInProgress = true;
  let synced = 0;
  let errors = 0;

  try {
    // 1. Processar fila de sincronização (dados criados offline)
    const queueItems = await syncQueue.getAll();
    
    for (const item of queueItems) {
      try {
        await processQueueItem(item);
        await syncQueue.remove(item.id!);
        synced++;
      } catch (error) {
        console.error('Erro ao sincronizar item:', error);
        await syncQueue.incrementRetry(item.id!);
        errors++;
      }
    }

    // 2. Baixar dados novos do servidor
    await pullFromServer();

    return { success: true, synced, errors };
  } catch (error) {
    console.error('Erro na sincronização:', error);
    return { success: false, synced, errors: errors + 1 };
  } finally {
    syncInProgress = false;
  }
}

// =============================================
// PROCESSAR ITEM DA FILA
// =============================================

interface QueueItem {
  id?: number;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: unknown;
  retries: number;
}

async function processQueueItem(item: QueueItem): Promise<void> {
  const { table, action, data } = item;

  switch (table) {
    case 'fretes':
      await syncFrete(action, data as Frete);
      break;
    case 'abastecimentos':
      await syncAbastecimento(action, data as Abastecimento);
      break;
    case 'despesas':
      await syncDespesa(action, data as Despesa);
      break;
    default:
      console.warn(`Tabela desconhecida: ${table}`);
  }
}

// =============================================
// SYNC DE FRETES
// =============================================

async function syncFrete(action: string, frete: Frete): Promise<void> {
  const localId = frete.local_id || frete.id;

  switch (action) {
    case 'insert': {
      // Preparar dados para inserção (remover campos locais)
      const { id, local_id, sync_status, ...insertData } = frete;
      
      // Converter estrutura local para estrutura do banco
      const dbData = {
        motorista_id: frete.motorista_id,
        origem_cidade: frete.origem.cidade,
        origem_estado: frete.origem.estado,
        origem_lat: frete.origem.coordenadas?.lat,
        origem_lng: frete.origem.coordenadas?.lng,
        destino_cidade: frete.destino.cidade,
        destino_estado: frete.destino.estado,
        destino_lat: frete.destino.coordenadas?.lat,
        destino_lng: frete.destino.coordenadas?.lng,
        distancia_km: frete.distancia_km,
        tempo_estimado_min: frete.tempo_estimado_min,
        consumo_estimado_litros: frete.consumo_estimado_litros,
        descricao_carga: frete.descricao_carga,
        valor_frete: frete.valor_frete,
        percentual_comissao: frete.percentual_comissao,
        status: frete.status,
        data_saida: frete.data_saida,
        data_chegada: frete.data_chegada,
        sync_status: 'synced' as SyncStatus,
        local_id: localId,
      };

      const created = await db.fretes.create(dbData as any);
      
      // Atualizar registro local com ID do servidor
      await offlineFretes.markSynced(localId, created.id);
      break;
    }

    case 'update': {
      // Verificar se o frete já foi sincronizado (tem ID do servidor)
      const isLocalOnly = frete.id.startsWith('local_');
      
      if (!isLocalOnly) {
        await db.fretes.update(frete.id, {
          status: frete.status,
          data_saida: frete.data_saida,
          data_chegada: frete.data_chegada,
          sync_status: 'synced' as SyncStatus,
        } as any);
        
        await offlineFretes.markSynced(frete.id);
      }
      break;
    }

    case 'delete': {
      const isLocalOnly = frete.id.startsWith('local_');
      
      if (!isLocalOnly) {
        await db.fretes.delete(frete.id);
      }
      break;
    }
  }
}

// =============================================
// SYNC DE ABASTECIMENTOS
// =============================================

async function syncAbastecimento(action: string, abastecimento: Abastecimento): Promise<void> {
  if (action === 'insert') {
    const { id, local_id, sync_status, ...insertData } = abastecimento;
    
    await db.abastecimentos.create({
      ...insertData,
      sync_status: 'synced' as SyncStatus,
      local_id: local_id || id,
    } as any);
  }
}

// =============================================
// SYNC DE DESPESAS
// =============================================

async function syncDespesa(action: string, despesa: Despesa): Promise<void> {
  if (action === 'insert') {
    const { id, local_id, sync_status, ...insertData } = despesa;
    
    await db.despesas.create({
      ...insertData,
      sync_status: 'synced' as SyncStatus,
      local_id: local_id || id,
    } as any);
  }
}

// =============================================
// BAIXAR DADOS DO SERVIDOR
// =============================================

async function pullFromServer(): Promise<void> {
  try {
    // Buscar fretes do servidor
    const fretesServer = await db.fretes.getAll();
    
    if (fretesServer) {
      // Converter formato do banco para formato local
      const fretesLocal: Frete[] = fretesServer.map((f: any) => ({
        id: f.id,
        motorista_id: f.motorista_id,
        origem: {
          cidade: f.origem_cidade,
          estado: f.origem_estado,
          coordenadas: f.origem_lat ? { lat: f.origem_lat, lng: f.origem_lng } : undefined,
        },
        destino: {
          cidade: f.destino_cidade,
          estado: f.destino_estado,
          coordenadas: f.destino_lat ? { lat: f.destino_lat, lng: f.destino_lng } : undefined,
        },
        distancia_km: f.distancia_km,
        tempo_estimado_min: f.tempo_estimado_min,
        consumo_estimado_litros: f.consumo_estimado_litros,
        descricao_carga: f.descricao_carga,
        valor_frete: f.valor_frete,
        percentual_comissao: f.percentual_comissao,
        valor_comissao: f.valor_comissao,
        status: f.status,
        data_saida: f.data_saida,
        data_chegada: f.data_chegada,
        sync_status: 'synced' as SyncStatus,
        local_id: f.local_id,
        created_at: f.created_at,
        updated_at: f.updated_at,
      }));

      // Salvar localmente (sem sobrescrever pendentes)
      const localPending = await offlineFretes.getPending();
      const pendingIds = new Set(localPending.map(f => f.local_id || f.id));

      for (const frete of fretesLocal) {
        if (!pendingIds.has(frete.local_id) && !pendingIds.has(frete.id)) {
          await offlineFretes.save(frete);
        }
      }
    }

    // Buscar abastecimentos
    const abastecimentosServer = await db.abastecimentos.getAll();
    if (abastecimentosServer) {
      await offlineAbastecimentos.bulkSave(abastecimentosServer.map((a: any) => ({
        ...a,
        sync_status: 'synced' as SyncStatus,
      })));
    }

    // Buscar despesas
    const despesasServer = await db.despesas.getAll();
    if (despesasServer) {
      await offlineDespesas.bulkSave(despesasServer.map((d: any) => ({
        ...d,
        sync_status: 'synced' as SyncStatus,
      })));
    }
  } catch (error) {
    console.error('Erro ao baixar dados do servidor:', error);
  }
}

// =============================================
// FORÇAR SINCRONIZAÇÃO COMPLETA
// =============================================

export async function forceFullSync(): Promise<void> {
  if (!isOnline) {
    throw new Error('Sem conexão com a internet');
  }

  // Limpar dados locais (exceto pendentes)
  const pending = await offlineFretes.getPending();
  
  // Fazer pull completo
  await pullFromServer();
  
  // Restaurar pendentes
  for (const frete of pending) {
    await offlineFretes.save(frete);
  }

  // Processar fila
  await syncAll();
}

// =============================================
// CONTAGEM DE PENDENTES
// =============================================

export async function getPendingSyncCount(): Promise<number> {
  return syncQueue.getPendingCount();
}

// =============================================
// EXPORTAR
// =============================================

export default {
  syncAll,
  forceFullSync,
  getPendingSyncCount,
  getOnlineStatus,
  setOnlineStatus,
};
