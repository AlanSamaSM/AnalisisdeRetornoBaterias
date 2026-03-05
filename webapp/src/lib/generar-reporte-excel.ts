// =============================================================================
// GENERADOR DE REPORTE EXCEL — BESS Analyzer
// Genera un .xlsx multi-hoja con formato profesional para copy-paste
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

const NUM_FMT_MXN = '#,##0.00';
const NUM_FMT_INT = '#,##0';
const NUM_FMT_PCT = '0.0"%"';

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

function addTitleRow(ws: ExcelJS.Worksheet, title: string, cols: number): void {
  const row = ws.addRow([title]);
  ws.mergeCells(row.number, 1, row.number, cols);
  row.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF132857' } };
  row.getCell(1).alignment = { horizontal: 'center' };
  row.height = 28;
  ws.addRow([]);
}

// ─── Hoja 1: Consumos ───────────────────────────────────────────────────────

function sheetConsumos(wb: ExcelJS.Workbook, proyecto: DatosProyecto): void {
  const ws = wb.addWorksheet('Consumos');
  const recibos = proyecto.recibos || [];

  addTitleRow(ws, `Consumos — ${proyecto.nombre}`, 14);

  const headers = [
    'Mes', 'Año', 'Días', 'Temporada',
    'Consumo Punta (kWh)', 'Consumo Intermedia (kWh)', 'Consumo Base (kWh)', 'Total Consumo (kWh)',
    'Demanda Punta (kW)', 'Demanda Intermedia (kW)', 'Demanda Base (kW)', 'Demanda Máxima (kW)',
    'Factor Carga (%)', 'Factor Potencia (%)',
  ];
  const headerRow = ws.addRow(headers);
  applyHeaderStyle(headerRow);

  recibos.forEach((r: any) => {
    const row = ws.addRow([
      r.mes, r.anio, r.dias, r.temporada,
      r.consumoPunta || 0, r.consumoIntermedia || 0, r.consumoBase || 0, r.totalConsumo || 0,
      r.demandaPunta || 0, r.demandaIntermedia || 0, r.demandaBase || 0,
      Math.max(r.demandaPunta || 0, r.demandaIntermedia || 0),
      r.factorCarga || 0, r.factorPotencia || 0,
    ]);
    // Number formatting
    for (let c = 5; c <= 8; c++) row.getCell(c).numFmt = NUM_FMT_INT;
    for (let c = 9; c <= 12; c++) row.getCell(c).numFmt = NUM_FMT_INT;
    row.getCell(13).numFmt = '0.00';
    row.getCell(14).numFmt = '0.00';
  });

  applyBodyBorders(ws, headerRow.number, headerRow.number + recibos.length, headers.length);
  autoWidth(ws);
}

// ─── Hoja 2: Estructura Costos ──────────────────────────────────────────────

function sheetEstructuraCostos(wb: ExcelJS.Workbook, resultados: ResultadoFinanciero): void {
  const ws = wb.addWorksheet('Estructura Costos');
  const ec = resultados.estructuraCostos;
  if (!ec) return;

  addTitleRow(ws, 'Estructura de Costos Anual', 3);

  const headerRow = ws.addRow(['Componente', 'Monto (MXN)', '% del Total']);
  applyHeaderStyle(headerRow);

  const data = [
    ['Cargos por Capacidad', ec.capacidad.total, ec.capacidad.pct],
    ['Energia Punta', ec.energiaPunta.total, ec.energiaPunta.pct],
    ['Energia Intermedia', ec.energiaIntermedia.total, ec.energiaIntermedia.pct],
    ['Energia Base', ec.energiaBase.total, ec.energiaBase.pct],
  ];

  data.forEach((d) => {
    const row = ws.addRow(d);
    row.getCell(1).font = { bold: true };
    row.getCell(2).numFmt = NUM_FMT_MXN;
    row.getCell(3).numFmt = '0.0"%"';
  });

  // Total row
  const totalRow = ws.addRow(['TOTAL', ec.costoAnualTotal, '']);
  totalRow.getCell(1).font = { bold: true, size: 12 };
  totalRow.getCell(2).numFmt = NUM_FMT_MXN;
  totalRow.getCell(2).font = { bold: true, size: 12 };
  totalRow.eachCell((cell) => { cell.fill = TOTAL_FILL; });

  applyBodyBorders(ws, headerRow.number, headerRow.number + data.length + 1, 3);
  autoWidth(ws);
}

// ─── Hoja 3: Comparativo BESS ───────────────────────────────────────────────

