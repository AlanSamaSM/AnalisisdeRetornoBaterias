// ─── API: CRUD Proyectos ────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  DIVISIONES_CFE,
  DIVISION_DEFAULT,
  regionIrradiacionDeDivision,
} from '@/lib/divisiones';

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
    estado,
    municipio,
    division,
    potenciaKw,
    capacidadKwh,
    precioUsd,
    tipoCambio,
    aniosProyeccion,
    eficiencia,
    horasCargaBase,
    marcaBess,
    modeloBess,
    tecnologiaBess,
    vidaUtilAnios,
    garantiaAnios,
    capacidadContratada,
    integrador,
    preparadoPor,
    tasaDegradacion,
    ciclosAnuales,
    umbralRecompra,
  } = body;

  if (!nombre) {
    return NextResponse.json({ error: 'Nombre es requerido' }, { status: 400 });
  }

  // Input validation — cap string lengths and validate numeric ranges
  const safeName = String(nombre).substring(0, 200);
  const safeEstado = String(estado || '').substring(0, 100);
  const safeMunicipio = String(municipio || '').substring(0, 100);
  const safeDivision = (DIVISIONES_CFE as readonly string[]).includes(division)
    ? (division as string)
    : DIVISION_DEFAULT;
  // Región de irradiación (NORTE/CENTRAL/BAJA CALIFORNIA SUR) derivada de la división
  const safeRegion = regionIrradiacionDeDivision(safeDivision);
  const safeTecnologia = ['LFP', 'NMC', 'LTO', 'NaS'].includes(tecnologiaBess) ? tecnologiaBess : 'LFP';

  const numVal = (v: any, min: number, max: number, fallback: number) => {
    const n = Number(v);
    return isNaN(n) || n < min || n > max ? fallback : n;
  };

  const proyecto = await prisma.proyecto.create({
    data: {
      nombre: safeName,
      estado: safeEstado,
      municipio: safeMunicipio,
      region: safeRegion,
      division: safeDivision,
      potenciaKw: numVal(potenciaKw, 0, 100000, 0),
      capacidadKwh: numVal(capacidadKwh, 0, 1000000, 0),
      precioUsd: numVal(precioUsd, 0, 10000000, 0),
      tipoCambio: numVal(tipoCambio, 1, 100, 18.5),
      aniosProyeccion: numVal(aniosProyeccion, 1, 50, 15),
      eficiencia: numVal(eficiencia, 0.01, 1, 0.9),
      horasCargaBase: numVal(horasCargaBase, 1, 24, 6),
      marcaBess: String(marcaBess || '').substring(0, 100),
      modeloBess: String(modeloBess || '').substring(0, 100),
      tecnologiaBess: safeTecnologia,
      vidaUtilAnios: numVal(vidaUtilAnios, 1, 30, 15),
      garantiaAnios: numVal(garantiaAnios, 0, 25, 5),
      capacidadContratada: numVal(capacidadContratada, 0, 100000, 0),
      integrador: String(integrador || '').substring(0, 200),
      preparadoPor: String(preparadoPor || '').substring(0, 200),
      tasaDegradacion: numVal(tasaDegradacion, 0, 0.10, 0.02),
      ciclosAnuales: numVal(ciclosAnuales, 1, 1000, 300),
      umbralRecompra: numVal(umbralRecompra, 0.50, 0.95, 0.70),
      userId,
    },
  });

  return NextResponse.json(proyecto, { status: 201 });
}
