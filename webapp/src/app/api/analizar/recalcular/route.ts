// ─── API: Recalcular — corre el modelo financiero con los recibos ya en DB ──
// No parsea PDFs ni modifica recibos. Útil para re-ejecutar el análisis tras
// editar valores de recibos o parámetros del proyecto.
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ejecutarModeloFinanciero, type ParametrosBESS } from '@/lib/modelo-financiero';
import { cargarTodasTarifas, filtrarTarifas } from '@/lib/cargar-tarifas';
import { rateLimit, RATE_LIMIT_ANALIZAR } from '@/lib/rate-limit';
import type { ReciboData } from '@/lib/calcular-capacidad';

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id as string | undefined;
}

// POST /api/analizar/recalcular — body: { proyectoId }
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Reusa el mismo rate limit que /analizar
  const rl = rateLimit(`recalcular:${userId}`, RATE_LIMIT_ANALIZAR);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intente de nuevo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetIn / 1000)) } },
    );
  }

  const body = await req.json();
  const { proyectoId } = body;
  if (!proyectoId) {
    return NextResponse.json({ error: 'proyectoId requerido' }, { status: 400 });
  }

  const proyecto = await prisma.proyecto.findFirst({
    where: { id: proyectoId, userId },
    include: { recibos: { orderBy: [{ anio: 'asc' }, { mesNum: 'asc' }] } },
  });
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }

  if (proyecto.recibos.length === 0) {
    return NextResponse.json(
      { error: 'No hay recibos cargados para este proyecto' },
      { status: 400 },
    );
  }

  if (proyecto.potenciaKw <= 0 || proyecto.capacidadKwh <= 0) {
    return NextResponse.json(
      { error: 'Faltan parámetros BESS (potencia y/o capacidad)' },
      { status: 400 },
    );
  }

  const recibosData: ReciboData[] = proyecto.recibos.map((r) => ({
    mes: r.mes,
    mesNum: r.mesNum,
    anio: r.anio,
    dias: r.dias,
    temporada: r.temporada,
    consumoPunta: r.consumoPunta,
    consumoIntermedia: r.consumoIntermedia,
    consumoBase: r.consumoBase,
    totalConsumo: r.totalConsumo,
    demandaPunta: r.demandaPunta,
    demandaIntermedia: r.demandaIntermedia,
    demandaBase: r.demandaBase,
    demandaMaxima: r.demandaMaxima,
    factorCarga: r.factorCarga,
    factorPotencia: r.factorPotencia,
    cargoCapacidadRecibo: r.cargoCapacidadRecibo,
    cargoDistribucion: r.cargoDistribucion,
    cargoEnergiaPunta: r.cargoEnergiaPunta,
    cargoEnergiaIntermedia: r.cargoEnergiaIntermedia,
    cargoEnergiaBase: r.cargoEnergiaBase,
    importeTotal: r.importeTotal,
  }));

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
    umbralRecompra: proyecto.umbralRecompra,
  };

  const division = proyecto.division ?? 'Norte';
  const allTarifas = cargarTodasTarifas();
  const tarifas = filtrarTarifas(allTarifas, division);

  if (tarifas.length === 0) {
    return NextResponse.json(
      { error: `No se encontraron tarifas para división "${division}"` },
      { status: 500 },
    );
  }

  try {
    const resultadoFinanciero = ejecutarModeloFinanciero(
      params,
      recibosData,
      tarifas,
      division,
    );

    await prisma.proyecto.update({
      where: { id: proyectoId },
      data: { resultadosJson: JSON.stringify(resultadoFinanciero) },
    });

    return NextResponse.json({
      ok: true,
      recibos: proyecto.recibos.length,
      resultadoFinanciero,
    });
  } catch (err: any) {
    console.error('Error recalculando:', err);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'production'
          ? 'Error al recalcular'
          : err.message || 'Error interno',
      },
      { status: 500 },
    );
  }
}
