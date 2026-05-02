// =============================================================================
// DIVISIONES TARIFARIAS CFE — Catálogo canónico y mapeo a región de irradiación
// =============================================================================

/**
 * Las 17 divisiones de distribución CFE según el CSV oficial de tarifas.
 * El orden y la ortografía aquí son la forma canónica usada en toda la app.
 */
export const DIVISIONES_CFE = [
  'Baja California',
  'Baja California Sur',
  'Bajío',
  'Centro Occidente',
  'Centro Oriente',
  'Centro Sur',
  'Golfo Centro',
  'Golfo Norte',
  'Jalisco',
  'Noroeste',
  'Norte',
  'Oriente',
  'Peninsular',
  'Sureste',
  'Valle de México Centro',
  'Valle de México Norte',
  'Valle de México Sur',
] as const;

export type DivisionCFE = (typeof DIVISIONES_CFE)[number];

export const DIVISION_DEFAULT: DivisionCFE = 'Norte';

/**
 * Normaliza un valor de división tal como aparece en el CSV (con posible mojibake
 * UTF-8 mal decodificado, p.ej. "Valle de MÃ©xico Sur") a la forma canónica.
 * También maneja "Bajio" sin tilde (forma del CSV) → "Bajío".
 */
export function normalizarDivision(raw: string): DivisionCFE | null {
  const limpio = raw
    .replace(/Ã©/g, 'é')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã±/g, 'ñ')
    .trim();

  // Bajio → Bajío (CSV no trae tilde)
  if (limpio.toLowerCase() === 'bajio') return 'Bajío';

  const match = DIVISIONES_CFE.find(
    (d) => d.toLowerCase() === limpio.toLowerCase(),
  );
  return match ?? null;
}

/**
 * Mapeo División CFE → Región de irradiación solar usada por SimuladorBESS.
 * El simulador sólo conoce 3 perfiles: NORTE, CENTRAL, BAJA CALIFORNIA SUR.
 * Asignación geográfica:
 *  - NORTE: latitudes altas, irradiación alta
 *  - BAJA CALIFORNIA SUR: caso peninsular específico
 *  - CENTRAL: resto del país
 */
const DIVISION_TO_IRRADIACION: Record<DivisionCFE, string> = {
  'Baja California': 'NORTE',
  'Baja California Sur': 'BAJA CALIFORNIA SUR',
  'Noroeste': 'NORTE',
  'Norte': 'NORTE',
  'Golfo Norte': 'NORTE',
  'Bajío': 'CENTRAL',
  'Centro Occidente': 'CENTRAL',
  'Centro Oriente': 'CENTRAL',
  'Centro Sur': 'CENTRAL',
  'Golfo Centro': 'CENTRAL',
  'Jalisco': 'CENTRAL',
  'Oriente': 'CENTRAL',
  'Peninsular': 'CENTRAL',
  'Sureste': 'CENTRAL',
  'Valle de México Centro': 'CENTRAL',
  'Valle de México Norte': 'CENTRAL',
  'Valle de México Sur': 'CENTRAL',
};

export function regionIrradiacionDeDivision(division: string): string {
  const norm = normalizarDivision(division);
  if (!norm) return 'NORTE';
  return DIVISION_TO_IRRADIACION[norm];
}
