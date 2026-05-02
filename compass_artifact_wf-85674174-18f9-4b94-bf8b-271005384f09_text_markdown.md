# DM Storage: Business Case y Plan Estratégico Integrado

**Documento ejecutivo confidencial — abril 2026**
**Audiencia primaria:** Director Comercial / Dueño DMSolar (ex-BayWa r.e. México)
**Autor del producto:** Encargado de desarrollo (ingeniero industrial + maestría en sistemas, La Paz BCS)
**Product Owner técnico:** Norbert Álvarez Navarro, jefe BESS DMSolar

---

## Resumen ejecutivo (BLUF)

**DM Storage debe lanzarse en 2026 como SaaS vertical especializado en proyectos BESS Comerciales e Industriales bajo tarifa GDMTH, constituido como una SAPI de CV separada con DMSolar como socio mayoritario y cliente ancla, y con el ingeniero-autor como co-fundador técnico minoritario.** La oportunidad es real, acotada y temporal: ningún competidor (ni Sunwise 3.0, ni Quartux, ni Aurora) entrega hoy el paquete formal CFE que necesita un EPC mexicano para cerrar un proyecto de almacenamiento detrás del medidor —parser estructurado de recibos GDMTH, memoria de cálculo firmable, diagrama unifilar listo para perito, UI guiada por modalidad SAE y matemática granular para perfiles industriales atípicos. Esa brecha cierra entre 6 y 12 meses; quien la ocupe primero captura la posición.

El contexto regulatorio empuja a favor: la **Resolución A/113/2024 de CRE (DOF 7-mar-2025, vigor 10-mar-2025)** codificó cinco modalidades SAE; la **modalidad SAE-CC** —centro de carga, peak shaving, sin permiso de generación, solo aviso a CNE en 90 días hábiles— es exactamente el caso de uso de Norbert. La **Ley del Sector Eléctrico (DOF 18-mar-2025)** eliminó el net-metering 1:1 y subió el umbral exento a 0.7 MW, obligando a los EPCs a vender almacenamiento si quieren mantener el ROI solar. La GDMTH cerró 2025 con **+5.35% promedio** y arrastra **CAGR ~7% en una década**; el cargo por capacidad pesa **~30% de la factura industrial**. El PIIRCE proyecta **8,412 MW de BESS hacia 2038**.

**El "ask" concreto** al director comercial es: (1) constituir DM Storage SAPI de CV con DMSolar 70-80% / ingeniero 15-25% / pool 10%; (2) presupuesto inicial de **MXN 2.0-2.6 millones para 12 meses** (un dev FT + Norbert PT + infra + legal + go-to-market mínimo); (3) compromiso de DMSolar como cliente ancla con 10-20 proyectos reales en 2026; (4) lanzamiento comercial controlado en **RE+ México 2027** tras 9-12 meses de hardening. Un escenario base proyecta **ARR de USD 180-260k al cierre del año 2** y break-even operativo entre el mes 18 y 24 con disciplina de costos. La inversión es relativamente pequeña frente al riesgo asimétrico de no hacerlo: si Sunwise extiende su módulo BESS con SLD firmable y memoria, la ventana se cierra y DMSolar pierde la única oportunidad realista de monetizar la tecnología que ya tiene corriendo en producción interna.

> **Caveats clave verificados que el director debe tener presentes desde el inicio:** (a) el pricing de Sunwise NO es $30-150/usuario/mes —es $149-279 USD/mes con usuarios ilimitados, lo que cambia la matemática de competencia—; (b) Quartux probablemente NO tiene "750 integradores" abiertos —los 750 integradores corresponden a **Serfimex Solar**; (c) el legacy Tesla Certified Installer de BayWa **no es transferible automáticamente** a DMSolar; (d) el software fue desarrollado por el ingeniero **antes de empleo formal y sin acuerdo IP** —este es el riesgo más serio del proyecto y debe resolverse antes que cualquier otra cosa.

---

## PARTE A — Business case de DM Storage como línea SaaS

### A.1 Tesis de inversión en una página

**Por qué SaaS y por qué ahora.** Tres vectores se cruzan en 2026: (i) un marco regulatorio recién codificado (A/113/2024 + nueva LSE) que obliga a los EPCs a entender SAE-CC, GD ≤0.7 MW y aviso a CNE —complejidad que Excel no resuelve; (ii) economía empujando: GDMTH +5.35% en 2025 con cargos de capacidad ~30% de factura, y el fin del net-metering 1:1 que vuelve obligatorio el almacenamiento para sostener payback solar; (iii) un mercado de software para diseño BESS C&I esencialmente vacío en su segmento más técnico. **Sunwise 3.0 acaba de lanzar (10-abril-2026) con módulo BESS-GDMTH, PML CENACE y MCP**, pero no entrega SLD firmable, memoria de cálculo, ni UI guiada por modalidad SAE; Aurora/HelioScope no soportan tarifas mexicanas; Quartux mantiene su EMS interno y no lo abre como SaaS; SurgePV es indio, sin presencia local.

**Por qué con esta tecnología base.** El producto ya existe y funciona: Next.js 14, Prisma, Postgres en Neon, NextAuth en Vercel —el stack moderno estándar para SaaS B2B 2026. Lo construyó un ingeniero industrial con maestría en sistemas, usando IA, sobre dolor real y validado de Norbert. Está deployado y procesa proyectos reales hoy. **No es un PowerPoint: es una palanca.**

**Por qué con DMSolar como ancla.** El legacy ex-BayWa r.e. (2018-2025) deja a DMSolar tres activos reales: equipo técnico capacitado en marcas Tier-1 (Huawei, Sungrow, Hoymiles, APsystems), 32 estados de presencia logística y red de instaladores activa de >13 años. Norbert provee la voz del cliente más calificada del país en BESS C&I. Como cliente ancla DMSolar elimina la pregunta "¿alguien lo usa?" desde el día uno: 10-20 proyectos reales en 2026 generan caso de éxito y pipeline de testimoniales mexicanos antes que cualquier competidor pueda responder. **Lo que NO da el legado**: ni la certificación Tesla Certified Installer (Tesla no transfiere certificaciones entre entidades legales y debe re-postularse), ni el derecho a usar la marca BayWa, ni un programa Powerwall heredado en LATAM (operó en EU/US, no formalmente en México).

### A.2 Modelo de negocio: tres modalidades evaluadas

**Modalidad (a) — SaaS puro multi-tenant para EPCs BESS C&I México.** Pricing recomendado en USD/mes con usuarios ilimitados (espejo del modelo Sunwise, que es el referente real de la categoría):

| Plan | Precio mensual / anual | Incluye | Target |
|---|---|---|---|
| **Storage Starter** | $199 USD/mes ($1,999/año) | 10 propuestas/mes, 1 sucursal, parser CFE GDMTH, dimensionamiento SAE-CC, propuesta PDF | EPC chico (1-3 ingenieros) tomando primeros proyectos BESS |
| **Storage Pro** ⭐ | $499 USD/mes ($4,999/año) | 30 propuestas/mes, 5 sucursales, SLD generador, memoria firmable, simulación 8,760 h, asistente IA, branding | EPC mid-market (Norbert) |
| **Storage Enterprise** | Desde $1,500-3,000 USD/mes | Propuestas ilimitadas, white-label completo, dominio propio, API, SSO, soporte prioritario | EPC grande / aliado financiero / Quartux-tier |

