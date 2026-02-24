// =============================================================================
// PARSEAR RECIBO — TypeScript port of ingestar_recibos.py
// Extracción y parseo de recibos CFE (GDMTH) usando pdf-parse
// =============================================================================

// NOTE: pdfjs-dist is used server-side only. If clip-region extraction is
// needed in the future, we can switch to a layout-aware library. For MVP
// the full-page text + regex approach handles most receipts.

import type { ReciboData } from './calcular-capacidad';

// ─── Constantes ──────────────────────────────────────────────────────────────

export const MESES_MAP: Record<string, string> = {
  ENE: 'Enero', FEB: 'Febrero', MAR: 'Marzo', ABR: 'Abril',
  MAY: 'Mayo', JUN: 'Junio', JUL: 'Julio', AGO: 'Agosto',
  SEP: 'Septiembre', OCT: 'Octubre', NOV: 'Noviembre', DIC: 'Diciembre',
  ENERO: 'Enero', FEBRERO: 'Febrero', MARZO: 'Marzo', ABRIL: 'Abril',
  MAYO: 'Mayo', JUNIO: 'Junio', JULIO: 'Julio', AGOSTO: 'Agosto',
  SEPTIEMBRE: 'Septiembre', OCTUBRE: 'Octubre', NOVIEMBRE: 'Noviembre',
  DICIEMBRE: 'Diciembre',
};

export const MESES_NUMERO: Record<string, number> = {
  Enero: 1, Febrero: 2, Marzo: 3, Abril: 4,
  Mayo: 5, Junio: 6, Julio: 7, Agosto: 8,
  Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};

const MESES_NUM_MAP: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

const ESTADOS_CFE: Record<string, string> = {
  AGS: 'AGUASCALIENTES', BC: 'BAJA CALIFORNIA', BCS: 'BAJA CALIFORNIA SUR',
  CAMP: 'CAMPECHE', CHIS: 'CHIAPAS', CHIH: 'CHIHUAHUA',
  CDMX: 'CIUDAD DE MEXICO', COAH: 'COAHUILA', COL: 'COLIMA',
  DGO: 'DURANGO', GTO: 'GUANAJUATO', GRO: 'GUERRERO',
  HGO: 'HIDALGO', JAL: 'JALISCO', MEX: 'ESTADO DE MEXICO',
  MICH: 'MICHOACAN', MOR: 'MORELOS', NAY: 'NAYARIT',
  NL: 'NUEVO LEON', OAX: 'OAXACA', PUE: 'PUEBLA',
  QRO: 'QUERETARO', QROO: 'QUINTANA ROO', SLP: 'SAN LUIS POTOSI',
  SIN: 'SINALOA', SON: 'SONORA', TAB: 'TABASCO',
  TAMPS: 'TAMAULIPAS', TLAX: 'TLAXCALA', VER: 'VERACRUZ',
  YUC: 'YUCATAN', ZAC: 'ZACATECAS',
};

