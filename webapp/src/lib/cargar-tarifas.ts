// =============================================================================
// CARGAR TARIFAS — Loads GDMTH tarifas from bundled CSV (CFE oficial)
// Formato: 16 cols, agrupadas en 5 filas por (anio, mes, division):
//   - 1 fila "único"  → cargo fijo $/mes (ignorado por decisión de producto)
//   - 3 filas "variable" → tarifaBase / tarifaIntermedia / tarifaPunta ($/kWh)
//   - 1 fila "fijo"   → tarifaDistribucion + cargoCapacidad ($/kW)
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import type { TarifaGDMTH } from './calcular-capacidad';
import { normalizarDivision } from './divisiones';

// Mes (lowercase en CSV) → Forma canónica capitalizada
const MES_CANON: Record<string, string> = {
  enero: 'Enero',
  febrero: 'Febrero',
  marzo: 'Marzo',
  abril: 'Abril',
  mayo: 'Mayo',
  junio: 'Junio',
  julio: 'Julio',
  agosto: 'Agosto',
  septiembre: 'Septiembre',
  octubre: 'Octubre',
  noviembre: 'Noviembre',
  diciembre: 'Diciembre',
};

// Periodo horario en CSV → Forma canónica usada por la app
// Nota: el CSV trae "Itermedio" (sic) con mojibake de tilde. Normalizamos a INTERMEDIA.
function normalizarPeriodoHorario(raw: string): 'BASE' | 'INTERMEDIA' | 'PUNTA' | 'NO_APLICA' {
  const v = raw.trim().toLowerCase();
  if (v.startsWith('base')) return 'BASE';
  if (v.startsWith('iter') || v.startsWith('inter')) return 'INTERMEDIA';
  if (v.startsWith('punta')) return 'PUNTA';
  return 'NO_APLICA';
}

// Tipo de cargo en CSV → fijo / único / variable (decodifica mojibake "Ãºnico")
function normalizarTipoCargo(raw: string): 'unico' | 'fijo' | 'variable' | 'desconocido' {
  const v = raw.replace(/Ãº/g, 'ú').trim().toLowerCase();
  if (v === 'único' || v === 'unico') return 'unico';
  if (v === 'fijo') return 'fijo';
  if (v === 'variable') return 'variable';
  return 'desconocido';
}

let _cachedTarifas: TarifaGDMTH[] | null = null;

/**
 * Carga todas las tarifas del CSV oficial CFE y las pivota a una fila por
 * (anio, mes, division). Resultado cacheado en memoria tras la primera llamada.
 */
export function cargarTodasTarifas(): TarifaGDMTH[] {
  if (_cachedTarifas) return _cachedTarifas;

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

  // Quitar BOM si existe
  if (csvContent.charCodeAt(0) === 0xfeff) csvContent = csvContent.slice(1);

  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // Acumulador: por clave "anio|mes|division" guardamos la fila parcial mientras
  // recorremos las (hasta) 5 filas que componen un bloque mensual.
  type Acc = Partial<TarifaGDMTH>;
  const grupos = new Map<string, Acc>();

  // Header en línea 0; encabezado esperado:
  // anio,mes,categoria,descripcion,periodo_horario,cargo,unidades,division_tarifaria,
  // tarifa_transmision,tarifa_distribucion,tarifa_cenace,tarifa_oper_suministro,
  // cargo_scnmem,cargo_generacion,cargo_capacidad,total
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < 16) continue;

    const anio = parseInt(cols[0], 10);
    if (!anio) continue;

    const mesRaw = cols[1].trim().toLowerCase();
    const mes = MES_CANON[mesRaw];
    if (!mes) continue;

    const periodo = normalizarPeriodoHorario(cols[4]);
    const tipoCargo = normalizarTipoCargo(cols[5]);

    const division = normalizarDivision(cols[7]);
    if (!division) continue;

    const key = `${anio}|${mes}|${division}`;
    let acc = grupos.get(key);
    if (!acc) {
      acc = { anio, mes, division };
      grupos.set(key, acc);
    }

    const tarifaDistribucion = parseFloat(cols[9]) || 0;
    const cargoCapacidad = parseFloat(cols[14]) || 0;
    const total = parseFloat(cols[15]) || 0;

    if (tipoCargo === 'variable') {
      // Filas Base/Intermedia/Punta — el "total" del CSV es el $/kWh efectivo
      if (periodo === 'BASE') acc.tarifaBase = total;
      else if (periodo === 'INTERMEDIA') acc.tarifaIntermedia = total;
      else if (periodo === 'PUNTA') acc.tarifaPunta = total;
    } else if (tipoCargo === 'fijo') {
      // Fila $/kW: distribución + capacidad
      acc.tarifaDistribucion = tarifaDistribucion;
      acc.cargoCapacidad = cargoCapacidad;
    }
    // tipoCargo === 'unico' → cargo fijo mensual: ignorado por decisión de producto
  }

  const tarifas: TarifaGDMTH[] = [];
  for (const acc of Array.from(grupos.values())) {
    tarifas.push({
      anio: acc.anio!,
      mes: acc.mes!,
      division: acc.division!,
      tarifaBase: acc.tarifaBase ?? 0,
      tarifaIntermedia: acc.tarifaIntermedia ?? 0,
      tarifaPunta: acc.tarifaPunta ?? 0,
      tarifaDistribucion: acc.tarifaDistribucion ?? 0,
      cargoCapacidad: acc.cargoCapacidad ?? 0,
    });
  }

  _cachedTarifas = tarifas;
  console.log(`Tarifas GDMTH cargadas: ${tarifas.length} filas (anio×mes×división)`);
  return tarifas;
}

/**
 * Filtra las tarifas a una sola división. Devuelve todas las filas (todos los años,
 * todos los meses) — el filtrado por año se hace en el lookup.
 */
export function filtrarTarifas(
  all: TarifaGDMTH[],
  division: string,
): TarifaGDMTH[] {
  const norm = normalizarDivision(division);
  if (!norm) {
    console.warn(`División no reconocida: "${division}". Devolviendo lista vacía.`);
    return [];
  }
  return all.filter((t) => t.division === norm);
}

/**
 * Devuelve el año más reciente disponible en las tarifas dadas.
 * Útil para proyecciones a futuro cuando no hay tarifa del año-objetivo.
 */
export function anioMasRecienteDisponible(tarifas: TarifaGDMTH[]): number {
  let max = 0;
  for (const t of tarifas) if (t.anio > max) max = t.anio;
  return max;
}
