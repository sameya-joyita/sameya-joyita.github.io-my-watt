from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import List
import asyncpg
import uuid
from datetime import timedelta

from db import get_db_connection
from auth import (
    authenticate_user, create_access_token, get_password_hash, 
    Token, DeviceCreate, AdminCreate, UserLogin, PasswordChange,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user, get_current_admin,
    verify_password
)

router = APIRouter(prefix="/api/auth")

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: asyncpg.Connection = Depends(get_db_connection)):
    # Determine if this is an admin login by checking the username prefix
    is_admin = form_data.username.startswith("admin:")
    
    # Extract the actual username (remove admin: prefix if present)
    username = form_data.username[6:] if is_admin else form_data.username
    
    user = await authenticate_user(username, form_data.password, is_admin, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["id"]), "user_type": user["user_type"]}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_type": user["user_type"],
        "user_id": str(user["id"]),
        "force_password_change": user.get("force_password_change", False)
    }

@router.post("/login")
async def login(user_data: UserLogin, db: asyncpg.Connection = Depends(get_db_connection)):
    user = await authenticate_user(user_data.username, user_data.password, user_data.is_admin, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["id"]), "user_type": user["user_type"]}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_type": user["user_type"],
        "user_id": str(user["id"]),
        "force_password_change": user.get("force_password_change", False)
    }

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    if current_user["user_type"] == "admin":
        query = "SELECT password_hash FROM admins WHERE admin_id = $1"
        user_record = await db.fetchrow(query, current_user["id"])
        
        if not verify_password(password_data.current_password, user_record["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        update_query = "UPDATE admins SET password_hash = $1 WHERE admin_id = $2"
        await db.execute(update_query, get_password_hash(password_data.new_password), current_user["id"])
    else:
        # Device user
        query = "SELECT password_hash FROM devices WHERE device_id = $1"
        user_record = await db.fetchrow(query, uuid.UUID(current_user["id"]))
        
        if not verify_password(password_data.current_password, user_record["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        update_query = "UPDATE devices SET password_hash = $1, force_password_change = FALSE WHERE device_id = $2"
        await db.execute(
            update_query, 
            get_password_hash(password_data.new_password), 
            uuid.UUID(current_user["id"])
        )
    
    return {"message": "Password updated successfully"}

@router.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user