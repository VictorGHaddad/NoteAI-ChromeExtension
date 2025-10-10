import os
from typing import Optional
import openai
from dotenv import load_dotenv

load_dotenv()

class SummarizerService:
    def __init__(self, api_key: Optional[str] = None):
        # Use provided API key or fallback to environment variable
        if api_key:
            self.api_key = api_key
        else:
            self.api_key = os.getenv("OPENAI_API_KEY")
        
        if not self.api_key or self.api_key == "your_openai_api_key_here":
            raise ValueError("OpenAI API key is required. Please provide api_key parameter or set OPENAI_API_KEY environment variable")
        
        # Simple client initialization
        self.client = None
        print(f"SummarizerService initialized with API key ending in: ...{self.api_key[-4:]}")
    
    def _get_client(self):
        """Get OpenAI client"""
        return openai.OpenAI(api_key=self.api_key)
    
    async def generate_summary(self, text: str, meeting_datetime=None, max_length: int = 200) -> str:
        """
        Generate meeting minutes using OpenAI GPT-4o-mini
        
        Args:
            text: Original transcribed text
            meeting_datetime: DateTime object of when the meeting was recorded
            max_length: Maximum length of summary in words
            
        Returns:
            str: Generated meeting minutes in structured format
        """
        try:
            if not text or len(text.strip()) < 50:
                return "Texto muito curto para gerar ata de reunião."
            
            # Format meeting datetime if provided
            from datetime import datetime
            import pytz
            
            if meeting_datetime:
                # Convert to Brazil timezone
                brazil_tz = pytz.timezone('America/Sao_Paulo')
                if meeting_datetime.tzinfo is None:
                    meeting_datetime = pytz.utc.localize(meeting_datetime)
                meeting_datetime_br = meeting_datetime.astimezone(brazil_tz)
                
                date_str = meeting_datetime_br.strftime("%d/%m/%Y")
                time_str = meeting_datetime_br.strftime("%H:%M")
                datetime_info = f"- Data: {date_str}\n- Hora: {time_str}"
            else:
                datetime_info = "- Data: Não especificada\n- Hora: Não especificada"
            
            system_prompt = """Você é um assistente especializado em elaborar atas de reunião profissionais e detalhadas. Seu objetivo é criar uma transcrição estruturada que capture com precisão os elementos essenciais da reunião.

Ao preparar a ata, siga rigorosamente estas diretrizes:

1. Cabeçalho da Ata:
- Use a data e hora fornecidas
- Local ou plataforma (presencial/virtual - inferir do contexto)
- Participantes identificados na conversa
- Identificar participantes ausentes mencionados

2. Agenda:
- Liste os tópicos discutidos em ordem cronológica
- Identifique os principais assuntos tratados
- Marque os tópicos que foram efetivamente discutidos

3. Pontos-Chave da Discussão:
- Para cada tópico identificado, documente:
  * Resumo objetivo do tema discutido
  * Principais argumentos apresentados
  * Decisões tomadas
  * Responsáveis identificados para cada ação
  * Prazos estabelecidos (se mencionados)

4. Próximos Passos:
- Crie uma seção clara de "Próximos Passos" que inclua:
  * Ação específica
  * Responsável (se identificado)
  * Prazo de conclusão (se mencionado)
  * Status atual (pendente/em andamento)

5. Regras de Estilo:
- Use linguagem profissional e objetiva
- Evite comentários pessoais ou subjetivos
- Mantenha o texto conciso e direto
- Use bullet points para facilitar a leitura
- Utilize verbos de ação ao descrever decisões e próximos passos"""

            prompt = f"""
Analise a seguinte transcrição de áudio de uma reunião e elabore uma ata profissional seguindo a estrutura fornecida.

TRANSCRIÇÃO:
{text}

Elabore uma ata de reunião completa e estruturada no formato:

ATA DE REUNIÃO

📅 Informações Básicas:
{datetime_info}
- Local/Plataforma: [inferir do contexto ou indicar "Virtual/Online"]

👥 Participantes:
[Liste os participantes identificados na conversa]

📋 Agenda:
[Liste os tópicos principais discutidos]

💬 Discussão e Decisões:
[Para cada tópico, descreva a discussão e decisões tomadas]

✅ Próximos Passos:
[Liste ações, responsáveis e prazos identificados]

📝 Observações Finais:
[Comentários adicionais relevantes]
"""
            
            client = self._get_client()
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.3
            )
            
            summary = response.choices[0].message.content.strip()
            return summary
            
        except Exception as e:
            raise Exception(f"Erro ao gerar ata de reunião: {str(e)}")
    
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