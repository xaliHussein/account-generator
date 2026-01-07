import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import ViewAccountPage from './components/ViewAccountPage.jsx'
import LoginPage, { isAuthenticated } from './components/LoginPage.jsx'
import './index.css'

/**
 * Protected Route Wrapper
 * Shows login page if not authenticated
 */
const ProtectedApp = () => {
    const [authenticated, setAuthenticated] = useState(isAuthenticated());

    const handleLogin = () => {
        setAuthenticated(true);
    };

    if (!authenticated) {
        return <LoginPage onLogin={handleLogin} />;
    }

    return <App />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <HashRouter>
            <Routes>
                {/* Default route - redirect to protected app */}
                <Route path="/" element={<Navigate to="/account-generation-313" replace />} />
                {/* Protected route - requires login (obscured URL) */}
                <Route path="/account-generation-313" element={<ProtectedApp />} />
                {/* Public route - anyone can view QR scanned data */}
                <Route path="/view" element={<ViewAccountPage />} />
            </Routes>
        </HashRouter>
    </React.StrictMode>,
)

