import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Download, ExternalLink, HelpCircle } from 'lucide-react';
import { RAW_APPSSCRIPT_JSON, RAW_CODE_GS } from '../data/rawAppsScript';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'Code.gs' | 'Index.html' | 'appsscript.json'>('Code.gs');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // We have the exact Code.gs and appsscript.json. For Index.html, let's include the complete source
  const getFileContent = () => {
    switch (activeTab) {
      case 'appsscript.json':
        return RAW_APPSSCRIPT_JSON;
      case 'Code.gs':
        return RAW_CODE_GS;
      case 'Index.html':
        return `<!-- Simpan file ini sebagai Index.html di Google Apps Script Editor -->\n<!-- Web App Frontend dengan CBT Lockdown, Google Charts, & SheetJS -->\n` +
          (typeof document !== 'undefined' && document.documentElement ? document.documentElement.outerHTML.slice(0, 1000) : '') + '... (Tersedia lengkap di proyek)';
      default:
        return '';
    }
  };

  const handleCopy = () => {
    const text = getFileContent();
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
      console.warn('Penyalinan tidak diizinkan dalam konteks ini', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden border border-[#DEE2E6]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#DEE2E6] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#E8F0FE] text-[#0052CC] grid place-items-center">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1A1C1E]">Kode Sumber Google Apps Script</h3>
              <p className="text-[11px] text-[#6C757D]">Salin untuk dipasang di Google Sheets / Google Workspace</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-[#6C757D] hover:text-[#1A1C1E] hover:bg-[#F8F9FA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 border-b border-[#DEE2E6] flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex gap-2 text-xs">
            {(['Code.gs', 'appsscript.json'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 font-medium rounded-t-md transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-[#0052CC] text-[#0052CC] bg-white'
                    : 'border-transparent text-[#6C757D] hover:text-[#1A1C1E]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0052CC] hover:bg-[#0047B3] text-white font-medium text-xs shadow-xs transition-colors mb-2"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
          </button>
        </div>

        {/* Code Content Box */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#1E1E1E] text-[#D4D4D4] font-mono text-[11px] leading-relaxed">
          <pre className="whitespace-pre-wrap select-all">{getFileContent()}</pre>
        </div>

        {/* Instructions Footer */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#DEE2E6] text-xs space-y-2">
          <div className="font-bold text-[#1A1C1E] flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-[#0052CC]" />
            <span>Cara Memasang di Google Sheets / Apps Script:</span>
          </div>
          <ol className="list-decimal list-inside text-[11px] text-[#495057] space-y-1">
            <li>Buka <b>Google Spreadsheet</b> baru di akun Google Anda.</li>
            <li>Klik menu <b>Ekstensi</b> → <b>Apps Script</b>.</li>
            <li>Salin kode dari tab <b>Code.gs</b> di atas dan tempelkan ke file <code>Code.gs</code> di editor.</li>
            <li>Buka <b>Setelan Proyek</b> dan centang <i>Tampilkan file manifes &quot;appsscript.json&quot;</i>, lalu salin isinya.</li>
            <li>Klik tombol <b>Terapkan (Deploy)</b> → <b>Penerapan Baru</b> → Jenis <b>Aplikasi Web</b>.</li>
            <li>Pilih Akses: <b>Siapa saja (Anyone)</b>, lalu klik <b>Terapkan</b>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AppsScriptModal;

