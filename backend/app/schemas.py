from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    openai_api_key: Optional[str] = None

class UserInDB(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class User(UserInDB):
    pass

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Transcription schemas (updated with user relationship)
class TranscriptionBase(BaseModel):
    filename: str

class TranscriptionCreate(TranscriptionBase):
    original_text: str
    duration: Optional[float] = None
    file_size: Optional[int] = None
    language: Optional[str] = None

class TranscriptionUpdate(BaseModel):
    filename: Optional[str] = None
    summary: Optional[str] = None
    tags: Optional[List[str]] = None

class TranscriptionInDB(TranscriptionBase):
    id: int
    user_id: int
    original_text: str
    summary: Optional[str] = None
    duration: Optional[float] = None
    file_size: Optional[int] = None
    language: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class Transcription(TranscriptionInDB):
    pass

# Login schema
class UserLogin(BaseModel):
    email: EmailStr
    password: str