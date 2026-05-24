import { Student, StudentClass } from './types';

export const INITIAL_CLASSES: StudentClass[] = [
  { id: '12-mipa-1', name: '12 MIPA 1' },
  { id: '12-mipa-2', name: '12 MIPA 2' },
  { id: '12-ips-1', name: '12 IPS 1' },
  { id: '12-ips-2', name: '12 IPS 2' },
];

export const INITIAL_STUDENTS: Student[] = [
  // 12 MIPA 1
  {
    id: 'std-101',
    name: 'Aditya Nugraha',
    gender: 'L',
    classId: '12-mipa-1',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-102',
    name: 'Citra Lestari',
    gender: 'P',
    classId: '12-mipa-1',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-103',
    name: 'Dimas Saputra',
    gender: 'L',
    classId: '12-mipa-1',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-104',
    name: 'Eka Prasetya',
    gender: 'L',
    classId: '12-mipa-1',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-105',
    name: 'Farhan Hidayat',
    gender: 'L',
    classId: '12-mipa-1',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-106',
    name: 'Gita Amalia',
    gender: 'P',
    classId: '12-mipa-1',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },

  // 12 MIPA 2
  {
    id: 'std-201',
    name: 'Hadi Wijaya',
    gender: 'L',
    classId: '12-mipa-2',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-202',
    name: 'Indah Permatasari',
    gender: 'P',
    classId: '12-mipa-2',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-203',
    name: 'Kartika Dewi',
    gender: 'P',
    classId: '12-mipa-2',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-204',
    name: 'Lutfi Hakim',
    gender: 'L',
    classId: '12-mipa-2',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-205',
    name: 'Nabila Syahputri',
    gender: 'P',
    classId: '12-mipa-2',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },

  // 12 IPS 1
  {
    id: 'std-301',
    name: 'Muhammad Fariz',
    gender: 'L',
    classId: '12-ips-1',
    avatarUrl: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-302',
    name: 'Putri Wahyuni',
    gender: 'P',
    classId: '12-ips-1',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-303',
    name: 'Rian Ramandhika',
    gender: 'L',
    classId: '12-ips-1',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-304',
    name: 'Siti Rahmawati',
    gender: 'P',
    classId: '12-ips-1',
    avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-305',
    name: 'Taufik Hidayat',
    gender: 'L',
    classId: '12-ips-1',
    avatarUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
  },

  // 12 IPS 2
  {
    id: 'std-401',
    name: 'Utami Putri',
    gender: 'P',
    classId: '12-ips-2',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-402',
    name: 'Vina Panduwinata',
    gender: 'P',
    classId: '12-ips-2',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-403',
    name: 'Wawan Kurniawan',
    gender: 'L',
    classId: '12-ips-2',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-404',
    name: 'Yasmine Almira',
    gender: 'P',
    classId: '12-ips-2',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'std-405',
    name: 'Zainal Abidin',
    gender: 'L',
    classId: '12-ips-2',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
];
