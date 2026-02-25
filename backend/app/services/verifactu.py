"""
VeriFactu compliance service.
Implements SHA-256 hash chaining, QR code data generation, and real
SOAP submission to AEAT (preproducción / producción) with client certificate.

Based on: https://github.com/EduardoRuizM/verifactu-api-python
Hash algorithm follows AEAT spec (Orden HAC/1177/2024).
"""

import hashlib
import logging
import os
import re
import ssl
import tempfile
import uuid
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.erp import Invoice, InvoiceSettings

logger = logging.getLogger(__name__)

AEAT_QR_URL_TEST = "https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR"
AEAT_QR_URL_PROD = "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR"

AEAT_SOAP_URL_TEST = "https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP"
AEAT_SOAP_URL_PROD = "https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP"

VERIFACTU_HASH_SEPARATOR = "&"


def _decimal_str(value: Any) -> str:
    return f"{Decimal(str(value or 0)):.2f}"


def _date_str(d: Any) -> str:
    """Format a date as dd-mm-yyyy (VeriFactu spec)."""
    if d is None:
        return ""
    if isinstance(d, str):
        return d
    return d.strftime("%d-%m-%Y")


def _clean_nif(nif: str) -> str:
    """Strip non-alphanumeric chars and uppercase, per AEAT CodNIF spec."""
    return re.sub(r"[^A-Za-z0-9]", "", nif).upper().strip()


def _local_timestamp() -> str:
    """
    Generate FechaHoraHusoGenRegistro in local Madrid timezone.
    AEAT requires the timestamp in the timezone of the issuer (Spain).
    """
    year = datetime.now().year
    last_sunday_march = max(
        datetime(year, 3, day) for day in range(31, 24, -1)
        if datetime(year, 3, day).weekday() == 6
    )
    last_sunday_october = max(
        datetime(year, 10, day) for day in range(31, 24, -1)
        if datetime(year, 10, day).weekday() == 6
    )
    now = datetime.now()
    offset = 2 if last_sunday_march <= now < last_sunday_october else 1
    return now.strftime(f"%Y-%m-%dT%H:%M:%S+{offset:02d}:00")


# =====================================================
# AEAT SOAP Client
# =====================================================

