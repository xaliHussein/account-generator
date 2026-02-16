import React from 'react';
import QRCode from 'react-qr-code';

/**
 * Wallet Card Front Component - Light/Off-White Design
 * Elegant off-white card with gold accents and QR code
 * Minimal ink usage for printer-friendly output
 */
const WalletCardLight = ({ card, showQR = true, walletType = 'apple' }) => {
    const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://alishaker.it.com');
    const qrUrl = `${FRONTEND_URL}/#/wallet/${card.access_token}`;

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
        <div className="wallet-card-front-light">
            {/* Subtle decorative lines */}
            <div className="wallet-light-accent-line wallet-light-accent-top"></div>
            <div className="wallet-light-accent-line wallet-light-accent-bottom"></div>

            {/* Main content */}
            <div className="wallet-card-content-light">
                {/* Left side - QR Code */}
                <div className="wallet-card-qr-section-light">
                    <div
                        className="wallet-card-scan-text-light"
                        dir="rtl"
                        style={{
                            fontFamily: 'Arial, sans-serif',
                            unicodeBidi: 'embed',
                        }}
                    >
                        امسح هنا
                    </div>
                    <div className="wallet-card-qr-container-light">
                        {showQR ? (
                            <QRCode
                                value={qrUrl}
                                size={110}
                                level="M"
                                bgColor="#FAF8F5"
                                fgColor="#2C2C2C"
                            />
                        ) : (
                            <div className="wallet-card-qr-placeholder-light" style={{ width: '110px', height: '110px' }}></div>
                        )}
                    </div>
                </div>

                {/* Right side - Branding */}
                <div className="wallet-card-branding-light">
                    <div className="wallet-card-icon-light">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="6" width="20" height="12" rx="2" />
                            <path d="M22 10H2" />
                            <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                        </svg>
                    </div>
                    <h2 className="wallet-card-title-light">{branding.title}</h2>
                    <div
                        className="wallet-card-titlear-light"
                        dir="rtl"
                        style={{
                            fontFamily: 'Arial, sans-serif',
                            unicodeBidi: 'embed'
                        }}
                    >
                        {branding.titleAr}
                    </div>
                    <div
                        className="wallet-card-serial-light"
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

            {/* Corner accent */}
            <div className="wallet-card-corner-light"></div>
        </div>
    );
};

export default WalletCardLight;
