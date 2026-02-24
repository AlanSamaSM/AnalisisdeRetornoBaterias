import pandas as pd
import numpy as np
import os
import sys
import io
from simulador_bess import SimuladorBESS

# Forzar UTF-8 en la salida de consola (Windows cp1252 no soporta caracteres especiales)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# =============================================================================
# MODELO FINANCIERO - PROPUESTA QUARTUX BESS
# Genera:
#   1. Simulación BESS con parámetros del usuario
#   2. Comparativo mensual de recibos (s/ batería vs c/ batería)
#   3. Resumen de propuesta óptima (% ahorro, ROI, inversión)
#   4. Tabla de inversión de capital a X años (con crecimiento tarifario 8%)
# =============================================================================

TASA_CRECIMIENTO_TARIFARIO = 0.08  # 8% anual

MESES_MAP = {
    'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
    'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
    'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
}


# ─────────────────────────────────────────────────────────────────────────────
# FUNCIONES AUXILIARES PARA TARIFAS Y CONSUMO BASE
# ─────────────────────────────────────────────────────────────────────────────
def limpiar_numero(valor):
    """Limpia un valor numerico que puede venir como string con formato."""
    if isinstance(valor, str):
        return float(valor.replace(' ', '').replace(',', '').replace('%', ''))
    return float(valor)


def extraer_mes_base(mes_str):
    """Extrae el nombre del mes sin sub-periodos."""
    mes_limpio = mes_str.strip().upper()
    for sufijo in [' SUB-PERIODO 1', ' SUB-PERIODO 2', ' SUB-PERIODO 1 ']:
        mes_limpio = mes_limpio.replace(sufijo, '')
    return mes_limpio.strip()


def cargar_datos_consumo_y_tarifas():
    """Carga las bases de datos de consumos y tarifas GDMTH."""
    consumos_df = pd.read_csv(
        r'BASE DE DATOS DE CONSUMOS\BASE DE DATO DE CONSUMO.csv',
        encoding='latin-1'
    )
    tarifas_df = pd.read_csv(
        r'BASE DE DATOS TARIFAS GDMTH\Base de dato.csv',
        encoding='latin-1'
    )
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


# ─────────────────────────────────────────────────────────────────────────────
# ENTRADA DE DATOS DEL USUARIO
# ─────────────────────────────────────────────────────────────────────────────
def solicitar_parametros():
    """Solicita al usuario los parámetros del sistema BESS y la inversión."""
    print('\n' + '=' * 80)
    print('   MODELO FINANCIERO - SISTEMA BESS QUARTUX')
    print('=' * 80)
    print('\nIngrese los parametros del sistema:\n')

    while True:
        try:
            potencia = float(input('  Potencia del sistema BESS (kW): '))
            if potencia <= 0:
                raise ValueError
            break
        except ValueError:
            print('  [!!] Ingrese un numero positivo valido.')

    while True:
        try:
            capacidad = float(input('  Capacidad del sistema BESS (kWh): '))
            if capacidad <= 0:
                raise ValueError
            break
        except ValueError:
            print('  [!!] Ingrese un numero positivo valido.')

    while True:
        try:
            precio_usd = float(input('  Precio del sistema de almacenamiento (USD): '))
            if precio_usd <= 0:
                raise ValueError
            break
        except ValueError:
            print('  [!!] Ingrese un numero positivo valido.')

    while True:
        try:
            anios = int(input('  Anos de proyeccion (vida util): '))
            if anios <= 0:
                raise ValueError
            break
        except ValueError:
            print('  [!!] Ingrese un entero positivo valido.')

    tc_input = input('  Tipo de cambio MXN/USD [18.50]: ').strip()
    tipo_cambio = float(tc_input) if tc_input else 18.50

    return potencia, capacidad, precio_usd, anios, tipo_cambio


