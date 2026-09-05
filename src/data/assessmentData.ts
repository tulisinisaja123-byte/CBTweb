import { AssessmentType, CurriculumType, AssessmentCategory } from '../types';

export const ASSESSMENT_CATEGORIES: { id: AssessmentCategory; label: string; desc: string }[] = [
  { id: 'DIAGNOSTIK', label: 'Asesmen Diagnostik / Awal', desc: 'Pemetaan kemampuan dan kesiapan belajar awal siswa di awal semester/materi.' },
  { id: 'FORMATIF', label: 'Asesmen Formatif / Harian', desc: 'Pemantauan perkembangan belajar berkala selama proses pembelajaran berlangsung.' },
  { id: 'SUMATIF', label: 'Asesmen Sumatif (STS / SAS / PAS)', desc: 'Penilaian capaian hasil belajar pada pertengahan atau akhir periode semester.' },
  { id: 'UJIAN_SEKOLAH', label: 'Ujian Akhir Jenjang / Sekolah', desc: 'Penilaian kelulusan peserta didik pada akhir masa jenjang pendidikan.' },
  { id: 'SIMULASI', label: 'Try Out / Simulasi CBT', desc: 'Latihan dan uji coba kesiapan teknis serta pengayaan butir soal ujian.' }
];

export const OFFICIAL_ASSESSMENT_PRESETS_MERDEKA: AssessmentType[] = [
  {
    ID: 'SH',
    CODE: 'SH',
    NAME: 'Sumatif Harian (SH)',
    DESCRIPTION: 'Penilaian sumatif rutin berkala setelah satu atau beberapa Tujuan Pembelajaran (TP) / Modul Ajar selesai (Ulangan Harian).',
    CURRICULUM: 'MERDEKA',
    CATEGORY: 'SUMATIF',
    FREQUENCY: 'Rutin / Berkala per Bab',
    WEIGHT: 25,
    COLOR: 'emerald',
    ACTIVE: true
  },
  {
    ID: 'SAP',
    CODE: 'SAP',
    NAME: 'Sumatif Awal Semester (Awal)',
    DESCRIPTION: 'Asesmen diagnostik untuk memetakan kesiapan, kompetensi, dan capaian awal peserta didik di awal tahun/semester.',
    CURRICULUM: 'MERDEKA',
    CATEGORY: 'DIAGNOSTIK',
    FREQUENCY: 'Awal Semester',
    WEIGHT: 10,
    COLOR: 'indigo',
    ACTIVE: true
  },
  {
    ID: 'STS',
    CODE: 'STS',
    NAME: 'Sumatif Tengah Semester (STS)',
    DESCRIPTION: 'Penilaian sumatif terpadu pada pertengahan semester ganjil/genap untuk merefleksikan capaian beberapa lingkup materi.',
    CURRICULUM: 'MERDEKA',
    CATEGORY: 'SUMATIF',
    FREQUENCY: 'Tengah Semester',
    WEIGHT: 25,
    COLOR: 'blue',
    ACTIVE: true
  },
  {
    ID: 'SAS',
    CODE: 'SAS',
    NAME: 'Sumatif Akhir Semester (SAS)',
    DESCRIPTION: 'Penilaian sumatif komprehensif pada akhir semester ganjil atau akhir tahun ajaran (Kenaikan Kelas).',
    CURRICULUM: 'MERDEKA',
    CATEGORY: 'SUMATIF',
    FREQUENCY: 'Akhir Semester',
    WEIGHT: 30,
    COLOR: 'purple',
    ACTIVE: true
  },
  {
    ID: 'SAJ',
    CODE: 'SAJ',
    NAME: 'Sumatif Akhir Jenjang (SAJ / Kelulusan)',
    DESCRIPTION: 'Asesmen sumatif akhir bagi peserta didik tingkat akhir (Kelas 9/12) sebagai salah satu syarat penentuan kelulusan sekolah.',
    CURRICULUM: 'MERDEKA',
    CATEGORY: 'UJIAN_SEKOLAH',
    FREQUENCY: 'Akhir Jenjang',
    WEIGHT: 10,
    COLOR: 'rose',
    ACTIVE: true
  },
  {
    ID: 'ABM',
    CODE: 'ABM',
    NAME: 'Asesmen Bakat Minat (ABM)',
    DESCRIPTION: 'Asesmen diagnostik pengayaan untuk memetakan minat peminatan, potensi, dan eksplorasi bakat siswa.',
    CURRICULUM: 'MERDEKA',
    CATEGORY: 'DIAGNOSTIK',
    FREQUENCY: 'Awal / Peminatan',
    WEIGHT: 0,
    COLOR: 'amber',
    ACTIVE: true
  },
  {
    ID: 'TO',
    CODE: 'TO',
    NAME: 'Try Out & Simulasi Ujian CBT',
    DESCRIPTION: 'Simulasi latihan CBT terpadu untuk membiasakan siswa dengan pola pengerjaan, batas waktu, dan antarmuka sistem ujian.',
    CURRICULUM: 'ALL',
    CATEGORY: 'SIMULASI',
    FREQUENCY: 'Simulasi / Uji Coba',
    WEIGHT: 0,
    COLOR: 'cyan',
    ACTIVE: true
  }
];

