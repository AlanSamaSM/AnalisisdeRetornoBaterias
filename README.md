# Analisis de Retorno Baterias / BESS Analyzer

Repositorio para analisis tecnico-financiero de sistemas BESS bajo tarifa GDMTH de CFE.

Hoy este proyecto ya no es solo un set de scripts en Python. El repositorio contiene dos superficies operativas que conviven:

1. Un pipeline original en Python para ingesta, calculo tarifario y corrida batch del modelo financiero.
2. Una aplicacion web en Next.js 14 que empaqueta esa misma logica en una experiencia con autenticacion, base de datos, carga de recibos PDF y exportes profesionales.

La app web es la superficie principal actual. Los scripts en Python siguen siendo utiles como referencia del modelo, para pruebas locales, lotes manuales y validacion cruzada de resultados.

## Resumen ejecutivo

- Alcance principal: analisis de ahorro y retorno de inversion para sistemas BESS en clientes CFE con tarifa GDMTH.
- Caso de uso central: reducir demanda en horario punta, recalcular cargos por capacidad y estimar ahorro neto contra el costo de recarga en horario base.
- Entradas principales: recibos CFE en PDF, base de tarifas GDMTH, parametros del sistema BESS y supuestos financieros.
- Salidas principales: comparativos mensuales, tabla de inversion de capital, KPIs de ahorro, flujo acumulado y reportes PDF/Excel/CSV.
- Persistencia actual: la webapp usa Prisma sobre PostgreSQL y guarda usuarios, proyectos, recibos y resultados serializados.
- Cobertura funcional actual: BESS sobre GDMTH. No es un cotizador solar FV generalista.

## Que incluye el repositorio

```text
AnalisisdeRetornoBaterias/
|-- app_ingesta.py
|-- ingestar_recibos.py
|-- calcular_capacidad.py
|-- simulador_bess.py
|-- modelo_financiero.py
|-- BASE DE DATOS DE CONSUMOS/
|-- BASE DE DATOS TARIFAS GDMTH/
|-- RECIBOS/
|-- CARGO_CAPACIDAD_CALCULADO.csv
|-- COMPARATIVO_RECIBOS.csv
|-- INVERSION_CAPITAL.csv
|-- SIMULACION_BESS_CAPACIDAD.csv
|-- ESTRATEGIA.md
`-- webapp/
    |-- prisma/
    |   |-- schema.prisma
    |   `-- seed.ts
    |-- data/
    |   `-- tarifas_gdmth.csv
    `-- src/
        |-- app/
        |   |-- api/
        |   |-- dashboard/
        |   |-- login/
        |   |-- proyecto/
        |   `-- registro/
        |-- components/
        `-- lib/
```

## Arquitectura real del proyecto

### 1. Pipeline Python original

Este pipeline sigue el flujo clasico de Quartux/BESS:

1. Extraer datos de recibos CFE.
2. Generar una base estructurada de consumo.
3. Calcular el cargo por capacidad con la formula GDMTH.
4. Simular el BESS por periodo.
5. Construir comparativos y tabla de retorno de inversion.

#### Archivos Python clave

| Archivo | Rol real en el proyecto | Salida principal |
|---|---|---|
| `app_ingesta.py` | Interfaz Streamlit para cargar PDFs, revisar datos extraidos y exportar la base de consumo | `BASE DE DATO DE CONSUMO.csv` |
| `ingestar_recibos.py` | Modulo de extraccion y parseo de recibos CFE GDMTH; usa PyMuPDF y opcionalmente Google Document AI | Datos estructurados por recibo |
| `calcular_capacidad.py` | Calcula demanda facturable y cargo por capacidad usando consumos y tarifas | `CARGO_CAPACIDAD_CALCULADO.csv` |
| `simulador_bess.py` | Modelo operativo del BESS por region y temporada; peak shaving y recarga en base | Datos de simulacion por periodo |
| `modelo_financiero.py` | Orquesta la simulacion financiera completa, comparativos y ROI multi-anual | `COMPARATIVO_RECIBOS.csv`, `INVERSION_CAPITAL.csv` |

#### Ingesta de recibos en Python

- `ingestar_recibos.py` primero intenta extraer texto con PyMuPDF.
- Si el PDF tiene poco texto util o el usuario fuerza OCR, puede usar Google Document AI.
- El parser identifica estado, municipio, periodo facturado, dias, consumos por horario, demandas, factor de carga y factor de potencia.
- El flujo soporta meses con sub-periodos, especialmente abril y octubre.

#### Simulacion BESS en Python

- Regiones soportadas: `NORTE`, `CENTRAL`, `BAJA CALIFORNIA SUR`.
- Horarios punta embebidos en el codigo.
- En `NORTE` y `CENTRAL`: verano 2 horas punta, invierno 4 horas punta.
- En `BAJA CALIFORNIA SUR`: verano 10 horas punta, invierno sin punta.
- El modelo descarga en punta para reducir demanda y recarga en horario base para estimar el costo incremental de energia.