# ─────────────────────────────────────────────────────────────────────────────
# SIMULACIÓN BESS
# ─────────────────────────────────────────────────────────────────────────────
def ejecutar_simulacion_bess(potencia_kw, capacidad_kwh, cargos_df,
                             tarifas_df=None, estado=None, municipio=None,
                             consumo_base_map=None, region='NORTE'):
    """Ejecuta la simulación BESS periodo a periodo.
    Incluye:
      - Ahorro en cargo por capacidad (descarga en PUNTA)
      - Costo adicional por carga del BESS en horario BASE
      - Ahorro neto = ahorro capacidad - costo carga BASE
    """
    simulador = SimuladorBESS(potencia_kw, capacidad_kwh, region=region)
    resultados = []

    for _, row in cargos_df.iterrows():
        if 'TOTAL' in str(row['Periodo']):
            continue

        periodo = row['Periodo']
        mes_str = row['Mes Tarifa'].strip()
        mes_num = MESES_MAP.get(mes_str, 1)
        dias = int(row['Dias'])
        d_punta_original = row['D_punta (kW)']
        tarifa_cap = row['Tarifa Cap ($/kW)']
        d_minima_formula = row['D_fact_pre (kW)']

        # --- DESCARGA EN PUNTA: ahorro en cargo por capacidad ---
        resultado_bess = simulador.reducir_demanda_punta(d_punta_original, mes_num)
        simulacion = resultado_bess['simulacion']
        d_punta_nueva = resultado_bess['demanda_nueva']

        d_facturable_con_bess = min(d_punta_nueva, d_minima_formula)
        cargo_sin_bess = min(d_punta_original, d_minima_formula) * tarifa_cap
        cargo_con_bess = d_facturable_con_bess * tarifa_cap
        ahorro_capacidad = cargo_sin_bess - cargo_con_bess
        ahorro_cap_pct = (ahorro_capacidad / cargo_sin_bess) * 100 if cargo_sin_bess > 0 else 0

        # --- CARGA EN BASE: costo adicional por llenado del BESS ---
        carga_info = simulador.calcular_carga_base(dias_laborales=dias)
        energia_carga_base = carga_info['energia_carga_mes_kwh']
        potencia_carga_kw = carga_info['potencia_carga_kw']

        # Obtener tarifa BASE y consumo BASE original
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

        # --- AHORRO NETO: ahorro capacidad - costo carga BASE ---
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
            # Columnas de carga BASE
            'Consumo_BASE_Original_kWh': round(consumo_base_original, 2),
            'Energia_Carga_BESS_kWh': round(energia_carga_base, 2),
            'Consumo_BASE_Nuevo_kWh': round(consumo_base_nuevo, 2),
            'Potencia_Carga_kW': round(potencia_carga_kw, 2),
            'Tarifa_BASE': round(tarifa_base, 6),
            'Costo_Carga_BASE': round(costo_carga_base, 2),
            # Ahorro neto
            'Ahorro_Neto': round(ahorro_neto, 2),
            'Ahorro_Neto_Pct': round(ahorro_neto_pct, 2)
        })

    return pd.DataFrame(resultados)


# ─────────────────────────────────────────────────────────────────────────────
# TABLA 1: COMPARATIVO MENSUAL DE RECIBOS
# ─────────────────────────────────────────────────────────────────────────────
def generar_comparativo_mensual(sim_df):
    """Genera tabla comparativa mensual estilo propuesta Quartux.
    Incluye ahorro por capacidad, costo de carga BASE y ahorro neto."""
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


# ─────────────────────────────────────────────────────────────────────────────
# TABLA 2: INVERSIÓN DE CAPITAL A X AÑOS
# ─────────────────────────────────────────────────────────────────────────────
def generar_tabla_inversion(ahorro_anual_base, inversion_mxn, anios, tasa_crecimiento):
    """
    Genera tabla de inversión de capital multi-año.
    - Año 0: Solo inversión inicial (negativa)
    - Año 1+: Ahorro en recibo CFE crece al % anual configurado
    - Sin Fee de O&M
    - Sin Beneficios Fiscales
    """
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
        # Ahorro crece con tasa de crecimiento tarifario a partir del año 2
        if anio == 1:
            ahorro_cfe = ahorro_anual_base
        else:
            ahorro_cfe = ahorro_anual_base * ((1 + tasa_crecimiento) ** (anio - 1))

        ahorro_neto = ahorro_cfe  # Sin O&M ni otros costos
        ahorro_acumulado += ahorro_neto

        filas.append({
            'Ano': anio,
            'Inversion': 0,
            'Ahorro en recibo CFE': round(ahorro_cfe, 2),
            'Ahorro Neto Anual': round(ahorro_neto, 2),
            'Ahorro Acumulado': round(ahorro_acumulado, 2)
        })

    return pd.DataFrame(filas)


