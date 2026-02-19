import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const normalizeUser = (rawUser) => {
        if (!rawUser) return null;

        const picture =
            rawUser.picture ||
            rawUser.avatar ||
            rawUser.avatarUrl ||
            rawUser.imageUrl ||
            '';

        return {
            name: rawUser.name || rawUser.fullName || rawUser.email || 'User',
            email: rawUser.email || '',
            picture,
            googleId: rawUser.googleId || rawUser.sub || '',
        };
    };

    useEffect(() => {
        // Check if user is logged in (from localStorage)
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                const normalizedUser = normalizeUser(parsedUser);
                setUser(normalizedUser);
                localStorage.setItem('user', JSON.stringify(normalizedUser));
            } catch (error) {
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    const login = (googleUser) => {
        const userData = normalizeUser(googleUser);
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
