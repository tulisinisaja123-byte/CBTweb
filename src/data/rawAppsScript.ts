export const RAW_APPSSCRIPT_JSON = `{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  }
}`;

export const RAW_CODE_GS = `/**
 * CBT MAS MUHAMMADIYAH CIKARAMAS - Google Apps Script Backend
 * Versi: 1.0.2
 *
 * Database akan dibuat otomatis pada login pertama.
 * Fungsi manual tetap tersedia:
 *   - setupLMS()      : membuat/memperbaiki database + data demo (1 sampel)
 *   - setupBlankLMS() : membuat/memperbaiki database kosong + akun admin
 *   - initializeLMS() : tombol perbaikan aman dari halaman login
 */

const APP = Object.freeze({
  NAME: 'CBT MAS MUHAMMADIYAH CIKARAMAS',
  VERSION: '1.0.2',
  SESSION_HOURS: 6,
  DEFAULT_MAX_VIOLATIONS: 3,
  SHEETS: {
    USERS: 'USERS',
    CLASSES: 'CLASSES',
    SUBJECTS: 'SUBJECTS',
    EXAMS: 'EXAMS',
    QUESTIONS: 'QUESTIONS',
    ATTEMPTS: 'ATTEMPTS',
    SESSIONS: 'SESSIONS',
    SETTINGS: 'SETTINGS',
    ACTIVITY: 'ACTIVITY'
  },
  HEADERS: {
    USERS: ['ID','USERNAME','NAME','EMAIL','PASSWORD_HASH','ROLE','CLASS_ID','ACTIVE','CREATED_AT'],
    CLASSES: ['ID','NAME','LEVEL','HOMEROOM','ACTIVE'],
    SUBJECTS: ['ID','CODE','NAME','TEACHER_ID','ACTIVE'],
    EXAMS: ['ID','TITLE','SUBJECT_ID','CLASS_ID','EXAM_DATE','START_TIME','DURATION_MIN','STATUS','RANDOMIZE','MAX_VIOLATIONS','CREATED_BY','CREATED_AT'],
    QUESTIONS: ['ID','EXAM_ID','TYPE','QUESTION','OPTION_A','OPTION_B','OPTION_C','OPTION_D','ANSWER','POINTS'],
    ATTEMPTS: ['ID','EXAM_ID','USER_ID','STARTED_AT','SUBMITTED_AT','SCORE','MAX_SCORE','STATUS','VIOLATIONS','PROGRESS','ANSWERS_JSON','ESSAY_SCORES_JSON','LAST_ACTIVITY'],
    SESSIONS: ['TOKEN','USER_ID','EXPIRES_AT','CREATED_AT'],
    SETTINGS: ['KEY','VALUE'],
    ACTIVITY: ['ID','USER_ID','ACTION','DETAIL','CREATED_AT']
  }
});

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP.NAME)
    .setFaviconUrl('https://www.gstatic.com/images/branding/product/1x/forms_2020q4_48dp.png')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('CBT MAS MUHAMMADIYAH CIKARAMAS')
    .addItem('Setup dengan data pabrik (1 sampel)', 'setupLMS')
    .addItem('Setup database kosong', 'setupBlankLMS')
    .addSeparator()
    .addItem('Buka database CBT', 'openDatabase')
    .addToUi();
}

function openDatabase() {
  const ss = getDatabase_();
  SpreadsheetApp.getUi().alert('Database CBT MAS MUHAMMADIYAH CIKARAMAS: ' + ss.getUrl());
}

function setupLMS() {
  return setupDatabase_(true);
}

function setupBlankLMS() {
  return setupDatabase_(false);
}

function initializeLMS() {
  const ss = getOrCreateDatabase_();
  const isReady = Object.keys(APP.SHEETS).every(function(key) {
    return Boolean(ss.getSheetByName(APP.SHEETS[key]));
  }) && ss.getSheetByName(APP.SHEETS.USERS).getLastRow() >= 2;

  if (isReady) {
    return {
      success: true,
      message: 'Database LMS sudah siap. Silakan login.',
      spreadsheetUrl: ss.getUrl()
    };
  }

  return setupDatabase_(true);
}

function setupDatabase_(includeDemo) {
  const ss = getOrCreateDatabase_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    Object.keys(APP.SHEETS).forEach(function(key) {
      createOrResetHeader_(ss, APP.SHEETS[key], APP.HEADERS[key]);
    });

    setDefaultSetting_('SCHOOL_NAME', 'MAS MUHAMMADIYAH CIKARAMAS');
    setDefaultSetting_('SCHOOL_ADDRESS', 'Jl. Cikaramas No. 1, Cikaramas, Kec. Tanjungmedar');
    setDefaultSetting_('SCHOOL_CITY', 'Sumedang');
    setDefaultSetting_('SCHOOL_PHONE', '(0261) 0000000');
    setDefaultSetting_('PRINCIPAL_NAME', 'Ai Sukaesih, S.Pd');
    setDefaultSetting_('SCHOOL_YEAR', '2026/2027');
    setDefaultSetting_('SEMESTER', 'Ganjil');
    setDefaultSetting_('PASSWORD_SALT', Utilities.getUuid());
    setSetting_('APP_VERSION', APP.VERSION);

    seedAdmin_();
    if (includeDemo) seedDemoData_();
    styleDatabase_(ss);
    cleanupExpiredSessions_();

    return {
      success: true,
      message: includeDemo
        ? 'CBT MAS MUHAMMADIYAH CIKARAMAS berhasil dibuat dengan data pabrik.'
        : 'CBT MAS MUHAMMADIYAH CIKARAMAS berhasil dibuat dengan database kosong.',
      spreadsheetUrl: ss.getUrl(),
      login: {
        admin: 'admin / Admin123!',
        teacher: includeDemo ? 'guru01 / Guru123!' : '-',
        student: includeDemo ? 'siswa01 / Siswa123!' : '-'
      }
    };
  } finally {
    lock.releaseLock();
  }
}
`;

export const RAW_INDEX_HTML_DOC = `<!-- File Index.html untuk Google Apps Script Web App -->
<!-- Menyediakan antarmuka lengkap dengan Google Charts, XLSX SheetJS, dan Lockdown Mode -->`;
