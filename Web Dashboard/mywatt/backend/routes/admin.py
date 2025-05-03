from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg
import uuid
import secrets
import string
from typing import List, Optional
from pydantic import BaseModel

from db import get_db_connection
from auth import get_current_admin, get_password_hash, DeviceCreate

router = APIRouter(prefix="/api/admin")

class DeviceResponse(BaseModel):
    device_id: str
    device_name: str
    created_at: str
    force_password_change: bool

class DeviceWithTempPassword(BaseModel):
    device_id: str
    device_name: str
    temp_password: str

def generate_temp_password(length=12):
    """Generate a secure temporary password"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

@router.post("/devices", response_model=DeviceWithTempPassword)
async def create_device(
    device: DeviceCreate, 
    admin: dict = Depends(get_current_admin),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    # Check if device name already exists
    check_query = "SELECT device_id FROM devices WHERE device_name = $1"
    existing_device = await db.fetchrow(check_query, device.device_name)
    
    if existing_device:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device name already exists"
        )
    
    # Generate a temporary password if none is provided
    temp_password = device.password if device.password else generate_temp_password()
    
    # Create new device
    device_id = uuid.uuid4()
    
    query = """
    INSERT INTO devices (device_id, device_name, password_hash, force_password_change)
    VALUES ($1, $2, $3, $4)
    RETURNING device_id
    """
    
    values = (
        device_id,
        device.device_name,
        get_password_hash(temp_password),
        True  # Force password change on first login
    )
    
    await db.execute(query, *values)
    
    return DeviceWithTempPassword(
        device_id=str(device_id),
        device_name=device.device_name,
        temp_password=temp_password
    )

@router.get("/devices", response_model=List[DeviceResponse])
async def list_devices(
    admin: dict = Depends(get_current_admin),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    query = """
    SELECT device_id, device_name, created_at, force_password_change 
    FROM devices 
    ORDER BY created_at DESC
    """
    
    rows = await db.fetch(query)
    
    devices = []
    for row in rows:
        devices.append(DeviceResponse(
            device_id=str(row["device_id"]),
            device_name=row["device_name"],
            created_at=row["created_at"].isoformat(),
            force_password_change=row["force_password_change"]
        ))
    
    return devices

@router.delete("/devices/{device_id}")
async def delete_device(
    device_id: str,
    admin: dict = Depends(get_current_admin),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    try:
        device_uuid = uuid.UUID(device_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid device ID format"
        )
    
    query = "DELETE FROM devices WHERE device_id = $1 RETURNING device_id"
    result = await db.fetchrow(query, device_uuid)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    return {"message": "Device deleted successfully"}

@router.put("/devices/{device_id}/reset-password")
async def reset_device_password(
    device_id: str,
    admin: dict = Depends(get_current_admin),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    try:
        device_uuid = uuid.UUID(device_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid device ID format"
        )
    
    # Generate new temporary password
    temp_password = generate_temp_password()
    
    # Update device password
    query = """
    UPDATE devices 
    SET password_hash = $1, force_password_change = TRUE 
    WHERE device_id = $2
    RETURNING device_id, device_name
    """
    
    result = await db.fetchrow(query, get_password_hash(temp_password), device_uuid)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    return {
        "device_id": str(result["device_id"]),
        "device_name": result["device_name"],
        "temp_password": temp_password
    }

@router.post("/create-admin")
async def create_admin(
    admin_data: DeviceCreate,  # Reusing DeviceCreate for simplicity
    db: asyncpg.Connection = Depends(get_db_connection)
):
    # This endpoint should only be accessible in development or with proper safeguards
    # Check if any admin exists
    check_query = "SELECT COUNT(*) FROM admins"
    count = await db.fetchval(check_query)
    
    # Only allow creating the first admin or if current user is an admin
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts can only be created by existing admins"
        )
    
    # Create admin account
    query = """
    INSERT INTO admins (username, password_hash)
    VALUES ($1, $2)
    RETURNING admin_id, username
    """
    
    result = await db.fetchrow(
        query, 
        admin_data.device_name,  # Using device_name as username
        get_password_hash(admin_data.password)
    )
    
    return {
        "admin_id": result["admin_id"],
        "username": result["username"]
    }