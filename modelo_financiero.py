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
def ejecutar_simulacion_bess(potencia_kw, capacidad_kwh, cargos_df, region='NORTE'):
    """Ejecuta la simulación BESS periodo a periodo y retorna DataFrame de resultados."""
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

        resultado_bess = simulador.reducir_demanda_punta(d_punta_original, mes_num)
        simulacion = resultado_bess['simulacion']
        d_punta_nueva = resultado_bess['demanda_nueva']

        d_facturable_con_bess = min(d_punta_nueva, d_minima_formula)
        cargo_sin_bess = min(d_punta_original, d_minima_formula) * tarifa_cap
        cargo_con_bess = d_facturable_con_bess * tarifa_cap
        ahorro = cargo_sin_bess - cargo_con_bess
        ahorro_pct = (ahorro / cargo_sin_bess) * 100 if cargo_sin_bess > 0 else 0

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
            'Ahorro': round(ahorro, 2),
            'Ahorro_Pct': round(ahorro_pct, 2)
        })

    return pd.DataFrame(resultados)


# ─────────────────────────────────────────────────────────────────────────────
# TABLA 1: COMPARATIVO MENSUAL DE RECIBOS
# ─────────────────────────────────────────────────────────────────────────────
def generar_comparativo_mensual(sim_df):
    """Genera tabla comparativa mensual estilo propuesta Quartux."""
    comparativo = sim_df[['Periodo', 'Cargo_SinBESS', 'Cargo_ConBESS', 'Ahorro', 'Ahorro_Pct']].copy()
    comparativo.columns = ['Periodo', 'Facturacion s/ bateria', 'Facturacion c/ bateria', 'Ahorro', 'Porcentaje de Ahorro']

    # Fila de totales
    total_sin = comparativo['Facturacion s/ bateria'].sum()
    total_con = comparativo['Facturacion c/ bateria'].sum()
    total_ahorro = comparativo['Ahorro'].sum()
    total_pct = (total_ahorro / total_sin) * 100 if total_sin > 0 else 0

    fila_total = pd.DataFrame([{
        'Periodo': 'TOTAL ANUAL',
        'Facturacion s/ bateria': round(total_sin, 2),
        'Facturacion c/ bateria': round(total_con, 2),
        'Ahorro': round(total_ahorro, 2),
        'Porcentaje de Ahorro': round(total_pct, 2)
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

    total_sin_bess = comparativo_df.loc[comparativo_df['Periodo'] == 'TOTAL ANUAL', 'Facturacion s/ bateria'].values[0]
    total_con_bess = comparativo_df.loc[comparativo_df['Periodo'] == 'TOTAL ANUAL', 'Facturacion c/ bateria'].values[0]
    pct_ahorro = comparativo_df.loc[comparativo_df['Periodo'] == 'TOTAL ANUAL', 'Porcentaje de Ahorro'].values[0]

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
    print(f'  Facturacion CFE:  ${total_sin_bess:>13,.2f}  ${total_con_bess:>13,.2f} MXN')
    print(f'  ---------------------------------------------')
    print(f'  Ahorro Anual Garantizado:    ${ahorro_anual:>15,.2f} MXN')

    # ═══════════════════════════════════════════════════════════════════════
    # COMPARATIVO DE RECIBOS MENSUAL
    # ═══════════════════════════════════════════════════════════════════════
    print('\n' + '=' * 90)
    print('  COMPARATIVO DE RECIBOS (Cargo por Capacidad)')
    print('=' * 90)

    # Formatear para impresión
    display_df = comparativo_df.copy()
    for col in ['Facturacion s/ bateria', 'Facturacion c/ bateria', 'Ahorro']:
        display_df[col] = display_df[col].apply(lambda x: f'${x:>13,.2f}')
    display_df['Porcentaje de Ahorro'] = display_df['Porcentaje de Ahorro'].apply(lambda x: f'{x:.0f}%')

    # Separar datos y total
    datos = display_df[display_df['Periodo'] != 'TOTAL ANUAL']
    total = display_df[display_df['Periodo'] == 'TOTAL ANUAL']

    print(f"\n  {'Periodo':<28} {'Facturacion s/ bateria':>22}  {'Facturacion c/ bateria':>22}  {'Ahorro':>15}  {'% Ahorro':>10}")
    print('  ' + '-' * 105)
    for _, row in datos.iterrows():
        print(f"  {row['Periodo']:<28} {row['Facturacion s/ bateria']:>22}  {row['Facturacion c/ bateria']:>22}  {row['Ahorro']:>15}  {row['Porcentaje de Ahorro']:>10}")
    print('  ' + '=' * 105)
    for _, row in total.iterrows():
        print(f"  {row['Periodo']:<28} {row['Facturacion s/ bateria']:>22}  {row['Facturacion c/ bateria']:>22}  {row['Ahorro']:>15}  {row['Porcentaje de Ahorro']:>10}")

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
    print(f'  Ahorro Total en {anios} anos:            ${ahorro_total_vida_util:>15,.2f} MXN')
    if roi_exacto:
        print(f'  Retorno de Inversion:                {roi_exacto} anos')
    print(f'  T.C.:                                {tipo_cambio:.2f} MXN/USD')


# ─────────────────────────────────────────────────────────────────────────────
# EXPORTAR CSVs
# ─────────────────────────────────────────────────────────────────────────────
def exportar_csvs(comparativo_df, tabla_inv_df):
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

    # 3. Ejecutar simulación BESS
    print('  Ejecutando simulacion BESS...')
    sim_df = ejecutar_simulacion_bess(potencia_kw, capacidad_kwh, cargos_df)
    ahorro_anual = sim_df['Ahorro'].sum()
    print(f'  [OK] Simulacion completada | Ahorro anual: ${ahorro_anual:,.2f} MXN')

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
    exportar_csvs(comparativo_df, tabla_inv_df)

    print('\n' + '#' * 90)
    print('#' + '  REPORTE GENERADO EXITOSAMENTE'.center(88) + '#')
    print('#' * 90 + '\n')


if __name__ == '__main__':
    main()
