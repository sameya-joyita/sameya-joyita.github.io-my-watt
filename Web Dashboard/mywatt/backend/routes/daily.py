#backend/routes/daily.py
import asyncpg
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from db import get_db_connection
from datetime import datetime, timezone, timedelta
from auth import get_current_user
from auth_helpers import validate_device_access

router = APIRouter(prefix="/api")

@router.get("/today-usage")
async def get_today_usage(
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Retrieves the total energy used today for a specific device.
    """
    device_uuid = validate_device_access(device_id, current_user)

   # Get UTC date range for today 
    utc_now = datetime.now(timezone.utc) 
    utc_today_start = utc_now.replace(hour=0, minute=0, second=0, microsecond=0) 
    utc_today_end = utc_today_start + timedelta(days=1)
    
    # Query the daily aggregations for today
    query = """
    SELECT total_energy_day, total_cost_day
    FROM daily_aggregations
    WHERE device_id = $1 AND day >= $2 AND day < $3
    """
   
    result = await db.fetch(query, device_uuid, utc_today_start, utc_today_end)  # Fetch multiple rows

    if result:
        record = result[0]  # Get the first record
        return {
            "total_energy_day": float(record["total_energy_day"]),
            "total_cost_day": float(record["total_cost_day"])
        }
    else:
        return {
            "total_energy_day": 0.000,
            "total_cost_day": 0.000
        }

@router.get("/daily-trends")
async def get_daily_trends(
    days: int = 30,
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Retrieves the daily usage and cost trends for the last X days.
    """
    device_uuid = validate_device_access(device_id, current_user)

    # Calculate the start date (X days ago)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    
    # Query the daily aggregations for the specified range
    query = """
    SELECT 
        day,
        total_energy_day,
        total_cost_day
    FROM daily_aggregations
    WHERE device_id = $1 AND day BETWEEN $2 AND $3
    ORDER BY day
    """
    
    rows = await db.fetch(query, device_uuid, start_date, end_date)
    
    daily_trends = []
    for row in rows:
        daily_trends.append({
            "day": row["day"].strftime("%Y-%m-%d"),
            "total_energy_day": row["total_energy_day"],
            "total_cost_day": row["total_cost_day"]
        })
    
    return {"daily_trends": daily_trends}

    
############## Daily Tab#######################
@router.get("/hourly-usage")
async def get_hourly_usage(
    selected_day: str = Query(None, description="Selected date (YYYY-MM-DD)"),
    unit: str = Query("kWh", description="Toggle between 'kWh' or '£'"),
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection),
):
    """
    Retrieves hourly power usage & cost from historical_hourly_energy for a selected day.
    Defaults to the latest available day in the table if no date is provided.
    Supports toggling between kWh and £.
    """
    device_uuid = validate_device_access(device_id, current_user)
    
    try:
        # Fetch the latest available day if no date is provided
        if not selected_day:
            latest_query = "SELECT hour FROM historical_hourly_energy WHERE device_id = $1 ORDER BY hour DESC LIMIT 1"
            latest_entry = await db.fetchrow(latest_query,device_uuid)
            if not latest_entry:
                raise HTTPException(status_code=404, detail="No data available in the database.")
            selected_day = latest_entry["hour"].strftime('%Y-%m-%d')  # Convert to string format

        # Ensure selected_day stays as a string
        try:
            selected_day_dt = datetime.strptime(selected_day, "%Y-%m-%d")  # Convert string to datetime object
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

        # Fetch all hourly entries for the selected day
        query = """
        SELECT hour, total_energy_hour, total_cost_hour
        FROM historical_hourly_energy
        WHERE device_id = $1 AND hour >= $2 AND hour < $3
        ORDER BY hour ASC
        """
        next_day_dt = selected_day_dt.replace(hour=0, minute=0, second=0) + timedelta(days=1)  # Next day's midnight
        result = await db.fetch(query, device_uuid, selected_day_dt, next_day_dt)
        if not result:
            raise HTTPException(status_code=404, detail="No data found for the selected day.")

        # Format response based on the selected unit (kWh or £)
        return {
            "selected_day": selected_day,
            "hourly_usage": [
                {
                    "hour": row["hour"].strftime('%H:%M'),
                    "value": float(row["total_energy_hour"]) if unit == "kWh" else float(row["total_cost_hour"]),
                    "unit": unit
                }
                for row in result
            ]
        }if result else {"hourly_usage": []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/daily-range-usage")
async def get_daily_usage_range(
    start_date: str = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date (YYYY-MM-DD)"),
    unit: str = Query("kWh", description="Toggle between 'kWh' or '£'"),
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection),
):
    """
    Retrieves daily power usage & cost for a selected date range from historical_daily_energy.
    Defaults to the last 7 days if no range is provided.
    Supports toggling between kWh and £.
    """
    device_uuid = validate_device_access(device_id, current_user)

    # Set default range to last 7 days if no dates are provided
    if not end_date:
        end_date_dt = datetime.now().date()
    else:
        end_date_dt = datetime.strptime(end_date, "%Y-%m-%d").date()

    if not start_date:
        start_date_dt = end_date_dt - timedelta(days=7)
    else:
        start_date_dt = datetime.strptime(start_date, "%Y-%m-%d").date()

    # Fetch data within the selected date range
    query = """
    SELECT day, total_energy_day, total_cost_day
    FROM historical_daily_energy
    WHERE device_id = $1 AND day BETWEEN $2 AND $3
    ORDER BY day ASC
    """
    result = await db.fetch(query, device_uuid, start_date_dt, end_date_dt)

    if not result:
        raise HTTPException(status_code=404, detail="No data found for the selected date range.")

    # Format response based on the selected unit (kWh or £)
    return {
        "selected_range": {"start_date": start_date_dt.isoformat(), "end_date": end_date_dt.isoformat()},
        "daily_usage": [
            {
                "day": row["day"].strftime('%Y-%m-%d'),
                "value": float(row["total_energy_day"]) if unit == "kWh" else float(row["total_cost_day"]),
                "unit": unit
            }
            for row in result
        ]
    }if result else {"daily_usage": []}

    

@router.get("/total-cost-day-range")
async def get_total_cost_day_range(
    start_date: str = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date (YYYY-MM-DD)"),
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection),
):
    """
    Retrieves the total cost for a selected date range from historical_daily_energy.
    Defaults to the last 7 days if no range is provided.
    """
    device_uuid = validate_device_access(device_id, current_user)

    try:
        # Set default range to last 7 days if no dates are provided
        if not end_date:
            end_date_dt = datetime.now().date()  # Using recommended datetime method
        else:
            end_date_dt = datetime.strptime(end_date, "%Y-%m-%d").date()

        if not start_date:
            start_date_dt = end_date_dt - timedelta(days=7)
        else:
            start_date_dt = datetime.strptime(start_date, "%Y-%m-%d").date()

        # Fetch total cost within the selected date range
        query = """
        SELECT SUM(total_cost_day) AS total_cost
        FROM historical_daily_energy
        WHERE device_id = $1 AND day BETWEEN $2 AND $3
        """
        result = await db.fetchrow(query,device_uuid, start_date_dt, end_date_dt)

        if not result or result["total_cost"] is None:
            return {"total_cost": 0.0, "selected_range": {"start_date": start_date_dt.isoformat(), "end_date": end_date_dt.isoformat()}}

        # Return formatted total cost for the selected range
        return {
            "total_cost": float(result["total_cost"]),
            "selected_range": {"start_date": start_date_dt.isoformat(), "end_date": end_date_dt.isoformat()}
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))