export const OFFICIAL_ASSESSMENT_PRESETS_K13: AssessmentType[] = [
  {
    ID: 'PH',
    CODE: 'PH',
    NAME: 'Penilaian Harian (PH / Ulangan Harian)',
    DESCRIPTION: 'Penilaian berkala Kompetensi Dasar (KD) setelah menyelesaikan satu atau beberapa sub-pokok bahasan materi.',
    CURRICULUM: 'K13',
    CATEGORY: 'FORMATIF',
    FREQUENCY: 'Rutin / Berkala per KD',
    WEIGHT: 30,
    COLOR: 'emerald',
    ACTIVE: true
  },
  {
    ID: 'PTS',
    CODE: 'PTS',
    NAME: 'Penilaian Tengah Semester (PTS / UTS)',
    DESCRIPTION: 'Evaluasi capaian Kompetensi Dasar siswa yang dilaksanakan pada pekan ke-8 atau ke-9 kalender pendidikan semester.',
    CURRICULUM: 'K13',
    CATEGORY: 'SUMATIF',
    FREQUENCY: 'Tengah Semester',
    WEIGHT: 25,
    COLOR: 'blue',
    ACTIVE: true
  },
  {
    ID: 'PAS',
    CODE: 'PAS',
    NAME: 'Penilaian Akhir Semester (PAS / PAT)',
    DESCRIPTION: 'Penilaian akhir semester 1 (PAS) atau Penilaian Akhir Tahun (PAT) semester 2 penentu kriteria kenaikan kelas.',
    CURRICULUM: 'K13',
    CATEGORY: 'SUMATIF',
    FREQUENCY: 'Akhir Semester',
    WEIGHT: 35,
    COLOR: 'purple',
    ACTIVE: true
  },
  {
    ID: 'US',
    CODE: 'US',
    NAME: 'Ujian Sekolah (US / USBN)',
    DESCRIPTION: 'Ujian komprehensif tingkat satuan pendidikan sebagai syarat evaluasi kelulusan siswa tingkat akhir.',
    CURRICULUM: 'K13',
    CATEGORY: 'UJIAN_SEKOLAH',
    FREQUENCY: 'Akhir Jenjang',
    WEIGHT: 10,
    COLOR: 'rose',
    ACTIVE: true
  },
  {
    ID: 'TO',
    CODE: 'TO',
    NAME: 'Try Out & Simulasi Ujian CBT',
    DESCRIPTION: 'Simulasi latihan CBT terpadu untuk penguatan pemahaman butir soal ujian dan persiapan mental peserta didik.',
    CURRICULUM: 'ALL',
    CATEGORY: 'SIMULASI',
    FREQUENCY: 'Simulasi / Uji Coba',
    WEIGHT: 0,
    COLOR: 'cyan',
    ACTIVE: true
  }
];