const CIUDADES_ESTADO: Record<string, string> = {
  TORREON: 'COAHUILA', SALTILLO: 'COAHUILA', MONCLOVA: 'COAHUILA',
  MONTERREY: 'NUEVO LEON', 'SAN PEDRO': 'NUEVO LEON',
  GUADALAJARA: 'JALISCO', ZAPOPAN: 'JALISCO',
  PUEBLA: 'PUEBLA', QUERETARO: 'QUERETARO',
  'SAN JUAN DEL RIO': 'QUERETARO', 'SN JUAN DEL RIO': 'QUERETARO',
  LEON: 'GUANAJUATO', CELAYA: 'GUANAJUATO',
  CHIHUAHUA: 'CHIHUAHUA', JUAREZ: 'CHIHUAHUA', 'CD JUAREZ': 'CHIHUAHUA',
  HERMOSILLO: 'SONORA', TIJUANA: 'BAJA CALIFORNIA',
  MERIDA: 'YUCATAN', CANCUN: 'QUINTANA ROO',
  AGUASCALIENTES: 'AGUASCALIENTES', DURANGO: 'DURANGO',
  'TUXTLA GUTIERREZ': 'CHIAPAS', VILLAHERMOSA: 'TABASCO',
  TAMPICO: 'TAMAULIPAS', REYNOSA: 'TAMAULIPAS',
  MORELIA: 'MICHOACAN', TOLUCA: 'ESTADO DE MEXICO',
  CUERNAVACA: 'MORELOS', OAXACA: 'OAXACA',
  MAZATLAN: 'SINALOA', CULIACAN: 'SINALOA',
  VERACRUZ: 'VERACRUZ', XALAPA: 'VERACRUZ',
  'SAN LUIS POTOSI': 'SAN LUIS POTOSI', ZACATECAS: 'ZACATECAS',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function limpiarNumero(val: string | undefined): number {
  if (!val) return 0;
  const limpio = val.replace(/,/g, '').replace(/\s/g, '').trim();
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

function detectarTemporada(mesNum: number): string {
  return mesNum >= 4 && mesNum <= 10 ? 'VERANO' : 'INVIERNO';
}

// ─── Extraction functions ────────────────────────────────────────────────────

function extraerEstadoMunicipio(texto: string): { estado: string; municipio: string } {
  let estado = '';
  let municipio = '';

  const match = texto.match(
    /([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s.]+?)\s*,\s*([A-ZÁÉÍÓÚÑ.]{2,6})\s*\.?\s*$/m,
  );
  if (match) {
    const ciudadRaw = match[1].trim().replace(/,$/, '').trim();
    const estadoAbrev = match[2].trim().replace(/\.$/, '');
    const upper = estadoAbrev.toUpperCase();

    if (upper in ESTADOS_CFE) {
      estado = ESTADOS_CFE[upper];
    }
    municipio = ciudadRaw.toUpperCase();

    for (const [ciudad, est] of Object.entries(CIUDADES_ESTADO)) {
      if (ciudad.includes(municipio) || municipio.includes(ciudad)) {
        municipio = ciudad;
        if (!estado) estado = est;
        break;
      }
    }
  }

  return { estado, municipio };
}

interface PeriodoInfo {
  diaInicio: number;
  mesInicio: string;
  anioInicio: number;
  diaFin: number;
  mesFin: string;
  anioFin: number;
  mesNombre: string;
  anio: number;
}

function extraerPeriodo(texto: string): PeriodoInfo | null {
  const match = texto.match(
    /PERIODO\s+FACTURADO\s*:\s*(\d{1,2})\s+(\w{3})\s+(\d{2,4})\s*[-–]\s*(\d{1,2})\s+(\w{3})\s+(\d{2,4})/i,
  );
  if (!match) return null;

  const diaInicio = parseInt(match[1]);
  const mesInicioAbrev = match[2].toUpperCase();
  let anioInicio = match[3];
  const diaFin = parseInt(match[4]);
  const mesFinAbrev = match[5].toUpperCase();
  let anioFin = match[6];

  if (anioFin.length === 2) anioFin = '20' + anioFin;
  if (anioInicio.length === 2) anioInicio = '20' + anioInicio;

  const mesNombre = MESES_MAP[mesFinAbrev] || mesFinAbrev;

  return {
    diaInicio,
    mesInicio: mesInicioAbrev,
    anioInicio: parseInt(anioInicio),
    diaFin,
    mesFin: mesFinAbrev,
    anioFin: parseInt(anioFin),
    mesNombre,
    anio: parseInt(anioFin),
  };
}

function calcularDias(periodo: PeriodoInfo): number {
  try {
    const mesIni = MESES_NUM_MAP[periodo.mesInicio] || 1;
    const mesFin = MESES_NUM_MAP[periodo.mesFin] || 1;
    const fechaInicio = new Date(periodo.anioInicio, mesIni - 1, periodo.diaInicio);
    const fechaFin = new Date(periodo.anioFin, mesFin - 1, periodo.diaFin);
    const dias = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(dias, 1);
  } catch {
    return 30;
  }
}

function extraerConsumosKwh(texto: string) {
  // Multiple regex patterns for different PDF text layouts
  const patrones_base = [
    /kWh\s+base\s*[:\s]\s*([\d,]+)/i,
    /kWh\s+base\s*\n?\s*([\d,]+)/i,
    /Consumo\s+Base\s+([\d,]+)/i,
    /consumo\s*kWh.*?base\s*([\d,]+)/i,
    /base\s*\n?\s*([\d,]+)\s*kWh/i,
  ];
  const patrones_inter = [
    /kWh\s+intermedia\s*[:\s]\s*([\d,]+)/i,
    /kWh\s+intermedia\s*\n?\s*([\d,]+)/i,
    /Consumo\s+Intermedi[oa]\s+([\d,]+)/i,
    /intermedia\s*\n?\s*([\d,]+)\s*kWh/i,
  ];
  const patrones_punta = [
    /kWh\s+punta\s*[:\s]\s*([\d,]+)/i,
    /kWh\s+punta\s*\n?\s*([\d,]+)/i,
    /Consumo\s+Punta\s+([\d,]+)/i,
    /punta\s*\n?\s*([\d,]+)\s*kWh/i,
  ];

  function buscarPrimero(patrones: RegExp[], txt: string): string | undefined {
    for (const p of patrones) {
      const m = txt.match(p);
      if (m?.[1]) return m[1];
    }
    return undefined;
  }

  const base = limpiarNumero(buscarPrimero(patrones_base, texto));
  const intermedia = limpiarNumero(buscarPrimero(patrones_inter, texto));
  const punta = limpiarNumero(buscarPrimero(patrones_punta, texto));

  return {
    consumoPunta: punta,
    consumoIntermedia: intermedia,
    consumoBase: base,
    totalConsumo: punta + intermedia + base,
  };
}

function extraerDemandasKw(texto: string) {
  const patrones_base = [
    /kW\s+base\s*[:\s]\s*([\d,]+)/i,
    /kW\s+base\s*\n?\s*([\d,]+)/i,
    /Demanda\s+Base\s+([\d,]+)/i,
  ];
  const patrones_inter = [
    /kW\s+intermedia\s*[:\s]\s*([\d,]+)/i,
    /kW\s+intermedia\s*\n?\s*([\d,]+)/i,
    /Demanda\s+Intermedia\s+([\d,]+)/i,
  ];
  const patrones_punta = [
    /kW\s+punta\s*[:\s]\s*([\d,]+)/i,
    /kW\s+punta\s*\n?\s*([\d,]+)/i,
    /Demanda\s+Punta\s+([\d,]+)/i,
  ];
  const patrones_max = [
    /KWMax\s*[:\s]\s*([\d,]+)/i,
    /KWMax\s*\n?\s*([\d,]+)/i,
    /kW\s*[Mm]ax\s*[:\s]\s*([\d,]+)/i,
    /[Dd]emanda\s+[Mm][aá]x(?:ima)?\s+([\d,]+)/i,
  ];

  function buscarPrimero(patrones: RegExp[], txt: string): string | undefined {
    for (const p of patrones) {
      const m = txt.match(p);
      if (m?.[1]) return m[1];
    }
    return undefined;
  }

  const base = limpiarNumero(buscarPrimero(patrones_base, texto));
  const intermedia = limpiarNumero(buscarPrimero(patrones_inter, texto));
  const punta = limpiarNumero(buscarPrimero(patrones_punta, texto));
  let maxima = limpiarNumero(buscarPrimero(patrones_max, texto));

  if (maxima === 0) {
    maxima = Math.max(punta, intermedia, base);
  }

  return {
    demandaPunta: punta,
    demandaIntermedia: intermedia,
    demandaBase: base,
    demandaMaxima: maxima,
  };
}

function extraerFactorPotencia(texto: string): number {
  const match = texto.match(/Factor\s+de\s+potencia\s*%?\s*\n?\s*([\d.]+)/i);
  return match ? parseFloat(match[1]) : 0;
}

function extraerTarifa(texto: string): string {
  const match = texto.match(/TARIFA\s*:\s*(\w+)/i);
  return match ? match[1].toUpperCase() : '';
}

function tieneSubperiodos(texto: string): boolean {
  return /subper[ií]odo/i.test(texto);
}

// ─── Sub-periodo parsing (improved for pdfjs-dist two-column text) ───────────

interface SubperiodoBloque {
  texto: string;
  numSub: number;
}

interface BloqueData {
  consumoBase: number;
  consumoIntermedia: number;
  consumoPunta: number;
  demandaBase: number;
  demandaIntermedia: number;
  demandaPunta: number;
}

/**
 * Extract ALL pairs of consumo/demanda data from the text.
 * In two-column PDFs, pdfjs-dist merges columns so values appear as pairs
 * on the same line: "kWh base 42,540 kWh base 35,200" → two blocks
 * OR as "Consumo Base 42,540 Consumo Base 35,200"
 */
function extraerMultiplesBloques(texto: string): BloqueData[] {
  // Try finding paired kWh/kW values (two-column merge)
  const re_base_all = /(?:kWh|Consumo)\s+[Bb]ase\s*[\s:]\s*([\d,]+)/gi;
  const re_inter_all = /(?:kWh|Consumo)\s+[Ii]ntermedi[oa]\s*[\s:]\s*([\d,]+)/gi;
  const re_punta_all = /(?:kWh|Consumo)\s+[Pp]unta\s*[\s:]\s*([\d,]+)/gi;
  const re_dbase_all = /(?:kW|Demanda)\s+[Bb]ase\s*[\s:]\s*([\d,]+)/gi;
  const re_dinter_all = /(?:kW|Demanda)\s+[Ii]ntermedia\s*[\s:]\s*([\d,]+)/gi;
  const re_dpunta_all = /(?:kW|Demanda)\s+[Pp]unta\s*[\s:]\s*([\d,]+)/gi;

  function allMatches(re: RegExp, txt: string): number[] {
    const results: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(txt)) !== null) {
      results.push(limpiarNumero(m[1]));
    }
    return results;
  }

  const bases = allMatches(re_base_all, texto);
  const inters = allMatches(re_inter_all, texto);
  const puntas = allMatches(re_punta_all, texto);
  const dbases = allMatches(re_dbase_all, texto);
  const dinters = allMatches(re_dinter_all, texto);
  const dpuntas = allMatches(re_dpunta_all, texto);

  // If we have at least 2 values for some metric, we have 2 blocks
  const maxCount = Math.max(bases.length, inters.length, puntas.length);

  if (maxCount < 2) {
    // Only one set - return it as a single block
    if (maxCount === 0) return [];
    return [{
      consumoBase: bases[0] || 0,
      consumoIntermedia: inters[0] || 0,
      consumoPunta: puntas[0] || 0,
      demandaBase: dbases[0] || 0,
      demandaIntermedia: dinters[0] || 0,
      demandaPunta: dpuntas[0] || 0,
    }];
  }

  // Two data sets found
  return [
    {
      consumoBase: bases[0] || 0,
      consumoIntermedia: inters[0] || 0,
      consumoPunta: puntas[0] || 0,
      demandaBase: dbases[0] || 0,
      demandaIntermedia: dinters[0] || 0,
      demandaPunta: dpuntas[0] || 0,
    },
    {
      consumoBase: bases[1] || 0,
      consumoIntermedia: inters[1] || 0,
      consumoPunta: puntas[1] || 0,
      demandaBase: dbases[1] || 0,
      demandaIntermedia: dinters[1] || 0,
      demandaPunta: dpuntas[1] || 0,
    },
  ];
}

