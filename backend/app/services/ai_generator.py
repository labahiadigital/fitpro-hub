"""
Servicio de generación de planes con IA
Soporta OpenAI y Anthropic
"""

import json
import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

import httpx
from pydantic import BaseModel


class AIGenerationRequest(BaseModel):
    """Solicitud de generación de IA"""
    generation_type: str  # workout_plan, meal_plan, exercise_suggestion, etc.
    client_data: Dict[str, Any]
    additional_context: Optional[Dict[str, Any]] = None
    custom_prompt: Optional[str] = None


class AIGenerationResponse(BaseModel):
    """Respuesta de generación de IA"""
    success: bool
    content: Optional[Dict[str, Any]] = None
    raw_response: Optional[str] = None
    tokens_input: int = 0
    tokens_output: int = 0
    generation_time_ms: int = 0
    error: Optional[str] = None


class AIGeneratorService:
    """Servicio principal de generación con IA"""

    OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
    ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

    # Prompts del sistema por tipo de generación
    SYSTEM_PROMPTS = {
        "workout_plan": """Eres un entrenador personal experto con años de experiencia en fitness y culturismo.
Tu objetivo es crear planes de entrenamiento personalizados, seguros y efectivos.
Siempre consideras las limitaciones físicas, objetivos y preferencias del cliente.
Respondes SIEMPRE en español y en formato JSON estructurado.""",

        "meal_plan": """Eres un nutricionista deportivo experto certificado.
Tu objetivo es crear planes de alimentación personalizados que sean saludables, equilibrados y adaptados a los objetivos del cliente.
Siempre consideras alergias, intolerancias y preferencias alimentarias.
Respondes SIEMPRE en español y en formato JSON estructurado.""",

        "exercise_suggestion": """Eres un entrenador personal experto.
Tu objetivo es sugerir ejercicios específicos basados en el contexto del entrenamiento.
Consideras el equipamiento disponible, nivel del cliente y objetivos.
Respondes SIEMPRE en español y en formato JSON estructurado.""",

        "meal_suggestion": """Eres un nutricionista experto.
Tu objetivo es sugerir comidas específicas basadas en los requisitos nutricionales.
Consideras alergias, preferencias y objetivos del cliente.
Respondes SIEMPRE en español y en formato JSON estructurado.""",

        "progress_analysis": """Eres un entrenador personal y nutricionista experto.
Tu objetivo es analizar el progreso del cliente y proporcionar recomendaciones personalizadas.
Eres motivador pero realista en tus análisis.
Respondes SIEMPRE en español y en formato JSON estructurado.""",
    }

    # Estructuras de respuesta esperadas
    RESPONSE_SCHEMAS = {
        "workout_plan": {
            "name": "string - Nombre del plan",
            "description": "string - Descripción del plan",
            "duration_weeks": "number - Duración en semanas",
            "days_per_week": "number - Días por semana",
            "goal": "string - Objetivo principal",
            "days": [
                {
                    "day_number": "number",
                    "name": "string - Nombre del día (ej: Pecho y Tríceps)",
                    "exercises": [
                        {
                            "name": "string - Nombre del ejercicio",
                            "sets": "number - Series",
                            "reps": "string - Repeticiones (ej: 8-12)",
                            "rest_seconds": "number - Descanso en segundos",
                            "notes": "string - Notas adicionales",
                            "muscle_group": "string - Grupo muscular"
                        }
                    ]
                }
            ],
            "notes": "string - Notas generales del plan"
        },
        "meal_plan": {
            "name": "string - Nombre del plan",
            "description": "string - Descripción",
            "target_calories": "number - Calorías objetivo",
            "target_protein": "number - Proteína objetivo (g)",
            "target_carbs": "number - Carbohidratos objetivo (g)",
            "target_fat": "number - Grasas objetivo (g)",
            "days": [
                {
                    "day_number": "number",
                    "meals": [
                        {
                            "name": "string - Nombre de la comida (ej: Desayuno)",
                            "time": "string - Hora sugerida",
                            "foods": [
                                {
                                    "name": "string - Nombre del alimento",
                                    "quantity": "number - Cantidad",
                                    "unit": "string - Unidad (g, ml, unidad)",
                                    "calories": "number",
                                    "protein": "number",
                                    "carbs": "number",
                                    "fat": "number"
                                }
                            ],
                            "total_calories": "number",
                            "notes": "string"
                        }
                    ]
                }
            ],
            "supplements": [
                {
                    "name": "string - Nombre del suplemento",
                    "dosage": "string - Dosis",
                    "timing": "string - Momento de toma",
                    "notes": "string"
                }
            ],
            "notes": "string - Notas generales"
        },
        "progress_analysis": {
            "summary": "string - Resumen del análisis",
            "progress_score": "number - Puntuación de progreso (0-100)",
            "strengths": ["string - Puntos fuertes"],
            "areas_to_improve": ["string - Áreas de mejora"],
            "recommendations": [
                {
                    "category": "string - training/nutrition/recovery",
                    "title": "string - Título de la recomendación",
                    "description": "string - Descripción detallada",
                    "priority": "string - high/medium/low"
                }
            ],
            "next_steps": ["string - Próximos pasos concretos"],
            "motivation_message": "string - Mensaje motivacional personalizado"
        }
    }

    def __init__(
        self,
        api_key: str,
        provider: str = "openai",
        model: Optional[str] = None,
    ):
        self.api_key = api_key
        self.provider = provider
        self.model = model or ("gpt-4o" if provider == "openai" else "claude-3-5-sonnet-20241022")

    def _build_workout_prompt(self, client_data: Dict[str, Any]) -> str:
        """Construir prompt para plan de entrenamiento"""
        return f"""Genera un plan de entrenamiento personalizado para el siguiente cliente:

**Datos del Cliente:**
- Nombre: {client_data.get('name', 'Cliente')}
- Edad: {client_data.get('age', 'No especificada')} años
- Género: {client_data.get('gender', 'No especificado')}
- Peso: {client_data.get('weight', 'No especificado')} kg
- Altura: {client_data.get('height', 'No especificada')} cm
- Nivel de experiencia: {client_data.get('experience_level', 'Intermedio')}

**Objetivo Principal:** {client_data.get('goal', 'Mejorar condición física')}

**Disponibilidad:**
- Días por semana: {client_data.get('days_per_week', 4)}
- Duración de sesión: {client_data.get('session_duration', 60)} minutos

**Equipamiento disponible:** {', '.join(client_data.get('equipment', ['Gimnasio completo']))}

**Lesiones o limitaciones:** {', '.join(client_data.get('injuries', ['Ninguna'])) or 'Ninguna'}

**Preferencias adicionales:** {client_data.get('preferences', 'Sin preferencias específicas')}

Genera el plan en formato JSON siguiendo exactamente esta estructura:
{json.dumps(self.RESPONSE_SCHEMAS['workout_plan'], indent=2, ensure_ascii=False)}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional."""

    def _build_meal_plan_prompt(self, client_data: Dict[str, Any]) -> str:
        """Construir prompt para plan nutricional"""
        return f"""Genera un plan nutricional personalizado para el siguiente cliente:

**Datos del Cliente:**
- Nombre: {client_data.get('name', 'Cliente')}
- Edad: {client_data.get('age', 'No especificada')} años
- Género: {client_data.get('gender', 'No especificado')}
- Peso actual: {client_data.get('weight', 'No especificado')} kg
- Altura: {client_data.get('height', 'No especificada')} cm
- Peso objetivo: {client_data.get('target_weight', client_data.get('weight', 'No especificado'))} kg

**Objetivo Principal:** {client_data.get('goal', 'Mantener peso')}

**Nivel de Actividad:** {client_data.get('activity_level', 'Moderado')}

**Requerimientos Calóricos:** {client_data.get('target_calories', 2000)} kcal/día

**Restricciones Alimentarias:**
- Alergias: {', '.join(client_data.get('allergies', [])) or 'Ninguna'}
- Intolerancias: {', '.join(client_data.get('intolerances', [])) or 'Ninguna'}
- Preferencias: {client_data.get('food_preferences', 'Sin preferencias específicas')}

**Comidas al día:** {client_data.get('meals_per_day', 5)}

Genera el plan en formato JSON siguiendo exactamente esta estructura:
{json.dumps(self.RESPONSE_SCHEMAS['meal_plan'], indent=2, ensure_ascii=False)}

IMPORTANTE: 
- Responde SOLO con el JSON, sin texto adicional.
- NO incluyas alimentos que contengan los alérgenos o intolerancias listados.
- Calcula los macronutrientes de forma realista."""

    def _build_progress_prompt(self, client_data: Dict[str, Any]) -> str:
        """Construir prompt para análisis de progreso"""
        return f"""Analiza el progreso del siguiente cliente y proporciona recomendaciones:

**Datos del Cliente:**
- Nombre: {client_data.get('name', 'Cliente')}
- Objetivo: {client_data.get('goal', 'Mejorar condición física')}

**Datos Iniciales:**
- Peso inicial: {client_data.get('initial_weight', 'No disponible')} kg
- Fecha inicio: {client_data.get('start_date', 'No disponible')}

**Datos Actuales:**
- Peso actual: {client_data.get('current_weight', 'No disponible')} kg
- Fecha actual: {client_data.get('current_date', datetime.now().strftime('%Y-%m-%d'))}

**Historial:**
- Entrenamientos completados: {client_data.get('workouts_completed', 0)}
- Adherencia al plan nutricional: {client_data.get('nutrition_adherence', 'No disponible')}%

**Mediciones corporales:**
{json.dumps(client_data.get('measurements', {}), indent=2, ensure_ascii=False)}

Genera el análisis en formato JSON siguiendo exactamente esta estructura:
{json.dumps(self.RESPONSE_SCHEMAS['progress_analysis'], indent=2, ensure_ascii=False)}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional."""

    async def _call_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
    ) -> Dict[str, Any]:
        """Llamar a la API de OpenAI"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                self.OPENAI_API_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            data = response.json()

            return {
                "content": data["choices"][0]["message"]["content"],
                "tokens_input": data["usage"]["prompt_tokens"],
                "tokens_output": data["usage"]["completion_tokens"],
            }

    async def _call_anthropic(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
    ) -> Dict[str, Any]:
        """Llamar a la API de Anthropic"""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                self.ANTHROPIC_API_URL,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "system": system_prompt,
                    "messages": [
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )
            response.raise_for_status()
            data = response.json()

            return {
                "content": data["content"][0]["text"],
                "tokens_input": data["usage"]["input_tokens"],
                "tokens_output": data["usage"]["output_tokens"],
            }

    def _parse_json_response(self, content: str) -> Dict[str, Any]:
        """Parsear respuesta JSON de la IA"""
        # Intentar parsear directamente
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        # Intentar extraer JSON de bloques de código
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Intentar encontrar objeto JSON en el texto
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass

        raise ValueError("No se pudo parsear la respuesta JSON de la IA")

    async def generate(
        self,
        request: AIGenerationRequest,
        temperature: float = 0.7,
        max_tokens: int = 4000,
    ) -> AIGenerationResponse:
        """Generar contenido con IA"""
        start_time = time.time()

        try:
            # Obtener prompts
            system_prompt = self.SYSTEM_PROMPTS.get(
                request.generation_type,
                self.SYSTEM_PROMPTS["workout_plan"]
            )

            if request.custom_prompt:
                user_prompt = request.custom_prompt
            elif request.generation_type == "workout_plan":
                user_prompt = self._build_workout_prompt(request.client_data)
            elif request.generation_type == "meal_plan":
                user_prompt = self._build_meal_plan_prompt(request.client_data)
            elif request.generation_type == "progress_analysis":
                user_prompt = self._build_progress_prompt(request.client_data)
            else:
                user_prompt = json.dumps(request.client_data, ensure_ascii=False)

            # Llamar a la API correspondiente
            if self.provider == "openai":
                result = await self._call_openai(
                    system_prompt, user_prompt, temperature, max_tokens
                )
            elif self.provider == "anthropic":
                result = await self._call_anthropic(
                    system_prompt, user_prompt, temperature, max_tokens
                )
            else:
                raise ValueError(f"Proveedor no soportado: {self.provider}")

            # Parsear respuesta
            content = self._parse_json_response(result["content"])

            generation_time = int((time.time() - start_time) * 1000)

            return AIGenerationResponse(
                success=True,
                content=content,
                raw_response=result["content"],
                tokens_input=result["tokens_input"],
                tokens_output=result["tokens_output"],
                generation_time_ms=generation_time,
            )

        except httpx.HTTPStatusError as e:
            return AIGenerationResponse(
                success=False,
                error=f"Error de API: {e.response.status_code} - {e.response.text}",
                generation_time_ms=int((time.time() - start_time) * 1000),
            )
        except Exception as e:
            return AIGenerationResponse(
                success=False,
                error=str(e),
                generation_time_ms=int((time.time() - start_time) * 1000),
            )

    async def generate_workout_plan(
        self,
        client_data: Dict[str, Any],
    ) -> AIGenerationResponse:
        """Generar plan de entrenamiento"""
        return await self.generate(
            AIGenerationRequest(
                generation_type="workout_plan",
                client_data=client_data,
            )
        )

    async def generate_meal_plan(
        self,
        client_data: Dict[str, Any],
    ) -> AIGenerationResponse:
        """Generar plan nutricional"""
        return await self.generate(
            AIGenerationRequest(
                generation_type="meal_plan",
                client_data=client_data,
            )
        )

    async def analyze_progress(
        self,
        client_data: Dict[str, Any],
    ) -> AIGenerationResponse:
        """Analizar progreso del cliente"""
        return await self.generate(
            AIGenerationRequest(
                generation_type="progress_analysis",
                client_data=client_data,
            )
        )
