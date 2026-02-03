from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str

class UserInDB(BaseModel):
    id: Optional[str]
    full_name: str
    email: EmailStr
    hashed_password: str
    role: str
    active: bool = True