/**
 * Build a ParsedRecibo for a sub-periodo from extracted data block.
 */
function crearSubperiodo(
  numSub: number,
  data: BloqueData,
  dateMatch: RegExpExecArray | undefined,
  base: Partial<ParsedRecibo>,
  archivo: string,
): ParsedRecibo {
  const resultado: ParsedRecibo = { ...base } as ParsedRecibo;
  resultado.archivoOrigen = archivo;

  // Set mes name
  const periodoPadre = base.mes || '';
  resultado.mes = `${periodoPadre} sub-periodo ${numSub}`;
  resultado.mesNum = MESES_NUMERO[periodoPadre] || 0;

  // Temporada
  if (resultado.mesNum === 4) {
    resultado.temporada = numSub === 1 ? 'INVIERNO' : 'VERANO';
  } else if (resultado.mesNum === 10) {
    resultado.temporada = numSub === 1 ? 'VERANO' : 'INVIERNO';
  } else {
    resultado.temporada = detectarTemporada(resultado.mesNum);
  }

  // Dates
  if (dateMatch) {
    const diaInicio = parseInt(dateMatch[1]);
    const mesInicioAbrev = dateMatch[2].toUpperCase();
    let anioInicio = dateMatch[3];
    const diaFin = parseInt(dateMatch[4]);
    const mesFinAbrev = dateMatch[5].toUpperCase();
    let anioFin = dateMatch[6];
    if (anioFin.length === 2) anioFin = '20' + anioFin;
    if (anioInicio.length === 2) anioInicio = '20' + anioInicio;
    resultado.anio = parseInt(anioFin);

    try {
      const mIni = MESES_NUM_MAP[mesInicioAbrev] || 1;
      const mFin = MESES_NUM_MAP[mesFinAbrev] || 1;
      const fechaInicio = new Date(parseInt(anioInicio), mIni - 1, diaInicio);
      const fechaFin = new Date(parseInt(anioFin), mFin - 1, diaFin);
      resultado.dias = Math.max(
        Math.round((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)),
        1,
      );
    } catch {
      resultado.dias = 15;
    }
  } else {
    resultado.dias = 15;
  }

  // Data from extracted block
  resultado.consumoBase = data.consumoBase;
  resultado.consumoIntermedia = data.consumoIntermedia;
  resultado.consumoPunta = data.consumoPunta;
  resultado.totalConsumo = data.consumoPunta + data.consumoIntermedia + data.consumoBase;
  resultado.demandaBase = data.demandaBase;
  resultado.demandaIntermedia = data.demandaIntermedia;
  resultado.demandaPunta = data.demandaPunta;
  resultado.demandaMaxima = Math.max(data.demandaPunta, data.demandaIntermedia, data.demandaBase);

  // Factor de carga
  if (resultado.demandaPunta > 0 && resultado.dias > 0) {
    resultado.factorCarga = Math.round(
      (resultado.totalConsumo / (24 * resultado.dias * resultado.demandaPunta)) * 100 * 100,
    ) / 100;
  } else {
    resultado.factorCarga = 0;
  }

  return resultado;
}

