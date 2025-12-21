import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Operation types
 */
export const OperationType = {
  CREATE: 'create',
  DELETE: 'delete',
  EXPORT: 'export',
  COPY: 'copy',
  VIEW: 'view',
  CLEAR: 'clear',
  DOWNLOAD: 'download',
};

/**
 * Custom hook for operation logging
 */
export const useOperationLog = (maxEntries = 100) => {
  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('operationLogs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('operationLogs', JSON.stringify(logs.slice(0, maxEntries)));
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error);
    }
  }, [logs, maxEntries]);

  /**
   * Add a log entry
   */
  const addLog = useCallback((type, message, details = {}) => {
    const entry = {
      id: uuidv4(),
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
    };
    
    setLogs((prev) => [entry, ...prev].slice(0, maxEntries));
    return entry;
  }, [maxEntries]);

  /**
   * Log account creation
   */
  const logCreate = useCallback((count) => {
    return addLog(
      OperationType.CREATE,
      `Generated ${count} account${count > 1 ? 's' : ''}`,
      { count }
    );
  }, [addLog]);

  /**
   * Log account deletion
   */
  const logDelete = useCallback((count = 1) => {
    return addLog(
      OperationType.DELETE,
      `Deleted ${count} account${count > 1 ? 's' : ''}`,
      { count }
    );
  }, [addLog]);

  /**
   * Log export action
   */
  const logExport = useCallback((format, count) => {
    return addLog(
      OperationType.EXPORT,
      `Exported ${count} accounts as ${format.toUpperCase()}`,
      { format, count }
    );
  }, [addLog]);

  /**
   * Log copy action
   */
  const logCopy = useCallback((field, accountId) => {
    return addLog(
      OperationType.COPY,
      `Copied ${field} to clipboard`,
      { field, accountId }
    );
  }, [addLog]);

  /**
   * Log download action
   */
  const logDownload = useCallback((count) => {
    return addLog(
      OperationType.DOWNLOAD,
      `Downloaded ${count} account PDF${count > 1 ? 's' : ''} as ZIP`,
      { count }
    );
  }, [addLog]);

  /**
   * Log clear all action
   */
  const logClearAll = useCallback((count) => {
    return addLog(
      OperationType.CLEAR,
      `Cleared all ${count} accounts`,
      { count }
    );
  }, [addLog]);

  /**
   * Clear all logs
   */
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  /**
   * Get logs by type
   */
  const getLogsByType = useCallback(
    (type) => {
      return logs.filter((log) => log.type === type);
    },
    [logs]
  );

  /**
   * Get recent logs (last N entries)
   */
  const getRecentLogs = useCallback(
    (count = 10) => {
      return logs.slice(0, count);
    },
    [logs]
  );

  return {
    logs,
    addLog,
    logCreate,
    logDelete,
    logExport,
    logCopy,
    logDownload,
    logClearAll,
    clearLogs,
    getLogsByType,
    getRecentLogs,
  };
};

export default useOperationLog;
