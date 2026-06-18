import React from 'react';
import QRCode from 'react-qr-code';

/**
 * ID Card Front Component
 * Dark tech-themed card with QR code (Apple ID branding).
 * Reuses the wallet card CSS classes for an identical look.
 * The QR encodes the public scan URL: {FRONTEND_URL}/#/id/{access_token}.
 */
const IdCard = ({ card, showQR = true, qrLogo = null }) => {
    const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://alishaker.it.com');
    const qrUrl = `${FRONTEND_URL}/#/id/${card.access_token || 'demo'}`;

    const branding = { title: 'Apple ID' };

    return (
        <div className="wallet-card-front">
            {/* Background circuit pattern overlay */}
            <div className="wallet-card-circuits wallet-circuits-left"></div>
            <div className="wallet-card-circuits wallet-circuits-right"></div>

            {/* Main content */}
            <div className="wallet-card-content">
                {/* Left side - QR Code */}
                <div className="wallet-card-qr-section">
                    <div
                        className="wallet-card-scan-text"
                        dir="rtl"
                        style={{ fontFamily: 'Arial, sans-serif', unicodeBidi: 'embed' }}
                    >
                        امسح هنا
                    </div>
                    <div className="wallet-card-qr-container" style={{ position: 'relative' }}>
                        {showQR ? (
                            <>
                                <QRCode
                                    value={qrUrl}
                                    size={110}
                                    level={qrLogo ? 'H' : 'M'}
                                    bgColor="#FFFFFF"
                                    fgColor="#000000"
                                />
                                {qrLogo && (
                                    <img
                                        src={qrLogo}
                                        alt="QR Logo"
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '4px',
                                            background: 'white',
                                            padding: '2px',
                                            objectFit: 'contain'
                                        }}
                                    />
                                )}
                            </>
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
                    <div
                        className="wallet-card-serial"
                        dir="rtl"
                        style={{ fontFamily: 'Arial, sans-serif', unicodeBidi: 'embed' }}
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

export default IdCard;
