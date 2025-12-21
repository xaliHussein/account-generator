import React from 'react';

/**
 * Animated progress bar with optional status text
 */
const ProgressBar = ({
    value = 0,
    max = 100,
    showPercentage = true,
    status = '',
    animated = true,
    variant = 'primary',
    size = 'md',
    className = '',
}) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className={`progress-container ${className}`.trim()}>
            <div
                className="progress-bar-wrapper"
                style={{ height: size === 'sm' ? 4 : size === 'lg' ? 12 : 8 }}
            >
                <div
                    className={`progress-bar ${animated ? 'animated' : ''}`}
                    style={{
                        width: `${percentage}%`,
                        background: variant === 'success'
                            ? 'var(--gradient-success)'
                            : variant === 'danger'
                                ? 'var(--gradient-danger)'
                                : 'var(--gradient-primary)'
                    }}
                />
            </div>
            {(showPercentage || status) && (
                <div className="progress-info">
                    <span className="progress-status">{status}</span>
                    {showPercentage && (
                        <span className="progress-percentage">{Math.round(percentage)}%</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProgressBar;
