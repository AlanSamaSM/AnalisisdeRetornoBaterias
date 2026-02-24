# Sistema Orquestador - Modelo Financiero BESS

## 📋 Descripción General

Sistema integrado de **3 módulos independientes** (refactorizados como funciones) ejecutados secuencialmente mediante un **orquestador maestro** que:

1. **Calcula la capacidad requerida** por el cliente según la tarifa CFE GDMTH
2. **Simula el comportamiento del BESS** durante horarios punta e invierno
3. **Proyecta el análisis financiero** con ROI y recuperación de inversión

El sistema procesa **dos configuraciones en paralelo secuencial**:
- **Horario PUNTA**: Optimizado para descargas de 2-4 horas diarias
- **Horario INVIERNO**: Optimizado para horarios extendidos de consumo

---

## 🚀 Inicio Rápido

### Paso 1: Editar Configuración

Abre `config.py` y modifica los parámetros según tu cliente:

```python
config_punta = {
    'power_kw': 100,              # Potencia PCS (kW) - EDITABLE
    'capacity_kwh': 400,          # Capacidad batería (kWh) - EDITABLE
    'precio_usd': 50000,          # Precio sistema (USD) - EDITABLE
    'anos_proyecto': 10,          # Años proyección - EDITABLE
    'tasa_cambio': 18.50,         # MXN/USD - EDITABLE
    'region_cfe': 'NORTE',        # CFE region (CENTRAL, NORTE, BAJA CALIFORNIA SUR)
    'efficiency_pcs': 0.97,       # Eficiencia PCS (97%) - NO MODIFICAR
    'dod': 0.90,                  # Depth of Discharge (90%) - NO MODIFICAR
    'horas_carga_base': 6,        # Horas carga período BASE
}

config_invierno = {
    'power_kw': 120,              # Potencia PCS diferente para invierno
    'capacity_kwh': 500,          # Capacidad diferente para invierno
    # ... resto de parámetros
}
```

### Paso 2: Ejecutar Orquestador

```bash
python main.py
```

El sistema:
- ✓ Valida existencia de archivos CSV de consumo/tarifas
- ✓ Crea estructura `/resultados/` automáticamente
- ✓ Ejecuta PUNTA → INVIERNO secuencialmente
- ✓ Guarda todos los resultados con timestamps
- ✓ Genera log centralizado en `/resultados/execution.log`

### Paso 3: Revisar Resultados

Los resultados se guardan en 3 carpetas modulares:

```
resultados/
├── execution.log                                    # Log centralizado de ejecución
├── calcular_capacidad/
│   ├── PUNTA_CARGO_CAPACIDAD.csv                  # Cargos por capacidad sin BESS
│   └── INVIERNO_CARGO_CAPACIDAD.csv
├── simulador_bess/
│   ├── PUNTA_SIMULACION_BESS.csv                  # Parámetros de descarga/carga
│   └── INVIERNO_SIMULACION_BESS.csv
└── modelo_financiero/
    ├── PUNTA_COMPARATIVO_RECIBOS.csv              # Análisis antes/después
    ├── PUNTA_INVERSION_CAPITAL.csv                # Proyección multi-año
    ├── PUNTA_SIMULACION_BESS_FINANCIERO.csv       # Detalles financieros
    ├── INVIERNO_COMPARATIVO_RECIBOS.csv
    ├── INVIERNO_INVERSION_CAPITAL.csv
    └── INVIERNO_SIMULACION_BESS_FINANCIERO.csv
```

---

## 📁 Estructura del Proyecto

### Archivos Principales

| Archivo | Descripción |
|---------|-------------|
| **main.py** | Orquestador maestro: valida datos, ejecuta módulos secuencialmente, loguea |
| **config.py** | Configuración centralizada (editable por usuario) |
| **calcular_capacidad_main.py** | Función `main(config)` - Calcula cargos CFE por capacidad |
| **simulador_bess_main.py** | Función `main(config, resultado_cc)` - Simula BESS horario por horario |
| **modelo_financiero_main.py** | Función `main(config, resultado_sb)` - Proyección financiera 10 años |

### Archivos de Datos (Entrada)

```
BASE DE DATOS DE CONSUMOS/
└── BASE DE DATO DE CONSUMO.csv          # Consumos mensuales por cliente

BASE DE DATOS TARIFAS GDMTH/
└── Base de dato.csv                     # Tarifas CFE por estado/municipio/mes
```

