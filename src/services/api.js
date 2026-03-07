import axios from 'axios';

// API base URL - update this for production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://alishaker.it.com/api';
// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Required for Sanctum cookies
    withXSRFToken: true, // Automatically include XSRF token
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add response interceptor for handling errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Redirect to login or handle unauthorized
            window.location.href = '/#/account-generation-313';
        }
        return Promise.reject(error);
    }
);

// ==================== Auth ====================

/**
 * Get CSRF cookie (required before login)
 */
export const getCsrfCookie = async () => {
    await api.get('/sanctum/csrf-cookie');
};

/**
 * Login with email and password
 */
export const login = async (email, password) => {
    await getCsrfCookie();
    const response = await api.post('/api/login', { email, password });
    return response.data;
};

/**
 * Logout current user
 */
export const logout = async () => {
    const response = await api.post('/api/logout');
    return response.data;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async () => {
    const response = await api.get('/api/user');
    return response.data;
};

/**
 * Register a new user
 */
export const register = async (name, email, password, passwordConfirmation) => {
    await getCsrfCookie();
    const response = await api.post('/api/register', {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
    });
    return response.data;
};

// ==================== Dashboard ====================

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
    const response = await api.get('/api/dashboard');
    return response.data;
};

/**
 * Get stores with card counts for dashboard
 */
export const getDashboardStores = async (page = 1, perPage = 10, search = '', sort = 'desc') => {
    const response = await api.get('/api/dashboard/stores', { params: { page, per_page: perPage, search, sort } });
    return response.data;
};

/**
 * Get recent activity with optional pagination
 */
export const getRecentActivity = async (page = 1, perPage = 10) => {
    const response = await api.get('/api/dashboard/activity', {
        params: { page, per_page: perPage }
    });
    return response.data;
};

/**
 * Search for emails in the database
 */
export const searchEmail = async (query) => {
    const response = await api.get('/api/dashboard/search-email', { params: { query } });
    return response.data;
};

/**
 * Get wallet dashboard statistics
 */
export const getWalletDashboardStats = async () => {
    const response = await api.get('/api/dashboard/wallet');
    return response.data;
};

/**
 * Get wallet stores with card counts for dashboard
 */
export const getWalletDashboardStores = async (page = 1, perPage = 10, search = '', sort = 'desc') => {
    const response = await api.get('/api/dashboard/wallet-stores', { params: { page, per_page: perPage, search, sort } });
    return response.data;
};

// ==================== Stores ====================

/**
 * Get all stores
 */
export const getStores = async (page = 1, perPage = 15, search = '', sort = 'desc') => {
    const response = await api.get('/api/stores', { params: { page, per_page: perPage, search, sort } });
    return response.data;
};

/**
 * Get a single store
 */
export const getStore = async (storeId) => {
    const response = await api.get(`/api/stores/${storeId}`);
    return response.data;
};

/**
 * Create a new store
 */
export const createStore = async (storeData) => {
    const response = await api.post('/api/stores', storeData);
    return response.data;
};

/**
 * Update a store
 */
export const updateStore = async (storeId, storeData) => {
    const response = await api.put(`/api/stores/${storeId}`, storeData);
    return response.data;
};

/**
 * Delete a store
 */
export const deleteStore = async (storeId) => {
    const response = await api.delete(`/api/stores/${storeId}`);
    return response.data;
};

// ==================== Cards ====================

/**
 * Get cards for a store
 */
export const getStoreCards = async (storeId, page = 1) => {
    const response = await api.get(`/api/stores/${storeId}/cards`, { params: { page } });
    return response.data;
};

/**
 * Get cards for a store with decrypted data (for export) - paginated
 */
export const getStoreCardsForExport = async (storeId, page = 1, perPage = 50) => {
    const response = await api.get(`/api/stores/${storeId}/cards`, {
        params: { export: 'true', page, per_page: perPage }
    });
    return response.data;
};

/**
 * Get cards for a specific batch with pagination and search
 */
export const getStoreBatchCards = async (storeId, batchId, page = 1, perPage = 20, search = '') => {
    const response = await api.get(`/api/stores/${storeId}/batches/${batchId}/cards`, {
        params: { page, per_page: perPage, search }
    });
    return response.data;
};

/**
 * Lock all cards for a store
 */
