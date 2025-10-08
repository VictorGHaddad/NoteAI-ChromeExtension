import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import mimetypes

from ..database import get_db
from ..models import Transcription
from ..services.transcriber import TranscriberService
from ..services.summarizer import SummarizerService

router = APIRouter(prefix="/audio", tags=["audio"])

# Pydantic models for request bodies
class UpdateTranscriptionRequest(BaseModel):
    filename: Optional[str] = None
    tags: Optional[List[str]] = None

# Initialize services (will be initialized on first use)
transcriber_service = None
summarizer_service = None

def get_transcriber_service():
    global transcriber_service
    if transcriber_service is None:
        transcriber_service = TranscriberService()
    return transcriber_service

def get_summarizer_service():
    global summarizer_service
    if summarizer_service is None:
        summarizer_service = SummarizerService()
    return summarizer_service

# Supported audio formats
SUPPORTED_FORMATS = {'.mp3', '.wav', '.m4a', '.ogg', '.webm', '.mp4', '.mpeg', '.mpga'}

# OpenAI Whisper API has a hard limit of 25MB per request
# We'll set our limit to 30MB (approximately 30 minutes of audio at 1MB/min)
# Files larger than 25MB will be automatically split into chunks
MAX_FILE_SIZE = 30 * 1024 * 1024  # 30MB limit
OPENAI_CHUNK_LIMIT = 25 * 1024 * 1024  # 25MB - OpenAI's hard limit
RECOMMENDED_MAX_MINUTES = 30  # Recommended maximum duration

