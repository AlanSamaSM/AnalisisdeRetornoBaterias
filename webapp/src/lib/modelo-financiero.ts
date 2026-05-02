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
  umbralRecompra?: number;
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

export interface EstructuraCostos {
  costoAnualTotal: number;
  capacidad: { total: number; pct: number };
  energiaPunta: { total: number; pct: number };
  energiaIntermedia: { total: number; pct: number };
  energiaBase: { total: number; pct: number };
  distribucion: { total: number; pct: number };
}

export interface FilaDesplazamiento {
  periodo: string;
  consumoBaseOriginal: number;   // kWh
  consumoBaseNuevo: number;      // kWh (base + carga BESS)
  consumoPuntaOriginal: number;  // kWh
  consumoPuntaNuevo: number;     // kWh (punta - descarga BESS)
  gastoBaseOriginal: number;     // $
  gastoBaseNuevo: number;        // $ (incluye costo carga BESS)
  gastoPuntaOriginal: number;    // $
  gastoPuntaNuevo: number;       // $ (reducido por descarga)
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
  estructuraCostos: EstructuraCostos;
  desplazamientoCarga: FilaDesplazamiento[];
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
  division: string,
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
    const tarifaBase = obtenerTarifaBase(tarifas, division, cargo.anio, mesTarifa);
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

// ─── Rellenar meses vacíos con promedios ────────────────────────────────────

/**
 * Detecta recibos vacíos (totalConsumo === 0 y demandas === 0) y los rellena
 * con el promedio de los meses válidos. Marca el mes con "(P)" para indicar
 * que fue promediado. Esto evita que meses en blanco distorsionen totales.
 */
export function rellenarMesesVacios(recibos: ReciboData[]): ReciboData[] {
  // Solo promediar campos de consumo/demanda/factores para simulación.
  // Los campos financieros (importeTotal, cargos) se preservan del recibo original
  // porque representan montos reales facturados, no estimaciones.
  const camposNumericos: (keyof ReciboData)[] = [
    'consumoPunta', 'consumoIntermedia', 'consumoBase', 'totalConsumo',
    'demandaPunta', 'demandaIntermedia', 'demandaBase', 'demandaMaxima',
    'factorCarga', 'factorPotencia',
  ];

  // Identificar recibos vacíos: totalConsumo === 0 AND todas las demandas === 0
  const esVacio = (r: ReciboData): boolean =>
    (r.totalConsumo === 0 || !r.totalConsumo) &&
    (r.demandaPunta === 0 || !r.demandaPunta) &&
    (r.demandaIntermedia === 0 || !r.demandaIntermedia) &&
    (r.demandaBase === 0 || !r.demandaBase);

  const validos = recibos.filter(r => !esVacio(r));
  const vacios = recibos.filter(r => esVacio(r));

  if (vacios.length === 0 || validos.length === 0) return recibos;

  // Calcular promedios de los meses válidos
  const promedios: Record<string, number> = {};
  for (const campo of camposNumericos) {
    const suma = validos.reduce((s, r) => s + (Number(r[campo]) || 0), 0);
    promedios[campo] = round2(suma / validos.length);
  }

  // Rellenar vacíos con promedios y marcar mes con "(P)"
  return recibos.map(r => {
    if (!esVacio(r)) return r;
    const relleno = { ...r };
    for (const campo of camposNumericos) {
      (relleno as any)[campo] = promedios[campo];
    }
    // Marcar el mes como promediado
    if (!relleno.mes.includes('(P)')) {
      relleno.mes = `${relleno.mes} (P)`;
    }
    return relleno;
  });
}

// ─── Pipeline completo ───────────────────────────────────────────────────────

export function ejecutarModeloFinanciero(
  params: ParametrosBESS,
  recibos: ReciboData[],
  tarifas: TarifaGDMTH[],
  division: string,
): ResultadoFinanciero {
  // 0. Rellenar meses vacíos con promedios
  const recibosCompletos = rellenarMesesVacios(recibos);

  const inversionMxn = params.precioUsd * params.tipoCambio;

  // 1. Calcular cargos de capacidad
  const cargos = calcularCargosCapacidad(recibosCompletos, tarifas, division);

  // 2. Construir mapa de consumo BASE
  const consumoBaseMap: Record<string, number> = {};
  recibosCompletos.forEach((r) => {
    consumoBaseMap[r.mes.trim().toUpperCase()] = r.consumoBase;
  });

  // 3. Simulación BESS
  const simulacion = ejecutarSimulacionBess(
    params,
    cargos,
    tarifas,
    division,
    consumoBaseMap,
  );

  // 4. Comparativo mensual
  const comparativo = generarComparativoMensual(simulacion);
  const totalRow = comparativo.find((c) => c.periodo === 'TOTAL ANUAL')!;

  const ahorroAnual = totalRow.ahorroNeto;

  // 5. Leer parámetros de degradación del proyecto
  const tasaDeg = params.tasaDegradacion ?? 0.02;
  const ciclosAn = params.ciclosAnuales ?? 300;
  const umbralRecompra = params.umbralRecompra ?? 0.70;

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
    umbralRecompra,
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

  // 11. Estructura de costos
  const estructuraCostos = calcularEstructuraCostos(recibosCompletos);

  // 12. Desplazamiento de carga
  const desplazamientoCarga = generarDesplazamientoCarga(simulacion, recibosCompletos);

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
    estructuraCostos,
    desplazamientoCarga,
    roiExacto,
    ahorroTotalVidaUtil,
    anioRecompra,
    degradacionAcumuladaTotal,
  };
}

