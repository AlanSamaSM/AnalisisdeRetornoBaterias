# =============================================================================
# INGESTAR_RECIBOS.PY
# Módulo de extracción y parseo de recibos CFE (GDMTH)
# Soporta PDFs digitales (PyMuPDF) y escaneados (Google Document AI)
# =============================================================================

import re
import os
import fitz  # PyMuPDF
import pandas as pd
from pathlib import Path

# Intentar importar Google Document AI (opcional)
try:
    from google.cloud import documentai_v1 as documentai
    DOCUMENTAI_DISPONIBLE = True
except ImportError:
    DOCUMENTAI_DISPONIBLE = False

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTES
# ─────────────────────────────────────────────────────────────────────────────
MESES_MAP = {
    'ENE': 'Enero', 'FEB': 'Febrero', 'MAR': 'Marzo', 'ABR': 'Abril',
    'MAY': 'Mayo', 'JUN': 'Junio', 'JUL': 'Julio', 'AGO': 'Agosto',
    'SEP': 'Septiembre', 'OCT': 'Octubre', 'NOV': 'Noviembre', 'DIC': 'Diciembre',
    'ENERO': 'Enero', 'FEBRERO': 'Febrero', 'MARZO': 'Marzo', 'ABRIL': 'Abril',
    'MAYO': 'Mayo', 'JUNIO': 'Junio', 'JULIO': 'Julio', 'AGOSTO': 'Agosto',
    'SEPTIEMBRE': 'Septiembre', 'OCTUBRE': 'Octubre', 'NOVIEMBRE': 'Noviembre',
    'DICIEMBRE': 'Diciembre'
}

MESES_NUMERO = {
    'Enero': 1, 'Febrero': 2, 'Marzo': 3, 'Abril': 4,
    'Mayo': 5, 'Junio': 6, 'Julio': 7, 'Agosto': 8,
    'Septiembre': 9, 'Octubre': 10, 'Noviembre': 11, 'Diciembre': 12
}

# Estado → abreviatura de estado en dirección CFE
ESTADOS_CFE = {
    'AGS': 'AGUASCALIENTES', 'BC': 'BAJA CALIFORNIA', 'BCS': 'BAJA CALIFORNIA SUR',
    'CAMP': 'CAMPECHE', 'CHIS': 'CHIAPAS', 'CHIH': 'CHIHUAHUA',
    'CDMX': 'CIUDAD DE MEXICO', 'COAH': 'COAHUILA', 'COL': 'COLIMA',
    'DGO': 'DURANGO', 'GTO': 'GUANAJUATO', 'GRO': 'GUERRERO',
    'HGO': 'HIDALGO', 'JAL': 'JALISCO', 'MEX': 'ESTADO DE MEXICO',
    'MICH': 'MICHOACAN', 'MOR': 'MORELOS', 'NAY': 'NAYARIT',
    'NL': 'NUEVO LEON', 'OAX': 'OAXACA', 'PUE': 'PUEBLA',
    'QRO': 'QUERETARO', 'QROO': 'QUINTANA ROO', 'SLP': 'SAN LUIS POTOSI',
    'SIN': 'SINALOA', 'SON': 'SONORA', 'TAB': 'TABASCO',
    'TAMPS': 'TAMAULIPAS', 'TLAX': 'TLAXCALA', 'VER': 'VERACRUZ',
    'YUC': 'YUCATAN', 'ZAC': 'ZACATECAS',
    # Nombres completos (por si aparecen así)
    'AGUASCALIENTES': 'AGUASCALIENTES', 'BAJA CALIFORNIA': 'BAJA CALIFORNIA',
    'BAJA CALIFORNIA SUR': 'BAJA CALIFORNIA SUR', 'CAMPECHE': 'CAMPECHE',
    'CHIAPAS': 'CHIAPAS', 'CHIHUAHUA': 'CHIHUAHUA',
    'CIUDAD DE MEXICO': 'CIUDAD DE MEXICO', 'COAHUILA': 'COAHUILA',
    'COLIMA': 'COLIMA', 'DURANGO': 'DURANGO', 'GUANAJUATO': 'GUANAJUATO',
    'GUERRERO': 'GUERRERO', 'HIDALGO': 'HIDALGO', 'JALISCO': 'JALISCO',
    'ESTADO DE MEXICO': 'ESTADO DE MEXICO', 'MICHOACAN': 'MICHOACAN',
    'MORELOS': 'MORELOS', 'NAYARIT': 'NAYARIT', 'NUEVO LEON': 'NUEVO LEON',
    'OAXACA': 'OAXACA', 'PUEBLA': 'PUEBLA', 'QUERETARO': 'QUERETARO',
    'QUINTANA ROO': 'QUINTANA ROO', 'SAN LUIS POTOSI': 'SAN LUIS POTOSI',
    'SINALOA': 'SINALOA', 'SONORA': 'SONORA', 'TABASCO': 'TABASCO',
    'TAMAULIPAS': 'TAMAULIPAS', 'TLAXCALA': 'TLAXCALA', 'VERACRUZ': 'VERACRUZ',
    'YUCATAN': 'YUCATAN', 'ZACATECAS': 'ZACATECAS'
}