### Archivos de Datos (Salida - Legado)

⚠️ Los siguientes archivos generados por módulos independientes se **mantienen** para compatibilidad:

- `CARGO_CAPACIDAD_CALCULADO.csv` (generado por calcular_capacidad.py original)
- `COMPARATIVO_RECIBOS.csv`
- `INVERSION_CAPITAL.csv`
- `SIMULACION_BESS_CAPACIDAD.csv`

---

## 🔄 Flujo de Datos Entre Módulos

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ORQUESTADOR (main.py)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ Validación de Datos   │  │ Estructura     │  │ Logging      │  │
│  │ - CSVs existentes     │  │ directorios    │  │ - execution  │  │
│  │ - Permisos            │  │ - resultados/  │  │   .log       │  │
│  └───────────────────────┘  └────────────────┘  └──────────────┘  │
│                                                                     │
│  ┌─── HORARIO PUNTA (config_punta) ───────────────────────────────┐│
│  │                                                                 ││
│  │  1️⃣  calcular_capacidad_main.main(config_punta)               ││
│  │      ├─ Entrada: BASE DE DATOS DE CONSUMOS, TARIFAS            ││
│  │      └─ Salida: PUNTA_CARGO_CAPACIDAD.csv                      ││
│  │                                                                 ││
│  │  2️⃣  simulador_bess_main.main(config_punta, resultado_cc)     ││
│  │      ├─ Entrada: resultado_cc (capacidad del paso 1)           ││
│  │      └─ Salida: PUNTA_SIMULACION_BESS.csv                      ││
│  │                                                                 ││
│  │  3️⃣  modelo_financiero_main.main(config_punta, resultado_sb)  ││
│  │      ├─ Entrada: resultado_sb (simulación paso 2)              ││
│  │      └─ Salida: PUNTA_COMPARATIVO_RECIBOS.csv                  ││
│  │                │      PUNTA_INVERSION_CAPITAL.csv              ││
│  │                └─ PUNTA_SIMULACION_BESS_FINANCIERO.csv         ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─── HORARIO INVIERNO (config_invierno) ──────────────────────────┐│
│  │  [MISMA SECUENCIA CON PARÁMETROS DIFERENTES]                   ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─── RESUMEN FINAL ──────────────────────────────────────────────┐│
│  │  ✓ Duración total, estado de ejecución, directorio salida      ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Parámetros Configurables

### config_punta y config_invierno

```python
config = {
    # === PARAMETROS EDITABLES ===
    'horario_tipo': 'PUNTA',                # O 'INVIERNO'
    'power_kw': 100,                        # Potencia PCS (kW)
    'capacity_kwh': 400,                    # Capacidad banco (kWh)
    'precio_usd': 50000,                    # Inversión (USD)
    'anos_proyecto': 10,                    # Horizonte proyección
    'tasa_cambio': 18.50,                   # MXN/USD
    'region_cfe': 'NORTE',                  # CENTRAL, NORTE, BAJA CALIFORNIA SUR
    
    # === PARAMETROS FIJOS (NO MODIFICAR) ===
    'efficiency_pcs': 0.97,                 # Eficiencia PCS (97%)
    'dod': 0.90,                            # DOD del 90%
    'horas_carga_base': 6,                  # Horas carga período BASE
    
    # === RUTAS A DATOS ===
    'consumos_csv': r'BASE DE DATOS DE CONSUMOS\BASE DE DATO DE CONSUMO.csv',
    'tarifas_csv': r'BASE DE DATOS TARIFAS GDMTH\Base de dato.csv',
}
```

---

## 📈 Salidas Principales

### 1. Comparativo de Recibos Mensuales

**Archivo**: `modelo_financiero/PUNTA_COMPARATIVO_RECIBOS.csv`

| Concepto | Valor |
|----------|-------|
| Cargo Capacidad s/ BESS | $X,XXX,XXX.00 MXN |
| Cargo Capacidad c/ BESS | $X,XXX,XXX.00 MXN |
| Ahorro Capacidad | $XXX,XXX.00 MXN |
| Costo Carga BASE | -$XX,XXX.00 MXN |
| **Ahorro Neto** | **$XXX,XXX.00 MXN** |
| % Ahorro Neto | **XX%** |

### 2. Inversión de Capital (Multi-año)

**Archivo**: `modelo_financiero/PUNTA_INVERSION_CAPITAL.csv`

