// =============================================================================
// EXPORTAR TABLAS INDIVIDUALES — BESS Analyzer
// Permite descargar tablas seleccionadas como Excel (.xlsx) o CSV (.csv)
// =============================================================================

import ExcelJS from 'exceljs';
import type { ResultadoFinanciero } from './modelo-financiero';
import type { DatosProyecto } from './generar-reporte-pdf';

// ─── Estilos ─────────────────────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF132857' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

const HEADER_ALIGNMENT: Partial<ExcelJS.Alignment> = {
  horizontal: 'center',
  vertical: 'middle',
  wrapText: true,
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  bottom: { style: 'thin' },
  left: { style: 'thin' },
  right: { style: 'thin' },
};

const TOTAL_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE6F0FF' },
};

const NUM_FMT_MXN = '#,##0.00';
const NUM_FMT_INT = '#,##0';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function applyHeaderStyle(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = HEADER_ALIGNMENT;
    cell.border = THIN_BORDER;
  });
  row.height = 22;
}

function applyBodyBorders(ws: ExcelJS.Worksheet, startRow: number, endRow: number, cols: number): void {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= cols; c++) {
      row.getCell(c).border = THIN_BORDER;
    }
  }
}

function autoWidth(ws: ExcelJS.Worksheet): void {
  ws.columns.forEach((col) => {
    if (!col || !col.eachCell) return;
    let maxLen = 10;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const val = cell.value?.toString() || '';
      maxLen = Math.max(maxLen, val.length + 2);
    });
    col.width = Math.min(maxLen, 35);
  });
}

// ─── Definición de tablas ────────────────────────────────────────────────────

export type TablaId =
  | 'consumos'
  | 'estructura_costos'
  | 'comparativo'
  | 'desplazamiento'
  | 'inversion'
  | 'degradacion';

export interface TablaInfo {
  id: TablaId;
  label: string;
  descripcion: string;
  disponible: (proyecto: DatosProyecto, resultados: ResultadoFinanciero | null) => boolean;
}

export const TABLAS_DISPONIBLES: TablaInfo[] = [
  {
    id: 'consumos',
    label: 'Consumos y Demandas',
    descripcion: 'Datos mensuales de consumo (kWh) y demanda (kW) por periodo horario',
    disponible: (p) => (p.recibos?.length || 0) > 0,
  },
  {
    id: 'estructura_costos',
    label: 'Estructura de Costos',
    descripcion: 'Desglose de costos anuales por componente (capacidad, energía)',
    disponible: (_, r) => !!r?.estructuraCostos,
  },
  {
    id: 'comparativo',
    label: 'Comparativo Mensual BESS',
    descripcion: 'Comparación de cargos con y sin BESS, ahorros por periodo',
    disponible: (_, r) => (r?.comparativo?.length || 0) > 0,
  },
  {
    id: 'desplazamiento',
    label: 'Desplazamiento de Carga',
    descripcion: 'Consumo y gasto original vs nuevo en base y punta por mes',
    disponible: (_, r) => (r?.desplazamientoCarga?.length || 0) > 0,
  },
  {
    id: 'inversion',
    label: 'Inversión de Capital',
    descripcion: 'Proyección anual de inversión, ahorro y retorno acumulado',
    disponible: (_, r) => (r?.tablaInversion?.length || 0) > 0,
  },
  {
    id: 'degradacion',
    label: 'Degradación y Recompra',
    descripcion: 'Capacidad efectiva, degradación acumulada y año de recompra',
    disponible: (_, r) => (r?.degradacion?.length || 0) > 0,
  },
];

// ─── Generadores de datos planos (headers + rows) ──────────────────────────

interface TablaDatos {
  headers: string[];
  rows: (string | number)[][];
}

function datosConsumos(proyecto: DatosProyecto): TablaDatos {
  const recibos = proyecto.recibos || [];
  return {
    headers: [
      'Mes', 'Año', 'Días', 'Temporada',
      'Consumo Punta (kWh)', 'Consumo Intermedia (kWh)', 'Consumo Base (kWh)', 'Total Consumo (kWh)',
      'Demanda Punta (kW)', 'Demanda Intermedia (kW)', 'Demanda Base (kW)', 'Demanda Máxima (kW)',
      'Factor Carga (%)', 'Factor Potencia (%)',
    ],
    rows: recibos.map((r: any) => [
      r.mes, r.anio, r.dias, r.temporada,
      r.consumoPunta || 0, r.consumoIntermedia || 0, r.consumoBase || 0, r.totalConsumo || 0,
      r.demandaPunta || 0, r.demandaIntermedia || 0, r.demandaBase || 0,
      Math.max(r.demandaPunta || 0, r.demandaIntermedia || 0),
      r.factorCarga || 0, r.factorPotencia || 0,
    ]),
  };
}

