"""
PDF Generation Integration
Wraps existing enhance_and_pdf.py logic
"""
import sys
import os
import re
from pathlib import Path
from django.conf import settings
from django.core.files import File
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from groq import Groq

logger = logging.getLogger(__name__)

# Add the existing scripts directory to Python path
SCRIPTS_DIR = Path(settings.BASE_DIR).parent / 'Video-Knowledge-Extraction-Semantic-Search-System-RAG-based-'
sys.path.insert(0, str(SCRIPTS_DIR))


def _format_seconds(seconds):
    """Convert seconds to mm:ss or hh:mm:ss format."""
    try:
        total_seconds = int(float(seconds))
    except (TypeError, ValueError):
        return "00:00"

    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def _generate_chunk_content(client, model, chunk_text, idx, total, start_time_hint=None, end_time_hint=None):
    """Generate high-quality educational content for one transcript chunk."""
    time_hint = ""
    if start_time_hint and end_time_hint:
        time_hint = f"\nChunk timeline: {start_time_hint} to {end_time_hint}\n"

    prompt = f"""
You are a senior technical educator writing premium course material from a transcript.

Your output must be content-focused, complete, and very high quality.
Do not skip any idea mentioned in this chunk.
Do not write Q&A sections.
Do not add markdown symbols.

Length and depth requirements:
- Produce substantial detail for each topic.
- For each TOPIC include rich explanation with practical framing.
- Target long-form instructional content, not short notes.
- If multiple micro-topics exist, split into separate TOPIC entries.

Required output format:
SECTION: [Main section name]
TOPIC: 1. [Topic name]
Concept: [Clear and deep explanation]
Context: [How this fits in the flow of the lesson]
Explanation: [Detailed teaching-style explanation]
Example: [Concrete practical example]
Implementation Notes: [Best practices, edge cases, caveats]
TOPIC: 2. ...
Repeat to cover every distinct topic in this chunk.

When coding is present in transcript:
- Include at least one realistic code example.
- Put code examples inside fenced code blocks using triple backticks.
- Use language tags like ```python or ```javascript when clear.
- Every code example must be complete and self-contained.
- Never reference undefined variables.
- Include imports and variable initialization before usage.
- Include callable flow (inputs -> processing -> output).
- Add a short output line as a comment at the end (for example: # Output: ...).
- Do not provide pseudo-code; provide executable-style code.

Chunk {idx}/{total}
{time_hint}

Writing requirements:
- Keep language precise, professional, and readable.
- Expand meaningfully, not with filler text.
- Preserve all technical details and nuances from transcript.
- If multiple related points appear, organize them under logical topics/subtopics.

Transcript chunk:
<<<
{chunk_text}
>>>
"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=2200,
    )
    return response.choices[0].message.content.strip()


def _repair_code_blocks_with_llm(client, model, content):
    """Repair generated fenced code blocks so they are complete and self-contained."""
    pattern = re.compile(r"```([a-zA-Z0-9_+-]*)\n(.*?)```", re.DOTALL)
    matches = list(pattern.finditer(content))
    if not matches:
        return content

    max_repair_blocks = int(os.getenv('PDF_CODE_REPAIR_LIMIT', '8'))
    repaired_count = 0
    updated_text = content

    for match in matches:
        if repaired_count >= max_repair_blocks:
            break

        lang = (match.group(1) or 'text').strip() or 'text'
        code = (match.group(2) or '').strip()
        if not code:
            continue

        prompt = f"""
You are a senior software engineer.
Fix and improve this code snippet to be complete and self-contained.

Rules:
1) Keep the same intent/topic.
2) Ensure all variables are defined before use.
3) Include any necessary imports.
4) Ensure control flow is complete.
5) Keep code concise but correct.
6) Return only the corrected code (no explanation).

Language: {lang}

Code:
<<<
{code}
>>>
"""

        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1200,
            )
            fixed_code = response.choices[0].message.content.strip()
            fixed_code = re.sub(r"^```[a-zA-Z0-9_+-]*\n", "", fixed_code)
            fixed_code = re.sub(r"```$", "", fixed_code).strip()

            original_block = match.group(0)
            replacement_block = f"```{lang}\n{fixed_code}\n```"
            updated_text = updated_text.replace(original_block, replacement_block, 1)
            repaired_count += 1
        except Exception as repair_error:
            logger.warning(f"Code block repair failed: {repair_error}")

    return updated_text


def _generate_final_sections(client, model, full_text_excerpt):
    """Generate required ending sections: Final Summary and Key Takeaways."""
    prompt = f"""
Create only the final two sections for a course PDF.

Required output format:
SECTION: Final Summary
- Write a comprehensive, meaningful closing summary of the entire video content.
- Focus on conceptual clarity and how topics connect.

KEY TAKEAWAYS:
- Provide 12 to 18 high-quality, concrete takeaways.
- Each takeaway should be specific and useful.

