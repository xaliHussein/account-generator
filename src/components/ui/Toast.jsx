import React from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * Toast notification container
 */
const ToastContainer = ({ toasts, onRemove }) => {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onRemove={() => onRemove(toast.id)} />
            ))}
        </div>
    );
};

/**
 * Single toast notification
 */
const Toast = ({ type = 'info', title, message, onRemove }) => {
    const icons = {
        success: CheckCircle,
        error: XCircle,
        warning: AlertTriangle,
        info: Info,
    };

    const Icon = icons[type] || Info;

    return (
        <div className={`toast ${type}`}>
            <div className="toast-icon">
                <Icon size={18} />
            </div>
            <div className="toast-content">
                {title && <div className="toast-title">{title}</div>}
                {message && <div className="toast-message">{message}</div>}
            </div>
            <button className="toast-close" onClick={onRemove} aria-label="Close">
                <X size={16} />
            </button>
        </div>
    );
};

export { ToastContainer, Toast };
export default ToastContainer;
