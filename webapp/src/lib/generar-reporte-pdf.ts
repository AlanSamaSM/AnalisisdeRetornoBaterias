// =============================================================================
// GENERADOR DE REPORTE PDF PROFESIONAL — BESS Analyzer
// Genera un PDF multi-página con portada, índice, secciones técnicas y tablas
// =============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ResultadoFinanciero } from './modelo-financiero';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface DatosProyecto {
  nombre: string;
  estado?: string;
  municipio?: string;
  tarifa?: string;
  capacidadContratada?: number;
  marcaBess?: string;
  modeloBess?: string;
  tecnologiaBess?: string;
  vidaUtilAnios?: number;
  garantiaAnios?: number;
  integrador?: string;
  preparadoPor?: string;
  tasaDegradacion?: number;
  ciclosAnuales?: number;
  potenciaKw?: number;
  capacidadKwh?: number;
  precioUsd?: number;
  tipoCambio?: number;
  aniosProyeccion?: number;
  recibos?: any[];
}

// ─── Colores y constantes ────────────────────────────────────────────────────
const BRAND = [19, 40, 87] as const;       // #132857
const BRAND_LIGHT = [30, 64, 130] as const; // #1E4082
const GRAY = [100, 100, 100] as const;
const DARK = [33, 37, 41] as const;
const WHITE = [255, 255, 255] as const;
const ACCENT_GREEN = [0, 180, 120] as const;   // #00B478
const ACCENT_RED = [220, 38, 38] as const;     // #DC2626
const ACCENT_AMBER = [245, 158, 11] as const;  // #F59E0B
const ACCENT_EMERALD = [22, 163, 74] as const; // #16A34A
const LIGHT_BG = [248, 250, 252] as const;     // #F8FAFC
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number): string {
  return n.toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

function fechaHoy(): string {
  const d = new Date();
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

// ─── Helpers de Dibujo ──────────────────────────────────────────────────────

function drawKPICard(
  doc: jsPDF,
  x: number, y: number,
  w: number, h: number,
  label: string,
  value: string,
  accentColor: readonly [number, number, number],
  subtitle?: string,
): void {
  doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
  doc.setDrawColor(230, 230, 235);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 3, 3, 'FD');
  // Left accent bar
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(x, y, 3, h, 3, 0, 'F');
  doc.rect(x + 1.5, y, 1.5, h, 'F');
  // Label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.text(label, x + 8, y + 9);
  // Value
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  const valLines = doc.splitTextToSize(value, w - 12);
  doc.text(valLines, x + 8, y + 19);
  // Subtitle
  if (subtitle) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.text(subtitle, x + 8, y + (valLines.length > 1 ? 28 : 26));
  }
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
}

function drawDonutChart(
  doc: jsPDF,
  cx: number, cy: number,
  outerR: number, innerR: number,
  segments: { value: number; color: readonly [number, number, number]; label: string }[],
): void {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return;
  let startAngle = -Math.PI / 2;
  for (const seg of segments) {
    const sweep = (seg.value / total) * 2 * Math.PI;
    if (sweep < 0.01) { startAngle += sweep; continue; }
    doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
    const pts: [number, number][] = [];
    const steps = Math.max(12, Math.ceil((sweep / (Math.PI * 2)) * 72));
    for (let i = 0; i <= steps; i++) {
      const a = startAngle + (sweep * i) / steps;
      pts.push([cx + outerR * Math.cos(a), cy + outerR * Math.sin(a)]);
    }
    for (let i = steps; i >= 0; i--) {
      const a = startAngle + (sweep * i) / steps;
      pts.push([cx + innerR * Math.cos(a), cy + innerR * Math.sin(a)]);
    }
    if (pts.length > 2) {
      const rel: [number, number][] = [];
      for (let i = 1; i < pts.length; i++) {
        rel.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
      }
      doc.lines(rel, pts[0][0], pts[0][1], [1, 1], 'F', true);
    }
    startAngle += sweep;
  }
}

function drawHorizontalBarChart(
  doc: jsPDF,
  x: number, y: number,
  w: number,
  data: { label: string; value: number }[],
  options?: { zeroLine?: boolean; roiYear?: number | null },
): number {
  if (data.length === 0) return y;
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const barH = Math.min(120 / data.length, 6);
  const spacing = 1.2;
  const labelW = 18;
  const valueW = 22;
  const chartW = w - labelW - valueW - 4;
  const zeroX = x + labelW + chartW / 2;
  const totalH = data.length * (barH + spacing) + 4;
  // Background
  doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
  doc.roundedRect(x, y, w, totalH, 2, 2, 'F');
  // Zero line
  if (options?.zeroLine !== false) {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(zeroX, y + 1, zeroX, y + totalH - 1);
    doc.setLineWidth(0.2);
    doc.setDrawColor(0, 0, 0);
  }
  data.forEach((d, i) => {
    const by = y + 2 + i * (barH + spacing);
    // Label
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text(d.label, x + 2, by + barH / 2 + 1.2);
    // Bar
    const barW = Math.max((Math.abs(d.value) / maxAbs) * (chartW / 2), 0.5);
    const isPositive = d.value >= 0;
    const color = isPositive ? ACCENT_EMERALD : ACCENT_RED;
    doc.setFillColor(color[0], color[1], color[2]);
    if (isPositive) {
      doc.roundedRect(zeroX, by, barW, barH, 0.5, 0.5, 'F');
    } else {
      doc.roundedRect(zeroX - barW, by, barW, barH, 0.5, 0.5, 'F');
    }
    // ROI marker
    if (options?.roiYear != null && i === options.roiYear) {
      doc.setFillColor(ACCENT_GREEN[0], ACCENT_GREEN[1], ACCENT_GREEN[2]);
      doc.circle(x + w - 5, by + barH / 2, 1.5, 'F');
      doc.setFontSize(4.5);
      doc.setTextColor(ACCENT_GREEN[0], ACCENT_GREEN[1], ACCENT_GREEN[2]);
      doc.text('ROI', x + w - 2, by + barH / 2 + 1);
    }
    // Value
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    const valTxt = `$${(d.value / 1_000_000).toFixed(2)}M`;
    doc.text(valTxt, x + labelW + chartW + 2, by + barH / 2 + 1.2);
  });
  return y + totalH + 2;
}

