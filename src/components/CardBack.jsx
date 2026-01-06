import React from 'react';

/**
 * Card Back Preview Component
 * Matches the template design: Logo, APPLE ID, USA ACCOUNT, VIP-BATCH badge
 */
const CardBack = ({
    batchNumber = 1,
    customLogo = null,
    cardColor = 'blue',
    accountIdType = 'apple' // 'apple' or 'google'
}) => {
    // Determine text based on card type
    const accountType = accountIdType === 'google' ? 'GOOGLE ID' : 'APPLE ID';
    const accountRegion = 'USA ACCOUNT';

    // Card color styles - using black border color to match credentials box
    const borderColor = cardColor === 'black' ? '#1E1E1E' : '#000000';

    return (
        <div className="card-back-preview" style={{
            width: '100%',
            aspectRatio: '85.6 / 53.98',
            background: '#FFFFFF',
            borderRadius: '12px',
            border: `3px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Logo Section */}
            <div style={{
                width: '80px',
                height: '80px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {customLogo ? (
                    <img
                        src={customLogo}
                        alt="Custom Logo"
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '16px',
                            objectFit: 'cover'
                        }}
                    />
                ) : (
                    <svg viewBox="0 0 24 24" width="80" height="80">
                        <defs>
                            <linearGradient id="appStoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#18BFFF" />
                                <stop offset="100%" stopColor="#0088CC" />
                            </linearGradient>
                        </defs>
                        <rect width="24" height="24" rx="5" fill="url(#appStoreGradient)" />
                        <g fill="white" transform="translate(3, 3) scale(0.75)">
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                        </g>
                    </svg>
                )}
            </div>

            {/* Account Type Text */}
            <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1d1d1f',
                letterSpacing: '0.5px',
                marginBottom: '2px'
            }}>
                {accountType}
            </div>

            {/* Region Text */}
            <div style={{
                fontSize: '14px',
                fontWeight: '400',
                color: '#86868b',
                letterSpacing: '0.3px',
                marginBottom: '16px'
            }}>
                {accountRegion}
            </div>

            {/* VIP Badge */}
            <div style={{
                padding: '4px 16px',
                border: '1px solid #1d1d1f',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                color: '#1d1d1f',
                letterSpacing: '0.5px'
            }}>
                VIP-BATCH-{String(batchNumber).padStart(2, '0')}
            </div>
        </div>
    );
};

export default CardBack;
