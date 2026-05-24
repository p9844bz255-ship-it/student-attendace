import React, { useState } from 'react';
import { Check, Info } from 'lucide-react';
import { Student, AttendanceStatus } from '../types';
import { motion } from 'motion/react';
import StudentAvatar from './StudentAvatar';

interface StudentRowProps {
  student: Student;
  classNameLabel: string;
  currentStatus: AttendanceStatus | undefined;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onAddNote?: (studentId: string, note: string) => void;
  savedNote?: string;
}

export default function StudentRow({
  student,
  classNameLabel,
  currentStatus,
  onStatusChange,
  onAddNote,
  savedNote = '',
}: StudentRowProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(savedNote);

  // Status list
  const statuses: AttendanceStatus[] = ['Hadir', 'Izin', 'Sakit', 'Alpa'];

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddNote) {
      onAddNote(student.id, noteText);
    }
    setShowNoteInput(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      id={`student-row-${student.id}`}
      className="bg-white p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-stone-100/80 transition-all duration-300 hover:border-stone-200/50"
    >
      {/* Student Details */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <StudentAvatar
            name={student.name}
            gender={student.gender}
            sizeClass="w-11 h-11"
          />
          {/* Gender Indicator badge */}
          <span className={`absolute -bottom-1 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center border border-white shadow-sm ${
            student.gender === 'L' ? 'bg-blue-500 text-white' : 'bg-rose-500 text-white'
          }`}>
            {student.gender}
          </span>
        </div>

        {/* Text Details */}
        <div>
          <h4 className="text-base font-bold text-[#1A1A1A] leading-tight flex items-center gap-1.5 flex-wrap">
            {student.name}
          </h4>
          {savedNote && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.2 rounded font-medium border border-amber-100 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-amber-500" />
                Catatan: {savedNote.length > 20 ? `${savedNote.slice(0, 18)}...` : savedNote}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Media & Action Chips */}
      <div className="flex flex-col gap-2">
        {/* Attendance interactive status pill button row */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 sm:justify-end">
          {statuses.map((status) => {
            const isActive = currentStatus === status;
            
            // Stylings according to Indonesian design system specs:
            // Active: Gold background, charcoal text
            // Inactive: White background, 1px light gray border, charcoal text
            let chipStyle = '';
            if (isActive) {
              chipStyle = 'bg-[#FFD700] text-[#1A1A1A] font-semibold border border-[#FFD700] ring-2 ring-[#FFD700]/20 shadow-sm scale-[1.03]';
            } else {
              chipStyle = 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200/80';
            }

            return (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                id={`btn-status-${student.id}-${status}`}
                key={status}
                onClick={() => onStatusChange(student.id, status)}
                type="button"
                className={`px-3 py-2 text-xs font-medium rounded-full cursor-pointer transition-all duration-200 flex items-center justify-center gap-1 h-9 min-w-[58px] ${chipStyle}`}
              >
                {isActive && <Check size={11} className="stroke-[3px]" />}
                {status}
              </motion.button>
            );
          })}

          {/* Note toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            id={`btn-note-toggle-${student.id}`}
            type="button"
            onClick={() => setShowNoteInput(!showNoteInput)}
            className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all cursor-pointer ${
              showNoteInput || savedNote
                ? 'bg-[#5d5e63]/10 border-stone-300 text-stone-700'
                : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-400'
            }`}
            title="Tambah Catatan"
          >
            <Info size={15} />
          </motion.button>
        </div>

        {/* Dynamic Note Overlay or Inline Input */}
        {showNoteInput && (
          <form
            id={`form-note-${student.id}`}
            onSubmit={handleNoteSubmit}
            className="flex items-center gap-2 mt-1.5 justify-end"
          >
            <input
              id={`input-note-${student.id}`}
              type="text"
              placeholder="Sakit apa/Alasan izin..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/30 w-full md:w-56"
              autoFocus
            />
            <button
              id={`btn-submit-note-${student.id}`}
              type="submit"
              className="bg-stone-900 text-white text-xs px-2.5 py-1.5 rounded-xl font-medium hover:bg-stone-800 transition cursor-pointer"
            >
              Simpan
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
