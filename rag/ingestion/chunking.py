"""
Text chunking utilities for document ingestion.
"""

import re
import logging
from typing import List, Dict, Any, Iterator, Optional
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
    # Remove excessive punctuation
    text = re.sub(r'[.]{3,}', '...', text)
    return text.strip()


def split_into_chunks(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    min_chunk_size: int = 100,
) -> List[TextChunk]:
    """
    Split text into overlapping chunks.
    
    Args:
        text: Input text
        chunk_size: Target chunk size in characters
        chunk_overlap: Overlap between chunks
        min_chunk_size: Discard chunks smaller than this
    
    Returns:
        List of TextChunk objects
    """
    text = clean_text(text)
    
    if len(text) <= chunk_size:
        return [TextChunk(
            text=text,
            chunk_index=0,
            start_char=0,
            end_char=len(text),
            metadata={}
        )]
    
    chunks = []
    start = 0
    chunk_index = 0
    
    while start < len(text):
        end = min(start + chunk_size, len(text))
        
        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence end within last 200 chars
            search_start = max(start, end - 200)
            sentence_end = text.rfind('. ', search_start, end)
            if sentence_end != -1:
                end = sentence_end + 1
        
        chunk_text = text[start:end].strip()
        
        if len(chunk_text) >= min_chunk_size:
            chunks.append(TextChunk(
                text=chunk_text,
                chunk_index=chunk_index,
                start_char=start,
                end_char=end,
                metadata={"char_start": start, "char_end": end}
            ))
            chunk_index += 1
        
        # Move start with overlap
        start = end - chunk_overlap
        if start < 0:
            start = 0
    
    logger.debug(f"Split text into {len(chunks)} chunks")
    return chunks


def split_by_paragraphs(
    text: str,
    max_chunk_size: int = 1000,
    overlap: int = 200,
) -> List[TextChunk]:
    """Split by paragraphs, then combine into chunks up to max_chunk_size."""
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    
    chunks = []
    current_chunk = ""
    chunk_start = 0
    chunk_index = 0
    
    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 <= max_chunk_size:
            if current_chunk:
                current_chunk += "\n\n" + para
            else:
                current_chunk = para
        else:
            # Save current chunk
            if current_chunk:
                chunks.append(TextChunk(
                    text=current_chunk,
                    chunk_index=chunk_index,
                    start_char=chunk_start,
                    end_char=chunk_start + len(current_chunk),
                    metadata={}
                ))
                chunk_index += 1
            
            # Start new chunk
            chunk_start = len(text) - len(current_chunk) - len(para) - 2
            current_chunk = para
    
    # Last chunk
    if current_chunk:
        chunks.append(TextChunk(
            text=current_chunk,
            chunk_index=chunk_index,
            start_char=chunk_start,
            end_char=chunk_start + len(current_chunk),
            metadata={}
        ))
    
    return chunks