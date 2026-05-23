import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  UserPlus,
  BadgeCheck,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  FileClock,
  AlertCircle,
  Users,
  Info,
  ChevronRight,
  Database,
  Grid,
  School,
  Settings,
  ArrowLeft,
  XCircle,
} from 'lucide-react';

import { Student, StudentClass, AttendanceStatus, DailyAttendance, AttendanceSummary } from './types';
import { INITIAL_CLASSES, INITIAL_STUDENTS } from './data';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';
import SummaryCards from './components/SummaryCards';
import StudentRow from './components/StudentRow';
import FilterControls from './components/FilterControls';
import DateSwitcher from './components/DateSwitcher';
import AddStudentModal from './components/AddStudentModal';
import TeacherDashboard from './components/TeacherDashboard';
import DateRangePickerModal from './components/DateRangePickerModal';

// Helper to format Indonesian date consistently in Admin screen
const formatIndonesianDateStr = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
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
      'Desember',
    ];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

export default function App() {
  // ---- 1. BASE STATES ----
  const [portalMode, setPortalMode] = useState<'gatekeeper' | 'admin' | 'guru'>(() => {
    const saved = localStorage.getItem('prem_portal_mode');
    return (saved === 'admin' || saved === 'guru' || saved === 'gatekeeper') ? saved : 'gatekeeper';
  });

  useEffect(() => {
    localStorage.setItem('prem_portal_mode', portalMode);
  }, [portalMode]);

  const [activeCategory, setActiveCategory] = useState<'SMP' | 'SMA'>(() => {
    const saved = localStorage.getItem('prem_active_category');
    return (saved === 'SMP' || saved === 'SMA') ? saved : 'SMA';
  });

  useEffect(() => {
    localStorage.setItem('prem_active_category', activeCategory);
  }, [activeCategory]);

  // ---- ADMIN PASSWORD MODAL STATES ----
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');

  const [classes, setClasses] = useState<StudentClass[]>(() => {
    const saved = localStorage.getItem('prem_classes');
    return saved ? JSON.parse(saved) : INITIAL_CLASSES;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('prem_students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  // ---- FIRESTORE INTEGRATION HOOK ----
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  useEffect(() => {
    setIsFirestoreLoading(true);
    const studentsCol = collection(db, 'students');

    const unsubscribe = onSnapshot(
      studentsCol,
      (snapshot) => {
        try {
          const loadedStudents: Student[] = [];
          const uniqueClassNames = new Set<string>();

          snapshot.forEach((doc) => {
            const data = doc.data();
            const rawKelas = data.kelas || 'Umum';
            uniqueClassNames.add(rawKelas);

            // Determinis jenis kelamin, default 'L' jika kosong
            const genderValue = (data.gender === 'L' || data.gender === 'P') ? data.gender : 'L';

            loadedStudents.push({
              id: doc.id,
              name: data.nama || 'Siswa Tanpa Nama',
              gender: genderValue,
              classId: rawKelas, // Memetakan field 'kelas' langsung ke basis penyaringan 'classId'
              avatarUrl: data.avatarUrl || `https://images.unsplash.com/photo-${genderValue === 'L' ? '1506794778202-cad84cf45f1d' : '1494790108377-be9c29b29330'}?w=150&auto=format&fit=crop&q=80`,
              nisn: data.nisn || data.student_id || '',
              program: data.program || 'REGULER',
              wali_kelas: data.wali_kelas || 'Belum ditentukan',
              student_id: data.student_id || doc.id
            });
          });

          // Urutkan siswa berdasarkan nama
          loadedStudents.sort((a, b) => a.name.localeCompare(b.name));

          if (loadedStudents.length > 0) {
            setStudents(loadedStudents);

            // Buat daftar kelas dinamis secara real-time berdasarkan data siswa di database!
            const dynamicClassesList: StudentClass[] = Array.from(uniqueClassNames).map((className) => ({
              id: className,
              name: className,
            })).sort((a, b) => a.name.localeCompare(b.name));

            setClasses(dynamicClassesList);
          }
          setIsFirestoreLoading(false);
          setFirestoreError(null);
        } catch (err) {
          setIsFirestoreLoading(false);
          console.error("Gagal mengurai data Firestore:", err);
        }
      },
      (error) => {
        setIsFirestoreLoading(false);
        setFirestoreError(error.message);
        console.error("Koneksi Firestore bermasalah:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // ---- FIRESTORE ATTENDANCE RECORDS SYNCHRONIZATION ----
  useEffect(() => {
    const attendanceCol = collection(db, 'attendance');

    const unsubscribe = onSnapshot(
      attendanceCol,
      (snapshot) => {
        try {
          const loadedRecords: Record<string, Record<string, AttendanceStatus>> = {};
          const loadedNotes: Record<string, Record<string, string>> = {};

          snapshot.forEach((doc) => {
            const data = doc.data();
            const dateStr = data.date;
            const studentId = data.studentId;
            const statusVal = data.status as AttendanceStatus;
            const noteVal = data.note || '';

            if (dateStr && studentId) {
              const isValidStatus = statusVal === 'Hadir' || statusVal === 'Izin' || statusVal === 'Sakit' || statusVal === 'Alpa';
              if (isValidStatus) {
                if (!loadedRecords[dateStr]) {
                  loadedRecords[dateStr] = {};
                }
                loadedRecords[dateStr][studentId] = statusVal;
              }

              if (noteVal) {
                if (!loadedNotes[dateStr]) {
                  loadedNotes[dateStr] = {};
                }
                loadedNotes[dateStr][studentId] = noteVal;
              }
            }
          });

          setAttendanceRecords(loadedRecords);
          setAttendanceNotes(loadedNotes);
        } catch (err) {
          console.error("Gagal mengurai database absensi Firestore:", err);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'attendance');
      }
    );

    return () => unsubscribe();
  }, []);

  // Current selected date: default to today (YYYY-MM-DD local time)
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Date Range state hooks for Admin screen (Dari - Sampai)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [isAdminRangePickerOpen, setIsAdminRangePickerOpen] = useState<boolean>(false);

  // Attendance Records: Record<YYYY-MM-DD, Record<studentId, AttendanceStatus>>
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, AttendanceStatus>>>(() => {
    const saved = localStorage.getItem('prem_attendance_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing attendance records:', e);
      }
    }
    
    // Seed some initial attendance for today if first load to make the app look robust and functional
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const initialToday: Record<string, AttendanceStatus> = {};
    INITIAL_STUDENTS.forEach((student, index) => {
      // Make most students present, some excused/sick/absent for illustrative purposes
      if (index % 11 === 0) {
        initialToday[student.id] = 'Sakit';
      } else if (index % 15 === 0) {
        initialToday[student.id] = 'Izin';
      } else if (index % 19 === 0) {
        initialToday[student.id] = 'Alpa';
      } else {
        initialToday[student.id] = 'Hadir';
      }
    });

    return { [todayStr]: initialToday };
  });

  // Notes: Record<YYYY-MM-DD, Record<studentId, noteString>>
  const [attendanceNotes, setAttendanceNotes] = useState<Record<string, Record<string, string>>>(() => {
    const saved = localStorage.getItem('prem_attendance_notes');
    return saved ? JSON.parse(saved) : {};
  });

  // Filters State
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals Visibility
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  // Active status statistics/tabs filter ("Semua" | "Hadir" | "Tidak Hadir")
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Hadir' | 'Izin/Sakit' | 'Alpa'>('Semua');

  // Hardcoded educator profile details matching context
  const educatorProfile = {
    email: 'msidikvasni14@guru.sma.belajar.id',
    name: 'M. Sidik Vasni',
    role: 'Wali Kelas / Guru Administrator',
    school: 'SMA Negeri Pembina',
  };

  // ---- 2. PERSISTENCE PERSISTING EFFECTS ----
  useEffect(() => {
    localStorage.setItem('prem_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('prem_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('prem_attendance_records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('prem_attendance_notes', JSON.stringify(attendanceNotes));
  }, [attendanceNotes]);


  // ---- 3. SELECTION & TRANSLATION LOGICS ----
  const activeClassLabel = useMemo(() => {
    if (selectedClassId === 'all') return 'Semua Kelas';
    const found = classes.find((c) => c.id === selectedClassId);
    return found ? `Kelas ${found.name}` : 'Semua Kelas';
  }, [selectedClassId, classes]);

  // Handle individual status change
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => {
      const dayRecords = prev[currentDate] ? { ...prev[currentDate] } : {};
      
      // Toggle off if already selected
      if (dayRecords[studentId] === status) {
        delete dayRecords[studentId]; // Set as unrecorded/empty
      } else {
        dayRecords[studentId] = status;
      }

      return {
        ...prev,
        [currentDate]: dayRecords,
      };
    });
  };

  // Handle note addition
  const handleAddNote = (studentId: string, note: string) => {
    setAttendanceNotes((prev) => {
      const dayNotes = prev[currentDate] ? { ...prev[currentDate] } : {};
      if (note.trim() === '') {
        delete dayNotes[studentId];
      } else {
        dayNotes[studentId] = note.trim();
      }
      return {
        ...prev,
        [currentDate]: dayNotes,
      };
    });
  };

  // Dynamic add new student
  const handleAddStudent = (studentData: Omit<Student, 'id'>) => {
    const newId = `std-${Date.now()}`;
    const newStudent: Student = {
      id: newId,
      ...studentData,
    };
    setStudents((prev) => [...prev, newStudent]);
  };

  // Bulk status update: Hadir Semua
  const handleHadirSemua = () => {
    // Determine students in current class selection
    const eligibleStudents = students.filter(
      (s) => selectedClassId === 'all' || s.classId === selectedClassId
    );

    setAttendanceRecords((prev) => {
      const dayRecords = prev[currentDate] ? { ...prev[currentDate] } : {};
      eligibleStudents.forEach((student) => {
        dayRecords[student.id] = 'Hadir';
      });
      return {
        ...prev,
        [currentDate]: dayRecords,
      };
    });
  };

  // Bulk status update: Reset Semua
  const handleResetSemua = () => {
    const eligibleStudents = students.filter(
      (s) => selectedClassId === 'all' || s.classId === selectedClassId
    );

    setAttendanceRecords((prev) => {
      const dayRecords = prev[currentDate] ? { ...prev[currentDate] } : {};
      eligibleStudents.forEach((student) => {
        delete dayRecords[student.id];
      });
      return {
        ...prev,
        [currentDate]: dayRecords,
      };
    });
  };

  // Filtered list output
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // 1. Class filter
      if (selectedClassId !== 'all' && student.classId !== selectedClassId) {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        if (!student.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // 3. Status selection tab filter
      const activeRecords = attendanceRecords[currentDate] || {};
      const status = activeRecords[student.id];
      if (statusFilter === 'Hadir' && status !== 'Hadir') return false;
      if (statusFilter === 'Izin/Sakit' && status !== 'Izin' && status !== 'Sakit') return false;
      if (statusFilter === 'Alpa' && status !== 'Alpa') return false;

      return true;
    });
  }, [students, selectedClassId, searchQuery, statusFilter, attendanceRecords, currentDate]);


  // ---- 4. STATISTICAL SUMMARIES CALCULATOR ----
  const activeSummary = useMemo<AttendanceSummary>(() => {
    // Calc base class filtered totals
    const classStudents = students.filter(
      (s) => selectedClassId === 'all' || s.classId === selectedClassId
    );
    const totalCount = classStudents.length;

    const startObj = new Date(startDate);
    const endObj = new Date(endDate);

    let cbHadir = 0;
    let cbIzin = 0;
    let cbSakit = 0;
    let cbAlpa = 0;

    // Get all dates in range
    const datesList: string[] = [];
    const temp = new Date(startObj);
    while (temp <= endObj) {
      const y = temp.getFullYear();
      const m = String(temp.getMonth() + 1).padStart(2, '0');
      const d = String(temp.getDate()).padStart(2, '0');
      datesList.push(`${y}-${m}-${d}`);
      temp.setDate(temp.getDate() + 1);
    }

    classStudents.forEach((student) => {
      datesList.forEach((dateStr) => {
        const activeRecords = attendanceRecords[dateStr] || {};
        const status = activeRecords[student.id];
        if (status === 'Hadir') cbHadir++;
        else if (status === 'Izin') cbIzin++;
        else if (status === 'Sakit') cbSakit++;
        else if (status === 'Alpa') cbAlpa++;
      });
    });

    const totalDays = datesList.length;
    const totalPossibleRecords = totalCount * totalDays;
    
    // Rate calculations
    const rate = totalPossibleRecords > 0 ? (cbHadir / totalPossibleRecords) * 100 : 0;

    return {
      total: totalCount,
      hadir: cbHadir,
      izin: cbIzin,
      sakit: cbSakit,
      alpa: cbAlpa,
      rate,
    };
  }, [students, selectedClassId, attendanceRecords, startDate, endDate]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 overflow-x-hidden w-full">

      <AnimatePresence mode="wait">
        {portalMode === 'gatekeeper' ? (
          <div
            id="gatekeeper-view"
            className="flex-grow flex flex-col justify-center items-center min-h-screen px-4 sm:px-6 py-12 relative overflow-hidden bg-stone-50 w-full"
          >
          {/* Subtle light background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-stone-200/30 to-transparent blur-[120px] opacity-70" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-amber-500/5 to-transparent blur-[130px] opacity-60" />
          </div>

          <div className="max-w-4xl w-full flex flex-col items-center gap-8 sm:gap-10 relative z-10">
            {/* Elegant Gatekeeper Header */}
            <div className="text-center flex flex-col items-center gap-4 w-full">
              <motion.div
                initial={{ scale: 1, y: 0 }}
                animate={{ 
                  y: [0, -6, 0]
                }}
                transition={{ 
                  y: {
                    repeat: Infinity,
                    duration: 4,
                    ease: "easeInOut"
                  }
                }}
                className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center overflow-hidden pointer-events-none logo-shine-container rounded-3xl"
              <img
  src="https://www.image2url.com/r2/default/images/1778032976429-fb84224a-3e08-4092-b38f-529e608a47d2.png"
  alt="Al-Wildan Logo"
  className="w-full h-full object-contain filter drop-shadow-md" // <-- Sebelum dikembalikan, di sini ada class "grayscale brightness-95"
  referrerPolicy="no-referrer"
/>
              </motion.div>
              <div className="flex flex-col items-center mt-2 w-full px-2">
                <span className="text-[11px] sm:text-[12px] font-extrabold text-stone-500 tracking-[0.25em] uppercase mb-1">
                  Student Attendance
                </span>
                <h1 className="text-[17px] sm:text-2xl md:text-3xl font-black text-stone-900 tracking-tight leading-tight whitespace-nowrap text-center max-w-full overflow-hidden">
                  AL - WILDAN ISLAMIC SCHOOL 3 BSD CITY
                </h1>
              </div>
            </div>

            {/* Three Portal Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              
              {/* Card 1: SMA */}
              <button
                id="btn-portal-guru-sma"
                onClick={() => {
                  setActiveCategory('SMA');
                  setPortalMode('guru');
                }}
                className="group relative bg-white hover:bg-stone-50/80 rounded-3xl p-6 text-left border border-stone-200/90 hover:border-amber-400 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] cursor-pointer"
              >
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-center text-stone-700 group-hover:bg-amber-50 group-hover:border-amber-200 group-hover:text-amber-600 transition-colors duration-300">
                    <GraduationCap size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-stone-850 group-hover:text-stone-950 transition-colors tracking-wide">
                      SMA
                    </h3>
                    <p className="text-stone-500 text-xs mt-2 leading-relaxed">
                      Akses presensi siswa tingkat Sekolah Menengah Atas.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-end w-full mt-6 pt-4 border-t border-stone-100/80">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 group-hover:text-amber-600 transition-colors">
                      Masuk
                    </span>
                    <span className="text-[12px] font-bold text-stone-700 group-hover:text-amber-600 mt-1 leading-tight transition-colors">
                      Dashboard Absensi Siswa SMA
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-stone-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all flex-shrink-0 mb-0.5" />
                </div>
              </button>

              {/* Card 2: SMP */}
              <button
                id="btn-portal-guru-smp"
                onClick={() => {
                  setActiveCategory('SMP');
                  setPortalMode('guru');
                }}
                className="group relative bg-white hover:bg-stone-50/80 rounded-3xl p-6 text-left border border-stone-200/90 hover:border-amber-400 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] cursor-pointer"
              >
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-center text-stone-700 group-hover:bg-amber-50 group-hover:border-amber-200 group-hover:text-amber-600 transition-colors duration-300">
                    <Grid size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-stone-850 group-hover:text-stone-950 transition-colors tracking-wide">
                      SMP
                    </h3>
                    <p className="text-stone-500 text-xs mt-2 leading-relaxed">
                      Akses presensi siswa tingkat Sekolah Menengah Pertama.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-end w-full mt-6 pt-4 border-t border-stone-100/80">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 group-hover:text-amber-600 transition-colors">
                      Masuk
                    </span>
                    <span className="text-[12px] font-bold text-stone-700 group-hover:text-amber-600 mt-1 leading-tight transition-colors">
                      Dashboard Absensi Siswa SMP
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-stone-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all flex-shrink-0 mb-0.5" />
                </div>
              </button>

              {/* Card 3: Admin */}
              <button
                id="btn-portal-admin"
                onClick={() => {
                  if (sessionStorage.getItem('prem_admin_auth') === 'true') {
                    setPortalMode('admin');
                  } else {
                    setAdminPasswordInput('');
                    setAdminPasswordError('');
                    setIsAdminPasswordModalOpen(true);
                  }
                }}
                className="group relative bg-white hover:bg-stone-50/80 rounded-3xl p-6 text-left border border-stone-200/90 hover:border-amber-400 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[220px] cursor-pointer"
              >
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-center text-stone-700 group-hover:bg-amber-50 group-hover:border-amber-200 group-hover:text-amber-600 transition-colors duration-300">
                    <Settings size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-stone-850 group-hover:text-stone-950 transition-colors tracking-wide">
                      ADMIN
                    </h3>
                    <p className="text-stone-500 text-xs mt-2 leading-relaxed">
                      Manajemen master data siswa, kelas, statistik, serta monitoring absensi real-time.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center w-full mt-6 pt-4 border-t border-stone-100/80">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-600 group-hover:text-amber-600 transition-colors">
                    Masuk
                  </span>
                  <ChevronRight size={14} className="text-stone-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </button>

            </div>
          </div>
          </div>
        ) : portalMode === 'admin' ? (
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-grow w-full"
          >
          <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 md:pb-12">
            {/* Dynamic Profile Cover (Subtle Glassmorphism overlay over profile info header) */}
            <header id="app-profile-header" className="relative text-white overflow-hidden bg-stone-900 shadow-md">
              {/* Abstract design elements to give it a premium tier aura */}
              <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 to-transparent pointer-events-none" />
              <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-[#FFD700]/10 to-transparent" />

              {/* Floating background gradient circles */}
              <div className="absolute -top-12 -left-12 w-48 h-48 bg-stone-800/80 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute top-1/2 right-12 w-32 h-32 bg-[#FFD700]/5 rounded-full blur-xl pointer-events-none" />

              <div className="max-w-4xl mx-auto px-5 py-6 sm:py-8 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* Identity block */}
                <div className="flex items-center gap-3.5">
                  <button
                    id="admin-back-to-gatekeeper"
                    type="button"
                    onClick={() => setPortalMode('gatekeeper')}
                    className="mr-1 bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700/60 rounded-full w-10 h-10 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md"
                    title="Kembali ke Gatekeeper"
                  >
                    <ArrowLeft size={16} strokeWidth={2.5} />
                  </button>
                  <div className="w-14 h-14 rounded-full bg-stone-800 border-2 border-[#FFD700] shadow flex items-center justify-center text-[#FFD700] overflow-hidden select-none">
                    <GraduationCap size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                        Premium Attendance
                      </h1>
                      <span className="bg-[#FFD700] text-[#1A1A1A] font-extrabold text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        PRO
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 mt-1 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Sinkronisasi Aktif • {educatorProfile.email}
                    </p>
                  </div>
                </div>

                {/* Quick Stats Metadata Pill */}
                <div className="bg-stone-800/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-stone-700/60 text-xs flex flex-col items-start gap-1 w-full md:w-auto">
                  <span className="text-[10px] text-[#FFD700] font-bold tracking-widest uppercase">
                    ADMINISTRATOR
                  </span>
                  <span className="font-semibold text-white leading-none">
                    {educatorProfile.name}
                  </span>
                  <span className="text-[10px] text-stone-400">Wali Kelas - {educatorProfile.school}</span>
                </div>
              </div>
            </header>

            {/* Main Container Wrapper */}
            <main className="max-w-4xl mx-auto px-5 py-6 flex flex-col gap-6">
              
              {/* Spacer section 1: Date selections */}
              <motion.section 
                id="date-section"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col gap-2.5"
              >
                <h2 className="text-[11px] font-bold tracking-wider text-[#8E8E93] uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                  Rentang Tanggal Laporan
                </h2>
                
                {/* Single elegant capsule filter button for Date Range on Admin Portal */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAdminRangePickerOpen(true)}
                    className="w-full bg-white text-xs px-4 py-3.5 rounded-2xl border border-stone-200 text-stone-800 font-bold flex items-center justify-between cursor-pointer focus:ring-4 focus:ring-[#FFD700]/15 transition-all text-left shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:border-stone-300"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-stone-400 uppercase bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-200/50">PERIODE</span>
                      <span className="text-stone-800 font-bold truncate">
                        {formatIndonesianDateStr(startDate)} s.d {formatIndonesianDateStr(endDate)}
                      </span>
                    </div>
                    <Calendar className="text-amber-500 flex-shrink-0 ml-2" size={14} />
                  </button>
                </div>
              </motion.section>

              {/* Spacer section 2: Real-time calculation graphs / summary widgets */}
              <motion.section 
                id="stats-section"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-bold tracking-wider text-[#8E8E93] uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700]" />
                    RINGKASAN ABSENSI (KELAS: {activeClassLabel.toUpperCase()})
                  </h2>
                </div>
                <SummaryCards summary={activeSummary} />
              </motion.section>

              {/* Spacer section 3: List Controls and Searching Filters */}
              <motion.section 
                id="filters-section"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <FilterControls
                  classes={classes}
                  selectedClassId={selectedClassId}
                  onClassChange={setSelectedClassId}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onHadirSemua={handleHadirSemua}
                  onResetSemua={handleResetSemua}
                />
              </motion.section>

              {/* Spacer section 4: Main List Content */}
              <section id="students-section" className="flex flex-col gap-3.5">
                {/* Section Header with count and filter state chips */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/60 pb-2">
                  <div className="flex items-baseline gap-1.5">
                    <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                      DAFTAR SISWA ({formatIndonesianDateStr(currentDate)})
                    </h3>
                    <span className="text-xs text-[#8E8E93] font-medium">
                      ({filteredStudents.length} Terpilih)
                    </span>
                  </div>

                  {/* Inline Filter pill tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                    {(['Semua', 'Hadir', 'Izin/Sakit', 'Alpa'] as const).map((tab) => {
                      const isActive = statusFilter === tab;
                      return (
                        <button
                          id={`tab-filter-${tab}`}
                          key={tab}
                          type="button"
                          onClick={() => setStatusFilter(tab)}
                          className={`px-3 py-1 text-xs rounded-full font-medium cursor-pointer transition-all whitespace-nowrap ${
                            isActive
                              ? 'bg-stone-900 text-white shadow-sm'
                              : 'text-stone-500 hover:text-stone-800 bg-white border border-stone-200/50'
                          }`}
                        >
                          {tab}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Students List Wrapper */}
                <div className="flex flex-col gap-3">
                  <AnimatePresence mode="popLayout">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => {
                        const classLabel = classes.find((c) => c.id === student.classId)?.name || '';
                        const activeRecords = attendanceRecords[currentDate] || {};
                        const activeNote = attendanceNotes[currentDate]?.[student.id];

                        return (
                          <motion.div
                            key={student.id}
                            layout="position"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.25 }}
                          >
                            <StudentRow
                              student={student}
                              classNameLabel={classLabel}
                              currentStatus={activeRecords[student.id]}
                              onStatusChange={handleStatusChange}
                              onAddNote={handleAddNote}
                              savedNote={activeNote}
                            />
                          </motion.div>
                        );
                      })
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white rounded-3xl p-8 text-center border border-dashed border-stone-200"
                      >
                        <Users className="mx-auto text-stone-300 mb-2" size={32} />
                        <p className="text-stone-500 text-sm font-semibold">
                          Tidak ada siswa yang sesuai kriteria pencarian
                        </p>
                        <p className="text-stone-400 text-xs mt-1">
                          Coba bersihkan pencarian atau ubah filter untuk menampilkan kembali seluruh siswa.
                        </p>
                        <button
                          id="btn-clear-search-empty-state"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedClassId('all');
                            setStatusFilter('Semua');
                          }}
                          className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold transition-all hover:bg-stone-800"
                        >
                          Reset Filter
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>
            </main>

            {/* Floating Action Button for Adding New Students */}
            {/* POSITIONED WITH 32px MOBILE gesturual safe areas at the bottom of standard layouts */}
            <div className="fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8">
              <button
                id="btn-add-student"
                type="button"
                onClick={() => setIsAddStudentOpen(true)}
                className="h-14 px-5 rounded-full bg-stone-900 border border-stone-800 text-[#FFD700] hover:text-white flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer font-bold text-sm"
              >
                <UserPlus size={18} strokeWidth={2.5} />
                <span>Siswa Baru</span>
              </button>
            </div>

            {/* Add Student Modal */}
            <AddStudentModal
              isOpen={isAddStudentOpen}
              onClose={() => setIsAddStudentOpen(false)}
              classes={classes}
              onAddStudent={handleAddStudent}
            />

            {/* Date Range Picker Modal for Admin Portal */}
            <DateRangePickerModal
              isOpen={isAdminRangePickerOpen}
              onClose={() => setIsAdminRangePickerOpen(false)}
              startDate={startDate}
              endDate={endDate}
              onApply={(start, end) => {
                setStartDate(start);
                setEndDate(end);
                // Synchronize currentDate with the end date so daily edits on student list apply to that active end-date
                setCurrentDate(end);
              }}
            />
          </div>
        </motion.div>
        ) : (
          <motion.div
            key="guru"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex-grow w-full"
          >
            <TeacherDashboard
              classes={classes}
              students={students}
              attendanceRecords={attendanceRecords}
              setAttendanceRecords={setAttendanceRecords}
              attendanceNotes={attendanceNotes}
              setAttendanceNotes={setAttendanceNotes}
              educatorProfile={educatorProfile}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              onBackToGatekeeper={() => setPortalMode('gatekeeper')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Password Verification Dialogue Modal */}
      <AnimatePresence>
        {isAdminPasswordModalOpen && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[999] flex items-center justify-center p-4">
            <div
              id="admin-pwd-scrim"
              className="absolute inset-0 cursor-default"
              onClick={() => setIsAdminPasswordModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-72 max-w-full p-5 shadow-2xl border border-stone-100 relative z-10 flex flex-col gap-4 text-stone-900 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Settings size={14} />
                  </div>
                  <span className="text-xs font-black tracking-tight text-stone-900 uppercase">
                    Verifikasi Admin
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdminPasswordModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 hover:text-stone-850 transition cursor-pointer"
                >
                  <XCircle size={14} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminPasswordInput === 'Athifa') {
                    sessionStorage.setItem('prem_admin_auth', 'true');
                    setIsAdminPasswordModalOpen(false);
                    setPortalMode('admin');
                  } else {
                    setAdminPasswordError('Password salah. Silakan coba lagi!');
                  }
                }}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest pl-1">
                    Password
                  </label>
                  <input
                    type="password"
                    autoFocus
                    required
                    placeholder="Masukkan password admin..."
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      if (adminPasswordError) setAdminPasswordError('');
                    }}
                    className="w-full bg-[#F2F2F7] text-stone-900 text-xs px-3.5 py-3 rounded-2xl border border-transparent focus:bg-white focus:border-stone-200 focus:outline-none focus:ring-4 focus:ring-[#FFD700]/15 transition-all placeholder-stone-400 font-bold"
                  />
                  {adminPasswordError && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 pl-1 flex items-center gap-1 leading-none">
                      <AlertCircle size={11} className="stroke-[2.5]" />
                      <span>{adminPasswordError}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAdminPasswordModalOpen(false)}
                    className="flex-grow py-2.5 rounded-2xl bg-stone-50 hover:bg-stone-100 text-stone-500 border border-stone-150 text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-grow py-2.5 rounded-2xl bg-[#FFD700] hover:bg-[#FFD700]/95 text-stone-900 text-xs font-black transition-all cursor-pointer text-center"
                  >
                    Masuk
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
