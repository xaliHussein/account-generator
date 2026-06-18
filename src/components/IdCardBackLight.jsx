import React from 'react';

/**
 * ID Card Back Component - Light/Off-White Design
 * Elegant off-white back. Reuses the wallet light back CSS classes.
 */
const IdCardBackLight = () => {
    return (
        <div className="wallet-card-back-light">
            {/* Elegant border */}
            <div className="wallet-card-back-border-light"></div>

            {/* Subtle decorative lines */}
            <div className="wallet-light-accent-line wallet-light-accent-top"></div>
            <div className="wallet-light-accent-line wallet-light-accent-bottom"></div>

            {/* Main content */}
            <div className="wallet-card-back-content-light">
                <div className="wallet-card-back-icon-light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <path d="M22 10H2" />
                        <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                    </svg>
                </div>
            </div>

            {/* Terms of service */}
            <div className="wallet-card-terms-light">
                <strong>شروط الخدمة:</strong> هذه البطاقة صالحة فقط لدى المتاجر المعتمدة.
                <br />
                لا يمكن استبدالها بقيمة نقدية. تخضع للشروط والأحكام.
            </div>

            {/* Corner accent */}
            <div className="wallet-card-corner-light"></div>
        </div>
    );
};

export default IdCardBackLight;