### 2. Aplicacion web actual (`webapp/`)

La webapp es la evolucion productizada del modelo. Reimplementa en TypeScript la logica critica de ingesta, calculo tarifario y simulacion financiera, y la expone como producto web con autenticacion y persistencia.

#### Stack tecnico

- Framework: Next.js 14 con App Router.
- Lenguaje: TypeScript.
- UI: React 18 + Tailwind CSS + Recharts.
- Autenticacion: NextAuth con credenciales email/password.
- Persistencia: Prisma ORM sobre PostgreSQL.
- Exportes: jsPDF, jspdf-autotable y ExcelJS.
- Parsing de PDF: `pdfjs-dist` del lado servidor.
- Seguridad: middleware protegido, rate limiting en memoria, validaciones de upload y cabeceras HTTP endurecidas.

#### Superficies funcionales de la webapp

| Superficie | Funcion |
|---|---|
| Landing y paginas legales | Presentacion comercial, aviso de privacidad y terminos |
| Registro / login | Alta de usuarios y acceso con credenciales |
| Dashboard | Listado de proyectos creados por el usuario |
| Proyecto nuevo | Captura de parametros tecnicos y comerciales del BESS |
| Proyecto individual | Carga de recibos, analisis, KPIs, tablas, grafica y descargas |
| API interna | CRUD de proyectos, registro, analisis y eliminacion de cuenta |

#### Rutas API implementadas

| Ruta | Metodo(s) | Funcion |
|---|---|---|
| `/api/auth/[...nextauth]` | auth | Sesiones con NextAuth |
| `/api/registro` | `POST` | Crear usuario nuevo |
| `/api/proyectos` | `GET`, `POST` | Listar y crear proyectos |
| `/api/proyectos/[id]` | `GET`, `PATCH`, `DELETE` | Leer, actualizar y eliminar un proyecto |
| `/api/analizar` | `POST` | Procesar PDFs, parsear recibos, correr modelo financiero y persistir resultados |
| `/api/cuenta` | `DELETE` | Eliminar la cuenta y todos los datos relacionados |

#### Librerias de dominio clave en `webapp/src/lib/`

| Archivo | Rol |
|---|---|
| `parsear-recibo.ts` | Port de `ingestar_recibos.py` para extraer y normalizar recibos CFE |
| `calcular-capacidad.ts` | Port del calculo de demanda facturable y cargo por capacidad |
| `simulador-bess.ts` | Port del modelo operativo de peak shaving |
| `modelo-financiero.ts` | Orquestacion del resultado financiero completo |
| `cargar-tarifas.ts` | Carga y filtro de tarifas GDMTH desde CSV empaquetado |
| `generar-reporte-pdf.ts` | Construye reporte PDF multipagina tipo propuesta tecnica-economica |
| `generar-reporte-excel.ts` | Construye workbook Excel multi-hoja |
| `exportar-tablas.ts` | Exportes tabulares adicionales |
| `auth.ts` | Configuracion NextAuth, bcrypt, lockout y callbacks de sesion |
| `rate-limit.ts` | Rate limiting fijo para registro, login y analisis |

## Flujo funcional end-to-end

### Opcion A: flujo Python

1. Cargar recibos PDF en `app_ingesta.py` o preparar la base manualmente.
2. Generar `BASE DE DATO DE CONSUMO.csv`.
3. Ejecutar `calcular_capacidad.py` para obtener `CARGO_CAPACIDAD_CALCULADO.csv`.
4. Ejecutar `modelo_financiero.py` e ingresar potencia, capacidad, precio, anos y tipo de cambio.
5. Revisar `COMPARATIVO_RECIBOS.csv` e `INVERSION_CAPITAL.csv`.

### Opcion B: flujo web

1. Crear cuenta o iniciar sesion.
2. Crear un proyecto con parametros del BESS y metadatos comerciales.
3. Cargar hasta 14 recibos CFE en PDF.
4. La API parsea, valida, ordena y guarda los recibos en base de datos.
5. El modelo financiero calcula KPIs, comparativos, estructura de costos, desplazamiento de carga y ROI.
6. El usuario descarga reporte PDF, reporte Excel y tablas exportables.

## Formula y supuestos de negocio

### Cargo por capacidad GDMTH

La logica base del proyecto gira alrededor de la demanda facturable:

```text
D_facturable = min(D_punta, floor(Q_mensual / (24 * d * FC)))
```

Donde:

- `D_punta` es la demanda punta registrada.
- `Q_mensual` es el consumo total del periodo.
- `d` es el numero de dias del periodo facturado.
- `FC` es el factor de carga.

### Supuestos operativos y financieros implementados

