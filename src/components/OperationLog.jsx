import React from 'react';
import {
    Clock,
    Plus,
    Trash2,
    Download,
    Copy,
    Eye,
    FileDown,
    Eraser
} from 'lucide-react';
import Card from './ui/Card';
import EmptyState from './ui/EmptyState';
import { formatTime, formatRelativeTime } from '../utils/formatters';
import { OperationType } from '../hooks/useOperationLog';

/**
 * Operation log component
 */
const OperationLog = ({ logs, onClear }) => {
    return (
        <Card>
            <Card.Header
                actions={
                    logs.length > 0 && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={onClear}
                            title="Clear log"
                        >
                            <Eraser size={14} />
                            Clear
                        </button>
                    )
                }
            >
                <Clock size={18} style={{ color: 'var(--color-accent-orange)' }} />
                <span>Activity Log</span>
            </Card.Header>
            <Card.Body style={{ padding: logs.length === 0 ? 'var(--spacing-lg)' : 0 }}>
                {logs.length === 0 ? (
                    <EmptyState
                        icon={Clock}
                        title="No activity yet"
                        description="Your actions will be logged here"
                    />
                ) : (
                    <div className="operation-log">
                        {logs.slice(0, 50).map((log) => (
                            <LogEntry key={log.id} log={log} />
                        ))}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

/**
 * Single log entry
 */
const LogEntry = ({ log }) => {
    const getIcon = () => {
        switch (log.type) {
            case OperationType.CREATE:
                return { icon: Plus, className: 'create' };
            case OperationType.DELETE:
                return { icon: Trash2, className: 'delete' };
            case OperationType.EXPORT:
                return { icon: FileDown, className: 'export' };
            case OperationType.COPY:
                return { icon: Copy, className: 'copy' };
            case OperationType.DOWNLOAD:
                return { icon: Download, className: 'export' };
            case OperationType.CLEAR:
                return { icon: Eraser, className: 'delete' };
            default:
                return { icon: Eye, className: 'view' };
        }
    };

    const { icon: Icon, className } = getIcon();

    return (
        <div className="log-entry">
            <span className="log-time">{formatTime(log.timestamp)}</span>
            <div className="log-action">
                <div className={`log-action-icon ${className}`}>
                    <Icon size={12} />
                </div>
                <span>{log.message}</span>
            </div>
        </div>
    );
};

export default OperationLog;
