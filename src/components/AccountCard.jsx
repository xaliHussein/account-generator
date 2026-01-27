import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Frontend base URL for QR codes - points to the view page
const FRONTEND_BASE_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://alishaker.it.com');

/**
 * Account card preview component - Apple ID style matching PDF output
 */
const AccountCard = ({
    account,
    showQR = true,
    batchNumber = 1,
    customLogo = null,
    cardColor = 'blue'
}) => {
    const [qrValue, setQrValue] = useState('');

    // Generate QR value with frontend view page URL and access token
    useEffect(() => {
        if (!account) {
            setQrValue('');
            return;
        }

        // Debug logging to trace accessToken
        if (!account.accessToken) {
            console.warn('AccountCard: Missing accessToken for account:', {
                id: account.id,
                email: account.email,
                hasAccessToken: !!account.accessToken,
                keys: Object.keys(account)
            });
        }

        // Use frontend view page with token for security
        if (account.id && account.accessToken) {
            setQrValue(`${FRONTEND_BASE_URL}/#/view?id=${account.id}&token=${account.accessToken}`);
        } else {
            // Fallback for cards without accessToken
            console.error('AccountCard: Generating QR without token - this will fail authentication', account.id);
            setQrValue(`${FRONTEND_BASE_URL}/#/view?id=${account.id}`);
        }
    }, [account]);

    if (!account) {
        return (
            <div className="account-card-preview" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 300,
                color: 'var(--color-text-tertiary)'
            }}>
                <p>Generate accounts to see preview</p>
            </div>
        );
    }

    // Determine header text based on email type
    const emailLower = account.email.toLowerCase();
    const isGoogle = emailLower.includes('@gmail.com') || emailLower.includes('@googlemail.com');
    const headerText = isGoogle ? 'GOOGLE ID - USA ACCOUNT' : 'APPLE ID - USA ACCOUNT';

    return (
        <div className="account-card-preview apple-style" id="account-card-preview">
            {/* Dynamic Header based on email type */}
            <div className="apple-card-header">
                <span>{headerText}</span>
            </div>

            {/* Main Content Area */}
            <div className="apple-card-content">
                {/* Left side - QR Code */}
                <div className="apple-card-qr-section">
                    {showQR && qrValue && (
                        <QRCodeSVG
                            value={qrValue}
                            size={100}
                            level="M"
                            bgColor="transparent"
                            fgColor="#000000"
                        />
                    )}
                    {showQR && !qrValue && (
                        <div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                            Loading...
                        </div>
                    )}
                </div>

                {/* Right side - Credentials */}
                <div className="apple-card-right">
                    {/* Email/Password Box */}
                    <div className="apple-credentials-box">
                        <div className="apple-credential-row">
                            <span className="apple-credential-label">EMAIL</span>
                            <span className="apple-credential-value">{account.email}</span>
                        </div>
                        <div className="apple-credential-row">
                            <span className="apple-credential-label">PASS</span>
                            <span className="apple-credential-value password">{account.password}</span>
                        </div>
                    </div>

                    {/* Name and DOB */}
                    <div className="apple-name-section">
                        <div className="apple-name">{account.firstName} {account.lastName}</div>
                        <div className="apple-dob">DOB: {account.birthday}</div>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="apple-card-footer">
                {/* Serial Number */}
                <div className="apple-serial">
                    <span className="apple-serial-label">SN:</span>
                    <span className="apple-serial-value">{account.serialNumber}</span>
                </div>

                {/* Custom Logo or App Store Icon & Badge */}
                <div className="apple-footer-right">
                    <div className="apple-store-icon">
                        {customLogo ? (
                            <img
                                src={customLogo}
                                alt="Custom Logo"
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 8,
                                    objectFit: 'cover'
                                }}
                            />
                        ) : (
                            <svg viewBox="0 0 24 24" width="40" height="40">
                                <rect width="24" height="24" rx="5" fill="#007AFF" />
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="white" />
                            </svg>
                        )}
                    </div>
                    <div className="apple-vip-badge">
                        VIP-BATCH-{String(batchNumber).padStart(2, '0')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountCard;