/**
 * Build sub-periodo with inherited base data and date extraction
 */
function parsearBloqueSubperiodoMejorado(
  numSub: number,
  base: Partial<ParsedRecibo>,
  dateMatch: RegExpExecArray | undefined,
  texto: string,
): ParsedRecibo {
  const resultado: ParsedRecibo = { ...base } as ParsedRecibo;

  const periodoPadre = base.mes || '';
  resultado.mes = `${periodoPadre} sub-periodo ${numSub}`;
  resultado.mesNum = MESES_NUMERO[periodoPadre] || 0;

  if (resultado.mesNum === 4) {
    resultado.temporada = numSub === 1 ? 'INVIERNO' : 'VERANO';
  } else if (resultado.mesNum === 10) {
    resultado.temporada = numSub === 1 ? 'VERANO' : 'INVIERNO';
  } else {
    resultado.temporada = detectarTemporada(resultado.mesNum);
  }

  if (dateMatch) {
    const diaInicio = parseInt(dateMatch[1]);
    const mesInicioAbrev = dateMatch[2].toUpperCase();
    let anioInicio = dateMatch[3];
    const diaFin = parseInt(dateMatch[4]);
    const mesFinAbrev = dateMatch[5].toUpperCase();
    let anioFin = dateMatch[6];
    if (anioFin.length === 2) anioFin = '20' + anioFin;
    if (anioInicio.length === 2) anioInicio = '20' + anioInicio;
    resultado.anio = parseInt(anioFin);

    try {
      const mIni = MESES_NUM_MAP[mesInicioAbrev] || 1;
      const mFin = MESES_NUM_MAP[mesFinAbrev] || 1;
      const fechaInicio = new Date(parseInt(anioInicio), mIni - 1, diaInicio);
      const fechaFin = new Date(parseInt(anioFin), mFin - 1, diaFin);
      resultado.dias = Math.max(
        Math.round((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)),
        1,
      );
    } catch {
      resultado.dias = 15;
    }
  } else {
    resultado.dias = 15;
  }

  resultado.factorCarga = 0;
  resultado.advertencias = [...(resultado.advertencias || [])];

  return resultado;
}

