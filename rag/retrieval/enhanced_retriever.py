"""
Enhanced retriever with fallback logic and multiple source support.
"""

import logging
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
from datetime import datetime

from ..embeddings import get_embedder
from ..vector_store import get_vector_store, VectorRecord
from ..config import (
    PINECONE_NAMESPACE_WEB,
    PINECONE_NAMESPACE_PDF,
    PINECONE_NAMESPACE_RESEARCH,
    DEFAULT_TOP_K,
    DENSE_TOP_K,
    SPARSE_TOP_K,
    RRF_K,
)

logger = logging.getLogger(__name__)


@dataclass
class RetrievalResult:
    """Standardized retrieval result."""
    text: str
    score: float
    source_type: str
    source_id: str
    metadata: Dict[str, Any]
    rank: int


class EnhancedRetriever:
    """
    Hybrid retriever with intelligent fallback logic.
    
    Workflow:
    1. Check if PDF/research sources exist
    2. If yes, search hybrid (dense + sparse) in relevant namespaces
    3. If results below threshold or no PDF sources, fall back to web search
    4. Merge and rank results
    """
    
    def __init__(
        self,
        dense_top_k: int = DENSE_TOP_K,
        sparse_top_k: int = SPARSE_TOP_K,
        final_top_k: int = DEFAULT_TOP_K,
        rrf_k: int = RRF_K,
        relevance_threshold: float = 0.3,
    ):
        self.dense_top_k = dense_top_k
        self.sparse_top_k = sparse_top_k
        self.final_top_k = final_top_k
        self.rrf_k = rrf_k
        self.relevance_threshold = relevance_threshold
        
        self.vector_store = get_vector_store()
        self.embedder = get_embedder()
    
    def retrieve(
        self,
        query: str,
        source_types: Optional[List[str]] = None,
        filter: Optional[Dict[str, Any]] = None,
        use_hybrid: bool = True,
        fallback_to_web: bool = True,
    ) -> List[RetrievalResult]:
        """
        Main retrieval method with fallback logic.
        
        Args:
            query: Search query
            source_types: List of source types to search ["pdf", "web", "research_report"]
            filter: Additional metadata filter
            use_hybrid: Use hybrid (dense + sparse) search
            fallback_to_web: If no relevant results in primary sources, search web
        
        Returns:
            List of RetrievalResult objects
        """
        source_types = source_types or ["pdf", "research_report"]
        
        # Step 1: Check available sources
        available_sources = self._check_available_sources(source_types)
        
        # Step 2: Search primary sources
        all_results = []
        
        if "pdf" in source_types and available_sources.get("pdf", False):
            pdf_results = self._search_namespace(
                query=query,
                namespace=PINECONE_NAMESPACE_PDF,
                source_type="pdf",
                filter=filter,
                use_hybrid=use_hybrid,
            )
            all_results.extend(pdf_results)
        
        if "research_report" in source_types and available_sources.get("research_report", False):
            research_results = self._search_namespace(
                query=query,
                namespace=PINECONE_NAMESPACE_RESEARCH,
                source_type="research_report",
                filter=filter,
                use_hybrid=use_hybrid,
            )
            all_results.extend(research_results)
        
        # Step 3: Evaluate results
        relevant_results = [r for r in all_results if r.score >= self.relevance_threshold]
        
        logger.info(f"Primary sources returned {len(relevant_results)} relevant results")
        
        # Step 4: Fallback to web if needed
        if fallback_to_web and (len(relevant_results) < self.final_top_k or not relevant_results):
            logger.info("Falling back to web search")
            web_results = self._search_namespace(
                query=query,
                namespace=PINECONE_NAMESPACE_WEB,
                source_type="web",
                filter=filter,
                use_hybrid=use_hybrid,
            )
            relevant_results.extend(web_results)
        
        # Step 5: Merge and rank
        merged = self._merge_and_rank(relevant_results)
        
        return merged[:self.final_top_k]
    
    def _check_available_sources(self, source_types: List[str]) -> Dict[str, bool]:
        """Check which namespaces have vectors."""
        stats = self.vector_store.describe_index_stats()
        namespaces = stats.get("namespaces", {})
        
        available = {}
        if "pdf" in source_types:
            available["pdf"] = PINECONE_NAMESPACE_PDF in namespaces and namespaces[PINECONE_NAMESPACE_PDF].get("vector_count", 0) > 0
        if "research_report" in source_types:
            available["research_report"] = PINECONE_NAMESPACE_RESEARCH in namespaces and namespaces[PINECONE_NAMESPACE_RESEARCH].get("vector_count", 0) > 0
        if "web" in source_types:
            available["web"] = PINECONE_NAMESPACE_WEB in namespaces and namespaces[PINECONE_NAMESPACE_WEB].get("vector_count", 0) > 0
        
        return available
    
    def _search_namespace(
        self,
        query: str,
        namespace: str,
        source_type: str,
        filter: Optional[Dict[str, Any]] = None,
        use_hybrid: bool = True,
    ) -> List[RetrievalResult]:
        """Search a single namespace."""
        # Build filter
        search_filter = {"source_type": source_type}
        if filter:
            search_filter.update(filter)
        
        # Dense vector
        dense_vector = self.embedder.embed_query(query)
        
        # Search
        results = self.vector_store.query(
            vector=dense_vector,
            top_k=self.dense_top_k,
            namespace=namespace,
            filter=search_filter,
            include_metadata=True,
        )
        
        # Convert to RetrievalResult
        retrieval_results = []
        for i, match in enumerate(results):
            metadata = match.get("metadata", {})
            retrieval_results.append(RetrievalResult(
                text=metadata.get("text", ""),
                score=match.get("score", 0),
                source_type=source_type,
                source_id=metadata.get("source_id", ""),
                metadata=metadata,
                rank=i + 1,
            ))
        
        return retrieval_results
    
    def _merge_and_rank(self, results: List[RetrievalResult]) -> List[RetrievalResult]:
        """Merge results from multiple sources using RRF."""
        if not results:
            return []
        
        # Group by source_type for RRF
        by_source = {}
        for r in results:
            by_source.setdefault(r.source_type, []).append(r)
        
        # Simple merge: sort by score, deduplicate by text similarity
        # For production, implement proper RRF across sources
        seen_texts = set()
        unique_results = []
        
        # Sort by score descending
        for r in sorted(results, key=lambda x: x.score, reverse=True):
            # Simple deduplication by first 100 chars
            text_key = r.text[:100]
            if text_key not in seen_texts:
                seen_texts.add(text_key)
                unique_results.append(r)
        
        # Re-rank
        for i, r in enumerate(unique_results):
            r.rank = i + 1
        
        return unique_results


def retrieve_with_fallback(
    query: str,
    source_types: Optional[List[str]] = None,
    top_k: int = DEFAULT_TOP_K,
) -> List[RetrievalResult]:
    """Convenience function for simple retrieval with fallback."""
    retriever = EnhancedRetriever(final_top_k=top_k)
    return retriever.retrieve(query, source_types=source_types)


def retrieve_for_task(
    task_description: str,
    task_id: Optional[str] = None,
    top_k: int = DEFAULT_TOP_K,
) -> List[RetrievalResult]:
    """
    Retrieve relevant docs for a research task.
    Includes task context in query.
    """
    # Enhance query with task context
    enhanced_query = task_description
    if task_id:
        enhanced_query += f" [task: {task_id}]"
    
    return retrieve_with_fallback(enhanced_query, top_k=top_k)