Rules:
- No Q&A format.
- No fluff.
- Plain text only.

Source excerpt:
<<<
{full_text_excerpt}
>>>
"""

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.25,
        max_tokens=1800,
    )
    return response.choices[0].message.content.strip()


def _generate_high_quality_pdf_content(raw_text, chunks, enhance_and_pdf):
    """Generate complete, high-quality PDF content with lower latency than multi-pass synthesis."""
    model = os.getenv('GROQ_PDF_MODEL', 'llama-3.3-70b-versatile')
    client = Groq(api_key=os.getenv('GROQ_API_KEY'))

    max_tokens = int(os.getenv('PDF_CHUNK_MAX_TOKENS', '2400'))
    overlap_tokens = int(os.getenv('PDF_CHUNK_OVERLAP_TOKENS', '240'))
    token_chunks = enhance_and_pdf.split_text_by_tokens(raw_text, max_tokens=max_tokens, overlap=overlap_tokens)

    logger.info(f"Generating high-quality PDF content using {len(token_chunks)} chunks")

    chunk_times = []
    if chunks:
        chunk_span = max(1, len(chunks) // len(token_chunks))
        for idx in range(len(token_chunks)):
            start_index = min(len(chunks) - 1, idx * chunk_span)
            end_index = min(len(chunks) - 1, (idx + 1) * chunk_span - 1)
            start_time = _format_seconds(chunks[start_index].get('start'))
            end_time = _format_seconds(chunks[end_index].get('end'))
            chunk_times.append((start_time, end_time))
    else:
        chunk_times = [(None, None)] * len(token_chunks)

    chunk_notes = [""] * len(token_chunks)
    max_workers = max(1, int(os.getenv('PDF_ENHANCE_WORKERS', '3')))

    def _process_one(index_and_chunk):
        idx, chunk_text = index_and_chunk
        start_hint, end_hint = chunk_times[idx]
        logger.info(f"Enhancing content chunk {idx + 1}/{len(token_chunks)}")
        try:
            output = _generate_chunk_content(
                client,
                model,
                chunk_text,
                idx + 1,
                len(token_chunks),
                start_hint,
                end_hint,
            )
        except Exception as chunk_error:
            logger.warning(f"Chunk enhancement failed for chunk {idx + 1}: {chunk_error}")
            output = enhance_and_pdf.beautify_text(chunk_text)
        return idx, output

    if max_workers == 1 or len(token_chunks) == 1:
        for idx, chunk_text in enumerate(token_chunks):
            _, output = _process_one((idx, chunk_text))
            chunk_notes[idx] = output
    else:
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(_process_one, (idx, chunk_text)) for idx, chunk_text in enumerate(token_chunks)]
            for future in as_completed(futures):
                idx, output = future.result()
                chunk_notes[idx] = output

    merged = []
    for idx, content in enumerate(chunk_notes, start=1):
        merged.append(f"SECTION: Transcript Coverage Part {idx}")
        merged.append(content)

    excerpt_limit = int(os.getenv('PDF_FINAL_SECTION_CHARS', '14000'))
    excerpt_text = raw_text[:excerpt_limit]
    logger.info("Generating final summary and key takeaways section")
    final_sections = _generate_final_sections(client, model, excerpt_text)

    merged.append(final_sections)
    combined = "\n\n".join(merged)

    try:
        logger.info("Repairing fenced code blocks for completeness")
        combined = _repair_code_blocks_with_llm(client, model, combined)
    except Exception as repair_error:
        logger.warning(f"Code repair phase failed, continuing without repair: {repair_error}")

    return combined


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
        
        transcript_chunks = data.get('chunks', [])

        # Generate detailed educational content with full transcript coverage
        logger.info("Generating high-quality PDF content...")
        try:
            enhanced_text = _generate_high_quality_pdf_content(
                raw_text=raw_text,
                chunks=transcript_chunks,
                enhance_and_pdf=enhance_and_pdf,
            )
            logger.info("High-quality content generation complete")
        except Exception as content_error:
            logger.warning(f"Enhanced content generation failed, using legacy fallback: {content_error}")
            chunks = enhance_and_pdf.split_text_by_tokens(raw_text)
            enhanced_parts = []
            for i, chunk in enumerate(chunks):
                logger.info(f"Fallback enhancement for chunk {i+1}/{len(chunks)}...")
                enhanced_parts.append(enhance_and_pdf.beautify_text(chunk))
            enhanced_text = "\n\n".join(enhanced_parts)
            logger.info("Fallback text enhancement complete")
        
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
            logger.info("Updating existing PDF in database...")
            with open(pdf_path, 'rb') as f:
                pdf_obj.file.save(pdf_filename, File(f), save=True)

        pdf_obj.file_size_bytes = os.path.getsize(pdf_path)
        pdf_obj.save(update_fields=['file_size_bytes'])
        
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

