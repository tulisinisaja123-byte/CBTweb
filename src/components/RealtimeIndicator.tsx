import React, { useState, useEffect, useRef } from 'react';
import {
  subscribeToRealtimeStatus,
  triggerManualSync,
  getRealtimeStatus,
  RealtimeSyncStatus
} from '../services/realtimeSync';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ChevronDown,
  Layers,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const RealtimeIndicator: React.FC = () => {
  const [status, setStatus] = useState<RealtimeSyncStatus>(() => getRealtimeStatus());
  const [isOpen, setIsOpen] = useState(false);
  const [timeAgo, setTimeAgo] = useState('Baru saja');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToRealtimeStatus((newStatus) => {
      setStatus(newStatus);
    });
    return unsub;
  }, []);

  // Update time ago string every 5 seconds
  useEffect(() => {
    const updateLabel = () => {
      const diffSec = Math.floor((Date.now() - status.lastSyncTimestamp) / 1000);
      if (diffSec < 5) setTimeAgo('Baru saja');
      else if (diffSec < 60) setTimeAgo(`${diffSec} detik lalu`);
      else {
        const mins = Math.floor(diffSec / 60);
        setTimeAgo(`${mins} menit lalu`);
      }
    };
    updateLabel();
    const interval = setInterval(updateLabel, 5000);
    return () => clearInterval(interval);
  }, [status.lastSyncTimestamp]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleManualSync = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerManualSync();
  };

  const formattedTime = new Date(status.lastSyncTimestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Real-time Indicator Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Status Koneksi & Sinkronisasi Real-Time"
        className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all select-none border cursor-pointer ${
          !status.isOnline
            ? 'bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF] hover:bg-[#FAD2CF]'
            : status.isSyncing
            ? 'bg-[#EBF3FC] text-[#0052CC] border-[#B3D1FF] shadow-xs ring-1 ring-[#0052CC]/20'
            : 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6] hover:bg-[#CEEAD6]'
        }`}
      >
        {/* Pulsing or spinning indicator dot */}
        {!status.isOnline ? (
          <WifiOff className="w-3 h-3 text-[#C5221F] shrink-0" />
        ) : status.isSyncing ? (
          <RefreshCw className="w-3 h-3 animate-spin text-[#0052CC] shrink-0" />
        ) : (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34A853] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1E8E3E]" />
          </span>
        )}

        {/* Text Label */}
        <span className="hidden sm:inline">
          {!status.isOnline
            ? 'Mode Offline'
            : status.isSyncing
            ? 'Menyinkronkan...'
            : 'Online Real-Time'}
        </span>
        <span className="sm:hidden text-[10px]">
          {!status.isOnline ? 'Offline' : status.isSyncing ? 'Sync...' : 'Online'}
        </span>

        <ChevronDown
          className={`w-3 h-3 transition-transform text-current opacity-70 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Interactive Detail Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-[#DEE2E6] rounded-xl shadow-xl z-50 overflow-hidden text-xs text-[#1A1C1E]"
          >
            {/* Popover Header */}
            <div className="px-4 py-3 bg-[#F8F9FA] border-b border-[#DEE2E6] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#0052CC]" />
                <span className="font-bold text-xs text-[#1A1C1E]">
                  Koneksi &amp; Sinkronisasi
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  status.isOnline
                    ? 'bg-[#E6F4EA] text-[#137333]'
                    : 'bg-[#FCE8E6] text-[#C5221F]'
                }`}
              >
                {status.isOnline ? 'Aktif' : 'Terputus'}
              </span>
            </div>

            {/* Popover Body */}
            <div className="p-4 space-y-3">
              {/* Status Row 1 */}
              <div className="flex items-start gap-2.5">
                {status.isOnline ? (
                  <CheckCircle2 className="w-4 h-4 text-[#137333] shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#C5221F] shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-[11px] text-[#1A1C1E]">
                    {status.isOnline
                      ? 'Aplikasi Terhubung Real-Time'
                      : 'Perangkat Sedang Offline'}
                  </div>
                  <p className="text-[10px] text-[#6C757D] leading-relaxed mt-0.5">
                    {status.isOnline
                      ? 'Perubahan ujian, nilai, bank soal, jadwal, dan akun otomatis sinkron antar-tab & perangkat.'
                      : 'Data tetap tersimpan di penyimpanan lokal dan akan disinkronkan saat koneksi kembali.'}
                  </p>
                </div>
              </div>

              {/* Status Details Box */}
              <div className="p-2.5 bg-[#F8F9FA] rounded-lg border border-[#E9ECEF] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#6C757D] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0052CC]" />
                    Sinkronisasi Terakhir
                  </span>
                  <span className="font-medium text-[#1A1C1E]">
                    {formattedTime} ({timeAgo})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#6C757D] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#0052CC]" />
                    Event Sinkronisasi
                  </span>
                  <span className="font-medium text-[#1A1C1E]">
                    {status.syncEventCount} event tercatat
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={status.isSyncing}
                  className="w-full py-2 px-3 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      status.isSyncing ? 'animate-spin' : ''
                    }`}
                  />
                  <span>
                    {status.isSyncing
                      ? 'Menyinkronkan data...'
                      : 'Sinkronkan Sekarang'}
                  </span>
                </button>
              </div>
            </div>

            {/* Popover Footer Info */}
            <div className="px-4 py-2 bg-[#F1F3F5] border-t border-[#DEE2E6] text-[10px] text-[#6C757D] text-center">
              Multi-tab Real-Time Channel aktif
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