function drawLineChart(
  doc: jsPDF,
  x: number, y: number,
  w: number, h: number,
  data: { x: number; y: number }[],
  options?: { yLabel?: string; thresholdY?: number; lineColor?: readonly [number, number, number] },
): void {
  if (data.length < 2) return;
  const xMin = Math.min(...data.map(d => d.x));
  const xMax = Math.max(...data.map(d => d.x));
  const yMin = Math.min(...data.map(d => d.y), options?.thresholdY ?? Infinity) * 0.95;
  const yMax = Math.max(...data.map(d => d.y)) * 1.02;
  const rangeX = xMax - xMin || 1;
  const rangeY = yMax - yMin || 1;
  const toCanvasX = (v: number) => x + ((v - xMin) / rangeX) * w;
  const toCanvasY = (v: number) => y + h - ((v - yMin) / rangeY) * h;
  // Axes
  doc.setDrawColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.setLineWidth(0.3);
  doc.line(x, y + h, x + w, y + h);
  doc.line(x, y, x, y + h);
  if (options?.yLabel) {
    doc.setFontSize(6);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.text(options.yLabel, x - 2, y - 2);
  }
  // Grid
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.15);
  for (let i = 1; i <= 4; i++) {
    const gy = y + (h * i) / 5;
    doc.line(x, gy, x + w, gy);
    const val = yMax - (rangeY * i) / 5;
    doc.setFontSize(5);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.text(fmtInt(Math.round(val)), x - 1, gy + 1, { align: 'right' });
  }
  // Threshold
  if (options?.thresholdY != null) {
    const ty = toCanvasY(options.thresholdY);
    doc.setDrawColor(ACCENT_RED[0], ACCENT_RED[1], ACCENT_RED[2]);
    doc.setLineWidth(0.4);
    for (let sx = x; sx < x + w; sx += 4) {
      doc.line(sx, ty, Math.min(sx + 2, x + w), ty);
    }
    doc.setFontSize(5);
    doc.setTextColor(ACCENT_RED[0], ACCENT_RED[1], ACCENT_RED[2]);
    doc.text('Umbral', x + w + 1, ty + 1);
  }
  // Line
  const lc = options?.lineColor || BRAND;
  doc.setDrawColor(lc[0], lc[1], lc[2]);
  doc.setLineWidth(0.8);
  for (let i = 1; i < data.length; i++) {
    doc.line(toCanvasX(data[i - 1].x), toCanvasY(data[i - 1].y),
             toCanvasX(data[i].x), toCanvasY(data[i].y));
  }
  doc.setFillColor(lc[0], lc[1], lc[2]);
  for (const d of data) {
    doc.circle(toCanvasX(d.x), toCanvasY(d.y), 0.8, 'F');
  }
  // X labels
  doc.setFontSize(5);
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  const step = Math.max(1, Math.floor(data.length / 10));
  for (let i = 0; i < data.length; i += step) {
    doc.text(String(data[i].x), toCanvasX(data[i].x), y + h + 4, { align: 'center' });
  }
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
}

function drawProgressGauge(
  doc: jsPDF,
  cx: number, cy: number,
  r: number,
  percent: number,
  label: string,
): void {
  const steps = 60;
  const startA = Math.PI;
  const endA = 2 * Math.PI;
  // Background arc
  doc.setFillColor(235, 235, 235);
  const bgPts: [number, number][] = [[cx, cy]];
  for (let i = 0; i <= steps; i++) {
    const a = startA + ((endA - startA) * i) / steps;
    bgPts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const bgRel: [number, number][] = [];
  for (let i = 1; i < bgPts.length; i++) {
    bgRel.push([bgPts[i][0] - bgPts[i - 1][0], bgPts[i][1] - bgPts[i - 1][1]]);
  }
  doc.lines(bgRel, bgPts[0][0], bgPts[0][1], [1, 1], 'F', true);
  // Filled arc
  const pct = Math.min(Math.max(percent, 0), 100);
  const fillEnd = startA + ((endA - startA) * pct) / 100;
  const color = pct < 30 ? ACCENT_EMERALD : pct < 60 ? ACCENT_AMBER : ACCENT_RED;
  doc.setFillColor(color[0], color[1], color[2]);
  const fPts: [number, number][] = [[cx, cy]];
  const fSteps = Math.max(8, Math.ceil((pct / 100) * steps));
  for (let i = 0; i <= fSteps; i++) {
    const a = startA + ((fillEnd - startA) * i) / fSteps;
    fPts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const fRel: [number, number][] = [];
  for (let i = 1; i < fPts.length; i++) {
    fRel.push([fPts[i][0] - fPts[i - 1][0], fPts[i][1] - fPts[i - 1][1]]);
  }
  doc.lines(fRel, fPts[0][0], fPts[0][1], [1, 1], 'F', true);
  // Inner circle (gauge hole)
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.circle(cx, cy, r * 0.6, 'F');
  // Percentage
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(`${pct.toFixed(1)}%`, cx, cy - 2, { align: 'center' });
  // Label
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.text(label, cx, cy + 5, { align: 'center' });
}

function drawCheckIcon(doc: jsPDF, x: number, y: number, size = 3): void {
  doc.setFillColor(ACCENT_EMERALD[0], ACCENT_EMERALD[1], ACCENT_EMERALD[2]);
  doc.circle(x + size / 2, y + size / 2, size / 2, 'F');
  doc.setDrawColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setLineWidth(0.6);
  doc.line(x + size * 0.25, y + size * 0.5, x + size * 0.45, y + size * 0.72);
  doc.line(x + size * 0.45, y + size * 0.72, x + size * 0.78, y + size * 0.28);
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
}

// ─── Secciones del PDF ──────────────────────────────────────────────────────

function renderPortada(doc: jsPDF, proyecto: DatosProyecto): void {
  // Fondo navy expandido (~52% de la página)
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.rect(0, 0, PAGE_W, 155, 'F');

  // Textura sutil: líneas horizontales ligeramente más claras
  doc.setFillColor(BRAND_LIGHT[0], BRAND_LIGHT[1], BRAND_LIGHT[2]);
  for (let i = 0; i < 5; i++) {
    doc.rect(0, 28 + i * 25, PAGE_W, 0.3, 'F');
  }

  // Línea decorativa verde (6px)
  doc.setFillColor(ACCENT_GREEN[0], ACCENT_GREEN[1], ACCENT_GREEN[2]);
  doc.rect(0, 155, PAGE_W, 5, 'F');

  // Título principal
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTUDIO TÉCNICO-ECONÓMICO', PAGE_W / 2, 50, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema híbrido de Almacenamiento', PAGE_W / 2, 68, { align: 'center' });
  doc.text('de Energía (BESS)', PAGE_W / 2, 78, { align: 'center' });

  // Icono batería más grande y detallado
  const bx = PAGE_W / 2 - 15;
  const by = 92;
  doc.setFillColor(ACCENT_GREEN[0], ACCENT_GREEN[1], ACCENT_GREEN[2]);
  doc.roundedRect(bx, by, 30, 20, 3, 3, 'F');
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.rect(bx + 30, by + 6, 4, 8, 'F');
  // Rayo interior más grande
  doc.setDrawColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setLineWidth(2);
  doc.line(bx + 17, by + 2, bx + 12, by + 10);
  doc.line(bx + 12, by + 10, bx + 19, by + 10);
  doc.line(bx + 19, by + 10, bx + 14, by + 18);
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);

  // Tagline
  doc.setFontSize(11);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(ACCENT_GREEN[0], ACCENT_GREEN[1], ACCENT_GREEN[2]);
  doc.text('Ahorro inteligente en energía eléctrica', PAGE_W / 2, 128, { align: 'center' });

  // Ficha de datos del proyecto (card style)
  const cardX = 30;
  const cardY = 175;
  const cardW = PAGE_W - 60;
  const cardH = 65;

  doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
  doc.setDrawColor(230, 230, 235);
  doc.setLineWidth(0.5);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'FD');

  // Barra de acento izquierda en card
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.roundedRect(cardX, cardY, 4, cardH, 4, 0, 'F');
  doc.rect(cardX + 2, cardY, 2, cardH, 'F');

  let cy = cardY + 15;
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFontSize(12);

  doc.setFont('helvetica', 'bold');
  doc.text('Proyecto:', cardX + 12, cy);
  doc.setFont('helvetica', 'normal');
  doc.text(proyecto.nombre || 'Sin nombre', cardX + 38, cy);
  cy += 11;

  if (proyecto.integrador) {
    doc.setFont('helvetica', 'bold');
    doc.text('Integrador:', cardX + 12, cy);
    doc.setFont('helvetica', 'normal');
    doc.text(proyecto.integrador, cardX + 42, cy);
    cy += 11;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', cardX + 12, cy);
  doc.setFont('helvetica', 'normal');
  doc.text(fechaHoy(), cardX + 28, cy);
  cy += 11;

  if (proyecto.preparadoPor) {
    doc.setFont('helvetica', 'bold');
    doc.text('Preparado por:', cardX + 12, cy);
    doc.setFont('helvetica', 'normal');
    doc.text(proyecto.preparadoPor, cardX + 50, cy);
  }

  // Footer profesional
  doc.setFontSize(8);
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.setFont('helvetica', 'italic');
  doc.text('Documento generado por BESS Analyzer', PAGE_W / 2, 265, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Confidencial — Solo para uso del destinatario', PAGE_W / 2, 272, { align: 'center' });
  doc.setFontSize(7);
  doc.text(`Versión del documento: ${new Date().toISOString().slice(0, 10)}`, PAGE_W / 2, 279, { align: 'center' });

  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);
}

