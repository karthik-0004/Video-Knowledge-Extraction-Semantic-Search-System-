import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Upload, User, LogOut, History, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export const Sidebar = () => {
    const { user, logout } = useAuth();
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const navItems = [
        { path: '/dashboard', icon: Home, label: 'Dashboard' },
        { path: '/upload', icon: Upload, label: 'Upload Video' },
        { path: '/history', icon: History, label: 'History' },
        { path: '/profile', icon: User, label: 'My Profile' },
    ];

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout();
        }
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h2>🎥 VideoMind</h2>
                <button
                    className="theme-toggle"
                    onClick={() => setIsDark(!isDark)}
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile-section">
                    {user && (
                        <div className="user-info">
                            <img
                                src={user.picture}
                                alt={user.name}
                                className="user-avatar"
                            />
                            <div className="user-details">
                                <span className="user-name">{user.name}</span>
                                <span className="user-email">{user.email}</span>
                            </div>
                        </div>
                    )}
                    <button onClick={handleLogout} className="logout-btn">
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
