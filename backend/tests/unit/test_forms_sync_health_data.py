"""Tests for ``_sync_health_data_from_answers`` in the forms endpoint.

Cubre el contrato introducido en la migración 060: los 4 campos
``sys_init_birth_date``, ``sys_init_gender``, ``sys_init_height_cm`` y
``sys_init_weight_kg`` del Cuestionario Inicial Trackfiz se vuelcan a
las columnas directas del cliente (no sólo a ``health_data``), para
que la ficha del entrenador y la calculadora nutricional consuman el
mismo dato.
"""
from unittest.mock import MagicMock

from app.api.v1.endpoints.forms import _sync_health_data_from_answers


def _make_form_with_sys_init_fields():
    form = MagicMock()
    form.schema = {
        "fields": [
            {"id": "sys_init_birth_date", "type": "date"},
            {"id": "sys_init_gender", "type": "select"},
            {"id": "sys_init_height_cm", "type": "number"},
            {"id": "sys_init_weight_kg", "type": "number"},
            {"id": "sys_init_primary_goal", "type": "select"},
        ]
    }
    return form


def _make_blank_client():
    c = MagicMock()
    c.health_data = None
    c.birth_date = None
    c.gender = None
    c.height_cm = None
    c.weight_kg = None
    return c


def test_init_form_writes_basic_fields_to_columns():
    """Los 4 campos básicos van a columnas directas, no a health_data."""
    form = _make_form_with_sys_init_fields()
    client = _make_blank_client()

    answers = {
        "sys_init_birth_date": "1987-11-13",
        "sys_init_gender": "Mujer",
        "sys_init_height_cm": 160,
        "sys_init_weight_kg": 57.5,
        "sys_init_primary_goal": "Perder peso",
    }
    assert _sync_health_data_from_answers(form, client, answers) is True

    assert client.birth_date == "1987-11-13"
    assert client.gender == "female"
    # ``height_cm`` y ``weight_kg`` quedan como string porque la
    # columna en BD es TEXT (heredado).
    assert client.height_cm == "160"
    assert client.weight_kg == "57.5"
    # El primary_goal sigue yendo a health_data (lógica preexistente).
    assert client.health_data == {"primary_goal": "Perder peso"}


def test_init_form_normalises_iso_birth_date():
    """Si el front manda un ISO 8601 completo se recorta a YYYY-MM-DD."""
    form = _make_form_with_sys_init_fields()
    client = _make_blank_client()

    answers = {"sys_init_birth_date": "1987-11-13T00:00:00.000Z"}
    _sync_health_data_from_answers(form, client, answers)

    assert client.birth_date == "1987-11-13"


def test_init_form_gender_mapping():
    """El form muestra etiquetas en español pero persistimos códigos en inglés
    para no romper la calculadora nutricional ni los reportes existentes."""
    form = _make_form_with_sys_init_fields()
    for label, expected in [
        ("Hombre", "male"),
        ("Mujer", "female"),
        ("Otro", "other"),
        ("mujer ", "female"),  # whitespace + lowercase tolerados
    ]:
        client = _make_blank_client()
        _sync_health_data_from_answers(form, client, {"sys_init_gender": label})
        assert client.gender == expected, f"{label!r} → {client.gender!r} (esperado {expected!r})"


def test_init_form_ignores_invalid_height_weight():
    """Inputs no numéricos NO deben corromper la ficha del cliente."""
    form = _make_form_with_sys_init_fields()
    client = _make_blank_client()
    client.height_cm = "165"
    client.weight_kg = "70"

    answers = {
        "sys_init_height_cm": "abc",
        "sys_init_weight_kg": None,
        "sys_init_birth_date": "",
    }
    _sync_health_data_from_answers(form, client, answers)

    # Se preserva el valor anterior — nunca lo machacamos con basura.
    assert client.height_cm == "165"
    assert client.weight_kg == "70"
    assert client.birth_date is None


def test_init_form_integer_height_no_trailing_decimal():
    """170.0 (float) → "170" (string sin decimal)."""
    form = _make_form_with_sys_init_fields()
    client = _make_blank_client()

    _sync_health_data_from_answers(form, client, {"sys_init_height_cm": 170.0})
    assert client.height_cm == "170"


def test_init_form_does_not_touch_columns_when_answer_missing():
    """Si la respuesta no incluye un campo, la columna se queda como estaba."""
    form = _make_form_with_sys_init_fields()
    client = _make_blank_client()
    client.height_cm = "180"
    client.weight_kg = "80"
    client.gender = "male"
    client.birth_date = "1990-01-01"

    _sync_health_data_from_answers(form, client, {"sys_init_primary_goal": "Perder peso"})

    assert client.height_cm == "180"
    assert client.weight_kg == "80"
    assert client.gender == "male"
    assert client.birth_date == "1990-01-01"
