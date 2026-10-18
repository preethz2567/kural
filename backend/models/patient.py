from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class StageEnum(str, Enum):
    early = "early"
    mid = "mid"
    late = "late"
    unknown = "unknown"

class Relationship(BaseModel):
    name: str
    relation: str
    status: str = "living"
    notes: Optional[str] = ""

class Preferences(BaseModel):
    likes: List[str] = []
    dislikes: List[str] = []

class Patient(BaseModel):
    patient_id: str
    name: str
    preferred_name: Optional[str] = None
    other_nicknames: List[str] = []
    stage: StageEnum = StageEnum.unknown
    age_range: Optional[str] = None
    preferred_address: Optional[str] = None
    language: Optional[str] = "English"
    communication_style: Optional[str] = "gentle"
    calming_strategies: List[str] = []
    caregiver_notes: Optional[str] = None
    profession: Optional[str] = None
    places_lived: List[str] = []
    education: List[str] = []
    relationships: List[Relationship] = []
    significant_events: List[str] = []
    preferences: Preferences = Field(default_factory=Preferences)
    cherished_memories: List[str] = []

