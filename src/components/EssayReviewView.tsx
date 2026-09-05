import React, { useState, useEffect } from 'react';
import { FileCheck2, CheckCircle2, Save, AlertCircle } from 'lucide-react';
import { getEssayReviews, gradeEssay } from '../services/lmsStorage';
import { EssayReviewItem } from '../types';

interface EssayReviewViewProps {
  token: string;
}

export const EssayReviewView: React.FC<EssayReviewViewProps> = ({ token }) => {
  const [reviews, setReviews] = useState<EssayReviewItem[]>([]);
  const [scoreInputs, setScoreInputs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadReviews = () => {
    try {
      const items = getEssayReviews(token);
      setReviews(items);
      const initialScores: Record<string, number> = {};
      items.forEach(item => {
        initialScores[`${item.attemptId}_${item.questionId}`] =
          item.score !== '' ? Number(item.score) : 0;
      });
      setScoreInputs(initialScores);
    } catch (err) {
      console.error('Failed to load essay reviews', err);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [token]);

  const handleSaveGrade = async (item: EssayReviewItem) => {
    const key = `${item.attemptId}_${item.questionId}`;
    const scoreVal = scoreInputs[key] ?? 0;

    setLoading(true);
    setStatusMessage(null);
    try {
      await gradeEssay(token, item.attemptId, item.questionId, scoreVal);
      setStatusMessage(`Nilai esai untuk ${item.student} berhasil disimpan.`);
      loadReviews();
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Gagal: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#1A1C1E] tracking-tight">Koreksi Soal Uraian (Essay)</h1>
        <p className="text-xs sm:text-sm text-[#6C757D] mt-1">
          Beri penilaian untuk jawaban esai siswa. Nilai akan diakumulasikan ke total skor ujian.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-md bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#137333] flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="bg-white border border-[#DEE2E6] rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#DEE2E6] flex items-center justify-between">
          <div className="text-xs font-bold text-[#1A1C1E]">Antrean Koreksi Esai</div>
          <div className="text-xs text-[#6C757D]">{reviews.length} jawaban menunggu</div>
        </div>

        <div className="divide-y divide-[#DEE2E6]">
          {reviews.length > 0 ? (
            reviews.map((item, idx) => {
              const key = `${item.attemptId}_${item.questionId}`;
              return (
                <div key={idx} className="p-6 space-y-4 hover:bg-[#F8F9FA] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-[#1A1C1E]">{item.student}</span>
                      <span className="text-xs text-[#6C757D]"> • {item.exam}</span>
                    </div>
                    <div className="text-xs font-bold text-[#0052CC]">
                      Bobot Maksimal: {item.maxPoints} Poin
                    </div>
                  </div>

                  {/* Question */}
                  <div className="p-4 rounded-md bg-[#F8F9FA] border border-[#DEE2E6] text-xs space-y-1">
                    <div className="font-bold text-[#495057]">Pertanyaan:</div>
                    <div className="font-medium text-[#1A1C1E] leading-relaxed whitespace-pre-wrap">
                      {item.question}
                    </div>
                  </div>

                  {/* Student Answer */}
                  <div className="p-4 rounded-md bg-white border border-[#DEE2E6] text-xs space-y-1">
                    <div className="font-bold text-[#495057]">Jawaban Siswa:</div>
                    <div className="text-[#1A1C1E] leading-relaxed whitespace-pre-wrap">
                      {item.answer ? (
                        item.answer
                      ) : (
                        <span className="italic text-[#6C757D]">(Siswa tidak mengisi jawaban)</span>
                      )}
                    </div>
                  </div>

                  {/* Grading input and action */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-[#1A1C1E]">Beri Nilai (0 - {item.maxPoints}):</label>
                      <input
                        type="number"
                        min="0"
                        max={item.maxPoints}
                        value={scoreInputs[key] ?? ''}
                        onChange={e =>
                          setScoreInputs({
                            ...scoreInputs,
                            [key]: Number(e.target.value)
                          })
                        }
                        className="w-20 px-3 py-1.5 border border-[#CED4DA] rounded-md text-xs font-bold font-mono text-center outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC] text-[#1A1C1E]"
                      />
                      <span className="text-xs text-[#6C757D]">/ {item.maxPoints} poin</span>
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSaveGrade(item)}
                      className="px-4 py-2 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Nilai</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-[#6C757D] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#137333] mx-auto" />
              <div className="font-bold text-sm text-[#1A1C1E]">Semua Jawaban Esai Telah Dinilai</div>
              <p className="text-xs">
                Tidak ada antrean jawaban uraian yang memerlukan koreksi saat ini.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EssayReviewView;