function parsearBloqueSubperiodo(
  bloque: string,
  numSub: number,
  datosComunes: Partial<ParsedRecibo>,
): ParsedRecibo {
  const resultado: ParsedRecibo = { ...datosComunes } as ParsedRecibo;

  // Extraer rango de fechas
  const matchFechas = bloque.match(
    /(\d{1,2})\s+(\w{3})\s+(\d{2,4})\s*[-–]\s*(\d{1,2})\s+(\w{3})\s+(\d{2,4})/i,
  );

  if (matchFechas) {
    const diaInicio = parseInt(matchFechas[1]);
    const mesInicioAbrev = matchFechas[2].toUpperCase();
    let anioInicio = matchFechas[3];
    const diaFin = parseInt(matchFechas[4]);
    const mesFinAbrev = matchFechas[5].toUpperCase();
    let anioFin = matchFechas[6];

    if (anioFin.length === 2) anioFin = '20' + anioFin;
    if (anioInicio.length === 2) anioInicio = '20' + anioInicio;

    resultado.anio = parseInt(anioFin);

    try {
      const mIni = MESES_NUM_MAP[mesInicioAbrev] || 1;
      const mFin = MESES_NUM_MAP[mesFinAbrev] || 1;
      const fechaInicio = new Date(parseInt(anioInicio), mIni - 1, diaInicio);
      const fechaFin = new Date(parseInt(anioFin), mFin - 1, diaFin);
      resultado.dias = Math.max(
        Math.round((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)),
        1,
      );
    } catch {
      resultado.dias = 15;
    }
  } else {
    resultado.dias = 15;
  }

  // Nombre del mes con sufijo
  const periodoPadre = datosComunes.mes || '';
  resultado.mes = `${periodoPadre} sub-periodo ${numSub}`;
  resultado.mesNum = MESES_NUMERO[periodoPadre] || 0;

  // Temporada
  if (resultado.mesNum === 4) {
    resultado.temporada = numSub === 1 ? 'INVIERNO' : 'VERANO';
  } else if (resultado.mesNum === 10) {
    resultado.temporada = numSub === 1 ? 'VERANO' : 'INVIERNO';
  } else {
    resultado.temporada = detectarTemporada(resultado.mesNum);
  }

  // Consumos - try multiple patterns (Consumo Base, kWh base, etc.)
  function matchConsumoBloque(label: string, txt: string): number {
    const patrones = [
      new RegExp(`Consumo\\s+${label}\\s+([\\d,]+)`, 'i'),
      new RegExp(`kWh\\s+${label}\\s*[:\\s]\\s*([\\d,]+)`, 'i'),
      new RegExp(`${label}\\s*\\n?\\s*([\\d,]+)\\s*kWh`, 'i'),
    ];
    for (const p of patrones) {
      const m = txt.match(p);
      if (m?.[1]) return limpiarNumero(m[1]);
    }
    return 0;
  }

  function matchDemandaBloque(label: string, txt: string): number {
    const patrones = [
      new RegExp(`Demanda\\s+${label}\\s+([\\d,]+)`, 'i'),
      new RegExp(`kW\\s+${label}\\s*[:\\s]\\s*([\\d,]+)`, 'i'),
    ];
    for (const p of patrones) {
      const m = txt.match(p);
      if (m?.[1]) return limpiarNumero(m[1]);
    }
    return 0;
  }

  resultado.consumoBase = matchConsumoBloque('Base', bloque);
  resultado.consumoIntermedia = matchConsumoBloque('Intermedi[oa]', bloque);
  resultado.consumoPunta = matchConsumoBloque('Punta', bloque);
  resultado.totalConsumo =
    resultado.consumoPunta + resultado.consumoIntermedia + resultado.consumoBase;

  // Demandas
  resultado.demandaBase = matchDemandaBloque('Base', bloque);
  resultado.demandaIntermedia = matchDemandaBloque('Intermedia', bloque);
  resultado.demandaPunta = matchDemandaBloque('Punta', bloque);
  resultado.demandaMaxima = Math.max(
    resultado.demandaPunta,
    resultado.demandaIntermedia,
    resultado.demandaBase,
  );

  // Factor de potencia
  const fpMatch = bloque.match(/Factor\s+de\s+potencia\s*%?\s+([\d.]+)/i);
  resultado.factorPotencia = fpMatch
    ? parseFloat(fpMatch[1])
    : datosComunes.factorPotencia || 0;

  // Factor de carga (calculado con demanda punta)
  if (resultado.demandaPunta > 0 && resultado.dias > 0) {
    resultado.factorCarga = Math.round(
      (resultado.totalConsumo / (24 * resultado.dias * resultado.demandaPunta)) * 100 * 100,
    ) / 100;
  } else {
    resultado.factorCarga = 0;
  }

  return resultado;
}

