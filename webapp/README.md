# BESS Analyzer — Webapp

Aplicación web para análisis de retorno de inversión de sistemas de almacenamiento de energía con baterías (BESS), en tarifa GDMTH de CFE.

## Arquitectura

- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + Recharts
- **Auth**: NextAuth.js (email/contraseña)
- **Database**: SQLite vía Prisma ORM
- **PDF Parsing**: pdf-parse (extracción de texto)
- **PDF Reports**: jsPDF + jspdf-autotable
- **Deploy Target**: Hostinger (Node.js hosting)

## Estructura

```
webapp/
├── prisma/             # Schema + seed
├── src/
│   ├── app/            # Next.js pages & API routes
│   │   ├── api/        # REST endpoints
│   │   ├── dashboard/  # Lista de proyectos
│   │   ├── login/      # Inicio de sesión
│   │   ├── registro/   # Registro de usuario
│   │   └── proyecto/   # Nuevo proyecto + vista de resultados
│   ├── components/     # React components
│   └── lib/            # Core business logic (TS ports)
│       ├── simulador-bess.ts
│       ├── calcular-capacidad.ts
│       ├── modelo-financiero.ts
│       └── parsear-recibo.ts
```

## Setup local

```bash
cd webapp

# Instalar dependencias
npm install

# Crear archivo de entorno
cp .env.local.example .env.local
# Editar NEXTAUTH_SECRET con un valor seguro

# Inicializar base de datos
npx prisma db push

# Crear usuario de prueba
npm run db:seed
# → admin@bess.mx / admin123

# Iniciar servidor de desarrollo
npm run dev
```

Abrir http://localhost:3000

## Flujo de uso

1. Iniciar sesión (o crear cuenta)
2. Crear un nuevo proyecto: nombre, cliente, parámetros BESS (kW/kWh), precio, T.C.
3. Cargar recibos CFE (PDFs) → la app extrae datos automáticamente
4. Ver resultados: KPIs, comparativo mensual, gráfica de flujo de caja
5. Descargar reporte PDF

## Deploy en Hostinger

```bash
# Build
npm run build

# La salida está en .next/standalone/
# Copiar .next/standalone + .next/static + public a Hostinger

# En Hostinger:
# - Node.js version: 18 o 20
# - Entry point: server.js (o .next/standalone/server.js)
# - Puerto: el que asigne Hostinger (usar process.env.PORT)
```

### .htaccess (si aplica)
Hostinger maneja el routing a Node.js automáticamente.

## Notas técnicas

- Los cálculos son ports fieles de los scripts Python originales
- La fórmula CFE: `D_facturable = min(D_punta, floor(Q / (24 × d × FC)))`
- Factor de carga usa `demanda_punta` (no `demanda_maxima`)
- Horarios PUNTA GDMTH: NORTE/CENTRAL (V:2h, I:4h), BCS (V:10h, I:0h)
- Tasa de crecimiento tarifario: 8% anual
- Eficiencia BESS: 90%
