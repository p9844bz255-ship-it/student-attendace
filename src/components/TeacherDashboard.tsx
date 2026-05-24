import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  FileClock,
  AlertCircle,
  Users,
  Info,
  ChevronRight,
  ChevronLeft,
  Database,
  Grid,
  ClipboardCheck,
  Share2,
  MessageCircle,
  ArrowRight,
  FileSpreadsheet,
  TrendingUp,
  SlidersHorizontal,
  Plus,
  ArrowLeft,
  Mail,
  XCircle,
  Check,
  X,
  ChevronDown,
  Download
} from 'lucide-react';

import { Student, StudentClass, AttendanceStatus, AttendanceSummary } from '../types';
import DateSwitcher from './DateSwitcher';
import StudentAvatar from './StudentAvatar';
import DateRangePickerModal from './DateRangePickerModal';
import DownloadRecordsModal from './DownloadRecordsModal';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

interface TeacherDashboardProps {
  classes: StudentClass[];
  students: Student[];
  attendanceRecords: Record<string, Record<string, AttendanceStatus>>;
  setAttendanceRecords: React.Dispatch<React.SetStateAction<Record<string, Record<string, AttendanceStatus>>>>;
  attendanceNotes: Record<string, Record<string, string>>;
  setAttendanceNotes: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  educatorProfile: {
    email: string;
    name: string;
    role: string;
    school: string;
  };
  activeCategory?: 'SMP' | 'SMA';
  setActiveCategory?: (category: 'SMP' | 'SMA') => void;
  onBackToGatekeeper?: () => void;
}

