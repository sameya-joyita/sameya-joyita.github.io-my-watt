import uuid
from fastapi import HTTPException

def validate_device_access(device_id: str, current_user: dict):
    """ Ensures only authenticated devices can access their own data. """
    
    if not device_id:
        if current_user["user_type"] == "device":
            device_id = current_user["id"]
        else:
            raise HTTPException(status_code=400, detail="device_id is required for admin users")

    try:
        device_uuid = uuid.UUID(device_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid device ID format")

    if current_user["user_type"] == "device" and current_user["id"] != device_id:
        raise HTTPException(status_code=403, detail="Access denied to this device data")

    return device_uuid