function renderIndiceContent(doc: jsPDF, pageMap: Record<string, number>): void {
  pageHeader(doc);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ÍNDICE', PAGE_W / 2, 16, { align: 'center' });

  let y = 35;
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);

  const p = (key: string) => String(pageMap[key] || '');

  const items = [
    { num: '', titulo: 'Dashboard Ejecutivo', pagina: p('Dashboard Ejecutivo'), main: true },
    { num: '1.', titulo: 'Resumen Ejecutivo', pagina: p('1. Resumen Ejecutivo'), main: true },
    { num: '  1.1', titulo: 'Situación Actual', pagina: p('1. Resumen Ejecutivo'), main: false },
    { num: '  1.2', titulo: 'Solución Propuesta', pagina: p('1. Resumen Ejecutivo'), main: false },
    { num: '  1.3', titulo: 'Resultados Clave', pagina: p('1. Resumen Ejecutivo'), main: false },
    { num: '2.', titulo: 'Situación Energética Actual del Sitio', pagina: p('2. Situación Energética'), main: true },
    { num: '  2.1', titulo: 'Información General', pagina: p('2. Situación Energética'), main: false },
    { num: '  2.2', titulo: 'Consumo Anual', pagina: p('2. Situación Energética'), main: false },
    { num: '  2.3', titulo: 'Demanda Máxima', pagina: p('2. Situación Energética'), main: false },
    { num: '  2.4', titulo: 'Estructura Actual de Costos', pagina: p('2. Situación Energética'), main: false },
    { num: '3.', titulo: 'Solución Técnica Propuesta', pagina: p('3. Solución Técnica'), main: true },
    { num: '  3.1', titulo: 'Características del Sistema', pagina: p('3. Solución Técnica'), main: false },
    { num: '  3.2', titulo: 'Estrategia Operativa', pagina: p('3. Solución Técnica'), main: false },
    { num: '4.', titulo: 'Desplazamiento de Carga', pagina: p('4. Desplazamiento'), main: true },
    { num: '5.', titulo: 'Simulación de Ahorros', pagina: p('5. Simulación'), main: true },
    { num: '6.', titulo: 'Inversión de Capital', pagina: p('6. Inversión'), main: true },
    { num: '7.', titulo: 'Degradación y Recompra', pagina: p('7. Degradación'), main: true },
    { num: '8.', titulo: 'Alcance, Supuestos y Próximos Pasos', pagina: p('8. Alcance'), main: true },
  ];

  items.forEach((item) => {
    const isMain = item.main;
    doc.setFont('helvetica', isMain ? 'bold' : 'normal');
    doc.setFontSize(isMain ? 12 : 11);

    const xStart = isMain ? MARGIN : MARGIN + 10;
    const numText = item.num.trim();

    if (numText) {
      doc.text(numText, xStart, y);
      doc.text(item.titulo, xStart + (isMain ? 15 : 12), y);
    } else {
      doc.text(item.titulo, xStart, y);
    }

    // Puntos intermedios
    const tituloEnd = numText
      ? xStart + (isMain ? 15 : 12) + doc.getTextWidth(item.titulo)
      : xStart + doc.getTextWidth(item.titulo);
    const endDots = PAGE_W - MARGIN - 10;
    doc.setFontSize(8);
    let dotsLine = '';
    const dotWidth = doc.getTextWidth('.');
    const numDots = Math.floor((endDots - tituloEnd - 2) / dotWidth);
    for (let i = 0; i < numDots; i++) dotsLine += '.';
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.text(dotsLine, tituloEnd + 2, y);
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);

    // Número de página
    doc.setFontSize(isMain ? 12 : 11);
    doc.text(item.pagina, PAGE_W - MARGIN, y, { align: 'right' });

    y += isMain ? 10 : 8;
  });
}

function sectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.rect(MARGIN, y - 5, CONTENT_W, 8, 'F');
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN + 3, y + 1);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  return y + 12;
}

function subHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.text(title, MARGIN, y);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont('helvetica', 'normal');
  return y + 7;
}

function bullet(doc: jsPDF, text: string, y: number, indent = 0): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('•', MARGIN + indent, y);
  doc.text(text, MARGIN + indent + 5, y);
  return y + 6;
}

function pageHeader(doc: jsPDF): void {
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.rect(0, 0, PAGE_W, 25, 'F');
}

function renderDashboardEjecutivo(
  doc: jsPDF,
  proyecto: DatosProyecto,
  resultados: ResultadoFinanciero,
): void {
  doc.addPage();
  pageHeader(doc);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Dashboard Ejecutivo', PAGE_W / 2, 16, { align: 'center' });

  let y = 35;

  // ── 2×2 KPI Cards ──
  const cardW = (CONTENT_W - 8) / 2;
  const cardH = 32;

  drawKPICard(doc, MARGIN, y, cardW, cardH,
    'Ahorro Neto Anual',
    fmt(resultados.totales.ahorroNeto),
    ACCENT_EMERALD,
    'Ahorro estimado por año',
  );

  drawKPICard(doc, MARGIN + cardW + 8, y, cardW, cardH,
    'Retorno de Inversión',
    resultados.roiExacto ? `${resultados.roiExacto} años` : 'N/A',
    BRAND,
    'Tiempo de recuperación',
  );

  y += cardH + 8;

  drawKPICard(doc, MARGIN, y, cardW, cardH,
    'Inversión Total',
    fmt(resultados.inversionMxn),
    ACCENT_RED,
    'Inversión en producto BESS',
  );

  drawKPICard(doc, MARGIN + cardW + 8, y, cardW, cardH,
    'Ahorro Total Vida Útil',
    fmt(resultados.ahorroTotalVidaUtil),
    ACCENT_GREEN,
    `Proyección a ${resultados.parametros.aniosProyeccion} años`,
  );

  y += cardH + 15;

  // ── Banner "Propuesta Óptima" ──
  const bannerH = 38;
  doc.setFillColor(BRAND_LIGHT[0], BRAND_LIGHT[1], BRAND_LIGHT[2]);
  doc.roundedRect(MARGIN, y, CONTENT_W, bannerH, 4, 4, 'F');
  // Barra verde superior del banner
  doc.setFillColor(ACCENT_GREEN[0], ACCENT_GREEN[1], ACCENT_GREEN[2]);
  doc.roundedRect(MARGIN, y, CONTENT_W, 3, 4, 0, 'F');
  doc.rect(MARGIN, y + 1.5, CONTENT_W, 1.5, 'F');

  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPUESTA ÓPTIMA', PAGE_W / 2, y + 13, { align: 'center' });

  // Tres métricas en fila dentro del banner
  const thirdW = CONTENT_W / 3;
  const metricsY = y + 23;

  const pctAhorro = resultados.totales.pctAhorroNeto || 0;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${pctAhorro.toFixed(0)}%`, MARGIN + thirdW / 2, metricsY, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Reducción en capacidad', MARGIN + thirdW / 2, metricsY + 6, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const ahorroM = (resultados.ahorroTotalVidaUtil / 1_000_000).toFixed(1);
  doc.text(`$${ahorroM}M`, MARGIN + thirdW + thirdW / 2, metricsY, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Ahorro vida útil', MARGIN + thirdW + thirdW / 2, metricsY + 6, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('8%', MARGIN + thirdW * 2 + thirdW / 2, metricsY, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Crecimiento tarifario anual', MARGIN + thirdW * 2 + thirdW / 2, metricsY + 6, { align: 'center' });

  y += bannerH + 15;

  // ── Donut de Estructura de Costos ──
  const ec = resultados.estructuraCostos;
  if (ec) {
    y = subHeader(doc, 'Distribución de Costos Eléctricos', y);

    const donutCx = MARGIN + 35;
    const donutCy = y + 28;
    const donutSegs = [
      { value: ec.capacidad.total, color: ACCENT_RED, label: `Capacidad ${ec.capacidad.pct}%` },
      { value: ec.energiaPunta.total, color: ACCENT_AMBER, label: `E. Punta ${ec.energiaPunta.pct}%` },
      { value: ec.energiaIntermedia.total, color: [245, 180, 60] as readonly [number, number, number], label: `E. Intermedia ${ec.energiaIntermedia.pct}%` },
      { value: ec.energiaBase.total, color: ACCENT_EMERALD, label: `E. Base ${ec.energiaBase.pct}%` },
    ];

    drawDonutChart(doc, donutCx, donutCy, 22, 12, donutSegs);

    // Texto central del donut
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
    doc.text('Costo Anual', donutCx, donutCy - 2, { align: 'center' });
    doc.setFontSize(8);
    const costoM = (ec.costoAnualTotal / 1_000_000).toFixed(1);
    doc.text(`$${costoM}M`, donutCx, donutCy + 4, { align: 'center' });

    // Leyenda a la derecha
    const legendX = MARGIN + 75;
    let legendY = y + 12;
    donutSegs.forEach((seg) => {
      doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
      doc.rect(legendX, legendY - 2.5, 4, 4, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(DARK[0], DARK[1], DARK[2]);
      doc.text(seg.label, legendX + 7, legendY + 1);
      legendY += 9;
    });
  }

  // Nota al pie
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.text(
    'Basado en consumo histórico real y tarifas vigentes CFE GDMTH.',
    PAGE_W / 2, PAGE_H - 25, { align: 'center' },
  );
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
}

function renderResumenEjecutivo(
  doc: jsPDF,
  proyecto: DatosProyecto,
  resultados: ResultadoFinanciero,
): void {
  doc.addPage();
  pageHeader(doc);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Resumen Ejecutivo', PAGE_W / 2, 16, { align: 'center' });

  let y = 38;

  // 1.1 Situación Actual
  y = subHeader(doc, '1.1 Situación Actual', y);

  const recibos = proyecto.recibos || [];
  const consumoAnual = recibos.reduce((s: number, r: any) => s + (r.totalConsumo || 0), 0);
  const demandaMax = recibos.reduce((max: number, r: any) =>
    Math.max(max, r.demandaPunta || 0, r.demandaIntermedia || 0), 0);
  const costoAnual = resultados.estructuraCostos?.costoAnualTotal || 0;
  const pctCapPunta = resultados.estructuraCostos?.capacidad?.pct || 0;
  const pctEnergiaPunta = resultados.estructuraCostos?.energiaPunta?.pct || 0;

  y = bullet(doc, `Consumo anual: ${fmtInt(Math.round(consumoAnual / 1000))} MWh`, y);
  y = bullet(doc, `Demanda máxima registrada: ${fmtInt(demandaMax)} kWp`, y);
  y = bullet(doc, `Costo eléctrico anual: ${fmt(costoAnual)} MXN`, y);
  y = bullet(doc, `${pctCapPunta.toFixed(1)}% de la factura corresponde a cargos por capacidad`, y);
  y = bullet(doc, `${pctEnergiaPunta.toFixed(1)}% de la factura corresponde a energía punta`, y);

  y += 5;

  // 1.2 Solución Propuesta
  y = subHeader(doc, '1.2 Solución Propuesta', y);
  doc.setFontSize(10);

  const marca = proyecto.marcaBess || 'BESS';
  const cap = resultados.parametros.capacidadKwh;
  const pot = resultados.parametros.potenciaKw;
  const tec = proyecto.tecnologiaBess || 'LFP';

  y = bullet(doc, `Sistema ${marca} de ${fmtInt(cap)} kWh / ${fmtInt(pot)} kW`, y);
  y = bullet(doc, `Tecnología: Litio ${tec}`, y);
  y = bullet(doc, '100% desplazamiento de carga', y);
  y = bullet(doc, 'Estrategia: Cargar en base, descargar en punta', y);

  y += 5;

  // 1.3 Resultados Clave
  y = subHeader(doc, '1.3 Resultados Clave', y);

  const degradTotal = resultados.degradacionAcumuladaTotal || 0;
  const anioRecompra = resultados.anioRecompra;

  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor']],
    body: [
      ['Inversión estimada', `${fmt(resultados.inversionMxn)} MXN`],
      ['Ahorro anual estimado', `${fmt(resultados.totales.ahorroNeto)} MXN`],
      ['Retorno de Inversión (ROI)', resultados.roiExacto ? `${resultados.roiExacto} años` : 'N/A'],
      ['Degradación acumulada', `${degradTotal.toFixed(1)}%`],
      ['Recompra recomendada', anioRecompra ? `Año ${anioRecompra}` : 'No requerida en horizonte'],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
    margin: { left: MARGIN, right: MARGIN },
  });

  const tblY = (doc as any).lastAutoTable?.finalY || y + 50;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.text(
    'El proyecto resulta técnicamente viable y financieramente atractivo bajo condiciones tarifarias actuales.',
    MARGIN, tblY + 10,
  );
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
}

function renderSituacionEnergetica(
  doc: jsPDF,
  proyecto: DatosProyecto,
  resultados: ResultadoFinanciero,
): void {
  doc.addPage();
  pageHeader(doc);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Situación Energética Actual del Sitio', PAGE_W / 2, 16, { align: 'center' });

  let y = 38;

  // 2.1 Información General
  y = subHeader(doc, '2.1 Información General', y);
  const ubicacion = [proyecto.municipio, proyecto.estado].filter(Boolean).join(', ') || 'No especificada';
  y = bullet(doc, `Ubicación: ${ubicacion}`, y);
  y = bullet(doc, `Tarifa: ${proyecto.tarifa || 'GDMTH'}`, y);
  y = bullet(doc, `Capacidad contratada: ${fmtInt(proyecto.capacidadContratada || 0)} kW`, y);

  y += 5;

  // 2.2 Consumo Anual
  y = subHeader(doc, '2.2 Consumo Anual', y);
  const recibos = proyecto.recibos || [];
  const consumoAnual = recibos.reduce((s: number, r: any) => s + (r.totalConsumo || 0), 0);
  const consumos = recibos.map((r: any) => ({ mes: r.mes, total: r.totalConsumo || 0 }));
  const mesMayor = consumos.reduce((a: any, b: any) => (b.total > a.total ? b : a), consumos[0] || { mes: '-', total: 0 });
  // Excluir meses con consumo 0 para determinar el menor
  const consumosValidos = consumos.filter((c: any) => c.total > 0);
  const mesMenor = consumosValidos.length > 0
    ? consumosValidos.reduce((a: any, b: any) => (b.total < a.total ? b : a), consumosValidos[0])
    : consumos[0] || { mes: '-', total: 0 };
  const promedioMensual = recibos.length > 0 ? consumoAnual / recibos.length : 0;

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Valor']],
    body: [
      ['Consumo anual', `${fmtInt(Math.round(consumoAnual / 1000))} MWh`],
      ['Consumo mensual promedio', `${fmtInt(Math.round(promedioMensual / 1000))} MWh`],
      ['Mes de mayor consumo', `${mesMayor.mes} (${fmtInt(Math.round(mesMayor.total / 1000))} MWh)`],
      ['Mes de menor consumo', `${mesMenor.mes} (${fmtInt(Math.round(mesMenor.total / 1000))} MWh)`],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 40) + 8;

  // 2.3 Demanda Máxima
  y = subHeader(doc, '2.3 Demanda Máxima', y);
  const demandaMax = recibos.reduce((max: number, r: any) =>
    Math.max(max, r.demandaPunta || 0, r.demandaIntermedia || 0), 0);
  const promedioDeMax = recibos.length > 0
    ? recibos.reduce((s: number, r: any) => s + Math.max(r.demandaPunta || 0, r.demandaIntermedia || 0), 0) / recibos.length
    : 0;

  y = bullet(doc, `Demanda máxima: ${fmtInt(demandaMax)} kWp`, y);
  y = bullet(doc, `Promedio mensual de demanda máxima: ${fmtInt(Math.round(promedioDeMax))} kW`, y);

  y += 5;

  // 2.4 Estructura Actual de Costos — may need new page
  if (y > 200) {
    doc.addPage();
    pageHeader(doc);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Situación Energética (cont.)', PAGE_W / 2, 16, { align: 'center' });
    y = 38;
  }

  y = subHeader(doc, '2.4 Estructura Actual de Costos', y);
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);

  const ec = resultados.estructuraCostos;
  if (ec) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Costo anual total: ${fmt(ec.costoAnualTotal)} MXN`, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Componente', 'Monto', '% del Total']],
      body: [
        ['Cargos por capacidad', fmt(ec.capacidad.total), `${ec.capacidad.pct}%`],
        ['Energía punta', fmt(ec.energiaPunta.total), `${ec.energiaPunta.pct}%`],
        ['Energía intermedia', fmt(ec.energiaIntermedia.total), `${ec.energiaIntermedia.pct}%`],
        ['Energía base', fmt(ec.energiaBase.total), `${ec.energiaBase.pct}%`],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255] },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right' }, 2: { halign: 'center' } },
      margin: { left: MARGIN, right: MARGIN },
    });

    // Descripción de componentes
    const tblCostY = (doc as any).lastAutoTable?.finalY || y + 40;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    const descCostos = 'Capacidad: Cargo por demanda máxima medida en punta. '
      + 'Energía Punta: Costo del kWh consumido en horario punta. '
      + 'Energía Intermedia: Costo del kWh en horario intermedio. '
      + 'Energía Base: Costo del kWh en horario base.';
    const splitDesc = doc.splitTextToSize(descCostos, CONTENT_W);
    doc.text(splitDesc, MARGIN, tblCostY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  }
}