# Ciudades conocidas por estado (se puede ampliar)
CIUDADES_ESTADO = {
    'TORREON': 'COAHUILA', 'SALTILLO': 'COAHUILA', 'MONCLOVA': 'COAHUILA',
    'MONTERREY': 'NUEVO LEON', 'SAN PEDRO': 'NUEVO LEON',
    'GUADALAJARA': 'JALISCO', 'ZAPOPAN': 'JALISCO',
    'PUEBLA': 'PUEBLA', 'QUERETARO': 'QUERETARO',
    'SAN JUAN DEL RIO': 'QUERETARO', 'SN JUAN DEL RIO': 'QUERETARO',
    'LEON': 'GUANAJUATO', 'CELAYA': 'GUANAJUATO',
    'CHIHUAHUA': 'CHIHUAHUA', 'JUAREZ': 'CHIHUAHUA', 'CD JUAREZ': 'CHIHUAHUA',
    'HERMOSILLO': 'SONORA', 'TIJUANA': 'BAJA CALIFORNIA',
    'MERIDA': 'YUCATAN', 'CANCUN': 'QUINTANA ROO',
    'AGUASCALIENTES': 'AGUASCALIENTES', 'DURANGO': 'DURANGO',
    'TUXTLA GUTIERREZ': 'CHIAPAS', 'VILLAHERMOSA': 'TABASCO',
    'TAMPICO': 'TAMAULIPAS', 'REYNOSA': 'TAMAULIPAS',
    'MORELIA': 'MICHOACAN', 'TOLUCA': 'ESTADO DE MEXICO',
    'CUERNAVACA': 'MORELOS', 'OAXACA': 'OAXACA',
    'MAZATLAN': 'SINALOA', 'CULIACAN': 'SINALOA',
    'VERACRUZ': 'VERACRUZ', 'XALAPA': 'VERACRUZ',
    'SAN LUIS POTOSI': 'SAN LUIS POTOSI', 'ZACATECAS': 'ZACATECAS',
}


# ─────────────────────────────────────────────────────────────────────────────
# EXTRACCIÓN DE TEXTO
# ─────────────────────────────────────────────────────────────────────────────
def extraer_texto_pymupdf(pdf_path):
    """Extrae texto de un PDF digital usando PyMuPDF."""
    doc = fitz.open(pdf_path)
    texto_completo = ""
    for page in doc:
        texto_completo += page.get_text() + "\n"
    doc.close()
    return texto_completo


def extraer_texto_documentai(pdf_path):
    """Extrae texto de un PDF escaneado usando Google Document AI."""
    if not DOCUMENTAI_DISPONIBLE:
        raise ImportError(
            "google-cloud-documentai no está instalado. "
            "Instale con: pip install google-cloud-documentai"
        )

    project_id = os.environ.get('GCP_PROJECT_ID')
    location = os.environ.get('GCP_LOCATION', 'us')
    processor_id = os.environ.get('GCP_PROCESSOR_ID')

    if not all([project_id, processor_id]):
        raise ValueError(
            "Configure las variables de entorno GCP_PROJECT_ID y GCP_PROCESSOR_ID "
            "en el archivo .env"
        )

    client = documentai.DocumentProcessorServiceClient()
    name = client.processor_path(project_id, location, processor_id)

    with open(pdf_path, 'rb') as f:
        content = f.read()

    raw_document = documentai.RawDocument(content=content, mime_type='application/pdf')
    request = documentai.ProcessRequest(name=name, raw_document=raw_document)
    result = client.process_document(request=request)

    return result.document.text


def extraer_texto(pdf_path, forzar_ocr=False):
    """
    Extrae texto de un PDF. Intenta PyMuPDF primero.
    Si el texto es insuficiente (escaneado), usa Document AI.

    Args:
        pdf_path: Ruta al archivo PDF
        forzar_ocr: Si True, usa Document AI directamente

    Returns:
        tuple: (texto, metodo_usado)
    """
    if forzar_ocr:
        texto = extraer_texto_documentai(pdf_path)
        return texto, 'Document AI (OCR)'

    # Intentar extracción directa
    texto = extraer_texto_pymupdf(pdf_path)

    # Verificar si el texto extraído es suficiente
    # Un recibo CFE típico tiene al menos 200 caracteres de datos útiles
    texto_limpio = re.sub(r'\s+', ' ', texto).strip()
    if len(texto_limpio) < 200:
        # Texto insuficiente, intentar OCR
        try:
            texto = extraer_texto_documentai(pdf_path)
            return texto, 'Document AI (OCR)'
        except Exception as e:
            return texto, f'PyMuPDF (texto insuficiente, OCR falló: {e})'

    return texto, 'PyMuPDF'


# ─────────────────────────────────────────────────────────────────────────────
# PARSEO DE RECIBO CFE
# ─────────────────────────────────────────────────────────────────────────────
def _limpiar_numero(valor_str):
    """Limpia un valor numérico: remueve comas y espacios."""
    if not valor_str:
        return 0.0
    limpio = valor_str.replace(',', '').replace(' ', '').strip()
    try:
        return float(limpio)
    except ValueError:
        return 0.0


def _formatear_numero_csv(valor):
    """Formatea un número al estilo del CSV original: '280,148.00'"""
    return f"{valor:,.2f}"


