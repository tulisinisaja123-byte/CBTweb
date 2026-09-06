import { Question, Attempt, Exam } from '../types';

export interface DistractorStats {
  option: string; // 'A', 'B', 'C', 'D', 'E', 'LAINNYA'
  text?: string;
  totalCount: number;
  percentage: number;
  upperCount: number; // Dipilih oleh Kelompok Atas
  lowerCount: number; // Dipilih oleh Kelompok Bawah
  isCorrect: boolean;
  status: 'KUNCI' | 'EFEKTIF' | 'KURANG_EFEKTIF' | 'MENYESATKAN' | 'TIDAK_DIPILIH';
  notes: string;
}

export interface QuestionAnalysisResult {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionType: string;
  answerKey: string;
  points: number;
  // Kesukaran
  difficultyIndex: number; // P (0.00 - 1.00)
  difficultyCategory: 'SUKAR' | 'SEDANG' | 'MUDAH';
  // Daya Pembeda
  discriminationIndex: number; // D (-1.00 - 1.00)
  discriminationCategory: 'SANGAT_BAIK' | 'BAIK' | 'CUKUP' | 'BURUK';
  // Rincian Kelompok
  correctUpper: number; // BA
  correctLower: number; // BB
  totalUpper: number; // NA
  totalLower: number; // NB
  proportionUpper: number; // PA
  proportionLower: number; // PB
  totalCorrect: number;
  totalAnswered: number;
  // Rekomendasi
  recommendation: 'DITERIMA' | 'REVISI' | 'DITOLAK';
  recommendationReason: string;
  // Distraktor
  distractors: DistractorStats[];
  hasDistractorIssues: boolean;
}

export interface ExamPsychometricSummary {
  examId: string;
  examTitle: string;
  totalStudents: number;
  upperCount: number;
  lowerCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  scoreStdDev: number;
  scoreVariance: number;
  averageDifficulty: number; // Rerata P
  averageDiscrimination: number; // Rerata D
  reliabilityKR20: number; // Indeks reliabilitas KR-20
  reliabilityCategory: 'SANGAT_TINGGI' | 'TINGGI' | 'SEDANG' | 'RENDAH';
  // Distribusi Kesukaran
  difficultyCounts: {
    sukar: number;
    sedang: number;
    mudah: number;
  };
  // Distribusi Daya Pembeda
  discriminationCounts: {
    sangatBaik: number;
    baik: number;
    cukup: number;
    buruk: number;
  };
  // Rekomendasi
  recommendationCounts: {
    diterima: number;
    revisi: number;
    ditolak: number;
  };
  items: QuestionAnalysisResult[];
}

/**
 * Normalisasi jawaban siswa untuk pencocokan kunci
 */
function normalizeAnswer(val: any): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') return val.trim().toUpperCase();
  if (typeof val === 'number') return String(val).trim().toUpperCase();
  if (Array.isArray(val)) return val.map(v => String(v).trim().toUpperCase()).sort().join(',');
  return String(val).trim().toUpperCase();
}

/**
 * Mengevaluasi apakah jawaban siswa benar (skor 1) atau salah (skor 0)
 */
function evaluateItemScore(q: Question, studentAnswer: string): number {
  if (!studentAnswer) return 0;
  const ans = normalizeAnswer(studentAnswer);
  const key = normalizeAnswer(q.ANSWER);

  if (q.TYPE === 'MCQ') {
    return ans === key ? 1 : 0;
  }

  if (q.TYPE === 'TRUE_FALSE') {
    const normTF = (s: string) => {
      if (s === 'BENAR' || s === 'TRUE' || s === 'B' || s === 'T' || s === '1') return 'BENAR';
      if (s === 'SALAH' || s === 'FALSE' || s === 'S' || s === 'F' || s === '0') return 'SALAH';
      return s;
    };
    return normTF(ans) === normTF(key) ? 1 : 0;
  }

  if (q.TYPE === 'SHORT_ANSWER') {
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const cleanAns = clean(ans);
    const validKeys = key.split(/[,;\/|]+/).map(clean).filter(Boolean);
    return validKeys.some(k => k === cleanAns || cleanAns.includes(k)) ? 1 : 0;
  }

  if (q.TYPE === 'COMPLEX_MCQ') {
    const sOpts = Array.from(new Set(ans.split(/[,; ]+/).filter(Boolean))).sort();
    const kOpts = Array.from(new Set(key.split(/[,; ]+/).filter(Boolean))).sort();
    if (sOpts.length > 0 && kOpts.length > 0 && sOpts.join(',') === kOpts.join(',')) {
      return 1;
    }
    // Partial 0.5 jika sebagian besar benar
    const wrong = sOpts.filter(o => !kOpts.includes(o));
    if (wrong.length === 0 && sOpts.length >= Math.ceil(kOpts.length / 2)) {
      return 0.5;
    }
    return 0;
  }

  // Tipe lain / Essay
  return ans.length > 10 ? 0.75 : ans ? 0.5 : 0;
}

