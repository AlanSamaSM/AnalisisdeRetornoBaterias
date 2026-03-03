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
const BRAND_LIGHT = [30, 64, 130] as const;
const GRAY = [100, 100, 100] as const;
const DARK = [33, 37, 41] as const;
const WHITE = [255, 255, 255] as const;
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

// ─── Secciones del PDF ──────────────────────────────────────────────────────

function renderPortada(doc: jsPDF, proyecto: DatosProyecto): void {
  // Fondo degradado superior
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.rect(0, 0, PAGE_W, 120, 'F');

  // Línea decorativa
  doc.setFillColor(0, 180, 120);
  doc.rect(0, 120, PAGE_W, 4, 'F');

  // Título principal
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTUDIO TECNICO-ECONOMICO', PAGE_W / 2, 55, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema hibrido de Almacenamiento', PAGE_W / 2, 70, { align: 'center' });
  doc.text('de Energia (BESS)', PAGE_W / 2, 80, { align: 'center' });

  // Icono batería dibujado con primitivas
  const bx = PAGE_W / 2 - 10;
  const by = 90;
  doc.setFillColor(0, 180, 120);
  doc.roundedRect(bx, by, 20, 14, 2, 2, 'F');
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.rect(bx + 20, by + 4, 3, 6, 'F');
  // Rayo interior
  doc.setDrawColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setLineWidth(1.5);
  doc.line(bx + 12, by + 2, bx + 8, by + 7);
  doc.line(bx + 8, by + 7, bx + 13, by + 7);
  doc.line(bx + 13, by + 7, bx + 9, by + 12);
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);

  // Datos del proyecto
  let y = 150;
  doc.setTextColor(DARK[0], DARK[1], DARK[2]);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Proyecto:', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(proyecto.nombre || 'Sin nombre', MARGIN + 28, y);

  y += 12;
  if (proyecto.integrador) {
    doc.setFont('helvetica', 'bold');
    doc.text('Integrador:', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(proyecto.integrador, MARGIN + 32, y);
    y += 12;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.text(fechaHoy(), MARGIN + 19, y);
  y += 12;

  if (proyecto.preparadoPor) {
    doc.setFont('helvetica', 'bold');
    doc.text('Preparado por:', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.text(proyecto.preparadoPor, MARGIN + 42, y);
  }

  // Footer de portada
  doc.setFontSize(9);
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.text('Documento generado por BESS Analyzer', PAGE_W / 2, 275, { align: 'center' });
  doc.text('Confidencial — Solo para uso interno', PAGE_W / 2, 282, { align: 'center' });
}

function renderIndice(doc: jsPDF): void {
  doc.addPage();
  let y = 35;

  // Título
  doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
  doc.rect(0, 0, PAGE_W, 25, 'F');
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ÍNDICE', PAGE_W / 2, 16, { align: 'center' });

  doc.setTextColor(DARK[0], DARK[1], DARK[2]);
  doc.setFontSize(12);

  const items = [
    { num: '1.', titulo: 'Resumen Ejecutivo', pagina: '3' },
    { num: '  1.1', titulo: 'Situación Actual', pagina: '3' },
    { num: '  1.2', titulo: 'Solución Propuesta', pagina: '3' },
    { num: '  1.3', titulo: 'Resultados Clave', pagina: '3' },
    { num: '2.', titulo: 'Situación Energética Actual del Sitio', pagina: '4' },
    { num: '  2.1', titulo: 'Información General', pagina: '4' },
    { num: '  2.2', titulo: 'Consumo Anual', pagina: '4' },
    { num: '  2.3', titulo: 'Demanda Máxima', pagina: '4' },
    { num: '  2.4', titulo: 'Estructura Actual de Costos', pagina: '5' },
    { num: '3.', titulo: 'Solución Técnica Propuesta', pagina: '6' },
    { num: '  3.1', titulo: 'Características del Sistema', pagina: '6' },
    { num: '  3.2', titulo: 'Estrategia Operativa', pagina: '6' },
    { num: '4.', titulo: 'Desplazamiento de Carga', pagina: '7' },
    { num: '5.', titulo: 'Simulación de Ahorros', pagina: '8' },
    { num: '6.', titulo: 'Inversión de Capital', pagina: '9' },
    { num: '7.', titulo: 'Degradación y Recompra', pagina: '10' },
    { num: '8.', titulo: 'Alcance, Supuestos y Próximos Pasos', pagina: '11' },
  ];

  items.forEach((item) => {
    const isMain = !item.num.startsWith('  ');
    doc.setFont('helvetica', isMain ? 'bold' : 'normal');
    doc.setFontSize(isMain ? 12 : 11);
    doc.text(item.num, MARGIN, y);
    doc.text(item.titulo, MARGIN + 15, y);

    // Puntos intermedios
    const tituloWidth = doc.getTextWidth(item.titulo);
    const startDots = MARGIN + 15 + tituloWidth + 2;
    const endDots = PAGE_W - MARGIN - 10;
    doc.setFontSize(8);
    let dotsLine = '';
    const dotWidth = doc.getTextWidth('.');
    const numDots = Math.floor((endDots - startDots) / dotWidth);
    for (let i = 0; i < numDots; i++) dotsLine += '.';
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
    doc.text(dotsLine, startDots, y);
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
  y = bullet(doc, `${pctEnergiaPunta.toFixed(1)}% de la factura corresponde a energia punta`, y);

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
        ['Energia punta', fmt(ec.energiaPunta.total), `${ec.energiaPunta.pct}%`],
        ['Energia intermedia', fmt(ec.energiaIntermedia.total), `${ec.energiaIntermedia.pct}%`],
        ['Energia base', fmt(ec.energiaBase.total), `${ec.energiaBase.pct}%`],
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
    const descCostos = 'Capacidad: Cargo por demanda maxima medida en punta. '
      + 'Energia Punta: Costo del kWh consumido en horario punta. '
      + 'Energia Intermedia: Costo del kWh en horario intermedio. '
      + 'Energia Base: Costo del kWh en horario base.';
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
    'Cronograma de implementacion (4-6 meses)',
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
    'Desplazar energia de alto costo (punta a base)',
    `Generar un ahorro anual de ${fmt(ahorroAnual)} MXN`,
    resultados.roiExacto
      ? `Recuperar la inversion en ${resultados.roiExacto} anos`
      : 'Inversion recuperable dentro del horizonte proyectado',
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

  // 1. Portada
  renderPortada(doc, proyecto);

  // 2. Índice
  renderIndice(doc);

  // 3. Resumen Ejecutivo
  renderResumenEjecutivo(doc, proyecto, resultados);

  // 4-5. Situación Energética
  renderSituacionEnergetica(doc, proyecto, resultados);

  // 6. Solución Técnica
  renderSolucionTecnica(doc, proyecto, resultados);

  // 7. Desplazamiento de Carga
  renderDesplazamientoCarga(doc, resultados);

  // 8. Simulación de Ahorros
  renderSimulacionAhorros(doc, resultados);

  // 9. Inversión de Capital
  renderInversionCapital(doc, resultados);

  // 10. Degradación y Recompra
  renderDegradacion(doc, proyecto, resultados);

  // 11. Alcance, Supuestos, Próximos Pasos
  renderAlcanceSupuestos(doc, proyecto, resultados);

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
