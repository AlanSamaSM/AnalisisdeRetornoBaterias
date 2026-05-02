// ─── API: Recibos — POST crea recibo manual ─────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id as string | undefined;
}

const MESES_NUMERO: Record<string, number> = {
  Enero: 1, Febrero: 2, Marzo: 3, Abril: 4,
  Mayo: 5, Junio: 6, Julio: 7, Agosto: 8,
  Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};

function detectarTemporada(mesNum: number): string {
  return mesNum >= 4 && mesNum <= 10 ? 'VERANO' : 'INVIERNO';
}

function num(v: any, fallback = 0): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

// POST /api/recibos — crear recibo manual asociado a un proyecto
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const { proyectoId, mes, anio } = body;

  if (!proyectoId || !mes || !anio) {
    return NextResponse.json(
      { error: 'proyectoId, mes y anio son requeridos' },
      { status: 400 },
    );
  }

  // Verify ownership
  const proyecto = await prisma.proyecto.findFirst({
    where: { id: proyectoId, userId },
  });
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }

  const mesNum = MESES_NUMERO[mes];
  if (!mesNum) {
    return NextResponse.json({ error: 'Mes inválido' }, { status: 400 });
  }

  const anioNum = parseInt(String(anio), 10);
  if (isNaN(anioNum) || anioNum < 2000 || anioNum > 2100) {
    return NextResponse.json({ error: 'Año inválido' }, { status: 400 });
  }

  // Avoid duplicates: enforce @@unique([proyectoId, mes, anio])
  const existente = await prisma.recibo.findFirst({
    where: { proyectoId, mes, anio: anioNum },
  });
  if (existente) {
    return NextResponse.json(
      { error: `Ya existe un recibo para ${mes} ${anioNum}` },
      { status: 409 },
    );
  }

  const recibo = await prisma.recibo.create({
    data: {
      proyectoId,
      archivoNombre: body.archivoNombre || '(manual)',
      anio: anioNum,
      mes,
      mesNum,
      dias: num(body.dias, 30),
      temporada: body.temporada || detectarTemporada(mesNum),
      consumoPunta: num(body.consumoPunta),
      consumoIntermedia: num(body.consumoIntermedia),
      consumoBase: num(body.consumoBase),
      totalConsumo: num(body.totalConsumo),
      demandaPunta: num(body.demandaPunta),
      demandaIntermedia: num(body.demandaIntermedia),
      demandaBase: num(body.demandaBase),
      demandaMaxima: num(body.demandaMaxima),
      factorCarga: num(body.factorCarga),
      factorPotencia: num(body.factorPotencia),
      cargoCapacidadRecibo: num(body.cargoCapacidadRecibo),
      cargoDistribucion: num(body.cargoDistribucion),
      cargoEnergiaPunta: num(body.cargoEnergiaPunta),
      cargoEnergiaIntermedia: num(body.cargoEnergiaIntermedia),
      cargoEnergiaBase: num(body.cargoEnergiaBase),
      importeTotal: num(body.importeTotal),
    },
  });

  return NextResponse.json(recibo, { status: 201 });
}
