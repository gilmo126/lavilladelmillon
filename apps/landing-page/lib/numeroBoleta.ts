export const RANGO_LEGACY_MIN = 100_000;
export const RANGO_LEGACY_MAX = 999_999;
export const RANGO_NUEVO_MIN = 1_000_000;
export const RANGO_NUEVO_MAX = 9_999_999;

export function formatearNumeroBoleta(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return '';
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (isNaN(num)) return String(n);
  return num < RANGO_NUEVO_MIN ? String(num).padStart(6, '0') : String(num);
}

export function esRangoValidoBoleta(n: number): boolean {
  return (
    (n >= RANGO_LEGACY_MIN && n <= RANGO_LEGACY_MAX) ||
    (n >= RANGO_NUEVO_MIN && n <= RANGO_NUEVO_MAX)
  );
}
