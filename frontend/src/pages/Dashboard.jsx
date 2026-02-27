import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { AppLayout } from '../components/AppLayout';
import { videoAPI, profileAPI } from '../services/api';
import { Video, MessageCircle, FileText, Clock, Trash2 } from 'lucide-react';
import './Dashboard.css';

export const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total_videos: 0,
        total_queries: 0,
        total_pdfs: 0,
        total_processing_hours: 0,
    });
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        Promise.all([
            profileAPI.getStats(),
            videoAPI.getVideos()
        ])
            .then(([statsRes, videosRes]) => {
                if (statsRes.data) setStats(statsRes.data);
                if (videosRes.data) setVideos(videosRes.data.results || videosRes.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (videoId, videoTitle) => {
        if (!window.confirm(`Are you sure you want to delete "${videoTitle}"?`)) {
            return;
        }

        try {
            await videoAPI.deleteVideo(videoId);
            // Remove from local state
            setVideos(videos.filter(v => v.id !== videoId));
            // Reload stats
            const statsRes = await profileAPI.getStats();
            if (statsRes.data) setStats(statsRes.data);
        } catch (error) {
            console.error('Error deleting video:', error);
            alert('Failed to delete video. Please try again.');
        }
    };

    const getStatusBadge = (status) => {
        const variants = {
            completed: 'success',
            processing: 'warning',
            failed: 'error',
            uploading: 'info'
        };
        return <Badge variant={variants[status] || 'info'}>{status}</Badge>;
    };

    return (
        <AppLayout>
            <div className="dashboard">
                <h1>Dashboard</h1>

                <div className="stats-grid">
                    <Card className="stat-card">
                        <Video size={32} color="var(--primary)" />
                        <div className="stat-value">{stats.total_videos}</div>
                        <div className="stat-label">Total Videos</div>
                    </Card>

                    <Card className="stat-card" hover onClick={() => navigate('/history')}>
                        <Clock size={32} color="var(--primary)" />
                        <div className="stat-value">
                            {videos.filter(v => {
                                const today = new Date().toDateString();
                                const videoDate = new Date(v.upload_date).toDateString();
                                return today === videoDate;
                            }).length}
                        </div>
                        <div className="stat-label">Today's Conversions</div>
                    </Card>

                    <Card className="stat-card">
                        <MessageCircle size={32} color="var(--primary)" />
                        <div className="stat-value">{stats.total_queries}</div>
                        <div className="stat-label">Queries</div>
                    </Card>

                    <Card className="stat-card">
                        <FileText size={32} color="var(--primary)" />
                        <div className="stat-value">{stats.total_pdfs}</div>
                        <div className="stat-label">PDFs</div>
                    </Card>
                </div>

                <div className="recent-section">
                    <h2>Recent Videos</h2>

                    {loading ? (
                        <p>Loading...</p>
                    ) : videos.length === 0 ? (
                        <Card>
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                No videos uploaded yet. <a href="/upload">Upload your first video</a>
                            </p>
                        </Card>
                    ) : (
                        <div className="videos-list">
                            {videos.slice(0, 5).map(video => (
                                <Card key={video.id} hover className="video-item">
                                    <div className="video-info">
                                        <h3>{video.title}</h3>
                                        <div className="video-meta">
                                            <span>{new Date(video.upload_date).toLocaleDateString()}</span>
                                            {getStatusBadge(video.status)}
                                        </div>
                                    </div>

                                    <div className="video-actions">
                                        {video.status === 'completed' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => navigate(`/chat/${video.id}`)}
                                                >
                                                    Chat
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => navigate(`/pdf/${video.id}`)}
                                                >
                                                    PDF
                                                </Button>
                                            </>
                                        )}
                                        {video.status === 'failed' && (
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleDelete(video.id, video.title)}
                                            >
                                                <Trash2 size={16} />
                                                Delete
                                            </Button>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {videos.length > 0 && (
                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <Button variant="secondary" onClick={() => navigate('/history')}>
                                View Full History
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
};
