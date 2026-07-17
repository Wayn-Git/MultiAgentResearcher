"""
Local embedding utilities using sentence-transformers.
"""

import os
import logging
from typing import List, Optional, Union
from functools import lru_cache

import numpy as np

logger = logging.getLogger(__name__)

# Model configurations
EMBEDDING_MODELS = {
    "minilm": {
        "model_name": "sentence-transformers/all-MiniLM-L6-v2",
        "dimension": 384,
        "description": "Fast, 384-dim, good baseline",
    },
    "minilm-l12": {
        "model_name": "sentence-transformers/all-MiniLM-L12-v2",
        "dimension": 384,
        "description": "Deeper MiniLM, slightly better",
    },
    "mpnet": {
        "model_name": "sentence-transformers/all-mpnet-base-v2",
        "dimension": 768,
        "description": "Better quality, 768-dim, slower",
    },
    "bge-small": {
        "model_name": "BAAI/bge-small-en-v1.5",
        "dimension": 384,
        "description": "Strong retrieval, 384-dim",
    },
    "bge-base": {
        "model_name": "BAAI/bge-base-en-v1.5",
        "dimension": 768,
        "description": "Very strong retrieval, 768-dim",
    },
    "e5-base": {
        "model_name": "intfloat/e5-base-v2",
        "dimension": 768,
        "description": "Microsoft E5, strong retrieval",
    },
}

DEFAULT_MODEL = "minilm"


class Embedder:
    """Wrapper for sentence-transformers embedding model."""
    
    def __init__(self, model_key: str = DEFAULT_MODEL):
        if model_key not in EMBEDDING_MODELS:
            raise ValueError(f"Unknown model: {model_key}. Choose from: {list(EMBEDDING_MODELS.keys())}")
        
        self.model_key = model_key
        self.config = EMBEDDING_MODELS[model_key]
        self.model_name = self.config["model_name"]
        self.dimension = self.config["dimension"]
        self._model = None
    
    @property
    def model(self):
        """Lazy load the model."""
        if self._model is None:
            logger.info(f"Loading embedding model: {self.model_name}")
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
        return self._model
    
    def embed(self, texts: Union[str, List[str]], normalize: bool = True) -> np.ndarray:
        """
        Embed texts.
        
        Args:
            texts: Single text or list of texts
            normalize: L2 normalize embeddings (recommended for cosine similarity)
        
        Returns:
            numpy array of shape (n_texts, dimension)
        """
        if isinstance(texts, str):
            texts = [texts]
        
        embeddings = self.model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=normalize,
            show_progress_bar=len(texts) > 10,
        )
        return embeddings
    
    def embed_query(self, query: str) -> List[float]:
        """Embed a single query, return as list of floats."""
        emb = self.embed(query, normalize=True)
        return emb[0].tolist()
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed multiple documents, return as list of lists."""
        embs = self.embed(texts, normalize=True)
        return embs.tolist()


@lru_cache(maxsize=4)
def get_embedder(model_key: str = DEFAULT_MODEL) -> Embedder:
    """Get cached embedder instance."""
    return Embedder(model_key)


def list_models() -> dict:
    """List available embedding models."""
    return {k: v["description"] for k, v in EMBEDDING_MODELS.items()}