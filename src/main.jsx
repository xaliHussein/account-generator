import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import App from './App.jsx'
import ViewAccountPage from './components/ViewAccountPage.jsx'
import LoginPage, { isAuthenticated, logout } from './components/LoginPage.jsx'
import Dashboard from './components/Dashboard.jsx'
import StoreManagement from './components/StoreManagement.jsx'
import SystemTransfer from './components/SystemTransfer.jsx'
import WalletStoreManagement from './components/WalletStoreManagement.jsx'
import WalletCardView from './components/WalletCardView.jsx'
import './index.css'

/**
 * Main App Wrapper with Navigation
 */
const MainApp = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentView, setCurrentView] = useState('generator');

    // Determine current view from path
    useEffect(() => {
        if (location.pathname.includes('dashboard')) {
            setCurrentView('dashboard');
        } else if (location.pathname.includes('wallet-stores')) {
            setCurrentView('wallet');
        } else if (location.pathname.includes('stores')) {
            setCurrentView('stores');
        } else if (location.pathname.includes('transfer')) {
            setCurrentView('transfer');
        } else {
            setCurrentView('generator');
        }
    }, [location]);

    const handleLogout = async () => {
        await logout();
        window.location.reload();
    };

    return (
        <div className="app-container">
            {/* Navigation Header */}
            <nav className="main-nav">
                <div className="nav-content">
                    <div className="nav-brand">
                        <svg viewBox="0 0 24 24" width="32" height="32">
                            <rect width="24" height="24" rx="5" fill="url(#gradient)" />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#007AFF" />
                                    <stop offset="100%" stopColor="#5856D6" />
                                </linearGradient>
                            </defs>
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="white" />
                        </svg>
                        <span>Account Generator</span>
                    </div>
                    <div className="nav-links">
                        <button
                            className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
                            onClick={() => navigate('/dashboard')}
                        >
                            Dashboard
                        </button>
                        <button
                            className={`nav-link ${currentView === 'stores' ? 'active' : ''}`}
                            onClick={() => navigate('/stores')}
                        >
                            Stores
                        </button>
                        <button
                            className={`nav-link ${currentView === 'wallet' ? 'active' : ''}`}
                            onClick={() => navigate('/wallet-stores')}
                        >
                            Wallet Cards
                        </button>
                        <button
                            className={`nav-link ${currentView === 'transfer' ? 'active' : ''}`}
                            onClick={() => navigate('/transfer')}
                        >
                            Transfer
                        </button>
                        <button
                            className={`nav-link ${currentView === 'generator' ? 'active' : ''}`}
                            onClick={() => navigate('/generator')}
                        >
                            Generator
                        </button>
                    </div>
                    <button className="nav-logout" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="main-wrapper">
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/stores" element={<StoreManagement />} />
                    <Route path="/wallet-stores" element={<WalletStoreManagement />} />
                    <Route path="/generator" element={<App />} />
                    <Route path="/transfer" element={<SystemTransfer />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </main>
        </div>
    );
};

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

    return <MainApp />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <HashRouter>
            <Routes>
                {/* Public route - anyone can view QR scanned data (must be before catch-all) */}
                <Route path="/view" element={<ViewAccountPage />} />
                {/* Public route - wallet card view */}
                <Route path="/wallet/:token" element={<WalletCardView />} />
                {/* Default route - redirect to protected app */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                {/* Legacy obscured URL - redirect to dashboard */}
                <Route path="/account-generation-313" element={<Navigate to="/dashboard" replace />} />
                {/* Protected routes */}
                <Route path="/*" element={<ProtectedApp />} />
            </Routes>
        </HashRouter>
    </React.StrictMode>,
)

