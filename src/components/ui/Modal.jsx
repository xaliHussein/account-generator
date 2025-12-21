import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Modal dialog component
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnBackdrop = true,
    showCloseButton = true,
}) => {
    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && closeOnBackdrop) {
            onClose();
        }
    };

    const sizeStyles = {
        sm: { maxWidth: 400 },
        md: { maxWidth: 500 },
        lg: { maxWidth: 700 },
        xl: { maxWidth: 900 },
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal" style={sizeStyles[size]}>
                {title && (
                    <div className="modal-header">
                        <h3 className="modal-title">{title}</h3>
                        {showCloseButton && (
                            <Button
                                variant="ghost"
                                icon={X}
                                onClick={onClose}
                                aria-label="Close modal"
                            />
                        )}
                    </div>
                )}
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
};

export default Modal;
