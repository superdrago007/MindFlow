from pydantic import BaseModel

class MetaDataResponse(BaseModel):
    Total_Notes: int = 0
    Total_Tags: int = 0
    Total_Connections: int = 0

