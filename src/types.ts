export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';

export interface StudentClass {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
  gender: 'L' | 'P'; // Laki-laki / Perempuan
  classId: string;
  avatarUrl?: string;
  nisn?: string;
  program?: string;
  wali_kelas?: string;
  student_id?: string;
}

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
  timeModified?: string;
}

export interface DailyAttendance {
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceStatus>; // studentId -> status
}

export interface AttendanceSummary {
  total: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  rate: number;
}
