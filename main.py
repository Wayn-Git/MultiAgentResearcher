from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import json
import asyncio
import re

from run_pipeline import BASE_PATH, clean_folder_name
from agents.task_agent import generate_tasks
from agents.retrieval_agent import retrieve
from agents.synthesis_agent import synthesize
from agents.critic_agent import run_critic_refinement
from agents.cross_synthesis_agent import run_cross_synthesis
from agents.gap_agent import detect_gaps
from agents.report_agent import generate_report
from utils.llm_utils import call_with_retry
from utils.config import CHAT_MODEL

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    query: str


class ChatRequest(BaseModel):
    message: str
    folder_id: str
    history: list = []
    session_data: dict = None


def prettify_folder_name(folder: str) -> str:
    return folder.replace("_", " ").title()


def load_folder_data(folder_path: str) -> dict:
    """Load all JSON files from a research folder."""
    file_map = {
        "tasks": "tasks.json",
        "retrieval": "retrieval_results.json",
        "synthesis": "synthesis_results.json",
        "critique": "critique_log.json",
        "refined_synthesis": "refined_synthesis_results.json",
        "cross_synthesis": "cross_synthesis.json",
        "gaps": "gap_results.json",
        "report": "final_report.json",
    }
    result = {}
    for key, fname in file_map.items():
        fpath = os.path.join(folder_path, fname)
        if os.path.exists(fpath):
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    result[key] = json.load(f)
            except Exception:
                result[key] = None
        else:
            result[key] = None
    return result


# ─── Sync research endpoint ───────────────────────────────────────────────────


@app.post("/api/research")
async def start_research(request: ResearchRequest):
    """Run the full research pipeline synchronously and return all data."""
    try:
        from run_pipeline import run_research

        run_research(request.query)

        folder_name = clean_folder_name(request.query)
        folder_path = os.path.join(BASE_PATH, folder_name)

        report_path = os.path.join(folder_path, "final_report.json")
        if not os.path.exists(report_path):
            raise HTTPException(
                status_code=500, detail="Pipeline failed to generate results."
            )

        return load_folder_data(folder_path)

    except Exception as e:
        print(f"[api] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── History endpoints ────────────────────────────────────────────────────────


@app.get("/api/history")
async def list_history():
    sessions = []
    if not os.path.exists(BASE_PATH):
        return {"sessions": []}

    for folder in sorted(os.listdir(BASE_PATH)):
        folder_path = os.path.join(BASE_PATH, folder)
        if not os.path.isdir(folder_path):
            continue
        sessions.append(
            {
                "id": folder,
                "title": prettify_folder_name(folder),
                "has_report": os.path.exists(
                    os.path.join(folder_path, "final_report.json")
                ),
                "has_refined": os.path.exists(
                    os.path.join(folder_path, "refined_synthesis_results.json")
                ),
                "has_data": os.path.exists(os.path.join(folder_path, "tasks.json")),
            }
        )

    return {"sessions": sessions}


@app.get("/api/history/{folder}")
async def get_history_session(folder: str):
    folder = re.sub(r"[^a-zA-Z0-9_\-]", "", folder)
    folder_path = os.path.join(BASE_PATH, folder)

    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=404, detail=f"Session '{folder}' not found.")

    data = load_folder_data(folder_path)
    data["folder"] = folder
    data["title"] = prettify_folder_name(folder)
    return data


# ─── Streaming research endpoint ──────────────────────────────────────────────


