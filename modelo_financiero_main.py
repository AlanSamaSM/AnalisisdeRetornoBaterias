import pandas as pd
import numpy as np
import os
import sys
import io
from datetime import datetime

# Forzar UTF-8 en consola (Windows)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# =============================================================================
# MODELO FINANCIERO - REFACTORIZADO COMO FUNCIÓN main(config, resultado_sb)
# =============================================================================

TASA_CRECIMIENTO_TARIFARIO = 0.08  # 8% anual

MESES_MAP = {
    'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
    'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
    'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
}


def limpiar_numero(valor):
    """Limpia un valor numérico que puede venir como string con formato."""
    if isinstance(valor, str):
        return float(valor.replace(' ', '').replace(',', '').replace('%', ''))
    return float(valor)


def extraer_mes_base(mes_str):
    """Extrae el nombre del mes sin sub-periodos."""
    mes_limpio = mes_str.strip().upper()
    for sufijo in [' SUB-PERIODO 1', ' SUB-PERIODO 2', ' SUB-PERIODO 1 ']:
        mes_limpio = mes_limpio.replace(sufijo, '')
    return mes_limpio.strip()


def cargar_datos_consumo_y_tarifas(consumos_csv, tarifas_csv):
    """Carga las bases de datos de consumos y tarifas GDMTH."""
    consumos_df = pd.read_csv(consumos_csv, encoding='latin-1')
    tarifas_df = pd.read_csv(tarifas_csv, encoding='latin-1')
    estado = consumos_df.iloc[0]['Estado'].strip()
    municipio = str(consumos_df.iloc[0]['Municipio ']).strip()
    return consumos_df, tarifas_df, estado, municipio


def obtener_tarifa_base(tarifas_df, estado, municipio, mes):
    """Obtiene la tarifa BASE ($/kWh) para un estado, municipio y mes."""
    fila = tarifas_df[
        (tarifas_df['Estado'].str.strip().str.upper() == estado.upper()) &
        (tarifas_df['Munucipio'].str.strip().str.upper() == municipio.upper()) &
        (tarifas_df['Mes'].str.strip().str.upper() == mes.upper()) &
        (tarifas_df['Int. Horario'].astype(str).str.strip().str.upper() == 'BASE')
    ]
    if len(fila) > 0:
        return limpiar_numero(fila.iloc[0]['Monto'])
    return None


def construir_consumo_base_por_periodo(consumos_df):
    """Construye un diccionario de consumo BASE (kWh) por periodo."""
    consumo_map = {}
    for _, row in consumos_df.iterrows():
        mes_original = row['Mes'].strip()
        consumo_base = limpiar_numero(row['Consumo base'])
        consumo_map[mes_original.upper()] = consumo_base
    return consumo_map


def generar_comparativo_mensual(sim_df):
    """Genera tabla comparativa mensual estilo propuesta Quartux."""
    comparativo = sim_df[[
        'Periodo', 'Cargo_SinBESS', 'Cargo_ConBESS',
        'Ahorro_Capacidad', 'Costo_Carga_BASE', 'Ahorro_Neto', 'Ahorro_Neto_Pct'
    ]].copy()
    comparativo.columns = [
        'Periodo', 'Cargo Capacidad s/ BESS', 'Cargo Capacidad c/ BESS',
        'Ahorro Capacidad', 'Costo Carga BASE', 'Ahorro Neto', '% Ahorro Neto'
    ]

    # Fila de totales
    total_sin = comparativo['Cargo Capacidad s/ BESS'].sum()
    total_con = comparativo['Cargo Capacidad c/ BESS'].sum()
    total_ahorro_cap = comparativo['Ahorro Capacidad'].sum()
    total_costo_carga = comparativo['Costo Carga BASE'].sum()
    total_ahorro_neto = comparativo['Ahorro Neto'].sum()
    total_pct = (total_ahorro_neto / total_sin) * 100 if total_sin > 0 else 0

    fila_total = pd.DataFrame([{
        'Periodo': 'TOTAL ANUAL',
        'Cargo Capacidad s/ BESS': round(total_sin, 2),
        'Cargo Capacidad c/ BESS': round(total_con, 2),
        'Ahorro Capacidad': round(total_ahorro_cap, 2),
        'Costo Carga BASE': round(total_costo_carga, 2),
        'Ahorro Neto': round(total_ahorro_neto, 2),
        '% Ahorro Neto': round(total_pct, 2)
    }])

    comparativo = pd.concat([comparativo, fila_total], ignore_index=True)
    return comparativo


