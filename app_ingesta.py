# =============================================================================
# APP_INGESTA.PY
# Interfaz Streamlit para ingesta de recibos CFE
# Genera BASE DE DATO DE CONSUMO.csv a partir de PDFs de recibos
# =============================================================================

import streamlit as st
import pandas as pd
import os
import tempfile
from pathlib import Path

from ingestar_recibos import (
    extraer_texto,
    parsear_recibo,
    validar_resultado,
    resultado_a_fila_csv,
    generar_csv,
    MESES_NUMERO,
    _formatear_numero_csv
)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN DE PÁGINA
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Ingesta de Recibos CFE - BESS Quartux",
    page_icon="⚡",
    layout="wide"
)

st.title("⚡ Ingesta de Recibos CFE")
st.markdown("Sube los recibos de luz (PDF) para generar la base de datos de consumo.")
st.markdown("---")


# ─────────────────────────────────────────────────────────────────────────────
# ESTADO DE LA SESIÓN
# ─────────────────────────────────────────────────────────────────────────────
if 'resultados' not in st.session_state:
    st.session_state.resultados = []
if 'df_editado' not in st.session_state:
    st.session_state.df_editado = None
if 'archivos_procesados' not in st.session_state:
    st.session_state.archivos_procesados = set()


# ─────────────────────────────────────────────────────────────────────────────
# SIDEBAR: CONFIGURACIÓN
# ─────────────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Configuración")

    forzar_ocr = st.checkbox(
        "Forzar OCR (Document AI)",
        value=False,
        help="Usar Google Document AI para todos los PDFs, incluso los digitales."
    )

    st.markdown("---")
    st.subheader("📋 Datos del cliente")
    st.markdown("Si los datos no se extraen correctamente del PDF, puedes "
                "especificarlos aquí para usarlos por defecto:")

    estado_default = st.text_input("Estado", placeholder="Ej: COAHUILA")
    municipio_default = st.text_input("Municipio", placeholder="Ej: TORREON")
    anio_default = st.number_input("Año", min_value=2020, max_value=2030, value=2025)

    st.markdown("---")
    st.subheader("📊 Sub-periodos")
    st.markdown("Abril y Octubre pueden tener 2 sub-periodos por cambio de temporada.")

    meses_subperiodo = st.multiselect(
        "Meses con sub-periodos",
        options=["Abril", "Octubre"],
        default=["Abril", "Octubre"],
        help="Selecciona los meses que tienen 2 sub-periodos en los recibos."
    )

    st.markdown("---")
    st.markdown("### ℹ️ Acerca de")
    st.markdown(
        "Este sistema extrae datos de recibos CFE (tarifa GDMTH) "
        "para alimentar el simulador BESS Quartux."
    )


# ─────────────────────────────────────────────────────────────────────────────
# SECCIÓN 1: CARGA DE ARCHIVOS
# ─────────────────────────────────────────────────────────────────────────────
st.header("1️⃣ Subir Recibos PDF")

uploaded_files = st.file_uploader(
    "Selecciona los recibos CFE en formato PDF",
    type=['pdf'],
    accept_multiple_files=True,
    help="Puedes subir hasta 14 archivos (12 meses + sub-periodos de Abril y Octubre)"
)