function renderSolucionTecnica(
  doc: jsPDF,
  proyecto: DatosProyecto,
  resultados: ResultadoFinanciero,
): void {
  doc.addPage();
  pageHeader(doc);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Solución Técnica Propuesta', PAGE_W / 2, 16, { align: 'center' });

  let y = 38;

  // 3.1 Características del Sistema
  y = subHeader(doc, '3.1 Características del Sistema', y);

  autoTable(doc, {
    startY: y,
    head: [['Parámetro', 'Valor']],
    body: [
      ['Capacidad nominal', `${fmtInt(resultados.parametros.capacidadKwh)} kWh`],
      ['Potencia nominal', `${fmtInt(resultados.parametros.potenciaKw)} kW`],
      ['Marca', proyecto.marcaBess || 'Por definir'],
      ['Modelo', proyecto.modeloBess || 'Por definir'],
      ['Tecnología', `Litio ${proyecto.tecnologiaBess || 'LFP'}`],
      ['Vida útil esperada', `${proyecto.vidaUtilAnios || 15} años`],
      ['Garantía', `${proyecto.garantiaAnios || 5} años`],
      ['Eficiencia', `${(resultados.parametros.eficiencia * 100).toFixed(0)}%`],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 60) + 10;

  // 3.2 Estrategia Operativa
  y = subHeader(doc, '3.2 Estrategia Operativa', y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Modo: Load Shifting — Cargar en horario base, descargar en horario punta', MARGIN, y);
  y += 8;

  // Horarios VERANO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('VERANO (primer domingo de abril — sábado anterior al último domingo de octubre)', MARGIN, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['Día', 'Base', 'Intermedio', 'Punta']],
    body: [
      ['Lunes a Viernes', '0:00–6:00', '6:00–20:00 / 22:00–24:00', '20:00–22:00'],
      ['Sábado', '0:00–7:00', '7:00–24:00', '—'],
      ['Domingo y Festivo', '0:00–19:00', '19:00–24:00', '—'],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255] },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 30) + 6;

  // Horarios INVIERNO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('INVIERNO (último domingo de octubre — sábado anterior al primer domingo de abril)', MARGIN, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [['Día', 'Base', 'Intermedio', 'Punta']],
    body: [
      ['Lunes a Viernes', '0:00–6:00', '6:00–18:00 / 22:00–24:00', '18:00–22:00'],
      ['Sábado', '0:00–8:00', '8:00–19:00 / 21:00–24:00', '19:00–21:00'],
      ['Domingo y Festivo', '0:00–18:00', '18:00–24:00', '—'],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255] },
    margin: { left: MARGIN, right: MARGIN },
  });
}

