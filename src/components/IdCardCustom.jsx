import React from 'react';
import QRCode from 'react-qr-code';

/**
 * ID Card Front - Custom design.
 * Uses a user-uploaded image as the background, with the standard card
 * information (QR + Apple ID branding + serial) overlaid above it.
 */
const IdCardCustom = ({ card = {}, image, showQR = true, qrLogo = null }) => {
    const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://alishaker.it.com');
    const qrUrl = `${FRONTEND_URL}/#/id/${card.access_token || 'demo'}`;
    const textShadow = '0 1px 4px rgba(0,0,0,0.75)';

    return (
        <div className="wallet-card-front" style={{ position: 'relative', overflow: 'hidden', padding: 0 }}>
            {image && (
                <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
            )}

            <div className="wallet-card-content" style={{ position: 'relative', zIndex: 1 }}>
                {/* QR Code */}
                <div className="wallet-card-qr-section">
                    <div className="wallet-card-scan-text" dir="rtl" style={{ fontFamily: 'Arial, sans-serif', unicodeBidi: 'embed', textShadow }}>
                        امسح هنا
                    </div>
                    <div className="wallet-card-qr-container" style={{ position: 'relative' }}>
                        {showQR ? (
                            <>
                                <QRCode value={qrUrl} size={110} level={qrLogo ? 'H' : 'M'} bgColor="#FFFFFF" fgColor="#000000" />
                                {qrLogo && (
                                    <img src={qrLogo} alt="QR Logo" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '24px', height: '24px', borderRadius: '4px', background: 'white', padding: '2px', objectFit: 'contain' }} />
                                )}
                            </>
                        ) : (
                            <div className="wallet-card-qr-placeholder" style={{ width: '110px', height: '110px' }}></div>
                        )}
                    </div>
                </div>

                {/* Branding + serial */}
                <div className="wallet-card-branding">
                    <div className="wallet-card-icon" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="6" width="20" height="12" rx="2" />
                            <path d="M22 10H2" />
                            <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                        </svg>
                    </div>
                    <h2 className="wallet-card-title" style={{ textShadow }}>Apple ID</h2>
                    <div className="wallet-card-serial" dir="rtl" style={{ fontFamily: 'Arial, sans-serif', unicodeBidi: 'embed', textShadow }}>
                        Serial No: {card.serial_number || 'N/A'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdCardCustom;