function datosEstructuraCostos(resultados: ResultadoFinanciero): TablaDatos {
  const ec = resultados.estructuraCostos;
  return {
    headers: ['Componente', 'Monto (MXN)', '% del Total'],
    rows: [
      ['Cargos por Capacidad', ec.capacidad.total, ec.capacidad.pct],
      ['Energía Punta', ec.energiaPunta.total, ec.energiaPunta.pct],
      ['Energía Intermedia', ec.energiaIntermedia.total, ec.energiaIntermedia.pct],
      ['Energía Base', ec.energiaBase.total, ec.energiaBase.pct],
      ['TOTAL', ec.costoAnualTotal, 100],
    ],
  };
}

function datosComparativo(resultados: ResultadoFinanciero): TablaDatos {
  const rows = resultados.comparativo.map((c) => [
    c.periodo, c.cargoSinBess, c.cargoConBess, c.ahorroCapacidad,
    c.costoCargaBase, c.ahorroNeto, c.pctAhorroNeto,
  ]);
  // Total row
  const t = resultados.totales;
  rows.push(['TOTAL', t.cargoSinBess, t.cargoConBess, t.ahorroCapacidad, t.costoCargaBase, t.ahorroNeto, t.pctAhorroNeto]);
  return {
    headers: ['Periodo', 'Cap s/BESS ($)', 'Cap c/BESS ($)', 'Ahorro Capacidad ($)', 'Costo Carga Base ($)', 'Ahorro Neto ($)', '% Ahorro'],
    rows,
  };
}

function datosDesplazamiento(resultados: ResultadoFinanciero): TablaDatos {
  const dc = resultados.desplazamientoCarga || [];
  return {
    headers: [
      'Periodo',
      'Base Orig (kWh)', 'Base Nuevo (kWh)',
      'Punta Orig (kWh)', 'Punta Nuevo (kWh)',
      'Gasto Base Orig ($)', 'Gasto Base Nuevo ($)',
      'Gasto Punta Orig ($)', 'Gasto Punta Nuevo ($)',
    ],
    rows: dc.map((f) => [
      f.periodo,
      f.consumoBaseOriginal, f.consumoBaseNuevo,
      f.consumoPuntaOriginal, f.consumoPuntaNuevo,
      f.gastoBaseOriginal, f.gastoBaseNuevo,
      f.gastoPuntaOriginal, f.gastoPuntaNuevo,
    ]),
  };
}

function datosInversion(resultados: ResultadoFinanciero): TablaDatos {
  return {
    headers: ['Año', 'Inversión ($)', 'Ahorro CFE ($)', 'Ahorro Neto Anual ($)', 'Acumulado ($)'],
    rows: resultados.tablaInversion.map((f) => [
      f.anio, f.inversion || 0, f.ahorroCfe || 0, f.ahorroNetoAnual || 0, f.ahorroAcumulado,
    ]),
  };
}

function datosDegradacion(resultados: ResultadoFinanciero): TablaDatos {
  const deg = resultados.degradacion || [];
  return {
    headers: ['Año', 'Capacidad Efectiva (kWh)', 'Degradación Acum. (%)', 'Factor Capacidad', 'Ahorro Ajustado ($)', 'Recompra'],
    rows: deg.map((d) => [
      d.anio, d.capacidadEfectiva, d.degradacionPct, d.factorCapacidad, d.ahorroAjustado, d.requiereRecompra ? 'Sí' : '',
    ]),
  };
}