# ─────────────────────────────────────────────────────────────────────────────
# CÁLCULO DEL ROI (año donde Ahorro Acumulado > 0)
# ─────────────────────────────────────────────────────────────────────────────
def calcular_roi(tabla_inversion):
    """Retorna el año en que el ahorro acumulado se vuelve positivo (ROI)."""
    for _, row in tabla_inversion.iterrows():
        if row['Ano'] > 0 and row['Ahorro Acumulado'] > 0:
            return row['Ano']
    return None  # No se recupera en el periodo


def calcular_roi_exacto(ahorro_anual_base, inversion_mxn, tasa_crecimiento):
    """Calcula el ROI con interpolación decimal (ej: 2.6 años)."""
    acumulado = -inversion_mxn
    for anio in range(1, 100):
        ahorro = ahorro_anual_base * ((1 + tasa_crecimiento) ** (anio - 1)) if anio > 1 else ahorro_anual_base
        acumulado_prev = acumulado
        acumulado += ahorro
        if acumulado >= 0:
            # Interpolar fracción del año
            fraccion = abs(acumulado_prev) / ahorro if ahorro > 0 else 0
            return round((anio - 1) + fraccion, 1)
    return None


# ─────────────────────────────────────────────────────────────────────────────
# IMPRESIÓN DE RESULTADOS
# ─────────────────────────────────────────────────────────────────────────────
def imprimir_resultados(potencia_kw, capacidad_kwh, precio_usd, tipo_cambio,
                        anios, comparativo_df, tabla_inv_df, ahorro_anual,
                        inversion_mxn, roi_exacto):
    """Imprime todo el reporte financiero en consola."""

    inversion_usd_iva = precio_usd
    inversion_mxn_iva = inversion_mxn

    total_sin_bess = comparativo_df.loc[comparativo_df['Periodo'] == 'TOTAL ANUAL', 'Cargo Capacidad s/ BESS'].values[0]
    total_con_bess = comparativo_df.loc[comparativo_df['Periodo'] == 'TOTAL ANUAL', 'Cargo Capacidad c/ BESS'].values[0]
    total_ahorro_cap = comparativo_df.loc[comparativo_df['Periodo'] == 'TOTAL ANUAL', 'Ahorro Capacidad'].values[0]
    total_costo_carga = comparativo_df.loc[comparativo_df['Periodo'] == 'TOTAL ANUAL', 'Costo Carga BASE'].values[0]
    total_ahorro_neto = comparativo_df.loc[comparativo_df['Periodo'] == 'TOTAL ANUAL', 'Ahorro Neto'].values[0]
    pct_ahorro = comparativo_df.loc[comparativo_df['Periodo'] == 'TOTAL ANUAL', '% Ahorro Neto'].values[0]

    # ═══════════════════════════════════════════════════════════════════════
    # ENCABEZADO
    # ═══════════════════════════════════════════════════════════════════════
    print('\n')
    print('#' * 90)
    print('#' + ' ' * 88 + '#')
    print('#' + '   MODELO FINANCIERO - PROPUESTA QUARTUX BESS'.center(88) + '#')
    print('#' + ' ' * 88 + '#')
    print('#' * 90)

    # ═══════════════════════════════════════════════════════════════════════
    # SISTEMA PROPUESTO
    # ═══════════════════════════════════════════════════════════════════════
    print('\n' + '=' * 90)
    print('  SISTEMA PROPUESTO')
    print('=' * 90)
    print(f'  Sistema de Almacenamiento:  {potencia_kw:,.0f} kW / {capacidad_kwh:,.0f} kWh')
    print(f'  Tecnologia:                 Baterias de litio LFP')
    print(f'  Eficiencia:                 90%')
    print(f'  Region:                     NORTE')

    # ═══════════════════════════════════════════════════════════════════════
    # PROPUESTA ÓPTIMA
    # ═══════════════════════════════════════════════════════════════════════
    print('\n' + '=' * 90)
    print('  PROPUESTA OPTIMA')
    print('=' * 90)
    print(f'  % de ahorro vs. CFE:        {pct_ahorro:.0f}%')
    if roi_exacto:
        print(f'  Retorno de Inversion:        {roi_exacto} anos')
    else:
        print(f'  Retorno de Inversion:        No se recupera en {anios} anos')
    print(f'  Vida Util:                   {anios} anos')
    print(f'  Tasa crecimiento tarifario:  {TASA_CRECIMIENTO_TARIFARIO*100:.0f}% anual')
    print(f'  ---------------------------------------------')
    print(f'  Inversion:')
    print(f'    Sistema de Almacenamiento: ${inversion_usd_iva:>15,.2f} USD')
    print(f'                               ${inversion_mxn_iva:>15,.2f} MXN')
    print(f'    T.C. informativo:          {tipo_cambio:.2f} MXN/USD')
    print(f'  ---------------------------------------------')
    print(f'                         Antes         Despues')
    print(f'  Cargo Capacidad:  ${total_sin_bess:>13,.2f}  ${total_con_bess:>13,.2f} MXN')
    print(f'  ---------------------------------------------')
    print(f'  Ahorro Capacidad (PUNTA):    ${total_ahorro_cap:>15,.2f} MXN')
    print(f'  Costo Carga BESS (BASE):    -${total_costo_carga:>15,.2f} MXN')
    print(f'  =============================================')
    print(f'  AHORRO NETO ANUAL:           ${total_ahorro_neto:>15,.2f} MXN')

    # ═══════════════════════════════════════════════════════════════════════
    # COMPARATIVO DE RECIBOS MENSUAL
    # ═══════════════════════════════════════════════════════════════════════
    print('\n' + '=' * 140)
    print('  COMPARATIVO DE RECIBOS (Capacidad + Carga BASE)')
    print('=' * 140)

    # Formatear para impresión
    display_df = comparativo_df.copy()
    for col in ['Cargo Capacidad s/ BESS', 'Cargo Capacidad c/ BESS', 'Ahorro Capacidad', 'Costo Carga BASE', 'Ahorro Neto']:
        display_df[col] = display_df[col].apply(lambda x: f'${x:>13,.2f}')
    display_df['% Ahorro Neto'] = display_df['% Ahorro Neto'].apply(lambda x: f'{x:.0f}%')

    # Separar datos y total
    datos = display_df[display_df['Periodo'] != 'TOTAL ANUAL']
    total = display_df[display_df['Periodo'] == 'TOTAL ANUAL']

    print(f"\n  {'Periodo':<28} {'Cap s/BESS':>15}  {'Cap c/BESS':>15}  {'Ahorro Cap':>15}  {'Costo Carga':>15}  {'Ahorro Neto':>15}  {'%':>6}")
    print('  ' + '-' * 120)
    for _, row in datos.iterrows():
        print(f"  {row['Periodo']:<28} {row['Cargo Capacidad s/ BESS']:>15}  {row['Cargo Capacidad c/ BESS']:>15}  {row['Ahorro Capacidad']:>15}  {row['Costo Carga BASE']:>15}  {row['Ahorro Neto']:>15}  {row['% Ahorro Neto']:>6}")
    print('  ' + '=' * 120)
    for _, row in total.iterrows():
        print(f"  {row['Periodo']:<28} {row['Cargo Capacidad s/ BESS']:>15}  {row['Cargo Capacidad c/ BESS']:>15}  {row['Ahorro Capacidad']:>15}  {row['Costo Carga BASE']:>15}  {row['Ahorro Neto']:>15}  {row['% Ahorro Neto']:>6}")

    # ═══════════════════════════════════════════════════════════════════════
    # TABLA DE INVERSIÓN DE CAPITAL
    # ═══════════════════════════════════════════════════════════════════════
    print('\n' + '=' * 90)
    print(f'  INVERSION DE CAPITAL (MXN) - Proyeccion a {anios} anos')
    print(f'  Crecimiento tarifario anual: {TASA_CRECIMIENTO_TARIFARIO*100:.0f}%')
    print('=' * 90)

    print(f"\n  {'Ano':>4}  {'Inversion':>18}  {'Ahorro recibo CFE':>18}  {'Ahorro Neto Anual':>18}  {'Ahorro Acumulado':>18}")
    print('  ' + '-' * 82)

    for _, row in tabla_inv_df.iterrows():
        anio = int(row['Ano'])
        inv = f"${row['Inversion']:>15,.2f}" if row['Inversion'] != 0 else ' ' * 16
        ahorro_cfe = f"${row['Ahorro en recibo CFE']:>15,.2f}" if row['Ahorro en recibo CFE'] != 0 else ' ' * 16
        neto = f"${row['Ahorro Neto Anual']:>15,.2f}" if row['Ahorro Neto Anual'] != 0 else ' ' * 16
        acum = f"${row['Ahorro Acumulado']:>15,.2f}"

        # Marcar el año de ROI
        marcador = '  << ROI' if (roi_exacto and anio == int(np.ceil(roi_exacto)) and row['Ahorro Acumulado'] > 0) else ''

        print(f"  {anio:>4}  {inv:>18}  {ahorro_cfe:>18}  {neto:>18}  {acum:>18}{marcador}")

    # Resumen final
    ahorro_total_vida_util = tabla_inv_df.loc[tabla_inv_df['Ano'] == anios, 'Ahorro Acumulado'].values[0]
    print('  ' + '=' * 82)
    print(f'\n  RESUMEN FINAL:')
    print(f'  Inversion Inicial:                   ${inversion_mxn:>15,.2f} MXN')
    print(f'  Ahorro Capacidad Anual (PUNTA):      ${total_ahorro_cap:>15,.2f} MXN')
    print(f'  Costo Carga BESS Anual (BASE):      -${total_costo_carga:>15,.2f} MXN')
    print(f'  Ahorro Neto Anual:                   ${total_ahorro_neto:>15,.2f} MXN')
    print(f'  Ahorro Total en {anios} anos:            ${ahorro_total_vida_util:>15,.2f} MXN')
    if roi_exacto:
        print(f'  Retorno de Inversion:                {roi_exacto} anos')
    print(f'  T.C.:                                {tipo_cambio:.2f} MXN/USD')


