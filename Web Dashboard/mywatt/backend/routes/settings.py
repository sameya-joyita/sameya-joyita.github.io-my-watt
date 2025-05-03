from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from datetime import datetime
from db import get_db_connection
from auth_helpers import validate_device_access
from auth import get_current_user

router = APIRouter(prefix="/api")

@router.put("/update-rate")
async def update_rate(
    request_data: dict,
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Updates the energy rate for the logged-in device.
    - Closes the previous rate entry (`end_time`).
    - Inserts a new rate with `start_time` and `end_time` as NULL.
    """
    device_id = request_data.get("device_id")
    new_rate = request_data.get("new_rate")

    if not device_id or new_rate is None:
        raise HTTPException(status_code=400, detail="Missing device_id or new_rate.")

    device_uuid = validate_device_access(device_id, current_user)
    current_time = datetime.now()

    try:
        async with db.transaction():
            # Close previous rate (set end_time)
            update_old_rate_query = """
            UPDATE settings
            SET end_time = $1
            WHERE name = 'rate' AND device_id = $2 AND end_time IS NULL
            """
            await db.execute(update_old_rate_query, current_time, device_uuid)

            # Insert new rate entry
            insert_new_rate_query = """
            INSERT INTO settings (device_id, name, value, start_time, end_time)
            VALUES ($1, 'rate', $2, $3, NULL)
            """
            await db.execute(insert_new_rate_query, device_uuid, new_rate, current_time)

        return {
            "message": "Rate updated successfully.",
            "new_rate": new_rate,
            "device_id": str(device_uuid),
            "start_time": current_time.isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))