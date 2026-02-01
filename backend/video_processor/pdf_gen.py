"""
PDF Generation Integration
Wraps existing enhance_and_pdf.py logic
"""
import sys
import os
from pathlib import Path
from django.conf import settings
from django.core.files import File
import logging

logger = logging.getLogger(__name__)

# Add the existing scripts directory to Python path
SCRIPTS_DIR = Path(settings.BASE_DIR).parent / 'Video-Knowledge-Extraction-Semantic-Search-System-RAG-based-'
sys.path.insert(0, str(SCRIPTS_DIR))


def generate_pdf(video_id):
    """
    Generate PDF for a video
    Returns PDF model instance
    """
    from api.models import Video, PDF
    import enhance_and_pdf
    import json
    
    try:
        video = Video.objects.get(id=video_id)
        logger.info(f"Generating PDF for video ID: {video_id}, title: {video.title}")
        
        # Allow processing status because this is called during the pipeline
        if video.status not in ['completed', 'processing']:
            logger.error(f"Video status check failed! Status is {video.status}")
            raise ValueError(f"Video status must be completed or processing, found: {video.status}")
        
        # Get JSON file path
        json_dir = SCRIPTS_DIR / 'jsons'
        
        # Use the same filename cleaning logic as the pipeline
        import pipelIne_api
        
        # Get the original video filename
        video_filename = Path(video.file.name).name
        
        # Clean the filename (remove extension and clean special characters)
        base_name = pipelIne_api.clean_filename(video_filename.rsplit('.', 1)[0])
        
        # The JSON file is named as: "0_{base_name}.mp3.json"
        json_filename = f"0_{base_name}.mp3.json"
        json_path = json_dir / json_filename
        
        if not json_path.exists():
            logger.error(f"JSON file not found at expected path: {json_path}")
            # Try to find any matching JSON file as fallback
            json_files = list(json_dir.glob(f"*{base_name}*.json"))
            if not json_files:
                logger.error(f"No JSON file found for video: {base_name} in {json_dir}")
                raise FileNotFoundError(f"No JSON file found for video: {base_name}")
            json_path = json_files[0]
            logger.warning(f"Using fallback JSON file: {json_path}")
        
        logger.info(f"Found JSON file: {json_path}")

        
        # Load JSON data
        with open(json_path, encoding='utf-8') as f:
            data = json.load(f)
        
        raw_text = data.get('text', '').strip()
        if not raw_text:
            raise ValueError("No text in JSON file")
        
        logger.info(f"Loaded text from JSON, length: {len(raw_text)} characters")
        
        # Generate enhanced text using Groq
        logger.info("Splitting text into chunks...")
        chunks = enhance_and_pdf.split_text_by_tokens(raw_text)
        logger.info(f"Generated {len(chunks)} chunks, enhancing with AI...")
        
        enhanced_parts = []
        for i, chunk in enumerate(chunks):
            logger.info(f"Enhancing chunk {i+1}/{len(chunks)}...")
            enhanced_parts.append(enhance_and_pdf.beautify_text(chunk))
        
        enhanced_text = "\n\n".join(enhanced_parts)
        logger.info("Text enhancement complete")
        
        # Create PDF title from cleaned base name
        video_title = base_name.replace('_', ' ').title()
        pdf_filename = f"{video_title}.pdf"
        pdf_path = settings.MEDIA_ROOT / 'pdfs' / pdf_filename
        pdf_path.parent.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Creating PDF at: {pdf_path}")
        enhance_and_pdf.create_pdf(video_title, enhanced_text, str(pdf_path))
        logger.info("PDF file created successfully")
        
        # Save to database
        pdf_obj, created = PDF.objects.get_or_create(
            video=video,
            defaults={'file_size_bytes': os.path.getsize(pdf_path)}
        )
        
        if created:
            logger.info("Saving PDF to database...")
            with open(pdf_path, 'rb') as f:
                pdf_obj.file.save(pdf_filename, File(f), save=True)
        else:
            logger.info("PDF already exists in database")
        
        # Update video profile stats
        from api.models import UserProfile
        profile, _ = UserProfile.objects.get_or_create(user=video.user)
        profile.total_pdfs = PDF.objects.filter(video__user=video.user).count()
        profile.save()
        
        logger.info(f"PDF generation completed for video ID: {video_id}")
        return pdf_obj
        
    except Exception as e:
        logger.error(f"Error generating PDF for video {video_id}: {e}", exc_info=True)
        raise

