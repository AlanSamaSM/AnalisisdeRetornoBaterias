import pandas as pd
import math
import os
from datetime import datetime

# =============================================================================
# CARGO POR CAPACIDAD - TARIFA GDMTH CFE (REFACTORIZADO)
# Fórmula CFE (sección 7.1):
#   D_facturable = min{ Dmax_punta, floor[ Q_mensual / (24 * d * F.C.) ] }
#   Cargo Capacidad = D_facturable * Tarifa Capacidad ($/kW)
# =============================================================================

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


def obtener_tarifa_capacidad(tarifas_df, estado, municipio, mes):
    """Obtiene la tarifa de capacidad del mes."""
    fila = tarifas_df[
        (tarifas_df['Estado'].str.strip() == estado) &
        (tarifas_df['Munucipio'].str.strip() == municipio) &
        (tarifas_df['Mes'].str.strip() == mes)
    ]
    if len(fila) > 0:
        return limpiar_numero(fila.iloc[0]['Capacidad'])
    return None


def main(config):
    """
    Función principal de calcular_capacidad.
    
    Args:
        config (dict): Diccionario de configuración con:
            - horario_tipo: 'PUNTA' o 'INVIERNO'
            - consumos_csv: ruta al CSV de consumos
            - tarifas_csv: ruta al CSV de tarifas
            - (otros parámetros)
    
    Returns:
        dict: Diccionario con resultado_df y metadata
    """
    
    horario_tipo = config['horario_tipo']
    consumos_csv = config['consumos_csv']
    tarifas_csv = config['tarifas_csv']
    
    print(f"\n{'=' * 100}")
    print(f"CÁLCULO DE CAPACIDAD - HORARIO {horario_tipo}")
    print(f"{'=' * 100}")
    
    # Leer bases de datos
    consumos_df = pd.read_csv(consumos_csv, encoding='latin-1')
    tarifas_df = pd.read_csv(tarifas_csv, encoding='latin-1')
    
    # Obtener estado y municipio del primer registro
    estado_fijo = consumos_df.iloc[0]['Estado'].strip()
    municipio_fijo = str(consumos_df.iloc[0]['Municipio ']).strip()
    
    print(f"Cliente: {estado_fijo} - {municipio_fijo}")
    print(f"Horario: {horario_tipo}")
    
    # Calcular
    resultados = []
    
    for idx, row in consumos_df.iterrows():
        mes_original = row['Mes'].strip()
        mes_base = extraer_mes_base(mes_original)
        
        # Buscar columna de días (puede tener encoding diferente)
        dias_col = [c for c in consumos_df.columns if 'as' in c.lower() or 'ías' in c or 'ias' in c.lower()]
        d = int(row[dias_col[0]]) if dias_col else int(row.iloc[4])
        
        # Consumos
        consumo_punta = limpiar_numero(row['Consumo punta'])
        energia_total = limpiar_numero(row['Total de consumo'])
        
        # Demandas
        demanda_punta = limpiar_numero(row['  Demanda Punta'])
        demanda_maxima = limpiar_numero(row['Demanda Maxima'])
        
        # FC precalculado de la BD
        fc_precalculado = limpiar_numero(row['Factor de carga']) / 100
        
        # FC recalculado
        fc_recalculado = energia_total / (24 * d * demanda_maxima) if (d > 0 and demanda_maxima > 0) else 0
        
        # Diferencia entre FC precalculado y recalculado
        diff_fc = abs(fc_precalculado - fc_recalculado) * 100
        
        # --- CARGO POR CAPACIDAD con FC precalculado ---
        demanda_formula_pre = energia_total / (24 * d * fc_precalculado) if fc_precalculado > 0 else 0
        demanda_facturable_pre = min(demanda_punta, math.floor(demanda_formula_pre))
        
        # --- CARGO POR CAPACIDAD con FC recalculado ---
        demanda_formula_rec = energia_total / (24 * d * fc_recalculado) if fc_recalculado > 0 else 0
        demanda_facturable_rec = min(demanda_punta, math.floor(demanda_formula_rec))
        
        # Obtener tarifa de capacidad del mes
        tarifa_capacidad = obtener_tarifa_capacidad(tarifas_df, estado_fijo, municipio_fijo, mes_base)
        
        # Costo con FC precalculado
        costo_cap_pre = demanda_facturable_pre * tarifa_capacidad if tarifa_capacidad else 0
        
        # Costo con FC recalculado
        costo_cap_rec = demanda_facturable_rec * tarifa_capacidad if tarifa_capacidad else 0
        
        resultados.append({
            'Periodo': mes_original,
            'Mes Tarifa': mes_base,
            'Dias': d,
            'Q_mensual (kWh)': round(energia_total, 2),
            'Q_punta (kWh)': round(consumo_punta, 2),
            'D_punta (kW)': round(demanda_punta, 2),
            'D_maxima (kW)': round(demanda_maxima, 2),
            'FC_BD (%)': round(fc_precalculado * 100, 2),
            'FC_Calc (%)': round(fc_recalculado * 100, 2),
            'Diff FC (pp)': round(diff_fc, 2),
            'Q/(24*d*FC_BD)': round(demanda_formula_pre, 2),
            'D_fact_pre (kW)': demanda_facturable_pre,
            'Q/(24*d*FC_Calc)': round(demanda_formula_rec, 2),
            'D_fact_rec (kW)': demanda_facturable_rec,
            'Tarifa Cap ($/kW)': tarifa_capacidad,
            'Cargo_Cap_FC_BD ($)': round(costo_cap_pre, 2),
            'Cargo_Cap_FC_Calc ($)': round(costo_cap_rec, 2),
            'Diff Cargo ($)': round(abs(costo_cap_pre - costo_cap_rec), 2)
        })
    
    # Crear dataframe
    resultado_df = pd.DataFrame(resultados)
    
    # Agregar fila de totales
    totales_row = {
        'Periodo': 'TOTAL ANUAL',
        'Mes Tarifa': '',
        'Dias': resultado_df['Dias'].sum(),
        'Q_mensual (kWh)': resultado_df['Q_mensual (kWh)'].sum(),
        'Q_punta (kWh)': resultado_df['Q_punta (kWh)'].sum(),
        'D_punta (kW)': '',
        'D_maxima (kW)': '',
        'FC_BD (%)': '',
        'FC_Calc (%)': '',
        'Diff FC (pp)': '',
        'Q/(24*d*FC_BD)': '',
        'D_fact_pre (kW)': '',
        'Q/(24*d*FC_Calc)': '',
        'D_fact_rec (kW)': '',
        'Tarifa Cap ($/kW)': '',
        'Cargo_Cap_FC_BD ($)': resultado_df['Cargo_Cap_FC_BD ($)'].sum(),
        'Cargo_Cap_FC_Calc ($)': resultado_df['Cargo_Cap_FC_Calc ($)'].sum(),
        'Diff Cargo ($)': resultado_df['Cargo_Cap_FC_Calc ($)'].sum() - resultado_df['Cargo_Cap_FC_BD ($)'].sum()
    }
    
    resultado_df_con_totales = pd.concat([resultado_df, pd.DataFrame([totales_row])], ignore_index=True)
    
    # Guardar en CSV en subdirectorio
    resultados_dir = os.path.join('resultados', 'calcular_capacidad')
    os.makedirs(resultados_dir, exist_ok=True)
    
    csv_filename = os.path.join(resultados_dir, f'{horario_tipo}_CARGO_CAPACIDAD.csv')
    resultado_df_con_totales.to_csv(csv_filename, index=False, encoding='utf-8')
    print(f"[✓] Resultados guardados en: {csv_filename}")
    
    # Mostrar totales
    print(f"\nTOTALES {horario_tipo}:")
    print(f"  Total Cargo Capacidad: ${resultado_df['Cargo_Cap_FC_Calc ($)'].sum():,.2f}")
    
    # Retornar datos para siguientes módulos
    return {
        'horario_tipo': horario_tipo,
        'resultado_df': resultado_df,
        'resultado_df_con_totales': resultado_df_con_totales,
        'estado': estado_fijo,
        'municipio': municipio_fijo,
        'csv_file': csv_filename
    }


if __name__ == '__main__':
    # Para pruebas directas
    from config import config_punta
    resultado = main(config_punta)
    print(resultado)
