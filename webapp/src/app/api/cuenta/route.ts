// ─── API: Eliminar cuenta de usuario y todos sus datos ──────────────────────
// Derecho de Cancelación (ARCO) — LFPDPPP 2025
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 },
      );
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 },
      );
    }

    // Eliminar el usuario — Prisma cascade eliminará:
    // 1. Todos los proyectos del usuario
    // 2. Todos los recibos de cada proyecto
    // 3. Todos los resultadosJson de cada proyecto
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json(
      { message: 'Cuenta eliminada exitosamente. Todos los datos asociados han sido suprimidos.' },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error al eliminar cuenta:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
