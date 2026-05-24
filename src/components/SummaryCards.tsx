import React from 'react';
import { Users, CheckCircle2, FileClock, AlertCircle, TrendingUp } from 'lucide-react';
import { AttendanceSummary } from '../types';
import { motion } from 'motion/react';

interface SummaryCardsProps {
  summary: AttendanceSummary;
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      id: 'total-siswa',
      label: 'TOTAL SISWA',
      value: summary.total,
      icon: Users,
      bgColor: 'bg-[#FFD700]/15 text-[#705d00] border border-[#FFD700]/30',
    },
    {
      id: 'hadir',
      label: 'HADIR',
      value: summary.hadir,
      icon: CheckCircle2,
      bgColor: 'bg-[#FFD700]/15 text-[#705d00] border border-[#FFD700]/30',
    },
    {
      id: 'izin-sakit',
      label: 'IZIN & SAKIT',
      value: summary.izin + summary.sakit,
      icon: FileClock,
      bgColor: 'bg-[#FFD700]/15 text-[#705d00] border border-[#FFD700]/30',
    },
    {
      id: 'alpa',
      label: 'ALPA',
      value: summary.alpa,
      icon: AlertCircle,
      bgColor: 'bg-[#FFD700]/15 text-[#705d00] border border-[#FFD700]/30',
    },
    {
      id: 'persentase',
      label: 'PERSENTASE',
      value: `${summary.rate.toFixed(1)}%`,
      icon: TrendingUp,
      bgColor: 'bg-[#FFD700]/15 text-[#705d00] border border-[#FFD700]/30',
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
      id="summary-cards-container"
      className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mt-2"
    >
      {cards.map((card, idx) => {
        const Icon = card.icon;
        // The last card (percentage) spans full-width on tiny screens if odd number of cards
        const isLast = idx === cards.length - 1;
        return (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
              },
            }}
            whileHover={{ scale: 1.025, y: -2, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
            whileTap={{ scale: 0.975 }}
            id={`summary-card-${card.id}`}
            key={card.id}
            className={`cursor-default bg-white p-4 rounded-2xl flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-stone-100 ${
              isLast ? 'col-span-2 sm:col-span-1' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <Icon size={14} strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-bold text-[#1A1A1A] tracking-tight">
                {card.value}
              </span>
              {card.id === 'persentase' && (
                <span className="text-[10px] text-stone-500 font-normal">Hadir</span>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
