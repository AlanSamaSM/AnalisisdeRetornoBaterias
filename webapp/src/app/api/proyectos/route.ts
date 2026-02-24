// ─── API: CRUD Proyectos ────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id as string | undefined;
}

// GET /api/proyectos — lista proyectos del usuario
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const proyectos = await prisma.proyecto.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { recibos: { select: { id: true, mes: true, anio: true } } },
  });

  return NextResponse.json(proyectos);
}

// POST /api/proyectos — crear nuevo proyecto
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const {
    nombre,
    cliente,
    estado,
    municipio,
    region,
    potenciaKw,
    capacidadKwh,
    precioUsd,
    tipoCambio,
    aniosProyeccion,
    eficiencia,
    horasCargaBase,
  } = body;

  if (!nombre) {
    return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 });
  }

  const proyecto = await prisma.proyecto.create({
    data: {
      nombre,
      cliente: cliente || '',
      estado: estado || '',
      municipio: municipio || '',
      region: region || 'NORTE',
      potenciaKw: potenciaKw || 0,
      capacidadKwh: capacidadKwh || 0,
      precioUsd: precioUsd || 0,
      tipoCambio: tipoCambio || 18.5,
      aniosProyeccion: aniosProyeccion || 15,
      eficiencia: eficiencia || 0.9,
      horasCargaBase: horasCargaBase || 6,
      userId,
    },
  });

  return NextResponse.json(proyecto, { status: 201 });
}
