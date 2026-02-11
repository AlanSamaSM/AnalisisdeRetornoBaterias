# Modelo Financiero BESS - Quartux

Simulador financiero para propuestas de sistemas de almacenamiento de energia (BESS)
con tarifa GDMTH de CFE.

## Estructura del proyecto

```
ModeloFinanciero/
  calcular_capacidad.py          # Paso 1: Calcula cargos por capacidad CFE
  simulador_bess.py              # Clase SimuladorBESS (modulo)
  modelo_financiero.py           # Paso 2: Genera propuesta financiera completa
  BASE DE DATOS DE CONSUMOS/     # Datos de consumo del cliente
    BASE DE DATO DE CONSUMO.csv
  BASE DE DATOS TARIFAS GDMTH/   # Tarifas CFE por estado/municipio
    Base de dato.csv
```

## Requisitos

- Python 3.10+
- pandas
- numpy

## Instalacion

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install pandas numpy
```

## Uso

### Paso 1: Calcular cargos por capacidad

```bash
python calcular_capacidad.py
```

Genera `CARGO_CAPACIDAD_CALCULADO.csv` con los cargos por capacidad calculados
a partir de los datos de consumo y tarifas.

### Paso 2: Generar modelo financiero

```bash
python modelo_financiero.py
```

El script solicita:
- **Potencia BESS (kW)**: Potencia nominal del sistema (ej: 1900)
- **Capacidad BESS (kWh)**: Capacidad total del sistema (ej: 4073)
- **Precio del sistema (USD)**: Costo del sistema de almacenamiento (ej: 1099710)
- **Anos de proyeccion**: Vida util para el analisis (ej: 20)
- **Tipo de cambio MXN/USD**: Default 18.50

### Archivos de salida

| Archivo | Contenido |
|---------|-----------|
| `COMPARATIVO_RECIBOS.csv` | Facturacion mensual sin/con bateria, ahorro por periodo |
| `INVERSION_CAPITAL.csv` | Tabla de retorno de inversion a X anos |

## Replicar con otro cliente

1. Reemplazar los CSVs en `BASE DE DATOS DE CONSUMOS/` y `BASE DE DATOS TARIFAS GDMTH/`
   con los datos del nuevo cliente
2. Ejecutar `calcular_capacidad.py`
3. Ejecutar `modelo_financiero.py` con los parametros del sistema propuesto

## Parametros del modelo

- **Eficiencia BESS**: 90%
- **Region**: NORTE (configurable en codigo)
- **Crecimiento tarifario anual**: 8% (configurable en `modelo_financiero.py`)
- **Sin Fee de O&M**: No incluido en el modelo actual
- **Sin Beneficios Fiscales**: No incluido en el modelo actual
