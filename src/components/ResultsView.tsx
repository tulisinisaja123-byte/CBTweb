import React, { useMemo } from 'react';
import { Download, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Attempt, Exam, User, ClassItem } from '../types';

interface ResultsViewProps {
  attempts: Attempt[];
  exams: Exam[];
  users: User[];
  classes: ClassItem[];
  currentUser: User;
  isStudentOnly?: boolean;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  attempts,
  exams,
  users,
  classes,
  currentUser,
  isStudentOnly = false
}) => {
  const usersMap = useMemo(() => Object.fromEntries((users || []).map(u => [u.ID, u])), [users]);
  const examsMap = useMemo(() => Object.fromEntries((exams || []).map(e => [e.ID, e])), [exams]);
  const classesMap = useMemo(() => Object.fromEntries((classes || []).map(c => [c.ID, c.NAME])), [classes]);

  const displayedAttempts = useMemo(() => {
    if (isStudentOnly || currentUser?.ROLE === 'STUDENT') {
      return (attempts || []).filter(a => a.USER_ID === currentUser?.ID);
    }
    return attempts || [];
  }, [attempts, isStudentOnly, currentUser]);

  const handleExport = () => {
    const exportData = displayedAttempts.map(a => {
      const u = usersMap[a.USER_ID];
      const e = examsMap[a.EXAM_ID];
      return {
        SISWA: u?.NAME || '-',
        USERNAME: u?.USERNAME || '-',
        KELAS: classesMap[u?.CLASS_ID || ''] || '-',
        UJIAN: e?.TITLE || '-',
        NILAI: a.SCORE !== '' ? a.SCORE : '-',
        NILAI_MAKSIMAL: a.MAX_SCORE,
        STATUS: a.STATUS,
        PELANGGARAN: a.VIOLATIONS,
        MULAI: a.STARTED_AT,
        SELESAI: a.SUBMITTED_AT
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HASIL UJIAN');
    XLSX.writeFile(workbook, `HASIL_UJIAN_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight">
            {isStudentOnly ? 'Hasil Ujian Saya' : 'Hasil Ujian Seluruh Siswa'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6C757D] mt-1">
            Nilai pilihan ganda dinilai otomatis oleh sistem. Ujian dengan soal uraian akan berstatus &quot;Perlu Koreksi&quot; hingga dinilai guru.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-white border border-[#DEE2E6] text-[#1A1C1E] hover:bg-[#F8F9FA] font-medium text-xs transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-[#0052CC]" />
            <span>Export Nilai Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#DEE2E6] rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#DEE2E6] flex items-center justify-between">
          <div className="text-xs font-bold text-[#1A1C1E]">Daftar Hasil Pengerjaan</div>
          <div className="text-xs text-[#6C757D]">{displayedAttempts.length} sesi tercatat</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8F9FA] text-[#6C757D] uppercase text-[11px] font-bold tracking-wider border-b border-[#DEE2E6]">
              <tr>
                {!isStudentOnly && <th className="px-5 py-3">Nama Siswa</th>}
                <th className="px-5 py-3">Ujian</th>
                <th className="px-5 py-3">Waktu Mulai</th>
                <th className="px-5 py-3">Waktu Selesai</th>
                <th className="px-5 py-3">Nilai Akhir</th>
                <th className="px-5 py-3">Pelanggaran</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DEE2E6]">
              {displayedAttempts.length > 0 ? (
                displayedAttempts.map(a => {
                  const studentUser = usersMap[a.USER_ID];
                  const examItem = examsMap[a.EXAM_ID];

                  return (
                    <tr key={a.ID} className="hover:bg-[#F8F9FA] transition-colors">
                      {!isStudentOnly && (
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-[#1A1C1E]">{studentUser?.NAME || '-'}</div>
                          <div className="text-[10px] text-[#6C757D]">
                            {classesMap[studentUser?.CLASS_ID || ''] || '-'} • {studentUser?.USERNAME}
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-3.5 font-medium text-[#1A1C1E]">
                        {examItem?.TITLE || a.EXAM_ID}
                      </td>
                      <td className="px-5 py-3.5 text-[#6C757D]">
                        {new Date(a.STARTED_AT).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-[#6C757D]">
                        {a.SUBMITTED_AT
                          ? new Date(a.SUBMITTED_AT).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        {a.STATUS === 'REVIEW' ? (
                          <span className="font-bold text-[#B06000]">Menunggu Koreksi</span>
                        ) : (
                          <div className="font-bold font-mono text-sm text-[#0052CC]">
                            {a.SCORE !== '' ? a.SCORE : '-'}{' '}
                            <span className="text-[10px] text-[#6C757D] font-normal">/ {a.MAX_SCORE}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-bold">
                        <span className={a.VIOLATIONS > 0 ? 'text-[#DC3545]' : 'text-[#6C757D]'}>
                          {a.VIOLATIONS}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            a.STATUS === 'SUBMITTED'
                              ? 'bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]'
                              : a.STATUS === 'REVIEW'
                              ? 'bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]'
                              : 'bg-[#E7F0FF] text-[#0052CC] border-[#B3D1FF]'
                          }`}
                        >
                          {a.STATUS === 'SUBMITTED'
                            ? 'Selesai'
                            : a.STATUS === 'REVIEW'
                            ? 'Perlu Koreksi'
                            : 'Sedang Berlangsung'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#6C757D]">
                    Belum ada rekaman ujian yang selesai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
