import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Calendar } from 'lucide-react';

interface DateRangePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onApply: (start: string, end: string) => void;
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function DateRangePickerModal({
  isOpen,
  onClose,
  startDate,
  endDate,
  onApply,
}: DateRangePickerModalProps) {
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Initialize calendar view month/year based on existing start date
  const [pickerYear, setPickerYear] = useState<number>(() => {
    const d = new Date(startDate || new Date());
    return d.getFullYear();
  });
  const [pickerMonth, setPickerMonth] = useState<number>(() => {
    const d = new Date(startDate || new Date());
    return d.getMonth();
  });

  // Sync state when modal is opened on a new range
  useEffect(() => {
    if (isOpen) {
      setTempStart(startDate);
      setTempEnd(endDate);
      const d = new Date(startDate || new Date());
      setPickerYear(d.getFullYear());
      setPickerMonth(d.getMonth());
    }
  }, [isOpen, startDate, endDate]);

  const dateToYMD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handlePrevMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((prev) => prev - 1);
    } else {
      setPickerMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((prev) => prev + 1);
    } else {
      setPickerMonth((prev) => prev + 1);
    }
  };

  // Generate the 42 cells grid (prev month tail, active month days, next month head)
  const calendarCells = useMemo(() => {
    const cells = [];
    const firstDay = new Date(pickerYear, pickerMonth, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0: Sunday, 1: Monday...

    const prevMonthObj = new Date(pickerYear, pickerMonth, 0);
    const prevMonthDaysCount = prevMonthObj.getDate();

    // Days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dNum = prevMonthDaysCount - i;
      const targetDate = new Date(pickerYear, pickerMonth - 1, dNum);
      cells.push({
        dayNumber: dNum,
        dateString: dateToYMD(targetDate),
        isCurrentMonth: false,
      });
    }

    // Days from active month
    const activeMonthDaysCount = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    for (let i = 1; i <= activeMonthDaysCount; i++) {
      const targetDate = new Date(pickerYear, pickerMonth, i);
      cells.push({
        dayNumber: i,
        dateString: dateToYMD(targetDate),
        isCurrentMonth: true,
      });
    }

    // Days from next month
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const targetDate = new Date(pickerYear, pickerMonth + 1, i);
      cells.push({
        dayNumber: i,
        dateString: dateToYMD(targetDate),
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [pickerYear, pickerMonth]);

  const handleDayClick = (dateStr: string) => {
    // If no start date, or both are selected, reset and set new start date
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd('');
    } else {
      // We have tempStart, but no tempEnd
      if (dateStr < tempStart) {
        // Clicked date is before start date, set as new start date
        setTempStart(dateStr);
      } else {
        // Set as end date
        setTempEnd(dateStr);
      }
    }
  };

  const handleReset = () => {
    // Set to original start default (last 30 days)
    const d = new Date();
    const endStr = dateToYMD(d);
    d.setDate(d.getDate() - 30);
    const startStr = dateToYMD(d);
    setTempStart(startStr);
    setTempEnd(endStr);
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onApply(tempStart, tempEnd);
      onClose();
    } else if (tempStart) {
      // If only start date chosen, set both to start date
      onApply(tempStart, tempStart);
      onClose();
    }
  };

  const formatDateText = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          {/* Back click scrim */}
          <div className="absolute inset-0 cursor-default" onClick={onClose} />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-[32px] w-[360px] max-w-full p-6 shadow-2xl border border-stone-100 relative flex flex-col gap-4 z-10 select-none text-stone-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-stone-900">
                  Pilih Rentang Tanggal
                </span>
                <span className="text-[11px] font-medium text-stone-400 mt-0.5">
                  Traveloka Style Range Picker
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 hover:text-stone-950 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Range Banner Display */}
            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 flex items-center justify-between gap-2">
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-bold text-stone-400 tracking-wider uppercase">MULAI</span>
                <span className="text-xs font-extrabold text-stone-800 mt-0.5">
                  {formatDateText(tempStart)}
                </span>
              </div>
              <div className="h-6 w-[2px] bg-stone-200/60" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] font-bold text-stone-400 tracking-wider uppercase">SAMPAI</span>
                <span className="text-xs font-extrabold text-stone-800 mt-0.5">
                  {tempEnd ? formatDateText(tempEnd) : (tempStart ? 'Pilih akhir...' : '-')}
                </span>
              </div>
            </div>

            {/* Month Scroller */}
            <div className="flex items-center justify-between mt-1 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-100 transition"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="text-sm font-black text-stone-800">
                {INDONESIAN_MONTHS[pickerMonth]} {pickerYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-100 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-y-1 justify-items-center text-[10px] font-bold text-stone-400 uppercase tracking-wider px-0.5 mt-1">
              <span className="text-rose-500">Min</span>
              <span>Sen</span>
              <span>Sel</span>
              <span>Rab</span>
              <span>Kam</span>
              <span>Jum</span>
              <span>Sab</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-1 px-0.5">
              {calendarCells.map((cell, idx) => {
                const isStart = cell.dateString === tempStart;
                const isEnd = cell.dateString === tempEnd;
                const isCurrentMonth = cell.isCurrentMonth;
                
                // Check if currently inside range
                const isInRange = tempStart && tempEnd && 
                  cell.dateString > tempStart && 
                  cell.dateString < tempEnd;
                
                // Hover highlight preview range (if start selected but no end yet)
                const isHovered = tempStart && !tempEnd && hoveredDate &&
                  cell.dateString > tempStart &&
                  cell.dateString <= hoveredDate;

                const isTodayFocus = cell.dateString === dateToYMD(new Date());

                return (
                  <button
                    key={`range-cell-${cell.dateString}-${idx}`}
                    type="button"
                    onClick={() => handleDayClick(cell.dateString)}
                    onMouseEnter={() => tempStart && !tempEnd && setHoveredDate(cell.dateString)}
                    onMouseLeave={() => setHoveredDate(null)}
                    className="relative w-full h-9.5 flex items-center justify-center text-xs font-semibold focus:outline-none group cursor-pointer"
                  >
                    {/* Range background highlighter */}
                    {(isInRange || isHovered) && (
                      <div className={`absolute inset-y-1 shadow-none transition-all ${
                        isInRange 
                          ? 'bg-[#FFD700]/15 border-y border-[#FFD700]/10 text-stone-900' 
                          : 'bg-[#FFD700]/10 text-stone-800 border-y border-[#FFD700]/5 border-dashed'
                      } ${
                        isStart || (isHovered && cell.dateString === tempStart)
                          ? 'left-1/2 rounded-l-none'
                          : isEnd || (isHovered && cell.dateString === hoveredDate)
                            ? 'right-1/2 rounded-r-none'
                            : 'left-0 right-0'
                      }`} />
                    )}

                    {/* Circular Day Capsule */}
                    <div className={`relative w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all z-10 ${
                      isStart || isEnd
                        ? 'bg-[#FFD700] text-[#1A1A1A] font-extrabold shadow-md scale-105'
                        : !isCurrentMonth
                          ? 'text-stone-300 font-normal hover:bg-stone-50'
                          : isTodayFocus
                            ? 'border border-stone-300 text-stone-800 hover:bg-stone-50'
                            : 'text-stone-700 hover:bg-stone-100 group-hover:scale-105'
                    }`}>
                      {cell.dayNumber}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-stone-500 hover:text-stone-950 px-3 py-2 flex items-center gap-1.5 transition-colors"
                title="Reset ke default 30 hari"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={!tempStart}
                className="bg-[#FFD700] hover:bg-[#FFD700]/90 disabled:opacity-45 disabled:cursor-not-allowed text-[#1A1A1A] font-bold text-xs uppercase px-7 py-2.5 rounded-full shadow-sm select-none transition-colors"
              >
                Terapkan
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
