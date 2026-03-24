"""
Ollama Client for Local LLM Integration
"""
import ollama
from typing import List, Dict, Optional
from config import Config
from backend.llm.prompts import *


class OllamaClient:
    """Client for interacting with Ollama local LLM"""
    
    def __init__(self, model: str = None, base_url: str = None):
        self.model = model or Config.OLLAMA_MODEL
        self.base_url = base_url or Config.OLLAMA_BASE_URL
        self.client = ollama.Client(host=self.base_url)
    
    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        """Generate text from prompt"""
        try:
            response = self.client.generate(
                model=self.model,
                prompt=prompt,
                options={
                    'temperature': temperature,
                    'num_predict': max_tokens,
                }
            )
            return response['response'].strip()
        except Exception as e:
            print(f"Error generating response: {e}")
            return ""
    
    def generate_queries(self, topic: str, num_queries: int = 5) -> List[str]:
        """Generate search queries for a research topic"""
        prompt = QUERY_GENERATION_PROMPT.format(
            topic=topic,
            num_queries=num_queries
        )
        
        response = self.generate(prompt, temperature=0.8)
        
        # Parse queries from response
        queries = [q.strip() for q in response.split('\n') if q.strip()]
        # Remove numbering if present
        queries = [q.lstrip('0123456789.-) ') for q in queries]
        
        return queries[:num_queries]
    
    def refine_queries(self, topic: str, initial_queries: List[str], 
                      results_summary: str, num_queries: int = 3) -> List[str]:
        """Refine search queries based on initial results"""
        prompt = QUERY_REFINEMENT_PROMPT.format(
            topic=topic,
            initial_queries='\n'.join(initial_queries),
            results_summary=results_summary,
            num_queries=num_queries
        )
        
        response = self.generate(prompt, temperature=0.8)
        queries = [q.strip().lstrip('0123456789.-) ') for q in response.split('\n') if q.strip()]
        
        return queries[:num_queries]
    
    def analyze_content(self, topic: str, content: str) -> Dict[str, any]:
        """Analyze content and extract key information"""
        prompt = CONTENT_ANALYSIS_PROMPT.format(
            topic=topic,
            content=content[:4000]  # Limit content length
        )
        
        response = self.generate(prompt, temperature=0.5, max_tokens=1000)
        
        return {
            'summary': response,
            'relevance_score': self._estimate_relevance(response)
        }
    
    def synthesize_research(self, topic: str, information: List[Dict], depth: str = "standard") -> str:
        """Synthesize research findings into a coherent report"""
        # Prepare information summary
        info_text = self._prepare_information_summary(information)
        
        # Set word count and token limits based on depth
        depth_config = {
            'quick': {'word_count': '1500-2000', 'max_tokens': 3000},
            'standard': {'word_count': '3000-3500', 'max_tokens': 5000},
            'deep': {'word_count': '4000-4500', 'max_tokens': 6000}
        }
        
        config = depth_config.get(depth, depth_config['standard'])
        
        prompt = SYNTHESIS_PROMPT.format(
            topic=topic,
            information=info_text,
            word_count=config['word_count']
        )
        
        response = self.generate(prompt, temperature=0.6, max_tokens=config['max_tokens'])
        
        return response
    
    def format_ieee(self, content: str, citations: List[Dict]) -> str:
        """Format content according to IEEE standards"""
        citations_text = self._format_citations_list(citations)
        
        prompt = IEEE_FORMATTING_PROMPT.format(
            content=content,
            citations=citations_text
        )
        
        response = self.generate(prompt, temperature=0.3, max_tokens=4000)
        
        return response
    
    def generate_section(self, section_name: str, topic: str, 
                        information: str, context: str = "") -> str:
        """Generate a specific section of the research paper"""
        prompt = SECTION_GENERATION_PROMPT.format(
            section_name=section_name,
            topic=topic,
            information=information,
            context=context
        )
        
        response = self.generate(prompt, temperature=0.6, max_tokens=2000)
        
        return response
    
    def extract_citation(self, url: str, title: str, content: str, date: str) -> str:
        """Extract and format citation information"""
        prompt = CITATION_EXTRACTION_PROMPT.format(
            url=url,
            title=title,
            content=content[:500],
            date=date
        )
        
        response = self.generate(prompt, temperature=0.3, max_tokens=200)
        
        return response
    
    def _prepare_information_summary(self, information: List[Dict]) -> str:
        """Prepare information for synthesis"""
        summary_parts = []
        for i, info in enumerate(information[:20], 1):  # Limit to top 20 sources
            summary_parts.append(
                f"[Source {i}] {info.get('title', 'Untitled')}\n"
                f"{info.get('summary', info.get('content', ''))[:500]}\n"
            )
        return '\n'.join(summary_parts)
    
    def _format_citations_list(self, citations: List[Dict]) -> str:
        """Format citations for prompt"""
        citation_parts = []
        for i, citation in enumerate(citations, 1):
            citation_parts.append(
                f"[{i}] {citation.get('formatted', citation.get('title', 'Unknown'))}"
            )
        return '\n'.join(citation_parts)
    
    def _estimate_relevance(self, summary: str) -> float:
        """Estimate content relevance (simple heuristic)"""
        # Simple scoring based on summary length and key indicators
        score = min(len(summary) / 500, 1.0)
        
        # Boost for academic indicators
        academic_terms = ['research', 'study', 'analysis', 'findings', 'data', 'evidence']
        for term in academic_terms:
            if term.lower() in summary.lower():
                score += 0.05
        
        return min(score, 1.0)
    
    def generate_cross_queries(self, topic: str, initial_queries: List[str], 
                              findings_summary: str, num_queries: int = 3) -> List[str]:
        """Generate cross-queries to expand research coverage"""
        from backend.llm.prompts import CROSS_QUERY_GENERATION_PROMPT
        
        prompt = CROSS_QUERY_GENERATION_PROMPT.format(
            topic=topic,
            initial_queries='\n'.join(initial_queries),
            findings_summary=findings_summary,
            num_queries=num_queries
        )
        
        response = self.generate(prompt, temperature=0.8)
        queries = [q.strip().lstrip('0123456789.-) ') for q in response.split('\n') if q.strip()]
        
        return queries[:num_queries]
    
    def verify_claim(self, claim: str, sources: List[Dict]) -> Dict[str, any]:
        """Verify factual claim against sources"""
        from backend.llm.prompts import FACT_VERIFICATION_PROMPT
        
        sources_text = '\n'.join([
            f"[{i+1}] {s.get('title', 'Unknown')}: {s.get('content', '')[:200]}"
            for i, s in enumerate(sources[:10])
        ])
        
        prompt = FACT_VERIFICATION_PROMPT.format(
            claim=claim,
            sources=sources_text
        )
        
        response = self.generate(prompt, temperature=0.3, max_tokens=500)
        
        # Parse response for verification status
        verification = {
            'status': 'UNVERIFIED',
            'confidence': 'LOW',
            'sources': [],
            'details': response
        }
        
        if 'VERIFIED' in response.upper():
            verification['status'] = 'VERIFIED'
        elif 'PARTIALLY' in response.upper():
            verification['status'] = 'PARTIALLY_VERIFIED'
        
        if 'HIGH' in response.upper():
            verification['confidence'] = 'HIGH'
        elif 'MEDIUM' in response.upper():
            verification['confidence'] = 'MEDIUM'
        
        return verification
    
    def score_confidence(self, content: str, sources: List[Dict]) -> Dict[str, any]:
        """Score confidence level of synthesized content"""
        from backend.llm.prompts import CONFIDENCE_SCORING_PROMPT
        
        sources_summary = '\n'.join([
            f"[{i+1}] {s.get('title', 'Unknown')} - {s.get('source', 'Unknown source')}"
            for i, s in enumerate(sources[:15])
        ])
        
        prompt = CONFIDENCE_SCORING_PROMPT.format(
            content=content[:2000],
            sources=sources_summary
        )
        
        response = self.generate(prompt, temperature=0.3, max_tokens=800)
        
        return {
            'score': 0.7,  # Default score
            'analysis': response
        }
    
    def check_availability(self) -> bool:
        """Check if Ollama is available and model is loaded"""
        try:
            models = self.client.list()
            model_names = [m['name'] for m in models.get('models', [])]
            return any(self.model in name for name in model_names)
        except Exception as e:
            print(f"Ollama not available: {e}")
            return False
