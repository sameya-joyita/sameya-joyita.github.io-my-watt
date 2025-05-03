from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import Optional, Union
import uuid
from db import get_db_connection
import asyncpg

# Security configurations
SECRET_KEY = "YOUR_SECRET_KEY_HERE"  # Replace with a secure secret key in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user_type: str
    user_id: str
    force_password_change: bool = False

class TokenData(BaseModel):
    id: Optional[str] = None
    user_type: Optional[str] = None

class DeviceBase(BaseModel):
    device_name: str

class DeviceCreate(DeviceBase):
    password: str

class Device(DeviceBase):
    device_id: uuid.UUID
    force_password_change: bool

class AdminBase(BaseModel):
    username: str

class AdminCreate(AdminBase):
    password: str

class Admin(AdminBase):
    admin_id: int

class UserLogin(BaseModel):
    username: str
    password: str
    is_admin: bool = False

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# Authentication functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def authenticate_user(username: str, password: str, is_admin: bool, db: asyncpg.Connection):
    if is_admin:
        query = "SELECT admin_id, username, password_hash FROM admins WHERE username = $1"
        user = await db.fetchrow(query, username)
        if not user:
            return False
        if not verify_password(password, user["password_hash"]):
            return False
        return {"id": user["admin_id"], "username": user["username"], "user_type": "admin", "force_password_change": False}
    else:
        # Try with device_id if it's a valid UUID
        try:
            device_id = uuid.UUID(username)
            query = "SELECT device_id, device_name, password_hash, force_password_change FROM devices WHERE device_id = $1"
            user = await db.fetchrow(query, device_id)
        except ValueError:
            # If not a valid UUID, try with device_name
            query = "SELECT device_id, device_name, password_hash, force_password_change FROM devices WHERE device_name = $1"
            user = await db.fetchrow(query, username)
        
        if not user:
            return False
        if not verify_password(password, user["password_hash"]):
            return False
        return {
            "id": str(user["device_id"]), 
            "username": user["device_name"], 
            "user_type": "device",
            "force_password_change": user["force_password_change"]
        }

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: asyncpg.Connection = Depends(get_db_connection)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("user_type")
        if user_id is None or user_type is None:
            raise credentials_exception
        token_data = TokenData(id=user_id, user_type=user_type)
    except JWTError:
        raise credentials_exception
    
    if token_data.user_type == "admin":
        query = "SELECT admin_id, username FROM admins WHERE admin_id = $1"
        user = await db.fetchrow(query, int(token_data.id))
        if user is None:
            raise credentials_exception
        return {"id": user["admin_id"], "username": user["username"], "user_type": "admin"}
    else:
        query = "SELECT device_id, device_name, force_password_change FROM devices WHERE device_id = $1"
        user = await db.fetchrow(query, uuid.UUID(token_data.id))
        if user is None:
            raise credentials_exception
        return {
            "id": str(user["device_id"]), 
            "username": user["device_name"], 
            "user_type": "device",
            "force_password_change": user["force_password_change"]
        }

async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return current_user