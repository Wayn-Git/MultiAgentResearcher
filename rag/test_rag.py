"""
Test script for RAG system components.
Run with: python -m rag.test_rag
"""

import os
import sys
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s - %(name)s - %(message)s")
logger = logging.getLogger(__name__)

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_config():
    """Test configuration loading."""
    from rag.config import validate_config
    
    logger.info("Testing config...")
    result = validate_config()
    logger.info(f"Config valid: {result['valid']}")
    if result['issues']:
        for issue in result['issues']:
            logger.warning(f"  Issue: {issue}")
    logger.info(f"Config: {result['config']}")


def test_embeddings():
    """Test local embeddings."""
    from rag.embeddings import get_embedder, list_models
    
    logger.info("Testing embeddings...")
    
    # List available models
    logger.info(f"Available models: {list_models()}")
    
    # Test default embedder
    embedder = get_embedder("minilm")
    logger.info(f"Embedder dimension: {embedder.dimension}")
    
    # Test embedding
    texts = ["Hello world", "This is a test document about AI"]
    embeddings = embedder.embed(texts)
    logger.info(f"Embeddings shape: {embeddings.shape}")
    
    # Test single query
    query_emb = embedder.embed_query("What is AI?")
    logger.info(f"Query embedding length: {len(query_emb)}")


def test_bm25():
    """Test BM25 index."""
    from rag.embeddings import BM25Retriever
    
    logger.info("Testing BM25...")
    
    retriever = BM25Retriever()
    
    # Add test documents
    docs = [
        "Machine learning is a subset of artificial intelligence",
        "Deep learning uses neural networks with multiple layers",
        "Natural language processing enables computers to understand text",
    ]
    metadatas = [
        {"source": "wiki", "topic": "ml"},
        {"source": "wiki", "topic": "dl"},
        {"source": "wiki", "topic": "nlp"},
    ]
    
    retriever.add_documents(docs, metadatas)
    
    # Search
    results = retriever.search("neural networks", top_k=2)
    logger.info(f"BM25 results: {len(results)}")
    for r in results:
        logger.info(f"  Score: {r['bm25_score']:.3f} - {r['text'][:50]}...")


def test_text_processing():
    """Test text chunking."""
    from rag.utils.text_processing import chunk_text_recursive, extract_pdf_text
    
    logger.info("Testing text processing...")
    
    # Test chunking
    long_text = "This is a sentence. " * 100  # ~2000 chars
    chunks = chunk_text_recursive(long_text, chunk_size=500, chunk_overlap=100)
    logger.info(f"Created {len(chunks)} chunks")
    for i, chunk in enumerate(chunks[:3]):
        logger.info(f"  Chunk {i}: {len(chunk.text)} chars - {chunk.text[:50]}...")
    
    # Test PDF extraction (if PDF exists)
    pdf_path = os.path.join(os.path.dirname(__file__), "data", "test.pdf")
    if os.path.exists(pdf_path):
        pages = extract_pdf_text(pdf_path)
        logger.info(f"Extracted {len(pages)} pages from PDF")


def test_vector_store():
    """Test Pinecone vector store (requires API key)."""
    from rag.config import PINECONE_API_KEY
    
    if not PINECONE_API_KEY:
        logger.warning("Skipping Pinecone test - PINECONE_API_KEY not set")
        return
    
    from rag.vector_store import PineconeVectorStore, VectorRecord
    
    logger.info("Testing Pinecone vector store...")
    
    try:
        store = PineconeVectorStore()
        
        # Create index if needed
        created = store.create_index_if_not_exists()
        logger.info(f"Index created: {created}")
        
        # Get stats
        stats = store.describe_index_stats()
        logger.info(f"Index stats: {stats}")
        
    except Exception as e:
        logger.error(f"Pinecone test failed: {e}")


def test_retrieval():
    """Test enhanced retriever (requires Pinecone)."""
    from rag.config import PINECONE_API_KEY
    
    if not PINECONE_API_KEY:
        logger.warning("Skipping retrieval test - PINECONE_API_KEY not set")
        return
    
    from rag.retrieval import retrieve_with_fallback
    
    logger.info("Testing enhanced retriever...")
    
    try:
        results = retrieve_with_fallback("machine learning", top_k=5)
        logger.info(f"Retrieved {len(results)} results")
        for r in results:
            logger.info(f"  {r.source_type}: {r.text[:80]}... (score: {r.score:.3f})")
    except Exception as e:
        logger.error(f"Retrieval test failed: {e}")


def test_ingestion():
    """Test PDF ingestion pipeline."""
    from rag.config import PINECONE_API_KEY
    
    if not PINECONE_API_KEY:
        logger.warning("Skipping ingestion test - PINECONE_API_KEY not set")
        return
    
    logger.info("Testing ingestion pipeline...")
    
    # This would test the full pipeline:
    # 1. Extract PDF text
    # 2. Chunk
    # 3. Embed
    # 4. Store in Pinecone
    # 5. Store in BM25
    
    logger.info("Ingestion test placeholder - implement full pipeline")


if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("RAG SYSTEM TESTS")
    logger.info("=" * 50)
    
    test_config()
    logger.info("-" * 50)
    
    test_embeddings()
    logger.info("-" * 50)
    
    test_bm25()
    logger.info("-" * 50)
    
    test_text_processing()
    logger.info("-" * 50)
    
    test_vector_store()
    logger.info("-" * 50)
    
    test_retrieval()
    logger.info("-" * 50)
    
    test_ingestion()
    
    logger.info("=" * 50)
    logger.info("ALL TESTS COMPLETED")
    logger.info("=" * 50)