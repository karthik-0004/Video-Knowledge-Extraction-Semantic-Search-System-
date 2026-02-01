import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { videoAPI } from '../services/api';
import { ArrowLeft, Send } from 'lucide-react';
import './Chat.css';

export const Chat = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [video, setVideo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        videoAPI.getVideo(id)
            .then(res => setVideo(res.data))
            .catch(err => console.error(err));
    }, [id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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

    return (
        <AppLayout>
            <div className="chat-page">
                <div className="chat-header">
                    <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={20} />
                        Back
                    </Button>
                    <h2>{video?.title || 'Loading...'}</h2>
                </div>

                <Card className="chat-container">
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
                                        <div className="timestamp">
                                            🕐 {formatTime(msg.timestamp_start)} - {formatTime(msg.timestamp_end)}
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
            </div>
        </AppLayout>
    );
};