def generar_tabla_inversion(ahorro_anual_base, inversion_mxn, anios, tasa_crecimiento):
    """Genera tabla de inversión de capital multi-año."""
    filas = []

    # Año 0: Inversión inicial
    filas.append({
        'Ano': 0,
        'Inversion': round(-inversion_mxn, 2),
        'Ahorro en recibo CFE': 0,
        'Ahorro Neto Anual': 0,
        'Ahorro Acumulado': round(-inversion_mxn, 2)
    })

    ahorro_acumulado = -inversion_mxn

    for anio in range(1, anios + 1):
        if anio == 1:
            ahorro_cfe = ahorro_anual_base
        else:
            ahorro_cfe = ahorro_anual_base * ((1 + tasa_crecimiento) ** (anio - 1))

        ahorro_neto = ahorro_cfe
        ahorro_acumulado += ahorro_neto

        filas.append({
            'Ano': anio,
            'Inversion': 0,
            'Ahorro en recibo CFE': round(ahorro_cfe, 2),
            'Ahorro Neto Anual': round(ahorro_neto, 2),
            'Ahorro Acumulado': round(ahorro_acumulado, 2)
        })

    return pd.DataFrame(filas)


def calcular_roi_exacto(ahorro_anual_base, inversion_mxn, tasa_crecimiento):
    """Calcula el ROI con interpolación decimal."""
    acumulado = -inversion_mxn
    for anio in range(1, 100):
        ahorro = ahorro_anual_base * ((1 + tasa_crecimiento) ** (anio - 1)) if anio > 1 else ahorro_anual_base
        acumulado_prev = acumulado
        acumulado += ahorro
        if acumulado >= 0:
            fraccion = abs(acumulado_prev) / ahorro if ahorro > 0 else 0
            return round((anio - 1) + fraccion, 1)
    return None


