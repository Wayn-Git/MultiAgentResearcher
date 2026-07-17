"""
Web content ingestion (Tavily results).
"""

import logging
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime

from ..embeddings import get_embedder
from ..vector_store import get_vector_store, VectorRecord

logger = logging.getLogger(__name__)


def generate_source_id(url: str) -> str:
    """Generate deterministic ID from URL."""
    return hashlib.md5(url.encode()).hexdigest()[:12]


def ingest_web_results(
    results: List[Dict[str, Any]],
    task_description: str = "",
    namespace: str = "web",
    source_type: str = "web",
    user_confirmed: bool = False,
) -> Dict[str, Any]:
    """
    Ingest Tavily/web search results into Pinecone.
    
    Args:
        results: List of result dicts with keys: title, url, snippet, score
        task_description: Original task/query for context
        namespace: Pinecone namespace
        source_type: "web" or "tavily"
        user_confirmed: If False, return preview only
    
    Returns:
        Dict with status and preview/upsert info
    """
    if not results:
        return {"status": "error", "error": "No results provided"}
    
    # Prepare chunks
    chunks = []
    for i, r in enumerate(results):
        url = r.get("url", "")
        if not url:
            continue
        
        source_id = generate_source_id(url)
        text = r.get("snippet", "") or r.get("content", "") or r.get("answer", "")
        
        if len(text) < 50:
            continue
        
        chunks.append({
            "source_id": source_id,
            "title": r.get("title", ""),
            "url": url,
            "text": text,
            "score": r.get("score", 0),
            "task_description": task_description,
            "result_index": i,
        })
    
    if not chunks:
        return {"status": "error", "error": "No valid chunks after filtering"}
    
    # Preview
    preview = {
        "task_description": task_description,
        "total_results": len(results),
        "valid_chunks": len(chunks),
        "sample": chunks[:3],
    }
    
    if not user_confirmed:
        return {
            "status": "preview",
            "preview": preview,
            "message": "Set user_confirmed=True to upsert to Pinecone",
        }
    
    # Embed
    embedder = get_embedder()
    texts = [c["text"] for c in chunks]
    embeddings = embedder.embed_texts(texts)
    
    # Create records
    records = []
    for chunk, embedding in zip(chunks, embeddings):
        records.append(VectorRecord(
            id=f"web_{chunk['source_id']}_{chunk['result_index']}",
            values=embedding,
            metadata={
                "text": chunk["text"],
                "source_type": source_type,
                "source_id": chunk["source_id"],
                "title": chunk["title"],
                "url": chunk["url"],
                "score": chunk["score"],
                "task_description": chunk["task_description"],
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
        ))
    
    # Upsert
    vector_store = get_vector_store()
    upserted = vector_store.upsert(records, namespace=namespace)
    
    logger.info(f"Ingested {upserted} web results to namespace '{namespace}'")
    
    return {
        "status": "success",
        "upserted": upserted,
        "namespace": namespace,
        "preview": preview,
    }


def ingest_tavily_results(
    tavily_response: Dict[str, Any],
    task_description: str = "",
    namespace: str = "web",
    user_confirmed: bool = False,
) -> Dict[str, Any]:
    """
    Ingest full Tavily response (results + answer).
    
    Args:
        tavily_response: Full response from TavilyClient.search()
        task_description: Original task/query
        namespace: Pinecone namespace
        user_confirmed: If False, return preview only
    """
    results = tavily_response.get("results", [])
    answer = tavily_response.get("answer", "")
    
    # Add answer as a special result if present
    if answer:
        results.append({
            "title": "Tavily Direct Answer",
            "url": "tavily://answer",
            "snippet": answer,
            "score": 1.0,
        })
    
    return ingest_web_results(
        results=results,
        task_description=task_description,
        namespace=namespace,
        source_type="tavily",
        user_confirmed=user_confirmed,
    )


def list_web_sources(namespace: str = "web") -> List[Dict[str, Any]]:
    """List unique web sources in namespace."""
    vector_store = get_vector_store()
    
    # Query with no vector to get all (not efficient for large indexes)
    # Better: maintain a separate index of sources
    stats = vector_store.describe_index_stats()
    ns_stats = stats.get("namespaces", {}).get(namespace, {})
    
    return [{
        "namespace": namespace,
        "total_vectors": ns_stats.get("vector_count", 0),
    }]


def cleanup_old_web_results(
    namespace: str = "web",
    max_age_days: int = 30,
) -> Dict[str, Any]:
    """Delete web results older than max_age_days."""
    from datetime import datetime, timedelta
    
    cutoff = datetime.utcnow() - timedelta(days=max_age_days)
    cutoff_str = cutoff.isoformat() + "Z"
    
    vector_store = get_vector_store()
    vector_store.delete(
        filter={"source_type": "web", "timestamp": {"$lt": cutoff_str}},
        namespace=namespace,
    )
    
    return {
        "status": "success",
        "namespace": namespace,
        "deleted_before": cutoff_str,
    }