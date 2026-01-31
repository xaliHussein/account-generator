import React from 'react';
import QRCode from 'react-qr-code';

/**
 * Wallet Card Front Component
 * Dark tech-themed Wallet style card with QR code
 * Supports Apple Wallet and Google Wallet branding
 */
const WalletCard = ({ card, showQR = true, walletType = 'apple' }) => {
    // Use frontend URL for QR code so it opens the wallet card view page
    const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://alishaker.it.com');
    const qrUrl = `${FRONTEND_URL}/#/wallet/${card.access_token}`;

    // Wallet branding based on type
    const walletBranding = {
        apple: {
            title: 'Apple Wallet',
            titleAr: 'محفظة أبل'
        },
        google: {
            title: 'Google Wallet',
            titleAr: 'محفظة جوجل'
        }
    };

    const branding = walletBranding[walletType] || walletBranding.apple;

    return (
        <div className="wallet-card-front">
            {/* Background circuit pattern overlay */}
            <div className="wallet-card-circuits wallet-circuits-left"></div>
            <div className="wallet-card-circuits wallet-circuits-right"></div>

            {/* Main content */}
            <div className="wallet-card-content">
                {/* Left side - QR Code */}
                <div className="wallet-card-qr-section">
                    {/* Arabic text with explicit RTL and inline styles for PDF capture */}
                    <div
                        className="wallet-card-scan-text"
                        dir="rtl"
                        style={{
                            fontFamily: 'Arial, sans-serif',
                            unicodeBidi: 'embed',
                        }}
                    >
                        امسح هنا
                    </div>
                    <div className="wallet-card-qr-container">
                        {showQR ? (
                            <QRCode
                                value={qrUrl}
                                size={110}
                                level="M"
                                bgColor="#FFFFFF"
                                fgColor="#000000"
                            />
                        ) : (
                            <div className="wallet-card-qr-placeholder" style={{ width: '110px', height: '110px' }}></div>
                        )}
                    </div>
                </div>

                {/* Right side - Branding */}
                <div className="wallet-card-branding">
                    <div className="wallet-card-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="6" width="20" height="12" rx="2" />
                            <path d="M22 10H2" />
                            <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                        </svg>
                    </div>
                    <h2 className="wallet-card-title">{branding.title}</h2>
                    {/* Arabic title with explicit RTL and inline styles for PDF capture */}
                    <div
                        className="wallet-card-title-ar"
                        dir="rtl"
                        style={{
                            fontFamily: 'Arial, sans-serif',
                            unicodeBidi: 'embed'
                        }}
                    >
                        {branding.titleAr}
                    </div>
                    <div
                        className="wallet-card-serial"
                        dir="rtl"
                        style={{
                            fontFamily: 'Arial, sans-serif',
                            unicodeBidi: 'embed'
                        }}
                    >
                        Serial No: {card.serial_number || 'N/A'}
                    </div>
                </div>
            </div>

            {/* Corner diamond */}
            <div className="wallet-card-diamond"></div>
        </div>
    );
};

export default WalletCard;
