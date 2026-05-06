"""Migrar flag legacy ``send_on_onboarding`` a ``send_on_signup`` /
``send_on_product_purchase`` en ``forms.settings``.

Revision ID: 054
Revises: 053
Create Date: 2026-05-05

Hasta ahora un único toggle "Enviar automáticamente en el onboarding"
controlaba a la vez:

- la asignación a TODOS los clientes (cuando ``product_ids`` estaba vacío),
- la asignación SÓLO a clientes que compraban ciertos productos (cuando
  ``product_ids`` traía valores).

Esa ambigüedad confundía al coach. Lo separamos en dos flags
independientes dentro de ``forms.settings`` (JSONB):

- ``send_on_signup`` (bool): el form se asigna a TODO cliente que
  completa onboarding (consentimientos, protección de datos, etc.).
- ``send_on_product_purchase`` (bool): el form se asigna SÓLO cuando el
  cliente contrata uno de los productos en ``product_ids``.

Esta migración rellena los nuevos flags inferidos de los datos
existentes para no perder configuración:

- ``send_on_onboarding=true`` y ``product_ids`` vacío  →  ``send_on_signup=true``
- ``send_on_onboarding=true`` y ``product_ids`` con items
                                                  →  ``send_on_product_purchase=true``

El flag legacy ``send_on_onboarding`` se mantiene como derived (true si
cualquiera de los nuevos lo está) por retrocompatibilidad con código
externo y para no obligar al cliente a actualizar la app móvil.
"""
from alembic import op


revision = "054"
down_revision = "053"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) Forms con send_on_onboarding=true y product_ids vacío → send_on_signup=true
    op.execute(
        """
        UPDATE forms
        SET settings = jsonb_set(
            COALESCE(settings, '{}'::jsonb),
            '{send_on_signup}',
            'true'::jsonb,
            true
        )
        WHERE COALESCE(settings ->> 'send_on_onboarding', 'false') = 'true'
          AND (product_ids IS NULL OR cardinality(product_ids) = 0)
          AND NOT (settings ? 'send_on_signup')
        """
    )

    # 2) Forms con send_on_onboarding=true y product_ids con items
    #    → send_on_product_purchase=true (product_ids ya está poblado)
    op.execute(
        """
        UPDATE forms
        SET settings = jsonb_set(
            COALESCE(settings, '{}'::jsonb),
            '{send_on_product_purchase}',
            'true'::jsonb,
            true
        )
        WHERE COALESCE(settings ->> 'send_on_onboarding', 'false') = 'true'
          AND product_ids IS NOT NULL
          AND cardinality(product_ids) > 0
          AND NOT (settings ? 'send_on_product_purchase')
        """
    )

    # 3) Forms con send_on_onboarding=false: dejamos los nuevos flags en
    #    false explícito para que el frontend no tenga que adivinar el
    #    estado por ausencia de la clave.
    op.execute(
        """
        UPDATE forms
        SET settings = jsonb_set(
            jsonb_set(
                COALESCE(settings, '{}'::jsonb),
                '{send_on_signup}',
                'false'::jsonb,
                true
            ),
            '{send_on_product_purchase}',
            'false'::jsonb,
            true
        )
        WHERE COALESCE(settings ->> 'send_on_onboarding', 'false') = 'false'
          AND (
              NOT (settings ? 'send_on_signup')
              OR NOT (settings ? 'send_on_product_purchase')
          )
        """
    )


def downgrade() -> None:
    # Volvemos a los datos previos eliminando los flags nuevos. El flag
    # legacy ``send_on_onboarding`` no se toca porque no fue alterado.
    op.execute(
        """
        UPDATE forms
        SET settings = (settings - 'send_on_signup' - 'send_on_product_purchase')
        WHERE settings ? 'send_on_signup' OR settings ? 'send_on_product_purchase'
        """
    )
