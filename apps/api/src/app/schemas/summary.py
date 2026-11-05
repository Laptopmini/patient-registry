from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models import BloodType


class SummaryOut(BaseModel):
    patient_id: UUID
    name: str
    age: int
    blood_type: BloodType
    conditions: list[str]
    allergies: list[str]
    narrative: str
    provider: str
    note_count: int
    generated_at: datetime