export default function TeacherDashboard({
  classes,
  students,
  attendanceRecords,
  setAttendanceRecords,
  attendanceNotes,
  setAttendanceNotes,
  educatorProfile,
  activeCategory: propActiveCategory,
  setActiveCategory: propSetActiveCategory,
  onBackToGatekeeper
}: TeacherDashboardProps) {

  // ---- FILTER STATES ----
  const isSMPInput = (className: string) => {
    const match = className.trim().match(/^(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num === 7 || num === 8 || num === 9;
    }
    return false;
  };

  const isSMAInput = (className: string) => {
    const match = className.trim().match(/^(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      return num === 10 || num === 11 || num === 12;
    }
    return false;
  };

  // Determine starting active tab based on what classes are available in the loaded list
  const [localActiveCategory, setLocalActiveCategory] = useState<'SMP' | 'SMA'>(() => {
    const hasSmp = classes.some(cls => isSMPInput(cls.name));
    return hasSmp ? 'SMP' : 'SMA';
  });

  const activeCategory = propActiveCategory || localActiveCategory;
  const setActiveCategory = propSetActiveCategory || setLocalActiveCategory;

  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Automatically reset selectedClassId to 'all' if activeCategory changes
  useEffect(() => {
    const categoryClasses = classes.filter(cls => {
      if (activeCategory === 'SMP') return isSMPInput(cls.name);
      return isSMAInput(cls.name);
    });
    const isCurrentClassInActiveCategory = categoryClasses.some(cls => cls.id === selectedClassId);
    if (selectedClassId !== 'all' && !isCurrentClassInActiveCategory) {
      setSelectedClassId('all');
    }
  }, [activeCategory, classes]);

  const [currentDate, setCurrentDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  // Date Range is disabled as per client request, default to false
  const isRangeMode = false;
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  // Interactive search state inside attendance
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Info Student panel visibility
  const [showStudentInfo, setShowStudentInfo] = useState<boolean>(false);

  // Class picker modal visibility state
  const [isClassModalOpen, setIsClassModalOpen] = useState<boolean>(false);

  // Download records modal visibility state
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);

  // Notes state inside teacher view
  const [activeNoteStudentId, setActiveNoteStudentId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');

  // ---- INFORMASI SISWA (NEW SCREEN) STATES ----
  const [selectedDetailStudentId, setSelectedDetailStudentId] = useState<string | null>(null);
  const [isStudentLoading, setIsStudentLoading] = useState<boolean>(false);
  const [detailSearchQuery, setDetailSearchQuery] = useState<string>('');
  const [desktopStudentSearchQuery, setDesktopStudentSearchQuery] = useState<string>('');
  const [detailStartDate, setDetailStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // default to 30 days ago
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [detailEndDate, setDetailEndDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  // Custom Pop-up Date Picker States for Detail Student
  const [isRangePickerOpen, setIsRangePickerOpen] = useState<boolean>(false);

  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const [isHeaderScrolled, setIsHeaderScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setIsHeaderScrolled(false);
      return;
    }
    const handleScroll = () => {
      setIsHeaderScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDesktop]);

  // Trigger smooth shimmer transition when a student changes on desktop
  useEffect(() => {
    if (selectedDetailStudentId) {
      setIsStudentLoading(true);
      const timer = setTimeout(() => {
        setIsStudentLoading(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [selectedDetailStudentId]);

  // Auto-select first student when class is selected on Desktop
  useEffect(() => {
    if (isDesktop && selectedClassId !== 'all') {
      const classStudents = students.filter((student) => {
        const studentClass = classes.find((c) => c.id === student.classId);
        const studentClassName = studentClass ? studentClass.name : student.classId;
        if (activeCategory === 'SMP' && !isSMPInput(studentClassName)) return false;
        if (activeCategory === 'SMA' && !isSMAInput(studentClassName)) return false;
        return student.classId === selectedClassId;
      });

      if (classStudents.length > 0) {
        // If there's an active selection and they are in the class list, keep it; otherwise default to first
        const isCurrentStillInClass = classStudents.some(s => s.id === selectedDetailStudentId);
        if (!isCurrentStillInClass) {
          setSelectedDetailStudentId(classStudents[0].id);
        }
      } else {
        setSelectedDetailStudentId(null);
      }
    } else if (isDesktop && selectedClassId === 'all') {
      setSelectedDetailStudentId(null);
    }
  }, [selectedClassId, activeCategory, isDesktop, students, classes, selectedDetailStudentId]);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToastMsg = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // ---- UTILITY LOGICS ----
  const getInitials = (userName: string) => {
    return userName
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getIndonesianDayName = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[d.getDay()];
    } catch {
      return '';
    }
  };

  const formatIndonesianDateStr = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Ambil NISN dari database Firestore
  const getStudentNIS = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (student?.nisn) return student.nisn;
    if (student?.student_id) return student.student_id;
    
    const idPart = studentId.replace('std-', '');
    // If it's a numeric timestamp or string, let's turn it into a consistent 6-digit number
    const hash = idPart.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `1029${(hash % 900) + 100}`;
  };

  // ---- FILTERED STUDENTS & ABSEN RECORDS ----
  const currentClassStudents = useMemo(() => {
    if (selectedClassId === 'all') {
      return [];
    }
    return students.filter((student) => {
      // Find the class model to get its friendly name
      const studentClass = classes.find((c) => c.id === student.classId);
      const studentClassName = studentClass ? studentClass.name : student.classId;

      // 1. Tab category filter (SMP vs SMA) based on prefix numerals
      if (activeCategory === 'SMP' && !isSMPInput(studentClassName)) {
        return false;
      }
      if (activeCategory === 'SMA' && !isSMAInput(studentClassName)) {
        return false;
      }

      // 2. Class dropdown selector matching
      if (selectedClassId !== 'all' && student.classId !== selectedClassId) {
        return false;
      }
      // 3. Search term matching
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        if (!student.name.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [students, classes, activeCategory, selectedClassId, searchQuery]);

  // Handle individual status change
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => {
      const dayRecords = prev[currentDate] ? { ...prev[currentDate] } : {};
      
      // If same status clicked again, remove it (or keep it based on preference)
      if (dayRecords[studentId] === status) {
        delete dayRecords[studentId]; // Toggle off
      } else {
        dayRecords[studentId] = status;
      }

      return {
        ...prev,
        [currentDate]: dayRecords
      };
    });
  };

  // Toggle notes editor
  const openNoteEditor = (studentId: string, currentNote: string) => {
    setActiveNoteStudentId(studentId);
    setTempNoteText(currentNote || '');
  };

  const saveStudentNote = (studentId: string) => {
    setAttendanceNotes((prev) => {
      const dayNotes = prev[currentDate] ? { ...prev[currentDate] } : {};
      if (tempNoteText.trim() === '') {
        delete dayNotes[studentId];
      } else {
        dayNotes[studentId] = tempNoteText.trim();
      }
      return {
        ...prev,
        [currentDate]: dayNotes
      };
    });
    setActiveNoteStudentId(null);
    showToastMsg('Catatan absensi disimpan', 'info');
  };

  // ---- DATABASE SIMULATION SAVE ACTION ----
  const handleSaveToDatabase = async () => {
    if (selectedClassId === 'all') {
      showToastMsg('Silakan pilih kelas terlebih dahulu sebelum menyimpan absensi.', 'info');
      return;
    }

    try {
      const classStudents = students.filter((s) => s.classId === selectedClassId);
      
      if (classStudents.length === 0) {
        showToastMsg('Tidak ada siswa di kelas ini untuk disimpan.', 'info');
        return;
      }

      const batch = writeBatch(db);
      const currentRecords = attendanceRecords[currentDate] || {};
      const currentNotes = attendanceNotes[currentDate] || {};

      classStudents.forEach((student) => {
        const docId = `${currentDate}_${student.id}`;
        const docRef = doc(db, 'attendance', docId);

        const status = currentRecords[student.id] || '';
        const note = currentNotes[student.id] || '';

        batch.set(docRef, {
          date: currentDate,
          classId: selectedClassId,
          studentId: student.id,
          status: status,
          note: note,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `attendance`);
      }

      localStorage.setItem('prem_attendance_records', JSON.stringify(attendanceRecords));
      localStorage.setItem('prem_attendance_notes', JSON.stringify(attendanceNotes));
      
      showToastMsg('Alhamdulillah absensi berhasil disimpan', 'success');
    } catch (error) {
      console.error('Error saving attendance to Firestore:', error);
      showToastMsg('Gagal menyimpan absensi ke Cloud Database.', 'info');
    }
  };

  // ---- AUTO WA REPORT GENERATOR ----
  const generateWaText = () => {
    const activeClass = classes.find((c) => c.id === selectedClassId);
    const className = activeClass ? `Kelas ${activeClass.name}` : 'Semua Kelas';
    const dayLabel = getIndonesianDayName(currentDate);
    const formattedDate = formatIndonesianDateStr(currentDate);

    // Calculate details
    let totalHadir = 0;
    let totalIzin = 0;
    let totalSakit = 0;
    let totalAlpa = 0;
    let totalUnrecorded = 0;

    const currentRecords = attendanceRecords[currentDate] || {};
    const currentNotes = attendanceNotes[currentDate] || {};

    const absenteeList: string[] = [];

    currentClassStudents.forEach((student) => {
      const status = currentRecords[student.id];
      if (status === 'Hadir') totalHadir++;
      else if (status === 'Izin') {
        totalIzin++;
        const note = currentNotes[student.id] ? ` (${currentNotes[student.id]})` : '';
        absenteeList.push(`• *[Izin]* ${student.name}${note}`);
      } else if (status === 'Sakit') {
        totalSakit++;
        const note = currentNotes[student.id] ? ` (${currentNotes[student.id]})` : '';
        absenteeList.push(`• *[Sakit]* ${student.name}${note}`);
      } else if (status === 'Alpa') {
        totalAlpa++;
        const note = currentNotes[student.id] ? ` (${currentNotes[student.id]})` : '';
        absenteeList.push(`• *[Alpa]* ${student.name}${note}`);
      } else {
        totalUnrecorded++;
      }
    });

    const totalStudents = currentClassStudents.length;

    let text = `*LAPORAN KEHADIRAN SISWA*\n`;
    text += `📅 *Hari/Tanggal:* ${dayLabel}, ${formattedDate}\n`;
    text += `👥 *Kelas:* ${className}\n\n`;

    text += `*RINGKASAN KEHADIRAN:*\n`;
    text += `✅ Hadir: ${totalHadir} Siswa\n`;
    text += `✉️ Izin: ${totalIzin} Siswa\n`;
    text += `🤒 Sakit: ${totalSakit} Siswa\n`;
    text += `❌ Alpa: ${totalAlpa} Siswa\n`;
    if (totalUnrecorded > 0) {
      text += `⚪ Belum Diabsen: ${totalUnrecorded} Siswa\n`;
    }
    text += `📊 Persentase Kehadiran: ${totalStudents > 0 ? ((totalHadir / totalStudents) * 100).toFixed(1) : 0}%\n\n`;

    if (absenteeList.length > 0) {
      text += `*KETERANGAN KETIDAKHADIRAN:*\n`;
      text += absenteeList.join('\n') + `\n\n`;
    } else {
      text += `✨ *Alhamdulillah, hari ini seluruh siswa hadir.*\n\n`;
    }

    text += `_Barokallahu fiikum_`;
    return text;
  };

  const handleSendWa = () => {
    if (selectedClassId === 'all') {
      showToastMsg('Silakan pilih kelas terlebih dahulu sebelum membuat laporan WA.', 'info');
      return;
    }
    const text = generateWaText();
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encodedText}`;
    
    // Copy to clipboard fallback first so it's guaranteed to be saved
    try {
      navigator.clipboard.writeText(text);
      showToastMsg('Laporan disalin & membuka WhatsApp...');
    } catch {
      showToastMsg('Membuka WhatsApp...');
    }

    // Delay short state for browser compatibility
    setTimeout(() => {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }, 600);
  };

  // ---- DATE RANGE AGGREGATION CALCULATOR ----
  const rangeReportData = useMemo(() => {
    if (!isRangeMode) return [];

    // All dates within the selected range (inclusive)
    const datesList: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      datesList.push(`${year}-${month}-${day}`);
    }

    // Build statistics for each student in current class
    return currentClassStudents.map((student) => {
      let cbHadir = 0;
      let cbIzin = 0;
      let cbSakit = 0;
      let cbAlpa = 0;
      let cbEmpty = 0;

      datesList.forEach((dt) => {
        const status = attendanceRecords[dt]?.[student.id];
        if (status === 'Hadir') cbHadir++;
        else if (status === 'Izin') cbIzin++;
        else if (status === 'Sakit') cbSakit++;
        else if (status === 'Alpa') cbAlpa++;
        else cbEmpty++;
      });

      const totalRecorded = cbHadir + cbIzin + cbSakit + cbAlpa;
      const rate = totalRecorded > 0 ? (cbHadir / totalRecorded) * 100 : 0;

      return {
        student,
        hadir: cbHadir,
        izin: cbIzin,
        sakit: cbSakit,
        alpa: cbAlpa,
        unrecorded: cbEmpty,
        rate
      };
    });

  }, [isRangeMode, startDate, endDate, currentClassStudents, attendanceRecords]);

  // ---- NEW STUDENT DETAIL PAGE MEMO LOGIC ----
  const classmateStudents = useMemo(() => {
    // If we have an active detail student, find their class to show classmates. Otherwise, use selectedClassId
    const activeStudent = students.find((s) => s.id === selectedDetailStudentId);
    const targetClassId = activeStudent ? activeStudent.classId : selectedClassId;

    return students.filter((s) => {
      if (targetClassId !== 'all' && s.classId !== targetClassId) {
        return false;
      }
      if (detailSearchQuery.trim() !== '') {
        return s.name.toLowerCase().includes(detailSearchQuery.toLowerCase());
      }
      return true;
    });
  }, [students, selectedDetailStudentId, selectedClassId, detailSearchQuery]);

  const searchClassStudents = useMemo(() => {
    if (selectedClassId === 'all') return [];
    return students.filter((student) => {
      const studentClass = classes.find((c) => c.id === student.classId);
      const studentClassName = studentClass ? studentClass.name : student.classId;

      if (activeCategory === 'SMP' && !isSMPInput(studentClassName)) return false;
      if (activeCategory === 'SMA' && !isSMAInput(studentClassName)) return false;
      return student.classId === selectedClassId;
    });
  }, [students, classes, activeCategory, selectedClassId]);

  const filteredSearchStudents = useMemo(() => {
    if (!desktopStudentSearchQuery.trim()) return [];
    const query = desktopStudentSearchQuery.toLowerCase();
    return searchClassStudents.filter((student) => {
      const nisn = getStudentNIS(student.id);
      return (
        student.name.toLowerCase().includes(query) ||
        nisn.toLowerCase().includes(query)
      );
    });
  }, [searchClassStudents, desktopStudentSearchQuery, students]);

  const activeStudentProfile = useMemo(() => {
    return students.find((s) => s.id === selectedDetailStudentId) || null;
  }, [students, selectedDetailStudentId]);

  const studentStats = useMemo(() => {
    if (!selectedDetailStudentId) return { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
    
    let totalHadir = 0;
    let totalIzin = 0;
    let totalSakit = 0;
    let totalAlpa = 0;

    const start = new Date(detailStartDate);
    const end = new Date(detailEndDate);

    Object.keys(attendanceRecords).forEach((dateStr) => {
      const recordDate = new Date(dateStr);
      if (recordDate >= start && recordDate <= end) {
        const status = attendanceRecords[dateStr]?.[selectedDetailStudentId];
        if (status === 'Hadir') totalHadir++;
        else if (status === 'Izin') totalIzin++;
        else if (status === 'Sakit') totalSakit++;
        else if (status === 'Alpa') totalAlpa++;
      }
    });

    return {
      Hadir: totalHadir,
      Izin: totalIzin,
      Sakit: totalSakit,
      Alpa: totalAlpa
    };
  }, [selectedDetailStudentId, detailStartDate, detailEndDate, attendanceRecords]);

  const detailTableRows = useMemo(() => {
    if (!selectedDetailStudentId) return [];

    const start = new Date(detailStartDate);
    const end = new Date(detailEndDate);
    const rows: { date: string; status: AttendanceStatus | null; note: string }[] = [];

    const uniqueDates = Object.keys(attendanceRecords).filter((dateStr) => {
      const d = new Date(dateStr);
      return d >= start && d <= end;
    });

    // Sort descending (newest first)
    uniqueDates.sort((a, b) => b.localeCompare(a));

    uniqueDates.forEach((dateStr) => {
      const status = attendanceRecords[dateStr]?.[selectedDetailStudentId] || null;
      const note = attendanceNotes[dateStr]?.[selectedDetailStudentId] || '';
      rows.push({
        date: dateStr,
        status,
        note
      });
    });

    return rows;
  }, [selectedDetailStudentId, detailStartDate, detailEndDate, attendanceRecords, attendanceNotes]);


  if (selectedDetailStudentId !== null && activeStudentProfile && !isDesktop) {
    const activeClass = classes.find(c => c.id === activeStudentProfile.classId);
    
    return (
      <div id="student-detail-portal-view" className="bg-[#FAF9FE] min-h-screen pb-16 w-full overflow-x-hidden">
        {/* Dynamic Toast Portal */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: '-40%', x: '-50%', scale: 0.93 }}
              animate={{ opacity: 1, y: '-50%', x: '-50%', scale: 1 }}
              exit={{ opacity: 0, y: '-40%', x: '-50%', scale: 0.93 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`fixed top-1/2 left-1/2 z-[9999] px-6 py-4.5 rounded-[24px] shadow-2xl flex flex-col items-center justify-center gap-3 text-center text-xs font-semibold border backdrop-blur-md pointer-events-none ${
                toast.type === 'success'
                  ? 'bg-[#1A1B1F]/90 text-white border-[#FFD700]/30 shadow-[0_12px_40px_rgba(255,215,0,0.12)]'
                  : 'bg-white/90 text-stone-800 border-stone-200/50 shadow-[0_12px_40px_rgba(0,0,0,0.06)]'
              }`}
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                toast.type === 'success' ? 'bg-[#FFD700]/15' : 'bg-stone-100'
              }`}>
                <CheckCircle2 size={20} className={toast.type === 'success' ? 'text-[#FFD700]' : 'text-stone-600'} />
              </div>
              <span className="text-sm font-bold tracking-tight text-current max-w-[220px]">
                {toast.message}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header segment exactly as illustrated in the user image mockup */}
        <div className="bg-white border-b border-stone-200/50 py-5 px-5 flex items-center gap-4">
          <button
            id="btn-back-to-portal"
            type="button"
            onClick={() => {
              setSelectedDetailStudentId(null);
              setDetailSearchQuery('');
            }}
            className="w-10 h-10 rounded-full border border-stone-200 bg-white flex items-center justify-center hover:bg-stone-50 transition cursor-pointer active:scale-95 shadow-sm"
          >
            <ArrowLeft size={16} className="text-stone-700" />
          </button>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight">
            Informasi Siswa
          </h2>
        </div>

        <div className="max-w-md mx-auto px-5 py-5 flex flex-col gap-5">
          {/* 1. Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
            <input
              id="detail-student-search"
              type="text"
              placeholder="Cari nama siswa..."
              value={detailSearchQuery}
              onChange={(e) => setDetailSearchQuery(e.target.value)}
              className="w-full bg-white text-xs pl-10 pr-9 py-3.5 rounded-2xl border border-stone-200/80 focus:outline-none focus:ring-4 focus:ring-[#FFD700]/15 transition-all text-stone-900 placeholder-stone-400 font-bold shadow-[0_2px_10px_rgba(0,0,0,0.015)]"
            />
          </div>

          {/* Classmates Horizontal scroll list if search matches, to easily toggle between classmates */}
          {classmateStudents.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold tracking-wider text-stone-400 uppercase">
                DAFTAR SISWA KELAS {activeClass?.name?.toUpperCase()} :
              </label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {classmateStudents.map((sibling) => {
                  const isSelected = sibling.id === selectedDetailStudentId;
                  return (
                    <button
                      key={sibling.id}
                      onClick={() => setSelectedDetailStudentId(sibling.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full cursor-pointer text-xs font-semibold whitespace-nowrap transition-all border ${
                        isSelected
                          ? 'bg-[#FFD700] text-[#1A1A1A] border-[#FFD700] shadow-sm'
                          : 'bg-white text-stone-600 border-stone-200/60 hover:border-stone-400'
                      }`}
                    >
                      <StudentAvatar
                        name={sibling.name}
                        gender={sibling.gender}
                        sizeClass="w-5 h-5"
                      />
                      <span>{sibling.name.split(' ').slice(0, 2).join(' ')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Header Siswa Card (Soft gradient matching client mockup exactly, combined & compact profile dashboard) */}
          <div className="bg-gradient-to-b from-[#FFFDF0] via-[#FCF9EC] to-white p-6 rounded-3xl border border-stone-200/50 shadow-[0_4px_22px_rgba(0,0,0,0.02)] flex flex-col items-center relative overflow-hidden">
            {/* Soft decorative background circles */}
            <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-amber-200/10 to-transparent rounded-full pointer-events-none" />
            
            {/* Beautiful Student Avatar */}
            <div className="flex justify-center mb-3">
              <div className="relative p-1 bg-white rounded-full border-4 border-stone-200/40 shadow-md">
                <StudentAvatar
                  name={activeStudentProfile.name}
                  gender={activeStudentProfile.gender}
                  sizeClass="w-20 h-20"
                />
              </div>
            </div>

            <h3 className="text-base font-extrabold text-[#1A1A1A] text-center leading-tight">
              {activeStudentProfile.name}
            </h3>
            
            <p className="text-xs text-stone-500 font-semibold text-center mt-1">
              Kelas {activeClass?.name || 'Umum'}
            </p>

            {/* Clear, Compact, and Modern Student Profile Details Dashboard */}
            <div className="w-full mt-5 pt-4 border-t border-stone-200/40 grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center justify-start text-center">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">NISN</span>
                <span className="text-[11px] font-bold text-stone-850 font-mono mt-1 break-all select-all">
                  {getStudentNIS(activeStudentProfile.id)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-start text-center border-x border-stone-200/45 px-1.5">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Program</span>
                <span className="text-[10px] font-extrabold text-[#705d00] bg-[#FFD700]/15 px-2 py-0.5 rounded-full mt-1 uppercase text-center max-w-full truncate">
                  {activeStudentProfile.program || 'REGULER'}
                </span>
              </div>
              <div className="flex flex-col items-center justify-start text-center">
                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Wali Kelas</span>
                <span 
                  className="text-[10px] font-semibold text-stone-700 mt-1 leading-tight max-w-full text-center hover:text-stone-900 transition"
                  title={activeStudentProfile.wali_kelas || 'ZAMZAM IBNU SINA, M.Sc.'}
                >
                  {activeStudentProfile.wali_kelas || 'ZAMZAM IBNU SINA, M.Sc.'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Ringkasan Absensi Panel (Exactly matching Golden border layout + pill styles) */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-extrabold text-[#1A1A1A] tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
              Ringkasan Absensi
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Row 1, Col 1: HADIR */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200/50 border-l-4 border-l-[#FFD700] shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#9c8200]">
                    <CheckCircle2 size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-tight block">
                      HADIR
                    </span>
                    <span className="text-lg font-extrabold text-[#1A1A1A] leading-tight block">
                      {studentStats.Hadir}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 1, Col 2: IZIN */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200/50 border-l-4 border-l-[#FFD700] shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#9c8200]">
                    <Mail size={17} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-tight block">
                      IZIN
                    </span>
                    <span className="text-lg font-extrabold text-[#1A1A1A] leading-tight block">
                      {studentStats.Izin}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2, Col 1: SAKIT */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200/50 border-l-4 border-l-[#FFD700] shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#9c8200]">
                    <ClipboardCheck size={17} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-tight block">
                      SAKIT
                    </span>
                    <span className="text-lg font-extrabold text-[#1A1A1A] leading-tight block">
                      {studentStats.Sakit}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2, Col 2: ALPA */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-100 border-l-4 border-l-[#FFD700] shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#9c8200]">
                    <XCircle size={17} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-tight block">
                      ALPA
                    </span>
                    <span className="text-lg font-extrabold text-[#1A1A1A] leading-tight block">
                      {studentStats.Alpa}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Filter Riwayat Absensi */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-extrabold text-[#1A1A1A] tracking-wider uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
              Rentang Tanggal Riwayat
            </h4>

            {/* Single elegant capsule filter button for Date Range */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRangePickerOpen(true)}
                className="w-full bg-white text-xs px-4 py-3.5 rounded-2xl border border-stone-200 text-stone-800 font-bold flex items-center justify-between cursor-pointer focus:ring-4 focus:ring-[#FFD700]/15 transition-all text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-stone-400 uppercase bg-[#FAF9FE] px-2 py-1 rounded-lg border border-stone-200/50">PERIODE</span>
                  <span className="text-stone-800 font-bold truncate">
                    {formatIndonesianDateStr(detailStartDate)} s.d {formatIndonesianDateStr(detailEndDate)}
                  </span>
                </div>
                <Calendar className="text-amber-500 flex-shrink-0 ml-2" size={14} />
              </button>
            </div>
          </div>

          {/* 5. Tabel/Daftar Riwayat Absensi (Responsive Layout) */}
          <div className="bg-white rounded-3xl border border-stone-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.015)] overflow-hidden">
            {/* Mobile View: Clean and beautifully stacked vertical cards */}
            <div className="block sm:hidden divide-y divide-stone-100">
              {detailTableRows.length > 0 ? (
                detailTableRows.map((row) => {
                  let statusBadge = null;
                  if (row.status === 'Hadir') {
                    statusBadge = (
                      <span className="bg-[#FFD700]/15 text-[#705d00] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#FFD700]/30">
                        Hadir
                      </span>
                    );
                  } else if (row.status === 'Izin') {
                    statusBadge = (
                      <span className="bg-sky-50 text-sky-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-sky-100">
                        Izin
                      </span>
                    );
                  } else if (row.status === 'Sakit') {
                    statusBadge = (
                      <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                        Sakit
                      </span>
                    );
                  } else if (row.status === 'Alpa') {
                    statusBadge = (
                      <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-100">
                        Alfa
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="bg-stone-50 text-stone-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-stone-200/50">
                        -
                      </span>
                    );
                  }

                  return (
                    <div key={row.date} className="p-4 flex flex-col gap-1.5 hover:bg-stone-50/50 transition">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-800 text-xs">
                          {formatIndonesianDateStr(row.date)}
                        </span>
                        {statusBadge}
                      </div>
                      {row.note && (
                        <div className="text-[11px] text-stone-500 font-medium bg-stone-50/50 p-2 rounded-xl border border-stone-100 flex items-start gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-1 flex-shrink-0" />
                          <p><span className="font-semibold text-stone-600">Catatan:</span> {row.note}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-stone-400 text-xs font-semibold">
                  Tidak ada riwayat absensi pada rentang tanggal ini.
                </div>
              )}
            </div>

            {/* Desktop View: Traditional table with columns, hidden on mobile */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200/40 text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                    <th className="py-3.5 px-4">Tanggal</th>
                    <th className="py-3.5 px-2 text-center">Hadir</th>
                    <th className="py-3.5 px-2 text-center">Izin</th>
                    <th className="py-3.5 px-2 text-center">Sakit</th>
                    <th className="py-3.5 px-2 text-center">Alfa</th>
                    <th className="py-3.5 px-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                  {detailTableRows.length > 0 ? (
                    detailTableRows.map((row) => {
                      return (
                        <tr key={row.date} className="hover:bg-stone-50/50 transition">
                          <td className="py-3.5 px-4 font-bold text-stone-800 whitespace-nowrap">
                            {formatIndonesianDateStr(row.date)}
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            {row.status === 'Hadir' && <Check size={14} className="text-[#FFD700] mx-auto stroke-[3]" />}
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            {row.status === 'Izin' && <Check size={14} className="text-sky-500 mx-auto stroke-[3]" />}
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            {row.status === 'Sakit' && <Check size={14} className="text-emerald-500 mx-auto stroke-[3]" />}
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            {row.status === 'Alpa' && <Check size={14} className="text-rose-500 mx-auto stroke-[3]" />}
                          </td>
                          <td className="py-3.5 px-3 text-[11px] text-stone-500 max-w-xs break-words font-medium">
                            {row.note || '-'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-stone-400 text-xs font-semibold">
                        Tidak ada riwayat absensi pada rentang tanggal ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Custom Calendar Dialog for Dari (start) and Sampai (end) Date fields */}
        <DateRangePickerModal
          isOpen={isRangePickerOpen}
          onClose={() => setIsRangePickerOpen(false)}
          startDate={detailStartDate}
          endDate={detailEndDate}
          onApply={(start, end) => {
            setDetailStartDate(start);
            setDetailEndDate(end);
          }}
        />

      </div>
    );
  }

  return (
    <div id="teacher-portal-view" className="bg-[#FAF9FE] min-h-screen pb-16 w-full overflow-x-clip">
      
      {/* Dynamic Toast Portal */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: '-40%', x: '-50%', scale: 0.93 }}
            animate={{ opacity: 1, y: '-50%', x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: '-40%', x: '-50%', scale: 0.93 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed top-1/2 left-1/2 z-[9999] px-6 py-4.5 rounded-[24px] shadow-2xl flex flex-col items-center justify-center gap-3 text-center text-xs font-semibold border backdrop-blur-md pointer-events-none ${
              toast.type === 'success'
                ? 'bg-[#1A1B1F]/90 text-white border-[#FFD700]/30 shadow-[0_12px_40px_rgba(255,215,0,0.12)]'
                : 'bg-white/90 text-stone-800 border-stone-200/50 shadow-[0_12px_40px_rgba(0,0,0,0.06)]'
            }`}
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-[#FFD700]/15' : 'bg-stone-100'
            }`}>
              <CheckCircle2 size={20} className={toast.type === 'success' ? 'text-[#FFD700]' : 'text-stone-600'} />
            </div>
            <span className="text-sm font-bold tracking-tight text-current max-w-[220px]">
              {toast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Class Selection Modal Overlay */}
      <AnimatePresence>
        {isClassModalOpen && (
          <div
            id="class-picker-overlay-scrim"
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[999] flex items-center justify-center p-4"
          >
            {/* Click outside to cancel */}
            <div
              id="class-picker-click-scrim"
              className="absolute inset-0 cursor-default"
              onClick={() => setIsClassModalOpen(false)}
            />

            {/* Main Pop-up Dialog Panel */}
            <motion.div
              id="class-picker-dialog-panel"
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-[32px] w-[#340px] max-w-full p-6 shadow-2xl border border-stone-100 relative flex flex-col gap-4 z-10 select-none overflow-hidden"
            >
              {/* Header: Pilih Kelas & X button */}
              <div id="class-picker-header" className="flex items-center justify-between">
                <span className="text-md font-bold text-[#1A1B1F] tracking-tight">
                  Pilih Kelas
                </span>
                <button
                  id="class-picker-close-btn"
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 hover:text-[#1A1A1A] active:scale-95 transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Class options list (vertical scrollable list matching calendar-picker quality) */}
              <div id="class-picker-options-list" className="flex flex-col gap-2 max-h-[300px] overflow-y-auto no-scrollbar pr-0.5">
                <button
                  id="class-pick-option-all"
                  type="button"
                  onClick={() => {
                    setSelectedClassId('all');
                    setIsClassModalOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all border ${
                    selectedClassId === 'all'
                      ? 'bg-[#FFD700] text-black border-[#FFD700] font-extrabold shadow-sm'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200/50'
                  }`}
                >
                  <span>Pilih Kelas</span>
                  {selectedClassId === 'all' && <Check size={14} strokeWidth={3} className="text-black" />}
                </button>

                {classes
                  .filter((cls) => {
                    if (activeCategory === 'SMP') return isSMPInput(cls.name);
                    return isSMAInput(cls.name);
                  })
                  .map((cls) => {
                    const isSelected = cls.id === selectedClassId;
                    return (
                      <button
                        id={`class-pick-option-${cls.id}`}
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          setIsClassModalOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#FFD700] text-black border-[#FFD700] font-extrabold shadow-sm'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200/50'
                        }`}
                      >
                        <span>Kelas {cls.name}</span>
                        {isSelected && <Check size={14} strokeWidth={3} className="text-black" />}
                      </button>
                    );
                  })}
              </div>

              {/* Footer text helper */}
              <div id="class-picker-footer" className="text-center text-[10px] text-stone-400 mt-1 uppercase tracking-wider font-semibold">
                AL-WILDAN Islamic School BSD
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Portal Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className={`border-b border-stone-200/50 px-5 relative overflow-hidden transition-all duration-300 lg:sticky lg:top-0 lg:z-50 ${
          isHeaderScrolled 
            ? 'bg-white/80 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.035)] py-4' 
            : 'bg-white py-6'
        }`}
      >
        {onBackToGatekeeper && (
          <button
            id="guru-back-to-gatekeeper"
            type="button"
            onClick={onBackToGatekeeper}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-900 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider bg-stone-50/90 backdrop-blur-xs px-3 py-1.5 rounded-full border border-stone-200/50 hover:bg-stone-100 transition shadow-xs cursor-pointer z-10"
          >
            <ArrowLeft size={13} strokeWidth={2.5} /> Main Menu
          </button>
        )}
        {/* Abstract vector backgrounds matching professional brand guidelines */}
        <div className="absolute right-0 bottom-0 top-0 w-24 bg-gradient-to-l from-[#FFD700]/5 to-transparent pointer-events-none" />
        <div className="max-w-md mx-auto flex flex-col items-center text-center">
          <span className="text-[#705d00] font-bold text-xs tracking-widest uppercase mb-1">
            Student Attendance
          </span>
          <h2 className="text-lg sm:text-xl font-black text-[#1A1A1A] tracking-tight uppercase leading-tight">
            {activeCategory} AL-WILDAN 3 BSD CITY
          </h2>
        </div>
      </motion.div>

      <div className="mx-auto w-full max-w-md lg:max-w-6xl xl:max-w-7xl px-5 lg:px-6 xl:px-8 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Attendance Taking & Filters */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-5">
            {/* Dynamic High-Fidelity DateSwitcher Pop-up for Harian Mode */}
            {!isRangeMode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
              >
                <DateSwitcher currentDate={currentDate} onDateChange={setCurrentDate} />
              </motion.div>
            )}

            {/* Dynamic Interactive Filter Box controls */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
              className="bg-white p-4.5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-stone-100/80 flex flex-col gap-4"
            >
              {/* Responsive date and Class Select selectors side-by-side */}
              <div className="flex flex-col gap-3">
                {/* Filter 1: Dynamic Date Inputs depending on Mode */}
                {isRangeMode && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
                        TANGGAL MULAI
                      </label>
                      <input
                        id="range-start-picker"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-[#F2F2F7] text-[#1A1A1A] text-xs px-3 py-2.5 rounded-xl border border-transparent focus:bg-white focus:border-stone-200 focus:outline-none focus:ring-3 focus:ring-[#FFD700]/15 transition-all font-medium"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
                        HINGGA TANGGAL
                      </label>
                      <input
                        id="range-end-picker"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-[#F2F2F7] text-[#1A1A1A] text-xs px-3 py-2.5 rounded-xl border border-transparent focus:bg-white focus:border-stone-200 focus:outline-none focus:ring-3 focus:ring-[#FFD700]/15 transition-all font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Filter 2: Class Selection Button trigger */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
                    PILIH KELAS
                  </label>
                  <button
                    id="teacher-class-selector-trigger"
                    type="button"
                    onClick={() => setIsClassModalOpen(true)}
                    className="w-full bg-[#F2F2F7] hover:bg-stone-100 text-[#1A1A1A] text-xs px-4 py-3.5 rounded-2xl flex items-center justify-between border border-transparent hover:border-stone-200 transition-all cursor-pointer font-bold select-none text-left"
                  >
                    <span>
                      {selectedClassId === 'all'
                        ? 'Pilih Kelas'
                        : `Kelas ${classes.find(c => c.id === selectedClassId)?.name || ''}`}
                    </span>
                    <ChevronDown size={15} className="text-stone-500 shrink-0 ml-1" />
                  </button>
                </div>

                {/* Live Search sub-input inside Card filter */}
                <div className="relative mt-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                  <input
                    id="search-teacher-students-input"
                    type="text"
                    placeholder="Cari nama siswa di kelas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#F2F2F7] text-[#1A1A1A] text-xs pl-9 pr-4 py-2.5 rounded-2xl border border-transparent focus:bg-white focus:border-stone-200 focus:outline-none focus:ring-4 focus:ring-[#FFD700]/15 transition-all placeholder-stone-400"
                  />
                </div>
              </div>
            </motion.div>

            {/* Section Title "Absensi" */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.22, ease: 'easeOut' }}
              className="flex items-center justify-between mt-1"
            >
              <h3 className="text-xs font-extrabold text-[#1A1A1A] tracking-wider uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                ABSENSI
              </h3>
            </motion.div>

            {/* Informational student panel helper banner */}
            {showStudentInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-[#FFD700]/10 border border-[#FFD700]/40 rounded-2xl p-4 text-xs text-[#705e00] flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-1 font-bold">
                  <Info size={14} />
                  <span>Panduan Guru :</span>
                </div>
                <p className="leading-relaxed">
                  Pilih kelas dan tanggal terlebih dahulu. Klik pill status kehadiran (Hadir, Izin, Sakit, Alpa) hingga menyala untuk mencatat presensi. Klik tombol berikon menu di kanan tiap siswa untuk menuliskan catatan spesifik ketidakhadiran siswa.
                </p>
              </motion.div>
            )}

            {/* STUDENT ATTENDANCE DATA GRID CONTAINER */}
            <div className="flex flex-col gap-3">
              {!isRangeMode ? (
                currentClassStudents.length > 0 ? (
                  currentClassStudents.map((student, idx) => {
                    const serialNum = String(idx + 1).padStart(2, '0');
                    const studentNIS = getStudentNIS(student.id);
                    const currentStatus = attendanceRecords[currentDate]?.[student.id];
                    const studentNote = attendanceNotes[currentDate]?.[student.id] || '';
                    const isNotesActive = activeNoteStudentId === student.id;

                    return (
                      <motion.div
                        id={`guru-row-${student.id}`}
                        key={student.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(idx * 0.035, 0.35), ease: "easeOut" }}
                        className="bg-white p-4.5 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-stone-100/90 flex flex-col gap-3.5"
                      >
                        {/* Upper Detail Section */}
                        <div className="flex items-center justify-between">
                          <div
                            onClick={() => setSelectedDetailStudentId(student.id)}
                            className="flex items-center gap-3 cursor-pointer group select-none"
                            title="Klik untuk melihat Detail & Riwayat Absensi"
                          >
                            <span className="text-sm font-bold text-stone-300 group-hover:text-stone-500 transition-colors">
                              {serialNum}
                            </span>
                            
                            {/* Modern Rounded Student Avatar */}
                            <StudentAvatar
                              name={student.name}
                              gender={student.gender}
                              sizeClass="w-10 h-10 group-hover:scale-105 transition-transform"
                            />

                            <div>
                              <h4 className="text-sm sm:text-base font-extrabold text-[#1A1A1A] leading-tight group-hover:text-amber-600 transition-colors">
                                {student.name}
                              </h4>
                            </div>
                          </div>

                          {/* Small inline note activator button */}
                          <button
                            id={`btn-guru-note-trigger-${student.id}`}
                            type="button"
                            onClick={() => openNoteEditor(student.id, studentNote)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              studentNote || isNotesActive
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-stone-50 text-stone-400 border border-stone-100 hover:text-stone-700'
                            }`}
                            title="Tulis Catatan"
                          >
                            <FileClock size={12} />
                          </button>
                        </div>

                        {/* Active Interactive Row of Status Buttons exactly matching the screenshot style */}
                        <div className="grid grid-cols-4 gap-2">
                          {(['Hadir', 'Izin', 'Sakit', 'Alpa'] as AttendanceStatus[]).map((status) => {
                            const isActive = currentStatus === status;

                            let styleClass = '';
                            if (isActive) {
                              styleClass = 'bg-[#FFD700] text-[#1A1A1A] border-[#FFD700] ring-4 ring-[#FFD700]/15 font-bold shadow-md transform scale-[1.02]';
                            } else {
                              styleClass = 'bg-[#FAF9FE] text-stone-600 border-stone-200/50 hover:bg-stone-50';
                            }

                            return (
                              <button
                                id={`btn-guru-status-${student.id}-${status}`}
                                key={status}
                                type="button"
                                onClick={() => handleStatusChange(student.id, status)}
                                className={`py-2 px-1 text-xs font-semibold rounded-2xl border text-center transition-all duration-200 cursor-pointer ${styleClass}`}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>

                        {/* Inline note text view / inline notes form */}
                        {isNotesActive ? (
                          <div className="bg-stone-50 p-2.5 rounded-2xl flex flex-col gap-2 mt-1 border border-stone-200/50">
                            <textarea
                              id={`textarea-guru-note-${student.id}`}
                              placeholder="Masukkan keterangan (contoh: Mengikuti olimpiade, flu berat...)"
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              className="w-full bg-white text-xs p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD700]/30 resize-none h-14 text-stone-800"
                            />
                            <div className="flex items-center gap-1.5 self-end">
                              <button
                                id="btn-close-teacher-note"
                                type="button"
                                onClick={() => setActiveNoteStudentId(null)}
                                className="px-2.5 py-1 text-[10px] font-bold text-stone-500 hover:text-stone-850 cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                id="btn-save-teacher-note"
                                type="button"
                                onClick={() => saveStudentNote(student.id)}
                                className="px-3.5 py-1 bg-stone-900 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                Simpan Catatan
                              </button>
                            </div>
                          </div>
                        ) : (
                          studentNote && (
                            <div className="bg-amber-50/50 border border-amber-100 p-2.5 rounded-2xl text-[11px] text-amber-800 flex items-start gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 flex-shrink-0" />
                              <p className="flex-grow">
                                <span className="font-semibold">Keterangan:</span> {studentNote}
                              </p>
                            </div>
                          )
                        )}
                      </motion.div>
                    );
                  })
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-3xl p-8 text-center border border-dashed border-stone-200"
                  >
                    <Users className="mx-auto text-stone-300 mb-2" size={32} />
                    <p className="text-stone-500 text-sm font-semibold">
                      {selectedClassId === 'all' ? 'Pilih Kelas Terlebih Dahulu' : 'Tabel Siswa Kosong'}
                    </p>
                    <p className="text-stone-400 text-xs mt-1">
                      {selectedClassId === 'all' 
                        ? 'Silakan pilih kelas pada pilihan di atas untuk menampilkan seluruh siswa dalam tabel.' 
                        : 'Coba sesuaikan pilihan kelas atau cari nama lain.'}
                    </p>
                  </motion.div>
                )
              ) : (
                // MODE 2: DATE RANGE SUMMARY REPORTING
                <div className="bg-white p-4.5 rounded-3xl border border-stone-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] flex flex-col gap-4">
                  <div className="flex flex-col">
                    <h4 className="text-xs font-bold text-[#1A1A1A]">
                      Laporan Rekapitulasi Presensi
                    </h4>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Periode: {formatIndonesianDateStr(startDate)} s.d {formatIndonesianDateStr(endDate)}
                    </p>
                  </div>

                  {rangeReportData.length > 0 ? (
                    <div className="flex flex-col gap-3.5 mt-2 divide-y divide-stone-100">
                      {rangeReportData.map((item, idx) => {
                        const studentNIS = getStudentNIS(item.student.id);
                        return (
                          <div id={`rekap-row-${item.student.id}`} key={item.student.id} className="pt-3.5 first:pt-0 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-stone-800">
                                  {String(idx + 1).padStart(2, '0')}. {item.student.name}
                                </span>
                                <span className="text-[9px] text-stone-400 block mt-0.5">
                                  NISN: {studentNIS}
                                </span>
                              </div>
                              
                              <div className="text-right">
                                <span className="text-xs font-bold text-stone-800">
                                  {item.rate.toFixed(1)}%
                                </span>
                                <span className="text-[8px] text-stone-400 block tracking-tighter">
                                  PERSENTASE HADIR
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 bg-[#F2F2F7] p-2.5 rounded-2xl text-center text-[10px]">
                              <div>
                                <p className="text-emerald-700 font-extrabold">{item.hadir}x</p>
                                <p className="text-stone-400 text-[8px] font-medium">Hadir</p>
                              </div>
                              <div>
                                <p className="text-blue-700 font-extrabold">{item.izin}x</p>
                                <p className="text-stone-400 text-[8px] font-medium">Izin</p>
                              </div>
                              <div>
                                <p className="text-amber-700 font-extrabold">{item.sakit}x</p>
                                <p className="text-stone-400 text-[8px] font-medium">Sakit</p>
                              </div>
                              <div>
                                <p className="text-red-700 font-extrabold">{item.alpa}x</p>
                                <p className="text-stone-400 text-[8px] font-medium">Alpa</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-stone-400 text-xs">
                      Pilih rentang tanggal dan kelas untuk menyajikan data rekapitulasi.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: STUDENT DETAILS (Desktop split-screen / dual panel layout) */}
          {isDesktop && (
            <div className="lg:col-span-5 lg:sticky lg:top-6 flex flex-col gap-5">
              {activeStudentProfile ? (
                (() => {
                  const activeClass = classes.find(c => c.id === activeStudentProfile.classId);
                  return (
                    <div className="bg-white p-6 rounded-[32px] border border-stone-200/65 shadow-[0_4px_30px_rgba(0,0,0,0.015)] flex flex-col gap-5 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
                      {/* Header segment inside panel */}
                      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                        <h2 className="text-sm font-extrabold text-[#1A1A1A] tracking-wider uppercase flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Detail Informasi Siswa
                        </h2>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDetailStudentId(null);
                            setDetailSearchQuery('');
                          }}
                          className="w-7 h-7 rounded-full bg-stone-50 border border-stone-200/50 flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                          title="Tutup Panel"
                        >
                          <X size={13} />
                        </button>
                      </div>

                      <AnimatePresence mode="wait">
                        {isStudentLoading ? (
                          <motion.div
                            key="student-detail-shimmer"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col gap-5 animate-pulse"
                          >
                            {/* Loading Shimmer Outer Profile Card */}
                            <div className="bg-gradient-to-b from-stone-50 to-white p-6 rounded-3xl border border-stone-100 flex flex-col items-center gap-4">
                              <div className="w-20 h-20 bg-stone-200 rounded-full" />
                              <div className="h-4 bg-stone-200 rounded w-1/2" />
                              <div className="h-3 bg-stone-100 rounded w-1/3" />
                              <div className="w-full mt-4 pt-4 border-t border-stone-100 grid grid-cols-3 gap-2">
                                <div className="h-8 bg-stone-50 rounded" />
                                <div className="h-8 bg-stone-50 rounded" />
                                <div className="h-8 bg-stone-50 rounded" />
                              </div>
                            </div>
                            {/* Ringkasan Loading Shimmer */}
                            <div className="flex flex-col gap-2.5">
                              <div className="h-3 bg-stone-200 rounded w-1/4 mb-1" />
                              <div className="grid grid-cols-2 gap-3">
                                <div className="h-16 bg-stone-50 rounded-2xl border border-stone-100" />
                                <div className="h-16 bg-stone-50 rounded-2xl border border-stone-100" />
                                <div className="h-16 bg-stone-50 rounded-2xl border border-stone-100" />
                                <div className="h-16 bg-stone-50 rounded-2xl border border-stone-100" />
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key={activeStudentProfile.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="flex flex-col gap-5"
                          >
                            {/* 2. Header Siswa Card (Soft gradient matching client mockup exactly, combined & compact profile dashboard) */}
                            <div className="bg-gradient-to-b from-[#FFFDF0] via-[#FCF9EC] to-white p-6 rounded-3xl border border-stone-200/50 shadow-[0_4px_22px_rgba(0,0,0,0.02)] flex flex-col items-center relative overflow-hidden">
                              {/* Soft decorative background circles */}
                              <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-bl from-amber-200/10 to-transparent rounded-full pointer-events-none" />
                              
                              {/* Beautiful Student Avatar */}
                              <div className="flex justify-center mb-3">
                                <div className="relative p-1 bg-white rounded-full border-4 border-stone-200/40 shadow-md">
                                  <StudentAvatar
                                    name={activeStudentProfile.name}
                                    gender={activeStudentProfile.gender}
                                    sizeClass="w-20 h-20"
                                  />
                                </div>
                              </div>

                              <h3 className="text-base font-extrabold text-[#1A1A1A] text-center leading-tight">
                                {activeStudentProfile.name}
                              </h3>
                              
                              <p className="text-xs text-stone-500 font-semibold text-center mt-1">
                                Kelas {activeClass?.name || 'Umum'}
                              </p>

                              {/* Clear, Compact, and Modern Student Profile Details Dashboard */}
                              <div className="w-full mt-5 pt-4 border-t border-stone-200/40 grid grid-cols-3 gap-2">
                                <div className="flex flex-col items-center justify-start text-center">
                                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">NISN</span>
                                  <span className="text-[11px] font-bold text-[#1A1A1A] font-mono mt-1 break-all select-all">
                                    {getStudentNIS(activeStudentProfile.id)}
                                  </span>
                                </div>
                                <div className="flex flex-col items-center justify-start text-center border-x border-stone-200/45 px-1.5">
                                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Program</span>
                                  <span className="text-[10px] font-extrabold text-[#705d00] bg-[#FFD700]/15 px-2 py-0.5 rounded-full mt-1 uppercase text-center max-w-full truncate">
                                    {activeStudentProfile.program || 'REGULER'}
                                  </span>
                                </div>
                                <div className="flex flex-col items-center justify-start text-center">
                                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Wali Kelas</span>
                                  <span 
                                    className="text-[10px] font-semibold text-stone-700 mt-1 leading-tight max-w-full text-center hover:text-stone-900 transition-all select-none"
                                    title={activeStudentProfile.wali_kelas || 'ZAMZAM IBNU SINA, M.Sc.'}
                                  >
                                    {activeStudentProfile.wali_kelas || 'ZAMZAM IBNU SINA, M.Sc.'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 3. Ringkasan Absensi Panel (Exactly matching Golden border layout + pill styles) */}
                            <div className="flex flex-col gap-2.5">
                              <h4 className="text-xs font-extrabold text-[#1A1A1A] tracking-wider uppercase flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                                Ringkasan Absensi
                              </h4>

                              <div className="grid grid-cols-2 gap-3">
                                {/* Row 1, Col 1: HADIR */}
                                <div className="bg-white p-3.5 rounded-2xl border border-stone-200/50 border-l-4 border-l-[#FFD700] shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#9c8200]">
                                      <CheckCircle2 size={18} className="stroke-[2.5]" />
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-tight block">
                                        HADIR
                                      </span>
                                      <span className="text-lg font-extrabold text-[#1A1A1A] leading-tight block">
                                        {studentStats.Hadir}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Row 1, Col 2: IZIN */}
                                <div className="bg-white p-3.5 rounded-2xl border border-stone-200/50 border-l-4 border-l-[#FFD700] shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#9c8200]">
                                      <Mail size={17} className="stroke-[2.5]" />
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-tight block">
                                        IZIN
                                      </span>
                                      <span className="text-lg font-extrabold text-[#1A1A1A] leading-tight block">
                                        {studentStats.Izin}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Row 2, Col 1: SAKIT */}
                                <div className="bg-white p-3.5 rounded-2xl border border-stone-200/50 border-l-4 border-l-[#FFD700] shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#9c8200]">
                                      <ClipboardCheck size={17} className="stroke-[2.5]" />
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-tight block">
                                        SAKIT
                                      </span>
                                      <span className="text-lg font-extrabold text-[#1A1A1A] leading-tight block">
                                        {studentStats.Sakit}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Row 2, Col 2: ALPA */}
                                <div className="bg-white p-3.5 rounded-2xl border border-stone-100 border-l-4 border-l-[#FFD700] shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#9c8200]">
                                      <XCircle size={17} className="stroke-[2.5]" />
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-tight block">
                                        ALPA
                                      </span>
                                      <span className="text-lg font-extrabold text-[#1A1A1A] leading-tight block">
                                        {studentStats.Alpa}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Sticky Search Student segment */}
                            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 py-2.5 -mx-2 px-2 transition-all border-b border-stone-100/40 flex flex-col gap-2">
                              <h4 className="text-xs font-extrabold text-[#1A1A1A] tracking-wider uppercase flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                                Cari Siswa
                              </h4>
                              
                              <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                                <input
                                  type="text"
                                  placeholder="Cari nama atau NISN siswa..."
                                  value={desktopStudentSearchQuery}
                                  onChange={(e) => setDesktopStudentSearchQuery(e.target.value)}
                                  className="w-full bg-[#F2F2F7] focus:bg-white text-xs pl-9 pr-8 py-2.5 rounded-2xl border border-transparent focus:border-stone-200/80 focus:outline-none focus:ring-4 focus:ring-[#FFD700]/15 transition-all text-[#1A1A1A] placeholder-stone-450 font-bold"
                                />
                                {desktopStudentSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setDesktopStudentSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                                  >
                                    <X size={13} />
                                  </button>
                                )}

                                {/* Floating Suggestions Dropdown */}
                                {desktopStudentSearchQuery.trim().length > 0 && (
                                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-stone-200/80 rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.1)] max-h-52 overflow-y-auto z-30 divide-y divide-stone-100 flex flex-col no-scrollbar">
                                    {filteredSearchStudents.length > 0 ? (
                                      filteredSearchStudents.map((matchedStudent) => {
                                        return (
                                          <button
                                            key={matchedStudent.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedDetailStudentId(matchedStudent.id);
                                              setDesktopStudentSearchQuery('');
                                            }}
                                            className="w-full text-left px-4 py-2.5 hover:bg-stone-50/85 flex items-center gap-3 transition cursor-pointer select-none"
                                          >
                                            <StudentAvatar
                                              name={matchedStudent.name}
                                              gender={matchedStudent.gender}
                                              sizeClass="w-7 h-7 flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-bold text-[#1A1A1A] truncate">
                                                {matchedStudent.name}
                                              </p>
                                              <p className="text-[10px] text-stone-400 font-mono font-bold leading-none mt-0.5">
                                                NISN: {getStudentNIS(matchedStudent.id)}
                                              </p>
                                            </div>
                                            <ChevronRight size={12} className="text-stone-450 ml-auto shrink-0" />
                                          </button>
                                        );
                                      })
                                    ) : (
                                      <div className="p-4 text-center text-xs text-stone-450 font-bold bg-stone-50/50">
                                        Siswa tidak ditemukan
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 4. Filter Riwayat Absensi */}
                            <div className="flex flex-col gap-2.5">
                              <h4 className="text-xs font-extrabold text-[#1A1A1A] tracking-wider uppercase flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                                Rentang Tanggal Riwayat
                              </h4>

                              {/* Single elegant capsule filter button for Date Range */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setIsRangePickerOpen(true)}
                                  className="w-full bg-white text-xs px-4 py-3.5 rounded-2xl border border-stone-200 text-stone-800 font-bold flex items-center justify-between cursor-pointer focus:ring-4 focus:ring-[#FFD700]/15 transition-all text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-stone-400 uppercase bg-[#FAF9FE] px-2 py-1 rounded-lg border border-stone-200/50">PERIODE</span>
                                    <span className="text-stone-800 font-bold truncate">
                                      {formatIndonesianDateStr(detailStartDate)} s.d {formatIndonesianDateStr(detailEndDate)}
                                    </span>
                                  </div>
                                  <Calendar className="text-amber-500 flex-shrink-0 ml-2" size={14} />
                                </button>
                              </div>
                            </div>

                            {/* 5. Tabel/Daftar Riwayat Absensi */}
                            <div className="bg-white rounded-3xl border border-stone-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.015)] overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-stone-50 border-b border-stone-200/40 text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                                      <th className="py-3.5 px-4">Tanggal</th>
                                      <th className="py-3.5 px-2 text-center">Hadir</th>
                                      <th className="py-3.5 px-2 text-center">Izin</th>
                                      <th className="py-3.5 px-2 text-center">Sakit</th>
                                      <th className="py-3.5 px-2 text-center">Alfa</th>
                                      <th className="py-3.5 px-3">Keterangan</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                                    {detailTableRows.length > 0 ? (
                                      detailTableRows.map((row) => {
                                        return (
                                          <tr key={row.date} className="hover:bg-stone-50/50 transition whitespace-nowrap">
                                            <td className="py-3 px-4 font-bold text-stone-800">
                                              {formatIndonesianDateStr(row.date)}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                              {row.status === 'Hadir' && <Check size={14} className="text-[#FFD700] mx-auto stroke-[3]" />}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                              {row.status === 'Izin' && <Check size={14} className="text-sky-500 mx-auto stroke-[3]" />}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                              {row.status === 'Sakit' && <Check size={14} className="text-emerald-500 mx-auto stroke-[3]" />}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                              {row.status === 'Alpa' && <Check size={14} className="text-rose-500 mx-auto stroke-[3]" />}
                                            </td>
                                            <td className="py-3 px-3 text-[11px] text-stone-500 max-w-[120px] truncate font-semibold" title={row.note || ''}>
                                              {row.note || '-'}
                                            </td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td colSpan={6} className="text-center py-8 text-stone-400 text-xs font-semibold">
                                          Tidak ada riwayat absensi pada rentang tanggal ini.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-white p-10 rounded-[32px] border border-stone-200/60 shadow-[0_4px_22px_rgba(0,0,0,0.01)] flex flex-col items-center justify-center text-center gap-4 text-stone-400 min-h-[450px]">
                  <div className="w-16 h-16 rounded-full bg-[#FFD700]/10 flex items-center justify-center text-[#FFD700] animate-pulse">
                    <Users size={28} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-[#1A1A1A] uppercase tracking-widest leading-none">
                      {selectedClassId === 'all' ? 'Pilih Kelas Terlebih Dahulu' : 'Informasi Siswa'}
                    </h4>
                    <p className="text-xs text-stone-400 mt-2.5 max-w-[240px] leading-relaxed mx-auto font-bold">
                      {selectedClassId === 'all' 
                        ? 'Silakan pilih kelas terlebih dahulu di bagian atas untuk melihat daftar siswa dan rincian informasi presensi mereka.'
                        : 'Silakan klik nama siswa pada daftar absensi di sebelah kiri untuk melihat profil, ringkasan dan riwayat presensi secara langsung.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* STICKY BOTTOM BUTTONS COLLABORATION BAR EXACTLY ILLUSTRATED AS [Teks WA] & [Simpan Absensi] */}
      {!isRangeMode && (
        <div className="fixed bottom-0 left-0 right-0 py-3 px-5 bg-white/95 backdrop-blur-md border-t border-stone-200/60 z-30 flex justify-center items-center shadow-lg">
          <div className="max-w-md w-full grid grid-cols-12 gap-3">
            
            {/* WA generation report button - covers 5/12 columns or spans nicely */}
            <button
              id="btn-teach-generate-wa"
              type="button"
              onClick={handleSendWa}
              className="col-span-5 h-12 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/80 text-stone-800 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold transition-all active:scale-95 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              <MessageCircle size={15} className="text-emerald-500 fill-emerald-500" />
              <span>Teks WA</span>
            </button>

            {/* Cloud database save success button - covers 7/12 columns */}
            <button
              id="btn-teach-save-db"
              type="button"
              onClick={handleSaveToDatabase}
              className="col-span-7 h-12 rounded-2xl bg-[#FFD700] hover:bg-[#FFD700]/95 text-[#1A1A1A] flex items-center justify-center gap-2 cursor-pointer text-xs font-extrabold transition-all active:scale-95 shadow-[0_4px_14px_rgba(255,215,0,0.3)]"
            >
              <Database size={14} className="stroke-[2.5]" />
              <span>Simpan Absensi</span>
            </button>

          </div>
        </div>
      )}

      {/* Floating Action Button for Downloading Attendance Records */}
      <div className="fixed bottom-20 right-6 z-40 sm:bottom-24 sm:right-8">
        <button
          id="btn-download-records-teacher"
          type="button"
          onClick={() => setIsDownloadModalOpen(true)}
          className="h-14 px-5 rounded-full bg-stone-900 border border-stone-800 text-[#FFD700] hover:text-white flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer font-bold text-sm"
        >
          <Download size={18} strokeWidth={2.5} />
          <span>Download Records</span>
        </button>
      </div>

      {/* Download Records Report Modal for Teacher */}
      <AnimatePresence>
        {isDownloadModalOpen && (
          <DownloadRecordsModal
            isOpen={isDownloadModalOpen}
            onClose={() => setIsDownloadModalOpen(false)}
            classes={classes}
            students={students}
            attendanceRecords={attendanceRecords}
            attendanceNotes={attendanceNotes}
            initialLevel={activeCategory}
            initialClassId={selectedClassId}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
