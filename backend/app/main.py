from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

from .database import create_tables
from .routes import audio

# Load environment variables
load_dotenv()

# Create FastAPI application
app = FastAPI(
    title="Audio Transcriber API",
    description="API para transcrição de áudio e geração de resumos usando OpenAI",
    version="1.0.0"
)

# Configure CORS
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()

# Include routers
app.include_router(audio.router, prefix="/api")

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Audio Transcriber API is running!", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "audio-transcriber-api"}

@app.get("/api/test-openai")
async def test_openai():
    """Test endpoint to verify OpenAI configuration"""
    try:
        from .services.transcriber import TranscriberService
        from .services.summarizer import SummarizerService
        
        # Try to initialize services
        transcriber = TranscriberService()
        summarizer = SummarizerService()
        
        return {
            "status": "success",
            "message": "OpenAI services initialized successfully",
            "transcriber": "OK",
            "summarizer": "OK"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"OpenAI initialization failed: {str(e)}",
            "error_type": type(e).__name__
        }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Endpoint não encontrado"}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor"}
    )

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug
    )