import React from 'react';
import {
  School,
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  GraduationCap,
  Award,
  HelpCircle,
  Package,
  Calendar,
  CalendarDays,
  BadgeAlert,
  ClipboardCheck,
  FileCheck2,
  Activity,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Settings,
  BookMarked,
  UserCog,
  LogOut,
  X,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  MonitorPlay,
  Database
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  currentPage: string;
  isOpen: boolean;
  isCollapsed?: boolean;
  onNavigate: (page: string) => void;
  onCloseMobile: () => void;
  onToggleCollapse?: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  currentPage,
  isOpen,
  isCollapsed = false,
  onNavigate,
  onCloseMobile,
  onToggleCollapse,
  onLogout
}) => {
  const isStudent = user.ROLE === 'STUDENT';
  const isTeacher = user.ROLE === 'TEACHER';

  const menuAdmin = [
    { section: 'MENU UTAMA' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { section: 'MASTER DATA' },
    { id: 'students', label: 'Data Siswa', icon: Users },
    { id: 'teachers', label: 'Data Guru', icon: UserCheck },
    { id: 'classes', label: 'Data Kelas', icon: GraduationCap },
    { id: 'subjects', label: 'Mata Pelajaran', icon: BookOpen },
    { id: 'assessmentTypes', label: 'Jenis Penilaian', icon: Award },
    { section: 'JADWAL & PENGATURAN' },
    { id: 'timetable', label: 'Jadwal Pelajaran', icon: CalendarDays },
    { id: 'cbtSchedules', label: 'Jadwal Ujian CBT', icon: Calendar },
    { id: 'settings', label: 'Pengaturan Sekolah', icon: Settings },
    { id: 'migration', label: 'Migrasi ke Supabase', icon: Database },
    { section: 'BANK SOAL & UJIAN' },
    { id: 'questions', label: 'Bank Soal', icon: HelpCircle },
    { id: 'questionPackages', label: 'Paket Soal', icon: Package },
    { id: 'participants', label: 'Peserta Ujian', icon: BadgeAlert },
    { section: 'MONITORING & KOREKSI' },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'reviews', label: 'Koreksi Uraian', icon: FileCheck2 },
    { id: 'results', label: 'Rekap Nilai / Hasil', icon: ClipboardCheck },
    { section: 'CETAK DOKUMEN' },
    { id: 'printCards', label: 'Kartu Peserta', icon: CreditCard },
    { id: 'printAttendance', label: 'Daftar Hadir', icon: FileSpreadsheet },
    { id: 'printMinutes', label: 'Berita Acara', icon: FileText },
    { section: 'PANDUAN & ALUR' },
    { id: 'workflowGuide', label: 'Langkah Pengerjaan', icon: Compass }
  ];

  const menuTeacher = [
    { section: 'MENU UTAMA' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { section: 'BANK SOAL' },
    { id: 'questions', label: 'Bank Soal (Buat Soal)', icon: HelpCircle },
    { id: 'questionPackages', label: 'Paket Soal', icon: Package },
    { section: 'UJIAN & NILAI' },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'reviews', label: 'Koreksi Uraian / Essay', icon: FileCheck2 },
    { id: 'results', label: 'Rekap Nilai Ujian', icon: ClipboardCheck },
    { id: 'cbtSchedules', label: 'Jadwal Ujian CBT', icon: Calendar },
    { section: 'CETAK DOKUMEN' },
    { id: 'printCards', label: 'Kartu Peserta', icon: CreditCard },
    { id: 'printAttendance', label: 'Daftar Hadir', icon: FileSpreadsheet },
    { id: 'printMinutes', label: 'Berita Acara', icon: FileText },
    { section: 'DATA REFERENSI' },
    { id: 'timetable', label: 'Jadwal Mengajar', icon: CalendarDays },
    { id: 'students', label: 'Data Siswa', icon: Users },
    { id: 'classes', label: 'Data Kelas', icon: GraduationCap },
    { id: 'subjects', label: 'Mata Pelajaran', icon: BookOpen },
    { section: 'AKUN & PANDUAN' },
    { id: 'profile', label: 'Profil & Password', icon: UserCog },
    { id: 'workflowGuide', label: 'Langkah Pengerjaan', icon: Compass }
  ];

  const menuStudent = [
    { section: 'MENU UTAMA' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { section: 'UJIAN SAYA' },
    { id: 'availableExams', label: 'Daftar Ujian', icon: BookMarked },
    { id: 'examRoom', label: 'Ruang Ujian', icon: MonitorPlay },
    { id: 'myResults', label: 'Hasil Ujian', icon: ClipboardCheck },
    { section: 'AKADEMIK & JADWAL' },
    { id: 'timetable', label: 'Jadwal Pelajaran', icon: CalendarDays },
    { section: 'AKUN & PANDUAN' },
    { id: 'profile', label: 'Profil & Password', icon: UserCog },
    { id: 'workflowGuide', label: 'Panduan Ujian', icon: Compass }
  ];

  const menu = isStudent ? menuStudent : isTeacher ? menuTeacher : menuAdmin;

  const getInitials = (name: string) => {
    return (name || 'US')
      .split(/\s+/)
      .slice(0, 2)
      .map(s => s[0])
      .join('')
      .toUpperCase();
  };

  const roleLabel = {
    ADMIN: 'Administrator',
    TEACHER: 'Guru Pengampu',
    STUDENT: 'Siswa'
  }[user.ROLE] || user.ROLE;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 bg-white text-[#1A1C1E] z-50 flex flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } w-64 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } shadow-xl lg:shadow-none border-r border-[#DEE2E6]`}>
        {/* Header */}
        <div className={`h-16 flex items-center justify-between border-b border-[#DEE2E6] bg-white transition-all ${
          isCollapsed ? 'px-3 justify-center' : 'px-5'
        }`}>
          <div className="flex items-center gap-3 font-bold tracking-tight text-base text-[#1A1C1E] overflow-hidden">
            <div
              className="w-9 h-9 rounded-lg bg-[#0052CC] text-white grid place-items-center shadow-xs flex-shrink-0 cursor-pointer"
              onClick={() => onNavigate('dashboard')}
              title="CBT MAS MUHAMMADIYAH CIKARAMAS"
            >
              <School className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="leading-tight font-extrabold text-[#1A1C1E] text-xs truncate">
                  CBT MAS MUHAMMADIYAH
                </span>
                <span className="text-[10px] font-bold text-[#0052CC] uppercase tracking-wider truncate">
                  CIKARAMAS
                </span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden text-[#6C757D] hover:text-[#1A1C1E] p-1.5 rounded-md hover:bg-[#F8F9FA]"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle in header */}
          {onToggleCollapse && !isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex text-[#6C757D] hover:text-[#0052CC] hover:bg-[#F0F4FF] p-1.5 rounded-md transition-colors"
              title="Ciutkan Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed Expand Trigger for Desktop */}
        {isCollapsed && onToggleCollapse && (
          <div className="hidden lg:flex justify-center py-2 border-b border-[#F1F3F5]">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-md text-[#6C757D] hover:text-[#0052CC] hover:bg-[#F0F4FF] transition-colors"
              title="Perluas Sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 text-xs">
          {menu.map((item, idx) => {
            if (item.section) {
              if (isCollapsed) {
                return (
                  <div
                    key={`sec-${idx}`}
                    className="my-2 border-t border-[#E9ECEF] mx-1"
                    title={item.section}
                  />
                );
              }
              return (
                <div
                  key={`sec-${idx}`}
                  className="text-[10px] font-bold text-[#ADB5BD] tracking-wider px-3 pt-3.5 pb-1 uppercase"
                >
                  {item.section}
                </div>
              );
            }

            const Icon = item.icon!;
            const isActive = currentPage === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate(item.id!);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center rounded-lg font-medium transition-all text-left ${
                    isCollapsed
                      ? 'justify-center p-2.5'
                      : 'gap-3 px-3 py-2'
                  } ${
                    isActive
                      ? 'bg-[#E7F0FF] text-[#0052CC] font-semibold shadow-xs'
                      : 'text-[#495057] hover:text-[#1A1C1E] hover:bg-[#F8F9FA]'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#0052CC]' : 'text-[#6C757D]'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>

                {/* Floating Tooltip when Collapsed */}
                {isCollapsed && (
                  <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-[#1A1C1E] text-white text-[11px] font-medium rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none items-center">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className={`p-3 bg-[#F8F9FA] border-t border-[#DEE2E6] flex items-center transition-all ${
          isCollapsed ? 'flex-col gap-2 justify-center' : 'gap-3'
        }`}>
          <div
            className="w-8 h-8 rounded-lg bg-[#E7F0FF] border border-[#B3D1FF] text-[#0052CC] font-bold text-xs grid place-items-center flex-shrink-0 shadow-xs cursor-pointer"
            onClick={() => onNavigate('profile')}
            title={user.NAME}
          >
            {getInitials(user.NAME)}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onNavigate('profile')}>
              <div className="text-xs font-bold text-[#1A1C1E] truncate">{user.NAME}</div>
              <div className="text-[10px] text-[#6C757D] truncate font-medium">{roleLabel}</div>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            title="Keluar dari Aplikasi"
            className="text-[#6C757D] hover:text-[#DC3545] hover:bg-white border border-transparent hover:border-[#DEE2E6] p-1.5 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};

