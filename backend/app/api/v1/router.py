from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, workspaces, users, clients, bookings, workouts, nutrition,
    forms, messages, payments, automations, reports, products, exercises,
    foods, notifications
)

api_router = APIRouter()

# Authentication (public)
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación"])

# Workspaces
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])

# Users
api_router.include_router(users.router, prefix="/users", tags=["Usuarios"])

# Clients (CRM)
api_router.include_router(clients.router, prefix="/clients", tags=["Clientes"])

# Bookings & Calendar
api_router.include_router(bookings.router, prefix="/bookings", tags=["Reservas"])

# Workouts
api_router.include_router(workouts.router, prefix="/workouts", tags=["Entrenamientos"])

# Exercises Library
api_router.include_router(exercises.router, prefix="/exercises", tags=["Biblioteca de Ejercicios"])

# Nutrition
api_router.include_router(nutrition.router, prefix="/nutrition", tags=["Nutrición"])

# Foods Library
api_router.include_router(foods.router, prefix="/foods", tags=["Biblioteca de Alimentos"])

# Forms
api_router.include_router(forms.router, prefix="/forms", tags=["Formularios"])

# Messages (Chat)
api_router.include_router(messages.router, prefix="/messages", tags=["Mensajes"])

# Payments
api_router.include_router(payments.router, prefix="/payments", tags=["Pagos"])

# Products & Packages
api_router.include_router(products.router, prefix="/products", tags=["Productos y Bonos"])

# Automations
api_router.include_router(automations.router, prefix="/automations", tags=["Automatizaciones"])

# Notifications
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notificaciones"])

# Reports
api_router.include_router(reports.router, prefix="/reports", tags=["Reportes"])
