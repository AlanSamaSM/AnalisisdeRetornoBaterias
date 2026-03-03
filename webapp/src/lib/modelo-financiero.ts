// =============================================================================
// MODELO FINANCIERO — TypeScript port of modelo_financiero.py
// Genera simulación BESS, comparativo mensual, tabla de inversión y ROI
// =============================================================================

import { SimuladorBESS } from './simulador-bess';
import {
  type ReciboData,
  type TarifaGDMTH,
  type CargoCapacidad,
  calcularCargosCapacidad,
  obtenerTarifaBase,
} from './calcular-capacidad';

// ─── Constantes ──────────────────────────────────────────────────────────────
const TASA_CRECIMIENTO_TARIFARIO = 0.08; // 8% anual

const MESES_MAP: Record<string, number> = {
  ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4,
  MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8,
  SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
};

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ParametrosBESS {
  potenciaKw: number;
  capacidadKwh: number;
  precioUsd: number;
  tipoCambio: number;
  aniosProyeccion: number;
  region: string;
  eficiencia: number;
  horasCargaBase: number;
  tasaDegradacion?: number;
  ciclosAnuales?: number;
}

export interface FilaSimulacion {
  periodo: string;
  mes: string;
  dias: number;
  temporada: string;
  dPuntaOriginal: number;
  pisoFacturacion: number;
  potenciaBess: number;
  dPuntaNueva: number;
  duracionDescarga: number;
  energiaCiclo: number;
  energiaMes: number;
  tarifaCap: number;
  cargoSinBess: number;
  cargoConBess: number;
  ahorroCapacidad: number;
  ahorroCapPct: number;
  consumoBaseOriginal: number;
  energiaCargaBess: number;
  consumoBaseNuevo: number;
  potenciaCarga: number;
  tarifaBase: number;
  costoCargaBase: number;
  ahorroNeto: number;
  ahorroNetoPct: number;
}

export interface ComparativoMensual {
  periodo: string;
  cargoSinBess: number;
  cargoConBess: number;
  ahorroCapacidad: number;
  costoCargaBase: number;
  ahorroNeto: number;
  pctAhorroNeto: number;
}

export interface FilaInversion {
  anio: number;
  inversion: number;
  ahorroCfe: number;
  ahorroNetoAnual: number;
  ahorroAcumulado: number;
}

export interface FilaDegradacion {
  anio: number;
  capacidadEfectiva: number;     // kWh restantes
  degradacionPct: number;        // % de degradación acumulada
  factorCapacidad: number;       // fracción 0-1 de capacidad original
  ahorroAjustado: number;        // ahorro anual ajustado por degradación
  requiereRecompra: boolean;     // true si capacidad < umbral para cubrir punta
}

export interface ResultadoFinanciero {
  parametros: ParametrosBESS;
  inversionMxn: number;
  simulacion: FilaSimulacion[];
  comparativo: ComparativoMensual[];
  totales: {
    cargoSinBess: number;
    cargoConBess: number;
    ahorroCapacidad: number;
    costoCargaBase: number;
    ahorroNeto: number;
    pctAhorroNeto: number;
  };
  tablaInversion: FilaInversion[];
  degradacion: FilaDegradacion[];
  roiExacto: number | null;
  ahorroTotalVidaUtil: number;
  anioRecompra: number | null;
  degradacionAcumuladaTotal: number;
}

// ─── Funciones auxiliares ────────────────────────────────────────────────────

function extraerMesBase(mesStr: string): string {
  let limpio = mesStr.trim().toUpperCase();
  for (const sufijo of [' SUB-PERIODO 1', ' SUB-PERIODO 2']) {
    limpio = limpio.replace(sufijo, '');
  }
  return limpio.trim();
}

// ─── Simulación BESS ────────────────────────────────────────────────────────

