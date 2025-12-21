import React from 'react';

/**
 * Badge component for status indicators
 */
const Badge = ({
    children,
    variant = 'info',
    size = 'md',
    icon: Icon,
    className = ''
}) => {
    return (
        <span className={`badge badge-${variant} ${className}`.trim()}>
            {Icon && <Icon size={size === 'sm' ? 10 : 12} />}
            {children}
        </span>
    );
};

export default Badge;