function sheetComparativo(wb: ExcelJS.Workbook, resultados: ResultadoFinanciero): void {
  const ws = wb.addWorksheet('Comparativo BESS');

  addTitleRow(ws, 'Comparativo Mensual — BESS', 7);

  const headerRow = ws.addRow([
    'Periodo', 'Cap s/BESS', 'Cap c/BESS', 'Ahorro Capacidad',
    'Costo Carga Base', 'Ahorro Neto', '% Ahorro',
  ]);
  applyHeaderStyle(headerRow);

  resultados.comparativo.forEach((c) => {
    const row = ws.addRow([
      c.periodo, c.cargoSinBess, c.cargoConBess, c.ahorroCapacidad,
      c.costoCargaBase, c.ahorroNeto, c.pctAhorroNeto,
    ]);
    for (let col = 2; col <= 6; col++) row.getCell(col).numFmt = NUM_FMT_MXN;
    row.getCell(7).numFmt = '0"%"';
  });

  // Totals
  const t = resultados.totales;
  const totalRow = ws.addRow([
    'TOTAL', t.cargoSinBess, t.cargoConBess, t.ahorroCapacidad,
    t.costoCargaBase, t.ahorroNeto, t.pctAhorroNeto,
  ]);
  totalRow.eachCell((cell) => { cell.fill = TOTAL_FILL; cell.font = { bold: true }; });
  for (let col = 2; col <= 6; col++) totalRow.getCell(col).numFmt = NUM_FMT_MXN;
  totalRow.getCell(7).numFmt = '0"%"';

  applyBodyBorders(ws, headerRow.number, headerRow.number + resultados.comparativo.length + 1, 7);
  autoWidth(ws);
}

// ─── Hoja 4: Desplazamiento Carga ───────────────────────────────────────────

function sheetDesplazamiento(wb: ExcelJS.Workbook, resultados: ResultadoFinanciero): void {
  const ws = wb.addWorksheet('Desplazamiento Carga');
  const dc = resultados.desplazamientoCarga || [];
  if (dc.length === 0) return;

  addTitleRow(ws, 'Desplazamiento de Carga', 9);

  const headerRow = ws.addRow([
    'Periodo',
    'Base Orig (kWh)', 'Base Nuevo (kWh)',
    'Punta Orig (kWh)', 'Punta Nuevo (kWh)',
    'Gasto Base Orig ($)', 'Gasto Base Nuevo ($)',
    'Gasto Punta Orig ($)', 'Gasto Punta Nuevo ($)',
  ]);
  applyHeaderStyle(headerRow);

  dc.forEach((f, idx) => {
    const row = ws.addRow([
      f.periodo,
      f.consumoBaseOriginal, f.consumoBaseNuevo,
      f.consumoPuntaOriginal, f.consumoPuntaNuevo,
      f.gastoBaseOriginal, f.gastoBaseNuevo,
      f.gastoPuntaOriginal, f.gastoPuntaNuevo,
    ]);
    for (let c = 2; c <= 5; c++) row.getCell(c).numFmt = NUM_FMT_INT;
    for (let c = 6; c <= 9; c++) row.getCell(c).numFmt = NUM_FMT_MXN;

    // Highlight TOTAL row
    if (idx === dc.length - 1) {
      row.eachCell((cell) => { cell.fill = TOTAL_FILL; cell.font = { bold: true }; });
    }
  });

  applyBodyBorders(ws, headerRow.number, headerRow.number + dc.length, 9);
  autoWidth(ws);
}

// ─── Hoja 5: Inversión Capital ──────────────────────────────────────────────

function sheetInversion(wb: ExcelJS.Workbook, resultados: ResultadoFinanciero): void {
  const ws = wb.addWorksheet('Inversión Capital');

  addTitleRow(ws, `Inversión de Capital — ${resultados.parametros.aniosProyeccion} años`, 5);

  const headerRow = ws.addRow(['Año', 'Inversión', 'Ahorro CFE', 'Ahorro Neto', 'Acumulado']);
  applyHeaderStyle(headerRow);

  resultados.tablaInversion.forEach((f) => {
    const row = ws.addRow([
      f.anio,
      f.inversion || '',
      f.ahorroCfe || '',
      f.ahorroNetoAnual || '',
      f.ahorroAcumulado,
    ]);
    for (let c = 2; c <= 5; c++) {
      if (row.getCell(c).value !== '') row.getCell(c).numFmt = NUM_FMT_MXN;
    }
    // Highlight positive accumulated
    if (f.ahorroAcumulado >= 0 && f.anio > 0) {
      row.getCell(5).font = { bold: true, color: { argb: 'FF0D6B0D' } };
    } else if (f.anio === 0) {
      row.getCell(2).font = { bold: true, color: { argb: 'FFCC0000' } };
    }
  });

  applyBodyBorders(ws, headerRow.number, headerRow.number + resultados.tablaInversion.length, 5);

  // ROI summary
  const summRow = ws.addRow([]);
  const roiRow = ws.addRow([
    'ROI:',
    resultados.roiExacto ? `${resultados.roiExacto} años` : 'N/A',
    '', 'Ahorro Total Vida Útil:', resultados.ahorroTotalVidaUtil,
  ]);
  roiRow.getCell(1).font = { bold: true, size: 12 };
  roiRow.getCell(2).font = { bold: true, size: 12 };
  roiRow.getCell(4).font = { bold: true, size: 11 };
  roiRow.getCell(5).numFmt = NUM_FMT_MXN;
  roiRow.getCell(5).font = { bold: true, size: 11 };

  autoWidth(ws);
}

