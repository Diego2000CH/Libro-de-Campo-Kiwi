/**
 * Comprime una imagen subida desde cámara/galería a un Data URL JPEG liviano
 * (máx. 600px de ancho, calidad 0.52) para mantener sincronización rápida y
 * respetar el límite de tamaño de documentos en Firestore.
 */
export async function compressImageToDataUrl(
  file: File,
  maxWidth = 600,
  quality = 0.52
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el lienzo de compresión.'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);

        let result = canvas.toDataURL('image/jpeg', quality);
        if (result.length > 70000) {
          result = canvas.toDataURL('image/jpeg', 0.38);
        }
        resolve(result);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
