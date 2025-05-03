import asyncpg
import os

#DATABASE_URL = os.getenv("DATABASE_URL")  # Add this in a .env file later
DATABASE_URL = "postgresql://SmartWattDB_owner:npg_soyA59YWQcEa@ep-yellow-snow-abhym1ma-pooler.eu-west-2.aws.neon.tech/SmartWattDB?sslmode=require"

async def get_db_connection():
    return await asyncpg.connect(DATABASE_URL)