def _detectar_temporada(mes_num):
    """Determina si el mes es VERANO o INVIERNO para tarifa GDMTH."""
    if 4 <= mes_num <= 10:
        return 'VERANO'
    return 'INVIERNO'


def _extraer_estado_municipio(texto):
    """
    Extrae estado y municipio de la dirección del servicio en el recibo.
    Busca patrones como 'TORREON,COAH.' o 'SN JUAN DEL RIO,QRO.'
    """
    estado = ''
    municipio = ''

    # Patrón 1: Ciudad,ESTADO. (ej: "SN JUAN DEL RIO,QRO.")
    # Buscar líneas con formato ciudad,abreviatura_estado
    match = re.search(
        r'([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\.]+?)\s*,\s*([A-ZÁÉÍÓÚÑ\.]{2,6})\s*\.?\s*$',
        texto, re.MULTILINE
    )
    if match:
        ciudad_raw = match.group(1).strip().rstrip(',').strip()
        estado_abrev = match.group(2).strip().rstrip('.')

        # Buscar estado por abreviatura
        estado_abrev_upper = estado_abrev.upper()
        if estado_abrev_upper in ESTADOS_CFE:
            estado = ESTADOS_CFE[estado_abrev_upper]

        # El municipio es la ciudad
        municipio = ciudad_raw.upper()

        # Normalizar nombres de ciudad conocidos
        for ciudad_conocida, estado_conocido in CIUDADES_ESTADO.items():
            if ciudad_conocida in municipio or municipio in ciudad_conocida:
                municipio = ciudad_conocida
                if not estado:
                    estado = estado_conocido
                break

    return estado, municipio


def _extraer_periodo(texto):
    """
    Extrae el periodo facturado del recibo.
    Busca: 'PERIODO FACTURADO:31 AGO 24-30 SEP 24'
    Retorna: (mes_inicio, año_inicio, mes_fin, año_fin, dias)
    """
    match = re.search(
        r'PERIODO\s+FACTURADO\s*:\s*(\d{1,2})\s+(\w{3})\s+(\d{2,4})\s*[-–]\s*(\d{1,2})\s+(\w{3})\s+(\d{2,4})',
        texto, re.IGNORECASE
    )
    if match:
        dia_inicio = int(match.group(1))
        mes_inicio_abrev = match.group(2).upper()
        anio_inicio = match.group(3)
        dia_fin = int(match.group(4))
        mes_fin_abrev = match.group(5).upper()
        anio_fin = match.group(6)

        # Convertir año de 2 dígitos a 4
        if len(anio_fin) == 2:
            anio_fin = '20' + anio_fin
        if len(anio_inicio) == 2:
            anio_inicio = '20' + anio_inicio

        # Obtener nombre del mes de fin (es el mes del recibo)
        mes_nombre = MESES_MAP.get(mes_fin_abrev, mes_fin_abrev)

        return {
            'dia_inicio': dia_inicio,
            'mes_inicio': mes_inicio_abrev,
            'anio_inicio': int(anio_inicio),
            'dia_fin': dia_fin,
            'mes_fin': mes_fin_abrev,
            'anio_fin': int(anio_fin),
            'mes_nombre': mes_nombre,
            'anio': int(anio_fin)
        }
    return None


def _extraer_dias(texto):
    """Extrae los días del periodo a partir del PERIODO FACTURADO."""
    periodo = _extraer_periodo(texto)
    if not periodo:
        return 30  # default

    # Calcular días entre fechas
    from datetime import date
    try:
        # Mapear abreviatura de mes a número
        meses_num = {
            'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
            'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12
        }
        mes_ini = meses_num.get(periodo['mes_inicio'], 1)
        mes_end = meses_num.get(periodo['mes_fin'], 1)

        fecha_inicio = date(periodo['anio_inicio'], mes_ini, periodo['dia_inicio'])
        fecha_fin = date(periodo['anio_fin'], mes_end, periodo['dia_fin'])
        dias = (fecha_fin - fecha_inicio).days
        return max(dias, 1)
    except Exception:
        return 30


def _extraer_consumos_kwh(texto):
    """
    Extrae consumos por horario (kWh) del recibo.
    Busca patrones como:
        kWh base\n57,820
        kWh intermedia\n113,157
        kWh punta\n10,295
    """
    consumos = {
        'consumo_punta': 0.0,
        'consumo_intermedia': 0.0,
        'consumo_base': 0.0,
        'total_consumo': 0.0
    }

    # Patrón: "kWh base\n57,820" o "kWh base 57,820"
    match_base = re.search(r'kWh\s+base\s*\n?\s*([\d,]+)', texto, re.IGNORECASE)
    if match_base:
        consumos['consumo_base'] = _limpiar_numero(match_base.group(1))

    match_inter = re.search(r'kWh\s+intermedia\s*\n?\s*([\d,]+)', texto, re.IGNORECASE)
    if match_inter:
        consumos['consumo_intermedia'] = _limpiar_numero(match_inter.group(1))

    match_punta = re.search(r'kWh\s+punta\s*\n?\s*([\d,]+)', texto, re.IGNORECASE)
    if match_punta:
        consumos['consumo_punta'] = _limpiar_numero(match_punta.group(1))

    consumos['total_consumo'] = (
        consumos['consumo_punta'] +
        consumos['consumo_intermedia'] +
        consumos['consumo_base']
    )

    return consumos


