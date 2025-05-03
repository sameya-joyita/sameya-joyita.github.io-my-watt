#backend/routes/yearly.py

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from db import get_db_connection
from datetime import datetime
from auth_helpers import validate_device_access 
from auth import get_current_user

router = APIRouter(prefix="/api")

@router.get("/yearly-trends")
async def get_yearly_trends(
    device_id: str = Query(None),
    years: int = Query(10, ge=1, le=20),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    """ Retrieves yearly energy usage & cost trends for the logged-in device. """

    device_uuid = validate_device_access(device_id, current_user)

    query = """
    SELECT year, total_energy_year, total_cost_year
    FROM historical_yearly_energy
    WHERE device_id = $1
    ORDER BY year ASC
    LIMIT $2
    """
    result = await db.fetch(query, device_uuid, years)

    if not result:
        raise HTTPException(status_code=404, detail="No yearly data available.")

    return {
        "yearly_trends": [
            {
                "year": row["year"].strftime('%Y'),
                "total_energy_year": float(row["total_energy_year"]),
                "total_cost_year": float(row["total_cost_year"])
            }
            for row in result
        ]
    }

@router.get("/yearly-breakdown")
async def get_yearly_breakdown(
    device_id: str = Query(None),
    selected_year: str = Query(None),
    unit: str = Query("kWh"),
    current_user: dict = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db_connection)
):
    """ Retrieves per-month energy usage & cost for the logged-in device in a selected year. """

    device_uuid = validate_device_access(device_id, current_user)

    if not selected_year:
        latest_year_query = """
        SELECT year FROM historical_yearly_energy WHERE device_id = $1 ORDER BY year DESC LIMIT 1
        """
        latest_entry = await db.fetchrow(latest_year_query, device_uuid)
        if not latest_entry:
            raise HTTPException(status_code=404, detail="No yearly data available.")
        selected_year = latest_entry["year"].strftime('%Y')

    try:
        selected_year_dt = datetime.strptime(selected_year, "%Y")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid format. Use YYYY.")

    query = """
    SELECT month, total_energy_month, total_cost_month
    FROM historical_monthly_energy
    WHERE device_id = $1 AND EXTRACT(YEAR FROM month) = $2
    ORDER BY month ASC
    """
    result = await db.fetch(query, device_uuid, int(selected_year))

    if not result:
        raise HTTPException(status_code=404, detail="No data found for the selected year.")

    total_cost_query = """
    SELECT SUM(total_cost_month) AS total_year_cost
    FROM historical_monthly_energy
    WHERE device_id = $1 AND EXTRACT(YEAR FROM month) = $2
    """
    total_cost_result = await db.fetchrow(total_cost_query, device_uuid, int(selected_year))

    total_year_cost = float(total_cost_result["total_year_cost"]) if total_cost_result else 0.0

    return {
        "selected_year": selected_year,
        "total_year_cost": total_year_cost,
        "yearly_breakdown": [
            {
                "month": row["month"].strftime('%Y-%m'),
                "value": float(row["total_energy_month"]) if unit == "kWh" else float(row["total_cost_month"]),
                "unit": unit
            }
            for row in result
        ]
    }