// ─── Main parse function ─────────────────────────────────────────────────────

export interface ParsedRecibo {
  archivoOrigen: string;
  tarifa: string;
  estado: string;
  municipio: string;
  anio: number;
  mes: string;
  mesNum: number;
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
  advertencias: string[];
}

/**
 * Parsea el texto extraído de un recibo CFE.
 * Returns 1 or 2 elements (sub-periodos for Abril/Octubre).
 */
export function parsearRecibo(
  texto: string,
  nombreArchivo = '',
): ParsedRecibo[] {
  const tarifa = extraerTarifa(texto);
  const { estado, municipio } = extraerEstadoMunicipio(texto);
  const periodoInfo = extraerPeriodo(texto);

  const base: Partial<ParsedRecibo> = {
    archivoOrigen: nombreArchivo,
    tarifa,
    estado,
    municipio,
    advertencias: [],
  };

  if (tarifa && tarifa !== 'GDMTH') {
    base.advertencias = [`Tarifa ${tarifa} no es GDMTH`];
  }

  if (periodoInfo) {
    base.anio = periodoInfo.anio;
    base.mes = periodoInfo.mesNombre;
    base.mesNum = MESES_NUMERO[periodoInfo.mesNombre] || 0;
    base.dias = calcularDias(periodoInfo);
  } else {
    base.anio = 0;
    base.mes = '';
    base.mesNum = 0;
    base.dias = 30;
    base.advertencias!.push('No se detectó el periodo facturado');
  }

  base.temporada = base.mesNum! > 0 ? detectarTemporada(base.mesNum!) : '';

  // Consumos & Demandas
  const consumos = extraerConsumosKwh(texto);
  const demandas = extraerDemandasKw(texto);
  Object.assign(base, consumos, demandas);

  // Factor de potencia
  base.factorPotencia = extraerFactorPotencia(texto);

  // Factor de carga (calculated using demanda punta, NOT demanda maxima)
  if ((base.demandaPunta || 0) > 0 && (base.dias || 0) > 0) {
    base.factorCarga = Math.round(
      ((base.totalConsumo || 0) / (24 * base.dias! * base.demandaPunta!)) * 100 * 100,
    ) / 100;
  } else {
    base.factorCarga = 0;
  }

  // ── Sub-periodos (Abril / Octubre) ──
  if (tieneSubperiodos(texto)) {
    // pdfjs-dist merges two-column layouts into single lines.
    // Strategy: find ALL date ranges and data blocks, then split.
    const subMatches: RegExpExecArray[] = [];
    const subRe = /subper[ií]odo\s*(\d)?/gi;
    let m: RegExpExecArray | null;
    while ((m = subRe.exec(texto)) !== null) {
      subMatches.push(m);
    }

    if (subMatches.length >= 2) {
      // Find ALL date ranges in the text
      const dateRanges: Array<{ match: RegExpExecArray; start: number }> = [];
      const dateRe = /(\d{1,2})\s+(\w{3})\s+(\d{2,4})\s*[-–]\s*(\d{1,2})\s+(\w{3})\s+(\d{2,4})/gi;
      let dm: RegExpExecArray | null;
      while ((dm = dateRe.exec(texto)) !== null) {
        // Skip the main PERIODO FACTURADO date range
        const before = texto.substring(Math.max(0, dm.index - 30), dm.index);
        if (!/PERIODO\s+FACTURADO/i.test(before)) {
          dateRanges.push({ match: dm, start: dm.index });
        }
      }

      // Find ALL sets of consumo/demanda data using paired patterns
      const dataBlocks = extraerMultiplesBloques(texto);

      if (dataBlocks.length >= 2) {
        // We found two sets of data — assign to sub-periodos
        const sub1 = crearSubperiodo(1, dataBlocks[0], dateRanges[0]?.match, base, nombreArchivo);
        const sub2 = crearSubperiodo(2, dataBlocks[1], dateRanges[1]?.match, base, nombreArchivo);
        return [sub1, sub2];
      } else if (dataBlocks.length === 1) {
        // Only one data block found — try splitting by date ranges
        // The full text data is in base already, assign to sub-periodo with more days
        const sub1 = parsearBloqueSubperiodoMejorado(1, base, dateRanges[0]?.match, texto);
        sub1.archivoOrigen = nombreArchivo;
        const sub2 = parsearBloqueSubperiodoMejorado(2, base, dateRanges[1]?.match, texto);
        sub2.archivoOrigen = nombreArchivo;

        // Distribute consumption proportionally by days
        const totalDias = sub1.dias + sub2.dias;
        if (totalDias > 0 && (base.totalConsumo || 0) > 0) {
          const ratio1 = sub1.dias / totalDias;
          const ratio2 = sub2.dias / totalDias;
          sub1.consumoBase = Math.round((base.consumoBase || 0) * ratio1);
          sub1.consumoIntermedia = Math.round((base.consumoIntermedia || 0) * ratio1);
          sub1.consumoPunta = Math.round((base.consumoPunta || 0) * ratio1);
          sub1.totalConsumo = sub1.consumoPunta + sub1.consumoIntermedia + sub1.consumoBase;
          sub1.demandaBase = base.demandaBase || 0;
          sub1.demandaIntermedia = base.demandaIntermedia || 0;
          sub1.demandaPunta = base.demandaPunta || 0;
          sub1.demandaMaxima = base.demandaMaxima || 0;

          sub2.consumoBase = Math.round((base.consumoBase || 0) * ratio2);
          sub2.consumoIntermedia = Math.round((base.consumoIntermedia || 0) * ratio2);
          sub2.consumoPunta = Math.round((base.consumoPunta || 0) * ratio2);
          sub2.totalConsumo = sub2.consumoPunta + sub2.consumoIntermedia + sub2.consumoBase;
          sub2.demandaBase = base.demandaBase || 0;
          sub2.demandaIntermedia = base.demandaIntermedia || 0;
          sub2.demandaPunta = base.demandaPunta || 0;
          sub2.demandaMaxima = base.demandaMaxima || 0;
        }

        // Recalculate factor de carga for each sub
        for (const sub of [sub1, sub2]) {
          if (sub.demandaPunta > 0 && sub.dias > 0) {
            sub.factorCarga = Math.round(
              (sub.totalConsumo / (24 * sub.dias * sub.demandaPunta)) * 100 * 100,
            ) / 100;
          }
        }

        return [sub1, sub2];
      } else {
        // Fallback: split text at markers (old method)
        const idx1 = subMatches[0].index;
        const idx2 = subMatches[1].index;
        const bloque1 = texto.substring(idx1, idx2);
        const bloque2 = texto.substring(idx2);

        const sub1 = parsearBloqueSubperiodo(bloque1, 1, base);
        sub1.archivoOrigen = nombreArchivo;
        const sub2 = parsearBloqueSubperiodo(bloque2, 2, base);
        sub2.archivoOrigen = nombreArchivo;
        return [sub1, sub2];
      }
    }
  }

  return [base as ParsedRecibo];
}

