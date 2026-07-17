"""
Dense embeddings using sentence-transformers (local, free, CPU-friendly).
"""

import os
import logging
from typing import List, Optional
from functools import lru_cache

import torch
from sentence_transformers import SentenceTransformer

from ..config import DENSE_EMBEDDING_MODEL, DENSE_EMBEDDING_BATCH_SIZE, DENSE_EMBEDDING_DIM

logger = logging.getLogger(__name__)


class DenseEmbedder:
    """Local dense embedding using sentence-transformers."""
    
    def __init__(
        self,
        model_name: str = DENSE_EMBEDDING_MODEL,
        device: Optional[str] = None,
        batch_size: int = DENSE_EMBEDDING_BATCH_SIZE,
    ):
        self.model_name = model_name
        self.batch_size = batch_size
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._model: Optional[SentenceTransformer] = None
        self._dim = DENSE_EMBEDDING_DIM
        
    @property
    def model(self) -> SentenceTransformer:
        """Lazy-load the model."""
        if self._model is None:
            logger.info(f"Loading embedding model: {self.model_name} on {self.device}")
            self._model = SentenceTransformer(self.model_name, device=self.device)
        return self._model
    
    @property
    def dimension(self) -> int:
        return self._dim
    
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of texts."""
        if not texts:
            return []
        
        embeddings = self.model.encode(
            texts,
            batch_size=self.batch_size,
            show_progress_bar=len(texts) > 10,
            convert_to_numpy=True,
            normalize_embeddings=True,  # Cosine similarity = dot product
        )
        return embeddings.tolist()
    
    def embed_text(self, text: str) -> List[float]:
        """Embed a single text."""
        return self.embed_texts([text])[0]
    
    def embed_query(self, query: str) -> List[float]:
        """Embed a query (alias for embed_text)."""
        return self.embed_text(query)


@lru_cache(maxsize=1)
def get_embedder() -> DenseEmbedder:
    """Singleton embedder instance."""
    return DenseEmbedder()


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Convenience function."""
    return get_embedder().embed_texts(texts)


def embed_text(text: str) -> List[float]:
    """Convenience function."""
    return get_embedder().embed_text(text)


def embed_query(query: str) -> List[float]:
    """Convenience function."""
    return get_embedder().embed_query(query)