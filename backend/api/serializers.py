"""
DRF Serializers for Video RAG API
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Video, Query, PDF, UserProfile


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class VideoSerializer(serializers.ModelSerializer):
    """Serializer for Video model"""
    
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Video
        fields = [
            'id', 'user', 'title', 'file', 'upload_date', 
            'status', 'processing_stage', 'duration_seconds',
            'error_message', 'audio_path', 'json_path'
        ]
        read_only_fields = [
            'id', 'user', 'upload_date', 'status', 
            'processing_stage', 'duration_seconds',
            'audio_path', 'json_path'
        ]


class VideoListSerializer(serializers.ModelSerializer):
    """Simplified serializer for video list view"""
    
    class Meta:
        model = Video
        fields = ['id', 'title', 'upload_date', 'status', 'processing_stage', 'duration_seconds']


class QuerySerializer(serializers.ModelSerializer):
    """Serializer for Query model"""
    
    class Meta:
        model = Query
        fields = [
            'id', 'video', 'question', 'answer', 
            'timestamp_start', 'timestamp_end', 'created_at'
        ]
        read_only_fields = ['id', 'answer', 'timestamp_start', 'timestamp_end', 'created_at']


class PDFSerializer(serializers.ModelSerializer):
    """Serializer for PDF model"""
    
    class Meta:
        model = PDF
        fields = ['id', 'video', 'file', 'generated_at', 'file_size_bytes']
        read_only_fields = ['id', 'generated_at', 'file_size_bytes']


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""
    
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'total_videos', 'total_queries', 
            'total_pdfs', 'total_processing_hours'
        ]
        read_only_fields = [
            'total_videos', 'total_queries', 
            'total_pdfs', 'total_processing_hours'
        ]


class DailyVideosSerializer(serializers.Serializer):
    """Serializer for daily grouped videos"""
    
    date = serializers.DateField()
    display_date = serializers.CharField(read_only=True)
    count = serializers.IntegerField(read_only=True)
    videos = VideoListSerializer(many=True, read_only=True)
    
    class Meta:
        fields = ['date', 'display_date', 'count', 'videos']