/**
 * Validates parsed receipt data and returns warnings.
 */
export function validarResultado(resultado: ParsedRecibo): string[] {
  const advertencias = [...(resultado.advertencias || [])];

  if (!resultado.estado) advertencias.push('No se detectó el estado');
  if (!resultado.municipio) advertencias.push('No se detectó el municipio');
  if (!resultado.mes) advertencias.push('No se detectó el mes');
  if (!resultado.anio) advertencias.push('No se detectó el año');

  if (resultado.totalConsumo === 0) {
    advertencias.push('Consumo total es 0');
  } else {
    const suma =
      resultado.consumoPunta + resultado.consumoIntermedia + resultado.consumoBase;
    if (Math.abs(suma - resultado.totalConsumo) > 1) {
      advertencias.push(
        `Suma de consumos (${suma.toFixed(0)}) ≠ Total (${resultado.totalConsumo.toFixed(0)})`,
      );
    }
  }

  if (resultado.demandaMaxima === 0) {
    advertencias.push('Demanda máxima es 0');
  }

  if (resultado.factorCarga <= 0 || resultado.factorCarga > 100) {
    advertencias.push(`Factor de carga fuera de rango: ${resultado.factorCarga}%`);
  }

  if (resultado.factorPotencia > 0 && (resultado.factorPotencia < 80 || resultado.factorPotencia > 100)) {
    advertencias.push(`Factor de potencia inusual: ${resultado.factorPotencia}%`);
  }

  return advertencias;
}

