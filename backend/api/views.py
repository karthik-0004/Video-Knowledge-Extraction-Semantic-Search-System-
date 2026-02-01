"""
API Views for Video RAG Application
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Video, Query, PDF, UserProfile
from .serializers import (
    VideoSerializer, VideoListSerializer, QuerySerializer,
    PDFSerializer, UserProfileSerializer
)
import os
import logging

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class VideoViewSet(viewsets.ModelViewSet):
    """ViewSet for Video operations"""
    
    queryset = Video.objects.all()
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get_serializer_class(self):
        if self.action == 'list':
            return VideoListSerializer
        return VideoSerializer
    
    def get_queryset(self):
        # TODO: Filter by user when auth is implemented
        return Video.objects.all()
    
    def perform_create(self, serializer):
        """Handle video upload with proper error handling and logging"""
        try:
            # Validate file
            if 'file' not in self.request.data:
                raise ValueError("No file provided")
            
            uploaded_file = self.request.data['file']
            
            # Check file size (max 500MB)
            max_size = 500 * 1024 * 1024  # 500MB
            if uploaded_file.size > max_size:
                raise ValueError(f"File too large. Max size is {max_size / (1024*1024):.0f}MB")
            
            # Check file type
            allowed_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
            file_ext = os.path.splitext(uploaded_file.name)[1].lower()
            if file_ext not in allowed_extensions:
                raise ValueError(f"Invalid file type. Allowed: {', '.join(allowed_extensions)}")
            
            logger.info(f"Uploading video: {uploaded_file.name}, size: {uploaded_file.size} bytes")
            
            # TODO: Set user from request.user when auth is implemented
            # For now, create or get a default user
            user, _ = User.objects.get_or_create(
                username='demo_user',
                defaults={'email': 'demo@example.com'}
            )
            
            video = serializer.save(user=user, status='uploading')
            logger.info(f"Video created with ID: {video.id}, file path: {video.file.path}")
            
            # Trigger background processing
            # TODO: Move to Celery task for production
            from video_processor.pipeline import process_video_async
            process_video_async(video.id)
            
        except ValueError as e:
            logger.error(f"Validation error during upload: {e}")
            raise
        except Exception as e:
            logger.error(f"Error during video upload: {e}", exc_info=True)
            raise
    
    def destroy(self, request, *args, **kwargs):
        """Delete video and associated files"""
        video = self.get_object()
        
        try:
            # Delete the video file if it exists
            if video.file:
                try:
                    video_file_path = video.file.path
                    if os.path.exists(video_file_path):
                        os.remove(video_file_path)
                        logger.info(f"Deleted video file: {video_file_path}")
                except Exception as e:
                    logger.warning(f"Could not delete video file: {e}")
            
            # Delete associated PDF if exists
            try:
                if hasattr(video, 'pdf') and video.pdf:
                    pdf_file_path = video.pdf.file.path
                    if os.path.exists(pdf_file_path):
                        os.remove(pdf_file_path)
                        logger.info(f"Deleted PDF file: {pdf_file_path}")
                    video.pdf.delete()
            except Exception as e:
                logger.warning(f"Could not delete PDF: {e}")
            
            # Delete the database record
            video_id = video.id
            video.delete()
            logger.info(f"Deleted video record ID: {video_id}")
            
            return Response(
                {'message': 'Video deleted successfully'},
                status=status.HTTP_204_NO_CONTENT
            )
        
        except Exception as e:
            logger.error(f"Error deleting video: {e}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Get processing status of a video"""
        video = self.get_object()
        return Response({
            'id': video.id,
            'status': video.status,
            'processing_stage': video.processing_stage,
            'error_message': video.error_message,
        })
    
    @action(detail=True, methods=['post'])
    def query(self, request, pk=None):
        """Ask a question about a video"""
        video = self.get_object()
        
        if video.status != 'completed':
            return Response(
                {'error': 'Video processing not complete'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        question = request.data.get('question')
        if not question:
            return Response(
                {'error': 'Question is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Query the video
        from video_processor.query import query_video
        try:
            result = query_video(video.id, question)
            
            # Save query to database
            user = video.user  # TODO: use request.user when auth is implemented
            query_obj = Query.objects.create(
                user=user,
                video=video,
                question=question,
                answer=result['answer'],
                timestamp_start=result.get('timestamp_start'),
                timestamp_end=result.get('timestamp_end'),
            )
            
            # Update user profile stats
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.total_queries += 1
            profile.save()
            
            return Response(QuerySerializer(query_obj).data)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Get or generate PDF for a video"""
        video = self.get_object()
        
        if video.status != 'completed':
            return Response(
                {'error': 'Video processing not complete'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if PDF exists
        try:
            pdf = video.pdf
            return Response(PDFSerializer(pdf).data)
        except PDF.DoesNotExist:
            # Generate PDF
            from video_processor.pdf_gen import generate_pdf
            try:
                pdf = generate_pdf(video.id)
                return Response(PDFSerializer(pdf).data)
            except Exception as e:
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )


class QueryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Query history"""
    
    serializer_class = QuerySerializer
    
    def get_queryset(self):
        # TODO: Filter by user when auth is implemented
        video_id = self.request.query_params.get('video_id')
        if video_id:
            return Query.objects.filter(video_id=video_id)
        return Query.objects.all()


class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for User Profile stats"""
    
    serializer_class = UserProfileSerializer
    
    def get_queryset(self):
        # TODO: Filter by user when auth is implemented
        return UserProfile.objects.all()
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get current user's statistics"""
        # TODO: Use request.user when auth is implemented
        user = User.objects.filter(username='demo_user').first()
        
        if not user:
            return Response({
                'total_videos': 0,
                'total_queries': 0,
                'total_pdfs': 0,
                'total_processing_hours': 0.0,
            })
        
        profile, _ = UserProfile.objects.get_or_create(user=user)
        
        # Update profile stats from actual data
        profile.total_videos = Video.objects.filter(user=user, status='completed').count()
        profile.total_queries = Query.objects.filter(user=user).count()
        profile.total_pdfs = PDF.objects.filter(video__user=user).count()
        profile.total_processing_hours = sum(
            v.duration_seconds or 0 for v in Video.objects.filter(user=user, status='completed')
        ) / 3600.0
        profile.save()
        
        return Response(UserProfileSerializer(profile).data)