Frente a Sunwise ($149-279/mes con usuarios ilimitados, BESS-GDMTH solo desde Scale $279) DM Storage queda **a precio premium pero con profundidad técnica defendible** en el módulo BESS C&I. Frente a Ctrl+Sun (~$199-990 MXN/mes ≈ $11-55 USD/mes residencial/PYME) DM Storage no compete: distinto cliente.

**Modalidad (b) — Híbrido cliente ancla + white-label early adopters + apertura abierta en año 2.** Esta es la **recomendación principal**: durante meses 1-6 funciona solo para DMSolar (hardening + caso de éxito); meses 7-12 se incorporan **5-15 EPCs early adopters** con descuento del 50% a cambio de testimonio público + caso de estudio (early-bird $249/mes Pro con candado a 24 meses); a partir del mes 13 apertura abierta con pricing pleno y campañas de marketing. Esta secuencia minimiza riesgo de churn temprano, permite madurar el producto contra varios perfiles distintos, y construye prueba social antes del gasto significativo en GTM.

**Modalidad (c) — Canal "cotizador oficial" de un partner hardware/financiero.** Análisis honesto por candidato:

- **Tesla Powerwall vía relación BayWa:** **inviable como herencia.** Tesla no transfiere certificaciones; el programa formal en LATAM no se documenta vía BayWa; Powerwall residencial/light-commercial es nicho equivocado para BESS C&I serio. Posible re-postulación de DMSolar pero como onboarding nuevo. **Recomendación:** posponer a Año 2.
- **Quartux:** dudoso como partner — Quartux ya tiene Quartux Control (>1M horas, IA propia) y modelo storage-as-a-service vertical. Más probable que vean a DM Storage como amenaza si crece. **Recomendación:** explorar conversación a nivel ejecutivo en RE+ 2027 pero no apostar el negocio.
- **Bright (thinkbright.mx):** posible, pero Bright tiene su propio software de diseño/financiamiento desde 2022 con C&I activo. Coopetencia.
- **Serfimex Solar:** **el match más sólido.** Serfimex tiene 750+ integradores activos, plan de colocar MXN 1,200-1,500M en 2026 para ~100 proyectos solar+BESS hasta 0.7 MW, ya tiene cotizador propio pero es financiero, no técnico. DM Storage puede integrarse como capa técnica que alimenta la cotización financiera de Serfimex. **Acción concreta:** reunión con Serfimex en Q3 2026.
- **Energía Real:** otra alternativa fuerte. Tiene programa formal de aliados EPC con due-diligence técnica/financiera, acaba de cerrar crédito sindicado **MXN 2,130M con Bancomext + Banco Multiva** para 200 MW solar+BESS. Su software propio "Aspiral" está orientado a operación, no diseño/cotización pre-venta. **Posible alianza tipo "cotizador técnico recomendado por Energía Real para sus aliados".**

**Recomendación integral:** ejecutar (b) como base e injertar acuerdos comerciales con Serfimex y Energía Real en meses 9-15 sin renunciar al modelo SaaS abierto. Posicionar el producto como neutral —no atado a un solo financiero— preserva el TAM completo.

### A.3 Proyección financiera a 3 años (tres escenarios)

Supuestos comunes: año 1 con cliente ancla + 5-10 early adopters; pricing blended USD ~$350/mes Pro post-descuento; ramp progresivo. ARR en USD; tipo de cambio 1 USD = 18 MXN.

| Métrica (USD) | Año 1 — Conservador | Año 1 — Base | Año 1 — Optimista | Año 2 — Conservador | Año 2 — Base | Año 2 — Optimista | Año 3 — Base |
|---|---|---|---|---|---|---|---|
| Tenants pagando (cierre año) | 3 | 8 | 15 | 12 | 25 | 45 | 60 |
| ARPU mensual | $250 | $300 | $350 | $350 | $400 | $450 | $480 |
| ARR cierre año | $9,000 | $28,800 | $63,000 | $50,400 | $120,000 | $243,000 | $345,600 |
| Costos operativos anuales | $130,000 | $145,000 | $160,000 | $180,000 | $220,000 | $280,000 | $310,000 |
| Quemado neto (cash burn) | -$121,000 | -$116,200 | -$97,000 | -$129,600 | -$100,000 | -$37,000 | +$35,600 |
| Headcount FTE cierre año | 2 | 2-3 | 3 | 2-3 | 4 | 5-6 | 6-7 |

**Estructura de costos año 1 (escenario base, MXN):** dev encargado FT $90,000/mes × 13 (con aguinaldo) = ~MXN 1.17M; Norbert 30% PT con bono producto MXN 200k; infra+APIs+IA ~USD 4,000/año = MXN 72k; legal/contabilidad/SAPI año 1 MXN 200k; marketing/eventos/RE+ stand mínimo MXN 250k; reserva contingencia MXN 200k. **Total ~MXN 2.1M = USD 117k**, alineado con el rango de costo operativo del escenario base.

**Runway necesario:** **MXN 2.0-2.6M (USD 110-145k)** para 12 meses operación sin ingresos significativos. **Break-even operativo:** mes 18-24 en escenario base; mes 14-16 en optimista; no se alcanza en año 2 conservador (requiere ronda puente o subsidio cruzado de DMSolar).

**Sensibilidad clave:** el negocio es viable solo si el ARPU/tenant queda ≥USD 300/mes blended y el churn anual <20%. A CAC USD 800-1,500 por EPC (LinkedIn outbound + eventos), el LTV/CAC requerido >3x exige retención >24 meses —factible si el SLD/memoria se vuelven sticky para flujo de trabajo del ingeniero.

### A.4 Estructura legal y operativa: SAPI nueva como recomendación

Tras evaluar las cuatro opciones (división interna, subsidiaria, escisión Art. 228 Bis LGSM, joint venture, SAPI nueva) la conclusión es clara: **constituir DM Storage SAPI de CV nueva** con DMSolar como socio mayoritario y el ingeniero como co-fundador técnico minoritario, aportando el software como aportación en especie al capital social (LGSM Art. 99 fr. II). Esta es la estructura estándar para SaaS mexicano que aspira a Serie A futura.

| Implicación fiscal | Tratamiento 2025-2026 |
|---|---|
| **ISR corporativo** | 30% sobre utilidad fiscal (PM, régimen general). RESICO no aplica si se aspira a VC. |
| **IVA SaaS B2B** | 16% sobre prestación. Vigilar reformas Paquete Económico 2026 sobre retención IVA en plataformas digitales. Si exporta servicio LATAM, evaluar tasa 0% IVA Art. 29 LIVA (servicios aprovechados en el extranjero, pago en moneda extranjera). |
| **Aportación IP en especie** | LGSM Art. 99 fr. II. Avalúo conservador minimiza ISR personal del ingeniero por enajenación. Crítico estructurarlo bien. |
| **Stock options** | Asimilados a salarios (Art. 94 fr. VII LISR), retención vía CFDI nómina al ejercicio; segunda hecho imponible al vender acciones. |
| **Costos constitución año 1** | MXN 80,000-300,000 (notaría SAPI MXN 15-30k, RPC MXN 2.5-5k, contabilidad outsourced MXN 5-15k/mes, auditor obligatorio anual MXN 50-200k). |

Cap table objetivo año 1: **DMSolar 70-80% / ingeniero 15-25% / pool stock options 10%**, con vesting 4 años cliff 1 año en las acciones del ingeniero. Pacto de socios con drag-along, tag-along, ROFR, aceleración double-trigger en cambio de control y despido sin causa, IP assignment robusto del foreground IP, no-compete 12 meses geográficamente limitado.