if uploaded_files:
    st.info(f"📄 {len(uploaded_files)} archivo(s) seleccionado(s)")

    if st.button("🔍 Procesar Recibos", type="primary", width='stretch'):
        st.session_state.resultados = []
        st.session_state.archivos_procesados = set()

        barra = st.progress(0, text="Iniciando procesamiento...")

        for i, archivo in enumerate(uploaded_files):
            nombre = archivo.name
            barra.progress(
                (i) / len(uploaded_files),
                text=f"Procesando: {nombre} ({i+1}/{len(uploaded_files)})"
            )

            # Guardar archivo temporal
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
                tmp.write(archivo.read())
                tmp_path = tmp.name

            try:
                texto, metodo = extraer_texto(tmp_path, forzar_ocr=forzar_ocr)
                lista_resultados = parsear_recibo(texto, nombre_archivo=nombre, pdf_path=tmp_path)

                for resultado in lista_resultados:
                    resultado['metodo_extraccion'] = metodo

                    # Aplicar defaults si no se detectaron
                    if not resultado.get('estado') and estado_default:
                        resultado['estado'] = estado_default.upper()
                    if not resultado.get('municipio') and municipio_default:
                        resultado['municipio'] = municipio_default.upper()
                    if resultado.get('anio', 0) == 0 and anio_default:
                        resultado['anio'] = anio_default

                    resultado['advertencias'] = validar_resultado(resultado)
                    st.session_state.resultados.append(resultado)

                st.session_state.archivos_procesados.add(nombre)

            except Exception as e:
                st.session_state.resultados.append({
                    'archivo_origen': nombre,
                    'error': str(e),
                    'advertencias': [f'Error: {e}'],
                    'estado': estado_default.upper() if estado_default else '',
                    'municipio': municipio_default.upper() if municipio_default else '',
                    'anio': anio_default,
                    'mes': '', 'mes_num': 0, 'dias': 0, 'temporada': '',
                    'consumo_punta': 0, 'consumo_intermedia': 0,
                    'consumo_base': 0, 'total_consumo': 0,
                    'demanda_punta': 0, 'demanda_intermedia': 0,
                    'demanda_base': 0, 'demanda_maxima': 0,
                    'factor_carga': 0, 'factor_potencia': 0
                })
            finally:
                os.unlink(tmp_path)

        barra.progress(1.0, text="✅ Procesamiento completado")
        st.success(f"Se procesaron {len(uploaded_files)} archivos correctamente.")


# ─────────────────────────────────────────────────────────────────────────────
# SECCIÓN 2: REVISIÓN Y EDICIÓN DE DATOS
# ─────────────────────────────────────────────────────────────────────────────
if st.session_state.resultados:
    st.header("2️⃣ Revisión de Datos Extraídos")

    # Mostrar advertencias
    total_advertencias = sum(
        len(r.get('advertencias', []))
        for r in st.session_state.resultados
    )

    if total_advertencias > 0:
        with st.expander(f"⚠️ {total_advertencias} advertencia(s) encontrada(s)", expanded=True):
            for r in st.session_state.resultados:
                advs = r.get('advertencias', [])
                if advs:
                    st.markdown(f"**{r.get('archivo_origen', '?')}** ({r.get('mes', '?')}):")
                    for adv in advs:
                        st.markdown(f"  - 🟡 {adv}")
    else:
        st.success("✅ Todos los datos se extrajeron correctamente, sin advertencias.")

    # Crear DataFrame editable
    filas_tabla = []
    for r in st.session_state.resultados:
        filas_tabla.append({
            'Archivo': r.get('archivo_origen', ''),
            'Estado': r.get('estado', ''),
            'Municipio': r.get('municipio', ''),
            'Año': r.get('anio', 0),
            'Mes': r.get('mes', ''),
            'Días': r.get('dias', 0),
            'Temporada': r.get('temporada', ''),
            'Consumo Punta (kWh)': r.get('consumo_punta', 0),
            'Consumo Intermedia (kWh)': r.get('consumo_intermedia', 0),
            'Consumo Base (kWh)': r.get('consumo_base', 0),
            'Total Consumo (kWh)': r.get('total_consumo', 0),
            'Demanda Punta (kW)': r.get('demanda_punta', 0),
            'Demanda Intermedia (kW)': r.get('demanda_intermedia', 0),
            'Demanda Base (kW)': r.get('demanda_base', 0),
            'Demanda Máxima (kW)': r.get('demanda_maxima', 0),
            'Factor Carga (%)': r.get('factor_carga', 0),
            'Factor Potencia (%)': r.get('factor_potencia', 0),
            'Método': r.get('metodo_extraccion', ''),
        })

    df_display = pd.DataFrame(filas_tabla)

    st.markdown("**Edita los datos si es necesario** (haz clic en una celda para modificar):")

    # Tabla editable
    df_editado = st.data_editor(
        df_display,
        width='stretch',
        num_rows="dynamic",
        column_config={
            'Archivo': st.column_config.TextColumn('Archivo', disabled=True, width="small"),
            'Estado': st.column_config.TextColumn('Estado', width="small"),
            'Municipio': st.column_config.TextColumn('Municipio', width="small"),
            'Año': st.column_config.NumberColumn('Año', min_value=2020, max_value=2030, width="small"),
            'Mes': st.column_config.SelectboxColumn(
                'Mes', width="small",
                options=['Enero', 'Febrero', 'Marzo',
                         'Abril', 'Abril sub-periodo 1', 'Abril sub-periodo 2',
                         'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre',
                         'Octubre', 'Octubre Sub-periodo 1', 'Octubre Sub-periodo 2',
                         'Noviembre', 'Diciembre']
            ),
            'Días': st.column_config.NumberColumn('Días', min_value=1, max_value=31, width="small"),
            'Temporada': st.column_config.SelectboxColumn(
                'Temporada', options=['VERANO', 'INVIERNO'], width="small"
            ),
            'Consumo Punta (kWh)': st.column_config.NumberColumn(
                'C. Punta', format="%.0f", min_value=0, width="small"
            ),
            'Consumo Intermedia (kWh)': st.column_config.NumberColumn(
                'C. Inter', format="%.0f", min_value=0, width="small"
            ),
            'Consumo Base (kWh)': st.column_config.NumberColumn(
                'C. Base', format="%.0f", min_value=0, width="small"
            ),
            'Total Consumo (kWh)': st.column_config.NumberColumn(
                'Total kWh', format="%.0f", min_value=0, width="small"
            ),
            'Demanda Punta (kW)': st.column_config.NumberColumn(
                'D. Punta', format="%.0f", min_value=0, width="small"
            ),
            'Demanda Intermedia (kW)': st.column_config.NumberColumn(
                'D. Inter', format="%.0f", min_value=0, width="small"
            ),
            'Demanda Base (kW)': st.column_config.NumberColumn(
                'D. Base', format="%.0f", min_value=0, width="small"
            ),
            'Demanda Máxima (kW)': st.column_config.NumberColumn(
                'D. Máx', format="%.0f", min_value=0, width="small"
            ),
            'Factor Carga (%)': st.column_config.NumberColumn(
                'FC %', format="%.2f", width="small"
            ),
            'Factor Potencia (%)': st.column_config.NumberColumn(
                'FP %', format="%.2f", width="small"
            ),
            'Método': st.column_config.TextColumn('Método', disabled=True, width="small"),
        },
        key="editor_datos"
    )

    st.session_state.df_editado = df_editado