| Año | Inversión | Ahorro CFE | Ahorro Neto | Ahorro Acumulado |
|-----|-----------|-----------|-------------|------------------|
| 0 | -$925,000 | $0 | $0 | -$925,000 |
| 1 | $0 | $419,000 | $419,000 | -$506,000 |
| 2 | $0 | $452,520 | $452,520 | -$53,480 |
| **2.1** | **$0** | **$476,201** | **$476,201** | **$422,721** ← **ROI** |
| 3+ | ... | ... | ... | ... |

### 3. Simulación BESS Detallada

**Archivo**: `simulador_bess/PUNTA_SIMULACION_BESS.csv`

- Potencia media descarga (kW)
- Energía por ciclo (kWh)
- Energía mensual total (kWh)
- Reducción de demanda punta (%)
- Temporada (VERANO/INVIERNO)
- Horas de punta según región GDMTH

---

## 🔍 Validaciones Implementadas

El orquestador valida:

✓ Existencia de `BASE DE DATOS DE CONSUMOS/BASE DE DATO DE CONSUMO.csv`  
✓ Existencia de `BASE DE DATOS TARIFAS GDMTH/Base de dato.csv`  
✓ Creación automática de directorios `/resultados/`  
✓ Permisos de lectura/escritura en archivos  
✓ Integridad de datos CSV (headers, formatos)  
✓ Logging centralizado de excepciones  

Si algún archivo falta, el sistema detiene la ejecución y registra el error en `execution.log`.

---

## 🛠️ Troubleshooting

### Error: "Archivo no encontrado"

```
[ERROR] Archivo no encontrado: BASE DE DATOS DE CONSUMOS\BASE DE DATO DE CONSUMO.csv
```

**Solución**: Verifica que la ruta sea relativa al directorio raíz del proyecto y que los CSV existan.

### Error: "Region no encontrada"

```
[ERROR] Region 'MONTERREY' no encontrada. Regiones disponibles: CENTRAL, NORTE, BAJA CALIFORNIA SUR
```

**Solución**: En `config.py`, usa solo: `'CENTRAL'`, `'NORTE'`, o `'BAJA CALIFORNIA SUR'`

### Resultados no se guardan

Verifica que:
- ✓ Tienes permisos de escritura en la carpeta `/resultados/`
- ✓ El disco no está lleno
- ✓ No hay procesos bloqueando los CSVs (cierra Excel si está abierto)

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Dimensionamiento para Cliente en Coahuila

```python
# config.py
config_punta = {
    'power_kw': 150,              # Sistema más grande
    'capacity_kwh': 600,
    'precio_usd': 75000,
    'anos_proyecto': 15,
    'tasa_cambio': 18.50,
    'region_cfe': 'NORTE',        # Coahuila está en NORTE
}

config_invierno = {
    'power_kw': 180,
    'capacity_kwh': 750,
    'precio_usd': 90000,
    # ... resto igual
}
```

Luego ejecuta:

```bash
python main.py
```

El sistema generará análisis para ambos horarios automáticamente.

### Ejemplo 2: Comparar Dos Escenarios

**Escenario 1**: Edita `config.py`, ejecuta `python main.py`, guarda resultados en otra carpeta.  
**Escenario 2**: Edita `config.py` nuevamente, ejecuta `python main.py`, compara CSVs.

---

## 📞 Soporte

Para problemas, revisa:

1. **execution.log**: Logs de toda la ejecución
2. **Consola**: Mensajes en tiempo real durante ejecución
3. **CSVs generados**: Valida que contengan datos esperados

---

## 📋 Registro de Cambios

### v1.0 (2026-02-23)

- ✓ Refactorización de 3 módulos a funciones independientes
- ✓ Creación de orquestador maestro (main.py)
- ✓ Configuración centralizada (config.py)
- ✓ Estructura modular de directorios (/resultados/)
- ✓ Logging centralizado (execution.log)
- ✓ Validación de datos
- ✓ Soporte para horarios PUNTA e INVIERNO simultáneos
- ✓ Parámetros editables (PCS, capacidad, inversión, años)

---

## 📦 Dependencias

```
pandas>=1.0.0
numpy>=1.19.0
python>=3.7
```

Instala con:

```bash
pip install pandas numpy
```

---

**Versión**: 1.0  
**Última actualización**: 2026-02-23  
**Estado**: PRODUCTIVO ✓
