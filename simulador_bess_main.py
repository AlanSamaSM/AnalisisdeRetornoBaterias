import pandas as pd
import os

# =============================================================================
# SIMULADOR BESS - Refactorizado para ejecutarse como función main(config)
# Importa resultados de calcular_capacidad_main
# =============================================================================

# Horarios de punta GDMTH por región y temporada
HORARIOS_PUNTA_GDMTH = {
    'CENTRAL': {
        'VERANO': {'punta': [(20, 22)], 'duracion_horas': 2},
        'INVIERNO': {'punta': [(18, 22)], 'duracion_horas': 4}
    },
    'NORTE': {
        'VERANO': {'punta': [(20, 22)], 'duracion_horas': 2},
        'INVIERNO': {'punta': [(18, 22)], 'duracion_horas': 4}
    },
    'BAJA CALIFORNIA SUR': {
        'VERANO': {'punta': [(12, 22)], 'duracion_horas': 10},
        'INVIERNO': {'punta': [], 'duracion_horas': 0}
    }
}


class SimuladorBESS:
    def __init__(self, potencia_kw, capacidad_kwh, region='NORTE',
                 eficiencia=0.90, horas_carga_base=6):
        self.potencia_kw = potencia_kw
        self.capacidad_kwh = capacidad_kwh
        self.region = region.upper()
        self.eficiencia = eficiencia
        self.horas_carga_base = horas_carga_base
        self.horarios = HORARIOS_PUNTA_GDMTH

        # Validar que la región solicitada existe
        if self.region not in self.horarios:
            regiones_disponibles = ', '.join(self.horarios.keys())
            raise ValueError(
                f"Region '{self.region}' no encontrada. "
                f"Regiones disponibles: {regiones_disponibles}"
            )

    def obtener_horas_punta(self, mes):
        if 4 <= mes <= 10:
            temporada = 'VERANO'
        else:
            temporada = 'INVIERNO'

        datos = self.horarios[self.region][temporada]
        horas_punta = datos['punta']
        duracion_descarga = datos['duracion_horas']

        return horas_punta, duracion_descarga, temporada

    def calcular_energia_descargable(self, duracion_horas):
        energia_descargable = self.potencia_kw * duracion_horas
        energia_descargable = min(energia_descargable, self.capacidad_kwh)
        return energia_descargable

    def simular_descarga_diaria(self, mes, dias_laborales=22):
        horas_punta, duracion_descarga, temporada = self.obtener_horas_punta(mes)

        if duracion_descarga == 0:
            return {
                'temporada': temporada,
                'horas_punta': horas_punta,
                'duracion_horas': 0,
                'potencia_media_kw': 0,
                'energia_por_ciclo_kwh': 0,
                'energia_total_mes_kwh': 0,
                'dias_descarga': dias_laborales
            }

        energia_por_ciclo = self.calcular_energia_descargable(duracion_descarga)
        potencia_media_descarga = energia_por_ciclo / duracion_descarga
        energia_total_mes = energia_por_ciclo * dias_laborales
        return {
            'temporada': temporada,
            'horas_punta': horas_punta,
            'duracion_horas': duracion_descarga,
            'potencia_media_kw': potencia_media_descarga,
            'energia_por_ciclo_kwh': energia_por_ciclo,
            'energia_total_mes_kwh': energia_total_mes,
            'dias_descarga': dias_laborales
        }

    def reducir_demanda_punta(self, demanda_punta_original, mes):
        simulacion = self.simular_descarga_diaria(mes)
        potencia_reducida = simulacion['potencia_media_kw']
        demanda_punta_nueva = max(0, demanda_punta_original - potencia_reducida)
        return {
            'demanda_original': demanda_punta_original,
            'potencia_bess': potencia_reducida,
            'demanda_nueva': demanda_punta_nueva,
            'reduccion_kw': demanda_punta_original - demanda_punta_nueva,
            'reduccion_porcentaje': (1 - demanda_punta_nueva / demanda_punta_original) * 100 if demanda_punta_original > 0 else 0,
            'simulacion': simulacion
        }

    def calcular_carga_base(self, dias_laborales=22):
        """
        Calcula la energía necesaria para cargar el BESS en horario BASE.
        La carga se realiza durante horas BASE (nocturnas) para aprovechar
        la tarifa más baja y luego descargar en PUNTA.

        Returns:
            dict con potencia de carga, energía por ciclo, energía mensual, etc.
        """
        potencia_carga_kw = self.capacidad_kwh / self.horas_carga_base
        energia_carga_ciclo = self.capacidad_kwh
        energia_carga_mes = energia_carga_ciclo * dias_laborales

        return {
            'potencia_carga_kw': potencia_carga_kw,
            'horas_carga': self.horas_carga_base,
            'energia_carga_ciclo_kwh': energia_carga_ciclo,
            'energia_carga_mes_kwh': energia_carga_mes,
            'dias_carga': dias_laborales
        }


