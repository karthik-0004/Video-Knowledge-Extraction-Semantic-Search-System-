import React, { useState, useRef, useEffect } from 'react';
import { videoAPI } from '../services/api';
import { Button } from './Button';
import { Send, Sparkles, X } from 'lucide-react';
import './AIChatPanel.css';

/**
 * Convert markdown text to formatted HTML
 * Handles: # headings, ## subheadings, ### small headings,
 * **bold**, *italic*, bullet lists, numbered lists
 */
const formatMarkdown = (text) => {
    if (!text) return '';

    let html = text
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Headings (must be at line start)
        .replace(/^### (.+)$/gm, '<h4 class="md-h3">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 class="md-h2">$1</h3>')
        .replace(/^# (.+)$/gm, '<h2 class="md-h1">$1</h2>')
        // Bold & italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Bullet lists
        .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
        // Numbered lists
        .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
        // Line breaks
        .replace(/\n/g, '<br/>');

    // Wrap consecutive <li> items in <ul>
    html = html.replace(/(<li>.*?<\/li>(<br\/>)?)+/g, (match) => {
        const cleaned = match.replace(/<br\/>/g, '');
        return `<ul>${cleaned}</ul>`;
    });

    return html;
};

export const AIChatPanel = ({ videoId, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', content: input };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setLoading(true);

        try {
            // Send message + history to backend
            const history = updatedMessages.map(m => ({
                role: m.role,
                content: m.content
            }));

            const res = await videoAPI.aiChat(videoId, input, history.slice(0, -1));

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.data.reply
            }]);
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Failed to get AI response. Please try again.';
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ ${errorMsg}`
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-chat-panel">
            <div className="ai-chat-header">
                <div className="ai-chat-title">
                    <Sparkles size={18} />
                    <span>AI Assistant</span>
                </div>
                <button className="ai-close-btn" onClick={onClose} title="Close AI panel">
                    <X size={16} />
                </button>
            </div>

            <div className="ai-chat-messages">
                {messages.length === 0 && (
                    <div className="ai-empty-state">
                        <Sparkles size={32} />
                        <h3>AI Video Assistant</h3>
                        <p>Ask me anything about this video's content. I'll answer based on the transcript.</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`ai-message ${msg.role}`}>
                        <div className="ai-message-content">
                            {msg.role === 'assistant' ? (
                                <div
                                    className="ai-formatted"
                                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                                />
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="ai-message assistant">
                        <div className="ai-message-content">
                            <div className="ai-typing">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="ai-chat-input">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask about this video..."
                    disabled={loading}
                />
                <Button onClick={handleSend} disabled={loading || !input.trim()} size="sm">
                    <Send size={16} />
                </Button>
            </div>
        </div>
    );
};