# ─────────────────────────────────────────────────────────────────────────────
# SECCIÓN 3: EXPORTAR CSV
# ─────────────────────────────────────────────────────────────────────────────
if st.session_state.df_editado is not None and len(st.session_state.df_editado) > 0:
    st.header("3️⃣ Exportar Base de Datos")

    df_final = st.session_state.df_editado

    # Mostrar resumen
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Periodos", len(df_final))
    with col2:
        total_kwh = df_final['Total Consumo (kWh)'].sum()
        st.metric("Consumo Total", f"{total_kwh:,.0f} kWh")
    with col3:
        max_demanda = df_final['Demanda Máxima (kW)'].max()
        st.metric("Demanda Máxima", f"{max_demanda:,.0f} kW")
    with col4:
        fc_promedio = df_final['Factor Carga (%)'].mean()
        st.metric("FC Promedio", f"{fc_promedio:.1f}%")

    st.markdown("---")

    col_btn1, col_btn2 = st.columns(2)

    with col_btn1:
        if st.button("💾 Guardar CSV", type="primary", width='stretch'):
            try:
                # Convertir DataFrame editado a formato de resultados
                resultados_finales = []
                for _, row in df_final.iterrows():
                    mes_nombre = str(row['Mes']).strip()
                    # Extraer mes base para obtener el número
                    mes_base = mes_nombre.upper()
                    for sufijo in [' SUB-PERIODO 1', ' SUB-PERIODO 2']:
                        mes_base = mes_base.replace(sufijo, '')
                    mes_base = mes_base.strip()
                    mes_num = MESES_NUMERO.get(mes_base.title(), 0)

                    resultados_finales.append({
                        'estado': str(row['Estado']).strip(),
                        'municipio': str(row['Municipio']).strip(),
                        'anio': int(row['Año']),
                        'mes': mes_nombre,
                        'mes_num': mes_num,
                        'dias': int(row['Días']),
                        'temporada': str(row['Temporada']).strip(),
                        'consumo_punta': float(row['Consumo Punta (kWh)']),
                        'consumo_intermedia': float(row['Consumo Intermedia (kWh)']),
                        'consumo_base': float(row['Consumo Base (kWh)']),
                        'total_consumo': float(row['Total Consumo (kWh)']),
                        'demanda_punta': float(row['Demanda Punta (kW)']),
                        'demanda_intermedia': float(row['Demanda Intermedia (kW)']),
                        'demanda_base': float(row['Demanda Base (kW)']),
                        'demanda_maxima': float(row['Demanda Máxima (kW)']),
                        'factor_carga': float(row['Factor Carga (%)']),
                        'factor_potencia': float(row['Factor Potencia (%)']),
                    })

                ruta_csv = Path('BASE DE DATOS DE CONSUMOS') / 'BASE DE DATO DE CONSUMO.csv'
                generar_csv(resultados_finales, ruta_salida=ruta_csv)
                st.success(f"✅ CSV guardado en: `{ruta_csv}`")
                st.balloons()

            except Exception as e:
                st.error(f"❌ Error al guardar: {e}")

    with col_btn2:
        # Botón para descargar CSV
        if len(df_final) > 0:
            # Generar CSV en memoria para descarga
            resultados_descarga = []
            for _, row in df_final.iterrows():
                resultados_descarga.append({
                    'estado': str(row['Estado']).strip(),
                    'municipio': str(row['Municipio']).strip(),
                    'anio': int(row['Año']),
                    'mes': str(row['Mes']).strip(),
                    'mes_num': 0,
                    'dias': int(row['Días']),
                    'temporada': str(row['Temporada']).strip(),
                    'consumo_punta': float(row['Consumo Punta (kWh)']),
                    'consumo_intermedia': float(row['Consumo Intermedia (kWh)']),
                    'consumo_base': float(row['Consumo Base (kWh)']),
                    'total_consumo': float(row['Total Consumo (kWh)']),
                    'demanda_punta': float(row['Demanda Punta (kW)']),
                    'demanda_intermedia': float(row['Demanda Intermedia (kW)']),
                    'demanda_base': float(row['Demanda Base (kW)']),
                    'demanda_maxima': float(row['Demanda Máxima (kW)']),
                    'factor_carga': float(row['Factor Carga (%)']),
                    'factor_potencia': float(row['Factor Potencia (%)']),
                })

            filas_csv = [resultado_a_fila_csv(r) for r in resultados_descarga]
            df_descarga = pd.DataFrame(filas_csv)
            csv_bytes = df_descarga.to_csv(index=False, encoding='latin-1')

            st.download_button(
                label="⬇️ Descargar CSV",
                data=csv_bytes,
                file_name="BASE DE DATO DE CONSUMO.csv",
                mime="text/csv",
                width='stretch'
            )

    # ─────────────────────────────────────────────────────────────────────
    # SECCIÓN 4: EJECUTAR PIPELINE
    # ─────────────────────────────────────────────────────────────────────
    st.markdown("---")
    st.header("4️⃣ Ejecutar Análisis Completo")

    st.markdown(
        "Después de guardar el CSV, puedes ejecutar el pipeline completo:"
    )
    st.markdown(
        "1. `calcular_capacidad.py` → Genera `CARGO_CAPACIDAD_CALCULADO.csv`\n"
        "2. `modelo_financiero.py` → Genera reporte financiero y análisis BESS"
    )

    if st.button("🚀 Ejecutar calcular_capacidad.py", width='stretch'):
        import subprocess
        with st.spinner("Ejecutando calcular_capacidad.py..."):
            try:
                result = subprocess.run(
                    ['.venv/Scripts/python.exe', 'calcular_capacidad.py'],
                    capture_output=True, text=True, timeout=60
                )
                if result.returncode == 0:
                    st.success("✅ calcular_capacidad.py ejecutado correctamente")
                    if result.stdout:
                        with st.expander("Salida del script"):
                            st.code(result.stdout)
                else:
                    st.error(f"❌ Error en calcular_capacidad.py")
                    st.code(result.stderr)
            except Exception as e:
                st.error(f"❌ Error: {e}")

    st.markdown("---")
    st.caption("Simulador BESS Quartux | Ingesta de Recibos CFE v1.0")
