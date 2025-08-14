"""
GNAN - The AI Brain for Content Fingerprinting
Handles multi-modal content analysis and similarity matching
"""

import os
import hashlib
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime
import json

# AI/ML imports
import openai
from sentence_transformers import SentenceTransformer
import imagehash
from PIL import Image
import librosa
import ast
import difflib

class ContentFingerprinter:
    """
    Multi-modal content fingerprinting engine
    Supports: text, images, audio, code
    """
    
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        
    def generate_fingerprint(self, content: Any, content_type: str, metadata: Dict = None) -> Dict[str, Any]:
        """
        Generate a comprehensive fingerprint for any content type
        """
        fingerprint = {
            "fingerprint_id": self._generate_id(content, content_type),
            "content_type": content_type,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }
        
        if content_type == "text":
            fingerprint.update(self._fingerprint_text(content))
        elif content_type == "image":
            fingerprint.update(self._fingerprint_image(content))
        elif content_type == "audio":
            fingerprint.update(self._fingerprint_audio(content))
        elif content_type == "code":
            fingerprint.update(self._fingerprint_code(content))
        else:
            raise ValueError(f"Unsupported content type: {content_type}")
            
        return fingerprint
    
    def _generate_id(self, content: Any, content_type: str) -> str:
        """Generate unique ID for content"""
        content_str = str(content) if not isinstance(content, str) else content
        hash_obj = hashlib.sha256(f"{content_type}:{content_str}".encode())
        return f"fp_{content_type}_{hash_obj.hexdigest()[:16]}"
    
    def _fingerprint_text(self, text: str) -> Dict[str, Any]:
        """
        Text fingerprinting using:
        - OpenAI embeddings for semantic similarity
        - Sentence transformers for local processing
        - N-gram analysis for structural similarity
        """
        try:
            # OpenAI embedding (primary)
            response = self.openai_client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            openai_embedding = response.data[0].embedding
            
            # Local sentence transformer embedding (backup)
            local_embedding = self.sentence_model.encode(text).tolist()
            
            # Text statistics
            word_count = len(text.split())
            char_count = len(text)
            
            # N-gram fingerprint for structural similarity
            ngrams = self._extract_ngrams(text, n=3)
            
            return {
                "content_hash": hashlib.md5(text.encode()).hexdigest(),
                "openai_embedding": openai_embedding,
                "local_embedding": local_embedding,
                "word_count": word_count,
                "char_count": char_count,
                "ngram_signature": ngrams[:100],  # Top 100 n-grams
                "language": self._detect_language(text)
            }
            
        except Exception as e:
            print(f"Text fingerprinting error: {e}")
            # Fallback to local processing only
            local_embedding = self.sentence_model.encode(text).tolist()
            return {
                "content_hash": hashlib.md5(text.encode()).hexdigest(),
                "local_embedding": local_embedding,
                "word_count": len(text.split()),
                "char_count": len(text),
                "error": str(e)
            }
    
    def _fingerprint_image(self, image_path: str) -> Dict[str, Any]:
        """
        Image fingerprinting using:
        - Perceptual hashing (pHash, dHash, aHash)
        - CLIP embeddings for semantic understanding
        """
        try:
            image = Image.open(image_path)
            
            # Perceptual hashes
            phash = str(imagehash.phash(image))
            dhash = str(imagehash.dhash(image))
            ahash = str(imagehash.average_hash(image))
            whash = str(imagehash.whash(image))
            
            # Image metadata
            width, height = image.size
            mode = image.mode
            
            # TODO: Add CLIP embedding for semantic similarity
            # clip_embedding = self._get_clip_embedding(image)
            
            return {
                "content_hash": hashlib.md5(open(image_path, 'rb').read()).hexdigest(),
                "perceptual_hashes": {
                    "phash": phash,
                    "dhash": dhash,
                    "ahash": ahash,
                    "whash": whash
                },
                "dimensions": {"width": width, "height": height},
                "mode": mode,
                "file_size": os.path.getsize(image_path)
            }
            
        except Exception as e:
            return {"error": f"Image fingerprinting failed: {str(e)}"}
    
    def _fingerprint_audio(self, audio_path: str) -> Dict[str, Any]:
        """
        Audio fingerprinting using:
        - Whisper for transcription
        - Spectral analysis for audio characteristics
        - Chromagram for musical content
        """
        try:
            # Load audio
            y, sr = librosa.load(audio_path)
            
            # Audio characteristics
            duration = librosa.get_duration(y=y, sr=sr)
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            
            # Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
            
            # MFCC features (audio fingerprint)
            mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            mfcc_mean = np.mean(mfccs, axis=1).tolist()
            
            # TODO: Add Whisper transcription
            # transcription = self._whisper_transcribe(audio_path)
            
            return {
                "content_hash": hashlib.md5(open(audio_path, 'rb').read()).hexdigest(),
                "duration": duration,
                "sample_rate": sr,
                "tempo": float(tempo),
                "spectral_centroid_mean": float(np.mean(spectral_centroids)),
                "spectral_rolloff_mean": float(np.mean(spectral_rolloff)),
                "mfcc_features": mfcc_mean,
                "file_size": os.path.getsize(audio_path)
            }
            
        except Exception as e:
            return {"error": f"Audio fingerprinting failed: {str(e)}"}
    
    def _fingerprint_code(self, code: str) -> Dict[str, Any]:
        """
        Code fingerprinting using:
        - AST analysis for structural similarity
        - Token-based comparison
        - Function/class extraction
        """
        try:
            # Parse AST (assuming Python for now)
            tree = ast.parse(code)
            
            # Extract structural elements
            functions = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
            classes = [node.name for node in ast.walk(tree) if isinstance(node, ast.ClassDef)]
            imports = [node.module for node in ast.walk(tree) if isinstance(node, ast.Import)]
            
            # Code metrics
            lines = code.split('\n')
            line_count = len(lines)
            non_empty_lines = len([line for line in lines if line.strip()])
            
            # Token-based hash
            tokens = code.replace(' ', '').replace('\n', '').replace('\t', '')
            token_hash = hashlib.md5(tokens.encode()).hexdigest()
            
            # AST structure hash
            ast_dump = ast.dump(tree, annotate_fields=False)
            ast_hash = hashlib.md5(ast_dump.encode()).hexdigest()
            
            return {
                "content_hash": hashlib.md5(code.encode()).hexdigest(),
                "token_hash": token_hash,
                "ast_hash": ast_hash,
                "line_count": line_count,
                "non_empty_lines": non_empty_lines,
                "functions": functions,
                "classes": classes,
                "imports": imports,
                "complexity_score": self._calculate_complexity(tree)
            }
            
        except Exception as e:
            # Fallback for non-Python code
            return {
                "content_hash": hashlib.md5(code.encode()).hexdigest(),
                "line_count": len(code.split('\n')),
                "char_count": len(code),
                "error": f"AST parsing failed: {str(e)}"
            }
    
    def find_similar_content(self, fingerprint: Dict[str, Any], database: List[Dict[str, Any]], 
                           threshold: float = 0.8) -> List[Tuple[Dict[str, Any], float]]:
        """
        Find similar content in database based on fingerprint
        Returns list of (content, similarity_score) tuples
        """
        content_type = fingerprint["content_type"]
        matches = []
        
        for db_item in database:
            if db_item["content_type"] != content_type:
                continue
                
            similarity = self._calculate_similarity(fingerprint, db_item)
            if similarity >= threshold:
                matches.append((db_item, similarity))
        
        # Sort by similarity score (descending)
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches
    
    def _calculate_similarity(self, fp1: Dict[str, Any], fp2: Dict[str, Any]) -> float:
        """Calculate similarity between two fingerprints"""
        content_type = fp1["content_type"]
        
        if content_type == "text":
            return self._text_similarity(fp1, fp2)
        elif content_type == "image":
            return self._image_similarity(fp1, fp2)
        elif content_type == "audio":
            return self._audio_similarity(fp1, fp2)
        elif content_type == "code":
            return self._code_similarity(fp1, fp2)
        
        return 0.0
    
    def _text_similarity(self, fp1: Dict[str, Any], fp2: Dict[str, Any]) -> float:
        """Calculate text similarity using embeddings"""
        try:
            # Use OpenAI embeddings if available
            if "openai_embedding" in fp1 and "openai_embedding" in fp2:
                emb1 = np.array(fp1["openai_embedding"])
                emb2 = np.array(fp2["openai_embedding"])
                return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))
            
            # Fallback to local embeddings
            if "local_embedding" in fp1 and "local_embedding" in fp2:
                emb1 = np.array(fp1["local_embedding"])
                emb2 = np.array(fp2["local_embedding"])
                return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))
                
        except Exception as e:
            print(f"Text similarity error: {e}")
            
        return 0.0
    
    def _image_similarity(self, fp1: Dict[str, Any], fp2: Dict[str, Any]) -> float:
        """Calculate image similarity using perceptual hashes"""
        try:
            hashes1 = fp1.get("perceptual_hashes", {})
            hashes2 = fp2.get("perceptual_hashes", {})
            
            if not hashes1 or not hashes2:
                return 0.0
            
            # Compare multiple hash types and take the best match
            similarities = []
            
            for hash_type in ["phash", "dhash", "ahash", "whash"]:
                if hash_type in hashes1 and hash_type in hashes2:
                    hash1 = imagehash.hex_to_hash(hashes1[hash_type])
                    hash2 = imagehash.hex_to_hash(hashes2[hash_type])
                    diff = hash1 - hash2
                    similarity = 1.0 - (diff / 64.0)  # Normalize to 0-1
                    similarities.append(max(0.0, similarity))
            
            return max(similarities) if similarities else 0.0
            
        except Exception as e:
            print(f"Image similarity error: {e}")
            return 0.0
    
    def _audio_similarity(self, fp1: Dict[str, Any], fp2: Dict[str, Any]) -> float:
        """Calculate audio similarity using MFCC features"""
        try:
            mfcc1 = fp1.get("mfcc_features", [])
            mfcc2 = fp2.get("mfcc_features", [])
            
            if not mfcc1 or not mfcc2:
                return 0.0
            
            # Cosine similarity between MFCC features
            mfcc1 = np.array(mfcc1)
            mfcc2 = np.array(mfcc2)
            
            return float(np.dot(mfcc1, mfcc2) / (np.linalg.norm(mfcc1) * np.linalg.norm(mfcc2)))
            
        except Exception as e:
            print(f"Audio similarity error: {e}")
            return 0.0
    
    def _code_similarity(self, fp1: Dict[str, Any], fp2: Dict[str, Any]) -> float:
        """Calculate code similarity using AST and token analysis"""
        try:
            # AST structure similarity
            ast_sim = 1.0 if fp1.get("ast_hash") == fp2.get("ast_hash") else 0.0
            
            # Token similarity
            token_sim = 1.0 if fp1.get("token_hash") == fp2.get("token_hash") else 0.0
            
            # Function/class name similarity
            funcs1 = set(fp1.get("functions", []))
            funcs2 = set(fp2.get("functions", []))
            func_sim = len(funcs1.intersection(funcs2)) / max(len(funcs1.union(funcs2)), 1)
            
            # Weighted combination
            return 0.4 * ast_sim + 0.3 * token_sim + 0.3 * func_sim
            
        except Exception as e:
            print(f"Code similarity error: {e}")
            return 0.0
    
    # Helper methods
    def _extract_ngrams(self, text: str, n: int = 3) -> List[str]:
        """Extract n-grams from text"""
        words = text.lower().split()
        return [' '.join(words[i:i+n]) for i in range(len(words)-n+1)]
    
    def _detect_language(self, text: str) -> str:
        """Simple language detection (placeholder)"""
        # TODO: Implement proper language detection
        return "en"
    
    def _calculate_complexity(self, tree) -> int:
        """Calculate code complexity score"""
        complexity = 0
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.While, ast.For, ast.Try)):
                complexity += 1
        return complexity

# Global instance
gnan = ContentFingerprinter()
