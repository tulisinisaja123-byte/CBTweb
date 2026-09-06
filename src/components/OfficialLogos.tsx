import React from 'react';

/**
 * Logo Resmi Madrasah Aliyah Muhammadiyah Cikaramas
 * Sesuai lambang resmi: Kubah perisai hijau bergaris ganda,
 * Matahari 12 sinar Muhammadiyah, Al-Qur'an / Rekal terbuka,
 * teks lokasi Tanjungmedar - Sumedang, serta pita hitam bermotto "IMAN, ILMU, IHSAN".
 */
export const MaCikaramasLogoSvg: React.FC<{
  className?: string;
  size?: number;
  idSuffix?: string;
  style?: React.CSSProperties;
}> = ({
  className = 'w-16 h-16',
  size = 64,
  idSuffix = 'default',
  style
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        flexShrink: 0,
        display: 'block',
        ...style
      }}
    />
  );
  // Unused legacy vector paths below ignored
  const shieldGradId = `shieldGrad_${idSuffix}`;
  const sunGradId = `sunGrad_${idSuffix}`;
  const ribbonGradId = `ribbonGrad_${idSuffix}`;
  const textPathTopId = `textPathTop_${idSuffix}`;
  const ribbonTextPathId = `ribbonTextPath_${idSuffix}`;

  return (
    <svg
      viewBox="0 0 200 235"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        flexShrink: 0,
        display: 'block',
        ...style
      }}
    >
      <defs>
        <linearGradient id={shieldGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#55e828" />
          <stop offset="45%" stopColor="#46dc1c" />
          <stop offset="85%" stopColor="#36be12" />
          <stop offset="100%" stopColor="#249608" />
        </linearGradient>

        <radialGradient id={sunGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b6fa3b" />
          <stop offset="60%" stopColor="#60da18" />
          <stop offset="100%" stopColor="#33a808" />
        </radialGradient>

        <linearGradient id={ribbonGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a382c" />
          <stop offset="35%" stopColor="#141c15" />
          <stop offset="70%" stopColor="#0a0f0b" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>

        <path id={textPathTopId} d="M 32,108 C 28,44 65,25 100,25 C 135,25 172,44 168,108" fill="none" />
        <path id={ribbonTextPathId} d="M 30,206 Q 100,222 170,206" fill="none" />
      </defs>

      {/* SHIELD / PERISAI UTAMA */}
      <g>
        {/* Outline Hitam Luar Tebal */}
        <path
          d="M 100,8 C 114,14 128,24 138,34 C 142,36 144,36 147,35 C 165,34 182,50 182,72 C 182,84 174,96 170,105 C 182,122 186,150 172,178 C 152,206 122,220 100,226 C 78,220 48,206 28,178 C 14,150 18,122 30,105 C 26,96 18,84 18,72 C 18,50 35,34 53,35 C 56,36 58,36 62,34 C 72,24 86,14 100,8 Z"
          fill={`url(#${shieldGradId})`}
          stroke="#000000"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />

        {/* Garis Border Ganda Bagian Dalam */}
        <path
          d="M 100,13 C 112,19 125,28 135,37 C 140,39 143,39 146,38 C 162,38 177,52 177,72 C 177,83 170,94 166,103 C 177,119 181,146 168,173 C 149,199 121,213 100,219 C 79,213 51,199 32,173 C 19,146 23,119 34,103 C 30,94 23,83 23,72 C 23,52 38,38 54,38 C 57,39 60,39 65,37 C 75,28 88,19 100,13 Z"
          fill="none"
          stroke="#000000"
          strokeWidth="1.8"
          strokeLinejoin="round"
          opacity="0.9"
        />
      </g>

      {/* TEKS LENGKUNG ATAS: MA. MUHAMMADIYAH CIKARAMAS */}
      <text fontFamily="'Arial Black', Arial, Helvetica, sans-serif" fontSize="11" fontWeight="900" fill="#000000" letterSpacing="0.4">
        <textPath href={`#${textPathTopId}`} startOffset="50%" textAnchor="middle">
          MA. MUHAMMADIYAH CIKARAMAS
        </textPath>
      </text>

      {/* EMBLEM PUSAT: MATAHARI 12 SINAR MUHAMMADIYAH */}
      <g transform="translate(100, 93)">
        {/* Pancaran Sinar Halo */}
        <path
          d="M0,-36 L3,-22 L-3,-22 Z M0,36 L3,22 L-3,22 Z M-36,0 L-22,3 L-22,-3 Z M36,0 L22,3 L22,-3 Z
             M-25,-25 L-14,-17 L-17,-14 Z M25,25 L14,17 L17,14 Z M-25,25 L-17,14 L-14,17 Z M25,-25 L17,-14 L14,-17 Z"
          fill="#6ee827"
          stroke="#1a5a0c"
          strokeWidth="0.7"
        />

        {/* 12 Sinar Utama */}
        <polygon points="0,-40 4.5,-20 -4.5,-20" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />
        <polygon points="20,-34.6 19.3,-15.1 11.5,-19.6" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />
        <polygon points="34.6,-20 23.6,-7.6 19.1,-15.4" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />
        <polygon points="40,0 20,4.5 20,-4.5" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />
        <polygon points="34.6,20 19.1,15.4 23.6,7.6" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />
        <polygon points="20,34.6 11.5,19.6 19.3,15.1" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />
        <polygon points="0,40 -4.5,20 4.5,20" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />
        <polygon points="-20,34.6 -19.3,15.1 -11.5,19.6" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />
        <polygon points="-34.6,20 -23.6,7.6 -19.1,15.4" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />
        <polygon points="-40,0 -20,-4.5 -20,4.5" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />
        <polygon points="-34.6,-20 -19.1,-15.4 -23.6,-7.6" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />
        <polygon points="-20,-34.6 -11.5,-19.6 -19.3,-15.1" fill={`url(#${sunGradId})`} stroke="#000000" strokeWidth="0.8" />

        {/* Piringan Tengah */}
        <circle cx="0" cy="0" r="19" fill="#064e28" stroke="#000000" strokeWidth="1.8" />
        <circle cx="0" cy="0" r="17.5" fill="none" stroke="#ffffff" strokeWidth="0.9" />
        <circle cx="0" cy="0" r="15" fill="#073a1e" />

        {/* Kaligrafi Tulisan Arab */}
        <path
          d="M-8,1 C-6,-5 -1,-8 2,-7 C6,-6 8,-2 7,2 C5,5 1,6 -3,6 C-6,6 -7,4 -8,1 Z
             M-3,-1 C-3,-3 -1,-4 1,-4 C3,-4 4,-2 3,0 C2,2 -1,2 -3,-1 Z
             M2,5 C3,7 5,9 7,9 C6,11 3,11 1,8 Z"
          fill="#ffffff"
        />
        <text
          x="0"
          y="4"
          fontFamily="'Traditional Arabic', 'Scheherazade', 'Amiri', serif"
          fontSize="12"
          fontWeight="bold"
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          محمدية
        </text>
      </g>

      {/* REKAL AL-QUR'AN TERBUKA */}
      <g transform="translate(100, 133)">
        <path
          d="M-22,-2 C-15,4 -8,6 0,2 C8,6 15,4 22,-2 L24,14 C15,19 7,21 0,16 C-7,21 -15,19 -24,14 Z"
          fill="#d4f74d"
          stroke="#1e6b0e"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M0,2 L0,16" stroke="#1e6b0e" strokeWidth="1.6" />
        <path d="M-18,9 C-10,13 -4,13 0,8 C4,13 10,13 18,9" fill="none" stroke="#145209" strokeWidth="1.2" />
        <polygon points="-12,17 -6,22 -2,16" fill="#145209" />
        <polygon points="12,17 6,22 2,16" fill="#145209" />
      </g>

      {/* TEKS LOKASI */}
      <text
        x="100"
        y="166"
        fontFamily="'Arial Black', Arial, Helvetica, sans-serif"
        fontSize="8.8"
        fontWeight="900"
        fill="#000000"
        textAnchor="middle"
        letterSpacing="0.4"
      >
        TANJUNGMEDAR - SUMEDANG
      </text>

      {/* PITA MOTTO: IMAN, ILMU, IHSAN */}
      <g>
        {/* Sayap Belakang Kiri */}
        <polygon
          points="24,196 6,201 16,212 5,223 26,219 32,204"
          fill="#0c130d"
          stroke="#000000"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <polygon points="32,204 22,208 34,213" fill="#000000" opacity="0.6" />

        {/* Sayap Belakang Kanan */}
        <polygon
          points="176,196 194,201 184,212 195,223 174,219 168,204"
          fill="#0c130d"
          stroke="#000000"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <polygon points="168,204 178,208 166,213" fill="#000000" opacity="0.6" />

        {/* Pita Depan */}
        <path
          d="M 28,197 Q 100,212 172,197 L 174,213 Q 100,229 26,213 Z"
          fill={`url(#${ribbonGradId})`}
          stroke="#000000"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M 31,200 Q 100,214 169,200" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.5" />
        <path d="M 29,210 Q 100,226 171,210" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.5" />

        <text fontFamily="'Arial Black', Arial, Helvetica, sans-serif" fontSize="10.2" fontWeight="900" fill="#ffffff" letterSpacing="1.2">
          <textPath href={`#${ribbonTextPathId}`} startOffset="50%" textAnchor="middle">
            IMAN, ILMU, IHSAN
          </textPath>
        </text>
      </g>
    </svg>
  );
};

export const SchoolLogoSvg = MaCikaramasLogoSvg;

export const MA_CIKARAMAS_LOGO_PATH = '/blank.svg';

/**
 * SVG Data URL untuk gambar kosong
 */
export const BLANK_LOGO_SVG_DATA_URL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' width='100' height='100'></svg>";

export const MA_CIKARAMAS_LOGO_DATA_URL = BLANK_LOGO_SVG_DATA_URL;

/**
 * Logo Resmi Muhammadiyah (Matahari Dua Belas Sinar dengan Kaligrafi Syahadatain)
 * Dibuat dalam vektor SVG tajam untuk cetak berkualitas tinggi.
 */
export const MuhammadiyahLogoSvg: React.FC<{
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({
  className = 'w-16 h-16',
  size = 64,
  style
}) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      maxWidth: `${size}px`,
      maxHeight: `${size}px`,
      flexShrink: 0,
      display: 'block',
      ...style
    }}
  >
    {/* Background Circle */}
    <circle cx="50" cy="50" r="48" fill="#056839" stroke="#000000" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="44" fill="#ffffff" stroke="#056839" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="39" fill="#056839" />
    
    {/* 12 Rays of the Sun */}
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => (
      <g key={angle} transform={`rotate(${angle} 50 50)`}>
        <polygon points="50,14 47,26 53,26" fill="#F4B400" stroke="#000000" strokeWidth="0.5" />
      </g>
    ))}

    {/* Center Sun Disc */}
    <circle cx="50" cy="50" r="23" fill="#ffffff" stroke="#056839" strokeWidth="1" />
    <circle cx="50" cy="50" r="20" fill="#056839" />

    {/* Stylized Arabic Arabic Script Representation */}
    <text
      x="50"
      y="54"
      fill="#ffffff"
      fontSize="13"
      fontWeight="900"
      fontFamily="serif"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      م
    </text>

    {/* Border Text Ring representation */}
    <circle cx="50" cy="50" r="43" fill="none" stroke="#F4B400" strokeWidth="0.8" strokeDasharray="1,1" />
  </svg>
);