// ─── Hoja 6: Degradación ────────────────────────────────────────────────────

function sheetDegradacion(wb: ExcelJS.Workbook, resultados: ResultadoFinanciero): void {
  const ws = wb.addWorksheet('Degradación');
  const deg = resultados.degradacion || [];
  if (deg.length === 0) return;

  addTitleRow(ws, 'Degradación Anual y Recompra', 6);

  const headerRow = ws.addRow([
    'Año', 'Capacidad Efectiva (kWh)', 'Degradación Acum. (%)',
    'Factor Capacidad', 'Ahorro Ajustado ($)', 'Recompra',
  ]);
  applyHeaderStyle(headerRow);

  deg.forEach((d) => {
    const row = ws.addRow([
      d.anio,
      d.capacidadEfectiva,
      d.degradacionPct,
      d.factorCapacidad,
      d.ahorroAjustado,
      d.requiereRecompra ? 'Sí' : '',
    ]);
    row.getCell(2).numFmt = NUM_FMT_INT;
    row.getCell(3).numFmt = '0.0"%"';
    row.getCell(4).numFmt = '0.000';
    row.getCell(5).numFmt = NUM_FMT_MXN;

    if (d.requiereRecompra) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF0E6' } };
      });
    }
  });

  applyBodyBorders(ws, headerRow.number, headerRow.number + deg.length, 6);

  // Summary
  ws.addRow([]);
  const summRow = ws.addRow([
    'Degradación total:',
    `${resultados.degradacionAcumuladaTotal?.toFixed(1) || 0}%`,
    '', 'Recompra sugerida:',
    resultados.anioRecompra ? `Año ${resultados.anioRecompra}` : 'No requerida',
  ]);
  summRow.getCell(1).font = { bold: true };
  summRow.getCell(2).font = { bold: true };
  summRow.getCell(4).font = { bold: true };
  summRow.getCell(5).font = { bold: true };

  autoWidth(ws);
}

// ─── Función principal ──────────────────────────────────────────────────────

export async function generarReporteExcel(
  proyecto: DatosProyecto,
  resultados: ResultadoFinanciero,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BESS Analyzer';
  wb.created = new Date();

  // Crear las 6 hojas + hoja de disclaimer legal
  sheetConsumos(wb, proyecto);
  sheetEstructuraCostos(wb, resultados);
  sheetComparativo(wb, resultados);
  sheetDesplazamiento(wb, resultados);
  sheetInversion(wb, resultados);
  sheetDegradacion(wb, resultados);

  // Hoja de Aviso Legal
  const ws = wb.addWorksheet('Aviso Legal');
  ws.getColumn(1).width = 80;
  const titleRow = ws.addRow(['AVISO LEGAL — DM Solar BESS']);
  titleRow.font = { bold: true, size: 14 };
  ws.addRow([]);
  const disclaimerTexts = [
    'Las proyecciones financieras, estimaciones de ahorro y cálculos de retorno de inversión contenidos en este documento son estimaciones basadas en modelos matemáticos que utilizan datos históricos de consumo y tarifas vigentes al momento del análisis.',
    '',
    'Este reporte NO constituye asesoría financiera, fiscal, legal ni de inversión certificada.',
    'NO garantiza un retorno de inversión específico ni ahorros determinados.',
    '',
    'Los resultados están sujetos a:',
    '• Cambios en las tarifas publicadas por la CFE y la CRE.',
    '• Variaciones del tipo de cambio.',
    '• Modificaciones regulatorias del sector eléctrico.',
    '• Condiciones operativas reales del inmueble.',
    '',
    'La instalación de sistemas BESS requiere:',
    '• Validación técnica en sitio por un profesional certificado.',
    '• Ingeniería de detalle y estudios de cortocircuito.',
    '• Obtención de permisos ante las autoridades competentes (SENER, CRE, CFE Distribución).',
    '• Cumplimiento de la Ley del Sector Eléctrico (2025) y sus reglamentos.',
    '',
    `Documento generado automáticamente el ${new Date().toLocaleDateString('es-MX')} por la plataforma DM Solar BESS.`,
    'Para más información consulte nuestros Términos de Servicio y Aviso de Privacidad.',
  ];
  disclaimerTexts.forEach((line) => {
    const row = ws.addRow([line]);
    row.font = { size: 10 };
    row.alignment = { wrapText: true };
  });

  // Generar buffer y descargar
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const filename = (proyecto.nombre || 'BESS_Reporte')
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '')
    .replace(/\s+/g, '_');
  a.download = `${filename}_Datos_BESS.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