// ─── Estructura de costos ────────────────────────────────────────────────────

/**
 * Calcula el desglose de costos anuales a partir de los recibos CFE.
 * Produce: costo total, y cada componente con su monto y % del total.
 */
export function calcularEstructuraCostos(
  recibos: ReciboData[],
): EstructuraCostos {
  const costoAnualTotal = recibos.reduce((s, r) => s + (r.importeTotal || 0), 0);
  const capacidadTotal = recibos.reduce((s, r) => s + (r.cargoCapacidadRecibo || 0), 0);
  const puntaTotal = recibos.reduce((s, r) => s + (r.cargoEnergiaPunta || 0), 0);
  const intermediaTotal = recibos.reduce((s, r) => s + (r.cargoEnergiaIntermedia || 0), 0);
  const baseTotal = recibos.reduce((s, r) => s + (r.cargoEnergiaBase || 0), 0);
  const distribucionTotal = recibos.reduce((s, r) => s + (r.cargoDistribucion || 0), 0);

  const pct = (v: number) => costoAnualTotal > 0 ? round2((v / costoAnualTotal) * 100) : 0;

  return {
    costoAnualTotal: round2(costoAnualTotal),
    capacidad: { total: round2(capacidadTotal), pct: pct(capacidadTotal) },
    energiaPunta: { total: round2(puntaTotal), pct: pct(puntaTotal) },
    energiaIntermedia: { total: round2(intermediaTotal), pct: pct(intermediaTotal) },
    energiaBase: { total: round2(baseTotal), pct: pct(baseTotal) },
    distribucion: { total: round2(distribucionTotal), pct: pct(distribucionTotal) },
  };
}

// ─── Desplazamiento de carga ─────────────────────────────────────────────────

/**
 * Genera la tabla de desplazamiento de carga (load shifting) mensual.
 * Muestra consumos y gastos originales vs. nuevos en base y punta.
 */
export function generarDesplazamientoCarga(
  simulacion: FilaSimulacion[],
  recibos: ReciboData[],
): FilaDesplazamiento[] {
  // Construir mapas de consumo punta y costos por periodo
  const consumoPuntaMap: Record<string, number> = {};
  const gastoBaseOrigMap: Record<string, number> = {};
  const gastoPuntaOrigMap: Record<string, number> = {};

  for (const r of recibos) {
    const key = r.mes.trim().toUpperCase();
    consumoPuntaMap[key] = r.consumoPunta;
    gastoBaseOrigMap[key] = r.cargoEnergiaBase || 0;
    gastoPuntaOrigMap[key] = r.cargoEnergiaPunta || 0;
  }

  const filas: FilaDesplazamiento[] = simulacion.map((s) => {
    const periodoKey = s.periodo.trim().toUpperCase();
    const consumoPuntaOriginal = consumoPuntaMap[periodoKey] || 0;
    // La energía descargada del BESS en punta es la misma que la cargada en base
    const consumoPuntaNuevo = Math.max(0, consumoPuntaOriginal - s.energiaCargaBess);

    const gastoBaseOriginal = gastoBaseOrigMap[periodoKey] || 0;
    const gastoPuntaOriginal = gastoPuntaOrigMap[periodoKey] || 0;

    // Gasto nuevo en base = gasto original + costo de cargar BESS en base
    const gastoBaseNuevo = gastoBaseOriginal + s.costoCargaBase;
    // Gasto nuevo en punta se reduce proporcionalmente al consumo desplazado
    const factorReduccionPunta = consumoPuntaOriginal > 0
      ? consumoPuntaNuevo / consumoPuntaOriginal
      : 1;
    const gastoPuntaNuevo = round2(gastoPuntaOriginal * factorReduccionPunta);

    return {
      periodo: s.periodo,
      consumoBaseOriginal: s.consumoBaseOriginal,
      consumoBaseNuevo: s.consumoBaseNuevo,
      consumoPuntaOriginal: round2(consumoPuntaOriginal),
      consumoPuntaNuevo: round2(consumoPuntaNuevo),
      gastoBaseOriginal: round2(gastoBaseOriginal),
      gastoBaseNuevo: round2(gastoBaseNuevo),
      gastoPuntaOriginal: round2(gastoPuntaOriginal),
      gastoPuntaNuevo: round2(gastoPuntaNuevo),
    };
  });

  // Fila TOTAL
  const sum = (arr: FilaDesplazamiento[], key: keyof FilaDesplazamiento) =>
    round2(arr.reduce((s, f) => s + (f[key] as number), 0));

  filas.push({
    periodo: 'TOTAL ANUAL',
    consumoBaseOriginal: sum(filas, 'consumoBaseOriginal'),
    consumoBaseNuevo: sum(filas, 'consumoBaseNuevo'),
    consumoPuntaOriginal: sum(filas, 'consumoPuntaOriginal'),
    consumoPuntaNuevo: sum(filas, 'consumoPuntaNuevo'),
    gastoBaseOriginal: sum(filas, 'gastoBaseOriginal'),
    gastoBaseNuevo: sum(filas, 'gastoBaseNuevo'),
    gastoPuntaOriginal: sum(filas, 'gastoPuntaOriginal'),
    gastoPuntaNuevo: sum(filas, 'gastoPuntaNuevo'),
  });

  return filas;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
