import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { ExamSessionPreset } from '../types';
import {
  getSessionPresets,
  saveSessionPresets,
  resetSessionPresets
} from '../services/supabaseLmsStorage';

interface SessionPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPresetsUpdated?: (presets: ExamSessionPreset[]) => void;
}

export const SessionPresetsModal: React.FC<SessionPresetsModalProps> = ({
  isOpen,
  onClose,
  onPresetsUpdated
}) => {
  const [presets, setPresets] = useState<ExamSessionPreset[]>(() => getSessionPresets());
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formPreset, setFormPreset] = useState<ExamSessionPreset>({
    id: '',
    name: 'Sesi 1',
    startTime: '07:30',
    durationMin: 90,
    endTime: '09:00',
    description: 'Sesi Pagi Utama'
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (isOpen) {
      setPresets(getSessionPresets());
    }
  }, [isOpen]);

  // Compute end time dynamically
  const calculateEndTime = (start: string, duration: number): string => {
    if (!start) return '';
    const [h, m] = start.split(':').map(Number);
    const totalMin = (h || 0) * 60 + (m || 0) + (duration || 90);
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const handleStartTimeChange = (newStart: string) => {
    const computedEnd = calculateEndTime(newStart, formPreset.durationMin);
    setFormPreset(prev => ({
      ...prev,
      startTime: newStart,
      endTime: computedEnd
    }));
  };

  const handleDurationChange = (newDur: number) => {
    const computedEnd = calculateEndTime(formPreset.startTime, newDur);
    setFormPreset(prev => ({
      ...prev,
      durationMin: newDur,
      endTime: computedEnd
    }));
  };

  const handleOpenAdd = () => {
    const nextNum = presets.length + 1;
    const defaultStart = nextNum === 1 ? '07:30' : nextNum === 2 ? '09:30' : nextNum === 3 ? '11:30' : '13:30';
    setFormPreset({
      id: `SESI-${Date.now()}`,
      name: `Sesi ${nextNum}`,
      startTime: defaultStart,
      durationMin: 90,
      endTime: calculateEndTime(defaultStart, 90),
      description: ''
    });
    setEditingId(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (preset: ExamSessionPreset) => {
    setFormPreset({ ...preset });
    setEditingId(preset.id);
    setIsEditing(true);
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPreset.name.trim()) return;

    let updatedList: ExamSessionPreset[];
    if (editingId) {
      updatedList = presets.map(p => (p.id === editingId ? formPreset : p));
      showToast(`Sesi "${formPreset.name}" diperbarui.`);
    } else {
      updatedList = [...presets, formPreset];
      showToast(`Sesi "${formPreset.name}" berhasil ditambahkan.`);
    }

    setPresets(updatedList);
    saveSessionPresets(updatedList);
    if (onPresetsUpdated) onPresetsUpdated(updatedList);
    setIsEditing(false);
  };

  const handleDeletePreset = (id: string, name: string) => {
    if (presets.length <= 1) {
      alert('Minimal harus tersisa 1 sesi waktu ujian.');
      return;
    }
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    saveSessionPresets(updated);
    if (onPresetsUpdated) onPresetsUpdated(updated);
    showToast(`Sesi "${name}" dihapus.`);
  };

  const handleApplyTemplate = (templateType: 'STANDARD_4' | 'FRIDAY_2' | 'RAMADAN_3') => {
    let newPresets: ExamSessionPreset[] = [];

    if (templateType === 'STANDARD_4') {
      newPresets = [
        { id: 'SESI-1', name: 'Sesi 1', startTime: '07:30', durationMin: 90, endTime: '09:00', description: 'Sesi Pagi Awal' },
        { id: 'SESI-2', name: 'Sesi 2', startTime: '09:30', durationMin: 90, endTime: '11:00', description: 'Sesi Pagi Akhir' },
        { id: 'SESI-3', name: 'Sesi 3', startTime: '11:30', durationMin: 90, endTime: '13:00', description: 'Sesi Siang' },
        { id: 'SESI-4', name: 'Sesi 4', startTime: '13:30', durationMin: 90, endTime: '15:00', description: 'Sesi Sore' }
      ];
    } else if (templateType === 'FRIDAY_2') {
      newPresets = [
        { id: 'SESI-1', name: 'Sesi 1', startTime: '07:15', durationMin: 90, endTime: '08:45', description: 'Sesi Khusus Jumat 1' },
        { id: 'SESI-2', name: 'Sesi 2', startTime: '09:00', durationMin: 90, endTime: '10:30', description: 'Sesi Khusus Jumat 2 (Sebelum Sholat)' }
      ];
    } else if (templateType === 'RAMADAN_3') {
      newPresets = [
        { id: 'SESI-1', name: 'Sesi 1', startTime: '08:00', durationMin: 60, endTime: '09:00', description: 'Sesi Ramadan 1' },
        { id: 'SESI-2', name: 'Sesi 2', startTime: '09:30', durationMin: 60, endTime: '10:30', description: 'Sesi Ramadan 2' },
        { id: 'SESI-3', name: 'Sesi 3', startTime: '11:00', durationMin: 60, endTime: '12:00', description: 'Sesi Ramadan 3' }
      ];
    }

    setPresets(newPresets);
    saveSessionPresets(newPresets);
    if (onPresetsUpdated) onPresetsUpdated(newPresets);
    showToast('Template jadwal sesi berhasil diterapkan!');
  };

  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan konfigurasi sesi waktu ke standar bawaan madrasah?')) {
      const def = resetSessionPresets();
      setPresets(def);
      if (onPresetsUpdated) onPresetsUpdated(def);
      showToast('Konfigurasi sesi direset ke default.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Clock className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight">
                Pengaturan Sesi Waktu Ujian CBT
              </h3>
              <p className="text-xs text-blue-200">
                Atur durasi, jam mulai, dan jam selesai sesi untuk pilihan cepat penjadwalan.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {notification && (
          <div className="mx-5 mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick Templates Bar */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Pilihan Cepat Template Sesi:</span>
              </span>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Standar</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleApplyTemplate('STANDARD_4')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-700 transition-colors shadow-2xs"
              >
                📅 4 Sesi Standar (90m)
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('FRIDAY_2')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-700 transition-colors shadow-2xs"
              >
                🕌 Khusus Hari Jumat (2 Sesi)
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('RAMADAN_3')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:border-blue-500 text-slate-700 hover:text-blue-700 transition-colors shadow-2xs"
              >
                🌙 Bulan Ramadan (60m)
              </button>
            </div>
          </div>

          {/* Form Add / Edit Preset */}
          {isEditing && (
            <form onSubmit={handleSavePreset} className="p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  {editingId ? 'Edit Sesi Waktu' : 'Tambah Sesi Waktu Baru'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Sesi:</label>
                  <input
                    type="text"
                    required
                    value={formPreset.name}
                    onChange={e => setFormPreset(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Sesi 1"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jam Mulai:</label>
                  <input
                    type="time"
                    required
                    value={formPreset.startTime}
                    onChange={e => handleStartTimeChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Durasi (Menit):</label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    required
                    value={formPreset.durationMin}
                    onChange={e => handleDurationChange(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jam Selesai (Otomatis):</label>
                  <input
                    type="text"
                    readOnly
                    value={formPreset.endTime}
                    className="w-full px-3 py-1.5 text-xs bg-slate-100 font-mono font-bold text-blue-900 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Keterangan (Opsional):</label>
                  <input
                    type="text"
                    value={formPreset.description || ''}
                    onChange={e => setFormPreset(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Misal: Sesi Pagi / Sore"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-xs hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs"
                >
                  Simpan Sesi
                </button>
              </div>
            </form>
          )}

          {/* Preset Table / Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Daftar Sesi Terdaftar ({presets.length}):</span>
              {!isEditing && (
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-300" />
                  <span>Tambah Sesi</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              {presets.map((p, idx) => (
                <div key={p.id} className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-900 text-xs font-mono">
                      0{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-mono text-[11px] font-bold border border-blue-200">
                          {p.startTime} - {p.endTime}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({p.durationMin} menit)
                        </span>
                      </div>
                      {p.description && (
                        <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Edit Sesi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(p.id, p.name)}
                      className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Preset ini akan otomatis muncul sebagai opsi cepat saat membuat atau mengedit jadwal ujian.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