export function ejecutarSimulacionBess(
  params: ParametrosBESS,
  cargos: CargoCapacidad[],
  tarifas: TarifaGDMTH[],
  estado: string,
  municipio: string,
  consumoBaseMap: Record<string, number>,
): FilaSimulacion[] {
  const simulador = new SimuladorBESS(
    params.potenciaKw,
    params.capacidadKwh,
    params.region,
    params.eficiencia,
    params.horasCargaBase,
  );

  return cargos.map((cargo) => {
    const mesNum = cargo.mesNum;
    const dias = cargo.dias;

    // ── Descarga en PUNTA ──
    const resultado = simulador.reducirDemandaPunta(cargo.dPunta, mesNum);
    const sim = resultado.simulacion;
    const dPuntaNueva = resultado.demanda_nueva;

    // 5.1 Capacidad: D_fact = min(D_punta, floor(Q/(24*d*FC)))
    const dFactCapConBess = Math.min(dPuntaNueva, cargo.dFactPre);

    // ── Cap s/BESS: solo Capacidad según recibo CFE ──
    const cargoSinBess = cargo.cargoCapacidadRecibo > 0
      ? cargo.cargoCapacidadRecibo
      : cargo.dFacturable * cargo.tarifaCap;

    // ── Cap c/BESS: solo Capacidad con BESS ──
    const cargoConBess = dFactCapConBess * cargo.tarifaCap;

    const ahorroCapacidad = cargoSinBess - cargoConBess;
    const ahorroCapPct = cargoSinBess > 0 ? (ahorroCapacidad / cargoSinBess) * 100 : 0;

    // ── Carga en BASE ──
    const cargaInfo = simulador.calcularCargaBase(dias);
    const energiaCargaBase = cargaInfo.energia_carga_mes_kwh;

    const mesTarifa = cargo.mesTarifa;
    const tarifaBase = obtenerTarifaBase(tarifas, estado, municipio, mesTarifa);
    const costoCargaBase = energiaCargaBase * tarifaBase;

    const periodoKey = cargo.periodo.trim().toUpperCase();
    const consumoBaseOriginal = consumoBaseMap[periodoKey] || 0;
    const consumoBaseNuevo = consumoBaseOriginal + energiaCargaBase;

    // ── Ahorro neto ──
    const ahorroNeto = ahorroCapacidad - costoCargaBase;
    const ahorroNetoPct = cargoSinBess > 0 ? (ahorroNeto / cargoSinBess) * 100 : 0;

    return {
      periodo: cargo.periodo,
      mes: mesTarifa,
      dias,
      temporada: sim.temporada,
      dPuntaOriginal: round2(cargo.dPunta),
      pisoFacturacion: round2(cargo.dFactPre),
      potenciaBess: round2(resultado.potencia_bess),
      dPuntaNueva: round2(dPuntaNueva),
      duracionDescarga: sim.duracion_horas,
      energiaCiclo: round2(sim.energia_por_ciclo_kwh),
      energiaMes: round2(sim.energia_total_mes_kwh),
      tarifaCap: cargo.tarifaCap,
      cargoSinBess: round2(cargoSinBess),
      cargoConBess: round2(cargoConBess),
      ahorroCapacidad: round2(ahorroCapacidad),
      ahorroCapPct: round2(ahorroCapPct),
      consumoBaseOriginal: round2(consumoBaseOriginal),
      energiaCargaBess: round2(energiaCargaBase),
      consumoBaseNuevo: round2(consumoBaseNuevo),
      potenciaCarga: round2(cargaInfo.potencia_carga_kw),
      tarifaBase: Math.round(tarifaBase * 1e6) / 1e6,
      costoCargaBase: round2(costoCargaBase),
      ahorroNeto: round2(ahorroNeto),
      ahorroNetoPct: round2(ahorroNetoPct),
    };
  });
}

// ─── Comparativo mensual ─────────────────────────────────────────────────────

