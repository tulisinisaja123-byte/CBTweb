import React from 'react';
import {
  Menu,
  Bell,
  FileCode,
  Users,
  LogOut,
  Check,
  Shield,
  GraduationCap,
  User as UserIcon,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  School,
  ShieldCheck
} from 'lucide-react';
import { User } from '../types';
import { RealtimeIndicator } from './RealtimeIndicator';

interface TopNavbarProps {
  user: User;
  currentPageTitle: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar: () => void;
  onToggleCollapse?: () => void;
  onOpenAppsScript: () => void;
  onOpenSupabaseRls?: () => void;
  onQuickSwitchUser: (username: string) => void;
  onLogout: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  user,
  currentPageTitle,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onToggleCollapse,
  onOpenAppsScript,
  onOpenSupabaseRls,
  onQuickSwitchUser,
  onLogout
}) => {
  const [showSwitchMenu, setShowSwitchMenu] = React.useState(false);

  const getInitials = (name: string) => {
    return (name || 'US')
      .split(/\s+/)
      .slice(0, 2)
      .map(s => s[0])
      .join('')
      .toUpperCase();
  };

  const roleConfig = {
    ADMIN: {
      label: 'Administrator',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Shield,
      desc: 'Master data, jadwal & pengaturan sekolah'
    },
    TEACHER: {
      label: 'Guru Pengampu',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: GraduationCap,
      desc: 'Bank soal, live monitoring & rekap nilai'
    },
    STUDENT: {
      label: 'Siswa Peserta CBT',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: UserIcon,
      desc: 'Daftar ujian, ruang ujian CBT & nilai'
    }
  }[user.ROLE] || {
    label: user.ROLE,
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: Users,
    desc: 'Pengguna terdaftar'
  };

  const ActiveRoleIcon = roleConfig.icon;

  return (
    <header className="h-16 bg-white border-b border-[#DEE2E6] sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 shadow-xs">
      {/* Left side: Hamburger/Collapse + School / Page Title */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg bg-[#F8F9FA] border border-[#DEE2E6] hover:bg-[#E9ECEF] text-[#1A1C1E] transition-colors"
          title="Buka Navigasi Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle in Navbar */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-2 rounded-lg bg-[#F8F9FA] border border-[#DEE2E6] hover:bg-[#E9ECEF] text-[#495057] hover:text-[#0052CC] transition-colors"
            title={isSidebarCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[#0052CC]" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        {/* School branding on small screens */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-7 h-7 rounded-md bg-[#0052CC] text-white grid place-items-center shadow-xs">
            <School className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col min-w-0">
          <span className="hidden sm:block text-[10px] font-bold text-[#6C757D] uppercase tracking-wider">
            CBT MAS MUHAMMADIYAH CIKARAMAS
          </span>
          <h2 className="text-xs sm:text-sm md:text-base font-bold text-[#1A1C1E] tracking-tight truncate">
            {currentPageTitle}
          </h2>
        </div>
      </div>

      {/* Right side: Quick-Switch Role, Sync Indicator, Apps Script & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {/* Quick-Switch Role Dropdown / Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSwitchMenu(!showSwitchMenu)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all shadow-2xs ${roleConfig.color} hover:shadow-xs cursor-pointer`}
            title="Ganti Peran Pengguna (Admin, Guru, Siswa)"
          >
            <ActiveRoleIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-slate-500 font-normal">Peran:</span>
            <span className="font-bold">{roleConfig.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showSwitchMenu ? 'rotate-180' : ''}`} />
          </button>

          {showSwitchMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSwitchMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[#DEE2E6] p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 border-b border-[#F1F3F5] mb-1">
                  <div className="text-[11px] font-extrabold text-[#1A1C1E] uppercase tracking-wider">
                    Ganti Peran Instan (Demo / Pengujian)
                  </div>
                  <div className="text-[10px] text-[#6C757D] mt-0.5">
                    Uji hak akses sistem CBT MAS MUHAMMADIYAH CIKARAMAS
                  </div>
                </div>

                {/* Option 1: Administrator */}
                <button
                  type="button"
                  onClick={() => {
                    onQuickSwitchUser('admin');
                    setShowSwitchMenu(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-start justify-between transition-colors ${
                    user.ROLE === 'ADMIN'
                      ? 'bg-blue-50/80 border border-blue-200 text-blue-900'
                      : 'hover:bg-[#F8F9FA] text-[#1A1C1E]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-md bg-blue-100 text-blue-700 mt-0.5">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        Administrator
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">admin</span>
                      </div>
                      <div className="text-[10px] text-[#6C757D] mt-0.5">
                        Master Data (Siswa, Guru, Kelas, Mapel), Jadwal & Pengaturan
                      </div>
                    </div>
                  </div>
                  {user.ROLE === 'ADMIN' && <Check className="w-4 h-4 text-[#0052CC] mt-1 flex-shrink-0" />}
                </button>

                {/* Option 2: Guru */}
                <button
                  type="button"
                  onClick={() => {
                    onQuickSwitchUser('guru01');
                    setShowSwitchMenu(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-start justify-between transition-colors mt-1 ${
                    user.ROLE === 'TEACHER'
                      ? 'bg-emerald-50/80 border border-emerald-200 text-emerald-900'
                      : 'hover:bg-[#F8F9FA] text-[#1A1C1E]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-700 mt-0.5">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        Guru Pengampu
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">guru01</span>
                      </div>
                      <div className="text-[10px] text-[#6C757D] mt-0.5">
                        Bank Soal, Live Monitoring, Koreksi Uraian & Rekap Nilai
                      </div>
                    </div>
                  </div>
                  {user.ROLE === 'TEACHER' && <Check className="w-4 h-4 text-emerald-600 mt-1 flex-shrink-0" />}
                </button>

                {/* Option 3: Siswa */}
                <button
                  type="button"
                  onClick={() => {
                    onQuickSwitchUser('siswa01');
                    setShowSwitchMenu(false);
                  }}
                  className={`w-full p-2.5 rounded-lg text-left flex items-start justify-between transition-colors mt-1 ${
                    user.ROLE === 'STUDENT'
                      ? 'bg-amber-50/80 border border-amber-200 text-amber-900'
                      : 'hover:bg-[#F8F9FA] text-[#1A1C1E]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-md bg-amber-100 text-amber-800 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        Siswa Peserta CBT
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">siswa01</span>
                      </div>
                      <div className="text-[10px] text-[#6C757D] mt-0.5">
                        Daftar Ujian, Ruang Ujian CBT & Hasil Ujian
                      </div>
                    </div>
                  </div>
                  {user.ROLE === 'STUDENT' && <Check className="w-4 h-4 text-amber-700 mt-1 flex-shrink-0" />}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Live Real-time Status indicator */}
        <RealtimeIndicator />

        {/* Notification indicator */}
        <button
          type="button"
          className="relative p-2 rounded-lg border border-[#DEE2E6] bg-white text-[#495057] hover:text-[#1A1C1E] hover:bg-[#F8F9FA] transition-colors"
          title="Notifikasi Sistem"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#DC3545] border-2 border-white"></span>
        </button>

        {/* User Info chip */}
        <div className="flex items-center gap-2 pl-1.5 sm:pl-2.5 border-l border-[#DEE2E6]">
          <div className="w-8 h-8 rounded-lg bg-[#E7F0FF] border border-[#B3D1FF] text-[#0052CC] font-bold text-xs grid place-items-center shadow-xs">
            {getInitials(user.NAME)}
          </div>
          <div className="hidden lg:block text-left max-w-[130px]">
            <div className="text-xs font-bold text-[#1A1C1E] leading-none truncate">{user.NAME}</div>
            <div className="text-[10px] text-[#6C757D] mt-0.5 font-medium truncate">{roleConfig.label}</div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            title="Keluar"
            className="lg:hidden text-[#6C757D] hover:text-[#DC3545] p-1.5 rounded-md hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

