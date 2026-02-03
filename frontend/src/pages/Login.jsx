import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import { SplashScreen } from '../components/SplashScreen';
import './Login.css';

export const Login = () => {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [showSplash, setShowSplash] = useState(false);

    useEffect(() => {
        if (isAuthenticated && !showSplash) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate, showSplash]);

    const handleSuccess = (credentialResponse) => {
        try {
            const decoded = jwtDecode(credentialResponse.credential);
            login(decoded);
            // Show splash screen instead of immediate navigation
            setShowSplash(true);
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const handleError = () => {
        console.error('Google Login Failed');
    };

    const handleSplashComplete = () => {
        setShowSplash(false);
        navigate('/dashboard');
    };

    // Show splash screen during transition
    if (showSplash) {
        return <SplashScreen onComplete={handleSplashComplete} />;
    }

    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <div className="login-page">
                <div className="login-container">
                    <div className="login-card">
                        <div className="login-header">
                            <div className="login-logo">🎥</div>
                            <h1>Welcome to VideoMind</h1>
                            <p>Transform your videos into knowledge with AI-powered insights</p>
                        </div>

                        <div className="login-content">
                            <div className="login-features">
                                <div className="feature-item">
                                    <span className="feature-icon">🎥</span>
                                    <span>Upload & Process Videos</span>
                                </div>
                                <div className="feature-item">
                                    <span className="feature-icon">💬</span>
                                    <span>Ask Questions</span>
                                </div>
                                <div className="feature-item">
                                    <span className="feature-icon">📄</span>
                                    <span>Generate PDFs</span>
                                </div>
                            </div>

                            <div className="google-login-wrapper">
                                <p className="login-instruction">Sign in with your Google account to continue</p>
                                <GoogleLogin
                                    onSuccess={handleSuccess}
                                    onError={handleError}
                                    size="large"
                                    theme="outline"
                                    text="signin_with"
                                    shape="rectangular"
                                />
                            </div>

                            <p className="login-note">
                                By signing in, you agree to use this application responsibly
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
};
