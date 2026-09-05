import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  Download,
  ExternalLink,
  Lock,
  Eye,
  CheckCircle2,
  FileCode,
  Layers,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { RAW_SUPABASE_RLS_SQL, RLS_POLICY_SUMMARIES } from '../data/supabaseRlsData';

interface SupabaseRlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseRlsModal: React.FC<SupabaseRlsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'sql' | 'guide'>('matrix');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const text = RAW_SUPABASE_RLS_SQL;
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Gagal menyalin:', e);
    }
  };

  const handleDownloadSql = () => {
    try {
      const blob = new Blob([RAW_SUPABASE_RLS_SQL], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cbt_supabase_schema_and_rls.sql';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Gagal mengunduh file:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-[#DEE2E6] flex flex-col w-full max-w-4xl max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#F8F9FA] border-b border-[#DEE2E6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1A1C1E] leading-tight">
                  Row-Level Security (RLS) & Kebijakan Keamanan Supabase
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Aktif & Terproteksi
                </span>
              </div>
              <p className="text-xs text-[#6C757D] mt-0.5">
                Isolasi data siswa, bank soal, lembar jawaban, dan hak akses guru/administrator pada level database PostgreSQL.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6C757D] hover:text-[#1A1C1E] hover:bg-[#E9ECEF] transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-5 bg-white border-b border-[#DEE2E6] text-xs">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`py-3 px-3.5 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'matrix'
                  ? 'border-[#0052CC] text-[#0052CC]'
                  : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Matriks Akses Peran</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sql')}
              className={`py-3 px-3.5 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'sql'
                  ? 'border-[#0052CC] text-[#0052CC]'
                  : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Kode SQL Lengkap</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`py-3 px-3.5 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'guide'
                  ? 'border-[#0052CC] text-[#0052CC]'
                  : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Panduan Eksekusi di Supabase</span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F9FA] hover:bg-[#E9ECEF] text-[#1A1C1E] border border-[#CED4DA] font-semibold text-xs shadow-2xs transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#495057]" />}
              <span>{copied ? 'Tersalin!' : 'Salin SQL'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSql}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white font-semibold text-xs shadow-2xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh .sql</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'matrix' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Keamanan Row-Level Security (RLS) Terintegrasi</div>
                  <div className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                    Setiap panggilan query Supabase dari aplikasi CBT kini menyertakan header keamanan <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px]">x-cbt-token</code>.
                    PostgreSQL secara otomatis mengevaluasi sesi dan membatasi data langsung di database engine sehingga tidak ada celah kebocoran jawaban atau ujian siswa lain.
                  </div>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="border border-[#DEE2E6] rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#DEE2E6] text-[11px] font-bold text-[#495057] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Tabel Database</th>
                      <th className="py-2.5 px-3 text-amber-900 bg-amber-50/50">Hak Akses Siswa</th>
                      <th className="py-2.5 px-3 text-emerald-900 bg-emerald-50/50">Hak Akses Guru</th>
                      <th className="py-2.5 px-3 text-blue-900 bg-blue-50/50">Administrator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DEE2E6] text-xs">
                    {RLS_POLICY_SUMMARIES.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 align-top">
                          {row.table}
                          <div className="text-[10px] font-sans font-normal text-slate-500 mt-0.5">{row.detail}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 align-top bg-amber-50/10">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px] mb-1">
                            Siswa
                          </span>
                          <div>{row.student}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 align-top bg-emerald-50/10">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px] mb-1">
                            Guru
                          </span>
                          <div>{row.teacher}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 align-top bg-blue-50/10">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-[10px] mb-1">
                            Admin
                          </span>
                          <div>{row.admin}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Security Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-white border border-[#DEE2E6] rounded-lg shadow-xs">
                  <div className="flex items-center gap-1.5 text-amber-700 font-bold mb-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Anti-Bocor Soal</span>
                  </div>
                  <p className="text-[11px] text-[#6C757D]">
                    Siswa tidak dapat mengakses soal ujian sebelum jadwal dibuka, dan hanya soal kelasnya yang diizinkan untuk di-query.
                  </p>
                </div>
                <div className="p-3 bg-white border border-[#DEE2E6] rounded-lg shadow-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold mb-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Isolasi Jawaban Siswa</span>
                  </div>
                  <p className="text-[11px] text-[#6C757D]">
                    Setiap siswa hanya memiliki izin SELECT dan UPDATE pada lembar jawabannya sendiri. Siswa lain tidak bisa melihat nilainya.
                  </p>
                </div>
                <div className="p-3 bg-white border border-[#DEE2E6] rounded-lg shadow-xs">
                  <div className="flex items-center gap-1.5 text-blue-700 font-bold mb-1">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Integritas Nilai</span>
                  </div>
                  <p className="text-[11px] text-[#6C757D]">
                    Siswa tidak dapat mengubah lembar jawaban yang sudah disubmit (<code className="font-mono text-[10px]">STATUS = 'SUBMITTED'</code>).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#6C757D]">
                <span>Script SQL PostgreSQL untuk Supabase SQL Editor (100% Idempotent, aman dijalankan ulang)</span>
                <span className="font-mono text-[11px]">supabase/schema_and_rls.sql</span>
              </div>
              <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed max-h-[500px] overflow-y-auto p-4 shadow-inner">
                <pre>{RAW_SUPABASE_RLS_SQL}</pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                <div className="font-bold text-sm mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-700" />
                  3 Langkah Mudah Menjalankan di Supabase Dashboard
                </div>
                <p className="text-xs text-blue-800">
                  Ikuti panduan berikut untuk mengaktifkan aturan keamanan Row-Level Security pada proyek database Supabase Anda:
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-lg border border-[#DEE2E6] bg-white flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0052CC] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    1
                  </div>
                  <div>
                    <div className="font-bold text-[#1A1C1E]">Buka SQL Editor di Dashboard Supabase</div>
                    <div className="text-[#6C757D] text-[11px] mt-0.5">
                      Masuk ke konsol Supabase proyek Anda (<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-[#0052CC] hover:underline inline-flex items-center gap-0.5">supabase.com/dashboard <ExternalLink className="w-2.5 h-2.5" /></a>), pilih menu <strong>SQL Editor</strong> di sidebar sebelah kiri, lalu klik <strong>New Query</strong>.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-[#DEE2E6] bg-white flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0052CC] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    2
                  </div>
                  <div>
                    <div className="font-bold text-[#1A1C1E]">Salin & Tempel Kode SQL</div>
                    <div className="text-[#6C757D] text-[11px] mt-0.5">
                      Klik tombol <strong>Salin SQL</strong> di atas (atau unduh file <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">cbt_supabase_schema_and_rls.sql</code>), lalu tempelkan (paste) seluruh kodenya ke area kerja editor SQL Supabase.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-[#DEE2E6] bg-white flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0052CC] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                    3
                  </div>
                  <div>
                    <div className="font-bold text-[#1A1C1E]">Klik "Run" (Jalankan)</div>
                    <div className="text-[#6C757D] text-[11px] mt-0.5">
                      Tekan tombol hijau <strong>Run</strong> di pojok kanan bawah editor Supabase. Setelah selesai, seluruh tabel CBT MAS MUHAMMADIYAH CIKARAMAS akan langsung memiliki status <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold">RLS: ENABLED</span>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#F8F9FA] border-t border-[#DEE2E6] flex items-center justify-between text-xs">
          <span className="text-[#6C757D]">
            CBT & LMS MAS MUHAMMADIYAH CIKARAMAS &bull; PostgreSQL Row-Level Security
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-[#CED4DA] hover:bg-[#E9ECEF] text-[#1A1C1E] font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
