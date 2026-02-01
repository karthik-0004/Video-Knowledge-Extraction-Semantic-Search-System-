import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import './Landing.css';

export const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="landing">
            <header className="landing-header">
                <div className="logo">Video Knowledge AI</div>
                <Button onClick={() => navigate('/dashboard')}>Dashboard</Button>
            </header>

            <div className="hero">
                <h1>Transform Videos into Searchable Knowledge</h1>
                <p className="subtitle">Upload → Process → Query → Learn</p>

                <div style={{ marginTop: '2rem' }}>
                    <Button
                        size="lg"
                        onClick={() => alert('Google Auth will be implemented in future phase')}
                    >
                        Sign in with Google (Coming Soon)
                    </Button>
                    <p style={{ marginTop: '1rem', fontSize: 'var(--font-small)', color: 'var(--text-muted)' }}>
                        For now, click Dashboard above to enter the app
                    </p>
                </div>
            </div>

            <div className="features">
                <div className="feature-card">
                    <div className="feature-icon">📹</div>
                    <h3>Upload Videos</h3>
                    <p>Upload video lectures and tutorials</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">🤖</div>
                    <h3>AI Chat Interface</h3>
                    <p>Ask questions and get timestamped answers</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">📄</div>
                    <h3>PDF Export</h3>
                    <p>Generate study notes as PDF</p>
                </div>
            </div>
        </div>
    );
};