def main(config, resultado_sb):
    """
    Función principal de modelo_financiero.
    
    Args:
        config (dict): Diccionario de configuración
        resultado_sb (dict): Resultado de simulador_bess_main.main()
    
    Returns:
        dict: Diccionario con resultado financiero
    """
    
    horario_tipo = config['horario_tipo']
    power_kw = config['power_kw']
    capacity_kwh = config['capacity_kwh']
    precio_usd = config['precio_usd']
    anos_proyecto = config['anos_proyecto']
    tasa_cambio = config['tasa_cambio']
    consumos_csv = config['consumos_csv']
    tarifas_csv = config['tarifas_csv']
    
    print(f"\n{'=' * 100}")
    print(f"MODELO FINANCIERO - HORARIO {horario_tipo}")
    print(f"{'=' * 100}")
    
    inversion_mxn = precio_usd * tasa_cambio
    
    print(f"Sistema: {power_kw} kW / {capacity_kwh} kWh")
    print(f"Inversión: ${precio_usd:,.2f} USD = ${inversion_mxn:,.2f} MXN (T.C.: {tasa_cambio})")
    
    # Cargar datos base
    try:
        consumos_df, tarifas_df, estado, municipio = cargar_datos_consumo_y_tarifas(consumos_csv, tarifas_csv)
        consumo_base_map = construir_consumo_base_por_periodo(consumos_df)
    except Exception as e:
        print(f"[ERROR] No se pudieron cargar consumos/tarifas: {e}")
        tarifas_df, estado, municipio, consumo_base_map = None, None, None, None
    
    # Obtener simulación BESS
    simulacion_df = resultado_sb['simulacion_df']
    simulador = resultado_sb['simulador']
    
    # Cargar cargos de capacidad (desde archivo CSV guardado por calcular_capacidad)
    try:
        # Buscar el CSV de capacidad del mismo horario
        resultados_dir = os.path.join('resultados', 'calcular_capacidad')
        csv_capacidad = os.path.join(resultados_dir, f'{horario_tipo}_CARGO_CAPACIDAD.csv')
        cargos_df = pd.read_csv(csv_capacidad)
    except FileNotFoundError:
        print(f"[ERROR] No se encontró {csv_capacidad}")
        return None
    
    # Simular mes por mes combinando capacidad + carga base
    resultados = []
    
    for idx, row in cargos_df.iterrows():
        if 'TOTAL' in str(row['Periodo']):
            continue
        
        periodo = row['Periodo']
        mes_str = row['Mes Tarifa'].strip()
        mes_num = MESES_MAP.get(mes_str, 1)
        dias = int(row['Dias'])
        d_punta_original = row['D_punta (kW)']
        tarifa_cap = row['Tarifa Cap ($/kW)']
        d_minima_formula = row['D_fact_pre (kW)']
        
        # Descarga en PUNTA: ahorro en cargo por capacidad
        resultado_bess = simulador.reducir_demanda_punta(d_punta_original, mes_num)
        simulacion = resultado_bess['simulacion']
        d_punta_nueva = resultado_bess['demanda_nueva']
        
        d_facturable_con_bess = min(d_punta_nueva, d_minima_formula)
        cargo_sin_bess = min(d_punta_original, d_minima_formula) * tarifa_cap
        cargo_con_bess = d_facturable_con_bess * tarifa_cap
        ahorro_capacidad = cargo_sin_bess - cargo_con_bess
        ahorro_cap_pct = (ahorro_capacidad / cargo_sin_bess) * 100 if cargo_sin_bess > 0 else 0
        
        # Carga en BASE: costo adicional
        carga_info = simulador.calcular_carga_base(dias_laborales=dias)
        energia_carga_base = carga_info['energia_carga_mes_kwh']
        potencia_carga_kw = carga_info['potencia_carga_kw']
        
        # Obtener tarifa BASE
        tarifa_base = 0
        consumo_base_original = 0
        costo_carga_base = 0
        consumo_base_nuevo = 0
        
        if tarifas_df is not None and estado and municipio:
            tarifa_base = obtener_tarifa_base(tarifas_df, estado, municipio, mes_str) or 0
            costo_carga_base = energia_carga_base * tarifa_base
        
        if consumo_base_map:
            periodo_upper = periodo.strip().upper()
            consumo_base_original = consumo_base_map.get(periodo_upper, 0)
            consumo_base_nuevo = consumo_base_original + energia_carga_base
        
        # Ahorro neto
        ahorro_neto = ahorro_capacidad - costo_carga_base
        ahorro_neto_pct = (ahorro_neto / cargo_sin_bess) * 100 if cargo_sin_bess > 0 else 0
        
        resultados.append({
            'Periodo': periodo,
            'Mes': mes_str,
            'Dias': dias,
            'Temporada': simulacion['temporada'],
            'D_Punta_Original_kW': round(d_punta_original, 2),
            'Piso_Facturacion_kW': round(d_minima_formula, 2),
            'Potencia_BESS_kW': round(resultado_bess['potencia_bess'], 2),
            'D_Punta_Nueva_kW': round(d_punta_nueva, 2),
            'Duracion_Descarga_h': simulacion['duracion_horas'],
            'Energia_Ciclo_kWh': round(simulacion['energia_por_ciclo_kwh'], 2),
            'Energia_Mes_kWh': round(simulacion['energia_total_mes_kwh'], 2),
            'Tarifa_Cap': tarifa_cap,
            'Cargo_SinBESS': round(cargo_sin_bess, 2),
            'Cargo_ConBESS': round(cargo_con_bess, 2),
            'Ahorro_Capacidad': round(ahorro_capacidad, 2),
            'Ahorro_Cap_Pct': round(ahorro_cap_pct, 2),
            'Consumo_BASE_Original_kWh': round(consumo_base_original, 2),
            'Energia_Carga_BESS_kWh': round(energia_carga_base, 2),
            'Consumo_BASE_Nuevo_kWh': round(consumo_base_nuevo, 2),
            'Potencia_Carga_kW': round(potencia_carga_kw, 2),
            'Tarifa_BASE': round(tarifa_base, 6),
            'Costo_Carga_BASE': round(costo_carga_base, 2),
            'Ahorro_Neto': round(ahorro_neto, 2),
            'Ahorro_Neto_Pct': round(ahorro_neto_pct, 2)
        })
    
    sim_df = pd.DataFrame(resultados)
    
    # Generar comparativo mensual
    comparativo_df = generar_comparativo_mensual(sim_df)
    
    # Totales
    ahorro_capacidad = sim_df['Ahorro_Capacidad'].sum()
    costo_carga_total = sim_df['Costo_Carga_BASE'].sum()
    ahorro_anual = sim_df['Ahorro_Neto'].sum()
    
    # Generar tabla de inversión
    tabla_inv_df = generar_tabla_inversion(
        ahorro_anual_base=ahorro_anual,
        inversion_mxn=inversion_mxn,
        anios=anos_proyecto,
        tasa_crecimiento=TASA_CRECIMIENTO_TARIFARIO
    )
    
    # Calcular ROI
    roi_exacto = calcular_roi_exacto(ahorro_anual, inversion_mxn, TASA_CRECIMIENTO_TARIFARIO)
    
    # Mostrar resumen
    print(f"\nRESUMEN FINANCIERO {horario_tipo}:")
    print(f"  Ahorro Capacidad (PUNTA):     ${ahorro_capacidad:>15,.2f} MXN")
    print(f"  Costo Carga BESS (BASE):     -${costo_carga_total:>15,.2f} MXN")
    print(f"  Ahorro Neto Anual:            ${ahorro_anual:>15,.2f} MXN")
    if roi_exacto:
        print(f"  Retorno de Inversión:         {roi_exacto} años")
    print(f"  Inversión Inicial:            ${inversion_mxn:>15,.2f} MXN")
    
    # Guardar CSVs
    resultados_dir = os.path.join('resultados', 'modelo_financiero')
    os.makedirs(resultados_dir, exist_ok=True)
    
    comparativo_file = os.path.join(resultados_dir, f'{horario_tipo}_COMPARATIVO_RECIBOS.csv')
    inversion_file = os.path.join(resultados_dir, f'{horario_tipo}_INVERSION_CAPITAL.csv')
    simulacion_file = os.path.join(resultados_dir, f'{horario_tipo}_SIMULACION_BESS_FINANCIERO.csv')
    
    comparativo_df.to_csv(comparativo_file, index=False, encoding='utf-8')
    tabla_inv_df.to_csv(inversion_file, index=False, encoding='utf-8')
    sim_df.to_csv(simulacion_file, index=False, encoding='utf-8')
    
    print(f"[✓] Comparativo guardado en: {comparativo_file}")
    print(f"[✓] Inversión guardada en:   {inversion_file}")
    print(f"[✓] Simulación guardada en:  {simulacion_file}")
    
    return {
        'horario_tipo': horario_tipo,
        'sim_df': sim_df,
        'comparativo_df': comparativo_df,
        'tabla_inv_df': tabla_inv_df,
        'ahorro_anual': ahorro_anual,
        'roi_exacto': roi_exacto,
        'inversion_mxn': inversion_mxn,
        'comparativo_file': comparativo_file,
        'inversion_file': inversion_file
    }


if __name__ == '__main__':
    # Para pruebas directas
    from config import config_punta
    import calcular_capacidad_main
    import simulador_bess_main
    
    resultado_cc = calcular_capacidad_main.main(config_punta)
    resultado_sb = simulador_bess_main.main(config_punta, resultado_cc)
    resultado = main(config_punta, resultado_sb)
    print(resultado)
