import chromadb
from typing import Any, List, cast
import json
from app.core.config import settings, COHERE_CLIENT
from app.core.logging import setup_logger

logger = setup_logger("chroma_middleware")

class ChromaMiddleware:
    def __init__(self):
        logger.info("Initializing ChromaMiddleware")
        self.client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
        self.collection = self.client.get_or_create_collection(
            name="algorithms",
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"Connected to ChromaDB collection: {self.collection.name}")
        logger.info(f"Collection stats: {self.get_collection_stats()}")

    async def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Cohere API"""
        logger.debug(f"Generating embedding for text: {text[:100]}...")
        try:
            response = await COHERE_CLIENT.embed(
                texts=[text],
                model=settings.COHERE_EMBEDDING_MODEL,
                input_type="search_query",
                embedding_types=["float"]
            )
            
            if hasattr(response, "embeddings") and response.embeddings:
                first_embedding = response.embeddings.float_[0]
                return first_embedding
            else:
                logger.error("Could not extract embedding from response")
                return []
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return []

    async def find_algorithms_by_question(self, question: str, n_results: int = 5) -> list[dict[str, Any]]:
        """Find algorithms by question"""
        logger.info(f"Searching for algorithms matching question: {question[:100]}...")
        question_embedding = await self._generate_embedding(question)
        if not question_embedding:
            logger.error("Failed to generate question embedding")
            return []
            
        results = self.collection.query(
            query_embeddings=[question_embedding],
            n_results=n_results
        )
        
        if not results:
            logger.warning("No results found in ChromaDB")
            return []
            
        documents = results.get('documents', [[]])
        distances = results.get('distances', [[]])
        
        if not documents or not documents[0]:
            logger.warning("No documents found in results")
            return []
            
        algorithms = []
        for i, doc in enumerate(documents[0]):
            try:
                # First try to parse as JSON
                doc_data = json.loads(doc)
                algorithms.append({
                    "question": doc_data.get("question", ""),
                    "pseudocode": doc_data.get("pseudocode", ""),
                    "similarity": 1 - distances[0][i] if distances and distances[0] and i < len(distances[0]) else 0.0
                })
            except json.JSONDecodeError as e:
                # logger.error(f"Failed to parse document as JSON: {e}")
                # logger.error(f"Document: {doc}")
                
                # Try to extract information from text format if it's not valid JSON
                try:
                    # Try to parse text format as a fallback
                    if doc.startswith("Algorithm:"):
                        lines = doc.split("\n")
                        algorithm_name = ""
                        question = ""
                        description = ""
                        
                        for j, line in enumerate(lines):
                            if line.startswith("Algorithm:"):
                                algorithm_name = line.replace("Algorithm:", "").strip()
                            elif line.startswith("Summary:"):
                                question = line.replace("Summary:", "").strip()
                            elif line.startswith("Description:"):
                                description = line.replace("Description:", "").strip()
                                
                        if algorithm_name and (question or description):
                            algorithms.append({
                                "question": question or algorithm_name,
                                "pseudocode": description or "",
                                "similarity": 1 - distances[0][i] if distances and distances[0] and i < len(distances[0]) else 0.0
                            })
                except Exception as ex:
                    logger.error(f"Failed to parse document in alternative format: {ex}")
                    continue
        
        logger.info(f"Found {len(algorithms)} matching algorithms")
        return algorithms

    def get_collection_stats(self) -> dict[str, Any]:
        """Get statistics about the collection"""
        stats = {
            "total_solutions": self.collection.count(),
            "collection_name": self.collection.name
        }
        logger.info(f"Collection stats: {stats}")
        return stats 