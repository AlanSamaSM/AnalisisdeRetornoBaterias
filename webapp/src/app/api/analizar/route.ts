// ─── API: Analizar recibos (upload PDFs + run financial model) ──────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  extraerTextoPdf,
  parsearRecibo,
  validarResultado,
  toReciboData,
} from '@/lib/parsear-recibo';
import { ejecutarModeloFinanciero, type ParametrosBESS } from '@/lib/modelo-financiero';
import { cargarTodasTarifas, filtrarTarifas } from '@/lib/cargar-tarifas';

// ─── Debug logger ────────────────────────────────────────────────────────────
class AnalisisLog {
  private entries: string[] = [];
  private startTime = Date.now();

  log(msg: string) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const entry = `[${elapsed}s] ${msg}`;
    this.entries.push(entry);
    console.log(`[ANALISIS] ${entry}`);
  }

  warn(msg: string) {
    this.log(`⚠️ ${msg}`);
  }

  error(msg: string) {
    this.log(`❌ ${msg}`);
  }

  getEntries(): string[] {
    return this.entries;
  }

  getText(): string {
    return this.entries.join('\n');
  }
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id as string | undefined;
}

// POST /api/analizar — upload PDFs, parse, run simulation, save results
export async function POST(req: NextRequest) {
  const log = new AnalisisLog();
  log.log('=== INICIO ANÁLISIS ===');

  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const formData = await req.formData();
    const proyectoId = formData.get('proyectoId') as string;

    if (!proyectoId) {
      return NextResponse.json({ error: 'proyectoId requerido' }, { status: 400 });
    }

    // Verify project ownership
    const proyecto = await prisma.proyecto.findFirst({
      where: { id: proyectoId, userId },
    });
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    log.log(`Proyecto: "${proyecto.nombre}" | Potencia: ${proyecto.potenciaKw} kW | Capacidad: ${proyecto.capacidadKwh} kWh`);
    log.log(`Región: ${proyecto.region} | TC: ${proyecto.tipoCambio} | Precio USD: ${proyecto.precioUsd}`);
    log.log(`Estado DB: "${proyecto.estado}" | Municipio DB: "${proyecto.municipio}"`);

    // Load tarifas from bundled CSV (server-side)
    const allTarifas = cargarTodasTarifas();
    log.log(`Tarifas CSV cargadas: ${allTarifas.length} filas totales`);

    // Process uploaded PDFs
    const files = formData.getAll('pdfs') as File[];
    if (files.length === 0) {
      return NextResponse.json({ error: 'No se enviaron archivos PDF' }, { status: 400 });
    }

    // ─── Upload validation (security) ────────────────────────────────────────
    const MAX_FILES = 14;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
    const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Máximo ${MAX_FILES} archivos permitidos` }, { status: 400 });
    }

    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${f.name} excede el límite de 10 MB` },
          { status: 400 },
        );
      }
      if (f.type && f.type !== 'application/pdf') {
        return NextResponse.json(
          { error: `${f.name}: tipo de archivo no permitido` },
          { status: 400 },
        );
      }
      const header = Buffer.from(await f.slice(0, 4).arrayBuffer());
      if (!header.subarray(0, 4).equals(PDF_MAGIC)) {
        return NextResponse.json(
          { error: `${f.name}: no es un archivo PDF válido` },
          { status: 400 },
        );
      }
    }

    log.log(`Archivos PDF recibidos: ${files.length}`);

    const allParsed: any[] = [];
    const errores: string[] = [];

    for (const file of files) {
      log.log(`--- Procesando: ${file.name} (${(file.size / 1024).toFixed(0)} KB) ---`);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const texto = await extraerTextoPdf(buffer);
        log.log(`  Texto extraído: ${texto.length} caracteres`);

        // Log first 300 chars of extracted text for debugging
        const preview = texto.substring(0, 300).replace(/\n/g, ' | ');
        log.log(`  Preview: "${preview}"`);

        const resultados = parsearRecibo(texto, file.name);
        log.log(`  Recibos parseados: ${resultados.length}`);

        for (const r of resultados) {
          r.advertencias = validarResultado(r);
          allParsed.push(r);

          log.log(`  → ${r.mes} ${r.anio} | Tarifa: ${r.tarifa} | Temporada: ${r.temporada}`);
          log.log(`    Estado: "${r.estado}" | Municipio: "${r.municipio}"`);
          log.log(`    Consumos kWh → Base: ${r.consumoBase} | Inter: ${r.consumoIntermedia} | Punta: ${r.consumoPunta} | Total: ${r.totalConsumo}`);
          log.log(`    Demandas kW  → Base: ${r.demandaBase} | Inter: ${r.demandaIntermedia} | Punta: ${r.demandaPunta} | Max: ${r.demandaMaxima}`);
          log.log(`    Factor carga: ${r.factorCarga}% | Factor potencia: ${r.factorPotencia}% | Días: ${r.dias}`);
          log.log(`    Cargo capacidad recibo: $${r.cargoCapacidadRecibo || 0}`);
          log.log(`    Cargo distribución: $${r.cargoDistribucion || 0} | Energía Punta: $${r.cargoEnergiaPunta || 0} | Energía Inter: $${r.cargoEnergiaIntermedia || 0} | Energía Base: $${r.cargoEnergiaBase || 0}`);
          log.log(`    Importe total recibo: $${r.importeTotal || 0}`);

          // Debug: if Energía values are all 0, log text around cost table keywords
          if ((r.cargoEnergiaPunta || 0) === 0 && (r.cargoEnergiaIntermedia || 0) === 0 && (r.cargoEnergiaBase || 0) === 0) {
            // Find keywords that indicate the MEM cost table
            for (const kw of ['Generaci', 'Suministro', 'Energ']) {
              const idx = texto.indexOf(kw);
              if (idx >= 0) {
                const snippet = texto.substring(idx, idx + 200).replace(/\n/g, ' | ');
                log.log(`    [DEBUG Energía] Found "${kw}" at pos ${idx}: "${snippet}"`);
                break;
              }
            }
            // Also log lines containing "Base" with monetary amounts
            const baseLines = texto.split('\n').filter(l => /Base.*\d{1,3}(,\d{3})*\.\d{2}/.test(l));
            if (baseLines.length > 0) {
              log.log(`    [DEBUG Energía] Lines with "Base" + money: ${baseLines.slice(0, 3).map(l => `"${l.trim()}"`).join(' | ')}`);
            }
          }

          if (r.advertencias.length > 0) {
            log.warn(`    Advertencias: ${r.advertencias.join('; ')}`);
          }

          // Flag critical issues
          if (r.totalConsumo === 0) log.error('    ¡Consumo total = 0!');
          if (r.demandaPunta === 0) log.error('    ¡Demanda punta = 0!');
          if (r.demandaMaxima === 0) log.error('    ¡Demanda máxima = 0!');
          if (!r.mes) log.error('    ¡Mes no detectado!');
          if (!r.estado) log.warn('    Estado no detectado');
        }
      } catch (err: any) {
        log.error(`  Error procesando ${file.name}: ${err.message}`);
        errores.push(`${file.name}: ${err.message}`);
      }
    }

    log.log(`=== RESUMEN PARSEO: ${allParsed.length} recibos de ${files.length} archivos, ${errores.length} errores ===`);

    // Sort by year and month (Enero→Diciembre) regardless of upload order
    allParsed.sort((a: any, b: any) => {
      const yearDiff = (a.anio || 0) - (b.anio || 0);
      if (yearDiff !== 0) return yearDiff;
      return (a.mesNum || 0) - (b.mesNum || 0);
    });
    log.log(`Recibos ordenados cronológicamente (Ene→Dic)`);

    // Save recibos to database
    await prisma.recibo.deleteMany({ where: { proyectoId } });
    log.log('Recibos anteriores eliminados');

    for (const parsed of allParsed) {
      await prisma.recibo.create({
        data: {
          proyectoId,
          archivoNombre: parsed.archivoOrigen || '',
          anio: parsed.anio || 0,
          mes: parsed.mes || '',
          mesNum: parsed.mesNum || 0,
          dias: parsed.dias || 30,
          temporada: parsed.temporada || '',
          consumoPunta: parsed.consumoPunta || 0,
          consumoIntermedia: parsed.consumoIntermedia || 0,
          consumoBase: parsed.consumoBase || 0,
          totalConsumo: parsed.totalConsumo || 0,
          demandaPunta: parsed.demandaPunta || 0,
          demandaIntermedia: parsed.demandaIntermedia || 0,
          demandaBase: parsed.demandaBase || 0,
          demandaMaxima: parsed.demandaMaxima || 0,
          factorCarga: parsed.factorCarga || 0,
          factorPotencia: parsed.factorPotencia || 0,
          cargoCapacidadRecibo: parsed.cargoCapacidadRecibo || 0,
          cargoDistribucion: parsed.cargoDistribucion || 0,
          cargoEnergiaPunta: parsed.cargoEnergiaPunta || 0,
          cargoEnergiaIntermedia: parsed.cargoEnergiaIntermedia || 0,
          cargoEnergiaBase: parsed.cargoEnergiaBase || 0,
          importeTotal: parsed.importeTotal || 0,
        },
      });
    }
    log.log(`${allParsed.length} recibos guardados en DB`);

    // Update project estado/municipio from first parsed receipt
    if (allParsed.length > 0) {
      const first = allParsed[0];
      if (first.estado || first.municipio) {
        await prisma.proyecto.update({
          where: { id: proyectoId },
          data: {
            estado: first.estado || proyecto.estado,
            municipio: first.municipio || proyecto.municipio,
          },
        });
        log.log(`Proyecto actualizado: estado="${first.estado || proyecto.estado}", municipio="${first.municipio || proyecto.municipio}"`);
      }
    }

    // Run financial model if we have BESS params and parsed receipts
    let resultadoFinanciero = null;
    if (
      proyecto.potenciaKw > 0 &&
      proyecto.capacidadKwh > 0 &&
      allParsed.length > 0
    ) {
      const params: ParametrosBESS = {
        potenciaKw: proyecto.potenciaKw,
        capacidadKwh: proyecto.capacidadKwh,
        precioUsd: proyecto.precioUsd,
        tipoCambio: proyecto.tipoCambio,
        aniosProyeccion: proyecto.aniosProyeccion,
        region: proyecto.region,
        eficiencia: proyecto.eficiencia,
        horasCargaBase: proyecto.horasCargaBase,
        tasaDegradacion: proyecto.tasaDegradacion,
        ciclosAnuales: proyecto.ciclosAnuales,
      };

      log.log(`=== MODELO FINANCIERO ===`);
      log.log(`Params BESS: ${params.potenciaKw} kW, ${params.capacidadKwh} kWh, región=${params.region}, eficiencia=${params.eficiencia}`);

      const recibosData = allParsed.map(toReciboData);
      const estado = allParsed[0].estado || proyecto.estado;
      const municipio = allParsed[0].municipio || proyecto.municipio;

      log.log(`Ubicación para tarifas: estado="${estado}", municipio="${municipio}"`);

      // Filter tarifas for this project's location
      const tarifas = filtrarTarifas(allTarifas, estado, municipio);
      log.log(`Tarifas filtradas: ${tarifas.length} filas`);

      if (tarifas.length > 0) {
        // Log sample tarifa
        const sample = tarifas[0];
        log.log(`  Ejemplo tarifa: ${sample.estado}/${sample.municipio} | ${sample.mes} | ${sample.intHorario} | cap=${sample.capacidad} $/kW | monto=${sample.monto} $/kWh`);

        // Log all unique months in tarifas
        const mesesTarifa = Array.from(new Set(tarifas.map((t) => t.mes)));
        log.log(`  Meses en tarifas: ${mesesTarifa.join(', ')}`);

        // Log horarios for debugging tarifa matching
        const horarios = Array.from(new Set(tarifas.map((t) => t.intHorario.trim())));
        log.log(`  Int. Horarios en tarifas: ${horarios.join(', ')}`);
        log.log(`  Tarifas por horario: ${horarios.map(h => `${h}=${tarifas.filter(t => t.intHorario.trim() === h).length}`).join(', ')}`);

        // Check if PUNTA rows exist
        const puntaRows = tarifas.filter(t => t.intHorario.trim().toUpperCase() === 'PUNTA');
        const baseRows = tarifas.filter(t => t.intHorario.trim().toUpperCase() === 'BASE');
        log.log(`  Filas PUNTA: ${puntaRows.length} | Filas BASE: ${baseRows.length}`);

        if (puntaRows.length === 0) {
          log.warn(`  ¡NO hay tarifas PUNTA! Solo hay: ${horarios.join(', ')}`);
        }

        // Log all unique months in recibos
        const mesesRecibos = recibosData.map((r) => `${r.mes} (mesNum=${r.mesNum})`);
        log.log(`  Meses en recibos: ${mesesRecibos.join(', ')}`);

        // Log tarifa-estado mismatch warning
        if (sample.estado.toUpperCase() !== estado.toUpperCase()) {
          log.warn(`  Tarifas son de ${sample.estado}/${sample.municipio} (fallback) — proyecto es ${estado}/${municipio}`);
          log.log(`  Lookup usa fallback: búsqueda por mes+intHorario (sin filtro de ubicación)`);
        }
        try {
          resultadoFinanciero = ejecutarModeloFinanciero(
            params,
            recibosData,
            tarifas,
            estado,
            municipio,
          );

          log.log(`Modelo ejecutado exitosamente`);
          log.log(`  Inversión MXN: $${resultadoFinanciero.inversionMxn.toLocaleString()}`);
          log.log(`  Ahorro neto anual: $${resultadoFinanciero.totales.ahorroNeto.toLocaleString()}`);
          log.log(`  Ahorro capacidad: $${resultadoFinanciero.totales.ahorroCapacidad.toLocaleString()}`);
          log.log(`  Costo carga base: $${resultadoFinanciero.totales.costoCargaBase.toLocaleString()}`);
          log.log(`  % Ahorro: ${resultadoFinanciero.totales.pctAhorroNeto.toFixed(1)}%`);
          log.log(`  ROI: ${resultadoFinanciero.roiExacto ?? 'N/A'} años`);

          // Log each comparativo row
          log.log(`  --- Comparativo por periodo ---`);
          for (const c of resultadoFinanciero.comparativo) {
            log.log(`  ${c.periodo}: sinBESS=$${c.cargoSinBess.toFixed(2)} | conBESS=$${c.cargoConBess.toFixed(2)} | ahorroCap=$${c.ahorroCapacidad.toFixed(2)} | costoCarga=$${c.costoCargaBase.toFixed(2)} | neto=$${c.ahorroNeto.toFixed(2)}`);
          }

          // Save results JSON
          await prisma.proyecto.update({
            where: { id: proyectoId },
            data: { resultadosJson: JSON.stringify(resultadoFinanciero) },
          });
          log.log('Resultados guardados en DB');
        } catch (modelErr: any) {
          log.error(`Error en modelo financiero: ${modelErr.message}`);
          if (process.env.NODE_ENV !== 'production') {
            log.error(`Stack: ${modelErr.stack?.substring(0, 500)}`);
          }
          errores.push(`Modelo financiero: ${modelErr.message}`);
        }
      } else {
        log.warn(`No se encontraron tarifas para ${estado}/${municipio} — modelo NO ejecutado`);
        log.warn(`Estados disponibles en CSV: ${Array.from(new Set(allTarifas.map((t) => t.estado))).join(', ')}`);
      }
    } else {
      log.warn(`Modelo NO ejecutado — potencia=${proyecto.potenciaKw}, capacidad=${proyecto.capacidadKwh}, recibos=${allParsed.length}`);
    }

    log.log('=== FIN ANÁLISIS ===');

    return NextResponse.json({
      recibos: allParsed.length,
      errores,
      resultadoFinanciero,
      ...(process.env.NODE_ENV !== 'production' ? { log: log.getEntries() } : {}),
    });
  } catch (err: any) {
    log.error(`Error fatal: ${err.message}`);
    console.error('Error en analizar:', err);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'production'
          ? 'Error interno del servidor'
          : (err.message || 'Error interno'),
        ...(process.env.NODE_ENV !== 'production' ? { log: log.getEntries() } : {}),
      },
      { status: 500 },
    );
  }
}
