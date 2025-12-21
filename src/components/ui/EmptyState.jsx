import React from 'react';

/**
 * Empty state component
 */
const EmptyState = ({
    icon: Icon,
    title,
    description,
    action,
    className = ''
}) => {
    return (
        <div className={`empty-state ${className}`.trim()}>
            {Icon && (
                <div className="empty-state-icon">
                    <Icon size={32} />
                </div>
            )}
            {title && <h3 className="empty-state-title">{title}</h3>}
            {description && <p className="empty-state-description">{description}</p>}
            {action && <div style={{ marginTop: 'var(--spacing-lg)' }}>{action}</div>}
        </div>
    );
};

export default EmptyState;