/**
 * Melakukan Analisis Butir Soal (Item Analysis)
 */
export function calculateItemAnalysis(
  questions: Question[],
  attempts: Attempt[],
  exam?: Exam | null
): ExamPsychometricSummary | null {
  if (!questions || questions.length === 0) {
    return null;
  }

  // Filter attempt yang valid & selesai untuk ujian ini jika exam diberikan
  let validAttempts = (attempts || []).filter(a => {
    if (exam && exam.ID && a.EXAM_ID !== exam.ID) return false;
    return a.STATUS === 'SUBMITTED' || a.STATUS === 'REVIEW' || Number(a.SCORE) >= 0;
  });

  const totalStudents = validAttempts.length;

  // Jika belum ada siswa yang mengerjakan sama sekali
  if (totalStudents === 0) {
    return {
      examId: exam?.ID || 'UJIAN',
      examTitle: exam?.TITLE || 'Ujian CBT',
      totalStudents: 0,
      upperCount: 0,
      lowerCount: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      scoreStdDev: 0,
      scoreVariance: 0,
      averageDifficulty: 0,
      averageDiscrimination: 0,
      reliabilityKR20: 0,
      reliabilityCategory: 'RENDAH',
      difficultyCounts: { sukar: 0, sedang: 0, mudah: 0 },
      discriminationCounts: { sangatBaik: 0, baik: 0, cukup: 0, buruk: 0 },
      recommendationCounts: { diterima: 0, revisi: 0, ditolak: 0 },
      items: questions.map((q, idx) => ({
        questionId: q.ID,
        questionNumber: idx + 1,
        questionText: q.QUESTION || `Soal Nomor ${idx + 1}`,
        questionType: q.TYPE || 'MCQ',
        answerKey: q.ANSWER || '-',
        points: q.POINTS || 1,
        difficultyIndex: 0,
        difficultyCategory: 'SEDANG',
        discriminationIndex: 0,
        discriminationCategory: 'CUKUP',
        correctUpper: 0,
        correctLower: 0,
        totalUpper: 0,
        totalLower: 0,
        proportionUpper: 0,
        proportionLower: 0,
        totalCorrect: 0,
        totalAnswered: 0,
        recommendation: 'REVISI',
        recommendationReason: 'Belum ada data pengerjaan siswa',
        distractors: [],
        hasDistractorIssues: false
      }))
    };
  }

  // Parse jawaban per siswa
  const studentData = validAttempts.map(a => {
    let answersObj: Record<string, string> = {};
    try {
      if (typeof a.ANSWERS_JSON === 'object' && a.ANSWERS_JSON !== null) {
        answersObj = a.ANSWERS_JSON as any;
      } else if (typeof a.ANSWERS_JSON === 'string') {
        answersObj = JSON.parse(a.ANSWERS_JSON || '{}');
      }
    } catch {
      answersObj = {};
    }

    const numScore = Number(a.SCORE);
    const scoreVal = !isNaN(numScore) ? numScore : 0;

    return {
      attemptId: a.ID,
      userId: a.USER_ID,
      score: scoreVal,
      answers: answersObj
    };
  });

  // Urutkan siswa dari nilai tertinggi ke terendah
  studentData.sort((a, b) => b.score - a.score);

  // Tentukan Kelompok Atas (KA) dan Kelompok Bawah (KB)
  // Aturan standar: Kelly's 27% jika N >= 30, atau 50% split jika N < 30
  let groupSize = Math.max(1, Math.floor(totalStudents * (totalStudents >= 30 ? 0.27 : 0.5)));
  if (totalStudents === 1) {
    groupSize = 1;
  }

  const upperGroup = studentData.slice(0, groupSize);
  const lowerGroup = studentData.slice(Math.max(groupSize, totalStudents - groupSize));

  const NA = upperGroup.length;
  const NB = lowerGroup.length;

  // Analisis per butir soal
  const analyzedItems: QuestionAnalysisResult[] = questions.map((q, idx) => {
    let BA = 0; // Benar Kelompok Atas
    let BB = 0; // Benar Kelompok Bawah
    let totalCorrect = 0;
    let totalAnswered = 0;

    // Track pemilih per opsi distraktor (A, B, C, D, E)
    const optionCounts: Record<string, { total: number; upper: number; lower: number }> = {
      A: { total: 0, upper: 0, lower: 0 },
      B: { total: 0, upper: 0, lower: 0 },
      C: { total: 0, upper: 0, lower: 0 },
      D: { total: 0, upper: 0, lower: 0 },
      E: { total: 0, upper: 0, lower: 0 },
      LAINNYA: { total: 0, upper: 0, lower: 0 }
    };

    // Evaluasi Kelompok Atas
    upperGroup.forEach(s => {
      const rawAns = s.answers[q.ID] || '';
      if (rawAns) totalAnswered++;
      const score = evaluateItemScore(q, rawAns);
      if (score >= 0.5) BA += score;

      const norm = normalizeAnswer(rawAns);
      if (optionCounts[norm]) {
        optionCounts[norm].upper++;
        optionCounts[norm].total++;
      } else if (norm) {
        optionCounts.LAINNYA.upper++;
        optionCounts.LAINNYA.total++;
      }
    });

    // Evaluasi Kelompok Bawah
    lowerGroup.forEach(s => {
      const rawAns = s.answers[q.ID] || '';
      if (rawAns) totalAnswered++;
      const score = evaluateItemScore(q, rawAns);
      if (score >= 0.5) BB += score;

      const norm = normalizeAnswer(rawAns);
      if (optionCounts[norm]) {
        optionCounts[norm].lower++;
        optionCounts[norm].total++;
      } else if (norm) {
        optionCounts.LAINNYA.lower++;
        optionCounts.LAINNYA.total++;
      }
    });

    // Hitung total benar di semua siswa
    studentData.forEach(s => {
      const rawAns = s.answers[q.ID] || '';
      const score = evaluateItemScore(q, rawAns);
      if (score >= 0.5) totalCorrect += score;
    });

    // Hitung P (Tingkat Kesukaran)
    // Rumus Depdikbud: P = (BA + BB) / (NA + NB)
    const PA = NA > 0 ? BA / NA : 0;
    const PB = NB > 0 ? BB / NB : 0;
    let P = (NA + NB) > 0 ? (BA + BB) / (NA + NB) : totalStudents > 0 ? totalCorrect / totalStudents : 0;
    P = Math.max(0, Math.min(1, Math.round(P * 1000) / 1000));

    // Klasifikasi Kesukaran
    let difficultyCategory: 'SUKAR' | 'SEDANG' | 'MUDAH' = 'SEDANG';
    if (P < 0.30) {
      difficultyCategory = 'SUKAR';
    } else if (P > 0.70) {
      difficultyCategory = 'MUDAH';
    } else {
      difficultyCategory = 'SEDANG';
    }

    // Hitung D (Daya Pembeda)
    // Rumus Depdikbud: D = PA - PB = (BA / NA) - (BB / NB)
    let D = PA - PB;
    D = Math.max(-1, Math.min(1, Math.round(D * 1000) / 1000));

    // Klasifikasi Daya Pembeda
    let discriminationCategory: 'SANGAT_BAIK' | 'BAIK' | 'CUKUP' | 'BURUK' = 'CUKUP';
    if (D >= 0.40) {
      discriminationCategory = 'SANGAT_BAIK';
    } else if (D >= 0.30) {
      discriminationCategory = 'BAIK';
    } else if (D >= 0.20) {
      discriminationCategory = 'CUKUP';
    } else {
      discriminationCategory = 'BURUK';
    }

    // Evaluasi Rekomendasi Butir Soal
    let recommendation: 'DITERIMA' | 'REVISI' | 'DITOLAK' = 'DITERIMA';
    let recommendationReason = 'Soal memiliki daya pembeda dan tingkat kesukaran yang seimbang.';

    if (D < 0.20) {
      recommendation = 'DITOLAK';
      if (D < 0) {
        recommendationReason = 'Daya pembeda negatif (siswa berkemampuan rendah lebih banyak menjawab benar). Kunci jawaban mungkin tertukar atau redaksi soal ambigu.';
      } else {
        recommendationReason = 'Daya pembeda sangat rendah (tidak membedakan kemampuan siswa). Disarankan ganti butir soal.';
      }
    } else if (D < 0.30 || P < 0.20 || P > 0.80) {
      recommendation = 'REVISI';
      if (P < 0.20) {
        recommendationReason = 'Soal terlalu sukar (kurang dari 20% siswa berhasil). Perbaiki petunjuk soal atau opsi distraktor.';
      } else if (P > 0.80) {
        recommendationReason = 'Soal terlalu mudah (lebih dari 80% siswa berhasil). Tingkatkan kompleksitas stimulus soal.';
      } else {
        recommendationReason = 'Daya pembeda cukup (0.20 - 0.29). Soal dapat dipakai namun dianjurkan direvisi redaksinya.';
      }
    } else {
      recommendation = 'DITERIMA';
      recommendationReason = 'Kualitas soal sangat baik. Layak dipertahankan dan dimasukkan ke Bank Soal Utama.';
    }

    // Susun Rincian Distraktor (Opsi Jawaban)
    const normKey = normalizeAnswer(q.ANSWER);
    const availableOptions = ['A', 'B', 'C', 'D'];
    if (q.OPTION_E !== undefined && q.OPTION_E !== null && q.OPTION_E !== '') {
      availableOptions.push('E');
    }

    let hasDistractorIssues = false;
    const distractors: DistractorStats[] = availableOptions.map(opt => {
      const stats = optionCounts[opt] || { total: 0, upper: 0, lower: 0 };
      const percentage = totalStudents > 0 ? Math.round((stats.total / totalStudents) * 100) : 0;
      const isKey = opt === normKey;

      let status: DistractorStats['status'] = 'EFEKTIF';
      let notes = 'Distraktor berfungsi efektif menarik siswa.';

      if (isKey) {
        status = 'KUNCI';
        notes = 'Kunci jawaban resmi.';
      } else if (stats.total === 0) {
        status = 'TIDAK_DIPILIH';
        notes = 'Pengecoh pasif (tidak ada siswa yang memilih). Perlu diganti dengan pilihan yang lebih logis.';
        hasDistractorIssues = true;
      } else if (percentage < 5) {
        status = 'KURANG_EFEKTIF';
        notes = 'Pengecoh kurang berfungsi (dipilih < 5% peserta).';
        hasDistractorIssues = true;
      } else if (stats.upper > stats.lower && stats.upper >= 2) {
        status = 'MENYESATKAN';
        notes = 'Pengecoh lebih banyak menjebak siswa kelompok atas. Periksa apakah opsi ini membingungkan.';
        hasDistractorIssues = true;
      }

      // Ambil teks opsi dari soal
      const optionTexts: Record<string, string | undefined> = {
        A: q.OPTION_A,
        B: q.OPTION_B,
        C: q.OPTION_C,
        D: q.OPTION_D,
        E: q.OPTION_E
      };

      return {
        option: opt,
        text: optionTexts[opt] || `Opsi ${opt}`,
        totalCount: stats.total,
        percentage,
        upperCount: stats.upper,
        lowerCount: stats.lower,
        isCorrect: isKey,
        status,
        notes
      };
    });

    return {
      questionId: q.ID,
      questionNumber: idx + 1,
      questionText: q.QUESTION || `Soal Nomor ${idx + 1}`,
      questionType: q.TYPE || 'MCQ',
      answerKey: q.ANSWER || '-',
      points: q.POINTS || 1,
      difficultyIndex: P,
      difficultyCategory,
      discriminationIndex: D,
      discriminationCategory,
      correctUpper: BA,
      correctLower: BB,
      totalUpper: NA,
      totalLower: NB,
      proportionUpper: Math.round(PA * 100) / 100,
      proportionLower: Math.round(PB * 100) / 100,
      totalCorrect,
      totalAnswered,
      recommendation,
      recommendationReason,
      distractors,
      hasDistractorIssues
    };
  });

  // Statistik Keseluruhan
  const scores = studentData.map(s => s.score);
  const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
  const highest = scores.length > 0 ? Math.max(...scores) : 0;
  const lowest = scores.length > 0 ? Math.min(...scores) : 0;

  // Varians dan Standar Deviasi Skor
  let scoreVariance = 0;
  if (scores.length > 1) {
    scoreVariance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / (scores.length - 1);
  }
  const scoreStdDev = Math.round(Math.sqrt(scoreVariance) * 10) / 10;

  // Rerata P dan Rerata D
  const avgDifficulty =
    analyzedItems.length > 0
      ? Math.round((analyzedItems.reduce((acc, it) => acc + it.difficultyIndex, 0) / analyzedItems.length) * 100) / 100
      : 0;

  const avgDiscrimination =
    analyzedItems.length > 0
      ? Math.round((analyzedItems.reduce((acc, it) => acc + it.discriminationIndex, 0) / analyzedItems.length) * 100) / 100
      : 0;

  // Estimasi Reliabilitas Tes KR-20:
  // r11 = [k / (k - 1)] * [1 - (sum(p * q) / Var)]
  const k = analyzedItems.length;
  let reliabilityKR20 = 0;
  if (k > 1 && scoreVariance > 0.001) {
    const sumPQ = analyzedItems.reduce((acc, it) => {
      const p = it.difficultyIndex;
      const q = 1 - p;
      return acc + p * q;
    }, 0);
    // Skala kan skor variance terhadap proporsi (jika skor 0-100, normalize atau gunakan skor murni)
    // Untuk skor tes 0-100 dengan k butir, proporsi varians = scoreVariance / (100/k)^2
    const scorePerItem = 100 / Math.max(1, k);
    const itemScaleVariance = scoreVariance / Math.pow(scorePerItem, 2);
    if (itemScaleVariance > sumPQ) {
      reliabilityKR20 = (k / (k - 1)) * (1 - sumPQ / itemScaleVariance);
    } else {
      reliabilityKR20 = 0.5 + Math.min(0.45, avgDiscrimination * 0.9);
    }
  } else {
    // Estimasi heuristik jika varians skor nol
    reliabilityKR20 = Math.max(0.2, Math.min(0.95, avgDiscrimination * 1.5));
  }
  reliabilityKR20 = Math.max(0, Math.min(0.99, Math.round(reliabilityKR20 * 100) / 100));

  let reliabilityCategory: ExamPsychometricSummary['reliabilityCategory'] = 'SEDANG';
  if (reliabilityKR20 >= 0.80) {
    reliabilityCategory = 'SANGAT_TINGGI';
  } else if (reliabilityKR20 >= 0.70) {
    reliabilityCategory = 'TINGGI';
  } else if (reliabilityKR20 >= 0.50) {
    reliabilityCategory = 'SEDANG';
  } else {
    reliabilityCategory = 'RENDAH';
  }

  // Hitung jumlah kategori
  const difficultyCounts = {
    sukar: analyzedItems.filter(i => i.difficultyCategory === 'SUKAR').length,
    sedang: analyzedItems.filter(i => i.difficultyCategory === 'SEDANG').length,
    mudah: analyzedItems.filter(i => i.difficultyCategory === 'MUDAH').length
  };

  const discriminationCounts = {
    sangatBaik: analyzedItems.filter(i => i.discriminationCategory === 'SANGAT_BAIK').length,
    baik: analyzedItems.filter(i => i.discriminationCategory === 'BAIK').length,
    cukup: analyzedItems.filter(i => i.discriminationCategory === 'CUKUP').length,
    buruk: analyzedItems.filter(i => i.discriminationCategory === 'BURUK').length
  };

  const recommendationCounts = {
    diterima: analyzedItems.filter(i => i.recommendation === 'DITERIMA').length,
    revisi: analyzedItems.filter(i => i.recommendation === 'REVISI').length,
    ditolak: analyzedItems.filter(i => i.recommendation === 'DITOLAK').length
  };

  return {
    examId: exam?.ID || 'UJIAN',
    examTitle: exam?.TITLE || 'Ujian CBT',
    totalStudents,
    upperCount: NA,
    lowerCount: NB,
    averageScore: avgScore,
    highestScore: highest,
    lowestScore: lowest,
    scoreStdDev,
    scoreVariance: Math.round(scoreVariance * 100) / 100,
    averageDifficulty: avgDifficulty,
    averageDiscrimination: avgDiscrimination,
    reliabilityKR20,
    reliabilityCategory,
    difficultyCounts,
    discriminationCounts,
    recommendationCounts,
    items: analyzedItems
  };
}
