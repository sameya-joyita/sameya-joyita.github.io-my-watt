#backend/routes/current.py
import asyncpg
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from db import get_db_connection
from auth import get_current_user
from auth_helpers import validate_device_access

# Initialize API router with a prefix for endpoints (all routes start with "/api")
router = APIRouter(prefix="/api")

# ----------------------------------------
# Fetch Current Power Usage
# ----------------------------------------
@router.get("/current-usage")
async def get_current_usage(
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Retrieves the latest power usage reading for a specific device.
    Returns the most recent energy consumption value (in kW).
    """
    device_uuid = validate_device_access(device_id, current_user)

    query = """
    SELECT power_kw 
    FROM readings 
    WHERE device_id = $1 
    ORDER BY time DESC 
    LIMIT 1
    """
    result = await db.fetchrow(query, device_uuid)

    # If result exists, return the latest power usage. Otherwise, return None.
    return {"current_usage": result["power_kw"] if result else 0}

# ----------------------------------------
# Fetch Current Energy Rate (£/kWh)
# ----------------------------------------
@router.get("/current-rate")
async def get_current_rate(
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Retrieves the current energy rate from the settings table.
    The current rate is the latest entry where `end_time IS NULL`.
    """
    device_uuid = validate_device_access(device_id, current_user)
    
    query = """
    SELECT value FROM settings
    WHERE device_id = $1 AND name = 'rate' AND end_time IS NULL
    ORDER BY start_time DESC
    LIMIT 1
    """
    result = await db.fetchrow(query, device_uuid)

    # If result exists, return the current rate. Otherwise, return default value.
    return {"rate": result["value"] if result else 0.15}  # Default rate if none is set

# ----------------------------------------
# Fetch Current Voltage Level (V)
# ----------------------------------------
@router.get("/current-voltage")
async def get_current_voltage(
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Retrieves the current voltage level from the settings table.
    The current voltage is the latest entry where `end_time IS NULL`.
    """
    device_uuid = validate_device_access(device_id, current_user)
    
    query = """
    SELECT value FROM settings
    WHERE device_id = $1 AND name = 'voltage' AND end_time IS NULL
    ORDER BY start_time DESC
    LIMIT 1
    """
    result = await db.fetchrow(query, device_uuid)

    # If result exists, return the current voltage. Otherwise, return default value.
    return {"voltage": result["value"] if result else 230}  # Default voltage if none is set