function renderDesplazamientoCarga(
  doc: jsPDF,
  resultados: ResultadoFinanciero,
): void {
  doc.addPage();
  pageHeader(doc);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Desplazamiento de Carga', PAGE_W / 2, 16, { align: 'center' });

  let y = 35;

  const dc = resultados.desplazamientoCarga || [];
  if (dc.length === 0) {
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.setFontSize(10);
    doc.text('No hay datos de desplazamiento de carga disponibles.', MARGIN, y);
    return;
  }

  // Tabla de consumos (kWh)
  y = subHeader(doc, '4.1 Consumo — Desplazamiento (kWh)', y);

  autoTable(doc, {
    startY: y,
    head: [['Periodo', 'Base Original', 'Base Nuevo', 'Punta Original', 'Punta Nuevo']],
    body: dc.map((f) => [
      f.periodo,
      fmtInt(f.consumoBaseOriginal),
      fmtInt(f.consumoBaseNuevo),
      fmtInt(f.consumoPuntaOriginal),
      fmtInt(f.consumoPuntaNuevo),
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255] },
    bodyStyles: { textColor: [DARK[0], DARK[1], DARK[2]] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data: any) => {
      // Highlight TOTAL row
      if (data.row.index === dc.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [230, 240, 255];
      }
    },
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 60) + 10;

  // Tabla de gastos ($)
  y = subHeader(doc, '4.2 Gasto — Desplazamiento ($)', y);

  autoTable(doc, {
    startY: y,
    head: [['Periodo', 'Base Original', 'Base Nuevo', 'Punta Original', 'Punta Nuevo']],
    body: dc.map((f) => [
      f.periodo,
      fmt(f.gastoBaseOriginal),
      fmt(f.gastoBaseNuevo),
      fmt(f.gastoPuntaOriginal),
      fmt(f.gastoPuntaNuevo),
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255] },
    bodyStyles: { textColor: [DARK[0], DARK[1], DARK[2]] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data: any) => {
      if (data.row.index === dc.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [230, 240, 255];
      }
    },
  });
}

function renderSimulacionAhorros(
  doc: jsPDF,
  resultados: ResultadoFinanciero,
): void {
  doc.addPage();
  pageHeader(doc);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('5. Simulación de Ahorros', PAGE_W / 2, 16, { align: 'center' });

  let y = 35;

  // 5.1 Reducción de Demanda
  y = subHeader(doc, '5.1 Reducción de Demanda', y);

  const sim = resultados.simulacion || [];
  const avgDemOrig = sim.length > 0
    ? sim.reduce((s, f) => s + f.dPuntaOriginal, 0) / sim.length
    : 0;
  const avgDemNew = sim.length > 0
    ? sim.reduce((s, f) => s + f.dPuntaNueva, 0) / sim.length
    : 0;
  const reduccion = avgDemOrig - avgDemNew;

  y = bullet(doc, `Demanda promedio actual (punta): ${fmtInt(Math.round(avgDemOrig))} kW`, y);
  y = bullet(doc, `Demanda promedio proyectada con BESS: ${fmtInt(Math.round(avgDemNew))} kW`, y);
  y = bullet(doc, `Reducción promedio: ${fmtInt(Math.round(reduccion))} kW`, y);

  y += 5;

  // 5.2 Ahorro Total Estimado
  y = subHeader(doc, '5.2 Ahorro Total Estimado', y);

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Ahorro Anual']],
    body: [
      ['Reducción de demanda (capacidad)', fmt(resultados.totales.ahorroCapacidad)],
      ['Costo carga BESS (base)', `-${fmt(resultados.totales.costoCargaBase)}`],
      ['Ahorro neto total', fmt(resultados.totales.ahorroNeto)],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 }, 1: { halign: 'right' } },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data: any) => {
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [230, 240, 255];
      }
    },
  });

  y = ((doc as any).lastAutoTable?.finalY || y + 40) + 8;

  // Comparativo mensual
  y = subHeader(doc, '5.3 Comparativo Mensual Punta', y);

  autoTable(doc, {
    startY: y,
    head: [['Periodo', 'Cap s/BESS', 'Cap c/BESS', 'Ahorro Cap', 'Costo Carga', 'Ahorro Neto', '%']],
    body: resultados.comparativo.map((c) => [
      c.periodo,
      fmt(c.cargoSinBess),
      fmt(c.cargoConBess),
      fmt(c.ahorroCapacidad),
      fmt(c.costoCargaBase),
      fmt(c.ahorroNeto),
      `${c.pctAhorroNeto.toFixed(0)}%`,
    ]),
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'center' },
    },
    margin: { left: MARGIN, right: MARGIN },
  });
}

