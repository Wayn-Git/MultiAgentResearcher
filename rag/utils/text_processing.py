"""
Text processing utilities for RAG.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Iterator
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    """A chunk of text with metadata."""
    text: str
    chunk_index: int
    start_char: int
    end_char: int
    metadata: Dict[str, Any]


def clean_text(text: str) -> str:
    """Clean and normalize text."""
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove zero-width characters
    text = text.replace('\u200b', '').replace('\ufeff', '')
    return text.strip()


def split_by_paragraphs(text: str) -> List[str]:
    """Split text by double newlines (paragraphs)."""
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    return paragraphs


def chunk_text_recursive(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    separators: Optional[List[str]] = None,
) -> List[TextChunk]:
    """
    Recursive character text splitting (LangChain style).
    
    Tries separators in order, falls back to character splitting.
    """
    if separators is None:
        separators = ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ", ""]
    
    text = clean_text(text)
    chunks = []
    
    def _split(text: str, separators: List[str]) -> List[str]:
        if not separators:
            return [text]
        
        sep = separators[0]
        if sep == "":
            # Character-level fallback
            return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size - chunk_overlap)]
        
        parts = text.split(sep)
        if len(parts) == 1:
            return _split(text, separators[1:])
        
        result = []
        current = ""
        for part in parts:
            if len(current) + len(part) + len(sep) <= chunk_size:
                current += part + sep
            else:
                if current:
                    result.append(current.rstrip(sep))
                current = part + sep
        
        if current:
            result.append(current.rstrip(sep))
        
        # Recursively split oversized chunks
        final = []
        for chunk in result:
            if len(chunk) > chunk_size:
                final.extend(_split(chunk, separators[1:]))
            else:
                final.append(chunk)
        
        return final
    
    raw_chunks = _split(text, separators)
    
    # Add overlap and create TextChunk objects
    for i, chunk in enumerate(raw_chunks):
        start = text.find(chunk)
        if start == -1:
            # Fallback if chunk not found exactly
            start = sum(len(c) for c in raw_chunks[:i]) + i * 2  # rough estimate
        
        chunks.append(TextChunk(
            text=chunk,
            chunk_index=i,
            start_char=start,
            end_char=start + len(chunk),
            metadata={}
        ))
    
    return chunks


def chunk_text_fixed(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[TextChunk]:
    """
    Simple fixed-size chunking with overlap.
    """
    text = clean_text(text)
    chunks = []
    
    for i in range(0, len(text), chunk_size - chunk_overlap):
        chunk_text = text[i:i + chunk_size]
        if len(chunk_text) < 100:  # Skip tiny chunks
            continue
        
        chunks.append(TextChunk(
            text=chunk_text,
            chunk_index=len(chunks),
            start_char=i,
            end_char=min(i + chunk_size, len(text)),
            metadata={}
        ))
    
    return chunks


def extract_pdf_text(pdf_path: str) -> List[Dict[str, Any]]:
    """
    Extract text from PDF with page metadata.
    
    Returns list of {"page": int, "text": str} dicts.
    """
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber not installed. Run: pip install pdfplumber")
        raise
    
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text and text.strip():
                pages.append({
                    "page": i + 1,
                    "text": clean_text(text),
                })
    
    logger.info(f"Extracted {len(pages)} pages from {pdf_path}")
    return pages


def chunk_pdf_pages(
    pages: List[Dict[str, Any]],
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> List[TextChunk]:
    """Chunk PDF pages preserving page metadata."""
    all_chunks = []
    
    for page in pages:
        page_chunks = chunk_text_recursive(
            page["text"],
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        
        for chunk in page_chunks:
            chunk.metadata["page"] = page["page"]
            chunk.metadata["source_type"] = "pdf"
            all_chunks.append(chunk)
    
    return all_chunks