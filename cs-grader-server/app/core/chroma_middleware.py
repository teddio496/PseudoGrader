import chromadb
from chromadb.config import Settings
from typing import Optional
import json
from app.core.config import settings, COHERE_CLIENT

class ChromaMiddleware:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
        self.collection = self.client.get_or_create_collection(
            name="algorithms",
            metadata={"hnsw:space": "cosine"}
        )

    def _generate_embedding(self, text: str) -> list[float]:
        """Generate embedding using Cohere API"""
        response = COHERE_CLIENT.embed(
            texts=[text],
            model=settings.COHERE_EMBEDDING_MODEL
        )
        return response.embeddings[0]
    

    def get_collection_stats(self) -> dict:
        """Get statistics about the collection"""
        return {
            "total_solutions": len(self.collection.get()['ids']),
            "collection_name": self.collection.name
        } 