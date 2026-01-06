import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { decryptData } from '../services/encryption';

// Color definitions matching the card colors
const CARD_COLORS = {
    blue: '#0088CC',
    black: '#1E1E1E'
};

/**
 * View Account Page - Displays account information from QR code scan
 * URL format: /view?data=encryptedBase64Data
 */
const ViewAccountPage = () => {
    const [searchParams] = useSearchParams();
    const [accountData, setAccountData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const decodeData = async () => {
            const dataParam = searchParams.get('data');

            if (!dataParam) {
                setError('No account data provided');
                setLoading(false);
                return;
            }

            try {
                // Decrypt the data using our encryption service
                const decrypted = await decryptData(decodeURIComponent(dataParam));
                setAccountData(decrypted);
                setLoading(false);
            } catch (err) {
                console.error('Failed to decrypt account data:', err);
                setError('Invalid or tampered data. This QR code cannot be verified.');
                setLoading(false);
            }
        };

        decodeData();
    }, [searchParams]);

    // Determine if email is iCloud or Gmail
    const getAccountType = (email) => {
        if (!email) return { title: 'Account', isApple: true };
        const lowerEmail = email.toLowerCase();
        if (lowerEmail.includes('@icloud.com') || lowerEmail.includes('@me.com') || lowerEmail.includes('@mac.com')) {
            return { title: 'Apple ID Account', isApple: true };
        } else if (lowerEmail.includes('@gmail.com') || lowerEmail.includes('@googlemail.com')) {
            return { title: 'Google ID Account', isApple: false };
        }
        return { title: 'Apple ID Account', isApple: true }; // Default to Apple
    };

    if (loading) {
        return (
            <div className="view-account-page">
                <div className="view-account-container">
                    <div className="view-account-loading">
                        <div className="spinner"></div>
                        <p>Decrypting account data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="view-account-page">
                <div className="view-account-container error">
                    <div className="view-account-icon error">
                        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    </div>
                    <h1>Security Error</h1>
                    <p>{error}</p>
                    <p style={{ fontSize: '0.85em', color: '#888', marginTop: '1rem' }}>
                        This data may have been modified or corrupted.
                    </p>
                </div>
            </div>
        );
    }

    if (!accountData) {
        return (
            <div className="view-account-page">
                <div className="view-account-container">
                    <div className="view-account-loading">
                        <div className="spinner"></div>
                        <p>Loading account data...</p>
                    </div>
                </div>
            </div>
        );
    }

    const { title, isApple } = getAccountType(accountData.email);
    const themeColor = CARD_COLORS[accountData.color] || CARD_COLORS.blue;

    return (
        <div className="view-account-page" style={{ '--theme-color': themeColor }}>
            <div className="view-account-container">
                {/* Header */}
                <div className="view-account-header" style={{ background: themeColor }}>
                    <div className="view-account-icon">
                        {isApple ? (
                            <svg viewBox="0 0 24 24" width="48" height="48">
                                <rect width="24" height="24" rx="5" fill={themeColor} />
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="white" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="48" height="48">
                                <rect width="24" height="24" rx="5" fill={themeColor} />
                                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.139 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" fill="white" />
                            </svg>
                        )}
                    </div>
                    <h1 style={{ color: 'white' }}>{title}</h1>
                    <p className="view-account-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>USA Account Credentials</p>
                </div>

                {/* Verified Badge */}
                <div style={{ textAlign: 'center', marginTop: '-10px', marginBottom: '10px' }}>
                    <span style={{
                        background: '#22c55e',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600
                    }}>
                        ✓ VERIFIED & SECURE
                    </span>
                </div>

                {/* Account Card */}
                <div className="view-account-card">
                    {/* Name Section */}
                    <div className="view-account-section name-section">
                        <div className="view-account-name">{accountData.name}</div>
                        <div className="view-account-badge" style={{ background: themeColor }}>VERIFIED</div>
                    </div>

                    {/* Personal Info */}
                    <div className="view-account-section">
                        <div className="view-account-field">
                            <label>First Name</label>
                            <div className="view-account-value">{accountData.firstName || accountData.name?.split(' ')[0] || 'N/A'}</div>
                        </div>

                        <div className="view-account-field">
                            <label>Last Name</label>
                            <div className="view-account-value">{accountData.lastName || accountData.name?.split(' ').slice(1).join(' ') || 'N/A'}</div>
                        </div>
                    </div>

                    {/* Credentials */}
                    <div className="view-account-section">
                        <div className="view-account-field">
                            <label>Email Address</label>
                            <div className="view-account-value copyable" onClick={() => navigator.clipboard.writeText(accountData.email)}>
                                {accountData.email}
                                <span className="copy-hint">Tap to copy</span>
                            </div>
                        </div>

                        <div className="view-account-field">
                            <label>Password</label>
                            <div className="view-account-value copyable password" onClick={() => navigator.clipboard.writeText(accountData.pass)}>
                                {accountData.pass}
                                <span className="copy-hint">Tap to copy</span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="view-account-section">
                        <div className="view-account-field">
                            <label>Date of Birth</label>
                            <div className="view-account-value">{accountData.dob}</div>
                        </div>

                        <div className="view-account-field">
                            <label>Serial Number</label>
                            <div className="view-account-value mono">{accountData.sn}</div>
                        </div>

                        {accountData.id && (
                            <div className="view-account-field">
                                <label>Account ID</label>
                                <div className="view-account-value mono small">{accountData.id}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="view-account-footer">
                    <p>🔒 This data is encrypted and tamper-proof.</p>
                    <p>Keep this information secure. Do not share with others.</p>
                </div>
            </div>
        </div>
    );
};

export default ViewAccountPage;