export function generarComparativoMensual(
  simulacion: FilaSimulacion[],
): ComparativoMensual[] {
  const filas: ComparativoMensual[] = simulacion.map((s) => ({
    periodo: s.periodo,
    cargoSinBess: s.cargoSinBess,
    cargoConBess: s.cargoConBess,
    ahorroCapacidad: s.ahorroCapacidad,
    costoCargaBase: s.costoCargaBase,
    ahorroNeto: s.ahorroNeto,
    pctAhorroNeto: s.ahorroNetoPct,
  }));

  // Total
  const totalSin = filas.reduce((s, f) => s + f.cargoSinBess, 0);
  const totalCon = filas.reduce((s, f) => s + f.cargoConBess, 0);
  const totalAhorroCap = filas.reduce((s, f) => s + f.ahorroCapacidad, 0);
  const totalCosto = filas.reduce((s, f) => s + f.costoCargaBase, 0);
  const totalNeto = filas.reduce((s, f) => s + f.ahorroNeto, 0);
  const totalPct = totalSin > 0 ? (totalNeto / totalSin) * 100 : 0;

  filas.push({
    periodo: 'TOTAL ANUAL',
    cargoSinBess: round2(totalSin),
    cargoConBess: round2(totalCon),
    ahorroCapacidad: round2(totalAhorroCap),
    costoCargaBase: round2(totalCosto),
    ahorroNeto: round2(totalNeto),
    pctAhorroNeto: round2(totalPct),
  });

  return filas;
}

// ─── Modelo de degradación ───────────────────────────────────────────────────

/**
 * Calcula la tabla de degradación anual del BESS.
 * Lógica: capacidad año N = capacidadKwh × (1 - tasaDegradacion)^N
 * Recompra sugerida cuando la capacidad efectiva cae por debajo del umbral
 * necesario para cubrir la punta completa (se usa potenciaKw × horasPunta como proxy).
 */
export function calcularDegradacion(
  capacidadKwh: number,
  ahorroAnualBase: number,
  aniosProyeccion: number,
  tasaDegradacion = 0.02,
  ciclosAnuales = 300,
  umbralRecompraPct = 0.70,
  tasaCrecimiento = TASA_CRECIMIENTO_TARIFARIO,
): FilaDegradacion[] {
  const filas: FilaDegradacion[] = [];

  for (let anio = 0; anio <= aniosProyeccion; anio++) {
    const factorCapacidad = Math.pow(1 - tasaDegradacion, anio);
    const capacidadEfectiva = round2(capacidadKwh * factorCapacidad);
    const degradacionPct = round2((1 - factorCapacidad) * 100);

    // El ahorro se reduce proporcionalmente a la capacidad restante
    // y crece por el factor tarifario
    const factorTarifario = anio === 0 ? 1 : Math.pow(1 + tasaCrecimiento, anio - 1);
    const ahorroAjustado = anio === 0
      ? 0
      : round2(ahorroAnualBase * factorCapacidad * factorTarifario);

    // Recompra sugerida cuando capacidad cae debajo del umbral
    const requiereRecompra = factorCapacidad < umbralRecompraPct;

    filas.push({
      anio,
      capacidadEfectiva,
      degradacionPct,
      factorCapacidad: round2(factorCapacidad * 100) / 100,
      ahorroAjustado,
      requiereRecompra,
    });
  }

  return filas;
}

// ─── Tabla de inversión ──────────────────────────────────────────────────────

export function generarTablaInversion(
  ahorroAnualBase: number,
  inversionMxn: number,
  anios: number,
  tasaCrecimiento = TASA_CRECIMIENTO_TARIFARIO,
  tasaDegradacion = 0.02,
): FilaInversion[] {
  const filas: FilaInversion[] = [];

  // Año 0
  filas.push({
    anio: 0,
    inversion: round2(-inversionMxn),
    ahorroCfe: 0,
    ahorroNetoAnual: 0,
    ahorroAcumulado: round2(-inversionMxn),
  });

  let ahorroAcumulado = -inversionMxn;

  for (let anio = 1; anio <= anios; anio++) {
    // Ahorro base × crecimiento tarifario × factor de degradación
    const factorTarifario = Math.pow(1 + tasaCrecimiento, anio - 1);
    const factorCapacidad = Math.pow(1 - tasaDegradacion, anio);
    const ahorroCfe = ahorroAnualBase * factorTarifario * factorCapacidad;

    const ahorroNeto = ahorroCfe;
    ahorroAcumulado += ahorroNeto;

    filas.push({
      anio,
      inversion: 0,
      ahorroCfe: round2(ahorroCfe),
      ahorroNetoAnual: round2(ahorroNeto),
      ahorroAcumulado: round2(ahorroAcumulado),
    });
  }

  return filas;
}

// ─── ROI ─────────────────────────────────────────────────────────────────────

