#backend/routes/weekly.py

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from db import get_db_connection
from datetime import datetime, timedelta
from auth_helpers import validate_device_access
from auth import get_current_user

router = APIRouter(prefix="/api")

@router.get("/weekly-trends")
async def get_weekly_trends(
    weeks: int = Query(15, ge=1, le=20, description="Number of recent weeks to retrieve"),
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection),
):
    """
    Retrieves weekly power usage & cost trends for the last X weeks.
    Defaults to 15 weeks but supports up to 20.
    """
    device_uuid = validate_device_access(device_id, current_user)

    try:
        query = """
        SELECT week, total_energy_week, total_cost_week
        FROM historical_weekly_energy
        WHERE device_id = $1
        ORDER BY week DESC
        LIMIT $2
        """
        result = await db.fetch(query, device_uuid, weeks)
        if not result:
            raise HTTPException(status_code=404, detail="No weekly data available.")
        result.reverse()

        return {
            "weekly_trends": [
                {
                    "week": row["week"].strftime('%Y-%m-%d'),
                    "total_energy_week": float(row["total_energy_week"]),
                    "total_cost_week": float(row["total_cost_week"])
                }
                for row in result
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/weekly-breakdown")
async def get_weekly_breakdown(
    selected_week: str = Query(None, description="Start date of the selected week (YYYY-MM-DD)"),
    unit: str = Query("kWh", description="Toggle between 'kWh' or '£'"),
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection),
):
    """
    Retrieves per-day power usage & cost for a selected week from historical_daily_aggregations.
    Defaults to the most recent available week.
    Supports navigation between weeks using arrows.
    """
    device_uuid = validate_device_access(device_id, current_user)
   
    try:
        # Get the latest available week if no week is selected
        if not selected_week:
            latest_week_query = "SELECT week FROM historical_weekly_energy WHERE device_id = $1 ORDER BY week DESC LIMIT 1"
            latest_entry = await db.fetchrow(latest_week_query, device_uuid)
            if not latest_entry:
                raise HTTPException(status_code=404, detail="No weekly data available.")
            selected_week = latest_entry["week"].strftime('%Y-%m-%d')

        # Convert selected_week to datetime
        try:
            selected_week_dt = datetime.strptime(selected_week, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

        # Define start and end dates for the selected week
        start_date_dt = selected_week_dt
        end_date_dt = start_date_dt + timedelta(days=7)  # Extend by 7 days to ensure full week is included

        # Fetch per-day data for the selected week
        query = """
        SELECT day, total_energy_day, total_cost_day
        FROM historical_daily_energy
        WHERE device_id = $1 AND day >= $2 AND day < $3
        ORDER BY day ASC
        """
        result = await db.fetch(query, device_uuid, start_date_dt, end_date_dt)

        if not result:
            raise HTTPException(status_code=404, detail="No data found for the selected week.")

        # Format response based on the selected unit (kWh or £)
        return {
            "selected_week": {"start_date": start_date_dt.isoformat(), "end_date": (end_date_dt - timedelta(days=1)).isoformat()},
            "weekly_breakdown": [
                {
                    "day": row["day"].strftime('%Y-%m-%d'),
                    "value": float(row["total_energy_day"]) if unit == "kWh" else float(row["total_cost_day"]),
                    "unit": unit
                }
                for row in result
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))