from pydantic import BaseModel

class CheckInRequest(BaseModel):
    user_id: str
    status: str  # เช่น 'available', 'charging', 'out_of_order'