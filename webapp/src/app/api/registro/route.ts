// ─── API: Registrar nuevo usuario ───────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, name, password, empresa } = await req.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, nombre y contraseña son requeridos' },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).toLowerCase())) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 },
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 },
      );
    }

    if (String(name).trim().length < 2) {
      return NextResponse.json(
        { error: 'El nombre debe tener al menos 2 caracteres' },
        { status: 400 },
      );
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, password: hashed, empresa },
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 },
    );
  } catch (err) {
    console.error('Error en registro:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
