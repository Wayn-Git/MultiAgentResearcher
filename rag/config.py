"""
Configuration for RAG system.
"""

import os
from typing import Optional

# Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "luminaai-research")
PINECONE_NAMESPACE_WEB = "web"
PINECONE_NAMESPACE_PDF = "pdf"
PINECONE_NAMESPACE_RESEARCH = "research"

# Embeddings
DENSE_EMBEDDING_MODEL = os.getenv("DENSE_EMBEDDING_MODEL", "minilm")
DENSE_EMBEDDING_DIM = int(os.getenv("DENSE_EMBEDDING_DIM", "384"))

# Chunking
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))

# Retrieval
DEFAULT_TOP_K = int(os.getenv("DEFAULT_TOP_K", "10"))
DENSE_TOP_K = int(os.getenv("DENSE_TOP_K", "20"))
SPARSE_TOP_K = int(os.getenv("SPARSE_TOP_K", "20"))
RRF_K = int(os.getenv("RRF_K", "60"))

# Source types
DEFAULT_SOURCE_TYPES = ["web", "pdf", "research"]

# Tavily
TAVILY_API_KEY = os.getenv("TAVILY_SEARCH_API")
TAVILY_MAX_RESULTS = int(os.getenv("TAVILY_MAX_RESULTS", "5"))
TAVILY_SEARCH_DEPTH = os.getenv("TAVILY_SEARCH_DEPTH", "advanced")

# Groq (for synthesis)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Paths
BM25_INDEX_PATH = os.getenv("BM25_INDEX_PATH", "./data/bm25_index.pkl")
PDF_UPLOAD_DIR = os.getenv("PDF_UPLOAD_DIR", "./data/pdfs")


def validate_config() -> dict:
    """Validate required config and return status."""
    issues = []
    
    if not PINECONE_API_KEY:
        issues.append("PINECONE_API_KEY not set")
    
    if not TAVILY_API_KEY:
        issues.append("TAVILY_SEARCH_API not set")
    
    if not GROQ_API_KEY:
        issues.append("GROQ_API_KEY not set")
    
    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "config": {
            "pinecone_index": PINECONE_INDEX_NAME,
            "embedding_model": DENSE_EMBEDDING_MODEL,
            "embedding_dim": DENSE_EMBEDDING_DIM,
            "chunk_size": CHUNK_SIZE,
            "chunk_overlap": CHUNK_OVERLAP,
        }
    }