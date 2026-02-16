import React from 'react';
import QRCode from 'react-qr-code';

/**
 * Wallet Card Print Component - Light/Off-White Design
 * Displays card info (customer details) on the left, QR code on the right
 * Used for printing and exporting card requests with the light design
 */
const WalletCardPrintLight = ({ card, showQR = true }) => {
    const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://alishaker.it.com');
    const qrUrl = `${FRONTEND_URL}/#/wallet/${card.access_token || 'demo'}`;

    const walletType = card.email_type === 'google' || card.emailType === 'google' ? 'google' : 'apple';

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

    const firstName = card.first_name || card.firstName || '';
    const lastName = card.last_name || card.lastName || '';
    const email = card.email || '';
    const password = card.password || '';
    const birthday = card.birthday || card.date_of_birth || 'N/A';
    const serialNumber = card.serial_number || card.serialNumber || 'N/A';

    return (
        <div className="wallet-card-front-light">
            {/* Subtle decorative lines */}
            <div className="wallet-light-accent-line wallet-light-accent-top"></div>
            <div className="wallet-light-accent-line wallet-light-accent-bottom"></div>

            {/* Main content */}
            <div className="wallet-card-content-light">

                {/* Right side - QR Code */}
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

                {/* Left side - Branding with Customer Info */}
                <div className="wallet-card-branding-light wallet-card-branding-light-print" style={{ justifyContent: 'flex-start', paddingTop: '8px' }}>
                    <div className="wallet-card-icon-light" style={{ width: '32px', height: '32px', marginBottom: '6px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="6" width="20" height="12" rx="2" />
                            <path d="M22 10H2" />
                            <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                        </svg>
                    </div>
                    <h2 className="wallet-card-title-light" style={{ fontSize: '12px', marginBottom: '2px' }}>
                        {branding.title}
                    </h2>
                    <div
                        className="wallet-card-titlear-light"
                        dir="rtl"
                        style={{
                            fontFamily: 'Arial, sans-serif',
                            unicodeBidi: 'embed',
                            fontSize: '10px',
                            marginBottom: '6px'
                        }}
                    >
                        {branding.titleAr}
                    </div>
                    {/* Customer Info Section */}
                    <div style={{
                        width: '100%',
                        fontSize: '8px',
                        color: '#4A4A4A',
                        textAlign: 'left',
                        lineHeight: '1.3'
                    }}>
                        <div style={{ marginBottom: '2px' }}>
                            <span style={{ color: '#B8860B' }}>Name:</span> {firstName} {lastName}
                        </div>
                        <div style={{ marginBottom: '2px', wordBreak: 'break-all' }}>
                            <span style={{ color: '#B8860B' }}>Email:</span> {email}
                        </div>
                        <div style={{ marginBottom: '2px', wordBreak: 'break-all' }}>
                            <span style={{ color: '#B8860B' }}>Pass:</span> <span style={{ fontWeight: 'bold', display: 'inline' }}>{password || 'N/A'}</span>
                        </div>
                        <div style={{ marginBottom: '2px' }}>
                            <span style={{ color: '#B8860B' }} dir='ltr'>DOB:</span> {new Date(birthday).toLocaleDateString()}
                        </div>
                        <div
                            className="wallet-card-serial-light"
                            dir="rtl"
                            style={{
                                fontFamily: 'Arial, sans-serif',
                                unicodeBidi: 'embed',
                                fontSize: '8px',
                                marginTop: '4px'
                            }}
                        >
                            Serial No: {serialNumber}
                        </div>
                    </div>
                </div>

            </div>

            {/* Corner accent */}
            <div className="wallet-card-corner-light"></div>
        </div>
    );
};

export default WalletCardPrintLight;
