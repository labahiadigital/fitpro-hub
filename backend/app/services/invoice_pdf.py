"""
Professional invoice PDF generator using reportlab.
Produces clean, minimalist invoices with VeriFactu QR code support.
"""

import io
from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional


def _d(val: Any) -> Decimal:
    return Decimal(str(val or 0))


def _fmt(val: Any) -> str:
    return f"{_d(val):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


class InvoicePDFGenerator:
    """Generate professional PDF invoices with optional VeriFactu QR."""

    ACCENT = (44, 62, 80)      # dark blue-grey
    PRIMARY = (52, 73, 94)
    LIGHT_BG = (248, 249, 250)
    BORDER = (222, 226, 230)
    SUCCESS = (39, 174, 96)
    MUTED = (134, 142, 150)

    def _get_rl(self):
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm, mm
        from reportlab.lib.colors import Color, HexColor
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            Image, KeepTogether
        )
        from reportlab.graphics.shapes import Drawing, Line
        return locals()

    def generate(
        self,
        invoice: dict,
        items: List[dict],
        settings: Optional[dict] = None,
        qr_data: Optional[str] = None,
    ) -> bytes:
        """
        Generate a PDF invoice and return the bytes.

        invoice: dict with keys matching the Invoice model fields.
        items: list of dicts matching InvoiceItem fields.
        settings: dict with InvoiceSettings fields (issuer info).
        qr_data: URL string for the VeriFactu QR code.
        """
        rl = self._get_rl()
        A4 = rl["A4"]
        cm = rl["cm"]
        mm = rl["mm"]
        Color = rl["Color"]
        SimpleDocTemplate = rl["SimpleDocTemplate"]
        Paragraph = rl["Paragraph"]
        Spacer = rl["Spacer"]
        Table = rl["Table"]
        TableStyle = rl["TableStyle"]
        Image = rl["Image"]
        ParagraphStyle = rl["ParagraphStyle"]
        getSampleStyleSheet = rl["getSampleStyleSheet"]
        TA_CENTER = rl["TA_CENTER"]
        TA_LEFT = rl["TA_LEFT"]
        TA_RIGHT = rl["TA_RIGHT"]

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=2 * cm,
            rightMargin=2 * cm,
            topMargin=1.5 * cm,
            bottomMargin=2 * cm,
        )

        styles = getSampleStyleSheet()
        accent = Color(*[c / 255 for c in self.ACCENT])
        primary = Color(*[c / 255 for c in self.PRIMARY])
        light_bg = Color(*[c / 255 for c in self.LIGHT_BG])
        border_c = Color(*[c / 255 for c in self.BORDER])
        muted = Color(*[c / 255 for c in self.MUTED])
        success_c = Color(*[c / 255 for c in self.SUCCESS])
        white = Color(1, 1, 1)

        s_title = ParagraphStyle("InvTitle", parent=styles["Normal"], fontSize=22, leading=26, textColor=accent, fontName="Helvetica-Bold")
        s_subtitle = ParagraphStyle("InvSub", parent=styles["Normal"], fontSize=9, leading=12, textColor=muted)
        s_heading = ParagraphStyle("InvH", parent=styles["Normal"], fontSize=10, leading=13, textColor=accent, fontName="Helvetica-Bold", spaceAfter=4)
        s_body = ParagraphStyle("InvBody", parent=styles["Normal"], fontSize=9, leading=12, textColor=primary)
        s_body_r = ParagraphStyle("InvBodyR", parent=s_body, alignment=TA_RIGHT)
        s_small = ParagraphStyle("InvSmall", parent=styles["Normal"], fontSize=7.5, leading=10, textColor=muted)
        s_small_c = ParagraphStyle("InvSmallC", parent=s_small, alignment=TA_CENTER)
        s_total_label = ParagraphStyle("TotL", parent=s_body, fontName="Helvetica-Bold", alignment=TA_RIGHT)
        s_total_val = ParagraphStyle("TotV", parent=s_body, fontName="Helvetica-Bold", alignment=TA_RIGHT, fontSize=11)
        s_badge = ParagraphStyle("Badge", parent=styles["Normal"], fontSize=8, leading=10, textColor=white, fontName="Helvetica-Bold", alignment=TA_CENTER)

        elements: list = []

        # ----- HEADER: Invoice number + status -----
        inv_number = invoice.get("invoice_number", "")
        inv_type = invoice.get("invoice_type", "F1")
        type_label = {"F1": "Factura", "F2": "Factura Simplificada", "F3": "Factura Rectificativa", "R1": "Factura Rectificativa"}.get(inv_type, "Factura")

        status = invoice.get("status", "draft")
        status_labels = {"draft": "BORRADOR", "finalized": "EMITIDA", "sent": "ENVIADA", "paid": "PAGADA", "overdue": "VENCIDA", "cancelled": "ANULADA", "rectified": "RECTIFICADA"}
        status_label = status_labels.get(status, status.upper())

        header_data = [
            [Paragraph(f"{type_label}", s_title), Paragraph(f"<b>{status_label}</b>", s_badge)],
            [Paragraph(f"N.º {inv_number}", s_subtitle), ""],
        ]
        status_bg = {"paid": success_c, "overdue": Color(0.93, 0.26, 0.26), "cancelled": muted}.get(status, accent)
        header_table = Table(header_data, colWidths=[doc.width - 3 * cm, 3 * cm])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("BACKGROUND", (1, 0), (1, 0), status_bg),
            ("ROUNDEDCORNERS", [0, 0, 0, 0]),
            ("TEXTCOLOR", (1, 0), (1, 0), white),
            ("TOPPADDING", (1, 0), (1, 0), 4),
            ("BOTTOMPADDING", (1, 0), (1, 0), 4),
            ("LEFTPADDING", (1, 0), (1, 0), 8),
            ("RIGHTPADDING", (1, 0), (1, 0), 8),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.6 * cm))

        # ----- ISSUER & CLIENT INFO -----
        issuer_lines = []
        if settings:
            if settings.get("business_name"):
                issuer_lines.append(f"<b>{settings['business_name']}</b>")
            if settings.get("tax_id"):
                issuer_lines.append(f"NIF/CIF: {settings['tax_id']}")
            addr_parts = [p for p in [settings.get("address"), settings.get("postal_code"), settings.get("city"), settings.get("province")] if p]
            if addr_parts:
                issuer_lines.append(", ".join(addr_parts))
            if settings.get("phone"):
                issuer_lines.append(f"Tel: {settings['phone']}")
            if settings.get("email"):
                issuer_lines.append(settings["email"])

        client_lines = []
        if invoice.get("client_name"):
            client_lines.append(f"<b>{invoice['client_name']}</b>")
        if invoice.get("client_tax_id"):
            client_lines.append(f"NIF/CIF: {invoice['client_tax_id']}")
        addr_parts = [p for p in [invoice.get("client_address"), invoice.get("client_postal_code"), invoice.get("client_city")] if p]
        if addr_parts:
            client_lines.append(", ".join(addr_parts))
        if invoice.get("client_email"):
            client_lines.append(invoice["client_email"])

        parties_data = [
            [Paragraph("EMISOR", s_heading), Paragraph("CLIENTE", s_heading)],
            [Paragraph("<br/>".join(issuer_lines), s_body), Paragraph("<br/>".join(client_lines), s_body)],
        ]
        parties_table = Table(parties_data, colWidths=[doc.width / 2] * 2)
        parties_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ]))
        elements.append(parties_table)
        elements.append(Spacer(1, 0.4 * cm))

        # ----- DATES ROW -----
        issue_date = invoice.get("issue_date", "")
        due_date = invoice.get("due_date", "")
        if isinstance(issue_date, date):
            issue_date = issue_date.strftime("%d/%m/%Y")
        if isinstance(due_date, date):
            due_date = due_date.strftime("%d/%m/%Y")

        dates_data = [[
            Paragraph(f"<b>Fecha emisión:</b> {issue_date}", s_body),
            Paragraph(f"<b>Fecha vencimiento:</b> {due_date or '—'}", s_body),
            Paragraph(f"<b>Método de pago:</b> {invoice.get('payment_method', '—') or '—'}", s_body),
        ]]
        dates_table = Table(dates_data, colWidths=[doc.width / 3] * 3)
        dates_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), light_bg),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(dates_table)
        elements.append(Spacer(1, 0.5 * cm))

        # ----- LINE ITEMS TABLE -----
        col_widths = [doc.width * 0.38, doc.width * 0.08, doc.width * 0.14, doc.width * 0.10, doc.width * 0.14, doc.width * 0.16]
        header_row = [
            Paragraph("<b>Concepto</b>", s_body),
            Paragraph("<b>Ud.</b>", ParagraphStyle("hc", parent=s_body, alignment=TA_CENTER, fontName="Helvetica-Bold")),
            Paragraph("<b>Precio ud.</b>", ParagraphStyle("hr", parent=s_body, alignment=TA_RIGHT, fontName="Helvetica-Bold")),
            Paragraph("<b>IVA</b>", ParagraphStyle("hr2", parent=s_body, alignment=TA_CENTER, fontName="Helvetica-Bold")),
            Paragraph("<b>Dto.</b>", ParagraphStyle("hr3", parent=s_body, alignment=TA_RIGHT, fontName="Helvetica-Bold")),
            Paragraph("<b>Total</b>", ParagraphStyle("hr4", parent=s_body, alignment=TA_RIGHT, fontName="Helvetica-Bold")),
        ]
        table_data = [header_row]

        for item in items:
            qty = _d(item.get("quantity", 1))
            price = _d(item.get("unit_price", 0))
            tax_r = item.get("tax_rate")
            tax_str = f"{_d(tax_r):.0f}%" if tax_r is not None else "—"
            disc_val = _d(item.get("discount_value", 0))
            disc_type = item.get("discount_type", "percentage")
            disc_str = f"{disc_val:.0f}%" if disc_type == "percentage" and disc_val else (f"{_fmt(disc_val)} €" if disc_val else "—")
            total = _d(item.get("total", 0))

            table_data.append([
                Paragraph(item.get("description", ""), s_body),
                Paragraph(f"{qty:.0f}" if qty == int(qty) else f"{qty:.2f}", ParagraphStyle("ic", parent=s_body, alignment=TA_CENTER)),
                Paragraph(f"{_fmt(price)} €", s_body_r),
                Paragraph(tax_str, ParagraphStyle("ic2", parent=s_body, alignment=TA_CENTER)),
                Paragraph(disc_str, s_body_r),
                Paragraph(f"{_fmt(total)} €", s_body_r),
            ])

        items_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        tbl_style = [
            ("BACKGROUND", (0, 0), (-1, 0), accent),
            ("TEXTCOLOR", (0, 0), (-1, 0), white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, border_c),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]
        for i in range(1, len(table_data)):
            if i % 2 == 0:
                tbl_style.append(("BACKGROUND", (0, i), (-1, i), light_bg))
        items_table.setStyle(TableStyle(tbl_style))
        elements.append(items_table)
        elements.append(Spacer(1, 0.4 * cm))

        # ----- TAX BREAKDOWN -----
        tax_groups: Dict[str, Dict[str, Decimal]] = defaultdict(lambda: {"base": Decimal("0"), "tax": Decimal("0")})
        for item in items:
            rate = _d(item.get("tax_rate", 0))
            key = f"{rate:.0f}%"
            tax_groups[key]["base"] += _d(item.get("subtotal", 0))
            tax_groups[key]["tax"] += _d(item.get("tax_amount", 0))

        if tax_groups:
            breakdown_header = [
                Paragraph("<b>Tipo IVA</b>", s_body),
                Paragraph("<b>Base imponible</b>", s_body_r),
                Paragraph("<b>Cuota IVA</b>", s_body_r),
            ]
            breakdown_data = [breakdown_header]
            for rate_key, vals in sorted(tax_groups.items()):
                breakdown_data.append([
                    Paragraph(f"IVA {rate_key}", s_body),
                    Paragraph(f"{_fmt(vals['base'])} €", s_body_r),
                    Paragraph(f"{_fmt(vals['tax'])} €", s_body_r),
                ])
            bw = doc.width * 0.55
            breakdown_table = Table(breakdown_data, colWidths=[bw * 0.34, bw * 0.33, bw * 0.33])
            breakdown_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), light_bg),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, border_c),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]))
            elements.append(Paragraph("Desglose de impuestos", s_heading))
            elements.append(breakdown_table)
            elements.append(Spacer(1, 0.3 * cm))

        # ----- TOTALS -----
        subtotal = _d(invoice.get("subtotal", 0))
        discount_amount = _d(invoice.get("discount_amount", 0))
        tax_amount = _d(invoice.get("tax_amount", 0))
        total = _d(invoice.get("total", 0))

        totals_data = []
        totals_data.append([Paragraph("Subtotal", s_total_label), Paragraph(f"{_fmt(subtotal)} €", s_body_r)])
        if discount_amount:
            totals_data.append([Paragraph("Descuento", s_total_label), Paragraph(f"-{_fmt(discount_amount)} €", s_body_r)])
        totals_data.append([Paragraph("IVA", s_total_label), Paragraph(f"{_fmt(tax_amount)} €", s_body_r)])
        totals_data.append([Paragraph("TOTAL", s_total_label), Paragraph(f"<b>{_fmt(total)} €</b>", s_total_val)])

        tw = doc.width * 0.35
        totals_table = Table(totals_data, colWidths=[tw * 0.5, tw * 0.5], hAlign="RIGHT")
        total_styles = [
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LINEABOVE", (0, -1), (-1, -1), 1, accent),
            ("TOPPADDING", (0, -1), (-1, -1), 8),
        ]
        totals_table.setStyle(TableStyle(total_styles))
        elements.append(totals_table)
        elements.append(Spacer(1, 0.5 * cm))

        # ----- PAYMENT INFO -----
        if settings and settings.get("bank_account"):
            bank_info = []
            if settings.get("bank_name"):
                bank_info.append(f"<b>Banco:</b> {settings['bank_name']}")
            bank_info.append(f"<b>IBAN:</b> {settings['bank_account']}")
            elements.append(Paragraph("Datos bancarios para transferencia", s_heading))
            elements.append(Paragraph("<br/>".join(bank_info), s_body))
            elements.append(Spacer(1, 0.3 * cm))

        # ----- NOTES -----
        if invoice.get("notes"):
            elements.append(Paragraph("Observaciones", s_heading))
            elements.append(Paragraph(invoice["notes"], s_body))
            elements.append(Spacer(1, 0.3 * cm))

        # ----- QR CODE + VERIFACTU FOOTER -----
        if qr_data:
            try:
                import qrcode
                qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=3, border=2)
                qr.add_data(qr_data)
                qr.make(fit=True)
                qr_img = qr.make_image(fill_color="black", back_color="white")
                qr_buf = io.BytesIO()
                qr_img.save(qr_buf)
                qr_buf.seek(0)

                qr_table_data = [[
                    Image(qr_buf, width=2.2 * cm, height=2.2 * cm),
                    Paragraph(
                        "Factura verificable en la Sede electrónica de la AEAT<br/>"
                        "<i>Sistema VeriFactu - Registro de facturación</i>",
                        s_small
                    ),
                ]]
                qr_table = Table(qr_table_data, colWidths=[2.5 * cm, doc.width - 2.5 * cm])
                qr_table.setStyle(TableStyle([
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("BACKGROUND", (0, 0), (-1, -1), light_bg),
                    ("LEFTPADDING", (1, 0), (1, 0), 10),
                ]))
                elements.append(Spacer(1, 0.3 * cm))
                elements.append(qr_table)
            except ImportError:
                elements.append(Paragraph("<i>QR no disponible (instalar qrcode)</i>", s_small_c))

        # ----- CUSTOM FOOTER -----
        if settings and settings.get("footer_text"):
            elements.append(Spacer(1, 0.4 * cm))
            elements.append(Paragraph(settings["footer_text"], s_small_c))

        if settings and settings.get("terms_and_conditions"):
            elements.append(Spacer(1, 0.2 * cm))
            elements.append(Paragraph(settings["terms_and_conditions"], s_small_c))

        doc.build(elements)
        return buf.getvalue()
