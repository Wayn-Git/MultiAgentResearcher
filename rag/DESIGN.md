# LuminaAI - Integrated Research RAG Design Document

**Date**: 2025-07-17  
**Status**: Design Phase (Pre-Implementation)  
**Goal**: Enhance existing `retrieval_agent.py` with Pinecone hybrid search (dense + sparse) for educational reference implementation

---

## 1. Context: Existing Pipeline

```
User Query
    │
    ▼
Task Agent (llama-3.3-70b) → 3-4 research tasks
    │
    ▼
Retriever Agent (ENHANCE HERE) ← Currently: Tavily web search only
    │
    ▼
Synthesis Agent → Critic → Cross-Synthesis → Gap → Report
```

**Integration Point**: `agents/retrieval_agent.py` `retrieve()` function  
**Current Output**: `retrieval_results.json` (per-task extracted sources)  
**New Output**: Same format, but sources include both web + vector search results

---

## 2. Architecture Decisions (from brainstorming)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Vector DB** | Pinecone (serverless) | Free tier, managed, good LangChain integration |
| **Index Strategy** | Single index, metadata namespaces | Simpler than multi-index routing; `source_type` filter |
| **Dense Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` (384-dim) | Fast, local, no API cost, good quality |
| **Sparse Retrieval** | Local BM25 via `rank-bm25` (Phase 1) | Learn internals first; swap to Pinecone managed later |
| **Hybrid Merge** | Reciprocal Rank Fusion (RRF, k=60) | Simple, parameter-free, effective |
| **Web Storage** | Store all Tavily results with TTL (30 days) | Let retrieval + LLM judge relevance; avoid premature filtering |
| **Threshold** | No fixed similarity threshold | Use top-k (10) + LLM extraction to judge relevance |

---

## 3. Data Model

### Pinecone Vector Record
```json
{
  "id": "uuid-or-hash",
  "values": [0.1, -0.3, ...],  // 384-dim dense vector
  "metadata": {
    "text": "source text chunk (max 1000 chars)",
    "source_type": "pdf" | "web" | "research_report",
    "source_id": "folder_name_or_url_hash",
    "title": "document title",
    "url": "https://...",
    "chunk_index": 0,
    "total_chunks": 5,
    "timestamp": 1700000000,
    "task_description": "original research task this supports"
  }
}
```

### Metadata Filter Examples
```python
# Query only uploaded PDFs
filter = {"source_type": "pdf"}

# Query web + research reports
filter = {"source_type": {"$in": ["web", "research_report"]}}

# Query specific research session
filter = {"source_id": "impact_of_ai_on_job_markets"}
```

---

## 4. Enhanced Retrieval Flow

```
Task Description
       │
       ▼
┌─────────────────────────────────────────┐
│  DENSE RETRIEVAL (Pinecone)             │
│  embed(task) → query(index, filter)     │
│  → top-10 dense results                 │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  SPARSE RETRIEVAL (Local BM25)          │
│  BM25(task, corpus) → top-10 sparse     │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  HYBRID MERGE (RRF)                     │
│  merged = rrf(dense_results, sparse)    │
│  → top-10 combined                      │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  WEB SEARCH (Tavily - existing)         │
│  tavily.search(task) → top-3            │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  LLM EXTRACTION (existing logic)        │
│  Combine: vector_results + web_results  │
│  → structured JSON per source           │
└─────────────────────────────────────────┘
```

---

## 5. File Structure (Target)

```
rag/
├── DESIGN.md                    # This file
├── requirements.txt             # New dependencies
├── config.py                    # Pinecone, embedding config
├── embeddings/
│   ├── __init__.py
│   ├── dense.py                 # SentenceTransformer wrapper
│   └── sparse.py                # BM25 corpus builder + search
├── vector_store/
│   ├── __init__.py
│   ├── pinecone_client.py       # Pinecone init, upsert, query
│   └── hybrid_retriever.py      # RRF merge + metadata filters
├── ingestion/
│   ├── __init__.py
│   ├── pdf_ingestor.py          # PDF → chunks → embed → upsert
│   ├── web_ingestor.py          # Tavily results → upsert (with TTL)
│   └── research_ingestor.py     # Existing research reports → upsert
├── retrieval/
│   ├── __init__.py
│   └── enhanced_retriever.py    # Main entry: retrieve(task) → results
└── tests/
    ├── test_embeddings.py
    ├── test_bm25.py
    ├── test_hybrid_retrieval.py
    └── test_ingestion.py