function obtenerDatos(
  tablaId: TablaId,
  proyecto: DatosProyecto,
  resultados: ResultadoFinanciero,
): TablaDatos {
  switch (tablaId) {
    case 'consumos': return datosConsumos(proyecto);
    case 'estructura_costos': return datosEstructuraCostos(resultados);
    case 'comparativo': return datosComparativo(resultados);
    case 'desplazamiento': return datosDesplazamiento(resultados);
    case 'inversion': return datosInversion(resultados);
    case 'degradacion': return datosDegradacion(resultados);
  }
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

function escapeCsv(val: string | number): string {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function tablaToCsv(datos: TablaDatos): string {
  const lines: string[] = [];
  lines.push(datos.headers.map(escapeCsv).join(','));
  datos.rows.forEach((row) => {
    lines.push(row.map(escapeCsv).join(','));
  });
  return lines.join('\n');
}

export function exportarCSV(
  tablaIds: TablaId[],
  proyecto: DatosProyecto,
  resultados: ResultadoFinanciero,
): void {
  const nombreArchivo = (proyecto.nombre || 'BESS')
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '')
    .replace(/\s+/g, '_');

  if (tablaIds.length === 1) {
    // Single file download
    const datos = obtenerDatos(tablaIds[0], proyecto, resultados);
    const info = TABLAS_DISPONIBLES.find((t) => t.id === tablaIds[0]);
    const csv = tablaToCsv(datos);
    descargarArchivo(csv, `${nombreArchivo}_${tablaIds[0]}.csv`, 'text/csv;charset=utf-8;');
  } else {
    // Multiple tables: join with section separators
    const sections: string[] = [];
    tablaIds.forEach((id) => {
      const info = TABLAS_DISPONIBLES.find((t) => t.id === id);
      const datos = obtenerDatos(id, proyecto, resultados);
      sections.push(`# ${info?.label || id}`);
      sections.push(tablaToCsv(datos));
      sections.push(''); // blank line separator
    });
    descargarArchivo(sections.join('\n'), `${nombreArchivo}_Tablas.csv`, 'text/csv;charset=utf-8;');
  }
}

// ─── Excel Export ────────────────────────────────────────────────────────────

// Column format hints per table
const COLUMN_FORMATS: Record<TablaId, Record<number, string>> = {
  consumos: {
    5: NUM_FMT_INT, 6: NUM_FMT_INT, 7: NUM_FMT_INT, 8: NUM_FMT_INT,
    9: NUM_FMT_INT, 10: NUM_FMT_INT, 11: NUM_FMT_INT, 12: NUM_FMT_INT,
    13: '0.00', 14: '0.00',
  },
  estructura_costos: { 2: NUM_FMT_MXN, 3: '0.0"%"' },
  comparativo: { 2: NUM_FMT_MXN, 3: NUM_FMT_MXN, 4: NUM_FMT_MXN, 5: NUM_FMT_MXN, 6: NUM_FMT_MXN, 7: '0"%"' },
  desplazamiento: {
    2: NUM_FMT_INT, 3: NUM_FMT_INT, 4: NUM_FMT_INT, 5: NUM_FMT_INT,
    6: NUM_FMT_MXN, 7: NUM_FMT_MXN, 8: NUM_FMT_MXN, 9: NUM_FMT_MXN,
  },
  inversion: { 2: NUM_FMT_MXN, 3: NUM_FMT_MXN, 4: NUM_FMT_MXN, 5: NUM_FMT_MXN },
  degradacion: { 2: NUM_FMT_INT, 3: '0.0"%"', 4: '0.000', 5: NUM_FMT_MXN },
};

function crearHojaExcel(
  wb: ExcelJS.Workbook,
  tablaId: TablaId,
  datos: TablaDatos,
  titulo: string,
): void {
  const ws = wb.addWorksheet(titulo.substring(0, 31)); // Excel max 31 chars

  // Title row
  const titleRow = ws.addRow([titulo]);
  ws.mergeCells(titleRow.number, 1, titleRow.number, datos.headers.length);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF132857' } };
  titleRow.getCell(1).alignment = { horizontal: 'center' };
  titleRow.height = 28;
  ws.addRow([]);

  // Headers
  const headerRow = ws.addRow(datos.headers);
  applyHeaderStyle(headerRow);

  // Data rows
  const formats = COLUMN_FORMATS[tablaId] || {};
  datos.rows.forEach((rowData, idx) => {
    const row = ws.addRow(rowData);
    Object.entries(formats).forEach(([col, fmt]) => {
      const c = parseInt(col);
      if (c <= rowData.length) row.getCell(c).numFmt = fmt;
    });
    // Highlight last row as TOTAL for some tables
    const isLastRow = idx === datos.rows.length - 1;
    if (isLastRow && ['comparativo', 'desplazamiento', 'estructura_costos'].includes(tablaId)) {
      row.eachCell((cell) => { cell.fill = TOTAL_FILL; cell.font = { bold: true }; });
    }
  });

  applyBodyBorders(ws, headerRow.number, headerRow.number + datos.rows.length, datos.headers.length);
  autoWidth(ws);
}

export async function exportarExcel(
  tablaIds: TablaId[],
  proyecto: DatosProyecto,
  resultados: ResultadoFinanciero,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BESS Analyzer';
  wb.created = new Date();

  tablaIds.forEach((id) => {
    const info = TABLAS_DISPONIBLES.find((t) => t.id === id);
    const datos = obtenerDatos(id, proyecto, resultados);
    crearHojaExcel(wb, id, datos, info?.label || id);
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const nombreArchivo = (proyecto.nombre || 'BESS')
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '')
    .replace(/\s+/g, '_');
  const suffix = tablaIds.length === 1 ? `_${tablaIds[0]}` : '_Tablas';
  descargarArchivo(blob, `${nombreArchivo}${suffix}.xlsx`);
}

// ─── Descargar archivo ──────────────────────────────────────────────────────

function descargarArchivo(content: string | Blob, filename: string, mime?: string): void {
  const blob = content instanceof Blob
    ? content
    : new Blob(['\uFEFF' + content], { type: mime || 'text/plain' }); // BOM for Excel CSV compat
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
