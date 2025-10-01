import os
import tempfile
from typing import Optional
import openai
from dotenv import load_dotenv

load_dotenv()

class TranscriberService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or api_key == "your_openai_api_key_here":
            raise ValueError("OPENAI_API_KEY environment variable is required and must be set to a valid OpenAI API key")
        
        # Simple client initialization
        self.api_key = api_key
        self.client = None
        print(f"TranscriberService initialized with API key ending in: ...{api_key[-4:]}")
    
    def _get_client(self):
        """Get OpenAI client"""
        return openai.OpenAI(api_key=self.api_key)
    
    async def transcribe_audio(self, audio_file, filename: str) -> dict:
        """
        Transcribe audio file using OpenAI Whisper API
        
        Args:
            audio_file: File object containing audio data
            filename: Original filename for reference
            
        Returns:
            dict: Contains transcribed text, language, and duration
        """
        try:
            # Save uploaded file to temporary location
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                content = await audio_file.read()
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            # Transcribe using OpenAI Whisper
            client = self._get_client()
            with open(temp_file_path, "rb") as audio:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio,
                    response_format="verbose_json"
                )
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
            return {
                "text": transcript.text,
                "language": transcript.language if hasattr(transcript, 'language') else None,
                "duration": transcript.duration if hasattr(transcript, 'duration') else None
            }
            
        except Exception as e:
            # Clean up temporary file in case of error
            if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            raise Exception(f"Erro na transcrição: {str(e)}")
    
    async def transcribe_audio_local(self, audio_file, filename: str) -> dict:
        """
        Alternative method using faster-whisper for local transcription
        (Optional - requires faster-whisper installation)
        """
        try:
            from faster_whisper import WhisperModel
            
            # Initialize model (downloads on first use)
            model = WhisperModel("base", device="cpu", compute_type="int8")
            
            # Save uploaded file to temporary location
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                content = await audio_file.read()
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            # Transcribe using faster-whisper
            segments, info = model.transcribe(temp_file_path, beam_size=5)
            
            # Combine all segments
            full_text = " ".join([segment.text for segment in segments])
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
            return {
                "text": full_text,
                "language": info.language,
                "duration": info.duration
            }
            
        except ImportError:
            raise Exception("faster-whisper não está instalado. Use transcribe_audio() para usar OpenAI API.")
        except Exception as e:
            # Clean up temporary file in case of error
            if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
            raise Exception(f"Erro na transcrição local: {str(e)}")