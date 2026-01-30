import React from 'react';

/**
 * Wallet Card Back Component
 * Dark tech-themed back with serial number
 */
const WalletCardBack = ({ card }) => {
    return (
        <div className="wallet-card-back">
            {/* Border glow effect */}
            <div className="wallet-card-back-border"></div>

            {/* Background circuit pattern overlay */}
            <div className="wallet-card-circuits wallet-circuits-left"></div>
            <div className="wallet-card-circuits wallet-circuits-right"></div>

            {/* Main content */}
            <div className="wallet-card-back-content">
                {/* Wallet icon */}
                <div className="wallet-card-back-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <path d="M22 10H2" />
                        <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                    </svg>
                </div>
            </div>

            {/* Terms of service */}
            <div className="wallet-card-terms">
                <strong>شروط الخدمة:</strong> هذه البطاقة صالحة فقط لدى المتاجر المعتمدة.
                <br />
                لا يمكن استبدالها بقيمة نقدية. تخضع للشروط والأحكام.
            </div>

            {/* Corner diamond */}
            <div className="wallet-card-diamond"></div>
        </div>
    );
};

export default WalletCardBack;
