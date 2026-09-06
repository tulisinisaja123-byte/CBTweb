import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Users,
  RefreshCw,
  Printer,
  X,
  Search,
  Check,
  Building2,
  Clock,
  ShieldCheck,
  Home,
  UserX,
  Copy,
  Sparkles
} from 'lucide-react';
import { User, ClassItem, StudentAttendanceRecord, AttendanceStatus } from '../types';
import {
  getDailyAttendanceCode,
  setDailyAttendanceCode,
  getStudentAttendanceRecords,
  recordStudentAttendance,
  bulkRecordAttendance
} from '../services/supabaseLmsStorage';

interface DailySchoolPresenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  classes?: ClassItem[];
  users?: User[];
  onAttendanceChanged?: () => void;
}

export const DailySchoolPresenceModal: React.FC<DailySchoolPresenceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  classes = [],
  users = [],
  onAttendanceChanged
}) => {
  const [activeTab, setActiveTab] = useState<'QR_CODE' | 'MANUAL_LIST'>('QR_CODE');
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [dailyCode, setDailyCode] = useState<string>(() => getDailyAttendanceCode(todayStr));
  const [attendanceRecords, setAttendanceRecords] = useState<StudentAttendanceRecord[]>(() =>
    getStudentAttendanceRecords(todayStr)
  );

  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Refresh records
  const reloadData = () => {
    const code = getDailyAttendanceCode(todayStr);
    setDailyCode(code);
    const recs = getStudentAttendanceRecords(todayStr);
    setAttendanceRecords(recs);
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
    }
  }, [isOpen, todayStr]);

  // Render QR Code to canvas whenever dailyCode changes or tab switches
  useEffect(() => {
    if (!isOpen || activeTab !== 'QR_CODE' || !qrCanvasRef.current) return;

    const qrPayload = `CBT-ATTENDANCE:MAS_CIKARAMAS:${todayStr}:${dailyCode}`;
    QRCode.toCanvas(
      qrCanvasRef.current,
      qrPayload,
      {
        width: 280,
        margin: 2,
        color: {
          dark: '#003366',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      },
      (error) => {
        if (error) console.error('Failed to generate attendance QR code:', error);
      }
    );
  }, [isOpen, activeTab, dailyCode, todayStr]);

  // Students list
  const students = useMemo(() => {
    return users.filter(u => u.ROLE === 'STUDENT' && u.ACTIVE !== false);
  }, [users]);

  // Attendance Map: userId -> record
  const attendanceMap = useMemo(() => {
    const map = new Map<string, StudentAttendanceRecord>();
    attendanceRecords.forEach(r => {
      map.set(r.userId, r);
    });
    return map;
  }, [attendanceRecords]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedClassFilter !== 'ALL' && s.CLASS_ID !== selectedClassFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (s.NAME || '').toLowerCase().includes(q);
        const usernameMatch = (s.USERNAME || '').toLowerCase().includes(q);
        const nisMatch = (s.NISN || s.NIS || '').toLowerCase().includes(q);
        return nameMatch || usernameMatch || nisMatch;
      }
      return true;
    });
  }, [students, selectedClassFilter, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    let presentCount = 0;
    let remoteCount = 0;
    let absentCount = 0;

    students.forEach(s => {
      const rec = attendanceMap.get(s.ID);
      if (!rec) {
        // Belum presensi
      } else if (rec.status === 'PRESENT_SCHOOL') {
        presentCount++;
      } else if (rec.status === 'REMOTE_PERMIT') {
        remoteCount++;
      } else if (rec.status === 'ABSENT_SUSULAN') {
        absentCount++;
      }
    });

    const unrecordedCount = students.length - (presentCount + remoteCount + absentCount);
    return {
      total: students.length,
      present: presentCount,
      remote: remoteCount,
      absent: absentCount,
      unrecorded: unrecordedCount
    };
  }, [students, attendanceMap]);

  // Copy code handler
  const handleCopyCode = () => {
    navigator.clipboard.writeText(dailyCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    showToast(`Kode harian "${dailyCode}" disalin ke clipboard.`);
  };

  // Regenerate / Set custom code
  const handleRegenerateCode = () => {
    setIsRegenerating(true);
    const newRandom = Math.floor(1000 + Math.random() * 9000);
    const newCode = `CKR-${newRandom}`;
    setDailyAttendanceCode(todayStr, newCode);
    setDailyCode(newCode);
    setIsRegenerating(false);
    showToast(`Kode presensi harian berhasil diperbarui menjadi ${newCode}!`);
  };

  // Individual Student Status Change
  const handleSetStudentStatus = (student: User, status: AttendanceStatus, method: any = 'MANUAL_SUPERVISOR') => {
    const supervisorName = currentUser?.NAME || 'Pengawas Ruang CBT';
    recordStudentAttendance(
      student.ID,
      todayStr,
      status,
      method,
      supervisorName
    );
    reloadData();
    if (onAttendanceChanged) onAttendanceChanged();

    const label = status === 'PRESENT_SCHOOL'
      ? 'Hadir Fisik di Sekolah'
      : status === 'REMOTE_PERMIT'
      ? 'Dispensasi Ujian Daring'
      : 'Tidak Hadir (Dialihkan ke Ujian Susulan)';
    showToast(`Status ${student.NAME} diubah: ${label}`);
  };

  // Bulk Mark All Present for Selected Class
  const handleBulkMarkPresent = () => {
    if (filteredStudents.length === 0) return;
    const targetIds = filteredStudents.map(s => s.ID);
    const supervisorName = currentUser?.NAME || 'Pengawas Ruang CBT';
    const count = bulkRecordAttendance(targetIds, todayStr, 'PRESENT_SCHOOL', supervisorName);
    reloadData();
    if (onAttendanceChanged) onAttendanceChanged();
    showToast(`Berhasil menandai ${count} siswa hadir fisik di sekolah!`);
  };

  // Bulk Mark Unrecorded as Absent -> Make-up Exam
  const handleBulkMarkMakeup = () => {
    const unrecorded = filteredStudents.filter(s => !attendanceMap.has(s.ID));
    if (unrecorded.length === 0) {
      showToast('Semua siswa di daftar ini sudah memiliki status kehadiran.');
      return;
    }
    const targetIds = unrecorded.map(s => s.ID);
    const supervisorName = currentUser?.NAME || 'Pengawas Ruang CBT';
    const count = bulkRecordAttendance(targetIds, todayStr, 'ABSENT_SUSULAN', supervisorName);
    reloadData();
    if (onAttendanceChanged) onAttendanceChanged();
    showToast(`Sebanyak ${count} siswa yang belum hadir dialihkan ke Jadwal Ujian Susulan.`);
  };

  // Print Barcode Sheet Handler
  const handlePrintSheet = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const qrPayload = `CBT-ATTENDANCE:MAS_CIKARAMAS:${todayStr}:${dailyCode}`;

    QRCode.toDataURL(qrPayload, { width: 350, margin: 2 }, (err, url) => {
      if (err) return;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Lembar Barcode Presensi CBT - ${todayStr}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px; color: #1A1C1E; }
              .header { border-bottom: 3px double #003366; padding-bottom: 16px; margin-bottom: 24px; }
              .school-name { font-size: 20pt; font-weight: bold; color: #003366; margin: 0; }
              .sub-title { font-size: 13pt; color: #495057; margin-top: 4px; }
              .card { border: 2px dashed #0052CC; border-radius: 16px; padding: 30px; display: inline-block; background: #FAFCFF; max-width: 500px; margin-top: 10px; }
              .qr-img { width: 280px; height: 280px; margin: 15px auto; }
              .code-box { font-size: 32pt; font-weight: 800; letter-spacing: 4px; color: #003366; background: #E7F0FF; padding: 12px 24px; border-radius: 12px; margin: 16px 0; border: 1px solid #B3D1FF; }
              .instructions { font-size: 11pt; color: #333; line-height: 1.6; text-align: left; background: #FFF; padding: 16px; border-radius: 10px; border: 1px solid #DEE2E6; }
              .footer { margin-top: 30px; font-size: 9pt; color: #6C757D; }
              @media print {
                button { display: none; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="school-name">MAS MUHAMMADIYAH CIKARAMAS</div>
              <div class="sub-title">VERIFIKASI KEHADIRAN FISIK CBT & ASESMEN MADRASAH</div>
              <div style="font-size: 10pt; color: #6C757D; margin-top: 4px;">Tanggal Berlaku: <b>${todayStr}</b></div>
            </div>

            <div class="card">
              <div style="font-size: 12pt; font-weight: bold; color: #0052CC; text-transform: uppercase;">
                Pindai Barcode / Masukkan Kode Harian
              </div>
              <img class="qr-img" src="${url}" alt="QR Presensi" />
              <div style="font-size: 10pt; color: #6C757D;">Atau Masukkan Kode 6-Karakter Pengawas:</div>
              <div class="code-box">${dailyCode}</div>

              <div class="instructions">
                <b>Instruksi Peserta Ujian:</b>
                <ol style="margin: 8px 0 0 18px; padding: 0;">
                  <li>Pastikan Anda berada di lingkungan madrasah / ruang ujian resmi.</li>
                  <li>Buka aplikasi CBT Siswa &rarr; Menu <b>Jadwal Ujian Mapel</b>.</li>
                  <li>Klik tombol <b>"Scan QR / Masukkan Kode Presensi Sekolah"</b>.</li>
                  <li>Arahkan kamera ke barcode di atas atau ketik kode <b>${dailyCode}</b>.</li>
                  <li>Status kehadiran akan terverifikasi dan tombol ujian aktif.</li>
                </ol>
              </div>
            </div>

            <div class="footer">
              Dicetak pada: ${new Date().toLocaleString('id-ID')} &bull; Sistem CBT Integritas MAS Muhammadiyah Cikaramas
            </div>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <QrCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg tracking-tight">
                  Presensi Fisik Sekolah & Integritas CBT
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase">
                  Harian
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Deteksi kehadiran siswa di madrasah, barcode harian dinamis, dan penanganan jadwal susulan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs & Summary Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              onClick={() => setActiveTab('QR_CODE')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'QR_CODE'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Proyektor Barcode Harian</span>
            </button>
            <button
              onClick={() => setActiveTab('MANUAL_LIST')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'MANUAL_LIST'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Presensi Manual & Susulan</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                {stats.total}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Hadir: <b>{stats.present}</b></span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium">
              <Home className="w-3 h-3 text-amber-600" />
              <span>Izin Daring: <b>{stats.remote}</b></span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-medium">
              <Clock className="w-3 h-3 text-rose-600" />
              <span>Susulan: <b>{stats.absent}</b></span>
            </span>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="mx-5 mt-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-blue-500 hover:text-blue-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Proyektor Barcode Harian */}
        {activeTab === 'QR_CODE' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 flex flex-col lg:flex-row items-center justify-center gap-8 bg-gradient-to-b from-white to-slate-50">
            {/* Left Box: Big QR and Code Box */}
            <div className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-md text-center max-w-sm w-full flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3 border border-blue-200">
                <Building2 className="w-3.5 h-3.5" />
                <span>Lingkungan Madrasah Cikaramas</span>
              </div>

              {/* QR Canvas */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner my-1">
                <canvas ref={qrCanvasRef} className="rounded-xl w-[240px] h-[240px]" />
              </div>

              {/* Daily Code Text */}
              <div className="w-full mt-3">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Kode Presensi Harian Pengawas:
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <div className="text-3xl font-black font-mono tracking-widest text-blue-900 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl">
                    {dailyCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    title="Salin Kode"
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 mt-3 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Berlaku untuk tanggal: <b>{todayStr}</b></span>
              </div>
            </div>

            {/* Right Box: Instructions & Action Buttons */}
            <div className="space-y-4 max-w-md w-full">
              <div className="space-y-1.5">
                <h4 className="text-lg font-bold text-slate-900">
                  Verifikasi Kehadiran Fisik di Ruang Ujian
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Siswa wajib memindai QR code ini melalui kamera perangkat atau memasukkan kode harian 6 digit di atas sebelum dapat membuka naskah soal ujian.
                </p>
              </div>

              {/* Integrity Regulation Card */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Regulasi Kehadiran & Integritas:</span>
                </div>
                <ul className="space-y-1.5 text-amber-800 list-disc list-inside">
                  <li>
                    <b>Hadir di Sekolah:</b> Siswa yang datang memindai kode harian ini untuk membuka blokir akses soal.
                  </li>
                  <li>
                    <b>Siswa Tidak Hadir:</b> Otomatis tidak dapat membuka soal dari rumah dan dialihkan ke <b>Jadwal Ujian Susulan</b>.
                  </li>
                  <li>
                    <b>Izin Khusus / Sakit:</b> Pengawas/Guru dapat memberikan <b>Dispensasi Ujian Daring</b> di tab Presensi Manual agar siswa dapat mengerjakan dari rumah.
                  </li>
                </ul>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handlePrintSheet}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>Cetak Lembar Barcode Pintu</span>
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  disabled={isRegenerating}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-700 ${isRegenerating ? 'animate-spin' : ''}`} />
                  <span>Ganti Kode Harian</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Presence List & Absent Handling */}
        {activeTab === 'MANUAL_LIST' && (
          <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-5 space-y-3">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari nama siswa, NISN, atau username..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={selectedClassFilter}
                  onChange={e => setSelectedClassFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Rombel / Kelas</option>
                  {classes.map(c => (
                    <option key={c.ID} value={c.ID}>{c.NAME}</option>
                  ))}
                </select>
              </div>

              {/* Bulk Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkMarkPresent}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Hadirkan Semua Siswa Ini</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkMarkMakeup}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-semibold text-xs transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Alihkan ke Susulan</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">No</th>
                    <th className="py-2.5 px-3 font-semibold">Nama Siswa & NIS</th>
                    <th className="py-2.5 px-3 font-semibold">Kelas</th>
                    <th className="py-2.5 px-3 font-semibold">Status Hari Ini</th>
                    <th className="py-2.5 px-3 font-semibold">Metode / Pengawas</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Tindakan Regulasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Tidak ada siswa yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, idx) => {
                      const record = attendanceMap.get(student.ID);
                      const isPresent = record?.status === 'PRESENT_SCHOOL';
                      const isRemote = record?.status === 'REMOTE_PERMIT';
                      const isAbsent = record?.status === 'ABSENT_SUSULAN';

                      const targetClassName = classes.find(c => c.ID === student.CLASS_ID)?.NAME || student.CLASS_ID || '-';

                      return (
                        <tr key={student.ID} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-800">{student.NAME}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              NIS: {student.NIS || student.NISN || student.USERNAME}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                              {targetClassName}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {isPresent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Hadir Fisik</span>
                              </span>
                            )}
                            {isRemote && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Home className="w-3 h-3 text-amber-600" />
                                <span>Izin Daring</span>
                              </span>
                            )}
                            {isAbsent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <Clock className="w-3 h-3 text-rose-600" />
                                <span>Jadwal Susulan</span>
                              </span>
                            )}
                            {!record && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                <span>Belum Presensi</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-500">
                            {record ? (
                              <div>
                                <div>{record.method === 'QR_SCAN' ? 'Scan Barcode' : record.method === 'CODE_INPUT' ? 'Ketik Kode' : 'Manual'}</div>
                                <div className="text-[9px] text-slate-400">{record.verifiedBy}</div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                title="Hadirkan Fisik di Sekolah"
                                onClick={() => handleSetStudentStatus(student, 'PRESENT_SCHOOL')}
                                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white font-bold'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                ✓ Hadir Fisik
                              </button>
                              <button
                                type="button"
                                title="Beri Dispensasi Ujian Daring (Izin Khusus Sakit)"
                                onClick={() => handleSetStudentStatus(student, 'REMOTE_PERMIT')}
                                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                                  isRemote
                                    ? 'bg-amber-500 text-white font-bold'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                }`}
                              >
                                🏠 Izin Daring
                              </button>
                              <button
                                type="button"
                                title="Alihkan ke Jadwal Ujian Susulan (Tidak Hadir)"
                                onClick={() => handleSetStudentStatus(student, 'ABSENT_SUSULAN')}
                                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                                  isAbsent
                                    ? 'bg-rose-600 text-white font-bold'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                }`}
                              >
                                ⏱ Susulan
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span>Sistem Integritas CBT MAS Muhammadiyah Cikaramas</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
