# =============================================================================
# CONFIGURACIÓN CENTRALIZADA - MODELO FINANCIERO BESS
# Editar estos parámetros antes de ejecutar main.py
# =============================================================================

import os

# Rutas a bases de datos (relativas al directorio raíz del proyecto)
CONSUMOS_CSV = r'BASE DE DATOS DE CONSUMOS\BASE DE DATO DE CONSUMO.csv'
TARIFAS_CSV = r'BASE DE DATOS TARIFAS GDMTH\Base de dato.csv'

# Directorio de salida
RESULTADOS_DIR = 'resultados'

# =============================================================================
# CONFIGURACIÓN HORARIO PUNTA
# =============================================================================
config_punta = {
    'horario_tipo': 'PUNTA',
    'power_kw': 100,              # Potencia del PCS (kW)
    'capacity_kwh': 400,          # Capacidad de batería (kWh)
    'precio_usd': 50000,          # Precio del sistema (USD)
    'anos_proyecto': 10,          # Años de proyección
    'tasa_cambio': 18.50,         # MXN/USD
    'region_cfe': 'NORTE',        # Región CFE (CENTRAL, NORTE, BAJA CALIFORNIA SUR)
    'efficiency_pcs': 0.97,       # Eficiencia del PCS (97%)
    'dod': 0.90,                  # Depth of Discharge (90%)
    'horas_carga_base': 6,        # Horas de carga en período BASE
    'consumos_csv': CONSUMOS_CSV,
    'tarifas_csv': TARIFAS_CSV,
}

# =============================================================================
# CONFIGURACIÓN HORARIO INVIERNO
# =============================================================================
config_invierno = {
    'horario_tipo': 'INVIERNO',
    'power_kw': 120,              # Potencia del PCS (kW) - puede ser diferente
    'capacity_kwh': 500,          # Capacidad de batería (kWh) - puede ser diferente
    'precio_usd': 60000,          # Precio del sistema (USD)
    'anos_proyecto': 10,
    'tasa_cambio': 18.50,
    'region_cfe': 'NORTE',
    'efficiency_pcs': 0.97,
    'dod': 0.90,
    'horas_carga_base': 6,
    'consumos_csv': CONSUMOS_CSV,
    'tarifas_csv': TARIFAS_CSV,
}
