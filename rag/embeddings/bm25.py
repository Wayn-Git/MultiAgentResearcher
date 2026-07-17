"""
Local BM25 sparse retrieval using rank-bm25.
"""

import os
import pickle
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)


class BM25Index:
    """
    BM25 index with persistence.
    
    Uses rank-bm25 (Okapi BM25 implementation).
    Corpus is stored as list of tokenized documents.
    """
    
    def __init__(
        self,
        corpus: Optional[List[List[str]]] = None,
        k1: float = 1.5,
        b: float = 0.75,
        epsilon: float = 0.25,
    ):
        """
        Initialize BM25 index.
        
        Args:
            corpus: List of tokenized documents (list of token lists)
            k1: Term frequency saturation parameter (default 1.5)
            b: Document length normalization (default 0.75)
            epsilon: Floor for negative IDF values
        """
        self.k1 = k1
        self.b = b
        self.epsilon = epsilon
        self.corpus = corpus or []
        self._bm25 = None
        self._build()
    
    def _build(self):
        """Build BM25 index from corpus."""
        if not self.corpus:
            logger.warning("Empty corpus provided to BM25Index")
            return
        
        try:
            from rank_bm25 import BM25Okapi
            self._bm25 = BM25Okapi(self.corpus, k1=self.k1, b=self.b, epsilon=self.epsilon)
            logger.info(f"Built BM25 index with {len(self.corpus)} documents")
        except ImportError:
            logger.error("rank-bm25 not installed. Run: pip install rank-bm25")
            raise
    
    def add_documents(self, documents: List[List[str]]):
        """Add documents to corpus and rebuild index."""
        self.corpus.extend(documents)
        self._build()
    
    def get_scores(self, query_tokens: List[str]) -> np.ndarray:
        """Get BM25 scores for query against all documents."""
        if self._bm25 is None:
            return np.zeros(len(self.corpus))
        return self._bm25.get_scores(query_tokens)
    
    def get_top_n(self, query_tokens: List[str], n: int = 10) -> List[tuple]:
        """
        Get top N documents with scores.
        
        Returns:
            List of (doc_index, score) tuples sorted by score descending
        """
        if self._bm25 is None:
            return []
        
        scores = self.get_scores(query_tokens)
        top_indices = np.argsort(scores)[::-1][:n]
        return [(int(idx), float(scores[idx])) for idx in top_indices]
    
    def save(self, path: str):
        """Save index to disk."""
        data = {
            "corpus": self.corpus,
            "k1": self.k1,
            "b": self.b,
            "epsilon": self.epsilon,
        }
        with open(path, "wb") as f:
            pickle.dump(data, f)
        logger.info(f"Saved BM25 index to {path} ({len(self.corpus)} docs)")
    
    @classmethod
    def load(cls, path: str) -> "BM25Index":
        """Load index from disk."""
        with open(path, "rb") as f:
            data = pickle.load(f)
        
        index = cls(
            corpus=data["corpus"],
            k1=data.get("k1", 1.5),
            b=data.get("b", 0.75),
            epsilon=data.get("epsilon", 0.25),
        )
        logger.info(f"Loaded BM25 index from {path} ({len(index.corpus)} docs)")
        return index


def tokenize(text: str) -> List[str]:
    """
    Simple tokenization for BM25.
    Lowercase, split on whitespace, remove punctuation.
    """
    import re
    text = text.lower()
    # Keep alphanumeric and basic punctuation
    tokens = re.findall(r'\b\w+\b', text)
    return tokens


def tokenize_corpus(texts: List[str]) -> List[List[str]]:
    """Tokenize a list of texts."""
    return [tokenize(t) for t in texts]


class BM25Retriever:
    """
    High-level BM25 retriever with document metadata.
    """
    
    def __init__(self, index_path: Optional[str] = None):
        self.index: Optional[BM25Index] = None
        self.documents: List[Dict[str, Any]] = []  # Metadata for each doc
        self.index_path = index_path
        
        if index_path and os.path.exists(index_path):
            self.load(index_path)
    
    def add_documents(self, texts: List[str], metadatas: List[Dict[str, Any]]):
        """Add documents to index."""
        if len(texts) != len(metadatas):
            raise ValueError("texts and metadatas must have same length")
        
        tokenized = tokenize_corpus(texts)
        
        if self.index is None:
            self.index = BM25Index(tokenized)
        else:
            self.index.add_documents(tokenized)
        
        self.documents.extend(metadatas)
    
    def search(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """Search for query, return documents with scores."""
        if self.index is None:
            return []
        
        query_tokens = tokenize(query)
        results = self.index.get_top_n(query_tokens, top_k)
        
        output = []
        for idx, score in results:
            doc = self.documents[idx].copy()
            doc["bm25_score"] = score
            doc["doc_index"] = idx
            output.append(doc)
        
        return output
    
    def save(self, path: Optional[str] = None):
        """Save index and documents."""
        path = path or self.index_path
        if not path:
            raise ValueError("No save path specified")
        
        # Save BM25 index
        self.index.save(path)
        
        # Save documents metadata
        docs_path = path.replace(".pkl", "_docs.pkl")
        with open(docs_path, "wb") as f:
            pickle.dump(self.documents, f)
    
    def load(self, path: str):
        """Load index and documents."""
        self.index = BM25Index.load(path)
        docs_path = path.replace(".pkl", "_docs.pkl")
        if os.path.exists(docs_path):
            with open(docs_path, "rb") as f:
                self.documents = pickle.load(f)
        self.index_path = path