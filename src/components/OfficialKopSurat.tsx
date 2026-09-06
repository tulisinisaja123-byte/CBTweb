import React from 'react';
import { SchoolSettings } from '../types';
import { MaCikaramasLogoSvg, MuhammadiyahLogoSvg } from './OfficialLogos';

interface OfficialKopSuratProps {
  settings?: SchoolSettings;
  className?: string;
  idSuffix?: string;
  compact?: boolean;
  showLogo?: boolean;
  balanceMargin?: boolean;
}

export const OfficialKopSurat: React.FC<OfficialKopSuratProps> = ({
  settings,
  className = '',
  idSuffix = 'kop',
  compact = false,
  showLogo = true,
  balanceMargin = true
}) => {
  const header1 = settings?.KOP_HEADER_1 || 'MAJELIS PENDIDIKAN DASAR DAN MENENGAH';
  const header2 = settings?.KOP_HEADER_2 || 'PIMPINAN DAERAH MUHAMMADIYAH SUMEDANG';
  const schoolName = settings?.SCHOOL_NAME || 'MA. MUHAMMADIYAH CIKARAMAS';
  const nsm = settings?.KOP_NSM || '131.232.110.020';
  const npsn = settings?.KOP_NPSN || '69976352';
  const akreditasi = settings?.KOP_AKREDITASI || 'Terakreditasi : B (Baik) SKBAN-SM Nomor : 763/BAN-SM/SK/2025';
  const alamat = settings?.KOP_ALAMAT || settings?.SCHOOL_ADDRESS || 'Jl. Cikaramas-Tanjungmedar KM 01 Kecamatan Tanjungmedar';
  const kotaKodePos = settings?.KOP_KOTA_KODEPOS || 'Kabupaten Sumedang Kode Pos. 45354';
  const telepon = settings?.KOP_TELEPON || settings?.SCHOOL_PHONE || '085221402402';
  const email = settings?.KOP_EMAIL || settings?.SCHOOL_EMAIL || 'aliyah.cikaramas@gmail.com';
  const logoUrl = settings?.LOGO_URL;

  const hasLogo = showLogo && Boolean(logoUrl);

  const renderLogo = () => {
    if (!hasLogo) return null;
    if (logoUrl === '/logo-ma-cikaramas.svg') {
      return (
        <MaCikaramasLogoSvg
          size={compact ? 58 : 78}
          className={compact ? 'w-14 h-14' : 'w-20 h-20'}
          idSuffix={idSuffix}
        />
      );
    }
    if (logoUrl === 'MUHAMMADIYAH_STANDARD') {
      return (
        <MuhammadiyahLogoSvg
          size={compact ? 58 : 78}
          className={compact ? 'w-14 h-14' : 'w-20 h-20'}
        />
      );
    }
    return (
      <img
        src={logoUrl}
        alt="Logo Lembaga"
        className={`official-kop-logo ${compact ? 'max-h-14 max-w-14' : 'max-h-20 max-w-20'} object-contain`}
        style={{
          maxHeight: compact ? '54px' : '72px',
          maxWidth: compact ? '54px' : '72px',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          display: 'block'
        }}
        referrerPolicy="no-referrer"
      />
    );
  };

  return (
    <div className={`w-full text-black font-sans ${className}`} style={{ width: '100%' }}>
      <div
        className="flex items-center justify-between gap-3"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '12px'
        }}
      >
        {/* Logo Kiri (Lembaga / Sekolah) */}
        {hasLogo && (
          <div
            className={`${compact ? 'w-16 h-16' : 'w-22 h-22'} shrink-0 flex items-center justify-center`}
            style={{
              width: compact ? '56px' : '76px',
              height: compact ? '56px' : '76px',
              minWidth: compact ? '56px' : '76px',
              maxWidth: compact ? '56px' : '76px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {renderLogo()}
          </div>
        )}

        {/* Teks Identitas Kop Surat */}
        <div
          className="flex-1 text-center leading-tight py-0.5"
          style={{ flex: '1 1 auto', minWidth: 0, textAlign: 'center' }}
        >
          {header1 && (
            <div className={`${compact ? 'text-[10px]' : 'text-[12px] sm:text-[13.5px]'} font-bold uppercase tracking-wide text-black`}>
              {header1}
            </div>
          )}
          {header2 && (
            <div className={`${compact ? 'text-[10px]' : 'text-[12px] sm:text-[13.5px]'} font-bold uppercase tracking-wide text-black`}>
              {header2}
            </div>
          )}
          {schoolName && (
            <div className={`${compact ? 'text-[12px]' : 'text-[15px] sm:text-[17px]'} font-extrabold uppercase tracking-wider text-black mt-0.5`}>
              {schoolName}
            </div>
          )}
          {(nsm || npsn) && (
            <div className={`${compact ? 'text-[9.5px]' : 'text-[11.5px] sm:text-[12.5px]'} font-bold text-black mt-0.5`}>
              {nsm ? `NSM : ${nsm}` : ''}{nsm && npsn ? ' ' : ''}{npsn ? `NPSN : ${npsn}` : ''}
            </div>
          )}
          {akreditasi && (
            <div className={`${compact ? 'text-[9px]' : 'text-[10.5px] sm:text-[11.5px]'} text-black`}>
              {akreditasi}
            </div>
          )}
          {alamat && (
            <div className={`${compact ? 'text-[8.5px]' : 'text-[10px] sm:text-[11px]'} text-black`}>
              Alamat : {alamat}
            </div>
          )}
          <div className={`${compact ? 'text-[8.5px]' : 'text-[10px] sm:text-[11px]'} text-black`}>
            {kotaKodePos} ☎, {telepon}
          </div>
          {email && (
            <div className={`${compact ? 'text-[8.5px]' : 'text-[10px] sm:text-[11px]'} text-black`}>
              Email : <span className="text-blue-800 underline">{email}</span>
            </div>
          )}
        </div>

        {/* Sisi Kanan: Logo Kemenag TELAH DIHAPUS sesuai permintaan ("logo ini yang dikanan hapus") */}
        {/* Kolom penyeimbang agar teks kop surat tetap presisi simetris di tengah halaman cetak */}
        {hasLogo && balanceMargin && (
          <div
            className={`${compact ? 'w-16' : 'w-22'} shrink-0 hidden sm:block`}
            style={{
              width: compact ? '56px' : '76px',
              minWidth: compact ? '56px' : '76px',
              maxWidth: compact ? '56px' : '76px',
              flexShrink: 0
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Garis Ganda Standar Kop Surat Resmi (Tebal ganda) */}
      <div className="mt-2 border-b-[3px] border-double border-black" />
    </div>
  );
};
