"""
PDF ingestion pipeline.
"""

import os
import logging
import uuid
from typing import List, Dict, Any, Optional
from pathlib import Path

import pdfplumber

from ..embeddings import get_embedder
from ..vector_store import get_vector_store, VectorRecord
from .chunking import chunk_pdf_pages, extract_pdf_text

logger = logging.getLogger(__name__)


def ingest_pdf(
    pdf_path: str,
    source_id: Optional[str] = None,
    namespace: str = "pdf",
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    user_confirmed: bool = False,
) -> Dict[str, Any]:
    """
    Ingest a PDF into Pinecone.
    
    Args:
        pdf_path: Path to PDF file
        source_id: Unique identifier for this PDF (default: filename hash)
        namespace: Pinecone namespace
        chunk_size: Characters per chunk
        chunk_overlap: Overlap between chunks
        user_confirmed: If False, return preview without upserting
    
    Returns:
        Dict with status, chunks count, and preview data
    """
    if not os.path.exists(pdf_path):
        return {"status": "error", "error": f"File not found: {pdf_path}"}
    
    # Generate source_id if not provided
    if source_id is None:
        source_id = Path(pdf_path).stem
    
    # Extract text from PDF
    try:
        pages = extract_pdf_text(pdf_path)
    except Exception as e:
        logger.error(f"Failed to extract PDF text: {e}")
        return {"status": "error", "error": f"PDF extraction failed: {e}"}
    
    if not pages:
        return {"status": "error", "error": "No text extracted from PDF"}
    
    # Chunk pages
    chunks = chunk_pdf_pages(pages, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    
    if not chunks:
        return {"status": "error", "error": "No valid chunks generated"}
    
    # Prepare preview
    preview = {
        "source_id": source_id,
        "filename": Path(pdf_path).name,
        "total_pages": len(pages),
        "total_chunks": len(chunks),
        "sample_chunks": [
            {"index": i, "text": c.text[:200] + "...", "page": c.metadata.get("page")}
            for i, c in enumerate(chunks[:3])
        ],
    }
    
    # If not confirmed, return preview only
    if not user_confirmed:
        return {
            "status": "preview",
            "preview": preview,
            "message": "Set user_confirmed=True to upsert to Pinecone",
        }
    
    # Embed chunks
    embedder = get_embedder()
    texts = [c.text for c in chunks]
    embeddings = embedder.embed_texts(texts)
    
    # Create vector records
    records = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        record = VectorRecord(
            id=f"{source_id}_{i}",
            values=embedding,
            metadata={
                "text": chunk.text,
                "source_type": "pdf",
                "source_id": source_id,
                "filename": Path(pdf_path).name,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "page": chunk.metadata.get("page"),
                "start_char": chunk.start_char,
                "end_char": chunk.end_char,
            },
        )
        records.append(record)
    
    # Upsert to Pinecone
    vector_store = get_vector_store()
    upserted = vector_store.upsert(records, namespace=namespace)
    
    logger.info(f"Ingested PDF '{source_id}': {upserted} chunks to namespace '{namespace}'")
    
    return {
        "status": "success",
        "upserted": upserted,
        "namespace": namespace,
        "source_id": source_id,
        "preview": preview,
    }


def list_ingested_pdfs(namespace: str = "pdf") -> List[Dict[str, Any]]:
    """List all ingested PDFs in namespace."""
    vector_store = get_vector_store()
    stats = vector_store.describe_index_stats()
    
    namespaces = stats.get("namespaces", {})
    if namespace not in namespaces:
        return []
    
    # Get all vectors in namespace (limited)
    # Note: This requires listing all IDs - use with caution on large indexes
    return [{"namespace": namespace, "vector_count": namespaces[namespace].get("vector_count", 0)}]


def delete_pdf(source_id: str, namespace: str = "pdf") -> Dict[str, Any]:
    """Delete all chunks for a PDF by source_id."""
    vector_store = get_vector_store()
    
    # Delete by filter
    vector_store.delete(
        filter={"source_id": source_id},
        namespace=namespace,
    )
    
    return {"status": "success", "deleted_source": source_id}