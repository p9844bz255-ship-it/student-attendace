import React, { useState, useMemo } from 'react';
import { X, Calendar, Download, Loader2, Search, FileText, Check, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { Student, StudentClass, AttendanceStatus } from '../types';
import DateRangePickerModal from './DateRangePickerModal';

interface DownloadRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: StudentClass[];
  students: Student[];
  attendanceRecords: Record<string, Record<string, AttendanceStatus>>;
  attendanceNotes: Record<string, Record<string, string>>;
  initialLevel?: 'Semua' | 'SMP' | 'SMA';
  initialClassId?: string;
}

export default function DownloadRecordsModal({
  isOpen,
  onClose,
  classes,
  students,
  attendanceRecords,
  attendanceNotes,
  initialLevel,
  initialClassId,
}: DownloadRecordsModalProps) {
  // ---- 1. STATES ----
  const [localStartDate, setLocalStartDate] = useState<string>(() => {
    // Default: 7 days ago
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const rYear = d.getFullYear();
    const rMonth = String(d.getMonth() + 1).padStart(2, '0');
    const rDay = String(d.getDate()).padStart(2, '0');
    return `${rYear}-${rMonth}-${rDay}`;
  });

  const [localEndDate, setLocalEndDate] = useState<string>(() => {
    const d = new Date();
    const rYear = d.getFullYear();
    const rMonth = String(d.getMonth() + 1).padStart(2, '0');
    const rDay = String(d.getDate()).padStart(2, '0');
    return `${rYear}-${rMonth}-${rDay}`;
  });

  const [selectedLevel, setSelectedLevel] = useState<'Semua' | 'SMP' | 'SMA'>(
    initialLevel || 'Semua'
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || 'all'
  );
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Custom interactive state requirements
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  // Helper classification methods consistent with TeacherDashboard
  const isSMPClass = (className: string) => {
    const match = className.trim().match(/^(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num === 7 || num === 8 || num === 9;
    }
    return false;
  };

  const isSMAClass = (className: string) => {
    const match = className.trim().match(/^(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num === 10 || num === 11 || num === 12;
    }
    return false;
  };

  // ---- 2. DYNAMIC FILTERS ----
  // Filter classes based on selectedLevel
  const filteredClasses = useMemo(() => {
    if (selectedLevel === 'SMP') {
      return classes.filter((cls) => isSMPClass(cls.name));
    }
    if (selectedLevel === 'SMA') {
      return classes.filter((cls) => isSMAClass(cls.name));
    }
    return classes;
  }, [classes, selectedLevel]);

  // Adjust class select state if the previously selected class doesn't belong to the new filtered list
  React.useEffect(() => {
    if (selectedClassId !== 'all') {
      const exists = filteredClasses.some((c) => c.id === selectedClassId);
      if (!exists) {
        setSelectedClassId('all');
      }
    }
  }, [filteredClasses, selectedClassId]);

  // Filter students based on level, class, and optionally searchable name query
  const filteredStudentsForDropdown = useMemo(() => {
    return students.filter((std) => {
      // 1. Level Filter
      const className = classes.find((c) => c.id === std.classId)?.name || '';
      if (selectedLevel === 'SMP' && !isSMPClass(className)) return false;
      if (selectedLevel === 'SMA' && !isSMAClass(className)) return false;

      // 2. Class Filter
      if (selectedClassId !== 'all' && std.classId !== selectedClassId) return false;

      // 3. Search Term
      if (
        searchStudentQuery.trim() &&
        !std.name.toLowerCase().includes(searchStudentQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [students, classes, selectedLevel, selectedClassId, searchStudentQuery]);

  // Reset student selection if it falls out of filtered students list
  React.useEffect(() => {
    if (selectedStudentId !== 'all') {
      const exists = filteredStudentsForDropdown.some((s) => s.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId('all');
      }
    }
  }, [filteredStudentsForDropdown, selectedStudentId]);

  // Duration in days
  const durationDays = useMemo(() => {
    const start = new Date(localStartDate);
    const end = new Date(localEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diff / (1000 * 3600 * 24)) + 1);
  }, [localStartDate, localEndDate]);

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

  if (!isOpen) return null;

  // ---- 3. GENERATION CONFIRMATION DIALOG TRIGGER ----
  const triggerPdfGenerationFlow = () => {
    if (filteredStudentsForDropdown.length === 0) return;
    setShowConfirm(true);
  };

  const handleSureDownload = () => {
    setShowConfirm(false);
    handleGeneratePDF();
    onClose();
  };

  // ---- 4. GENERATE PDF LOGIC ----
  const handleGeneratePDF = async () => {
    setIsGenerating(true);

    try {
      // Determine date array in range
      const datesInRange: string[] = [];
      let current = new Date(localStartDate);
      const end = new Date(localEndDate);
      while (current <= end) {
        datesInRange.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      // Determine final list of students to fetch records for
      const targetStudents = students.filter((std) => {
        // Level filter
        const className = classes.find((c) => c.id === std.classId)?.name || '';
        if (selectedLevel === 'SMP' && !isSMPClass(className)) return false;
        if (selectedLevel === 'SMA' && !isSMAClass(className)) return false;

        // Class filter
        if (selectedClassId !== 'all' && std.classId !== selectedClassId) return false;

        // Specific Student selection
        if (selectedStudentId !== 'all' && std.id !== selectedStudentId) return false;

        return true;
      });

      // Aggregate all attendance logs
      const pdfRows: Array<{
        name: string;
        kelas: string;
        date: string;
        hadir: string;
        izin: string;
        sakit: string;
        alpa: string;
        note: string;
      }> = [];

      let totalKeys = 0;
      let countHadir = 0;
      let countIzin = 0;
      let countSakit = 0;
      let countAlpa = 0;

      // Group by student then date
      for (const dStr of datesInRange) {
        const dRecords = attendanceRecords[dStr] || {};
        const dNotes = attendanceNotes[dStr] || {};

        for (const std of targetStudents) {
          const status = dRecords[std.id];
          if (status) {
            totalKeys++;
            if (status === 'Hadir') countHadir++;
            else if (status === 'Izin') countIzin++;
            else if (status === 'Sakit') countSakit++;
            else if (status === 'Alpa') countAlpa++;

            const stdClassName = classes.find((c) => c.id === std.classId)?.name || std.classId;
            const note = dNotes[std.id] || '';

            // Format Date for table
            let formattedDate = dStr;
            try {
              const dt = new Date(dStr);
              if (!isNaN(dt.getTime())) {
                const day = String(dt.getDate()).padStart(2, '0');
                const monthsInIndo = [
                  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
                  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
                ];
                formattedDate = `${day} ${monthsInIndo[dt.getMonth()]} ${dt.getFullYear()}`;
              }
            } catch (_) {}

            pdfRows.push({
              name: std.name,
              kelas: stdClassName,
              date: formattedDate,
              hadir: status === 'Hadir' ? '✓' : '',
              izin: status === 'Izin' ? '✓' : '',
              sakit: status === 'Sakit' ? '✓' : '',
              alpa: status === 'Alpa' ? '✓' : '',
              note: note,
            });
          }
        }
      }

      // Sort rows by name then date
      pdfRows.sort((a, b) => {
        const nameComp = a.name.localeCompare(b.name);
        if (nameComp !== 0) return nameComp;
        return a.date.localeCompare(b.date);
      });

      // Calculate attendance rate
      const totalTicks = countHadir + countIzin + countSakit + countAlpa;
      const rateKehadiran = totalTicks > 0 ? Math.round(((countHadir + countIzin + countSakit) / totalTicks) * 100) : 0;

      // Create jsPDF document (A4, portrait)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Fetch School Logo as Base64 to draw beautifully on header
      const schoolLogoUrl = 'https://www.image2url.com/r2/default/images/1778032976429-fb84224a-3e08-4092-b38f-529e608a47d2.png';
      let base64Logo = '';
      try {
        const res = await fetch(schoolLogoUrl, { referrerPolicy: 'no-referrer' });
        const blob = await res.blob();
        base64Logo = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('Failed to load logo on client-side, using elegant custom letterhead text instead', e);
      }

      // ---- 5. DRAW HEADER SECTION ----
      let currentY = 12;

      if (base64Logo) {
        doc.addImage(base64Logo, 'PNG', 14, currentY, 15, 15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(110, 110, 110);
        doc.text('Student Attendance', 34, currentY + 3);

        doc.setFontSize(14);
        doc.setTextColor(26, 26, 26);
        doc.text('AL-WILDAN ISLAMIC SCHOOL 3 BSD CITY', 34, currentY + 8.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Primary & Secondary Education Division • BSD City Tangerang Selatan', 34, currentY + 13);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(26, 26, 26);
        doc.text('AL-WILDAN ISLAMIC SCHOOL 3 BSD CITY', 14, currentY + 4);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(110, 110, 110);
        doc.text('Student Attendance Report', 14, currentY + 10);
      }

      currentY += 18;

      // Draw Theme-Yellow (Amber Gold) Horizontal Line matching brand
      doc.setDrawColor(218, 165, 32); 
      doc.setLineWidth(1.0);
      doc.line(14, currentY, 196, currentY);

      currentY += 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('LAPORAN PARAMETER:', 14, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      
      const formatNicePeriodStr = (start: string, end: string) => {
        try {
          const sDate = new Date(start);
          const eDate = new Date(end);
          const monthsInIndo = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];
          return `${sDate.getDate()} ${monthsInIndo[sDate.getMonth()]} ${sDate.getFullYear()} s.d ${eDate.getDate()} ${monthsInIndo[eDate.getMonth()]} ${eDate.getFullYear()}`;
        } catch (_) {
          return `${start} s.d ${end}`;
        }
      };

      doc.text(`Periode Laporan :  ${formatNicePeriodStr(localStartDate, localEndDate)} (${durationDays} Hari)`, 14, currentY + 4);
      doc.text(`Tingkat Sekolah  :  ${selectedLevel === 'Semua' ? 'SMP & SMA (Semua)' : selectedLevel}`, 14, currentY + 8);
      
      const classLabel = selectedClassId === 'all' 
        ? 'Semua Kelas' 
        : (classes.find(c => c.id === selectedClassId)?.name || selectedClassId);
      doc.text(`Kelas Terfilter     :  ${classLabel}`, 14, currentY + 12);

      const studentLabel = selectedStudentId === 'all'
        ? (searchStudentQuery.trim() ? `Semua (Pencarian: "${searchStudentQuery}")` : 'Semua Siswa')
        : (students.find(s => s.id === selectedStudentId)?.name || 'Semua');
      doc.text(`Nama Siswa       :  ${studentLabel}`, 14, currentY + 16);

      currentY += 23;

      // ---- 6. DRAW STATS CARDS SECTION WITH NEUTRAL COLORS (NO GREEN/RED) ----
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('RINGKASAN REKAPITULASI ABSENSIONAL:', 14, currentY);

      currentY += 3.5;

      const stats = [
        { label: 'Total Siswa', value: `${targetStudents.length}`, color: [40, 40, 40] },
        { label: 'Total Kehadiran', value: `${countHadir}`, color: [40, 40, 40] },
        { label: 'Izin / Sakit', value: `${countIzin + countSakit}`, color: [40, 40, 40] },
        { label: 'Alpa (Tanpa Ket)', value: `${countAlpa}`, color: [40, 40, 40] },
        { label: 'Rate Kehadiran', value: `${rateKehadiran}%`, color: [40, 40, 40] }
      ];

      const colWidth = 33.5;
      const colGap = 3.52;
      const neutralYellowTheme = [218, 165, 32]; // Pure Golden Theme

      for (let i = 0; i < stats.length; i++) {
        const stat = stats[i];
        const xCoord = 14 + i * (colWidth + colGap);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(xCoord, currentY, colWidth, 14, 2, 2, 'FD');

        // Draw Left Theme-Yellow accent border for all cards (clean, consistent neutral-yellow)
        doc.setFillColor(neutralYellowTheme[0], neutralYellowTheme[1], neutralYellowTheme[2]);
        doc.rect(xCoord, currentY, 1.2, 14, 'F');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(110, 110, 110);
        doc.text(stat.label.toUpperCase(), xCoord + 3, currentY + 4.5);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
        doc.text(stat.value, xCoord + 3, currentY + 11);
      }

      currentY += 21;

      // ---- 7. DRAW TABLE SECTION WITH ALTERNATING GROUPING ----
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('DAFTAR REKAPAN ABSENSI DETAIL:', 14, currentY);

      // Precalculate a studentName background mapping for grouped rows structure
      const studentBgColorMap: Record<string, [number, number, number]> = {};
      let isEvenGroup = true;
      let lastStudentName = '';

      pdfRows.forEach((row) => {
        if (row.name !== lastStudentName) {
          isEvenGroup = !isEvenGroup;
          lastStudentName = row.name;
        }
        studentBgColorMap[row.name] = isEvenGroup 
          ? [245, 245, 247] // Soft light grey
          : [255, 255, 255]; // Pure White
      });

      autoTable(doc, {
        startY: currentY + 3.5,
        head: [['No', 'Nama Siswa', 'Kelas', 'Tanggal', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Keterangan']],
        body: pdfRows.map((row, index) => [
          index + 1,
          row.name,
          row.kelas,
          row.date,
          row.hadir,
          row.izin,
          row.sakit,
          row.alpa,
          row.note || '-',
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: [30, 30, 30], 
          textColor: [218, 165, 32], 
          fontSize: 8.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 }, // Perfect size for 'No'
          1: { fontStyle: 'bold', cellWidth: 42 },
          2: { halign: 'center', cellWidth: 16 },
          3: { halign: 'center', cellWidth: 22 },
          4: { halign: 'center', cellWidth: 15, textColor: [30, 30, 30] }, // Spacious room for 'Hadir'
          5: { halign: 'center', cellWidth: 14, textColor: [30, 30, 30] }, // Spacious room for 'Izin'
          6: { halign: 'center', cellWidth: 15, textColor: [30, 30, 30] }, // Spacious room for 'Sakit'
          7: { halign: 'center', cellWidth: 14, textColor: [30, 30, 30] }, // Spacious room for 'Alpa'
          8: { cellWidth: 'auto', fontSize: 7.5 }
        },
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2.2,
          textColor: [40, 40, 40],
        },
        margin: { top: 15, bottom: 20 },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const studentName = data.row.raw[1]; // Index 1 represents student's name
            if (studentName && studentBgColorMap[studentName]) {
              data.cell.styles.fillColor = studentBgColorMap[studentName];
            }

            // Intercept checkmark to build high-fidelity custom drawn vector representation instead of broken PDF font fallback
            if ([4, 5, 6, 7].includes(data.column.index) && data.cell.text && data.cell.text[0] === '✓') {
              (data.cell as any).hasCheckmarkToDraw = true;
              data.cell.text = []; // Clear standard textual character to hide dot fallback
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && (data.cell as any).hasCheckmarkToDraw) {
            // Precise vector drawing inside cell coordinate space
            const x = data.cell.x + data.cell.width / 2;
            const y = data.cell.y + data.cell.height / 2;

            doc.setDrawColor(30, 41, 59); // Slate-800 color theme
            doc.setLineWidth(0.4);
            // Draw neat checkmark (down-right stroke, then longer up-right stroke)
            doc.line(x - 1.2, y + 0.2, x - 0.4, y + 1.2);
            doc.line(x - 0.4, y + 1.2, x + 1.4, y - 0.8);
          }
        },
        didDrawPage: (data) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(160, 160, 160);
          
          doc.setDrawColor(240, 240, 240);
          doc.line(14, 282, 196, 282);
          
          doc.text(`Halaman ${data.pageNumber}`, 196, 287, { align: 'right' });
          doc.text('Laporan Kehadiran Resmi • AL-WILDAN ISLAMIC SCHOOL 3 BSD CITY', 14, 287);
        }
      });

      const formattedFileName = `Records_Absensi_${selectedLevel.toUpperCase()}_${localStartDate}_to_${localEndDate}.pdf`;
      doc.save(formattedFileName);

    } catch (err) {
      console.error('Ada masalah saat download PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div id="download-records-modal-root" className="contents">
        <motion.div
          id="download-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop closer click */}
          <div className="absolute inset-0 cursor-default" onClick={onClose} />

          <motion.div
            id="download-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-100 flex flex-col max-h-[85vh] relative z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="p-5.5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFD700]/15 text-[#705d00] flex items-center justify-center flex-shrink-0">
                  <FileText size={16} />
                </div>
                <h3 className="font-extrabold text-sm tracking-tight text-[#1A1A1A]">Download Records Report</h3>
              </div>
              <button
                id="btn-close-download-modal"
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 transition cursor-pointer flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Internal Content Body with Scrollable controls */}
            <div id="download-form-body" className="p-5.5 flex-grow overflow-y-auto space-y-4 no-scrollbar">
              
              {/* Modern Airbnb/Traveloka Date Selection Banner Trigger */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
                  Rentang Waktu Laporan (Dari - Sampai)
                </span>
                <button
                  id="btn-trigger-traveloka-date"
                  type="button"
                  onClick={() => setIsDatePickerOpen(true)}
                  className="w-full flex items-center justify-between text-left bg-stone-50 border border-stone-200/80 hover:border-amber-400 focus:outline-none rounded-2xl p-4 transition-all duration-200 shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FFD700]/15 text-[#705d00] flex items-center justify-center flex-shrink-0">
                      <Calendar size={17} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-850 leading-tight">
                        {formatDateText(localStartDate)} — {formatDateText(localEndDate)}
                      </p>
                      <p className="text-[10px] text-stone-400 font-semibold mt-1">
                        Lama Durasi: <span className="text-[#8B7000]">{durationDays} Hari Dipilih</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#8B7000] bg-[#FFD700]/20 hover:bg-[#FFD700]/30 px-3 py-1 rounded-full border border-[#FFD700]/25 transition flex-shrink-0">
                    Ubah
                  </span>
                </button>
              </div>

              {/* Level Filter (Jenjang: Semua, SMP, SMA) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
                  Jenjang Sekolah
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['Semua', 'SMP', 'SMA'] as const).map((level) => {
                    const isActive = selectedLevel === level;
                    return (
                      <button
                        id={`btn-pdf-level-${level}`}
                        key={level}
                        type="button"
                        onClick={() => setSelectedLevel(level)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                          isActive
                            ? 'bg-stone-900 border-stone-900 text-[#FFD700] shadow-sm font-extrabold'
                            : 'bg-white border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Class Filter (Styled exactly like the beautiful class picker popup in TeacherDashboard / halaman absensi siswa) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
                  Kelas (Sesuai Jenjang Pilihan)
                </span>
                <button
                  id="pdf-class-selector-trigger"
                  type="button"
                  onClick={() => setIsClassModalOpen(true)}
                  className="w-full bg-stone-50 border border-stone-200 hover:border-amber-400 focus:outline-none rounded-2xl p-4 flex items-center justify-between text-left transition-all duration-200 shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FFD700]/15 text-[#705d00] flex items-center justify-center flex-shrink-0 font-black">
                      K
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-850 leading-tight">
                        {selectedClassId === 'all'
                          ? `Semua Kelas (${selectedLevel})`
                          : `Kelas ${classes.find((c) => c.id === selectedClassId)?.name || ''}`}
                      </p>
                      <p className="text-[10px] text-stone-400 font-semibold mt-1">
                        Pilihan Aktif
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-stone-500 shrink-0 ml-1" />
                </button>
              </div>

              {/* Student Search Box */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="pdf-student-search" className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
                    Nama Siswa (Searchable)
                  </label>
                  {selectedStudentId !== 'all' && (
                    <button
                      onClick={() => setSelectedStudentId('all')}
                      className="text-[10px] text-amber-600 font-extrabold hover:underline cursor-pointer"
                    >
                      Reset pilihan
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    id="pdf-student-search"
                    type="text"
                    placeholder="Mulai ketik untuk mencari nama..."
                    value={searchStudentQuery}
                    onChange={(e) => setSearchStudentQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#FFD700]/25 transition-all placeholder-stone-400 font-semibold"
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={12.5} />
                </div>

                {/* Filtered lists container */}
                <div className="flex flex-col gap-1 max-h-[110px] overflow-y-auto border border-stone-200/50 rounded-xl p-1.5 bg-stone-50/50 mt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId('all')}
                    className={`flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                      selectedStudentId === 'all'
                        ? 'bg-amber-500/10 text-[#7c6600]'
                        : 'text-stone-600 hover:bg-stone-100/80'
                    }`}
                  >
                    <span>-- Semua {filteredStudentsForDropdown.length} Siswa Terfilter --</span>
                    {selectedStudentId === 'all' && <Check size={11} strokeWidth={2.5} className="text-[#7c6600]" />}
                  </button>

                  {filteredStudentsForDropdown.map((std) => {
                    const isChosen = selectedStudentId === std.id;
                    const stdClass = classes.find((c) => c.id === std.classId)?.name || std.classId;
                    return (
                      <button
                        key={std.id}
                        type="button"
                        onClick={() => setSelectedStudentId(std.id)}
                        className={`flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition ${
                          isChosen
                            ? 'bg-amber-500/10 text-[#7c6600] font-bold'
                            : 'text-stone-600 hover:bg-stone-100/85'
                        }`}
                      >
                        <div>
                          <span className="font-semibold text-stone-800">{std.name}</span>
                          <span className="text-[9px] text-stone-400 ml-1.5">({stdClass})</span>
                        </div>
                        {isChosen && <Check size={11} strokeWidth={2.5} className="text-[#a18400]" />}
                      </button>
                    );
                  })}

                  {filteredStudentsForDropdown.length === 0 && (
                    <div className="text-center text-stone-400 text-[10px] py-4 font-semibold">
                      Tidak ada nama siswa sesuai filter.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Bottom Block Always Visible */}
            <div className="p-5 border-t border-stone-100 bg-stone-50 flex-shrink-0 flex flex-col gap-2">
              <button
                id="btn-process-download-pdf"
                type="button"
                disabled={isGenerating || filteredStudentsForDropdown.length === 0}
                onClick={triggerPdfGenerationFlow}
                className="w-full h-11 bg-stone-900 text-[#FFD700] hover:text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>
              <p className="text-[9px] text-center text-stone-400 font-medium">
                *PDF report generated automatically formatted for AL-WILDAN.
              </p>
            </div>
            
            {/* 5. "Are you sure?" confirmation dialogue absolute overlay nested nicely */}
            <AnimatePresence>
              {showConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4.5"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="bg-white rounded-[26px] p-6 shadow-2xl border border-stone-100 max-w-xs w-full text-center flex flex-col gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                      <FileText size={22} className="stroke-[2.5]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-stone-900 text-base">Are you sure?</h4>
                      <p className="text-stone-500 text-[11px] mt-1.5 leading-relaxed font-semibold">
                        Apakah Anda yakin ingin men-download seluruh rekam absensi siswa terpilih?
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 mt-1">
                      <button
                        type="button"
                        onClick={() => setShowConfirm(false)}
                        className="py-2.5 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-800 font-bold text-xs transition cursor-pointer"
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={handleSureDownload}
                        className="py-2.5 rounded-xl bg-stone-900 text-[#FFD700] hover:text-white font-extrabold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                      >
                        Sure
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Interactive Class Picker Pop-up */}
            <AnimatePresence>
              {isClassModalOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                >
                  {/* Backdrop Closer */}
                  <div className="absolute inset-0 cursor-default" onClick={() => setIsClassModalOpen(false)} />

                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 12 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 360 }}
                    className="bg-white rounded-[28px] w-full max-w-[290px] p-5 shadow-2xl border border-stone-150 relative flex flex-col gap-3.5 z-10 select-none overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-stone-900 tracking-tight uppercase">
                        Pilih Kelas ({selectedLevel})
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsClassModalOpen(false)}
                        className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 hover:text-stone-900 active:scale-95 transition cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Class List Options */}
                    <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto no-scrollbar py-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClassId('all');
                          setIsClassModalOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border ${
                          selectedClassId === 'all'
                            ? 'bg-[#FFD700] text-black border-[#FFD700] font-extrabold shadow-sm'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200/50'
                        }`}
                      >
                        <span>Semua Kelas</span>
                        {selectedClassId === 'all' && <Check size={13} strokeWidth={3} className="text-black" />}
                      </button>

                      {filteredClasses.map((cls) => {
                        const isSelected = cls.id === selectedClassId;
                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => {
                              setSelectedClassId(cls.id);
                              setIsClassModalOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all border ${
                              isSelected
                                ? 'bg-[#FFD700] text-[#1A1A1A] border-[#FFD700] font-extrabold shadow-sm'
                                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200/50'
                            }`}
                          >
                            <span>Kelas {cls.name}</span>
                            {isSelected && <Check size={13} strokeWidth={3} className="text-black" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-center text-[7.5px] text-stone-400 font-extrabold uppercase tracking-wide">
                      AL-WILDAN ISLAMIC SCHOOL 3
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Nested Traveloka Calendar picker */}
        <DateRangePickerModal
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          startDate={localStartDate}
          endDate={localEndDate}
          onApply={(start, end) => {
            setLocalStartDate(start);
            setLocalEndDate(end);
            setIsDatePickerOpen(false);
          }}
        />
      </div>
    </>
  );
}
