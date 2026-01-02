"""PDF generation service for diet and workout plans."""
from typing import Optional, List, Dict, Any
from datetime import datetime
import io
import base64


class PDFGeneratorService:
    """Service for generating PDF documents for diet and workout plans."""
    
    def __init__(self):
        self.default_font = "Helvetica"
        self.primary_color = (45, 106, 79)  # #2D6A4F
        self.secondary_color = (64, 145, 108)  # #40916C
        self.accent_color = (240, 138, 93)  # #F08A5D
        self.danger_color = (220, 53, 69)  # Red for allergens
    
    def _get_reportlab(self):
        """Import reportlab lazily."""
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import cm, mm
            from reportlab.lib.colors import HexColor, Color
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                PageBreak, Image, ListFlowable, ListItem
            )
            from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
            return {
                'A4': A4,
                'getSampleStyleSheet': getSampleStyleSheet,
                'ParagraphStyle': ParagraphStyle,
                'cm': cm,
                'mm': mm,
                'HexColor': HexColor,
                'Color': Color,
                'SimpleDocTemplate': SimpleDocTemplate,
                'Paragraph': Paragraph,
                'Spacer': Spacer,
                'Table': Table,
                'TableStyle': TableStyle,
                'PageBreak': PageBreak,
                'Image': Image,
                'ListFlowable': ListFlowable,
                'ListItem': ListItem,
                'TA_CENTER': TA_CENTER,
                'TA_LEFT': TA_LEFT,
                'TA_RIGHT': TA_RIGHT,
            }
        except ImportError:
            raise ImportError("reportlab is required for PDF generation. Install it with: pip install reportlab")
    
    def generate_diet_plan_pdf(
        self,
        plan_name: str,
        client_name: str,
        trainer_name: str,
        workspace_name: str,
        target_calories: float,
        target_protein: float,
        target_carbs: float,
        target_fat: float,
        days: List[Dict[str, Any]],
        client_allergies: List[str] = [],
        client_intolerances: List[str] = [],
        notes: str = "",
        logo_url: Optional[str] = None,
    ) -> bytes:
        """
        Generate a PDF for a diet plan.
        
        Args:
            plan_name: Name of the diet plan
            client_name: Name of the client
            trainer_name: Name of the trainer
            workspace_name: Name of the workspace/business
            target_calories: Target daily calories
            target_protein: Target daily protein (g)
            target_carbs: Target daily carbs (g)
            target_fat: Target daily fat (g)
            days: List of days with meals
            client_allergies: List of client allergies
            client_intolerances: List of client intolerances
            notes: Additional notes
            logo_url: Optional logo URL
            
        Returns:
            PDF file as bytes
        """
        rl = self._get_reportlab()
        
        buffer = io.BytesIO()
        doc = rl['SimpleDocTemplate'](
            buffer,
            pagesize=rl['A4'],
            rightMargin=2*rl['cm'],
            leftMargin=2*rl['cm'],
            topMargin=2*rl['cm'],
            bottomMargin=2*rl['cm']
        )
        
        styles = rl['getSampleStyleSheet']()
        
        # Custom styles
        title_style = rl['ParagraphStyle'](
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=rl['HexColor']('#2D6A4F'),
            spaceAfter=20,
            alignment=rl['TA_CENTER']
        )
        
        subtitle_style = rl['ParagraphStyle'](
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=rl['HexColor']('#40916C'),
            spaceAfter=10
        )
        
        normal_style = rl['ParagraphStyle'](
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6
        )
        
        warning_style = rl['ParagraphStyle'](
            'Warning',
            parent=styles['Normal'],
            fontSize=10,
            textColor=rl['HexColor']('#DC3545'),
            spaceAfter=6,
            backColor=rl['HexColor']('#FFF3CD'),
            borderPadding=10
        )
        
        allergen_style = rl['ParagraphStyle'](
            'Allergen',
            parent=styles['Normal'],
            fontSize=10,
            textColor=rl['HexColor']('#DC3545'),
            backColor=rl['HexColor']('#FFEBEE')
        )
        
        elements = []
        
        # Header
        elements.append(rl['Paragraph'](f"<b>{workspace_name}</b>", title_style))
        elements.append(rl['Paragraph'](plan_name, subtitle_style))
        elements.append(rl['Spacer'](1, 20))
        
        # Client info
        info_data = [
            ["Cliente:", client_name, "Entrenador:", trainer_name],
            ["Fecha:", datetime.now().strftime("%d/%m/%Y"), "", ""],
        ]
        info_table = rl['Table'](info_data, colWidths=[3*rl['cm'], 5*rl['cm'], 3*rl['cm'], 5*rl['cm']])
        info_table.setStyle(rl['TableStyle']([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), rl['HexColor']('#666666')),
            ('TEXTCOLOR', (2, 0), (2, -1), rl['HexColor']('#666666')),
        ]))
        elements.append(info_table)
        elements.append(rl['Spacer'](1, 20))
        
        # Macros targets
        elements.append(rl['Paragraph']("<b>Objetivos Nutricionales Diarios</b>", subtitle_style))
        macros_data = [
            ["Calorías", "Proteína", "Carbohidratos", "Grasas"],
            [f"{target_calories:.0f} kcal", f"{target_protein:.0f}g", f"{target_carbs:.0f}g", f"{target_fat:.0f}g"]
        ]
        macros_table = rl['Table'](macros_data, colWidths=[4*rl['cm']]*4)
        macros_table.setStyle(rl['TableStyle']([
            ('BACKGROUND', (0, 0), (-1, 0), rl['HexColor']('#2D6A4F')),
            ('TEXTCOLOR', (0, 0), (-1, 0), rl['HexColor']('#FFFFFF')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), rl['HexColor']('#F8F9FA')),
            ('GRID', (0, 0), (-1, -1), 1, rl['HexColor']('#DEE2E6')),
        ]))
        elements.append(macros_table)
        elements.append(rl['Spacer'](1, 20))
        
        # Allergies/Intolerances warning
        all_restrictions = client_allergies + client_intolerances
        if all_restrictions:
            warning_text = f"""
            <b>⚠️ ALERGIAS E INTOLERANCIAS</b><br/>
            El cliente tiene las siguientes restricciones alimentarias: <b>{', '.join(all_restrictions)}</b><br/>
            <b>IMPORTANTE:</b> Revise siempre que ningún alimento de este plan contenga estos ingredientes.
            Los alimentos marcados en <font color='red'>ROJO</font> pueden contener alérgenos.
            """
            elements.append(rl['Paragraph'](warning_text, warning_style))
            elements.append(rl['Spacer'](1, 20))
        
        # Days and meals
        for day in days:
            elements.append(rl['Paragraph'](f"<b>{day.get('dayName', f'Día {day.get(\"day\", 0)}')}</b>", subtitle_style))
            
            for meal in day.get('meals', []):
                meal_name = meal.get('name', 'Comida')
                elements.append(rl['Paragraph'](f"<i>{meal_name}</i>", normal_style))
                
                # Foods in meal
                food_data = [["Alimento", "Cantidad", "Calorías", "P", "C", "G"]]
                
                for food in meal.get('foods', []):
                    food_name = food.get('name', '')
                    
                    # Check if food contains allergens
                    food_allergens = food.get('allergens', [])
                    has_allergen = any(
                        allergen.lower() in [a.lower() for a in all_restrictions]
                        for allergen in food_allergens
                    )
                    
                    if has_allergen:
                        food_name = f"⚠️ {food_name}"
                    
                    food_data.append([
                        food_name,
                        f"{food.get('quantity', 100)}g",
                        f"{food.get('calories', 0):.0f}",
                        f"{food.get('protein', 0):.1f}",
                        f"{food.get('carbs', 0):.1f}",
                        f"{food.get('fat', 0):.1f}",
                    ])
                
                if len(food_data) > 1:
                    food_table = rl['Table'](
                        food_data,
                        colWidths=[6*rl['cm'], 2*rl['cm'], 2*rl['cm'], 1.5*rl['cm'], 1.5*rl['cm'], 1.5*rl['cm']]
                    )
                    food_table.setStyle(rl['TableStyle']([
                        ('BACKGROUND', (0, 0), (-1, 0), rl['HexColor']('#E9ECEF')),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 9),
                        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                        ('GRID', (0, 0), (-1, -1), 0.5, rl['HexColor']('#DEE2E6')),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                        ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ]))
                    elements.append(food_table)
                
                elements.append(rl['Spacer'](1, 10))
            
            elements.append(rl['Spacer'](1, 15))
        
        # Notes
        if notes:
            elements.append(rl['Paragraph']("<b>Notas Adicionales</b>", subtitle_style))
            elements.append(rl['Paragraph'](notes, normal_style))
            elements.append(rl['Spacer'](1, 20))
        
        # Final warning
        final_warning = """
        <b>⚠️ AVISO IMPORTANTE</b><br/>
        Este plan nutricional es orientativo. Revise siempre los ingredientes de los alimentos 
        para asegurarse de que no contienen ningún alérgeno o ingrediente al que pueda ser 
        intolerante. En caso de duda, consulte con su médico o nutricionista.
        """
        elements.append(rl['Paragraph'](final_warning, warning_style))
        
        # Footer
        elements.append(rl['Spacer'](1, 30))
        footer_text = f"Generado por {workspace_name} - {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        footer_style = rl['ParagraphStyle'](
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=rl['HexColor']('#999999'),
            alignment=rl['TA_CENTER']
        )
        elements.append(rl['Paragraph'](footer_text, footer_style))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    
    def generate_workout_plan_pdf(
        self,
        plan_name: str,
        client_name: str,
        trainer_name: str,
        workspace_name: str,
        description: str,
        weeks: List[Dict[str, Any]],
        notes: str = "",
        logo_url: Optional[str] = None,
    ) -> bytes:
        """
        Generate a PDF for a workout plan.
        
        Args:
            plan_name: Name of the workout plan
            client_name: Name of the client
            trainer_name: Name of the trainer
            workspace_name: Name of the workspace/business
            description: Plan description
            weeks: List of weeks with days and exercises
            notes: Additional notes
            logo_url: Optional logo URL
            
        Returns:
            PDF file as bytes
        """
        rl = self._get_reportlab()
        
        buffer = io.BytesIO()
        doc = rl['SimpleDocTemplate'](
            buffer,
            pagesize=rl['A4'],
            rightMargin=2*rl['cm'],
            leftMargin=2*rl['cm'],
            topMargin=2*rl['cm'],
            bottomMargin=2*rl['cm']
        )
        
        styles = rl['getSampleStyleSheet']()
        
        # Custom styles
        title_style = rl['ParagraphStyle'](
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=rl['HexColor']('#2D6A4F'),
            spaceAfter=20,
            alignment=rl['TA_CENTER']
        )
        
        subtitle_style = rl['ParagraphStyle'](
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=rl['HexColor']('#40916C'),
            spaceAfter=10
        )
        
        normal_style = rl['ParagraphStyle'](
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=6
        )
        
        elements = []
        
        # Header
        elements.append(rl['Paragraph'](f"<b>{workspace_name}</b>", title_style))
        elements.append(rl['Paragraph'](plan_name, subtitle_style))
        elements.append(rl['Spacer'](1, 20))
        
        # Client info
        info_data = [
            ["Cliente:", client_name, "Entrenador:", trainer_name],
            ["Fecha:", datetime.now().strftime("%d/%m/%Y"), "", ""],
        ]
        info_table = rl['Table'](info_data, colWidths=[3*rl['cm'], 5*rl['cm'], 3*rl['cm'], 5*rl['cm']])
        info_table.setStyle(rl['TableStyle']([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), rl['HexColor']('#666666')),
            ('TEXTCOLOR', (2, 0), (2, -1), rl['HexColor']('#666666')),
        ]))
        elements.append(info_table)
        elements.append(rl['Spacer'](1, 20))
        
        # Description
        if description:
            elements.append(rl['Paragraph']("<b>Descripción del Programa</b>", subtitle_style))
            elements.append(rl['Paragraph'](description, normal_style))
            elements.append(rl['Spacer'](1, 20))
        
        # Weeks and exercises
        for week in weeks:
            week_num = week.get('week', 1)
            elements.append(rl['Paragraph'](f"<b>Semana {week_num}</b>", subtitle_style))
            
            for day in week.get('days', []):
                day_name = day.get('name', f"Día {day.get('day', 0)}")
                elements.append(rl['Paragraph'](f"<i>{day_name}</i>", normal_style))
                
                # Exercises
                exercise_data = [["Ejercicio", "Series", "Reps", "Peso", "Descanso", "Notas"]]
                
                for exercise in day.get('exercises', []):
                    exercise_data.append([
                        exercise.get('name', ''),
                        str(exercise.get('sets', '-')),
                        str(exercise.get('reps', '-')),
                        exercise.get('weight', '-'),
                        exercise.get('rest', '-'),
                        exercise.get('notes', '')[:30],  # Truncate notes
                    ])
                
                if len(exercise_data) > 1:
                    exercise_table = rl['Table'](
                        exercise_data,
                        colWidths=[5*rl['cm'], 1.5*rl['cm'], 1.5*rl['cm'], 2*rl['cm'], 2*rl['cm'], 4*rl['cm']]
                    )
                    exercise_table.setStyle(rl['TableStyle']([
                        ('BACKGROUND', (0, 0), (-1, 0), rl['HexColor']('#2D6A4F')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), rl['HexColor']('#FFFFFF')),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, -1), 9),
                        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
                        ('GRID', (0, 0), (-1, -1), 0.5, rl['HexColor']('#DEE2E6')),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                        ('TOPPADDING', (0, 0), (-1, -1), 6),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [rl['HexColor']('#FFFFFF'), rl['HexColor']('#F8F9FA')]),
                    ]))
                    elements.append(exercise_table)
                
                elements.append(rl['Spacer'](1, 10))
            
            elements.append(rl['Spacer'](1, 15))
        
        # Notes
        if notes:
            elements.append(rl['Paragraph']("<b>Notas del Entrenador</b>", subtitle_style))
            elements.append(rl['Paragraph'](notes, normal_style))
            elements.append(rl['Spacer'](1, 20))
        
        # Footer
        elements.append(rl['Spacer'](1, 30))
        footer_text = f"Generado por {workspace_name} - {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        footer_style = rl['ParagraphStyle'](
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=rl['HexColor']('#999999'),
            alignment=rl['TA_CENTER']
        )
        elements.append(rl['Paragraph'](footer_text, footer_style))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()


# Create a singleton instance
pdf_generator = PDFGeneratorService()
