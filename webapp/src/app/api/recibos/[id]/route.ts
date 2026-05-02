// ─── API: Recibo individual — PATCH (editar) y DELETE ───────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id as string | undefined;
}

// Verifica que el recibo exista y pertenezca a un proyecto del usuario
async function verificarPropiedad(reciboId: string, userId: string) {
  return prisma.recibo.findFirst({
    where: {
      id: reciboId,
      proyecto: { userId },
    },
  });
}

// Campos numéricos editables
const NUMERIC_FIELDS = [
  'dias',
  'consumoPunta', 'consumoIntermedia', 'consumoBase', 'totalConsumo',
  'demandaPunta', 'demandaIntermedia', 'demandaBase', 'demandaMaxima',
  'factorCarga', 'factorPotencia',
  'cargoCapacidadRecibo', 'cargoDistribucion',
  'cargoEnergiaPunta', 'cargoEnergiaIntermedia', 'cargoEnergiaBase',
  'importeTotal',
] as const;

const STRING_FIELDS = ['temporada'] as const;

// PATCH /api/recibos/[id] — actualizar valores de un recibo
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const recibo = await verificarPropiedad(params.id, userId);
  if (!recibo) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  const body = await req.json();
  const safeData: Record<string, unknown> = {};

  for (const f of NUMERIC_FIELDS) {
    if (f in body) {
      const n = Number(body[f]);
      if (!isNaN(n)) safeData[f] = n;
    }
  }
  for (const f of STRING_FIELDS) {
    if (f in body && typeof body[f] === 'string') {
      safeData[f] = body[f];
    }
  }

  if (Object.keys(safeData).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos para actualizar' }, { status: 400 });
  }

  const updated = await prisma.recibo.update({
    where: { id: params.id },
    data: safeData,
  });

  return NextResponse.json(updated);
}

// DELETE /api/recibos/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const recibo = await verificarPropiedad(params.id, userId);
  if (!recibo) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  await prisma.recibo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
