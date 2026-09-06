import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ShieldAlert,
  ListFilter,
  CheckSquare,
  Sparkles,
  X,
  Volume2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { RichContentRenderer } from './RichContentRenderer';
import { parseMatchingDetails, parseMatchingAnswer, formatMatchingAnswer } from '../utils/matchingHelper';

interface QuestionBankMobileSimulatorProps {
  questions: any[];
  packageTitle: string;
  subjectName: string;
  className: string;
  assessmentTypeName: string;
  onExitMobileMode: () => void;
}

export const QuestionBankMobileSimulator: React.FC<QuestionBankMobileSimulatorProps> = ({
  questions,
  packageTitle,
  subjectName,
  className: targetClassName,
  assessmentTypeName,
  onExitMobileMode
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [doubtfulQuestions, setDoubtfulQuestions] = useState<Record<string, boolean>>({});
  const [isGridOpen, setIsGridOpen] = useState<boolean>(false);
  const [deviceModel, setDeviceModel] = useState<'iphone' | 'android'>('iphone');
  const [showKeyValidation, setShowKeyValidation] = useState<boolean>(true);

  // Simulated timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5340); // ~89 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#DEE2E6] space-y-3">
        <Smartphone className="w-12 h-12 text-[#6C757D] mx-auto" />
        <h3 className="font-bold text-sm text-[#1A1C1E]">Tidak Ada Soal untuk Direview</h3>
        <p className="text-xs text-[#6C757D]">
          Paket bank soal ini belum memiliki butir soal. Silakan input soal terlebih dahulu.
        </p>
        <button
          type="button"
          onClick={onExitMobileMode}
          className="px-4 py-2 rounded-lg bg-[#0052CC] text-white text-xs font-bold"
        >
          Kembali ke Tampilan Standar
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex] || questions[0];
  const qId = currentQ.ID || String(currentIndex);
  const currentAnswer = studentAnswers[qId] || '';
  const isDoubtful = !!doubtfulQuestions[qId];

  // Helper for answering MCQ
  const handleSelectMCQ = (opt: string) => {
    setStudentAnswers(prev => ({
      ...prev,
      [qId]: opt
    }));
  };

  // Helper for answering COMPLEX_MCQ
  const handleToggleComplexMCQ = (opt: string) => {
    const existing = currentAnswer
      ? currentAnswer.split(/[,;\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
      : [];
    let updated: string[];
    if (existing.includes(opt)) {
      updated = existing.filter(o => o !== opt);
    } else {
      updated = [...existing, opt].sort();
    }
    setStudentAnswers(prev => ({
      ...prev,
      [qId]: updated.join(',')
    }));
  };

  // Helper for answering TRUE_FALSE
  const handleSelectTrueFalse = (val: string) => {
    setStudentAnswers(prev => ({
      ...prev,
      [qId]: val
    }));
  };

  // Helper for answering MATCHING
  const handleSelectMatchingPair = (leftKey: string, rightKey: string) => {
    const existingPairs = parseMatchingAnswer(currentAnswer);
    if (!rightKey) {
      delete existingPairs[leftKey];
    } else {
      existingPairs[leftKey] = rightKey;
    }
    setStudentAnswers(prev => ({
      ...prev,
      [qId]: formatMatchingAnswer(existingPairs)
    }));
  };

  // Helper for reset test
  const handleResetSimulator = () => {
    setStudentAnswers({});
    setDoubtfulQuestions({});
    setCurrentIndex(0);
  };

  // Calculate statistics
  const answeredCount = Object.keys(studentAnswers).filter(k => studentAnswers[k]?.trim()).length;
  const doubtfulCount = Object.keys(doubtfulQuestions).filter(k => doubtfulQuestions[k]).length;

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="bg-white rounded-xl border border-[#DEE2E6] p-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E8F0FE] text-[#0052CC] flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1A1C1E]">
                Mode Pratinjau Mobile (Simulasi Smartphone Siswa)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#0052CC] text-[10px] font-bold">
                CBT Mobile View
              </span>
            </div>
            <p className="text-xs text-[#6C757D]">
              Uji coba pengalaman siswa mengerjakan ujian pada smartphone (touch targets, tata letak soal menjodohkan, font & navigasi).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Diagnostic Toggle */}
          <button
            type="button"
            onClick={() => setShowKeyValidation(!showKeyValidation)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              showKeyValidation
                ? 'bg-[#E6F4EA] border-[#CEEAD6] text-[#137333]'
                : 'bg-[#F8F9FA] border-[#DEE2E6] text-[#6C757D]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{showKeyValidation ? 'Validasi Kunci: ON' : 'Validasi Kunci: OFF'}</span>
          </button>

          {/* Device Model Switcher */}
          <div className="inline-flex p-0.5 bg-[#F1F3F5] rounded-lg border border-[#DEE2E6] text-xs">
            <button
              type="button"
              onClick={() => setDeviceModel('iphone')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                deviceModel === 'iphone'
                  ? 'bg-white text-[#0052CC] shadow-2xs'
                  : 'text-[#6C757D]'
              }`}
            >
              iPhone Frame
            </button>
            <button
              type="button"
              onClick={() => setDeviceModel('android')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                deviceModel === 'android'
                  ? 'bg-white text-[#0052CC] shadow-2xs'
                  : 'text-[#6C757D]'
              }`}
            >
              Android Frame
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetSimulator}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#CED4DA] bg-white hover:bg-[#F8F9FA] text-[#1A1C1E] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Reset simulasi jawaban"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#6C757D]" />
            <span>Reset Jawaban</span>
          </button>

          <button
            type="button"
            onClick={onExitMobileMode}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#0052CC] hover:bg-[#0047B3] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <span>Kembali ke Desktop</span>
          </button>
        </div>
      </div>

      {/* Center Device Frame Container */}
      <div className="flex justify-center items-start py-4 bg-[#F1F3F5] rounded-2xl border border-[#DEE2E6] min-h-[820px] overflow-hidden">
        {/* The Realistic Smartphone Mockup */}
        <div
          className={`relative bg-black transition-all shadow-2xl overflow-hidden flex flex-col ${
            deviceModel === 'iphone'
              ? 'w-[385px] h-[780px] rounded-[50px] border-[12px] border-[#1E293B] ring-1 ring-black/20'
              : 'w-[390px] h-[770px] rounded-[36px] border-[10px] border-[#2D3748] ring-1 ring-black/20'
          }`}
        >
          {/* Dynamic Island / Camera Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            {deviceModel === 'iphone' ? (
              <div className="w-28 h-6 bg-black rounded-full flex items-center justify-end px-2 gap-1.5 shadow-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-[#111] border border-white/20" />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-[#111] border border-white/20" />
            )}
          </div>

          {/* Smartphone Status Bar */}
          <div className="bg-white text-black px-6 pt-3 pb-1.5 flex items-center justify-between text-[11px] font-semibold border-b border-gray-100 flex-shrink-0 z-40 select-none">
            <span>08:30</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold">5G</span>
              <div className="w-4 h-2.5 border border-black rounded-xs p-0.5 flex items-center">
                <div className="h-full w-3/4 bg-black rounded-xs" />
              </div>
            </div>
          </div>

          {/* CBT Exam Mobile Top Header */}
          <div className="bg-[#0052CC] text-white px-3.5 py-2.5 shadow-sm flex items-center justify-between flex-shrink-0 z-30">
            <div className="space-y-0.5 max-w-[190px]">
              <div className="text-[10px] uppercase font-bold text-white/80 tracking-wide truncate">
                {subjectName} ({targetClassName})
              </div>
              <div className="text-xs font-bold text-white truncate">
                {packageTitle}
              </div>
            </div>

            {/* Timer & CBT Shield */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-black/25 px-2 py-1 rounded-md text-[11px] font-mono font-bold tracking-tight">
                <Clock className="w-3 h-3 text-amber-300" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsGridOpen(true)}
                className="p-1.5 rounded-md bg-white/15 hover:bg-white/25 transition-colors cursor-pointer text-white relative"
                title="Buka Lembar Daftar Soal"
              >
                <ListFilter className="w-3.5 h-3.5" />
                {doubtfulCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
                )}
              </button>
            </div>
          </div>

          {/* Exam Subheader: Question Counter & Doubtful Button */}
          <div className="bg-[#F8F9FA] border-b border-[#DEE2E6] px-3.5 py-2 flex items-center justify-between text-xs flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#1A1C1E]">
                Soal {currentIndex + 1}
              </span>
              <span className="text-[#6C757D]">/ {questions.length}</span>
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  currentQ.TYPE === 'MATCHING'
                    ? 'bg-[#E6F4EA] text-[#137333]'
                    : currentQ.TYPE === 'ESSAY'
                    ? 'bg-[#FEF7E0] text-[#B06000]'
                    : currentQ.TYPE === 'COMPLEX_MCQ'
                    ? 'bg-[#F3E8FF] text-[#7E22CE]'
                    : 'bg-[#E8F0FE] text-[#0052CC]'
                }`}
              >
                {currentQ.TYPE === 'MATCHING'
                  ? 'Menjodohkan'
                  : currentQ.TYPE === 'ESSAY'
                  ? 'Uraian'
                  : currentQ.TYPE === 'COMPLEX_MCQ'
                  ? 'PG Kompleks'
                  : currentQ.TYPE === 'TRUE_FALSE'
                  ? 'Benar/Salah'
                  : currentQ.TYPE === 'SHORT_ANSWER'
                  ? 'Isian'
                  : 'Pilihan Ganda'}
              </span>
            </div>

            {/* Ragu-Ragu Checkbox Button */}
            <label className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isDoubtful}
                onChange={e =>
                  setDoubtfulQuestions(prev => ({
                    ...prev,
                    [qId]: e.target.checked
                  }))
                }
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Ragu-ragu</span>
            </label>
          </div>

          {/* Scrollable Mobile Exam Screen Body */}
          <div className="flex-1 overflow-y-auto bg-white p-3.5 space-y-4 text-xs select-text">
            {/* Question Text */}
            <div className="text-[13px] leading-relaxed text-[#1A1C1E] font-medium border-b border-gray-100 pb-3">
              {currentQ.TYPE === 'MATCHING' ? (
                (() => {
                  const details = parseMatchingDetails(
                    currentQ.QUESTION,
                    currentQ,
                    currentQ.EXTRA_DATA,
                    currentQ.ANSWER
                  );
                  return (
                    <RichContentRenderer
                      content={details.prompt || currentQ.QUESTION}
                      className="text-xs sm:text-[13px]"
                    />
                  );
                })()
              ) : (
                <RichContentRenderer
                  content={currentQ.QUESTION}
                  className="text-xs sm:text-[13px]"
                />
              )}
            </div>

            {/* --- 1. MCQ (PILIHAN GANDA) MOBILE OPTIONS --- */}
            {(currentQ.TYPE === 'MCQ' || (!currentQ.TYPE && !currentQ.EXTRA_DATA)) && (
              <div className="space-y-2">
                {['A', 'B', 'C', 'D', 'E'].map(opt => {
                  const optKey = `OPTION_${opt}`;
                  const optText = currentQ[optKey];
                  if (!optText) return null;

                  const isSelected = currentAnswer === opt;
                  const isKey = String(currentQ.ANSWER || '').trim().toUpperCase() === opt;

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleSelectMCQ(opt)}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-start gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0052CC] border-[#0052CC] text-white shadow-xs font-semibold'
                          : 'bg-[#F8F9FA] hover:bg-[#F1F3F5] border-[#DEE2E6] text-[#1A1C1E]'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-white text-[#0052CC]'
                            : 'bg-white border border-[#CED4DA] text-[#495057]'
                        }`}
                      >
                        {opt}
                      </span>
                      <div className="flex-1 pt-0.5 text-xs">
                        <RichContentRenderer content={optText} inline />
                        {showKeyValidation && isKey && (
                          <span
                            className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                            }`}
                          >
                            ✓ Kunci
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* --- 2. COMPLEX_MCQ (PG KOMPLEKS) MOBILE OPTIONS --- */}
            {currentQ.TYPE === 'COMPLEX_MCQ' && (
              <div className="space-y-2">
                <div className="text-[11px] text-[#6C757D] italic">
                  *Pilih satu atau lebih pilihan jawaban yang benar:
                </div>
                {['A', 'B', 'C', 'D', 'E'].map(opt => {
                  const optKey = `OPTION_${opt}`;
                  const optText = currentQ[optKey];
                  if (!optText) return null;

                  const selectedOpts = currentAnswer
                    ? currentAnswer.split(/[,;\s]+/).map(s => s.trim().toUpperCase())
                    : [];
                  const isSelected = selectedOpts.includes(opt);
                  const isKey = String(currentQ.ANSWER || '')
                    .split(/[,;\s]+/)
                    .map(s => s.trim().toUpperCase())
                    .includes(opt);

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleToggleComplexMCQ(opt)}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-start gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#7E22CE] border-[#7E22CE] text-white shadow-xs font-semibold'
                          : 'bg-[#F8F9FA] hover:bg-[#F1F3F5] border-[#DEE2E6] text-[#1A1C1E]'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-white text-[#7E22CE]'
                            : 'bg-white border border-[#CED4DA] text-[#495057]'
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4 text-[#7E22CE]" /> : opt}
                      </div>
                      <div className="flex-1 pt-0.5 text-xs">
                        <RichContentRenderer content={optText} inline />
                        {showKeyValidation && isKey && (
                          <span
                            className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]'
                            }`}
                          >
                            ✓ Kunci
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* --- 3. MATCHING (MENJODOHKAN) MOBILE SCREEN --- */}
            {currentQ.TYPE === 'MATCHING' && (() => {
              const details = parseMatchingDetails(
                currentQ.QUESTION,
                currentQ,
                currentQ.EXTRA_DATA,
                currentQ.ANSWER
              );
              const userPairs = parseMatchingAnswer(currentAnswer);
              const keyPairs = details.correctPairs || {};

              // Check validation of keys
              const leftKeys = details.leftItems.map(i => i.key);
              const rightKeys = details.rightItems.map(i => i.key.toUpperCase());
              const missingPairs = leftKeys.filter(k => !keyPairs[k]);
              const invalidPairs = Object.entries(keyPairs).filter(
                ([, r]) => !rightKeys.includes(String(r).toUpperCase())
              );
              const isKeyFullyValid =
                leftKeys.length > 0 && missingPairs.length === 0 && invalidPairs.length === 0;

              return (
                <div className="space-y-3">
                  {/* Teacher Validation Banner (if ON) */}
                  {showKeyValidation && (
                    <div
                      className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                        isKeyFullyValid
                          ? 'bg-[#E6F4EA] border-[#CEEAD6] text-[#137333]'
                          : 'bg-[#FEF7E0] border-[#FEEFC3] text-[#B06000]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {isKeyFullyValid ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isKeyFullyValid
                            ? `✓ Kunci Pasangan Valid (${leftKeys.length} Item Terpetakan)`
                            : '⚠️ Perhatian Kunci Pasangan Menjodohkan'}
                        </span>
                      </div>
                      <div className="text-[10px]">
                        <b>Kunci Guru:</b> {currentQ.ANSWER || '(Belum ditentukan)'}
                      </div>
                      {!isKeyFullyValid && (
                        <div className="text-[10px] text-[#C5221F]">
                          {missingPairs.length > 0 &&
                            `Item ${missingPairs.join(', ')} belum dipasangkan di kunci. `}
                          {invalidPairs.length > 0 &&
                            `Opsi tujuan tidak terdaftar di Kolom B!`}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reference of Column B Options */}
                  <div className="bg-[#F8F9FA] border border-[#DEE2E6] rounded-lg p-2.5 space-y-1.5">
                    <div className="font-bold text-[11px] text-[#1A1C1E] border-b border-[#DEE2E6] pb-1">
                      Pilihan Jawaban (Kolom Kanan):
                    </div>
                    <div className="space-y-1">
                      {details.rightItems.map(r => (
                        <div key={r.key} className="flex items-start gap-1.5 text-[11px]">
                          <span className="font-bold font-mono px-1 bg-white border border-[#CED4DA] rounded text-[#0052CC] shrink-0">
                            {r.key}
                          </span>
                          <div className="text-[#343A40] flex-1">
                            <RichContentRenderer content={r.text} inline />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pairing Controls for Left Items */}
                  <div className="space-y-2 pt-1">
                    <div className="font-bold text-[11px] text-[#1A1C1E]">
                      Pasangkan Setiap Pernyataan Berikut:
                    </div>

                    {details.leftItems.map(left => {
                      const selectedRight = userPairs[left.key] || '';
                      const keyRight = keyPairs[left.key] || '';

                      return (
                        <div
                          key={left.key}
                          className="p-2.5 rounded-lg border border-[#DEE2E6] bg-white space-y-2 shadow-2xs"
                        >
                          <div className="flex items-start gap-1.5 text-[11px] font-medium text-[#1A1C1E]">
                            <span className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {left.key}
                            </span>
                            <div className="flex-1">
                              <RichContentRenderer content={left.text} inline />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="text-[10px] text-[#6C757D] font-semibold">
                              Pasangan:
                            </span>
                            <select
                              value={selectedRight}
                              onChange={e => handleSelectMatchingPair(left.key, e.target.value)}
                              className={`px-2 py-1 rounded border text-[11px] font-bold outline-none cursor-pointer ${
                                selectedRight
                                  ? 'bg-[#E8F0FE] border-[#0052CC] text-[#0052CC]'
                                  : 'bg-white border-[#CED4DA] text-[#6C757D]'
                              }`}
                            >
                              <option value="">-- Pilih Jawaban --</option>
                              {details.rightItems.map(r => (
                                <option key={r.key} value={r.key}>
                                  [{r.key}] {r.text.slice(0, 30)}...
                                </option>
                              ))}
                            </select>
                          </div>

                          {showKeyValidation && keyRight && (
                            <div className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center justify-between">
                              <span>Kunci Benar: [{keyRight}]</span>
                              {selectedRight === keyRight ? (
                                <span className="text-emerald-600 font-bold">✓ Sesuai Kunci</span>
                              ) : selectedRight ? (
                                <span className="text-amber-700 font-semibold">Belum Sesuai</span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* --- 4. TRUE_FALSE (BENAR / SALAH) --- */}
            {currentQ.TYPE === 'TRUE_FALSE' && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  {['BENAR', 'SALAH'].map(val => {
                    const isSelected = currentAnswer === val;
                    const isKey = String(currentQ.ANSWER || '').trim().toUpperCase() === val;

                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelectTrueFalse(val)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? val === 'BENAR'
                              ? 'bg-[#137333] border-[#137333] text-white shadow-xs'
                              : 'bg-[#C5221F] border-[#C5221F] text-white shadow-xs'
                            : 'bg-[#F8F9FA] hover:bg-[#F1F3F5] border-[#DEE2E6] text-[#1A1C1E]'
                        }`}
                      >
                        <span className="font-bold text-xs">{val}</span>
                        {showKeyValidation && isKey && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-[#E6F4EA] text-[#137333]'
                            }`}
                          >
                            ✓ Kunci
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --- 5. SHORT_ANSWER (ISIAN SINGKAT) --- */}
            {currentQ.TYPE === 'SHORT_ANSWER' && (
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-[#1A1C1E]">
                  Ketik Jawaban Singkat Anda:
                </label>
                <input
                  type="text"
                  placeholder="Ketik jawaban di sini..."
                  value={currentAnswer}
                  onChange={e =>
                    setStudentAnswers(prev => ({
                      ...prev,
                      [qId]: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2 border border-[#CED4DA] rounded-lg text-xs outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                />
                {showKeyValidation && (
                  <div className="text-[10px] bg-[#E8F0FE] text-[#0052CC] p-2 rounded-lg border border-[#B3D1FF]">
                    <b>Kunci Jawaban CBT:</b> "{currentQ.ANSWER || '-'}"
                  </div>
                )}
              </div>
            )}

            {/* --- 6. ESSAY (URAIAN / ESAI) --- */}
            {currentQ.TYPE === 'ESSAY' && (
              <div className="space-y-2 pt-1">
                <label className="text-[11px] font-bold text-[#1A1C1E]">
                  Tuliskan Uraian Jawaban Lengkap:
                </label>
                <textarea
                  rows={4}
                  placeholder="Tuliskan jawaban uraian Anda di sini..."
                  value={currentAnswer}
                  onChange={e =>
                    setStudentAnswers(prev => ({
                      ...prev,
                      [qId]: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2 border border-[#CED4DA] rounded-lg text-xs outline-none focus:border-[#0052CC] focus:ring-1 focus:ring-[#0052CC]"
                />
                <div className="flex justify-between text-[10px] text-[#6C757D]">
                  <span>{currentAnswer ? currentAnswer.trim().split(/\s+/).length : 0} kata</span>
                  <span>Bobot: {currentQ.POINTS || 10} Poin</span>
                </div>
                {showKeyValidation && currentQ.ANSWER && (
                  <div className="text-[10px] bg-emerald-50 text-emerald-900 p-2 rounded-lg border border-emerald-200">
                    <b>Rubrik Penilaian:</b> {currentQ.ANSWER}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Mobile Action Navigation Bar */}
          <div className="bg-[#F8F9FA] border-t border-[#DEE2E6] px-3 py-2 flex items-center justify-between gap-2 flex-shrink-0 z-30">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                currentIndex === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border border-[#CED4DA] text-[#1A1C1E] hover:bg-[#F1F3F5] cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGridOpen(true)}
              className="text-[11px] font-bold text-[#0052CC] px-2 py-1 hover:underline cursor-pointer flex items-center gap-1"
            >
              <ListFilter className="w-3 h-3" />
              <span>Daftar Soal ({answeredCount}/{questions.length})</span>
            </button>

            <button
              type="button"
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                currentIndex === questions.length - 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#0052CC] hover:bg-[#0047B3] text-white cursor-pointer shadow-xs'
              }`}
            >
              <span>Lanjut</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Question Grid Bottom Sheet inside Phone */}
          {isGridOpen && (
            <div className="absolute inset-0 bg-black/60 z-50 flex flex-col justify-end">
              <div className="bg-white rounded-t-2xl p-4 max-h-[70%] overflow-y-auto space-y-3 shadow-2xl animate-in slide-in-from-bottom duration-200">
                <div className="flex items-center justify-between border-b border-[#DEE2E6] pb-2">
                  <div className="font-bold text-xs text-[#1A1C1E]">
                    Navigasi Butir Soal ({questions.length})
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGridOpen(false)}
                    className="p-1 rounded-md text-[#6C757D] hover:bg-[#F1F3F5]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-[10px] text-[#6C757D]">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-[#137333]" /> Terjawab
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-amber-400" /> Ragu
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-gray-200" /> Kosong
                  </span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {questions.map((q, idx) => {
                    const qIdIter = q.ID || String(idx);
                    const isAns = !!studentAnswers[qIdIter]?.trim();
                    const isDoubt = !!doubtfulQuestions[qIdIter];
                    const isCurr = currentIndex === idx;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentIndex(idx);
                          setIsGridOpen(false);
                        }}
                        className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                          isCurr
                            ? 'ring-2 ring-[#0052CC] ring-offset-1 font-extrabold'
                            : ''
                        } ${
                          isDoubt
                            ? 'bg-amber-400 text-black'
                            : isAns
                            ? 'bg-[#137333] text-white'
                            : 'bg-[#F1F3F5] text-[#495057] hover:bg-[#E9ECEF]'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