/**
 * Converts ParsedRecibo to the ReciboData format used by the financial model
 */
export function toReciboData(parsed: ParsedRecibo): ReciboData {
  return {
    mes: parsed.mes,
    mesNum: parsed.mesNum,
    anio: parsed.anio,
    dias: parsed.dias,
    temporada: parsed.temporada,
    consumoPunta: parsed.consumoPunta,
    consumoIntermedia: parsed.consumoIntermedia,
    consumoBase: parsed.consumoBase,
    totalConsumo: parsed.totalConsumo,
    demandaPunta: parsed.demandaPunta,
    demandaIntermedia: parsed.demandaIntermedia,
    demandaBase: parsed.demandaBase,
    demandaMaxima: parsed.demandaMaxima,
    factorCarga: parsed.factorCarga,
    factorPotencia: parsed.factorPotencia,
  };
}

/**
 * Extracts text from a PDF buffer using pdfjs-dist directly.
 * This avoids the pdf-parse "Object.defineProperty" bug with Next.js bundler.
 */
export async function extraerTextoPdf(buffer: Buffer): Promise<string> {
  // Use require (CJS) to avoid ESM worker import chain issues on Vercel serverless.
  // The ESM pdf.mjs tries to dynamically import pdf.worker.mjs which fails in
  // serverless environments. The CJS build handles worker loading differently.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

  // Disable the worker — not needed in Node.js server environment
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data: uint8, useSystemFonts: true, disableWorker: true }).promise;

  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Join text items, inserting newlines where items are on different Y positions
    let lastY: number | null = null;
    const lines: string[] = [];
    let currentLine = '';
    for (const item of content.items as any[]) {
      if (!('str' in item)) continue;
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(currentLine);
        currentLine = item.str;
      } else {
        currentLine += (currentLine ? ' ' : '') + item.str;
      }
      lastY = y;
    }
    if (currentLine) lines.push(currentLine);
    fullText += lines.join('\n') + '\n';
  }

  return fullText;
}
