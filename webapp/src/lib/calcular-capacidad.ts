// =============================================================================
// CALCULAR CAPACIDAD — TypeScript port of calcular_capacidad.py
// Calcula el cargo por capacidad CFE según fórmula GDMTH
// D_facturable = min(D_punta, floor(Q / (24 * d * FC)))
// =============================================================================

import { normalizarDivision } from './divisiones';

export interface ReciboData {
  mes: string;
  mesNum: number;
  anio: number;
  dias: number;
  temporada: string;
  consumoPunta: number;
  consumoIntermedia: number;
  consumoBase: number;
  totalConsumo: number;
  demandaPunta: number;
  demandaIntermedia: number;
  demandaBase: number;
  demandaMaxima: number;
  factorCarga: number;
  factorPotencia: number;
  cargoCapacidadRecibo: number; // $ importe de Capacidad leído del recibo CFE
  cargoDistribucion: number;    // $ importe de Distribución leído del recibo CFE
  cargoEnergiaPunta: number;    // $ importe de Energía Punta leído del recibo CFE
  cargoEnergiaIntermedia: number; // $ importe de Energía Intermedia leído del recibo CFE
  cargoEnergiaBase: number;     // $ importe de Energía Base leído del recibo CFE
  importeTotal: number;         // $ Total a Pagar del recibo CFE
}

/**
 * Una fila de tarifa CFE GDMTH: agrupa todos los cargos para un (anio, mes, division).
 * Las 5 filas del CSV oficial (1 único + 3 variable + 1 fijo) se pivotan a esta forma.
 */
export interface TarifaGDMTH {
  anio: number;
  mes: string;          // Forma canónica: "Enero", "Febrero", ...
  division: string;     // Forma canónica de DIVISIONES_CFE
  tarifaBase: number;       // $/kWh — energía periodo Base
  tarifaIntermedia: number; // $/kWh — energía periodo Intermedia
  tarifaPunta: number;      // $/kWh — energía periodo Punta
  tarifaDistribucion: number; // $/kW — cargo distribución
  cargoCapacidad: number;     // $/kW — cargo capacidad
}

export interface CargoCapacidad {
  periodo: string;
  mesTarifa: string;
  mesNum: number;
  anio: number;
  dias: number;
  temporada: string;
  dPunta: number;
  dMaxima: number;       // demanda máxima mensual
  totalConsumo: number;
  factorCarga: number;
  dFactPre: number;      // piso de facturación: floor(Q/(24*d*FC))
  dFacturable: number;   // min(D_punta, dFactPre) para Capacidad
  dFactDist: number;     // min(D_maxima, dFactPre) para Distribución
  tarifaCap: number;     // $/kW capacidad
  tarifaDist: number;    // $/kW distribución
  cargoCapacidad: number; // $ (calculado)
  cargoDist: number;     // $ distribución (calculado)
  cargoCapacidadRecibo: number; // $ leído del recibo CFE
}

const MES_CANON_LOOKUP: Record<string, string> = {
  ENERO: 'Enero', FEBRERO: 'Febrero', MARZO: 'Marzo', ABRIL: 'Abril',
  MAYO: 'Mayo', JUNIO: 'Junio', JULIO: 'Julio', AGOSTO: 'Agosto',
  SEPTIEMBRE: 'Septiembre', OCTUBRE: 'Octubre', NOVIEMBRE: 'Noviembre', DICIEMBRE: 'Diciembre',
};

/**
 * Busca la fila de tarifa para una (division, mes) dada en un año específico.
 * Política de año: intenta match exacto; si no existe, usa el año más reciente
 * disponible (con warning).
 */
