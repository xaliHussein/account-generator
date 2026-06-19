import React from 'react';

/**
 * ID Card Back - Custom design.
 * Uses a user-uploaded image as the background, with the standard back
 * content (icon + terms of service) overlaid above it.
 */
const IdCardBackCustom = ({ image }) => {
    return (
        <div className="wallet-card-back" style={{ position: 'relative', overflow: 'hidden' }}>
            {image && (
                <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
            )}

            <div className="wallet-card-back-content" style={{ position: 'relative', zIndex: 1 }}>
                <div className="wallet-card-back-icon" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="6" width="20" height="12" rx="2" />
                        <path d="M22 10H2" />
                        <circle cx="18" cy="14" r="1.5" fill="currentColor" />
                    </svg>
                </div>
            </div>

            {/* Terms (with a subtle scrim for readability over any image) */}
            <div
                className="wallet-card-terms"
                style={{ position: 'relative', zIndex: 1, background: 'rgba(0,0,0,0.45)', borderRadius: '6px', padding: '6px 8px' }}
            >
                <strong>شروط الخدمة:</strong> هذه البطاقة صالحة فقط لدى المتاجر المعتمدة.
                <br />
                لا يمكن استبدالها بقيمة نقدية. تخضع للشروط والأحكام.
            </div>
        </div>
    );
};

export default IdCardBackCustom;