### A.5 Ventaja del legado BayWa r.e. + Tesla Powerwall: análisis honesto

El legado **NO es un activo legal transferible** pero **SÍ es un activo comercial real**. Lo que funciona y lo que no:

| Activo del legacy | Capitalizable | Cómo |
|---|---|---|
| Equipo técnico ex-BayWa con experiencia Powerwall y marcas Tier-1 | **Sí** | Plug directo en el SaaS como ingenieros validadores y como referenciadores. Norbert es ejemplo |
| Distribución 32 estados, red instaladores 13+ años | **Sí** | Canal natural para distribuir el SaaS a integradores que ya compran a DMSolar. Co-marketing no monetario |
| Marca BayWa r.e. | **No** (riesgo de IP) | Evitar uso post-septiembre 2025; comunicar "antes BayWa r.e. México, ahora 100% mexicano" sin reivindicar status |
| Certificación Tesla Certified Installer | **No automático** | Tesla evalúa caso por caso, requiere onboarding nuevo de la entidad legal. Posponer Año 2. Tesla MX está en modo expansión (12 vacantes nov-2025) y lanzó **Powerwall 3P trifásico el 23-abril-2026** —puerta abierta pero hay que tocarla |
| Programa Powerwall en LATAM | **No** | Operó formalmente en EU/US, no en LATAM como tal |
| Acuerdos de distribución con Huawei LUNA2000, Sungrow, BYD, Hoymiles, APsystems | **Sí parcialmente** | Pre-cargar estos catálogos como hardware default en el SaaS. Negociar co-marketing con Krannich, Energía Real y otros distribuidores activos |

**Recomendación:** **no reposicionar la propuesta sobre Tesla Powerwall.** El nicho real son los proyectos C&I behind-the-meter con Sungrow PowerStack/PowerTitan, BYD Battery-Box / MC Cube, Huawei LUNA2000+Smart String ESS, y Tesla Megapack para los proyectos grandes vía Enlight u otro EPC certificado. Empezar por las marcas más bankables y abiertas (Sungrow, Huawei, BYD); Tesla queda como objetivo Año 2.

---

## PARTE B — Validación del perfil "Norbert" y mercado objetivo

### B.1 Perfil del comprador objetivo

Norbert es el avatar de un cluster real pero escaso. Caracterización:

