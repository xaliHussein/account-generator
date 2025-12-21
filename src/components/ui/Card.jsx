import React from 'react';

/**
 * Card component with header, body, and footer slots
 */
const Card = ({ children, className = '', hover = true, ...props }) => {
    return (
        <div
            className={`card ${!hover ? 'no-hover' : ''} ${className}`.trim()}
            style={!hover ? { transform: 'none' } : undefined}
            {...props}
        >
            {children}
        </div>
    );
};

const CardHeader = ({ children, className = '', actions, ...props }) => {
    return (
        <div className={`card-header ${className}`.trim()} {...props}>
            <div className="card-title">{children}</div>
            {actions && <div className="card-actions">{actions}</div>}
        </div>
    );
};

const CardBody = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-body ${className}`.trim()} {...props}>
            {children}
        </div>
    );
};

const CardFooter = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-footer ${className}`.trim()} {...props}>
            {children}
        </div>
    );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