/**
 * Logo Resmi Kementerian Agama RI (Ikhlas Beramal)
 */
export const KemenagLogoSvg: React.FC<{ className?: string; size?: number }> = ({
  className = 'w-16 h-16',
  size = 64
}) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer Pentagon Shield */}
    <polygon
      points="50,4 94,36 77,92 23,92 6,36"
      fill="#056839"
      stroke="#000000"
      strokeWidth="1.5"
    />
    <polygon
      points="50,8 90,38 74,88 26,88 10,38"
      fill="#ffffff"
      stroke="#056839"
      strokeWidth="1.5"
    />
    
    {/* Inner Shield */}
    <polygon
      points="50,14 84,40 71,83 29,83 16,40"
      fill="#056839"
    />

    {/* Golden Rays & Star */}
    <polygon
      points="50,22 53,30 61,30 55,35 57,43 50,38 43,43 45,35 39,30 47,30"
      fill="#F4B400"
      stroke="#ffffff"
      strokeWidth="0.5"
    />

    {/* Holy Book (Al-Qur'an) */}
    <path
      d="M32,58 Q50,50 68,58 L68,66 Q50,58 32,66 Z"
      fill="#ffffff"
      stroke="#F4B400"
      strokeWidth="1"
    />

    {/* Ikhlas Beramal banner */}
    <rect x="22" y="70" width="56" height="10" rx="3" fill="#F4B400" stroke="#000000" strokeWidth="0.5" />
    <text
      x="50"
      y="77.5"
      fill="#000000"
      fontSize="6"
      fontWeight="bold"
      fontFamily="sans-serif"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      IKHLAS BERAMAL
    </text>
  </svg>
);
