import React, { useState, useEffect } from 'react';
import { AppLayout } from '../components/AppLayout';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import { User as UserIcon } from 'lucide-react';
import './Profile.css';

export const Profile = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        total_videos: 0,
        total_queries: 0,
        total_pdfs: 0,
        total_processing_hours: 0,
    });

    useEffect(() => {
        profileAPI.getStats()
            .then(res => setStats(res.data))
            .catch(err => console.error(err));
    }, []);

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <AppLayout>
            <div className="profile-page">
                <h1>Profile</h1>

                <Card className="profile-card">
                    <div className="profile-avatar">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} />
                        ) : (
                            <div className="avatar-placeholder">
                                {getInitials(user.name)}
                            </div>
                        )}
                    </div>

                    <div className="profile-info">
                        <h2>{user.name}</h2>
                        <p>{user.email}</p>
                        <p className="member-since">Member since Jan 2026</p>
                    </div>
                </Card>

                <h2>Activity Statistics</h2>
                <div className="stats-grid">
                    <Card className="stat-card">
                        <div className="stat-icon">📹</div>
                        <div className="stat-value">{stats.total_videos}</div>
                        <div className="stat-label">Videos Converted</div>
                    </Card>

                    <Card className="stat-card">
                        <div className="stat-icon">💬</div>
                        <div className="stat-value">{stats.total_queries}</div>
                        <div className="stat-label">Queries Asked</div>
                    </Card>

                    <Card className="stat-card">
                        <div className="stat-icon">📄</div>
                        <div className="stat-value">{stats.total_pdfs}</div>
                        <div className="stat-label">PDFs Generated</div>
                    </Card>

                    <Card className="stat-card">
                        <div className="stat-icon">⏱️</div>
                        <div className="stat-value">{stats.total_processing_hours.toFixed(1)}</div>
                        <div className="stat-label">Hours Processed</div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
};
