import React, { useState } from 'react';
import { X, Sparkles, UserPlus } from 'lucide-react';
import { StudentClass, Student } from '../types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: StudentClass[];
  onAddStudent: (student: Omit<Student, 'id'>) => void;
}

export default function AddStudentModal({ isOpen, onClose, classes, onAddStudent }: AddStudentModalProps) {
  const [name, setName] = useState('');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [gender, setGender] = useState<'L' | 'P'>('L');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddStudent({
      name: name.trim(),
      classId,
      gender,
      avatarUrl: `https://images.unsplash.com/photo-${gender === 'L' ? '1506794778202-cad84cf45f1d' : '1494790108377-be9c29b29330'}?w=150&auto=format&fit=crop&q=80`,
    });
    setName('');
    onClose();
  };

  return (
    <div
      id="modal-overlay"
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        id="modal-card"
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden animate-slide-up sm:animate-fade-in border border-stone-100 flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FFD700]/15 text-[#705d00] flex items-center justify-center">
              <UserPlus size={16} />
            </div>
            <h3 className="font-bold text-base text-[#1A1A1A]">Tambah Siswa Baru</h3>
          </div>
          <button
            id="btn-close-modal"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form id="form-add-student" onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Student Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="student-name-input" className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
              Nama Lengkap
            </label>
            <input
              id="student-name-input"
              type="text"
              required
              placeholder="Contoh: Muhammad Ali"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-stone-200 text-sm text-[#1A1A1A] bg-[#F2F2F7] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#FFD700]/20 focus:border-stone-300 transition-all placeholder-stone-400"
            />
          </div>

          {/* Class Select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="student-class-select" className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
              Kelas
            </label>
            <select
              id="student-class-select"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-stone-200 text-sm text-[#1A1A1A] bg-[#F2F2F7] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#FFD700]/20 focus:border-stone-300 transition-all cursor-pointer font-medium"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Gender selection */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
              Jenis Kelamin
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-gender-male"
                type="button"
                onClick={() => setGender('L')}
                className={`py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                  gender === 'L'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                    : 'bg-[#F2F2F7] border-transparent text-stone-600'
                }`}
              >
                Laki-laki (L)
              </button>
              <button
                id="btn-gender-female"
                type="button"
                onClick={() => setGender('P')}
                className={`py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer ${
                  gender === 'P'
                    ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
                    : 'bg-[#F2F2F7] border-transparent text-stone-600'
                }`}
              >
                Perempuan (P)
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              id="btn-cancel-modal"
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-stone-200 rounded-2xl text-sm font-semibold text-stone-600 hover:bg-stone-50 active:scale-95 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-submit-student"
              type="submit"
              className="flex-1 py-3 bg-[#FFD700] hover:bg-[#FFD700]/90 text-[#1A1A1A] font-bold rounded-2xl text-sm active:scale-95 transition shadow-[0_4px_12px_rgba(255,215,0,0.2)] cursor-pointer"
            >
              Simpan Siswa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
