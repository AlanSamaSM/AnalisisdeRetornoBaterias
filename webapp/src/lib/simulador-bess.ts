// =============================================================================
// SIMULADOR BESS — TypeScript port of simulador_bess.py
// Horarios GDMTH integrados para todas las regiones
// =============================================================================

export interface HorarioPunta {
  punta: [number, number][];
  duracion_horas: number;
}

export interface TemporadaHorarios {
  VERANO: HorarioPunta;
  INVIERNO: HorarioPunta;
}

/** Horarios de punta GDMTH por región y temporada */
export const HORARIOS_PUNTA_GDMTH: Record<string, TemporadaHorarios> = {
  CENTRAL: {
    VERANO:   { punta: [[20, 22]], duracion_horas: 2 },
    INVIERNO: { punta: [[18, 22]], duracion_horas: 4 },
  },
  NORTE: {
    VERANO:   { punta: [[20, 22]], duracion_horas: 2 },
    INVIERNO: { punta: [[18, 22]], duracion_horas: 4 },
  },
  'BAJA CALIFORNIA SUR': {
    VERANO:   { punta: [[12, 22]], duracion_horas: 10 },
    INVIERNO: { punta: [],         duracion_horas: 0 },
  },
};

export type Temporada = 'VERANO' | 'INVIERNO';

export interface SimulacionDiaria {
  temporada: Temporada;
  horas_punta: [number, number][];
  duracion_horas: number;
  potencia_media_kw: number;
  energia_por_ciclo_kwh: number;
  energia_total_mes_kwh: number;
  dias_descarga: number;
}

export interface ReduccionDemanda {
  demanda_original: number;
  potencia_bess: number;
  demanda_nueva: number;
  reduccion_kw: number;
  reduccion_porcentaje: number;
  simulacion: SimulacionDiaria;
}

export interface CargaBase {
  potencia_carga_kw: number;
  horas_carga: number;
  energia_carga_ciclo_kwh: number;
  energia_carga_mes_kwh: number;
  dias_carga: number;
}

export class SimuladorBESS {
  potenciaKw: number;
  capacidadKwh: number;
  region: string;
  eficiencia: number;
  horasCargaBase: number;
  private horarios: Record<string, TemporadaHorarios>;

  constructor(
    potenciaKw: number,
    capacidadKwh: number,
    region = 'NORTE',
    eficiencia = 0.90,
    horasCargaBase = 6,
  ) {
    this.potenciaKw = potenciaKw;
    this.capacidadKwh = capacidadKwh;
    this.region = region.toUpperCase();
    this.eficiencia = eficiencia;
    this.horasCargaBase = horasCargaBase;
    this.horarios = HORARIOS_PUNTA_GDMTH;

    if (!(this.region in this.horarios)) {
      const disponibles = Object.keys(this.horarios).join(', ');
      throw new Error(
        `Región '${this.region}' no encontrada. Disponibles: ${disponibles}`,
      );
    }
  }

  obtenerHorasPunta(mes: number): {
    horasPunta: [number, number][];
    duracionDescarga: number;
    temporada: Temporada;
  } {
    const temporada: Temporada = mes >= 4 && mes <= 10 ? 'VERANO' : 'INVIERNO';
    const datos = this.horarios[this.region][temporada];
    return {
      horasPunta: datos.punta,
      duracionDescarga: datos.duracion_horas,
      temporada,
    };
  }

  calcularEnergiaDescargable(duracionHoras: number): number {
    const energiaDescargable = this.potenciaKw * duracionHoras;
    return Math.min(energiaDescargable, this.capacidadKwh);
  }

  simularDescargaDiaria(mes: number, diasLaborales = 22): SimulacionDiaria {
    const { horasPunta, duracionDescarga, temporada } =
      this.obtenerHorasPunta(mes);

    if (duracionDescarga === 0) {
      return {
        temporada,
        horas_punta: horasPunta,
        duracion_horas: 0,
        potencia_media_kw: 0,
        energia_por_ciclo_kwh: 0,
        energia_total_mes_kwh: 0,
        dias_descarga: diasLaborales,
      };
    }

    const energiaPorCiclo = this.calcularEnergiaDescargable(duracionDescarga);
    const potenciaMediaDescarga = energiaPorCiclo / duracionDescarga;
    const energiaTotalMes = energiaPorCiclo * diasLaborales;

    return {
      temporada,
      horas_punta: horasPunta,
      duracion_horas: duracionDescarga,
      potencia_media_kw: potenciaMediaDescarga,
      energia_por_ciclo_kwh: energiaPorCiclo,
      energia_total_mes_kwh: energiaTotalMes,
      dias_descarga: diasLaborales,
    };
  }

  reducirDemandaPunta(
    demandaPuntaOriginal: number,
    mes: number,
  ): ReduccionDemanda {
    const simulacion = this.simularDescargaDiaria(mes);
    const potenciaReducida = simulacion.potencia_media_kw;
    const demandaPuntaNueva = Math.max(0, demandaPuntaOriginal - potenciaReducida);
    return {
      demanda_original: demandaPuntaOriginal,
      potencia_bess: potenciaReducida,
      demanda_nueva: demandaPuntaNueva,
      reduccion_kw: demandaPuntaOriginal - demandaPuntaNueva,
      reduccion_porcentaje:
        demandaPuntaOriginal > 0
          ? ((1 - demandaPuntaNueva / demandaPuntaOriginal) * 100)
          : 0,
      simulacion,
    };
  }

  calcularCargaBase(diasLaborales = 22): CargaBase {
    const potenciaCargaKw = this.capacidadKwh / this.horasCargaBase;
    const energiaCargaCiclo = this.capacidadKwh;
    const energiaCargaMes = energiaCargaCiclo * diasLaborales;

    return {
      potencia_carga_kw: potenciaCargaKw,
      horas_carga: this.horasCargaBase,
      energia_carga_ciclo_kwh: energiaCargaCiclo,
      energia_carga_mes_kwh: energiaCargaMes,
      dias_carga: diasLaborales,
    };
  }
}
