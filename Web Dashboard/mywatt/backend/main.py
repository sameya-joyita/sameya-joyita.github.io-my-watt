from fastapi import FastAPI
from routes import current, daily, settings, weekly, monthly, yearly, auth, admin
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
# Add CORS middleware to allow requests from your frontend
origins = [
    "http://localhost:3000",  # React frontend
    "http://127.0.0.1:8000",  # FastAPI backend (in case needed to call the backend from itself)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)
# Include route for readings
app.include_router(current.router)
app.include_router(daily.router)
app.include_router(monthly.router)
app.include_router(weekly.router)
app.include_router(yearly.router)
app.include_router(settings.router)
# Add authentication routes
app.include_router(auth.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "Backend is working!"}