function renderInversionCapital(
  doc: jsPDF,
  resultados: ResultadoFinanciero,
): void {
  doc.addPage();
  pageHeader(doc);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('6. Inversión de Capital', PAGE_W / 2, 16, { align: 'center' });

  let y = 35;
  y = subHeader(doc, `Proyección a ${resultados.parametros.aniosProyeccion} años`, y);

  autoTable(doc, {
    startY: y,
    head: [['Año', 'Inversión', 'Ahorro CFE', 'Ahorro Neto', 'Acumulado']],
    body: resultados.tablaInversion.map((f) => [
      f.anio,
      f.inversion ? fmt(f.inversion) : '',
      f.ahorroCfe ? fmt(f.ahorroCfe) : '',
      f.ahorroNetoAnual ? fmt(f.ahorroNetoAnual) : '',
      fmt(f.ahorroAcumulado),
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 15, halign: 'center' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data: any) => {
      // Highlight ROI row
      if (data.section === 'body' && data.row.index === 0) {
        data.cell.styles.fillColor = [255, 230, 230];
      }
      const row = resultados.tablaInversion[data.row.index];
      if (data.section === 'body' && row && row.ahorroAcumulado >= 0 && row.anio > 0) {
        data.cell.styles.fillColor = [230, 255, 230];
      }
    },
  });

  const tblY = ((doc as any).lastAutoTable?.finalY || y + 80) + 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.text(
    `Retorno de inversión: ${resultados.roiExacto ? resultados.roiExacto + ' años' : 'N/A'}`,
    MARGIN, tblY,
  );
  doc.text(
    `Ahorro total vida útil: ${fmt(resultados.ahorroTotalVidaUtil)} MXN`,
    MARGIN, tblY + 7,
  );
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    '* La inversión mostrada corresponde únicamente al producto BESS, no incluye instalación ni obra civil.',
    MARGIN, tblY + 16,
  );
}