def main(config, resultado_cc):
    """
    Función principal de simulador_bess.
    
    Args:
        config (dict): Diccionario de configuración
        resultado_cc (dict): Resultado de calcular_capacidad_main.main()
    
    Returns:
        dict: Diccionario con simulación BESS
    """
    
    horario_tipo = config['horario_tipo']
    power_kw = config['power_kw']
    capacity_kwh = config['capacity_kwh']
    region_cfe = config['region_cfe']
    horas_carga_base = config.get('horas_carga_base', 6)
    EFICIENCIA_BESS_FIJA = 0.90  # 90% - Valor fijo
    
    print(f"\n{'=' * 100}")
    print(f"SIMULADOR BESS - HORARIO {horario_tipo}")
    print(f"{'=' * 100}")
    print(f"Potencia PCS: {power_kw} kW")
    print(f"Capacidad Batería: {capacity_kwh} kWh")
    print(f"Región CFE: {region_cfe}")
    print(f"Eficiencia BESS: {EFICIENCIA_BESS_FIJA * 100:.0f}%")
    
    # Crear simulador
    simulador = SimuladorBESS(power_kw, capacity_kwh, region=region_cfe, 
                               eficiencia=EFICIENCIA_BESS_FIJA, horas_carga_base=horas_carga_base)
    
    # Obtener resultado de calcular_capacidad
    resultado_df = resultado_cc['resultado_df']
    
    # Simular por cada mes
    simulaciones = []
    
    for idx, row in resultado_df.iterrows():
        periodo = row['Periodo']
        mes_base = row['Mes Tarifa'].strip()
        
        # Convertir mes a número
        meses_map = {
            'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
            'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
            'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12
        }
        mes_numero = meses_map.get(mes_base, 1)
        
        # Simular descarga
        descarga = simulador.simular_descarga_diaria(mes_numero)
        
        # Simular carga base
        carga = simulador.calcular_carga_base()
        
        # Reducción de demanda punta
        demanda_punta_orig = row['D_punta (kW)']
        reduccion = simulador.reducir_demanda_punta(demanda_punta_orig, mes_numero)
        
        simulaciones.append({
            'Periodo': periodo,
            'Mes': mes_base,
            'Potencia_BESS_kW': reduccion['potencia_bess'],
            'Energia_Descarga_kWh': descarga['energia_por_ciclo_kwh'],
            'Dias_Descarga': descarga['dias_descarga'],
            'Energia_Descarga_Mes_kWh': descarga['energia_total_mes_kwh'],
            'Demanda_Punta_Original_kW': demanda_punta_orig,
            'Demanda_Punta_Nueva_kW': reduccion['demanda_nueva'],
            'Reduccion_Demanda_kW': reduccion['reduccion_kw'],
            'Reduccion_Demanda_Porcentaje': round(reduccion['reduccion_porcentaje'], 2),
            'Potencia_Carga_Base_kW': carga['potencia_carga_kw'],
            'Energia_Carga_Base_Mes_kWh': carga['energia_carga_mes_kwh'],
            'Temporada': descarga['temporada'],
            'Horas_Punta': str(descarga['horas_punta']),
            'Duracion_Punta_Horas': descarga['duracion_horas']
        })
    
    # Crear dataframe
    simulacion_df = pd.DataFrame(simulaciones)
    
    # Guardar en CSV
    resultados_dir = os.path.join('resultados', 'simulador_bess')
    os.makedirs(resultados_dir, exist_ok=True)
    
    csv_filename = os.path.join(resultados_dir, f'{horario_tipo}_SIMULACION_BESS.csv')
    simulacion_df.to_csv(csv_filename, index=False, encoding='utf-8')
    print(f"[✓] Simulación guardada en: {csv_filename}")
    
    # Resumen
    print(f"\nRESUMEN SIMULACIÓN {horario_tipo}:")
    print(f"  Energía total descarga (mes): {simulacion_df['Energia_Descarga_Mes_kWh'].sum():,.2f} kWh")
    print(f"  Energía total carga (mes): {simulacion_df['Energia_Carga_Base_Mes_kWh'].sum():,.2f} kWh")
    print(f"  Reducción promedio demanda: {simulacion_df['Reduccion_Demanda_Porcentaje'].mean():.2f}%")
    
    return {
        'horario_tipo': horario_tipo,
        'simulacion_df': simulacion_df,
        'simulador': simulador,
        'csv_file': csv_filename
    }


if __name__ == '__main__':
    # Para pruebas directas
    from config import config_punta
    import calcular_capacidad_main
    
    resultado_cc = calcular_capacidad_main.main(config_punta)
    resultado = main(config_punta, resultado_cc)
    print(resultado)