export const lockStoreCards = async (storeId) => {
    const response = await api.post(`/api/stores/${storeId}/lock-cards`);
    return response.data;
};

/**
 * Unlock all cards for a store
 */
export const unlockStoreCards = async (storeId) => {
    const response = await api.post(`/api/stores/${storeId}/unlock-cards`);
    return response.data;
};

/**
 * Generate cards for a store
 */
export const generateCards = async (storeId, count, emailType = 'icloud', color = 'blue', emailPrefix = null, passwordPrefix = null) => {
    const response = await api.post(`/api/stores/${storeId}/cards/generate`, {
        count,
        email_type: emailType,
        color,
        email_prefix: emailPrefix || undefined,
        password_prefix: passwordPrefix || undefined,
    });
    return response.data;
};

/**
 * Toggle card status (active/inactive)
 */
export const toggleCardStatus = async (cardId) => {
    const response = await api.patch(`/api/cards/${cardId}/status`);
    return response.data;
};

/**
 * Delete all cards in a batch
 */
export const deleteBatch = async (storeId, batchId) => {
    const response = await api.delete(`/api/stores/${storeId}/batches/${batchId}`);
    return response.data;
};

// ==================== Public Card Endpoints (for QR scan) ====================

/**
 * Get card data by ID with access token (public - for QR code scanning)
 */
export const getCardData = async (cardId, token = null) => {
    const params = token ? { token } : {};
    const response = await api.get(`/api/cards/${cardId}`, { params });
    return response.data;
};

/**
 * Submit phone number on first scan
 */
export const submitPhoneNumber = async (cardId, phoneNumber) => {
    const response = await api.post(`/api/cards/${cardId}/phone`, {
        phone_number: phoneNumber,
    });
    return response.data;
};

// ==================== System Cards (Generator Page) ====================

/**
 * Generate cards for the Generator page (system cards)
 */
export const generateSystemCards = async (count, emailType = 'icloud', color = 'blue', emailPrefix = null, passwordPrefix = null) => {
    const response = await api.post('/api/system/cards/generate', {
        count,
        email_type: emailType,
        color,
        email_prefix: emailPrefix || undefined,
        password_prefix: passwordPrefix || undefined,
    });
    return response.data;
};

/**
 * Get all system cards for the Generator page
 */
export const getSystemCards = async (page = 1, perPage = 50) => {
    const response = await api.get('/api/system/cards', { params: { page, per_page: perPage } });
    return response.data;
};

/**
 * Delete a single system card
 */
export const deleteSystemCard = async (cardId) => {
    const response = await api.delete(`/api/system/cards/${cardId}`);
    return response.data;
};

/**
 * Clear all system cards
 */
export const clearSystemCards = async () => {
    const response = await api.delete('/api/system/cards');
    return response.data;
};

/**
 * Transfer system cards to a specific store
 */
export const transferSystemCards = async (cardIds, storeId) => {
    const response = await api.post('/api/system/cards/transfer', {
        card_ids: cardIds,
        store_id: storeId,
    });
    return response.data;
};

// ==================== Activated Cards ====================

/**
 * Get activated cards (cards with phone numbers)
 */
export const getActivatedCards = async (page = 1, perPage = 12, sort = 'newest', search = '') => {
    const response = await api.get('/api/activated-cards', {
        params: { page, per_page: perPage, sort, search }
    });
    return response.data;
};

/**
 * Deactivate a card (clear phone number)
 */
export const deactivateCard = async (cardId) => {
    const response = await api.post(`/api/activated-cards/${cardId}/deactivate`);
    return response.data;
};

// ==================== Database Backup ====================

/**
 * Download a database backup (.sql file)
 */
export const downloadBackup = async () => {
    const response = await api.get('/api/backup/download', {
        responseType: 'blob',
    });
    // Extract filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `backup_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.sql`;
    if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
    }
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

// ==================== Settings ====================

/**
 * Get settings (authenticated - for dashboard)
 */
export const getSettings = async () => {
    const response = await api.get('/api/settings');
    return response.data;
};

/**
 * Update settings (authenticated - for dashboard)
 */
export const updateSettings = async (settings) => {
    const response = await api.post('/api/settings', settings);
    return response.data;
};

/**
 * Get public settings (unauthenticated - for card views)
 */
export const getPublicSettings = async () => {
    const response = await api.get('/api/public-settings');
    return response.data;
};

export default api;
