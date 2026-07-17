"""
Pinecone vector store operations - upsert, query, delete.
"""

import os
import logging
import uuid
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from pinecone import Pinecone, ServerlessSpec
from pinecone.exceptions import PineconeException

from ..config import (
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    DENSE_EMBEDDING_DIM,
    DEFAULT_SOURCE_TYPES,
)

logger = logging.getLogger(__name__)


@dataclass
class VectorRecord:
    """A vector record for upsert."""
    id: str
    values: List[float]
    metadata: Dict[str, Any]
    sparse_values: Optional[Dict[int, float]] = None


class PineconeVectorStore:
    """Pinecone vector store with hybrid search support."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        index_name: str = PINECONE_INDEX_NAME,
        dimension: int = DENSE_EMBEDDING_DIM,
        metric: str = "cosine",
        spec: Optional[ServerlessSpec] = None,
    ):
        self.api_key = api_key or PINECONE_API_KEY
        self.index_name = index_name
        self.dimension = dimension
        self.metric = metric
        
        if not self.api_key:
            raise ValueError("Pinecone API key required. Set PINECONE_API_KEY env var.")
        
        self._pc: Optional[Pinecone] = None
        self._index = None
        self._spec = spec or ServerlessSpec(cloud="aws", region="us-east-1")
    
    @property
    def pc(self) -> Pinecone:
        if self._pc is None:
            self._pc = Pinecone(api_key=self.api_key)
        return self._pc
    
    @property
    def index(self):
        if self._index is None:
            self._index = self.pc.Index(self.index_name)
        return self._index
    
    def create_index_if_not_exists(self) -> bool:
        """Create index if it doesn't exist. Returns True if created."""
        existing = [idx.name for idx in self.pc.list_indexes()]
        
        if self.index_name in existing:
            logger.info(f"Index '{self.index_name}' already exists")
            return False
        
        logger.info(f"Creating index '{self.index_name}' (dim={self.dimension}, metric={self.metric})")
        self.pc.create_index(
            name=self.index_name,
            dimension=self.dimension,
            metric=self.metric,
            spec=self._spec,
        )
        logger.info("Index created successfully")
        return True
    
    def delete_index(self):
        """Delete the index."""
        self.pc.delete_index(self.index_name)
        logger.info(f"Deleted index '{self.index_name}'")
    
    def upsert(self, records: List[VectorRecord], namespace: str = "") -> int:
        """
        Upsert vector records.
        
        Returns number of records upserted.
        """
        if not records:
            return 0
        
        vectors = []
        for r in records:
            vec = {
                "id": r.id,
                "values": r.values,
                "metadata": r.metadata,
            }
            if r.sparse_values:
                vec["sparse_values"] = r.sparse_values
            vectors.append(vec)
        
        # Batch upsert
        batch_size = 100
        total_upserted = 0
        
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            self.index.upsert(vectors=batch, namespace=namespace)
            total_upserted += len(batch)
        
        logger.info(f"Upserted {total_upserted} vectors to namespace '{namespace}'")
        return total_upserted
    
    def query(
        self,
        vector: List[float],
        top_k: int = 10,
        namespace: str = "",
        filter: Optional[Dict[str, Any]] = None,
        include_metadata: bool = True,
        include_values: bool = False,
        sparse_vector: Optional[Dict[int, float]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Query index with dense vector (and optional sparse vector for hybrid).
        """
        query_params = {
            "vector": vector,
            "top_k": top_k,
            "namespace": namespace,
            "include_metadata": include_metadata,
            "include_values": include_values,
        }
        
        if filter:
            query_params["filter"] = filter
        
        if sparse_vector:
            query_params["sparse_vector"] = sparse_vector
        
        try:
            response = self.index.query(**query_params)
        except PineconeException as e:
            logger.error(f"Pinecone query failed: {e}")
            raise
        
        matches = []
        for match in response.matches:
            m = {
                "id": match.id,
                "score": match.score,
                "metadata": match.metadata,
            }
            if include_values and match.values:
                m["values"] = match.values
            matches.append(m)
        
        return matches
    
    def query_hybrid(
        self,
        dense_vector: List[float],
        sparse_vector: Dict[int, float],
        top_k: int = 10,
        namespace: str = "",
        filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Hybrid query with both dense and sparse vectors.
        Pinecone handles the fusion internally.
        """
        return self.query(
            vector=dense_vector,
            sparse_vector=sparse_vector,
            top_k=top_k,
            namespace=namespace,
            filter=filter,
        )
    
    def delete(
        self,
        ids: Optional[List[str]] = None,
        filter: Optional[Dict[str, Any]] = None,
        namespace: str = "",
        delete_all: bool = False,
    ):
        """Delete vectors by IDs, filter, or all in namespace."""
        if delete_all:
            self.index.delete(delete_all=True, namespace=namespace)
            logger.info(f"Deleted all vectors in namespace '{namespace}'")
        elif ids:
            self.index.delete(ids=ids, namespace=namespace)
            logger.info(f"Deleted {len(ids)} vectors from namespace '{namespace}'")
        elif filter:
            self.index.delete(filter=filter, namespace=namespace)
            logger.info(f"Deleted vectors matching filter from namespace '{namespace}'")
        else:
            raise ValueError("Must provide ids, filter, or delete_all=True")
    
    def fetch(self, ids: List[str], namespace: str = "") -> Dict[str, Any]:
        """Fetch vectors by IDs."""
        response = self.index.fetch(ids=ids, namespace=namespace)
        return response.vectors
    
    def describe_index_stats(self) -> Dict[str, Any]:
        """Get index statistics."""
        return self.index.describe_index_stats()
    
    def list_namespaces(self) -> List[str]:
        """List all namespaces in index."""
        stats = self.describe_index_stats()
        return list(stats.get("namespaces", {}).keys())


def get_vector_store() -> PineconeVectorStore:
    """Get default vector store instance."""
    return PineconeVectorStore()