class AEATSoapClient:
    """Sends VeriFactu XML to AEAT via SOAP with client SSL certificate."""

    # AEAT XML namespaces
    NS_TIKR = "https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/RespuestaSuministro.xsd"
    NS_TIK = "https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd"

    def __init__(self, settings: InvoiceSettings, is_test: bool = True):
        self.settings = settings
        self.is_test = is_test
        self.url = AEAT_SOAP_URL_TEST if is_test else AEAT_SOAP_URL_PROD

    def _build_sistema_informatico(self) -> str:
        s = self.settings
        return (
            "<SistemaInformatico>"
            f"<NombreRazon>{s.software_company_name or s.business_name}</NombreRazon>"
            f"<NIF>{_clean_nif(s.software_company_nif or s.tax_id or '')}</NIF>"
            f"<NombreSistemaInformatico>{s.software_name or 'E13Fitness'}</NombreSistemaInformatico>"
            f"<IdSistemaInformatico>{(s.software_id or 'EF')[:2]}</IdSistemaInformatico>"
            f"<Version>{s.software_version or '1.0'}</Version>"
            f"<NumeroInstalacion>{s.software_install_number or '00001'}</NumeroInstalacion>"
            "<TipoUsoPosibleSoloVerifactu>N</TipoUsoPosibleSoloVerifactu>"
            "<TipoUsoPosibleMultiOT>S</TipoUsoPosibleMultiOT>"
            "<IndicadorMultiplesOT>S</IndicadorMultiplesOT>"
            "</SistemaInformatico>"
        )

    def build_registro_alta_xml(
        self,
        invoice: Invoice,
        prev_invoice: Optional[Invoice],
        verifactu_hash: str,
        reg_dt: str,
        is_subsanacion: bool = False,
    ) -> str:
        s = self.settings
        nif = _clean_nif(s.tax_id or "")
        descr = "Prestación de servicios de entrenamiento personal"
        inv_type = invoice.invoice_type or "F1"
        tax_rate_int = int(float(invoice.tax_rate or 21))

        xml = "<sum:RegistroFactura><RegistroAlta>"
        xml += "<IDVersion>1.0</IDVersion>"
        xml += f"<IDFactura><IDEmisorFactura>{nif}</IDEmisorFactura>"
        xml += f"<NumSerieFactura>{invoice.invoice_number}</NumSerieFactura>"
        xml += f"<FechaExpedicionFactura>{_date_str(invoice.issue_date)}</FechaExpedicionFactura></IDFactura>"
        xml += f"<NombreRazonEmisor>{s.business_name}</NombreRazonEmisor>"

        if is_subsanacion:
            xml += "<Subsanacion>S</Subsanacion>"
            xml += "<RechazoPrevio>X</RechazoPrevio>"

        xml += f"<TipoFactura>{inv_type}</TipoFactura>"

        if inv_type.startswith("R") or inv_type == "F3":
            xml += "<TipoRectificativa>I</TipoRectificativa>"
            if invoice.related_invoice_id:
                tag = "FacturasSustituidas" if inv_type == "F3" else "FacturasRectificadas"
                inner = "IDFacturaSustituida" if inv_type == "F3" else "IDFacturaRectificada"
                xml += f"<{tag}><{inner}>"
                xml += f"<IDEmisorFactura>{nif}</IDEmisorFactura>"
                xml += f"<NumSerieFactura>{invoice.invoice_number}</NumSerieFactura>"
                xml += f"<FechaExpedicionFactura>{_date_str(invoice.issue_date)}</FechaExpedicionFactura>"
                xml += f"</{inner}></{tag}>"

        xml += f"<DescripcionOperacion>{descr}</DescripcionOperacion>"

        if invoice.client_tax_id:
            xml += "<Destinatarios><IDDestinatario>"
            xml += f"<NombreRazon>{invoice.client_name or ''}</NombreRazon>"
            xml += f"<NIF>{_clean_nif(invoice.client_tax_id)}</NIF>"
            xml += "</IDDestinatario></Destinatarios>"
        else:
            xml += "<FacturaSinIdentifDestinatarioArt61d>S</FacturaSinIdentifDestinatarioArt61d>"

        xml += "<Desglose><DetalleDesglose>"
        xml += "<Impuesto>01</Impuesto>"
        if tax_rate_int > 0:
            xml += "<ClaveRegimen>01</ClaveRegimen>"
            xml += "<CalificacionOperacion>S1</CalificacionOperacion>"
            xml += f"<TipoImpositivo>{tax_rate_int}</TipoImpositivo>"
            xml += f"<BaseImponibleOimporteNoSujeto>{_decimal_str(invoice.subtotal)}</BaseImponibleOimporteNoSujeto>"
            xml += f"<CuotaRepercutida>{_decimal_str(invoice.tax_amount)}</CuotaRepercutida>"
        else:
            xml += "<CalificacionOperacion>N1</CalificacionOperacion>"
            xml += f"<BaseImponibleOimporteNoSujeto>{_decimal_str(invoice.subtotal)}</BaseImponibleOimporteNoSujeto>"
        xml += "</DetalleDesglose></Desglose>"

        xml += f"<CuotaTotal>{_decimal_str(invoice.tax_amount)}</CuotaTotal>"
        xml += f"<ImporteTotal>{_decimal_str(invoice.total)}</ImporteTotal>"

        xml += "<Encadenamiento>"
        if prev_invoice and prev_invoice.verifactu_hash:
            xml += "<RegistroAnterior>"
            xml += f"<IDEmisorFactura>{nif}</IDEmisorFactura>"
            xml += f"<NumSerieFactura>{prev_invoice.invoice_number}</NumSerieFactura>"
            xml += f"<FechaExpedicionFactura>{_date_str(prev_invoice.issue_date)}</FechaExpedicionFactura>"
            xml += f"<Huella>{prev_invoice.verifactu_hash}</Huella>"
            xml += "</RegistroAnterior>"
        else:
            xml += "<PrimerRegistro>S</PrimerRegistro>"
        xml += "</Encadenamiento>"

        xml += self._build_sistema_informatico()
        xml += f"<FechaHoraHusoGenRegistro>{reg_dt}</FechaHoraHusoGenRegistro>"
        xml += "<TipoHuella>01</TipoHuella>"
        xml += f"<Huella>{verifactu_hash}</Huella>"
        xml += "</RegistroAlta></sum:RegistroFactura>"

        return xml

    def build_soap_envelope(self, invoice: Invoice, registro_xml: str) -> str:
        s = self.settings
        nif = _clean_nif(s.tax_id or "")

        return (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"'
            ' xmlns:sum="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd"'
            ' xmlns="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd">'
            '<soapenv:Header/>'
            '<soapenv:Body>'
            '<sum:RegFactuSistemaFacturacion>'
            '<sum:Cabecera>'
            '<ObligadoEmision>'
            f'<NombreRazon>{s.business_name}</NombreRazon>'
            f'<NIF>{nif}</NIF>'
            '</ObligadoEmision>'
            '</sum:Cabecera>'
            f'{registro_xml}'
            '</sum:RegFactuSistemaFacturacion>'
            '</soapenv:Body>'
            '</soapenv:Envelope>'
        )

    def send_xml(self, xml_str: str) -> dict:
        """Send SOAP XML to AEAT using client SSL certificate (decrypted at runtime)."""
        from app.services.certificate import (
            cleanup_temp_files,
            decrypt_private_key,
            write_secure_temp_files,
            _wipe_bytearray,
        )

        xml_str = re.sub(r">\s+<", "><", re.sub(r"\s*xmlns", " xmlns", xml_str))
        logger.info("AEAT SOAP request: url=%s length=%d", self.url, len(xml_str))
        logger.debug("AEAT SOAP XML (first 2000 chars): %s", xml_str[:2000])

        cert_pem = self.settings.certificate_pem or ""
        encrypted_key = self.settings.certificate_key_encrypted
        key_iv = self.settings.certificate_key_iv

        if not cert_pem or not encrypted_key or not key_iv:
            return {
                "status": 0,
                "error": "Certificado digital no configurado. Sube tu archivo .p12/.pfx en Configuración > VeriFactu.",
                "response": "",
            }

        key_pem = bytearray()
        cert_path = ""
        key_path = ""
        try:
            workspace_id = str(self.settings.workspace_id)
            key_pem = decrypt_private_key(bytes(encrypted_key), bytes(key_iv), workspace_id)

            cert_path, key_path = write_secure_temp_files(cert_pem, key_pem)

            context = ssl.create_default_context()
            context.load_cert_chain(certfile=cert_path, keyfile=key_path)

            req = urllib.request.Request(
                self.url,
                data=xml_str.encode("utf-8"),
                headers={"Content-Type": "text/xml"},
                method="POST",
            )

            with urllib.request.urlopen(req, context=context) as response:
                status_code = response.getcode()
                body = response.read().decode("utf-8")

            logger.info("AEAT response: status=%d length=%d", status_code, len(body))
            return {"status": status_code, "response": body, "error": None}

        except urllib.error.HTTPError as e:
            resp_body = ""
            try:
                resp_body = e.read().decode("utf-8")
            except Exception:
                pass
            logger.error("AEAT HTTP error: status=%d reason=%s body=%s", e.code, e.reason, resp_body[:500])
            return {"status": e.code, "error": f"HTTP {e.code}: {e.reason}", "response": resp_body}
        except urllib.error.URLError as e:
            logger.exception("AEAT SOAP connection error")
            return {"status": 0, "error": str(e), "response": ""}
        except ssl.SSLError as e:
            logger.exception("SSL certificate error")
            return {"status": 0, "error": f"Error de certificado SSL: {str(e)}", "response": ""}
        except Exception as e:
            logger.exception("AEAT SOAP unexpected error")
            return {"status": 0, "error": str(e), "response": ""}
        finally:
            _wipe_bytearray(key_pem)
            if cert_path or key_path:
                cleanup_temp_files(cert_path, key_path)

    @staticmethod
    def _find_by_local(element, local_name: str):
        """Find first child/descendant matching local_name regardless of namespace."""
        for child in element.iter():
            tag = child.tag
            if "}" in tag:
                tag = tag.split("}", 1)[1]
            if tag == local_name:
                return child
        return None

    @staticmethod
    def _findall_by_local(element, local_name: str) -> list:
        """Find all descendants matching local_name regardless of namespace."""
        results = []
        for child in element.iter():
            tag = child.tag
            if "}" in tag:
                tag = tag.split("}", 1)[1]
            if tag == local_name:
                results.append(child)
        return results

    def parse_response(self, raw_response: str) -> dict:
        """Parse the AEAT SOAP response XML (namespace-tolerant)."""
        logger.info("AEAT raw response length=%d", len(raw_response))
        logger.debug("AEAT raw response: %s", raw_response[:2000])

        try:
            root = ET.fromstring(raw_response)
        except ET.ParseError as e:
            return {
                "status": "error",
                "message": f"Error parseando XML de AEAT: {str(e)}",
                "raw_response": raw_response[:500],
            }

        body = root.find(".//{http://schemas.xmlsoap.org/soap/envelope/}Body")
        if body is None:
            return {
                "status": "error",
                "message": "No SOAP Body in response",
                "raw_response": raw_response[:500],
            }

        fault = body.find(".//{http://schemas.xmlsoap.org/soap/envelope/}Fault")
        if fault is not None:
            fc = self._find_by_local(fault, "faultcode")
            fs = self._find_by_local(fault, "faultstring")
            faultcode = fc.text if fc is not None else "?"
            faultstring = fs.text if fs is not None else "Sin detalle"
            detail_elem = self._find_by_local(fault, "detail")
            detail_text = ""
            if detail_elem is not None and detail_elem.text:
                detail_text = detail_elem.text
            elif detail_elem is not None:
                detail_text = ET.tostring(detail_elem, encoding="unicode", method="text")
            logger.error("AEAT SOAP Fault: code=%s string=%s detail=%s", faultcode, faultstring, detail_text[:200])
            return {
                "status": "error",
                "csv": None,
                "timestamp_presentacion": None,
                "tiempo_espera_envio": None,
                "registros": [],
                "message": f"SOAP Fault de AEAT: [{faultcode}] {faultstring}" + (f" - {detail_text[:200]}" if detail_text else ""),
                "raw_response": raw_response[:1500],
            }

        lines = self._findall_by_local(body, "RespuestaLinea")

        csv_elem = self._find_by_local(body, "CSV")
        csv_val = csv_elem.text if csv_elem is not None else None

        tiempo_elem = self._find_by_local(body, "TiempoEsperaEnvio")
        tiempo_val = tiempo_elem.text if tiempo_elem is not None else None

        ts_elem = self._find_by_local(body, "TimestampPresentacion")
        timestamp = ts_elem.text if ts_elem is not None else None

        results = []
        for line in lines:
            ns_elem = self._find_by_local(line, "NumSerieFactura")
            est_elem = self._find_by_local(line, "EstadoRegistro")
            cod_elem = self._find_by_local(line, "CodigoErrorRegistro")
            desc_elem = self._find_by_local(line, "DescripcionErrorRegistro")

            results.append({
                "num_serie": ns_elem.text if ns_elem is not None else None,
                "estado": est_elem.text if est_elem is not None else None,
                "cod_error": cod_elem.text if cod_elem is not None else None,
                "desc_error": desc_elem.text if desc_elem is not None else None,
            })

        if not lines:
            body_xml = ET.tostring(body, encoding="unicode")[:800]
            logger.warning("AEAT response has no RespuestaLinea. Body: %s", body_xml)

        all_ok = all(r.get("estado") == "Correcto" for r in results) if results else False

        result = {
            "status": "accepted" if all_ok else "error",
            "csv": csv_val,
            "timestamp_presentacion": timestamp,
            "tiempo_espera_envio": tiempo_val,
            "registros": results,
            "message": "Registro aceptado por AEAT" if all_ok else self._build_error_msg(results),
        }

        if not results:
            result["raw_response"] = raw_response[:1500]

        return result

    @staticmethod
    def _get_text(elem, xpath: str) -> Optional[str]:
        found = elem.find(xpath)
        return found.text if found is not None else None

    @staticmethod
    def _build_error_msg(results: list) -> str:
        errors = [
            f"{r.get('num_serie', '?')}: [{r.get('cod_error', '?')}] {r.get('desc_error', '')}"
            for r in results if r.get("cod_error")
        ]
        if errors:
            return "Errores AEAT: " + "; ".join(errors)
        bad = [r for r in results if r.get("estado") != "Correcto"]
        if bad:
            return f"Estado no correcto para {len(bad)} registro(s)"
        return "Respuesta inesperada de AEAT"