export function calcularRoiExacto(
  ahorroAnualBase: number,
  inversionMxn: number,
  tasaCrecimiento = TASA_CRECIMIENTO_TARIFARIO,
  tasaDegradacion = 0.02,
): number | null {
  let acumulado = -inversionMxn;
  for (let anio = 1; anio <= 100; anio++) {
    const factorTarifario = Math.pow(1 + tasaCrecimiento, anio - 1);
    const factorCapacidad = Math.pow(1 - tasaDegradacion, anio);
    const ahorro = ahorroAnualBase * factorTarifario * factorCapacidad;
    const acumuladoPrev = acumulado;
    acumulado += ahorro;
    if (acumulado >= 0) {
      const fraccion = ahorro > 0 ? Math.abs(acumuladoPrev) / ahorro : 0;
      return Math.round(((anio - 1) + fraccion) * 10) / 10;
    }
  }
  return null;
}

// ─── Pipeline completo ───────────────────────────────────────────────────────

export function ejecutarModeloFinanciero(
  params: ParametrosBESS,
  recibos: ReciboData[],
  tarifas: TarifaGDMTH[],
  estado: string,
  municipio: string,
): ResultadoFinanciero {
  const inversionMxn = params.precioUsd * params.tipoCambio;

  // 1. Calcular cargos de capacidad
  const cargos = calcularCargosCapacidad(recibos, tarifas, estado, municipio);

  // 2. Construir mapa de consumo BASE
  const consumoBaseMap: Record<string, number> = {};
  recibos.forEach((r) => {
    consumoBaseMap[r.mes.trim().toUpperCase()] = r.consumoBase;
  });

  // 3. Simulación BESS
  const simulacion = ejecutarSimulacionBess(
    params,
    cargos,
    tarifas,
    estado,
    municipio,
    consumoBaseMap,
  );

  // 4. Comparativo mensual
  const comparativo = generarComparativoMensual(simulacion);
  const totalRow = comparativo.find((c) => c.periodo === 'TOTAL ANUAL')!;

  const ahorroAnual = totalRow.ahorroNeto;

  // 5. Leer parámetros de degradación del proyecto
  const tasaDeg = params.tasaDegradacion ?? 0.02;
  const ciclosAn = params.ciclosAnuales ?? 300;

  // 6. Tabla de inversión (con degradación)
  const tablaInversion = generarTablaInversion(
    ahorroAnual,
    inversionMxn,
    params.aniosProyeccion,
    TASA_CRECIMIENTO_TARIFARIO,
    tasaDeg,
  );

  // 7. Tabla de degradación
  const degradacion = calcularDegradacion(
    params.capacidadKwh,
    ahorroAnual,
    params.aniosProyeccion,
    tasaDeg,
    ciclosAn,
  );

  // 8. ROI (con degradación)
  const roiExacto = calcularRoiExacto(ahorroAnual, inversionMxn, TASA_CRECIMIENTO_TARIFARIO, tasaDeg);

  // 9. Ahorro total vida útil
  const ultimaFila = tablaInversion[tablaInversion.length - 1];
  const ahorroTotalVidaUtil = ultimaFila.ahorroAcumulado;

  // 10. Año de recompra sugerido
  const filaRecompra = degradacion.find(f => f.requiereRecompra);
  const anioRecompra = filaRecompra ? filaRecompra.anio : null;

  // Degradación acumulada total al final de la proyección
  const ultimaDeg = degradacion[degradacion.length - 1];
  const degradacionAcumuladaTotal = ultimaDeg ? ultimaDeg.degradacionPct : 0;

  return {
    parametros: params,
    inversionMxn,
    simulacion,
    comparativo,
    totales: {
      cargoSinBess: totalRow.cargoSinBess,
      cargoConBess: totalRow.cargoConBess,
      ahorroCapacidad: totalRow.ahorroCapacidad,
      costoCargaBase: totalRow.costoCargaBase,
      ahorroNeto: totalRow.ahorroNeto,
      pctAhorroNeto: totalRow.pctAhorroNeto,
    },
    tablaInversion,
    degradacion,
    roiExacto,
    ahorroTotalVidaUtil,
    anioRecompra,
    degradacionAcumuladaTotal,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
