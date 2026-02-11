# =============================================================================
# SIMULADOR BESS - Clase SimuladorBESS
# Modulo importado por modelo_financiero.py
# =============================================================================


class SimuladorBESS:
    def __init__(self, potencia_kw, capacidad_kwh, region='NORTE'):
        self.potencia_kw = potencia_kw
        self.capacidad_kwh = capacidad_kwh
        self.region = region
        self.eficiencia = 0.90
        self.horarios = {
            'NORTE': {
                'VERANO': {'punta': [(20, 22)]},
                'INVIERNO': {'punta': [(18, 22)]}
            }
        }

    def obtener_horas_punta(self, mes):
        if 4 <= mes <= 10:
            temporada = 'VERANO'
            duracion_descarga = 2
        else:
            temporada = 'INVIERNO'
            duracion_descarga = 4
        horas_punta = self.horarios[self.region][temporada]['punta']
        return horas_punta, duracion_descarga, temporada

    def calcular_energia_descargable(self, duracion_horas):
        energia_descargable = (self.potencia_kw * duracion_horas * self.eficiencia)
        energia_descargable = min(energia_descargable, self.capacidad_kwh)
        return energia_descargable

    def simular_descarga_diaria(self, mes, dias_laborales=22):
        horas_punta, duracion_descarga, temporada = self.obtener_horas_punta(mes)
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
