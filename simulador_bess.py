# =============================================================================
# SIMULADOR BESS - Clase SimuladorBESS
# Modulo importado por modelo_financiero.py
# Horarios GDMTH integrados directamente para todas las regiones
# =============================================================================


# Horarios de punta GDMTH por región y temporada
# punta: lista de tuplas (hora_inicio, hora_fin)
# duracion_horas: duración total de descarga en horas punta
HORARIOS_PUNTA_GDMTH = {
    'CENTRAL': {
        'VERANO': {'punta': [(20, 22)], 'duracion_horas': 2},       # 20:00-22:00 L-V
        'INVIERNO': {'punta': [(18, 22)], 'duracion_horas': 4}      # 18:00-22:00 L-V
    },
    'NORTE': {
        'VERANO': {'punta': [(20, 22)], 'duracion_horas': 2},       # 20:00-22:00 L-V
        'INVIERNO': {'punta': [(18, 22)], 'duracion_horas': 4}      # 18:00-22:00 L-V
    },
    'BAJA CALIFORNIA SUR': {
        'VERANO': {'punta': [(12, 22)], 'duracion_horas': 10},      # 12:00-22:00 L-V
        'INVIERNO': {'punta': [], 'duracion_horas': 0}              # No aplica
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

        # Si no hay horario punta (ej: BCS invierno), no hay descarga
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
        # Potencia constante de carga durante horas BASE
        potencia_carga_kw = self.capacidad_kwh / self.horas_carga_base

        # Energía por ciclo de carga (un llenado completo del BESS)
        energia_carga_ciclo = self.capacidad_kwh

        # Energía total de carga en el mes (días laborales)
        energia_carga_mes = energia_carga_ciclo * dias_laborales

        return {
            'potencia_carga_kw': potencia_carga_kw,
            'horas_carga': self.horas_carga_base,
            'energia_carga_ciclo_kwh': energia_carga_ciclo,
            'energia_carga_mes_kwh': energia_carga_mes,
            'dias_carga': dias_laborales
        }
