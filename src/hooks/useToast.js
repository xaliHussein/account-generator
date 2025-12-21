import { useState, useCallback } from 'react';

/**
 * Custom hook for managing toast notifications
 */
export const useToast = (defaultDuration = 4000) => {
  const [toasts, setToasts] = useState([]);

  /**
   * Add a toast notification
   */
  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      duration: defaultDuration,
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);

    return id;
  }, [defaultDuration]);

  /**
   * Remove a toast by ID
   */
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Show success toast
   */
  const success = useCallback((title, message) => {
    return addToast({ type: 'success', title, message });
  }, [addToast]);

  /**
   * Show error toast
   */
  const error = useCallback((title, message) => {
    return addToast({ type: 'error', title, message, duration: 6000 });
  }, [addToast]);

  /**
   * Show info toast
   */
  const info = useCallback((title, message) => {
    return addToast({ type: 'info', title, message });
  }, [addToast]);

  /**
   * Show warning toast
   */
  const warning = useCallback((title, message) => {
    return addToast({ type: 'warning', title, message, duration: 5000 });
  }, [addToast]);

  /**
   * Clear all toasts
   */
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
    clearToasts,
  };
};

export default useToast;
