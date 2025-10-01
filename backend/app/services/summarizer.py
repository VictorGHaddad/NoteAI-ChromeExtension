import os
import openai
from dotenv import load_dotenv

load_dotenv()

class SummarizerService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or api_key == "your_openai_api_key_here":
            raise ValueError("OPENAI_API_KEY environment variable is required and must be set to a valid OpenAI API key")
        
        # Simple client initialization
        self.api_key = api_key
        self.client = None
        print(f"SummarizerService initialized with API key ending in: ...{api_key[-4:]}")
    
    def _get_client(self):
        """Get OpenAI client"""
        return openai.OpenAI(api_key=self.api_key)
    
    async def generate_summary(self, text: str, max_length: int = 200) -> str:
        """
        Generate summary using OpenAI GPT-4o-mini
        
        Args:
            text: Original transcribed text
            max_length: Maximum length of summary in words
            
        Returns:
            str: Generated summary
        """
        try:
            if not text or len(text.strip()) < 50:
                return "Texto muito curto para gerar resumo."
            
            prompt = f"""
Analise o seguinte texto transcrito de áudio e crie um resumo conciso e informativo.

INSTRUÇÕES:
- Máximo de {max_length} palavras
- Mantenha os pontos principais e informações relevantes
- Use linguagem clara e objetiva
- Se o texto contém múltiplos tópicos, organize-os de forma lógica
- Preserve dados importantes como números, datas, nomes se relevantes

TEXTO PARA RESUMIR:
{text}

RESUMO:
"""
            
            client = self._get_client()
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Você é um assistente especializado em criar resumos concisos e informativos de transcrições de áudio."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.3
            )
            
            summary = response.choices[0].message.content.strip()
            return summary
            
        except Exception as e:
            raise Exception(f"Erro ao gerar resumo: {str(e)}")
    
    async def generate_summary_with_keywords(self, text: str) -> dict:
        """
        Generate summary with keywords extraction
        
        Args:
            text: Original transcribed text
            
        Returns:
            dict: Contains summary and keywords
        """
        try:
            if not text or len(text.strip()) < 50:
                return {
                    "summary": "Texto muito curto para gerar resumo.",
                    "keywords": []
                }
            
            prompt = f"""
Analise o seguinte texto transcrito de áudio e forneça:

1. Um resumo conciso (máximo 200 palavras)
2. Lista de 5-8 palavras-chave principais

TEXTO:
{text}

RESPOSTA (use exatamente este formato):
RESUMO: [seu resumo aqui]

PALAVRAS-CHAVE: [palavra1, palavra2, palavra3, etc.]
"""
            
            client = self._get_client()
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Você é um assistente especializado em análise de texto e extração de informações relevantes."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.3
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse response
            lines = content.split('\n')
            summary = ""
            keywords = []
            
            for line in lines:
                if line.startswith("RESUMO:"):
                    summary = line.replace("RESUMO:", "").strip()
                elif line.startswith("PALAVRAS-CHAVE:"):
                    keywords_str = line.replace("PALAVRAS-CHAVE:", "").strip()
                    keywords = [kw.strip() for kw in keywords_str.split(',')]
            
            return {
                "summary": summary if summary else content,
                "keywords": keywords
            }
            
        except Exception as e:
            raise Exception(f"Erro ao gerar resumo com palavras-chave: {str(e)}")