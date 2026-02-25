// =============================================================================
// CARGAR TARIFAS — Loads GDMTH tariffas from bundled CSV
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import type { TarifaGDMTH } from './calcular-capacidad';

const MESES_CSV: Record<string, string> = {
  ENERO: 'Enero',
  FEBRERO: 'Febrero',
  MARZO: 'Marzo',
  ABRIL: 'Abril',
  MAYO: 'Mayo',
  JUNIO: 'Junio',
  JULIO: 'Julio',
  AGOSTO: 'Agosto',
  SEPTIEMBRE: 'Septiembre',
  OCTUBRE: 'Octubre',
  NOVIEMBRE: 'Noviembre',
  DICIEMBRE: 'Diciembre',
};

// Cache for parsed tarifas
let _cachedTarifas: TarifaGDMTH[] | null = null;

/**
 * Loads all tarifa rows from the bundled CSV file.
 * Results are cached in memory after first call.
 */
export function cargarTodasTarifas(): TarifaGDMTH[] {
  if (_cachedTarifas) return _cachedTarifas;

  // Try multiple possible paths (dev vs standalone build)
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'tarifas_gdmth.csv'),
    path.join(__dirname, '..', '..', '..', 'data', 'tarifas_gdmth.csv'),
    path.join(process.cwd(), '..', 'data', 'tarifas_gdmth.csv'),
  ];

  let csvContent = '';
  for (const p of possiblePaths) {
    try {
      csvContent = fs.readFileSync(p, 'utf-8');
      if (csvContent.length > 0) break;
    } catch {
      // try next path
    }
  }

  if (!csvContent) {
    console.warn('No se encontró el archivo de tarifas GDMTH');
    return [];
  }

  const lines = csvContent.split('\n').filter((l) => l.trim().length > 0);
  const tarifas: TarifaGDMTH[] = [];

  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 17) continue;

    // Columns: Año[0], Estado[1], Municipio[2], Division[3], Region[4],
    //          Temporada[5], Mes[6], Tarifa[7], Descripción[8],
    //          Int.Horario[9], Monto[10], Unidad[11], CargoFijo[12],
    //          Unidad[13], Distribucion[14], Unidad[15], Capacidad[16], Unidad[17]

    const estado = cols[1].trim().toUpperCase();
    const municipio = cols[2].trim().toUpperCase();
    const mesCsv = cols[6].trim().toUpperCase();
    const intHorario = cols[9].trim().toUpperCase();
    const monto = parseFloat(cols[10]) || 0;
    const capacidad = parseFloat(cols[16]) || 0;
    const distribucion = parseFloat(cols[14]) || 0;

    const mesNombre = MESES_CSV[mesCsv] || mesCsv;

    tarifas.push({
      estado,
      municipio,
      mes: mesNombre,
      intHorario,
      capacidad,
      distribucion,
      monto,
    });
  }

  _cachedTarifas = tarifas;
  console.log(`Tarifas cargadas: ${tarifas.length} filas`);
  return tarifas;
}

/**
 * Filters tarifas by estado and municipio.
 * Falls back to just estado match if no municipio match found.
 */
export function filtrarTarifas(
  all: TarifaGDMTH[],
  estado: string,
  municipio: string,
): TarifaGDMTH[] {
  const e = estado.toUpperCase().trim();
  const m = municipio.toUpperCase().trim();

  // Try exact match on estado + municipio
  let filtered = all.filter(
    (t) => t.estado.toUpperCase() === e && t.municipio.toUpperCase() === m,
  );

  // Fallback: match by estado only (use first municipio found)
  if (filtered.length === 0) {
    const estadoRows = all.filter((t) => t.estado.toUpperCase() === e);
    if (estadoRows.length > 0) {
      const firstMun = estadoRows[0].municipio;
      filtered = estadoRows.filter((t) => t.municipio === firstMun);
      console.log(
        `Tarifas: No exact match for ${m}, using ${firstMun} (${filtered.length} rows)`,
      );
    }
  }

  // Fallback: if nothing matches, return rows for the most complete municipio
  // (the one with all 3 horarios: BASE, INTERMEDIA, PUNTA = 36 rows)
  if (filtered.length === 0 && all.length > 0) {
    // Group by estado+municipio and find the most complete set
    const groups = new Map<string, TarifaGDMTH[]>();
    for (const t of all) {
      const key = `${t.estado}|${t.municipio}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }

    // Pick the group with the most rows (should be 36 = 12 months × 3 horarios)
    let bestKey = '';
    let bestCount = 0;
    groups.forEach((rows, key) => {
      if (rows.length > bestCount) {
        bestCount = rows.length;
        bestKey = key;
      }
    });

    if (bestKey) {
      filtered = groups.get(bestKey)!;
      const [bestEst, bestMun] = bestKey.split('|');
      console.log(
        `Tarifas: No match for ${e}/${m}, using default ${bestEst}/${bestMun} (${filtered.length} rows, most complete)`,
      );
    }
  }

  return filtered;
}