def _extraer_demandas_kw(texto):
    """
    Extrae demandas por horario (kW) del recibo.
    Busca patrones como:
        kW base\n355
        kW intermedia\n396
        kW punta\n325
        KWMax\n396
    """
    demandas = {
        'demanda_punta': 0.0,
        'demanda_intermedia': 0.0,
        'demanda_base': 0.0,
        'demanda_maxima': 0.0
    }

    match_base = re.search(r'kW\s+base\s*\n?\s*([\d,]+)', texto, re.IGNORECASE)
    if match_base:
        demandas['demanda_base'] = _limpiar_numero(match_base.group(1))

    match_inter = re.search(r'kW\s+intermedia\s*\n?\s*([\d,]+)', texto, re.IGNORECASE)
    if match_inter:
        demandas['demanda_intermedia'] = _limpiar_numero(match_inter.group(1))

    match_punta = re.search(r'kW\s+punta\s*\n?\s*([\d,]+)', texto, re.IGNORECASE)
    if match_punta:
        demandas['demanda_punta'] = _limpiar_numero(match_punta.group(1))

    match_max = re.search(r'KWMax\s*\n?\s*([\d,]+)', texto, re.IGNORECASE)
    if match_max:
        demandas['demanda_maxima'] = _limpiar_numero(match_max.group(1))

    # Si no se encontró KWMax, usar la mayor de las demandas
    if demandas['demanda_maxima'] == 0:
        demandas['demanda_maxima'] = max(
            demandas['demanda_punta'],
            demandas['demanda_intermedia'],
            demandas['demanda_base']
        )

    return demandas


def _extraer_factor_carga(texto):
    """Extrae el factor de carga del recibo."""
    # Se calcula a partir del historial de consumo del último periodo
    # pero también intentar extraerlo directamente del texto
    # El factor de carga no aparece explícitamente en la primera página.
    # Lo calculamos: FC = (Total consumo) / (24 * dias * Demanda_maxima) * 100
    return None  # Se calcula después


def _extraer_factor_potencia(texto):
    """Extrae el factor de potencia del recibo."""
    match = re.search(
        r'Factor\s+de\s+potencia\s*%?\s*\n?\s*([\d.]+)',
        texto, re.IGNORECASE
    )
    if match:
        return float(match.group(1))
    return None


