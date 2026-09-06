// Real-time synchronization service and online status manager
// Provides multi-tab, cross-device, and offline/online status tracking

export interface RealtimeSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTimestamp: number;
  syncEventCount: number;
  channelName: string;
  hasBroadcastSupport: boolean;
  lastChangedKey?: string;
}

type RealtimeListener = (status: RealtimeSyncStatus) => void;

const CHANNEL_NAME = 'cbt_realtime_sync_channel';
const listeners: Set<RealtimeListener> = new Set();

let statusState: RealtimeSyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncTimestamp: Date.now(),
  syncEventCount: 0,
  channelName: CHANNEL_NAME,
  hasBroadcastSupport: typeof window !== 'undefined' && 'BroadcastChannel' in window,
  lastChangedKey: undefined
};

let broadcastChannelInstance: BroadcastChannel | null = null;
let syncingTimeout: any = null;
let isNotifyPending = false;

function deferTask(fn: () => void) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(fn);
  } else if (typeof Promise !== 'undefined') {
    Promise.resolve().then(fn);
  } else {
    setTimeout(fn, 0);
  }
}

function notifyStatusListeners() {
  if (isNotifyPending) return;
  isNotifyPending = true;

  deferTask(() => {
    isNotifyPending = false;
    const currentSnapshot = { ...statusState };
    listeners.forEach(fn => {
      try {
        fn(currentSnapshot);
      } catch (e) {
        console.error('Realtime listener error:', e);
      }
    });
  });
}

export function setSyncingState(isSyncing: boolean, key?: string) {
  if (syncingTimeout) clearTimeout(syncingTimeout);

  statusState.isSyncing = isSyncing;
  if (key) statusState.lastChangedKey = key;
  if (!isSyncing) {
    statusState.lastSyncTimestamp = Date.now();
    statusState.syncEventCount += 1;
  }
  notifyStatusListeners();

  if (isSyncing) {
    syncingTimeout = setTimeout(() => {
      statusState.isSyncing = false;
      statusState.lastSyncTimestamp = Date.now();
      statusState.syncEventCount += 1;
      notifyStatusListeners();
    }, 600);
  }
}

// Initialize real-time event listeners
if (typeof window !== 'undefined') {
  // 1. Browser online / offline events
  window.addEventListener('online', () => {
    statusState.isOnline = true;
    statusState.lastSyncTimestamp = Date.now();
    setSyncingState(true);
    triggerManualSync();
  });

  window.addEventListener('offline', () => {
    statusState.isOnline = false;
    notifyStatusListeners();
  });

  // 2. Custom internal CBT data change events
  window.addEventListener('cbt:datachange', (e: any) => {
    const key = e.detail?.key;
    setSyncingState(true, key);
  });

  // 3. Broadcast Channel for cross-tab communication
  if ('BroadcastChannel' in window) {
    try {
      broadcastChannelInstance = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannelInstance.onmessage = (event) => {
        if (event.data?.type === 'HEARTBEAT_PING') {
          try {
            broadcastChannelInstance?.postMessage({
              type: 'HEARTBEAT_PONG',
              timestamp: Date.now()
            });
          } catch {}
          return;
        }

        if (event.data?.key) {
          setSyncingState(true, event.data.key);
        }
      };
    } catch (err) {
      console.warn('Realtime BroadcastChannel initialization error:', err);
    }
  }

  // Periodic heartbeat every 45s to maintain active real-time channel
  setInterval(() => {
    if (typeof navigator !== 'undefined') {
      const currentOnline = navigator.onLine;
      if (statusState.isOnline !== currentOnline) {
        statusState.isOnline = currentOnline;
        notifyStatusListeners();
      }
    }
  }, 45000);
}

export function getRealtimeStatus(): RealtimeSyncStatus {
  return { ...statusState };
}

export function subscribeToRealtimeStatus(listener: RealtimeListener): () => void {
  listeners.add(listener);
  deferTask(() => {
    if (listeners.has(listener)) {
      listener({ ...statusState });
    }
  });
  return () => {
    listeners.delete(listener);
  };
}

export function triggerManualSync(): void {
  setSyncingState(true, 'MANUAL_SYNC');
  if (typeof window !== 'undefined') {
    // Notify all tabs and in-memory listeners
    window.dispatchEvent(new CustomEvent('cbt:datachange', {
      detail: { key: 'ALL', timestamp: Date.now(), manual: true }
    }));

    if (broadcastChannelInstance) {
      try {
        broadcastChannelInstance.postMessage({
          key: 'ALL',
          timestamp: Date.now(),
          type: 'SYNC_ALL'
        });
      } catch {}
    }
  }
}
