from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
# Import the existing pipeline logic
from run_pipeline import run_research, BASE_PATH, clean_folder_name 

app = FastAPI()

# Enhanced CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local development
    allow_credentials=True,
    allow_methods=["*"],  # Allows POST, OPTIONS, etc.
    allow_headers=["*"],  # Allows Content-Type, Authorization, etc.
)

class ResearchRequest(BaseModel):
    query: str

@app.post("/api/research")
async def start_research(request: ResearchRequest):
    try:
        # Trigger the autonomous research process
        run_research(request.query)
        
        # Determine the directory based on the query sanitization logic
        folder_name = clean_folder_name(request.query)
        folder_path = os.path.join(BASE_PATH, folder_name)
        
        # Load the outputs from the specialized agents
        report_path = os.path.join(folder_path, "final_report.json")
        tasks_path = os.path.join(folder_path, "tasks.json")
        synthesis_path = os.path.join(folder_path, "synthesis_results.json")

        if not os.path.exists(report_path):
            raise HTTPException(status_code=500, detail="Research pipeline failed to generate results.")

        with open(report_path, "r") as f:
            report_data = json.load(f)
        with open(tasks_path, "r") as f:
            tasks_data = json.load(f)
        with open(synthesis_path, "r") as f:
            synthesis_data = json.load(f)

        return {
            "tasks": tasks_data,
            "synthesis": synthesis_data,
            "report": report_data
        }
    except Exception as e:
        print(f"Error during research: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run the server on the expected port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)