// ─── NextAuth Configuration ─────────────────────────────────────────────────
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { rateLimit, RATE_LIMIT_LOGIN } from './rate-limit';

// Almacén simple de intentos fallidos para bloqueo temporal por email
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos

function checkAccountLockout(email: string): { locked: boolean; remainingMs: number } {
  const entry = failedAttempts.get(email);
  if (!entry || entry.count < LOCKOUT_THRESHOLD) return { locked: false, remainingMs: 0 };
  const elapsed = Date.now() - entry.lastAttempt;
  if (elapsed > LOCKOUT_DURATION_MS) {
    failedAttempts.delete(email);
    return { locked: false, remainingMs: 0 };
  }
  return { locked: true, remainingMs: LOCKOUT_DURATION_MS - elapsed };
}

function recordFailedAttempt(email: string): void {
  const entry = failedAttempts.get(email);
  if (!entry) {
    failedAttempts.set(email, { count: 1, lastAttempt: Date.now() });
  } else {
    entry.count++;
    entry.lastAttempt = Date.now();
  }
}

function clearFailedAttempts(email: string): void {
  failedAttempts.delete(email);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Rate limiting por IP (cuando disponible)
        const forwarded = (req?.headers as any)?.['x-forwarded-for'];
        const ip = typeof forwarded === 'string'
          ? forwarded.split(',')[0]?.trim()
          : '127.0.0.1';
        const rl = rateLimit(`login:${ip}`, RATE_LIMIT_LOGIN);
        if (!rl.success) return null;

        // Verificar bloqueo de cuenta por intentos fallidos
        const lockout = checkAccountLockout(email);
        if (lockout.locked) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user) {
          recordFailedAttempt(email);
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          recordFailedAttempt(email);
          return null;
        }

        // Login exitoso — limpiar intentos fallidos
        clearFailedAttempts(email);

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
