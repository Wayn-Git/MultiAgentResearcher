"""
Vector store module - Pinecone client with hybrid search.
"""

from .pinecone_client import PineconeClient, VectorRecord, create_client

__all__ = ["PineconeClient", "VectorRecord", "create_client"]