# ─────────────────────────────────────────────────────────────────────────────
# EXPORTAR CSVs
# ─────────────────────────────────────────────────────────────────────────────
def exportar_csvs(comparativo_df, tabla_inv_df, sim_df=None):
    """Guarda las tablas de resultados en archivos CSV."""
    try:
        comparativo_df.to_csv('COMPARATIVO_RECIBOS.csv', index=False, encoding='utf-8')
        print(f'\n  [OK] Comparativo mensual guardado en: COMPARATIVO_RECIBOS.csv')
    except Exception as e:
        print(f'\n  [!!] Error al guardar comparativo: {e}')

    try:
        tabla_inv_df.to_csv('INVERSION_CAPITAL.csv', index=False, encoding='utf-8')
        print(f'  [OK] Tabla de inversion guardada en:  INVERSION_CAPITAL.csv')
    except Exception as e:
        print(f'  [!!] Error al guardar inversion: {e}')

    if sim_df is not None:
        try:
            sim_df.to_csv('SIMULACION_BESS_CAPACIDAD.csv', index=False, encoding='utf-8-sig')
            print(f'  [OK] Simulacion BESS guardada en:     SIMULACION_BESS_CAPACIDAD.csv')
        except Exception as e:
            print(f'  [!!] Error al guardar simulacion: {e}')


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────
def main():
    # 1. Solicitar parámetros al usuario
    potencia_kw, capacidad_kwh, precio_usd, anios, tipo_cambio = solicitar_parametros()
    inversion_mxn = precio_usd * tipo_cambio

    print(f'\n  Configuracion recibida:')
    print(f'    BESS: {potencia_kw:,.0f} kW / {capacidad_kwh:,.0f} kWh')
    print(f'    Inversion: ${precio_usd:,.2f} USD = ${inversion_mxn:,.2f} MXN')
    print(f'    Proyeccion: {anios} anos | T.C.: {tipo_cambio:.2f}')
    print(f'    Crecimiento tarifario: {TASA_CRECIMIENTO_TARIFARIO*100:.0f}% anual')

    # 2. Cargar datos base
    print('\n  Cargando datos...')
    try:
        cargos_df = pd.read_csv('CARGO_CAPACIDAD_CALCULADO.csv')
        print('  [OK] Cargos de capacidad cargados')
    except FileNotFoundError:
        print('  [!!] No se encontro CARGO_CAPACIDAD_CALCULADO.csv')
        print('  Ejecute primero calcular_capacidad.py')
        sys.exit(1)

    # 2b. Cargar datos de consumos y tarifas para calculo de carga BASE
    try:
        consumos_df, tarifas_df, estado, municipio = cargar_datos_consumo_y_tarifas()
        consumo_base_map = construir_consumo_base_por_periodo(consumos_df)
        print(f'  [OK] Consumos y tarifas cargados ({estado} - {municipio})')
    except Exception as e:
        print(f'  [!!] No se pudieron cargar consumos/tarifas: {e}')
        tarifas_df, estado, municipio, consumo_base_map = None, None, None, None

    # 3. Ejecutar simulación BESS (capacidad + carga BASE)
    print('  Ejecutando simulacion BESS...')
    sim_df = ejecutar_simulacion_bess(
        potencia_kw, capacidad_kwh, cargos_df,
        tarifas_df=tarifas_df, estado=estado, municipio=municipio,
        consumo_base_map=consumo_base_map
    )
    ahorro_capacidad = sim_df['Ahorro_Capacidad'].sum()
    costo_carga_total = sim_df['Costo_Carga_BASE'].sum()
    ahorro_anual = sim_df['Ahorro_Neto'].sum()
    print(f'  [OK] Simulacion completada')
    print(f'       Ahorro capacidad (PUNTA):  ${ahorro_capacidad:,.2f} MXN')
    print(f'       Costo carga BESS (BASE):  -${costo_carga_total:,.2f} MXN')
    print(f'       Ahorro neto anual:         ${ahorro_anual:,.2f} MXN')

    # 4. Generar comparativo mensual
    comparativo_df = generar_comparativo_mensual(sim_df)

    # 5. Generar tabla de inversión de capital
    tabla_inv_df = generar_tabla_inversion(
        ahorro_anual_base=ahorro_anual,
        inversion_mxn=inversion_mxn,
        anios=anios,
        tasa_crecimiento=TASA_CRECIMIENTO_TARIFARIO
    )

    # 6. Calcular ROI exacto
    roi_exacto = calcular_roi_exacto(ahorro_anual, inversion_mxn, TASA_CRECIMIENTO_TARIFARIO)

    # 7. Imprimir reporte completo
    imprimir_resultados(
        potencia_kw, capacidad_kwh, precio_usd, tipo_cambio,
        anios, comparativo_df, tabla_inv_df, ahorro_anual,
        inversion_mxn, roi_exacto
    )

    # 8. Exportar CSVs
    exportar_csvs(comparativo_df, tabla_inv_df, sim_df)

    print('\n' + '#' * 90)
    print('#' + '  REPORTE GENERADO EXITOSAMENTE'.center(88) + '#')
    print('#' * 90 + '\n')


if __name__ == '__main__':
    main()