function renderDegradacion(
  doc: jsPDF,
  proyecto: DatosProyecto,
  resultados: ResultadoFinanciero,
): void {
  doc.addPage();
  pageHeader(doc);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('7. Degradación y Recompra', PAGE_W / 2, 16, { align: 'center' });

  let y = 35;

  const deg = resultados.degradacion || [];
  if (deg.length === 0) {
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.setFontSize(10);
    doc.text('No hay datos de degradación disponibles.', MARGIN, y);
    return;
  }

  y = subHeader(doc, '7.1 Tabla de Degradación Anual', y);

  autoTable(doc, {
    startY: y,
    head: [['Año', 'Capacidad Efectiva (kWh)', 'Degradación Acum. (%)', 'Factor Capacidad', 'Ahorro Ajustado', 'Recompra']],
    body: deg.map((d) => [
      d.anio,
      fmtInt(Math.round(d.capacidadEfectiva)),
      `${d.degradacionPct.toFixed(1)}%`,
      d.factorCapacidad.toFixed(3),
      fmt(d.ahorroAjustado),
      d.requiereRecompra ? 'Sí' : '',
    ]),
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [BRAND[0], BRAND[1], BRAND[2]], textColor: [255, 255, 255], fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { halign: 'right' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'center', cellWidth: 18 },
    },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data: any) => {
      const row = deg[data.row.index];
      if (data.section === 'body' && row?.requiereRecompra) {
        data.cell.styles.fillColor = [255, 240, 230];
      }
    },
  });

  const tblY = ((doc as any).lastAutoTable?.finalY || y + 80) + 10;

  // Texto explicativo
  y = subHeader(doc, '7.2 Recompra Sugerida', tblY);

  const tasa = (proyecto.tasaDegradacion || 0.02) * 100;
  const ciclos = proyecto.ciclosAnuales || 300;
  const anioRec = resultados.anioRecompra;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);

  const textoRecompra = anioRec
    ? `Estimamos que con el sistema cotizado se puede garantizar la demanda energética completa durante ${anioRec} años. En ese momento, se recomienda considerar una recompra para regresar a los ahorros originales del año 1.`
    : `Con la tasa de degradación configurada (${tasa.toFixed(1)}%), el sistema mantiene capacidad suficiente durante todo el horizonte de proyección.`;

  const splitText = doc.splitTextToSize(textoRecompra, CONTENT_W);
  doc.text(splitText, MARGIN, y);
  y += splitText.length * 5 + 5;

  // Info box
  doc.setFillColor(240, 245, 255);
  doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.roundedRect(MARGIN, y, CONTENT_W, 25, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Supuestos de degradación:`, MARGIN + 5, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(`• Tasa de degradación: ${tasa.toFixed(1)}% anual`, MARGIN + 5, y + 15);
  doc.text(`• Ciclos anuales: ${ciclos}  •  Modelo: Degradación lineal (1−tasa)^N`, MARGIN + 5, y + 21);
}

function renderAlcanceSupuestos(
  doc: jsPDF,
  proyecto: DatosProyecto,
  resultados: ResultadoFinanciero,
): void {
  doc.addPage();
  pageHeader(doc);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('8. Alcance, Supuestos y Próximos Pasos', PAGE_W / 2, 16, { align: 'center' });

  let y = 38;

  // Incluye
  y = subHeader(doc, 'Esta propuesta incluye:', y);
  const incluye = [
    'Análisis energético histórico',
    'Simulación anual de desplazamiento de carga',
    'Propuesta técnica preliminar',
    'Modelo financiero con degradación',
  ];
  incluye.forEach((item) => { y = bullet(doc, item, y); });

  y += 5;

  // No incluye
  y = subHeader(doc, 'No incluye:', y);
  const noIncluye = [
    'Ingeniería de detalle',
    'Estudios de cortocircuito',
    'Gestión de permisos',
    'Obra civil específica',
  ];
  noIncluye.forEach((item) => { y = bullet(doc, item, y); });

  y += 8;

  // Supuestos
  y = subHeader(doc, 'Supuestos:', y);
  const tasa = (proyecto.tasaDegradacion || 0.02) * 100;
  const supuestos = [
    'Tarifas actuales GDMTH',
    'Crecimiento tarifario: 8% anual',
    `${proyecto.ciclosAnuales || 300} ciclos anuales (1 descarga al día)`,
    `Degradación promedio: ${tasa.toFixed(1)}% anual`,
    `Eficiencia del sistema: ${((resultados.parametros.eficiencia || 0.9) * 100).toFixed(0)}%`,
  ];
  supuestos.forEach((item) => { y = bullet(doc, item, y); });

  y += 8;

  // Próximos Pasos
  y = subHeader(doc, 'Próximos Pasos:', y);
  doc.setFontSize(10);
  const pasos = [
    'Validación técnica en sitio',
    'Ingeniería de detalle',
    'Cotización final cerrada',
    'Cronograma de implementación (4-6 meses)',
  ];
  pasos.forEach((paso, i) => {
    doc.text(`${i + 1}. ${paso}`, MARGIN + 3, y);
    y += 6;
  });

  y += 8;

  // Conclusión Final
  y = sectionHeader(doc, 'Conclusión Final', y);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const cap = resultados.parametros.capacidadKwh;
  const reduccionPct = resultados.totales.pctAhorroNeto || 0;
  const ahorroAnual = resultados.totales.ahorroNeto || 0;

  const conclusiones = [
    `El sistema BESS de ${fmtInt(cap)} kWh propuesto permite:`,
  ];
  const splitConc = doc.splitTextToSize(conclusiones[0], CONTENT_W);
  doc.text(splitConc, MARGIN, y);
  y += splitConc.length * 5 + 3;

  const checks = [
    `Reducir el cargo por capacidad en ~${reduccionPct.toFixed(0)}%`,
    'Desplazar energía de alto costo (punta a base)',
    `Generar un ahorro anual de ${fmt(ahorroAnual)} MXN`,
    resultados.roiExacto
      ? `Recuperar la inversión en ${resultados.roiExacto} años`
      : 'Inversión recuperable dentro del horizonte proyectado',
  ];

  checks.forEach((check) => {
    doc.text(`-  ${check}`, MARGIN + 3, y);
    y += 6;
  });

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Bajo las condiciones actuales, el proyecto es técnica y financieramente viable.', MARGIN, y);
}

// ─── Función principal ──────────────────────────────────────────────────────

export async function generarReportePDF(
  proyecto: DatosProyecto,
  resultados: ResultadoFinanciero,
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageMap: Record<string, number> = {};

  // 1. Portada (página 1)
  renderPortada(doc, proyecto);

  // 2. Índice — página reservada (se rellena al final con páginas dinámicas)
  doc.addPage();
  const indexPage = doc.getNumberOfPages();

  // 3. Dashboard Ejecutivo
  pageMap['Dashboard Ejecutivo'] = doc.getNumberOfPages() + 1;
  renderDashboardEjecutivo(doc, proyecto, resultados);

  // 4. Resumen Ejecutivo
  pageMap['1. Resumen Ejecutivo'] = doc.getNumberOfPages() + 1;
  renderResumenEjecutivo(doc, proyecto, resultados);

  // 5-6. Situación Energética
  pageMap['2. Situación Energética'] = doc.getNumberOfPages() + 1;
  renderSituacionEnergetica(doc, proyecto, resultados);

  // 7. Solución Técnica
  pageMap['3. Solución Técnica'] = doc.getNumberOfPages() + 1;
  renderSolucionTecnica(doc, proyecto, resultados);

  // 8. Desplazamiento de Carga
  pageMap['4. Desplazamiento'] = doc.getNumberOfPages() + 1;
  renderDesplazamientoCarga(doc, resultados);

  // 9. Simulación de Ahorros
  pageMap['5. Simulación'] = doc.getNumberOfPages() + 1;
  renderSimulacionAhorros(doc, resultados);

  // 10. Inversión de Capital
  pageMap['6. Inversión'] = doc.getNumberOfPages() + 1;
  renderInversionCapital(doc, resultados);

  // 11. Degradación y Recompra
  pageMap['7. Degradación'] = doc.getNumberOfPages() + 1;
  renderDegradacion(doc, proyecto, resultados);

  // 12. Alcance, Supuestos, Próximos Pasos
  pageMap['8. Alcance'] = doc.getNumberOfPages() + 1;
  renderAlcanceSupuestos(doc, proyecto, resultados);

  // ── Rellenar índice dinámico en página 2 ──
  doc.setPage(indexPage);
  renderIndiceContent(doc, pageMap);

  // ── Pie de página en todas las páginas ──
  const pageCount = doc.getNumberOfPages();
  const fecha = new Date().toLocaleDateString('es-MX');
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Línea separadora
    doc.setDrawColor(BRAND[0], BRAND[1], BRAND[2]);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 15, PAGE_W - MARGIN, PAGE_H - 15);
    // Texto footer
    doc.setFontSize(8);
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(`BESS Analyzer — ${fecha} — Página ${i}/${pageCount}`, MARGIN, PAGE_H - 10);
    const nombreProyecto = proyecto.nombre || '';
    if (nombreProyecto && i > 1) {
      doc.text(nombreProyecto, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' });
    }
  }

  // ── Guardar ──
  const filename = (proyecto.nombre || 'BESS_Reporte')
    .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '')
    .replace(/\s+/g, '_');
  doc.save(`${filename}_Estudio_BESS.pdf`);
}
