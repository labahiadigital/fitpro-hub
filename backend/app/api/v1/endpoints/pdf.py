"""PDF generation endpoints for diet and workout plans."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import io

from app.core.database import get_db
from app.models.nutrition import MealPlan
from app.models.workout import WorkoutProgram
from app.models.client import Client
from app.models.workspace import Workspace
from app.models.user import User
from app.middleware.auth import require_workspace, CurrentUser
from app.services.pdf_generator import pdf_generator

router = APIRouter()


# ============ SCHEMAS ============

class DietPlanPDFRequest(BaseModel):
    plan_id: UUID
    include_shopping_list: bool = True
    notes: Optional[str] = None


class WorkoutPlanPDFRequest(BaseModel):
    program_id: UUID
    notes: Optional[str] = None


# ============ ENDPOINTS ============

@router.post("/diet-plan")
async def generate_diet_plan_pdf(
    data: DietPlanPDFRequest,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Generar PDF de un plan nutricional.
    """
    # Get meal plan
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == data.plan_id,
            MealPlan.workspace_id == current_user.workspace_id
        )
    )
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan nutricional no encontrado"
        )
    
    # Get workspace
    result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = result.scalar_one_or_none()
    
    # Get trainer
    result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    trainer = result.scalar_one_or_none()
    
    # Get client if assigned
    client_name = "Sin asignar"
    client_allergies = []
    client_intolerances = []
    client_data = {}
    
    if plan.client_id:
        result = await db.execute(
            select(Client).where(Client.id == plan.client_id)
        )
        client = result.scalar_one_or_none()
        if client:
            client_name = f"{client.first_name} {client.last_name}"
            client_allergies = client.health_data.get("allergies", []) if client.health_data else []
            client_intolerances = client.health_data.get("intolerances", []) if client.health_data else []
            client_data = {
                "name": client_name,
                "gender": client.gender,
                "weight_kg": client.weight_kg,
                "height_cm": client.height_cm,
                "goals": client.goals,
                "allergies": client_allergies,
                "intolerances": client_intolerances,
            }
    
    # Get supplements from plan
    supplements = plan.plan.get("supplements", []) if plan.plan else []
    
    # Generate PDF
    try:
        pdf_bytes = pdf_generator.generate_diet_plan_pdf(
            plan_name=plan.name,
            client_name=client_name,
            trainer_name=trainer.full_name if trainer else "Entrenador",
            workspace_name=workspace.name if workspace else "Trackfiz",
            target_calories=plan.target_calories or 2000,
            target_protein=plan.target_protein or 150,
            target_carbs=plan.target_carbs or 200,
            target_fat=plan.target_fat or 70,
            days=plan.plan.get("days", []) if plan.plan else [],
            client_allergies=client_allergies,
            client_intolerances=client_intolerances,
            notes=data.notes or plan.description or "",
            client_data=client_data,
            supplements=supplements,
        )
        
        # Return as downloadable file
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{plan.name.replace(" ", "_")}.pdf"'
            }
        )
        
    except ImportError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar PDF: {str(e)}. Por favor, instale reportlab."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar PDF: {str(e)}"
        )


@router.post("/workout-plan")
async def generate_workout_plan_pdf(
    data: WorkoutPlanPDFRequest,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Generar PDF de un programa de entrenamiento.
    """
    # Get workout program
    result = await db.execute(
        select(WorkoutProgram).where(
            WorkoutProgram.id == data.program_id,
            WorkoutProgram.workspace_id == current_user.workspace_id
        )
    )
    program = result.scalar_one_or_none()
    
    if not program:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Programa de entrenamiento no encontrado"
        )
    
    # Get workspace
    result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = result.scalar_one_or_none()
    
    # Get trainer
    result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    trainer = result.scalar_one_or_none()
    
    # Get client if assigned
    client_name = "Sin asignar"
    if program.client_id:
        result = await db.execute(
            select(Client).where(Client.id == program.client_id)
        )
        client = result.scalar_one_or_none()
        if client:
            client_name = f"{client.first_name} {client.last_name}"
    
    # Generate PDF
    try:
        pdf_bytes = pdf_generator.generate_workout_plan_pdf(
            plan_name=program.name,
            client_name=client_name,
            trainer_name=trainer.full_name if trainer else "Entrenador",
            workspace_name=workspace.name if workspace else "Trackfiz",
            description=program.description or "",
            weeks=program.structure.get("weeks", []) if program.structure else [],
            notes=data.notes or "",
        )
        
        # Return as downloadable file
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{program.name.replace(" ", "_")}.pdf"'
            }
        )
        
    except ImportError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar PDF: {str(e)}. Por favor, instale reportlab."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar PDF: {str(e)}"
        )


@router.get("/meal-plan/{plan_id}")
async def download_meal_plan_pdf(
    plan_id: UUID,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Descargar PDF de un plan nutricional directamente por ID.
    """
    # Get meal plan
    result = await db.execute(
        select(MealPlan).where(
            MealPlan.id == plan_id,
            MealPlan.workspace_id == current_user.workspace_id
        )
    )
    plan = result.scalar_one_or_none()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan nutricional no encontrado"
        )
    
    # Get workspace
    result = await db.execute(
        select(Workspace).where(Workspace.id == current_user.workspace_id)
    )
    workspace = result.scalar_one_or_none()
    
    # Get trainer
    result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    trainer = result.scalar_one_or_none()
    
    # Get client if assigned
    client_name = "Sin asignar"
    client_allergies = []
    client_intolerances = []
    client_data = {}
    
    if plan.client_id:
        result = await db.execute(
            select(Client).where(Client.id == plan.client_id)
        )
        client = result.scalar_one_or_none()
        if client:
            client_name = f"{client.first_name} {client.last_name}"
            client_allergies = client.health_data.get("allergies", []) if client.health_data else []
            client_intolerances = client.health_data.get("intolerances", []) if client.health_data else []
            client_data = {
                "name": client_name,
                "gender": client.gender,
                "weight_kg": client.weight_kg,
                "height_cm": client.height_cm,
                "goals": client.goals,
                "allergies": client_allergies,
                "intolerances": client_intolerances,
            }
    
    # Get supplements from plan
    supplements = plan.plan.get("supplements", []) if plan.plan else []
    
    # Generate PDF
    try:
        pdf_bytes = pdf_generator.generate_diet_plan_pdf(
            plan_name=plan.name,
            client_name=client_name,
            trainer_name=trainer.full_name if trainer else "Entrenador",
            workspace_name=workspace.name if workspace else "Trackfiz",
            target_calories=plan.target_calories or 2000,
            target_protein=plan.target_protein or 150,
            target_carbs=plan.target_carbs or 200,
            target_fat=plan.target_fat or 70,
            days=plan.plan.get("days", []) if plan.plan else [],
            client_allergies=client_allergies,
            client_intolerances=client_intolerances,
            notes=plan.description or "",
            client_data=client_data,
            supplements=supplements,
        )
        
        # Return as downloadable file
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="plan_nutricional_{plan.name.replace(" ", "_")}.pdf"'
            }
        )
        
    except ImportError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar PDF: {str(e)}. Por favor, instale reportlab."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar PDF: {str(e)}"
        )


@router.get("/allergens")
async def get_common_allergens(
    current_user: CurrentUser = Depends(require_workspace),
):
    """
    Obtener lista de alérgenos comunes.
    """
    from app.models.client import COMMON_ALLERGENS
    
    allergens = [
        {"id": a, "name": a.replace("_", " ").title()}
        for a in COMMON_ALLERGENS
    ]
    
    return {"allergens": allergens}
