import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

export const Landing = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        // Simple intersection observer to add fade-up classes on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeUp 1s ease forwards';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        const elements = document.querySelectorAll('.text-content, .visual-placeholder');
        elements.forEach((el) => {
            el.style.opacity = '0'; // hide initially
            observer.observe(el);
        });

        return () => {
            elements.forEach(el => observer.unobserve(el));
            observer.disconnect();
        };
    }, []);

    const handleAccess = () => {
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="landing-story">
            {/* HERO SECTION */}
            <section id="hero">
                <div className="hero-bg"></div>
                <div className="hero-content">
                    <div className="hero-eyebrow">Enterprise Intelligence</div>
                    <h1 className="hero-title">Video <span>Knowledge</span> Extraction</h1>
                    <p className="hero-subtitle">Transform hours of video into immediately searchable semantic knowledge using advanced RAG and AI embeddings.</p>

                    <button onClick={handleAccess} className="btn-gateway">
                        {user ? 'Access Dashboard' : 'Login / Register to Begin'}
                    </button>
                </div>

                <div className="scroll-indicator">
                    <div className="scroll-arrow"></div>
                </div>
            </section>

            {/* THE INGESTION */}
            <section id="processing" className="story-section">
                <div className="section-inner split-layout">
                    <div className="text-content">
                        <span className="section-label">Step 01 • The Ingestion</span>
                        <h2>From Audio to <br /><span style={{ color: 'var(--gold)' }}>Pure Context</span></h2>
                        <div className="gold-line"></div>
                        <p>Drop any video into our system. Our heavy-lifting backend automatically separates the audio stream and leverages cutting-edge speech models (Groq / Whisper) to draft highly accurate transcriptions.</p>
                        <p>Every word is timestamped, ensuring that no piece of context is ever disconnected from its absolute position in the original video.</p>
                    </div>
                    <div className="visual-placeholder">
                        <div className="icon-large">🎙️</div>
                    </div>
                </div>
            </section>

            {/* THE EMBEDDING */}
            <section id="embeddings" className="story-section" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="section-inner split-layout reverse">
                    <div className="visual-placeholder">
                        <div className="icon-large">🧠</div>
                    </div>
                    <div className="text-content">
                        <span className="section-label">Step 02 • The Neural Mapping</span>
                        <h2>Generating <br /><span style={{ color: 'var(--primary-light)' }}>Semantic Vectors</span></h2>
                        <div className="gold-line"></div>
                        <p>We don't just search for keywords. Your transcripts are fed into local Large Language Models (Ollama bge-m3) to generate multi-dimensional vector embeddings.</p>
                        <p>This allows the system to understand the true <em>meaning</em> behind your documents, preparing them for highly intuitive Retrieval-Augmented Generation (RAG).</p>
                    </div>
                </div>
            </section>

            {/* THE OUTPUT */}
            <section id="rag" className="story-section">
                <div className="section-inner split-layout">
                    <div className="text-content">
                        <span className="section-label">Step 03 • The Interaction</span>
                        <h2>Ask Anything, <br /><span style={{ color: 'var(--gold-light)' }}>Anytime</span></h2>
                        <div className="gold-line"></div>
                        <p>Engage via a natural chat interface. Ask complex questions about the video's content, and our LLM will synthesize an answer specifically drawn from the context, citing the exact timestamps.</p>
                        <p>Need comprehensive notes? Automatically export the generated insights directly into beautifully formatted study PDFs.</p>
                    </div>
                    <div className="visual-placeholder">
                        <div className="icon-large">📚</div>
                    </div>
                </div>
            </section>

            {/* FINAL GATEWAY */}
            <section id="gateway" className="story-section gateway-section">
                <span className="section-label" style={{ justifyContent: 'center', display: 'flex' }}>Access Granted</span>
                <h2>Ready to Unlock Your Content?</h2>
                <div className="gold-line center"></div>
                <p>Join the next generation of video content analysts. Log in to your decentralized dashboard to manage your video library and perform deep semantic queries.</p>
                <button onClick={handleAccess} className="btn-gateway" style={{ animation: 'none' }}>
                    {user ? 'Access Dashboard' : 'Login / Register to Begin'}
                </button>
            </section>
        </div>
    );
};
