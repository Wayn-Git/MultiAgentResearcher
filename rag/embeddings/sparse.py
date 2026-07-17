"""
Sparse embeddings using BM25 (local, free, no model download).
Uses rank-bm25 library for tokenization and scoring.
"""

import os
import json
import pickle
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from functools import lru_cache

from rank_bm25 import BM25Okapi

from ..config import BM25_K1, BM25_B, BM25_CACHE_DIR

logger = logging.getLogger(__name__)


class SparseEmbedder:
    """
    BM25 sparse embedder.
    Maintains a corpus of documents and can encode queries into sparse vectors.
    """
    
    def __init__(
        self,
        corpus: Optional[List[str]] = None,
        k1: float = BM25_K1,
        b: float = BM25_B,
        cache_dir: str = BM25_CACHE_DIR,
    ):
        self.k1 = k1
        self.b = b
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self._bm25: Optional[BM25Okapi] = None
        self._corpus: List[str] = []
        self._tokenized_corpus: List[List[str]] = []
        self._doc_ids: List[str] = []
        
        if corpus:
            self.fit(corpus)
    
    def _tokenize(self, text: str) -> List[str]:
        """Simple whitespace tokenization (can be improved with nltk/spacy)."""
        return text.lower().split()
    
    def fit(self, corpus: List[str], doc_ids: Optional[List[str]] = None):
        """Build BM25 index from corpus."""
        logger.info(f"Building BM25 index from {len(corpus)} documents...")
        
        self._corpus = corpus
        self._tokenized_corpus = [self._tokenize(doc) for doc in corpus]
        self._doc_ids = doc_ids or [f"doc_{i}" for i in range(len(corpus))]
        
        self._bm25 = BM25Okapi(self._tokenized_corpus, k1=self.k1, b=self.b)
        logger.info("BM25 index built successfully")
    
    def add_documents(self, texts: List[str], doc_ids: Optional[List[str]] = None):
        """Add documents to existing corpus (rebuilds index)."""
        start_idx = len(self._corpus)
        new_ids = doc_ids or [f"doc_{start_idx + i}" for i in range(len(texts))]
        
        self._corpus.extend(texts)
        self._tokenized_corpus.extend([self._tokenize(t) for t in texts])
        self._doc_ids.extend(new_ids)
        
        # Rebuild index
        self._bm25 = BM25Okapi(self._tokenized_corpus, k1=self.k1, b=self.b)
        logger.info(f"Added {len(texts)} documents, total: {len(self._corpus)}")
    
    def get_scores(self, query: str) -> List[float]:
        """Get BM25 scores for query against all documents."""
        if self._bm25 is None:
            raise ValueError("BM25 not fitted. Call fit() or add_documents() first.")
        
        tokenized_query = self._tokenize(query)
        scores = self._bm25.get_scores(tokenized_query)
        return scores.tolist()
    
    def get_top_k(self, query: str, k: int = 10) -> List[Dict[str, Any]]:
        """Get top-k documents with scores."""
        scores = self.get_scores(query)
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]
        
        return [
            {
                "doc_id": self._doc_ids[idx],
                "score": scores[idx],
                "text": self._corpus[idx],
            }
            for idx in top_indices
        ]
    
    def encode_query(self, query: str) -> Dict[int, float]:
        """
        Encode query as sparse vector (token_id -> weight).
        Returns dict compatible with Pinecone sparse vector format.
        """
        if self._bm25 is None:
            raise ValueError("BM25 not fitted")
        
        tokenized_query = self._tokenize(query)
        # Get term frequencies in query
        from collections import Counter
        tf = Counter(tokenized_query)
        
        # Compute BM25 weights for each term
        # BM25 weight = idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl/avgdl))
        sparse_dict = {}
        for term, freq in tf.items():
            if term in self._bm25.idf:
                weight = float(self._bm25.idf[term]) * freq
                # Use term hash as dimension index (Pinecone expects int keys)
                term_hash = hash(term) % 1000000  # Limit dimension space
                sparse_dict[term_hash] = weight
        
        return sparse_dict
    
    def save(self, name: str = "bm25_index"):
        """Save BM25 index to disk."""
        cache_path = self.cache_dir / f"{name}.pkl"
        data = {
            "corpus": self._corpus,
            "tokenized_corpus": self._tokenized_corpus,
            "doc_ids": self._doc_ids,
            "k1": self.k1,
            "b": self.b,
        }
        with open(cache_path, "wb") as f:
            pickle.dump(data, f)
        logger.info(f"Saved BM25 index to {cache_path}")
    
    def load(self, name: str = "bm25_index") -> bool:
        """Load BM25 index from disk."""
        cache_path = self.cache_dir / f"{name}.pkl"
        if not cache_path.exists():
            logger.warning(f"No cached BM25 index at {cache_path}")
            return False
        
        with open(cache_path, "rb") as f:
            data = pickle.load(f)
        
        self._corpus = data["corpus"]
        self._tokenized_corpus = data["tokenized_corpus"]
        self._doc_ids = data["doc_ids"]
        self.k1 = data.get("k1", BM25_K1)
        self.b = data.get("b", BM25_B)
        
        self._bm25 = BM25Okapi(self._tokenized_corpus, k1=self.k1, b=self.b)
        logger.info(f"Loaded BM25 index from {cache_path} ({len(self._corpus)} docs)")
        return True
    
    def __len__(self) -> int:
        return len(self._corpus)


@lru_cache(maxsize=1)
def get_sparse_embedder() -> SparseEmbedder:
    """Singleton sparse embedder."""
    embedder = SparseEmbedder()
    embedder.load()  # Try to load cached
    return embedder