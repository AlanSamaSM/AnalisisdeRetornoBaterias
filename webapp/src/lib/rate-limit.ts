// =============================================================================
// RATE LIMITER — In-memory para entornos serverless
// Implementa limitación de tasa con ventana de tiempo fija (Fixed Window)
// Compatible con Vercel Serverless Functions sin dependencias externas
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpieza periódica de entradas expiradas (cada 60s)
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => store.delete(key));
}

export interface RateLimitConfig {
  /** Máximo de solicitudes permitidas en la ventana de tiempo */
  maxRequests: number;
  /** Duración de la ventana de tiempo en milisegundos */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;
}

/**
 * Verifica si una solicitud está dentro del límite de tasa para un identificador dado.
 * @param identifier - Identificador único (IP, userId, etc.)
 * @param config - Configuración de límite de tasa
 * @returns Resultado indicando si la solicitud es permitida
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Nueva ventana
    store.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

// ─── Configuraciones predefinidas por endpoint ───────────────────────────────

/** Registro: 5 intentos por IP cada 15 minutos */
export const RATE_LIMIT_REGISTRO: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000,
};

/** Login: 10 intentos por IP cada 15 minutos */
export const RATE_LIMIT_LOGIN: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
};

/** Análisis de PDFs: 20 solicitudes por usuario cada 10 minutos */
export const RATE_LIMIT_ANALIZAR: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 10 * 60 * 1000,
};

/**
 * Extrae la IP del cliente desde los headers de la solicitud.
 * Compatible con Vercel (x-forwarded-for) y desarrollo local.
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}
