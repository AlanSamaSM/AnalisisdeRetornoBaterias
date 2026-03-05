import Link from 'next/link';

export const metadata = {
  title: 'Aviso de Privacidad — DM Solar BESS',
};

export default function AvisoDePrivacidadPage() {
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
          Aviso de Privacidad Integral
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          Última actualización: 5 de marzo de 2026
        </p>

        <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-700">
          {/* 1. Identidad del Responsable */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              1. Identidad y Domicilio del Responsable
            </h2>
            <p>
              DM Solar BESS (en adelante, &quot;el Responsable&quot;), con domicilio
              en [DOMICILIO FISCAL COMPLETO], es la persona física/moral
              responsable del tratamiento de sus datos personales de conformidad
              con la Ley Federal de Protección de Datos Personales en Posesión
              de los Particulares (LFPDPPP) vigente a partir de 2025, su
              Reglamento y los Lineamientos emitidos por la Secretaría de
              Anticorrupción y Buen Gobierno (SABG).
            </p>
          </section>

          {/* 2. Datos Personales Recabados */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              2. Datos Personales que Recabamos
            </h2>
            <p>Para las finalidades descritas en este Aviso, recabamos las siguientes categorías de datos personales:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong>Datos de identificación y contacto:</strong> nombre
                completo, dirección de correo electrónico, nombre de empresa
                (opcional).
              </li>
              <li>
                <strong>Datos de autenticación:</strong> contraseña (almacenada
                exclusivamente en formato cifrado con hash bcrypt de 12
                rondas; nunca en texto plano).
              </li>
              <li>
                <strong>Datos patrimoniales y de consumo energético extraídos
                del recibo CFE:</strong> periodo de facturación, consumo
                eléctrico por periodo horario (Base, Intermedio, Punta) en
                kWh, demanda máxima en kW, factor de carga, factor de
                potencia, cargos por capacidad, distribución y energía,
                importe total, nombre del archivo PDF.
              </li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-blue-800 font-medium text-xs">
                <strong>Nota importante sobre el procesamiento de archivos PDF:</strong>{' '}
                El archivo PDF del recibo de la CFE que usted carga en la
                plataforma <strong>NO se almacena</strong> en ninguna base de
                datos, sistema de archivos ni servicio de almacenamiento en la
                nube. El archivo se procesa exclusivamente en la memoria volátil
                (RAM) de una función serverless efímera, se extraen los datos
                numéricos y tarifarios, y el archivo se descarta automáticamente
                al finalizar la ejecución de la solicitud. Los datos
                estructurados extraídos (cifras de consumo, demanda y cargos)
                sí se almacenan en nuestra base de datos para que usted pueda
                consultar sus resultados posteriormente.
              </p>
            </div>
          </section>

          {/* 3. Finalidades del Tratamiento */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              3. Finalidades del Tratamiento
            </h2>
            <p>
              Sus datos personales son tratados para las siguientes{' '}
              <strong>finalidades primarias</strong>, necesarias para la
              prestación del servicio:
            </p>
            <ol className="list-decimal pl-6 space-y-1 mt-2">
              <li>
                Creación y gestión de su cuenta de usuario en la plataforma.
              </li>
              <li>
                Autenticación y control de acceso seguro a sus proyectos.
              </li>
              <li>
                Extracción automática de datos de consumo y facturación
                eléctrica a partir de los recibos de CFE que usted carga
                voluntariamente.
              </li>
              <li>
                Modelado y simulación financiera para evaluar la viabilidad
                técnico-económica de Sistemas de Almacenamiento de Energía en
                Baterías (BESS) en tarifa GDMTH.
              </li>
              <li>
                Generación de reportes PDF y Excel con los resultados del
                análisis financiero para su descarga y uso personal o
                corporativo.
              </li>
            </ol>
            <p className="mt-3">
              La plataforma <strong>NO</strong> utiliza sus datos para:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                Entrenar modelos de inteligencia artificial o aprendizaje
                automático.
              </li>
              <li>
                Venta, cesión o comercialización de información a terceros.
              </li>
              <li>
                Elaboración de perfiles de consumo energético para campañas de
                mercadeo dirigido.
              </li>
              <li>
                Acceso, raspado o interacción automatizada con los sistemas
                informáticos de la CFE.
              </li>
            </ul>
          </section>

          {/* 4. Fundamento Legal */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              4. Fundamento Legal
            </h2>
            <p>
              El tratamiento de sus datos se realiza con apego a los
              principios de licitud, consentimiento, información, calidad,
              finalidad, lealtad, proporcionalidad y responsabilidad
              establecidos en la LFPDPPP (2025), el artículo 16 de la
              Constitución Política de los Estados Unidos Mexicanos y las
              disposiciones emitidas por la Secretaría de Anticorrupción y
              Buen Gobierno (SABG), autoridad competente en materia de
              protección de datos personales en posesión de particulares desde
              el 21 de marzo de 2025.
            </p>
          </section>

          {/* 5. Consentimiento */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              5. Mecanismos de Consentimiento
            </h2>
            <p>
              El consentimiento para el tratamiento de sus datos personales se
              otorga de forma libre, específica e informada mediante:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                La aceptación expresa de este Aviso de Privacidad y de los
                Términos de Servicio al momento de crear su cuenta (casilla de
                verificación obligatoria).
              </li>
              <li>
                La confirmación expresa antes de cada carga de archivos PDF de
                recibos CFE, donde usted declara ser el titular legítimo del
                recibo o contar con la representación legal para disponer de
                dicha información.
              </li>
            </ul>
          </section>

          {/* 6. Transferencias */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              6. Transferencias de Datos
            </h2>
            <p>
              Sus datos personales <strong>NO son transferidos</strong> a
              terceros nacionales o internacionales. La plataforma opera sobre
              infraestructura de cómputo en la nube proporcionada por Vercel
              Inc. (con servidores localizados en la región más cercana
              configurada) y bases de datos gestionadas por Neon (PostgreSQL
              serverless), quienes actúan exclusivamente como encargados del
              tratamiento y están sujetos a sus respectivas políticas de
              seguridad y cumplimiento.
            </p>
          </section>

          {/* 7. Derechos ARCO */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              7. Derechos ARCO (Acceso, Rectificación, Cancelación y
              Oposición)
            </h2>
            <p>
              Usted tiene derecho a acceder, rectificar, cancelar u oponerse
              al tratamiento de sus datos personales. Para ejercer cualquiera
              de estos derechos, puede:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                Utilizar la funcionalidad de &quot;Eliminar cuenta y datos&quot;
                disponible en su panel de control para ejercer su derecho de
                Cancelación de forma inmediata y automatizada.
              </li>
              <li>
                Enviar una solicitud a{' '}
                <strong>[EMAIL_CONTACTO_ARCO@EMPRESA.COM]</strong>{' '}
                especificando el derecho que desea ejercer, su nombre
                completo, correo electrónico registrado y una descripción
                clara de lo solicitado.
              </li>
            </ul>
            <p className="mt-2">
              Responderemos a su solicitud en un plazo máximo de 20 días
              hábiles, conforme lo establece la LFPDPPP.
            </p>
            <p className="mt-2">
              Si considera que su derecho a la protección de datos personales
              ha sido vulnerado, puede presentar una queja ante la{' '}
              <strong>
                Secretaría de Anticorrupción y Buen Gobierno (SABG)
              </strong>
              , autoridad garante en la materia.
            </p>
          </section>

          {/* 8. Medidas de Seguridad */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              8. Medidas de Seguridad
            </h2>
            <p>
              Implementamos medidas de seguridad administrativas, técnicas y
              físicas para proteger sus datos personales:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong>Cifrado de contraseñas:</strong> bcrypt con 12 rondas
                de sal.
              </li>
              <li>
                <strong>Procesamiento efímero:</strong> los archivos PDF se
                procesan en funciones serverless que se destruyen
                automáticamente al finalizar la solicitud, sin persistir el
                archivo original (Privacy by Design).
              </li>
              <li>
                <strong>Comunicación cifrada:</strong> todas las
                comunicaciones se realizan mediante HTTPS/TLS.
              </li>
              <li>
                <strong>Autenticación JWT:</strong> sesiones basadas en tokens
                firmados criptográficamente.
              </li>
              <li>
                <strong>Headers de seguridad:</strong> HSTS, X-Frame-Options
                DENY, CSP, X-Content-Type-Options nosniff.
              </li>
              <li>
                <strong>Limitación de tasa:</strong> protección contra abuso y
                ataques de denegación de servicio en endpoints críticos.
              </li>
              <li>
                <strong>Validación de archivos:</strong> verificación de tipo
                MIME, extensión y bytes mágicos (%PDF) antes del
                procesamiento.
              </li>
              <li>
                <strong>Eliminación en cascada:</strong> la eliminación de su
                cuenta suprime automáticamente todos sus proyectos, recibos y
                datos asociados.
              </li>
            </ul>
          </section>

          {/* 9. Periodo de Conservación */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              9. Periodo de Conservación de Datos
            </h2>
            <p>
              Los datos estructurados extraídos de sus recibos se conservan
              mientras usted mantenga activa su cuenta de usuario. Puede
              eliminar proyectos individuales o su cuenta completa en
              cualquier momento. La eliminación de la cuenta implica la
              supresión irreversible de todos los datos personales y de
              proyecto asociados en nuestra base de datos.
            </p>
          </section>

          {/* 10. Cookies */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              10. Uso de Cookies
            </h2>
            <p>
              La plataforma utiliza cookies estrictamente necesarias para la
              gestión de su sesión de autenticación
              (&quot;next-auth.session-token&quot;). Estas cookies son
              indispensables para el funcionamiento del servicio y no se
              utilizan con fines publicitarios, de rastreo ni analíticos. No
              utilizamos cookies de terceros.
            </p>
          </section>

          {/* 11. Cambios al Aviso */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              11. Modificaciones al Aviso de Privacidad
            </h2>
            <p>
              El Responsable se reserva el derecho de modificar este Aviso de
              Privacidad. Cualquier cambio será publicado en esta misma
              dirección URL. Le recomendamos revisar periódicamente este
              documento.
            </p>
          </section>

          {/* 12. Contacto */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mt-8 mb-3">
              12. Datos de Contacto
            </h2>
            <p>
              Para cualquier duda, comentario o solicitud relacionada con este
              Aviso de Privacidad o el ejercicio de sus Derechos ARCO, puede
              comunicarse a:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong>Correo electrónico:</strong>{' '}
                [EMAIL_CONTACTO@EMPRESA.COM]
              </li>
              <li>
                <strong>Domicilio:</strong> [DOMICILIO FISCAL COMPLETO]
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
