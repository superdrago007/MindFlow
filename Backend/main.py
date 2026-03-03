#This file is only for local execution

import os
from dotenv import load_dotenv
import uvicorn

load_dotenv()

if __name__ == "__main__":
    host = os.getenv("SERVER_HOST", "127.0.0.1")
    port = int(os.getenv("SERVER_PORT", "8000"))
    reload = os.getenv("RELOAD", "True").lower() == "true"
    uvicorn.run("app.Main_router:app", host=host, port=port, reload=reload)