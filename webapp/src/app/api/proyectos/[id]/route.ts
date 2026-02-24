// ─── API: Proyecto individual ────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id as string | undefined;
}

// GET /api/proyectos/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const proyecto = await prisma.proyecto.findFirst({
    where: { id: params.id, userId },
    include: { recibos: { orderBy: [{ anio: 'asc' }, { mesNum: 'asc' }] } },
  });

  if (!proyecto) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  return NextResponse.json(proyecto);
}

// PATCH /api/proyectos/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const exists = await prisma.proyecto.findFirst({
    where: { id: params.id, userId },
  });
  if (!exists) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  const body = await req.json();

  // Whitelist: only allow updating these fields to prevent overwriting protected ones
  const ALLOWED_FIELDS = [
    'nombre', 'cliente', 'estado', 'municipio', 'region', 'tarifa', 'notas',
    'potenciaKw', 'capacidadKwh', 'precioUsd', 'tipoCambio',
    'aniosProyeccion', 'eficiencia', 'horasCargaBase',
  ] as const;

  const safeData = Object.fromEntries(
    Object.entries(body).filter(([key]) => ALLOWED_FIELDS.includes(key as any)),
  );

  if (Object.keys(safeData).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos para actualizar' }, { status: 400 });
  }

  const proyecto = await prisma.proyecto.update({
    where: { id: params.id },
    data: safeData,
  });

  return NextResponse.json(proyecto);
}

// DELETE /api/proyectos/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const exists = await prisma.proyecto.findFirst({
    where: { id: params.id, userId },
  });
  if (!exists) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  }

  await prisma.proyecto.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
