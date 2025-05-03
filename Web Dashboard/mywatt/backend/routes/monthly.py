#backend/routes/monthly.py
import asyncpg
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from db import get_db_connection
from datetime import datetime, timedelta
from auth import get_current_user
from auth_helpers import validate_device_access

router = APIRouter(prefix="/api")

@router.get("/monthly-billing-history")
async def get_billing_history(
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection)
    ):
    """
    Retrieves the total energy cost for the last 3 months from historical_monthly_energy.
    """
    device_uuid = validate_device_access(device_id, current_user)

    try:
        query = """
        SELECT month, total_cost_month
        FROM historical_monthly_energy
        WHERE device_id = $1    
        ORDER BY month DESC
        LIMIT 3
        """
        result = await db.fetch(query, device_uuid)
        result.reverse()
        # Format the response properly if data exists
        return {
            "billing_history": [
                {"month": row["month"], "total_cost": float(row["total_cost_month"])}
                for row in result
            ] if result else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monthly-trends")
async def get_monthly_trends(
    months: int = Query(12, ge=1, le=24, description="Number of recent months to retrieve"),
    current_user: dict = Depends(get_current_user),
    device_id: str = Query(None),
    db: asyncpg.Connection = Depends(get_db_connection),
):
    """
    Retrieves monthly power usage & cost trends for the last X months.
    Defaults to 12 months but supports up to 24 months.
    """
    device_uuid = validate_device_access(device_id, current_user)

    try:
        query = """
        SELECT month, total_energy_month, total_cost_month
        FROM historical_monthly_energy
        WHERE device_id = $1    
        ORDER BY month DESC
        LIMIT $2
        """
        result = await db.fetch(query, device_uuid, months)

        if not result:
            raise HTTPException(status_code=404, detail="No monthly data available.")

        # Format response for frontend
        return {
            "monthly_trends": [
                {
                    "month": row["month"].strftime('%Y-%m'),
                    "total_energy_month": float(row["total_energy_month"]),
                    "total_cost_month": float(row["total_cost_month"])
                }
                for row in result
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.get("/monthly-breakdown")
async def get_monthly_breakdown(
    selected_month: str = Query(None, description="Selected month (YYYY-MM)"),
    unit: str = Query("kWh", description="Toggle between 'kWh' or '£'"),
    device_id: str = Query(None),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection),
):
    """
    Retrieves per-day power usage & cost for a selected month from historical_daily_aggregations.
    Defaults to the most recent available month.
    """
    device_uuid = validate_device_access(device_id, current_user)

    try:
        # Get the latest available month if none is selected
        if not selected_month:
            latest_month_query = "SELECT month FROM historical_monthly_energy WHERE device_id = $1 ORDER BY month DESC LIMIT 1"
            latest_entry = await db.fetchrow(latest_month_query, device_uuid)
            if not latest_entry:
                raise HTTPException(status_code=404, detail="No monthly data available.")
            selected_month = latest_entry["month"].strftime('%Y-%m')

        # Convert selected_month to datetime format
        try:
            selected_month_dt = datetime.strptime(selected_month, "%Y-%m")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid format. Use YYYY-MM.")

        # Define start and end dates for the selected month
        start_date_dt = selected_month_dt.replace(day=1)
        end_date_dt = (selected_month_dt.replace(day=28) + timedelta(days=4)).replace(day=1)  # First day of next month

        # Fetch per-day data for the selected month
        query = """
        SELECT day, total_energy_day, total_cost_day
        FROM historical_daily_energy
        WHERE device_id = $1 AND day >= $2 AND day < $3
        ORDER BY day ASC
        """
        result = await db.fetch(query, device_uuid, start_date_dt, end_date_dt)

        if not result:
            raise HTTPException(status_code=404, detail="No data found for the selected month.")

        # Calculate total cost for the selected month
        total_cost_query = """
        SELECT SUM(total_cost_day) AS total_month_cost
        FROM historical_daily_energy
        WHERE device_id = $1 AND day >= $2 AND day < $3
        """
        total_cost_result = await db.fetchrow(total_cost_query, device_uuid, start_date_dt, end_date_dt)

        total_month_cost = float(total_cost_result["total_month_cost"]) if total_cost_result else 0.0

        return {
            "selected_month": selected_month,
            "total_month_cost": total_month_cost,
            "monthly_breakdown": [
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