@app.post("/api/research/stream")
async def stream_research(request: ResearchRequest):
    """
    Run the full 7-step pipeline, streaming SSE events to the client.

    Event shape: { "step": str, "status": "running" | "done" | "failed", "data": any }

    Steps emitted:
      task → retrieval → synthesis → critic → cross_synthesis → gap → report → complete
    """

    def send_event(step: str, status: str, data=None) -> str:
        payload = json.dumps({"step": step, "status": status, "data": data})
        return f"data: {payload}\n\n"

    def run_sync(fn):
        loop = asyncio.get_event_loop()
        return loop.run_in_executor(None, fn)

    async def pipeline_generator():
        query = request.query.strip()
        if not query:
            yield send_event("error", "failed", {"message": "Query cannot be empty."})
            return

        folder_name = clean_folder_name(query)
        folder_path = os.path.join(BASE_PATH, folder_name)
        os.makedirs(folder_path, exist_ok=True)

        try:
            # ── Step 1: Task Generation ──────────────────────────────────────
            yield send_event("task", "running", None)
            await asyncio.sleep(0)

            tasks_path = await run_sync(
                lambda: generate_tasks(
                    query, research_context="Starting fresh research"
                )
            )
            if not tasks_path or not os.path.exists(tasks_path):
                yield send_event(
                    "task", "failed", {"message": "Task generation failed."}
                )
                return

            with open(tasks_path, "r", encoding="utf-8") as f:
                tasks_data = json.load(f)
            yield send_event("task", "done", tasks_data)

            # ── Step 2: Retrieval ────────────────────────────────────────────
            yield send_event("retrieval", "running", None)
            await asyncio.sleep(0)

            retrieval_path = await run_sync(lambda: retrieve(tasks_path))
            if not retrieval_path or not os.path.exists(retrieval_path):
                yield send_event(
                    "retrieval", "failed", {"message": "Retrieval failed."}
                )
                return

            with open(retrieval_path, "r", encoding="utf-8") as f:
                retrieval_data = json.load(f)
            yield send_event("retrieval", "done", retrieval_data)

            # ── Step 3: Synthesis ────────────────────────────────────────────
            yield send_event("synthesis", "running", None)
            await asyncio.sleep(0)

            synthesis_path = await run_sync(lambda: synthesize(retrieval_path))
            if not synthesis_path or not os.path.exists(synthesis_path):
                yield send_event(
                    "synthesis", "failed", {"message": "Synthesis failed."}
                )
                return

            with open(synthesis_path, "r", encoding="utf-8") as f:
                synthesis_data = json.load(f)
            yield send_event("synthesis", "done", synthesis_data)

            # ── Step 4: Critic + Refinement ──────────────────────────────────
            yield send_event("critic", "running", None)
            await asyncio.sleep(0)

            refined_path = await run_sync(lambda: run_critic_refinement(synthesis_path))
            if not refined_path or not os.path.exists(refined_path):
                # Non-fatal: fall back to raw synthesis
                print("[api] Critic step failed, falling back to raw synthesis.")
                refined_path = synthesis_path
                yield send_event(
                    "critic",
                    "failed",
                    {"message": "Critic failed, using raw synthesis."},
                )
            else:
                with open(refined_path, "r", encoding="utf-8") as f:
                    refined_data = json.load(f)

                critique_log_path = os.path.join(folder_path, "critique_log.json")
                critique_log = None
                if os.path.exists(critique_log_path):
                    with open(critique_log_path, "r", encoding="utf-8") as f:
                        critique_log = json.load(f)

                yield send_event(
                    "critic",
                    "done",
                    {
                        "refined_synthesis": refined_data,
                        "critique_log": critique_log,
                    },
                )

            # ── Step 5: Cross-Task Synthesis ─────────────────────────────────
            yield send_event("cross_synthesis", "running", None)
            await asyncio.sleep(0)

            cross_path = await run_sync(lambda: run_cross_synthesis(refined_path))
            if not cross_path or not os.path.exists(cross_path):
                print("[api] Cross-synthesis failed, continuing without it.")
                cross_path = None
                yield send_event(
                    "cross_synthesis", "failed", {"message": "Cross-synthesis failed."}
                )
            else:
                with open(cross_path, "r", encoding="utf-8") as f:
                    cross_data = json.load(f)
                yield send_event("cross_synthesis", "done", cross_data)

            # ── Step 6: Gap Detection ─────────────────────────────────────────
            yield send_event("gap", "running", None)
            await asyncio.sleep(0)

            gap_path = await run_sync(lambda: detect_gaps(refined_path))
            if not gap_path or not os.path.exists(gap_path):
                yield send_event("gap", "failed", {"message": "Gap detection failed."})
                return

            with open(gap_path, "r", encoding="utf-8") as f:
                gap_data = json.load(f)
            yield send_event("gap", "done", gap_data)

            # ── Step 7: Final Report ──────────────────────────────────────────
            yield send_event("report", "running", None)
            await asyncio.sleep(0)

            report_md_path = await run_sync(
                lambda: generate_report(refined_path, gap_path, cross_path)
            )
            if not report_md_path or not os.path.exists(report_md_path):
                yield send_event(
                    "report", "failed", {"message": "Report generation failed."}
                )
                return

            with open(report_md_path, "r", encoding="utf-8") as f:
                report_markdown = f.read()

            report_json_path = report_md_path.replace(".md", ".json")
            report_json = None
            if os.path.exists(report_json_path):
                with open(report_json_path, "r", encoding="utf-8") as f:
                    report_json = json.load(f)

            yield send_event(
                "report",
                "done",
                {
                    "markdown": report_markdown,
                    "json": report_json,
                },
            )

            # ── Complete ──────────────────────────────────────────────────────
            yield send_event(
                "complete",
                "done",
                {
                    "folder": folder_name,
                    "title": prettify_folder_name(folder_name),
                },
            )

        except Exception as e:
            print(f"[pipeline] Unhandled error: {e}")
            yield send_event("error", "failed", {"message": str(e)})

    return StreamingResponse(
        pipeline_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─── Talking Mode Endpoint ────────────────────────────────────────────────────


@app.post("/api/chat")
async def chat_with_research(request: ChatRequest):
    """Allow user to chat with LLM about their research."""
    try:
        context_parts = []
        
        if request.session_data:
            # It's a demo session shipped from the frontend
            title = request.session_data.get("title", request.folder_id)
            context_parts.append(f"Research Session: {title}")
            for log in request.session_data.get("logs", []):
                if log.get("type") == "sys" and log.get("step") == "report":
                    md = log.get("data", {}).get("markdown", "")
                    if md:
                        context_parts.append("Full Research Report (summary):")
                        lines = md.split("\n")
                        intro = []
                        for line in lines:
                            if line.startswith("#"):
                                if intro or not line.startswith("##"):
                                    break
                            intro.append(line)
                            if len(intro) > 20:
                                break
                        context_parts.append("\n".join(intro[:20]))
                elif log.get("type") == "sys" and log.get("step") == "synthesis":
                    context_parts.append("Key Research Findings:")
                    context_parts.append(str(log.get("data", {}))[:500] + "...")
        else:
            # Load the research data for context from disk
            folder = re.sub(r"[^a-zA-Z0-9_\-]", "", request.folder_id)
            folder_path = os.path.join(BASE_PATH, folder)

            if not os.path.isdir(folder_path):
                raise HTTPException(
                    status_code=404, detail=f"Research session '{folder}' not found."
                )

            data = load_folder_data(folder_path)

            report_md_path = os.path.join(folder_path, "final_report.md")
            report_markdown = ""
            if os.path.exists(report_md_path):
                with open(report_md_path, "r", encoding="utf-8") as f:
                    report_markdown = f.read()

            context_parts.append(f"Research Session: {prettify_folder_name(folder)}")

            if data.get("tasks"):
                tasks = data["tasks"]
                if isinstance(tasks, list) and len(tasks) > 0:
                    context_parts.append("Research Tasks/Topics:")
                    for i, task in enumerate(tasks[:5], 1):
                        desc = task.get("description", str(task))
                        context_parts.append(f"  {i}. {desc[:100]}")

            if data.get("refined_synthesis") or data.get("synthesis"):
                synthesis = data.get("refined_synthesis") or data.get("synthesis")
                if isinstance(synthesis, dict):
                    if "synthesized_summary" in synthesis:
                        context_parts.append("Key Research Findings:")
                        context_parts.append(f"  {synthesis['synthesized_summary'][:500]}...")
                    elif "summary" in synthesis:
                        context_parts.append("Key Research Findings:")
                        context_parts.append(f"  {synthesis['summary'][:500]}...")

            if report_markdown:
                context_parts.append("Full Research Report (summary):")
                lines = report_markdown.split("\n")
                intro = []
                for line in lines:
                    if line.startswith("#"):
                        if intro or not line.startswith("##"):
                            break
                    intro.append(line)
                    if len(intro) > 20:
                        break
                context_parts.append("\n".join(intro[:20]))

        research_context = (
            "\n\n".join(context_parts)
            if context_parts
            else "No research data available."
        )

        # Import LLM components (using same setup as synthesis agent)
        from groq import Groq
        from dotenv import load_dotenv

        load_dotenv()
        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        # Use 8B for general chat
        # CHAT_MODEL = "llama-3.3-70b-versatile" # Legacy

        # Build conversation history for context
        messages = [
            {
                "role": "system",
                "content": f"""You are a helpful research assistant who helps users understand their completed research. You have been given access to the user's research data.

RESEARCH CONTEXT:
{research_context}

IMPORTANT INSTRUCTIONS:
1. You MUST answer questions based STRICTLY on the provided research data above
2. If asked about something NOT in the research data, clearly say "I don't have information about that in your research"
3. Reference specific findings, tasks, or topics from the research when possible
4. Be conversational but precise
5. When asked about methodology, explain what methods were used in THIS research
6. Do not make up information or pretend you have data you don't have
7. Use the research findings to answer questions helpfully

EXAMPLES:
- "What was this research about?" → Summarize the main topic and key findings from the research context
- "What sources were used?" → Reference the retrieved sources section if available
- "What gaps were identified?" → Reference the gap analysis if available
- "Write a summary of the research" → Use the synthesized summary from the research context""",
            }
        ]

        # Add chat history (limit to last 5 exchanges to prevent context overflow)
        for msg in request.history[-5:]:
            messages.append(
                {"role": msg.get("role", "user"), "content": msg.get("content", "")}
            )

        # Add current message
        messages.append({"role": "user", "content": request.message})

        # Get response from LLM
        completion = call_with_retry(
            client=groq_client,
            model=CHAT_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1500,
        )

        response_content = completion.choices[0].message.content

        return {
            "response": response_content,
            "folder": request.folder_id,
            "used_context": bool(context_parts),
        }

    except Exception as e:
        print(f"[chat] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Markdown report endpoint ─────────────────────────────────────────────────


@app.get("/api/history/{folder}/report.md")
async def get_report_markdown(folder: str):
    """Return the raw markdown report for a session."""
    folder = re.sub(r"[^a-zA-Z0-9_\-]", "", folder)
    md_path = os.path.join(BASE_PATH, folder, "final_report.md")

    if not os.path.exists(md_path):
        raise HTTPException(status_code=404, detail="Markdown report not found.")

    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    return {"folder": folder, "markdown": content}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
