import React, { useState, useMemo } from 'react';
import {
  Users,
  BookOpen,
  GraduationCap,
  CalendarCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Save,
  X,
  Layers,
  Check,
  RefreshCw
} from 'lucide-react';
import { TeacherMasterItem, ClassItem } from '../types';
import {
  getTeacherRoster,
  saveTeacherRoster,
  getClasses,
  saveEntity,
  deleteEntity,
  getTimetable
} from '../services/lmsStorage';
import {
  deriveCodesForTeacher,
  getNextAvailableTeacherCode,
  MA_CIKARAMAS_SUBJECTS
} from '../data/curriculumData';

interface TimetableFlexibleSetupProps {
  token: string;
  userRole: string;
  onNavigateToTab: (tab: string) => void;
  onRefreshData?: () => void;
}

export const TimetableFlexibleSetup: React.FC<TimetableFlexibleSetupProps> = ({
  token,
  userRole,
  onNavigateToTab,
  onRefreshData
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // State: Teachers roster
  const [teachers, setTeachers] = useState<TeacherMasterItem[]>(() => getTeacherRoster(token));

  // State: Classes
  const [classes, setClasses] = useState<ClassItem[]>(() => {
    try {
      const cls = getClasses(token);
      if (cls && cls.length > 0) return cls;
    } catch {}
    return [];
  });

  // State: Selected teacher for Step 2 (Subject Mapping)
  const [selectedTeacherCode, setSelectedTeacherCode] = useState<string>(() => {
    const list = getTeacherRoster(token);
    return list[0]?.code || 'A';
  });

  // Modals
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Partial<TeacherMasterItem> | null>(null);

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<ClassItem> | null>(null);

  const [newSubjectInput, setNewSubjectInput] = useState('');

  // Simulator state for Step 4
  const [simulatorCode, setSimulatorCode] = useState('H2');
  const [statusAlert, setStatusAlert] = useState<string | null>(null);

  const showStatusAlert = (msg: string) => {
    setStatusAlert(msg);
    setTimeout(() => setStatusAlert(null), 4000);
  };

  const selectedTeacher = useMemo(() => {
    return teachers.find(t => t.code.toUpperCase() === selectedTeacherCode.toUpperCase()) || teachers[0];
  }, [teachers, selectedTeacherCode]);

  // Handler: Save Teacher
  const handleSaveTeacher = () => {
    if (!editingTeacher || !editingTeacher.name || !editingTeacher.code) {
      showStatusAlert('Nama guru dan kode huruf wajib diisi.');
      return;
    }

    const cleanCode = editingTeacher.code.trim().toUpperCase();
    const cleanName = editingTeacher.name.trim();

    // Check duplicate code if adding
    const isEditing = editingTeacher.no !== undefined;
    if (!isEditing && teachers.some(t => t.code.toUpperCase() === cleanCode)) {
      showStatusAlert(`Kode huruf ${cleanCode} sudah digunakan oleh guru lain.`);
      return;
    }

    let updatedList: TeacherMasterItem[];
    if (isEditing) {
      updatedList = teachers.map(t => {
        if (t.no === editingTeacher.no) {
          const subjects = t.subjectsSummary || [];
          const derivedCodes = deriveCodesForTeacher(cleanCode, subjects.length);
          return {
            ...t,
            name: cleanName,
            code: cleanCode,
            nipNbm: editingTeacher.nipNbm || '-',
            rankGolongan: editingTeacher.rankGolongan || 'GTY',
            additionalDuty: editingTeacher.additionalDuty || '-',
            additionalDutyHours: Number(editingTeacher.additionalDutyHours || 0),
            derivedCodes
          };
        }
        return t;
      });
    } else {
      const newNo = teachers.length + 1;
      const initialSubjects = editingTeacher.subjectsSummary && editingTeacher.subjectsSummary.length > 0
        ? editingTeacher.subjectsSummary
        : ['Mata Pelajaran'];
      const derivedCodes = deriveCodesForTeacher(cleanCode, initialSubjects.length);

      const newTeacher: TeacherMasterItem = {
        no: newNo,
        code: cleanCode,
        name: cleanName,
        nipNbm: editingTeacher.nipNbm || `NBM. ${1281200 + newNo}`,
        rankGolongan: editingTeacher.rankGolongan || 'GTY',
        subjectsSummary: initialSubjects,
        derivedCodes,
        additionalDuty: editingTeacher.additionalDuty || '-',
        additionalDutyHours: Number(editingTeacher.additionalDutyHours || 0)
      };
      updatedList = [...teachers, newTeacher];
    }

    setTeachers(updatedList);
    saveTeacherRoster(token, updatedList);
    setIsTeacherModalOpen(false);
    setEditingTeacher(null);
    if (onRefreshData) onRefreshData();
  };

  // Handler: Delete Teacher
  const handleDeleteTeacher = (code: string) => {
    let confirmed = true;
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmed = window.confirm(`Hapus guru dengan kode ${code}? Perubahan ini akan memengaruhi matriks jadwal.`);
      }
    } catch {
      confirmed = true;
    }
    if (!confirmed) return;
    const updated = teachers.filter(t => t.code !== code);
    setTeachers(updated);
    saveTeacherRoster(token, updated);
    if (selectedTeacherCode === code) {
      setSelectedTeacherCode(updated[0]?.code || 'A');
    }
    if (onRefreshData) onRefreshData();
  };

  // Handler: Add Subject to Selected Teacher in Step 2
  const handleAddSubjectToTeacher = () => {
    if (!newSubjectInput.trim() || !selectedTeacher) return;
    const currentSubs = [...(selectedTeacher.subjectsSummary || [])];
    currentSubs.push(newSubjectInput.trim());

    const derivedCodes = deriveCodesForTeacher(selectedTeacher.code, currentSubs.length);

    const updatedTeachers = teachers.map(t => {
      if (t.code === selectedTeacher.code) {
        return {
          ...t,
          subjectsSummary: currentSubs,
          derivedCodes
        };
      }
      return t;
    });

    setTeachers(updatedTeachers);
    saveTeacherRoster(token, updatedTeachers);
    setNewSubjectInput('');
    if (onRefreshData) onRefreshData();
  };

  // Handler: Remove Subject from Selected Teacher
  const handleRemoveSubjectFromTeacher = (index: number) => {
    if (!selectedTeacher) return;
    const currentSubs = [...(selectedTeacher.subjectsSummary || [])];
    currentSubs.splice(index, 1);

    const derivedCodes = deriveCodesForTeacher(selectedTeacher.code, currentSubs.length);

    const updatedTeachers = teachers.map(t => {
      if (t.code === selectedTeacher.code) {
        return {
          ...t,
          subjectsSummary: currentSubs,
          derivedCodes
        };
      }
      return t;
    });

    setTeachers(updatedTeachers);
    saveTeacherRoster(token, updatedTeachers);
    if (onRefreshData) onRefreshData();
  };

  // Handler: Save Class (Step 3)
  const handleSaveClass = () => {
    if (!editingClass || !editingClass.NAME) {
      showStatusAlert('Nama rombel kelas wajib diisi (misal: X.4 atau XI.3).');
      return;
    }

    try {
      const payload = {
        _originalId: editingClass.ID,
        ID: editingClass.ID || `KLS-${editingClass.NAME.replace(/\./g, '')}`,
        NAME: editingClass.NAME.trim().toUpperCase(),
        LEVEL: editingClass.LEVEL || 'X',
        HOMEROOM: editingClass.HOMEROOM || '-',
        STREAM: editingClass.LEVEL === 'X' ? 'FASE_E' : 'FASE_F',
        CURRICULUM: editingClass.CURRICULUM || 'MERDEKA',
        ACTIVE: true
      };

      saveEntity(token, 'CLASSES', payload);
      const refreshed = getClasses(token);
      setClasses(refreshed);
      setIsClassModalOpen(false);
      setEditingClass(null);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showStatusAlert(err.message || 'Gagal menyimpan kelas.');
    }
  };

  // Handler: Delete Class
  const handleDeleteClass = (id: string, name: string) => {
    let confirmed = true;
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        confirmed = window.confirm(`Yakin ingin menonaktifkan rombel ${name}?`);
      }
    } catch {
      confirmed = true;
    }
    if (!confirmed) return;
    try {
      deleteEntity(token, 'CLASSES', id);
      const refreshed = getClasses(token);
      setClasses(refreshed);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      showStatusAlert(err.message || 'Gagal menghapus kelas.');
    }
  };

  // Simulator Lookups
  const simulatedLookup = useMemo(() => {
    const code = simulatorCode.trim().toUpperCase();
    if (!code) return null;

    // Check if matching teacher code or derived code
    for (const t of teachers) {
      const matchIdx = t.derivedCodes ? t.derivedCodes.findIndex(c => c.toUpperCase() === code) : -1;
      if (matchIdx >= 0) {
        return {
          teacher: t,
          subject: t.subjectsSummary?.[matchIdx] || t.subjectsSummary?.[0] || 'Mata Pelajaran',
          derivedCode: code,
          totalTeacherSubjects: t.subjectsSummary?.length || 0
        };
      }
      if (t.code.toUpperCase() === code) {
        return {
          teacher: t,
          subject: t.subjectsSummary?.[0] || 'Mata Pelajaran',
          derivedCode: code,
          totalTeacherSubjects: t.subjectsSummary?.length || 0
        };
      }
    }
    return null;
  }, [simulatorCode, teachers]);

  return (
    <div className="space-y-5">
      {/* HEADER BANNER */}
      {statusAlert && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
          <span>{statusAlert}</span>
          <button onClick={() => setStatusAlert(null)} className="text-amber-600 hover:text-amber-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="bg-white border border-[#DEE2E6] rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#0052CC] text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1A1C1E]">
                Setting Fleksibel Formasi Guru, Kelas & Kode Sandi
              </h2>
              <p className="text-xs text-[#495057]">
                Konfigurasi dinamis untuk mengantisipasi penambahan/pengurangan guru dan rombel kelas di semester mendatang.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab('workload')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Lihat Tabel Pembagian Tugas (BKG)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* STEPPER PROGRESS TABS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-5 pt-4 border-t border-slate-100 text-xs">
          <button
            onClick={() => setCurrentStep(1)}
            className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
              currentStep === 1
                ? 'bg-blue-50/80 border-[#0052CC] text-[#0052CC] shadow-2xs font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 1 ? 'bg-[#0052CC] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              1
            </span>
            <div>
              <div className="font-bold">Formasi Guru (A–Z)</div>
              <div className="text-[11px] font-normal text-slate-500 mt-0.5">{teachers.length} Guru Aktif</div>
            </div>
          </button>

          <button
            onClick={() => setCurrentStep(2)}
            className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
              currentStep === 2
                ? 'bg-blue-50/80 border-[#0052CC] text-[#0052CC] shadow-2xs font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 2 ? 'bg-[#0052CC] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              2
            </span>
            <div>
              <div className="font-bold">Pemetaan Mapel Guru</div>
              <div className="text-[11px] font-normal text-slate-500 mt-0.5">Sandi Otomatis (C1, H2..)</div>
            </div>
          </button>

          <button
            onClick={() => setCurrentStep(3)}
            className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
              currentStep === 3
                ? 'bg-blue-50/80 border-[#0052CC] text-[#0052CC] shadow-2xs font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 3 ? 'bg-[#0052CC] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              3
            </span>
            <div>
              <div className="font-bold">Rombel Kelas</div>
              <div className="text-[11px] font-normal text-slate-500 mt-0.5">{classes.length} Rombel Terdaftar</div>
            </div>
          </button>

          <button
            onClick={() => setCurrentStep(4)}
            className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
              currentStep === 4
                ? 'bg-blue-50/80 border-[#0052CC] text-[#0052CC] shadow-2xs font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 4 ? 'bg-[#0052CC] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              4
            </span>
            <div>
              <div className="font-bold">Plotting & Validasi</div>
              <div className="text-[11px] font-normal text-slate-500 mt-0.5">Cek Anti-Bentrok Live</div>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: FORMASI GURU & KODE HURUF */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white border border-[#DEE2E6] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#1A1C1E] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0052CC]" />
                <span>Langkah 1: Daftar Guru & Penetapan Kode Huruf (A s.d. Z)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap guru memegang 1 kode huruf unik. Jika ada guru baru masuk, sistem otomatis menyarankan huruf berikutnya.
              </p>
            </div>

            {userRole === 'ADMIN' && (
              <button
                onClick={() => {
                  const nextCode = getNextAvailableTeacherCode(teachers.map(t => t.code));
                  setEditingTeacher({
                    code: nextCode,
                    name: '',
                    nipNbm: '',
                    rankGolongan: 'GTY',
                    additionalDuty: '-',
                    additionalDutyHours: 0,
                    subjectsSummary: ['Mata Pelajaran Baru']
                  });
                  setIsTeacherModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0052CC] text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Guru Baru</span>
              </button>
            )}
          </div>

          {/* Teacher Roster Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {teachers.map((t, idx) => (
              <div
                key={t.code}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 bg-slate-50/50 hover:bg-white transition-all shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-[#0052CC] font-bold font-mono text-sm flex items-center justify-center border border-blue-200 shrink-0">
                      {t.code}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-snug">{t.name}</h4>
                      <p className="text-[11px] text-slate-500">{t.nipNbm || `NBM. ${1281200 + idx + 1}`}</p>
                    </div>
                  </div>

                  {userRole === 'ADMIN' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingTeacher(t);
                          setIsTeacherModalOpen(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        title="Edit Guru"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(t.code)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus Guru"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200/60">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pangkat/Gol:</span>
                    <span className="font-medium text-slate-700">{t.rankGolongan || 'GTY'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mapel Diampu:</span>
                    <span className="font-medium text-slate-800 text-right truncate max-w-[160px]">
                      {t.subjectsSummary?.join(', ') || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kode Sandi:</span>
                    <span className="font-mono font-bold text-[#0052CC]">
                      {t.derivedCodes?.join(', ') || t.code}
                    </span>
                  </div>
                  {t.additionalDuty && t.additionalDuty !== '-' && (
                    <div className="flex justify-between text-amber-900 bg-amber-50 px-2 py-0.5 rounded">
                      <span className="font-medium">Tugas: {t.additionalDuty}</span>
                      <span className="font-bold font-mono">+{t.additionalDutyHours || 0} Jam</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0052CC] text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
            >
              <span>Lanjut ke Langkah 2: Pemetaan Mapel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: PEMETAAN MAPEL TIAP GURU (LOGIKA SANDI OTOMATIS) */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-white border border-[#DEE2E6] rounded-xl p-5 shadow-xs space-y-5">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="font-bold text-sm sm:text-base text-[#1A1C1E] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#0052CC]" />
              <span>Langkah 2: Pemetaan Mapel & Logika Kode Sandi Otomatis</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aturan: Jika 1 guru mengajar 1 mapel $\rightarrow$ kodenya huruf saja (contoh <b>A</b>). Jika mengajar 2 atau 3 mapel $\rightarrow$ otomatis diberi nomor (contoh <b>C1, C2, C3</b>).
            </p>
          </div>

          {/* Logic Visual Rule Box */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="p-2 rounded-lg bg-[#0052CC] text-white shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <div className="space-y-1">
                <h4 className="font-bold text-[#0052CC]">Bagaimana Formula Sandi Bekerja Secara Otomatis?</h4>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Anda tidak perlu pusing menghafal kode. Cukup tentukan guru dan tambahkan mata pelajaran yang diajarkannya.
                  Sistem langsung menghitung otomatis:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <span className="font-bold text-slate-800">1 Mapel Saja:</span>
                    <span className="text-emerald-700 ml-2">Guru "A" + "B. Indo" = <b>Kode A</b></span>
                  </div>
                  <div className="bg-white p-2 rounded border border-blue-100">
                    <span className="font-bold text-slate-800">Banyak Mapel:</span>
                    <span className="text-blue-700 ml-2">Guru "C" + 3 Mapel = <b>C1, C2, C3</b></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Selector & Subject Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Teacher List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 font-bold text-slate-700">
                Pilih Guru untuk Diatur:
              </div>
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                {teachers.map(t => {
                  const isSelected = t.code === selectedTeacherCode;
                  return (
                    <button
                      key={t.code}
                      onClick={() => setSelectedTeacherCode(t.code)}
                      className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-blue-50 text-[#0052CC] font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-xs ${
                            isSelected ? 'bg-[#0052CC] text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.code}
                        </span>
                        <span className="truncate max-w-[150px]">{t.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {t.subjectsSummary?.length || 0} Mapel
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject Management for Selected Teacher */}
            {selectedTeacher && (
              <div className="lg:col-span-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-lg bg-[#0052CC] text-white font-bold font-mono text-base flex items-center justify-center shadow-xs">
                      {selectedTeacher.code}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{selectedTeacher.name}</h4>
                      <p className="text-[11px] text-slate-500">{selectedTeacher.nipNbm}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-[#0052CC] font-bold font-mono text-xs">
                    Total: {selectedTeacher.subjectsSummary?.length || 0} Mapel
                  </span>
                </div>

                {/* List of currently assigned subjects */}
                <div className="space-y-2">
                  <label className="font-semibold text-slate-700 block">Daftar Mata Pelajaran yang Diampu:</label>
                  {selectedTeacher.subjectsSummary && selectedTeacher.subjectsSummary.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedTeacher.subjectsSummary.map((sub, idx) => {
                        const code =
                          selectedTeacher.subjectsSummary.length > 1
                            ? `${selectedTeacher.code}${idx + 1}`
                            : selectedTeacher.code;
                        return (
                          <div
                            key={idx}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-100 text-[#0052CC] text-xs">
                                Kode: {code}
                              </span>
                              <span className="font-medium text-slate-800">{sub}</span>
                            </div>
                            {userRole === 'ADMIN' && (
                              <button
                                onClick={() => handleRemoveSubjectFromTeacher(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Hapus Mapel Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">Belum ada mata pelajaran yang diatur.</p>
                  )}
                </div>

                {/* Add Subject Input */}
                {userRole === 'ADMIN' && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <label className="font-semibold text-slate-700 block">Tambah Mata Pelajaran Baru untuk Guru Ini:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Contoh: Matematika Peminatan / Sejarah Kebudayaan Islam"
                        value={newSubjectInput}
                        onChange={e => setNewSubjectInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddSubjectToTeacher()}
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <button
                        onClick={handleAddSubjectToTeacher}
                        disabled={!newSubjectInput.trim()}
                        className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[#0052CC] text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      *Saat mapel bertambah, kode sandi akan otomatis berevolusi dari <b>{selectedTeacher.code}</b> menjadi{' '}
                      <b>{selectedTeacher.code}1, {selectedTeacher.code}2</b>, dst.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Kembali ke Langkah 1
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0052CC] text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
            >
              <span>Lanjut ke Langkah 3: Rombel Kelas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: FORMASI ROMBEL KELAS (Fase E & Fase F) */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="bg-white border border-[#DEE2E6] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#1A1C1E] flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#0052CC]" />
                <span>Langkah 3: Formasi Rombongan Belajar (Rombel Kelas)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bisa disesuaikan jika semester depan kelas bertambah (misal X.4, XI.3) atau berkurang. Matriks jadwal akan otomatis menyesuaikan kolomnya.
              </p>
            </div>

            {userRole === 'ADMIN' && (
              <button
                onClick={() => {
                  setEditingClass({
                    NAME: '',
                    LEVEL: 'X',
                    HOMEROOM: teachers[0]?.name || '',
                    CURRICULUM: 'MERDEKA',
                    ACTIVE: true
                  });
                  setIsClassModalOpen(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#0052CC] text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Rombel Baru</span>
              </button>
            )}
          </div>

          {/* Classes Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                  <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200">No</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Nama Rombel</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Tingkat / Fase</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Kurikulum</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Wali Kelas</th>
                  {userRole === 'ADMIN' && <th className="py-2.5 px-3 text-center w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#1A1C1E]">
                {classes.map((c, idx) => (
                  <tr key={c.ID} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-center border-r border-slate-100 font-mono text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100">
                      <span className="font-bold text-slate-900 font-mono bg-blue-50 text-[#0052CC] px-2 py-0.5 rounded border border-blue-200">
                        {c.NAME}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {c.LEVEL === 'X' ? 'Kelas X (Fase E)' : `Kelas ${c.LEVEL} (Fase F)`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600">
                      {c.CURRICULUM || 'Kurikulum Merdeka'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium text-slate-800">
                      {c.HOMEROOM || '-'}
                    </td>
                    {userRole === 'ADMIN' && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingClass(c);
                              setIsClassModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit Rombel"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(c.ID, c.NAME)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Rombel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between pt-3 border-t border-slate-200">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Kembali ke Langkah 2
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0052CC] text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
            >
              <span>Lanjut ke Langkah 4: Plotting & Validasi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: PLOTTING & VALIDASI ANTI-BENTROK */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="bg-white border border-[#DEE2E6] rounded-xl p-5 shadow-xs space-y-5">
          <div className="pb-3 border-b border-slate-200">
            <h3 className="font-bold text-sm sm:text-base text-[#1A1C1E] flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#0052CC]" />
              <span>Langkah 4: Plotting Jadwal & Pengujian Sandi Anti-Bentrok</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Semua formasi guru, mapel, dan kelas sudah terhubung. Anda sekarang dapat mengisi jadwal secara langsung di Dokumen Master atau Jadwal Harian.
            </p>
          </div>

          {/* Readiness Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-900">Formasi Guru Siap</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">{teachers.length} guru telah memegang kode A–Z unik.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-900">Kode Sandi Otomatis Aktif</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Tiap guru telah memiliki sandi derivasi (C1, C2, H2, T3, dll).
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-900">Rombel Terkoneksi</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">{classes.length} kelas siap menerima plotting jadwal.</div>
              </div>
            </div>
          </div>

          {/* Code Sandi Simulator Test */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-[#0052CC] font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Simulasi Uji Kode Sandi (Live Inspector):</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              Ketik kode sandi apa saja di bawah ini untuk melihat bagaimana sistem otomatis menerjemahkan kode tersebut ke nama guru dan mata pelajarannya:
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Kode:</span>
                <input
                  type="text"
                  value={simulatorCode}
                  onChange={e => setSimulatorCode(e.target.value.toUpperCase())}
                  className="w-24 px-3 py-1.5 font-mono font-bold text-center bg-white border border-blue-300 rounded-md uppercase text-sm focus:outline-hidden focus:border-[#0052CC]"
                  placeholder="H2"
                />
              </div>

              {simulatedLookup ? (
                <div className="bg-white px-3 py-2 rounded-lg border border-emerald-200 flex items-center gap-3 text-emerald-900 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">{simulatedLookup.derivedCode}</span>
                    <span className="mx-1.5 text-slate-300">|</span>
                    <span>Mapel: <b>{simulatedLookup.subject}</b></span>
                    <span className="mx-1.5 text-slate-300">|</span>
                    <span>Guru: <b>{simulatedLookup.teacher.name}</b> (Kode {simulatedLookup.teacher.code})</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white px-3 py-2 rounded-lg border border-rose-200 flex items-center gap-2 text-rose-800 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Kode <b>"{simulatorCode}"</b> belum terdaftar di kamus guru mana pun.</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">Semua Pengaturan Siap Digunakan!</div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Silakan beralih ke tab Dokumen Master atau Jadwal Harian untuk mulai memasukkan kode jadwal.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateToTab('master')}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0052CC] text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Buka Dokumen Master Jadwal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER MODAL (STEP 1) */}
      {isTeacherModalOpen && editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-sm text-[#1A1C1E]">
                {editingTeacher.no ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h3>
              <button onClick={() => setIsTeacherModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Kode Huruf Guru (A–Z) *</label>
                <input
                  type="text"
                  maxLength={3}
                  value={editingTeacher.code || ''}
                  onChange={e => setEditingTeacher({ ...editingTeacher, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase font-bold text-[#0052CC]"
                  placeholder="Contoh: U, V, W..."
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  value={editingTeacher.name || ''}
                  onChange={e => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="Contoh: Ahmad Dahlan, S.Pd"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">NIP / NBM</label>
                <input
                  type="text"
                  value={editingTeacher.nipNbm || ''}
                  onChange={e => setEditingTeacher({ ...editingTeacher, nipNbm: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="Contoh: NBM. 1281221"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pangkat / Golongan</label>
                <input
                  type="text"
                  value={editingTeacher.rankGolongan || ''}
                  onChange={e => setEditingTeacher({ ...editingTeacher, rankGolongan: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="Contoh: GTY / PNS"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tugas Tambahan</label>
                  <input
                    type="text"
                    value={editingTeacher.additionalDuty || ''}
                    onChange={e => setEditingTeacher({ ...editingTeacher, additionalDuty: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    placeholder="Wali Kelas / Waka"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Ekuivalensi Jam</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={editingTeacher.additionalDutyHours || 0}
                    onChange={e =>
                      setEditingTeacher({
                        ...editingTeacher,
                        additionalDutyHours: parseInt(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsTeacherModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleSaveTeacher}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0052CC] hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Guru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLASS MODAL (STEP 3) */}
      {isClassModalOpen && editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-sm text-[#1A1C1E]">
                {editingClass.ID ? 'Edit Data Rombel' : 'Tambah Rombel Kelas Baru'}
              </h3>
              <button onClick={() => setIsClassModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Rombel Kelas *</label>
                <input
                  type="text"
                  value={editingClass.NAME || ''}
                  onChange={e => setEditingClass({ ...editingClass, NAME: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase font-bold"
                  placeholder="Contoh: X.4 atau XI.3"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tingkat Jenjang</label>
                <select
                  value={editingClass.LEVEL || 'X'}
                  onChange={e => setEditingClass({ ...editingClass, LEVEL: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="X">Kelas X (Fase E)</option>
                  <option value="XI">Kelas XI (Fase F)</option>
                  <option value="XII">Kelas XII (Fase F)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Wali Kelas</label>
                <select
                  value={editingClass.HOMEROOM || ''}
                  onChange={e => setEditingClass({ ...editingClass, HOMEROOM: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Pilih Guru Wali Kelas --</option>
                  {teachers.map(t => (
                    <option key={t.code} value={t.name}>
                      [{t.code}] {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsClassModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleSaveClass}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0052CC] hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Rombel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
