// =============================================================================
// CALCULAR CAPACIDAD — TypeScript port of calcular_capacidad.py
// Calcula el cargo por capacidad CFE según fórmula GDMTH
// D_facturable = min(D_punta, floor(Q / (24 * d * FC)))
// =============================================================================

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
}

export interface TarifaGDMTH {
  estado: string;
  municipio: string;
  mes: string;
  intHorario: string; // 'BASE' | 'INTERMEDIA' | 'PUNTA'
  capacidad: number;  // $/kW
  monto: number;      // $/kWh
}

export interface CargoCapacidad {
  periodo: string;
  mesTarifa: string;
  mesNum: number;
  dias: number;
  temporada: string;
  dPunta: number;
  totalConsumo: number;
  factorCarga: number;
  dFactPre: number;      // piso de facturación por fórmula
  dFacturable: number;   // min(D_punta, dFactPre)
  tarifaCap: number;     // $/kW
  cargoCapacidad: number; // $
}

/** Limpia un string numérico con comas y espacios */
function limpiarNumero(val: string | number): number {
  if (typeof val === 'number') return val;
  const limpio = val.replace(/[\s,%]/g, '').replace(/,/g, '');
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

/**
 * Obtiene la tarifa de capacidad ($/kW) para un mes dado.
 * Las tarifas ya vienen pre-filtradas por ubicación desde filtrarTarifas(),
 * así que solo filtramos por mes + intHorario.
 * Si no hay match exacto por ubicación, busca solo por mes+PUNTA.
 */
export function obtenerTarifaCapacidad(
  tarifas: TarifaGDMTH[],
  estado: string,
  municipio: string,
  mes: string,
): number {
  const mesUp = mes.trim().toUpperCase();
  const estadoUp = estado.trim().toUpperCase();
  const munUp = municipio.trim().toUpperCase();

  // Try exact match first
  let fila = tarifas.find(
    (t) =>
      t.estado.trim().toUpperCase() === estadoUp &&
      t.municipio.trim().toUpperCase() === munUp &&
      t.mes.trim().toUpperCase() === mesUp &&
      t.intHorario.trim().toUpperCase() === 'PUNTA',
  );

  // Fallback: match by mes + intHorario only (tarifas already pre-filtered by location)
  if (!fila) {
    fila = tarifas.find(
      (t) =>
        t.mes.trim().toUpperCase() === mesUp &&
        t.intHorario.trim().toUpperCase() === 'PUNTA',
    );
  }

  return fila ? fila.capacidad : 0;
}

/**
 * Obtiene la tarifa BASE ($/kWh) para un mes dado.
 * Las tarifas ya vienen pre-filtradas por ubicación.
 */
export function obtenerTarifaBase(
  tarifas: TarifaGDMTH[],
  estado: string,
  municipio: string,
  mes: string,
): number {
  const mesUp = mes.trim().toUpperCase();
  const estadoUp = estado.trim().toUpperCase();
  const munUp = municipio.trim().toUpperCase();

  // Try exact match first
  let fila = tarifas.find(
    (t) =>
      t.estado.trim().toUpperCase() === estadoUp &&
      t.municipio.trim().toUpperCase() === munUp &&
      t.mes.trim().toUpperCase() === mesUp &&
      t.intHorario.trim().toUpperCase() === 'BASE',
  );

  // Fallback: match by mes + intHorario only
  if (!fila) {
    fila = tarifas.find(
      (t) =>
        t.mes.trim().toUpperCase() === mesUp &&
        t.intHorario.trim().toUpperCase() === 'BASE',
    );
  }

  return fila ? fila.monto : 0;
}

/**
 * Calcula el cargo por capacidad para cada periodo (recibo).
 * Fórmula CFE: D_facturable = min(D_punta, floor(Q_mensual / (24 * d * FC)))
 */
export function calcularCargosCapacidad(
  recibos: ReciboData[],
  tarifas: TarifaGDMTH[],
  estado: string,
  municipio: string,
): CargoCapacidad[] {
  const MESES_MAP: Record<number, string> = {
    1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL',
    5: 'MAYO', 6: 'JUNIO', 7: 'JULIO', 8: 'AGOSTO',
    9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE',
  };

  return recibos.map((r) => {
    const mesTarifa = MESES_MAP[r.mesNum] || r.mes.toUpperCase();
    const tarifaCap = obtenerTarifaCapacidad(tarifas, estado, municipio, mesTarifa);

    // Factor de carga como decimal (viene como %)
    const fc = r.factorCarga / 100;

    // Piso de facturación: floor(Q / (24 * d * FC))
    let dFactPre = 0;
    if (fc > 0 && r.dias > 0) {
      dFactPre = Math.floor(r.totalConsumo / (24 * r.dias * fc));
    }

    // D_facturable = min(D_punta, piso_formula)
    const dFacturable = Math.min(r.demandaPunta, dFactPre);
    const cargoCapacidad = dFacturable * tarifaCap;

    return {
      periodo: r.mes,
      mesTarifa,
      mesNum: r.mesNum,
      dias: r.dias,
      temporada: r.temporada,
      dPunta: r.demandaPunta,
      totalConsumo: r.totalConsumo,
      factorCarga: r.factorCarga,
      dFactPre,
      dFacturable,
      tarifaCap,
      cargoCapacidad,
    };
  });
}
