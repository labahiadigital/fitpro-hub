"""Client feedback and emotions models."""
from sqlalchemy import Column, String, Text, ForeignKey, Integer, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ClientFeedback(BaseModel):
    """
    Feedback from client about specific exercises, meals, workouts, or diet plans.
    feedback_type: 'exercise', 'meal', 'workout', 'diet'
    """
    
    __tablename__ = "client_feedback"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Type of feedback: 'exercise', 'meal', 'workout_program', 'meal_plan'
    feedback_type = Column(String(50), nullable=False)
    
    # Reference to the specific item (exercise_id, food_id, program_id, meal_plan_id)
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    reference_name = Column(Text, nullable=True)  # Store name for display purposes
    
    # Rating (1-5 stars)
    rating = Column(Integer, nullable=True)
    
    # Detailed feedback
    comment = Column(Text, nullable=True)
    
    # For specific context (e.g., date of workout, meal name)
    context = Column(JSONB, default={})
    # Example context:
    # For exercise: {"workout_date": "2026-01-26", "difficulty_felt": "too_easy|just_right|too_hard"}
    # For meal: {"meal_date": "2026-01-26", "meal_name": "Desayuno", "taste": "good", "satiety": "satisfied"}
    # For workout_program: {"week": 2, "overall_satisfaction": 4}
    # For meal_plan: {"day": 3, "adherence": "partial"}
    
    # Relationships
    client = relationship("Client")
    
    def __repr__(self):
        return f"<ClientFeedback type={self.feedback_type} rating={self.rating}>"


class ClientWorkoutFeedback(BaseModel):
    """
    Overall feedback/rating for a complete workout program.
    Similar to Harbiz rating system.
    """
    
    __tablename__ = "client_workout_feedback"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    program_id = Column(UUID(as_uuid=True), ForeignKey("workout_programs.id", ondelete="CASCADE"), nullable=False)
    
    # Overall rating (1-5)
    overall_rating = Column(Integer, nullable=False)
    
    # Detailed ratings
    difficulty_rating = Column(Integer, nullable=True)  # 1=too easy, 5=too hard
    enjoyment_rating = Column(Integer, nullable=True)   # 1-5
    effectiveness_rating = Column(Integer, nullable=True)  # 1-5
    
    # Written feedback
    what_liked = Column(Text, nullable=True)
    what_improve = Column(Text, nullable=True)
    general_comment = Column(Text, nullable=True)
    
    # Relationships
    client = relationship("Client")
    program = relationship("WorkoutProgram")
    
    def __repr__(self):
        return f"<ClientWorkoutFeedback rating={self.overall_rating}>"


class ClientDietFeedback(BaseModel):
    """
    Overall feedback/rating for a complete meal plan / diet.
    Similar to Harbiz rating system.
    """
    
    __tablename__ = "client_diet_feedback"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    meal_plan_id = Column(UUID(as_uuid=True), ForeignKey("meal_plans.id", ondelete="CASCADE"), nullable=False)
    
    # Overall rating (1-5)
    overall_rating = Column(Integer, nullable=False)
    
    # Detailed ratings
    taste_rating = Column(Integer, nullable=True)  # 1-5 how tasty
    satiety_rating = Column(Integer, nullable=True)  # 1-5 feeling full
    variety_rating = Column(Integer, nullable=True)  # 1-5 variety of foods
    practicality_rating = Column(Integer, nullable=True)  # 1-5 easy to follow
    
    # Written feedback
    favorite_meals = Column(Text, nullable=True)
    disliked_meals = Column(Text, nullable=True)
    general_comment = Column(Text, nullable=True)
    
    # Adherence percentage (0-100)
    adherence_percentage = Column(Integer, nullable=True)
    
    # Relationships
    client = relationship("Client")
    meal_plan = relationship("MealPlan")
    
    def __repr__(self):
        return f"<ClientDietFeedback rating={self.overall_rating}>"


class ClientEmotion(BaseModel):
    """
    Daily emotion/mood tracking for clients.
    Inspired by Traineeks emotion tracking feature.
    """
    
    __tablename__ = "client_emotions"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Date of the emotion log
    emotion_date = Column(Date, nullable=False, index=True)
    
    # Overall mood (1-5 or emoji-based)
    # 1 = very bad, 2 = bad, 3 = neutral, 4 = good, 5 = very good
    mood_level = Column(Integer, nullable=False)
    
    # Specific emotions felt (multiple select)
    # e.g., ["motivated", "tired", "stressed", "happy", "anxious", "energetic"]
    emotions = Column(JSONB, default=[])
    
    # Energy level (1-5)
    energy_level = Column(Integer, nullable=True)
    
    # Sleep quality last night (1-5)
    sleep_quality = Column(Integer, nullable=True)
    
    # Stress level (1-5)
    stress_level = Column(Integer, nullable=True)
    
    # Additional notes
    notes = Column(Text, nullable=True)
    
    # Context - what might have affected the mood
    context = Column(JSONB, default={})
    # Example: {"had_workout": true, "slept_hours": 7, "meals_followed": true}
    
    # Relationships
    client = relationship("Client")
    
    def __repr__(self):
        return f"<ClientEmotion date={self.emotion_date} mood={self.mood_level}>"
