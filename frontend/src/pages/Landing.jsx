import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Bot, Video, MessageCircle, FileText, ArrowRight, Activity, Clock3, ScanLine } from 'lucide-react';
import './Landing.css';

export const Landing = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="landing">
            <div className="landing-glow" />
            <div className="landing-grid" />
            <header className="landing-header">
                <div className="landing-brand">
                    <Sparkles size={18} />
                    <span>VideoMind</span>
                </div>
                <div className="landing-user">
                    <span>Welcome {user?.username || user?.email?.split('@')[0] || 'User'}</span>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/dashboard')}>
                        Skip to Dashboard
                    </Button>
                </div>
            </header>

            <main className="landing-hero">
                <div className="hero-left">
                    <div className="hero-pill">
                        <span className="hero-dot" />
                        AI-Powered Video Knowledge Extraction
                    </div>

                    <h1>
                        Turn Long Videos Into
                        <span> Searchable Knowledge</span>
                    </h1>

                    <p>
                        Upload lectures, tutorials, and recordings. VideoMind transcribes content,
                        answers questions with context, and generates clean PDF notes for learning.
                    </p>

                    <div className="hero-actions">
                        <Button size="lg" onClick={() => navigate('/dashboard')}>
                            Explore Workspace
                            <ArrowRight size={16} />
                        </Button>
                        <Button size="lg" variant="secondary" onClick={() => navigate('/upload')}>
                            Upload First Video
                        </Button>
                    </div>

                    <div className="hero-mini-stats">
                        <div className="mini-stat-card">
                            <Activity size={16} />
                            <div>
                                <strong>Real-Time Pipeline</strong>
                                <span>Processing status visibility</span>
                            </div>
                        </div>
                        <div className="mini-stat-card">
                            <Clock3 size={16} />
                            <div>
                                <strong>Faster Revisions</strong>
                                <span>Query, refine, and export quickly</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero-meta">
                        <div>
                            <strong>Video → AI → Answers</strong>
                            <span>One streamlined workflow</span>
                        </div>
                    </div>

                    <div className="workflow-track">
                        <div className="track-step">
                            <span>01</span>
                            <p>Upload video source</p>
                        </div>
                        <div className="track-step">
                            <span>02</span>
                            <p>Ask contextual questions</p>
                        </div>
                        <div className="track-step">
                            <span>03</span>
                            <p>Export learning-ready PDF</p>
                        </div>
                    </div>
                </div>

                <div className="hero-right">
                    <div className="feature-panel">
                        <div className="feature-panel-head">
                            <h3>Platform Overview</h3>
                            <div className="live-chip">
                                <ScanLine size={14} />
                                <span>Live AI</span>
                            </div>
                        </div>
                        <p>Everything needed to convert videos into useful, queryable knowledge.</p>

                        <div className="feature-grid">
                            <div className="feature-tile">
                                <Video size={20} />
                                <h4>Video Ingestion</h4>
                                <span>YouTube + local upload support</span>
                            </div>
                            <div className="feature-tile">
                                <Bot size={20} />
                                <h4>AI Processing</h4>
                                <span>Whisper transcription + embeddings</span>
                            </div>
                            <div className="feature-tile">
                                <MessageCircle size={20} />
                                <h4>Semantic Chat</h4>
                                <span>Context-aware, timestamped answers</span>
                            </div>
                            <div className="feature-tile">
                                <FileText size={20} />
                                <h4>PDF Output</h4>
                                <span>Auto-generated study material</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
