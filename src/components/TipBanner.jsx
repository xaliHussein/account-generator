import React, { useState } from 'react';
import { X, Lightbulb, ChevronRight } from 'lucide-react';

/**
 * Onboarding tip banner
 */
const TipBanner = ({ onDismiss }) => {
    const [currentTip, setCurrentTip] = useState(0);

    const tips = [
        {
            title: 'Generate in Batches',
            description: 'You can generate up to 5,000 accounts at once. The system uses optimized batch processing for best performance.'
        },
        {
            title: 'Quick Copy',
            description: 'Click any account to preview it, then use the copy buttons to quickly copy credentials to your clipboard.'
        },
        {
            title: 'Export Options',
            description: 'Download all accounts as a ZIP file containing individual PDF cards, or export as CSV/JSON for data processing.'
        },
        {
            title: 'Secure by Default',
            description: 'Passwords are hidden by default. Click the eye icon to reveal them when needed.'
        }
    ];

    const handleNext = () => {
        if (currentTip < tips.length - 1) {
            setCurrentTip(currentTip + 1);
        } else {
            onDismiss();
        }
    };

    const tip = tips[currentTip];

    return (
        <div className="tip-banner">
            <div className="tip-icon">
                <Lightbulb size={18} />
            </div>
            <div className="tip-content">
                <div className="tip-title">{tip.title}</div>
                <div className="tip-description">{tip.description}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-tertiary)'
                }}>
                    {currentTip + 1}/{tips.length}
                </span>
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleNext}
                >
                    {currentTip < tips.length - 1 ? (
                        <>
                            Next
                            <ChevronRight size={14} />
                        </>
                    ) : (
                        'Got it'
                    )}
                </button>
            </div>
            <button className="tip-close" onClick={onDismiss}>
                <X size={18} />
            </button>
        </div>
    );
};

export default TipBanner;
