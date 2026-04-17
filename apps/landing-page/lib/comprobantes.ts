// Helpers para subir y visualizar comprobantes de pago desde el landing.
// Mismo contrato que el de admin-dashboard.

import { supabaseAdmin } from './supabaseAdmin';

export const BUCKET_COMPROBANTES = 'comprobantes-pago';
export const TAMANO_MAXIMO_MB = 5;
export const TIPOS_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export const DIMENSION_MAX_PX = 1920;
export const JPEG_QUALITY = 0.82;
export const SIGNED_URL_TTL_SEG = 600;

export type ValidacionArchivo =
  | { ok: true }
  | { ok: false; error: string };

export function validarArchivoComprobante(file: File): ValidacionArchivo {
  if (!TIPOS_PERMITIDOS.includes(file.type as any)) {
    return { ok: false, error: 'Formato no permitido. Usa JPG, PNG, WEBP o PDF.' };
  }
  const maxBytes = TAMANO_MAXIMO_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { ok: false, error: `Archivo muy grande. Máximo ${TAMANO_MAXIMO_MB} MB.` };
  }
  return { ok: true };
}

export async function comprimirImagenCliente(file: File): Promise<File> {
  if (file.type === 'application/pdf') return file;
  if (!file.type.startsWith('image/')) return file;

  const imgBitmap = await createImageBitmap(file);
  let { width, height } = imgBitmap;
  if (width > DIMENSION_MAX_PX || height > DIMENSION_MAX_PX) {
    const ratio = Math.min(DIMENSION_MAX_PX / width, DIMENSION_MAX_PX / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(imgBitmap, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY)
  );
  if (!blob) return file;

  const nuevoNombre = file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '.jpg');
  return new File([blob], nuevoNombre, { type: 'image/jpeg' });
}

export async function subirComprobanteStorage(
  file: File | Blob,
  packId: string,
  fileName: string
): Promise<{ path: string; signedUrl: string } | { error: string }> {
  const ext = fileName.split('.').pop() || 'jpg';
  const path = `packs/${packId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET_COMPROBANTES)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: (file as File).type || 'application/octet-stream',
    });

  if (upErr) return { error: upErr.message };

  const { data: signed, error: signedErr } = await supabaseAdmin.storage
    .from(BUCKET_COMPROBANTES)
    .createSignedUrl(path, SIGNED_URL_TTL_SEG);

  if (signedErr || !signed) return { error: signedErr?.message || 'No se pudo firmar URL' };

  return { path, signedUrl: signed.signedUrl };
}
