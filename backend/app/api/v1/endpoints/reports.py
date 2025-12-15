from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.core.database import get_db
from app.models.client import Client
from app.models.booking import Booking, BookingStatus
from app.models.payment import Subscription, Payment, SubscriptionStatus, PaymentStatus
from app.middleware.auth import require_workspace, require_staff, CurrentUser

router = APIRouter()


# ============ SCHEMAS ============

class KPIResponse(BaseModel):
    active_clients: int
    total_clients: int
    upcoming_sessions: int
    completed_sessions_month: int
    mrr: float  # Monthly Recurring Revenue
    arpa: float  # Average Revenue Per Account
    churn_rate: float
    revenue_this_month: float
    revenue_last_month: float


class ChartDataPoint(BaseModel):
    label: str
    value: float


class ReportExportRequest(BaseModel):
    report_type: str  # clients, bookings, payments, revenue
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    format: str = "csv"  # csv, xlsx


# ============ KPIs ============

@router.get("/kpis", response_model=KPIResponse)
async def get_kpis(
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener KPIs principales del workspace.
    """
    workspace_id = current_user.workspace_id
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_last_month = (start_of_month - timedelta(days=1)).replace(day=1)
    
    # Active clients
    active_clients_result = await db.execute(
        select(func.count(Client.id)).where(
            Client.workspace_id == workspace_id,
            Client.is_active == True
        )
    )
    active_clients = active_clients_result.scalar() or 0
    
    # Total clients
    total_clients_result = await db.execute(
        select(func.count(Client.id)).where(
            Client.workspace_id == workspace_id
        )
    )
    total_clients = total_clients_result.scalar() or 0
    
    # Upcoming sessions
    upcoming_sessions_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.workspace_id == workspace_id,
            Booking.start_time >= now,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
        )
    )
    upcoming_sessions = upcoming_sessions_result.scalar() or 0
    
    # Completed sessions this month
    completed_sessions_result = await db.execute(
        select(func.count(Booking.id)).where(
            Booking.workspace_id == workspace_id,
            Booking.start_time >= start_of_month,
            Booking.status == BookingStatus.COMPLETED
        )
    )
    completed_sessions_month = completed_sessions_result.scalar() or 0
    
    # MRR (Monthly Recurring Revenue)
    mrr_result = await db.execute(
        select(func.sum(Subscription.amount)).where(
            Subscription.workspace_id == workspace_id,
            Subscription.status == SubscriptionStatus.ACTIVE
        )
    )
    mrr = mrr_result.scalar() or 0.0
    
    # ARPA (Average Revenue Per Account)
    arpa = mrr / active_clients if active_clients > 0 else 0.0
    
    # Revenue this month
    revenue_this_month_result = await db.execute(
        select(func.sum(Payment.amount)).where(
            Payment.workspace_id == workspace_id,
            Payment.status == PaymentStatus.SUCCEEDED,
            Payment.paid_at >= start_of_month
        )
    )
    revenue_this_month = revenue_this_month_result.scalar() or 0.0
    
    # Revenue last month
    revenue_last_month_result = await db.execute(
        select(func.sum(Payment.amount)).where(
            Payment.workspace_id == workspace_id,
            Payment.status == PaymentStatus.SUCCEEDED,
            Payment.paid_at >= start_of_last_month,
            Payment.paid_at < start_of_month
        )
    )
    revenue_last_month = revenue_last_month_result.scalar() or 0.0
    
    # Churn rate (simplified: cancelled subscriptions / total subscriptions this month)
    cancelled_result = await db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.workspace_id == workspace_id,
            Subscription.status == SubscriptionStatus.CANCELLED,
            Subscription.cancelled_at >= start_of_month
        )
    )
    cancelled = cancelled_result.scalar() or 0
    
    total_subs_result = await db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.workspace_id == workspace_id
        )
    )
    total_subs = total_subs_result.scalar() or 1  # Avoid division by zero
    
    churn_rate = (cancelled / total_subs) * 100 if total_subs > 0 else 0.0
    
    return KPIResponse(
        active_clients=active_clients,
        total_clients=total_clients,
        upcoming_sessions=upcoming_sessions,
        completed_sessions_month=completed_sessions_month,
        mrr=mrr,
        arpa=round(arpa, 2),
        churn_rate=round(churn_rate, 2),
        revenue_this_month=revenue_this_month,
        revenue_last_month=revenue_last_month
    )


@router.get("/revenue-chart", response_model=List[ChartDataPoint])
async def get_revenue_chart(
    months: int = 6,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener datos de ingresos para gráfico.
    """
    workspace_id = current_user.workspace_id
    now = datetime.utcnow()
    data = []
    
    for i in range(months - 1, -1, -1):
        # Calculate month boundaries
        month_start = (now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i == 0:
            month_end = now
        else:
            month_end = (month_start + timedelta(days=32)).replace(day=1)
        
        # Get revenue for this month
        result = await db.execute(
            select(func.sum(Payment.amount)).where(
                Payment.workspace_id == workspace_id,
                Payment.status == PaymentStatus.SUCCEEDED,
                Payment.paid_at >= month_start,
                Payment.paid_at < month_end
            )
        )
        revenue = result.scalar() or 0.0
        
        # Format month label
        month_label = month_start.strftime("%b %Y")
        
        data.append(ChartDataPoint(label=month_label, value=revenue))
    
    return data


@router.get("/clients-chart", response_model=List[ChartDataPoint])
async def get_clients_chart(
    months: int = 6,
    current_user: CurrentUser = Depends(require_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtener datos de clientes para gráfico.
    """
    workspace_id = current_user.workspace_id
    now = datetime.utcnow()
    data = []
    
    for i in range(months - 1, -1, -1):
        month_end = (now - timedelta(days=30 * i))
        
        # Get client count up to this date
        result = await db.execute(
            select(func.count(Client.id)).where(
                Client.workspace_id == workspace_id,
                Client.created_at <= month_end
            )
        )
        count = result.scalar() or 0
        
        month_label = month_end.strftime("%b %Y")
        data.append(ChartDataPoint(label=month_label, value=count))
    
    return data


@router.post("/export")
async def export_report(
    data: ReportExportRequest,
    current_user: CurrentUser = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
):
    """
    Exportar reporte a CSV/Excel.
    """
    # TODO: Implement actual export logic with Celery background task
    # For now, return a placeholder response
    
    return {
        "status": "processing",
        "message": "El reporte se está generando. Recibirás un email cuando esté listo.",
        "report_type": data.report_type,
        "format": data.format
    }

