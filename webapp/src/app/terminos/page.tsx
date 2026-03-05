import Link from 'next/link';

export const metadata = {
  title: 'Términos de Servicio — DM Solar BESS',
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="text-sm text-brand-600 hover:text-brand-700 mb-6 inline-block"
        >
          ← Volver al inicio
        </Link>

        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Términos y Condiciones de Servicio
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          Última actualización: 5 de marzo de 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-700">
          {/* 1. Objeto */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              1. Objeto del Servicio
            </h2>
            <p>
              DM Solar BESS (en adelante, &quot;la Plataforma&quot;) es una
              herramienta de análisis financiero y simulación técnica que
              permite a sus usuarios evaluar la viabilidad económica de
              Sistemas de Almacenamiento de Energía en Baterías (BESS) a
              partir de los datos de consumo eléctrico contenidos en los
              recibos emitidos por la Comisión Federal de Electricidad (CFE)
              bajo la tarifa Gran Demanda en Media Tensión Horaria (GDMTH).
            </p>
            <p className="mt-2">
              La Plataforma actúa exclusivamente como una herramienta
              analítica facilitadora operada por el usuario final. La
              Plataforma <strong>NO</strong> accede, extrae, raspa (scraping)
              ni interactúa de forma alguna con los servidores, portales web,
              APIs o sistemas informáticos de la Comisión Federal de
              Electricidad. El procesamiento se realiza exclusivamente sobre
              archivos PDF que el usuario carga de manera voluntaria y manual.
            </p>
          </section>

          {/* 2. Naturaleza de la Relación */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              2. Naturaleza de la Relación Jurídica
            </h2>
            <p>
              La relación entre la Plataforma y el Usuario es de naturaleza
              estrictamente mercantil y de prestación de servicios digitales.
              El sistema analítico actúa de manera exclusiva bajo la orden,
              mandato directo e instrucción del usuario final. La Plataforma
              no actúa como agente, representante, empleado ni intermediario
              de la CFE, la Comisión Reguladora de Energía (CRE), ni de
              ninguna otra entidad gubernamental.
            </p>
          </section>

          {/* 3. Declaraciones del Usuario */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              3. Declaraciones y Obligaciones del Usuario
            </h2>
            <p>
              Al utilizar la Plataforma y cargar archivos PDF de recibos de
              CFE, el usuario declara bajo protesta de decir verdad que:
            </p>
            <ol className="list-decimal pl-6 space-y-2 mt-2">
              <li>
                Es el <strong>titular legítimo</strong> del contrato de
                suministro de energía eléctrica correspondiente al recibo
                cargado, o bien, cuenta con las facultades de representación
                legal necesarias para disponer de dicha información comercial
                y someterla al análisis de la Plataforma.
              </li>
              <li>
                <strong>Autoriza expresamente</strong> a la Plataforma a leer,
                decodificar y extraer los valores numéricos, tarifarios y de
                consumo del documento PDF, limitando dicha autorización única
                y exclusivamente al modelado de la cotización de
                infraestructura de almacenamiento de energía BESS.
              </li>
              <li>
                No cargará recibos o documentos de terceros sin contar con la
                autorización expresa y documentada de dichos terceros.
              </li>
              <li>
                Proporcionará información veraz y actualizada en su registro
                de usuario.
              </li>
              <li>
                Es responsable de mantener la confidencialidad de sus
                credenciales de acceso (correo electrónico y contraseña).
              </li>
            </ol>
          </section>

          {/* 4. Procesamiento de Datos y Privacidad */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              4. Procesamiento de Datos y Privacidad
            </h2>
            <p>
              El tratamiento de datos personales se rige por el{' '}
              <Link
                href="/aviso-de-privacidad"
                className="text-brand-600 hover:text-brand-700 underline"
              >
                Aviso de Privacidad Integral
              </Link>{' '}
              de la Plataforma, el cual forma parte integral de estos
              Términos. Al aceptar los presentes Términos, el usuario declara
              haber leído y comprendido dicho Aviso.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-3">
              <p className="text-amber-800 text-xs">
                <strong>Procesamiento efímero:</strong> Los archivos PDF se
                procesan en funciones serverless cuyo entorno de ejecución se
                destruye automáticamente al concluir la solicitud. El archivo
                original NO se almacena en ningún medio persistente. Los datos
                numéricos estructurados se guardan en base de datos para su
                posterior consulta.
              </p>
            </div>
          </section>

          {/* 5. Deslinde de Responsabilidad */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              5. Deslinde de Responsabilidad
            </h2>

            <h3 className="text-base font-semibold text-slate-700 mt-4 mb-2">
              5.1 Sobre las proyecciones financieras
            </h3>
            <p>
              Los resultados financieros, las proyecciones de ahorro, los
              cálculos de retorno de inversión (ROI) y cualquier otra métrica
              generada por la Plataforma constituyen{' '}
              <strong>estimaciones basadas en modelos matemáticos</strong> que
              utilizan datos históricos de consumo y tarifas vigentes al
              momento del análisis. Estos resultados:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong>NO constituyen</strong> asesoría financiera, fiscal,
                legal ni de inversión certificada.
              </li>
              <li>
                <strong>NO garantizan</strong> un retorno de inversión
                específico ni ahorros determinados.
              </li>
              <li>
                Están sujetos a cambios en las tarifas publicadas por la CFE y
                la CRE, variaciones del tipo de cambio, modificaciones
                regulatorias y condiciones operativas reales del inmueble.
              </li>
              <li>
                No sustituyen un estudio de ingeniería de detalle ni una
                evaluación técnica en sitio.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-slate-700 mt-4 mb-2">
              5.2 Respecto a la relación con CFE
            </h3>
            <p>
              La Plataforma se deslinda expresamente de cualquier disputa
              contractual, litigio, procedimiento administrativo o
              contencioso, preexistente o futuro, entre el usuario y la
              Comisión Federal de Electricidad, sus subsidiarias o filiales
              (CFE Suministrador de Servicios Básicos, CFE Distribución, etc.)
              o cualquier otra empresa del sector eléctrico. Si el usuario
              carga un recibo que es objeto de un procedimiento legal, la
              Plataforma no asume responsabilidad alguna sobre la validez
              jurídica del documento ni sobre los datos extraídos del mismo.
            </p>

            <h3 className="text-base font-semibold text-slate-700 mt-4 mb-2">
              5.3 Sobre la instalación física de sistemas BESS
            </h3>
            <p>
              La Plataforma genera exclusivamente propuestas técnico-económicas
              preliminares. La instalación física de cualquier sistema de
              almacenamiento de energía en baterías requiere:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Validación técnica en sitio por un profesional certificado.</li>
              <li>Ingeniería de detalle y estudios de cortocircuito.</li>
              <li>
                Obtención de permisos y autorizaciones ante las autoridades
                competentes (Secretaría de Energía, CRE, CFE Distribución).
              </li>
              <li>
                Cumplimiento de la Ley del Sector Eléctrico (2025) y sus
                reglamentos en materia de generación distribuida,
                almacenamiento e interconexión.
              </li>
              <li>
                Evaluaciones de impacto social para proyectos que superen los
                umbrales establecidos por la normatividad vigente.
              </li>
            </ul>
          </section>

          {/* 6. Propiedad Intelectual */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              6. Propiedad Intelectual
            </h2>
            <p>
              Los algoritmos de cálculo, modelos financieros, diseño de
              interfaz, código fuente y metodología de análisis incorporados
              en la Plataforma son propiedad exclusiva del Responsable y están
              protegidos por las leyes de propiedad intelectual aplicables en
              México. El usuario no adquiere derecho de propiedad sobre la
              Plataforma ni sobre sus componentes por el mero uso del servicio.
            </p>
            <p className="mt-2">
              Los datos de consumo y facturación contenidos en los recibos de
              CFE pertenecen al usuario en su calidad de titular del contrato
              de suministro. La Plataforma no reclama propiedad alguna sobre
              dichos datos.
            </p>
          </section>

          {/* 7. Protección al Consumidor */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              7. Protección al Consumidor
            </h2>
            <p>
              En cumplimiento con las disposiciones de la Ley Federal de
              Protección al Consumidor y los criterios de la Procuraduría
              Federal del Consumidor (PROFECO), la Plataforma se compromete a:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                No realizar publicidad engañosa sobre los ahorros potenciales
                derivados de la implementación de sistemas BESS.
              </li>
              <li>
                Presentar todas las proyecciones con las advertencias y
                supuestos correspondientes.
              </li>
              <li>
                No condicionar la prestación del servicio a la adquisición de
                productos o servicios adicionales.
              </li>
            </ul>
          </section>

          {/* 8. Limitación de Responsabilidad */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              8. Limitación de Responsabilidad
            </h2>
            <p>
              En la máxima medida permitida por la legislación mexicana
              aplicable, la Plataforma no será responsable por daños directos,
              indirectos, incidentales, especiales, consecuenciales o
              punitivos derivados de:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                Errores en la extracción automática de datos de recibos de CFE
                con formatos no estándar, ilegibles o alterados.
              </li>
              <li>
                Decisiones de inversión tomadas exclusivamente con base en los
                reportes generados sin verificación independiente.
              </li>
              <li>
                Interrupciones del servicio derivadas de mantenimiento,
                actualizaciones o circunstancias de fuerza mayor.
              </li>
              <li>
                Cambios tarifarios, regulatorios o de mercado posteriores a la
                fecha del análisis.
              </li>
            </ul>
          </section>

          {/* 9. Ley Aplicable y Jurisdicción */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              9. Legislación Aplicable y Jurisdicción
            </h2>
            <p>
              Los presentes Términos se rigen por las leyes vigentes de los
              Estados Unidos Mexicanos, incluyendo pero no limitándose a:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                Ley Federal de Protección de Datos Personales en Posesión de
                los Particulares (LFPDPPP, 2025).
              </li>
              <li>Código de Comercio.</li>
              <li>Ley Federal de Protección al Consumidor.</li>
              <li>Ley del Sector Eléctrico (2025).</li>
            </ul>
            <p className="mt-2">
              Para cualquier controversia derivada de la interpretación o
              cumplimiento de estos Términos, las partes se someten a la
              jurisdicción de los tribunales competentes de [CIUDAD, ESTADO],
              México, renunciando a cualquier otro fuero que por razón de sus
              domicilios presentes o futuros pudiera corresponderles.
            </p>
          </section>

          {/* 10. Modificaciones */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              10. Modificaciones
            </h2>
            <p>
              La Plataforma se reserva el derecho de modificar estos Términos
              en cualquier momento. Los cambios serán publicados en esta misma
              dirección URL y, cuando sean sustanciales, se notificará al
              usuario mediante correo electrónico o aviso en la interfaz de la
              Plataforma. El uso continuado del servicio después de la
              publicación de las modificaciones constituirá la aceptación de
              los nuevos Términos.
            </p>
          </section>

          {/* 11. Contacto */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              11. Contacto
            </h2>
            <p>
              Para consultas sobre estos Términos, escriba a:{' '}
              <strong>[EMAIL_CONTACTO@EMPRESA.COM]</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
