# =============================================================================
# SCRIPT ORQUESTADOR - MODELO FINANCIERO BESS
# Ejecuta secuencialmente: calcular_capacidad → simulador_bess → modelo_financiero
# Primero horario PUNTA, luego horario INVIERNO
# Consolida resultados de simulación en un único CSV
# =============================================================================

import os
import sys
import time
import pandas as pd
from datetime import datetime
from pathlib import Path

# Importar configuración
from config import config_punta, config_invierno, RESULTADOS_DIR

# Importar módulos refactorizados
import calcular_capacidad_main
import simulador_bess_main
import modelo_financiero_main


class OrquestadorBESS:
    def __init__(self, resultados_dir='resultados'):
        self.resultados_dir = resultados_dir
        self.log_file = os.path.join(resultados_dir, 'execution.log')
        self.inicio_ejecucion = datetime.now()
        
        # Acumuladores para consolidación de resultados
        self.simulaciones_consolidadas = []
        self.comparativos_consolidados = []
        
        # Crear directorios si no existen
        self._crear_directorios()
        
    def _crear_directorios(self):
        """Crea la estructura de directorios de salida."""
        for subdir in ['calcular_capacidad', 'simulador_bess', 'modelo_financiero']:
            dirpath = os.path.join(self.resultados_dir, subdir)
            Path(dirpath).mkdir(parents=True, exist_ok=True)
    
    def log(self, mensaje, imprime=True):
        """Registra mensaje en log y consola."""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] {mensaje}"
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry + '\n')
        
        if imprime:
            print(log_entry)
    
    def validar_datos(self):
        """Valida que existan los archivos CSV necesarios."""
        self.log("\n" + "=" * 100)
        self.log("INICIANDO VALIDACIÓN DE DATOS")
        self.log("=" * 100)
        
        archivos_requeridos = [
            config_punta['consumos_csv'],
            config_punta['tarifas_csv']
        ]
        
        archivos_faltantes = []
        for archivo in archivos_requeridos:
            if not os.path.exists(archivo):
                archivos_faltantes.append(archivo)
                self.log(f"[ERROR] Archivo no encontrado: {archivo}")
        
        if archivos_faltantes:
            self.log(f"\n[CRÍTICO] Faltan {len(archivos_faltantes)} archivo(s) requerido(s).")
            self.log("Ejecución abortada.")
            raise FileNotFoundError(f"Archivos faltantes: {archivos_faltantes}")
        
        self.log("[OK] Todos los archivos de datos encontrados.")
        return True
    
    def ejecutar_punta(self):
        """Ejecuta los 3 módulos para horario PUNTA."""
        self.log("\n" + "=" * 100)
        self.log("EJECUTANDO HORARIO: PUNTA")
        self.log("=" * 100)
        
        try:
            # Paso 1: calcular_capacidad
            self.log("\n[1/3] Iniciando calcular_capacidad (PUNTA)...")
            inicio = time.time()
            resultado_cc = calcular_capacidad_main.main(config_punta)
            duracion = time.time() - inicio
            self.log(f"[✓] calcular_capacidad completado en {duracion:.2f}s")
            
            # Paso 2: simulador_bess
            self.log("\n[2/3] Iniciando simulador_bess (PUNTA)...")
            inicio = time.time()
            resultado_sb = simulador_bess_main.main(config_punta, resultado_cc)
            duracion = time.time() - inicio
            self.log(f"[✓] simulador_bess completado en {duracion:.2f}s")
            
            # Acumular simulación para consolidación posterior
            self.simulaciones_consolidadas.append(resultado_sb['simulacion_df'])
            
            # Paso 3: modelo_financiero
            self.log("\n[3/3] Iniciando modelo_financiero (PUNTA)...")
            inicio = time.time()
            resultado_mf = modelo_financiero_main.main(config_punta, resultado_sb)
            duracion = time.time() - inicio
            self.log(f"[✓] modelo_financiero completado en {duracion:.2f}s")
            
            # Acumular comparativo para consolidación posterior
            self.comparativos_consolidados.append(resultado_mf['comparativo_df'])
            
            self.log("\n[✓] HORARIO PUNTA: COMPLETADO EXITOSAMENTE")
            return True
            
        except Exception as e:
            self.log(f"\n[ERROR] Fallo en PUNTA: {str(e)}")
            return False
    
    def ejecutar_invierno(self):
        """Ejecuta los 3 módulos para horario INVIERNO."""
        self.log("\n" + "=" * 100)
        self.log("EJECUTANDO HORARIO: INVIERNO")
        self.log("=" * 100)
        
        try:
            # Paso 1: calcular_capacidad
            self.log("\n[1/3] Iniciando calcular_capacidad (INVIERNO)...")
            inicio = time.time()
            resultado_cc = calcular_capacidad_main.main(config_invierno)
            duracion = time.time() - inicio
            self.log(f"[✓] calcular_capacidad completado en {duracion:.2f}s")
            
            # Paso 2: simulador_bess
            self.log("\n[2/3] Iniciando simulador_bess (INVIERNO)...")
            inicio = time.time()
            resultado_sb = simulador_bess_main.main(config_invierno, resultado_cc)
            duracion = time.time() - inicio
            self.log(f"[✓] simulador_bess completado en {duracion:.2f}s")
            
            # Acumular simulación para consolidación posterior
            self.simulaciones_consolidadas.append(resultado_sb['simulacion_df'])
            
            # Paso 3: modelo_financiero
            self.log("\n[3/3] Iniciando modelo_financiero (INVIERNO)...")
            inicio = time.time()
            resultado_mf = modelo_financiero_main.main(config_invierno, resultado_sb)
            duracion = time.time() - inicio
            self.log(f"[✓] modelo_financiero completado en {duracion:.2f}s")
            
            # Acumular comparativo para consolidación posterior
            self.comparativos_consolidados.append(resultado_mf['comparativo_df'])
            
            self.log("\n[✓] HORARIO INVIERNO: COMPLETADO EXITOSAMENTE")
            return True
            
        except Exception as e:
            self.log(f"\n[ERROR] Fallo en INVIERNO: {str(e)}")
            return False
    
    def consolidar_resultados(self):
        """Combina los resultados de PUNTA e INVIERNO en CSVs únicos."""
        self.log("\n" + "=" * 100)
        self.log("CONSOLIDANDO RESULTADOS")
        self.log("=" * 100)
        
        try:
            # Consolidar simulaciones
            if self.simulaciones_consolidadas:
                simulacion_consolidada = pd.concat(self.simulaciones_consolidadas, ignore_index=True)
                csv_sim_consolidado = os.path.join(self.resultados_dir, 'SIMULACION_BESS_CONSOLIDADA.csv')
                simulacion_consolidada.to_csv(csv_sim_consolidado, index=False, encoding='utf-8')
                self.log(f"[✓] Simulación consolidada guardada: SIMULACION_BESS_CONSOLIDADA.csv")
            
            # Consolidar comparativos
            if self.comparativos_consolidados:
                comparativo_consolidado = pd.concat(self.comparativos_consolidados, ignore_index=True)
                csv_comp_consolidado = os.path.join(self.resultados_dir, 'COMPARATIVO_RECIBOS_CONSOLIDADO.csv')
                comparativo_consolidado.to_csv(csv_comp_consolidado, index=False, encoding='utf-8')
                self.log(f"[✓] Comparativo consolidado guardado: COMPARATIVO_RECIBOS_CONSOLIDADO.csv")
                
        except Exception as e:
            self.log(f"[WARNING] Error al consolidar resultados: {str(e)}")
    
    def resumen_ejecucion(self, punta_ok, invierno_ok):
        """Genera resumen final de ejecución."""
        duracion_total = (datetime.now() - self.inicio_ejecucion).total_seconds()
        
        self.log("\n" + "=" * 100)
        self.log("RESUMEN DE EJECUCIÓN")
        self.log("=" * 100)
        self.log(f"Horario PUNTA:   {'✓ EXITOSO' if punta_ok else '✗ FALLÓ'}")
        self.log(f"Horario INVIERNO: {'✓ EXITOSO' if invierno_ok else '✗ FALLÓ'}")
        self.log(f"Duración total:  {duracion_total:.2f} segundos")
        self.log(f"Directorio de resultados: {os.path.abspath(self.resultados_dir)}")
        self.log("=" * 100 + "\n")
    
    def ejecutar(self):
        """Ejecuta la orquestación completa."""
        try:
            # Limpieza de log anterior (opcional: comentar para mantener histórico)
            if os.path.exists(self.log_file):
                os.remove(self.log_file)
            
            self.log("INICIANDO ORQUESTADOR BESS", imprime=True)
            self.log(f"Configuración PUNTA: power={config_punta['power_kw']}kW, capacity={config_punta['capacity_kwh']}kWh")
            self.log(f"Configuración INVIERNO: power={config_invierno['power_kw']}kW, capacity={config_invierno['capacity_kwh']}kWh")
            
            # Validar datos
            self.validar_datos()
            
            # Ejecutar PUNTA
            punta_ok = self.ejecutar_punta()
            
            # Ejecutar INVIERNO
            invierno_ok = self.ejecutar_invierno()
            
            # Consolidar resultados de ambos horarios
            if punta_ok and invierno_ok:
                self.consolidar_resultados()
            
            # Resumen
            self.resumen_ejecucion(punta_ok, invierno_ok)
            
            if punta_ok and invierno_ok:
                self.log("✓ ORQUESTACIÓN COMPLETADA EXITOSAMENTE", imprime=True)
                return 0
            else:
                self.log("✗ ORQUESTACIÓN COMPLETADA CON ERRORES", imprime=True)
                return 1
                
        except Exception as e:
            self.log(f"EXCEPCIÓN CRÍTICA: {str(e)}")
            return 1


if __name__ == '__main__':
    orquestador = OrquestadorBESS(RESULTADOS_DIR)
    exit_code = orquestador.ejecutar()
    sys.exit(exit_code)
