"""
Retrieval module - Enhanced retriever with fallback logic.
"""

from .enhanced_retriever import (
    EnhancedRetriever,
    RetrievalResult,
    retrieve_with_fallback,
    retrieve_for_task,
)

__all__ = [
    "EnhancedRetriever",
    "RetrievalResult",
    "retrieve_with_fallback",
    "retrieve_for_task",
]