function buscarFilaTarifa(
  tarifas: TarifaGDMTH[],
  division: string,
  anio: number,
  mes: string,
): TarifaGDMTH | null {
  const divNorm = normalizarDivision(division);
  if (!divNorm) return null;

  const mesUp = mes.trim().toUpperCase();
  const mesCanon = MES_CANON_LOOKUP[mesUp] || mes;

  // 1) Match exacto por año
  let fila = tarifas.find(
    (t) => t.division === divNorm && t.anio === anio && t.mes === mesCanon,
  );
  if (fila) return fila;

  // 2) Fallback: año más reciente disponible para esa división+mes
  const candidatos = tarifas
    .filter((t) => t.division === divNorm && t.mes === mesCanon)
    .sort((a, b) => b.anio - a.anio);

  if (candidatos.length > 0) {
    const f = candidatos[0];
    console.warn(
      `Tarifa: No hay datos para ${divNorm}/${mesCanon}/${anio} — usando año más reciente disponible: ${f.anio}`,
    );
    return f;
  }

  return null;
}

/** Cargo capacidad ($/kW) para una (division, anio, mes). */
export function obtenerTarifaCapacidad(
  tarifas: TarifaGDMTH[],
  division: string,
  anio: number,
  mes: string,
): number {
  const f = buscarFilaTarifa(tarifas, division, anio, mes);
  return f ? f.cargoCapacidad : 0;
}

/** Tarifa distribución ($/kW) para una (division, anio, mes). */
export function obtenerTarifaDistribucion(
  tarifas: TarifaGDMTH[],
  division: string,
  anio: number,
  mes: string,
): number {
  const f = buscarFilaTarifa(tarifas, division, anio, mes);
  return f ? f.tarifaDistribucion : 0;
}

/** Tarifa energía periodo BASE ($/kWh) para una (division, anio, mes). */
export function obtenerTarifaBase(
  tarifas: TarifaGDMTH[],
  division: string,
  anio: number,
  mes: string,
): number {
  const f = buscarFilaTarifa(tarifas, division, anio, mes);
  return f ? f.tarifaBase : 0;
}

/**
 * Calcula el cargo por capacidad para cada periodo (recibo).
 * Fórmula CFE: D_facturable = min(D_punta, floor(Q_mensual / (24 * d * FC)))
 */
export function calcularCargosCapacidad(
  recibos: ReciboData[],
  tarifas: TarifaGDMTH[],
  division: string,
): CargoCapacidad[] {
  const MESES_MAP: Record<number, string> = {
    1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL',
    5: 'MAYO', 6: 'JUNIO', 7: 'JULIO', 8: 'AGOSTO',
    9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE',
  };

  return recibos.map((r) => {
    const mesTarifa = MESES_MAP[r.mesNum] || r.mes.toUpperCase();
    const tarifaCap = obtenerTarifaCapacidad(tarifas, division, r.anio, mesTarifa);
    const tarifaDist = obtenerTarifaDistribucion(tarifas, division, r.anio, mesTarifa);

    // Factor de carga como decimal (viene como %)
    const fc = r.factorCarga / 100;

    let dFactPre = 0;
    if (fc > 0 && r.dias > 0) {
      dFactPre = Math.floor(r.totalConsumo / (24 * r.dias * fc));
    }

    // 5.1 Capacidad: D_facturable = min(D_punta, dFactPre)
    const dFacturable = Math.min(r.demandaPunta, dFactPre);
    const cargoCapacidad = dFacturable * tarifaCap;

    // 5.2 Distribución: D_facturable_dist = min(D_maxima, dFactPre)
    const dFactDist = Math.min(r.demandaMaxima, dFactPre);
    const cargoDist = dFactDist * tarifaDist;

    return {
      periodo: r.mes,
      mesTarifa,
      mesNum: r.mesNum,
      anio: r.anio,
      dias: r.dias,
      temporada: r.temporada,
      dPunta: r.demandaPunta,
      dMaxima: r.demandaMaxima,
      totalConsumo: r.totalConsumo,
      factorCarga: r.factorCarga,
      dFactPre,
      dFacturable,
      dFactDist,
      tarifaCap,
      tarifaDist,
      cargoCapacidad,
      cargoDist,
      cargoCapacidadRecibo: r.cargoCapacidadRecibo || 0,
    };
  });
}
