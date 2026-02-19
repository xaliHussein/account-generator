import React from 'react';
import QRCode from 'react-qr-code';

/**
 * Wallet Card Print Component
 * Displays card info (customer details) on the left, QR code on the right
 * Used for printing and exporting card requests
 */
const WalletCardPrint = ({ card, showQR = true }) => {
    // Use frontend URL for QR code so it opens the wallet card view page
    const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://alishaker.it.com');
    const qrUrl = `${FRONTEND_URL}/#/wallet/${card.access_token}`;

    // Determine wallet type from card data
    const walletType = card.email_type === 'google' || card.emailType === 'google' ? 'google' : 'apple';

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

    // Get card data - handle both camelCase (from card_data) and snake_case (from card object)
    const firstName = card.first_name || card.firstName || '';
    const lastName = card.last_name || card.lastName || '';
    const email = card.email || '';
    const password = card.password || '';
    const birthday = card.birthday || card.date_of_birth || 'N/A';
    const serialNumber = card.serial_number || card.serialNumber || 'N/A';

    return (
        <div className="wallet-card-front">
            {/* Background circuit pattern overlay */}
            <div className="wallet-card-circuits wallet-circuits-left"></div>
            <div className="wallet-card-circuits wallet-circuits-right"></div>

            {/* Main content */}
            <div className="wallet-card-content">

                {/* Right side - QR Code */}
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

                {/* Left side - Branding with Customer Info */}
                <div className="wallet-card-branding-2" style={{ justifyContent: 'flex-start', paddingTop: '8px' }}>
                    <div className="wallet-card-icon" style={{ width: '32px', height: '32px', marginBottom: '6px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="6" width="20" height="12" rx="2" />
                            <path d="M22 10H2" />
                            <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                        </svg>
                    </div>
                    <h2 className="wallet-card-title" style={{ fontSize: '12px', marginBottom: '2px' }}>
                        {branding.title}
                    </h2>
                    <div
                        className="wallet-card-title-ar"
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
                        color: 'rgba(255,255,255,0.9)',
                        textAlign: 'left',
                        lineHeight: '1.3'
                    }}>
                        <div style={{ marginBottom: '2px' }}>
                            <span style={{ color: '#00c8ff' }}>Name:</span> {firstName} {lastName}
                        </div>
                        <div style={{ marginBottom: '2px', wordBreak: 'break-all' }}>
                            <span style={{ color: '#00c8ff' }}>Email:</span> {email}
                        </div>
                        <div style={{ marginBottom: '2px', wordBreak: 'break-all' }}>
                            <span style={{ color: '#00c8ff' }}>Pass:</span> <span style={{ display: 'inline' }}>{password || 'N/A'}</span>
                        </div>
                        <div style={{ marginBottom: '2px' }}>
                            <span style={{ color: '#00c8ff' }}>DOB:</span> {new Date(birthday).toLocaleDateString('en-CA')}
                        </div>
                        <div
                            className="wallet-card-serial-2"
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

            {/* Corner diamond */}
            <div className="wallet-card-diamond"></div>
        </div>
    );
};

export default WalletCardPrint;