def _extraer_tarifa(texto):
    """Extrae el tipo de tarifa del recibo."""
    match = re.search(r'TARIFA\s*:\s*(\w+)', texto, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return None


def _extraer_multiplicador(texto):
    """Extrae el multiplicador del medidor."""
    match = re.search(r'MULTIPLICADOR\s*:\s*(\d+)', texto, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return 1


def _extraer_tabla_historico(pdf_path):
    """
    Extrae la tabla CONSUMO HISTÓRICO del PDF usando bloques de texto
    de PyMuPDF.  Cada fila aparece como un bloque con formato:
        MES\nYY\nDemanda\nConsumo\nFP\nFC\nPrecio

    Returns:
        dict  {(MES_ABREV, año_4dig): [{'demanda', 'consumo',
                'factor_potencia', 'factor_carga', 'precio_medio'}, ...]}
        Lista porque ABR y OCT tienen 2 filas (sub-períodos).
    """
    MESES_VALIDOS = {
        'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
        'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
    }
    historico = {}
    try:
        doc = fitz.open(pdf_path)
        for page in doc:
            blocks = page.get_text('blocks')
            for b in blocks:
                text = b[4].strip()
                parts = text.split('\n')
                # Una fila válida tiene 7 partes: MES, YY, dem, cons, fp, fc, precio
                if len(parts) != 7:
                    continue
                mes_abrev = parts[0].strip().upper()
                if mes_abrev not in MESES_VALIDOS:
                    continue
                try:
                    anio_2d = parts[1].strip()
                    anio = int('20' + anio_2d) if len(anio_2d) == 2 else int(anio_2d)
                    demanda = _limpiar_numero(parts[2].strip())
                    consumo = _limpiar_numero(parts[3].strip())
                    fp = float(parts[4].strip())
                    fc = float(parts[5].strip())
                    precio = float(parts[6].strip())
                except (ValueError, IndexError):
                    continue

                key = (mes_abrev, anio)
                if key not in historico:
                    historico[key] = []
                historico[key].append({
                    'demanda': demanda,
                    'consumo': consumo,
                    'factor_potencia': fp,
                    'factor_carga': fc,
                    'precio_medio': precio,
                })
        doc.close()
    except Exception:
        pass
    return historico


# Mapa inverso: nombre completo → abreviatura de 3 letras
MESES_ABREV_MAP = {
    'Enero': 'ENE', 'Febrero': 'FEB', 'Marzo': 'MAR', 'Abril': 'ABR',
    'Mayo': 'MAY', 'Junio': 'JUN', 'Julio': 'JUL', 'Agosto': 'AGO',
    'Septiembre': 'SEP', 'Octubre': 'OCT', 'Noviembre': 'NOV', 'Diciembre': 'DIC'
}


def _tiene_subperiodos(texto):
    """Revisa si el texto del recibo menciona sub-períodos."""
    return bool(re.search(r'subper[ií]odo', texto, re.IGNORECASE))


def _extraer_columnas_subperiodo(pdf_path):
    """
    Extrae texto de las columnas izquierda y derecha de la página que
    contiene sub-períodos, usando regiones de recorte (clip) de PyMuPDF.
    Esto evita la mezcla de texto que ocurre con get_text() en layouts
    de dos columnas.

    Returns:
        list[str]: [texto_col_izq, texto_col_der] si se encuentran,
                   lista vacía si no se detectan sub-períodos.
    """
    doc = fitz.open(pdf_path)
    columnas = []

    for page in doc:
        texto_pagina = page.get_text()
        if re.search(r'subper[ií]odo', texto_pagina, re.IGNORECASE):
            rect = page.rect
            mid_x = (rect.x0 + rect.x1) / 2

            # Columna izquierda → Primer subperíodo
            left_clip = fitz.Rect(rect.x0, rect.y0, mid_x, rect.y1)
            left_text = page.get_text(clip=left_clip)

            # Columna derecha → Segundo subperíodo
            right_clip = fitz.Rect(mid_x, rect.y0, rect.x1, rect.y1)
            right_text = page.get_text(clip=right_clip)

            columnas = [left_text, right_text]
            break

    doc.close()
    return columnas


def _parsear_bloque_subperiodo(bloque, num_sub, datos_comunes):
    """
    Parsea el texto de una columna de sub-período extraída con clip.

    Args:
        bloque: Texto de la columna del sub-período
        num_sub: 1 o 2
        datos_comunes: dict con estado, municipio, anio, tarifa, etc.

    Returns:
        dict con los campos del sub-período
    """
    resultado = dict(datos_comunes)

    # ── Extraer rango de fechas ──────────────────────────────────────────
    # Formato: "31 MAR 25-05 ABR 25" (puede estar en misma línea que
    # "subperíodo" o en la siguiente)
    match_fechas = re.search(
        r'(\d{1,2})\s+(\w{3})\s+(\d{2,4})\s*[-–]\s*(\d{1,2})\s+(\w{3})\s+(\d{2,4})',
        bloque, re.IGNORECASE
    )
    if match_fechas:
        dia_inicio = int(match_fechas.group(1))
        mes_inicio_abrev = match_fechas.group(2).upper()
        anio_inicio = match_fechas.group(3)
        dia_fin = int(match_fechas.group(4))
        mes_fin_abrev = match_fechas.group(5).upper()
        anio_fin = match_fechas.group(6)

        if len(anio_fin) == 2:
            anio_fin = '20' + anio_fin
        if len(anio_inicio) == 2:
            anio_inicio = '20' + anio_inicio

        resultado['anio'] = int(anio_fin)

        from datetime import date
        try:
            meses_num_map = {
                'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
                'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12
            }
            m_ini = meses_num_map.get(mes_inicio_abrev, 1)
            m_fin = meses_num_map.get(mes_fin_abrev, 1)
            fecha_inicio = date(int(anio_inicio), m_ini, dia_inicio)
            fecha_fin = date(int(anio_fin), m_fin, dia_fin)
            resultado['dias'] = max((fecha_fin - fecha_inicio).days, 1)
        except Exception:
            resultado['dias'] = 15  # fallback
    else:
        resultado['dias'] = 15

    # ── Nombre del mes con sufijo de sub-período ─────────────────────────
    periodo_padre = datos_comunes.get('mes', '')
    resultado['mes'] = f"{periodo_padre} sub-periodo {num_sub}"
    resultado['mes_num'] = MESES_NUMERO.get(periodo_padre, 0)

    # ── Temporada (el sub-período 1 es antes del cambio) ─────────────────
    if resultado['mes_num'] == 4:        # Abril
        resultado['temporada'] = 'INVIERNO' if num_sub == 1 else 'VERANO'
    elif resultado['mes_num'] == 10:     # Octubre
        resultado['temporada'] = 'VERANO' if num_sub == 1 else 'INVIERNO'
    else:
        resultado['temporada'] = _detectar_temporada(resultado['mes_num'])

    # ── Consumos ──────────────────────────────────────────────────────────
    # Formatos posibles:  "Consumo Base\n18,343"  o  "Consumo Base  18,343"
    consumo_base = re.search(r'Consumo\s+Base\s+([\d,]+)', bloque, re.IGNORECASE)
    consumo_inter = re.search(r'Consumo\s+Intermedi[oa]\s+([\d,]+)', bloque, re.IGNORECASE)
    consumo_punta = re.search(r'Consumo\s+Punta\s+([\d,]+)', bloque, re.IGNORECASE)

    resultado['consumo_base'] = _limpiar_numero(consumo_base.group(1)) if consumo_base else 0.0
    resultado['consumo_intermedia'] = _limpiar_numero(consumo_inter.group(1)) if consumo_inter else 0.0
    resultado['consumo_punta'] = _limpiar_numero(consumo_punta.group(1)) if consumo_punta else 0.0
    resultado['total_consumo'] = (
        resultado['consumo_punta'] + resultado['consumo_intermedia'] + resultado['consumo_base']
    )

    # ── Demandas ──────────────────────────────────────────────────────────
    demanda_base = re.search(r'Demanda\s+Base\s+([\d,]+)', bloque, re.IGNORECASE)
    demanda_inter = re.search(r'Demanda\s+Intermedia\s+([\d,]+)', bloque, re.IGNORECASE)
    demanda_punta = re.search(r'Demanda\s+Punta\s+([\d,]+)', bloque, re.IGNORECASE)

    resultado['demanda_base'] = _limpiar_numero(demanda_base.group(1)) if demanda_base else 0.0
    resultado['demanda_intermedia'] = _limpiar_numero(demanda_inter.group(1)) if demanda_inter else 0.0
    resultado['demanda_punta'] = _limpiar_numero(demanda_punta.group(1)) if demanda_punta else 0.0
    resultado['demanda_maxima'] = max(
        resultado['demanda_punta'], resultado['demanda_intermedia'], resultado['demanda_base']
    )

    # ── Factor de potencia ────────────────────────────────────────────────
    fp_match = re.search(r'Factor\s+de\s+potencia\s*%?\s+([\d.]+)', bloque, re.IGNORECASE)
    resultado['factor_potencia'] = float(fp_match.group(1)) if fp_match else datos_comunes.get('factor_potencia', 0.0)

    # ── Factor de carga (calculado con demanda punta) ───────────────────────
    if resultado['demanda_punta'] > 0 and resultado['dias'] > 0:
        resultado['factor_carga'] = round(
            (resultado['total_consumo'] /
             (24 * resultado['dias'] * resultado['demanda_punta'])) * 100,
            2
        )
    else:
        resultado['factor_carga'] = 0.0

    return resultado


def parsear_recibo(texto, nombre_archivo='', pdf_path=None):
    """
    Parsea el texto extraído de un recibo CFE y retorna una lista de
    diccionarios con los campos necesarios para el CSV.
    Si el recibo tiene sub-períodos (Abril/Octubre), retorna 2 dicts.

    Args:
        texto: Texto completo extraído del PDF
        nombre_archivo: Nombre del archivo para referencia
        pdf_path: Ruta al PDF original (necesaria para extracción por
                  columnas en recibos con sub-períodos)

    Returns:
        list[dict] con los campos del recibo (1 o 2 elementos)
    """
    resultado = {
        'archivo_origen': nombre_archivo,
        'tarifa': _extraer_tarifa(texto),
        'multiplicador': _extraer_multiplicador(texto),
    }

    # Verificar que es tarifa GDMTH
    if resultado['tarifa'] and resultado['tarifa'] != 'GDMTH':
        resultado['advertencias'] = [f"Tarifa {resultado['tarifa']} no es GDMTH"]

    # Estado y municipio
    estado, municipio = _extraer_estado_municipio(texto)
    resultado['estado'] = estado
    resultado['municipio'] = municipio

    # Periodo
    periodo_info = _extraer_periodo(texto)
    if periodo_info:
        resultado['anio'] = periodo_info['anio']
        resultado['mes'] = periodo_info['mes_nombre']
        resultado['mes_num'] = MESES_NUMERO.get(periodo_info['mes_nombre'], 0)
    else:
        resultado['anio'] = 0
        resultado['mes'] = ''
        resultado['mes_num'] = 0
        resultado.setdefault('advertencias', []).append('No se detectó el periodo facturado')

    # Días
    resultado['dias'] = _extraer_dias(texto)

    # Temporada
    if resultado['mes_num'] > 0:
        resultado['temporada'] = _detectar_temporada(resultado['mes_num'])
    else:
        resultado['temporada'] = ''

    # Consumos kWh
    consumos = _extraer_consumos_kwh(texto)
    resultado.update(consumos)

    # Demandas kW
    demandas = _extraer_demandas_kw(texto)
    resultado.update(demandas)

    # Factor de potencia
    fp = _extraer_factor_potencia(texto)
    resultado['factor_potencia'] = fp if fp else 0.0

    # Factor de carga (calculado con demanda punta)
    if resultado['demanda_punta'] > 0 and resultado['dias'] > 0:
        resultado['factor_carga'] = round(
            (resultado['total_consumo'] /
             (24 * resultado['dias'] * resultado['demanda_punta'])) * 100,
            2
        )
    else:
        resultado['factor_carga'] = 0.0

    # ── Detectar sub-períodos (Abril / Octubre) ──────────────────────────
    if _tiene_subperiodos(texto):
        datos_comunes = dict(resultado)

        # Intentar extracción por columnas (clip) si tenemos la ruta al PDF
        columnas = []
        if pdf_path:
            try:
                columnas = _extraer_columnas_subperiodo(pdf_path)
            except Exception:
                columnas = []

        if len(columnas) == 2:
            resultados_sub = []
            for idx, col_texto in enumerate(columnas, start=1):
                sub = _parsear_bloque_subperiodo(col_texto, idx, datos_comunes)
                sub['archivo_origen'] = nombre_archivo
                resultados_sub.append(sub)
            return resultados_sub

    return [resultado]


# ─────────────────────────────────────────────────────────────────────────────
# CONVERSIÓN A FORMATO CSV
# ─────────────────────────────────────────────────────────────────────────────
def resultado_a_fila_csv(resultado):
    """
    Convierte un resultado parseado al formato exacto del CSV
    BASE DE DATO DE CONSUMO.csv, incluyendo los quirks de nombres de columna.

    Returns:
        dict con las columnas exactas del CSV
    """
    return {
        'Estado': resultado.get('estado', ''),
        'Municipio ': resultado.get('municipio', ''),  # trailing space
        'Año': resultado.get('anio', ''),
        'Mes': resultado.get('mes', ''),
        'Días': resultado.get('dias', ''),
        'Horario (Inviero/Verano)': resultado.get('temporada', ''),
        'Consumo punta': _formatear_numero_csv(resultado.get('consumo_punta', 0)),
        'Unidades': 'kWh',
        'Consumo intermedio': _formatear_numero_csv(resultado.get('consumo_intermedia', 0)),
        'Unidades.1': 'kWh',
        'Consumo base': _formatear_numero_csv(resultado.get('consumo_base', 0)),
        'Unidades.2': 'kWh',
        'Total de consumo': _formatear_numero_csv(resultado.get('total_consumo', 0)),
        'Unidades.3': 'kWh',
        '  Demanda Punta': resultado.get('demanda_punta', 0),  # 2 leading spaces
        'Unidades.4': 'kW',
        'Demanda Intermedia': resultado.get('demanda_intermedia', 0),
        'Unidades.5': 'kW',
        ' Demanda base': resultado.get('demanda_base', 0),  # 1 leading space
        'Unidades.6': 'kW',
        'Demanda Maxima': resultado.get('demanda_maxima', 0),
        'Unidades.7': 'kW',
        'Factor de carga': resultado.get('factor_carga', 0),
        'Unidades.8': '%',
        'Factor de potencia': resultado.get('factor_potencia', 0),
        'Unidades.9': '%'
    }


def generar_csv(resultados, ruta_salida=None):
    """
    Genera el CSV BASE DE DATO DE CONSUMO.csv a partir de una lista de
    resultados parseados.

    Args:
        resultados: Lista de dicts (resultado de parsear_recibo)
        ruta_salida: Ruta de salida. Si None, usa la ruta por defecto.

    Returns:
        pd.DataFrame con los datos generados
    """
    if ruta_salida is None:
        ruta_salida = Path('BASE DE DATOS DE CONSUMOS') / 'BASE DE DATO DE CONSUMO.csv'

    # Ordenar por año y mes numérico
    resultados_ordenados = sorted(
        resultados,
        key=lambda x: (x.get('anio', 0), x.get('mes_num', 0), x.get('mes', ''))
    )

    # Convertir a filas CSV
    filas = [resultado_a_fila_csv(r) for r in resultados_ordenados]
    df = pd.DataFrame(filas)

    # Las columnas "Unidades" deben llamarse todas igual en el CSV original
    # El CSV original tiene múltiples columnas "Unidades" - pandas las renombra
    # Necesitamos escribir el CSV con headers personalizados
    columnas_csv = [
        'Estado', 'Municipio ', 'Año', 'Mes', 'Días',
        'Horario (Inviero/Verano)',
        'Consumo punta', 'Unidades',
        'Consumo intermedio', 'Unidades',
        'Consumo base', 'Unidades',
        'Total de consumo', 'Unidades',
        '  Demanda Punta', 'Unidades',
        'Demanda Intermedia', 'Unidades',
        ' Demanda base', 'Unidades',
        'Demanda Maxima', 'Unidades',
        'Factor de carga', 'Unidades',
        'Factor de potencia', 'Unidades'
    ]

    # Guardar con encoding latin-1 para mantener compatibilidad
    os.makedirs(os.path.dirname(ruta_salida), exist_ok=True)

    with open(ruta_salida, 'w', encoding='latin-1', newline='') as f:
        # Escribir header manualmente (columnas repetidas "Unidades")
        f.write(','.join(columnas_csv) + '\n')

        # Escribir cada fila
        for _, row in df.iterrows():
            valores = []
            for col in df.columns:
                val = row[col]
                val_str = str(val)
                # Encerrar en comillas si contiene coma
                if ',' in val_str:
                    val_str = f'"{val_str}"'
                valores.append(val_str)
            f.write(','.join(valores) + '\n')

    return df


# ─────────────────────────────────────────────────────────────────────────────
# VALIDACIÓN DE DATOS
# ─────────────────────────────────────────────────────────────────────────────
def validar_resultado(resultado):
    """
    Valida los datos extraídos y retorna una lista de advertencias.

    Returns:
        Lista de strings con advertencias (vacía si todo OK)
    """
    advertencias = resultado.get('advertencias', []).copy()

    # Verificar campos obligatorios
    if not resultado.get('estado'):
        advertencias.append('No se detectó el estado')
    if not resultado.get('municipio'):
        advertencias.append('No se detectó el municipio')
    if not resultado.get('mes'):
        advertencias.append('No se detectó el mes')
    if resultado.get('anio', 0) == 0:
        advertencias.append('No se detectó el año')

    # Verificar consumos
    consumo_punta = resultado.get('consumo_punta', 0)
    consumo_inter = resultado.get('consumo_intermedia', 0)
    consumo_base = resultado.get('consumo_base', 0)
    total = resultado.get('total_consumo', 0)

    if total == 0:
        advertencias.append('Consumo total es 0')
    else:
        suma = consumo_punta + consumo_inter + consumo_base
        if abs(suma - total) > 1:
            advertencias.append(
                f'Suma de consumos ({suma:,.0f}) ≠ Total ({total:,.0f})'
            )

    # Verificar demandas
    d_punta = resultado.get('demanda_punta', 0)
    d_inter = resultado.get('demanda_intermedia', 0)
    d_base = resultado.get('demanda_base', 0)
    d_max = resultado.get('demanda_maxima', 0)

    if d_max == 0:
        advertencias.append('Demanda máxima es 0')
    elif d_max < max(d_punta, d_inter, d_base):
        advertencias.append(
            f'Demanda máxima ({d_max}) < máximo de demandas por horario'
        )

    # Verificar factor de carga
    fc = resultado.get('factor_carga', 0)
    if fc <= 0 or fc > 100:
        advertencias.append(f'Factor de carga fuera de rango: {fc}%')

    # Verificar factor de potencia
    fp = resultado.get('factor_potencia', 0)
    if fp > 0 and (fp < 80 or fp > 100):
        advertencias.append(f'Factor de potencia inusual: {fp}%')

    return advertencias


# ─────────────────────────────────────────────────────────────────────────────
# PROCESAMIENTO POR LOTE
# ─────────────────────────────────────────────────────────────────────────────
def procesar_pdfs(lista_archivos, forzar_ocr=False, callback_progreso=None):
    """
    Procesa una lista de archivos PDF y extrae los datos de cada recibo.

    Args:
        lista_archivos: Lista de rutas a archivos PDF
        forzar_ocr: Si True, usa Document AI para todos
        callback_progreso: Función(i, total, nombre) para reportar progreso

    Returns:
        Lista de dicts con resultados parseados (incluye advertencias)
    """
    resultados = []

    for i, archivo in enumerate(lista_archivos):
        nombre = os.path.basename(archivo)

        if callback_progreso:
            callback_progreso(i, len(lista_archivos), nombre)

        try:
            texto, metodo = extraer_texto(archivo, forzar_ocr=forzar_ocr)
            lista_resultados = parsear_recibo(texto, nombre_archivo=nombre, pdf_path=archivo)
            for resultado in lista_resultados:
                resultado['metodo_extraccion'] = metodo
                resultado['advertencias'] = validar_resultado(resultado)
                resultados.append(resultado)
        except Exception as e:
            resultados.append({
                'archivo_origen': nombre,
                'error': str(e),
                'advertencias': [f'Error procesando archivo: {e}']
            })

    if callback_progreso:
        callback_progreso(len(lista_archivos), len(lista_archivos), 'Completado')

    return resultados


# ─────────────────────────────────────────────────────────────────────────────
# CLI (para pruebas)
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Uso: python ingestar_recibos.py <archivo.pdf> [archivo2.pdf ...]")
        sys.exit(1)

    archivos = sys.argv[1:]

    for archivo in archivos:
        print(f"\n{'='*60}")
        print(f"Procesando: {archivo}")
        print('='*60)

        texto, metodo = extraer_texto(archivo)
        print(f"Método de extracción: {metodo}")

        lista_resultados = parsear_recibo(texto, nombre_archivo=archivo, pdf_path=archivo)

        for resultado in lista_resultados:
            advertencias = validar_resultado(resultado)

            print(f"\n  --- {resultado.get('mes', '?')} ---")
            print(f"  Estado:          {resultado.get('estado', '?')}")
            print(f"  Municipio:       {resultado.get('municipio', '?')}")
            print(f"  Año:             {resultado.get('anio', '?')}")
            print(f"  Mes:             {resultado.get('mes', '?')}")
            print(f"  Días:            {resultado.get('dias', '?')}")
            print(f"  Temporada:       {resultado.get('temporada', '?')}")
            print(f"  Tarifa:          {resultado.get('tarifa', '?')}")
            print(f"  Multiplicador:   {resultado.get('multiplicador', '?')}")
            print(f"\n  Consumo base:    {resultado.get('consumo_base', 0):,.0f} kWh")
            print(f"  Consumo interm:  {resultado.get('consumo_intermedia', 0):,.0f} kWh")
            print(f"  Consumo punta:   {resultado.get('consumo_punta', 0):,.0f} kWh")
            print(f"  Total consumo:   {resultado.get('total_consumo', 0):,.0f} kWh")
            print(f"\n  Demanda base:    {resultado.get('demanda_base', 0):,.0f} kW")
            print(f"  Demanda interm:  {resultado.get('demanda_intermedia', 0):,.0f} kW")
            print(f"  Demanda punta:   {resultado.get('demanda_punta', 0):,.0f} kW")
            print(f"  Demanda máxima:  {resultado.get('demanda_maxima', 0):,.0f} kW")
            print(f"\n  Factor carga:    {resultado.get('factor_carga', 0):.2f}%")
            print(f"  Factor potencia: {resultado.get('factor_potencia', 0):.2f}%")

            if advertencias:
                print(f"\n  ⚠ Advertencias:")
                for adv in advertencias:
                    print(f"    - {adv}")
            else:
                print(f"\n  ✓ Sin advertencias")
