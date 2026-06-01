"""
Search tools for SwarmDev agents.
Provides RAG and code search capabilities using Qdrant.
"""

import os
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

class SearchTools:
    """Tools for searching code and documentation."""

    def __init__(self, url: Optional[str] = None, api_key: Optional[str] = None):
        self.url = url or os.getenv("QDRANT_URL", "http://localhost:6333")
        self.api_key = api_key or os.getenv("QDRANT_API_KEY")
        self.client: Optional[QdrantClient] = None

    def connect(self) -> QdrantClient:
        """Connect to Qdrant vector database."""
        self.client = QdrantClient(url=self.url, api_key=self.api_key)
        return self.client

    async def index_code(self, collection_name: str, files: Dict[str, str], embeddings: List[List[float]]):
        """Index code files in Qdrant."""
        if not self.client:
            self.connect()

        # Create collection if not exists
        try:
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=len(embeddings[0]), distance=Distance.COSINE),
            )
        except Exception:
            pass  # Collection already exists

        # Index files
        points = []
        for idx, (path, content) in enumerate(files.items()):
            points.append(
                PointStruct(
                    id=idx,
                    vector=embeddings[idx],
                    payload={"path": path, "content": content},
                )
            )

        if points:
            self.client.upsert(collection_name=collection_name, points=points)

    async def search_code(self, collection_name: str, query_embedding: List[float], limit: int = 5) -> List[Dict[str, Any]]:
        """Search for similar code using vector embedding."""
        if not self.client:
            self.connect()

        results = self.client.search(
            collection_name=collection_name,
            query_vector=query_embedding,
            limit=limit,
        )

        return [
            {"path": hit.payload.get("path"), "content": hit.payload.get("content"), "score": hit.score}
            for hit in results
        ]

    async def get_project_context(self, project_id: str, query: str) -> str:
        """Get relevant project context for a query."""
        # This would use embeddings from the project files
        # For now, return a placeholder
        return f"Context for project {project_id} about: {query}"
