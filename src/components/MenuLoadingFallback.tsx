import React from 'react';
import { Loader2, Radio } from 'lucide-react';
import { motion } from 'motion/react';

interface MenuLoadingFallbackProps {
  menuTitle?: string;
}

export const MenuLoadingFallback: React.FC<MenuLoadingFallbackProps> = ({
  menuTitle = 'Halaman'
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="space-y-6 w-full max-w-7xl mx-auto py-2"
    >
      {/* Header Loading Shimmer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-[#DEE2E6] rounded-xl shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin text-[#0052CC]" />
            <h2 className="text-lg sm:text-xl font-bold text-[#1A1C1E] tracking-tight">
              Memuat {menuTitle}...
            </h2>
          </div>
          <p className="text-xs text-[#6C757D]">
            Sedang mengambil data terbaru dari penyimpanan real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-[#E6F4EA] border border-[#CEEAD6] text-xs font-semibold text-[#137333]">
          <Radio className="w-3.5 h-3.5 text-[#137333] animate-pulse" />
          <span>Sinkronisasi Otomatis Aktif</span>
        </div>
      </div>

      {/* Content Skeleton Placeholders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 bg-white border border-[#DEE2E6] rounded-xl space-y-3 animate-pulse"
          >
            <div className="w-10 h-10 rounded-lg bg-[#E9ECEF]" />
            <div className="h-4 w-24 bg-[#E9ECEF] rounded-md" />
            <div className="h-6 w-16 bg-[#DEE2E6] rounded-md" />
          </div>
        ))}
      </div>

      {/* Large Table Skeleton */}
      <div className="bg-white border border-[#DEE2E6] rounded-xl p-6 space-y-4 animate-pulse">
        <div className="flex justify-between items-center pb-4 border-b border-[#E9ECEF]">
          <div className="h-5 w-40 bg-[#E9ECEF] rounded-md" />
          <div className="h-8 w-28 bg-[#E9ECEF] rounded-md" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4 py-2">
              <div className="h-4 w-12 bg-[#F1F3F5] rounded-md" />
              <div className="h-4 flex-1 bg-[#F1F3F5] rounded-md" />
              <div className="h-4 w-24 bg-[#F1F3F5] rounded-md" />
              <div className="h-4 w-16 bg-[#F1F3F5] rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
