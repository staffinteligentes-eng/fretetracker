// =============================================
// INDICADOR DE STATUS DE SINCRONIZAÇÃO
// =============================================

import { useStore } from '../store';

const WifiIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
  </svg>
);

const WifiOffIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
  </svg>
);

const SyncIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export default function SyncIndicator() {
  const { isOnline, pendingSync, isLoading } = useStore();

  // Determinar estado
  const isSyncing = isLoading && pendingSync > 0;

  if (isSyncing) {
    return (
      <div className="sync-syncing">
        <SyncIcon />
        <span>Sincronizando ({pendingSync})</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="sync-offline">
        <WifiOffIcon />
        <span>Offline</span>
        {pendingSync > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-amber-500/30 rounded text-[10px]">
            {pendingSync}
          </span>
        )}
      </div>
    );
  }

  if (pendingSync > 0) {
    return (
      <div className="sync-indicator bg-amber-500/15 text-amber-400">
        <WifiIcon />
        <span>{pendingSync} pendente{pendingSync > 1 ? 's' : ''}</span>
      </div>
    );
  }

  // Online e sincronizado - mostrar brevemente e esconder
  return (
    <div className="sync-online opacity-0 hover:opacity-100 transition-opacity">
      <WifiIcon />
      <span>Online</span>
    </div>
  );
}