| Concepto | Valor / comportamiento actual |
|---|---|
| Tarifa objetivo | GDMTH CFE |
| Eficiencia BESS | 90% por default |
| Horas de carga en base | 6 por default |
| Crecimiento tarifario anual | 8% |
| Proyeccion default en webapp | 15 anos |
| Tecnologia default | LFP |
| Degradacion default | 2% anual |
| Ciclos anuales default | 300 |
| Umbral de recompra | 70% |
| Regiones soportadas | `NORTE`, `CENTRAL`, `BAJA CALIFORNIA SUR` |

### Que modela el sistema

- Reduccion de demanda en horario punta.
- Costo de recarga del BESS en horario base.
- Ahorro neto mensual y anual.
- Estructura de costos de la factura electrica.
- Tabla de inversion de capital multi-anual.
- ROI exacto y ahorro acumulado en vida util.
- Degradacion y umbral de recompra en la webapp.

## Modelo de datos de la webapp

La base Prisma define tres entidades principales:

| Modelo | Contenido |
|---|---|
| `User` | Usuario autenticado, email, password hasheado y empresa |
| `Proyecto` | Parametros del sistema BESS, configuracion comercial, ubicacion y resultados serializados |
| `Recibo` | Datos estructurados extraidos de cada PDF CFE |

### Datos guardados por proyecto

Cada proyecto puede almacenar, entre otros:

- Nombre, cliente, estado, municipio, region y tarifa.
- Potencia kW, capacidad kWh, precio USD, tipo de cambio y anos de proyeccion.
- Parametros tecnicos como eficiencia, horas de carga, degradacion, ciclos y umbral de recompra.
- Metadatos comerciales como integrador y preparado por.
- `resultadosJson` con la corrida completa del modelo financiero.

## Datos de entrada y archivos de salida

### Entradas del repositorio

| Ruta | Contenido |
|---|---|
| `BASE DE DATOS DE CONSUMOS/BASE DE DATO DE CONSUMO.csv` | Base estructurada de consumos del cliente |
| `BASE DE DATOS TARIFAS GDMTH/Base de dato.csv` | Tarifas CFE por estado, municipio, mes e intervalo horario |
| `RECIBOS/` | Carpeta sugerida para PDFs de recibos |
| `webapp/data/tarifas_gdmth.csv` | CSV empaquetado que usa la webapp en servidor |

### Salidas batch incluidas o generadas

| Archivo | Contenido |
|---|---|
| `CARGO_CAPACIDAD_CALCULADO.csv` | Detalle del calculo de demanda facturable y cargo por capacidad |
| `SIMULACION_BESS_CAPACIDAD.csv` | Resultados de simulacion BESS por periodo |
| `COMPARATIVO_RECIBOS.csv` | Comparativo mensual sin bateria vs con bateria |
| `INVERSION_CAPITAL.csv` | Flujo de inversion y ahorro acumulado multi-anual |

### Salidas de la webapp

- Reporte PDF multipagina con portada, indice, resumen ejecutivo y anexos tecnicos.
- Reporte Excel multi-hoja con consumos, estructura de costos, comparativo, desplazamiento de carga e inversion.
- Exportes de tablas para analisis adicional.
- Persistencia en base de datos para reabrir el proyecto sin recalcular desde cero.

## Instalacion local

Puedes trabajar solo con Python, solo con la webapp, o con ambos componentes.

### Requisitos generales

- Python 3.10 o superior.
- Node.js 18 o superior.
- npm.
- PostgreSQL accesible para la webapp.
- Opcional: credenciales de Google Cloud si se usara Document AI para OCR.

## Setup del pipeline Python

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Variables opcionales para OCR con Google Document AI

`ingestar_recibos.py` lee estas variables si se habilita OCR:

```bash
GCP_PROJECT_ID=tu_proyecto
GCP_LOCATION=us
GCP_PROCESSOR_ID=tu_processor_id
```

Ademas de esas variables, necesitas credenciales validas de Google Cloud para que el cliente `documentai` pueda autenticarse.

### Ejecutar la ingesta visual de recibos

```bash
streamlit run app_ingesta.py
```

### Ejecutar el flujo batch clasico

```bash
python calcular_capacidad.py
python modelo_financiero.py
```

## Setup de la webapp

```bash
cd webapp
npm install
```

### Variables de entorno de la webapp

