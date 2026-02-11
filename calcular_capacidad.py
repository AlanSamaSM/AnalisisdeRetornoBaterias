import pandas as pd
import math

# =============================================================================
# CARGO POR CAPACIDAD - TARIFA GDMTH CFE
# Fórmula CFE (sección 7.1):
#   D_facturable = min{ Dmax_punta, floor[ Q_mensual / (24 * d * F.C.) ] }
#   Cargo Capacidad = D_facturable * Tarifa Capacidad ($/kW)
# =============================================================================

# Leer bases de datos
consumos_df = pd.read_csv(r'BASE DE DATOS DE CONSUMOS\BASE DE DATO DE CONSUMO.csv', encoding='latin-1')
tarifas_df = pd.read_csv(r'BASE DE DATOS TARIFAS GDMTH\Base de dato.csv', encoding='latin-1')

# Obtener estado y municipio del primer registro
estado_fijo = consumos_df.iloc[0]['Estado'].strip()
municipio_fijo = str(consumos_df.iloc[0]['Municipio ']).strip()

print(f"Cliente: {estado_fijo} - {municipio_fijo}")
print("=" * 180)

# Función para limpiar números con formato "64,676.00"
def limpiar_numero(valor):
    if isinstance(valor, str):
        return float(valor.replace(' ', '').replace(',', '').replace('%', ''))
    return float(valor)

# Función para extraer el mes base del nombre del período
# Convierte "Abril sub-periodo 1", "Octubre Sub-periodo 2" -> "ABRIL", "OCTUBRE"
def extraer_mes_base(mes_str):
    mes_limpio = mes_str.strip().upper()
    # Eliminar "SUB-PERIODO X" o "SUB-PERIODO X"
    for sufijo in [' SUB-PERIODO 1', ' SUB-PERIODO 2', ' SUB-PERIODO 1 ']:
        mes_limpio = mes_limpio.replace(sufijo, '')
    return mes_limpio.strip()

# Función para obtener tarifa de capacidad del mes
def obtener_tarifa_capacidad(estado, municipio, mes):
    fila = tarifas_df[
        (tarifas_df['Estado'].str.strip() == estado) &
        (tarifas_df['Munucipio'].str.strip() == municipio) &
        (tarifas_df['Mes'].str.strip() == mes)
    ]
    if len(fila) > 0:
        return limpiar_numero(fila.iloc[0]['Capacidad'])
    return None

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
    fc_precalculado = limpiar_numero(row['Factor de carga']) / 100  # Convertir % a decimal
    
    # FC recalculado con fórmula: Q_mensual / (24 * d * Demanda_Maxima)
    fc_recalculado = energia_total / (24 * d * demanda_maxima) if (d > 0 and demanda_maxima > 0) else 0
    
    # Diferencia entre FC precalculado y recalculado
    diff_fc = abs(fc_precalculado - fc_recalculado) * 100  # en puntos porcentuales
    
    # --- CARGO POR CAPACIDAD con FC precalculado ---
    demanda_formula_pre = energia_total / (24 * d * fc_precalculado) if fc_precalculado > 0 else 0
    demanda_facturable_pre = min(demanda_punta, math.floor(demanda_formula_pre))
    
    # --- CARGO POR CAPACIDAD con FC recalculado ---
    demanda_formula_rec = energia_total / (24 * d * fc_recalculado) if fc_recalculado > 0 else 0
    demanda_facturable_rec = min(demanda_punta, math.floor(demanda_formula_rec))
    
    # Obtener tarifa de capacidad del mes
    tarifa_capacidad = obtener_tarifa_capacidad(estado_fijo, municipio_fijo, mes_base)
    
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

# ======================== MOSTRAR RESULTADOS ========================

# 1. Comparación de Factor de Carga
print("\n1. COMPARACION DE FACTOR DE CARGA (BD vs Recalculado)")
print("-" * 100)
print(resultado_df[['Periodo', 'Dias', 'Q_mensual (kWh)', 'D_maxima (kW)', 
                     'FC_BD (%)', 'FC_Calc (%)', 'Diff FC (pp)']].to_string(index=False))

# 2. Cargo por Capacidad con FC de la BD
print("\n\n2. CARGO POR CAPACIDAD (usando FC de la BD)")
print("-" * 130)
print(resultado_df[['Periodo', 'D_punta (kW)', 'Q/(24*d*FC_BD)', 'D_fact_pre (kW)', 
                     'Tarifa Cap ($/kW)', 'Cargo_Cap_FC_BD ($)']].to_string(index=False))

# 3. Cargo por Capacidad con FC recalculado
print("\n\n3. CARGO POR CAPACIDAD (usando FC recalculado)")
print("-" * 130)
print(resultado_df[['Periodo', 'D_punta (kW)', 'Q/(24*d*FC_Calc)', 'D_fact_rec (kW)', 
                     'Tarifa Cap ($/kW)', 'Cargo_Cap_FC_Calc ($)']].to_string(index=False))

# 4. Totales
print("\n\n4. TOTALES ANUALES")
print("=" * 80)
total_pre = resultado_df['Cargo_Cap_FC_BD ($)'].sum()
total_rec = resultado_df['Cargo_Cap_FC_Calc ($)'].sum()
print(f"Total Cargo Capacidad (FC BD):          ${total_pre:>12,.2f}")
print(f"Total Cargo Capacidad (FC Recalculado): ${total_rec:>12,.2f}")
print(f"Diferencia:                             ${abs(total_pre - total_rec):>12,.2f}")
print("=" * 80)

# 5. Desglose de fórmula para el primer mes (ejemplo)
print("\n\n5. EJEMPLO DESGLOSE - ENERO")
print("-" * 80)
ene = resultado_df.iloc[0]
print(f"   FC = Q_mensual / (24 x d x D_maxima)")
print(f"   FC = {ene['Q_mensual (kWh)']:,.0f} / (24 x {ene['Dias']} x {ene['D_maxima (kW)']:,.0f})")
print(f"   FC = {ene['Q_mensual (kWh)']:,.0f} / {24 * ene['Dias'] * ene['D_maxima (kW)']:,.0f}")
print(f"   FC = {ene['FC_Calc (%)']:.2f}%")
print(f"\n   D_facturable = min(D_punta, floor(Q_mensual / (24 x d x FC)))")
print(f"   D_facturable = min({ene['D_punta (kW)']:,.0f}, floor({ene['Q/(24*d*FC_Calc)']:,.2f}))")
print(f"   D_facturable = min({ene['D_punta (kW)']:,.0f}, {ene['D_fact_rec (kW)']:,})")
print(f"   D_facturable = {ene['D_fact_rec (kW)']:,} kW")
print(f"\n   Cargo = {ene['D_fact_rec (kW)']:,} x ${ene['Tarifa Cap ($/kW)']:,.2f}")
print(f"   Cargo = ${ene['Cargo_Cap_FC_Calc ($)']:,.2f}")

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

# Guardar en CSV
import os
import time
csv_filename = 'CARGO_CAPACIDAD_CALCULADO.csv'

# Remover archivo previo si existe
for i in range(5):
    if os.path.exists(csv_filename):
        try:
            os.remove(csv_filename)
            time.sleep(0.2)
            break
        except:
            time.sleep(0.5)

# Guardar CSV
try:
    resultado_df_con_totales.to_csv(csv_filename, index=False, encoding='utf-8')
    print(f"\n[OK] Resultados guardados en: {csv_filename}")
except Exception as e:
    print(f"Error al guardar: {e}")

