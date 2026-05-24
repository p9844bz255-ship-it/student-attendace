import React from 'react';
import { Search, ChevronDown, CheckCheck, RefreshCw, Sparkles } from 'lucide-react';
import { StudentClass } from '../types';
import { motion } from 'motion/react';

interface FilterControlsProps {
  classes: StudentClass[];
  selectedClassId: string;
  onClassChange: (classId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onHadirSemua: () => void;
  onResetSemua: () => void;
}

export default function FilterControls({
  classes,
  selectedClassId,
  onClassChange,
  searchQuery,
  onSearchChange,
  onHadirSemua,
  onResetSemua,
}: FilterControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      id="filter-controls-container"
      className="bg-white p-4 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-stone-100/80 flex flex-col gap-4 mt-2"
    >
      {/* Search & Class Selector (Row / Stack) */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
          <input
            id="search-students-input"
            type="text"
            placeholder="Cari nama siswa..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#F2F2F7] text-stone-800 text-sm pl-10 pr-4 py-2.5 rounded-full border border-transparent focus:bg-white focus:border-stone-200 focus:outline-none focus:ring-4 focus:ring-[#FFD700]/15 transition-all placeholder-stone-400"
          />
        </div>

        {/* Dropdown Select Class - "Pilih Kelas" */}
        <div className="relative min-w-[140px]">
          <select
            id="class-selector"
            value={selectedClassId}
            onChange={(e) => onClassChange(e.target.value)}
            className="w-full appearance-none bg-white text-stone-800 text-sm pl-4 pr-10 py-2.5 rounded-full border border-stone-200/80 focus:outline-none focus:border-stone-300 focus:ring-4 focus:ring-[#FFD700]/15 transition-all cursor-pointer font-medium"
          >
            <option value="all">Semua Kelas</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                Kelas {cls.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none"
            size={14}
          />
        </div>
      </div>

      {/* Action Buttons for Educators on Mobile */}
      <div className="flex items-center justify-between border-t border-stone-100 pt-3 flex-wrap gap-2 text-xs">
        <span className="text-[#8E8E93] font-medium tracking-wider uppercase text-[10px]">
          AKSI BULK
        </span>
        <div className="flex items-center gap-2">
          {/* Reset button */}
          <motion.button
            whileHover={{ scale: 1.025, y: -0.5 }}
            whileTap={{ scale: 0.975 }}
            id="btn-reset-semua"
            type="button"
            onClick={onResetSemua}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 font-medium bg-white hover:bg-stone-50 transition cursor-pointer"
          >
            <RefreshCw size={12} />
            Kosongkan Absen
          </motion.button>
          
          {/* Hadir Semua button */}
          <motion.button
            whileHover={{ scale: 1.025, y: -0.5 }}
            whileTap={{ scale: 0.975 }}
            id="btn-hadir-semua"
            type="button"
            onClick={onHadirSemua}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#1A1A1A] font-semibold transition shadow-[0_2px_8px_rgba(255,215,0,0.15)] cursor-pointer"
          >
            <CheckCheck size={13} strokeWidth={2.5} />
            Hadir Semua
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
