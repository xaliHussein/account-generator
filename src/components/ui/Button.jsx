import React from 'react';

/**
 * Reusable Button component with variants
 */
const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    onClick,
    type = 'button',
    ...props
}) => {
    const baseClass = 'btn';
    const variantClass = `btn-${variant}`;
    const sizeClass = size !== 'md' ? `btn-${size}` : '';
    const iconOnlyClass = !children && Icon ? 'btn-icon' : '';
    const fullWidthStyle = fullWidth ? { width: '100%' } : {};

    return (
        <button
            type={type}
            className={`${baseClass} ${variantClass} ${sizeClass} ${iconOnlyClass} ${className}`.trim()}
            onClick={onClick}
            disabled={disabled || loading}
            style={fullWidthStyle}
            {...props}
        >
            {loading ? (
                <>
                    <span className="spinner" style={{ width: 16, height: 16 }} />
                    {children && <span>Loading...</span>}
                </>
            ) : (
                <>
                    {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
                    {children}
                    {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
                </>
            )}
        </button>
    );
};

export default Button;