export function getDefaultAssessmentTypes(curriculum: CurriculumType = 'MERDEKA'): AssessmentType[] {
  return curriculum === 'K13'
    ? [...OFFICIAL_ASSESSMENT_PRESETS_K13]
    : [...OFFICIAL_ASSESSMENT_PRESETS_MERDEKA];
}

export const INITIAL_ASSESSMENT_TYPES: AssessmentType[] = [
  ...OFFICIAL_ASSESSMENT_PRESETS_MERDEKA
];

export function getAssessmentBadgeStyle(codeOrCategory?: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const code = (codeOrCategory || '').toUpperCase();

  if (code.includes('SAS') || code.includes('PAS') || code === 'PURPLE') {
    return {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: 'bg-purple-500'
    };
  }
  if (code.includes('STS') || code.includes('PTS') || code === 'BLUE') {
    return {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500'
    };
  }
  if (code.includes('SH') || code.includes('SLM') || code.includes('PH') || code.includes('HARIAN') || code === 'EMERALD') {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500'
    };
  }
  if (code.includes('SAP') || code.includes('DIAG') || code.includes('AWAL') || code === 'INDIGO') {
    return {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      dot: 'bg-indigo-500'
    };
  }
  if (code.includes('SAJ') || code.includes('US') || code.includes('JENJANG') || code === 'ROSE') {
    return {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500'
    };
  }
  if (code.includes('ABM') || code.includes('BAKAT') || code === 'AMBER') {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500'
    };
  }
  if (code.includes('TO') || code.includes('SIMULASI') || code === 'CYAN') {
    return {
      bg: 'bg-cyan-50',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
      dot: 'bg-cyan-500'
    };
  }

  return {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-500'
  };
}

export function getAssessmentShortLabel(type?: AssessmentType | string): string {
  if (!type) return 'Soal';
  const code = typeof type === 'string' ? type.toUpperCase() : (type.CODE || type.ID || '').toUpperCase();
  if (code.includes('SH') || code.includes('SLM') || code.includes('PH') || code.includes('HARIAN')) return 'SH';
  if (code.includes('SAS') || code.includes('PAS')) return 'SAS';
  if (code.includes('STS') || code.includes('PTS')) return 'STS';
  if (code.includes('SAP') || code.includes('AWAL') || code.includes('DIAG')) return 'Awal';
  if (code.includes('SAJ') || code.includes('US') || code.includes('JENJANG')) return 'SAJ';
  if (code.includes('ABM')) return 'ABM';
  if (code.includes('TO')) return 'TO';
  return code.slice(0, 5);
}

export function getAssessmentFrequency(type?: AssessmentType | string, allTypes?: AssessmentType[]): string {
  if (!type) return 'Fleksibel';
  if (typeof type !== 'string' && type.FREQUENCY) return type.FREQUENCY;
  const targetId = typeof type === 'string' ? type.toUpperCase() : (type.ID || type.CODE || '').toUpperCase();
  const matched = allTypes?.find(t => t.ID.toUpperCase() === targetId || t.CODE.toUpperCase() === targetId);
  if (matched?.FREQUENCY) return matched.FREQUENCY;

  if (targetId.includes('SH') || targetId.includes('SLM') || targetId.includes('PH') || targetId.includes('HARIAN')) {
    return 'Rutin / Berkala per Bab';
  }
  if (targetId.includes('STS') || targetId.includes('PTS')) {
    return 'Tengah Semester';
  }
  if (targetId.includes('SAS') || targetId.includes('PAS')) {
    return 'Akhir Semester';
  }
  if (targetId.includes('SAP') || targetId.includes('AWAL') || targetId.includes('DIAG')) {
    return 'Awal Semester';
  }
  if (targetId.includes('SAJ') || targetId.includes('US')) {
    return 'Akhir Jenjang';
  }
  if (targetId.includes('TO')) {
    return 'Simulasi / Uji Coba';
  }
  return 'Fleksibel';
}
