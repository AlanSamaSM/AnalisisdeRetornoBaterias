# QUICK START - Script Orquestador BESS

## ⚡ Inicio en 3 Pasos

### 1️⃣ Editar Configuración
```bash
Abre: config.py
```

Modifica estos valores según tu cliente:
```python
config_punta = {
    'power_kw': 100,          # Cambiar PCS (kW)
    'capacity_kwh': 400,      # Cambiar batería (kWh)
    'precio_usd': 50000,      # Cambiar inversión (USD)
    'anos_proyecto': 10,      # Cambiar años
    'tasa_cambio': 18.50,     # Cambiar T.C. MXN/USD
    'region_cfe': 'NORTE',    # CENTRAL, NORTE, BAJA CALIFORNIA SUR
}

config_invierno = {
    'power_kw': 120,          # Diferente para invierno
    'capacity_kwh': 500,
    # ... resto igual
}
```

### 2️⃣ Ejecutar
```bash
python main.py
```

### 3️⃣ Ver Resultados
```
resultados/
├── execution.log (log de ejecución)
├── calcular_capacidad/
│   ├── PUNTA_CARGO_CAPACIDAD.csv
│   └── INVIERNO_CARGO_CAPACIDAD.csv
├── simulador_bess/
│   ├── PUNTA_SIMULACION_BESS.csv
│   └── INVIERNO_SIMULACION_BESS.csv
└── modelo_financiero/
    ├── PUNTA_COMPARATIVO_RECIBOS.csv      ← AHORRO MENSUAL
    ├── PUNTA_INVERSION_CAPITAL.csv        ← ROI (años)
    ├── INVIERNO_COMPARATIVO_RECIBOS.csv
    └── INVIERNO_INVERSION_CAPITAL.csv
```

---

## 🎯 Parámetros Clave

| Parámetro | Significado | Rango | Nota |
|-----------|------------|-------|------|
| `power_kw` | Potencia del PCS | 10-500 kW | Dimensionamiento crítico |
| `capacity_kwh` | Capacidad banco | 50-2000 kWh | 90% DOD fijo |
| `precio_usd` | Inversión sistema | $10k-$500k | Incluye instalación |
| `anos_proyecto` | Horizonte | 5-25 años | ROI hasta año N |
| `tasa_cambio` | MXN/USD | 17-20 | Actualizar diariamente |
| `region_cfe` | Región CFE | NORTE, CENTRAL, BCS | Afecta tarifas |

---

## 📊 Salidas Principales

### Comparativo Mensual (COMPARATIVO_RECIBOS.csv)

```
Periodo             | Cap s/BESS | Cap c/BESS | Ahorro Cap | Costo Carga | Ahorro Neto | %
ENERO               | $500,000   | $350,000   | $150,000   | -$50,000    | $100,000    | 20%
FEBRERO             | $510,000   | $357,000   | $153,000   | -$51,000    | $102,000    | 20%
...
TOTAL ANUAL         | $6,000,000 | $4,200,000 | $1,800,000 | -$600,000   | $1,200,000  | 20%
```

### Inversión Multi-año (INVERSION_CAPITAL.csv)

```
Ano | Inversion  | Ahorro CFE | Ahorro Neto | Ahorro Acumulado
 0  | -$925,000  | $0         | $0          | -$925,000
 1  | $0         | $419,000   | $419,000    | -$506,000
 2  | $0         | $452,500   | $452,500    | -$53,500
 3  | $0         | $488,700   | $488,700    | $435,200  ← ROI (2.1 años)
```

---

## ✅ Parámetros FIJOS (No Modificar)

Estos se calculan automáticamente según tu solicitud:

| Parámetro | Valor | Razón |
|-----------|-------|-------|
| `efficiency_pcs` | 0.97 (97%) | Especificado |
| `dod` | 0.90 (90%) | Especificado |
| `factor_usable` | 0.90 (90%) | Especificado |
| `eficiencia_bess` | 0.90 (90%) | Especificado |
| `horas_carga_base` | 6 horas | Período base CFE |

---

## 🔍 Archivos que Lee

- ✓ `BASE DE DATOS DE CONSUMOS/BASE DE DATO DE CONSUMO.csv`
- ✓ `BASE DE DATOS TARIFAS GDMTH/Base de dato.csv`

Asegúrate de que ambos existan en el directorio raíz.

---

## 🚨 Errores Comunes

| Error | Solución |
|-------|----------|
| "Archivo no encontrado" | Verifica rutas CSV en config.py |
| "Region no encontrada" | Usa: CENTRAL, NORTE, BAJA CALIFORNIA SUR |
| "División por cero" | Verifica que demandas no sean 0 en CSV |
| "Permisos denegados" | Cierra Excel si tiene CSVs abiertos |

---

## 📈 Ejemplo de Uso Real

**Cliente**: Coahuila (región NORTE)  
**Consumo punta**: 1000 kW  
**Objetivo**: Reducir carga punta 200 kW  

**Parámetros**:
```python
config_punta = {
    'power_kw': 200,              # Sistema 200 kW
    'capacity_kwh': 400,          # Batería 400 kWh (2 horas descarga)
    'precio_usd': 100000,         # Inversión $100k USD
    'anos_proyecto': 10,
    'tasa_cambio': 18.50,
    'region_cfe': 'NORTE',
}
```

**Resultado esperado**:
- Ahorro anual: ~$600k-$800k MXN
- ROI: 1.5-2 años
- Beneficio 10 años: $5M+ MXN

---

## 🔄 Flujo de Datos

```
config.py
    ↓
main.py (orquestador)
    ├─→ Valida CSVs
    ├─→ Crea /resultados/
    │
    ├─ PUNTA:
    │   ├─→ calcular_capacidad_main(config_punta)
    │   ├─→ simulador_bess_main(config_punta, resultado_cc)
    │   └─→ modelo_financiero_main(config_punta, resultado_sb)
    │
    └─ INVIERNO:
        ├─→ calcular_capacidad_main(config_invierno)
        ├─→ simulador_bess_main(config_invierno, resultado_cc)
        └─→ modelo_financiero_main(config_invierno, resultado_sb)
```

---

## 📞 Contacto/Soporte

Si tienes problemas:

1. Revisa `resultados/execution.log`
2. Consulta `GUIA_ORQUESTADOR.md` (documentación completa)
3. Verifica valores en `config.py`

---

**¡Listo! Ahora puedes dimensionar sistemas BESS en minutos.**
