import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { AIChatPanel } from '../components/AIChatPanel';
import { videoAPI } from '../services/api';
import { ArrowLeft, Eraser, FileText, Send, Sparkles } from 'lucide-react';
import './Chat.css';

export const Chat = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const chatStorageKey = `video_chat_messages_${id}`;
    const [video, setVideo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isMessagesHydrated, setIsMessagesHydrated] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAI, setShowAI] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        videoAPI.getVideo(id)
            .then(res => setVideo(res.data))
            .catch(err => console.error(err));
    }, [id]);

    useEffect(() => {
        setIsMessagesHydrated(false);
        try {
            const savedMessages = localStorage.getItem(chatStorageKey);
            if (savedMessages) {
                const parsed = JSON.parse(savedMessages);
                if (Array.isArray(parsed)) {
                    setMessages(parsed);
                    setIsMessagesHydrated(true);
                    return;
                }
            }

            setMessages([]);
            setIsMessagesHydrated(true);
        } catch (error) {
            console.error('Failed to load saved chat messages:', error);
            setMessages([]);
            setIsMessagesHydrated(true);
        }
    }, [chatStorageKey]);

    useEffect(() => {
        if (!isMessagesHydrated) {
            return;
        }

        try {
            localStorage.setItem(chatStorageKey, JSON.stringify(messages));
        } catch (error) {
            console.error('Failed to save chat messages:', error);
        }
    }, [messages, chatStorageKey, isMessagesHydrated]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getPdfUrl = (fileUrl) => {
        if (!fileUrl) return '';
        if (fileUrl.startsWith('http')) return fileUrl;
        return `http://localhost:8000${fileUrl}`;
    };

    const handleOpenPdf = async () => {
        try {
            const pdfRes = await videoAPI.getPDF(id);
            const fileUrl = pdfRes?.data?.file;

            if (!fileUrl) {
                alert('PDF is not available yet for this video.');
                return;
            }

            window.open(getPdfUrl(fileUrl), '_blank', 'noopener,noreferrer');
        } catch (error) {
            console.error('Failed to open PDF:', error);
            alert('Could not open PDF right now. Please try again.');
        }
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await videoAPI.queryVideo(id, input);
            const aiMessage = {
                role: 'assistant',
                content: res.data.answer,
                timestamp_start: res.data.timestamp_start,
                timestamp_end: res.data.timestamp_end
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, there was an error processing your question.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = () => {
        if (!window.confirm('Clear this chat history?')) {
            return;
        }

        setMessages([]);
        localStorage.removeItem(chatStorageKey);
    };

    return (
        <AppLayout>
            <div className={`chat-page ${showAI ? 'chat-split' : ''}`}>
                <div className="chat-header">
                    <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={20} />
                        Back
                    </Button>
                    <h2>{video?.title || 'Loading...'}</h2>
                    <Button
                        variant="secondary"
                        onClick={handleOpenPdf}
                        disabled={!video}
                    >
                        <FileText size={18} />
                        PDF
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleClearChat}
                        disabled={messages.length === 0}
                    >
                        <Eraser size={18} />
                        Clear Chat
                    </Button>
                    <Button
                        variant={showAI ? 'primary' : 'secondary'}
                        onClick={() => setShowAI(!showAI)}
                    >
                        <Sparkles size={18} />
                        {showAI ? 'Close AI' : 'AI Help'}
                    </Button>
                </div>

                <div className="chat-body">
                    {/* Left Panel — Existing video Q&A */}
                    <Card className="chat-container chat-left-panel">
                        <div className="messages">
                            {messages.length === 0 && (
                                <div className="empty-state">
                                    Ask any question about this video!
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div key={idx} className={`message ${msg.role}`}>
                                    <div className="message-content">
                                        {msg.content}
                                        {msg.timestamp_start && (
                                            <div className="ts-neon">
                                                <div className="ts-ring">
                                                    <span className="ts-emoji">🕰️</span>
                                                </div>
                                                <div className="ts-content">
                                                    <span className="ts-label">Timestamp</span>
                                                    <span className="ts-time">{formatTime(msg.timestamp_start)} – {formatTime(msg.timestamp_end)}</span>
                                                    <span className="ts-video">{video?.title}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="message assistant">
                                    <div className="message-content">
                                        <div className="typing-indicator">
                                            <span></span><span></span><span></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask a question..."
                                disabled={loading}
                            />
                            <Button onClick={handleSend} disabled={loading || !input.trim()}>
                                <Send size={20} />
                            </Button>
                        </div>
                    </Card>

                    {/* Right Panel — AI Chatbot */}
                    {showAI && (
                        <div className="chat-right-panel">
                            <AIChatPanel videoId={id} onClose={() => setShowAI(false)} />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
};
