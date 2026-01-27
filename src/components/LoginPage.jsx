import React, { useState } from 'react';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../services/api';

/**
 * Login Page Component
 * Protects the account generator from unauthorized access using Laravel Sanctum
 */
const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await apiLogin(email, password);
            // Store user data in sessionStorage
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.setItem('user', JSON.stringify(response.user));
            onLogin();
        } catch (err) {
            console.error('Login error:', err);
            if (err.response?.status === 422) {
                setError(err.response.data.message || 'Invalid email or password');
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Login failed. Please check your credentials and try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <svg viewBox="0 0 24 24" width="48" height="48">
                            <rect width="24" height="24" rx="5" fill="#007AFF" />
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="white" />
                        </svg>
                    </div>
                    <h1>Account Generator</h1>
                    <p>Please sign in to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="login-error">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <div className="login-field">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                            autoComplete="email"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            autoComplete="current-password"
                            disabled={isLoading}
                        />
                    </div>

                    <button type="submit" className="login-button" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <span className="login-spinner"></span>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>🔒 Secure Access Only</p>
                </div>
            </div>
        </div>
    );
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
    return sessionStorage.getItem('isAuthenticated') === 'true';
};

/**
 * Get current user from session
 */
export const getUser = () => {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

/**
 * Logout user
 */
export const logout = async () => {
    try {
        await apiLogout();
    } catch (err) {
        console.error('Logout error:', err);
    }
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('user');
};

export default LoginPage;