```

---

## 6. Integration with Existing `retrieval_agent.py`

### Minimal Changes Required

**Current `retrieve()`** (lines 86-161):
1. Load tasks from `tasks.json`
2. For each task: Tavily search → LLM extraction → save

**Enhanced `retrieve()`**:
1. Load tasks from `tasks.json`
2. **Ensure vector index exists** (lazy init)
3. For each task:
   - **Hybrid vector search** (dense + sparse + RRF) → top-10 chunks
   - **Tavily web search** (existing) → top-3 results
   - **Combine** both source sets for LLM extraction
   - LLM extraction (existing prompt, more sources)
4. Save `retrieval_results.json` (same format, richer sources)

### New Imports in `retrieval_agent.py`
```python
from rag.retrieval.enhanced_retriever import hybrid_retrieve
from rag.ingestion.web_ingestor import ingest_web_results
```

---

## 7. Dependencies (requirements.txt additions)

```txt
# Vector & Embeddings
pinecone-client>=3.0.0
sentence-transformers>=3.0.0
rank-bm25>=0.2.2

# Utilities
uuid
hashlib
pickle
```

---

## 8. Implementation Phases

### Phase 1: Core Infrastructure (Day 1)
- [ ] `config.py` - Pinecone API key, index name, embedding model
- [ ] `embeddings/dense.py` - SentenceTransformer wrapper with caching
- [ ] `embeddings/sparse.py` - BM25 corpus build/search (pickle persistence)
- [ ] `vector_store/pinecone_client.py` - init, upsert, query with filters

### Phase 2: Hybrid Retrieval (Day 1-2)
- [ ] `vector_store/hybrid_retriever.py` - RRF merge, metadata filters
- [ ] Unit tests for dense, sparse, hybrid

### Phase 3: Ingestion Pipelines (Day 2)
- [ ] `ingestion/pdf_ingestor.py` - PyPDF2/pdfplumber → chunk → embed → upsert
- [ ] `ingestion/web_ingestor.py` - Tavily results → upsert with TTL metadata
- [ ] `ingestion/research_ingestor.py` - Load existing `model_output_data/*/final_report.md`

### Phase 4: Integration (Day 2-3)
- [ ] `retrieval/enhanced_retriever.py` - Main `hybrid_retrieve(task)` function
- [ ] Modify `agents/retrieval_agent.py` to use enhanced retriever
- [ ] End-to-end test with existing pipeline

### Phase 5: Polish (Day 3)
- [ ] Error handling, retries, logging
- [ ] Config via `.env` (Pinecone API key, index name)
- [ ] README with usage examples

---

## 9. Key Learning Objectives (Educational Focus)

1. **Understand dense vs sparse retrieval** - Implement both, see failure cases
2. **RRF merge mechanics** - Why k=60? What happens with different k?
3. **Metadata filtering** - How Pinecone filters work vs post-filtering
4. **Chunking strategies** - Fixed size vs semantic vs recursive
5. **Embedding model tradeoffs** - MiniLM vs MPNet vs OpenAI (dimensions, speed, quality)
6. **BM25 internals** - TF-IDF, document length normalization, k1/b parameters
7. **Hybrid failure modes** - When dense wins, when sparse wins, when both fail

---

## 10. Open Questions (Resolve During Implementation)

1. **Chunk size**: 500 chars? 1000? Overlap 100? Test with research reports.
2. **RRF k parameter**: 60 is standard, but tune for our corpus size.
3. **BM25 corpus persistence**: Rebuild on every run? Pickle to disk? Incremental update?
4. **Web result deduplication**: Same URL across tasks? Hash-based dedup.
5. **TTL enforcement**: Background job? On-read filter? Pinecone doesn't support TTL natively.
6. **Namespace vs metadata filter**: Use Pinecone namespaces for `source_type` or metadata `$in`?

---

## 11. Next Steps (Tomorrow)

1. **Create `requirements.txt`** with new deps
2. **Implement `config.py`** - load Pinecone key, index name, embedding model
3. **Build `embeddings/dense.py`** - test embedding generation
4. **Build `embeddings/sparse.py`** - test BM25 on sample corpus
5. **Verify Pinecone connection** - create index, upsert test vectors

---

## 12. Reference: Existing Code to Preserve

- `agents/retrieval_agent.py` - Keep extraction prompt, LLM call, output format
- `utils/llm_utils.py` - `call_with_retry`, `estimate_tokens`, `trim_to_token_budget`
- `utils/config.py` - Model configs (add Pinecone config here)
- `run_pipeline.py` - Pipeline orchestration (no changes needed)

---

*Design complete. Ready for implementation phase.*