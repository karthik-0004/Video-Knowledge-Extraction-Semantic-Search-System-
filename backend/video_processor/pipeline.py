"""
Video Processing Pipeline Integration
Wraps existing pipelIne_api.py logic
"""
import os
import sys
import threading
import shutil
import subprocess
import json
import requests
from pathlib import Path
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Add the existing scripts directory to Python path
SCRIPTS_DIR = Path(settings.BASE_DIR).parent / 'Video-Knowledge-Extraction-Semantic-Search-System-RAG-based-'
sys.path.insert(0, str(SCRIPTS_DIR))


def process_video_async(video_id):
    """
    Process video asynchronously (runs in thread for now, should be Celery in production)
    """
    thread = threading.Thread(target=_process_video_sync, args=(video_id,))
    thread.daemon = True
    thread.start()


def _process_video_sync(video_id):
    """
    Actual video processing logic - processes individual video file directly
    """
    from api.models import Video, PDF
    import pipelIne_api
    from groq import Groq
    import joblib
    import pandas as pd
    
    video = None
    try:
        video = Video.objects.get(id=video_id)
        logger.info(f"Starting video processing for video ID: {video_id}, file: {video.file.name}")
        
        # Update status
        video.status = 'processing'
        video.processing_stage = 'uploaded'
        video.save()
        
        # Get the uploaded video file path (Django media file)
        video_path = Path(video.file.path)
        video_filename = video_path.name
        logger.info(f"Django video path: {video_path}")
        
        # Ensure the original script directories exist
        logger.info("Ensuring directories exist...")
        pipelIne_api.ensure_dirs()
        
        # Define paths for processing
        audio_dir = SCRIPTS_DIR / 'audios'
        json_dir = SCRIPTS_DIR / 'jsons'
        chunks_dir = audio_dir / 'chunks'
        
        # Clean filename for audio/json
        base_name = pipelIne_api.clean_filename(video_filename.rsplit('.', 1)[0])
        audio_filename = f"0_{base_name}.mp3"
        audio_path = audio_dir / audio_filename
        json_filename = f"{audio_filename}.json"
        json_path = json_dir / json_filename
        
        logger.info(f"Output paths - Audio: {audio_path}, JSON: {json_path}")
        
        # Step 1: Convert to MP3
        logger.info("Step 1/4: Converting video to audio...")
        video.processing_stage = 'audio_converted'
        video.save()
        
        if not audio_path.exists():
            logger.info(f"Converting {video_filename} to MP3...")
            subprocess.run([
                "ffmpeg", "-y", "-i", str(video_path), str(audio_path)
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            logger.info("Audio conversion complete")
        else:
            logger.info("Audio file already exists, skipping conversion")
        
        # Step 2: Transcribe using Groq
        logger.info("Step 2/4: Transcribing audio to text...")
        video.processing_stage = 'transcribed'
        video.save()
        
        if not json_path.exists():
            logger.info("Splitting audio into chunks...")
            # Split audio into 10-minute chunks
            chunk_pattern = str(chunks_dir / f"{base_name}_part_%03d.mp3")
            subprocess.run([
                "ffmpeg", "-y",
                "-i", str(audio_path),
                "-f", "segment",
                "-segment_time", "600",
                "-c", "copy",
                chunk_pattern
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Get all chunk files
            chunk_files = sorted(chunks_dir.glob(f"{base_name}_part_*.mp3"))
            logger.info(f"Created {len(chunk_files)} audio chunks")
            
            # Transcribe each chunk
            groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
            all_chunks = []
            full_text = ""
            offset = 0.0
            
            for idx, chunk_file in enumerate(chunk_files, start=1):
                logger.info(f"Transcribing chunk {idx}/{len(chunk_files)}...")
                
                with open(chunk_file, "rb") as f:
                    result = groq_client.audio.transcriptions.create(
                        file=f,
                        model="whisper-large-v3-turbo",
                        response_format="verbose_json",
                    )
                
                # Add segments with offset
                for seg in result.segments:
                    all_chunks.append({
                        "number": "0",
                        "title": base_name,
                        "start": float(seg["start"]) + offset,
                        "end": float(seg["end"]) + offset,
                        "text": seg["text"].strip()
                    })
                
                full_text += result.text.strip() + " "
                
                # Calculate offset for next chunk
                duration_cmd = [
                    "ffprobe", "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "default=noprint_wrappers=1:nokey=1",
                    str(chunk_file)
                ]
                duration = float(subprocess.check_output(duration_cmd).decode().strip())
                offset += duration
                
                # Clean up chunk file
                chunk_file.unlink()
            
            # Save JSON
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump({"chunks": all_chunks, "text": full_text.strip()}, f, indent=2)
            
            logger.info(f"Transcription complete, saved to {json_path}")
        else:
            logger.info("JSON file already exists, skipping transcription")
        
        # Step 3: Generate embeddings
        logger.info("Step 3/4: Generating embeddings...")
        video.processing_stage = 'embedded'
        video.save()
        
        # Load or create embeddings dataframe
        embedding_file = SCRIPTS_DIR / 'embeddings.joblib'
        if embedding_file.exists():
            df_existing = joblib.load(str(embedding_file))
            next_id = int(df_existing["chunk_id"].max()) + 1 if len(df_existing) else 0
            embedded_keys = set(df_existing["title"].astype(str) + "__" + df_existing["start"].astype(str))
        else:
            df_existing = pd.DataFrame()
            next_id = 0
            embedded_keys = set()
        
        # Load JSON and check for new chunks
        with open(json_path, encoding="utf-8") as f:
            content = json.load(f)
        
        chunks = content.get("chunks", [])
        new_chunks = [c for c in chunks if f'{c["title"]}__{c["start"]}' not in embedded_keys]
        
        if new_chunks:
            logger.info(f"Generating embeddings for {len(new_chunks)} new chunks...")
            texts = [c["text"] for c in new_chunks]
            
            # Create embeddings via Ollama
            response = requests.post(
                "http://localhost:11434/api/embed",
                json={"model": "bge-m3", "input": texts},
                timeout=300
            )
            response.raise_for_status()
            embeddings = response.json()["embeddings"]
            
            rows = []
            for c, emb in zip(new_chunks, embeddings):
                c["chunk_id"] = next_id
                c["embedding"] = emb
                rows.append(c)
                next_id += 1
            
            df_new = pd.DataFrame(rows)
            df_final = pd.concat([df_existing, df_new], ignore_index=True) if len(df_existing) else df_new
            joblib.dump(df_final, str(embedding_file))
            logger.info(f"Embeddings updated, total chunks: {len(df_final)}")
        else:
            logger.info("No new chunks to embed")
        
        logger.info("Embeddings generation complete")
        
        # Step 4: Generate PDF
        logger.info("Step 4/4: Generating PDF...")
        video.processing_stage = 'pdf_generated'
        video.save()
        
        from . import pdf_gen
        logger.info(f"Calling generate_pdf for video {video.id}")
        pdf_gen.generate_pdf(video_id)
        logger.info("PDF generation complete")
        
        # Mark as completed
        video.status = 'completed'
        video.save()
        logger.info(f"Video processing completed successfully for video ID: {video_id}")
        
    except Exception as e:
        error_message = str(e)
        logger.error(f"Error processing video {video_id}: {error_message}", exc_info=True)
        
        if video:
            video.status = 'failed'
            video.error_message = error_message
            video.save()


