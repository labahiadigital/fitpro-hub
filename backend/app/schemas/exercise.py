"""Exercise and Food library schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

from .base import BaseSchema


# Exercise Category schemas
class ExerciseCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[UUID] = None


class ExerciseCategoryCreate(ExerciseCategoryBase):
    pass


class ExerciseCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[UUID] = None


class ExerciseCategoryResponse(ExerciseCategoryBase, BaseSchema):
    id: UUID
    is_system: bool = False


class ExerciseCategoryList(BaseModel):
    items: List[ExerciseCategoryResponse]
    total: int


# Exercise schemas
class ExerciseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    instructions: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    muscle_groups: List[str] = Field(default_factory=list)
    equipment: List[str] = Field(default_factory=list)
    difficulty: str = Field(default='intermediate')
    is_public: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ExerciseCreate(ExerciseBase):
    workspace_id: Optional[UUID] = None
    category_id: Optional[UUID] = None


class ExerciseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    instructions: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    muscle_groups: Optional[List[str]] = None
    equipment: Optional[List[str]] = None
    difficulty: Optional[str] = None
    is_public: Optional[bool] = None
    category_id: Optional[UUID] = None
    metadata: Optional[Dict[str, Any]] = None


class ExerciseResponse(ExerciseBase, BaseSchema):
    id: UUID
    workspace_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    is_system: bool = False


class ExerciseList(BaseModel):
    items: List[ExerciseResponse]
    total: int
    page: int
    size: int


# Food Category schemas
class FoodCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[UUID] = None


class FoodCategoryCreate(FoodCategoryBase):
    pass


class FoodCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[UUID] = None


class FoodCategoryResponse(FoodCategoryBase, BaseSchema):
    id: UUID
    is_system: bool = False


class FoodCategoryList(BaseModel):
    items: List[FoodCategoryResponse]
    total: int


# Food schemas
class FoodBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    brand: Optional[str] = None
    serving_size: float = Field(default=100, ge=0)
    serving_unit: str = Field(default='g', max_length=20)
    calories: Optional[float] = Field(None, ge=0)
    protein: Optional[float] = Field(None, ge=0)
    carbs: Optional[float] = Field(None, ge=0)
    fat: Optional[float] = Field(None, ge=0)
    fiber: Optional[float] = Field(None, ge=0)
    sugar: Optional[float] = Field(None, ge=0)
    sodium: Optional[float] = Field(None, ge=0)
    micronutrients: Dict[str, Any] = Field(default_factory=dict)
    allergens: List[str] = Field(default_factory=list)
    is_public: bool = False
    barcode: Optional[str] = None


class FoodCreate(FoodBase):
    workspace_id: Optional[UUID] = None
    category_id: Optional[UUID] = None


class FoodUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    brand: Optional[str] = None
    serving_size: Optional[float] = Field(None, ge=0)
    serving_unit: Optional[str] = Field(None, max_length=20)
    calories: Optional[float] = Field(None, ge=0)
    protein: Optional[float] = Field(None, ge=0)
    carbs: Optional[float] = Field(None, ge=0)
    fat: Optional[float] = Field(None, ge=0)
    fiber: Optional[float] = Field(None, ge=0)
    sugar: Optional[float] = Field(None, ge=0)
    sodium: Optional[float] = Field(None, ge=0)
    micronutrients: Optional[Dict[str, Any]] = None
    allergens: Optional[List[str]] = None
    is_public: Optional[bool] = None
    category_id: Optional[UUID] = None
    barcode: Optional[str] = None


class FoodResponse(FoodBase, BaseSchema):
    id: UUID
    workspace_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    is_system: bool = False


class FoodList(BaseModel):
    items: List[FoodResponse]
    total: int
    page: int
    size: int


# Client Measurement schemas
class ClientMeasurementBase(BaseModel):
    measured_at: datetime
    weight_kg: Optional[float] = Field(None, ge=0)
    body_fat_percentage: Optional[float] = Field(None, ge=0, le=100)
    muscle_mass_kg: Optional[float] = Field(None, ge=0)
    measurements: Dict[str, Any] = Field(default_factory=dict)
    photos: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class ClientMeasurementCreate(ClientMeasurementBase):
    client_id: UUID


class ClientMeasurementUpdate(BaseModel):
    measured_at: Optional[datetime] = None
    weight_kg: Optional[float] = Field(None, ge=0)
    body_fat_percentage: Optional[float] = Field(None, ge=0, le=100)
    muscle_mass_kg: Optional[float] = Field(None, ge=0)
    measurements: Optional[Dict[str, Any]] = None
    photos: Optional[List[str]] = None
    notes: Optional[str] = None


class ClientMeasurementResponse(ClientMeasurementBase, BaseSchema):
    id: UUID
    client_id: UUID


class ClientMeasurementList(BaseModel):
    items: List[ClientMeasurementResponse]
    total: int
    page: int
    size: int


# Client Task schemas
class ClientTaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    task_type: str = Field(default='general')
    due_date: Optional[datetime] = None
    status: str = Field(default='pending')
    priority: str = Field(default='medium')


class ClientTaskCreate(ClientTaskBase):
    workspace_id: UUID
    client_id: UUID
    assigned_by: Optional[UUID] = None
    related_booking_id: Optional[UUID] = None
    related_form_id: Optional[UUID] = None


class ClientTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    task_type: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    completed_at: Optional[datetime] = None


class ClientTaskResponse(ClientTaskBase, BaseSchema):
    id: UUID
    workspace_id: UUID
    client_id: UUID
    assigned_by: Optional[UUID] = None
    completed_at: Optional[datetime] = None
    related_booking_id: Optional[UUID] = None
    related_form_id: Optional[UUID] = None


class ClientTaskList(BaseModel):
    items: List[ClientTaskResponse]
    total: int
    page: int
    size: int

