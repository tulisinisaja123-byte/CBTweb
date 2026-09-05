import React, { useState, useEffect } from 'react';
import { BookMarked, PlayCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { getAvailableExams } from '../services/lmsStorage';
import { AvailableExamItem } from '../types';

interface StudentExamsViewProps {
  token: string;
  onStartExam: (examId: string) => void;
}

export const StudentExamsView: React.FC<StudentExamsViewProps> = ({ token, onStartExam }) => {
  const [exams, setExams] = useState<AvailableExamItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadExams = () => {
    try {
      setLoading(true);
      const list = getAvailableExams(token);
      setExams(list);
    } catch (err) {
      console.error('Failed to load available exams', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, [token]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E7F0FF] text-[#0052CC] border border-[#B3D1FF]">Sedang Berjalan</span>;
      case 'SUBMITTED':
      case 'FINISHED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">Selesai</span>;
      case 'REVIEW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3]">Menunggu Koreksi</span>;
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">Aktif</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#F1F3F5] text-[#495057] border border-[#DEE2E6]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight">Daftar Ujian Siswa</h1>
        <p className="text-xs sm:text-sm text-[#6C757D] mt-1">
          Pilih jadwal ujian aktif untuk memulai pengerjaan CBT. Pastikan koneksi internet stabil.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {exams.length > 0 ? (
          exams.map(exam => (
            <div
              key={exam.id}
              className="bg-white border border-[#DEE2E6] rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-[#0052CC] transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 rounded bg-[#E7F0FF] text-[#0052CC] font-bold text-[11px] border border-[#B3D1FF]">
                    {exam.subject}
                  </span>
                  {getStatusBadge(exam.status)}
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#1A1C1E] tracking-tight leading-snug">
                    {exam.title}
                  </h3>
                  <div className="text-xs text-[#6C757D] mt-1 space-y-0.5">
                    <div>Kelas: <span className="font-medium text-[#1A1C1E]">{exam.className}</span></div>
                    <div>Tanggal: <span className="font-medium text-[#1A1C1E]">{exam.date}</span></div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <Clock className="w-3.5 h-3.5 text-[#0052CC]" />
                      <span>Durasi: <b className="text-[#1A1C1E] font-medium">{exam.duration} menit</b></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#DEE2E6] flex items-center justify-between">
                {exam.canStart ? (
                  <button
                    type="button"
                    onClick={() => onStartExam(exam.id)}
                    className="w-full py-2.5 px-4 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <PlayCircle className="w-4 h-4 text-white" />
                    <span>{exam.status === 'IN_PROGRESS' ? 'Lanjutkan Ujian' : 'Mulai Kerjakan Ujian'}</span>
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-between text-xs">
                    <span className="text-[#6C757D]">Nilai Anda:</span>
                    <span className="text-base font-bold font-mono text-[#0052CC]">
                      {exam.score !== '' ? `${exam.score} Poin` : 'Menunggu Koreksi'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-[#6C757D] bg-white rounded-lg border border-[#DEE2E6]">
            <BookMarked className="w-10 h-10 text-[#CED4DA] mx-auto mb-2" />
            <div className="font-bold text-sm text-[#1A1C1E]">Tidak Ada Jadwal Ujian Aktif</div>
            <div className="text-xs mt-1">Ujian untuk kelas Anda belum dijadwalkan atau telah selesai.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentExamsView;

