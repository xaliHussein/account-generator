import React from 'react';

const NotFound = () => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            color: '#666',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
            <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>404</h1>
            <p style={{ fontSize: '18px' }}>Page Not Found</p>
        </div>
    );
};

export default NotFound;
