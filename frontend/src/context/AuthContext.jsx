import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    // Placeholder user data (will be replaced with Google Auth later)
    const [user] = useState({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        avatar: null,
    });

    const [isAuthenticated] = useState(true); // Always true for now

    return (
        <AuthContext.Provider value={{ user, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};
