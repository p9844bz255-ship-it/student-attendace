import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DateSwitcherProps {
  currentDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export default function DateSwitcher({ currentDate, onDateChange }: DateSwitcherProps) {
  // Modal toggle state (Real HTML-free Date Picker dialog)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempDate, setTempDate] = useState(currentDate);

  // States for the calendar year and month displayed in the picker
  const [calendarYear, setCalendarYear] = useState(() => new Date(currentDate).getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(currentDate).getMonth());

  const [anchorDate, setAnchorDate] = useState(() => new Date(currentDate));

  // Sync anchor when currentDate moves significantly beyond the current 21-day window
  useEffect(() => {
    const cur = new Date(currentDate);
    const anch = new Date(anchorDate);
    const diff = Math.abs(cur.getTime() - anch.getTime());
    const diffDays = diff / (1000 * 60 * 60 * 24);
    if (diffDays > 9) {
      setAnchorDate(cur);
    }
  }, [currentDate, anchorDate]);

  // Keep internal tempDate in sync when currentDate changes externally
  useEffect(() => {
    setTempDate(currentDate);
    setCalendarYear(new Date(currentDate).getFullYear());
    setCalendarMonth(new Date(currentDate).getMonth());
  }, [currentDate, isModalOpen]);

  // Helper to format Date target string
  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generate dynamic 21-day (3 weeks) fast select tabs for easy scrollability
  const getDaysArray = (anchor: Date) => {
    const days = [];
    const base = new Date(anchor);
    // Center is 0 (anchorDate). We go from -10 to +10, which represents 21 days total (3 weeks)
    for (let i = -10; i <= 10; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const daysList = getDaysArray(anchorDate);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const isFirstRender = React.useRef(true);

  useEffect(() => {
    if (containerRef.current) {
      const activeBtn = containerRef.current.querySelector(`#shortcut-date-${currentDate}`);
      if (activeBtn) {
        activeBtn.scrollIntoView({
          behavior: isFirstRender.current ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'center'
        });
        isFirstRender.current = false;
      }
    }
  }, [currentDate]);

  const getIndonesianDayName = (date: Date) => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return days[date.getDay()];
  };

  const handleArrowChange = (offset: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + offset);
    onDateChange(formatDateString(d));
  };

  const getActiveDateFriendlyLabel = () => {
    const todayStr = formatDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateString(yesterday);

    if (currentDate === todayStr) {
      return 'Hari Ini (Today)';
    } else if (currentDate === yesterdayStr) {
      return 'Kemarin (Yesterday)';
    }

    const d = new Date(currentDate);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Generate grid cells (42 cells: prev month padding + active month days + next month padding)
  const daysGrid = React.useMemo(() => {
    const cells = [];
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const firstDayOfWeek = firstDay.getDay(); // index 0 (Sunday) to 6 (Saturday)

    // Previous month info
    const prevMonth = new Date(calendarYear, calendarMonth, 0);
    const prevMonthDaysCount = prevMonth.getDate();

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dNum = prevMonthDaysCount - i;
      const targetDate = new Date(calendarYear, calendarMonth - 1, dNum);
      cells.push({
        dayNumber: dNum,
        dateString: formatDateString(targetDate),
        isCurrentMonth: false,
      });
    }

    // Active month info
    const activeMonthDaysCount = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    for (let i = 1; i <= activeMonthDaysCount; i++) {
      const targetDate = new Date(calendarYear, calendarMonth, i);
      cells.push({
        dayNumber: i,
        dateString: formatDateString(targetDate),
        isCurrentMonth: true,
      });
    }

    // Next month info
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const targetDate = new Date(calendarYear, calendarMonth + 1, i);
      cells.push({
        dayNumber: i,
        dateString: formatDateString(targetDate),
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [calendarYear, calendarMonth]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((prev) => prev - 1);
    } else {
      setCalendarMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((prev) => prev + 1);
    } else {
      setCalendarMonth((prev) => prev + 1);
    }
  };

  const selectDateInGrid = (dateString: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return; // Disallow selecting faded prev/next month dates in active screen grid
    setTempDate(dateString);
  };

  const handleOkSubmit = () => {
    onDateChange(tempDate);
    setIsModalOpen(false);
  };

  // System Current Today Date (For focus styling "12" outline)
  const systemTodayString = formatDateString(new Date());

  return (
    <div
      id="date-switcher-container"
      className="bg-white p-4 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-stone-100/80 flex flex-col gap-3 selection:bg-stone-100"
    >
      {/* Date Header Slider controls */}
      <div className="flex items-center justify-between">
        <div className="w-10 h-10" /> {/* Centering spacer replacing prev arrow as requested */}

        <div className="flex flex-col items-center text-center">
          <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">
            TANGGAL ABSENSI
          </span>
          <span className="text-sm font-semibold text-[#1A1A1A] mt-0.5">
            {getActiveDateFriendlyLabel()}
          </span>
        </div>

        {/* Clean trigger to activate Custom Popup Modal */}
        <div className="relative">
          <button
            id="btn-trigger-picker"
            type="button"
            onClick={() => {
              setTempDate(currentDate);
              setIsModalOpen(true);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-stone-600 bg-stone-50 hover:bg-[#FFD700] hover:text-[#1A1A1A] active:scale-95 transition cursor-pointer"
          >
            <Calendar size={18} />
          </button>
        </div>
      </div>

      {/* 7-Day Fast Select Pills for Mobile Tab Navigation (Horizontal Scrollable) */}
      <div ref={containerRef} className="flex overflow-x-auto no-scrollbar scroll-smooth gap-1 bg-stone-50/70 p-1 rounded-2xl border border-stone-200/40 w-full">
        {daysList.map((day) => {
          const formatted = formatDateString(day);
          const isSelected = formatted === currentDate;
          const isToday = formatted === systemTodayString;

          return (
            <button
              id={`shortcut-date-${formatted}`}
              key={formatted}
              type="button"
              onClick={() => onDateChange(formatted)}
              className={`flex-1 min-w-[48px] shrink-0 flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-white font-bold scale-[1.02]'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <span className="text-[10px] font-medium opacity-75">
                {getIndonesianDayName(day)}
              </span>
              <span className="text-sm font-semibold tracking-tight mt-0.5">
                {day.getDate()}
              </span>
              {isToday && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Reka Bentuk UI Pop-up Pemilih Tanggal (Fidelitas Tinggi) */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            id="date-picker-overlay-scrim"
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[999] flex items-center justify-center p-4"
          >
            {/* Click outside to cancel */}
            <div
              id="date-picker-click-scrim"
              className="absolute inset-0 cursor-default"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Main Pop-up Dialog Panel */}
            <motion.div
              id="date-picker-dialog-panel"
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-[32px] w-[#340px] max-w-full p-6 shadow-2xl border border-stone-100 relative flex flex-col gap-5 z-10 select-none overflow-hidden"
            >
              {/* Header: Pilih Tanggal & X button */}
              <div id="date-picker-header" className="flex items-center justify-between">
                <span className="text-md font-bold text-[#1A1B1F] tracking-tight">
                  Pilih Tanggal
                </span>
                <button
                  id="date-picker-close-btn"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 hover:text-[#1A1A1A] active:scale-95 transition"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Month / Year Navigator */}
              <div id="date-picker-nav" className="flex items-center justify-between px-1">
                <button
                  id="date-picker-prev-month"
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-100 active:scale-90 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <span id="date-picker-month-label" className="text-sm font-bold text-[#1A1B1F]">
                  {INDONESIAN_MONTHS[calendarMonth]} {calendarYear}
                </span>
                <button
                  id="date-picker-next-month"
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-100 active:scale-90 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Grid: Day Names Header (Su Mo Tu We Th Fr Sa) */}
              <div id="date-picker-days-header" className="grid grid-cols-7 gap-y-1 justify-items-center text-[10px] font-bold text-stone-400 uppercase tracking-wider px-0.5">
                <span>Su</span>
                <span>Mo</span>
                <span>Tu</span>
                <span>We</span>
                <span>Th</span>
                <span>Fr</span>
                <span>Sa</span>
              </div>

              {/* Grid: Calendar Dates Matrix */}
              <div id="date-picker-calendar-grid" className="grid grid-cols-7 gap-y-2 gap-x-1.5 justify-items-center px-0.5">
                {daysGrid.map((cell, idx) => {
                  const isSelected = cell.dateString === tempDate;
                  const isTodayFocus = cell.dateString === systemTodayString;
                  const isCurrentMonth = cell.isCurrentMonth;
                  const key = `cell-${cell.dateString}-${idx}`;

                  return (
                    <button
                      id={`picker-cell-${cell.dateString}`}
                      key={key}
                      type="button"
                      disabled={!isCurrentMonth}
                      onClick={() => selectDateInGrid(cell.dateString, isCurrentMonth)}
                      className={`relative w-8.5 h-8.5 sm:w-9 sm:h-9 flex items-center justify-center text-xs font-semibold rounded-full transition-all focus:outline-none ${
                        !isCurrentMonth
                          ? 'text-stone-300 cursor-not-allowed font-normal'
                          : isSelected
                            ? 'bg-[#FFD700] text-black font-extrabold shadow-sm scale-105'
                            : isTodayFocus
                              ? 'border border-stone-350 text-[#1A1A1A] hover:bg-stone-50'
                              : 'text-stone-700 hover:bg-stone-100 text-stone-800'
                      }`}
                    >
                      <span>{cell.dayNumber}</span>
                    </button>
                  );
                })}
              </div>

              {/* Footer Actions (Batal & OK Capsule) */}
              <div id="date-picker-footer" className="flex items-center justify-between pt-2 border-t border-stone-100 mt-1">
                <button
                  id="date-picker-cancel-btn"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors px-3 py-2"
                >
                  Batal
                </button>

                <button
                  id="date-picker-confirm-btn"
                  type="button"
                  onClick={handleOkSubmit}
                  className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-bold text-xs uppercase px-7 py-2.5 rounded-full shadow-sm hover:shadow-md transition active:scale-95"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
