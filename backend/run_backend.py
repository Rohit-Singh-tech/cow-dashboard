import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)
os.environ["PYTHONPATH"] = backend_dir

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("==================================================================")
    print(" Starting Cow Health Monitoring System - FastAPI Backend API   ")
    print("==================================================================")
    print(" Listening on: http://localhost:8000")
    print(" OpenAPI Docs: http://localhost:8000/docs")
    print("==================================================================")
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
