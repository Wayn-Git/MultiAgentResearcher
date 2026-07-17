"""
Ingestion module - PDF, web, and research report ingestion.
"""

from .pdf_ingestor import ingest_pdf, list_ingested_pdfs, delete_pdf
from .web_ingestor import (
    ingest_web_results,
    ingest_tavily_results,
    list_web_sources,
    cleanup_old_web_results,
)
from .research_ingestor import (
    find_research_sessions,
    load_research_report,
    ingest_research_report,
    ingest_all_research_reports,
)

__all__ = [
    "ingest_pdf",
    "list_ingested_pdfs",
    "delete_pdf",
    "ingest_web_results",
    "ingest_tavily_results",
    "list_web_sources",
    "cleanup_old_web_results",
    "find_research_sessions",
    "load_research_report",
    "ingest_research_report",
    "ingest_all_research_reports",
]