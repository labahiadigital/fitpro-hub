"""
Generador de la Declaración Responsable del Sistema Informático de Facturación
conforme al artículo 13 del RD 1007/2023 y artículo 15 de la Orden HAC/1177/2024.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.colors import HexColor, black, white
from datetime import datetime
import os

# ─── DATOS DEL PRODUCTOR (rellenar con datos reales) ───
PRODUCTOR = {
    "razon_social": "Toni Tortonda",
    "nif": "03150909R",
    "direccion": "[DIRECCIÓN COMPLETA]",
    "codigo_postal": "[CÓDIGO POSTAL]",
    "localidad": "[LOCALIDAD]",
    "provincia": "[PROVINCIA]",
    "pais": "España",
    "email": "[EMAIL DE CONTACTO]",
    "telefono": "[TELÉFONO]",
    "web": "[WEB SI PROCEDE]",
}

# ─── DATOS DEL SISTEMA INFORMÁTICO ───
SISTEMA = {
    "nombre": "Trackfiz",
    "id_codigo": "EF",
    "version": "1.0",
    "numero_instalacion": "00001",
    "tipo_uso_solo_verifactu": "N",
    "tipo_uso_multi_ot": "S",
    "indicador_multiples_ot": "S",
}

_MESES_ES = {
    1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
    5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
    9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre",
}
_now = datetime.now()
FECHA_FIRMA = f"{_now.day} de {_MESES_ES[_now.month]} de {_now.year}"
LUGAR_FIRMA = "[LOCALIDAD]"

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "DeclaracionResponsable_Trackfiz_v1.0.pdf")


def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Title"],
        fontSize=16,
        leading=20,
        spaceAfter=6,
        textColor=HexColor("#1a1a2e"),
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        alignment=TA_CENTER,
        textColor=HexColor("#555555"),
        spaceAfter=20,
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=12,
        leading=15,
        spaceBefore=16,
        spaceAfter=8,
        textColor=HexColor("#1a1a2e"),
        borderWidth=0,
        borderPadding=0,
    )

    body_style = ParagraphStyle(
        "BodyJustified",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )

    body_bold = ParagraphStyle(
        "BodyBold",
        parent=body_style,
        fontName="Helvetica-Bold",
    )

    small_style = ParagraphStyle(
        "SmallText",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=HexColor("#777777"),
    )

    table_label_style = ParagraphStyle(
        "TableLabel",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=HexColor("#555555"),
    )

    table_value_style = ParagraphStyle(
        "TableValue",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        fontName="Helvetica-Bold",
    )

    story = []

    # ─── CABECERA ───
    story.append(Paragraph(
        "DECLARACI&Oacute;N RESPONSABLE",
        title_style,
    ))
    story.append(Paragraph(
        "Certificaci&oacute;n del Sistema Inform&aacute;tico de Facturaci&oacute;n<br/>"
        "conforme al art&iacute;culo 13 del Real Decreto 1007/2023, de 5 de diciembre,<br/>"
        "y art&iacute;culo 15 de la Orden HAC/1177/2024, de 17 de octubre",
        subtitle_style,
    ))

    story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#1a1a2e")))
    story.append(Spacer(1, 12))

    # ─── 1. DATOS DEL PRODUCTOR ───
    story.append(Paragraph("1. Datos identificativos del productor del SIF", heading_style))
    story.append(Paragraph(
        "De acuerdo con el art&iacute;culo 15.1.j) de la Orden Ministerial, "
        "se identifican a continuaci&oacute;n los datos del productor del Sistema "
        "Inform&aacute;tico de Facturaci&oacute;n:",
        body_style,
    ))

    producer_data = [
        ["Raz&oacute;n social / Nombre:", PRODUCTOR["razon_social"]],
        ["NIF:", PRODUCTOR["nif"]],
        ["Direcci&oacute;n:", PRODUCTOR["direccion"]],
        ["C&oacute;digo postal:", PRODUCTOR["codigo_postal"]],
        ["Localidad:", PRODUCTOR["localidad"]],
        ["Provincia:", PRODUCTOR["provincia"]],
        ["Pa&iacute;s:", PRODUCTOR["pais"]],
        ["Email:", PRODUCTOR["email"]],
        ["Tel&eacute;fono:", PRODUCTOR["telefono"]],
    ]

    producer_table_data = [
        [Paragraph(row[0], table_label_style), Paragraph(row[1], table_value_style)]
        for row in producer_data
    ]

    t = Table(producer_table_data, colWidths=[5.5 * cm, 10 * cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
        ("BACKGROUND", (0, 0), (0, -1), HexColor("#f8f8f8")),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    # ─── 2. DATOS DEL SISTEMA INFORMÁTICO ───
    story.append(Paragraph("2. Datos identificativos del Sistema Inform&aacute;tico de Facturaci&oacute;n", heading_style))
    story.append(Paragraph(
        "Conforme a los art&iacute;culos 15.1.a), 15.1.b) y 15.1.c) de la Orden Ministerial:",
        body_style,
    ))

    system_data = [
        ["Nombre del sistema (NombreSistemaInformatico):", SISTEMA["nombre"]],
        ["C&oacute;digo identificador (IdSistemaInformatico):", SISTEMA["id_codigo"]],
        ["Versi&oacute;n completa:", SISTEMA["version"]],
        ["N&uacute;mero de instalaci&oacute;n:", SISTEMA["numero_instalacion"]],
    ]

    system_table_data = [
        [Paragraph(row[0], table_label_style), Paragraph(row[1], table_value_style)]
        for row in system_data
    ]

    t2 = Table(system_table_data, colWidths=[8 * cm, 7.5 * cm])
    t2.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
        ("BACKGROUND", (0, 0), (0, -1), HexColor("#f8f8f8")),
    ]))
    story.append(t2)
    story.append(Spacer(1, 8))

    # ─── 3. DESCRIPCIÓN DE COMPONENTES ───
    story.append(Paragraph("3. Componentes del sistema y funcionalidades", heading_style))
    story.append(Paragraph(
        "De acuerdo con el art&iacute;culo 15.1.d) de la Orden Ministerial, "
        "se describen los componentes de software y funcionalidades principales del SIF:",
        body_style,
    ))

    story.append(Paragraph("<b>Componentes de software:</b>", body_style))
    components = [
        "<b>Backend:</b> Aplicaci&oacute;n servidor desarrollada en Python (FastAPI) con base de datos PostgreSQL. "
        "Implementa la l&oacute;gica de generaci&oacute;n de registros de facturaci&oacute;n, "
        "c&aacute;lculo de hash encadenado SHA-256, generaci&oacute;n de UUID, "
        "comunicaci&oacute;n SOAP con la AEAT mediante certificados digitales SSL/TLS, "
        "y almacenamiento seguro con cifrado AES-256-GCM.",

        "<b>Frontend:</b> Aplicaci&oacute;n web desarrollada en React (TypeScript) con interfaz "
        "de usuario para la gesti&oacute;n de facturaci&oacute;n, visualizaci&oacute;n de "
        "c&oacute;digos QR tributarios y consulta del estado de registros VERI*FACTU.",

        "<b>Generaci&oacute;n de PDF:</b> M&oacute;dulo de generaci&oacute;n de facturas en formato PDF "
        "incluyendo c&oacute;digo QR tributario conforme a las especificaciones de la AEAT.",
    ]
    for comp in components:
        story.append(Paragraph(f"&bull; {comp}", body_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>Funcionalidades principales:</b>", body_style))
    funcionalidades = [
        "Generaci&oacute;n de registros de alta de facturaci&oacute;n (RegistroAlta) conforme "
        "al formato XML establecido en el Anexo I de la Orden Ministerial.",
        "C&aacute;lculo del hash encadenado SHA-256 entre registros de facturaci&oacute;n consecutivos, "
        "garantizando la trazabilidad e inalterabilidad de la cadena.",
        "Generaci&oacute;n de c&oacute;digo QR tributario verificable conforme a las especificaciones t&eacute;cnicas de la AEAT.",
        "Generaci&oacute;n de identificador &uacute;nico (UUID v4) para cada registro de facturaci&oacute;n.",
        "Remisi&oacute;n autom&aacute;tica e inmediata de los registros de facturaci&oacute;n "
        "a la AEAT mediante servicio web SOAP con autenticaci&oacute;n por certificado digital.",
        "Gesti&oacute;n de facturas rectificativas mediante registros espec&iacute;ficos.",
        "Conservaci&oacute;n de los registros de facturaci&oacute;n con garant&iacute;a de "
        "integridad, accesibilidad, legibilidad, trazabilidad e inalterabilidad.",
    ]
    for func in funcionalidades:
        story.append(Paragraph(f"&bull; {func}", body_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<b>Componentes de hardware:</b> El sistema no incluye componentes de hardware espec&iacute;ficos. "
        "Se ejecuta sobre hardware est&aacute;ndar de servidor con sistema operativo Linux o Windows.",
        body_style,
    ))

    # ─── 4. TIPOLOGÍA DE USO ───
    story.append(Paragraph("4. Tipolog&iacute;a de uso del SIF", heading_style))

    tipo_data = [
        ["TipoUsoPosibleSoloVerifactu (art. 15.1.e):", SISTEMA["tipo_uso_solo_verifactu"],
         "El sistema permite funcionar tanto en modalidad VERI*FACTU "
         "(con remisi&oacute;n autom&aacute;tica) como sin ella."],
        ["TipoUsoPosibleMultiOT (art. 15.1.f):", SISTEMA["tipo_uso_multi_ot"],
         "El sistema permite su uso por m&uacute;ltiples obligados tributarios "
         "(modelo multi-tenant con aislamiento de datos por workspace)."],
        ["IndicadorMultiplesOT (art. 15.1.g):", SISTEMA["indicador_multiples_ot"],
         "El sistema soporta m&uacute;ltiples obligados tributarios simult&aacute;neamente."],
    ]

    for campo, valor, desc in tipo_data:
        story.append(Paragraph(f"<b>{campo}</b> {valor}", body_style))
        story.append(Paragraph(desc, body_style))

    # ─── 5. CERTIFICACIÓN ───
    story.append(Paragraph("5. Certificaci&oacute;n mediante Declaraci&oacute;n Responsable", heading_style))

    story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#cccccc")))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        f"D./D&ntilde;a. <b>{PRODUCTOR['razon_social']}</b>, con NIF <b>{PRODUCTOR['nif']}</b>, "
        f"en calidad de productor del Sistema Inform&aacute;tico de Facturaci&oacute;n "
        f"denominado <b>{SISTEMA['nombre']}</b> (c&oacute;digo identificador: <b>{SISTEMA['id_codigo']}</b>, "
        f"versi&oacute;n: <b>{SISTEMA['version']}</b>),",
        body_style,
    ))

    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>DECLARA RESPONSABLEMENTE:</b>", body_bold))
    story.append(Spacer(1, 6))

    declaraciones = [
        "Que el sistema inform&aacute;tico de facturaci&oacute;n arriba identificado cumple "
        "con lo dispuesto en el <b>art&iacute;culo 29.2.j) de la Ley 58/2003, de 17 de diciembre, "
        "General Tributaria</b>, en la redacci&oacute;n dada por la Ley 11/2021, de 9 de julio.",

        "Que el citado sistema cumple &iacute;ntegramente con los requisitos establecidos en el "
        "<b>Real Decreto 1007/2023, de 5 de diciembre</b>, por el que se aprueba el Reglamento "
        "que establece los requisitos que deben adoptar los sistemas y programas inform&aacute;ticos "
        "o electr&oacute;nicos que soporten los procesos de facturaci&oacute;n de empresarios y profesionales "
        "(RRSIF).",

        "Que el sistema cumple con las especificaciones t&eacute;cnicas, funcionales y de contenido "
        "desarrolladas por la <b>Orden HAC/1177/2024, de 17 de octubre</b>, del Ministerio de Hacienda.",

        "Que el sistema garantiza la <b>integridad, conservaci&oacute;n, accesibilidad, legibilidad, "
        "trazabilidad e inalterabilidad</b> de los registros de facturaci&oacute;n, sin interpolaciones, "
        "omisiones o alteraciones de las que no quede la debida anotaci&oacute;n en el propio sistema.",

        "Que el sistema implementa el <b>encadenamiento hash SHA-256</b> entre registros de facturaci&oacute;n "
        "consecutivos, conforme a las especificaciones del Anexo I de la Orden Ministerial, "
        "garantizando la cadena de trazabilidad e inalterabilidad.",

        "Que el sistema genera el <b>c&oacute;digo QR tributario</b> y el <b>identificador &uacute;nico</b> "
        "en la representaci&oacute;n gr&aacute;fica de cada factura, conforme a las especificaciones de la AEAT.",

        "Que el sistema dispone de la capacidad de <b>remitir de forma autom&aacute;tica, consecutiva, "
        "instant&aacute;nea y fehaciente</b> todos los registros de facturaci&oacute;n generados a la "
        "Agencia Estatal de Administraci&oacute;n Tributaria (AEAT) mediante servicio web SOAP, "
        "utilizando certificados digitales para la autenticaci&oacute;n.",
    ]

    for i, decl in enumerate(declaraciones, 1):
        story.append(Paragraph(f"<b>{i}.</b> {decl}", body_style))
        story.append(Spacer(1, 3))

    # ─── 6. FIRMA ───
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#cccccc")))
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        f"En {LUGAR_FIRMA}, a {FECHA_FIRMA}.",
        body_style,
    ))
    story.append(Spacer(1, 30))
    story.append(Paragraph(
        f"Firmado: <b>{PRODUCTOR['razon_social']}</b>",
        body_style,
    ))
    story.append(Paragraph(
        f"NIF: {PRODUCTOR['nif']}",
        body_style,
    ))
    story.append(Paragraph(
        f"En calidad de productor del SIF {SISTEMA['nombre']} v{SISTEMA['version']}",
        body_style,
    ))

    # ─── PIE DE PÁGINA ───
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=0.5, color=HexColor("#cccccc")))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Esta declaraci&oacute;n responsable se emite conforme al art&iacute;culo 13 del Real Decreto 1007/2023 "
        "y al art&iacute;culo 15 de la Orden HAC/1177/2024. Debe constar por escrito y de modo visible "
        "en el propio sistema inform&aacute;tico en cada una de sus versiones, as&iacute; como estar "
        "a disposici&oacute;n del cliente y del comercializador en el momento de la adquisici&oacute;n del producto.",
        small_style,
    ))

    doc.build(story)
    print(f"PDF generado: {OUTPUT_PATH}")


if __name__ == "__main__":
    build_pdf()
