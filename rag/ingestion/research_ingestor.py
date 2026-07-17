"""
Research report ingestion - existing model_output_data/*.md files.
"""

import os
import logging
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from ..embeddings import get_embedder
from ..vector_store import get_vector_store, VectorRecord
from .chunking import chunk_text_recursive

logger = logging.getLogger(__name__)

MODEL_OUTPUT_DIR = Path(__file__).parent.parent.parent / "model_output_data"


def find_research_sessions() -> List[Dict[str, Any]]:
    """Find all research sessions in model_output_data."""
    if not MODEL_OUTPUT_DIR.exists():
        return []
    
    sessions = []
    for folder in sorted(MODEL_OUTPUT_DIR.iterdir()):
        if not folder.is_dir():
            continue
        
        report_md = folder / "final_report.md"
        report_json = folder / "final_report.json"
        
        session = {
            "folder": folder.name,
            "title": folder.name.replace("_", " ").title(),
            "has_report_md": report_md.exists(),
            "has_report_json": report_json.exists(),
        }
        
        if report_md.exists():
            session["report_path"] = str(report_md)
        if report_json.exists():
            session["json_path"] = str(report_json)
        
        sessions.append(session)
    
    return sessions


def load_research_report(session_folder: str) -> Optional[Dict[str, Any]]:
    """Load research report from session folder."""
    folder_path = MODEL_OUTPUT_DIR / session_folder
    
    # Try JSON first (structured)
    json_path = folder_path / "final_report.json"
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    # Fall back to markdown
    md_path = folder_path / "final_report.md"
    if md_path.exists():
        with open(md_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"markdown": content, "title": session_folder}
    
    return None


def ingest_research_report(
    session_folder: str,
    namespace: str = "research_report",
    chunk_size: int = 1500,
    chunk_overlap: int = 200,
    user_confirmed: bool = False,
) -> Dict[str, Any]:
    """
    Ingest a research report into Pinecone.
    
    Args:
        session_folder: Folder name in model_output_data/
        namespace: Pinecone namespace
        chunk_size: Characters per chunk
        chunk_overlap: Overlap between chunks
        user_confirmed: If False, return preview only
    """
    report = load_research_report(session_folder)
    if not report:
        return {"status": "error", "error": f"No report found for {session_folder}"}
    
    # Extract text content
    if "markdown" in report:
        text = report["markdown"]
    elif "sections" in report:
        # Structured JSON report
        text = json.dumps(report, indent=2)
    else:
        text = str(report)
    
    if len(text) < 100:
        return {"status": "error", "error": "Report too short"}
    
    # Chunk
    chunks = chunk_text_recursive(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    
    # Add metadata
    for i, chunk in enumerate(chunks):
        chunk.metadata.update({
            "source_type": "research_report",
            "source_id": session_folder,
            "session_title": session_folder.replace("_", " ").title(),
            "chunk_index": i,
            "total_chunks": len(chunks),
        })
    
    # Preview
    preview = {
        "session_folder": session_folder,
        "total_chunks": len(chunks),
        "sample_chunks": [
            {"index": i, "text": c.text[:200] + "..."}
            for i, c in enumerate(chunks[:3])
        ],
    }
    
    if not user_confirmed:
        return {
            "status": "preview",
            "preview": preview,
            "message": "Set user_confirmed=True to upsert",
        }
    
    # Embed and upsert
    embedder = get_embedder()
    texts = [c.text for c in chunks]
    embeddings = embedder.embed_texts(texts)
    
    records = []
    for chunk, embedding in zip(chunks, embeddings):
        records.append(VectorRecord(
            id=f"research_{session_folder}_{chunk.metadata['chunk_index']}",
            values=embedding,
            metadata={
                "text": chunk.text,
                **chunk.metadata,
            },
        ))
    
    vector_store = get_vector_store()
    upserted = vector_store.upsert(records, namespace=namespace)
    
    logger.info(f"Ingested research report '{session_folder}': {upserted} chunks")
    
    return {
        "status": "success",
        "upserted": upserted,
        "namespace": namespace,
        "preview": preview,
    }


def ingest_all_research_reports(
    namespace: str = "research_report",
    user_confirmed: bool = False,
) -> Dict[str, Any]:
    """Ingest all research reports from model_output_data."""
    sessions = find_research_sessions()
    
    results = []
    for session in sessions:
        if session.get("has_report_md") or session.get("has_report_json"):
            result = ingest_research_report(
                session["folder"],
                namespace=namespace,
                user_confirmed=user_confirmed,
            )
            results.append(result)
    
    return {
        "total_sessions": len(sessions),
        "ingested": [r for r in results if r.get("status") == "success"],
        "previews": [r for r in results if r.get("status") == "preview"],
        "errors": [r for r in results if r.get("status") == "error"],
    }