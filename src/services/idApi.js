import api from './api';

// ============================================
// ID STORES API
// ============================================

/**
 * Get all ID stores
 */
export const getIdStores = async (page = 1, perPage = 15, search = '', sort = 'desc') => {
    const response = await api.get('/api/id-stores', {
        params: { page, per_page: perPage, search, sort }
    });
    return response.data;
};

/**
 * Create a new ID store
 */
export const createIdStore = async (storeData) => {
    const response = await api.post('/api/id-stores', storeData);
    return response.data;
};

/**
 * Update an ID store
 */
export const updateIdStore = async (storeId, storeData) => {
    const response = await api.put(`/api/id-stores/${storeId}`, storeData);
    return response.data;
};

/**
 * Delete an ID store
 */
export const deleteIdStore = async (storeId) => {
    const response = await api.delete(`/api/id-stores/${storeId}`);
    return response.data;
};

// ============================================
// ID CARDS API (Public - QR Scan)
// ============================================

/**
 * Get ID card by access token (public, for QR scan)
 */
export const getIdCardByToken = async (token) => {
    const response = await api.get(`/api/id/${token}`);
    return response.data;
};

/**
 * Submit / update the phone number for an ID card (public)
 */
export const submitIdCardPhone = async (token, phoneNumber) => {
    const response = await api.post(`/api/id/${token}/phone`, { phone_number: phoneNumber });
    return response.data;
};

/**
 * Save (lock) an ID card permanently (public)
 */
export const saveIdCard = async (token) => {
    const response = await api.post(`/api/id/${token}/save`);
    return response.data;
};

// ============================================
// ID CARDS API (Protected - Management)
// ============================================

/**
 * Generate ID cards for a store by uploading an Excel/CSV file.
 * The backend parses the file (email, password, phone_number, outapi) and creates the cards.
 */
export const importIdCardsFile = async (storeId, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/api/id-stores/${storeId}/cards/import-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
    });
    return response.data;
};

/**
 * Generate ID cards from already-parsed rows (JSON fallback).
 */
export const importIdCardsRows = async (storeId, cards) => {
    const response = await api.post(`/api/id-stores/${storeId}/cards/import`, { cards });
    return response.data;
};

/**
 * Get ID cards for a store (paginated) + batch summary
 */
export const getIdStoreCards = async (storeId, page = 1, perPage = 50) => {
    const response = await api.get(`/api/id-stores/${storeId}/cards`, {
        params: { page, per_page: perPage }
    });
    return response.data;
};

/**
 * Get all ID cards in a batch (paginated, searchable)
 */
export const getIdBatchCards = async (storeId, batchId, page = 1, perPage = 20, search = '') => {
    const response = await api.get(`/api/id-stores/${storeId}/batches/${batchId}/cards`, {
        params: { page, per_page: perPage, search }
    });
    return response.data;
};

/**
 * Delete a single ID card
 */
export const deleteIdCard = async (cardId) => {
    const response = await api.delete(`/api/id-cards/${cardId}`);
    return response.data;
};

/**
 * Delete all ID cards in a batch
 */
export const deleteIdBatch = async (storeId, batchId) => {
    const response = await api.delete(`/api/id-stores/${storeId}/batches/${batchId}`);
    return response.data;
};

/**
 * Toggle lock status of an ID card
 */
export const toggleIdCardLock = async (cardId) => {
    const response = await api.post(`/api/id-cards/${cardId}/toggle-lock`);
    return response.data;
};

/**
 * Lock all cards for an ID store
 */
export const lockIdStoreCards = async (storeId) => {
    const response = await api.post(`/api/id-stores/${storeId}/lock-cards`);
    return response.data;
};

/**
 * Unlock all cards for an ID store
 */
export const unlockIdStoreCards = async (storeId) => {
    const response = await api.post(`/api/id-stores/${storeId}/unlock-cards`);
    return response.data;
};

// ============================================
// ID DASHBOARD API
// ============================================

/**
 * Get ID card dashboard statistics
 */
export const getIdDashboardStats = async () => {
    const response = await api.get('/api/dashboard/id');
    return response.data;
};

/**
 * Get ID stores with card counts for dashboard
 */
export const getIdDashboardStores = async (page = 1, perPage = 10, search = '', sort = 'desc') => {
    const response = await api.get('/api/dashboard/id-stores', { params: { page, per_page: perPage, search, sort } });
    return response.data;
};

/**
 * Search ID cards by phone number (dashboard)
 */
export const searchIdPhone = async (query) => {
    const response = await api.get(`/api/id-dashboard/search-phone?q=${encodeURIComponent(query)}`);
    return response.data;
};

/**
 * Get recent ID card scans/locks with pagination
 */
export const getIdRecentScans = async (page = 1, perPage = 10) => {
    const response = await api.get('/api/id-dashboard/recent-activity', { params: { page, per_page: perPage } });
    return response.data;
};
