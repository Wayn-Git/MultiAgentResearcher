"""
Hybrid retriever with Reciprocal Rank Fusion (RRF).
Combines dense and sparse search results.
"""

import logging
from typing import List, Dict, Any, Optional

from ..embeddings import get_embedder, get_sparse_embedder
from .pinecone_client import PineconeVectorStore, get_vector_store

logger = logging.getLogger(__name__)


def reciprocal_rank_fusion(
    dense_results: List[Dict[str, Any]],
    sparse_results: List[Dict[str, Any]],
    k: int = 60,
    top_k: int = 10,
) -> List[Dict[str, Any]]:
    """
    Reciprocal Rank Fusion (RRF) merge.
    
    RRF score = sum(1 / (k + rank_i)) for each result list
    
    Args:
        dense_results: List of {"id", "score", "metadata", ...} from dense search
        sparse_results: List of {"id", "score", "metadata", ...} from sparse search
        k: RRF parameter (default 60)
        top_k: Number of results to return
    
    Returns:
        Merged results sorted by RRF score
    """
    # Build rank dictionaries
    dense_ranks = {r["id"]: i + 1 for i, r in enumerate(dense_results)}
    sparse_ranks = {r["id"]: i + 1 for i, r in enumerate(sparse_results)}
    
    # All unique IDs
    all_ids = set(dense_ranks.keys()) | set(sparse_ranks.keys())
    
    # Compute RRF scores
    rrf_scores = {}
    for doc_id in all_ids:
        score = 0.0
        if doc_id in dense_ranks:
            score += 1.0 / (k + dense_ranks[doc_id])
        if doc_id in sparse_ranks:
            score += 1.0 / (k + sparse_ranks[doc_id])
        rrf_scores[doc_id] = score
    
    # Sort by RRF score
    sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)
    
    # Build merged results preserving metadata
    id_to_result = {}
    for r in dense_results + sparse_results:
        if r["id"] not in id_to_result:
            id_to_result[r["id"]] = r
    
    merged = []
    for doc_id in sorted_ids[:top_k]:
        result = id_to_result[doc_id].copy()
        result["rrf_score"] = rrf_scores[doc_id]
        result["dense_rank"] = dense_ranks.get(doc_id)
        result["sparse_rank"] = sparse_ranks.get(doc_id)
        merged.append(result)
    
    return merged


class HybridRetriever:
    """
    Hybrid retriever combining dense (semantic) + sparse (BM25) search.
    """
    
    def __init__(
        self,
        vector_store: Optional[PineconeVectorStore] = None,
        dense_top_k: int = 20,
        sparse_top_k: int = 20,
        final_top_k: int = 10,
        rrf_k: int = 60,
    ):
        self.vector_store = vector_store or get_vector_store()
        self.dense_top_k = dense_top_k
        self.sparse_top_k = sparse_top_k
        self.final_top_k = final_top_k
        self.rrf_k = rrf_k
        
        self.dense_embedder = get_embedder()
        self.sparse_embedder = get_sparse_embedder()
    
    def retrieve(
        self,
        query: str,
        filter: Optional[Dict[str, Any]] = None,
        namespace: str = "",
        use_hybrid: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve documents for query.
        
        Args:
            query: Search query
            filter: Metadata filter dict
            namespace: Pinecone namespace
            use_hybrid: If False, only use dense search
        
        Returns:
            List of results with keys: id, score, metadata, text, rrf_score, etc.
        """
        # Dense search
        dense_vector = self.dense_embedder.embed_query(query)
        dense_results = self.vector_store.query(
            vector=dense_vector,
            top_k=self.dense_top_k,
            namespace=namespace,
            filter=filter,
        )
        
        logger.debug(f"Dense search returned {len(dense_results)} results")
        
        if not use_hybrid:
            return dense_results[:self.final_top_k]
        
        # Sparse search (BM25)
        # Note: For Pinecone managed sparse, we'd use sparse_vector in query
        # For local BM25, we search the local corpus
        sparse_results = self._sparse_search(query, filter)
        logger.debug(f"Sparse search returned {len(sparse_results)} results")
        
        # RRF merge
        merged = reciprocal_rank_fusion(
            dense_results,
            sparse_results,
            k=self.rrf_k,
            top_k=self.final_top_k,
        )
        
        return merged
    
    def _sparse_search(
        self,
        query: str,
        filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Search using local BM25 index."""
        if len(self.sparse_embedder) == 0:
            logger.warning("BM25 corpus empty, skipping sparse search")
            return []
        
        # Get top-k from BM25
        bm25_results = self.sparse_embedder.get_top_k(query, k=self.sparse_top_k)
        
        # Convert to same format as Pinecone results
        results = []
        for r in bm25_results:
            results.append({
                "id": r["doc_id"],
                "score": r["score"],
                "metadata": {"text": r["text"]},
            })
        
        return results
    
    def retrieve_with_pinecone_sparse(
        self,
        query: str,
        filter: Optional[Dict[str, Any]] = None,
        namespace: str = "",
    ) -> List[Dict[str, Any]]:
        """
        Retrieve using Pinecone's managed sparse vectors (if index supports it).
        Requires Pinecone index with sparse enabled.
        """
        dense_vector = self.dense_embedder.embed_query(query)
        
        # For Pinecone integrated sparse, we'd need to use their sparse encoder
        # This is a placeholder - Pinecone handles sparse encoding server-side
        sparse_vector = self.sparse_embedder.encode_query(query)
        
        return self.vector_store.query_hybrid(
            dense_vector=dense_vector,
            sparse_vector=sparse_vector,
            top_k=self.final_top_k,
            namespace=namespace,
            filter=filter,
        )


def get_retriever() -> HybridRetriever:
    """Get default hybrid retriever."""
    return HybridRetriever()