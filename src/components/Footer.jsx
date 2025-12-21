import React from 'react';
import { Heart, Shield, Sparkles } from 'lucide-react';

/**
 * Footer component with branding and metadata
 */
const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-brand">
                    <Sparkles size={16} style={{ color: 'var(--color-accent-purple)' }} />
                    <span>Account Generator Platform</span>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>•</span>
                    <span>v1.0.0</span>
                </div>

                <div className="footer-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Shield size={14} />
                        Enterprise-Grade Security
                    </span>
                </div>

                <div className="footer-brand">
                    <span>Made with</span>
                    <Heart size={14} style={{ color: 'var(--color-accent-pink)' }} />
                    <span>© {currentYear}</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