@router.post("/upload")
async def upload_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload audio file, transcribe it, and generate summary
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nome do arquivo é obrigatório")
        
        # Check file extension
        file_ext = os.path.splitext(file.filename.lower())[1]
        if file_ext not in SUPPORTED_FORMATS:
            raise HTTPException(
                status_code=400, 
                detail=f"Formato não suportado. Formatos aceitos: {', '.join(SUPPORTED_FORMATS)}"
            )
        
        # Check file size
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"Arquivo muito grande. Tamanho máximo: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Reset file pointer
        await file.seek(0)
        
        # Transcribe audio
        transcriber = get_transcriber_service()
        transcription_result = await transcriber.transcribe_audio(file, file.filename)
        
        # Save to database first to get created_at timestamp
        db_transcription = Transcription(
            filename=file.filename,
            original_text=transcription_result["text"],
            summary="",  # Will be updated after generation
            duration=transcription_result.get("duration"),
            file_size=len(file_content),
            language=transcription_result.get("language")
        )
        
        db.add(db_transcription)
        db.commit()
        db.refresh(db_transcription)
        
        # Generate summary with meeting timestamp
        summarizer = get_summarizer_service()
        summary = await summarizer.generate_summary(
            transcription_result["text"],
            meeting_datetime=db_transcription.created_at
        )
        
        # Update with generated summary
        db_transcription.summary = summary
        db.commit()
        db.refresh(db_transcription)
        
        return {
            "id": db_transcription.id,
            "filename": db_transcription.filename,
            "text": db_transcription.original_text,
            "summary": db_transcription.summary,
            "duration": db_transcription.duration,
            "language": db_transcription.language,
            "created_at": db_transcription.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.get("/transcriptions")
async def get_transcriptions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get list of all transcriptions
    """
    try:
        transcriptions = db.query(Transcription).offset(skip).limit(limit).all()
        
        return {
            "transcriptions": [
                {
                    "id": t.id,
                    "filename": t.filename,
                    "text": t.original_text,
                    "summary": t.summary,
                    "duration": t.duration,
                    "language": t.language,
                    "file_size": t.file_size,
                    "tags": t.get_tags(),
                    "created_at": t.created_at,
                    "updated_at": t.updated_at
                }
                for t in transcriptions
            ],
            "total": len(transcriptions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar transcrições: {str(e)}")

@router.get("/transcriptions/{transcription_id}")
async def get_transcription(
    transcription_id: int,
    db: Session = Depends(get_db)
):
    """
    Get specific transcription by ID
    """
    try:
        transcription = db.query(Transcription).filter(Transcription.id == transcription_id).first()
        
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcrição não encontrada")
        
        return {
            "id": transcription.id,
            "filename": transcription.filename,
            "text": transcription.original_text,
            "summary": transcription.summary,
            "duration": transcription.duration,
            "language": transcription.language,
            "file_size": transcription.file_size,
            "tags": transcription.get_tags(),
            "created_at": transcription.created_at,
            "updated_at": transcription.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar transcrição: {str(e)}")


@router.patch("/transcriptions/{transcription_id}")
async def update_transcription(
    transcription_id: int,
    update_data: UpdateTranscriptionRequest,
    db: Session = Depends(get_db)
):
    """
    Update transcription filename and/or tags
    """
    try:
        transcription = db.query(Transcription).filter(Transcription.id == transcription_id).first()
        
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcrição não encontrada")
        
        # Update fields if provided
        if update_data.filename is not None:
            transcription.filename = update_data.filename
        
        if update_data.tags is not None:
            transcription.set_tags(update_data.tags)
        
        db.commit()
        db.refresh(transcription)
        
        return {
            "id": transcription.id,
            "filename": transcription.filename,
            "text": transcription.original_text,
            "summary": transcription.summary,
            "duration": transcription.duration,
            "language": transcription.language,
            "file_size": transcription.file_size,
            "tags": transcription.get_tags(),
            "created_at": transcription.created_at.isoformat() if transcription.created_at else None,
            "updated_at": transcription.updated_at.isoformat() if transcription.updated_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar transcrição: {str(e)}")

@router.delete("/transcriptions/{transcription_id}")
async def delete_transcription(
    transcription_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete transcription by ID
    """
    try:
        transcription = db.query(Transcription).filter(Transcription.id == transcription_id).first()
        
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcrição não encontrada")
        
        db.delete(transcription)
        db.commit()
        
        return {"message": "Transcrição deletada com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao deletar transcrição: {str(e)}")

@router.post("/transcriptions/{transcription_id}/regenerate-summary")
async def regenerate_summary(
    transcription_id: int,
    db: Session = Depends(get_db)
):
    """
    Regenerate summary for existing transcription
    """
    try:
        transcription = db.query(Transcription).filter(Transcription.id == transcription_id).first()
        
        if not transcription:
            raise HTTPException(status_code=404, detail="Transcrição não encontrada")
        
        # Generate new summary with original meeting timestamp
        summarizer = get_summarizer_service()
        new_summary = await summarizer.generate_summary(
            transcription.original_text,
            meeting_datetime=transcription.created_at
        )
        
        # Update database
        transcription.summary = new_summary
        db.commit()
        db.refresh(transcription)
        
        return {
            "id": transcription.id,
            "filename": transcription.filename,
            "text": transcription.original_text,
            "summary": transcription.summary,
            "duration": transcription.duration,
            "language": transcription.language,
            "updated_at": transcription.updated_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao regenerar resumo: {str(e)}")

@router.get("/estimate-cost")
async def estimate_transcription_cost(file_size_mb: float):
    """
    Estimate the cost of transcribing an audio file
    
    Args:
        file_size_mb: Size of the audio file in MB
    
    Returns:
        Estimated cost and duration based on OpenAI Whisper pricing with warnings
    """
    try:
        # OpenAI Whisper pricing: $0.006 per minute
        PRICE_PER_MINUTE = 0.006
        
        # Estimate duration based on file size
        # Average bitrate for webm audio: ~128 kbps = ~0.96 MB/minute
        # But can vary from 0.5 MB/min (low quality) to 2 MB/min (high quality)
        # We'll use conservative estimate: 1 MB/minute
        ESTIMATED_MB_PER_MINUTE = 1.0
        
        estimated_minutes = file_size_mb / ESTIMATED_MB_PER_MINUTE
        estimated_cost = estimated_minutes * PRICE_PER_MINUTE
        
        # Check limits and generate warnings
        warnings = []
        exceeds_limit = False
        
        if file_size_mb > MAX_FILE_SIZE / (1024 * 1024):
            exceeds_limit = True
            warnings.append(f"⚠️ Arquivo excede o limite de {MAX_FILE_SIZE // (1024*1024)}MB")
        elif file_size_mb > 25:
            warnings.append(f"⚠️ Arquivo próximo do limite da API OpenAI (25MB). Pode falhar.")
        elif estimated_minutes > RECOMMENDED_MAX_MINUTES:
            warnings.append(f"⚠️ Duração estimada ({round(estimated_minutes, 1)}min) excede o recomendado ({RECOMMENDED_MAX_MINUTES}min)")
        elif estimated_minutes > 25:
            warnings.append(f"ℹ️ Arquivo grande ({round(estimated_minutes, 1)}min). Transcrição pode demorar.")
        
        return {
            "file_size_mb": file_size_mb,
            "estimated_duration_minutes": round(estimated_minutes, 1),
            "estimated_cost_usd": round(estimated_cost, 4),
            "estimated_cost_brl": round(estimated_cost * 5.0, 2),  # Approximate BRL conversion
            "price_per_minute_usd": PRICE_PER_MINUTE,
            "max_allowed_minutes": RECOMMENDED_MAX_MINUTES,
            "max_allowed_mb": MAX_FILE_SIZE // (1024 * 1024),
            "exceeds_limit": exceeds_limit,
            "warnings": warnings,
            "note": "Estimativa baseada em taxa média de 1 MB/minuto. O custo real pode variar."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao calcular estimativa: {str(e)}")