Crea `webapp/.env.local` con al menos:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
NEXTAUTH_SECRET="un_secreto_largo_y_aleatorio"
NEXTAUTH_URL="http://localhost:3000"
```

Notas:

- `DATABASE_URL` es obligatorio porque Prisma esta configurado para PostgreSQL.
- `NEXTAUTH_SECRET` es obligatorio para sesiones seguras.
- `NEXTAUTH_URL` es altamente recomendable y practicamente obligatorio en despliegue.

### Inicializar la base de datos

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

El seed crea un usuario de prueba solo fuera de produccion:

```text
admin@bess.mx / admin123
```

### Levantar desarrollo local

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Scripts importantes de la webapp

| Script | Funcion |
|---|---|
| `npm run dev` | Inicia Next.js en desarrollo |
| `npm run build` | Ejecuta `prisma generate`, `prisma db push --accept-data-loss` y luego build de Next.js |
| `npm run start` | Inicia la app ya compilada |
| `npm run db:push` | Aplica el schema con Prisma |
| `npm run db:deploy` | Hace `db push --accept-data-loss` |
| `npm run db:seed` | Crea el usuario demo |

### Nota importante sobre build y despliegue

El script `npm run build` actualmente incluye `prisma db push --accept-data-loss`.

Eso puede ser util en ambientes de demo o desarrollo rapido, pero no debe tratarse como una estrategia formal de migraciones para bases con datos criticos. Si vas a endurecer el entorno productivo, conviene separar build de cambios de schema y manejar migraciones con una politica controlada.

## Seguridad y cumplimiento ya implementados

### Autenticacion y proteccion de acceso

- Passwords con `bcryptjs`.
- Sesiones JWT via NextAuth.
- Middleware que protege `/dashboard/*` y `/proyecto/*`.
- Lockout en login despues de 5 intentos fallidos por 15 minutos por email.

### Rate limiting

| Superficie | Regla actual |
|---|---|
| Registro | 5 intentos por IP cada 15 minutos |
| Login | 10 intentos por IP cada 15 minutos |
| Analisis | 20 solicitudes por usuario cada 10 minutos |

### Validaciones de archivos

- Maximo 14 PDFs por solicitud.
- Maximo 10 MB por archivo.
- Validacion de MIME y magic bytes `%PDF`.
- Rechazo de uploads sin autenticacion o sin proyecto valido.

### Datos personales

- La UI exige consentimiento explicito antes de analizar recibos.
- Existe endpoint para eliminacion de cuenta y cascada completa de proyectos, recibos y resultados.
- El proyecto incluye aviso de privacidad y terminos dentro de la webapp.

## Rutas y pantallas importantes de la webapp

| Ruta | Uso |
|---|---|
| `/` | Landing principal |
| `/login` | Inicio de sesion |
| `/registro` | Alta de usuario |
| `/dashboard` | Lista de proyectos del usuario |
| `/proyecto/nuevo` | Alta de proyecto BESS |
| `/proyecto/[id]` | Carga de recibos, analisis, KPIs y descargas |
| `/aviso-de-privacidad` | Aviso legal |
| `/terminos` | Terminos de servicio |

## Diferencias entre Python y webapp

| Aspecto | Python | Webapp |
|---|---|---|
| Uso principal | Analisis batch y validacion local | Producto operativo para usuarios |
| Persistencia | CSVs locales | PostgreSQL via Prisma |
| Ingesta PDF | PyMuPDF + opcional OCR | `pdfjs-dist` server-side |
| Interfaz | CLI + Streamlit | Next.js App Router |
| Exportes | CSV | PDF, Excel y tablas exportables |
| Autenticacion | No | Si |

## Estado actual del proyecto

Hoy el repositorio representa una transicion clara:

- El nucleo matematico y tarifario nacio en Python.
- La operacion actual se concentra en la webapp.
- La webapp ya agrega capa comercial, persistencia, seguridad y reporteo.
- La documentacion de estrategia de producto vive en `ESTRATEGIA.md`.

## Limitaciones y alcance actual

- El parser esta optimizado para recibos CFE GDMTH; otros formatos pueden requerir ajustes de regex.
- PDFs escaneados dependen de OCR si el texto embebido es insuficiente.
- El modelo actual esta orientado a BESS; no incluye dimensionamiento solar FV integral.
- El rate limiting es en memoria, adecuado para un MVP o serverless simple, no para coordinacion distribuida entre multiples instancias.

## Orden recomendado para entender el codigo

Si vas a mantener o extender el proyecto, este es el camino mas corto:

1. `webapp/prisma/schema.prisma`
2. `webapp/src/app/api/analizar/route.ts`
3. `webapp/src/lib/parsear-recibo.ts`
4. `webapp/src/lib/modelo-financiero.ts`
5. `webapp/src/lib/simulador-bess.ts`
6. `modelo_financiero.py`
7. `simulador_bess.py`

## Comandos rapidos

### Python

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
streamlit run app_ingesta.py
python calcular_capacidad.py
python modelo_financiero.py
```

### Webapp

```bash
cd webapp
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

## Licencia y uso interno

No se declara una licencia explicita en este repositorio. Si el proyecto va a compartirse fuera del equipo, conviene definir una politica de licencia, propiedad intelectual y despliegue.
