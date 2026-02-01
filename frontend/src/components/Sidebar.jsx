import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Upload, Video, User } from 'lucide-react';
import './Sidebar.css';

export const Sidebar = () => {
    const navItems = [
        { path: '/dashboard', icon: Home, label: 'Dashboard' },
        { path: '/upload', icon: Upload, label: 'Upload' },
        { path: '/videos', icon: Video, label: 'My Videos' },
        { path: '/profile', icon: User, label: 'Profile' },
    ];

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h2>Video AI</h2>
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
        </div>
    );
};