# =====================================================
# VeriFactu Service
# =====================================================

class VeriFactuService:
    """Core VeriFactu operations: hashing, QR, record preparation, AEAT dispatch."""

    @staticmethod
    def generate_uuid() -> str:
        return str(uuid.uuid4())

    @staticmethod
    def calculate_hash(
        nif_emisor: str,
        num_serie_factura: str,
        fecha_expedicion: str,
        tipo_factura: str,
        cuota_total: str,
        importe_total: str,
        prev_hash: str,
        fecha_hora_huso_gen: str,
    ) -> str:
        raw = VERIFACTU_HASH_SEPARATOR.join([
            f"IDEmisorFactura={_clean_nif(nif_emisor)}",
            f"NumSerieFactura={num_serie_factura}",
            f"FechaExpedicionFactura={fecha_expedicion}",
            f"TipoFactura={tipo_factura}",
            f"CuotaTotal={cuota_total}",
            f"ImporteTotal={importe_total}",
            f"Huella={prev_hash}",
            f"FechaHoraHusoGenRegistro={fecha_hora_huso_gen}",
        ])
        return hashlib.sha256(raw.encode("utf-8")).hexdigest().upper()

    @staticmethod
    def calculate_void_hash(
        nif_emisor: str,
        num_serie_factura: str,
        fecha_expedicion: str,
        prev_hash: str,
        fecha_hora_huso_gen: str,
    ) -> str:
        raw = VERIFACTU_HASH_SEPARATOR.join([
            f"IDEmisorFacturaAnulada={_clean_nif(nif_emisor)}",
            f"NumSerieFacturaAnulada={num_serie_factura}",
            f"FechaExpedicionFacturaAnulada={fecha_expedicion}",
            f"Huella={prev_hash}",
            f"FechaHoraHusoGenRegistro={fecha_hora_huso_gen}",
        ])
        return hashlib.sha256(raw.encode("utf-8")).hexdigest().upper()

    @staticmethod
    async def get_previous_invoice(
        db: AsyncSession,
        workspace_id: Any,
        series: str,
    ) -> Optional[Invoice]:
        """Get the most recent finalized invoice in the same series."""
        result = await db.execute(
            select(Invoice)
            .where(Invoice.workspace_id == workspace_id)
            .where(Invoice.invoice_series == series)
            .where(Invoice.verifactu_hash.isnot(None))
            .order_by(Invoice.verifactu_registration_datetime.desc(), Invoice.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_previous_hash(
        db: AsyncSession,
        workspace_id: Any,
        series: str,
    ) -> str:
        result = await db.execute(
            select(Invoice.verifactu_hash)
            .where(Invoice.workspace_id == workspace_id)
            .where(Invoice.invoice_series == series)
            .where(Invoice.verifactu_hash.isnot(None))
            .order_by(Invoice.verifactu_registration_datetime.desc(), Invoice.created_at.desc())
            .limit(1)
        )
        prev = result.scalar_one_or_none()
        return prev or ""

    @classmethod
    async def compute_and_set_hash(
        cls,
        db: AsyncSession,
        invoice: Invoice,
        settings: Optional[InvoiceSettings],
    ) -> None:
        """Compute the chained hash for an invoice and set VeriFactu fields."""
        nif = settings.tax_id if settings else ""
        series = invoice.invoice_series or "F"

        prev_hash = await cls.get_previous_hash(db, invoice.workspace_id, series)

        reg_dt = _local_timestamp()
        invoice.verifactu_registration_datetime = datetime.now(timezone.utc)

        invoice.verifactu_uuid = cls.generate_uuid()
        invoice.verifactu_prev_hash = prev_hash

        invoice.verifactu_hash = cls.calculate_hash(
            nif_emisor=nif or "",
            num_serie_factura=invoice.invoice_number,
            fecha_expedicion=_date_str(invoice.issue_date),
            tipo_factura=invoice.invoice_type or "F1",
            cuota_total=_decimal_str(invoice.tax_amount),
            importe_total=_decimal_str(invoice.total),
            prev_hash=prev_hash,
            fecha_hora_huso_gen=reg_dt,
        )

        is_production = (settings.verifactu_mode if settings else "direct_aeat_test") == "direct_aeat_prod"
        invoice.verifactu_qr_data = cls.generate_qr_url(invoice, nif or "", is_production=is_production)

    @staticmethod
    def generate_qr_url(
        invoice: Invoice,
        nif_emisor: str,
        is_production: bool = False,
    ) -> str:
        base = AEAT_QR_URL_PROD if is_production else AEAT_QR_URL_TEST
        q = urllib.parse.quote
        params = (
            f"nif={q(_clean_nif(nif_emisor))}"
            f"&numserie={q(invoice.invoice_number)}"
            f"&fecha={q(_date_str(invoice.issue_date))}"
            f"&importe={q(_decimal_str(invoice.total))}"
        )
        return f"{base}?{params}"

    @staticmethod
    def prepare_alta_record(invoice: Invoice, settings: Optional[InvoiceSettings]) -> dict:
        """Prepare the full VeriFactu Alta record structure (for diagnostics)."""
        nif = _clean_nif(settings.tax_id) if settings and settings.tax_id else ""
        business_name = settings.business_name if settings else ""

        record = {
            "IDVersion": "1.0",
            "IDFactura": {
                "IDEmisorFactura": nif,
                "NumSerieFactura": invoice.invoice_number,
                "FechaExpedicionFactura": _date_str(invoice.issue_date),
            },
            "NombreRazonEmisor": business_name,
            "TipoFactura": invoice.invoice_type or "F1",
            "DescripcionOperacion": "Prestación de servicios",
            "Desglose": {
                "DetalleDesglose": {
                    "Impuesto": "01",
                    "ClaveRegimen": "01",
                    "CalificacionOperacion": "S1",
                    "TipoImpositivo": str(int(invoice.tax_rate or 21)),
                    "BaseImponibleOimporteNoSujeto": _decimal_str(invoice.subtotal),
                    "CuotaRepercutida": _decimal_str(invoice.tax_amount),
                },
            },
            "CuotaTotal": _decimal_str(invoice.tax_amount),
            "ImporteTotal": _decimal_str(invoice.total),
            "Encadenamiento": {},
            "FechaHoraHusoGenRegistro": _local_timestamp(),
            "TipoHuella": "01",
            "Huella": invoice.verifactu_hash,
        }

        if invoice.verifactu_prev_hash:
            record["Encadenamiento"] = {
                "RegistroAnterior": {
                    "Huella": invoice.verifactu_prev_hash,
                }
            }
        else:
            record["Encadenamiento"] = {"PrimerRegistro": "S"}

        if invoice.client_tax_id:
            record["Destinatarios"] = {
                "IDDestinatario": {
                    "NombreRazon": invoice.client_name,
                    "NIF": _clean_nif(invoice.client_tax_id),
                }
            }

        if invoice.invoice_type and (invoice.invoice_type.startswith("R") or invoice.invoice_type == "F3"):
            record["TipoRectificativa"] = "I"

        return record

    @classmethod
    async def send_to_aeat(
        cls,
        db_session: AsyncSession,
        invoice: Invoice,
        settings: InvoiceSettings,
    ) -> dict:
        """
        Build SOAP XML and send to AEAT (test or production).
        Returns structured result with AEAT response.
        """
        if not settings.verifactu_enabled:
            return {"status": "skipped", "message": "VeriFactu no habilitado"}

        if not settings.certificate_pem or not settings.certificate_key_encrypted:
            return {
                "status": "error",
                "message": "Certificado digital no configurado. Sube tu archivo .p12/.pfx en Configuración > VeriFactu.",
            }

        is_test = (settings.verifactu_mode or "direct_aeat_test") == "direct_aeat_test"

        series = invoice.invoice_series or "F"
        prev_invoice = await cls.get_previous_invoice(db_session, invoice.workspace_id, series)

        reg_dt = _local_timestamp()

        client = AEATSoapClient(settings, is_test=is_test)
        registro_xml = client.build_registro_alta_xml(
            invoice=invoice,
            prev_invoice=prev_invoice,
            verifactu_hash=invoice.verifactu_hash or "",
            reg_dt=reg_dt,
            is_subsanacion=bool(invoice.verifactu_response and invoice.verifactu_response.get("status") == "error"),
        )

        soap_xml = client.build_soap_envelope(invoice, registro_xml)

        logger.info("VeriFactu AEAT: sending to %s for invoice %s", client.url, invoice.invoice_number)

        raw_result = client.send_xml(soap_xml)

        if raw_result.get("error"):
            return {
                "status": "error",
                "provider": "direct_aeat",
                "message": raw_result["error"],
                "http_status": raw_result.get("status"),
                "xml_sent": soap_xml[:500] + "..." if len(soap_xml) > 500 else soap_xml,
            }

        parsed = client.parse_response(raw_result["response"])

        result = {
            "status": parsed["status"],
            "provider": "direct_aeat",
            "message": parsed["message"],
            "csv": parsed.get("csv"),
            "timestamp_presentacion": parsed.get("timestamp_presentacion"),
            "tiempo_espera_envio": parsed.get("tiempo_espera_envio"),
            "registros": parsed.get("registros", []),
            "http_status": raw_result["status"],
        }

        return result

    @staticmethod
    async def send_to_provider(
        invoice: Invoice,
        settings: InvoiceSettings,
        db_session: Optional[AsyncSession] = None,
    ) -> dict:
        """
        Route to the appropriate send method based on settings.verifactu_mode.
        """
        mode = settings.verifactu_mode if settings else "none"

        if mode == "none" or not settings.verifactu_enabled:
            return {"status": "skipped", "message": "VeriFactu no habilitado"}

        if mode in ("direct_aeat_test", "direct_aeat_prod"):
            if db_session is None:
                return {"status": "error", "message": "Se requiere sesión de base de datos para envío AEAT"}
            return await VeriFactuService.send_to_aeat(db_session, invoice, settings)

        return {"status": "error", "message": f"Modo desconocido: {mode}"}
