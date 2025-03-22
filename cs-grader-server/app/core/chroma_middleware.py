import chromadb
from chromadb.config import Settings
from typing import List, Dict, Optional
import json
from app.core.config import settings, COHERE_CLIENT

class ChromaMiddleware:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
        self.collection = self.client.get_or_create_collection(
            name="code_snippets",
            metadata={"hnsw:space": "cosine"}
        )

    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Cohere API"""
        response = COHERE_CLIENT.embed(
            texts=[text],
            model=settings.COHERE_EMBEDDING_MODEL
        )
        return response.embeddings[0]

    def add_solution(self, question: str, pseudocode: str, metadata: Optional[Dict] = None) -> None:
        """Add a new pseudocode solution to the database"""
        # Generate embeddings
        question_embedding = self._generate_embedding(question)
        pseudocode_embedding = self._generate_embedding(pseudocode)
        
        # Combine embeddings (average them)
        combined_embedding = [
            (q + p) / 2 for q, p in zip(question_embedding, pseudocode_embedding)
        ]
        
        # Prepare metadata
        solution_metadata = {
            "question": question,
            "pseudocode": pseudocode,
            **(metadata or {})
        }
        
        # Add to ChromaDB
        self.collection.add(
            embeddings=[combined_embedding],
            documents=[json.dumps(solution_metadata)],
            metadatas=[solution_metadata],
            ids=[f"solution_{len(self.collection.get()['ids'])}"]
        )

    def find_similar_solutions(self, question: str, pseudocode: str, n_results: int = 5) -> List[Dict]:
        """Find similar pseudocode solutions"""
        # Generate embeddings for the query
        question_embedding = self._generate_embedding(question)
        pseudocode_embedding = self._generate_embedding(pseudocode)
        
        # Combine embeddings (average them)
        query_embedding = [
            (q + p) / 2 for q, p in zip(question_embedding, pseudocode_embedding)
        ]
        
        # Query ChromaDB
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        
        # Process results
        similar_solutions = []
        for i in range(len(results['documents'][0])):
            solution = {
                "question": results['metadatas'][0][i]["question"],
                "pseudocode": results['metadatas'][0][i]["pseudocode"],
                "similarity": 1 - results['distances'][0][i]  # Convert distance to similarity
            }
            similar_solutions.append(solution)
        
        return similar_solutions

    def get_collection_stats(self) -> Dict:
        """Get statistics about the collection"""
        return {
            "total_solutions": len(self.collection.get()['ids']),
            "collection_name": self.collection.name
        } 