- **Formación**: ingeniería eléctrica (40%), mecatrónica/electromecánica (25%), energías renovables (20%), mecánica (10%), industrial/química (5%).
- **Experiencia**: 5-12 años; sweet spot 32-38 años, con mínimo 3 años en proyectos solares y/o BESS ejecutados.
- **Cargo**: jefe/líder de área BESS en EPC mid-market (entre 15 y 100 personas), reporta a Director de Operaciones/CTO/DG, tiene 2-8 personas a cargo (ingenieros junior, drafters AutoCAD, residentes obra).
- **Salario base**: rango **MXN 60,000-110,000/mes** para jefe BESS senior; junior MXN 25-40k; gerente/director MXN 100-180k+.
- **Stack típico**: Excel omnipresente (dolor #1) + AutoCAD + PVSyst + Sunwise + HelioScope + Google Earth/Sunroof + ChatGPT/Claude creciente + ERP propio o ninguno + HOMER Pro los más sofisticados.
- **Willingness-to-pay** estimada: MXN 5,000-10,000/mes por una herramienta que le ahorre 10-20 horas/semana de trabajo manual y que entregue documentos firmables. Esto coincide con el sweet spot del Plan Pro propuesto ($499 USD ≈ MXN 9,000).

### B.2 Cuántos "Norberts" existen en México

Triangulando ASOLMEX (~100 empresas), AMIF (~50), ANES (~150 industriales), CPEF (~1,000 individuos certificados), padrones públicos y job postings, una estimación honesta:

| Segmento | Universo MX 2026 |
|---|---|
| EPCs solares C&I activos (GD ≥100 kW, GDMTH) | **250-400** |
| EPCs C&I premium con capacidad técnica BESS interna ≥10 personas | **80-150** |
| EPCs con jefe BESS dedicado (Norbert real, TAM estricto) | **40-80** |
| EPCs con proyectos BESS C&I activos en pipeline 2026 (SAM cercano) | **60-120** |
| Perfiles LinkedIn México con experiencia significativa en almacenamiento (audiencia outbound primaria) | **1,500-3,000** |

La cifra del usuario de **~325 EPCs C&I premium MX está en el rango alto pero plausible**; ~1,000 en LATAM es razonable sumando Brasil, Chile, Colombia y Centroamérica. La cifra **"750 integradores Quartux" no es verificable públicamente y probablemente confunde con los 750 de Serfimex Solar**.

**Implicación de pricing:** con TAM de ~80-150 EPCs premium pagantes y ARPU $400-500/mes, el techo realista es ~$700k ARR sólo MX en 3-5 años. Para escalar a $2-3M ARR hay que abrir LATAM o subir a Enterprise tier con grandes EPCs.

### B.3 Canales de adquisición

**Eventos prioritarios (orden de inversión 2026-2027):**

| Evento | Fechas 2026-2027 | Costo estimado | Comentario |
|---|---|---|---|
| **RE+ México 2027** | 14-16 abril 2027, Expo Guadalajara | Stand 9 m² ~USD 8-15k + diseño USD 5-10k | **Prioritario.** ~85% decision-makers; Sunwise lanzó 3.0 ahí. Es el escenario natural de lanzamiento DM Storage |
| **Intersolar México 2026** | 1-3 sept 2026, Centro Citibanamex CDMX | USD 8-15k (stand 9 m²) | Segunda prioridad, antes del lanzamiento abierto |
| **Patrocinio diplomado BESS CPEF** | Múltiples fechas | MXN 50-200k | Acceso al mayor pool de individuos certificados (1,000+) |
| **Asociación con ASOLMEX** | Anual | MXN 50-200k cuota corp. | Credibilidad ante directivos EPCs grandes |
| **Asociación con AMIF Jalisco** | Anual | MXN 20-100k | Hub solar mexicano físico (Zapopan) |

**Canales digitales:** LinkedIn outbound segmentado a 300-600 leads decisores con Sales Navigator + secuenciador (HeyReach/LaGrowthMachine), CPL realista USD 80-200, CPDemo USD 300-700. Mejor ROI que LinkedIn Ads para esta audiencia <3k. Lanzar **podcast/webinar mensual "BESS GDMTH México"** con invitados (Carla Medina ASOLMEX, Alejandro Fajer Quartux, Arturo Duhart Sunwise, Francisco Cervantes Skysense, Nallely Camarena CPEF) llena un vacío real (no hay podcast técnico-energético MX activo) y genera autoridad.

**Canales indirectos:** alianza con **Energía Real** (ya tiene programa formal de aliados EPC y crédito sindicado MXN 2,130M para escalar), co-marketing con **Krannich Solar México** (webinars constantes con marcas), partnership comercial con **Serfimex Solar**.

**Medios:** advertorial técnico en **pv magazine México** (más alineado al Norbert técnico) y notas en Energía Hoy / Energía a Debate post-lanzamiento. Forbes/Expansión solo para casos de éxito C-suite.

### B.4 Voz del cliente — siete dolores validados

| # | Dolor | Validación pública |
|---|---|---|
| 1 | **Lectura manual de recibos CFE / 12 meses copiados a Excel** | Niko Energy: "el 80% de los errores en cotizaciones provienen de una lectura inadecuada del recibo de CFE". Sunwise Academy admite carga manual/CSV para GDMTH (8,760 ó 35,040 filas) |
| 2 | **Tiempo de cotización: 2-3 horas → ojalá minutos** | Sunwise blog: "crear un presupuesto puede implicar entre 2 y 3 horas" |
| 3 | **Dimensionamiento BESS contra perfil de carga atípico GDMTH** (carga 15-min, picos no obvios, turnos rotativos) | Sunwise Academy: "PeakShaving no es tan común y solo se recomienda en situaciones especiales". Default Sunwise = 6h carga / 2h descarga verano —genérico |
| 4 | **Justificación financiera del peak shaving** ante el director financiero del cliente final | Quartux blog peak shaving explicita necesidad de traducir lo técnico al financiero |
| 5 | **Cumplimiento regulatorio nuevas DACG SAE (mar 2025) y DACS 2026** —modalidades, permisos CNE, aviso CENACE | DOF A/113/2024; nuevas DACS aprobadas por CNE en 2026. Complejidad nueva en 2026 |
| 6 | **Falta de documentos formales firmables** —memoria, SLD, ficha técnica, ficha financiera— generación manual en Word/CAD | Implícito en oferta Sunwise 3.0 (documentos automáticos genéricos sin SLD); norma en EPCs <50 personas |
| 7 | **Gestión de propuestas comerciales múltiples** —EPC mid-market cotiza 30-50/mes, pierde versionado | Testimonio Sunwise: "con un Excel… ¡Grave error!" |

### B.5 Propuesta de valor: "el cotizador del ingeniero"

El framing diferenciado vs Sunwise no es "más barato" ni "más bonito" —es **más profundo técnicamente y formalmente más completo para el trámite CFE**. Los entregables que constituyen el verdadero diferenciador:

1. **Memoria de cálculo eléctrica firmable por DRO/Perito**: cálculo de corto circuito, sistema de tierras, conductores, protecciones, conforme NOM-001-SEDE-2022. Firmable digitalmente o exportable para sello.
2. **Diagrama unifilar (SLD) listo para CFE / UVIE / aviso A/113**: con simbología NMX-J-136-ANCE-2019, datos del proyecto, capacidades, alimentadores, puesta a tierra, calibres, protecciones.
3. **Dimensionamiento detrás-del-medidor con matemática granular**: simulación 8,760 h con tarifa GDMTH actualizada, perfiles atípicos por turnos, picos coincidentes con horario punta (20:00-22:00 SIN), factor de potencia con bonificación/penalización, demanda contratada vs facturable bajo A/064/2018.
4. **UI guiada por modalidad SAE específica** (CC/CE/AA/GE/No Asociado): el ingeniero elige la modalidad y el flujo se adapta —documentación, permisos, plazos, estructura de la propuesta.
5. **Propuesta firmable** con membrete del EPC, datos del DRO/Perito, paquete completo para enviar a CNE en 90 días o para acompañar trámite UVIE.

Mensaje de venta concreto: **"El único cotizador BESS C&I que entrega a Norbert el paquete completo CFE en 30 minutos en vez de 3 días."**

---

## PARTE C — Roadmap técnico: de hobby-tool a plataforma SaaS

### C.1 Gap actual y filosofía

El producto actual es single-tenant deployed en Vercel con stack moderno —no hay que migrar nada de fondo, hay que **multi-tenantear y agregar las features formales (SLD, memoria) que cambian la categoría del producto**.

### C.2 Roadmap por fases (1 dev FT + Norbert PT)

| Fase | Duración | Horas-dev | Hitos |
|---|---|---|---|
| **Fase 0 — Hardening interno DMSolar** | 4-6 semanas | 120-160 | Aviso de privacidad LFPDPPP 2025 + DPA template + endpoint ARCO; CI/CD robusto con preview environments (Neon branching); Sentry + PostHog instrumentación; backups + restore drill; secrets management; documentación interna |
| **Fase 1 — Multi-tenant + branding básico + parser CFE** | 8-10 semanas | 280-360 | Schema Organization+Membership con RLS Postgres + Prisma extension (60-90h crítico); Auth.js v5 multi-org; subdominios `*.dmstorage.mx`; Stripe + Facturapi vía Marketplace app (15-25h); onboarding por org; parser CFE GDMTH inicial (Claude Sonnet 4.6 con PDF nativo + validación determinista, 40-60h) |
| **Fase 2 — SLD + memoria firmable + propuesta tipo Sunwise-killer** | 10-14 semanas | 360-500 | Generador SLD con React Flow + elkjs + 10-12 bloques canónicos (200h); export PDF firmable conforme NOM-001-SEDE-2022 (50h); memoria de cálculo automatizada (caída tensión, cortocircuito, protecciones, 80h); validaciones contra NOM (cobertura básica); QA con 5-10 proyectos reales de Norbert |
| **Fase 3 — Apertura SaaS + early adopters + integraciones financieras** | 8-12 semanas | 280-400 | Custom domains tenants (Vercel SDK + UI admin DNS, 50h); white-labeling completo; feature flags GrowthBook/PostHog; asistente IA con RAG sobre regulación + pgvector (100h); landing pública + Cal.com; integraciones Serfimex/Bright vía CSV/API simple; widget embebible |
| **Fase 4 — Año 2** | 9-12 meses | — | Expansión LATAM (tarifas Chile/Colombia/Brasil), marketplace de equipos, monitoreo post-venta, MCP server si llega cliente que lo demande, SSO SAML cuando aparezca primer cliente regulado |

**Total Fase 0-3: 1,040-1,420 horas-dev distribuidas en ~9-12 meses calendario.** Asume 1 dev FT senior productivo a 130-160 hrs útiles/mes. Buffer 30% recomendado para curva de aprendizaje SaaS multi-tenant patterns.

### C.3 Stack técnico — recomendaciones

**Quedarse en Vercel + Neon hasta ~$2-3k/mes de infra** (probablemente >100 tenants pesados). Migrar solo si duele. Costos mensuales estimados a 50 tenants / 200 usuarios activos: **USD 250-500/mes total** (Vercel Pro ~$80-150, Neon Launch ~$60-100, Anthropic API con caching ~$40-80, embeddings ~$5-10, Sentry $26, PostHog $0-50, Facturapi ~$18, Resend $20, Cal.com $0). A 200 tenants escalable hasta ~$700-1,200/mes sin cambiar plataforma.

**LFPDPPP enterprise-grade:** la nueva ley (DOF 20-mar-2025, vigor 21-mar-2025) elimina al INAI y traslada autoridad a Secretaría Anticorrupción y Buen Gobierno. Hosting en US **sí cumple** sujeto a aviso de privacidad publicado, cláusula de transferencia internacional declarada, DPA con cada cliente EPC (cliente = responsable, SaaS = encargado), mecanismo ARCO funcional, bitácora de transferencias. **No requiere data residency MX.** Esfuerzo de cumplimiento Fase 0: 20-30 horas + ~USD 1.5-3k consulta legal una vez.

**CFDI: Stripe + Facturapi.io vía Marketplace oficial.** Stripe lanzó la app nativa con Facturapi: stamping automático de `invoice.paid` → CFDI 4.0 sin código. Facturapi $299 MXN/mes + ~$2-5 MXN/timbre. Total ~4% por transacción incluyendo Stripe fees (3.6% + $3 MXN nacional).

### C.4 Decisiones críticas de arquitectura

**Multi-tenant: shared DB + Row-Level Security Postgres + Prisma Client extension.** Schema-per-tenant con Prisma es pesadilla de migraciones; DB-per-tenant con Neon explota costos ($500/mes solo de pisos a 100 tenants). RLS con `current_setting('app.current_tenant_id', TRUE)` en transacción + dos roles Postgres (`app_user` sometido a RLS, `admin_user` BYPASSRLS para jobs/back-office) + tests de aislamiento es el patrón maduro 2026. **60-90 horas-dev** críticas. Repo de referencia: `prisma/prisma-client-extensions/row-level-security`. Versionado con Atlas o SQL plano.

**Feature flags y branding:** PostHog Feature Flags si ya usas PostHog para analytics (incluido free hasta 1M evaluations/mes). White-labeling con Vercel Multi-Tenant SDK (`@vercel/sdk` para CRUD de dominios, hasta 100,000 dominios/proyecto en Pro, SSL automático).

**Auth multi-tenant:** Auth.js v5 con tabla Organization+Membership. Migrar a WorkOS (~$125/conexión SSO) solo cuando aparezca el primer cliente con SSO SAML —ahorra meses y $200-500/mes de Vercel Enterprise SAML.

### C.5 Feature SLD — análisis específico

**Camino recomendado: React Flow + elkjs + plantillas paramétricas por composición de bloques.** Ocho a doce bloques canónicos en JSON (string FV, inversor string/central, combiner DC, BESS+PCS, transformador BT/MT, switchgear MT, medidor CFE bidireccional, acometida CFE, tablero general AC, sistema de tierras), layout automático con elkjs (algoritmo `mrtree` o `layered`), render SVG con React Flow, export PDF con `@react-pdf/renderer` o `puppeteer`/`playwright` server-side.

**Estimación honesta:**

| Alcance | Horas | Recomendación |
|---|---|---|
| MVP bajo: 5 plantillas estáticas, parámetros editables, export SVG/PDF | 80-120 | Solo si se necesita el feature en Fase 1 |
| **MVP medio: 10-12 bloques canónicos, layout elkjs, edición por formulario, validación de coherencia, PDF con membrete y datos del DRO** | **180-260** | **Recomendado Fase 2** |
| Alto: editor canvas tipo Visio, auto-routing libre, conflict detection | 600-900 | Solo si SLD se vuelve pivote (no antes de Fase 4) |

**No construir editor canvas libre en V1** —es el agujero negro de tiempo. Llenar el SLD desde el formulario de proyecto que ya existe. Diferencia frente a OpenSolar/Aurora es justamente el contexto MX (CFE, GDMTH, NOM-001-SEDE-2022, BESS), no la flexibilidad gráfica.

### C.6 Stack de IA recomendado

**Parser CFE GDMTH:** **Claude Sonnet 4.6 con PDF nativo + validación determinista de totales.** Costo ~$0.015-0.025/recibo; ~$18-30/mes a 1,200 recibos/mes; ~$5-10/mes con prompt caching. Validar en post-LLM: suma B+I+P = total (±0.5%), demanda facturable ≤ máxima medida, FP ∈ [0,1], total = suma de cargos (±$1). Si falla → flag a revisión humana. **No depender de LLM solo, no depender de regex solo.**

**Asistente IA tipo copiloto:** API Claude directo + tool-use clásico, **sin MCP en Fase 1-3**. MCP solo aporta valor si quieres exponer tus herramientas a Claude Desktop/ChatGPT externos o si tu agente conecta a múltiples fuentes externas heterogéneas (SAP, Salesforce del cliente). Para un copiloto interno que ayuda a dimensionar BESS y validar memoria, API directa Claude + RAG en pgvector sobre regulación mexicana (A/113/2024, NOM-001-SEDE-2022, manual GDMTH, criterios CENACE) es más simple y suficiente. Costo a 100 usuarios activos: ~$30-50/mes con caching del RAG.

---

## PARTE D — Posicionamiento y go-to-market

### D.1 Naming y branding

**Recomendación: mantener "DM Storage" como marca primaria.** Razones honestas:

- Mantiene continuidad con DMSolar (cliente ancla, prueba social, equipo de ventas conocido).
- "DM" es ambiguamente atribuible al legacy (DMSolar = ex-BayWa) sin reivindicar status formal Tesla/BayWa que no se posee.
- "Storage" es descriptivo, vertical, claro para el ingeniero —sin marketing fluff.
- Costo de naming nuevo (PeakShift, GridForge, Storix) es alto: registro de marca, dominio, branding, awareness desde cero, y desconecta del único asset comercial real (la red DMSolar).

Nombres alternativos descartados con racional breve:
- **PeakShift / GridForge:** SaaS-first pero pierden anclaje legado y exigen brand-building costoso.
- **Storix / DMStor:** demasiado corto/marcario, pierde claridad funcional.
- **DM Energy Suite:** demasiado amplio; diluye el foco BESS C&I.

**Identidad visual:** sub-marca dentro del paraguas DMSolar para Año 1 (logo "DM Storage powered by DMSolar"); transición a brand independiente al cierre de Serie A o al alcanzar $500k ARR. URL recomendada: `dmstorage.mx` con `app.dmstorage.mx` para la app y `*.dmstorage.mx` para tenants white-label.

### D.2 Mensaje de posicionamiento vs Sunwise

**Headline para landing page:**
> *"El cotizador BESS C&I para ingenieros que sí firman."*
> *"Memoria de cálculo, diagrama unifilar y propuesta GDMTH lista para CNE en 30 minutos. Sunwise te da la propuesta. DM Storage te da el paquete completo CFE."*

**Sub-headline:** *"Diseñado por jefes de área BESS para jefes de área BESS. Parser nativo del recibo CFE GDMTH, dimensionamiento detrás-del-medidor con matemática real, UI guiada por modalidad SAE-CC/CE/AA, simulación 8,760 h, y la única memoria de cálculo + SLD firmables del mercado."*

**Tres tiles de valor para deck de ventas:**
1. **Profundidad técnica.** Simulación 8,760 h con tarifa GDMTH viva, perfiles atípicos, optimización propia de despacho de baterías. No es un wrapper genérico.
2. **Cumplimiento regulatorio nativo.** Flujo guiado por las cinco modalidades SAE del A/113/2024 con plantillas de aviso CNE en 90 días. Ningún competidor lo hace.
3. **Documentos firmables.** Memoria de cálculo + diagrama unifilar listos para sello DRO/Perito conforme NOM-001-SEDE-2022. Aurora requiere AutoCAD ($2k/año), Sunwise no los hace, OpenSolar tampoco.

**Primera reunión con prospecto:** demo de 20 minutos cargando un recibo GDMTH real del prospecto, salida en pantalla en 2 minutos del paquete completo. Si Norbert no se convence en esos 20 minutos, no se convence.

### D.3 Lanzamiento

**Plan de lanzamiento secuenciado:**

- **Mayo-julio 2026 (Fase 0-1 técnica):** comunicación silenciosa, hardening, parser CFE.
- **Agosto 2026:** primer caso de éxito DMSolar publicado en LinkedIn + pv magazine MX (advertorial técnico USD 5-10k).
- **Septiembre 2026:** stand pequeño en **Intersolar México** (Citibanamex CDMX) como soft-launch a EPCs early adopters; reuniones agendadas vía Cal.com con 50-80 prospectos.
- **Octubre-diciembre 2026:** webinar conjunto con ASOLMEX o CPEF sobre "Modalidades SAE A/113/2024 y cumplimiento práctico"; podcast "BESS GDMTH México" episodios 1-3 con invitados clave.
- **Enero-marzo 2027 (Fase 2-3 técnica):** SLD + memoria firmable + early adopters cerrando primeros contratos pagantes.
- **14-16 abril 2027 — RE+ México 2027 — lanzamiento abierto.** Stand 9-18 m² (~USD 15-25k incluyendo diseño), conferencia técnica con Norbert + DRO invitado. Apunta directo al territorio donde Sunwise lanzó 3.0 un año antes.

### D.4 Estrategia de pricing competitiva

Análisis de sensibilidad: Sunwise cobra $149-279 USD/mes con usuarios ilimitados (no por usuario). Aurora cobra $220-259 USD/usuario/mes (modelo per-seat). Ctrl+Sun cobra MXN $199-990/mes (~$11-55 USD), residencial/PYME. SurgePV cobra $1,499-1,899 USD/año.

**Recomendación DM Storage: pricing por capacidad (propuestas/sucursales) con usuarios ilimitados (espejo Sunwise) pero a precio premium justificado por profundidad técnica y entregables formales.**

| Plan | Precio | Justificación |
|---|---|---|
| Starter $199/mes | Por debajo de Sunwise Pro $149/mes anual | Ancla emocional para EPCs chicos; vía a Pro |
| **Pro $499/mes** ⭐ | ~1.8x Sunwise Scale ($279/mes) | Justificable porque incluye SLD + memoria firmable que Sunwise no tiene |
| Enterprise $1,500-3,000/mes | Comparable a Aurora Enterprise (USD 15k mín anual) | White-label, API, SSO |

**Descuentos tácticos:** early-bird $249/mes Pro con candado 24 meses para los primeros 10 EPCs (señal de escasez + locks anti-Sunwise). Anual con 17% descuento (2 meses gratis).

### D.5 Riesgos y mitigaciones — top 5

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| 1 | **Sunwise extiende 3.0 con SLD firmable + memoria + UI SAE en 6-12 meses** | Alta | Crítico | Velocidad de ejecución Fase 1-2; lock-in de 5-15 EPCs early adopters con candado 24 meses; profundidad técnica defensible (no solo features) |
| 2 | **Quartux abre su EMS como SaaS para integradores con USD 50M frescos** | Media | Alto | Quartux es vertical hardware+EMS; baja afinidad con SaaS de cotización abierto. Vigilar pivots; explorar partnership preventivo |
| 3 | **Reglamento secundario CNE sobre A/113/2024 cambia documentación o procedimiento de aviso 90 días** | Media | Medio | Arquitectura de documentos parametrizable; relación con asesor regulatorio mexicano; flexibilidad de UI por modalidad SAE permite ajustes rápidos |
| 4 | **Dependencia excesiva del cliente ancla DMSolar (concentración >60% ARR año 1)** | Alta | Alto | Roadmap explícito de diversificación: 5-15 EPCs en año 1, abrir mercado año 2. Pacto societario con clausulas si DMSolar reduce uso |
| 5 | **Riesgo IP/talento: software no asignado, ingeniero se va, demanda futura** | Alta si no se firma | Existencial | **Prioridad #1 antes de cualquier cosa**: registro INDAUTOR del software a nombre del ingeniero con fecha pre-empleo (~MXN 367, 15 días); SAPI nueva con aportación de IP en especie como contraprestación de equity 15-25% con vesting 4 años cliff 1 año; pacto de socios con drag/tag/aceleración/no-compete |

---

## PARTE E — Propuesta operativa y rol del encargado de desarrollo

### E.1 Estructura del equipo inicial

| Rol | Persona | Modalidad | Capacidad |
|---|---|---|---|
| CEO / Director Comercial | Director comercial DMSolar (dueño) | Tiempo parcial dedicado | Decisiones de pricing, contrataciones >X, contratos clientes >Y |
| CTO / Encargado de desarrollo | Ingeniero La Paz BCS (autor del producto) | **Full-time remoto** | Arquitectura, stack, contrataciones técnicas, veto de seguridad/deuda técnica |
| Product Owner técnico / Ingeniero BESS senior | Norbert | **Part-time 30-50%** dentro de DMSolar | Voz del cliente, validación de casos, casos de uso, primer cliente |
| Soporte canal | DMSolar (red comercial existente) | Existente | Distribución a integradores que ya compran |
| Asesoría legal/fiscal | Despacho externo (Sanchez DeVanny, RMS, Satego o equivalente) | Por proyecto | Constitución SAPI, pacto socios, IP assignment, LFPDPPP |
| Contabilidad | Outsourced | Mensual | CFDI, IMSS, ISR, conciliaciones |

**Headcount adicional año 1-2:** un dev junior/mid en mes 9-12 cuando Fase 2 empiece a presionar (~MXN 40-60k/mes); un ejecutivo de cuentas / customer success en mes 12-15 cuando ARR cruce ~$50k.

### E.2 Acuerdo IP propuesto (modelo justo y blindado)

**Recomendación principal — Opción 4 evaluada:** SAPI nueva con ingeniero como co-fundador minoritario aportando IP del software como aportación en especie al capital social.

**Pasos en orden estricto:**

1. **Antes de firmar contrato laboral**: el ingeniero registra el software actual en **INDAUTOR** a su nombre con fecha pre-empleo (~MXN 367, 15 días hábiles, formulario RPDA-01). Este registro establece presunción legal de titularidad y fecha cierta (LFDA arts. 162, 163, 168). Adicional: commit/snapshot público con timestamp Git firmado.
2. **Constitución SAPI de CV** "DM Storage SAPI de CV". Notario MXN 15-30k, RPC MXN 2.5-5k.
3. **Aportación de IP en especie**: el ingeniero aporta el software como aportación al capital social (LGSM Art. 99 fr. II), valuada por avalúo conservador. Cesión formalizada e inscrita en INDAUTOR.
4. **Cap table objetivo:** DMSolar 70-80% / ingeniero 15-25% / pool stock options 10% reservado.
5. **Vesting** del ingeniero: 4 años con cliff de 1 año (estándar Y Combinator/Stripe Atlas). Aceleración double-trigger en cambio de control + despido sin causa.
6. **Pacto de socios** con drag-along, tag-along, ROFR, IP assignment robusto del foreground IP, no-compete 12 meses geográficamente limitado, materias reservadas que protegen a minoría 10% (LMV Art. 113).
7. **Distinción Background IP vs Foreground IP**: documento que lista Background IP del ingeniero (software pre-existente, librerías personales, conocimiento previo) y Foreground IP (todo creado durante el empleo bajo LFDA Art. 103, propiedad SAPI).
8. **Contrato laboral formal** —no contractor— por imperativo de reforma 2021 (LFT arts. 12-13, desarrollo de software es la actividad preponderante). Salario competitivo + prestaciones LFT + acciones con vesting.

**Costo total armado del paquete legal año 1:** MXN 60-200k. Comparado con el riesgo de no hacerlo —demanda civil federal del ingeniero (LFDA arts. 21, 27), pasivo penal (CPF Art. 424 bis), imposibilidad de Serie A o exit, multas STPS 2,000-50,000 UMA por simulación laboral— es un costo de seguro mínimo.

**Modelos descartados (con racional honesto):**
- **Cesión total a cambio solo de salario, sin equity:** ofensivo dado que el ingeniero aporta IP. Renuncia rápida garantizada.
- **Licencia perpetua con royalty:** mata cualquier exit; ningún VC compra empresa cuya tecnología core es licenciada de un tercero. Ineficiente fiscalmente. **No recomendado.**
- **Co-titularidad 50/50:** bajo LFDA Art. 80, cualquier explotación requiere consentimiento de ambos. Bloqueo perpetuo si hay conflicto. **No recomendado.**

### E.3 KPIs y métricas de éxito

| Hito | 6 meses | 12 meses | 18 meses |
|---|---|---|---|
| **Producto** | Multi-tenant funcional, primer parser CFE, DMSolar usándolo en >50% proyectos | SLD + memoria firmable; 5-10 EPCs early adopters; Sunwise feature parity en BESS GDMTH | Producto en RE+ México 2027 con stand; copiloto IA estable |
| **Comercial** | 1 cliente ancla DMSolar | 5-10 EPCs pagantes (early adopters $249/mes) | 20-30 tenants pagantes; ARR USD 80-150k |
| **Financieras** | Quemado <MXN 1M | ARR USD 30-65k; quemado total año 1 <MXN 2.6M | Path a break-even visible; CAC <USD 1,500; LTV/CAC >3x |
| **Equipo** | Constitución SAPI cerrada; IP asignado | 2-3 FTE; primer dev junior contratado | 4-5 FTE; ejecutivo cuentas/CS en plantilla |
| **Calidad** | <5% recibos GDMTH fallan parser | 99% uptime; tests aislamiento RLS al 100% | NPS >40; churn anual <20% |

### E.4 Governance

**Asamblea de accionistas** (LGSM 178): asuntos reservados con mayoría 75% (emisión nuevas acciones, modificación estatutos, venta de empresa, fusión/escisión); ordinarios con 51% (cuentas anuales, dividendos, nombramiento consejeros).

**Consejo de administración** de 3-5 miembros: 2 designados por DMSolar, 1 designado por el ingeniero (LMV Art. 113 con 10% derechos de minoría), opcional 1 consejero independiente. Decisiones cotidianas por mayoría simple. **Materias reservadas al consejo (no al CEO solo):** contrataciones con compensación >MXN 60k/mes, gastos >MXN 200k, contratos clientes >USD 30k ARR, pricing strategy global, term sheets de inversión.

**Decisiones de producto:** roadmap trimestral acordado entre CTO (ingeniero) + Norbert (PO técnico) + CEO (director comercial), revisado por consejo. Veto del CTO sobre seguridad y deuda técnica grave.

**Pricing:** banda aprobada por consejo; CEO ajusta dentro de la banda; cambios de banda requieren aprobación consejo.

**Responsable comercial:** CEO/director comercial DMSolar. Norbert como referente técnico de venta (demo y reuniones técnicas) durante meses 1-12 hasta que se contrate ejecutivo de cuentas dedicado.

### E.5 Compensación de mercado para el rol

**Salario base mensual MXN para encargado de desarrollo SaaS senior remoto MX 2026:**

| Tipo de empleador | Rango realista para Tech Lead/EM senior con stack moderno |
|---|---|
| Empresa mexicana early-stage (DM Storage) | **MXN 70,000-110,000/mes** ($45-72/hora ≈ USD 3,800-6,100) |
| Empresa mexicana establecida tier 1 | MXN 90,000-150,000/mes |
| Empresa extranjera contratando vía Deel/Remote/Oyster en USD | USD 4,000-8,000/mes (≈ MXN 72-144k) |

**Recomendación para DM Storage:** **MXN 90,000-110,000/mes brutos** + 15-25% equity con vesting 4y/cliff 1y + bonos por hitos. Si se busca match con ofertas USD remotas para retener al talento, subir a MXN 110-130k. **No aplicar descuento geográfico La Paz vs CDMX** en remoto —sería señal anti-talento.

**Prestaciones LFT obligatorias:** aguinaldo 15 días (LFT Art. 87), vacaciones reformadas 2022 (12 días primer año, +2/año hasta 20 al quinto), prima vacacional 25%, PTU 10% utilidad gravable con tope reformado 2021, IMSS/Infonavit/SAR (~30-35% adicional). Total cost-to-company sobre salario base: ~1.4-1.5x.

**Bonos por hitos sugeridos:**
- Lanzamiento producción multi-tenant: MXN 30-50k
- Primer cliente externo de pago: MXN 30-50k
- ARR USD 50k: MXN 50-80k
- ARR USD 150k: MXN 80-150k
- ARR USD 500k: MXN 200k+

**Stock options vesting:** 4 años, cliff 1 año (25% al mes 13, luego mensual). Tratamiento fiscal: ingreso asimilado a salarios al ejercicio (LISR Art. 94 fr. VII), retención ISR vía CFDI nómina; segundo hecho imponible al vender acciones.

---

## PARTE F — Entregables para la reunión con director comercial

### F.1 Estructura sugerida del deck (12 slides)

1. **Portada — DM Storage: SaaS BESS C&I para el mercado mexicano**
2. **Problema — 7 dolores de Norbert validados** (recibos manuales, sin SLD, sin memoria firmable, sin UI SAE, etc.)
3. **Oportunidad regulatoria — A/113/2024 + LSE 2025 + alza GDMTH** (números: +5.35% 2025, cargo capacidad 30% factura, 8,412 MW PIIRCE)
4. **Mercado — TAM/SAM** (~80-150 EPCs C&I premium MX con BESS activo; LATAM ~1,000)
5. **Producto — el cotizador del ingeniero** (demo en vivo del flujo recibo → propuesta + SLD + memoria)
6. **Competencia — tabla comparativa** (Sunwise 3.0 / Aurora / Quartux / Ctrl+Sun / DM Storage por feature)
7. **Modelo de negocio — pricing y ARR proyectado** (3 tiers, tres escenarios, break-even mes 18-24)
8. **Estrategia legal — SAPI nueva con cap table limpio** (DMSolar 70-80% / ingeniero 15-25% / pool 10%)
9. **Roadmap técnico — Fases 0-3 en 9-12 meses con horas-dev** (1 dev FT + Norbert PT)
10. **Equipo y governance** (consejo, materias reservadas, decisiones)
11. **Riesgos top 5 y mitigaciones**
12. **El "ask" — presupuesto, compromisos, timeline**

### F.2 Las 5 objeciones más probables del director comercial — y cómo responderlas

**1. "¿Por qué no comprar/integrar Sunwise en lugar de construir?"**
> Sunwise 3.0 cuesta $149-279 USD/mes con usuarios ilimitados. Resuelve cotización general, pero **no genera SLD firmable, no produce memoria de cálculo, no tiene UI guiada por modalidad SAE A/113/2024, no es CFE-trámite-listo**. DMSolar/Norbert ya pagaría Sunwise y aún así seguiría haciendo memoria + SLD a mano en CAD. Adicionalmente: Sunwise es un wrapper genérico, DM Storage es vertical-deep. Y lo más importante: ya tenemos el producto corriendo, el costo de adquisición fue cero. Además, **monetizar lo que ya existe** convierte un costo interno en activo comercial.

**2. "¿Qué pasa si Norbert se va?"**
> Norbert es Product Owner técnico, no único holder de conocimiento. El producto está documentado, el roadmap está formalizado, y el dev encargado tiene autonomía técnica completa. Norbert se queda como empleado DMSolar con bono variable atado a hitos DM Storage —incentivo alineado. Si renuncia: la regulación A/113/2024 y NOM-001-SEDE-2022 son públicas, contratables a DRO/Perito externo MXN 50-80k/mes para reemplazar voz del cliente. El producto no muere si Norbert se va; sí muere si el dev encargado se va sin acuerdo IP firmado —por eso la prioridad #1 es cerrar el paquete legal.

**3. "¿Cuánto invierte DMSolar?"**
> MXN 2.0-2.6M en 12 meses para escenario base. Desglose: salario dev FT ~MXN 1.17M, Norbert bono producto ~MXN 200k, infra+APIs+IA ~MXN 72k, legal/contabilidad/SAPI ~MXN 200k, marketing/eventos ~MXN 250k, contingencia ~MXN 200k. Compensación: ARR USD 28-65k cierre año 1 (escenario base-optimista); break-even operativo entre mes 18 y 24; venta de equity Serie A objetivo 24-30 meses con valoración USD 5-15M si ARR cruza $300-500k. Riesgo controlado: si producto no cuaja en 12 meses, DMSolar absorbe el dev como talento interno y hereda mejoras al cotizador interno. Pierde ~MXN 1.5M netos de cash, gana producto interno mejorado.

**4. "¿Quién es dueño del código?"**
> Hoy: zona gris peligrosa. El ingeniero lo desarrolló antes del empleo formal sin acuerdo IP. Si no se resuelve antes de que el producto facture, DMSolar tiene riesgo de demanda civil federal por uso no autorizado (LFDA arts. 21, 27) y de Serie A imposible (todo VC corre IP due diligence). Solución propuesta: el ingeniero registra software en INDAUTOR a su nombre con fecha pre-empleo (validado, MXN 367), constituimos SAPI nueva, el ingeniero **aporta IP como aportación en especie a cambio de equity 15-25% con vesting 4 años cliff 1 año**. IP queda 100% en la SAPI, cap table limpio, futuras Serie A o exit posibles. Costo del paquete legal completo: MXN 60-200k una sola vez. Costo de no hacerlo: existencial.

**5. "¿Cuándo vemos resultados? ¿Esto distrae al equipo principal?"**
> Resultados visibles en 30/60/90 días (ver F.4). El equipo de DMSolar no se distrae —el dev encargado es contratación nueva remota, Norbert sigue en su rol con 30% dedicado a DM Storage como PO técnico, el director comercial firma lo crítico (pricing, contrataciones grandes) en revisiones quincenales. La operación core de distribución solar de DMSolar no se toca.

### F.3 El "ask" claro

**Lo que el ingeniero necesita de DMSolar para ejecutar:**

1. **Compromiso de constituir DM Storage SAPI de CV** con cap table **DMSolar 70-80% / ingeniero 15-25% / pool 10%**, en plazo 60 días.
2. **Presupuesto inicial de MXN 2.0-2.6M** para 12 meses (puede ser tranches trimestrales atados a hitos).
3. **Compromiso DMSolar como cliente ancla** con 10-20 proyectos reales BESS C&I 2026 corridos en DM Storage; Norbert dedicando 30-50% de su tiempo como PO técnico hasta mes 12.
4. **Contratación formal del ingeniero como CTO/Encargado de Desarrollo full-time remoto** con salario base MXN 90-110k/mes + 15-25% equity con vesting 4y/cliff 1y + bonos por hitos.
5. **Acuerdo IP firmado** (cesión vía aportación en especie) en plazo 90 días, con registro INDAUTOR previo a nombre del ingeniero.
6. **Asesor legal startup-friendly contratado** (Sanchez DeVanny / RMS / Satego o equivalente) presupuesto MXN 60-200k para constitución + pacto socios + IP assignment + LFPDPPP.
7. **Timeline de salida a mercado:** lanzamiento abierto en RE+ México 14-16 abril 2027 (12 meses).

### F.4 Quick wins demostrables 30/60/90 días

**Día 30:** producto interno DMSolar usándose en >5 proyectos reales con parser CFE GDMTH funcional; Norbert cotiza un proyecto en 30 minutos vs 3 horas manual. Ahorro tangible medido. **Métrica:** time-to-quote.

**Día 60:** primer SLD generado automáticamente en formato PDF con bloques canónicos validado por DRO/Perito externo de DMSolar como "firmable con ajustes menores"; SAPI constituida; IP asignado vía registro INDAUTOR + aportación en especie. **Métrica:** SLD aprobado por perito externo + cap table cerrado.

**Día 90:** primer EPC externo (no DMSolar) usando producto en piloto pagando $249/mes early-bird; primera memoria de cálculo automatizada conforme NOM-001-SEDE-2022 generada para proyecto Norbert; webinar conjunto agendado con CPEF o ASOLMEX para Q3. **Métrica:** primer revenue externo + lead pipeline 20+ EPCs.

---

## Conclusión: por qué hay que decidir antes de RE+ México 2027

DM Storage no necesita ser una apuesta enorme: es una operación de bajo capital, alta velocidad y riesgo asimétrico favorable. **DMSolar invierte MXN 2-2.6M en 12 meses para construir y proteger un activo SaaS que monetiza su propia operación BESS C&I (vía ahorro de horas-ingeniero) y que captura una posición competitiva en un nicho que estará tomado por Sunwise o por Quartux dentro de 12-18 meses si nadie más lo ocupa.** El downside es absorber al ingeniero como talento interno con un cotizador interno mejorado —no es pérdida, es plan B.

El upside es real y verificable: hay 80-150 EPCs premium pagando hoy MXN 5-10k/mes por una herramienta como esta si entrega lo que promete; la regulación está codificada y obliga al uso de software riguroso; el legacy DMSolar/BayWa abre puertas comerciales que un competidor extranjero no tiene; el producto ya existe corriendo y solo necesita multi-tenantear y cerrar el paquete formal CFE.

**Lo único que mata el proyecto es no resolver el IP del software antes de que facture al primer cliente externo.** Esa es la prioridad #1 de la próxima reunión —antes que pricing, antes que roadmap, antes que stand en RE+. Registro INDAUTOR esta semana, constitución SAPI en 60 días, cap table firmado en 90 días. Lo demás se ejecuta.

> **Notas honestas finales sobre datos del brief original que la investigación corrigió o matizó:**
> - Pricing Sunwise no es $30-150/usuario/mes —es $149-279/mes con usuarios ilimitados (Sunwise.io/pricing-sales).
> - Pricing Ctrl+Sun no es $19/usuario/mes —es MXN $199-990/mes (~$11-55 USD).
> - "750 integradores Quartux" no es verificable; los 750 son de Serfimex Solar.
> - SurgePV es indio (Heaven Designs Surat, lanzamiento 17-mar-2026), no entrante mexicano.
> - NOM-001-SEDE-2022: publicada 13-mar-2023 pero NOM-001-SEDE-2012 sigue siendo la versión más citada por UVIE en transición; verificar versión aplicable con UVIE local.
> - Cifra GDMTH +5.35% 2025 sí confirmada; CAGR 7.1% es estimación de industria (no oficial CFE), consistente con trayectoria observada.
> - Modalidades SAE: cinco, no cuatro (CE, GE como submodalidad de CE, CC, AA, No Asociado).
> - LFPDPPP: nueva ley DOF 20-mar-2025 abrogó la de 2010; INAI extinto, autoridad ahora Secretaría Anticorrupción y Buen Gobierno.