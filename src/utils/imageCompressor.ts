/**
 * Utility untuk kompresi dan optimasi gambar logo madrasah
 * Menjaga ukuran string base64 tetap kecil (< 50KB) sehingga
 * aman disimpan di LocalStorage tanpa memicu QuotaExceededError
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function compressAndOptimizeLogo(
  file: File,
  options: CompressImageOptions = {}
): Promise<{ dataUrl: string; sizeKb: number; originalSizeKb: number }> {
  const {
    maxWidth = 360,
    maxHeight = 360,
    quality = 0.88
  } = options;

  const originalSizeKb = Math.round(file.size / 1024);

  // Jika berkas adalah SVG, baca langsung karena SVG berbasis vektor dan sudah efisien
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const sizeKb = Math.round((dataUrl.length * 0.75) / 1024);
        resolve({ dataUrl, sizeKb, originalSizeKb });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Untuk format raster (PNG, JPG, JPEG, WebP, GIF)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Hitung skala aspect ratio proporsional
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback ke dataUrl mentah jika canvas tidak didukung
          const rawUrl = e.target?.result as string;
          const sizeKb = Math.round((rawUrl.length * 0.75) / 1024);
          resolve({ dataUrl: rawUrl, sizeKb, originalSizeKb });
          return;
        }

        // Kualitas rendering tinggi
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Bersihkan canvas agar transparan jika PNG
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Jika PNG, pertahankan transparansi
        const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
        const outputFormat = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputFormat, quality);
        const sizeKb = Math.round((dataUrl.length * 0.75) / 1024);

        resolve({
          dataUrl,
          sizeKb,
          originalSizeKb
        });
      };

      img.onerror = () => {
        reject(new Error('Gagal membaca data gambar yang diunggah.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar.'));
    };

    reader.readAsDataURL(file);
  });
}
